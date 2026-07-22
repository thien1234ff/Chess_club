import type { 
  User, Coach, Club, Tournament, Post, Comment, 
  TournamentParticipant, TournamentMatch, Booking, 
  Notification, Conversation, Message, Report, PuzzleData, ClubMember
} from '../types';
import * as seeder from '../utils/seeder';

// Helper to interact with LocalStorage
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading key ${key} from localStorage`, error);
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key ${key} to localStorage`, error);
  }
};

const KEYS = {
  USERS: 'chesshub_mock_users',
  COACHES: 'chesshub_mock_coaches',
  BOOKINGS: 'chesshub_mock_bookings',
  CLUBS: 'chesshub_mock_clubs',
  CLUB_MEMBERS: 'chesshub_mock_club_members',
  TOURNAMENTS: 'chesshub_mock_tournaments',
  TOURNAMENT_PARTICIPANTS: 'chesshub_mock_tournament_participants',
  TOURNAMENT_MATCHES: 'chesshub_mock_tournament_matches',
  POSTS: 'chesshub_mock_posts',
  COMMENTS: 'chesshub_mock_comments',
  LIKES: 'chesshub_mock_likes',
  FOLLOWS: 'chesshub_mock_follows',
  NOTIFICATIONS: 'chesshub_mock_notifications',
  CONVERSATIONS: 'chesshub_mock_conversations',
  MESSAGES: 'chesshub_mock_messages',
  REPORTS: 'chesshub_mock_reports',
  PUZZLES: 'chesshub_mock_puzzles',
  CURRENT_USER: 'chesshub_mock_current_user'
};

export class MockDB {
  static init(force = false) {
    // If users collection doesn't exist or force seed, write all seed data
    if (!localStorage.getItem(KEYS.USERS) || force) {
      setStorageItem(KEYS.USERS, seeder.seedUsers);
      setStorageItem(KEYS.COACHES, seeder.seedCoaches);
      setStorageItem(KEYS.CLUBS, seeder.seedClubs);
      setStorageItem(KEYS.TOURNAMENTS, seeder.seedTournaments);
      setStorageItem(KEYS.POSTS, seeder.seedPosts);
      setStorageItem(KEYS.COMMENTS, seeder.seedComments);
      setStorageItem(KEYS.BOOKINGS, seeder.seedBookings);
      setStorageItem(KEYS.NOTIFICATIONS, seeder.seedNotifications);
      setStorageItem(KEYS.PUZZLES, seeder.seedPuzzles);
      
      // Empty relationships arrays initially
      setStorageItem(KEYS.CLUB_MEMBERS, [
        { id: 'club_hanoi_chess_organizer_hanoi', clubId: 'club_hanoi_chess', userId: 'organizer_hanoi', role: 'president', status: 'approved', joinedAt: seeder.seedUsers[4].joinedAt },
        { id: 'club_hanoi_chess_player_2', clubId: 'club_hanoi_chess', userId: 'player_2', role: 'vice_president', status: 'approved', joinedAt: seeder.seedUsers[7].joinedAt },
        { id: 'club_hanoi_chess_player_3', clubId: 'club_hanoi_chess', userId: 'player_3', role: 'member', status: 'approved', joinedAt: seeder.seedUsers[8].joinedAt },
        { id: 'club_saigon_stars_club_admin_saigon', clubId: 'club_saigon_stars', userId: 'club_admin_saigon', role: 'president', status: 'approved', joinedAt: seeder.seedUsers[5].joinedAt },
        { id: 'club_bach_khoa_player_1', clubId: 'club_bach_khoa', userId: 'player_1', role: 'president', status: 'approved', joinedAt: seeder.seedUsers[6].joinedAt }
      ]);
      setStorageItem(KEYS.TOURNAMENT_PARTICIPANTS, [
        { id: 'tour_vietnam_open_2026_player_1', tournamentId: 'tour_vietnam_open_2026', userId: 'player_1', fullName: 'Phạm Minh Đức', rating: 1145, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] },
        { id: 'tour_vietnam_open_2026_player_2', tournamentId: 'tour_vietnam_open_2026', userId: 'player_2', fullName: 'Nguyễn Hoàng Nam', rating: 1190, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] },
        { id: 'tour_vietnam_open_2026_player_3', tournamentId: 'tour_vietnam_open_2026', userId: 'player_3', fullName: 'Lê Thu Thảo', rating: 1235, status: 'registered', score: 0, tiebreak: 0, opponentsPlayed: [], colorHistory: [] }
      ]);
      setStorageItem(KEYS.TOURNAMENT_MATCHES, []);
      setStorageItem(KEYS.LIKES, []);
      setStorageItem(KEYS.FOLLOWS, seeder.seedFollows);
      setStorageItem(KEYS.CONVERSATIONS, []);
      setStorageItem(KEYS.MESSAGES, []);
      setStorageItem(KEYS.REPORTS, []);
      
      // Set default mock session to player_1 if not set
      if (!localStorage.getItem(KEYS.CURRENT_USER)) {
        setStorageItem(KEYS.CURRENT_USER, seeder.seedUsers[6]); // player_1
      }
      console.log('Mock database seeded successfully.');
    }
  }

  // Generic methods
  static getCollection<T>(key: keyof typeof KEYS): T[] {
    this.init();
    return getStorageItem<T[]>(KEYS[key], []);
  }

  static saveCollection<T>(key: keyof typeof KEYS, data: T[]): void {
    setStorageItem(KEYS[key], data);
  }

  // Auth session helper
  static getCurrentUser(): User | null {
    this.init();
    return getStorageItem<User | null>(KEYS.CURRENT_USER, null);
  }

  static setCurrentUser(user: User | null): void {
    setStorageItem(KEYS.CURRENT_USER, user);
  }
}
