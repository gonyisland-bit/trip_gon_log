import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, BookOpen, Bookmark, CalendarDays, CornerDownLeft, Home, Map as MapIcon, MapPin, Moon, Plane, Search, Shuffle, Ticket, Wallet,
} from 'lucide-react';
import { Trip, Plan, SpotPocketItem } from '../types';
import { getSavedPockets } from '../utils/pocketStorage';

// Command palette (v1.3 P5): Cmd/Ctrl+K. Jump to a journey or a pocket place,
// or run an app command, from the keyboard alone. The last row hands the
// query to the full search, which also looks inside timelines and bookings.

export const TOGGLE_PALETTE_EVENT = 'tgl:toggle-palette';

type Group = '명령' | '여정' | '포켓';
interface Entry {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

interface CommandPaletteProps {
  trips: Trip[];
  plans: Plan[];
  onClose: () => void;
  onNavigate: (view: string, tripId?: number | null) => void;
  onNewTrip: () => void;
  onOpenDeparture: () => void;
  onOpenWallet: () => void;
  onKeepPlace: () => void;
  onCycleNightMode: () => void;
  onFullSearch: (query: string) => void;
  onRemix?: (tripId: number) => void;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

// Every query character must appear in order; earlier and tighter matches score higher
function score(query: string, text: string): number {
  if (!query) return 1;
  const q = norm(query), t = norm(text);
  const at = t.indexOf(q);
  if (at >= 0) return 100 - Math.min(at, 50);
  let ti = 0, gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 40 - gaps);
}

export function CommandPalette({ trips, plans, onClose, onNavigate, onNewTrip, onOpenDeparture, onOpenWallet, onKeepPlace, onCycleNightMode, onFullSearch, onRemix }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pockets] = useState<SpotPocketItem[]>(() => getSavedPockets());

  const entries = useMemo<Entry[]>(() => {
    const cmd = (id: string, label: string, keywords: string, icon: Entry['icon'], run: () => void, hint?: string): Entry =>
      ({ id: `cmd-${id}`, group: '명령', label, keywords: `${label} ${keywords}`, icon, run, hint });
    const commands: Entry[] = [
      cmd('new', '새 여정 만들기', 'new trip create 신규', Plane, onNewTrip),
      cmd('departure', '여행지 뽑기', 'departure board spin ticket 랜덤', Ticket, onOpenDeparture),
      cmd('wallet', '예약 지갑', 'wallet booking flight stay 항공 숙소 교통 예약', Wallet, onOpenWallet),
      cmd('keep', '장소 담기', 'pocket save place scrap 포켓 스크랩', Bookmark, onKeepPlace),
      cmd('night', '야간 모드 전환', 'dark light night theme 다크 라이트', Moon, onCycleNightMode, 'Ctrl+Shift+L'),
      cmd('home', '홈', 'home', Home, () => onNavigate('home')),
      cmd('archive', '아카이브', 'archive journeys trips 여정', Archive, () => onNavigate('archive')),
      cmd('magazine', '매거진', 'magazine stories', BookOpen, () => onNavigate('magazine')),
      cmd('map', '지도', 'map world', MapIcon, () => onNavigate('map')),
      cmd('calendar', '캘린더', 'calendar schedule 일정', CalendarDays, () => onNavigate('calendar')),
      cmd('pocket', '포켓', 'pocket places', Bookmark, () => onNavigate('pocket')),
    ];
    const seen = new Set<number>();
    const journeys: Entry[] = [...plans, ...trips]
      .filter(t => !t.deletedAt && !seen.has(t.id) && seen.add(t.id))
      .map(t => ({
        id: `trip-${t.id}`, group: '여정' as const, label: t.title,
        hint: [t.date, (t.locationStr || '').split(',')[0]].filter(Boolean).join(' · '),
        keywords: [t.title, t.locationStr, t.country, t.date, ...(t.tags || [])].filter(Boolean).join(' '),
        icon: Plane, run: () => onNavigate('detail', t.id),
      }));
    // "remix" + a journey name offers a Remix of that journey
    const remixes: Entry[] = onRemix ? journeys.map(j => {
      const id = Number(j.id.slice(5));
      return { ...j, id: `remix-${id}`, group: '명령' as const, label: `${j.label} Remix`, keywords: `remix 리믹스 ${j.keywords}`, icon: Shuffle, run: () => onRemix(id) };
    }) : [];
    const places: Entry[] = pockets.map(p => ({
      id: `pocket-${p.id}`, group: '포켓' as const, label: p.title,
      hint: [p.city, p.country].filter(Boolean).join(' · '),
      keywords: [p.title, p.city, p.country, p.address, p.memo, ...(p.tags || [])].filter(Boolean).join(' '),
      icon: MapPin, run: () => onNavigate('pocket'),
    }));
    return [...commands, ...journeys, ...places, ...remixes];
  }, [trips, plans, pockets, onNavigate, onNewTrip, onOpenDeparture, onOpenWallet, onKeepPlace, onCycleNightMode, onRemix]);

