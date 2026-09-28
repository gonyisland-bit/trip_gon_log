import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Ticket, Volume2, VolumeX, X } from 'lucide-react';
import { getSavedPockets } from '../../utils/pocketStorage';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { LobbyScene } from './LobbyScene';
import { resolveWeatherEffectType } from '../WeatherEffectLayer';
import { precipitationIntensity } from '../weather/WeatherParticleCanvas';
import type { DestinationCity } from '../../data/worldDestinations';
import { confirmDialog, notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { useBackToClose } from '../../utils/overlayHistory';
import {
  DepartureFilters, DepartureTicket, FLIGHT_OPTIONS, candidates, dailyPick, defaultFilters, flightHours, flightNumber,
  formatHours, gateFor, isBestSeason, loadTickets, makeTicket, readCachedTickets, saveTickets, selectableMonths, targetMonth, todayKey,
} from './departureData';

// Departure Board (v1.3): a split-flap airport board that picks the next trip.
// Filters narrow the pool, SPIN rolls the letters to a destination, and a result
// can open the Trip Guide or be kept as a ticket. One free "today's ticket" a day.

const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ── Flap sound: short filtered noise clicks, synthesised on demand ──
function useFlapSound(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastRef = useRef(0);
  return useCallback(() => {
    if (muted) return;
    const now = performance.now();
    if (now - lastRef.current < 22) return;
    lastRef.current = now;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current!;
      const len = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2400 + Math.random() * 1200;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      src.connect(band).connect(gain).connect(ctx.destination);
      src.start();
    } catch {}
  }, [muted]);
}

// ── One row of flaps that rolls to `text` whenever `rollKey` changes ──
function FlapRow({ text, cells, rollKey, size = 'md', onFlip, tone = 'ink' }: {
  text: string; cells: number; rollKey: number; size?: 'lg' | 'md' | 'sm'; onFlip?: () => void; tone?: 'ink' | 'amber' | 'red';
}) {
  const target = useMemo(() => text.toUpperCase().padEnd(cells, ' ').slice(0, cells).split(''), [text, cells]);
  const [shown, setShown] = useState<string[]>(() => Array(cells).fill(' '));
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    // Before the first spin, or under reduced motion, show the text without rolling
    if (rollKey === 0 || prefersReducedMotion()) { setShown(target); return; }
    const timers: number[] = [];
    target.forEach((goal, idx) => {
      let cur = Math.max(0, FLAP_CHARS.indexOf(shownRef.current[idx] ?? ' '));
      const goalIdx = Math.max(0, FLAP_CHARS.indexOf(goal));
      const steps = ((goalIdx - cur + FLAP_CHARS.length) % FLAP_CHARS.length) + FLAP_CHARS.length * (1 + (idx % 2));
      let n = 0;
      const tick = () => {
        if (n >= steps) {
          setShown(prev => { const next = [...prev]; next[idx] = goal; return next; });
          return;
        }
        cur = (cur + 1) % FLAP_CHARS.length;
        const ch = FLAP_CHARS[cur];
        setShown(prev => { const next = [...prev]; next[idx] = ch; return next; });
        onFlip?.();
        n++;
        timers.push(window.setTimeout(tick, 16 + idx * 1.5));
      };
      timers.push(window.setTimeout(tick, idx * 40));
    });
    return () => timers.forEach(t => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey, target.join('')]);

  const dims = size === 'lg'
    ? 'w-[clamp(18px,min(6vw,5.2vh),50px)] h-[clamp(28px,min(9vw,8vh),72px)] text-[clamp(16px,min(5vw,4.6vh),42px)]'
    : size === 'md'
      ? 'w-[clamp(14px,min(3.4vw,3vh),24px)] h-[clamp(22px,min(5vw,4.6vh),34px)] text-[clamp(12px,min(2.8vw,2.6vh),20px)]'
      : 'w-[14px] h-[22px] text-[12px]';
  const color = tone === 'amber' ? 'text-amber-400' : tone === 'red' ? 'text-red-500' : 'text-[#F2F2EE]';
  return (
    <div className="flex gap-[3px]" aria-label={text}>
      {shown.map((ch, i) => (
        <span key={i} className={`tgl-flap relative grid place-items-center rounded-[3px] bg-[#1B1B1F] font-mono font-semibold ${dims} ${color}`}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </div>
  );
}

interface DepartureBoardProps {
  onClose: () => void;
  onBuildTrip: (city: { countryEn: string; cityKo: string; cityEn: string; year: number; month: number }) => void;
  onOpenPocket?: () => void;
  isDarkMode?: boolean;
  // Same weather the app ambience shows; undefined draws a clear sky
  weatherCode?: number;
  precipitationProb?: number;
}

// Airport chime: two soft sine notes, like a terminal announcement
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [[659.25, 0], [523.25, 0.32]].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 1.2);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {}
}

