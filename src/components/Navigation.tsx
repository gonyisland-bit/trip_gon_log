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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!showSettings) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettings, setShowSettings]);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-3 md:px-6 py-2 md:py-2.5 bg-[#F9F8F6]/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-black/15 dark:border-white/15 transition-colors duration-300 w-full select-none">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div 
          className="text-base sm:text-xl md:text-2xl font-black tracking-tighter cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => navigateTo('home')}
        >
          Tripgon log
        </div>
        <button 
          onClick={onSearchClick}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white cursor-pointer"
          title="Search"
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-5 text-[10px] md:text-xs font-bold tracking-wider uppercase relative">
        <div className="hidden md:flex items-center gap-5">
          <button onClick={() => navigateTo('home')} className={`hover:opacity-60 transition-opacity pb-0.5 cursor-pointer ${currentView === 'home' ? 'font-black border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/60 dark:text-white/60'}`}>Home</button>
          <button onClick={() => navigateTo('archive')} className={`hover:opacity-60 transition-opacity pb-0.5 cursor-pointer ${currentView === 'archive' ? 'font-black border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/60 dark:text-white/60'}`}>Archive</button>
          <button onClick={() => navigateTo('plan')} className={`hover:opacity-60 transition-opacity pb-0.5 cursor-pointer ${currentView === 'plan' ? 'font-black border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-black/60 dark:text-white/60'}`}>Plan</button>
        </div>
        
        {/* Standalone Logout / Login Icon Button */}
        {isLoggedIn ? (
          <button 
            onClick={async () => {
              if (confirm("로그아웃 하시겠습니까?")) {
                await signOut(auth);
              }
            }} 
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded text-black/70 hover:text-red-600 dark:text-white/70 dark:hover:text-red-400 cursor-pointer flex items-center gap-1"
            title="로그아웃"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline text-[9px] font-bold">LOGOUT</span>
          </button>
        ) : (
          <button 
            onClick={() => openAuthModal('login')} 
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white cursor-pointer flex items-center gap-1"
            title="로그인"
            aria-label="Log in"
          >
            <User className="w-4 h-4" />
            <span className="hidden lg:inline text-[9px] font-bold">LOGIN</span>
          </button>
        )}

        {/* Settings & App Menu (Hamburger Button) */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer border ${
              showSettings 
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' 
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-black dark:text-white border-black/10 dark:border-white/10'
            }`}
            title="전체 메뉴"
            aria-label="Toggle menu"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {isLoggedIn && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white dark:ring-black"></span>}
            </div>
          </button>
          
          {/* App-like Full Button Selection Menu Dropdown */}
          {showSettings && (
            <div className="absolute top-full right-0 mt-2 w-64 sm:w-72 bg-[#F9F8F6]/98 dark:bg-[#161616]/98 backdrop-blur-xl border border-black/15 dark:border-white/15 shadow-2xl rounded-2xl p-3 flex flex-col gap-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Profile Header if Logged In */}
              {isLoggedIn && (
                <div className="px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-black/50 dark:text-white/50 uppercase tracking-widest font-bold">ACCOUNT</span>
                  <strong className="text-black dark:text-white font-bold truncate max-w-[140px]">{displayName}</strong>
                </div>
              )}

              {/* Navigation Full Cards */}
              <button 
                onClick={() => { navigateTo('home'); setShowSettings(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                  currentView === 'home'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-black shadow-md'
                    : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-black dark:text-white font-bold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs uppercase tracking-wider">Home</span>
                </div>
                <span className="text-[9px] opacity-60 font-mono">01</span>
              </button>

              <button 
                onClick={() => { navigateTo('archive'); setShowSettings(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                  currentView === 'archive'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-black shadow-md'
                    : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-black dark:text-white font-bold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArchiveIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs uppercase tracking-wider">Archive</span>
                </div>
                <span className="text-[9px] opacity-60 font-mono">02</span>
              </button>

              <button 
                onClick={() => { navigateTo('plan'); setShowSettings(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${
                  currentView === 'plan'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-black shadow-md'
                    : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-black dark:text-white font-bold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs uppercase tracking-wider">Plan</span>
                </div>
                <span className="text-[9px] opacity-60 font-mono">03</span>
              </button>

              {/* Setting Button (if logged in) */}
              {isLoggedIn && (
                <button 
                  onClick={() => { 
                    setShowSettings(false); 
                    openSettingModal(); 
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-black dark:text-white font-bold transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Setting</span>
                  </div>
                  <span className="text-[9px] opacity-60 font-mono">SYS</span>
                </button>
              )}

              {/* Night Mode Toggle Card */}
              <button 
                onClick={() => { setIsDarkMode(!isDarkMode); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-black dark:text-white font-bold transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
                  <span className="text-xs uppercase tracking-wider">Night Mode</span>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-black ${
                  isDarkMode ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300' : 'bg-black/10 text-black/70'
                }`}>
                  {isDarkMode ? 'DARK' : 'LIGHT'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
