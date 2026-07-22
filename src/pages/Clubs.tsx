import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clubService } from '../services/clubService';
import { userService } from '../services/userService';
import { useToast } from '../contexts/ToastContext';
import type { Club, ClubMember, User, ClubType, ClubSocialLinks } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { 
  Users, MapPin, Calendar, Globe, 
  MessageSquare, Plus, Check, Trash2, Eye 
} from 'lucide-react';

export const Clubs: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Individual Club Details States
  const [detailClub, setDetailClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<{ member: ClubMember; user: User }[]>([]);
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [memberStatus, setMemberStatus] = useState<ClubMember['status'] | 'not_joined'>('not_joined');
  const [activeSubTab, setActiveSubTab] = useState<'about' | 'members' | 'admin'>('about');

  // Form States (Create Club)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [city, setCity] = useState('Hanoi');
  const [type, setType] = useState<ClubType>('university');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');

  // Creation State
  const [isCreating, setIsCreating] = useState(false);

  // View States
  const currentTab = searchParams.get('tab') || 'discover';

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (id) {
        // Individual View loading
        const club = await clubService.getClub(id);
        if (!club) {
          addToast('Club not found.', 'error');
          navigate('/clubs');
          return;
        }
        setDetailClub(club);
        setIsClubAdmin(currentUser?.uid === club.creatorId || currentUser?.role === 'admin');

        // Fetch member status
        if (currentUser) {
          const status = await clubService.checkMemberStatus(id, currentUser.uid);
          setMemberStatus(status);
        }

        // Fetch members list
        const roster = await clubService.getMembers(id);
        setMembers(roster);
      } else {
        // Feed View loading
        const list = await clubService.getClubs();
        setClubs(list);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load club details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, currentTab, currentUser]);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsCreating(true);
    try {
      await clubService.createClub({
        creatorId: currentUser.uid,
        name,
        description,
        logoUrl,
        coverUrl,
        city,
        type,
        socialLinks: { facebook, website }
      });

      addToast('Club created successfully!', 'success');
      setSearchParams({ tab: 'discover' });
    } catch (err) {
      addToast('Failed to create club.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinClub = async () => {
    if (!currentUser) {
      addToast('Please login to join chess clubs.', 'warning');
      navigate('/auth');
      return;
    }
    if (!detailClub) return;

    try {
      await clubService.joinClub(detailClub.id, currentUser.uid);
      addToast('Join application submitted to club admin.', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit application.', 'error');
    }
  };

  const handleLeaveClub = async () => {
    if (!detailClub || !currentUser) return;
    if (!window.confirm('Are you sure you want to leave this club?')) return;

    try {
      await clubService.leaveClub(detailClub.id, currentUser.uid);
      addToast('Left the club.', 'info');
      loadData();
    } catch (err) {
      addToast('Failed to leave club.', 'error');
    }
  };

  const handleApproveMember = async (userId: string) => {
    if (!detailClub) return;

    try {
      await clubService.approveMember(detailClub.id, userId);
      addToast('Member approved and welcomed to club!', 'success');
      loadData();
    } catch (err) {
      addToast('Failed to approve member.', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!detailClub) return;
    if (!window.confirm('Are you sure you want to remove this member from the roster?')) return;

    try {
      await clubService.leaveClub(detailClub.id, userId);
      addToast('Member removed from roster.', 'info');
      loadData();
    } catch (err) {
      addToast('Failed to remove member.', 'error');
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

  // INDIVIDUAL CLUB DETAILS VIEW
  if (id && detailClub) {
    const isApproved = memberStatus === 'approved';
    const isPending = memberStatus === 'pending';
    const pendingMembers = members.filter(m => m.member.status === 'pending');
    const approvedMembers = members.filter(m => m.member.status === 'approved');

    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
        <Button variant="outline" size="sm" onClick={() => navigate('/clubs')} className="mb-6">
          ← Back to Clubs Feed
        </Button>

        {/* Club Details cover card */}
        <div className="relative rounded-2xl overflow-hidden border border-darkborder bg-darkcard h-48 md:h-64 mb-6">
          {detailClub.coverUrl ? (
            <img src={detailClub.coverUrl} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-neutral-900 to-darkborder" />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Club logo & statistics card */}
          <div className="lg:col-span-1">
            <div className="relative -mt-20 pl-4 mb-4 flex justify-center lg:justify-start">
              <div className="h-28 w-28 rounded-2xl border-4 border-charcoal bg-darkcard overflow-hidden flex items-center justify-center shadow-xl">
                {detailClub.logoUrl ? (
                  <img src={detailClub.logoUrl} alt={detailClub.name} className="h-full w-full object-cover" />
                ) : (
                  <Users size={36} className="text-neutral-500" />
                )}
              </div>
            </div>

            <div className="bg-darkcard border border-darkborder rounded-2xl p-6 text-center lg:text-left">
              <div className="flex flex-col gap-2 mb-4">
                <h2 className="text-xl font-bold font-display text-white">{detailClub.name}</h2>
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <Badge variant="gold">{detailClub.location.type}</Badge>
                  <Badge variant="default">Founded {detailClub.foundedAt}</Badge>
                </div>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-4 border-y border-darkborder py-3 mb-6 text-xs text-neutral-400">
                <div>
                  <span className="font-bold text-white block text-sm">{approvedMembers.length}</span>
                  <span className="uppercase tracking-wider font-semibold text-[10px]">Members</span>
                </div>
                <div>
                  <span className="font-bold text-white block text-sm">{detailClub.location.city}</span>
                  <span className="uppercase tracking-wider font-semibold text-[10px]">City</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {isClubAdmin ? (
                  <Badge variant="gold" size="md" className="py-2 text-center block">You are the Owner</Badge>
                ) : isApproved ? (
                  <Button variant="outline" className="w-full text-xs text-red-500" onClick={handleLeaveClub}>
                    Leave Club
                  </Button>
                ) : isPending ? (
                  <Button variant="outline" className="w-full text-xs" disabled>
                    Application Pending
                  </Button>
                ) : (
                  <Button variant="gold" className="w-full text-xs" onClick={handleJoinClub}>
                    Request to Join
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: details section */}
          <div className="lg:col-span-3">
            {/* Sub Tab headers */}
            <div className="flex border-b border-darkborder mb-6 gap-2">
              <button onClick={() => setActiveSubTab('about')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeSubTab === 'about' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                About
              </button>
              <button onClick={() => setActiveSubTab('members')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeSubTab === 'members' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                Members ({approvedMembers.length})
              </button>
              {isClubAdmin && (
                <button onClick={() => setActiveSubTab('admin')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${activeSubTab === 'admin' ? 'border-gold text-gold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                  Admin Panel ({pendingMembers.length})
                </button>
              )}
            </div>

            {/* Sub Tabs Render Panels */}
            {activeSubTab === 'about' && (
              <div className="space-y-6">
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2 font-display">Club Biography</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{detailClub.description}</p>
                </Card>

                {/* Social media connections */}
                {(detailClub.socialLinks.facebook || detailClub.socialLinks.website) && (
                  <Card className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 font-display">Social Connections</h3>
                    <div className="space-y-2 text-xs text-neutral-300">
                      {detailClub.socialLinks.facebook && (
                        <div className="flex gap-2 items-center">
                          <Globe size={14} className="text-sky-400" />
                          <a href={detailClub.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white">{detailClub.socialLinks.facebook}</a>
                        </div>
                      )}
                      {detailClub.socialLinks.website && (
                        <div className="flex gap-2 items-center">
                          <Globe size={14} className="text-gold" />
                          <a href={detailClub.socialLinks.website} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-white">{detailClub.socialLinks.website}</a>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeSubTab === 'members' && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Club Roster</h3>
                {approvedMembers.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No approved members in this club yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {approvedMembers.map(({ user }) => (
                      <div key={user.uid} className="flex items-center gap-3 p-3 bg-charcoal/50 border border-darkborder/50 rounded-xl hover:border-neutral-700 transition-colors">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-darkborder shrink-0">
                          <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <Link to={`/profile/${user.uid}`} className="font-bold text-sm text-white hover:underline block">{user.fullName}</Link>
                          <span className="text-[10px] text-neutral-500">@{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeSubTab === 'admin' && isClubAdmin && (
              <div className="space-y-6">
                {/* Roster requests check */}
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Join Applications</h3>
                  {pendingMembers.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No pending applications for roster entry.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.map(({ user }) => (
                        <div key={user.uid} className="flex justify-between items-center p-4 bg-charcoal/50 border border-darkborder rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-darkborder">
                              <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <Link to={`/profile/${user.uid}`} className="font-bold text-sm text-white hover:underline block">{user.fullName}</Link>
                              <span className="text-[10px] text-neutral-500 block">Elo: {user.ratings.classical}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="gold" size="sm" onClick={() => handleApproveMember(user.uid)}>Approve</Button>
                            <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleRemoveMember(user.uid)}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Manage active roster */}
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">Remove Roster Members</h3>
                  <div className="divide-y divide-darkborder">
                    {approvedMembers.filter(m => m.user.uid !== detailClub.creatorId).map(({ user }) => (
                      <div key={user.uid} className="flex justify-between items-center py-3">
                        <span className="font-bold text-sm text-white">{user.fullName}</span>
                        <Button variant="outline" size="sm" className="text-red-500 text-xs py-1" onClick={() => handleRemoveMember(user.uid)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DIRECTORY DISCOVERY HUB VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Chess Clubs Directory</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Join university, private, or online-only chess circles</p>
        </div>

        {currentUser && (
          <Button 
            variant="gold" 
            onClick={() => setTab(currentTab === 'create' ? 'discover' : 'create')}
          >
            {currentTab === 'create' ? 'Cancel Setup' : 'Create Club'}
          </Button>
        )}
      </div>

      {currentTab === 'discover' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {clubs.map(club => (
            <Card key={club.id} hoverable bordered className="flex flex-col h-full">
              <div className="h-40 overflow-hidden bg-neutral-900 border-b border-darkborder relative">
                <img src={club.coverUrl} alt="cover" className="h-full w-full object-cover opacity-70" />
                <div className="absolute top-3 right-3">
                  <Badge variant="gold">{club.location.type}</Badge>
                </div>
              </div>
              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{club.name}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-3 mb-6">{club.description}</p>
                </div>
                <div className="border-t border-darkborder/50 pt-4 flex justify-between items-center text-xs text-neutral-400 mt-auto">
                  <span>👥 {club.membersCount} Members</span>
                  <span>📍 {club.location.city}</span>
                </div>
                <Button variant="secondary" className="w-full text-xs font-semibold mt-6" onClick={() => navigate(`/clubs/${club.id}`)}>
                  View Club
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE CLUB FORM */}
      {currentTab === 'create' && (
        <Card className="max-w-2xl mx-auto p-8 border border-darkborder bg-darkcard">
          <h3 className="text-lg font-bold font-display text-white border-b border-darkborder pb-3 mb-6">Register Chess Club</h3>
          <form onSubmit={handleCreateClub} className="space-y-4">
            <Input label="Club Name" type="text" placeholder="e.g. HUST Bach Khoa Chess Center" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Description" isTextArea rows={4} placeholder="Summarize club meetings, weekly routines..." value={description} onChange={(e) => setDescription(e.target.value)} required />
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Logo URL (Optional)" type="text" placeholder="https://images.unsplash.com/..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              <Input label="Cover Image URL (Optional)" type="text" placeholder="https://images.unsplash.com/..." value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Club Format</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ClubType)}
                  className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                >
                  <option value="university">University Roster</option>
                  <option value="school">Primary/Secondary School</option>
                  <option value="private">Private Guild</option>
                  <option value="online">Online Circle</option>
                </select>
              </div>
              <Input label="Target Location City" type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-darkborder pt-4">
              <Input label="Facebook Fanpage" type="text" placeholder="https://facebook.com/..." value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              <Input label="Official Website" type="text" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
              <Button variant="outline" type="button" onClick={() => setTab('discover')}>Cancel</Button>
              <Button variant="gold" type="submit" isLoading={isCreating}>Create Club</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
export default Clubs;
