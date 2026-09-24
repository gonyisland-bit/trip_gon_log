import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, User, Sun, Moon, Search, Home, Archive as ArchiveIcon, Compass, X, SlidersHorizontal } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { UserProfileAvatar } from './UserProfileAvatar';
import { PasswordVerifyModal } from './PasswordVerifyModal';
import { ProfileEditModal } from './ProfileEditModal';
import { MiniWeatherWidget } from './MiniWeatherWidget';

interface NavigationProps {
  currentView: string;
  navigateTo: (view: string, tripId?: number | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  nightModeSetting?: 'auto' | 'light' | 'dark';
  setNightModeSetting?: (setting: 'auto' | 'light' | 'dark') => void;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  openAuthModal: (mode: 'login' | 'signup') => void;
  openSettingModal?: () => void;
  onSearchClick: () => void;
  isAdmin?: boolean;
  isHomeGradientActive?: boolean;
  currentUserProfile?: UserProfile | null;
  onUpdateCurrentUserProfile?: (updated: UserProfile) => void;
}

export function Navigation({
  currentView,
  navigateTo,
  isLoggedIn,
  setIsLoggedIn,
  isDarkMode,
  setIsDarkMode,
  nightModeSetting = 'auto',
  setNightModeSetting,
  showSettings,
  setShowSettings,
  openAuthModal,
  openSettingModal,
  onSearchClick,
  isAdmin = false,
  isHomeGradientActive = false,
  currentUserProfile,
  onUpdateCurrentUserProfile,
}: NavigationProps) {
  const currentUser = auth.currentUser;
  const displayName = currentUserProfile?.username || currentUser?.displayName || currentUser?.email?.split('@')[0].toUpperCase() || 'USER';
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isPasswordVerifyOpen, setIsPasswordVerifyOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  const handleSaveMyProfile = async (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const cleanData: Record<string, any> = {};
    Object.entries(updated).forEach(([k, v]) => {
      if (v !== undefined) cleanData[k] = v;
    });

    await Promise.allSettled([
      setDoc(doc(db, 'users', currentUser.uid), cleanData, { merge: true }),
      setDoc(doc(db, 'users', 'public', 'users', currentUser.uid), cleanData, { merge: true })
    ]);
    
    const merged: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      username: displayName,
      role: 'user',
      permissions: { canCreate: true, canEdit: false, canDelete: false },
      createdAt: Date.now(),
      ...(currentUserProfile || {}),
      ...cleanData,
    } as UserProfile;
    
    onUpdateCurrentUserProfile?.(merged);
    
    const newDisplayName = `${merged.lastName || ''} ${merged.firstName || ''}`.trim() || merged.username || displayName;
    if (newDisplayName) {
      await updateProfile(currentUser, { displayName: newDisplayName }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    setShowSettings(false);
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
      navigateTo('home');
    }
  };

  const handleMenuNavigate = (view: string) => {
    setShowSettings(false);
    if (view === 'manage') {
      if (currentView === 'manage') {
        const returnView = sessionStorage.getItem('lastNonManageView') || 'home';
        navigateTo(returnView);
      } else {
        sessionStorage.setItem('lastNonManageView', currentView);
        sessionStorage.setItem('initialManageTab', currentView.toUpperCase());
        navigateTo('manage');
      }
    } else {
      if (view === 'magazine') {
        try {
          sessionStorage.setItem('magazineViewMode', 'hub');
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('resetMagazineHub'));
      }
      navigateTo(view);
    }
  };

  // Close menu on Escape key
  useEffect(() => {
    if (!showSettings) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettings, setShowSettings]);

  const navBgClass = showSettings 
    ? 'bg-white dark:bg-[#141414]' 
    : (isHomeGradientActive ? 'bg-white/30 backdrop-blur-md' : 'bg-white dark:bg-[#141414]');

  return (
    <nav className={`sticky top-0 z-40 w-full ${navBgClass} border-b border-black/10 dark:border-white/10 transition-colors duration-300 select-none`}>
      <div className="w-full px-5 sm:px-8 md:px-12 lg:px-16 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-6 md:gap-10 min-w-0">
          <button 
            onClick={() => navigateTo('home')} 
            className="flex items-center cursor-pointer group shrink-0"
            title="Tripgon log 홈으로 이동"
          >
            <img 
              src="/logo-logotype.png" 
              alt="Tripgon log" 
              className="h-5 sm:h-6 md:h-6.5 w-auto object-contain dark:invert transition-opacity group-hover:opacity-80 select-none" 
            />
          </button>

          {/* Desktop Nav Links (HOME / TRIP / MAGAZINE / MAP in Inter Font, Uppercase, Larger) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 border-l border-black/15 dark:border-white/15 pl-6 lg:pl-8 font-['Inter',sans-serif]">
            <button 
              onClick={() => navigateTo('home')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'home' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              HOME
            </button>
            <button 
              onClick={() => navigateTo('archive')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'archive' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              TRIP
            </button>
            <button 
              onClick={() => {
                try {
                  sessionStorage.setItem('magazineViewMode', 'hub');
                } catch (_) {}
                window.dispatchEvent(new CustomEvent('resetMagazineHub'));
                navigateTo('magazine');
              }} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'magazine' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              MAGAZINE
            </button>
            <button 
              onClick={() => navigateTo('map')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'map' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              MAP
            </button>
            <button 
              onClick={() => navigateTo('calendar')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'calendar' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              CALENDAR
            </button>
            <button 
              onClick={() => navigateTo('pocket')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'pocket' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              POCKET
            </button>
          </div>
        </div>

        {/* Right: Action Icons (Search, Weather Widget, Hamburger Menu) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0" ref={dropdownRef}>
          {/* Search Button */}
          <button 
            type="button"
            onClick={onSearchClick}
            className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            title="통합 검색 (Ctrl + K)"
          >
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Mini Weather Widget Pill (All Hubs Persistent) */}
          <MiniWeatherWidget className="mr-0.5 sm:mr-1 shrink-0" />

          {/* Hamburger Menu Toggle Button - Clean Swiss Minimal icon */}
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer flex items-center justify-center ${
              showSettings 
                ? 'bg-black text-white dark:bg-white dark:text-black' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            }`}
            title={showSettings ? "메뉴 닫기" : "메뉴 열기"}
            aria-label="Toggle navigation menu"
          >
            {showSettings ? (
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop for Desktop Drawer & Mobile Overlay */}
      <div 
        onClick={() => setShowSettings(false)}
        className={`fixed inset-0 z-[99] bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Swiss Minimal Typography Drawer Menu (Mobile Fullscreen / Desktop Slide-over Drawer) */}
      <div 
        style={{ backgroundColor: isDarkMode ? '#111111' : '#FFFFFF' }}
        className={`fixed inset-y-0 right-0 z-[100] w-full sm:max-w-md !bg-white dark:!bg-[#111111] border-l border-black/15 dark:border-white/15 flex flex-col justify-between p-5 sm:p-7 md:p-8 transition-transform duration-300 ease-out shadow-2xl overflow-y-auto ${
          showSettings 
            ? 'translate-x-0 pointer-events-auto' 
            : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4 shrink-0">
          <div className="flex items-center">
            <img 
              src="/logo-logotype.png" 
              alt="Tripgon log" 
              className="h-5 sm:h-6 w-auto object-contain dark:invert select-none" 
            />
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors cursor-pointer"
            title="메뉴 닫기"
          >
            <X className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </button>
        </div>

        {/* Editorial Menu List - Compact Fit-to-Screen Swiss Typography */}
        <div className="flex flex-col space-y-2.5 sm:space-y-3.5 md:space-y-4 my-auto py-4 sm:py-5 shrink min-h-0">
          <button
            onClick={() => handleMenuNavigate('home')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              01
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'home' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              HOME
            </span>
          </button>

          <button
            onClick={() => handleMenuNavigate('archive')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              02
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'archive' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              TRIP
            </span>
          </button>

          <button
            onClick={() => handleMenuNavigate('magazine')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              03
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'magazine' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              MAGAZINE
            </span>
          </button>

          <button
            onClick={() => handleMenuNavigate('map')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              04
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'map' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              MAP
            </span>
          </button>

          <button
            onClick={() => handleMenuNavigate('calendar')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              05
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'calendar' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              CALENDAR
            </span>
          </button>

          <button
            onClick={() => handleMenuNavigate('pocket')}
            className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold text-red-600 dark:text-red-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
              06
            </span>
            <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
              currentView === 'pocket' 
                ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
            }`}>
              POCKET
            </span>
          </button>

