import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { db, isFirebaseMode } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MockDB } from '../services/mockDb';
import type { User } from '../types';

export const ProfileSetup: React.FC = () => {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('Hanoi');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      // If they don't have a needsSetup flag, send them to home
      if (!currentUser.needsSetup) {
        navigate('/');
      }
    }
  }, [currentUser, navigate]);

  const validate = async () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Họ và tên là bắt buộc.';
    
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      newErrors.username = 'Tên đăng nhập là bắt buộc.';
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      newErrors.username = 'Tên đăng nhập chỉ có thể chứa chữ cái, chữ số và dấu gạch dưới.';
    } else {
      // Check username uniqueness
      try {
        let isUnique = true;
        if (isFirebaseMode && db) {
          const q = query(collection(db, 'users'), where('username', '==', cleanUsername.toLowerCase()));
          const snap = await getDocs(q);
          // Make sure it doesn't match another user's uid
          const docs = snap.docs.filter(doc => doc.id !== currentUser?.uid);
          isUnique = docs.length === 0;
        } else {
          const users = MockDB.getCollection<User>('USERS');
          isUnique = !users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.uid !== currentUser?.uid);
        }
        
        if (!isUnique) {
          newErrors.username = 'Tên đăng nhập đã có người sử dụng.';
        }
      } catch (err) {
        console.error(err);
        newErrors.username = 'Không thể xác minh tính duy nhất của tên đăng nhập.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const isValid = await validate();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      if (currentUser) {
        await userService.updateUser(currentUser.uid, {
          fullName,
          username: username.trim().toLowerCase(),
          location: { city, country: 'VN' },
          bio: bio || `Xin chào! Tôi là ${fullName}, thành viên mới của ChessHub.`,
          needsSetup: false // Mark setup completed!
        });
        
        addToast('Thiết lập hồ sơ thành công! Chào mừng tới ChessHub.', 'success');
        await refreshProfile();
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Cập nhật thông tin thất bại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-charcoal">
      <Card className="w-full max-w-lg p-8 border border-darkborder shadow-2xl bg-darkcard">
        <div className="text-center mb-8">
          <span className="text-gold text-4xl font-bold font-display block mb-2">♟</span>
          <h2 className="text-2xl font-bold font-display text-ivory tracking-wide">
            Hoàn tất Hồ sơ của bạn
          </h2>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            Chọn một tên đăng nhập độc nhất và giới thiệu bản thân để bắt đầu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Họ và Tên"
            type="text"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
          />

          <Input
            label="Tên đăng nhập"
            type="text"
            placeholder="Ví dụ: grandmaster_viet"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            helperText="Tối thiểu 3 ký tự. Chỉ bao gồm chữ cái thường, số và dấu gạch dưới."
          />

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Thành phố / Khu vực
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-2.5 text-sm text-ivory focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
            >
              <option value="Hanoi">Hà Nội</option>
              <option value="Ho Chi Minh City">TP. Hồ Chí Minh</option>
              <option value="Da Nang">Đà Nẵng</option>
              <option value="Can Tho">Cần Thơ</option>
              <option value="Hai Phong">Hải Phòng</option>
              <option value="Nha Trang">Nha Trang</option>
              <option value="Hue">Huế</option>
              <option value="Other">Khác / Quốc tế</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Giới thiệu bản thân
            </label>
            <textarea
              placeholder="Chia sẻ về sở thích cờ vua, khai cuộc yêu thích, hoặc mục tiêu thi đấu của bạn..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full bg-charcoal border border-darkborder focus:border-gold rounded-lg p-3 text-sm text-ivory placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-gold transition-colors resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="gold"
            className="w-full mt-6"
            isLoading={isLoading}
          >
            Hoàn tất thiết lập &amp; Bắt đầu ngay
          </Button>
        </form>
      </Card>
    </div>
  );
};
export default ProfileSetup;
