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
  const [requestExperience, setRequestExperience] = useState(2);
  const [requestRates, setRequestRates] = useState(200000);

  // Counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfileData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const profile = await userService.getUser(id);
      if (!profile) {
        addToast('User profile not found.', 'error');
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

      // Load specific tab contents
      await loadTabContents(profile.uid, currentTab);
    } catch (err) {
      console.error(err);
      addToast('Failed to load user profile.', 'error');
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
      addToast('Please login to follow players.', 'warning');
      navigate('/auth');
      return;
    }
    if (!userProfile) return;

    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, userProfile.uid);
        setFollowersCount(prev => Math.max(0, prev - 1));
        setIsFollowing(false);
        addToast(`Unfollowed ${userProfile.fullName}`, 'info');
      } else {
        await userService.followUser(currentUser.uid, userProfile.uid);
        setFollowersCount(prev => prev + 1);
        setIsFollowing(true);
        addToast(`Following ${userProfile.fullName}`, 'success');
      }
    } catch (err) {
      addToast('Failed to execute follow toggle.', 'error');
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
      addToast('Profile updated successfully!', 'success');
      setIsEditModalOpen(false);
      await refreshProfile();
      fetchProfileData();
    } catch (err) {
      addToast('Failed to update profile.', 'error');
    }
  };

  const handleUpgradeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await userService.submitRoleRequest(currentUser.uid, requestRole, {
        bio: requestBio,
        experience: Number(requestExperience),
        rates: Number(requestRates)
      });
      addToast('Request submitted. An administrator will review your application.', 'success');
      setIsUpgradeModalOpen(false);
      fetchProfileData();
    } catch (err) {
      addToast('Failed to submit application.', 'error');
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    try {
      await notificationService.markAsRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      addToast('Notification marked as read.', 'success');
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

            <p className="text-sm text-neutral-300 mb-6">{userProfile.bio || 'No bio yet.'}</p>

            <div className="space-y-3 text-xs text-neutral-400 mb-6">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <MapPin size={14} className="text-gold" />
                <span>{userProfile.location.city}, {userProfile.location.country}</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <Calendar size={14} className="text-neutral-500" />
                <span>Joined {new Date(userProfile.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Follow stats */}
            <div className="flex items-center justify-center lg:justify-start gap-6 border-y border-darkborder py-3 mb-6 text-xs">
              <div>
                <span className="font-bold text-white block text-sm">{followersCount}</span>
                <span className="text-neutral-500 uppercase tracking-wider font-semibold">Followers</span>
              </div>
              <div>
                <span className="font-bold text-white block text-sm">{followingCount}</span>
                <span className="text-neutral-500 uppercase tracking-wider font-semibold">Following</span>
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
                    <span>Edit Profile</span>
                  </Button>

                  {userProfile.role === 'player' && (
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold"
                      onClick={() => setIsUpgradeModalOpen(true)}
                    >
                      Apply for Coach/Admin
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
              { id: 'overview', label: 'Overview', icon: <Award size={16} /> },
              { id: 'posts', label: 'Posts', icon: <BookOpen size={16} /> },
              { id: 'tournaments', label: 'Tournaments', icon: <Trophy size={16} /> },
              ...(isOwnProfile ? [{ id: 'bookings', label: 'My Bookings', icon: <Calendar size={16} /> }] : []),
              ...(isOwnProfile ? [{ id: 'notifications', label: 'Notifications', icon: <Inbox size={16} /> }] : [])
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
                              addToast('Lesson confirmed!', 'success');
                              fetchProfileData();
                            }}
                          >
                            Accept
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={async () => {
                              const reason = prompt('Cancellation reason:');
                              if (reason) {
                                  await bookingService.updateBookingStatus(book.id, 'cancelled', reason);
                                  addToast('Lesson declined.', 'info');
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
                            await bookingService.updateBookingStatus(book.id, 'cancelled', 'Cancelled by student');
                            addToast('Booking cancelled.', 'info');
                            fetchProfileData();
                          }}
                        >
                          Cancel
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
                      addToast('All notifications marked as read.', 'success');
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
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Chess Profile">
        <form onSubmit={handleEditProfileSubmit} className="space-y-4">
          <Input label="Full Name" type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          <Input label="Bio" isTextArea value={editBio} onChange={(e) => setEditBio(e.target.value)} />
          <Input label="City" type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
          <Input label="FIDE ID" type="text" value={editFideId} onChange={(e) => setEditFideId(e.target.value)} placeholder="e.g. 12401137" />
          
          <div className="grid grid-cols-3 gap-3 border-t border-darkborder pt-4">
            <Input label="Rapid Rating" type="number" value={editRapid} onChange={(e) => setEditRapid(Number(e.target.value))} />
            <Input label="Blitz Rating" type="number" value={editBlitz} onChange={(e) => setEditBlitz(Number(e.target.value))} />
            <Input label="Classical Rating" type="number" value={editClassical} onChange={(e) => setEditClassical(Number(e.target.value))} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Request Upgrade Role Modal */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Verify Special Chess Status">
        <form onSubmit={handleUpgradeRoleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Request Role Target</label>
            <select
              value={requestRole}
              onChange={(e) => setRequestRole(e.target.value as UserRole)}
              className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="coach">Verified Coach</option>
              <option value="club_admin">Club Admin Representative</option>
              <option value="tournament_organizer">Tournament Organizer</option>
            </select>
          </div>

          <Input 
            label="Application Statement" 
            isTextArea 
            rows={4} 
            value={requestBio} 
            onChange={(e) => setRequestBio(e.target.value)} 
            placeholder={
              requestRole === 'coach' 
                ? 'Detail your coaching experience, chess achievements, titles, and teaching methodologies...'
                : requestRole === 'club_admin'
                  ? 'Detail the name, logo, target city, and founded history of the club you represent...'
                  : 'Detail past chess tournaments you have successfully hosted, and your association with local federations...'
            }
            required
          />

          {requestRole === 'coach' && (
            <div className="grid grid-cols-2 gap-4 border-t border-darkborder pt-4">
              <Input label="Experience (Years)" type="number" value={requestExperience} onChange={(e) => setRequestExperience(Number(e.target.value))} />
              <Input label="Hourly Rates (VND)" type="number" value={requestRates} onChange={(e) => setRequestRates(Number(e.target.value))} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
            <Button variant="outline" type="button" onClick={() => setIsUpgradeModalOpen(false)}>Cancel</Button>
            <Button variant="gold" type="submit">Submit Application</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Profile;
