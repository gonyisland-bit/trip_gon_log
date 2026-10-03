import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import type { CityWeatherConfig } from '../../../types';
import { cityKey, searchCities, useMyCities } from '../../../utils/myCities';
import { cleanCityDisplayName } from '../../../utils/weatherApi';
import { useHomeWidgets, type ClockStyle } from '../../../utils/homeWidgetPrefs';
import { CURRENT_LOCATION_EN, cachedCurrentLocation } from '../../../utils/userPrefs';

// World clock (v1.3.9): the home's world-time cube and the clocks the member can pick from.
//  - analog: a watch dial in the manner of a clean fashion watch: sixty minute marks, twelve hour indices and numerals,
//    the city printed under the 12, a date window at 3, slim hands on halos and a red seconds hand
//  - digital: a pocket digital watch, seven-segment digits on a pale green LCD (a dark green backlight at night)
//  - dial: a 24 hour ring that shows the day and the night of that place, the time and the city in the middle
// One city fills the cube and its ground is the time of day there (morning, day, evening, night). With "all together"
// on, two to four cities share it as cells, each on its own time of day. Everything is drawn in one 176 point box and
// scaled to the cube, so nothing can crowd or overlap at any size, and the sheet's preview is the very same drawing.

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
  return { h, m: parseInt(o.minute, 10), s: parseInt(o.second, 10), day: WEEKDAY_EN[o.weekday] ?? 0, month: parseInt(o.month, 10), date: parseInt(o.day, 10), night: h >= 20 || h < 5 };
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
const diffText = (d: number) => (d === 0 ? '0h' : `${d > 0 ? '+' : '−'}${Math.abs(d)}h`);

// ── the time of day, the ground a city's clock wears ──

