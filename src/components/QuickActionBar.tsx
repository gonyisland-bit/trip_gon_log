import React, { useEffect, useRef, useState } from 'react';

// Quick action bar (v1.3): three shortcuts that cut across hubs.
//  - 킵하기: open the pocket scrap sheet (from any hub)
//  - 새 여정: open the Trip Guide
//  - 여행지 뽑기: open the Departure Board
// It slides away while scrolling down and returns when scrolling up.

export const OPEN_DEPARTURE_EVENT = 'tgl:open-departure';
export const POCKET_OPEN_SCRAP_EVENT = 'tgl:pocket-open-scrap';
export const POCKET_OPEN_SCRAP_FLAG = 'pocket_open_scrap';

export function openDepartureBoard() {
  window.dispatchEvent(new Event(OPEN_DEPARTURE_EVENT));
}

interface QuickActionBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onNewTrip: () => void;
}

export function QuickActionBar({ currentView, onNavigate, onNewTrip }: QuickActionBarProps) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 6) return;
      setHidden(y > lastY.current && y > 120);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const keep = () => {
    if (currentView === 'pocket') {
      window.dispatchEvent(new Event(POCKET_OPEN_SCRAP_EVENT));
      return;
    }
    try { sessionStorage.setItem(POCKET_OPEN_SCRAP_FLAG, '1'); } catch {}
    onNavigate('pocket');
  };

  const item = 'tgl-press tgl-sweep h-10 px-3.5 sm:px-4 text-[13px] font-bold tracking-tight whitespace-nowrap cursor-pointer transition-colors';

  return (
    <nav
      aria-label="빠른 실행"
      className={`fixed left-1/2 bottom-5 z-40 -translate-x-1/2 flex items-center bg-black/90 dark:bg-white/95 text-white dark:text-black backdrop-blur-md rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.25)] px-1.5 transition-[transform,opacity] duration-emph ease-emphasized ${
        hidden ? 'translate-y-[140%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button type="button" onClick={keep} className={item}>킵하기</button>
      <span aria-hidden className="w-px h-4 bg-white/25 dark:bg-black/20" />
      <button type="button" onClick={onNewTrip} className={item}>새 여정</button>
      <span aria-hidden className="w-px h-4 bg-white/25 dark:bg-black/20" />
      <button type="button" onClick={openDepartureBoard} className={`${item} text-red-400 dark:text-red-600`}>여행지 뽑기</button>
    </nav>
  );
}
