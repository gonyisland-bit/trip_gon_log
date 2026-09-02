import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, User, Sun, Moon, Settings, Search, Home, Archive as ArchiveIcon, Compass, X } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface NavigationProps {
  currentView: string;
  navigateTo: (view: string, tripId?: number | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  openAuthModal: (mode: 'login' | 'signup') => void;
  openSettingModal: () => void;
  onSearchClick: () => void;
}

export function Navigation({
  currentView,
  navigateTo,
  isLoggedIn,
  setIsLoggedIn,
  isDarkMode,
  setIsDarkMode,
  showSettings,
  setShowSettings,
  openAuthModal,
  openSettingModal,
  onSearchClick,
}: NavigationProps) {
  const currentUser = auth.currentUser;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0].toUpperCase() || 'USER';
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setShowSettings(false);
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await signOut(auth);
    }
  };

  const handleMenuNavigate = (view: string) => {
    setShowSettings(false);
    navigateTo(view);
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

  return (
    <nav className="sticky top-0 z-40 w-full bg-white dark:bg-[#0A0A0A] border-b border-black/10 dark:border-white/10 transition-colors duration-300 select-none">
      <div className="w-full px-5 sm:px-8 md:px-12 lg:px-16 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-6 md:gap-10 min-w-0">
          <button 
            onClick={() => navigateTo('home')} 
            className="flex flex-col text-left cursor-pointer group shrink-0"
          >
            <span className="font-black text-lg sm:text-xl md:text-2xl tracking-tight font-['Inter',sans-serif] leading-tight text-black dark:text-white group-hover:opacity-80 transition-opacity">
              Tripgon log
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase leading-none mt-0.5">
              TRAVEL MEMOIR
            </span>
          </button>

          {/* Desktop Nav Links (HOME / ARCHIVE / PLAN in Inter Font, Uppercase, Larger) */}
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
              ARCHIVE
            </button>
            <button 
              onClick={() => navigateTo('plan')} 
              className={`text-xs md:text-sm font-black tracking-widest uppercase transition-colors cursor-pointer py-1 ${
                currentView === 'plan' 
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white' 
                  : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
              }`}
            >
              PLAN
            </button>
          </div>
        </div>

        {/* Right: Action Icons (Search, Edit, Night Mode, LogIn/Out) & Mobile Hamburger */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0" ref={dropdownRef}>
          {/* Search Button */}
          <button 
            type="button"
            onClick={onSearchClick}
            className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            title="통합 검색"
          >
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Edit (구 Setting) Button - Desktop Only */}
          {isLoggedIn && (
            <button
              type="button"
              onClick={openSettingModal}
              className="hidden md:flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer items-center justify-center"
              title="편집 및 설정 (Edit / Setting)"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}

          {/* Night Mode Button - Desktop Only */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="hidden md:flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer items-center justify-center"
            title={isDarkMode ? "라이트 모드로 전환" : "나이트 모드로 전환"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-500" />
            )}
          </button>

          {/* Log In / Out Button - Desktop Only */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 hover:text-red-600 dark:text-white/70 dark:hover:text-red-400 transition-colors cursor-pointer items-center justify-center"
              title="로그아웃 (Sign Out)"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="hidden md:flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer items-center justify-center"
              title="로그인 (Sign In)"
            >
              <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`md:hidden p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer ${
              showSettings 
                ? 'bg-black text-white dark:bg-white dark:text-black' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            }`}
            title="메뉴 열기"
          >
            <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* Editorial Typography Hamburger Menu (Attached Reference Image Style, 100% Solid Opaque) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-[#111111] flex flex-col justify-between p-8 sm:p-12 md:hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-5">
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight font-['Inter',sans-serif] text-black dark:text-white">
                Tripgon log
              </span>
              <span className="text-[9px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase">
                INDEX MENU
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors cursor-pointer"
              title="메뉴 닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Editorial Menu List */}
          <div className="flex flex-col space-y-6 sm:space-y-8 my-auto py-8">
            <button
              onClick={() => handleMenuNavigate('home')}
              className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-2"
            >
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mr-4 sm:mr-6 select-none">
                01
              </span>
              <span className={`font-['Inter',sans-serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight transition-colors ${
                currentView === 'home' 
                  ? 'text-black dark:text-white underline decoration-2 underline-offset-8' 
                  : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
              }`}>
                HOME
              </span>
            </button>

            <button
              onClick={() => handleMenuNavigate('archive')}
              className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-2"
            >
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mr-4 sm:mr-6 select-none">
                02
              </span>
              <span className={`font-['Inter',sans-serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight transition-colors ${
                currentView === 'archive' 
                  ? 'text-black dark:text-white underline decoration-2 underline-offset-8' 
                  : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
              }`}>
                ARCHIVE
              </span>
            </button>

            <button
              onClick={() => handleMenuNavigate('plan')}
              className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-2"
            >
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mr-4 sm:mr-6 select-none">
                03
              </span>
              <span className={`font-['Inter',sans-serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight transition-colors ${
                currentView === 'plan' 
                  ? 'text-black dark:text-white underline decoration-2 underline-offset-8' 
                  : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'
              }`}>
                PLAN
              </span>
            </button>

            {isLoggedIn && (
              <button
                onClick={() => { setShowSettings(false); openSettingModal(); }}
                className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-2"
              >
                <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mr-4 sm:mr-6 select-none">
                  04
                </span>
                <span className="font-['Inter',sans-serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white transition-colors">
                  EDIT
                </span>
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-baseline group cursor-pointer text-left transition-transform duration-200 hover:translate-x-2"
            >
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mr-4 sm:mr-6 select-none">
                {isLoggedIn ? '05' : '04'}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-['Inter',sans-serif] text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white transition-colors">
                  NIGHT MODE
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/15 text-black dark:text-white uppercase">
                  {isDarkMode ? 'ON' : 'OFF'}
                </span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-mono">
            {isLoggedIn ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">{displayName}</span>
                </div>
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
      )}
    </nav>
  );
}
