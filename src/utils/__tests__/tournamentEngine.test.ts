import { describe, it, expect } from 'vitest';
import { TournamentEngine } from '../tournamentEngine';
import type { TournamentParticipant, TournamentMatch } from '../../types';

describe('TournamentEngine - Standings and Pairings Calculations', () => {
  // Mock participants
  const mockParticipants: TournamentParticipant[] = [
    { id: 't_p1', tournamentId: 't1', userId: 'p1', fullName: 'Player One', rating: 1600, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] },
    { id: 't_p2', tournamentId: 't1', userId: 'p2', fullName: 'Player Two', rating: 1500, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] },
    { id: 't_p3', tournamentId: 't1', userId: 'p3', fullName: 'Player Three', rating: 1400, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] },
    { id: 't_p4', tournamentId: 't1', userId: 'p4', fullName: 'Player Four', rating: 1300, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] }
  ];

  it('should calculate standings correctly from completed matches', () => {
    // Round 1 matches completed
    const completedMatches: TournamentMatch[] = [
      { id: 'm1', tournamentId: 't1', roundNum: 1, boardNum: 1, whitePlayerId: 'p1', blackPlayerId: 'p2', whiteScore: 1.0, blackScore: 0.0, result: '1-0' },
      { id: 'm2', tournamentId: 't1', roundNum: 1, boardNum: 2, whitePlayerId: 'p3', blackPlayerId: 'p4', whiteScore: 0.5, blackScore: 0.5, result: '0.5-0.5' }
    ];

    const standings = TournamentEngine.calculateStandings(mockParticipants, completedMatches);

    expect(standings).toHaveLength(4);
    
    // Rank 1 should be p1 (1.0 points)
    expect(standings[0].userId).toBe('p1');
    expect(standings[0].score).toBe(1.0);

    // Rank 2 and 3 should be p3 and p4 (0.5 points)
    expect(standings[1].score).toBe(0.5);
    expect(standings[2].score).toBe(0.5);

    // Rank 4 should be p2 (0.0 points)
    expect(standings[3].userId).toBe('p2');
    expect(standings[3].score).toBe(0.0);
  });

  it('should calculate Buchholz tiebreak correctly', () => {
    // Simulating completed match results
    const matches: TournamentMatch[] = [
      // Round 1
      { id: 'r1_b1', tournamentId: 't1', roundNum: 1, boardNum: 1, whitePlayerId: 'p1', blackPlayerId: 'p2', whiteScore: 1.0, blackScore: 0.0, result: '1-0' },
      { id: 'r1_b2', tournamentId: 't1', roundNum: 1, boardNum: 2, whitePlayerId: 'p3', blackPlayerId: 'p4', whiteScore: 1.0, blackScore: 0.0, result: '1-0' },
      // Round 2
      { id: 'r2_b1', tournamentId: 't1', roundNum: 2, boardNum: 1, whitePlayerId: 'p1', blackPlayerId: 'p3', whiteScore: 1.0, blackScore: 0.0, result: '1-0' },
      { id: 'r2_b2', tournamentId: 't1', roundNum: 2, boardNum: 2, whitePlayerId: 'p2', blackPlayerId: 'p4', whiteScore: 0.5, blackScore: 0.5, result: '0.5-0.5' }
    ];

    const standings = TournamentEngine.calculateStandings(mockParticipants, matches);

    // p1 has 2.0 points. Opponents: p2 (0.5 points) + p3 (1.0 points) = 1.5 Buchholz
    const p1Stand = standings.find(s => s.userId === 'p1');
    expect(p1Stand?.score).toBe(2.0);
    expect(p1Stand?.tiebreak).toBe(1.5);

    // p3 has 1.0 points. Opponents: p4 (0.5 points) + p1 (2.0 points) = 2.5 Buchholz
    const p3Stand = standings.find(s => s.userId === 'p3');
    expect(p3Stand?.score).toBe(1.0);
    expect(p3Stand?.tiebreak).toBe(2.5);
  });

  it('should generate next round Swiss pairings correctly and avoid duplicate play', () => {
    // History showing p1 played p2 in Round 1
    const r1Matches: TournamentMatch[] = [
      { id: 'r1_b1', tournamentId: 't1', roundNum: 1, boardNum: 1, whitePlayerId: 'p1', blackPlayerId: 'p2', whiteScore: 1.0, blackScore: 0.0, result: '1-0' },
      { id: 'r1_b2', tournamentId: 't1', roundNum: 1, boardNum: 2, whitePlayerId: 'p3', blackPlayerId: 'p4', whiteScore: 1.0, blackScore: 0.0, result: '1-0' }
    ];

    // Generate Round 2 pairings. 
    // Winners (p1, p3) should play each other, Losers (p2, p4) should play each other.
    const r2Pairings = TournamentEngine.generatePairings(mockParticipants, r1Matches, 2, 't1');

    expect(r2Pairings).toHaveLength(2);
    
    // Check match 1 contains p1 and p3 (winners match)
    const match1 = r2Pairings[0];
    expect([match1.whitePlayerId, match1.blackPlayerId]).toContain('p1');
    expect([match1.whitePlayerId, match1.blackPlayerId]).toContain('p3');

    // Check match 2 contains p2 and p4 (losers match)
    const match2 = r2Pairings[1];
    expect([match2.whitePlayerId, match2.blackPlayerId]).toContain('p2');
    expect([match2.whitePlayerId, match2.blackPlayerId]).toContain('p4');
  });

  it('should allocate a Bye to the lowest-ranked player in odd participant count scenarios', () => {
    // 3 participants (odd number)
    const oddParticipants = mockParticipants.slice(0, 3);
    
    // Generate Round 1 pairings
    const r1Pairings = TournamentEngine.generatePairings(oddParticipants, [], 1, 't1');

    // 1 match + 1 bye board = 2 pairings objects
    expect(r1Pairings).toHaveLength(2);
    
    // Find the Bye board (boardNum 99)
    const byeMatch = r1Pairings.find(m => m.boardNum === 99);
    expect(byeMatch).toBeDefined();
    
    // The lowest rated player (p3 - Elo 1400) should receive the Bye
    expect(byeMatch?.whitePlayerId).toBe('p3');
    expect(byeMatch?.blackPlayerId).toBe('BYE');
    expect(byeMatch?.result).toBe('1-0');
  });
});
