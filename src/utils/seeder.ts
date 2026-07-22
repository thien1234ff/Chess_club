import type { 
  User, Coach, Club, Tournament, Post, Comment, TournamentParticipant, 
  TournamentMatch, Booking, Notification, Conversation, Message, PuzzleData
} from '../types';

// Helper to generate ISO dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
];

export const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800', // Chess board
  'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800', // Dark chess setup
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800', // Abstract office/club
];

export const seedUsers: User[] = [
  {
    uid: 'admin_user',
    email: 'admin@chesshub.vn',
    username: 'admin',
    fullName: 'Lê Minh Hoàng',
    bio: 'ChessHub Platform Administrator & National Master.',
    avatarUrl: DEFAULT_AVATARS[0],
    coverUrl: DEFAULT_COVERS[1],
    role: 'admin',
    title: 'NM',
    ratings: { rapid: 2250, blitz: 2310, classical: 2200, puzzle: 2450 },
    stats: { gamesPlayed: 320, wins: 195, draws: 65, losses: 60 },
    location: { city: 'Hanoi', country: 'VN' },
    joinedAt: daysAgo(100)
  },
  {
    uid: 'coach_le_quang_liem',
    email: 'lequangliem@chesshub.vn',
    username: 'lequangliem',
    fullName: 'Lê Quang Liêm',
    bio: 'Grandmaster (GM), Super-GM, rating peaks at 2740+. Head Coach at Webster University. FIDE Blitz Champion 2013.',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    coverUrl: DEFAULT_COVERS[0],
    role: 'coach',
    title: 'GM',
    fideId: '12401137',
    ratings: { rapid: 2735, blitz: 2750, classical: 2741, puzzle: 2900 },
    stats: { gamesPlayed: 1450, wins: 980, draws: 350, losses: 120 },
    location: { city: 'TP. Hồ Chí Minh', country: 'VN' },
    joinedAt: daysAgo(90)
  },
  {
    uid: 'coach_truong_son',
    email: 'nguyenngoctruongson@chesshub.vn',
    username: 'truongson',
    fullName: 'Nguyễn Ngọc Trường Sơn',
    bio: 'Vietnamese Grandmaster. Gold medalist at the FIDE Olympiad. Coaching students for international events.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    coverUrl: DEFAULT_COVERS[1],
    role: 'coach',
    title: 'GM',
    fideId: '12400971',
    ratings: { rapid: 2640, blitz: 2620, classical: 2645, puzzle: 2750 },
    stats: { gamesPlayed: 920, wins: 540, draws: 290, losses: 90 },
    location: { city: 'Cần Thơ', country: 'VN' },
    joinedAt: daysAgo(85)
  },
  {
    uid: 'coach_kim_chi',
    email: 'kimchi@chesshub.vn',
    username: 'kimchi_chess',
    fullName: 'Nguyễn Thị Kim Chi',
    bio: 'Woman FIDE Master (WFM). 5 years coaching children and beginners in chess clubs.',
    avatarUrl: DEFAULT_AVATARS[3],
    coverUrl: DEFAULT_COVERS[2],
    role: 'coach',
    title: 'WFM',
    ratings: { rapid: 2010, blitz: 1950, classical: 2030, puzzle: 2100 },
    stats: { gamesPlayed: 450, wins: 230, draws: 110, losses: 110 },
    location: { city: 'Da Nang', country: 'VN' },
    joinedAt: daysAgo(75)
  },
  {
    uid: 'organizer_hanoi',
    email: 'hanoichessorg@chesshub.vn',
    username: 'hanoichessorg',
    fullName: 'Trần Văn Nghĩa',
    bio: 'Official representative of Hanoi Chess Association. Managing tournaments in Northern Vietnam.',
    avatarUrl: DEFAULT_AVATARS[4],
    coverUrl: DEFAULT_COVERS[2],
    role: 'tournament_organizer',
    title: '',
    ratings: { rapid: 1600, blitz: 1550, classical: 1620, puzzle: 1700 },
    stats: { gamesPlayed: 45, wins: 15, draws: 10, losses: 20 },
    location: { city: 'Hanoi', country: 'VN' },
    joinedAt: daysAgo(60)
  },
  {
    uid: 'club_admin_saigon',
    email: 'saigonchessclub@chesshub.vn',
    username: 'saigon_chess',
    fullName: 'Nguyễn Anh Tuấn',
    bio: 'President of Saigon Chess Center. Organizing weekly weekend coffee chess meetups.',
    avatarUrl: DEFAULT_AVATARS[2],
    coverUrl: DEFAULT_COVERS[0],
    role: 'club_admin',
    title: 'CM',
    ratings: { rapid: 1980, blitz: 2010, classical: 1950, puzzle: 2050 },
    stats: { gamesPlayed: 180, wins: 95, draws: 45, losses: 40 },
    location: { city: 'TP. Hồ Chí Minh', country: 'VN' },
    joinedAt: daysAgo(50)
  },
  // Players (14 players to reach 20 users)
  ...Array.from({ length: 14 }).map((_, idx) => {
    const names = [
      'Phạm Minh Đức', 'Nguyễn Hoàng Nam', 'Lê Thu Thảo', 'Trần Bảo Long', 'Đặng Quốc Khánh',
      'Vũ Thị Mai', 'Nguyễn Hải Đăng', 'Bùi Xuân Trường', 'Hoàng Minh Khang', 'Đỗ Thùy Linh',
      'Lê Quang Huy', 'Nguyễn Tiến Dũng', 'Phan Thanh Bình', 'Nguyễn Lan Anh'
    ];
    const cities = ['Hanoi', 'TP. Hồ Chí Minh', 'Da Nang', 'Can Tho', 'Hai Phong', 'Hue'];
    return {
      uid: `player_${idx + 1}`,
      email: `player${idx + 1}@chesshub.vn`,
      username: `player_chess_${idx + 1}`,
      fullName: names[idx % names.length],
      bio: `Chess enthusiast from ${cities[idx % cities.length]}. Always looking to improve classical chess!`,
      avatarUrl: DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length],
      coverUrl: DEFAULT_COVERS[idx % DEFAULT_COVERS.length],
      role: 'player' as const,
      title: '' as const,
      ratings: {
        rapid: 1100 + (idx * 45),
        blitz: 1050 + (idx * 50),
        classical: 1150 + (idx * 40),
        puzzle: 1200 + (idx * 60)
      },
      stats: {
        gamesPlayed: 50 + (idx * 15),
        wins: 20 + (idx * 7),
        draws: 10 + (idx * 3),
        losses: 20 + (idx * 5)
      },
      location: { city: cities[idx % cities.length], country: 'VN' },
      joinedAt: daysAgo(10 + idx)
    };
  })
];

