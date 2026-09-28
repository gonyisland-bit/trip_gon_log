import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Plane, Ticket } from 'lucide-react';

// Quick action bar (v1.3): a small dock of three icons. The label shows on
// hover or keyboard focus; the ticket stays red because it is the one people
// come back for. The dock slides away while scrolling down.

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

function DockButton({ label, onClick, accent, children }: { label: string; onClick: () => void; accent?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`tgl-press group relative w-9 h-9 rounded-full grid place-items-center cursor-pointer transition-colors ${
        accent ? 'bg-red-600 text-white hover:bg-red-500' : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
      {/* Label on hover / focus */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-black text-white text-meta font-semibold opacity-0 translate-y-1 transition-[opacity,transform] duration-base ease-emphasized group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
      >
        {label}
      </span>
    </button>
  );
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

  return (
    <nav
      aria-label="빠른 실행"
      className={`fixed left-1/2 bottom-5 z-40 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#0B0B0C]/90 backdrop-blur-md rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-[transform,opacity] duration-emph ease-emphasized ${
        hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <DockButton label="포켓" onClick={keepPlace}><Bookmark className="w-4 h-4" /></DockButton>
      <DockButton label="신규여행" onClick={onNewTrip}><Plane className="w-4 h-4" /></DockButton>
      <DockButton label="여행지뽑기" onClick={openDepartureBoard} accent><Ticket className="w-4 h-4" /></DockButton>
    </nav>
  );
}