export type Phase = 'morning' | 'day' | 'evening' | 'night';
export const phaseOf = (h: number): Phase => (h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night');
export const PHASE_LABEL: Record<Phase, string> = { morning: '아침', day: '낮', evening: '저녁', night: '밤' };
const PHASE_GROUND: Record<Phase, string> = {
  morning: 'bg-butter text-butter-ink dark:bg-butter-dark dark:text-butter',
  day: 'bg-mist text-mist-ink dark:bg-mist-dark dark:text-mist',
  evening: 'bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach',
  night: 'bg-[#1B2438] text-[#E8EDF7]',
};
// The dial itself stays a clean white (or the dark card) face with near-black print; at night it is the night itself
const FACE_INK: Record<Phase, string> = {
  morning: 'text-ink dark:text-ink-dark', day: 'text-ink dark:text-ink-dark', evening: 'text-ink dark:text-ink-dark', night: 'text-[#E8EDF7]',
};
const LCD_GROUND = (night: boolean) => (night ? 'bg-[#0E2B29] text-[#8FF0D2]' : 'bg-[#C9D3BC] text-[#1F2A1B] dark:bg-[#0E2B29] dark:text-[#8FF0D2]');

// ── sunrise and sunset (the sunrise equation; good to a minute or two, enough for a corner of a clock) ──

function sunTimes(lat: number, lng: number, now: Date): { rise: Date; set: Date } | null {
  const rad = Math.PI / 180;
  const J = now.getTime() / 86400000 + 2440587.5;
  const lw = -lng;
  const n = Math.round(J - 2451545.0009 - lw / 360);
  const Js = 2451545.0009 + lw / 360 + n;
  const M = (357.5291 + 0.98560028 * (Js - 2451545)) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + 102.9372 + C + 180) % 360;
  const transit = Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
  const cosW = (Math.sin(-0.83 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null;
  const w = Math.acos(cosW) / rad;
  const toDate = (j: number) => new Date((j - 2440587.5) * 86400000);
  return { rise: toDate(transit - w / 360), set: toDate(transit + w / 360) };
}

const knowsPlace = (c: CityWeatherConfig) => !(c.lat === 0 && c.lng === 0) && Number.isFinite(c.lat) && Number.isFinite(c.lng);

/** The next of sunrise and sunset in that place, as its local time */
function nextSun(city: CityWeatherConfig, now: Date): { kind: 'rise' | 'set'; time: string } | null {
  if (!knowsPlace(city)) return null;
  const t = sunTimes(city.lat, city.lng, now);
  if (!t) return null;
  const tz = city.timezone || 'UTC';
  if (now < t.rise) return { kind: 'rise', time: zonedTime(tz, t.rise) };
  if (now < t.set) return { kind: 'set', time: zonedTime(tz, t.set) };
  const tomorrow = sunTimes(city.lat, city.lng, new Date(now.getTime() + 86400000));
  return tomorrow ? { kind: 'rise', time: zonedTime(tz, tomorrow.rise) } : null;
}

// ── the cities and the choices (saved with the home tiles) ──

/**
 * The clock chooses from the member's own cities (Settings → 도시, the same list the weather cube shows) and the device's
 * current place. Nothing else is mixed in, so a city chosen here stays chosen until the member takes it off their list.
 */
export function useClockSetup(nextCity?: string) {
  const { main, cities } = useMyCities();
  const w = useHomeWidgets();
  const current = useMemo<CityWeatherConfig>(() => {
    const here = cachedCurrentLocation();
    return { name: '현재 위치', nameEn: CURRENT_LOCATION_EN, country: '', lat: here?.lat ?? 0, lng: here?.lng ?? 0, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
  }, []);
  const timed = useMemo(() => cities.filter(c => !!c.timezone), [cities]);
  const all = useMemo(() => [current, ...timed], [current, timed]);
  const nextKey = nextCity ? cityKey(searchCities(nextCity, 1)[0]?.nameEn) : '';
  const nextCityEn = timed.find(c => cityKey(c.nameEn) === nextKey)?.nameEn;

  const multi = !!w.clockMulti;
  const selected = useMemo(() => {
    const picked = (w.clockCities || []).map(n => all.find(c => cityKey(c.nameEn) === cityKey(n))).filter((c): c is CityWeatherConfig => !!c);
    const fallback = main.nameEn === CURRENT_LOCATION_EN ? current : timed.find(c => cityKey(c.nameEn) === cityKey(main.nameEn)) ?? timed[0] ?? current;
    const base = picked.length ? picked : [fallback];
    if (!multi) return base.slice(0, 1);
    const out = base.slice(0, 4);
    for (const c of all) { if (out.length >= 2) break; if (!out.includes(c)) out.push(c); }
    return out;
  }, [all, timed, current, w.clockCities, multi, main.nameEn]);

  const base = main.nameEn === CURRENT_LOCATION_EN ? current.timezone : main.timezone || 'Asia/Seoul';
  return { main, base, current, cities: timed, all, selected, multi, style: (w.clockStyle || 'analog') as ClockStyle, nextCityEn };
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

// ── faces (each draws in a 100 x 100 box and takes its colours from `.tgl-clock`, see index.css) ──

const halo = { stroke: 'var(--clock-ground)' } as React.CSSProperties;
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

/**
 * The watch. `full` is the cube's own dial: every minute mark, an index and a numeral for each hour, the city printed
 * under the 12 and the date in a window at 3. The small one in a cell keeps the minute track, the twelve indices and the
 * 12, 3, 6 and 9, so even small it reads as the same watch.
 */
function AnalogDial({ z, city, full = false, className = '' }: { z: Zone; city?: string; full?: boolean; className?: string }) {
  const hr = ((z.h % 12) + z.m / 60) * 30;
  const mn = (z.m + z.s / 60) * 6;
  const sc = z.s * 6;
  const marks: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    marks.push(
      <line key={i} x1="50" y1="3.4" x2="50" y2={hour ? (full ? 9.2 : 10.5) : (full ? 6.2 : 6.6)} stroke="currentColor"
        strokeOpacity={hour ? 0.95 : 0.45} strokeWidth={hour ? (full ? 1.5 : 2.2) : (full ? 0.55 : 0.8)} transform={`rotate(${i * 6} 50 50)`} />,
    );
  }
  const numerals: React.ReactNode[] = [];
  const R = full ? 35 : 31;
  for (let n = 1; n <= 12; n++) {
    if (!full && n % 3 !== 0) continue;
    if (full && n === 3) continue; // the date window
    const a = (n * 30 * Math.PI) / 180;
    numerals.push(
      <text key={n} x={50 + R * Math.sin(a)} y={50 - R * Math.cos(a) + (full ? 3.9 : 5)} textAnchor="middle" fontSize={full ? 11 : 14} fontWeight="700" fill="currentColor" fontFamily="inherit" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</text>,
    );
  }
  const hourLen = full ? 21 : 22;
  const minLen = full ? 31 : 33;
  const name = city ?? '';
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${name ? `${name} ` : ''}${two(z.h)}:${two(z.m)}`}>
      <circle cx="50" cy="50" r="49.2" fill="var(--clock-ground)" stroke="currentColor" strokeOpacity="0.85" strokeWidth={full ? 1.1 : 1.6} />
      {marks}
      {numerals}
      {full && (
        <>
          {name && <text x="50" y="31.5" textAnchor="middle" fontSize={name.length > 6 ? 4.8 : 5.8} fontWeight="700" letterSpacing="0.5" fill="currentColor" fillOpacity="0.72" fontFamily="inherit">{name}</text>}
          <rect x="76.5" y="45.2" width="13" height="9.6" rx="1.4" fill="var(--clock-ground)" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.6" />
          <text x="83" y="52.6" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="currentColor" fontFamily={MONO} style={{ fontVariantNumeric: 'tabular-nums' }}>{two(z.date)}</text>
          <text x="50" y="72" textAnchor="middle" fontSize="4.6" fontWeight="700" letterSpacing="0.9" fill="currentColor" fillOpacity="0.5" fontFamily={MONO}>{WEEKDAY[z.day]}</text>
        </>
      )}
      {/* each hand sits on a halo of the dial's colour, so a numeral under it never muddies it */}
      <g transform={`rotate(${hr} 50 50)`}>
        <line x1="50" y1="56" x2="50" y2={50 - hourLen} strokeWidth={full ? 6.4 : 8.6} strokeLinecap="round" style={halo} />
        <line x1="50" y1="56" x2="50" y2={50 - hourLen} stroke="currentColor" strokeWidth={full ? 3.6 : 5.2} strokeLinecap="round" />
      </g>
      <g transform={`rotate(${mn} 50 50)`}>
        <line x1="50" y1="57" x2="50" y2={50 - minLen} strokeWidth={full ? 4.6 : 6.6} strokeLinecap="round" style={halo} />
        <line x1="50" y1="57" x2="50" y2={50 - minLen} stroke="currentColor" strokeWidth={full ? 2.2 : 3.2} strokeLinecap="round" />
      </g>
      <g transform={`rotate(${sc} 50 50)`}>
        <line x1="50" y1={full ? 61 : 60} x2="50" y2={full ? 8 : 9} stroke="#DC2626" strokeWidth={full ? 0.8 : 1.4} strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r={full ? 2.5 : 3.6} fill="#DC2626" />
      <circle cx="50" cy="50" r={full ? 0.9 : 1.3} fill="var(--clock-ground)" />
    </svg>
  );
}

function DayDial({ z, city, mini = false, className = '' }: { z: Zone; city?: string; mini?: boolean; className?: string }) {
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
  for (let h = 0; h < 24; h++) {
    const major = h % 6 === 0;
    if (mini && !major) continue;
    const o = at(h, R - 3.4), i2 = at(h, R - (major ? 6.9 : 5.6));
    ticks.push(<line key={h} x1={o.x} y1={o.y} x2={i2.x} y2={i2.y} stroke="currentColor" strokeOpacity={major ? 0.7 : 0.3} strokeWidth={major ? (mini ? 2 : 1.3) : 0.8} />);
  }
  const labels = mini ? [] : [[12, '12'], [18, '18'], [0, '0'], [6, '6']] as [number, string][];
  const name = city ?? '';
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${name ? `${name} ` : ''}${two(z.h)}:${two(z.m)}`}>
      <circle cx="50" cy="50" r="49.2" fill="var(--clock-ground)" />
      {arc(5, 20, 5, 0.16)}
      {arc(20, 29, 5, 0.62)}
      {ticks}
      {labels.map(([h, t]) => {
        const p = at(h, 30.5);
        return <text key={t} x={p.x} y={p.y + 2.9} textAnchor="middle" fontSize="7.8" fontWeight="700" fill="currentColor" fillOpacity="0.55" fontFamily={MONO}>{t}</text>;
      })}
      <circle cx={now.x} cy={now.y} r={mini ? 7.5 : 6} fill="#DC2626" stroke="var(--clock-ground)" strokeWidth="2.6" />
      {!mini && (
        <>
          <text x="50" y="53.5" textAnchor="middle" fontSize="15.2" fontWeight="800" fill="currentColor" fontFamily={MONO} style={{ fontVariantNumeric: 'tabular-nums' }}>{two(z.h)}:{two(z.m)}</text>
          {name && <text x="50" y="64.5" textAnchor="middle" fontSize={name.length > 6 ? 5.2 : 6.4} fontWeight="700" fill="currentColor" fillOpacity="0.65" fontFamily="inherit">{name}</text>}
        </>
      )}
    </svg>
  );
}

const lbl = 'font-mono text-[10px] font-bold tabular-nums leading-none';

/** LCD annunciators: every word is on the glass, the lit one is dark and the other only a ghost, as on a pocket watch */
function Annunciators({ items, active }: { items: string[]; active: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] font-extrabold leading-none tracking-wide">
      {items.map(it => <span key={it} style={{ opacity: it === active ? 1 : 0.14 }}>{it}</span>)}
    </span>
  );
}