export const seedCoaches: Coach[] = [
  {
    uid: 'coach_le_quang_liem',
    verified: true,
    experienceYears: 15,
    hourlyRate: 1500000, // VND
    teachingMethodology: 'Focus on endgame techniques, calculation refinement, and psychological preparation for tournaments. Tailored homework based on game analyses.',
    specializations: ['tournament_preparation', 'middlegame', 'endgame', 'tactical_training'],
    languages: ['Vietnamese', 'English'],
    rating: 5.0,
    reviewsCount: 18,
    studentsCount: 12,
    availability: [
      { dayOfWeek: 1, slots: ['09:00', '10:00', '15:00'] },
      { dayOfWeek: 3, slots: ['09:00', '10:00', '15:00'] },
      { dayOfWeek: 5, slots: ['09:00', '10:00', '15:00', '19:00'] }
    ]
  },
  {
    uid: 'coach_truong_son',
    verified: true,
    experienceYears: 12,
    hourlyRate: 1200000,
    teachingMethodology: 'Opening repertoire building, structured structural understanding, tactical speed running, and tournament preparation analysis.',
    specializations: ['opening', 'middlegame', 'tactical_training', 'competitive_chess'],
    languages: ['Vietnamese', 'English'],
    rating: 4.9,
    reviewsCount: 12,
    studentsCount: 8,
    availability: [
      { dayOfWeek: 2, slots: ['14:00', '15:00', '19:00'] },
      { dayOfWeek: 4, slots: ['14:00', '15:00', '19:00'] },
      { dayOfWeek: 6, slots: ['10:00', '14:00', '16:00'] }
    ]
  },
  {
    uid: 'coach_kim_chi',
    verified: true,
    experienceYears: 5,
    hourlyRate: 350000,
    teachingMethodology: 'Fun and interactive lessons for kids and beginner adults. Step-by-step tactical checkmates, rules of openings, and basic checkmate patterns.',
    specializations: ['beginner', 'children', 'opening', 'tactical_training'],
    languages: ['Vietnamese'],
    rating: 4.8,
    reviewsCount: 22,
    studentsCount: 15,
    availability: [
      { dayOfWeek: 1, slots: ['17:00', '18:00', '19:00'] },
      { dayOfWeek: 2, slots: ['17:00', '18:00', '19:00'] },
      { dayOfWeek: 4, slots: ['17:00', '18:00', '19:00'] },
      { dayOfWeek: 6, slots: ['08:00', '09:00', '10:00', '14:00', '15:00'] }
    ]
  },
  {
    uid: 'admin_user',
    verified: true,
    experienceYears: 8,
    hourlyRate: 500000,
    teachingMethodology: 'Rigorous calculation drills, positional planning analysis, and active game play simulation during the class.',
    specializations: ['opening', 'middlegame', 'tactical_training'],
    languages: ['Vietnamese'],
    rating: 4.9,
    reviewsCount: 6,
    studentsCount: 4,
    availability: [
      { dayOfWeek: 3, slots: ['18:00', '19:00'] },
      { dayOfWeek: 6, slots: ['18:00', '19:00'] }
    ]
  },
  {
    uid: 'player_5',
    verified: false,
    experienceYears: 3,
    hourlyRate: 200000,
    teachingMethodology: 'Focus on basic tactical patterns, opening traps, and post-game analyses for amateur players (Elo 1000 - 1500).',
    specializations: ['beginner', 'tactical_training'],
    languages: ['Vietnamese'],
    rating: 4.5,
    reviewsCount: 3,
    studentsCount: 2,
    availability: [
      { dayOfWeek: 0, slots: ['09:00', '10:00', '14:00'] },
      { dayOfWeek: 6, slots: ['09:00', '10:00', '14:00'] }
    ]
  }
];

