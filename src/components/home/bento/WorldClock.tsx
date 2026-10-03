import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Moon, Sun } from 'lucide-react';
import type { CityWeatherConfig } from '../../../types';
import { searchCities, useMyCities } from '../../../utils/myCities';
import { cleanCityDisplayName } from '../../../utils/weatherApi';
import { useHomeWidgets, type ClockStyle } from '../../../utils/homeWidgetPrefs';
import { CURRENT_LOCATION_EN } from '../../../utils/userPrefs';

// World clock (v1.3.8): the home's world-time cube and the clocks the member can pick from. Three faces:
//  - analog: a light dial with all twelve numbers, hairline minute marks, slim hands that stay readable over the numbers
//    (each hand has a halo of the dial's colour) and a red second hand; the city and the digital time sit above it
//  - digital: a pocket digital watch, seven-segment digits on a pale green LCD (a dark green backlight at night)
//  - dial: a 24 hour ring that shows the day and the night of that place, the time large in the middle
// Text never lies on a face: the city, the time and the offset have their own row or corner outside the circle.
// One city fills the cube; with "all together" on, two to four cities share it. The detail sheet draws its options with
// these same components, scaled down, so what is chosen is what the cube shows.

export const CLOCK_STYLES: { id: ClockStyle; label: string }[] = [
  { id: 'analog', label: '아날로그' },
  { id: 'digital', label: '디지털' },
  { id: 'dial', label: '다이얼' },
];

export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const WEEKDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAY_EN: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface Zone { h: number; m: number; s: number; day: number; month: number; date: number; night: boolean }

export function zoneOf(tz: string, now: Date): Zone {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const o: Record<string, string> = {};
  f.formatToParts(now).forEach(p => { o[p.type] = p.value; });
  const h = parseInt(o.hour, 10) % 24;
  return { h, m: parseInt(o.minute, 10), s: parseInt(o.second, 10), day: WEEKDAY_EN[o.weekday] ?? 0, month: parseInt(o.month, 10), date: parseInt(o.day, 10), night: h >= 19 || h < 6 };
}

/** Hours a place is ahead of (+) or behind (-) the home city */
export function hoursFrom(tz: string, base: string, now: Date): number {
  const at = (z: string) => new Date(now.toLocaleString('en-US', { timeZone: z })).getTime();
  return Math.round((at(tz) - at(base)) / 3600000);
}

const two = (n: number) => String(n).padStart(2, '0');

/** "12:03" in a time zone */
export function zonedTime(tz: string, now: Date): string {
  const z = zoneOf(tz, now);
  return `${two(z.h)}:${two(z.m)}`;
}
const diffText = (d: number) => (d === 0 ? '0h' : `${d > 0 ? '+' : ''}${d}h`);

// ── the cities and the choices (saved with the home tiles) ──

export function useClockSetup(nextCity?: string) {
  const { main, favorites } = useMyCities();
  const w = useHomeWidgets();
  const favKey = favorites.map(f => f.nameEn).join('|');
  // Here is the device's own time zone, always known; the member's cities (main, favourites, the next trip's city) are
  // a list of their own
  const current = useMemo<CityWeatherConfig>(() => ({ name: '현재 위치', nameEn: CURRENT_LOCATION_EN, country: '', lat: 0, lng: 0, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }), []);
  const cities = useMemo(() => {
    const list: CityWeatherConfig[] = [];
    const add = (c?: CityWeatherConfig | null) => { if (c && c.timezone && c.nameEn !== CURRENT_LOCATION_EN && !list.some(x => x.nameEn === c.nameEn)) list.push(c); };
    add(main);
    favorites.forEach(add);
    add(nextCity ? searchCities(nextCity, 1)[0] : undefined);
    ['TOKYO', 'PARIS', 'NEW YORK', 'LONDON'].forEach(n => { if (list.length < 4) add(searchCities(n, 1)[0]); });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main, favKey, nextCity]);
  const all = useMemo(() => [current, ...cities], [current, cities]);

  const multi = !!w.clockMulti;
  const selected = useMemo(() => {
    const picked = (w.clockCities || []).map(n => all.find(c => c.nameEn === n)).filter((c): c is CityWeatherConfig => !!c);
    const base = picked.length ? picked : [cities.find(c => c.nameEn === main.nameEn) ?? cities[0] ?? current];
    if (!multi) return base.slice(0, 1);
    const out = base.slice(0, 4);
    for (const c of all) { if (out.length >= 2) break; if (!out.includes(c)) out.push(c); }
    return out;
  }, [all, cities, current, w.clockCities, multi, main.nameEn]);

  return { main, current, cities, all, selected, multi, style: (w.clockStyle || 'analog') as ClockStyle, nextCityEn: nextCity ? searchCities(nextCity, 1)[0]?.nameEn : undefined };
}

