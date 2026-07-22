import type { TournamentParticipant, TournamentMatch } from '../types';

export class TournamentEngine {
  /**
   * Consolidate scores and calculate Buchholz tiebreak scores for all participants.
   * Buchholz tiebreak score is the sum of the scores of a player's opponents.
   */
  static calculateStandings(
    participants: TournamentParticipant[],
    matches: TournamentMatch[]
  ): TournamentParticipant[] {
    const participantMap = new Map<string, TournamentParticipant>(
      participants.map(p => [p.userId, { ...p, score: 0, opponentsPlayed: [], colorHistory: [] }])
    );

    // 1. Process matches to calculate scores, opponents, and color history
    const completedMatches = matches.filter(m => m.result !== 'pending');

    for (const match of completedMatches) {
      const white = participantMap.get(match.whitePlayerId);
      const black = participantMap.get(match.blackPlayerId);

      if (white && black) {
        // Update scores
        white.score += match.whiteScore;
        black.score += match.blackScore;

        // Record opponents
        white.opponentsPlayed.push(black.userId);
        black.opponentsPlayed.push(white.userId);

        // Record color history
        white.colorHistory.push('W');
        black.colorHistory.push('B');
      }
    }

    // 2. Handle players who had a bye (matches where white or black was 'BYE')
    // In our matches database, we represent a bye by having blackPlayerId = 'BYE'
    const byeMatches = matches.filter(m => m.blackPlayerId === 'BYE');
    for (const match of byeMatches) {
      const player = participantMap.get(match.whitePlayerId);
      if (player) {
        player.score += 1.0; // 1 point for a bye
        player.opponentsPlayed.push('BYE');
      }
    }

    const updatedParticipants = Array.from(participantMap.values());

    // 3. Calculate Buchholz tiebreak (Sum of opponents' scores)
    for (const player of updatedParticipants) {
      let tiebreakScore = 0;
      for (const opponentId of player.opponentsPlayed) {
        if (opponentId !== 'BYE') {
          const opponent = participantMap.get(opponentId);
          if (opponent) {
            tiebreakScore += opponent.score;
          }
        }
      }
      player.tiebreak = tiebreakScore;
    }

    // 4. Sort standings: 1st by score descending, 2nd by tiebreak descending, 3rd by rating descending
    return updatedParticipants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.tiebreak !== a.tiebreak) return b.tiebreak - a.tiebreak;
      return b.rating - a.rating;
    });
  }

  /**
   * Generate Swiss pairings for the next round.
   */
  static generatePairings(
    participants: TournamentParticipant[],
    matches: TournamentMatch[],
    roundNum: number,
    tournamentId: string
  ): TournamentMatch[] {
    // 1. Calculate current stats (scores and color histories)
    const activeStandings = this.calculateStandings(participants, matches);
    
    // Copy standings to mutate during pairings
    let unpaired = activeStandings.filter(p => p.status !== 'withdrawn');
    const newMatches: TournamentMatch[] = [];
    let boardNum = 1;

    // 2. Check for Bye (odd number of players)
    // Find a player with the lowest score who hasn't had a bye yet
    if (unpaired.length % 2 !== 0) {
      const byeEligible = [...unpaired].reverse(); // start from lowest score
      const byeReceiverIdx = byeEligible.findIndex(
        p => !p.opponentsPlayed.includes('BYE')
      );

      const byeReceiver = byeReceiverIdx !== -1 
        ? byeEligible[byeReceiverIdx] 
        : unpaired[unpaired.length - 1];

      // Remove bye receiver from pairing list
      unpaired = unpaired.filter(p => p.userId !== byeReceiver.userId);

      // Create Bye match record
      newMatches.push({
        id: `${tournamentId}_r${roundNum}_bye`,
        tournamentId,
        roundNum,
        boardNum: 99, // Board 99 represents Bye board
        whitePlayerId: byeReceiver.userId,
        blackPlayerId: 'BYE',
        whiteScore: 1.0,
        blackScore: 0.0,
        result: '1-0', // automated victory
      });
    }

    // Helper to calculate color balance
    const getColorBalance = (history: string[]): number => {
      let balance = 0;
      for (const col of history) {
        if (col === 'W') balance++;
        if (col === 'B') balance--;
      }
      return balance; // positive means more Whites, negative means more Blacks
    };

    // 3. Match pairing recursively or greedily with backtrack
    const tryPair = (players: TournamentParticipant[]): boolean => {
      if (players.length === 0) return true;

      const p1 = players[0];
      
      // Look for a suitable opponent (starts from the next ranked player)
      for (let i = 1; i < players.length; i++) {
        const p2 = players[i];

        // Strict Swiss rules check:
        // Rule A: They must not have played each other yet
        const alreadyPlayed = p1.opponentsPlayed.includes(p2.userId);
        if (alreadyPlayed) continue;

        // Rule B: Match is valid. Now decide colors
        const balance1 = getColorBalance(p1.colorHistory);
        const balance2 = getColorBalance(p2.colorHistory);
        
        let whitePlayer = p1.userId;
        let blackPlayer = p2.userId;

        // Assign colors based on history balancing
        if (balance1 > balance2) {
          // p1 has played more Whites than p2; give White to p2
          whitePlayer = p2.userId;
          blackPlayer = p1.userId;
        } else if (balance1 < balance2) {
          // p2 has played more Whites than p1; give White to p1
          whitePlayer = p1.userId;
          blackPlayer = p2.userId;
        } else {
          // If equal, check last color to alternate
          const lastColor1 = p1.colorHistory[p1.colorHistory.length - 1];
          if (lastColor1 === 'W') {
            whitePlayer = p2.userId;
            blackPlayer = p1.userId;
          }
        }

        // Add matching pairing candidate
        newMatches.push({
          id: `${tournamentId}_r${roundNum}_b${boardNum}`,
          tournamentId,
          roundNum,
          boardNum,
          whitePlayerId: whitePlayer,
          blackPlayerId: blackPlayer,
          whiteScore: 0,
          blackScore: 0,
          result: 'pending'
        });

        boardNum++;
        
        // Recurse to pair the rest of the players
        const remaining = players.filter(p => p.userId !== p1.userId && p.userId !== p2.userId);
        if (tryPair(remaining)) {
          return true;
        }

        // Backtrack
        boardNum--;
        newMatches.pop();
      }

      return false;
    };

    const success = tryPair(unpaired);

    // If pairings failed strictly due to duplicate history constraints in late rounds,
    // we relax the constraint (fallback pairing matching)
    if (!success && unpaired.length > 0) {
      console.warn('Pairing constraint relaxed due to tight histories.');
      boardNum = newMatches.find(m => m.blackPlayerId === 'BYE') ? 2 : 1;
      
      // Greedy fallback ignoring history matching
      const copy = [...unpaired];
      while (copy.length >= 2) {
        const p1 = copy.shift()!;
        const p2 = copy.shift()!;
        newMatches.push({
          id: `${tournamentId}_r${roundNum}_b${boardNum}`,
          tournamentId,
          roundNum,
          boardNum,
          whitePlayerId: p1.userId,
          blackPlayerId: p2.userId,
          whiteScore: 0,
          blackScore: 0,
          result: 'pending'
        });
        boardNum++;
      }
    }

    return newMatches;
  }
}