export const seedClubs: Club[] = [
  {
    id: 'club_hanoi_chess',
    name: 'Hanoi Chess Association & Friends',
    description: 'The premier chess club in Hanoi. Organizing tournament championships, simultaneous events, and weekly rapid/blitz competitions for players of all ages.',
    logoUrl: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=100',
    coverUrl: DEFAULT_COVERS[1],
    location: { city: 'Hanoi', type: 'private' },
    foundedAt: '2015',
    creatorId: 'organizer_hanoi',
    membersCount: 240,
    socialLinks: { facebook: 'https://facebook.com/hanoichess', website: 'https://hanoichess.org.vn' },
    createdAt: daysAgo(300)
  },
  {
    id: 'club_saigon_stars',
    name: 'Saigon Chess Stars Center',
    description: 'Saigon Chess Stars Center is a friendly community focusing on nurturing young talents and hosting competitive coffee meetups in District 1 and District 3, HCMC.',
    logoUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=100',
    coverUrl: DEFAULT_COVERS[0],
    location: { city: 'TP. Hồ Chí Minh', type: 'private' },
    foundedAt: '2018',
    creatorId: 'club_admin_saigon',
    membersCount: 185,
    socialLinks: { facebook: 'https://facebook.com/saigonchessstars' },
    createdAt: daysAgo(250)
  },
  {
    id: 'club_bach_khoa',
    name: 'HUST Bach Khoa Chess Club',
    description: 'Official chess club of Hanoi University of Science and Technology. Active tournaments, inter-university competitions, and student-level Chess tutorials.',
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100',
    coverUrl: DEFAULT_COVERS[2],
    location: { city: 'Hanoi', type: 'university' },
    foundedAt: '2010',
    creatorId: 'player_1',
    membersCount: 120,
    socialLinks: { facebook: 'https://facebook.com/hustchessclub', discord: 'https://discord.gg/hustchess' },
    createdAt: daysAgo(400)
  },
  {
    id: 'club_hue_hub',
    name: 'Cố Đô Huế Chess Hub',
    description: 'Unifying chess fans in Thua Thien Hue province. Regular offline meetups along the Huong river and historical venues.',
    logoUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=100',
    coverUrl: DEFAULT_COVERS[1],
    location: { city: 'Hue', type: 'school' },
    foundedAt: '2021',
    creatorId: 'player_3',
    membersCount: 65,
    socialLinks: { website: 'https://huechess.vn' },
    createdAt: daysAgo(120)
  },
  {
    id: 'club_online_blitzers',
    name: 'Vietnamese Online Blitz Masters',
    description: 'An online-only competitive chess arena. Weekly Arena tournaments on ChessHub. Fast controls, opening theory discussions, and game breakdowns.',
    logoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100',
    coverUrl: DEFAULT_COVERS[0],
    location: { city: 'Online', type: 'online' },
    foundedAt: '2023',
    creatorId: 'player_7',
    membersCount: 450,
    socialLinks: { discord: 'https://discord.gg/vietblitzers' },
    createdAt: daysAgo(180)
  }
];

