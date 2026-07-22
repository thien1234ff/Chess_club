import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { coachService } from '../services/coachService';
import { clubService } from '../services/clubService';
import { postService } from '../services/postService';
import type { Tournament, Coach, Club, Post, User } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { Trophy, Users, Star, ArrowRight, Sparkles } from 'lucide-react';
import * as seeder from '../utils/seeder';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const searchQuery = searchParams.get('search') || '';

  // Data States
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [coaches, setCoaches] = useState<{ coach: Coach; user: User }[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Statistics
  const stats = {
    players: '10,000+',
    coaches: '500+',
    clubs: '200+',
    tournaments: '300+'
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const tourList = await tournamentService.getTournaments();
        const coachList = await coachService.getCoaches();
        const clubList = await clubService.getClubs();
        const postList = await postService.getPosts('latest');

        // Populate lists
        setTournaments(tourList.filter(t => t.status === 'upcoming').slice(0, 3));
        setCoaches(coachList.slice(0, 3));
        setClubs(clubList.slice(0, 3));
        setPosts(postList.slice(0, 3));
      } catch (err) {
        console.error('Error loading landing page data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const hasSearch = searchQuery.trim().length > 0;

  // Filter lists based on Search Query
  const filteredTours = tournaments.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCoaches = coaches.filter(c => 
    c.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-charcoal min-h-screen text-left">
      {/* Hero Section */}
      {!hasSearch && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-gold-muted border border-gold/20 px-3 py-1 rounded-full text-gold text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" />
              <span>Hệ sinh thái Cờ vua ChessHub Việt Nam</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold font-display text-white leading-tight">
              Hành trình Cờ vua của bạn <br />
              <span className="text-gold">Bắt đầu từ đây.</span>
            </h1>
            <p className="text-lg text-neutral-400 max-w-xl">
              Học tập, giao lưu, thi đấu và phát triển cùng cộng đồng cờ vua Việt Nam. Khám phá các huấn luyện viên FIDE chuyên nghiệp, tham gia câu lạc bộ và đăng ký các giải đấu hệ Thụy Sĩ.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button variant="gold" size="lg" onClick={() => navigate('/tournaments')} rightIcon={<Trophy size={18} />}>
                Khám phá Giải đấu
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/coaches')}>
                Tìm Huấn luyện viên
              </Button>
            </div>
          </div>
          
          {/* Hero Chess Art (Interactive/styled) */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute inset-0 bg-gold-muted blur-3xl opacity-20 rounded-full" />
            <div className="relative border-4 border-darkborder bg-darkcard rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
              <div className="text-7xl">👑</div>
              <div className="text-center">
                <h3 className="font-display font-bold text-white tracking-wide">Giao diện Cờ vua ChessHub</h3>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Sẵn sàng thi đấu</p>
              </div>
              <div className="grid grid-cols-4 gap-2 w-full text-center py-2 border-t border-darkborder/50">
                <div>
                  <span className="text-xs text-neutral-500 block uppercase tracking-wider font-semibold">Rapid</span>
                  <span className="font-bold text-sky-400 font-display">1200</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 block uppercase tracking-wider font-semibold">Blitz</span>
                  <span className="font-bold text-amber-400 font-display">1200</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 block uppercase tracking-wider font-semibold">Puzzles</span>
                  <span className="font-bold text-emerald-400 font-display">1200</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 block uppercase tracking-wider font-semibold">Games</span>
                  <span className="font-bold text-white font-display">0</span>
                </div>
              </div>
              <Button variant="secondary" className="w-full text-xs font-semibold" onClick={() => navigate('/learn?tab=puzzles')}>
                Giải thế cờ hàng ngày
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Results Overlay */}
      {hasSearch && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8 border-b border-darkborder pb-4">
            <h2 className="text-2xl font-bold font-display text-white">
              Kết quả tìm kiếm cho <span className="text-gold">"{searchQuery}"</span>
            </h2>
            <Link to="/" className="text-xs text-gold hover:underline font-bold uppercase tracking-wider">Xóa tìm kiếm</Link>
          </div>

          <div className="space-y-8">
            {/* Tournaments Search */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                <Trophy size={16} />
                <span>Giải đấu ({filteredTours.length})</span>
              </h3>
              {filteredTours.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">Không tìm thấy giải đấu phù hợp.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredTours.map(tour => (
                    <Card key={tour.id} hoverable className="flex flex-col justify-between h-full p-5">
                      <div>
                        <Badge variant="gold" className="mb-3">{tour.format}</Badge>
                        <h4 className="text-base font-bold text-white font-display mb-2">{tour.name}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-4">{tour.description}</p>
                      </div>
                      <div className="border-t border-darkborder pt-3 flex items-center justify-between mt-auto">
                        <span className="text-xs text-neutral-500 font-medium">📍 {tour.location.city}</span>
                        <Button size="sm" onClick={() => navigate(`/tournaments/${tour.id}`)}>Chi tiết</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Coaches Search */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                <Star size={16} />
                <span>Huấn luyện viên ({filteredCoaches.length})</span>
              </h3>
              {filteredCoaches.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">Không tìm thấy huấn luyện viên phù hợp.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredCoaches.map(({ coach, user }) => (
                    <Card key={coach.uid} hoverable className="p-5 flex flex-col justify-between h-full">
                      <div className="flex gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-darkborder">
                          <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{user.fullName}</h4>
                          <span className="text-xs text-neutral-500 block">Rating: ⭐ {coach.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 mb-4">{coach.teachingMethodology}</p>
                      <div className="border-t border-darkborder pt-3 flex justify-between items-center mt-auto">
                        <span className="text-sm font-bold text-gold">{coach.hourlyRate.toLocaleString()} VND/giờ</span>
                        <Button size="sm" onClick={() => navigate(`/coaches/${coach.uid}`)}>Hồ sơ</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Clubs Search */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                <Users size={16} />
                <span>Câu lạc bộ ({filteredClubs.length})</span>
              </h3>
              {filteredClubs.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">Không tìm thấy câu lạc bộ phù hợp.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredClubs.map(club => (
                    <Card key={club.id} hoverable className="p-5 flex flex-col justify-between h-full">
                      <div>
                        <h4 className="font-bold text-white text-sm font-display mb-2">{club.name}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-4">{club.description}</p>
                      </div>
                      <div className="border-t border-darkborder pt-3 flex justify-between items-center mt-auto">
                        <span className="text-xs text-neutral-500">{club.membersCount} thành viên</span>
                        <Button size="sm" onClick={() => navigate(`/clubs/${club.id}`)}>Tham gia CLB</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main landing sections (Only visible when not searching) */}
      {!hasSearch && (
        <>
          {/* Statistics Grid */}
          <div className="border-y border-darkborder bg-darkcard/30">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Kỳ thủ hoạt động', value: stats.players },
                { label: 'Huấn luyện viên xác minh', value: stats.coaches },
                { label: 'Câu lạc bộ cờ vua', value: stats.clubs },
                { label: 'Giải đấu đã tổ chức', value: stats.tournaments }
              ].map(stat => (
                <div key={stat.label} className="text-center md:text-left">
                  <span className="text-3xl font-extrabold font-display text-white block">{stat.value}</span>
                  <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mt-1 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Giải đấu nổi bật */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Featured Tournaments</h2>
                <p className="text-xs text-neutral-500 mt-1">Thử thách bản thân trong các giải đấu hệ Thụy Sĩ sắp tới</p>
              </div>
              <Link to="/tournaments" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>Xem tất cả giải đấu</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {tournaments.map(tour => (
                <Card key={tour.id} hoverable bordered className="flex flex-col h-full">
                  <div className="h-40 overflow-hidden bg-neutral-900 border-b border-darkborder relative">
                    <img src={tour.bannerUrl} alt="banner" className="h-full w-full object-cover opacity-70" />
                    <div className="absolute top-3 right-3">
                      <Badge variant="gold">{tour.format}</Badge>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{tour.name}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-3 mb-6">{tour.description}</p>
                    </div>
                    <div className="space-y-2 border-t border-darkborder/50 pt-4 text-xs text-neutral-400">
                      <div className="flex justify-between">
                        <span>Lệ phí: {tour.entryFee === 0 ? 'Miễn phí' : `${tour.entryFee.toLocaleString()} VND`}</span>
                        <span className="font-semibold text-white">Giải thưởng: {tour.prizePool}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bắt đầu: {new Date(tour.startDate).toLocaleDateString('vi-VN')}</span>
                        <span>Khu vực: {tour.location.city}</span>
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full text-xs font-semibold mt-6" onClick={() => navigate(`/tournaments/${tour.id}`)}>
                      Xem chi tiết
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Discover Coaches & Popular Clubs */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-darkborder">
            {/* Left: Coaches */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Tìm kiếm Huấn luyện viên</h2>
                  <p className="text-xs text-neutral-500 mt-1">Học kèm riêng với các kiện tướng cờ vua chuyên nghiệp</p>
                </div>
                <Link to="/coaches" className="text-xs font-bold text-gold hover:underline">Xem tất cả</Link>
              </div>

              <div className="space-y-4">
                {coaches.map(({ coach, user }) => (
                  <Card key={coach.uid} hoverable className="p-4 flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-darkborder border border-neutral-700 shrink-0">
                      <img src={user.avatarUrl || seeder.DEFAULT_AVATARS[0]} alt={user.fullName} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-sm">{user.fullName}</h4>
                        {user.title && <Badge variant="gold">{user.title}</Badge>}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{coach.teachingMethodology}</p>
                      <span className="text-xs text-neutral-500 mt-2 block">⭐ {coach.rating} ({coach.reviewsCount} đánh giá) | {coach.hourlyRate.toLocaleString()} VND/giờ</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/coaches/${coach.uid}`)}>
                      Profile
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right: Câu lạc bộ phổ biến */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Popular Chess Clubs</h2>
                  <p className="text-xs text-neutral-500 mt-1">Gia nhập các cộng đồng cờ vua sinh viên và tư nhân</p>
                </div>
                <Link to="/clubs" className="text-xs font-bold text-gold hover:underline">Xem tất cả</Link>
              </div>

              <div className="space-y-4">
                {clubs.map(club => (
                  <Card key={club.id} hoverable className="p-4 flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-darkborder border border-neutral-700 shrink-0">
                      <img src={club.logoUrl} alt={club.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-white text-sm font-display line-clamp-1">{club.name}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-1">{club.description}</p>
                      <span className="text-xs text-neutral-500 mt-2 block">👥 {club.membersCount} Thành viên | Thành lập {club.foundedAt}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/clubs/${club.id}`)}>
                      Tham gia
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Social Xem trước Bản tin Cộng đồng */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-darkborder">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Community Feed Preview</h2>
                <p className="text-xs text-neutral-500 mt-1">Xem các kì thủ và huấn luyện viên đang chia sẻ những gì</p>
              </div>
              <Link to="/community" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>Đến Bản tin</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map(post => (
                <Card key={post.id} hoverable className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-full bg-darkborder overflow-hidden">
                        <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{post.authorName}</h4>
                        <span className="text-[10px] text-neutral-500 block">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-200 line-clamp-4 mb-4">{post.content}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 border-t border-darkborder/50 pt-4 mt-auto">
                    <span>❤️ {post.likesCount} Lượt thích</span>
                    <span>💬 {post.commentsCount} Bình luận</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Final Call to Action */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-darkborder text-center space-y-6">
            <h2 className="text-3xl font-bold font-display text-white tracking-wide">Gia nhập Cộng đồng ChessHub</h2>
            <p className="text-neutral-400 max-w-md mx-auto text-sm">
              Tạo tài khoản hôm nay để chia sẻ ván cờ, đặt câu hỏi cho các đại kiện tướng, đăng ký giải đấu và nâng cao hệ số Elo của bạn.
            </p>
            <div className="pt-2">
              <Button variant="gold" size="lg" onClick={() => navigate('/auth')}>
                Bắt đầu ngay
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Home;
