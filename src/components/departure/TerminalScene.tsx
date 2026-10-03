import { useEffect, useMemo, useState } from 'react';
import { artSrc } from '../../art/Art';
import { BearRide } from '../../art/bear/Bear';
import { WeatherParticleCanvas } from '../weather/WeatherParticleCanvas';
import type { WeatherEffectType } from '../WeatherEffectLayer';
import { inferAirportCode } from '../../utils/bookingDeepLinks';
import { daysUntil, ticketStatus, type DepartureTicket } from './departureData';

// The terminal's window: the airport lobby with the bears waiting at the gate, filling a rounded window that has the
// picture's own proportions, with the weather outside falling over it. The picture stays as drawn; what moves is outside
// and on the departure board: now and then a plane takes off beyond the glass, and the board's three rows are the
// member's own tickets (the counter's first, then the nearest), flipping like a split-flap board when they change.
// With no tickets the board keeps the picture's own rows. (2026.10.03: the vector bear that walked across the floor is
// gone; it never matched the drawing's bears in size or line.)

interface TerminalSceneProps {
  isDarkMode: boolean;
  weatherType: WeatherEffectType;
  intensity: number;
  /** The member's tickets and the one on the counter, for the departure board */
  tickets?: DepartureTicket[];
  activeId?: string;
}

// Where the board's rows are in the picture (1200 × 896): x 412–801, y 179–280
const BOARD = { left: '34.33%', top: '19.98%', width: '32.42%', height: '11.27%' };
// Column starts and the separators between them, as a share of the rows' width (measured from the drawing)
const COLS = ['2.6%', '29%', '47.8%', '65.8%'];
const SEPS = ['25.7%', '44.5%', '63.2%'];
const ROWS = 3;
const CYCLE_MS = 6000;

const STATUS_TONE = { amber: '#F5CE57', red: '#EE6B4F', ink: '#F2EFE6' } as const;

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
    if (pages < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setPage(p => (p + 1) % pages), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [pages]);
  if (!list.length) return null;
  const shown = list.slice(page * ROWS, page * ROWS + ROWS);
  return (
    <div
      className="absolute bg-[#3A3731] text-[#F2EFE6] font-mono font-bold uppercase leading-none flex flex-col overflow-hidden"
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

export function TerminalScene({ isDarkMode, weatherType, intensity, tickets = [], activeId }: TerminalSceneProps) {
  return (
    <div className="absolute inset-0 bg-butter dark:bg-butter-dark overflow-hidden [container-type:size]">
      <img
        src={artSrc('terminal-airport')}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover select-none"
      />
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <BearRide vehicle="flight" className="tgl-term-plane absolute" />
      </div>
      <DepartureRows tickets={tickets} activeId={activeId} />
      <div className="absolute inset-0 pointer-events-none">
        <WeatherParticleCanvas type={weatherType} intensity={intensity} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