export const seedTournaments: Tournament[] = [
  {
    id: 'tour_vietnam_open_2026',
    name: 'ChessHub Vietnam Open Championship 2026',
    description: 'The flagship tournament organized by ChessHub. FIDE-rated Classical event. Top international masters participating, massive grand prize pool, and livestreamed boards.',
    rules: 'FIDE Laws of Chess apply. 9 rounds Swiss System. Time control: 90 minutes for the entire game with an increment of 30 seconds per move starting from move 1.',
    organizerId: 'organizer_hanoi',
    format: 'swiss',
    timeControl: '90+30',
    prizePool: '100,000,000 VND',
    entryFee: 500000,
    maxParticipants: 100,
    currentRound: 0,
    status: 'upcoming',
    startDate: daysFromNow(15),
    endDate: daysFromNow(20),
    registrationDeadline: daysFromNow(10),
    bannerUrl: DEFAULT_COVERS[0],
    location: { type: 'offline', address: 'Hanoi Grand Plaza Hotel, 117 Tran Duy Hung', city: 'Hanoi' },
    createdAt: daysAgo(30)
  },
  {
    id: 'tour_saigon_blitz_cup',
    name: 'Saigon Sunday Blitz Cup - Summer 2026',
    description: 'Furious fast-chess tournament in District 1, Saigon. Guaranteed action, instant pairings, and trophies for top 3 finishers.',
    rules: 'Time control: 3 minutes + 2 seconds increment. 11 rounds Swiss System. No ties: sudden-death Armageddon for placement matches.',
    organizerId: 'club_admin_saigon',
    format: 'swiss',
    timeControl: '3+2',
    prizePool: '10,000,000 VND',
    entryFee: 150000,
    maxParticipants: 64,
    currentRound: 0,
    status: 'upcoming',
    startDate: daysFromNow(5),
    endDate: daysFromNow(5),
    registrationDeadline: daysFromNow(4),
    bannerUrl: DEFAULT_COVERS[1],
    location: { type: 'offline', address: 'Chess Coffee House, 24 Mac Dinh Chi, District 1', city: 'TP. Hồ Chí Minh' },
    createdAt: daysAgo(12)
  },
  {
    id: 'tour_hust_showdown',
    name: 'Bach Khoa Student Swiss Showdown',
    description: 'Exclusively for students across universities in Hanoi. Compete for the title of HUST Campus King and university badges.',
    rules: '7 Rounds Swiss. Time control: 15 minutes sudden death. Match records validated by HUST chess moderators.',
    organizerId: 'admin_user',
    format: 'swiss',
    timeControl: '15+0',
    prizePool: '5,000,000 VND',
    entryFee: 0,
    maxParticipants: 50,
    currentRound: 0,
    status: 'upcoming',
    startDate: daysFromNow(8),
    endDate: daysFromNow(9),
    registrationDeadline: daysFromNow(7),
    bannerUrl: DEFAULT_COVERS[2],
    location: { type: 'offline', address: 'HUST Sports Center, 1 Dai Co Viet', city: 'Hanoi' },
    createdAt: daysAgo(8)
  },
  {
    id: 'tour_online_arena_1',
    name: 'ChessHub Weekly Online Blitz Championship',
    description: 'Test your tactical speed in the weekly online event. Smooth online match scoring and immediate pairings.',
    rules: '9 Rounds Swiss. Time control: 5 minutes + 3 seconds increment. Fully automated pairings engine.',
    organizerId: 'admin_user',
    format: 'swiss',
    timeControl: '5+3',
    prizePool: '2,000,000 VND',
    entryFee: 50000,
    maxParticipants: 200,
    currentRound: 0,
    status: 'upcoming',
    startDate: daysFromNow(2),
    endDate: daysFromNow(2),
    registrationDeadline: daysFromNow(1),
    bannerUrl: DEFAULT_COVERS[0],
    location: { type: 'online', city: 'Online' },
    createdAt: daysAgo(5)
  },
  // 6 mock tournaments that are already completed, showing active history
  ...Array.from({ length: 6 }).map((_, idx) => {
    return {
      id: `tour_completed_${idx + 1}`,
      name: `Grand Prix Chess Series - Stage ${idx + 1}`,
      description: `Historical Grand Prix Stage. Complete match scores are fully recorded for ranking statistics.`,
      rules: 'Standard Swiss 5 rounds. Time control 10+5.',
      organizerId: 'organizer_hanoi',
      format: 'swiss' as const,
      timeControl: '10+5',
      prizePool: '5,000,000 VND',
      entryFee: 100000,
      maxParticipants: 40,
      currentRound: 5,
      status: 'completed' as const,
      startDate: daysAgo(30 + idx * 10),
      endDate: daysAgo(30 + idx * 10),
      registrationDeadline: daysAgo(32 + idx * 10),
      bannerUrl: DEFAULT_COVERS[idx % DEFAULT_COVERS.length],
      location: { type: 'offline' as const, address: 'District 3 Cultural Center', city: 'TP. Hồ Chí Minh' },
      createdAt: daysAgo(40 + idx * 10)
    };
  })
];

