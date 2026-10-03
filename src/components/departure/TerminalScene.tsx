import { useEffect, useMemo, useRef, useState } from 'react';
import { WeatherParticleCanvas } from '../weather/WeatherParticleCanvas';
import type { WeatherEffectType } from '../WeatherEffectLayer';
import { inferAirportCode } from '../../utils/bookingDeepLinks';
import { getSolarAltitude } from '../../utils/solarTerminator';
import { prefersReducedMotion } from '../../motion';
import { daysUntil, ticketStatus, type DepartureTicket } from './departureData';

// The terminal's window (v1.3.8): the lobby picture with its sky cut out (scripts/art/terminal.py), so what is beyond
// the glass is the app's own. From back to front:
//   1. the sky, by the sun's height at the member's weather city (dawn, day, dusk, night) and greyed by cloud,
//      with the sun or the moon, stars at night, drifting clouds and planes crossing it
//   2. the lobby picture; its frames, signs and board cover whatever passes behind them
//   3. the outside tint (night, dusk, overcast, fog) and rain or snow, both cut to the glass by the outside mask
//   4. the departure board's rows (the member's tickets), flipping like a split-flap board
//   5. bears pulling suitcases across the floor, each from either side at its own pace, now and then stopping

interface TerminalSceneProps {
  isDarkMode: boolean;
  weatherType: WeatherEffectType;
  intensity: number;
  /** The weather city, for the time of day outside; without it the device's own clock is used */
  lat?: number;
  lng?: number;
  /** The member's tickets and the one on the counter, for the departure board */
  tickets?: DepartureTicket[];
  activeId?: string;
}

const LOBBY = '/art/terminal-lobby.webp';
const OUTSIDE = '/art/terminal-outside.webp';
const BEAR = '/art/bear-suitcase.webp';

// Where the board's rows are in the picture (2000 × 1493): x 687–1334, y 296–464
const BOARD = { left: '34.35%', top: '19.83%', width: '32.35%', height: '11.25%' };
// Column starts and the separators between them, as a share of the rows' width (measured from the drawing)
const COLS = ['2.5%', '28.7%', '47.9%', '66.3%'];
const SEPS = ['25.2%', '44.5%', '63.1%'];
const ROWS = 3;
const CYCLE_MS = 6000;

const STATUS_TONE = { amber: '#F5CE57', red: '#EE6B4F', ink: '#F2EFE6' } as const;

// ─── Sky ────────────────────────────────────────────────────────────────────────────────────────────────────────────

type Phase = 'night' | 'dawn' | 'day' | 'dusk';

function skyPhase(lat: number | undefined, lng: number | undefined, now: Date): Phase {
  if (lat === undefined || lng === undefined) {
    const h = now.getHours();
    return h < 5 || h >= 20 ? 'night' : h < 7 ? 'dawn' : h >= 18 ? 'dusk' : 'day';
  }
  const alt = getSolarAltitude(lat, lng, now);
  if (alt < -7) return 'night';
  if (alt > 7) return 'day';
  // Low sun: rising or setting, by where it will be in ten minutes
  return getSolarAltitude(lat, lng, new Date(now.getTime() + 600000)) > alt ? 'dawn' : 'dusk';
}

const SKY: Record<Phase, [string, string]> = {
  day: ['#8FCBEE', '#D4ECF9'],
  dawn: ['#8DA9D6', '#F6C9A8'],
  dusk: ['#5E6FA8', '#F2A27E'],
  night: ['#0D1630', '#27365E'],
};
const OVERCAST: Record<Phase, [string, string]> = {
  day: ['#AEB9C2', '#D9DEE2'],
  dawn: ['#A3A8B8', '#D8C9C0'],
  dusk: ['#7E8299', '#C6AA9F'],
  night: ['#161B26', '#2C3240'],
};

/** How much the glass is tinted for the outside light, and with what (multiplied over the picture's daylight) */
function outsideTint(phase: Phase, wx: WeatherEffectType): { color: string; opacity: number } | null {
  if (phase === 'night') return { color: '#1B2550', opacity: 0.78 };
  if (phase === 'dusk') return { color: '#C7744F', opacity: 0.38 };
  if (phase === 'dawn') return { color: '#C99A8A', opacity: 0.3 };
  if (wx === 'storm') return { color: '#5D6676', opacity: 0.5 };
  if (wx === 'rain' || wx === 'clouds' || wx === 'snow') return { color: '#8C96A3', opacity: 0.32 };
  return null;
}

