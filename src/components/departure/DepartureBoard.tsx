import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PencilLine, Plane, Plus, Ticket, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { LobbyScene } from './LobbyScene';
import { TerminalWeatherPicker } from './TerminalWeatherPicker';
import { getWeatherMeta } from '../../utils/weatherApi';
import { resolveWeatherEffectType } from '../WeatherEffectLayer';
import { precipitationIntensity } from '../weather/WeatherParticleCanvas';
import { confirmDialog, notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { useBackToClose } from '../../utils/overlayHistory';
import { IconButton } from '../ui/IconButton';
import { DepartureTicket, TicketStore, daysUntil, formatHours, loadTickets, readCachedTickets, removeTicket, ticketCity } from './departureData';

// Airport terminal (spec 3.2): where a planned trip waits before it becomes a journey.
// Tickets are issued from the New trip sheet. The black split-flap board shows the chosen
// ticket (destination, dates, stay, party, gate); another ticket rolls the board over to it.
// Boarding creates the journey from the ticket and opens it.

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

  const dims = size === 'lg'
    ? 'w-[clamp(15px,min(4.6vw,4vh),40px)] h-[clamp(24px,min(7vw,5.8vh),54px)] text-[clamp(14px,min(4vw,3.3vh),32px)]'
    : 'w-[clamp(14px,min(3.4vw,2.6vh),22px)] h-[clamp(21px,min(4.8vw,3.5vh),30px)] text-[clamp(12px,min(2.7vw,2.1vh),17px)]';
  const color = tone === 'amber' ? 'text-amber-400' : tone === 'red' ? 'text-red-500' : 'text-[#F2F2EE]';
  return (
    <div className="flex gap-[3px]" aria-label={text}>
      {shown.map((ch, i) => (
        <span key={i} className={`tgl-flap relative grid place-items-center rounded-[3px] bg-[#1B1B1F] font-mono font-semibold ${dims} ${color}`}>
          {ch === ' ' ? ' ' : ch}
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

/** "10.09 – 10.12" */
function shortRange(t: DepartureTicket): string {
  if (!t.startDate) return `${t.year}.${String(t.month).padStart(2, '0')} · 일정 미정`;
  const f = (s: string) => s.slice(5).replace('-', '.');
  return `${f(t.startDate)} – ${t.endDate ? f(t.endDate) : ''}`;
}

function ticketStatus(t: DepartureTicket): { text: string; tone: 'ink' | 'amber' | 'red' } {
  if (!t.startDate) return { text: 'PLANNING', tone: 'amber' };
  const days = daysUntil(t.startDate);
  if (days < 0) return { text: 'DEPARTED', tone: 'ink' };
  if (days === 0) return { text: 'BOARDING', tone: 'red' };
  return { text: `D-${days}`, tone: 'amber' };
}

interface DepartureBoardProps {
  onClose: () => void;
  /** Creates the journey from the ticket; the terminal then removes the ticket and closes */
  onBoard: (ticket: DepartureTicket) => Promise<void>;
  /** Opens the New trip sheet; with a ticket, to re-plan it */
  onPlan: (ticket?: DepartureTicket) => void;
  /** Ticket to show first (just issued) */
  initialTicketId?: string;
  isDarkMode?: boolean;
  // Same weather the app ambience shows; undefined draws a clear sky
  weatherCode?: number;
  precipitationProb?: number;
  /** This user's weather location, shown and changed from the top bar */
  weatherCityName?: string;
  weatherCityEn?: string;
  weatherTemp?: number;
}

export function DepartureBoard({
  onClose, onBoard, onPlan, initialTicketId, isDarkMode = true,
  weatherCode, precipitationProb = 0, weatherCityName, weatherCityEn, weatherTemp,
}: DepartureBoardProps) {
  const weatherType = resolveWeatherEffectType(weatherCode, precipitationProb);
  const weatherIntensity = precipitationIntensity(weatherCode, precipitationProb);
  const [store, setStore] = useState<TicketStore>(() => readCachedTickets());
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId ?? null);
  const [rollKey, setRollKey] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [boarding, setBoarding] = useState(false);
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
  const ticket = tickets.find(t => t.id === selectedId) ?? tickets[0] ?? null;
  const city = ticket ? ticketCity(ticket) : undefined;
  const status = ticket ? ticketStatus(ticket) : null;

  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) { onClose(); return; }
    setLeaving(true);
    window.setTimeout(onClose, 420);
  }, [onClose]);

  const select = (t: DepartureTicket) => {
    if (t.id === ticket?.id) return;
    setSelectedId(t.id);
    setRollKey(k => k + 1);
  };

  // Arrival: the chime, then the board rolls to the ticket
  useEffect(() => {
    if (!muted) playChime();
    const t = window.setTimeout(() => setRollKey(k => k + 1), prefersReducedMotion() ? 0 : 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTickets().then(setStore).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {} }, [muted]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const board = async () => {
    if (!ticket?.plan || boarding) return;
    const ok = await confirmDialog(`'${ticket.plan.title}' 여정을 만들까요? 탑승한 티켓은 목록에서 사라집니다.`, { title: 'BOARDING', confirmLabel: '탑승' });
    if (!ok) return;
    setBoarding(true);
    try {
      await onBoard(ticket);
    } catch {
      notify('여정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBoarding(false);
      return;
    }
    // The journey exists now: the ticket has been used
    await removeTicket(ticket.id).catch(() => {});
    onClose();
  };

  const remove = async () => {
    if (!ticket) return;
    if (!(await confirmDialog(`${ticket.cityKo} 티켓을 삭제할까요?`, { title: 'DELETE TICKET', confirmLabel: '삭제' }))) return;
    try {
      setStore(await removeTicket(ticket.id));
      setSelectedId(null);
      setRollKey(k => k + 1);
    } catch {
      notify('티켓을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    }
  };

  const stops = ticket?.cities?.length ? ticket.cities : ticket ? [{ en: ticket.cityEn, ko: ticket.cityKo }] : [];
  const destination = ticket ? (stops.length > 1 ? `${stops[0].en} +${stops.length - 1}` : ticket.cityEn) : 'WELCOME';

  return (
    <div
      role="dialog"
      data-bg-cover
      aria-label="공항 터미널"
      className={`fixed inset-0 z-[190] bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark overflow-hidden ${leaving ? 'tgl-lobby-out' : 'tgl-lobby-in'}`}
    >
      <div className="h-full flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Top bar */}
        <div className="shrink-0 w-full max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[17px] sm:text-[19px] font-extrabold tracking-tight leading-tight">공항 터미널</span>
            <span className={`${label} ${muted} tabular-nums`}>Terminal 1 · ICN {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TerminalWeatherPicker name={weatherCityName} nameEn={weatherCityEn} temp={weatherTemp} code={weatherCode} pop={precipitationProb} />
            <IconButton icon={muted ? VolumeX : Volume2} label={muted ? '소리 켜기' : '소리 끄기'} size="sm" onClick={() => setMuted(m => !m)} />
            <IconButton icon={X} label="닫기" size="sm" onClick={requestClose} />
          </div>
        </div>

        {/* Board, the ticket's actions, then every ticket: two thirds of the height (scrolls inside when short) */}
        <div className={`flex-[2] min-h-0 overflow-y-auto overscroll-contain hide-scrollbar ${leaving ? '' : 'tgl-board-in'}`}>
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-2 flex flex-col gap-3">
            <section aria-label="출발 안내판" className="dark rounded-card bg-[#101012] text-[#F2F2EE] p-3.5 sm:p-4 flex flex-col gap-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              <div className="flex items-end gap-x-3 sm:gap-x-4">
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Flight</span>
                  <FlapRow text={ticket ? ticket.flightNo.replace(' ', '') : 'TG000'} cells={5} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`${label} text-white/55`}>Destination</span>
                  <FlapRow text={destination} cells={11} rollKey={rollKey} size="lg" onFlip={flip} />
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-2.5">
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Departs</span>
                  <FlapRow text={ticket?.startDate ? boardDate(ticket.startDate) : ticket ? `${MONTHS[ticket.month - 1]} ${String(ticket.year).slice(2)}` : ''} cells={6} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Return</span>
                  <FlapRow text={boardDate(ticket?.endDate)} cells={6} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Stay</span>
                  <FlapRow text={ticket?.nights ? `${ticket.nights}N${ticket.nights + 1}D` : ''} cells={4} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Pax</span>
                  <FlapRow text={ticket?.members?.length ? String(ticket.members.length) : ''} cells={2} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Gate</span>
                  <FlapRow text={ticket?.gate || ''} cells={3} rollKey={rollKey} onFlip={flip} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`${label} text-white/55`}>Status</span>
                  <FlapRow text={status?.text || ''} cells={8} rollKey={rollKey} onFlip={flip} tone={status?.tone} />
                </div>
              </div>

              {/* The trip in words: title, route, party */}
              <div className="border-t border-white/10 pt-2.5 flex gap-3 items-center min-h-[48px]">
                {ticket ? (
                  <>
                    {(ticket.plan?.coverImg || city?.coverImage) && (
                      <img src={getEffectiveImageUrl(ticket.plan?.coverImg || city?.coverImage || '')} alt="" loading="lazy" className="w-12 h-12 rounded-thumb object-cover shrink-0" />
                    )}
                    <span key={ticket.id} className="tgl-rise flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] sm:text-[17px] font-extrabold leading-snug line-clamp-2">{ticket.plan?.title || `${ticket.cityKo} 여행`}</span>
                      <span className="text-[13px] text-white/65 truncate">
                        서울 → {stops.map(s => s.ko).join(' → ')}
                        {ticket.members?.length ? ` · ${ticket.members.join(', ')}` : ''}
                      </span>
                      <span className={`${label} text-white/45`}>{formatHours(ticket.hours)} · {ticket.countryKo}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-[14px] text-white/65">New trip에서 여행을 계획하고 티켓을 발권하면 여기에 표시됩니다.</span>
                )}
              </div>
            </section>

            {/* This ticket's actions */}
            {ticket ? (
              <div className="flex items-center gap-2">
                {ticket.plan ? (
                  <button type="button" className="btn btn-accent btn-lg flex-1" onClick={board} disabled={boarding}>
                    <Plane className="w-4 h-4 shrink-0 rotate-45" aria-hidden />
                    {boarding ? '탑승 중' : '탑승 · 여정 만들기'}
                  </button>
                ) : (
                  <button type="button" className="btn btn-accent btn-lg flex-1" onClick={() => onPlan(ticket)}>
                    <Ticket className="w-4 h-4 shrink-0" aria-hidden />
                    일정 정하고 발권
                  </button>
                )}
                {ticket.plan && <IconButton icon={PencilLine} label="다시 계획하기" onClick={() => onPlan(ticket)} disabled={boarding} />}
                <IconButton icon={Trash2} label="티켓 삭제" onClick={remove} disabled={boarding} />
              </div>
            ) : (
              <button type="button" className="btn btn-accent btn-lg w-full" onClick={() => onPlan()}>
                <Plus className="w-4 h-4 shrink-0" aria-hidden />
                New trip
              </button>
            )}

            {/* Every ticket; tapping one rolls the board over to it */}
            {tickets.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`${label} ${muted}`}>My tickets · {tickets.length}</span>
                  <button type="button" onClick={() => onPlan()} className={`inline-flex items-center gap-1 h-8 px-3 rounded-full text-meta font-bold ${muted} hover:text-ink dark:hover:text-ink-dark hover:bg-black/[0.05] dark:hover:bg-white/10`}>
                    <Plus className="w-3.5 h-3.5" aria-hidden />새 티켓
                  </button>
                </div>
                <ul className="flex gap-2 overflow-x-auto hide-scrollbar snap-x rounded-card" aria-label="보관한 티켓">
                  {tickets.map(t => {
                    const on = t.id === ticket?.id;
                    const st = ticketStatus(t);
                    const n = t.cities?.length || 1;
                    return (
                      <li key={t.id} className="snap-start shrink-0">
                        <button
                          type="button"
                          onClick={() => select(t)}
                          aria-pressed={on}
                          className={`w-[216px] h-full flex rounded-card overflow-hidden text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                            on ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'bg-surface dark:bg-surface-dark hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex-1 min-w-0 px-3.5 py-3 flex flex-col gap-0.5">
                            <span className={`${label} ${on ? 'opacity-70' : muted}`}>{t.flightNo} · Gate {t.gate}</span>
                            <span className="text-[19px] font-extrabold tracking-tight uppercase truncate">{t.cityEn}{n > 1 ? ` +${n - 1}` : ''}</span>
                            <span className={`text-meta truncate ${on ? 'opacity-75' : muted}`}>{shortRange(t)}</span>
                          </span>
                          {/* Stub */}
                          <span className={`w-14 border-l-[1.5px] border-dashed flex flex-col items-center justify-center gap-0.5 font-mono ${on ? 'border-white/25 dark:border-black/25' : 'border-black/15 dark:border-white/15'}`}>
                            <span className="text-[13px] font-bold">{MONTHS[t.month - 1]}</span>
                            <span className={`text-micro font-bold ${st.tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : st.tone === 'red' ? 'text-red-600 dark:text-red-400' : on ? 'opacity-70' : muted}`}>{t.startDate ? st.text : 'TBD'}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* The lobby below, one third of the height, in a rounded window with the page's side margins */}
        <div className="flex-[1] min-h-[120px] w-full max-w-5xl mx-auto px-4 sm:px-6 pt-1" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="tgl-lobby-scene relative h-full rounded-card overflow-hidden">
          <LobbyScene isDarkMode={isDarkMode} weatherType={weatherType} intensity={weatherIntensity} />
          {skyNote && (
            <div key={skyNote} role="status" className="tgl-rise absolute left-1/2 -translate-x-1/2 top-[14%] px-3 h-8 inline-flex items-center gap-2 rounded-full bg-[#0B0B0C]/80 text-white font-mono text-meta tracking-wider pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {skyNote}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