export const seedPosts: Post[] = [
  {
    id: 'post_1',
    authorId: 'coach_le_quang_liem',
    authorName: 'Lê Quang Liêm',
    authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    type: 'chess',
    content: 'Reviewing a crucial endgame position from my game against Levon Aronian. Can you find the drawing line for Black here? White has an active rook, but Black’s king placement is highly defensive.',
    fen: '8/8/8/8/R7/1k6/6r1/2K5 b - - 0 1',
    pgn: '[Event "Simulated GM Game"]\n[White "Aronian"]\n[Black "Le, Q."]\n[Result "1/2-1/2"]\n\n1... Kxc3 2. Ra3+ Kb4 3. Rf3 *',
    likesCount: 85,
    commentsCount: 14,
    createdAt: hoursAgo(4)
  },
  {
    id: 'post_2',
    authorId: 'coach_truong_son',
    authorName: 'Nguyễn Ngọc Trường Sơn',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    type: 'puzzle',
    content: 'Here is a tactical pattern from my match at the Baku Olympiad. White to move. Spot the winning tactic and comment your solution!',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    puzzleData: {
      solution: ['h5f7', 'Qxf7'],
      hint: 'Checkmate on f7.'
    },
    likesCount: 124,
    commentsCount: 38,
    createdAt: hoursAgo(8)
  },
  {
    id: 'post_3',
    authorId: 'admin_user',
    authorName: 'Lê Minh Hoàng',
    authorAvatar: DEFAULT_AVATARS[0],
    type: 'text',
    content: 'Welcome to ChessHub! We are super excited to launch the first comprehensive Chess Community Hub in Vietnam. Connect with coaches, register for official Swiss tournaments, create clubs in your university, and study puzzles interactively. Tell us: which city are you representing?',
    likesCount: 156,
    commentsCount: 22,
    createdAt: daysAgo(2)
  },
  {
    id: 'post_4',
    authorId: 'coach_kim_chi',
    authorName: 'Nguyễn Thị Kim Chi',
    authorAvatar: DEFAULT_AVATARS[3],
    type: 'image',
    content: 'Awesome training session today with the kids club at Hanoi Chess Academy! Teaching the King + Queen checkmate pattern is always full of laughs. They are getting incredibly sharp!',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=500',
    likesCount: 42,
    commentsCount: 5,
    createdAt: daysAgo(3)
  },
  {
    id: 'post_5',
    authorId: 'player_3',
    authorName: 'Lê Thu Thảo',
    authorAvatar: DEFAULT_AVATARS[2],
    type: 'chess',
    content: 'Stuck in this opening line of the Caro-Kann Defense (Advance Variation). Does Black play c5 immediately, or start with Bf5? Let me know your thoughts!',
    fen: 'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
    likesCount: 18,
    commentsCount: 9,
    createdAt: daysAgo(5)
  },
  // Generate 15 more posts to reach 20 posts in total
  ...Array.from({ length: 15 }).map((_, idx) => {
    const authors = [
      { id: 'player_1', name: 'Phạm Minh Đức', avatar: DEFAULT_AVATARS[1] },
      { id: 'player_2', name: 'Nguyễn Hoàng Nam', avatar: DEFAULT_AVATARS[2] },
      { id: 'player_4', name: 'Trần Bảo Long', avatar: DEFAULT_AVATARS[4] },
      { id: 'player_6', name: 'Vũ Thị Mai', avatar: DEFAULT_AVATARS[5] }
    ];
    const author = authors[idx % authors.length];
    const contents = [
      'Just solved a tricky Mate in 3 puzzle on Lichess. Feeling good today!',
      'Highly recommend GM Lê Quang Liêm’s course on positional chess. Completely changed how I think about pawn structure!',
      'HUST Chess Club is hosting our weekly cafe meeting this Saturday. HUSTers, make sure to come!',
      'Fascinating opening battle between Ding Liren and Gukesh. Chess theory is progressing so fast in 2026.',
      'What is your favorite time control? I used to play only 3+2 Blitz, but 10+5 Rapid feels much better for learning.'
    ];
    return {
      id: `post_completed_${idx + 1}`,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
      type: 'text' as const,
      content: `${contents[idx % contents.length]} (Post #${idx + 1})`,
      likesCount: 10 + idx * 3,
      commentsCount: 2 + idx,
      createdAt: daysAgo(6 + idx)
    };
  })
];