// ── seven segments ──

const SEG: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };
const hBar = (x0: number, x1: number, y: number) => `${x0},${y} ${x0 + 5},${y - 5} ${x1 - 5},${y - 5} ${x1},${y} ${x1 - 5},${y + 5} ${x0 + 5},${y + 5}`;
const vBar = (x: number, y0: number, y1: number) => `${x},${y0} ${x + 5},${y0 + 5} ${x + 5},${y1 - 5} ${x},${y1} ${x - 5},${y1 - 5} ${x - 5},${y0 + 5}`;
const SEG_POINTS: Record<string, string> = {
  a: hBar(7, 43, 5), g: hBar(7, 43, 45), d: hBar(7, 43, 85),
  f: vBar(5, 7, 43), b: vBar(45, 7, 43), e: vBar(5, 47, 83), c: vBar(45, 47, 83),
};
const DIGIT_W = 56;
const COLON_W = 22;

/** Seven-segment text ("14:20"): lit segments solid, unlit ones faint, leaning a little like a watch face */
export function Seg7({ text, className = '', lean = true }: { text: string; className?: string; lean?: boolean }) {
  let x = 0;
  const nodes: React.ReactNode[] = [];
  [...text].forEach((ch, i) => {
    if (ch === ':') {
      nodes.push(<g key={i} transform={`translate(${x}, 0)`}><rect x={7} y={26} width={9} height={9} /><rect x={7} y={57} width={9} height={9} /></g>);
      x += COLON_W;
      return;
    }
    const on = SEG[ch] ?? '';
    nodes.push(
      <g key={i} transform={`translate(${x}, 0)`}>
        {Object.entries(SEG_POINTS).map(([k, pts]) => <polygon key={k} points={pts} fillOpacity={on.includes(k) ? 1 : 0.09} />)}
      </g>,
    );
    x += DIGIT_W;
  });
  return (
    <svg viewBox={`0 0 ${x} 90`} className={className} fill="currentColor" role="img" aria-label={text} preserveAspectRatio="xMidYMid meet" style={lean ? { transform: 'skewX(-7deg)' } : undefined}>
      {nodes}
    </svg>
  );
}

// ── faces (they draw in a 100 x 100 box and take their colours from `.tgl-clock`, see index.css) ──

const halo = { stroke: 'var(--clock-ground)' } as React.CSSProperties;

