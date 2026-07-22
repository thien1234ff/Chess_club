import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const Auth: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const isRegisterParam = searchParams.get('register') === 'true';
  const [isRegister, setIsRegister] = useState(isRegisterParam);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // Form Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsRegister(isRegisterParam);
  }, [isRegisterParam]);

  // If already logged in, redirect to home
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid.';

    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';

    if (isRegister) {
      if (!fullName) newErrors.fullName = 'Full name is required.';
      if (!username) newErrors.username = 'Username is required.';
      else if (username.length < 3) newErrors.username = 'Username must be at least 3 characters.';
      else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores.';
      }
      
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (isRegister) {
        await authService.registerWithPassword(email, password, username, fullName);
        addToast('Registration successful! Welcome to ChessHub.', 'success');
      } else {
        await authService.login(email, password);
        addToast('Welcome back to ChessHub!', 'success');
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authService.loginWithGoogle();
      addToast('Google Sign-In successful!', 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Google Sign-In failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-charcoal">
      <Card className="w-full max-w-md p-8 border border-darkborder shadow-2xl bg-darkcard">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-gold text-4xl font-bold font-display block mb-2">♟</span>
          <h2 className="text-2xl font-bold font-display text-ivory tracking-wide">
            {isRegister ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
            {isRegister ? 'Join the Vietnamese chess community' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegister && (
            <>
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
                placeholder="e.g. chess_player_99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
                helperText="Only letters, numbers, and underscores."
              />
            </>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. player@chesshub.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          {isRegister && (
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
          )}

          <Button
            type="submit"
            variant="gold"
            className="w-full mt-6"
            isLoading={isLoading}
          >
            {isRegister ? 'Register Account' : 'Sign In'}
          </Button>
        </form>

        {/* Social Dividers */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-darkborder"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-darkcard px-3 text-neutral-500 font-bold tracking-wider">Or continue with</span>
          </div>
        </div>

        {/* Google sign in button */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full flex items-center justify-center gap-3 text-neutral-300 hover:text-white"
          type="button"
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.84 2.69-6.57z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.33-1.59-5.05-3.73H.95v2.3C2.43 15.93 5.48 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7c-.18-.54-.29-1.12-.29-1.7s.11-1.16.29-1.7V5H.95C.35 6.2 0 7.57 0 9s.35 2.8 1.05 4l3-2.3z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4C13.46.97 11.42 0 9 0 5.48 0 2.43 2.07.95 5.06l3 2.3c.72-2.14 2.7-3.78 5.05-3.78z"
            />
          </svg>
          <span>Google Accounts</span>
        </Button>

        {/* Form Toggle */}
        <div className="mt-8 text-center text-xs">
          <span className="text-neutral-500 font-medium">
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}
          </span>{' '}
          <button
            onClick={() => {
              setErrors({});
              setIsRegister(!isRegister);
            }}
            className="text-gold font-bold hover:underline cursor-pointer ml-1"
          >
            {isRegister ? 'Sign In here' : 'Register here'}
          </button>
        </div>
      </Card>
    </div>
  );
};
export default Auth;