  // With no query: commands and the five nearest journeys. With one: the best 30 matches, grouped
  const results = useMemo(() => {
    if (!query.trim()) return [...entries.filter(e => e.group === '명령' && !e.id.startsWith('remix-')), ...entries.filter(e => e.group === '여정').slice(0, 5)];
    const order: Group[] = ['명령', '여정', '포켓'];
    return entries
      .map(e => ({ e, s: score(query, e.keywords) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .sort((a, b) => order.indexOf(a.e.group) - order.indexOf(b.e.group) || b.s - a.s)
      .map(x => x.e);
  }, [entries, query]);

  const fullSearch: Entry | null = query.trim()
    ? { id: 'full-search', group: '명령', label: `"${query.trim()}" 전체 검색`, hint: '타임라인 · 예약까지', keywords: '', icon: Search, run: () => onFullSearch(query.trim()) }
    : null;
  const rows = fullSearch ? [...results, fullSearch] : results;

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (e: Entry | undefined) => {
    if (!e) return;
    onClose();
    e.run();
  };

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive(i => (i + 1) % Math.max(1, rows.length)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive(i => (i - 1 + rows.length) % Math.max(1, rows.length)); }
    else if (ev.key === 'Enter') { ev.preventDefault(); choose(rows[active]); }
    else if (ev.key === 'Escape') { ev.preventDefault(); onClose(); }
  };

  let lastGroup: Group | null = null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="명령 팔레트"
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="tgl-rise w-full max-w-xl bg-white dark:bg-[#161616] text-black dark:text-white border border-black/20 dark:border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.3)] flex flex-col max-h-[70vh]"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-black/15 dark:border-white/15">
          <Search className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
          <input
            ref={inputRef}
            id="command-palette-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="여정, 장소, 명령"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={rows[active] ? `cp-${rows[active].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-black/40 dark:placeholder:text-white/40"
          />
          <kbd className="shrink-0 font-mono text-micro px-1.5 py-0.5 border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60">ESC</kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="overflow-y-auto overscroll-contain py-1">
          {rows.length === 0 && <p className="px-4 py-8 text-sm text-center text-black/60 dark:text-white/60">결과가 없습니다.</p>}
          {rows.map((e, i) => {
            const header = e.id !== 'full-search' && e.group !== lastGroup ? e.group : null;
            if (e.id !== 'full-search') lastGroup = e.group;
            const Icon = e.icon;
            const on = i === active;
            return (
              <React.Fragment key={e.id}>
                {header && <div className="px-4 pt-3 pb-1 font-mono text-micro font-bold uppercase tracking-widest text-black/50 dark:text-white/50">{header}</div>}
                <div
                  id={`cp-${e.id}`}
                  role="option"
                  aria-selected={on}
                  data-index={i}
                  onMouseMove={() => !on && setActive(i)}
                  onClick={() => choose(e)}
                  className={`mx-1 px-3 h-11 flex items-center gap-3 cursor-pointer ${on ? 'bg-black text-white dark:bg-white dark:text-black' : ''} ${e.id === 'full-search' ? 'mt-1 border-t border-black/10 dark:border-white/10' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${on ? '' : 'text-black/60 dark:text-white/60'}`} />
                  <span className="text-sm font-semibold truncate">{e.label}</span>
                  {e.hint && <span className={`ml-auto pl-3 shrink-0 max-w-[45%] truncate font-mono text-micro ${on ? 'opacity-70' : 'text-black/55 dark:text-white/55'}`}>{e.hint}</span>}
                  {on && !e.hint && <CornerDownLeft className="ml-auto w-3.5 h-3.5 opacity-70" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