function AnalogDial({ z, mini = false, className = '' }: { z: Zone; mini?: boolean; className?: string }) {
  const hr = ((z.h % 12) + z.m / 60) * 30;
  const mn = (z.m + z.s / 60) * 6;
  const sc = z.s * 6;
  // Minute marks live on the rim and the numbers inside them, so the two never touch
  const marks: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    if (mini) {
      if (hour) marks.push(<line key={i} x1="50" y1="4.5" x2="50" y2="13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 6} 50 50)`} />);
    } else {
      marks.push(<line key={i} x1="50" y1={hour ? 4.2 : 4.8} x2="50" y2={hour ? 8.6 : 7.4} stroke="currentColor" strokeOpacity={hour ? 0.95 : 0.4} strokeWidth={hour ? 1.6 : 0.8} strokeLinecap="butt" transform={`rotate(${i * 6} 50 50)`} />);
    }
  }
  const numerals: React.ReactNode[] = [];
  if (!mini) {
    for (let n = 1; n <= 12; n++) {
      const a = (n * 30 * Math.PI) / 180;
      numerals.push(
        <text key={n} x={50 + 35.6 * Math.sin(a)} y={50 - 35.6 * Math.cos(a) + 4.4} textAnchor="middle" fontSize="12.6" fontWeight="800" fill="currentColor" fontFamily="inherit" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</text>,
      );
    }
  }
  const hourLen = mini ? 24 : 21;
  const minLen = mini ? 37 : 30;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${two(z.h)}:${two(z.m)}`}>
      <circle cx="50" cy="50" r="49" fill="var(--clock-ground)" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.6" />
      {marks}
      {numerals}
      {/* each hand sits on a halo of the dial's colour, so a number under it never muddies it */}
      <g transform={`rotate(${hr} 50 50)`}>
        <line x1="50" y1="55" x2="50" y2={50 - hourLen} strokeWidth={mini ? 9 : 7.6} strokeLinecap="round" style={halo} />
        <line x1="50" y1="55" x2="50" y2={50 - hourLen} stroke="currentColor" strokeWidth={mini ? 5.6 : 4.6} strokeLinecap="round" />
      </g>
      <g transform={`rotate(${mn} 50 50)`}>
        <line x1="50" y1="57" x2="50" y2={50 - minLen} strokeWidth={mini ? 7 : 5.4} strokeLinecap="round" style={halo} />
        <line x1="50" y1="57" x2="50" y2={50 - minLen} stroke="currentColor" strokeWidth={mini ? 3.6 : 2.7} strokeLinecap="round" />
      </g>
      {!mini && (
        <g transform={`rotate(${sc} 50 50)`}>
          <line x1="50" y1="60" x2="50" y2="11" stroke="#DC2626" strokeWidth="1" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.6" fill="#DC2626" />
        </g>
      )}
      {mini && <circle cx="50" cy="50" r="3" fill="#DC2626" />}
    </svg>
  );
}

function DayDial({ z, mini = false, className = '' }: { z: Zone; mini?: boolean; className?: string }) {
  // 24 hours round: noon at the top, midnight at the bottom. The night is the heavier part of the ring, the red dot is now.
  const R = 43;
  const rad = (h: number) => (((h / 24) * 360 + 180 - 90) * Math.PI) / 180;
  const at = (h: number, r = R) => ({ x: 50 + r * Math.cos(rad(h)), y: 50 + r * Math.sin(rad(h)) });
  const arc = (h0: number, h1: number, width: number, op: number) => {
    const p0 = at(h0), p1 = at(h1);
    return <path d={`M${p0.x} ${p0.y} A${R} ${R} 0 ${((h1 - h0 + 24) % 24) > 12 ? 1 : 0} 1 ${p1.x} ${p1.y}`} fill="none" stroke="currentColor" strokeOpacity={op} strokeWidth={width} strokeLinecap="butt" />;
  };
  const now = at(z.h + z.m / 60);
  const ticks: React.ReactNode[] = [];
  if (!mini) {
    for (let h = 0; h < 24; h++) {
      const major = h % 6 === 0;
      const o = at(h, R - 3.4), i2 = at(h, R - (major ? 6.9 : 5.6));
      ticks.push(<line key={h} x1={o.x} y1={o.y} x2={i2.x} y2={i2.y} stroke="currentColor" strokeOpacity={major ? 0.7 : 0.3} strokeWidth={major ? 1.3 : 0.8} />);
    }
  }
  const labels = mini ? [] : [[12, '12'], [18, '18'], [0, '0'], [6, '6']] as [number, string][];
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${two(z.h)}:${two(z.m)}`}>
      {arc(6, 19, 5, 0.16)}
      {arc(19, 30, 5, 0.62)}
      {ticks}
      {labels.map(([h, t]) => {
        const p = at(h, 30.5);
        return <text key={t} x={p.x} y={p.y + 2.9} textAnchor="middle" fontSize="7.8" fontWeight="700" fill="currentColor" fillOpacity="0.55" fontFamily="'IBM Plex Mono', ui-monospace, monospace">{t}</text>;
      })}
      <circle cx={now.x} cy={now.y} r={mini ? 7.5 : 6} fill="#DC2626" stroke="var(--clock-ground)" strokeWidth="2.6" />
      {!mini && (
        <>
          <text x="50" y="53.5" textAnchor="middle" fontSize="15.2" fontWeight="800" fill="currentColor" fontFamily="'IBM Plex Mono', ui-monospace, monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>{two(z.h)}:{two(z.m)}</text>
          <text x="50" y="64" textAnchor="middle" fontSize="6.4" fontWeight="700" fill="currentColor" fillOpacity="0.6" fontFamily="'IBM Plex Mono', ui-monospace, monospace" letterSpacing="0.8">{z.night ? 'NIGHT' : 'DAY'}</text>
        </>
      )}
    </svg>
  );
}

