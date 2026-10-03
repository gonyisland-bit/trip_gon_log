import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Plane, Plus, Ticket, Trash2, Volume2, VolumeX } from 'lucide-react';
import { TerminalScene } from './TerminalScene';
import { TerminalWeatherPicker } from './TerminalWeatherPicker';
import { getWeatherMeta } from '../../utils/weatherApi';
import { resolveWeatherEffectType } from '../WeatherEffectLayer';
import { precipitationIntensity } from '../weather/WeatherParticleCanvas';
import { confirmDialog, notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { useBackToClose } from '../../utils/overlayHistory';
import { IconButton } from '../ui/IconButton';
import { Segment } from '../ui/Segment';
import { UpcomingBookings, countUpcoming } from './UpcomingBookings';
import type { Trip, Plan, FlightItem, StayItem, TransitItem } from '../../types';
import { TicketCard, TicketFace } from './TicketCard';
import { TicketSheet } from './TicketSheet';
import { EmptyScene } from '../scenes/EmptyScene';
import { DepartureTicket, TicketStore, activeTicketOf, readCachedTickets, removeTicket, setActiveTicket, subscribeTickets, ticketStatus } from './departureData';
import { Art } from '../../art/Art';
import { CounterStage } from './CounterStage';

// Airport terminal (spec 3.2): where a planned trip waits before it becomes a journey.
// Tickets are issued from the New trip sheet. The counter holds one ticket at a time, shown on the
// black split-flap board (destination, dates, stay, party, gate); every other ticket is kept in
// storage, with the bookings of journeys still ahead. Raising a kept ticket rolls the board over to it.
// Boarding creates the journey from the ticket and opens it.
// It lives in the tab bar's centre drawer (components/DrawerHost, v1.3.8). The counter is one stage (CounterStage):
// board, buttons, ticket and lobby window scale together to the drawer, so they keep the same proportions everywhere.
// Two tabs: 카운터 (the one ticket being written or just finished, shown as a boarding pass under the
// boarding button) and 발권표 (tickets written but not at the counter, and 탑승 예정, the bookings of
// journeys already made). A ticket opens its own sheet, which holds smart booking.

const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:+';
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
  text: string; cells: number; rollKey: number; size?: 'lg' | 'md'; onFlip?: () => void; tone?: 'ink' | 'amber' | 'red';
}) {
  const target = useMemo(() => text.toUpperCase().padEnd(cells, ' ').slice(0, cells).split(''), [text, cells]);
  const [shown, setShown] = useState<string[]>(() => Array(cells).fill(' '));
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (prefersReducedMotion()) { setShown(target); return; }
    const timers: number[] = [];
    target.forEach((goal, idx) => {
      let cur = Math.max(0, FLAP_CHARS.indexOf(shownRef.current[idx] ?? ' '));
      const goalIdx = Math.max(0, FLAP_CHARS.indexOf(goal));
      // A short roll: straight to the letter, plus one lap on alternate cells
      const steps = ((goalIdx - cur + FLAP_CHARS.length) % FLAP_CHARS.length) + (idx % 2 ? 0 : 6);
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
        timers.push(window.setTimeout(tick, 18 + idx * 1.5));
      };
      timers.push(window.setTimeout(tick, idx * 35));
    });
    return () => timers.forEach(t => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey, target.join('')]);

  const color = tone === 'amber' ? 'text-amber-400' : tone === 'red' ? 'text-red-500' : 'text-[#F2F2EE]';
  return (
    <div className="grid gap-[2px] w-full" style={{ gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))` }} aria-label={text}>
      {shown.map((ch, i) => (
        <span key={i} className={`tgl-flap relative block rounded-[3px] bg-[#1B1B1F] font-mono font-semibold ${color}`} style={{ aspectRatio: size === 'lg' ? '3 / 4.4' : '3 / 4' }}>
          <span className="tgl-flapch">{ch === ' ' ? ' ' : ch}</span>
        </span>
      ))}
    </div>
  );
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
const label = 'font-mono text-micro font-bold uppercase tracking-wider';
const muted = 'text-black/60 dark:text-white/60';

/** "10 NOV" from YYYY-MM-DD */
function boardDate(iso?: string): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

