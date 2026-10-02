import { useEffect } from 'react';
import { Bookmark, CalendarDays, Luggage, Map as MapIcon, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { preloadCalendarPage, preloadDeparture, preloadMapPage, preloadPocketPage } from '../utils/prefetchHelper';

// Phone tab bar (v1.3.5, spec 4.12): one floating ink pill for moving around on phones.
// Trips · Map · Terminal (red, the middle) · Calendar · Pocket; home is the logo. Each one opens a bottom drawer
// (components/DrawerHost) and the same button again closes it, back to home. Always visible; steps aside for
// overlays like the other floating chrome (html[data-overlay] / [data-peek], see index.css).
// While it is up, html[data-tabbar] lifts TOP, the intro tip and pocket's selection bar above it.

interface TabBarProps {
  currentView: string;
  /** The airport terminal drawer is open */
  terminalOpen: boolean;
  onNavigate: (view: string) => void;
  onTerminal: () => void;
}

// Pulls a drawer's chunk in as the finger lands, so it is ready by the time the tap completes
function warm(view: string) {
  if (view === 'pocket') preloadPocketPage().catch(() => {});
  else if (view === 'map') preloadMapPage().catch(() => {});
  else if (view === 'calendar') preloadCalendarPage().catch(() => {});
}

const TABS: { view: string; label: string; icon: LucideIcon }[] = [
  { view: 'archive', label: 'Trips', icon: Luggage },
  { view: 'map', label: 'Map', icon: MapIcon },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'pocket', label: 'Pocket', icon: Bookmark },
];

function Tab({ view, label, icon: Icon, active, onNavigate }: { view: string; label: string; icon: LucideIcon; active: boolean; onNavigate: (view: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(view)}
      onPointerDown={() => warm(view)}
      aria-current={active ? 'page' : undefined}
      className={`tgl-press h-12 my-auto flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 ${
        active ? 'text-surface dark:text-paper-dark bg-surface/[0.12] dark:bg-paper-dark/[0.12]' : 'text-surface/55 dark:text-paper-dark/55 hover:text-surface dark:hover:text-paper-dark'
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
      <span className="font-mono text-micro uppercase tracking-wider leading-none">{label}</span>
    </button>
  );
}

export function TabBar({ currentView, terminalOpen, onNavigate, onTerminal }: TabBarProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-tabbar', '');
    return () => root.removeAttribute('data-tabbar');
  }, []);

  const [trips, map, calendar, pocket] = TABS;
  return (
    <nav
      aria-label="주요 이동"
      className="tgl-tabbar md:hidden fixed inset-x-3 z-float h-16 grid grid-cols-5 items-center px-1 rounded-full bg-ink dark:bg-ink-dark shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-opacity duration-base"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <Tab {...trips} active={!terminalOpen && (currentView === trips.view || currentView === 'detail')} onNavigate={onNavigate} />
      <Tab {...map} active={!terminalOpen && currentView === map.view} onNavigate={onNavigate} />
      <button
        type="button"
        onClick={onTerminal}
        onPointerDown={() => { preloadDeparture().catch(() => {}); }}
        aria-label="공항 터미널"
        aria-pressed={terminalOpen}
        title="공항 터미널"
        className={`tgl-press justify-self-center w-12 h-12 rounded-full grid place-items-center bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-[background-color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:ring-red-400 ${terminalOpen ? 'ring-2 ring-offset-2 ring-offset-ink ring-white/80' : ''}`}
      >
        <Ticket className="w-6 h-6" strokeWidth={2.2} aria-hidden />
      </button>
      <Tab {...calendar} active={!terminalOpen && currentView === calendar.view} onNavigate={onNavigate} />
      <Tab {...pocket} active={!terminalOpen && currentView === pocket.view} onNavigate={onNavigate} />
    </nav>
  );
}