/** The ground a clock wears: analog and dial go dark at night, the digital one is always its LCD */
export function clockGround(style: ClockStyle, night: boolean): string {
  if (style === 'digital') return night ? 'bg-[#0E2B29] text-[#8FF0D2]' : 'bg-[#C9D3BC] text-[#1F2A1B] dark:bg-[#0E2B29] dark:text-[#8FF0D2]';
  return night ? 'bg-[#1B2438] text-[#E8EDF7]' : 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark';
}

const lbl = 'font-mono text-[10.5px] font-bold tabular-nums leading-none';

/** LCD annunciators: every word is on the glass, the lit one is dark and the other only a ghost, as on a pocket watch */
function Annunciators({ items, active }: { items: string[]; active: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-extrabold leading-none tracking-wide">
      {items.map(it => <span key={it} style={{ opacity: it === active ? 1 : 0.14 }}>{it}</span>)}
    </span>
  );
}


/** One city's clock filling its whole cube (or the whole square given to it) */
export function SingleClock({ city, base, style, now }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const name = cleanCityDisplayName(city.name);
  const diff = diffText(hoursFrom(tz, base, now));
  const date = `${two(z.month)}.${two(z.date)}`;

  if (style === 'digital') {
    return (
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
        <span className="flex items-center gap-1 text-[13px] font-extrabold tracking-tight pr-8 min-w-0">
          {city.nameEn === CURRENT_LOCATION_EN && <LocateFixed className="w-3 h-3 shrink-0" aria-hidden />}
          <span className="truncate">{name}</span>
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between font-mono text-[11px] font-bold leading-none opacity-80">
            <span>{WEEKDAY[z.day]} {date}</span>
            <Annunciators items={['AM', 'PM']} active={z.h >= 12 ? 'PM' : 'AM'} />
          </div>
          <div className="flex items-end gap-1.5">
            <Seg7 text={`${two(z.h)}:${two(z.m)}`} className="flex-1 min-w-0 h-[64px]" />
            <Seg7 text={two(z.s)} className="w-[36px] h-[28px] shrink-0" />
          </div>
          <div className="flex items-center justify-between font-mono text-[10.5px] font-bold leading-none opacity-70">
            <span>{diff}</span>
            <Annunciators items={['DAY', 'NIGHT']} active={z.night ? 'NIGHT' : 'DAY'} />
          </div>
        </div>
      </div>
    );
  }

  // Analog and dial: the circle sits in the middle of the cube, a little smaller than it. The four corners are outside
  // a circle that size, so the city, the time (or the date), the offset and the arrow button have their place there.
  const face = style === 'analog' ? <AnalogDial z={z} className="w-full h-full" /> : <DayDial z={z} className="w-full h-full" />;
  return (
    <div className="absolute inset-0">
      <div className="absolute" style={{ left: '11%', top: '11%', width: '78%', height: '78%' }}>{face}</div>
      <span className="absolute top-3 left-3.5 flex items-center gap-1 text-[13px] font-extrabold tracking-tight max-w-[44%] leading-none">
        {city.nameEn === CURRENT_LOCATION_EN
          ? <LocateFixed className="w-3 h-3 shrink-0" aria-label="현재 위치" />
          : z.night ? <Moon className="w-3 h-3 shrink-0 opacity-70" aria-label="밤" /> : <Sun className="w-3 h-3 shrink-0 opacity-70" aria-label="낮" />}
        <span className="truncate">{name}</span>
      </span>
      <span className={`absolute bottom-3 left-3.5 ${lbl} text-[11px] opacity-80`}>{style === 'analog' ? `${two(z.h)}:${two(z.m)}` : `${WEEKDAY[z.day]} ${date}`}</span>
      <span className={`absolute bottom-3 right-3.5 ${lbl} text-[11px] opacity-80`}>{diff}</span>
    </div>
  );
}

