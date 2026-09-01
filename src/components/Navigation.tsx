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
    <nav className="sticky top-0 z-30 w-full bg-[#F9F8F6] dark:bg-[#111111] border-b border-black/10 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Links */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button 
            onClick={() => navigateTo('home')} 
            className="flex items-center gap-1.5 sm:gap-2 text-left cursor-pointer group shrink-0"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-xs sm:text-sm tracking-tighter rounded-xs group-hover:rotate-6 transition-transform">
              TL
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xs sm:text-sm md:text-base tracking-tighter uppercase font-satoshi leading-tight">
                Tripgon log
              </span>
              <span className="text-[7.5px] sm:text-[8.5px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase leading-none">
                TRAVEL MEMOIR
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 border-l border-black/10 dark:border-white/10 pl-4 sm:pl-6 text-[11px] font-bold uppercase tracking-widest font-mono">
            <button 
              onClick={() => navigateTo('home')} 
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                currentView === 'home' 
                  ? 'bg-black text-white dark:bg-white dark:text-black' 
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => navigateTo('archive')} 
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                currentView === 'archive' 
                  ? 'bg-black text-white dark:bg-white dark:text-black' 
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Archive
            </button>
            <button 
              onClick={() => navigateTo('plan')} 
              className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                currentView === 'plan' 
                  ? 'bg-black text-white dark:bg-white dark:text-black' 
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              Plan
            </button>
          </div>
        </div>

        {/* Right Action Icons & Hamburger Menu */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative" ref={dropdownRef}>
          {/* Global Search Button */}
          <button 
            type="button"
            onClick={onSearchClick}
            className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            title="통합 검색"
          >
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 sm:p-2.5 rounded-full transition-colors cursor-pointer ${
              showSettings 
                ? 'bg-black text-white dark:bg-white dark:text-black' 
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            }`}
            title="메뉴 열기"
          >
            <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* App Menu: 100% Solid Opaque Mobile Overlay & 100% Solid Opaque Desktop Dropdown */}
          {showSettings && (
            <>
              {/* 1. Mobile Fullscreen App Menu (100% Solid Opaque, No Transparency) */}
              <div className="fixed inset-0 z-[100] bg-[#F9F8F6] dark:bg-[#111111] flex flex-col justify-between p-5 sm:p-6 md:hidden animate-in fade-in duration-150">
                {/* Top Header with title & big close button */}
                <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-black tracking-tighter">Tripgon log</div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/10 dark:bg-white/15 font-bold">MENU</span>
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

                {/* Main Cards List (100% Solid Opaque) */}
                <div className="flex flex-col gap-2.5 my-auto py-4 overflow-y-auto">
                  <button 
                    onClick={() => { navigateTo('home'); setShowSettings(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left border ${
                      currentView === 'home'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg'
                        : 'bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-black dark:text-white hover:bg-black/5 shadow-xs'
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
                        : 'bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-black dark:text-white hover:bg-black/5 shadow-xs'
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
                        : 'bg-white dark:bg-[#1e1e1e] border-black/15 dark:border-white/15 text-black dark:text-white hover:bg-black/5 shadow-xs'
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
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-black/15 dark:border-white/15 text-black dark:text-white hover:bg-black/5 transition-all cursor-pointer text-left shadow-xs"
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
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-black/15 dark:border-white/15 text-black dark:text-white hover:bg-black/5 transition-all cursor-pointer text-left shadow-xs"
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
                <div className="pt-4 border-t border-black/15 dark:border-white/15 flex items-center justify-between">
                  {isLoggedIn ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-black dark:text-white">{displayName}</span>
                      </div>
                      <button
                        onClick={handleLogout}
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
                        className="flex-1 py-3 text-center border border-black/20 dark:border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer text-black dark:text-white"
                      >
                        회원가입
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Desktop Dropdown Menu (md and up, 100% Solid Opaque, No Transparency) */}
              <div 
                className="hidden md:block fixed inset-0 z-40" 
                onClick={() => setShowSettings(false)} 
              />
              <div className="hidden md:flex absolute top-full right-0 mt-2.5 w-84 bg-[#F9F8F6] dark:bg-[#181818] border border-black/20 dark:border-white/20 shadow-2xl rounded-2xl p-3.5 flex-col gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Profile Header if Logged In */}
                {isLoggedIn ? (
                  <div className="px-3 py-2 bg-white dark:bg-[#222222] rounded-xl flex items-center justify-between text-[11px] font-mono border border-black/10 dark:border-white/10 mb-0.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-black/60 dark:text-white/60 uppercase tracking-widest font-bold">USER</span>
                    </div>
                    <strong className="text-black dark:text-white font-bold truncate max-w-[160px]">{displayName}</strong>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 text-[10px] font-mono text-black/50 dark:text-white/50 uppercase tracking-widest font-bold">
                    NAVIGATION MENU
                  </div>
                )}

                {/* Navigation Items with 100% Solid Opaque Background & High Visibility */}
                <button 
                  onClick={() => { navigateTo('home'); setShowSettings(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left border ${
                    currentView === 'home'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-black border-transparent shadow-md'
                      : 'bg-white dark:bg-[#222222] hover:bg-black/5 dark:hover:bg-[#2a2a2a] text-black dark:text-white font-bold border-black/10 dark:border-white/10 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-black">Home</div>
                      <div className="text-[10px] opacity-60 font-normal">홈 매거진 및 추천 여정</div>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-40 font-mono font-bold">01</span>
                </button>

                <button 
                  onClick={() => { navigateTo('archive'); setShowSettings(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left border ${
                    currentView === 'archive'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-black border-transparent shadow-md'
                      : 'bg-white dark:bg-[#222222] hover:bg-black/5 dark:hover:bg-[#2a2a2a] text-black dark:text-white font-bold border-black/10 dark:border-white/10 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      <ArchiveIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-black">Archive</div>
                      <div className="text-[10px] opacity-60 font-normal">모든 여행 아카이브 모아보기</div>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-40 font-mono font-bold">02</span>
                </button>

                <button 
                  onClick={() => { navigateTo('plan'); setShowSettings(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left border ${
                    currentView === 'plan'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-black border-transparent shadow-md'
                      : 'bg-white dark:bg-[#222222] hover:bg-black/5 dark:hover:bg-[#2a2a2a] text-black dark:text-white font-bold border-black/10 dark:border-white/10 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-black">Plan</div>
                      <div className="text-[10px] opacity-60 font-normal">다가오는 여행 계획 작성</div>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-40 font-mono font-bold">03</span>
                </button>

                {/* Setting Button (if logged in) */}
                {isLoggedIn && (
                  <button 
                    onClick={() => { 
                      setShowSettings(false); 
                      openSettingModal(); 
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#222222] hover:bg-black/5 dark:hover:bg-[#2a2a2a] text-black dark:text-white font-bold border border-black/10 dark:border-white/10 shadow-2xs transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider font-black">Setting</div>
                        <div className="text-[10px] opacity-60 font-normal">환경설정 및 데이터 관리</div>
                      </div>
                    </div>
                    <span className="text-[10px] opacity-40 font-mono font-bold">SYS</span>
                  </button>
                )}

                {/* Night Mode Toggle Card */}
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#222222] hover:bg-black/5 dark:hover:bg-[#2a2a2a] text-black dark:text-white font-bold border border-black/10 dark:border-white/10 shadow-2xs transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-400/15 text-amber-500">
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-black">Night Mode</div>
                      <div className="text-[10px] opacity-60 font-normal">화면 테마 전환</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                    isDarkMode ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300' : 'bg-black/10 text-black/70'
                  }`}>
                    {isDarkMode ? 'DARK' : 'LIGHT'}
                  </span>
                </button>

                {/* Desktop Menu Footer Auth */}
                <div className="pt-2 mt-1 border-t border-black/15 dark:border-white/15 flex items-center justify-between">
                  {isLoggedIn ? (
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 text-center text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    >
                      로그아웃 (Sign Out)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => { setShowSettings(false); openAuthModal('login'); }}
                        className="flex-1 py-2.5 text-center bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                      >
                        로그인
                      </button>
                      <button
                        onClick={() => { setShowSettings(false); openAuthModal('signup'); }}
                        className="flex-1 py-2.5 text-center border border-black/20 dark:border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer text-black dark:text-white"
                      >
                        회원가입
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
