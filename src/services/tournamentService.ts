import { 
  collection, query, where, getDocs, addDoc, 
  doc, getDoc, orderBy 
} from 'firebase/firestore';
import { db, isFirebaseMode } from './firebase';
import { MockDB } from './mockDb';
import type { Tournament, TournamentParticipant, TournamentMatch } from '../types';
import { TournamentEngine } from '../utils/tournamentEngine';
import { userService } from './userService';
import { notificationService } from './notificationService';

class TournamentService {
  // Fetch active/upcoming and historical tournaments
  async getTournaments(): Promise<Tournament[]> {
    if (isFirebaseMode && db) {
      const q = query(collection(db, 'tournaments'), orderBy('startDate', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
    } else {
      const tournaments = MockDB.getCollection<Tournament>('TOURNAMENTS');
      // Sort upcoming first, then date
      return [...tournaments].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
  }

  // Get single tournament configuration
  async getTournament(id: string): Promise<Tournament | null> {
    if (isFirebaseMode && db) {
      const snapshot = await getDoc(doc(db, 'tournaments', id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Tournament) : null;
    } else {
      const tournaments = MockDB.getCollection<Tournament>('TOURNAMENTS');
      return tournaments.find(t => t.id === id) || null;
    }
  }

  // Create new tournament (Organizer role required)
  async createTournament(organizerId: string, data: Omit<Tournament, 'id' | 'organizerId' | 'currentRound' | 'status' | 'createdAt'>): Promise<Tournament> {
    const newTournament: Omit<Tournament, 'id'> = {
      ...data,
      organizerId,
      currentRound: 0,
      status: 'upcoming',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseMode && db) {
      const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
      return { id: docRef.id, ...newTournament };
    } else {
      const tournaments = MockDB.getCollection<Tournament>('TOURNAMENTS');
      const id = `tour_${Date.now()}`;
      const tournament = { id, ...newTournament };
      tournaments.push(tournament);
      MockDB.saveCollection('TOURNAMENTS', tournaments);
      return tournament;
    }
  }

  // Get participants list
  async getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    if (isFirebaseMode && db) {
      const q = query(collection(db, 'tournamentParticipants'), where('tournamentId', '==', tournamentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as TournamentParticipant);
    } else {
      const participants = MockDB.getCollection<TournamentParticipant>('TOURNAMENT_PARTICIPANTS');
      return participants.filter(p => p.tournamentId === tournamentId);
    }
  }

  // Register user for tournament
  async registerParticipant(tournamentId: string, userId: string): Promise<TournamentParticipant> {
    const user = await userService.getUser(userId);
    if (!user) throw new Error('User not found.');

    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');

    // Check if already registered
    const participants = await this.getParticipants(tournamentId);
    if (participants.some(p => p.userId === userId)) {
      throw new Error('You are already registered for this tournament.');
    }

    if (participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament has reached its maximum participant limit.');
    }

    const newPart: TournamentParticipant = {
      id: `${tournamentId}_${userId}`,
      tournamentId,
      userId,
      fullName: user.fullName,
      rating: user.ratings.classical || 1200,
      status: 'registered',
      score: 0,
      tiebreak: 0,
      opponentsPlayed: [],
      colorHistory: []
    };

    if (isFirebaseMode && db) {
      // In firebase we save to tournamentParticipants collection
      // setDoc(doc(db, 'tournamentParticipants', newPart.id), newPart)
      return newPart;
    } else {
      const allParts = MockDB.getCollection<TournamentParticipant>('TOURNAMENT_PARTICIPANTS');
      allParts.push(newPart);
      MockDB.saveCollection('TOURNAMENT_PARTICIPANTS', allParts);

      // Trigger notification
      await notificationService.createNotification({
        recipientId: userId,
        senderId: tournament.organizerId,
        senderName: 'Tournament Organizer',
        senderAvatar: '',
        type: 'registration',
        targetId: tournamentId,
        title: 'Tournament Registration Confirmed',
        message: `You successfully registered for ${tournament.name}.`
      });

      return newPart;
    }
  }

  // Fetch matches
  async getMatches(tournamentId: string, roundNum?: number): Promise<TournamentMatch[]> {
    if (isFirebaseMode && db) {
      const constraints = [where('tournamentId', '==', tournamentId)];
      if (roundNum !== undefined) {
        constraints.push(where('roundNum', '==', roundNum));
      }
      const q = query(collection(db, 'tournamentMatches'), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TournamentMatch));
    } else {
      const matches = MockDB.getCollection<TournamentMatch>('TOURNAMENT_MATCHES');
      let filtered = matches.filter(m => m.tournamentId === tournamentId);
      if (roundNum !== undefined) {
        filtered = filtered.filter(m => m.roundNum === roundNum);
      }
      return filtered.sort((a, b) => a.boardNum - b.boardNum);
    }
  }

  // Record score results
  async recordMatchResult(params: {
    matchId: string;
    whiteScore: number;
    blackScore: number;
    result: TournamentMatch['result'];
    pgn?: string;
  }): Promise<void> {
    const { matchId, whiteScore, blackScore, result, pgn } = params;

    if (isFirebaseMode && db) {
      // update doc
    } else {
      const matches = MockDB.getCollection<TournamentMatch>('TOURNAMENT_MATCHES');
      const idx = matches.findIndex(m => m.id === matchId);
      if (idx !== -1) {
        matches[idx] = {
          ...matches[idx],
          whiteScore,
          blackScore,
          result,
          pgn
        };
        MockDB.saveCollection('TOURNAMENT_MATCHES', matches);
      }
    }
  }

  // Generate next round pairings
  async generateNextRound(tournamentId: string): Promise<number> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found.');

    const participants = await this.getParticipants(tournamentId);
    if (participants.length < 2) throw new Error('Cannot pair a tournament with less than 2 participants.');

    const allMatches = await this.getMatches(tournamentId);
    const nextRoundNum = tournament.currentRound + 1;

    // Generate Swiss pairings using the engine
    const nextRoundPairings = TournamentEngine.generatePairings(
      participants,
      allMatches,
      nextRoundNum,
      tournamentId
    );

    // Save generated matches
    if (isFirebaseMode && db) {
      // write batch
    } else {
      // Save matches
      const matches = MockDB.getCollection<TournamentMatch>('TOURNAMENT_MATCHES');
      matches.push(...nextRoundPairings);
      MockDB.saveCollection('TOURNAMENT_MATCHES', matches);

      // Update tournament current round
      const tournaments = MockDB.getCollection<Tournament>('TOURNAMENTS');
      const tourIdx = tournaments.findIndex(t => t.id === tournamentId);
      if (tourIdx !== -1) {
        tournaments[tourIdx].currentRound = nextRoundNum;
        tournaments[tourIdx].status = 'ongoing';
        MockDB.saveCollection('TOURNAMENTS', tournaments);
      }
    }

    return nextRoundNum;
  }

  // Calculate live rankings
  async getStandings(tournamentId: string): Promise<TournamentParticipant[]> {
    const participants = await this.getParticipants(tournamentId);
    const matches = await this.getMatches(tournamentId);
    return TournamentEngine.calculateStandings(participants, matches);
  }

  // Complete tournament
  async completeTournament(tournamentId: string): Promise<void> {
    if (isFirebaseMode && db) {
      // update status to completed
    } else {
      const tournaments = MockDB.getCollection<Tournament>('TOURNAMENTS');
      const idx = tournaments.findIndex(t => t.id === tournamentId);
      if (idx !== -1) {
        tournaments[idx].status = 'completed';
        MockDB.saveCollection('TOURNAMENTS', tournaments);

        // Distribute notifications/achievements
        const standings = await this.getStandings(tournamentId);
        if (standings.length > 0) {
          const winner = standings[0];
          await notificationService.createNotification({
            recipientId: winner.userId,
            senderId: tournaments[idx].organizerId,
            senderName: 'Tournament Organizer',
            senderAvatar: '',
            type: 'system',
            targetId: tournamentId,
            title: 'Tournament Winner 🏆',
            message: `Congratulations! You won first place in ${tournaments[idx].name}!`
          });
        }
      }
    }
  }
}

export const tournamentService = new TournamentService();