interface DepartureBoardProps {
  onClose: () => void;
  /** Creates the journey from the ticket; the terminal then removes the ticket and closes */
  onBoard: (ticket: DepartureTicket) => Promise<void>;
  /** Opens the New trip sheet; with a ticket, to re-plan it */
  onPlan: (ticket?: DepartureTicket) => void;
  /** Ticket to show first (just issued); a new id later rolls the board over to it */
  initialTicketId?: string;
  /** The New trip sheet is open over the terminal: Escape belongs to it */
  covered?: boolean;
  isDarkMode?: boolean;
  // Same weather the app ambience shows; undefined draws a clear sky
  weatherCode?: number;
  precipitationProb?: number;
  /** This user's weather location, shown and changed from the top bar */
  weatherCityName?: string;
  weatherCityEn?: string;
  weatherTemp?: number;
  /** Where the weather city is, for the time of day beyond the lobby's glass */
  weatherLat?: number;
  weatherLng?: number;
  /** Which tab opens first */
  initialTab?: TerminalTab;
  trips?: Trip[];
  plans?: Plan[];
  flightsByTrip?: Record<number, FlightItem[]>;
  staysByTrip?: Record<number, StayItem[]>;
  transitByTrip?: Record<number, TransitItem[]>;
  /** Opens a booking inside its journey */
  onOpenBooking?: (tripId: number, tab: string, itemId: number | null) => void;
}

export type TerminalTab = 'counter' | 'storage';

