import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ConfirmModal } from './ConfirmModal';
import { UserProfile } from '../types';
import { AVATAR_CATEGORIES, PROFILE_PRESET_ICONS } from './UserProfileAvatar';
import type { AvatarCategory } from './profile/FlatAvatars';
import { PasswordInput } from './PasswordInput';
import { VerifyEmailPanel } from './account/VerifyEmailPanel';
import { friendlyMailError, sendVerificationMail } from '../utils/emailVerification';
import { notify } from '../utils/feedback';
import { LEFTOVER_ACCOUNT, clearOrphanAccount, createAccountReclaiming, isGhostProfile } from '../utils/accountCleanup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  adminEmail?: string;
  onSignupStart?: () => void;
  onSignupEnd?: () => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess, onSignupStart, onSignupEnd }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [profileIcon, setProfileIcon] = useState('m-crew');
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('man');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [signupSubmitted, setSignupSubmitted] = useState(false);
  const [submittedUser, setSubmittedUser] = useState<UserProfile | null>(null);
  const [resetting, setResetting] = useState(false);

  // Field touched states for inline validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Sync mode when initialMode changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setUsername('');
      setProfileIcon('m-crew');
      setLastName('');
      setFirstName('');
      setError('');
      setLoading(false);
      setIsConfirmOpen(false);
      setSignupSubmitted(false);
      setTouched({});
    }
  }, [isOpen, initialMode]);

  // Real-time inline field validation errors
  const lastNameError = useMemo(() => {
    if (!touched.lastName && !lastName) return '';
    if (!lastName.trim()) return '성(Last Name)을 입력해 주세요.';
    return '';
  }, [touched.lastName, lastName]);

  const firstNameError = useMemo(() => {
    if (!touched.firstName && !firstName) return '';
    if (!firstName.trim()) return '이름(First Name)을 입력해 주세요.';
    return '';
  }, [touched.firstName, firstName]);

  const usernameError = useMemo(() => {
    if (!touched.username && !username) return '';
    const val = username.trim();
    if (!val) return '아이디(USERNAME)를 입력해 주세요.';
    if (val.length < 3 || val.length > 20) return '아이디는 3자 이상 20자 이하로 입력해 주세요.';
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.';
    return '';
  }, [touched.username, username]);

  const emailError = useMemo(() => {
    if (!touched.email && !email) return '';
    const val = email.trim();
    if (!val) return '이메일을 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '올바른 이메일 형식을 입력해 주세요 (예: name@example.com).';
    return '';
  }, [touched.email, email]);

  const passwordError = useMemo(() => {
    if (!touched.password && !password) return '';
    if (!password) return '비밀번호를 입력해 주세요.';
    if (password.length < 6) return '비밀번호는 최소 6자 이상이어야 합니다.';
    return '';
  }, [touched.password, password]);

  const passwordConfirmError = useMemo(() => {
    if (!touched.passwordConfirm && !passwordConfirm) return '';
    if (!passwordConfirm) return '비밀번호를 한 번 더 입력해 주세요.';
    if (passwordConfirm !== password) return '비밀번호가 일치하지 않습니다.';
    return '';
  }, [touched.passwordConfirm, passwordConfirm, password]);

  const isSignUpValid = Boolean(
    lastName.trim() &&
    firstName.trim() &&
    username.trim().length >= 3 &&
    username.trim().length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 6 &&
    passwordConfirm === password
  );

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

  // Self-service password reset: a link to the address in the email field
  const handleForgotPassword = async () => {
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError('비밀번호를 재설정할 이메일을 위 칸에 입력해 주세요.');
      return;
    }
    setError('');
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, target);
      notify(`${target}로 비밀번호 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.`, 'success');
    } catch (err: any) {
      setError(err?.code === 'auth/too-many-requests' ? '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' : '재설정 메일을 보내지 못했습니다. 이메일 주소를 확인해 주세요.');
    } finally {
      setResetting(false);
    }
  };

  // After sign-up: leave the verification card (verified now, or later from the bar under the header)
  const finishSignup = () => {
    setSignupSubmitted(false);
    setSubmittedUser(null);
    onSuccess?.();
    onClose();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      // Mark all fields touched
      setTouched({
        lastName: true,
        firstName: true,
        username: true,
        email: true,
        password: true,
        passwordConfirm: true,
      });

      if (!lastName.trim() || !firstName.trim()) {
        setError('성(Last Name)과 이름(First Name)을 모두 입력해 주세요.');
        return;
      }
      if (!username.trim() || username.trim().length < 3 || username.trim().length > 20 || !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        setError('아이디는 3~20자의 영문, 숫자, 밑줄(_)만 사용 가능합니다.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('올바른 이메일 형식을 입력해 주세요.');
        return;
      }
      if (!password.trim() || password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }
      if (passwordConfirm !== password) {
        setError('비밀번호 확인이 일치하지 않습니다.');
        return;
      }

      // Open Swiss Minimal 2-step confirmation modal directly
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
        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim().toLowerCase();

        // Signal App that we're in signup flow so onAuthStateChanged won't fire login/logout side effects
        onSignupStart?.();

        // 1. Create Firebase Auth user (Native email duplicate & format check)
        // An address whose old account was deleted is reclaimed when the password still opens it
        const userCredential = await createAccountReclaiming(cleanEmail, password);
        const user = userCredential.user;

        const fullName = `${lastName.trim()} ${firstName.trim()}`;
        await updateProfile(user, {
          displayName: fullName
        });

        const isSuper = cleanEmail === 'gonyisland@naver.com';

        // 2. Save UserProfile to both users/{uid} and public users collection
        const newProfile: UserProfile = {
          uid: user.uid,
          email: cleanEmail,
          username: cleanUsername,
          profileType: 'icon',
          profileIcon: profileIcon || 'user',
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          birthdate: '',
          phone: '',
          role: isSuper ? 'admin' : 'user',
          status: isSuper ? 'approved' : 'pending', // Becomes 'approved' once the member verifies their email
          permissions: {
            canCreate: true,
            canEdit: isSuper,
            canDelete: isSuper,
          },
          createdAt: Date.now(),
        };

        const saved = await Promise.allSettled([
          setDoc(doc(db, 'users', user.uid), newProfile),
          setDoc(doc(db, 'users', 'public', 'users', user.uid), newProfile)
        ]);
        // Without a profile the account would be an empty member: undo it and say so
        if (saved.every(r => r.status === 'rejected')) {
          console.error('Profile save failed:', saved);
          await clearOrphanAccount(user);
          throw Object.assign(new Error('profile not saved'), { code: 'tgl/profile-not-saved' });
        }

        // The member confirms their own address; no admin step
        let mailError = '';
        if (!isSuper) {
          await sendVerificationMail(user).catch((mailErr) => { mailError = friendlyMailError(mailErr); });
        }

        setSubmittedUser(newProfile);
        setIsConfirmOpen(false);
        onSignupEnd?.();
        setLoading(false);
        if (isSuper) {
          onSuccess?.();
          onClose();
          return;
        }
        setError(mailError);
        setSignupSubmitted(true);
        return;
      } else {
        // Log In
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Verify user approval status in Firestore (checks public collection first, then private)
        try {
          let prof: UserProfile | null = null;
          const publicSnap = await getDoc(doc(db, 'users', 'public', 'users', user.uid));
          // A document with no identity in it (left by older builds) is not a profile
          if (publicSnap.exists() && !isGhostProfile(publicSnap.data())) {
            prof = publicSnap.data() as UserProfile;
          } else {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists() && !isGhostProfile(userSnap.data())) {
              prof = userSnap.data() as UserProfile;
            }
          }

          const isSuper = user.email?.toLowerCase() === 'gonyisland@naver.com';

          // No profile: a member the operator deleted. Never bring it back as an empty member;
          // the account removes itself so the address can sign up again (v1.3.6)
          if (!prof && !isSuper) {
            await clearOrphanAccount(user);
            setError('삭제된 계정입니다. 같은 이메일로 다시 가입할 수 있습니다.');
            setLoading(false);
            return;
          }

          // The operator account initializes its own profile
          if (!prof) {
            const recoveryProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              username: user.email?.split('@')[0] || 'user',
              profileType: 'icon',
              profileIcon: 'user',
              lastName: user.displayName ? user.displayName.split(' ')[0] : '회원',
              firstName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
              birthdate: '',
              phone: '',
              role: isSuper ? 'admin' : 'user',
              status: isSuper ? 'approved' : 'pending', // Recovered profiles also verify their email
              permissions: { canCreate: true, canEdit: isSuper, canDelete: isSuper },
              createdAt: Date.now(),
            };

            await Promise.allSettled([
              setDoc(doc(db, 'users', user.uid), recoveryProfile, { merge: true }),
              setDoc(doc(db, 'users', 'public', 'users', user.uid), recoveryProfile, { merge: true })
            ]);

            prof = recoveryProfile;
          }

          // Only block if explicitly rejected by admin
          if (prof.status === 'rejected') {
            await auth.signOut();
            setError('이용이 제한된 계정입니다.');
            setLoading(false);
            return;
          }
        } catch (fetchErr) {
          console.warn('Profile status check warning:', fetchErr);
        }
      }
      setIsConfirmOpen(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      // A failed sign-up never leaves anyone signed in (the old account it tried to clear, or a
      // new account without a profile)
      if (isCreatingAccount && auth.currentUser) await auth.signOut().catch(() => {});
      // Always clear signup flag on error so auth state works normally again
      onSignupEnd?.();
      let errorMsg = '인증에 실패했습니다. 다시 시도해 주세요.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = '등록되지 않은 이메일입니다.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = '이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.';
      } else if (err.code === LEFTOVER_ACCOUNT) {
        errorMsg = '이 이메일로 쓰던 계정이 남아 있습니다. 예전 비밀번호를 넣고 다시 가입하거나, 로그인 화면의 비밀번호 찾기로 새 비밀번호를 정해 한 번 로그인하면 정리되어 다시 가입할 수 있습니다.';
      } else if (err.code === 'tgl/profile-not-saved') {
        errorMsg = '프로필을 저장하지 못해 가입을 취소했습니다. 잠시 후 다시 시도해 주세요.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '올바른 이메일 형식을 입력해 주세요.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = '비밀번호는 최소 6자 이상이어야 합니다.';
      } else if (err.message) {
        errorMsg = `인증 오류: ${err.message}`;
      }
      setError(errorMsg);
      setIsConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-modal flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark rounded-card p-6 md:p-8 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white my-auto shrink-0 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="tap-target absolute top-4 right-4 w-9 h-9 rounded-full inline-grid place-items-center text-black/60 dark:text-white/60 hover:bg-black/[0.06] dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* After sign-up: confirm the email */}
        {signupSubmitted ? (
          <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            {error && (
              <div className="p-3 rounded-thumb bg-red-500/5 text-red-600 dark:text-red-400 text-xs leading-relaxed">{error}</div>
            )}
            <VerifyEmailPanel
              variant="card"
              email={submittedUser?.email}
              profileStatus="pending"
              onVerified={finishSignup}
              onLater={finishSignup}
            />
          </div>
        ) : (
          <>
            {/* Header - Swiss Minimal with Inter font */}
            <div className="border-b border-black/15 dark:border-white/15 pb-4 mb-5">
              <span className="text-meta font-mono font-bold tracking-widest text-red-600 dark:text-red-500 uppercase block mb-1">
                {isSignUp ? 'USER REGISTRATION' : 'AUTHENTICATION'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-inter font-extrabold uppercase tracking-tight text-black dark:text-white">
                {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </h2>
              <p className="text-xs font-mono text-black/60 dark:text-white/60 mt-1">
                {isSignUp 
                  ? '가입한 뒤 본인 메일 인증을 마치면 바로 시작할 수 있습니다.' 
                  : '여정 편집 및 관리를 위해 등록된 계정으로 로그인하세요.'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-thumb bg-red-500/[0.07] text-red-600 dark:text-red-400 text-xs leading-relaxed">
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
                        Last name *
                      </label>
                      <input 
                        type="text"
                        required
                        value={lastName}
                        onBlur={() => markTouched('lastName')}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="김 / Hong"
                        className={`w-full h-10 px-4 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full text-sm focus:outline-none transition-colors ${
                          lastNameError 
                            ? 'border-red-500 text-red-600 dark:text-red-400' 
                            : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                        }`}
                      />
                      {lastNameError && (
                        <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                          {lastNameError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                        First name *
                      </label>
                      <input 
                        type="text"
                        required
                        value={firstName}
                        onBlur={() => markTouched('firstName')}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="길동 / Gildong"
                        className={`w-full h-10 px-4 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full text-sm focus:outline-none transition-colors ${
                          firstNameError 
                            ? 'border-red-500 text-red-600 dark:text-red-400' 
                            : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                        }`}
                      />
                      {firstNameError && (
                        <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                          {firstNameError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Username (아이디) */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Username *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={username}
                      onBlur={() => markTouched('username')}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="3~20자 영문/숫자/_ (예: traveler_01)"
                      className={`w-full h-10 px-4 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full text-sm focus:outline-none transition-colors ${
                        usernameError 
                          ? 'border-red-500 text-red-600 dark:text-red-400' 
                          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                      }`}
                    />
                    {usernameError ? (
                      <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                        {usernameError}
                      </p>
                    ) : (
                      <p className="text-micro font-mono text-black/60 dark:text-white/60 mt-1">
                        영문 소문자, 숫자, 밑줄(_) 조합 (3~20자)
                      </p>
                    )}
                  </div>

                  {/* 1:1 Profile Icon Selector */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1.5">
                      1:1 프로필 아이콘 선택
                    </label>
                    <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar mb-2">
                      {AVATAR_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAvatarCategory(cat.id)}
                          className={`h-7 px-3 rounded-full text-meta font-bold shrink-0 transition-colors ${
                            avatarCategory === cat.id ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' : 'bg-black/[0.05] dark:bg-white/10 text-black/60 dark:text-white/60'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {PROFILE_PRESET_ICONS.filter(i => i.category === avatarCategory).map((item) => {
                        const IconComp = item.icon;
                        const isSelected = profileIcon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfileIcon(item.id)}
                            title={item.label}
                            aria-pressed={isSelected}
                            aria-label={item.label}
                            className={`aspect-square rounded-full overflow-hidden transition-transform cursor-pointer ${
                              isSelected ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-surface dark:ring-offset-surface-dark' : 'hover:scale-105'
                            }`}
                          >
                            <IconComp className="w-full h-full block" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Email *
                    </label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onBlur={() => markTouched('email')}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full h-10 px-4 bg-black/[0.03] dark:bg-white/[0.06] border rounded-full text-sm focus:outline-none transition-colors ${
                        emailError 
                          ? 'border-red-500 text-red-600 dark:text-red-400' 
                          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                      }`}
                    />
                    {emailError && (
                      <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Password *
                    </label>
                    <PasswordInput
                      required
                      value={password}
                      onBlur={() => markTouched('password')}
                      onChange={setPassword}
                      placeholder="•••••• (6자 이상)"
                      autoComplete="new-password"
                      hasError={Boolean(passwordError)}
                    />
                    {passwordError && (
                      <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Password Confirmation */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Confirm password *
                    </label>
                    <PasswordInput
                      required
                      value={passwordConfirm}
                      onBlur={() => markTouched('passwordConfirm')}
                      onChange={setPasswordConfirm}
                      placeholder="비밀번호를 한 번 더 입력"
                      autoComplete="new-password"
                      hasError={Boolean(passwordConfirmError)}
                    />
                    {passwordConfirmError && (
                      <p className="text-meta font-mono text-red-600 dark:text-red-400 mt-1">
                        {passwordConfirmError}
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !isSignUpValid}
                    className="btn btn-primary btn-lg w-full mt-2 flex"
                  >
                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </button>
                  <p className="text-meta text-black/55 dark:text-white/55 text-center break-keep">
                    가입하면 <a href="/terms.html" target="_blank" rel="noopener" className="underline underline-offset-2">이용약관</a>과 <a href="/privacy.html" target="_blank" rel="noopener" className="underline underline-offset-2">개인정보처리방침</a>에 동의하게 됩니다.
                  </p>

                  {/* Back to Sign In Link */}
                  <div className="pt-3 border-t border-black/15 dark:border-white/15 text-center">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setError(''); }}
                      className="btn btn-ghost btn-sm"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
                      로그인으로 돌아가기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Sign In Mode: Email & Password Only */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Email *
                    </label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-10 px-4 bg-black/[0.03] dark:bg-white/[0.06] border border-black/20 dark:border-white/20 rounded-full text-sm focus:border-black dark:focus:border-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      Password *
                    </label>
                    <PasswordInput
                      required
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                    />
                    <div className="flex justify-end mt-1.5">
                      <button type="button" onClick={handleForgotPassword} disabled={resetting} className="btn btn-ghost btn-sm">
                        {resetting ? '보내는 중' : '비밀번호 찾기'}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg w-full mt-2 flex"
                  >
                    {loading ? 'SIGNING IN...' : 'SIGN IN'}
                  </button>

                  {/* Switch to Sign Up */}
                  <div className="pt-4 border-t border-black/15 dark:border-white/15 flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[11px] font-mono text-black/60 dark:text-white/60">
                      계정이 아직 없으신가요?
                    </span>
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(''); }}
                      className="btn btn-secondary btn-sm"
                    >
                      가입하기
                    </button>
                  </div>
                </>
              )}
            </form>
          </>
        )}
      </div>

      {/* 2-Step Sign Up Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="CREATE ACCOUNT"
        message={`[${lastName} ${firstName}] (${email}) 님의 계정을 생성하시겠습니까?`}
        confirmLabel="Create"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={() => executeAuth(true)}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>,
    document.body
  );
}

