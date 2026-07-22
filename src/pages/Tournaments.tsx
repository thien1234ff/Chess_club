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
import ImageUploader from '../components/ui/ImageUploader';
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
  const [city, setCity] = useState('Hà Nội');
  const [address, setAddress] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

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
          addToast('Không tìm thấy giải đấu.', 'error');
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
      addToast('Không thể tải dữ liệu giải đấu.', 'error');
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
      addToast('Tất cả thời gian cài đặt là bắt buộc.', 'error');
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
        bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800',
        location: {
          type: tourType,
          city,
          address: tourType === 'offline' ? address : undefined
        }
      });

      addToast('Tạo giải đấu thành công!', 'success');
      setSearchParams({ tab: 'discover' });
    } catch (err) {
      addToast('Tạo giải đấu thất bại.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegister = async () => {
    if (!currentUser) {
      addToast('Vui lòng đăng nhập để đăng ký giải đấu.', 'warning');
      navigate('/auth');
      return;
    }
    if (!detailTour) return;

    try {
      await tournamentService.registerParticipant(detailTour.id, currentUser.uid);
      addToast('Đăng ký tham gia giải đấu thành công!', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Đăng ký thất bại.', 'error');
    }
  };

  const handleStartTournament = async () => {
    if (!detailTour) return;
    try {
      const round = await tournamentService.generateNextRound(detailTour.id);
      addToast(`Giải đấu đã bắt đầu! Đã ghép cặp Vòng ${round}.`, 'success');
      loadData();
      setActiveSubTab('pairings');
    } catch (err: any) {
      addToast(err.message || 'Không thể bắt đầu giải đấu.', 'error');
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
      addToast('Đã lưu kết quả ván đấu.', 'success');
      
      // Reload matches and standings
      const roundMatches = await tournamentService.getMatches(detailTour!.id, selectedRound);
      setMatches(roundMatches);
      const stands = await tournamentService.getStandings(detailTour!.id);
      setStandings(stands);
    } catch (err) {
      addToast('Không thể ghi nhận kết quả.', 'error');
    }
  };

  const handleAdvanceRound = async () => {
    if (!detailTour) return;

    // Verify all current round matches are completed
    const incomplete = matches.some(m => m.result === 'pending');
    if (incomplete) {
      addToast('Tất cả bàn đấu phải có kết quả trước khi sang vòng tiếp theo.', 'warning');
      return;
    }

    try {
      const round = await tournamentService.generateNextRound(detailTour.id);
      addToast(`Đã tạo ghép cặp cho Vòng ${round}!`, 'success');
      loadData();
      setActiveSubTab('pairings');
    } catch (err: any) {
      addToast(err.message || 'Không thể tạo ghép cặp.', 'error');
    }
  };

  const handleCompleteTournament = async () => {
    if (!detailTour) return;
    try {
      await tournamentService.completeTournament(detailTour.id);
      addToast('Giải đấu đã bế mạc! Đã cập nhật kết quả và chứng nhận.', 'success');
      loadData();
      setActiveSubTab('standings');
    } catch (err) {
      addToast('Không thể kết thúc giải đấu.', 'error');
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
          ← Quay lại danh sách Giải đấu
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
                {isUpcoming ? 'Sắp diễn ra' : isOngoing ? 'Đang diễn ra' : 'Đã kết thúc'}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold font-display text-white">{detailTour.name}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-neutral-300">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-gold" /> {detailTour.location.city}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-neutral-400" /> Thời gian {detailTour.timeControl}</span>
              <span>💰 Giải thưởng: {detailTour.prizePool}</span>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            {isUpcoming && !isRegistered && (
              <Button variant="gold" size="lg" onClick={handleRegister}>
                Đăng ký tham gia
              </Button>
            )}
            {isUpcoming && isRegistered && (
              <Button variant="outline" size="lg" disabled className="text-emerald-400 border-emerald-500/25 bg-emerald-950/20">
                <Check size={16} className="mr-1" /> Đã đăng ký
              </Button>
            )}
            {isOngoing && (
              <Badge variant="warning" size="md">Đang diễn ra | Vòng {detailTour.currentRound}</Badge>
            )}
            {isCompleted && (
              <Badge variant="success" size="md">Đã hoàn thành</Badge>
            )}
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Sub headers navigation */}
            <div className="flex border-b border-darkborder mb-6 gap-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'participants', label: `Vận động viên (${participants.length})` },
                ...(detailTour.currentRound > 0 ? [{ id: 'pairings', label: 'Lịch thi đấu & Ghép cặp' }] : []),
                ...(detailTour.currentRound > 0 ? [{ id: 'standings', label: 'Bảng xếp hạng' }] : []),
                ...(isOrganizer ? [{ id: 'organizer', label: 'Quản trị Giải đấu' }] : [])
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
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">Mô tả giải đấu</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{detailTour.description}</p>
                </Card>
                <Card>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-2">Luật thi đấu</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{detailTour.rules}</p>
                </Card>
              </div>
            )}

            {activeSubTab === 'participants' && (
              <Card>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Danh sách Kỳ thủ</h3>
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic">Chưa có kỳ thủ nào đăng ký.</p>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Bảng Xếp Hạng &amp; Hệ Số Phụ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-charcoal text-neutral-400 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Hạng</th>
                        <th className="p-3">Kỳ thủ</th>
                        <th className="p-3">Elo</th>
                        <th className="p-3 text-center">Điểm</th>
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
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Bảng Ghép Cặp</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Vòng đấu:</span>
                    <select
                      value={selectedRound}
                      onChange={(e) => setSelectedRound(Number(e.target.value))}
                      className="bg-charcoal border border-darkborder focus:border-gold rounded-lg px-2 py-1 text-xs focus:outline-none"
                    >
                      {Array.from({ length: detailTour.currentRound }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>Vòng {idx + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Matchings table */}
                <div className="space-y-3">
                  {matches.map((match) => {
                    const whiteName = participants.find(p => p.userId === match.whitePlayerId)?.fullName || match.whitePlayerId;
                    const blackName = match.blackPlayerId === 'BYE' ? 'BYE (Miễn đấu)' : (participants.find(p => p.userId === match.blackPlayerId)?.fullName || match.blackPlayerId);
                    
                    return (
                      <Card key={match.id} className="p-4 flex items-center justify-between border border-darkborder hover:border-neutral-700 transition-colors">
                        <div className="flex-grow grid grid-cols-7 items-center text-xs text-neutral-400">
                          <div className="col-span-1 text-neutral-500 font-bold uppercase">Bàn {match.boardNum}</div>
                          
                          <div className="col-span-2 font-bold text-white text-right pr-4">{whiteName}</div>
                          
                          <div className="col-span-1 text-center bg-charcoal py-1 rounded border border-darkborder font-display font-semibold">
                            {match.result === 'pending' ? 'vs' : `${match.whiteScore} - ${match.blackScore}`}
                          </div>
                          
                          <div className="col-span-2 font-bold text-white pl-4 text-left">{blackName}</div>
                        </div>

                        {/* Organizer result override inline control */}
                        {isOrganizer && !isCompleted && match.result === 'pending' && match.blackPlayerId !== 'BYE' && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-4">
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '1-0')}>Trắng thắng</Button>
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '0.5-0.5')}>Hòa</Button>
                            <Button variant="outline" size="sm" className="px-2.5 py-1 text-[10px]" onClick={() => handleRecordResult(match.id, '0-1')}>Đen thắng</Button>
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
                  <span>Bảng Điều Hành Ban Tổ Chức</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Action 1: Start Tournament (R0 -> R1) */}
                  {detailTour.currentRound === 0 && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Bắt đầu ghép cặp Hệ Thụy Sĩ</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Chốt danh sách kỳ thủ và tự động tạo lịch bốc thăm Vòng 1.</p>
                      <Button variant="gold" className="w-full text-xs font-semibold" onClick={handleStartTournament}>
                        <Play size={12} className="mr-1" /> Bắt đầu Vòng 1
                      </Button>
                    </div>
                  )}

                  {/* Action 2: Advance Round */}
                  {detailTour.currentRound > 0 && !isCompleted && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Chuyển sang Vòng tiếp theo</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Tính toán lại hệ số và tạo bốc thăm cho Vòng {detailTour.currentRound + 1}.</p>
                      <Button variant="gold" className="w-full text-xs font-semibold" onClick={handleAdvanceRound}>
                        Tạo bốc thăm Vòng {detailTour.currentRound + 1}
                      </Button>
                    </div>
                  )}

                  {/* Action 3: Finalize Tournament */}
                  {detailTour.currentRound > 0 && !isCompleted && (
                    <div className="bg-charcoal/50 border border-darkborder rounded-xl p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-white">Kết thúc Giải đấu</h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">Khóa kết quả, chốt bảng xếp hạng chung cuộc và cập nhật Elo.</p>
                      <Button variant="danger" className="w-full text-xs font-semibold" onClick={handleCompleteTournament}>
                        Bế mạc &amp; Kết thúc Giải
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Thông tin giải đấu</h4>
              <div className="text-xs space-y-3 text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Hạn đăng ký:</span>
                  <span className="font-semibold text-white">{new Date(detailTour.registrationDeadline).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Ngày bắt đầu:</span>
                  <span className="font-semibold text-white">{new Date(detailTour.startDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Hình thức:</span>
                  <span className="font-semibold uppercase text-gold">{detailTour.location.type === 'offline' ? 'Trực tiếp' : 'Trực tuyến'}</span>
                </div>
                {detailTour.location.address && (
                  <div className="flex justify-between flex-col border-t border-darkborder/50 pt-2 mt-2 gap-1">
                    <span className="text-neutral-500">Địa chỉ:</span>
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
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Nền tảng Giải đấu Cờ vua</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Thi đấu các giải Hệ Thụy Sĩ, Vòng tròn và Loại trực tiếp</p>
        </div>

        {currentUser && (currentUser.role === 'tournament_organizer' || currentUser.role === 'admin') && (
          <Button 
            variant="gold" 
            onClick={() => setTab(currentTab === 'create' ? 'discover' : 'create')}
          >
            {currentTab === 'create' ? 'Hủy thiết lập' : 'Tạo Giải đấu'}
          </Button>
        )}
      </div>

      {/* Main Tab togglers */}
      {currentTab !== 'create' && (
        <div className="flex border-b border-darkborder mb-8 gap-2">
          <button onClick={() => setTab('discover')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${currentTab === 'discover' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
            Khám phá Giải đấu
          </button>
          {currentUser && (
            <button onClick={() => setTab('my')} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${currentTab === 'my' ? 'border-gold text-gold font-bold' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              Giải đấu của tôi
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
                  <Badge variant={tour.status === 'upcoming' ? 'info' : tour.status === 'ongoing' ? 'warning' : 'success'}>
                    {tour.status === 'upcoming' ? 'Sắp tới' : tour.status === 'ongoing' ? 'Đang diễn ra' : 'Đã hoàn thành'}
                  </Badge>
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
                    <span>Ngày: {new Date(tour.startDate).toLocaleDateString('vi-VN')}</span>
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
      )}

      {/* MY TOURNAMENTS TAB */}
      {currentTab === 'my' && currentUser && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 font-display">Sự kiện Đã đăng ký &amp; Quản lý</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tournaments.filter(t => t.organizerId === currentUser.uid).map(tour => (
              <Card key={tour.id} hoverable bordered className="flex flex-col h-full border-l-4 border-l-gold">
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="font-bold text-white text-base font-display line-clamp-1 mb-2">{tour.name}</h3>
                    <p className="text-xs text-neutral-500">Vai trò: Ban tổ chức | Trạng thái: {tour.status === 'upcoming' ? 'Sắp tới' : tour.status === 'ongoing' ? 'Đang diễn ra' : 'Đã xong'}</p>
                  </div>
                  <Button variant="outline" className="w-full text-xs font-semibold mt-6" onClick={() => navigate(`/tournaments/${tour.id}`)}>
                    Bảng Quản trị
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
          <h3 className="text-lg font-bold font-display text-white border-b border-darkborder pb-3 mb-6">Tạo Giải đấu Mới</h3>
          <form onSubmit={handleCreateTournament} className="space-y-4">
            <Input label="Tên Giải đấu" type="text" placeholder="Ví dụ: Giải Cờ vua Mùa Thu ChessHub 2026" value={name} onChange={(e) => setName(e.target.value)} required />
            <ImageUploader label="Ảnh Banner Giải đấu (Cloudinary)" value={bannerUrl} onChange={setBannerUrl} />
            <Input label="Mô tả" isTextArea rows={4} placeholder="Tóm tắt điểm nổi bật của giải đấu, đối tượng tham gia..." value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Input label="Luật thi đấu đầy đủ" isTextArea rows={4} placeholder="Lịch trình thi đấu, quy định thời gian, phạt..." value={rules} onChange={(e) => setRules(e.target.value)} required />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Thể thức</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                  className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="swiss">Hệ Thụy Sĩ (Chuẩn FIDE)</option>
                  <option value="round_robin">Vòng tròn tính điểm</option>
                  <option value="knockout">Loại trực tiếp</option>
                </select>
              </div>
              <Input label="Thời gian (Time Control)" type="text" placeholder="Ví dụ: 10+5" value={timeControl} onChange={(e) => setTimeControl(e.target.value)} required />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Tổng Giải thưởng" type="text" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} />
              <Input label="Lệ phí thi đấu (VND)" type="number" value={entryFee} onChange={(e) => setEntryFee(Number(e.target.value))} />
              <Input label="Số kỳ thủ tối đa" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Ngày bắt đầu" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <Input label="Ngày kết thúc" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              <Input label="Hạn đăng ký" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-darkborder pt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Hình thức tổ chức</label>
                <select
                  value={tourType}
                  onChange={(e) => setTourType(e.target.value as 'online' | 'offline')}
                  className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                >
                  <option value="offline">Trực tiếp (Offline)</option>
                  <option value="online">Trực tuyến (Online)</option>
                </select>
              </div>
              <Input label="Thành phố / Khu vực" type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>

            {tourType === 'offline' && (
              <Input label="Địa chỉ chi tiết" type="text" placeholder="Ví dụ: Nhà văn hóa Thanh niên, Quận 1, TP.HCM" value={address} onChange={(e) => setAddress(e.target.value)} required />
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
              <Button variant="outline" type="button" onClick={() => setTab('discover')}>Hủy</Button>
              <Button variant="gold" type="submit" isLoading={isCreating}>Tạo Giải đấu</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
export default Tournaments;