          {isLoggedIn && isAdmin && (
            <button
              onClick={() => handleMenuNavigate(currentView === 'manage' ? 'home' : 'manage')}
              className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-1.5"
            >
              <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
                07
              </span>
              <span className={`font-['Inter',sans-serif] text-xl sm:text-2xl md:text-[26px] font-black uppercase tracking-tight transition-colors ${
                currentView === 'manage' 
                  ? 'text-black dark:text-white underline decoration-2 underline-offset-6' 
                  : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
              }`}>
                SETTINGS
              </span>
            </button>
          )}

          {/* Swiss Minimal 3-Way Segmented Control for Night Mode with Shortcut Tooltip */}
          <div 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 sm:pt-3 border-t border-black/5 dark:border-white/5"
            title="나이트 모드 전환 (단축키: ⌘+Shift+L / Ctrl+Shift+L)"
          >
            <div className="flex items-center">
              <span className="font-mono text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mr-3 sm:mr-4 select-none w-5 shrink-0">
                {isLoggedIn && isAdmin ? '08' : '07'}
              </span>
              <span className="font-['Inter',sans-serif] text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-black/80 dark:text-white/80">
                NIGHT MODE
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50 ml-2.5 select-none" title="키보드 단축키">
                ⌘⇧L
              </span>
            </div>
            <div className="flex items-center self-start sm:self-auto p-0.5 sm:p-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/15 font-mono text-[10px] sm:text-xs font-bold tracking-wider shrink-0">
              <button
                type="button"
                onClick={() => setNightModeSetting ? setNightModeSetting('auto') : setIsDarkMode(!isDarkMode)}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors ${
                  nightModeSetting === 'auto'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
                title="저녁 18시 ~ 익일 06시 나이트 모드 자동 적용"
              >
                AUTO
              </button>
              <button
                type="button"
                onClick={() => {
                  if (setNightModeSetting) setNightModeSetting('light');
                  setIsDarkMode(false);
                }}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors ${
                  nightModeSetting === 'light'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                LIGHT
              </button>
              <button
                type="button"
                onClick={() => {
                  if (setNightModeSetting) setNightModeSetting('dark');
                  setIsDarkMode(true);
                }}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors ${
                  nightModeSetting === 'dark'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                DARK
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-mono shrink-0">
          {isLoggedIn ? (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setIsPasswordVerifyOpen(true);
                  }}
                  className="flex items-center gap-2.5 text-left cursor-pointer group"
                  title="내 프로필 수정 (암호 확인 후 진입)"
                >
                  <UserProfileAvatar profile={currentUserProfile} size="sm" fallbackName={displayName} />
                  <div className="flex flex-col">
                    <span className="font-bold text-black dark:text-white uppercase tracking-wider group-hover:text-red-600 transition-colors">
                      {displayName}
                    </span>
                    <span className="text-[9px] text-black/40 dark:text-white/40 font-mono">
                      프로필 수정
                    </span>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="font-black text-red-600 dark:text-red-400 hover:underline cursor-pointer tracking-widest uppercase"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  onClick={() => { setShowSettings(false); openAuthModal('login'); }}
                  className="font-black uppercase tracking-widest hover:underline cursor-pointer text-black dark:text-white"
                >
                  LOGIN
                </button>
                <span className="text-black/30 dark:text-white/30">/</span>
                <button
                  onClick={() => { setShowSettings(false); openAuthModal('signup'); }}
                  className="font-black uppercase tracking-widest hover:underline cursor-pointer text-black dark:text-white"
                >
                  SIGN UP
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Password Verification Modal before accessing profile */}
      {isPasswordVerifyOpen && currentUser?.email && (
        <PasswordVerifyModal
          isOpen={isPasswordVerifyOpen}
          email={currentUser.email}
          onClose={() => setIsPasswordVerifyOpen(false)}
          onSuccess={() => {
            setIsPasswordVerifyOpen(false);
            setIsProfileEditOpen(true);
          }}
        />
      )}

      {/* User Profile Edit Modal */}
      {isProfileEditOpen && currentUser && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          user={currentUserProfile || {
            uid: currentUser.uid,
            email: currentUser.email || '',
            username: displayName,
            lastName: '',
            firstName: '',
            birthdate: '',
            phone: '',
            role: 'user',
            permissions: { canCreate: true, canEdit: false, canDelete: false },
            createdAt: Date.now(),
          }}
          onClose={() => setIsProfileEditOpen(false)}
          onSave={handleSaveMyProfile}
          title="내 프로필 수정"
        />
      )}
    </nav>
  );
}
