import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
      setError('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Automatically set display name as the email prefix
        const username = email.split('@')[0].toUpperCase();
        await updateProfile(userCredential.user, {
          displayName: username
        });
      } else {
        // Log In
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMsg = '인증에 실패했습니다. 다시 시도해 주세요.';
      if (err.code === 'auth/wrong-password') {
        errorMsg = '비밀번호가 잘못되었습니다.';
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = '등록되지 않은 이메일입니다.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = '이미 사용 중인 이메일입니다.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '유효하지 않은 이메일 형식입니다.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#F9F8F6] dark:bg-[#111111] border border-black/20 dark:border-white/20 p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto shrink-0">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:opacity-60 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-2">
            Tripgon log
          </h2>
          <p className="text-[10px] md:text-xs text-black/50 dark:text-white/50 uppercase tracking-widest">
            {isSignUp ? 'Create your personal account' : 'Log in to edit your journeys'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/10 dark:border-white/10 mb-6 text-xs font-bold uppercase tracking-widest">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors ${!isSignUp ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
          >
            Log In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors ${isSignUp ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium tracking-wide">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-4 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center rounded-none"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
};
