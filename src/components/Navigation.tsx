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
          
          {/* App Menu: Mobile Full-Screen Overlay + Desktop Popover */}
          {showSettings && (
            <>
              {/* 1. Mobile Fullscreen App Menu (100% Opaque, No Transparency Bug) */}
              <div className="fixed inset-0 z-[100] bg-[#F9F8F6] dark:bg-[#111111] flex flex-col justify-between p-5 sm:p-6 md:hidden animate-in fade-in duration-200">
                {/* Top Header with title & big close button */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-black tracking-tighter">Tripgon log</div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">MENU</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-black dark:text-white transition-all cursor-pointer"
                    title="메뉴 닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Main Cards List */}
                <div className="flex flex-col gap-2.5 my-auto py-4 overflow-y-auto">
                  <button 
                    onClick={() => { navigateTo('home'); setShowSettings(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left border ${
                      currentView === 'home'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg'
                        : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider">Home</div>
                        <div className="text-[10px] opacity-60">홈 매거진 및 추천 여정</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-40 font-mono font-bold">01</span>
                  </button>

                  <button 
                    onClick={() => { navigateTo('archive'); setShowSettings(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left border ${
                      currentView === 'archive'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg'
                        : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <ArchiveIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider">Archive</div>
                        <div className="text-[10px] opacity-60">모든 여행 아카이브 모아보기</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-40 font-mono font-bold">02</span>
                  </button>

                  <button 
                    onClick={() => { navigateTo('plan'); setShowSettings(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left border ${
                      currentView === 'plan'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg'
                        : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider">Plan</div>
                        <div className="text-[10px] opacity-60">다가오는 여행 계획 작성</div>
                      </div>
                    </div>
                    <span className="text-xs opacity-40 font-mono font-bold">03</span>
                  </button>

                  {isLoggedIn && (
                    <button 
                      onClick={() => { 
                        setShowSettings(false); 
                        openSettingModal(); 
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 transition-all cursor-pointer text-left shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black uppercase tracking-wider">Setting</div>
                          <div className="text-[10px] opacity-60">환경설정 및 데이터 관리</div>
                        </div>
                      </div>
                      <span className="text-xs opacity-40 font-mono font-bold">SYS</span>
                    </button>
                  )}

                  {/* Night Mode Card */}
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 transition-all cursor-pointer text-left shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-500">
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider">Night Mode</div>
                        <div className="text-[10px] opacity-60">화면 테마 전환</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-black ${
                      isDarkMode ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300' : 'bg-black/10 text-black/70'
                    }`}>
                      {isDarkMode ? 'DARK' : 'LIGHT'}
                    </span>
                  </button>
                </div>

                {/* Bottom Profile / Auth */}
                <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                  {isLoggedIn ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-black dark:text-white">{displayName}</span>
                      </div>
                      <button
                        onClick={async () => {
                          setShowSettings(false);
                          if (confirm("로그아웃 하시겠습니까?")) {
                            await signOut(auth);
                          }
                        }}
                        className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 p-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>LOGOUT</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => { setShowSettings(false); openAuthModal('login'); }}
                        className="flex-1 py-3 text-center bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        로그인
                      </button>
                      <button
                        onClick={() => { setShowSettings(false); openAuthModal('signup'); }}
                        className="flex-1 py-3 text-center border border-black/20 dark:border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        회원가입
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Desktop Popover Dropdown (md and up, 100% solid background) */}
              <div className="hidden md:flex absolute top-full right-0 mt-2 w-72 bg-[#F9F8F6] dark:bg-[#161616] border border-black/15 dark:border-white/15 shadow-2xl rounded-2xl p-3 flex-col gap-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
