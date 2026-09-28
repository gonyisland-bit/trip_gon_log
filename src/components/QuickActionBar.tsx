import React, { useEffect, useRef, useState } from 'react';
import { Ticket } from 'lucide-react';

// Quick action bar (v1.3). One dock, two weights:
//  - 장소 담기 / 여정 만들기: quiet text actions on the dark dock
//  - 여행지 뽑기: the red boarding-ticket button (notched edges, perforation,
//    a light sweep now and then) because it is the one people come back for
// The dock slides away while scrolling down and returns when scrolling up.

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

  const keepPlace = () => {
    if (currentView === 'pocket') {
      window.dispatchEvent(new Event(POCKET_OPEN_SCRAP_EVENT));
      return;
    }
    try { sessionStorage.setItem(POCKET_OPEN_SCRAP_FLAG, '1'); } catch {}
    onNavigate('pocket');
  };

  const quiet = 'tgl-press tgl-sweep h-11 px-3.5 sm:px-4 text-[13px] font-semibold tracking-tight text-white/85 hover:text-white whitespace-nowrap cursor-pointer transition-colors';

  return (
    <nav
      aria-label="빠른 실행"
      className={`fixed left-1/2 bottom-5 z-40 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#0B0B0C]/95 backdrop-blur-md rounded-full border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-[transform,opacity] duration-emph ease-emphasized ${
        hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button type="button" onClick={keepPlace} className={quiet}>장소 담기</button>
      <button type="button" onClick={onNewTrip} className={quiet}>여정 만들기</button>

      {/* Boarding-ticket button */}
      <button
        type="button"
        onClick={openDepartureBoard}
        className="tgl-ticket-btn tgl-press group h-11 flex items-stretch bg-red-600 hover:bg-red-500 text-white rounded-[10px] cursor-pointer transition-colors"
      >
        <span className="tgl-ticket-icon flex items-center pl-4 pr-3">
          <Ticket className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </span>
        <span aria-hidden className="my-2 border-l border-dashed border-white/50" />
        <span className="flex items-center pl-3 pr-4 text-[13px] font-extrabold tracking-tight whitespace-nowrap">여행지 뽑기</span>
      </button>
    </nav>
  );
}
