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
    if (!fullName.trim()) newErrors.fullName = 'Full name is required.';
    
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      newErrors.username = 'Username is required.';
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores.';
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
          newErrors.username = 'Username is already taken.';
        }
      } catch (err) {
        console.error(err);
        newErrors.username = 'Failed to verify username uniqueness.';
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
          bio: bio || `Hello! I'm ${fullName}, a new ChessHub player.`,
          needsSetup: false // Mark setup completed!
        });
        
        addToast('Profile setup completed successfully! Welcome to ChessHub.', 'success');
        await refreshProfile();
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to update profile details.', 'error');
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
            Complete Your Profile
          </h2>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            Choose a unique username and tell us about yourself to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            type="text"
            placeholder="e.g. Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
          />

          <Input
            label="Username"
            type="text"
            placeholder="e.g. grandmaster_viet"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            helperText="At least 3 characters. Only letters, numbers, and underscores."
          />

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              City / Region
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-charcoal border border-darkborder focus:border-gold rounded-lg px-3 py-2.5 text-sm text-ivory focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
            >
              <option value="Hanoi">Hanoi</option>
              <option value="Ho Chi Minh City">Ho Chi Minh City (TP.HCM)</option>
              <option value="Da Nang">Da Nang</option>
              <option value="Can Tho">Can Tho</option>
              <option value="Hai Phong">Hai Phong</option>
              <option value="Nha Trang">Nha Trang</option>
              <option value="Hue">Hue</option>
              <option value="Other">Other / International</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Short Bio
            </label>
            <textarea
              placeholder="Tell other chess players about your favorite openings, goals, or hobbies..."
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
            Complete Setup & Start Playing
          </Button>
        </form>
      </Card>
    </div>
  );
};
export default ProfileSetup;
