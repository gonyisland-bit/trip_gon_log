import React, { useEffect, useMemo, useState } from 'react';
import type { CityWeatherConfig } from '../../../types';
import { searchCities, useMyCities } from '../../../utils/myCities';
import { cleanCityDisplayName } from '../../../utils/weatherApi';
import { useHomeWidgets, type ClockStyle } from '../../../utils/homeWidgetPrefs';

// World clock (v1.3.8): the home's world-time cube and the clocks the member can pick from. Three faces, each drawn
// to fill its cube edge to edge:
//  - analog: a Swiss railway dial with a red second hand, the city and the time written in the four corners
//  - digital: a pocket digital watch, seven-segment digits on a pale green LCD (a dark green backlight at night)
//  - dial: a 24 hour ring that shows the day and the night of that place, with the time in the middle
// One city fills the cube; with "all together" on, two to four cities share it.

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
const diffText = (d: number) => (d === 0 ? '시차 없음' : `${d > 0 ? '+' : ''}${d}h`);

// ── the cities and the choices (saved with the home tiles) ──

export function useClockSetup(nextCity?: string) {
  const { main, favorites } = useMyCities();
  const w = useHomeWidgets();
  const favKey = favorites.map(f => f.nameEn).join('|');
  const all = useMemo(() => {
    const list: CityWeatherConfig[] = [];
    const add = (c?: CityWeatherConfig | null) => { if (c && c.timezone && !list.some(x => x.nameEn === c.nameEn)) list.push(c); };
    add(main);
    favorites.forEach(add);
    add(nextCity ? searchCities(nextCity, 1)[0] : undefined);
    ['TOKYO', 'PARIS', 'NEW YORK', 'LONDON'].forEach(n => { if (list.length < 4) add(searchCities(n, 1)[0]); });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main, favKey, nextCity]);

  const multi = !!w.clockMulti;
  const selected = useMemo(() => {
    const picked = (w.clockCities || []).map(n => all.find(c => c.nameEn === n)).filter((c): c is CityWeatherConfig => !!c);
    const base = picked.length ? picked : all.slice(0, 1);
    if (!multi) return base.slice(0, 1);
    const out = base.slice(0, 4);
    for (const c of all) { if (out.length >= 2) break; if (!out.includes(c)) out.push(c); }
    return out;
  }, [all, w.clockCities, multi]);

  return { main, all, selected, multi, style: (w.clockStyle || 'analog') as ClockStyle, nextCityEn: nextCity ? searchCities(nextCity, 1)[0]?.nameEn : undefined };
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

// ── faces ──

function AnalogDial({ z, className = '' }: { z: Zone; className?: string }) {
  const hr = ((z.h % 12) + z.m / 60) * 30;
  const mn = (z.m + z.s / 60) * 6;
  const sc = z.s * 6;
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    ticks.push(<line key={i} x1="50" y1={big ? 4.5 : 4.5} x2="50" y2={big ? 14 : 8.5} stroke="currentColor" strokeWidth={big ? 3 : 1} strokeLinecap="round" transform={`rotate(${i * 6} 50 50)`} opacity={big ? 1 : 0.55} />);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${two(z.h)}:${two(z.m)}`}>
      <circle cx="50" cy="50" r="48.5" fill="currentColor" fillOpacity="0.045" />
      {ticks}
      <text x="50" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" fontFamily="inherit">12</text>
      <text x="50" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" fontFamily="inherit">6</text>
      <text x="76" y="54" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" fontFamily="inherit">3</text>
      <text x="24" y="54" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" fontFamily="inherit">9</text>
      <line x1="50" y1="56" x2="50" y2="24" stroke="currentColor" strokeWidth="6.4" strokeLinecap="round" transform={`rotate(${hr} 50 50)`} />
      <line x1="50" y1="58" x2="50" y2="10" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" transform={`rotate(${mn} 50 50)`} />
      <g transform={`rotate(${sc} 50 50)`}>
        <line x1="50" y1="64" x2="50" y2="8" stroke="#DC2626" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="50" cy="19" r="4" fill="#DC2626" />
      </g>
      <circle cx="50" cy="50" r="3" fill="#DC2626" />
    </svg>
  );
}

function DayDial({ z, className = '' }: { z: Zone; className?: string }) {
  const rot = 180; // midnight at the bottom, noon at the top
  const arc = (a0: number, a1: number, w: number, color: string, op = 1) => {
    const r = 41;
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x0 = 50 + r * Math.cos(rad(a0)), y0 = 50 + r * Math.sin(rad(a0));
    const x1 = 50 + r * Math.cos(rad(a1)), y1 = 50 + r * Math.sin(rad(a1));
    return <path d={`M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="butt" strokeOpacity={op} />;
  };
  const ang = ((z.h + z.m / 60) / 24) * 360 + rot;
  const px = 50 + 41 * Math.cos(((ang - 90) * Math.PI) / 180);
  const py = 50 + 41 * Math.sin(((ang - 90) * Math.PI) / 180);
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${two(z.h)}:${two(z.m)}`}>
      {arc(19 / 24 * 360 + rot, 30 / 24 * 360 + rot, 11, 'currentColor', 0.28)}
      {arc(6 / 24 * 360 + rot, 19 / 24 * 360 + rot, 11, '#EA580C', 1)}
      <circle cx={px} cy={py} r="8" fill="#FFFDF9" stroke="#DC2626" strokeWidth="3.5" />
      <text x="50" y="57" textAnchor="middle" fontSize="19" fontWeight="800" fill="currentColor" fontFamily="'IBM Plex Mono', ui-monospace, monospace" style={{ fontVariantNumeric: 'tabular-nums' }}>{two(z.h)}:{two(z.m)}</text>
      <text x="50" y="72" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor" fillOpacity="0.6" fontFamily="'IBM Plex Mono', ui-monospace, monospace">{z.night ? 'NIGHT' : 'DAY'}</text>
    </svg>
  );
}

/** The ground a clock wears: analog and dial go dark at night, the digital one is always its LCD */
export function clockGround(style: ClockStyle, night: boolean): string {
  if (style === 'digital') return night ? 'bg-[#0E2B29] text-[#8FF0D2]' : 'bg-[#C9D3BC] text-[#1F2A1B] dark:bg-[#0E2B29] dark:text-[#8FF0D2]';
  return night ? 'bg-[#1B2438] text-[#E8EDF7]' : 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark';
}

const lbl = 'font-mono text-[10.5px] font-bold tabular-nums leading-none';

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
        <div className="flex items-start justify-between gap-2 pr-8">
          <span className="text-[13px] font-extrabold tracking-tight truncate">{name}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between font-mono text-[11px] font-bold leading-none opacity-80">
            <span>{WEEKDAY[z.day]} {date}</span>
            <span>{z.h >= 12 ? 'PM' : 'AM'}</span>
          </div>
          <div className="flex items-end gap-1.5">
            <Seg7 text={`${two(z.h)}:${two(z.m)}`} className="flex-1 min-w-0 h-[64px]" />
            <Seg7 text={two(z.s)} className="w-[36px] h-[28px] shrink-0" />
          </div>
          <div className="flex items-center justify-between font-mono text-[10.5px] font-bold leading-none opacity-70">
            <span>{diff}</span>
            <span>{z.night ? 'NIGHT' : 'DAY'}</span>
          </div>
        </div>
      </div>
    );
  }

  const face = style === 'analog' ? <AnalogDial z={z} className="w-full h-full" /> : <DayDial z={z} className="w-full h-full" />;
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-[5px]">{face}</div>
      <span className="absolute top-3 left-3.5 text-[13px] font-extrabold tracking-tight max-w-[40%] truncate">{name}</span>
      <span className={`absolute bottom-3 left-3.5 ${lbl} opacity-70`}>{date} {WEEKDAY[z.day]}</span>
      <span className={`absolute bottom-3 right-3.5 ${lbl} opacity-70`}>{diff}</span>
    </div>
  );
}

function MiniClock({ city, base, style, now, wide }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date; wide?: boolean }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const name = cleanCityDisplayName(city.name);
  const d = hoursFrom(tz, base, now);
  const night = z.night;
  const cell = `min-w-0 min-h-0 rounded-[14px] p-2 flex ${wide ? 'flex-row items-center gap-3' : 'flex-col items-center justify-center gap-0.5'} ${night && style !== 'digital' ? 'bg-[#1B2438] text-[#E8EDF7]' : style === 'digital' ? 'bg-black/[0.06] dark:bg-white/[0.06]' : 'bg-black/[0.045] dark:bg-white/[0.06]'}`;
  const text = (
    <span className={`flex ${wide ? 'flex-col items-start' : 'flex-col items-center'} min-w-0`}>
      <b className="text-[12px] font-extrabold leading-tight truncate max-w-full">{name}</b>
      <span className={`${lbl} opacity-70`}>{d === 0 ? '시차 없음' : diffText(d)}</span>
    </span>
  );
  if (style === 'digital') {
    return (
      <div className={cell}>
        {text}
        <Seg7 text={`${two(z.h)}:${two(z.m)}`} className={wide ? 'flex-1 min-w-0 h-[34px]' : 'w-full h-[30px]'} />
      </div>
    );
  }
  const face = style === 'analog' ? <AnalogDial z={z} className="w-full h-full" /> : <DayDial z={z} className="w-full h-full" />;
  return (
    <div className={cell}>
      <div className={wide ? 'h-full aspect-square shrink-0' : 'flex-1 min-h-0 aspect-square max-w-full'}>{face}</div>
      {text}
    </div>
  );
}

/** Two to four cities sharing the cube */
export function MultiClock({ cities, base, style, now }: { cities: CityWeatherConfig[]; base: string; style: ClockStyle; now: Date }) {
  const n = Math.min(4, cities.length);
  const grid = n === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-2 grid-rows-2';
  return (
    <div className={`absolute inset-0 p-2 grid gap-1.5 ${grid}`}>
      {cities.slice(0, n).map((c, i) => (
        <div key={c.nameEn} className={`min-w-0 min-h-0 flex ${n === 3 && i === 2 ? 'col-span-2' : ''}`}>
          <div className="flex-1 min-w-0 min-h-0 grid"><MiniClock city={c} base={base} style={style} now={now} wide={n === 3 && i === 2} /></div>
        </div>
      ))}
    </div>
  );
}
