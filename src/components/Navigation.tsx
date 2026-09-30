import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Sun, Moon, Search, X, SlidersHorizontal, Play, Clock, Ticket, Wallet, Settings } from 'lucide-react';
import { OPEN_PROFILE_EDIT } from '../app/quickActions';
import { auth, db } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { UserProfileAvatar } from './UserProfileAvatar';
import { PasswordVerifyModal } from './PasswordVerifyModal';
import { ProfileEditModal } from './ProfileEditModal';
import { MiniWeatherWidget } from './MiniWeatherWidget';
import { NotificationBell } from './notifications/NotificationBell';
import { confirmDialog } from '../utils/feedback';
import { openIntro, prefetchIntro } from '../intro/openIntro';
import { preloadPocketPage } from '../utils/prefetchHelper';
import { openBookingWallet, openDepartureBoard } from '../app/quickActions';
import { NewTripButton } from './NewTripButton';
import { Segment } from './ui/Segment';
import { personName } from '../utils/personName';
import { shortcutMod } from '../utils/shortcut';

const HUBS = [
  { view: 'home', label: 'Home' },
  { view: 'archive', label: 'Trip' },
  { view: 'magazine', label: 'Magazine' },
  { view: 'map', label: 'Map' },
  { view: 'calendar', label: 'Calendar' },
  { view: 'pocket', label: 'Pocket' },
];

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
  onNewTrip?: () => void;
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
  onNewTrip,
  isAdmin = false,
  isHomeGradientActive = false,
  currentUserProfile,
  onUpdateCurrentUserProfile,
}: NavigationProps) {
  const currentUser = auth.currentUser;
  const displayName = currentUserProfile?.username || currentUser?.displayName || currentUser?.email?.split('@')[0].toUpperCase() || 'USER';
  // Shown to the person: their name (성+이름), not the account id
  const shownName = personName(currentUserProfile, currentUser?.displayName) || displayName;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const [isPasswordVerifyOpen, setIsPasswordVerifyOpen] = useState(false);
  // Settings → account row: profile edit after the password check
  useEffect(() => {
    const open = () => setIsPasswordVerifyOpen(true);
    window.addEventListener(OPEN_PROFILE_EDIT, open);
    return () => window.removeEventListener(OPEN_PROFILE_EDIT, open);
  }, []);
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
    if (await confirmDialog("로그아웃 하시겠습니까?")) {
      // This device stops getting the account's pushes (6-b)
      await import('../utils/push').then(m => m.forgetDevice()).catch(() => {});
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

  // The page underneath stays put while the menu is open
  useEffect(() => {
    if (!showSettings) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showSettings]);

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
    ? 'bg-paper dark:bg-paper-dark' 
    : (isHomeGradientActive ? 'bg-white/30 backdrop-blur-md' : 'bg-paper dark:bg-paper-dark');

  return (
    <nav className={`tgl-site-header sticky top-0 z-30 w-full ${navBgClass} border-b border-black/10 dark:border-white/10 transition-colors duration-300 select-none`}>
      <div className="w-full px-5 sm:px-8 md:px-12 lg:px-16 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-6 md:gap-10 min-w-0">
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('triggerSplashScreen'));
              navigateTo('home');
            }} 
            className="flex items-center cursor-pointer group shrink-0"
            title="Tripgon log 홈으로 이동 (스플래시 실행)"
          >
            <img 
              src="/tripgon-logotype.svg"
              data-brand-logo
              alt="Tripgon log" 
              className="h-5 sm:h-6 md:h-6.5 w-auto object-contain dark:invert transition-opacity group-hover:opacity-80 select-none" 
            />
          </button>

          {/* Desktop Nav Links: shown where they fit beside the actions (signed in adds New trip, so from xl); narrower widths use the menu */}
          <div className={`hidden ${isLoggedIn ? 'xl:flex' : 'lg:flex'} items-center gap-6 xl:gap-8 border-l border-black/15 dark:border-white/15 pl-6 xl:pl-8 font-['Inter',sans-serif]`}>
            <button 
              onClick={() => navigateTo('home')} 
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'home' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              HOME
            </button>
            <button 
              onClick={() => navigateTo('archive')} 
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'archive' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
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
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'magazine' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              MAGAZINE
            </button>
            <button 
              onClick={() => navigateTo('map')} 
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'map' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              MAP
            </button>
            <button 
              onClick={() => navigateTo('calendar')} 
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'calendar' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              CALENDAR
            </button>
            <button 
              onClick={() => navigateTo('pocket')}
              onPointerEnter={() => { preloadPocketPage().catch(() => {}); }}
              onFocus={() => { preloadPocketPage().catch(() => {}); }}
              className={`text-xs md:text-sm font-extrabold tracking-widest uppercase transition-colors cursor-pointer py-1 border-b-2 ${
                currentView === 'pocket' 
                  ? 'text-black dark:text-white border-black dark:border-white' 
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              POCKET
            </button>
          </div>
        </div>

        {/* Right: Action Icons (Search, Weather Widget, Hamburger Menu) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0" ref={dropdownRef}>
          {/* Desktop: the one main action. Phones use the tab bar's red + */}
          {isLoggedIn && onNewTrip && (
            <NewTripButton onClick={onNewTrip} size="sm" className="hidden md:inline-flex mr-1" />
          )}

          {/* Find: signed in it opens the quick finder (Ctrl+K); a pill with the shortcut on desktop, an icon on phones */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onSearchClick}
              className="tap-target h-9 w-9 xl:w-auto xl:pl-3 xl:pr-1.5 rounded-full xl:bg-black/[0.05] xl:dark:bg-white/10 hover:bg-black/[0.06] dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
              title={`한번에 찾기 (${shortcutMod}K)`}
              aria-label="한번에 찾기"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline text-meta font-bold">찾기</span>
              <kbd className="hidden xl:inline-flex h-6 px-1.5 items-center rounded-full bg-surface dark:bg-surface-dark font-mono text-micro font-bold text-black/55 dark:text-white/55">{shortcutMod}K</kbd>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSearchClick}
              className="tap-target w-9 h-9 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center"
              title="검색 (/)"
              aria-label="검색"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Friends' news (v1.3.6 6-a) */}
          {isLoggedIn && currentUser && (
            <NotificationBell
              uid={currentUser.uid}
              onOpenJourney={(id) => navigateTo('detail', id)}
              onOpenPocket={() => navigateTo('pocket')}
              onOpenFriends={() => openSettingModal?.()}
            />
          )}

          {/* Mini Weather Widget Pill (All Hubs Persistent) */}
          <MiniWeatherWidget className="mr-0.5 sm:mr-1 shrink-0" />

          {/* Hamburger Menu Toggle Button - Clean Swiss Minimal icon */}
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
            className={`w-11 h-11 -mr-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              showSettings 
                ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            }`}
            title={showSettings ? "메뉴 닫기 (ESC)" : "메뉴 열기"}
            aria-label={showSettings ? "메뉴 닫기" : "메뉴 열기"}
          >
            <span className="relative w-[18px] h-3" data-open={showSettings || undefined} aria-hidden>
              <span className="tgl-burger-line absolute left-0 right-0 top-0 h-[2px] rounded-full bg-current" />
              <span className="tgl-burger-line absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      {/* Backdrop and drawer live on <body>: the sticky header's blur and view transition must not
          become their containing block, and the drawer must measure the real visible viewport */}
      {createPortal(<>
      {/* Backdrop for Desktop Drawer & Mobile Overlay */}
      <div 
        onClick={() => setShowSettings(false)}
        className={`fixed inset-0 z-[99] bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer menu: full screen on phones, a slide-over panel from sm up.
          Big type for the six hubs, then compact rows for intro, screen mode and (admins) settings. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        aria-hidden={!showSettings}
        onTouchStart={(e) => { swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const st = swipeRef.current;
          swipeRef.current = null;
          if (!st) return;
          const dx = e.changedTouches[0].clientX - st.x, dy = e.changedTouches[0].clientY - st.y;
          if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setShowSettings(false);
        }}
        className={`tgl-drawer fixed inset-y-0 right-0 z-[100] w-full sm:max-w-md bg-surface dark:bg-surface-dark text-black dark:text-white sm:border-l border-black/15 dark:border-white/15 flex flex-col transition-[transform,opacity,visibility] duration-emph ease-emphasized overflow-y-auto overscroll-contain ${
          showSettings ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible pointer-events-none'
        }`}
        data-open={showSettings || undefined}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 sm:h-16 px-5 sm:px-7 border-b border-black/10 dark:border-white/10 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', boxSizing: 'content-box' }}>
          <button
            type="button"
            onClick={() => {
              setShowSettings(false);
              window.dispatchEvent(new CustomEvent('triggerSplashScreen'));
              navigateTo('home');
            }}
            className="h-11 flex items-center cursor-pointer group"
            title="Tripgon log 홈으로 이동 (스플래시 실행)"
          >
            <img src="/tripgon-logotype.svg" alt="Tripgon log" className="h-5 sm:h-6 w-auto object-contain dark:invert transition-opacity group-hover:opacity-80 select-none" />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="w-11 h-11 -mr-2 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-label="메뉴 닫기"
            title="메뉴 닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hubs: large type, the current one marked in red */}
        <nav className="tgl-drawer-hubs flex flex-col px-5 sm:px-7 pt-4 pb-3 flex-1 shrink-0 justify-center" aria-label="허브">
          {HUBS.map((hub, i) => {
            const active = currentView === hub.view;
            return (
              <button
                key={hub.view}
                type="button"
                onClick={() => handleMenuNavigate(hub.view)}
                aria-current={active ? 'page' : undefined}
                className="tgl-drawer-item tgl-drawer-hub group flex items-center min-h-12 sm:min-h-14 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                style={{ ['--i' as string]: i }}
              >
                <span className={`font-mono text-xs font-bold w-8 shrink-0 tabular-nums ${active ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`tgl-drawer-hub-label font-['Inter',sans-serif] text-[28px] sm:text-[34px] leading-none font-extrabold uppercase tracking-tight transition-[color,transform] duration-base group-hover:translate-x-1 ${
                  active ? 'text-black dark:text-white' : 'text-black/75 dark:text-white/75 group-hover:text-black dark:group-hover:text-white'
                }`}>
                  {hub.label}
                </span>
                {active && <span className="ml-3 w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500" aria-hidden />}
              </button>
            );
          })}
        </nav>

        {/* Utilities: intro, screen mode, admin settings */}
        <div className="px-5 sm:px-7 border-t border-black/10 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => { setShowSettings(false); openIntro(); }}
            onPointerEnter={prefetchIntro}
            onTouchStart={prefetchIntro}
            onFocus={prefetchIntro}
            className="tgl-drawer-item w-full h-14 flex items-center gap-3 text-left border-b border-black/10 dark:border-white/10 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            style={{ ['--i' as string]: 6 }}
          >
            <span className="w-8 h-8 shrink-0 rounded-full bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark grid place-items-center transition-colors group-hover:bg-red-600 dark:group-hover:bg-red-500 dark:group-hover:text-white">
              <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
            </span>
            <span className="flex-1 text-sm font-bold">소개 영상</span>
            <span className="font-mono text-micro text-black/60 dark:text-white/60 tabular-nums">0:49</span>
          </button>

          {isLoggedIn && ([
            { label: '예약 지갑', icon: Wallet, onClick: openBookingWallet, i: 7 },
            { label: '공항 터미널', icon: Ticket, onClick: openDepartureBoard, i: 8 },
            // v1.3.6 4-d: account, display, slideshow, storage and trash for every member
            ...(openSettingModal ? [{ label: '설정', icon: Settings, onClick: openSettingModal, i: 8 }] : []),
          ]).map(row => {
            const Icon = row.icon;
            return (
              <button
                key={row.label}
                type="button"
                onClick={() => { setShowSettings(false); row.onClick(); }}
                className="tgl-drawer-item w-full h-14 flex items-center gap-3 text-left border-b border-black/10 dark:border-white/10 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                style={{ ['--i' as string]: row.i }}
              >
                <span className="w-8 h-8 shrink-0 rounded-full bg-black/[0.06] dark:bg-white/10 grid place-items-center transition-colors group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 text-sm font-bold">{row.label}</span>
              </button>
            );
          })}

          <div
            className="tgl-drawer-item py-3 border-b border-black/10 dark:border-white/10"
            style={{ ['--i' as string]: 9 }}
            title="나이트 모드 전환 (단축키: ⌘+Shift+L / Ctrl+Shift+L)"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">화면 모드</span>
              <span className="hidden sm:inline font-mono text-micro text-black/60 dark:text-white/60">⌘⇧L</span>
            </div>
            <Segment
              block
              ariaLabel="화면 모드"
              value={nightModeSetting}
              onChange={(id) => {
                if (setNightModeSetting) setNightModeSetting(id);
                if (id === 'light') setIsDarkMode(false);
                else if (id === 'dark') setIsDarkMode(true);
                else if (!setNightModeSetting) setIsDarkMode(!isDarkMode);
              }}
              options={[
                { value: 'auto', label: '자동', icon: Clock },
                { value: 'light', label: '라이트', icon: Sun },
                { value: 'dark', label: '다크', icon: Moon },
              ]}
            />
          </div>

          {isLoggedIn && isAdmin && (
            <button
              type="button"
              onClick={() => handleMenuNavigate(currentView === 'manage' ? 'home' : 'manage')}
              aria-current={currentView === 'manage' ? 'page' : undefined}
              className="tgl-drawer-item w-full h-14 flex items-center gap-3 text-left border-b border-black/10 dark:border-white/10 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              style={{ ['--i' as string]: 10 }}
            >
              <span className="w-8 h-8 shrink-0 rounded-full border border-black/20 dark:border-white/20 grid place-items-center">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </span>
              <span className={`flex-1 text-sm font-bold ${currentView === 'manage' ? 'text-red-600 dark:text-red-400' : ''}`}>운영</span>
              <span className="font-mono text-micro tracking-widest px-1.5 py-0.5 border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60">ADMIN</span>
            </button>
          )}
        </div>

        {/* Account */}
        <div className="px-5 sm:px-7 py-4 shrink-0 tgl-drawer-item" style={{ ['--i' as string]: 11 }}>
          {isLoggedIn ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { setShowSettings(false); setIsPasswordVerifyOpen(true); }}
                className="min-h-11 flex items-center gap-2.5 text-left cursor-pointer group min-w-0"
                title="내 프로필 수정 (암호 확인 후 진입)"
              >
                <UserProfileAvatar profile={currentUserProfile} size="sm" fallbackName={displayName} />
                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{shownName}</span>
                  <span className="text-meta text-black/60 dark:text-white/60">프로필 수정</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-outline-danger btn-lg shrink-0 inline-flex"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setShowSettings(false); openAuthModal('login'); }}
                className="btn btn-primary btn-lg"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setShowSettings(false); openAuthModal('signup'); }}
                className="btn btn-secondary btn-lg"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
      </>, document.body)}

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
