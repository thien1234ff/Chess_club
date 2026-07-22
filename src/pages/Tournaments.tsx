import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService } from '../services/tournamentService';
import { userService } from '../services/userService';
import { useToast } from '../contexts/ToastContext';
import type { Tournament, TournamentParticipant, TournamentMatch, TournamentFormat } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { Shield, Clock, MapPin, Check, Play } from 'lucide-react';

export const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Individual Tournament Details States
  const [detailTour, setDetailTour] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [standings, setStandings] = useState<TournamentParticipant[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [selectedRound, setSelectedRound] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'participants' | 'pairings' | 'standings' | 'organizer'>('overview');

  // Form States (Create Tournament)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('swiss');
  const [timeControl, setTimeControl] = useState('10+5');
  const [prizePool, setPrizePool] = useState('5,000,000 VND');
  const [entryFee, setEntryFee] = useState(100000);
  const [maxParticipants, setMaxParticipants] = useState(64);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tourType, setTourType] = useState<'online' | 'offline'>('offline');
  const [city, setCity] = useState('Hanoi');
  const [address, setAddress] = useState('');

  // Creation State
  const [isCreating, setIsCreating] = useState(false);

  // View States
  const currentTab = searchParams.get('tab') || 'discover';

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (id) {
        // Individual View loading
        const tour = await tournamentService.getTournament(id);
        if (!tour) {
          addToast('Tournament not found.', 'error');
          navigate('/tournaments');
          return;
        }
        setDetailTour(tour);
        setIsOrganizer(currentUser?.uid === tour.organizerId || currentUser?.role === 'admin');
        
        // Fetch participants
        const parts = await tournamentService.getParticipants(id);
        setParticipants(parts);

        // Fetch standings
        const stands = await tournamentService.getStandings(id);
        setStandings(stands);

        // Set default selected round to current round if ongoing/completed
        if (tour.currentRound > 0) {
          setSelectedRound(tour.currentRound);
          const roundMatches = await tournamentService.getMatches(id, tour.currentRound);
          setMatches(roundMatches);
        } else {
          setSelectedRound(1);
          setMatches([]);
        }
      } else {
        // Feed View loading
        const list = await tournamentService.getTournaments();
        setTournaments(list);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load tournament data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, currentTab, currentUser]);

  // Sync selected round match loading
  useEffect(() => {
    if (id && detailTour && detailTour.currentRound > 0) {
      const fetchRoundMatches = async () => {
        const roundMatches = await tournamentService.getMatches(id, selectedRound);
        setMatches(roundMatches);
      };
      fetchRoundMatches();
    }
  }, [selectedRound]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!startDate || !endDate || !deadline) {
      addToast('All date configurations are required.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      await tournamentService.createTournament(currentUser.uid, {
        name,
        description,
        rules,
        format,
        timeControl,
        prizePool,
        entryFee: Number(entryFee),
        maxParticipants: Number(maxParticipants),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        registrationDeadline: new Date(deadline).toISOString(),
        bannerUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800',
        location: {
          type: tourType,
          city,
          address: tourType === 'offline' ? address : undefined
        }
      });

      addToast('Tournament created successfully!', 'success');
      setSearchParams({ tab: 'discover' });
    } catch (err) {
      addToast('Failed to create tournament.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegister = async () => {
    if (!currentUser) {
      addToast('Please login to register for tournaments.', 'warning');
      navigate('/auth');
      return;
    }
    if (!detailTour) return;

    try {
      await tournamentService.registerParticipant(detailTour.id, currentUser.uid);
      addToast('Successfully registered for tournament!', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Registration failed.', 'error');
    }
  };

  const handleStartTournament = async () => {
    if (!detailTour) return;
    try {
      const round = await tournamentService.generateNextRound(detailTour.id);
      addToast(`Tournament started! Round ${round} pairings generated.`, 'success');
      loadData();
      setActiveSubTab('pairings');
    } catch (err: any) {
      addToast(err.message || 'Failed to start tournament.', 'error');
    }
  };

  const handleRecordResult = async (matchId: string, result: '1-0' | '0-1' | '0.5-0.5') => {
    let whiteScore = 0.5;
    let blackScore = 0.5;

    if (result === '1-0') {
      whiteScore = 1.0;
      blackScore = 0.0;
    } else if (result === '0-1') {
      whiteScore = 0.0;
      blackScore = 1.0;
    }

    try {
      await tournamentService.recordMatchResult({
        matchId,
        whiteScore,
        blackScore,
        result
      });
      addToast('Board score saved.', 'success');
      
      // Reload matches and standings
      const roundMatches = await tournamentService.getMatches(detailTour!.id, selectedRound);
      setMatches(roundMatches);
      const stands = await tournamentService.getStandings(detailTour!.id);
      setStandings(stands);
    } catch (err) {
      addToast('Failed to record result.', 'error');
    }
  };

  const handleAdvanceRound = async () => {
    if (!detailTour) return;

    // Verify all current round matches are completed
    const incomplete = matches.some(m => m.result === 'pending');
    if (incomplete) {
      addToast('All boards must have recorded results before advancing.', 'warning');
      return;
    }

    try {
      const round = await tournamentService.generateNextRound(detailTour.id);
      addToast(`Pairings generated for Round ${round}!`, 'success');
      loadData();
      setActiveSubTab('pairings');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate pairings.', 'error');
    }
  };

  const handleCompleteTournament = async () => {
    if (!detailTour) return;
    try {
      await tournamentService.completeTournament(detailTour.id);
      addToast('Tournament finalized! Certificates issued to winner.', 'success');
      loadData();
      setActiveSubTab('standings');
    } catch (err) {
      addToast('Failed to finalize tournament.', 'error');
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

  // INDIVIDUAL VIEW ROUTE
  if (id && detailTour) {
    const isUpcoming = detailTour.status === 'upcoming';
    const isOngoing = detailTour.status === 'ongoing';
    const isCompleted = detailTour.status === 'completed';
    const isRegistered = participants.some(p => p.userId === currentUser?.uid);

    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
        <Button variant="outline" size="sm" onClick={() => navigate('/tournaments')} className="mb-6">
          ← Back to Tournaments Feed
        </Button>

        {/* Banner Details Block */}
        <div className="relative rounded-2xl overflow-hidden border border-darkborder bg-darkcard p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 bg-neutral-900/60 z-0" />
          {detailTour.bannerUrl && (
            <img src={detailTour.bannerUrl} alt="banner" className="absolute inset-0 h-full w-full object-cover opacity-30 z-0" />
          )}
          
          <div className="relative z-10 space-y-3 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="gold">{detailTour.format}</Badge>
              <Badge variant={isUpcoming ? 'info' : isOngoing ? 'warning' : 'success'}>
                {detailTour.status}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold font-display text-white">{detailTour.name}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-neutral-300">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-gold" /> {detailTour.location.city}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-neutral-400" /> {detailTour.timeControl} Time Control</span>
              <span>💰 Prize: {detailTour.prizePool}</span>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            {isUpcoming && !isRegistered && (
              <Button variant="gold" size="lg" onClick={handleRegister}>
                Register for Event
              </Button>
            )}
            {isUpcoming && isRegistered && (
              <Button variant="outline" size="lg" disabled className="text-emerald-400 border-emerald-500/25 bg-emerald-950/20">
                <Check size={16} className="mr-1" /> Registered
              </Button>
            )}
            {isOngoing && (
              <Badge variant="warning" size="md">Ongoing | Round {detailTour.currentRound}</Badge>
            )}
            {isCompleted && (
              <Badge variant="success" size="md">Completed</Badge>
            )}
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Sub headers navigation */}
            <div className="flex border-b border-darkborder mb-6 gap-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'participants', label: `Participants (${participants.length})` },
                ...(detailTour.currentRound > 0 ? [{ id: 'pairings', label: 'Pairings' }] : []),
                ...(detailTour.currentRound > 0 ? [{ id: 'standings', label: 'Standings' }] : []),
                ...(isOrganizer ? [{ id: 'organizer', label: 'Organizer Panel' }] : [])
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id as any)}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                    activeSubTab === sub.id 
                      ? 'border-gold text-gold' 
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Sub Tab Panel Display */}
            {activeSubTab === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">Description</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{detailTour.description}</p>
                </Card>
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">Tournament Rules</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{detailTour.rules}</p>
                </Card>
              </div>
            )}

            {activeSubTab === 'participants' && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Players List</h3>
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic">No registered participants yet.</p>
                ) : (
                  <div className="divide-y divide-darkborder">
                    {participants.map((part, idx) => (
                      <div key={part.userId} className="flex justify-between items-center py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-500 font-semibold">{idx + 1}.</span>
                          <span className="text-white font-bold">{part.fullName}</span>
                        </div>
                        <span className="text-neutral-400">Elo {part.rating}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeSubTab === 'standings' && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Rankings and Tiebreaks</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-charcoal text-neutral-400 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Player</th>
                        <th className="p-3">Rating</th>
                        <th className="p-3 text-center">Score</th>
                        <th className="p-3 text-center">Buchholz</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkborder">
                      {standings.map((stand, idx) => (
                        <tr key={stand.userId} className="hover:bg-darkhover">
                          <td className="p-3 font-semibold text-neutral-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{stand.fullName}</td>
                          <td className="p-3 text-neutral-300">{stand.rating}</td>
                          <td className="p-3 text-center font-bold text-gold">{stand.score}</td>
                          <td className="p-3 text-center text-neutral-400">{stand.tiebreak}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeSubTab === 'pairings' && (
              <div className="space-y-6">
                {/* Round filter selector */}
                <div className="flex justify-between items-center border-b border-darkborder/50 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Pairings Grid</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Round:</span>
                    <select
                      value={selectedRound}
                      onChange={(e) => setSelectedRound(Number(e.target.value))}
                      className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      {Array.from({ length: detailTour.currentRound }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Matchings table */}
                <div className="space-y-3">
                  {matches.map((match) => {
                    const whiteName = participants.find(p => p.userId === match.whitePlayerId)?.fullName || match.whitePlayerId;
                    const blackName = match.blackPlayerId === 'BYE' ? 'BYE (No opponent)' : (participants.find(p => p.userId === match.blackPlayerId)?.fullName || match.blackPlayerId);
                    
                    return (
                      <Card key={match.id} className="p-4 flex items-center justify-between border border-darkborder hover:border-neutral-700 transition-colors">
                        <div className="flex-grow grid grid-cols-7 items-center text-xs text-neutral-400">
                          <div className="col-span-1 text-neutral-500 font-bold uppercase">B{match.boardNum}</div>
                          
                          <div className="col-span-2 font-bold text-white text-right pr-4">{whiteName}</div>
                          
                          <div className="col-span-1 text-center bg-charcoal py-1 rounded border border-darkborder font-display font-semibold">
                            {match.result === 'pending' ? 'vs' : `${match.whiteScore} - ${match.blackScore}`}
                          </div>
                          
                          <div className="col-span-2 font-bold text-white pl-4 text-left">{blackName}</div>
                        </div>

                        {/* Organizer result override inline control */}
                        {isOrganizer && !isCompleted && match.result === 'pending' && match.blackPlayerId !== 'BYE' && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-4">
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '1-0')}>White</Button>
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '0.5-0.5')}>Draw</Button>
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '0-1')}>Black</Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSubTab === 'organizer' && isOrganizer && (
              <Card className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 border-b border-darkborder pb-3 flex items-center gap-2">
                  <Shield size={16} className="text-gold" />
                  <span>Organizer Administration Board</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Action 1: Start Tournament (R0 -> R1) */}
                  {detailTour.currentRound === 0 && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Start Swiss Pairing</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Lock the participant roster list and generate the initial Swiss pairings for Round 1.</p>
                      <Button variant="gold" className="w-full text-xs font-semibold" onClick={handleStartTournament}>
                        <Play size={12} className="mr-1" /> Start Round 1
                      </Button>
                    </div>
                  )}

                  {/* Action 2: Advance Round */}
                  {detailTour.currentRound > 0 && !isCompleted && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Advance to Next Round</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Calculate round scores and pairings for Round {detailTour.currentRound + 1}.</p>
                      <Button variant="gold" className="w-full text-xs font-semibold" onClick={handleAdvanceRound}>
                        Generate Round {detailTour.currentRound + 1}
                      </Button>
                    </div>
                  )}

                  {/* Action 3: Finalize Tournament */}
                  {detailTour.currentRound > 0 && !isCompleted && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Conclude Tournament</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Seal match logs, close brackets, and update player classical ratings.</p>
                      <Button variant="danger" className="w-full text-xs font-semibold" onClick={handleCompleteTournament}>
                        Conclude Tournament
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Mini Details Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Event Overview</h4>
              <div className="text-xs space-y-3 text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Deadline:</span>
                  <span className="font-semibold text-white">{new Date(detailTour.registrationDeadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Start Date:</span>
                  <span className="font-semibold text-white">{new Date(detailTour.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Venue Type:</span>
                  <span className="font-semibold uppercase text-gold">{detailTour.location.type}</span>
                </div>
                {detailTour.location.address && (
                  <div className="flex justify-between flex-col border-t border-darkborder/50 pt-2 mt-2 gap-1">
                    <span className="text-neutral-500">Address:</span>
                    <span className="text-neutral-400 italic leading-relaxed">{detailTour.location.address}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // DISCOVERY VIEW LIST
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Tournaments Platform</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Compete in Swiss System, Knockout, and Round Robin championships</p>
        </div>

        {currentUser && (currentUser.role === 'tournament_organizer' || currentUser.role === 'admin') && (
          <Button 
            variant="gold" 
            onClick={() => setTab(currentTab === 'create' ? 'discover' : 'create')}
          >
            {currentTab === 'create' ? 'Cancel Setup' : 'Create Tournament'}
          </Button>
        )}
      </div>

      {/* Main Tab togglers */}
      {currentTab !== 'create' && (
        <div className="flex border-b border-darkborder mb-8 gap-2">
          <button onClick={() => setTab('discover')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${currentTab === 'discover' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
            Discover Championships
          </button>
          {currentUser && (
            <button onClick={() => setTab('my')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${currentTab === 'my' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              My Tournaments
            </button>
          )}
        </div>
      )}

      {/* DISCOVER TAB */}
      {currentTab === 'discover' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tournaments.map(tour => (
            <Card key={tour.id} hoverable bordered className="flex flex-col h-full">
              <div className="h-40 overflow-hidden bg-neutral-900 border-b border-darkborder relative">
                <img src={tour.bannerUrl} alt="banner" className="h-full w-full object-cover opacity-70" />
                <div className="absolute top-3 right-3 flex gap-1">
                  <Badge variant="gold">{tour.format}</Badge>
                  <Badge variant={tour.status === 'upcoming' ? 'info' : tour.status === 'ongoing' ? 'warning' : 'success'}>{tour.status}</Badge>
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
      )}

      {/* MY TOURNAMENTS TAB */}
      {currentTab === 'my' && currentUser && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 font-display">Registered Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tournaments.filter(t => t.organizerId === currentUser.uid).map(tour => (
              <Card key={tour.id} hoverable bordered className="flex flex-col h-full border-l-4 border-l-gold">
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{tour.name}</h3>
                    <p className="text-xs text-neutral-500">Role: Organizer | Status: {tour.status}</p>
                  </div>
                  <Button variant="outline" className="w-full text-xs font-semibold mt-6" onClick={() => navigate(`/tournaments/${tour.id}`)}>
                    Admin Panel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT FORM */}
      {currentTab === 'create' && (
        <Card className="max-w-2xl mx-auto p-8 border border-darkborder bg-darkcard">
          <h3 className="text-lg font-bold font-display text-white border-b border-darkborder pb-3 mb-6">Create New Tournament</h3>
          <form onSubmit={handleCreateTournament} className="space-y-4">
            <Input label="Tournament Name" type="text" placeholder="e.g. ChessHub Vietnam Autumn Cup" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Description" isTextArea rows={4} placeholder="Summarize tournament highlights, eligibility..." value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Input label="Full Rules" isTextArea rows={4} placeholder="Match schedules, time-penalty regulations..." value={rules} onChange={(e) => setRules(e.target.value)} required />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                  className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="swiss">Swiss System (FIDE compliant)</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="knockout">Knockout</option>
                </select>
              </div>
              <Input label="Time Control" type="text" placeholder="e.g. 10+5" value={timeControl} onChange={(e) => setTimeControl(e.target.value)} required />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Prize Pool" type="text" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} />
              <Input label="Entry Fee (VND)" type="number" value={entryFee} onChange={(e) => setEntryFee(Number(e.target.value))} />
              <Input label="Max Players" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Start Date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <Input label="End Date" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-darkborder pt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Venue Format</label>
                <select
                  value={tourType}
                  onChange={(e) => setTourType(e.target.value as 'online' | 'offline')}
                  className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                >
                  <option value="offline">Offline Venue (Physical)</option>
                  <option value="online">Online Arena</option>
                </select>
              </div>
              <Input label="City" type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>

            {tourType === 'offline' && (
              <Input label="Address Details" type="text" placeholder="e.g. Cultural center lobby, D1, HCMC" value={address} onChange={(e) => setAddress(e.target.value)} required />
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
              <Button variant="outline" type="button" onClick={() => setTab('discover')}>Cancel</Button>
              <Button variant="gold" type="submit" isLoading={isCreating}>Create Tournament</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
export default Tournaments;
