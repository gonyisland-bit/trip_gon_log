import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User, Calendar, Phone } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ConfirmModal } from './ConfirmModal';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
      setError('');
      setEmail('');
      setPassword('');
      setLastName('');
      setFirstName('');
      setBirthdate('');
      setPhone('');
      setIsConfirmOpen(false);
    }
  }, [isOpen, initialMode]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmOpen, onClose]);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (!lastName.trim() || !firstName.trim()) {
        setError('성(Last Name)과 이름(First Name)을 모두 입력해 주세요.');
        return;
      }
      if (!email.trim() || !password.trim()) {
        setError('이메일과 비밀번호를 입력해 주세요.');
        return;
      }
      // Open confirm modal for sign up
      setIsConfirmOpen(true);
    } else {
      executeAuth(false);
    }
  };

  const executeAuth = async (isCreatingAccount: boolean) => {
    setLoading(true);
    setError('');

    try {
      if (isCreatingAccount) {
        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        const fullName = `${lastName.trim()} ${firstName.trim()}`;
        await updateProfile(user, {
          displayName: fullName
        });

        const cleanEmail = email.trim().toLowerCase();
        const isSuper = cleanEmail === 'gonyisland@naver.com';

        // 2. Save UserProfile to Firestore users collection
        const newProfile: UserProfile = {
          uid: user.uid,
          email: cleanEmail,
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          birthdate: birthdate.trim(),
          phone: phone.trim(),
          role: isSuper ? 'admin' : 'user',
          permissions: {
            canCreate: true,
            canEdit: isSuper,
            canDelete: isSuper,
          },
          createdAt: Date.now(),
        };

        await setDoc(doc(db, 'users', user.uid), newProfile);
      } else {
        // Log In
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setIsConfirmOpen(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMsg = '인증에 실패했습니다. 다시 시도해 주세요.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = '등록되지 않은 이메일입니다.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = '이미 등록된 이메일 계정입니다.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '올바른 이메일 형식을 입력해 주세요.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      setError(errorMsg);
      setIsConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto shrink-0 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header - Swiss Minimal with Inter font */}
        <div className="border-b border-black/15 dark:border-white/15 pb-4 mb-5">
          <span className="text-[10px] font-mono font-bold tracking-widest text-red-600 dark:text-red-500 uppercase block mb-1">
            {isSignUp ? 'USER REGISTRATION' : 'AUTHENTICATION'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-inter font-black uppercase tracking-tight text-black dark:text-white">
            {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </h2>
          <p className="text-xs font-mono text-black/50 dark:text-white/50 mt-1">
            {isSignUp 
              ? '필수 정보를 입력하여 새로운 유저 계정을 생성하세요.' 
              : '여정 편집 및 관리를 위해 등록된 계정으로 로그인하세요.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Sign Up Mode: Additional Profile Fields */}
          {isSignUp ? (
            <>
              {/* Last Name & First Name (2 Columns) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                    성 (LAST NAME) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="김 / Hong"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                    이름 (FIRST NAME) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="길동 / Gildong"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Birthdate & Phone (2 Columns) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                    생년월일 (BIRTHDAY)
                  </label>
                  <input 
                    type="text"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                    전화번호 (PHONE)
                  </label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                  이메일 (EMAIL) *
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                  비밀번호 (PASSWORD) *
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••• (6자 이상)"
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center rounded-none cursor-pointer"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>

              {/* Back to Sign In Link */}
              <div className="pt-3 border-t border-black/15 dark:border-white/15 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); }}
                  className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  ← BACK TO SIGN IN
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sign In Mode: Email & Password Only */}
              <div>
                <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                  이메일 (EMAIL) *
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                  비밀번호 (PASSWORD) *
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-8 px-0 bg-transparent border-b border-black/20 dark:border-white/20 rounded-none text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center rounded-none cursor-pointer"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>

              {/* Switch to Sign Up */}
              <div className="pt-4 border-t border-black/15 dark:border-white/15 flex flex-col items-center gap-1.5 text-center">
                <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
                  계정이 아직 없으신가요?
                </span>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); }}
                  className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  [CREATE AN ACCOUNT]
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* 2-Step Sign Up Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="CREATE ACCOUNT"
        message={`[${lastName} ${firstName}] (${email}) 님의 계정을 생성하시겠습니까?`}
        confirmLabel="CREATE"
        cancelLabel="CANCEL"
        confirmVariant="primary"
        onConfirm={() => executeAuth(true)}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>,
    document.body
  );
}