export const seedPuzzles = [
  {
    id: 'puzzle_1',
    title: "Scholar's Mate Punish",
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['h5f7', 'Qxf7'],
    rating: 800,
    category: 'mate_in_1',
    attempts: 412,
    solves: 395
  },
  {
    id: 'puzzle_2',
    title: 'Back Rank Deficit Checkmate',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8', 'Re8'],
    rating: 900,
    category: 'mate_in_1',
    attempts: 250,
    solves: 245
  },
  {
    id: 'puzzle_3',
    title: 'Pawn Promotion Mate',
    fen: 'k7/P7/1K6/8/8/8/8/8 w - - 0 1',
    solution: ['a7a8q', 'a7a8r'],
    rating: 1000,
    category: 'mate_in_1',
    attempts: 120,
    solves: 95
  },
  {
    id: 'puzzle_4',
    title: 'Anastasia Checkmate Move',
    fen: '5r1k/1p4pp/8/8/4N3/8/1r3P1P/R4RK1 w - - 0 1',
    solution: ['e4d6', 'Nd6'],
    rating: 1200,
    category: 'tactical_motifs',
    attempts: 320,
    solves: 210
  },
  {
    id: 'puzzle_5',
    title: 'Queen Sacrifice for Mate in 2',
    fen: '6rk/5Qpp/8/8/8/8/6PP/6RK w - - 0 1',
    solution: ['f7g8', 'Qxg8+', 'Kxg8', 'g1e1'],
    rating: 1400,
    category: 'mate_in_2',
    attempts: 180,
    solves: 82
  },
  ...Array.from({ length: 15 }).map((_, idx) => {
    const ratings = [900, 1100, 1300, 1500, 1700];
    const categories = ['opening', 'middlegame', 'endgame', 'tactics', 'advanced'];
    return {
      id: `puzzle_seed_${idx + 1}`,
      title: `Tactical Training Exercise #${idx + 1}`,
      fen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 5', // Standard opening
      solution: ['c3d5', 'Nd5'],
      rating: ratings[idx % ratings.length],
      category: categories[idx % categories.length],
      attempts: 100 + idx * 10,
      solves: 60 + idx * 5
    };
  })
];

