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
              <span>ChessHub Vietnam Ecosystem</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold font-display text-white leading-tight">
              Your Chess Journey <br />
              <span className="text-gold">Starts Here.</span>
            </h1>
            <p className="text-lg text-neutral-400 max-w-xl">
              Learn, connect, compete, and grow with the chess community. Discover professional FIDE coaches, join university clubs, and register for Swiss System tournaments.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button variant="gold" size="lg" onClick={() => navigate('/tournaments')} rightIcon={<Trophy size={18} />}>
                Explore Tournaments
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/coaches')}>
                Find a Chess Coach
              </Button>
            </div>
          </div>
          
          {/* Hero Chess Art (Interactive/styled) */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute inset-0 bg-gold-muted blur-3xl opacity-20 rounded-full" />
            <div className="relative border-4 border-darkborder bg-darkcard rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
              <div className="text-7xl">👑</div>
              <div className="text-center">
                <h3 className="font-display font-bold text-white tracking-wide">ChessHub Interactive Sandbox</h3>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Ready for Match Play</p>
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
                Solve Daily Puzzle
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
              Search Results for <span className="text-gold">"{searchQuery}"</span>
            </h2>
            <Link to="/" className="text-xs text-gold hover:underline font-bold uppercase tracking-wider">Clear Search</Link>
          </div>

          <div className="space-y-8">
            {/* Tournaments Search */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
                <Trophy size={16} />
                <span>Tournaments ({filteredTours.length})</span>
              </h3>
              {filteredTours.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">No matching tournaments found.</p>
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
                        <Button size="sm" onClick={() => navigate(`/tournaments/${tour.id}`)}>Details</Button>
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
                <span>Coaches ({filteredCoaches.length})</span>
              </h3>
              {filteredCoaches.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">No matching coaches found.</p>
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
                        <span className="text-sm font-bold text-gold">{coach.hourlyRate.toLocaleString()} VND/hr</span>
                        <Button size="sm" onClick={() => navigate(`/coaches/${coach.uid}`)}>Profile</Button>
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
                <span>Chess Clubs ({filteredClubs.length})</span>
              </h3>
              {filteredClubs.length === 0 ? (
                <p className="text-sm text-neutral-500 italic pl-6">No matching clubs found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredClubs.map(club => (
                    <Card key={club.id} hoverable className="p-5 flex flex-col justify-between h-full">
                      <div>
                        <h4 className="font-bold text-white text-sm font-display mb-2">{club.name}</h4>
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-4">{club.description}</p>
                      </div>
                      <div className="border-t border-darkborder pt-3 flex justify-between items-center mt-auto">
                        <span className="text-xs text-neutral-500">{club.membersCount} members</span>
                        <Button size="sm" onClick={() => navigate(`/clubs/${club.id}`)}>Join Club</Button>
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
                { label: 'Active Players', value: stats.players },
                { label: 'Verified Coaches', value: stats.coaches },
                { label: 'University Clubs', value: stats.clubs },
                { label: 'Tournaments Hosted', value: stats.tournaments }
              ].map(stat => (
                <div key={stat.label} className="text-center md:text-left">
                  <span className="text-3xl font-extrabold font-display text-white block">{stat.value}</span>
                  <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mt-1 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Tournaments */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Featured Tournaments</h2>
                <p className="text-xs text-neutral-500 mt-1">Challenge yourself in upcoming Swiss tournaments</p>
              </div>
              <Link to="/tournaments" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>View All Tournaments</span>
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
                        <span>Fee: {tour.entryFee === 0 ? 'Free' : `${tour.entryFee.toLocaleString()} VND`}</span>
                        <span className="font-semibold text-white">Prize: {tour.prizePool}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date: {new Date(tour.startDate).toLocaleDateString()}</span>
                        <span>City: {tour.location.city}</span>
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full text-xs font-semibold mt-6" onClick={() => navigate(`/tournaments/${tour.id}`)}>
                      View Details
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
                  <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Find Chess Coaches</h2>
                  <p className="text-xs text-neutral-500 mt-1">Study privately with verified chess masters</p>
                </div>
                <Link to="/coaches" className="text-xs font-bold text-gold hover:underline">View All</Link>
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
                      <span className="text-xs text-neutral-500 mt-2 block">⭐ {coach.rating} ({coach.reviewsCount} reviews) | {coach.hourlyRate.toLocaleString()} VND/hr</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/coaches/${coach.uid}`)}>
                      Profile
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right: Popular Chess Clubs */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Popular Chess Clubs</h2>
                  <p className="text-xs text-neutral-500 mt-1">Join local university or private communities</p>
                </div>
                <Link to="/clubs" className="text-xs font-bold text-gold hover:underline">View All</Link>
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
                      <span className="text-xs text-neutral-500 mt-2 block">👥 {club.membersCount} Members | Founded {club.foundedAt}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/clubs/${club.id}`)}>
                      Join
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Social Community Feed Preview */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-darkborder">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold font-display text-white uppercase tracking-wider text-neutral-400">Community Feed Preview</h2>
                <p className="text-xs text-neutral-500 mt-1">See what players and coaches are sharing</p>
              </div>
              <Link to="/community" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>Go to Feed</span>
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
                    <span>❤️ {post.likesCount} Likes</span>
                    <span>💬 {post.commentsCount} Comments</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Final Call to Action */}
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 border-t border-darkborder text-center space-y-6">
            <h2 className="text-3xl font-bold font-display text-white tracking-wide">Join the ChessHub Community</h2>
            <p className="text-neutral-400 max-w-md mx-auto text-sm">
              Create an account today to publish games, ask questions to grandmasters, register for tournaments, and build your rating points.
            </p>
            <div className="pt-2">
              <Button variant="gold" size="lg" onClick={() => navigate('/auth')}>
                Get Started Now
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Home;