const MUTE_KEY = 'tgl_departure_muted';

export function DepartureBoard({ onClose, onBuildTrip, onOpenPocket, isDarkMode = true, weatherCode, precipitationProb = 0 }: DepartureBoardProps) {
  const weatherType = resolveWeatherEffectType(weatherCode, precipitationProb);
  const weatherIntensity = precipitationIntensity(weatherCode, precipitationProb);
  const [filters, setFilters] = useState<DepartureFilters>(() => defaultFilters());
  const [city, setCity] = useState<DestinationCity | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const [booted, setBooted] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } });
  const [view, setView] = useState<'board' | 'tickets'>('board');
  const [store, setStore] = useState(() => readCachedTickets());
  const [kept, setKept] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const flip = useFlapSound(muted);
  // The back gesture steps out of the lobby (straight away: the exit animation is for the close button)
  useBackToClose(true, onClose);

  const pool = useMemo(() => candidates(filters), [filters]);
  const { year, month } = targetMonth(filters);
  const dailyClaimed = store.lastDaily === todayKey();
  const thisYear = new Date().getFullYear();

  // Places already kept in the pocket for the landed city
  const pocketCount = useMemo(() => {
    if (!city) return 0;
    const names = [city.nameEn.toLowerCase(), city.nameKo];
    return getSavedPockets().filter(p => {
      const c = (p.city || '').toLowerCase();
      return names.some(n => n && (c === n || c.includes(n)));
    }).length;
  }, [city]);

  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) { onClose(); return; }
    setLeaving(true);
    window.setTimeout(onClose, 420);
  }, [onClose]);

  const land = useCallback((next: DestinationCity) => {
    setCity(next);
    setKept(false);
    setSpinning(true);
    setRollKey(k => k + 1);
    window.setTimeout(() => setSpinning(false), prefersReducedMotion() ? 0 : 1900);
  }, []);

  const spin = useCallback(() => {
    if (spinning) return;
    if (!pool.length) { notify('조건에 맞는 출발편이 없습니다. 비행 시간이나 시기를 바꿔 보세요.'); return; }
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) while (next.nameEn === city?.nameEn) next = pool[Math.floor(Math.random() * pool.length)];
    land(next);
  }, [spinning, pool, city, land]);

  const build = useCallback((c: { countryEn: string; cityKo: string; cityEn: string; year: number; month: number }) => {
    onClose();
    onBuildTrip(c);
  }, [onClose, onBuildTrip]);

  // Arrival: the chime, then the board wakes up and rolls to WELCOME
  useEffect(() => {
    if (!muted) playChime();
    const t = window.setTimeout(() => { setBooted(true); setRollKey(k => k + 1); }, prefersReducedMotion() ? 0 : 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTickets().then(setStore).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {} }, [muted]);

  // Keyboard: Esc closes, Space spins, Enter builds the landed trip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const onControl = (e.target as HTMLElement)?.closest?.('button, input, select, textarea');
      if (e.key === 'Escape') requestClose();
      else if (e.key === ' ' && !onControl && view === 'board') { e.preventDefault(); spin(); }
      else if (e.key === 'Enter' && !onControl && city && !spinning && view === 'board') build({ countryEn: city.countryEn, cityKo: city.nameKo, cityEn: city.nameEn, year, month });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, spin, build, city, spinning, view, year, month]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const persist = async (nextStore: typeof store) => {
    setStore(nextStore);
    try { await saveTickets(nextStore); } catch { notify('티켓 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error'); }
  };

  const claimDaily = async () => {
    const pick = dailyPick(filters);
    if (!pick || dailyClaimed) return;
    land(pick);
    await persist({ items: [makeTicket(pick, filters, true), ...store.items], lastDaily: todayKey() });
    setKept(true);
    notify(`오늘의 티켓: ${pick.nameKo}`, 'success');
  };

  const keep = async () => {
    if (!city || kept) return;
    await persist({ ...store, items: [makeTicket(city, filters), ...store.items] });
    setKept(true);
    notify('티켓을 보관했습니다.', 'success');
  };

  const removeTicket = async (t: DepartureTicket) => {
    if (!(await confirmDialog(`${t.cityKo} 티켓을 삭제할까요?`))) return;
    await persist({ ...store, items: store.items.filter(x => x.id !== t.id) });
  };

  // Month stepper: from this month up to December next year; tapping the label wraps around
  const monthIndex = (y: number, m: number) => y * 12 + (m - 1);
  const firstIndex = monthIndex(thisYear, selectableMonths(thisYear)[0]);
  const lastIndex = monthIndex(thisYear + 1, 12);
  const canStep = (dir: 1 | -1) => {
    const next = monthIndex(filters.year, filters.month) + dir;
    return next >= firstIndex && next <= lastIndex;
  };
  const stepMonth = (dir: 1 | -1, wrap = false) => setFilters(f => {
    let next = monthIndex(f.year, f.month) + dir;
    if (next > lastIndex) next = wrap ? firstIndex : lastIndex;
    if (next < firstIndex) next = firstIndex;
    return { ...f, year: Math.floor(next / 12), month: (next % 12) + 1 };
  });

  // Four other departures, reshuffled on every roll
  const others = useMemo(() => {
    const rest = pool.filter(c => c.nameEn !== city?.nameEn);
    const start = rest.length ? (rollKey * 7) % rest.length : 0;
    return [...rest.slice(start), ...rest.slice(0, start)].filter((_, i) => i % 3 === 0).slice(0, 4);
  }, [pool, city, rollKey]);
  const status = city ? (isBestSeason(city, month) ? 'BEST SEASON' : 'ON TIME') : booted ? 'BOARDING' : '';

  const Chip = ({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`tgl-press h-8 min-w-[40px] px-2.5 font-mono text-meta uppercase tracking-wider border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 ${
        active ? 'bg-[#0B0B0C] text-white border-[#0B0B0C] dark:bg-[#F2F2EE] dark:text-black dark:border-[#F2F2EE]' : 'border-black/25 text-black/75 hover:border-black hover:text-black dark:border-white/25 dark:text-white/75 dark:hover:border-white dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono text-micro tracking-[0.16em] uppercase text-black/60 dark:text-white/55">{children}</span>
  );

  return (
    <div
      role="dialog"
      aria-label="Departure Board"
      className={`fixed inset-0 z-[190] bg-[#F2F2EE] text-[#0B0B0C] dark:bg-[#0B0B0C] dark:text-[#F2F2EE] transition-colors duration-700 overflow-hidden ${leaving ? 'tgl-lobby-out' : 'tgl-lobby-in'}`}
    >
      <div className="h-full flex flex-col" style={{ perspective: '1400px', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Everything above the lobby; scrolls on its own only on very short screens */}
        <div className={`flex-none w-full max-w-5xl mx-auto px-4 sm:px-8 pt-3 sm:pt-4 flex flex-col gap-3 max-h-[calc(100%-140px)] overflow-y-auto hide-scrollbar ${leaving ? '' : 'tgl-board-in'}`}>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 border-b border-black/15 dark:border-white/15 pb-2">
            <div className="flex items-baseline gap-3">
              <span className="font-sans font-extrabold text-lg sm:text-xl tracking-tight">Departures</span>
              <span className="font-mono text-meta text-black/60 dark:text-white/60 tabular-nums">ICN · {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setView(v => (v === 'board' ? 'tickets' : 'board'))} className="tgl-press h-8 px-2.5 inline-flex items-center gap-1.5 border border-black/25 hover:border-black dark:border-white/25 dark:hover:border-white font-mono text-meta uppercase tracking-wider cursor-pointer" aria-label={view === 'board' ? '보관한 티켓' : '보드로 돌아가기'}>
                <Ticket className="w-4 h-4" />
                <span className="tabular-nums">{view === 'board' ? store.items.length : 'Board'}</span>
              </button>
              <button type="button" onClick={() => setMuted(m => !m)} className="tgl-press tap-target w-8 h-8 grid place-items-center border border-black/25 hover:border-black dark:border-white/25 dark:hover:border-white cursor-pointer" aria-label={muted ? '소리 켜기' : '소리 끄기'}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button type="button" onClick={requestClose} className="tgl-press tap-target w-8 h-8 grid place-items-center border border-black/25 hover:bg-black hover:text-white dark:border-white/25 dark:hover:bg-white dark:hover:text-black cursor-pointer" aria-label="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {view === 'board' ? (
            <>
              {/* Filters on one line: stay, flight time, and a month stepper */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <Label>Stay</Label>
                  <div className="flex gap-1">
                    <Chip active={filters.stay === 'short'} onClick={() => setFilters(f => ({ ...f, stay: 'short' }))}>2–3박</Chip>
                    <Chip active={filters.stay === 'mid'} onClick={() => setFilters(f => ({ ...f, stay: 'mid' }))}>4–5박</Chip>
                    <Chip active={filters.stay === 'long'} onClick={() => setFilters(f => ({ ...f, stay: 'long' }))}>6박+</Chip>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Flight</Label>
                  <div className="flex gap-1">
                    {FLIGHT_OPTIONS.map(o => (
                      <Chip key={o.value} active={filters.flight === o.value} onClick={() => setFilters(f => ({ ...f, flight: o.value }))}>{o.label}</Chip>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Departs</Label>
                  <div className="flex items-stretch h-8 border border-black/25 dark:border-white/25">
                    <button type="button" onClick={() => stepMonth(-1)} disabled={!canStep(-1)} className="tgl-press w-8 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed" aria-label="이전 달">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => stepMonth(1, true)} className="tgl-press px-3 font-mono text-meta tracking-wider tabular-nums border-x border-black/25 hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/10 cursor-pointer" aria-label="출발 월 바꾸기">
                      {MONTHS[month - 1]} {year}
                    </button>
                    <button type="button" onClick={() => stepMonth(1)} disabled={!canStep(1)} className="tgl-press w-8 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed" aria-label="다음 달">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Board */}
              <div className="dark relative border border-white/15 p-3 sm:p-4 flex flex-col gap-3 bg-[#101012] text-[#F2F2EE] shadow-[0_24px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <Label>Flight</Label>
                    <FlapRow text={city ? flightNumber(city).replace(' ', '') : booted ? 'TG001' : ''} cells={5} rollKey={rollKey} size="md" onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 overflow-x-auto hide-scrollbar">
                    <Label>Destination</Label>
                    <FlapRow text={city ? city.nameEn : booted ? 'WELCOME' : ''} cells={12} rollKey={rollKey} size="lg" onFlip={flip} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <div className="flex flex-col gap-1">
                    <Label>Time</Label>
                    <FlapRow text={city ? formatHours(flightHours(city)).replace(/ /g, '') : ''} cells={6} rollKey={rollKey} size="md" onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Gate</Label>
                    <FlapRow text={city ? gateFor(city) : ''} cells={3} rollKey={rollKey} size="md" onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Departs</Label>
                    <FlapRow text={city || booted ? `${MONTHS[month - 1]} ${year}` : ''} cells={8} rollKey={rollKey} size="md" onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Status</Label>
                    <FlapRow text={status} cells={11} rollKey={rollKey} size="md" onFlip={flip} tone={status === 'BEST SEASON' ? 'amber' : status === 'BOARDING' ? 'red' : 'ink'} />
                  </div>
                </div>

                {/* Result: the city, its photo, and what is already in the pocket */}
                <div className="h-12 border-t border-white/10 pt-2 flex items-center">
                  {city && !spinning ? (
                    <div className="tgl-rise flex gap-3 items-center min-w-0">
                      {city.coverImage && (
                        <img src={getEffectiveImageUrl(city.coverImage)} alt={city.nameKo} loading="lazy" className="w-14 h-10 object-cover shrink-0" />
                      )}
                      <span className="text-base font-extrabold tracking-tight shrink-0">{city.nameKo}</span>
                      <span className="text-sm text-white/65 truncate">{[city.countryKo, ...(city.iconicSpots || []).slice(0, 2)].join(' · ')}</span>
                      {pocketCount > 0 && (
                        <button type="button" onClick={() => { onClose(); onOpenPocket?.(); }} className="tgl-sweep shrink-0 font-mono text-meta text-amber-300 cursor-pointer">
                          포켓 {pocketCount}곳
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-meta uppercase tracking-widest text-white/45">
                      {spinning ? 'Now boarding…' : `${pool.length} destinations · Space to spin`}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions, then the other departures on one line */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={spin} disabled={spinning} className="tgl-press h-11 px-7 bg-red-600 hover:bg-red-500 text-white font-mono font-bold uppercase tracking-[0.2em] disabled:opacity-60 cursor-pointer">
                  {city ? 'Spin again' : 'Spin'}
                </button>
                {!dailyClaimed && (
                  <button type="button" onClick={claimDaily} disabled={spinning} className="tgl-press h-11 px-4 border border-amber-600/70 text-amber-700 dark:border-amber-400/70 dark:text-amber-300 hover:bg-amber-400 hover:text-black font-mono text-meta font-bold uppercase tracking-widest transition-colors cursor-pointer">
                    오늘의 티켓
                  </button>
                )}
                {city && !spinning && (
                  <>
                    <button type="button" onClick={() => build({ countryEn: city.countryEn, cityKo: city.nameKo, cityEn: city.nameEn, year, month })} className="tgl-press h-11 px-4 bg-[#0B0B0C] text-white hover:bg-black/80 dark:bg-[#F2F2EE] dark:text-black dark:hover:bg-white font-bold text-sm cursor-pointer">
                      이 여정 만들기
                    </button>
                    <button type="button" onClick={keep} disabled={kept} className="tgl-press h-11 px-4 border border-black/40 hover:border-black dark:border-white/40 dark:hover:border-white text-sm disabled:opacity-60 cursor-pointer">
                      {kept ? '보관됨' : '티켓 보관'}
                    </button>
                  </>
                )}
              </div>
              {others.length > 0 && (
                <div className="flex items-center gap-3 min-w-0 overflow-hidden whitespace-nowrap border-t border-black/10 dark:border-white/10 pt-2">
                  <Label>Also</Label>
                  {others.map((c, i) => (
                    <button key={`${c.nameEn}-${rollKey}`} type="button" onClick={() => !spinning && land(c)} className="tgl-rise shrink-0 font-mono text-meta uppercase tracking-wider text-black/75 hover:text-red-600 dark:text-white/75 dark:hover:text-red-400 cursor-pointer" style={{ '--i': i } as React.CSSProperties}>
                      {c.nameEn} <span className={isBestSeason(c, month) ? 'text-amber-600 dark:text-amber-400' : 'text-black/50 dark:text-white/45'}>{formatHours(flightHours(c)).replace(' ', '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Kept tickets */
            <div className="flex flex-col gap-3 pb-2">
              <Label>Kept tickets · {store.items.length}</Label>
              {store.items.length === 0 ? (
                <p className="text-black/60 dark:text-white/60 text-sm py-8 text-center">아직 보관한 티켓이 없습니다.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {store.items.map((t, i) => (
                    <div key={t.id} className="tgl-rise relative bg-white border border-black/15 dark:border-transparent dark:bg-[#F2F2EE] text-black flex" style={{ '--i': i } as React.CSSProperties}>
                      <div className="flex-1 p-4 flex flex-col gap-1 min-w-0">
                        <span className="font-mono text-micro tracking-[0.16em] uppercase text-black/55">ICN → {t.flightNo} · Gate {t.gate}</span>
                        <span className="font-sans font-extrabold text-2xl tracking-tight uppercase truncate">{t.cityEn}</span>
                        <span className="text-sm text-black/65">{t.cityKo} · {t.countryKo}</span>
                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => build({ countryEn: t.countryEn, cityKo: t.cityKo, cityEn: t.cityEn, year: t.year, month: t.month })} className="tgl-press h-8 px-3 bg-black text-white text-meta font-bold cursor-pointer hover:bg-red-600">여정 만들기</button>
                          <button type="button" onClick={() => removeTicket(t)} className="tgl-press h-8 px-3 border border-black/25 text-meta cursor-pointer hover:border-black">삭제</button>
                        </div>
                      </div>
                      {/* Stub */}
                      <div className="w-20 border-l-2 border-dashed border-black/25 flex flex-col items-center justify-center gap-1 font-mono">
                        <span className="text-lg font-bold">{MONTHS[t.month - 1]}</span>
                        <span className="text-micro text-black/55 tabular-nums">{t.year}</span>
                        {t.daily && <span className="mt-1 px-1.5 py-0.5 border border-red-600 text-red-600 text-micro font-bold">TODAY</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* The lobby fills the rest of the screen: glass wall, planes, travelers */}
        <div className="tgl-lobby-scene relative flex-1 min-h-[140px] w-full overflow-hidden mt-3">
          <LobbyScene isDarkMode={isDarkMode} weatherType={weatherType} intensity={weatherIntensity} />
        </div>
      </div>
    </div>
  );
}
