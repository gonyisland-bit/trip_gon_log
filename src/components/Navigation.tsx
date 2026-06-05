import React, { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, User, Sun, Moon, Settings } from 'lucide-react';
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
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 bg-[#F9F8F6]/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-black/20 dark:border-white/20 transition-colors duration-300 w-full">
      <div className="flex items-center">
        <div 
          className="text-lg sm:text-2xl md:text-3xl font-black tracking-tighter cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => navigateTo('home')}
        >
          Tripgon log
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-5 md:space-x-8 text-[10px] md:text-sm font-medium tracking-wide uppercase relative">
        <button onClick={() => navigateTo('home')} className={`hover:opacity-60 transition-opacity ${currentView === 'home' ? 'font-black border-b-2 border-black dark:border-white' : ''}`}>Home</button>
        <button onClick={() => navigateTo('archive')} className={`hover:opacity-60 transition-opacity ${currentView === 'archive' ? 'font-black border-b-2 border-black dark:border-white' : ''}`}>Archive</button>
        <button onClick={() => navigateTo('plan')} className={`hover:opacity-60 transition-opacity ${currentView === 'plan' ? 'font-black border-b-2 border-black dark:border-white' : ''}`}>Plan</button>
        
        {/* Settings & User (Hamburger Menu) */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="hover:opacity-60 transition-opacity flex items-center border-l border-black/20 dark:border-white/20 pl-3 sm:pl-4 md:pl-8 ml-1 sm:ml-2 md:ml-4"
          >
            <div className="relative flex items-center justify-center">
              <Menu className="w-5 h-5 md:w-6 md:h-6 text-black dark:text-white" />
              {isLoggedIn && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#F9F8F6] dark:border-[#111111]"></span>}
            </div>
          </button>
          
          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute top-full right-0 mt-4 w-48 bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 shadow-xl flex flex-col z-50">
              {isLoggedIn && (
                <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  Logged in as <strong className="text-black dark:text-white ml-1">{displayName}</strong>
                </div>
              )}
              {isLoggedIn && (
                <button 
                  onClick={() => { 
                    setShowSettings(false); 
                    openSettingModal(); 
                  }}
                  className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/10 dark:border-white/10 transition-colors text-xs font-bold uppercase tracking-widest w-full text-left text-black dark:text-white"
                >
                  <span>Setting</span>
                  <Settings className="w-4 h-4" />
                </button>
              )}
              {isLoggedIn ? (
                <button 
                  onClick={async () => { 
                    setShowSettings(false); 
                    await signOut(auth);
                  }}
                  className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/10 dark:border-white/10 transition-colors text-xs font-bold uppercase tracking-widest w-full text-left"
                >
                  <span>Log out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => { 
                      setShowSettings(false); 
                      openAuthModal('login');
                    }}
                    className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/10 dark:border-white/10 transition-colors text-xs font-bold uppercase tracking-widest w-full text-left"
                  >
                    <span>Log in</span>
                    <User className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { 
                      setShowSettings(false); 
                      openAuthModal('signup');
                    }}
                    className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/10 dark:border-white/10 transition-colors text-xs font-bold uppercase tracking-widest w-full text-left"
                  >
                    <span>Sign up</span>
                    <User className="w-4 h-4" />
                  </button>
                </>
              )}
              <button 
                onClick={() => { setIsDarkMode(!isDarkMode); setShowSettings(false); }}
                className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <span>Night Mode</span>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
      
    </nav>
  );
}
