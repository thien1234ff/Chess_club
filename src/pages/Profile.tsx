import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { bookingService } from '../services/bookingService';
import { tournamentService } from '../services/tournamentService';
import { notificationService } from '../services/notificationService';
import { useToast } from '../contexts/ToastContext';
import type { User, Post, Booking, Tournament, Notification, UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { 
  User as UserIcon, Calendar, MapPin, Award, 
  BookOpen, Trophy, Plus, Check, Settings,
  Inbox, Eye
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs
  const currentTab = searchParams.get('tab') || 'overview';
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Edit Profile States
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editFideId, setEditFideId] = useState('');
  const [editRapid, setEditRapid] = useState(1200);
  const [editBlitz, setEditBlitz] = useState(1200);
  const [editClassical, setEditClassical] = useState(1200);

  // Upgrade Role States
  const [requestRole, setRequestRole] = useState<UserRole>('coach');
  const [requestBio, setRequestBio] = useState('');
  
  // Expanded Coach Upgrade states
  const [requestFullName, setRequestFullName] = useState('');
  const [requestFideId, setRequestFideId] = useState('');
  const [requestFideRating, setRequestFideRating] = useState<number | ''>('');
  const [requestChesscomUsername, setRequestChesscomUsername] = useState('');
  const [requestChesscomElo, setRequestChesscomElo] = useState<number | ''>('');
  const [requestChessExperience, setRequestChessExperience] = useState(5);
  const [requestCoachingExperience, setRequestCoachingExperience] = useState(2);
  const [requestSpecializations, setRequestSpecializations] = useState<string[]>(['Beginner', 'Tactics']);
  const [requestTeachingFormat, setRequestTeachingFormat] = useState<'online' | 'offline' | 'both'>('both');
  const [requestHourlyRate, setRequestHourlyRate] = useState(200000);
  const [requestProofUrl, setRequestProofUrl] = useState('');

  // Counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfileData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const profile = await userService.getUser(id);
      if (!profile) {
        addToast('Không tìm thấy thông tin kì thủ.', 'error');
        navigate('/');
        return;
      }
      setUserProfile(profile);
      const isOwn = currentUser?.uid === profile.uid;
      setIsOwnProfile(isOwn);

      // Fetch follow details
      const followers = await userService.getFollowersCount(profile.uid);
      const following = await userService.getFollowingCount(profile.uid);
      setFollowersCount(followers);
      setFollowingCount(following);

      if (currentUser && !isOwn) {
        const followingState = await userService.isFollowing(currentUser.uid, profile.uid);
        setIsFollowing(followingState);
      }

      // Populate edit states
      setEditFullName(profile.fullName);
      setEditBio(profile.bio);
      setEditCity(profile.location.city);
      setEditFideId(profile.fideId || '');
      setEditRapid(profile.ratings.rapid);
      setEditBlitz(profile.ratings.blitz);
      setEditClassical(profile.ratings.classical);

      // Prefill upgrade states
      setRequestFullName(profile.fullName);

      if (isOwn && searchParams.get('applyCoach') === 'true') {
        setIsUpgradeModalOpen(true);
        setRequestRole('coach');
        // Clear param
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('applyCoach');
        setSearchParams(newParams, { replace: true });
      }

      // Load specific tab contents
      await loadTabContents(profile.uid, currentTab);
    } catch (err) {
      console.error(err);
      addToast('Không thể tải thông tin cá nhân.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [id, currentTab, currentUser]);

  const loadTabContents = async (uid: string, tab: string) => {
    try {
      if (tab === 'posts') {
        const allPosts = await postService.getPosts('latest');
        setPosts(allPosts.filter(p => p.authorId === uid));
      } else if (tab === 'bookings' && currentUser) {
        const type = currentUser.role === 'coach' ? 'coach' : 'student';
        const list = await bookingService.getBookings(uid, type);
        setBookings(list);
      } else if (tab === 'tournaments') {
        const allTours = await tournamentService.getTournaments();
        setTournaments(allTours.slice(0, 5));
      } else if (tab === 'notifications' && currentUser?.uid === uid) {
        const list = await notificationService.getNotifications(uid);
        setNotifications(list);
      }
    } catch (error) {
      console.error('Error loading tab content', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      addToast('Vui lòng đăng nhập để theo dõi các kỳ thủ.', 'warning');
      navigate('/auth');
      return;
    }
    if (!userProfile) return;

    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, userProfile.uid);
        setFollowersCount(prev => Math.max(0, prev - 1));
        setIsFollowing(false);
        addToast(`Đã bỏ theo dõi ${userProfile.fullName}`, 'info');
      } else {
        await userService.followUser(currentUser.uid, userProfile.uid);
        setFollowersCount(prev => prev + 1);
        setIsFollowing(true);
        addToast(`Đã theo dõi ${userProfile.fullName}`, 'success');
      }
    } catch (err) {
      addToast('Không thể thực hiện thao tác theo dõi.', 'error');
    }
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await userService.updateUser(currentUser.uid, {
        fullName: editFullName,
        bio: editBio,
        fideId: editFideId || '',
        location: { city: editCity, country: currentUser.location?.country || 'VN' },
        ratings: {
          ...currentUser.ratings,
          rapid: Number(editRapid),
          blitz: Number(editBlitz),
          classical: Number(editClassical)
        }
      });
      addToast('Đã cập nhật hồ sơ thành công!', 'success');
      setIsEditModalOpen(false);
      await refreshProfile();
      fetchProfileData();
    } catch (err) {
      addToast('Cập nhật thông tin thất bại.', 'error');
    }
  };

  const handleUpgradeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      if (requestRole === 'coach') {
        await userService.submitRoleRequest(currentUser.uid, 'coach', {
          fullName: requestFullName || currentUser.fullName,
          fideId: requestFideId || undefined,
          fideRating: requestFideRating ? Number(requestFideRating) : undefined,
          chesscomUsername: requestChesscomUsername || undefined,
          chesscomElo: requestChesscomElo ? Number(requestChesscomElo) : undefined,
          chessExperienceYears: Number(requestChessExperience),
          coachingExperienceYears: Number(requestCoachingExperience),
          specializations: requestSpecializations,
          teachingFormat: requestTeachingFormat,
          hourlyRate: Number(requestHourlyRate),
          bio: requestBio,
          proofUrl: requestProofUrl || undefined
        });
      } else {
        // Fallback parameter mappings for non-coach requests
        await userService.submitRoleRequest(currentUser.uid, requestRole, {
          fullName: currentUser.fullName,
          chessExperienceYears: 0,
          coachingExperienceYears: 0,
          specializations: [],
          teachingFormat: 'online',
          hourlyRate: 0,
          bio: requestBio
        });
      }
      addToast('Hồ sơ ứng tuyển đã được nộp thành công! Quản trị viên sẽ sớm xét duyệt hồ sơ của bạn.', 'success');
      setIsUpgradeModalOpen(false);
      fetchProfileData();
    } catch (err) {
      console.error(err);
      addToast('Nộp hồ sơ ứng tuyển thất bại.', 'error');
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    try {
      await notificationService.markAsRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      addToast('Đã đánh dấu thông báo là đã đọc.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const setTab = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-charcoal text-left">
      {/* Profile Cover & Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-darkborder bg-darkcard h-48 md:h-64 mb-6">
        {userProfile.coverUrl ? (
          <img src={userProfile.coverUrl} alt="cover" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-neutral-900 to-darkborder" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Avatar & Basic Details Card */}
        <div className="lg:col-span-1">
          <div className="relative -mt-24 pl-4 mb-4 flex justify-center lg:justify-start">
            <div className="h-32 w-32 rounded-full border-4 border-charcoal bg-darkcard overflow-hidden flex items-center justify-center shadow-xl">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt={userProfile.fullName} className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={56} className="text-neutral-500" />
              )}
            </div>
          </div>

          <div className="bg-darkcard border border-darkborder rounded-2xl p-6 text-center lg:text-left">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-display text-white">{userProfile.fullName}</h2>
                {userProfile.title && <Badge variant="gold">{userProfile.title}</Badge>}
                <Badge variant={userProfile.role === 'admin' ? 'danger' : userProfile.role === 'coach' ? 'gold' : 'default'}>
                  {userProfile.role.replace('_', ' ')}
                </Badge>
              </div>
              <span className="text-sm text-neutral-500">@{userProfile.username}</span>
            </div>

            <p className="text-sm text-neutral-300 mb-6">{userProfile.bio || 'Chưa có giới thiệu.'}</p>

            <div className="space-y-3 text-xs text-neutral-400 mb-6">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <MapPin size={14} className="text-gold" />
                <span>{userProfile.location.city}, {userProfile.location.country}</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <Calendar size={14} className="text-neutral-500" />
                <span>Gia nhập ngày {new Date(userProfile.joinedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Follow stats */}
            <div className="flex items-center justify-center lg:justify-start gap-6 border-y border-darkborder py-3 mb-6 text-xs">
              <div>
                <span className="font-bold text-white block text-sm">{followersCount}</span>
                <span className="text-neutral-500 uppercase tracking-wider font-semibold">Người theo dõi</span>
              </div>
              <div>
                <span className="font-bold text-white block text-sm">{followingCount}</span>
                <span className="text-neutral-500 uppercase tracking-wider font-semibold">Đang theo dõi</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {isOwnProfile ? (
                <>
                  <Button 
                    variant="secondary" 
                    className="w-full flex items-center justify-center gap-2 text-xs"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Settings size={14} />
                    <span>Chỉnh sửa Hồ sơ</span>
                  </Button>

                  {userProfile.role === 'player' && (
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold"
                      onClick={() => setIsUpgradeModalOpen(true)}
                    >
                      Đăng ký HLV / Ban tổ chức
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant={isFollowing ? 'outline' : 'gold'}
                    className="w-full flex items-center justify-center gap-2 text-xs"
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? <Check size={14} /> : <Plus size={14} />}
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </Button>
                  
                  {userProfile.role === 'coach' && (
                    <Button
                      variant="primary"
                      className="w-full text-xs"
                      onClick={() => navigate(`/coaches/${userProfile.uid}`)}
                    >
                      Book a Lesson
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Tabs Section */}
        <div className="lg:col-span-3">
          {/* Tab Selection */}
          <div className="flex border-b border-darkborder mb-6 overflow-x-auto gap-2">
            {[
              { id: 'overview', label: 'Tổng quan', icon: <Award size={16} /> },
              { id: 'posts', label: 'Bài đăng', icon: <BookOpen size={16} /> },
              { id: 'tournaments', label: 'Giải đấu', icon: <Trophy size={16} /> },
              ...(isOwnProfile ? [{ id: 'bookings', label: 'Lịch học', icon: <Calendar size={16} /> }] : []),
              ...(isOwnProfile ? [{ id: 'notifications', label: 'Thông báo', icon: <Inbox size={16} /> }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === tab.id
                    ? 'border-gold text-gold font-bold'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Elo ratings */}
              <Card>
                <h3 className="text-base font-bold font-display text-white mb-4 uppercase tracking-wider text-neutral-400">Elo Chess Ratings</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Rapid', rating: userProfile.ratings.rapid, color: 'text-orange-400' },
                    { label: 'Blitz', rating: userProfile.ratings.blitz, color: 'text-amber-400' },
                    { label: 'Classical', rating: userProfile.ratings.classical, color: 'text-sky-400' },
                    { label: 'Puzzles', rating: userProfile.ratings.puzzle, color: 'text-emerald-400' }
                  ].map(stat => (
                    <div key={stat.label} className="bg-charcoal border border-darkborder p-4 rounded-xl text-center">
                      <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">{stat.label}</span>
                      <span className={`block text-2xl font-bold font-display mt-1 ${stat.color}`}>{stat.rating}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Statistics progress breakdown */}
              <Card>
                <h3 className="text-base font-bold font-display text-white mb-4 uppercase tracking-wider text-neutral-400">Match Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Games */}
                  <div className="flex flex-col justify-center border-r border-darkborder/50 pr-6 text-center md:text-left">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Matches</span>
                    <span className="text-4xl font-bold font-display text-white mt-2">{userProfile.stats.gamesPlayed}</span>
                  </div>

                  {/* Wins/Losses breakdown progress bar */}
                  <div className="md:col-span-2 flex flex-col justify-center">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-emerald-400">Wins ({userProfile.stats.wins})</span>
                      <span className="text-neutral-400">Draws ({userProfile.stats.draws})</span>
                      <span className="text-red-400">Losses ({userProfile.stats.losses})</span>
                    </div>
                    {/* Bar */}
                    <div className="h-4 rounded-full overflow-hidden flex bg-darkborder">
                      {userProfile.stats.gamesPlayed > 0 ? (
                        <>
                          <div 
                            style={{ width: `${(userProfile.stats.wins / userProfile.stats.gamesPlayed) * 100}%` }}
                            className="bg-emerald-500 h-full"
                          />
                          <div 
                            style={{ width: `${(userProfile.stats.draws / userProfile.stats.gamesPlayed) * 100}%` }}
                            className="bg-neutral-500 h-full"
                          />
                          <div 
                            style={{ width: `${(userProfile.stats.losses / userProfile.stats.gamesPlayed) * 100}%` }}
                            className="bg-red-500 h-full"
                          />
                        </>
                      ) : (
                        <div className="w-full bg-darkborder h-full" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentTab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  This user hasn't published any community posts yet.
                </div>
              ) : (
                posts.map(post => (
                  <Card key={post.id} hoverable className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{post.authorName}</h4>
                        <span className="text-xs text-neutral-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="gold" size="sm">{post.type}</Badge>
                    </div>
                    <p className="text-sm text-neutral-200 line-clamp-3 mb-4">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <span>❤️ {post.likesCount} Likes</span>
                      <span>💬 {post.commentsCount} Comments</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {currentTab === 'tournaments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 font-display mb-2">Registered Tournaments</h3>
              {tournaments.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">No registered tournaments found.</div>
              ) : (
                tournaments.map(tour => (
                  <Card key={tour.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{tour.name}</h4>
                      <div className="text-xs text-neutral-500 mt-1 flex items-center gap-4">
                        <span>Format: {tour.format.replace('_', ' ')}</span>
                        <span>Date: {new Date(tour.startDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${tour.id}`)}>
                      <Eye size={12} className="mr-1" />
                      <span>View</span>
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )}

          {currentTab === 'bookings' && isOwnProfile && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 font-display mb-2">Your Schedulers</h3>
              {bookings.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">No bookings scheduled yet.</div>
              ) : (
                bookings.map(book => (
                  <Card key={book.id} className="p-5 border-l-4 border-l-gold">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Lesson on {book.date} at {book.timeSlot}</span>
                          <Badge variant={book.status === 'confirmed' ? 'success' : book.status === 'pending' ? 'warning' : 'danger'}>
                            {book.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Duration: {book.durationHours} hr(s) | Price: {book.totalPrice.toLocaleString()} VND</p>
                      </div>
                      
                      {book.status === 'pending' && currentUser?.role === 'coach' && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="gold" 
                            size="sm" 
                            onClick={async () => {
                              await bookingService.updateBookingStatus(book.id, 'confirmed');
                              addToast('Đã xác nhận buổi học!', 'success');
                              fetchProfileData();
                            }}
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={async () => {
                              const reason = prompt('Lý do hủy lịch:');
                              if (reason) {
                                  await bookingService.updateBookingStatus(book.id, 'cancelled', reason);
                                  addToast('Bắt buộc từ chối buổi học.', 'info');
                                  fetchProfileData();
                              }
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      )}

                      {book.status === 'pending' && currentUser?.role !== 'coach' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await bookingService.updateBookingStatus(book.id, 'cancelled', 'Học viên hủy lịch');
                            addToast('Hủy đặt lịch thành công.', 'info');
                            fetchProfileData();
                          }}
                        >
                          Hủy lịch
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {currentTab === 'notifications' && isOwnProfile && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 font-display">Inbox Alert</h3>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={async () => {
                      await notificationService.markAllAsRead(currentUser!.uid);
                      addToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
                      fetchProfileData();
                    }}
                    className="text-xs font-bold text-gold hover:underline cursor-pointer"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
              
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">Your inbox is currently empty.</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border border-darkborder flex items-start justify-between gap-4 transition-colors ${
                      notif.isRead ? 'bg-darkcard/50 opacity-60' : 'bg-darkcard border-l-2 border-l-gold'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{notif.title}</h4>
                      <p className="text-sm text-neutral-200 mt-1">{notif.message}</p>
                      <span className="text-[10px] text-neutral-600 mt-2 block">{new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                    {!notif.isRead && (
                      <Button variant="ghost" size="sm" className="px-2 py-1 text-xs" onClick={() => handleMarkNotifRead(notif.id)}>
                        Mark Read
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa Hồ sơ cờ vua">
        <form onSubmit={handleEditProfileSubmit} className="space-y-4">
          <Input label="Họ và Tên" type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          <Input label="Giới thiệu bản thân" isTextArea value={editBio} onChange={(e) => setEditBio(e.target.value)} />
          <Input label="Thành phố" type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
          <Input label="FIDE ID" type="text" value={editFideId} onChange={(e) => setEditFideId(e.target.value)} placeholder="Ví dụ: 12401137" />
          
          <div className="grid grid-cols-3 gap-3 border-t border-darkborder pt-4">
            <Input label="Hệ số Rapid" type="number" value={editRapid} onChange={(e) => setEditRapid(Number(e.target.value))} />
            <Input label="Hệ số Blitz" type="number" value={editBlitz} onChange={(e) => setEditBlitz(Number(e.target.value))} />
            <Input label="Hệ số Classical" type="number" value={editClassical} onChange={(e) => setEditClassical(Number(e.target.value))} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
            <Button variant="gold" type="submit">Lưu thay đổi</Button>
          </div>
        </form>
      </Modal>

      {/* Request Upgrade Role Modal */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Đăng ký danh hiệu đặc quyền">
        <form onSubmit={handleUpgradeRoleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Vai trò ứng tuyển</label>
            <select
              value={requestRole}
              onChange={(e) => setRequestRole(e.target.value as UserRole)}
              className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="coach">Huấn luyện viên xác minh</option>
              <option value="club_admin">Ban quản trị Câu lạc bộ</option>
              <option value="tournament_organizer">Ban tổ chức giải đấu</option>
            </select>
          </div>

          <Input 
            label="Hồ sơ năng lực / Giới thiệu chi tiết" 
            isTextArea 
            rows={4} 
            value={requestBio} 
            onChange={(e) => setRequestBio(e.target.value)} 
            placeholder={
              requestRole === 'coach' 
                ? 'Mô tả kinh nghiệm huấn luyện, danh hiệu cờ vua, thành tích thi đấu và phương pháp giảng dạy...'
                : requestRole === 'club_admin'
                  ? 'Mô tả tên câu lạc bộ, biểu tượng, địa phương hoạt động và lịch sử câu lạc bộ bạn đại diện...'
                  : 'Mô tả các giải đấu cờ vua bạn từng tổ chức thành công, liên kết với liên đoàn cờ địa phương...'
            }
            required
          />

          {requestRole === 'coach' && (
            <div className="space-y-4 border-t border-darkborder pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Họ và Tên Huấn luyện viên" type="text" value={requestFullName} onChange={(e) => setRequestFullName(e.target.value)} required />
                <Input label="Mức học phí dự kiến (VNĐ/giờ)" type="number" value={requestHourlyRate} onChange={(e) => setRequestHourlyRate(Number(e.target.value))} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Kinh nghiệm chơi cờ (Số năm)" type="number" value={requestChessExperience} onChange={(e) => setRequestChessExperience(Number(e.target.value))} required />
                <Input label="Kinh nghiệm huấn luyện (Số năm)" type="number" value={requestCoachingExperience} onChange={(e) => setRequestCoachingExperience(Number(e.target.value))} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="FIDE ID (Nếu có)" type="text" value={requestFideId} onChange={(e) => setRequestFideId(e.target.value)} placeholder="Ví dụ: 12401137" />
                <Input label="Hệ số Elo FIDE (Nếu có)" type="number" value={requestFideRating} onChange={(e) => setRequestFideRating(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ví dụ: 2200" />
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Hình thức giảng dạy</label>
                  <select
                    value={requestTeachingFormat}
                    onChange={(e) => setRequestTeachingFormat(e.target.value as any)}
                    className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="online">Online (Trực tuyến)</option>
                    <option value="offline">Offline (Trực tiếp)</option>
                    <option value="both">Cả hai (Online &amp; Offline)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Username Chess.com (Nếu có)" type="text" value={requestChesscomUsername} onChange={(e) => setRequestChesscomUsername(e.target.value)} placeholder="Ví dụ: magnuscarlsen" />
                <Input label="Elo Chess.com (Tự nhập, nếu có)" type="number" value={requestChesscomElo} onChange={(e) => setRequestChesscomElo(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ví dụ: 2500" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Chuyên môn giảng dạy</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Beginner', 'Opening', 'Tactics', 'Middlegame', 'Endgame', 'Game Analysis'].map((spec) => {
                    const mappedNames: Record<string, string> = {
                      Beginner: 'Cơ bản (Beginner)',
                      Opening: 'Khai cuộc (Opening)',
                      Tactics: 'Chiến thuật (Tactics)',
                      Middlegame: 'Trung cuộc (Middlegame)',
                      Endgame: 'Tàn cuộc (Endgame)',
                      'Game Analysis': 'Phân tích ván đấu'
                    };
                    return (
                      <label key={spec} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer bg-charcoal p-2.5 rounded-lg border border-darkborder hover:border-gold transition-colors">
                        <input
                          type="checkbox"
                          checked={requestSpecializations.includes(spec)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRequestSpecializations(prev => [...prev, spec]);
                            } else {
                              setRequestSpecializations(prev => prev.filter(s => s !== spec));
                            }
                          }}
                          className="rounded border-darkborder text-gold focus:ring-gold bg-charcoal"
                        />
                        <span>{mappedNames[spec]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Input 
                label="Đường dẫn Ảnh minh chứng (huy chương, chứng chỉ, Elo,... nếu có)" 
                type="text" 
                value={requestProofUrl} 
                onChange={(e) => setRequestProofUrl(e.target.value)} 
                placeholder="Ví dụ: https://imgur.com/chung-chi.jpg" 
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
            <Button variant="outline" type="button" onClick={() => setIsUpgradeModalOpen(false)}>Hủy</Button>
            <Button variant="gold" type="submit">Nộp hồ sơ ứng tuyển</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Profile;
