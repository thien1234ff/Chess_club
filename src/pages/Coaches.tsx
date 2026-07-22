import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coachService } from '../services/coachService';
import type { CoachFilters } from '../services/coachService';
import { bookingService } from '../services/bookingService';
import { useToast } from '../contexts/ToastContext';
import type { Coach, User, Booking, PaymentMethod } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { userService } from '../services/userService';
import { 
  Star, Shield, DollarSign, Calendar, Clock, 
  MapPin, Globe, Compass, BookOpen, AlertTriangle,
  Check, Plus, Users 
} from 'lucide-react';

export const Coaches: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Handles individual sub-route details if passed
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  // Directory lists states
  const [coaches, setCoaches] = useState<{ coach: Coach; user: User }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Discovery Filters
  const [searchName, setSearchName] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState(2000000);

  // Individual Coach Detail states (when ID is active)
  const [detailCoach, setDetailCoach] = useState<{ coach: Coach; user: User } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  // Booking Form states
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format YYYY-MM-DD
  });
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingSubmit, setIsBookingSubmit] = useState(false);

  const loadCoaches = async () => {
    setIsLoading(true);
    try {
      if (id) {
        // Load single coach
        const detail = await coachService.getCoachProfile(id);
        setDetailCoach(detail);
        if (detail) {
          // Fetch booked slots for the chosen date
          const slots = await bookingService.getCoachBookedSlots(detail.coach.uid, bookingDate);
          setBookedSlots(slots);

          if (currentUser) {
            const follows = await userService.isFollowing(currentUser.uid, detail.coach.uid);
            setIsFollowing(follows);
          }
          const fCount = await userService.getFollowersCount(detail.coach.uid);
          setFollowersCount(fCount);
        }
      } else {
        // Load directory
        const list = await coachService.getCoaches();
        setCoaches(list);
      }
    } catch (err) {
      console.error(err);
      addToast('Không thể tải thông tin huấn luyện viên.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, [id, bookingDate]);

  const handleBookingDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingDate(e.target.value);
    setSelectedSlot(null);
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      addToast('Vui lòng đăng nhập để theo dõi huấn luyện viên.', 'warning');
      navigate('/auth');
      return;
    }
    if (!detailCoach) return;

    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, detailCoach.coach.uid);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        addToast(`Đã bỏ theo dõi ${detailCoach.user.fullName}`, 'info');
      } else {
        await userService.followUser(currentUser.uid, detailCoach.coach.uid);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        addToast(`Đã theo dõi ${detailCoach.user.fullName}`, 'success');
      }
    } catch (err) {
      addToast('Không thể thực hiện thao tác theo dõi.', 'error');
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      addToast('Vui lòng đăng nhập để đặt lịch học cờ vua.', 'warning');
      navigate('/auth');
      return;
    }
    if (!detailCoach || !selectedSlot) return;

    setIsBookingSubmit(true);
    try {
      await bookingService.createBooking({
        studentId: currentUser.uid,
        coachId: detailCoach.coach.uid,
        date: bookingDate,
        timeSlot: selectedSlot,
        durationHours: 1, // default 1 hour
        hourlyRate: detailCoach.coach.hourlyRate,
        paymentMethod
      });

      addToast('Đặt lịch học thành công! Đang chờ huấn luyện viên xác nhận.', 'success');
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
      // Reload slots
      const slots = await bookingService.getCoachBookedSlots(detailCoach.coach.uid, bookingDate);
      setBookedSlots(slots);
      
      // Redirect to student profile bookings list
      navigate(`/profile/${currentUser.uid}?tab=bookings`);
    } catch (err: any) {
      addToast(err.message || 'Gửi yêu cầu đặt lịch thất bại.', 'error');
    } finally {
      setIsBookingSubmit(false);
    }
  };

  // Directory filter computations
  const filteredList = coaches.filter(({ coach, user }) => {
    if (searchName && !user.fullName.toLowerCase().includes(searchName.toLowerCase())) {
      return false;
    }
    if (filterCity && user.location.city.toLowerCase() !== filterCity.toLowerCase()) {
      return false;
    }
    if (filterSpecialty && !coach.specializations.includes(filterSpecialty)) {
      return false;
    }
    if (coach.hourlyRate > filterMaxPrice) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // INDIVIDUAL DETAILED VIEW ROUTE
  if (id && detailCoach) {
    const { coach, user } = detailCoach;
    
    // Get availability configuration for chosen date (day of week)
    const dateObj = new Date(bookingDate);
    const dayOfWeek = dateObj.getDay();
    const dayConfig = coach.availability.find(av => av.dayOfWeek === dayOfWeek);
    const availableSlots = dayConfig ? dayConfig.slots : [];

    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
        <Button variant="outline" size="sm" onClick={() => navigate('/coaches')} className="mb-6">
          ← Quay lại Danh sách Huấn luyện viên
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Coach Bio and specialties */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
                <div className="flex justify-between items-start border-b border-darkborder/50 pb-6 mb-6 gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-darkborder border border-neutral-700 shrink-0">
                      <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold font-display text-white">{user.fullName}</h2>
                        {user.title && <Badge variant="gold">{user.title}</Badge>}
                        {coach.verified && <Shield size={16} className="text-gold" fill="currentColor" />}
                      </div>
                      <span className="text-xs text-neutral-500 block mt-1">@{user.username}</span>
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-300">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-gold" /> {user.location.city}</span>
                        <span className="flex items-center gap-1"><Users size={12} className="text-neutral-400" /> {followersCount} người theo dõi</span>
                        <span>⭐ {coach.rating} ({coach.reviewsCount} đánh giá)</span>
                      </div>
                    </div>
                  </div>

                  {currentUser?.uid !== user.uid && (
                    <Button
                      variant={isFollowing ? 'outline' : 'gold'}
                      size="sm"
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={handleFollowToggle}
                    >
                      {isFollowing ? <Check size={14} /> : <Plus size={14} />}
                      <span>{isFollowing ? 'Đang theo dõi' : '+ Theo dõi'}</span>
                    </Button>
                  )}
                </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Phương pháp Giảng dạy</h3>
                  <p className="text-sm text-neutral-200 leading-relaxed">{coach.teachingMethodology}</p>
                </div>

                <div className="border-t border-darkborder/50 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Chuyên môn Giảng dạy</h3>
                  <div className="flex flex-wrap gap-2">
                    {coach.specializations.map(spec => (
                      <Badge key={spec} variant="gold">{spec.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-darkborder/50 pt-4 text-xs text-neutral-400">
                  <div>
                    <span className="block text-neutral-500 font-bold uppercase tracking-wider">Kinh nghiệm</span>
                    <span className="text-white text-sm font-semibold mt-1 block">{coach.experienceYears} Năm giảng dạy</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 font-bold uppercase tracking-wider">Học phí</span>
                    <span className="text-gold text-sm font-semibold mt-1 block">{coach.hourlyRate.toLocaleString()} VND/giờ</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Interactive Availability Slot Selector */}
          <div className="lg:col-span-1">
            <Card className="p-6 border border-darkborder sticky top-24">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-gold" />
                <span>Đặt lịch Học cờ</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Chọn Ngày học</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={handleBookingDateChange}
                    className="w-full bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">Khung giờ Khả dụng</label>
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-4 bg-charcoal border border-darkborder/50 rounded-lg text-xs text-neutral-500">
                      Chưa có khung giờ học nào được xếp lịch cho ngày này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        const isSelected = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            disabled={isBooked}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 rounded-lg text-xs font-semibold cursor-pointer border text-center transition-all ${
                              isSelected
                                ? 'bg-gold border-transparent text-charcoal'
                                : isBooked
                                  ? 'bg-neutral-900 border-darkborder text-neutral-600 line-through cursor-not-allowed'
                                  : 'bg-charcoal border-darkborder text-neutral-300 hover:border-neutral-500'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedSlot && (
                  <div className="pt-4 border-t border-darkborder/50 space-y-4">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-400">Tổng học phí (1 giờ):</span>
                      <span className="text-gold">{coach.hourlyRate.toLocaleString()} VND</span>
                    </div>
                    <Button 
                      variant="gold" 
                      className="w-full"
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      Tiếp tục Đặt lịch
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Booking Confirmation modal */}
        <Modal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
          title="Xác nhận Đặt lịch Học"
        >
          <form onSubmit={handleBookingSubmit} className="space-y-4 text-left">
            <div className="bg-charcoal/50 p-4 border border-darkborder rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Huấn luyện viên:</span>
                <span className="text-white font-bold">{user.fullName} ({user.title || 'HLV'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Thời gian:</span>
                <span className="text-white font-bold">{bookingDate} lúc {selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-semibold">Thời lượng:</span>
                <span className="text-white font-bold">1 Giờ</span>
              </div>
              <div className="flex justify-between border-t border-darkborder pt-2 mt-2">
                <span className="text-neutral-500 font-semibold">Tổng tiền:</span>
                <span className="text-gold font-bold">{coach.hourlyRate.toLocaleString()} VND</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Phương thức Thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
              >
                <option value="bank_transfer">Chuyển khoản Ngân hàng (QR Code / TK)</option>
                <option value="cash">Tiền mặt (Chỉ áp dụng khi học trực tiếp)</option>
                <option value="e_wallet">Ví điện tử Momo / ZaloPay</option>
              </select>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <p>Chuyển khoản tới MB Bank: 970422... (Chủ TK: ChessHub Vietnam). Vui lòng gửi mã giao dịch qua tin nhắn.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-darkborder">
              <Button variant="outline" type="button" onClick={() => setIsBookingModalOpen(false)}>Hủy</Button>
              <Button variant="gold" type="submit" isLoading={isBookingSubmit}>Xác nhận Đặt lịch</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // DIRECTORY DISCOVERY VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 text-left bg-charcoal min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-darkborder pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">Cộng đồng Huấn luyện viên</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Học kèm riêng với các đại kiện tướng và huấn luyện viên cờ vua chuyên nghiệp</p>
        </div>
        {currentUser && currentUser.role !== 'coach' && (
          <Button variant="gold" onClick={() => navigate('/profile/' + currentUser.uid + '?applyCoach=true')}>
            Đăng ký làm HLV
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <Card className="p-5 mb-8 border border-darkborder flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-grow grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
          <Input 
            label="Tìm theo tên" 
            placeholder="Ví dụ: Quang Liêm" 
            value={searchName} 
            onChange={(e) => setSearchName(e.target.value)} 
          />
          
          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Thành phố</label>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="">Tất cả thành phố</option>
              <option value="Hanoi">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Da Nang">Đà Nẵng</option>
              <option value="Can Tho">Cần Thơ</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Chuyên môn</label>
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="w-full bg-darkcard text-ivory border border-darkborder rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            >
              <option value="">Tất cả chuyên môn</option>
              <option value="Opening">Khai cuộc (Opening)</option>
              <option value="Middlegame">Trung cuộc (Middlegame)</option>
              <option value="Endgame">Tàn cuộc (Endgame)</option>
              <option value="Tactics">Chiến thuật (Tactics)</option>
              <option value="Beginner">Cơ bản (Beginner)</option>
              <option value="Game Analysis">Phân tích ván đấu</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Học phí tối đa / giờ</label>
            <input
              type="range"
              min={100000}
              max={2000000}
              step={50000}
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
              className="w-full h-2 bg-darkborder rounded-lg appearance-none cursor-pointer accent-gold"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1.5 font-bold uppercase">
              <span>100k</span>
              <span className="text-gold font-bold">{filterMaxPrice.toLocaleString()} VND</span>
              <span>2M</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Directory Grid */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 text-sm">
          Không tìm thấy huấn luyện viên nào phù hợp với bộ lọc của bạn.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredList.map(({ coach, user }) => (
            <Card key={coach.uid} hoverable className="flex flex-col justify-between h-full p-6">
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-darkborder border border-neutral-700 shrink-0">
                      <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm font-display">{user.fullName}</h3>
                        {user.title && <Badge variant="gold">{user.title}</Badge>}
                      </div>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">@{user.username}</span>
                    </div>
                  </div>
                  {coach.verified && <Shield size={16} className="text-gold shrink-0" fill="currentColor" />}
                </div>

                <p className="text-xs text-neutral-400 line-clamp-3 mb-4">{coach.teachingMethodology}</p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {coach.specializations.slice(0, 3).map(spec => (
                    <Badge key={spec} variant="default">{spec.replace('_', ' ')}</Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-darkborder/50 pt-4 flex justify-between items-center mt-auto">
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">Học phí / giờ</span>
                  <span className="text-gold font-bold text-sm">{coach.hourlyRate.toLocaleString()} VND</span>
                </div>
                <Button size="sm" variant="gold" onClick={() => navigate(`/coaches/${coach.uid}`)}>
                  Xem lịch học
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default Coaches;
