import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, BookOpen, Bookmark, CalendarDays, CornerDownLeft, Home, Map as MapIcon, MapPin, Moon, Plane, PlayCircle, Search, Shuffle, Ticket, Wallet,
} from 'lucide-react';
import { Trip, Plan, SpotPocketItem } from '../types';
import { getSavedPockets } from '../utils/pocketStorage';
import { Sheet } from './Sheet';
import { openIntro } from '../intro/openIntro';
import { readRecentJourneys } from '../utils/recentJourneys';
import { shortcutMod } from '../utils/shortcut';

// Command palette (v1.3 P5): Cmd/Ctrl+K. Jump to a journey or a pocket place,
// or run an app command, from the keyboard alone. The last row hands the
// query to the full search, which also looks inside timelines and bookings.


type Group = '최근 여정' | '명령' | '여정' | '포켓';
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
      cmd('departure', '공항 터미널', 'airport terminal departure board spin ticket 랜덤 여행지 뽑기', Ticket, onOpenDeparture),
      cmd('wallet', '예약 지갑', 'wallet booking flight stay 항공 숙소 교통 예약', Wallet, onOpenWallet),
      cmd('keep', '장소 담기', 'pocket save place scrap 포켓 스크랩', Bookmark, onKeepPlace),
      cmd('intro', '소개 영상 보기', 'intro video 인트로 소개 영상 tour', PlayCircle, openIntro),
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

  // With no query: the three journeys opened last (or the nearest), then the commands.
  // With one: the best 30 matches, grouped
  const [recentIds] = useState(readRecentJourneys);
  const results = useMemo(() => {
    if (!query.trim()) {
      const journeys = entries.filter(e => e.group === '여정');
      const byId = new Map(journeys.map(j => [j.id, j]));
      const recent = recentIds.map(id => byId.get(`trip-${id}`)).filter((e): e is Entry => !!e);
      const firstThree = (recent.length ? recent : journeys).slice(0, 3).map(e => ({ ...e, group: '최근 여정' as const }));
      return [...firstThree, ...entries.filter(e => e.group === '명령' && !e.id.startsWith('remix-'))];
    }
    const order: Group[] = ['명령', '여정', '포켓'];
    // Remix rows only when asked for by name, so a journey name + Enter opens the journey
    const wantsRemix = /remix|리믹스/i.test(query);
    return entries
      .filter(e => wantsRemix || !e.id.startsWith('remix-'))
      .map(e => ({ e, s: score(query, e.keywords) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .sort((a, b) => order.indexOf(a.e.group) - order.indexOf(b.e.group) || b.s - a.s)
      .map(x => x.e);
  }, [entries, query, recentIds]);

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
    // / on an empty box: the full search, which also looks inside timelines and bookings
    else if (ev.key === '/' && !query) { ev.preventDefault(); onClose(); onFullSearch(''); }
  };

  let lastGroup: Group | null = null;

  return (
    <Sheet onClose={onClose} label="한번에 찾기" placement="top" zIndex={200} panelClassName="max-w-xl max-h-[55dvh] sm:max-h-[70vh]">
      <div onKeyDown={onKeyDown} className="flex flex-col min-h-0">
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
            className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-black/50 dark:placeholder:text-white/50"
          />
          <kbd className="shrink-0 hidden sm:inline-flex h-6 px-2 items-center rounded-full bg-black/[0.05] dark:bg-white/10 font-mono text-micro font-bold text-black/55 dark:text-white/55">Esc</kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="min-h-0 overflow-y-auto overscroll-contain py-1 max-h-[calc(55dvh-3.5rem)] sm:max-h-[calc(70vh-6rem)]">
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
                  className={`mx-1.5 px-3 h-11 rounded-full flex items-center gap-3 cursor-pointer ${on ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' : ''} ${e.id === 'full-search' ? 'mt-1' : ''}`}
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
        <div className="hidden sm:flex items-center gap-3 px-4 h-10 border-t border-black/[0.06] dark:border-white/[0.08] font-mono text-micro text-black/50 dark:text-white/50 shrink-0">
          <span>↑↓ 이동</span><span>Enter 열기</span><span>/ 전체 검색</span><span>Esc 닫기</span>
          <span className="ml-auto">{shortcutMod}K</span>
        </div>
      </div>
    </Sheet>
  );
}