/** One row of the list: a small face, the city and its offset, the time at the right */
function RowClock({ city, base, style, now }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const d = hoursFrom(tz, base, now);
  const dark = z.night;
  return (
    <div className={`tgl-clock min-w-0 min-h-0 rounded-[14px] px-2 py-1.5 flex items-center gap-2.5 ${dark ? 'bg-[#1B2438] text-[#E8EDF7]' : 'bg-black/[0.045] dark:bg-white/[0.06]'}`} data-night={dark ? '' : undefined}>
      <div className="h-full aspect-square shrink-0 max-h-[64px]">
        {style === 'analog' ? <AnalogDial z={z} mini className="w-full h-full" /> : <DayDial z={z} mini className="w-full h-full" />}
      </div>
      <span className="min-w-0 flex-1 flex flex-col justify-center">
        <b className="text-[13px] font-extrabold leading-tight truncate">{cleanCityDisplayName(city.name)}</b>
        <span className={`${lbl} opacity-65 mt-0.5`}>{d === 0 ? '시차 없음' : diffText(d)}</span>
      </span>
      <span className="font-mono text-[18px] font-extrabold tabular-nums tracking-tight shrink-0">{two(z.h)}:{two(z.m)}</span>
    </div>
  );
}

/** One cell of the digital grid: the city above a seven-segment time */
function LcdCell({ city, base, now }: { city: CityWeatherConfig; base: string; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const d = hoursFrom(tz, base, now);
  return (
    <div className="min-w-0 min-h-0 rounded-[12px] bg-black/[0.07] dark:bg-white/[0.07] p-2 flex flex-col items-center justify-center gap-1">
      <b className="text-[12px] font-extrabold leading-tight truncate max-w-full">{cleanCityDisplayName(city.name)}</b>
      <Seg7 text={`${two(z.h)}:${two(z.m)}`} className="w-full h-[32px]" />
      <span className={`${lbl} opacity-70`}>{d === 0 ? '시차 없음' : diffText(d)}</span>
    </div>
  );
}

/** Two to four cities sharing the cube: a list of faces, or for the digital watch a grid of LCD cells */
export function MultiClock({ cities, base, style, now }: { cities: CityWeatherConfig[]; base: string; style: ClockStyle; now: Date }) {
  const n = Math.min(4, cities.length);
  const list = cities.slice(0, n);
  if (style === 'digital') {
    const grid = n === 2 ? 'grid-cols-1 grid-rows-2' : 'grid-cols-2 grid-rows-2';
    return (
      <div className={`absolute inset-0 p-2 grid gap-1.5 ${grid}`}>
        {list.map((c, i) => <div key={c.nameEn} className={`min-w-0 min-h-0 grid ${n === 3 && i === 2 ? 'col-span-2' : ''}`}><LcdCell city={c} base={base} now={now} /></div>)}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 p-2 grid gap-1.5" style={{ gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }}>
      {list.map(c => <RowClock key={c.nameEn} city={c} base={base} style={style} now={now} />)}
    </div>
  );
}

/**
 * The whole cube of a clock: its ground, and one city or several. The home tile and every option in the detail sheet
 * are this component, so the sheet shows exactly what the cube will show. `className` gives it its size and corners.
 */
export function ClockFace({ cities, base, style, now, together, className = '' }: {
  cities: CityWeatherConfig[]; base: string; style: ClockStyle; now: Date; together: boolean; className?: string;
}) {
  const first = cities[0];
  const night = !together && !!first && zoneOf(first.timezone || 'UTC', now).night;
  return (
    <div className={`tgl-clock relative overflow-hidden ${clockGround(style, night)} ${className}`} data-night={night ? '' : undefined}>
      {together
        ? <MultiClock cities={cities} base={base} style={style} now={now} />
        : first && <SingleClock city={first} base={base} style={style} now={now} />}
    </div>
  );
}

/**
 * A face drawn at the size of a home cube and shrunk to fill the width it is given (a square), so an option can be small
 * and still be the real thing: the same text, the same hands, only smaller.
 */
export function ScaledClock({ children }: { children: React.ReactNode }) {
  const FULL = 174;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / FULL);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full aspect-square overflow-hidden rounded-card pointer-events-none">
      <div className="absolute left-0 top-0" style={{ width: FULL, height: FULL, transform: `scale(${scale})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
}