export function DepartureBoard({
  onClose, onBoard, onPlan, initialTicketId, covered = false, isDarkMode = true,
  weatherCode, precipitationProb = 0, weatherCityName, weatherCityEn, weatherTemp, weatherLat, weatherLng,
  initialTab = 'counter', trips = [], plans = [], flightsByTrip = {}, staysByTrip = {}, transitByTrip = {}, onOpenBooking,
}: DepartureBoardProps) {
  const [tab, setTab] = useState<TerminalTab>(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const upcomingCount = useMemo(() => countUpcoming(trips, plans), [trips, plans]);
  const weatherType = resolveWeatherEffectType(weatherCode, precipitationProb);
  const weatherIntensity = precipitationIntensity(weatherCode, precipitationProb);
  const [store, setStore] = useState<TicketStore>(() => readCachedTickets());
  const [rollKey, setRollKey] = useState(0);
  const [boarding, setBoarding] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } });
  const [clock, setClock] = useState(() => new Date());
  const flip = useFlapSound(muted);
  // The back gesture steps out of the terminal (straight away: the exit animation is for the close button)
  useBackToClose(true, onClose);

  // When the window weather changes, name the place and sky on the glass for a moment
  const [skyNote, setSkyNote] = useState<string | null>(null);
  const skyKey = `${weatherCityEn || ''}|${weatherCode ?? ''}`;
  const firstSky = useRef(true);
  useEffect(() => {
    if (firstSky.current) { firstSky.current = false; return; }
    if (weatherCode === undefined) return;
    const meta = getWeatherMeta(weatherCode, precipitationProb, weatherTemp).labelKo;
    setSkyNote(`${weatherCityName || weatherCityEn || ''} · ${meta}${weatherTemp !== undefined ? ` ${weatherTemp}°` : ''}`);
    const t = window.setTimeout(() => setSkyNote(null), 2800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyKey]);

  const tickets = store.items;
  const ticket = activeTicketOf(store);
  // Storage: drafts (no plan yet) first, then finished tickets
  const kept = useMemo(() => tickets.filter(t => t.id !== ticket?.id), [tickets, ticket?.id]);
  const drafts = useMemo(() => kept.filter(t => !t.plan), [kept]);
  const finished = useMemo(() => kept.filter(t => t.plan), [kept]);
  const sheetTicket = sheetId ? tickets.find(t => t.id === sheetId) ?? null : null;
  const ticketCount = kept.length + upcomingCount;
  const status = ticket ? ticketStatus(ticket) : null;

  // A kept ticket goes to the counter; the one there goes back to storage
  const raise = async (t: DepartureTicket): Promise<boolean> => {
    if (t.id === ticket?.id) { setTab('counter'); return true; }
    setStore(prev => ({ ...prev, activeId: t.id }));
    setTab('counter');
    setRollKey(k => k + 1);
    try {
      setStore(await setActiveTicket(t.id));
    } catch {
      notify('티켓을 옮기지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setStore(readCachedTickets());
      return false;
    }
    return true;
  };

  // The counter holds one ticket: a new one sends the current one to storage, after a check
  const newTicket = async () => {
    if (ticket && !(await confirmDialog(`카운터의 '${ticket.cityKo}' 티켓은 보관으로 옮겨집니다. 새 티켓을 만들까요?`, { title: 'NEW TICKET', confirmLabel: '새 티켓' }))) return;
    onPlan();
  };

  // Arrival: the drawer finishes its slide, then the chime, then the board rolls to the ticket
  useEffect(() => {
    const slow = !prefersReducedMotion();
    const chime = window.setTimeout(() => { if (!muted) playChime(); }, slow ? 380 : 0);
    const t = window.setTimeout(() => setRollKey(k => k + 1), slow ? 560 : 0);
    return () => { clearTimeout(chime); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The same list on every device, followed live (a ticket issued on the phone shows up here too)
  useEffect(() => subscribeTickets(setStore), []);
  // A ticket issued (or re-planned) from the sheet over the terminal: roll the board to it
  const shownTicketId = useRef(initialTicketId);
  useEffect(() => {
    if (!initialTicketId || initialTicketId === shownTicketId.current) return;
    shownTicketId.current = initialTicketId;
    setStore(readCachedTickets());
    setTab('counter');
    setRollKey(k => k + 1);
  }, [initialTicketId]);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {} }, [muted]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !covered) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, covered]);

  const board = async (): Promise<boolean> => {
    if (!ticket?.plan || boarding) return false;
    const ok = await confirmDialog(`'${ticket.plan.title}' 여정을 만들까요? 탑승한 티켓은 목록에서 사라집니다.`, { title: 'BOARDING', confirmLabel: '탑승' });
    if (!ok) return false;
    setBoarding(true);
    try {
      await onBoard(ticket);
    } catch {
      notify('여정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBoarding(false);
      return false;
    }
    // The journey exists now: the ticket has been used
    await removeTicket(ticket.id).catch(() => {});
    onClose();
    return true;
  };

  // Deleting a ticket, at the counter or in storage: asked first, resolves true when it is gone
  const removeAny = async (t: DepartureTicket): Promise<boolean> => {
    if (!(await confirmDialog(`${t.cityKo} 티켓을 삭제할까요?`, { title: 'DELETE TICKET', confirmLabel: '삭제' }))) return false;
    try {
      setStore(await removeTicket(t.id));
      if (t.id === ticket?.id) setRollKey(k => k + 1);
      return true;
    } catch {
      notify('티켓을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      return false;
    }
  };

  const stops = ticket?.cities?.length ? ticket.cities : ticket ? [{ en: ticket.cityEn, ko: ticket.cityKo }] : [];
  const destination = ticket ? (stops.length > 1 ? `${stops[0].en} +${stops.length - 1}` : ticket.cityEn) : 'WELCOME';

  return (
    <div aria-label="공항 터미널" className="relative h-full flex flex-col text-ink dark:text-ink-dark overflow-hidden">
      {/* Top bar: the drawer's grip and its tab close it, so no close button */}
      <div className="shrink-0 w-full max-w-[680px] mx-auto px-4 h-12 md:mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[17px] font-extrabold tracking-tight leading-tight">공항 터미널</span>
          <span className={`${label} ${muted} tabular-nums`}>Terminal 1 · ICN {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TerminalWeatherPicker name={weatherCityName} nameEn={weatherCityEn} temp={weatherTemp} code={weatherCode} pop={precipitationProb} />
          <IconButton icon={muted ? VolumeX : Volume2} label={muted ? '소리 켜기' : '소리 끄기'} size="sm" onClick={() => setMuted(m => !m)} />
        </div>
      </div>

      <div className="shrink-0 w-full max-w-[680px] mx-auto px-4 pb-3">
        <Segment<TerminalTab>
          block
          ariaLabel="터미널 보기"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'counter', label: '카운터' },
            {
              value: 'storage',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  발권표
                  {ticketCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-red-600 dark:bg-red-500 text-white font-mono text-[10px] font-bold leading-4 text-center tabular-nums" aria-hidden>
                      {ticketCount > 9 ? '9+' : ticketCount}
                    </span>
                  )}
                  {ticketCount > 0 && <span className="sr-only">티켓 {ticketCount}개</span>}
                </span>
              ),
            },
          ]}
        />
      </div>

      {tab === 'storage' ? (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain hide-scrollbar">
          <div className="w-full max-w-[680px] mx-auto px-4 pb-4 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-extrabold tracking-tight">발권표</span>
              <button type="button" onClick={newTicket} className="btn btn-secondary">
                <Plus className="w-4 h-4 shrink-0" aria-hidden />새 티켓
              </button>
            </div>
            <StoredGroup title="작성 중" tickets={drafts} onOpen={t => setSheetId(t.id)} onRaise={raise} onRemove={removeAny} />
            <StoredGroup title="발권 완료" tickets={finished} onOpen={t => setSheetId(t.id)} onRaise={raise} onRemove={removeAny} />
            {kept.length === 0 && <EmptyScene kind="storage" mini title="카운터 밖에 둔 티켓이 없어요" />}
            <div className="flex flex-col gap-2">
              <span className={`${label} ${muted}`}>탑승 예정 · {upcomingCount}</span>
              <UpcomingBookings
                trips={trips}
                plans={plans}
                flightsByTrip={flightsByTrip}
                staysByTrip={staysByTrip}
                transitByTrip={transitByTrip}
                onOpenBooking={(id, t, item) => onOpenBooking?.(id, t, item)}
                onNewTrip={() => newTicket()}
              />
            </div>
          </div>
        </div>
      ) : (
        /* The counter: one stage (board, buttons, ticket, lobby window) scaled as a whole to the room there is */
        <div className="flex-1 min-h-0 relative">
          <CounterStage>
            <div className={`flex flex-col gap-3 ${boarding ? '' : 'tgl-board-in'}`}>
              <section aria-label="출발 안내판" className="dark w-full rounded-card bg-[#101012] text-[#F2F2EE] p-3.5 flex flex-col gap-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <div className="grid gap-x-3" style={{ gridTemplateColumns: '5fr 11fr' }}>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Flight</span>
                    <FlapRow text={ticket ? ticket.flightNo.replace(' ', '') : 'TG000'} cells={5} rollKey={rollKey} onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Destination</span>
                    <FlapRow text={destination} cells={11} rollKey={rollKey} size="lg" onFlip={flip} />
                  </div>
                </div>
                <div className="grid gap-x-2" style={{ gridTemplateColumns: '6fr 6fr 4fr' }}>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Departs</span>
                    <FlapRow text={ticket?.startDate ? boardDate(ticket.startDate) : ticket ? `${MONTHS[ticket.month - 1]} ${String(ticket.year).slice(2)}` : ''} cells={6} rollKey={rollKey} onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Return</span>
                    <FlapRow text={boardDate(ticket?.endDate)} cells={6} rollKey={rollKey} onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Stay</span>
                    <FlapRow text={ticket?.nights ? `${ticket.nights}N${ticket.nights + 1}D` : ''} cells={4} rollKey={rollKey} onFlip={flip} />
                  </div>
                </div>
                <div className="grid gap-x-2" style={{ gridTemplateColumns: '2fr 3fr 8fr' }}>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Pax</span>
                    <FlapRow text={ticket?.members?.length ? String(ticket.members.length) : ''} cells={2} rollKey={rollKey} onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Gate</span>
                    <FlapRow text={ticket?.gate || ''} cells={3} rollKey={rollKey} onFlip={flip} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`${label} text-white/55`}>Status</span>
                    <FlapRow text={status?.text || ''} cells={8} rollKey={rollKey} onFlip={flip} tone={status?.tone} />
                  </div>
                </div>
              </section>

              {/* The main action. With no ticket the board says WELCOME and the one thing to do is a new ticket */}
              {ticket ? (
                <div className="flex items-center gap-2">
                  {ticket.plan ? (
                    <button type="button" className="btn btn-accent btn-lg flex-1 min-w-0" onClick={() => { void board(); }} disabled={boarding}>
                      <Plane className="w-4 h-4 shrink-0 rotate-45" aria-hidden />
                      <span className="truncate">{boarding ? '탑승 중' : '탑승 · 여정 만들기'}</span>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-accent btn-lg flex-1 min-w-0" onClick={() => onPlan(ticket)}>
                      <Ticket className="w-4 h-4 shrink-0" aria-hidden />
                      <span className="truncate">일정 정하고 발권</span>
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary btn-lg shrink-0" onClick={newTicket} disabled={boarding}>
                    <Plus className="w-4 h-4 shrink-0" aria-hidden />새 티켓
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-accent btn-lg w-full" onClick={() => onPlan()}>
                  <Plus className="w-4 h-4 shrink-0" aria-hidden />
                  새 티켓
                </button>
              )}

              {/* The counter's ticket; an empty counter keeps its place so the stage never changes size */}
              {ticket ? (
                <TicketCard ticket={ticket} onOpen={() => setSheetId(ticket.id)} />
              ) : (
                <div className="w-full min-h-[122px] rounded-card bg-surface dark:bg-surface-dark grid place-items-center px-4 text-center text-[14px] font-bold text-black/55 dark:text-white/55">
                  카운터에 올린 티켓이 없어요
                </div>
              )}

              {/* The lobby window keeps the picture's own proportions, so nothing of it is cut */}
              <div className="relative w-full aspect-[2000/1493] rounded-card overflow-hidden">
                <TerminalScene isDarkMode={isDarkMode} weatherType={weatherType} intensity={weatherIntensity} lat={weatherLat} lng={weatherLng} tickets={tickets} activeId={ticket?.id} />
                {skyNote && (
                  <div key={skyNote} role="status" className="tgl-rise absolute left-1/2 -translate-x-1/2 top-[14%] px-3 h-8 inline-flex items-center gap-2 rounded-full bg-[#0B0B0C]/80 text-white font-mono text-meta tracking-wider pointer-events-none whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {skyNote}
                  </div>
                )}
              </div>
            </div>
          </CounterStage>
        </div>
      )}

      {boarding && (
        <div role="status" className="absolute inset-0 z-10 bg-paper/90 dark:bg-paper-dark/90 flex flex-col items-center justify-center gap-3 tgl-rise">
          <Art id="boarding-done" className="h-[200px] w-auto" />
          <span className="text-[17px] font-extrabold tracking-tight">탑승 중</span>
          <span className={`${label} ${muted}`}>여정을 만들고 있어요</span>
        </div>
      )}
      {sheetTicket && (
        <TicketSheet
          ticket={sheetTicket}
          atCounter={sheetTicket.id === ticket?.id}
          trips={trips}
          plans={plans}
          staysByTrip={staysByTrip}
          boarding={boarding}
          onClose={() => setSheetId(null)}
          onBoard={board}
          onRaise={() => raise(sheetTicket)}
          onRemove={() => removeAny(sheetTicket)}
          onPlan={() => onPlan(sheetTicket)}
        />
      )}
    </div>
  );
}

/** Tickets kept out of the counter: each a boarding pass that opens its sheet, raised to the counter or deleted */
function StoredGroup({ title, tickets, onOpen, onRaise, onRemove }: {
  title: string; tickets: DepartureTicket[]; onOpen: (t: DepartureTicket) => void;
  onRaise: (t: DepartureTicket) => Promise<boolean>; onRemove: (t: DepartureTicket) => Promise<boolean>;
}) {
  if (tickets.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className={`${label} ${muted}`}>{title} · {tickets.length}</span>
      <ul className="grid grid-cols-1 gap-y-3">
        {tickets.map(t => (
          <li key={t.id} className="flex flex-col gap-2">
            <button type="button" onClick={() => onOpen(t)} aria-label={`${t.cityKo} 티켓 열기`} className="tgl-press block w-full rounded-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
              <TicketFace ticket={t} />
            </button>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { void onRaise(t); }} className="btn btn-secondary btn-sm shrink-0">
                <ArrowUp className="w-3.5 h-3.5" aria-hidden />카운터로
              </button>
              <IconButton icon={Trash2} label="티켓 삭제" size="sm" onClick={() => { void onRemove(t); }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
