export type UserRole = 'player' | 'coach' | 'club_admin' | 'tournament_organizer' | 'moderator' | 'admin';

export type ChessTitle = 'GM' | 'WGM' | 'IM' | 'WIM' | 'FM' | 'WFM' | 'CM' | 'WCM' | 'NM' | '';

export interface Ratings {
  rapid: number;
  blitz: number;
  classical: number;
  puzzle: number;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface UserLocation {
  city: string;
  country: string;
}

export interface User {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  role: UserRole;
  title: ChessTitle;
  fideId?: string;
  ratings: Ratings;
  stats: UserStats;
  location: UserLocation;
  joinedAt: string; // ISO date string
  needsSetup?: boolean;
  roleRequest?: {
    role: UserRole;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    
    // Expanded Coach Application Fields
    fullName: string;
    fideId?: string;
    fideRating?: number;
    chesscomUsername?: string;
    chesscomElo?: number;
    chessExperienceYears: number;
    coachingExperienceYears: number;
    specializations: string[];
    teachingFormat: 'online' | 'offline' | 'both';
    hourlyRate: number;
    bio: string;
    proofUrl?: string;
  };
}

export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  slots: string[]; // e.g. ["09:00", "10:00", "14:00"]
}

export interface Coach {
  uid: string; // Matches User.uid
  verified: boolean;
  experienceYears: number;
  hourlyRate: number;
  teachingMethodology: string;
  specializations: string[]; // e.g. ["opening", "endgame", "tactics", "beginner", "children"]
  languages: string[];
  rating: number; // Weighted average (e.g. 4.8)
  reviewsCount: number;
  studentsCount: number;
  availability: AvailabilitySlot[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'e_wallet';

export interface Booking {
  id: string;
  studentId: string;
  coachId: string;
  date: string; // e.g. "2026-07-25"
  timeSlot: string; // e.g. "14:00"
  durationHours: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancellationReason?: string;
  createdAt: string; // ISO date string
}

export type ClubType = 'university' | 'school' | 'private' | 'online';

export interface ClubSocialLinks {
  facebook?: string;
  website?: string;
  discord?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  location: {
    city: string;
    type: ClubType;
  };
  foundedAt: string; // ISO date string or year
  creatorId: string;
  membersCount: number;
  socialLinks: ClubSocialLinks;
  createdAt: string; // ISO date string
}

export type ClubMemberRole = 'president' | 'vice_president' | 'member' | 'admin';

export interface ClubMember {
  id: string; // clubId_userId
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  status: 'pending' | 'approved';
  joinedAt: string; // ISO date string
}

export type TournamentFormat = 'swiss' | 'round_robin' | 'knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  rules: string;
  organizerId: string;
  format: TournamentFormat;
  timeControl: string; // e.g., "10+5"
  prizePool: string;
  entryFee: number;
  maxParticipants: number;
  currentRound: number;
  status: TournamentStatus;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  registrationDeadline: string; // ISO date string
  bannerUrl: string;
  location: {
    type: 'online' | 'offline';
    address?: string;
    city: string;
  };
  createdAt: string; // ISO date string
}

export interface TournamentParticipant {
  id: string; // tournamentId_userId
  tournamentId: string;
  userId: string;
  fullName: string;
  rating: number;
  status: 'registered' | 'checked_in' | 'withdrawn';
  score: number;
  tiebreak: number; // e.g. Buchholz
  opponentsPlayed: string[]; // List of userIds faced
  colorHistory: string[]; // e.g. ['W', 'B', 'W']
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundNum: number;
  boardNum: number;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteScore: number; // 1, 0.5, 0
  blackScore: number; // 0, 0.5, 1
  result: '1-0' | '0-1' | '0.5-0.5' | 'pending';
  pgn?: string;
}

export type PostType = 'text' | 'image' | 'chess' | 'puzzle';

export interface PuzzleData {
  solution: string[]; // e.g. ["e4e5", "g1f3"]
  hint: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  type: PostType;
  content: string;
  imageUrl?: string;
  fen?: string;
  pgn?: string;
  puzzleData?: PuzzleData;
  likesCount: number;
  commentsCount: number;
  createdAt: string; // ISO date string
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string; // ISO date string
  likesCount: number;
}

export type NotificationType = 
  | 'follow' 
  | 'like' 
  | 'comment' 
  | 'booking' 
  | 'registration' 
  | 'club_invite' 
  | 'system';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: NotificationType;
  targetId: string; // ID of post, booking, club, tournament, etc.
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO date string
}

export interface Conversation {
  id: string;
  participants: string[]; // userIds
  lastMessage?: {
    text: string;
    senderId: string;
    sentAt: string; // ISO date string
  };
  unreadCounts: Record<string, number>; // uid -> count
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'chess';
  fen?: string;
  createdAt: string; // ISO date string
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string; // ISO date string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or asset name
  unlockedAt: string;
}
