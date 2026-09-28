import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ticket, Volume2, VolumeX, X } from 'lucide-react';
import type { DestinationCity } from '../../data/worldDestinations';
import { confirmDialog, notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import {
  DepartureFilters, DepartureTicket, candidates, dailyPick, flightHours, flightNumber, formatHours, gateFor,
  isBestSeason, loadTickets, makeTicket, readCachedTickets, saveTickets, targetMonth, todayKey,
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
    ? 'w-[clamp(18px,6vw,54px)] h-[clamp(28px,9vw,78px)] text-[clamp(16px,5vw,46px)]'
    : size === 'md'
      ? 'w-[clamp(14px,3.4vw,26px)] h-[clamp(22px,5vw,38px)] text-[clamp(12px,2.8vw,22px)]'
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
}

export function DepartureBoard({ onClose, onBuildTrip }: DepartureBoardProps) {
  const [filters, setFilters] = useState<DepartureFilters>({ stay: 'mid', flight: 6, when: 1 });
  const [city, setCity] = useState<DestinationCity | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState<'board' | 'tickets'>('board');
  const [store, setStore] = useState(() => readCachedTickets());
  const [kept, setKept] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const flip = useFlapSound(muted);

  const pool = useMemo(() => candidates(filters), [filters]);
  const { year, month } = targetMonth(filters.when);
  const dailyClaimed = store.lastDaily === todayKey();

  useEffect(() => { loadTickets().then(setStore).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const land = (next: DestinationCity) => {
    setCity(next);
    setKept(false);
    setSpinning(true);
    setRollKey(k => k + 1);
    window.setTimeout(() => setSpinning(false), prefersReducedMotion() ? 0 : 1900);
  };

  const spin = () => {
    if (spinning) return;
    if (!pool.length) { notify('조건에 맞는 출발편이 없습니다. 비행 시간을 늘려 보세요.'); return; }
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) while (next.nameEn === city?.nameEn) next = pool[Math.floor(Math.random() * pool.length)];
    land(next);
  };

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

  const build = (c: { countryEn: string; cityKo: string; cityEn: string; year: number; month: number }) => {
    onClose();
    onBuildTrip(c);
  };

  // Four other departures, reshuffled on every roll
  const others = useMemo(() => {
    const rest = pool.filter(c => c.nameEn !== city?.nameEn);
    const start = rest.length ? (rollKey * 7) % rest.length : 0;
    return [...rest.slice(start), ...rest.slice(0, start)].filter((_, i) => i % 3 === 0).slice(0, 4);
  }, [pool, city, rollKey]);
  const status = city ? (isBestSeason(city, month) ? 'BEST SEASON' : 'ON TIME') : '';

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tgl-press h-8 px-3 font-mono text-meta uppercase tracking-wider border transition-colors cursor-pointer ${
        active ? 'bg-[#F2F2EE] text-black border-[#F2F2EE]' : 'border-white/25 text-white/75 hover:border-white hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div role="dialog" aria-label="Departure Board" className="fixed inset-0 z-[190] bg-[#0B0B0C] text-[#F2F2EE] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-5 pb-16 flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="flex items-baseline gap-3">
            <span className="font-sans font-extrabold text-xl sm:text-2xl tracking-tight">Departures</span>
            <span className="font-mono text-meta text-white/60 tabular-nums">ICN · {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setView(v => (v === 'board' ? 'tickets' : 'board'))} className="tgl-press h-9 px-3 inline-flex items-center gap-2 border border-white/25 hover:border-white font-mono text-meta uppercase tracking-wider cursor-pointer">
              <Ticket className="w-4 h-4" />
              <span className="tabular-nums">{view === 'board' ? store.items.length : 'Board'}</span>
            </button>
            <button type="button" onClick={() => setMuted(m => !m)} className="tgl-press tap-target w-9 h-9 grid place-items-center border border-white/25 hover:border-white cursor-pointer" aria-label={muted ? '소리 켜기' : '소리 끄기'}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button type="button" onClick={onClose} className="tgl-press tap-target w-9 h-9 grid place-items-center border border-white/25 hover:bg-white hover:text-black cursor-pointer" aria-label="닫기">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === 'board' ? (
          <>
            {/* Filters */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Stay</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Chip active={filters.stay === 'short'} onClick={() => setFilters(f => ({ ...f, stay: 'short' }))}>2–3박</Chip>
                  <Chip active={filters.stay === 'mid'} onClick={() => setFilters(f => ({ ...f, stay: 'mid' }))}>4–5박</Chip>
                  <Chip active={filters.stay === 'long'} onClick={() => setFilters(f => ({ ...f, stay: 'long' }))}>6박+</Chip>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Flight</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Chip active={filters.flight === 3} onClick={() => setFilters(f => ({ ...f, flight: 3 }))}>3H</Chip>
                  <Chip active={filters.flight === 6} onClick={() => setFilters(f => ({ ...f, flight: 6 }))}>6H</Chip>
                  <Chip active={filters.flight === 99} onClick={() => setFilters(f => ({ ...f, flight: 99 }))}>Any</Chip>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">When</span>
                <div className="flex gap-1.5 flex-wrap">
                  {([0, 1, 2] as const).map(w => (
                    <Chip key={w} active={filters.when === w} onClick={() => setFilters(f => ({ ...f, when: w }))}>
                      {MONTHS[targetMonth(w).month - 1]}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            {/* Board */}
            <div className="border border-white/15 p-3 sm:p-5 flex flex-col gap-4 bg-[#101012]">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-end">
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Flight</span>
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Destination</span>
                <FlapRow text={city ? flightNumber(city).replace(' ', '') : ''} cells={5} rollKey={rollKey} size="md" onFlip={flip} />
                <div className="overflow-x-auto hide-scrollbar">
                  <FlapRow text={city ? city.nameEn : ''} cells={12} rollKey={rollKey} size="lg" onFlip={flip} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Time</span>
                  <FlapRow text={city ? formatHours(flightHours(city)).replace(/ /g, '') : ''} cells={6} rollKey={rollKey} size="md" onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Gate</span>
                  <FlapRow text={city ? gateFor(city) : ''} cells={3} rollKey={rollKey} size="md" onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Departs</span>
                  <FlapRow text={city ? `${MONTHS[month - 1]} ${year}` : ''} cells={8} rollKey={rollKey} size="md" onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Status</span>
                  <FlapRow text={status} cells={11} rollKey={rollKey} size="md" onFlip={flip} tone={status === 'BEST SEASON' ? 'amber' : 'ink'} />
                </div>
              </div>

              {/* Result details */}
              <div className="min-h-[56px] border-t border-white/10 pt-3">
                {city && !spinning ? (
                  <div className="tgl-rise flex flex-col gap-1">
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight">{city.nameKo} <span className="text-white/60 font-medium text-sm">{city.countryKo}</span></span>
                    {city.iconicSpots?.length > 0 && (
                      <span className="text-sm text-white/70 break-keep">{city.iconicSpots.slice(0, 3).join(' · ')}</span>
                    )}
                  </div>
                ) : (
                  <span className="font-mono text-meta uppercase tracking-widest text-white/45">
                    {spinning ? 'Now boarding…' : `${pool.length} destinations on the board`}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={spin} disabled={spinning} className="tgl-press h-12 px-8 bg-red-600 hover:bg-red-500 text-white font-mono font-bold uppercase tracking-[0.2em] disabled:opacity-60 cursor-pointer">
                {city ? 'Spin again' : 'Spin'}
              </button>
              {!dailyClaimed && (
                <button type="button" onClick={claimDaily} disabled={spinning} className="tgl-press h-12 px-5 border border-amber-400/70 text-amber-300 hover:bg-amber-400 hover:text-black font-mono text-meta font-bold uppercase tracking-widest transition-colors cursor-pointer">
                  오늘의 티켓
                </button>
              )}
              {city && !spinning && (
                <>
                  <button type="button" onClick={() => build({ countryEn: city.countryEn, cityKo: city.nameKo, cityEn: city.nameEn, year, month })} className="tgl-press h-12 px-5 bg-[#F2F2EE] text-black hover:bg-white font-bold text-sm cursor-pointer">
                    이 여정 만들기
                  </button>
                  <button type="button" onClick={keep} disabled={kept} className="tgl-press h-12 px-5 border border-white/40 hover:border-white text-sm disabled:opacity-60 cursor-pointer">
                    {kept ? '보관됨' : '티켓 보관'}
                  </button>
                </>
              )}
            </div>

            {/* Other departures */}
            {others.length > 0 && (
              <div className="flex flex-col">
                <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55 pb-2 border-b border-white/15">Also departing</span>
                {others.map(c => (
                  <button key={c.nameEn} type="button" onClick={() => !spinning && land(c)} className="group grid grid-cols-[64px_1fr_auto] sm:grid-cols-[80px_1fr_90px_auto] gap-3 items-center py-2.5 border-b border-white/10 text-left hover:bg-white/[0.04] cursor-pointer">
                    <span className="font-mono text-meta text-white/60">{flightNumber(c)}</span>
                    <span className="font-mono text-sm uppercase tracking-wider truncate group-hover:text-red-400">{c.nameEn}<span className="ml-2 font-sans normal-case tracking-normal text-white/55">{c.nameKo}</span></span>
                    <span className="hidden sm:block font-mono text-meta text-white/60">{formatHours(flightHours(c))}</span>
                    <span className={`font-mono text-micro uppercase tracking-wider ${isBestSeason(c, month) ? 'text-amber-400' : 'text-white/50'}`}>{isBestSeason(c, month) ? 'Best' : 'On time'}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Kept tickets */
          <div className="flex flex-col gap-4">
            <span className="font-mono text-micro tracking-[0.16em] uppercase text-white/55">Kept tickets · {store.items.length}</span>
            {store.items.length === 0 ? (
              <p className="text-white/60 text-sm py-10 text-center">아직 보관한 티켓이 없습니다.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {store.items.map((t, i) => (
                  <div key={t.id} className="tgl-rise relative bg-[#F2F2EE] text-black flex" style={{ '--i': i } as React.CSSProperties}>
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
    </div>
  );
}