const CLOUD_COUNT: Record<WeatherEffectType, number> = { clear: 1, fair: 3, clouds: 5, fog: 4, rain: 5, snow: 4, storm: 6 };
// Fixed cloud lanes (top %, size %, seconds to cross, start offset) so the sky is the same on every render
const CLOUD_LANES = [
  [6, 22, 140, 0.1], [18, 30, 170, 0.55], [2, 26, 155, 0.8], [26, 18, 120, 0.3], [11, 34, 190, 0.95], [22, 24, 135, 0.65],
] as const;

function Cloud({ grey }: { grey: boolean }) {
  const fill = grey ? '#E6E9EC' : '#FFFFFF';
  return (
    <svg viewBox="0 0 120 44" className="w-full h-auto" aria-hidden>
      <g fill={fill}>
        <ellipse cx="34" cy="30" rx="26" ry="13" />
        <ellipse cx="60" cy="22" rx="24" ry="18" />
        <ellipse cx="86" cy="30" rx="26" ry="12" />
        <rect x="14" y="30" width="92" height="12" rx="6" />
      </g>
    </svg>
  );
}

/** A side view of an airliner like the ones on the apron: white, an orange stripe and tail */
function Airliner({ night }: { night: boolean }) {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-auto overflow-visible" aria-hidden>
      <path d="M6 22 L14 6 L22 6 L30 19 Z" fill={night ? '#3A4058' : '#EE7A55'} />
      <path d="M10 24 C10 19 16 18 24 18 L96 18 C108 18 116 21 116 25 C116 29 108 31 96 31 L24 31 C16 31 10 29 10 24 Z" fill={night ? '#5B6178' : '#FFFFFF'} />
      <path d="M24 28 L104 28 C100 30 98 31 96 31 L24 31 Z" fill={night ? '#3A4058' : '#EE7A55'} />
      <path d="M50 26 L72 26 L58 38 L50 38 Z" fill={night ? '#454B63' : '#D8DCE2'} />
      {!night && <g fill="#7C8AA0">{Array.from({ length: 11 }, (_, i) => <rect key={i} x={30 + i * 6.4} y="21.5" width="3" height="3" rx="1.2" />)}</g>}
      {night && (
        <>
          <circle cx="12" cy="7" r="1.8" fill="#F2EFE6" className="tgl-term-blink" />
          <circle cx="60" cy="37" r="1.6" fill="#EE5A4F" className="tgl-term-blink" style={{ animationDelay: '.6s' }} />
        </>
      )}
    </svg>
  );
}