const nameOf = (c: CityWeatherConfig) => (c.nameEn === CURRENT_LOCATION_EN ? '현재 위치' : cleanCityDisplayName(c.name));

/** The sun corner: the next sunrise or sunset there */
function SunMark({ city, now, className = '' }: { city: CityWeatherConfig; now: Date; className?: string }) {
  const sun = nextSun(city, now);
  if (!sun) return null;
  const Icon = sun.kind === 'rise' ? Sunrise : Sunset;
  return (
    <span className={`flex items-center gap-1 ${lbl} ${className}`} aria-label={`${sun.kind === 'rise' ? '일출' : '일몰'} ${sun.time}`}>
      <Icon className="w-3 h-3" strokeWidth={2.2} aria-hidden />{sun.time}
    </span>
  );
}

// ── one city: the whole cube is its watch ──

function SingleCity({ city, base, style, now }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const name = nameOf(city);
  const diff = diffText(hoursFrom(tz, base, now));
  const here = city.nameEn === CURRENT_LOCATION_EN;

  if (style === 'digital') {
    return (
      <div className={`tgl-clock absolute inset-0 p-3.5 flex flex-col justify-between ${LCD_GROUND(z.night)}`} data-night={z.night ? '' : undefined}>
        <span className="flex items-center gap-1 text-[13px] font-extrabold tracking-tight min-w-0">
          {here && <LocateFixed className="w-3 h-3 shrink-0" aria-hidden />}
          <span className="truncate">{name}</span>
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between font-mono text-[11px] font-bold leading-none opacity-80">
            <span>{WEEKDAY[z.day]} {two(z.month)}.{two(z.date)}</span>
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

  // The watch sits in the middle; the four corners outside its circle hold the time of day, the time, the offset and
  // the next sunrise or sunset
  const ph = phaseOf(z.h);
  const PhaseIcon = here ? LocateFixed : ph === 'night' ? Moon : Sun;
  return (
    <div className={`absolute inset-0 ${PHASE_GROUND[ph]}`}>
      <div className={`tgl-clock absolute ${FACE_INK[ph]}`} style={{ left: 15, top: 15, width: 146, height: 146 }} data-night={ph === 'night' ? '' : undefined}>
        {style === 'analog' ? <AnalogDial z={z} city={name} full className="w-full h-full" /> : <DayDial z={z} city={name} className="w-full h-full" />}
      </div>
      <span className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-bold leading-none" aria-label={PHASE_LABEL[ph]}>
        <PhaseIcon className="w-3 h-3" strokeWidth={2.2} aria-hidden />
      </span>
      {style === 'analog' && <span className={`absolute top-2.5 right-2.5 ${lbl}`}>{two(z.h)}:{two(z.m)}</span>}
      <span className={`absolute bottom-2.5 left-2.5 ${lbl}`}>{diff}</span>
      <SunMark city={city} now={now} className="absolute bottom-2.5 right-2.5" />
    </div>
  );
}

// ── several cities: cells, each on its own time of day ──

/** A wide cell (two cities, or the first of three): the city, its date and offset, the time large, its watch at the right */
function RowCell({ city, base, style, now }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const ph = phaseOf(z.h);
  const lcd = style === 'digital';
  const ground = lcd ? LCD_GROUND(z.night) : PHASE_GROUND[ph];
  const night = lcd ? z.night : ph === 'night';
  return (
    <div className={`tgl-clock min-w-0 min-h-0 rounded-[13px] px-2.5 py-2 flex items-center gap-2 ${ground}`} data-night={night ? '' : undefined}>
      <span className="min-w-0 flex-1 h-full flex flex-col">
        <b className="flex items-center gap-1 text-[12.5px] font-extrabold leading-tight min-w-0">
          {city.nameEn === CURRENT_LOCATION_EN && <LocateFixed className="w-3 h-3 shrink-0" aria-hidden />}
          <span className="truncate">{nameOf(city)}</span>
        </b>
        <span className={`${lbl} text-[9px] opacity-70 mt-1 whitespace-nowrap`}>{WEEKDAY[z.day]} · {diffText(hoursFrom(tz, base, now))}</span>
        {lcd
          ? <Seg7 text={`${two(z.h)}:${two(z.m)}`} className="mt-auto h-[26px] w-[82px]" />
          : <span className="mt-auto font-mono text-[19px] font-extrabold tabular-nums tracking-tight leading-none">{two(z.h)}:{two(z.m)}</span>}
      </span>
      {!lcd && (
        <span className={`w-[60px] h-[60px] shrink-0 ${FACE_INK[ph]}`}>
          {style === 'analog' ? <AnalogDial z={z} className="w-full h-full" /> : <DayDial z={z} mini className="w-full h-full" />}
        </span>
      )}
    </div>
  );
}

/** A square cell (three or four cities): the city on top, its watch (or the LCD time) and the offset below */
function GridCell({ city, base, style, now }: { city: CityWeatherConfig; base: string; style: ClockStyle; now: Date }) {
  const tz = city.timezone || 'UTC';
  const z = zoneOf(tz, now);
  const ph = phaseOf(z.h);
  const lcd = style === 'digital';
  const ground = lcd ? LCD_GROUND(z.night) : PHASE_GROUND[ph];
  const night = lcd ? z.night : ph === 'night';
  const diff = diffText(hoursFrom(tz, base, now));
  return (
    <div className={`tgl-clock min-w-0 min-h-0 rounded-[13px] p-[7px] flex flex-col ${ground}`} data-night={night ? '' : undefined}>
      <b className="flex items-center gap-1 text-[11px] font-extrabold leading-tight min-w-0">
        {city.nameEn === CURRENT_LOCATION_EN && <LocateFixed className="w-2.5 h-2.5 shrink-0" aria-hidden />}
        <span className="truncate">{nameOf(city)}</span>
      </b>
      {lcd ? (
        <>
          <Seg7 text={`${two(z.h)}:${two(z.m)}`} className="mt-auto w-full h-[24px]" />
          <span className={`${lbl} text-[8.5px] opacity-70 mt-1`}>{diff}</span>
        </>
      ) : (
        <span className="mt-auto flex items-end justify-between gap-1">
          <span className={`${lbl} text-[8.5px] opacity-75 pb-0.5`}>{diff}</span>
          <span className={`w-[44px] h-[44px] shrink-0 ${FACE_INK[ph]}`}>
            {style === 'analog' ? <AnalogDial z={z} className="w-full h-full" /> : <DayDial z={z} mini className="w-full h-full" />}
          </span>
        </span>
      )}
    </div>
  );
}

function SeveralCities({ cities, base, style, now }: { cities: CityWeatherConfig[]; base: string; style: ClockStyle; now: Date }) {
  const list = cities.slice(0, 4);
  const n = list.length;
  return (
    <div className="absolute inset-0 p-1.5 grid gap-1.5 grid-cols-2 grid-rows-2 bg-surface dark:bg-surface-dark">
      {list.map((c, i) => {
        const wide = n === 2 || (n === 3 && i === 0);
        return wide
          ? <div key={c.nameEn} className="col-span-2 grid min-h-0"><RowCell city={c} base={base} style={style} now={now} /></div>
          : <div key={c.nameEn} className="grid min-h-0"><GridCell city={c} base={base} style={style} now={now} /></div>;
      })}
    </div>
  );
}

const BOX = 176;

/**
 * The whole cube of a clock, drawn in a 176 point box and scaled to fill the square it is given. The home tile and the
 * sheet's preview are this component, so the sheet shows exactly what the cube will show.
 */
export function ClockFace({ cities, base, style, now, together, className = '' }: {
  cities: CityWeatherConfig[]; base: string; style: ClockStyle; now: Date; together: boolean; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(Math.min(el.clientWidth, el.clientHeight || el.clientWidth) / BOX || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const first = cities[0];
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div className="absolute left-0 top-0" style={{ width: BOX, height: BOX, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {together && cities.length > 1
          ? <SeveralCities cities={cities} base={base} style={style} now={now} />
          : first && <SingleCity city={first} base={base} style={style} now={now} />}
      </div>
    </div>
  );
}
