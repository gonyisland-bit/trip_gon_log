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
      <div className="relative w-full max-w-md bg-[#F9F8F6] dark:bg-[#111111] border border-black/20 dark:border-white/20 p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto shrink-0">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:opacity-60 transition-opacity cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo / Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1 font-sans">
            Tripgon log
          </h2>
          <p className="text-[10px] md:text-xs text-black/50 dark:text-white/50 uppercase tracking-widest font-mono">
            {isSignUp ? 'Create your personal account' : 'Log in to edit your journeys'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/10 dark:border-white/10 mb-5 text-xs font-bold uppercase tracking-widest">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${!isSignUp ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
          >
            Log In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${isSignUp ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'}`}
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
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
          {isSignUp && (
            <>
              {/* Last Name & First Name (1 Row) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
                    성 (LAST NAME) *
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    <input 
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="김 / Hong"
                      className="w-full pl-8 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
                    이름 (FIRST NAME) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="길동 / Gildong"
                    className="w-full px-3 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                  />
                </div>
              </div>

              {/* Birthdate & Phone (1 Row) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
                    생년월일 (BIRTHDAY)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    <input 
                      type="text"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full pl-8 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
                    전화번호 (PHONE)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full pl-8 pr-3 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
              이메일 주소 (EMAIL) *
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

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-black/60 dark:text-white/60">
              비밀번호 (PASSWORD) *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••• (6자 이상)"
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-3 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center rounded-none cursor-pointer"
          >
            {loading ? '처리 중...' : isSignUp ? 'CREATE' : 'LOG IN'}
          </button>
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