function Sky({ phase, wx }: { phase: Phase; wx: WeatherEffectType }) {
  const grey = wx === 'clouds' || wx === 'rain' || wx === 'storm' || wx === 'snow' || wx === 'fog';
  const [top, bottom] = (grey ? OVERCAST : SKY)[phase];
  const night = phase === 'night';
  const clouds = CLOUD_LANES.slice(0, CLOUD_COUNT[wx]);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 44%, ${bottom} 100%)` }} aria-hidden>
      {night && !grey && <div className="absolute inset-x-0 top-0 h-[44%] tgl-term-stars" />}
      {!grey && (phase === 'day' || night) && (
        <span
          className="absolute rounded-full"
          style={night
            ? { left: '72%', top: '12%', width: '4.2%', aspectRatio: '1', background: '#F4EFDD', boxShadow: '0 0 18px 4px rgba(244,239,221,.35)' }
            : { left: '14%', top: '9%', width: '6%', aspectRatio: '1', background: '#FFF6D8', boxShadow: '0 0 30px 12px rgba(255,246,216,.7)' }}
        />
      )}
      {!grey && (phase === 'dawn' || phase === 'dusk') && (
        <span className="absolute rounded-full" style={{ left: phase === 'dawn' ? '20%' : '64%', top: '36%', width: '7%', aspectRatio: '1', background: '#FFD9A0', boxShadow: '0 0 34px 14px rgba(255,190,140,.55)' }} />
      )}
      {clouds.map(([t, size, secs, start], i) => (
        <div
          key={i}
          className="absolute left-0 tgl-term-cloud"
          style={{ top: `${t}%`, width: `${size}%`, opacity: night ? 0.16 : grey ? 0.95 : 0.85, animationDuration: `${secs}s`, animationDelay: `${-secs * start}s` }}
        >
          <Cloud grey={grey && !night} />
        </div>
      ))}
      {/* Planes beyond the glass: one climbing away from the runway, one far off cruising the other way */}
      <div className="absolute tgl-term-climb" style={{ width: '11%' }}><Airliner night={night} /></div>
      <div className="absolute tgl-term-cruise" style={{ width: '5%' }}><div className="-scale-x-100"><Airliner night={night} /></div></div>
    </div>
  );
}

// ─── Departure board ────────────────────────────────────────────────────────────────────────────────────────────────

function boardRows(tickets: DepartureTicket[], activeId?: string): DepartureTicket[] {
  const live = tickets.filter((t, i, all) => all.findIndex(x => x.id === t.id) === i && !(t.startDate && daysUntil(t.startDate) < 0));
  const near = (t: DepartureTicket) => (t.startDate ? daysUntil(t.startDate) : 9999);
  return [...live].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : near(a) - near(b)));
}

function DepartureRows({ tickets, activeId }: { tickets: DepartureTicket[]; activeId?: string }) {
  const list = useMemo(() => boardRows(tickets, activeId), [tickets, activeId]);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(list.length / ROWS));
  useEffect(() => {
    setPage(0);
    if (pages < 2 || prefersReducedMotion()) return;
    const id = window.setInterval(() => setPage(p => (p + 1) % pages), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [pages]);
  if (!list.length) return null;
  const shown = list.slice(page * ROWS, page * ROWS + ROWS);
  return (
    <div
      className="absolute bg-[#3D3834] text-[#F2EFE6] font-mono font-bold uppercase leading-none flex flex-col overflow-hidden"
      style={{ ...BOARD, fontSize: '2.3cqh' }}
      aria-label="출발 안내"
    >
      {Array.from({ length: ROWS }, (_, i) => {
        const t = shown[i];
        const st = t ? ticketStatus(t) : null;
        const cells = t ? [t.flightNo.replace(/\s+/g, ''), (inferAirportCode(t.cityEn) || t.cityEn.slice(0, 3)).toUpperCase(), t.gate, st!.text] : null;
        return (
          <div key={t ? `${t.id}-${st!.text}-${page}` : `empty-${i}`} className="tgl-boardrow relative flex-1" style={{ animationDelay: `${i * 90}ms` }}>
            {SEPS.map(x => <i key={x} className="absolute top-[22%] bottom-[22%] w-px bg-[#8A877F]/70" style={{ left: x }} />)}
            {cells?.map((c, k) => (
              <span key={k} className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap" style={{ left: COLS[k], color: k === 3 ? STATUS_TONE[st!.tone] : undefined }}>{c}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bears on the floor ─────────────────────────────────────────────────────────────────────────────────────────────

// Two lanes on the floor in front of the seats: the far one smaller. Feet at `floor` % of the scene's height.
const LANES = [
  { floor: 88.5, height: 22, z: 1 },
  { floor: 98, height: 28, z: 2 },
] as const;
const BEAR_ASPECT = 284 / 300;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** One bear crossing its lane again and again: from either side, at its own pace, sometimes stopping on the way */
function Walker({ lane, active, firstDelay }: { lane: (typeof LANES)[number]; active: boolean; firstDelay: number }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const body = bodyRef.current;
    if (!outer || !body || !active) return;
    let timer = 0;
    let anim: Animation | null = null;
    let stopped = false;
    const offW = lane.height * BEAR_ASPECT * (896 / 1200) + 2; // the bear's width in % of the scene's width, plus room

    const walk = () => {
      if (stopped) return;
      const east = Math.random() < 0.5;
      const from = east ? -offW : 100 + 2;
      const to = east ? 100 + 2 : -offW;
      const pace = rand(0.75, 1.35);                 // 1 = an easy stroll
      const ms = Math.round(14000 / pace);
      const stops = Math.random() < 0.45;
      const stopAt = rand(0.3, 0.65);
      const stopMs = stops ? rand(1400, 3200) : 0;
      const total = ms + stopMs;
      const mid = from + (to - from) * stopAt;
      const keyframes: Keyframe[] = stops
        ? [
            { left: `${from}%`, offset: 0 },
            { left: `${mid}%`, offset: (ms * stopAt) / total },
            { left: `${mid}%`, offset: (ms * stopAt + stopMs) / total },
            { left: `${to}%`, offset: 1 },
          ]
        : [{ left: `${from}%` }, { left: `${to}%` }];
      outer.style.transform = east ? 'none' : 'scaleX(-1)';
      outer.style.visibility = 'visible';
      body.style.animationDuration = `${Math.round(620 / pace)}ms`;
      body.classList.add('tgl-term-waddle');
      anim = outer.animate(keyframes, { duration: total, easing: 'linear', fill: 'forwards' });
      if (stops) {
        const pauseAt = ms * stopAt;
        window.setTimeout(() => { if (!stopped) body.classList.remove('tgl-term-waddle'); }, pauseAt);
        window.setTimeout(() => { if (!stopped) body.classList.add('tgl-term-waddle'); }, pauseAt + stopMs);
      }
      anim.onfinish = () => {
        body.classList.remove('tgl-term-waddle');
        outer.style.visibility = 'hidden';
        timer = window.setTimeout(walk, rand(1500, 7000));
      };
    };
    timer = window.setTimeout(walk, firstDelay);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      anim?.cancel();
      body.classList.remove('tgl-term-waddle');
      outer.style.visibility = 'hidden';
    };
  }, [active, lane, firstDelay]);

  return (
    <div
      ref={outerRef}
      className="absolute pointer-events-none"
      style={{ bottom: `${100 - lane.floor}%`, height: `${lane.height}%`, aspectRatio: `${BEAR_ASPECT}`, zIndex: lane.z, visibility: 'hidden', left: '-40%' }}
      aria-hidden
    >
      <div ref={bodyRef} className="w-full h-full origin-bottom">
        <img src={BEAR} alt="" draggable={false} decoding="async" className="w-full h-full select-none" />
      </div>
    </div>
  );
}

/** With reduced motion: one bear standing by the seats */
function StillBear() {
  const lane = LANES[1];
  return (
    <div className="absolute pointer-events-none" style={{ left: '30%', bottom: `${100 - lane.floor}%`, height: `${lane.height}%`, aspectRatio: `${BEAR_ASPECT}` }} aria-hidden>
      <img src={BEAR} alt="" draggable={false} decoding="async" className="w-full h-full select-none" />
    </div>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** True while the scene is on screen and the tab is visible, so nothing moves unseen */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [ref]);
  return seen && tabVisible;
}

export function TerminalScene({ isDarkMode, weatherType, intensity, lat, lng, tickets = [], activeId }: TerminalSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const live = useOnScreen(rootRef);
  const still = useMemo(() => prefersReducedMotion(), []);
  // The glass tints are cut to the picture; until the picture is drawn, only the butter ground shows
  const [ready, setReady] = useState(false);

  // The time of day outside, checked once a minute
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const phase = skyPhase(lat, lng, now);
  const tint = outsideTint(phase, weatherType);
  const falling = weatherType === 'rain' || weatherType === 'storm' || weatherType === 'snow';
  const glass = { WebkitMaskImage: `url(${OUTSIDE})`, maskImage: `url(${OUTSIDE})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } as const;

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 bg-butter dark:bg-butter-dark overflow-hidden [container-type:size] ${live && !still ? '' : 'tgl-term-paused'}`}
    >
      <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <Sky phase={phase} wx={weatherType} />
      <img src={LOBBY} alt="" draggable={false} decoding="async" onLoad={() => setReady(true)} className="absolute inset-0 w-full h-full select-none" />
      {tint && <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ ...glass, background: tint.color, opacity: tint.opacity }} />}
      {phase === 'night' && <div className="absolute inset-x-0 top-0 h-[16%] pointer-events-none tgl-term-lamps" />}
      {weatherType === 'fog' && <div className="absolute inset-0 pointer-events-none" style={{ ...glass, background: 'rgba(236,238,240,.55)' }} />}
      {falling && (
        <div className="absolute inset-0 pointer-events-none" style={glass}>
          <WeatherParticleCanvas type={weatherType} intensity={intensity} isDarkMode={isDarkMode} />
        </div>
      )}
      <DepartureRows tickets={tickets} activeId={activeId} />
      {still ? <StillBear /> : LANES.map((l, i) => <Walker key={i} lane={l} active={live && ready} firstDelay={i === 0 ? 600 : 4200} />)}
      </div>
    </div>
  );
}