export const seedComments: Comment[] = [
  {
    id: 'comment_1',
    postId: 'post_1',
    authorId: 'coach_truong_son',
    authorName: 'Nguyễn Ngọc Trường Sơn',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    content: 'Very precise drawing technique! White gets active rook checks but Black king hides behind c3. Aronian was pushing hard but black was solid.',
    createdAt: hoursAgo(3),
    likesCount: 15
  },
  {
    id: 'comment_2',
    postId: 'post_1',
    authorId: 'player_1',
    authorName: 'Phạm Minh Đức',
    authorAvatar: DEFAULT_AVATARS[1],
    content: 'Endgame is always my biggest weakness. Thanks for sharing this breakdown, Grandmaster!',
    createdAt: hoursAgo(2),
    likesCount: 4
  },
  {
    id: 'comment_3',
    postId: 'post_2',
    authorId: 'player_4',
    authorName: 'Trần Bảo Long',
    authorAvatar: DEFAULT_AVATARS[4],
    content: 'Easiest checkmate puzzle of the day: Qxf7#! Classic Scholar’s Mate punishment.',
    createdAt: hoursAgo(7),
    likesCount: 8
  }
];

export const seedBookings: Booking[] = [
  {
    id: 'booking_1',
    studentId: 'player_1',
    coachId: 'coach_kim_chi',
    date: daysFromNow(2).split('T')[0],
    timeSlot: '17:00',
    durationHours: 1,
    totalPrice: 350000,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    createdAt: daysAgo(2)
  },
  {
    id: 'booking_2',
    studentId: 'player_2',
    coachId: 'coach_truong_son',
    date: daysFromNow(4).split('T')[0],
    timeSlot: '14:00',
    durationHours: 2,
    totalPrice: 2400000,
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'bank_transfer',
    createdAt: daysAgo(1)
  }
];

export const seedNotifications: Notification[] = [
  {
    id: 'notif_1',
    recipientId: 'admin_user',
    senderId: 'player_1',
    senderName: 'Phạm Minh Đức',
    senderAvatar: DEFAULT_AVATARS[1],
    type: 'follow',
    targetId: 'admin_user',
    title: 'New Follower',
    message: 'Phạm Minh Đức is now following you.',
    isRead: false,
    createdAt: hoursAgo(1)
  },
  {
    id: 'notif_2',
    recipientId: 'coach_truong_son',
    senderId: 'player_2',
    senderName: 'Nguyễn Hoàng Nam',
    senderAvatar: DEFAULT_AVATARS[2],
    type: 'booking',
    targetId: 'booking_2',
    title: 'Lesson Booking Request',
    message: 'Nguyễn Hoàng Nam has requested a booking for 14:00 on ' + daysFromNow(4).split('T')[0],
    isRead: false,
    createdAt: hoursAgo(5)
  }
];

export const seedFollows = [
  { id: 'player_1_coach_le_quang_liem', followerId: 'player_1', followingId: 'coach_le_quang_liem', createdAt: daysAgo(30) },
  { id: 'player_2_coach_le_quang_liem', followerId: 'player_2', followingId: 'coach_le_quang_liem', createdAt: daysAgo(20) },
  { id: 'player_3_coach_le_quang_liem', followerId: 'player_3', followingId: 'coach_le_quang_liem', createdAt: daysAgo(15) },
  { id: 'player_1_coach_truong_son', followerId: 'player_1', followingId: 'coach_truong_son', createdAt: daysAgo(25) },
  { id: 'player_1_admin_user', followerId: 'player_1', followingId: 'admin_user', createdAt: daysAgo(10) }
];

