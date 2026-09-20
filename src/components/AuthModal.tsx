import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User, Calendar, Phone, CheckCircle2, AlertCircle, Copy, ExternalLink, Send } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ConfirmModal } from './ConfirmModal';
import { UserProfile } from '../types';
import { PROFILE_PRESET_ICONS, UserProfileAvatar } from './UserProfileAvatar';
import { sendAdminApprovalNotification, generateAdminApprovalMailtoUrl } from '../utils/adminEmailNotifier';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  adminEmail?: string;
  onSignupStart?: () => void;
  onSignupEnd?: () => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess, adminEmail, onSignupStart, onSignupEnd }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profileIcon, setProfileIcon] = useState('user');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [signupSubmitted, setSignupSubmitted] = useState(false);
  const [submittedUser, setSubmittedUser] = useState<UserProfile | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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
      setUsername('');
      setProfileIcon('user');
      setLastName('');
      setFirstName('');
      setBirthdate('');
      setPhone('');
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

  const isSignUpValid = Boolean(
    lastName.trim() &&
    firstName.trim() &&
    username.trim().length >= 3 &&
    username.trim().length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 6
  );

  // Auto-close modal and return to landing guest view after notice (generous timeout so applicant can copy link or send mail)
  React.useEffect(() => {
    if (signupSubmitted) {
      const timer = setTimeout(() => {
        setSignupSubmitted(false);
        setIsSignUp(false);
        setSubmittedUser(null);
        onClose();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [signupSubmitted, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmOpen && !signupSubmitted) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmOpen, signupSubmitted, onClose]);

  if (!isOpen) return null;

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
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        const fullName = `${lastName.trim()} ${firstName.trim()}`;
        await updateProfile(user, {
          displayName: fullName
        });

        const isSuper = cleanEmail === 'gonyisland@naver.com';
        const approvalToken = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : (Math.random().toString(36).substring(2, 11) + Date.now().toString(36));

        // 2. Save UserProfile to both users/{uid} and public users collection
        const newProfile: UserProfile = {
          uid: user.uid,
          email: cleanEmail,
          username: cleanUsername,
          profileType: 'icon',
          profileIcon: profileIcon || 'user',
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          birthdate: birthdate.trim(),
          phone: phone.trim(),
          role: isSuper ? 'admin' : 'user',
          status: 'approved', // Auto-approved for frictionless immediate access
          approvalToken,
          permissions: {
            canCreate: true,
            canEdit: isSuper,
            canDelete: isSuper,
          },
          createdAt: Date.now(),
        };

        await Promise.allSettled([
          setDoc(doc(db, 'users', user.uid), newProfile),
          setDoc(doc(db, 'users', 'public', 'users', user.uid), newProfile)
        ]);

        setSubmittedUser(newProfile);
        setIsConfirmOpen(false);

        // Send notification email to administrator in background
        sendAdminApprovalNotification(newProfile, adminEmail).catch(err => {
          console.warn('Background admin email notification warning:', err);
        });

        // Immediately complete signup and log in
        onSignupEnd?.();
        setLoading(false);
        onSuccess?.();
        onClose();
        return;
      } else {
        // Log In
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Verify user approval status in Firestore (checks public collection first, then private)
        try {
          let prof: UserProfile | null = null;
          const publicSnap = await getDoc(doc(db, 'users', 'public', 'users', user.uid));
          if (publicSnap.exists()) {
            prof = publicSnap.data() as UserProfile;
          } else {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
              prof = userSnap.data() as UserProfile;
            }
          }

          const isSuper = user.email?.toLowerCase() === 'gonyisland@naver.com';

          // If user exists in Auth but has no Firestore profile (isolated account recovery)
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
              status: 'approved', // Auto-approve on recovery to clear login roadblock
              approvalToken: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 11) + Date.now().toString(36)),
              permissions: { canCreate: true, canEdit: isSuper, canDelete: isSuper },
              createdAt: Date.now(),
            };

            await Promise.allSettled([
              setDoc(doc(db, 'users', user.uid), recoveryProfile, { merge: true }),
              setDoc(doc(db, 'users', 'public', 'users', user.uid), recoveryProfile, { merge: true })
            ]);

            prof = recoveryProfile;
          } else if (prof.status === 'pending') {
            // Existing pending applicant: auto-approve upon successful credential authentication
            prof.status = 'approved';
            await Promise.allSettled([
              updateDoc(doc(db, 'users', user.uid), { status: 'approved', approvedAt: Date.now() }),
              setDoc(doc(db, 'users', 'public', 'users', user.uid), { ...prof, status: 'approved', approvedAt: Date.now() }, { merge: true }),
            ]);
          }

          // Only block if explicitly rejected by admin
          if (prof.status === 'rejected') {
            await auth.signOut();
            setError('가입 승인이 거절된 계정입니다. 관리자에게 문의해 주세요.');
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
      // Always clear signup flag on error so auth state works normally again
      onSignupEnd?.();
      let errorMsg = '인증에 실패했습니다. 다시 시도해 주세요.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (err.code === 'auth/user-not-found') {
        errorMsg = '등록되지 않은 이메일입니다.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = '이미 등록된 이메일 계정입니다.\n이미 가입 신청이 완료된 계정입니다. 관리자 승인 후 로그인하세요.';
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

        {/* Sign Up Submitted Notice View */}
        {signupSubmitted ? (
          <div className="py-4 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center mb-4 text-black dark:text-white">
              <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-red-600 dark:text-red-500 uppercase block mb-1">
              APPLICATION SUBMITTED
            </span>
            <h3 className="text-xl sm:text-2xl font-inter font-black uppercase tracking-tight text-black dark:text-white mb-3">
              APPROVAL PENDING
            </h3>
            <p className="text-xs font-mono text-black/70 dark:text-white/70 leading-relaxed max-w-sm mb-5">
              가입 신청이 성공적으로 접수되었습니다.<br />
              관리자의 승인이 완료된 후 서비스 이용이 가능합니다.
            </p>

            {/* Admin Direct Notification Options (Swiss Minimal) */}
            {submittedUser && (
              <div className="w-full flex flex-col gap-2 mb-5 p-3 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                    DIRECT ADMIN NOTIFICATION
                  </span>
                  <span className="text-[9px] font-mono text-red-600 dark:text-red-400 font-bold">
                    {adminEmail || 'gonyisland@naver.com'}
                  </span>
                </div>

                {/* 1. Send via local mail app (mailto:) */}
                <a
                  href={generateAdminApprovalMailtoUrl(submittedUser, adminEmail)}
                  className="w-full py-2 px-3 border border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-black dark:text-white text-center"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>관리자에게 승인 요청 메일 발송 (MAILTO)</span>
                </a>

                {/* 2. Copy One-Click Approval URL */}
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trip-gon-log.vercel.app';
                    const link = `${origin}/?approve_uid=${submittedUser.uid}&token=${submittedUser.approvalToken || ''}`;
                    navigator.clipboard?.writeText(link).then(() => {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }).catch(() => {});
                  }}
                  className="w-full py-2 px-3 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-black/80 dark:text-white/80"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? '승인 링크 복사 완료' : '원클릭 승인 링크 복사'}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSignupSubmitted(false);
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setUsername('');
                setLastName('');
                setFirstName('');
                setPhone('');
                setBirthdate('');
                setError('');
                setSubmittedUser(null);
                onClose();
              }}
              className="w-full h-11 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              확인 (CONFIRM)
            </button>
          </div>
        ) : (
          <>
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
                  ? '필수 정보를 입력하여 새로운 유저 계정 가입을 신청하세요.' 
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
                        onBlur={() => markTouched('lastName')}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="김 / Hong"
                        className={`w-full h-8 px-0 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
                          lastNameError 
                            ? 'border-red-500 text-red-600 dark:text-red-400' 
                            : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                        }`}
                      />
                      {lastNameError && (
                        <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1">
                          {lastNameError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                        이름 (FIRST NAME) *
                      </label>
                      <input 
                        type="text"
                        required
                        value={firstName}
                        onBlur={() => markTouched('firstName')}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="길동 / Gildong"
                        className={`w-full h-8 px-0 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
                          firstNameError 
                            ? 'border-red-500 text-red-600 dark:text-red-400' 
                            : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                        }`}
                      />
                      {firstNameError && (
                        <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1">
                          {firstNameError}
                        </p>
                      )}
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

                  {/* Username (아이디) */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1">
                      아이디 (USERNAME) *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={username}
                      onBlur={() => markTouched('username')}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="3~20자 영문/숫자/_ (예: traveler_01)"
                      className={`w-full h-8 px-0 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
                        usernameError 
                          ? 'border-red-500 text-red-600 dark:text-red-400' 
                          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                      }`}
                    />
                    {usernameError ? (
                      <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1">
                        {usernameError}
                      </p>
                    ) : (
                      <p className="text-[9.5px] font-mono text-black/40 dark:text-white/40 mt-1">
                        영문 소문자, 숫자, 밑줄(_) 조합 (3~20자)
                      </p>
                    )}
                  </div>

                  {/* 1:1 Profile Icon Selector */}
                  <div>
                    <label className="block text-[11px] font-inter font-bold uppercase tracking-wider text-black/80 dark:text-white/80 mb-1.5">
                      1:1 프로필 아이콘 선택
                    </label>
                    <div className="grid grid-cols-6 gap-1 p-1 bg-black/[0.02] dark:bg-white/[0.02] border border-black/15 dark:border-white/15">
                      {PROFILE_PRESET_ICONS.slice(0, 12).map((item) => {
                        const IconComp = item.icon;
                        const isSelected = profileIcon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfileIcon(item.id)}
                            title={item.label}
                            className={`p-1.5 flex flex-col items-center justify-center aspect-square border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-red-600 bg-red-600/10 text-red-600 font-bold scale-105'
                                : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20'
                            }`}
                          >
                            <IconComp className="w-4 h-4 stroke-[2.2]" />
                            <span className="text-[7.5px] font-mono mt-0.5">{item.label}</span>
                          </button>
                        );
                      })}
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
                      onBlur={() => markTouched('email')}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full h-8 px-0 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
                        emailError 
                          ? 'border-red-500 text-red-600 dark:text-red-400' 
                          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                      }`}
                    />
                    {emailError && (
                      <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1">
                        {emailError}
                      </p>
                    )}
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
                      onBlur={() => markTouched('password')}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••• (6자 이상)"
                      className={`w-full h-8 px-0 bg-transparent border-b rounded-none text-xs font-mono focus:outline-none transition-colors ${
                        passwordError 
                          ? 'border-red-500 text-red-600 dark:text-red-400' 
                          : 'border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white'
                      }`}
                    />
                    {passwordError && (
                      <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !isSignUpValid}
                    className="w-full h-11 mt-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-black dark:disabled:hover:bg-white dark:disabled:hover:text-black flex items-center justify-center rounded-none cursor-pointer"
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
          </>
        )}
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

