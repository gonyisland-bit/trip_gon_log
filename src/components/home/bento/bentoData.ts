import type { Plan, Trip } from '../../../types';
import { getLiveTripStatus, getUpcomingPlanInfo, isJourneyOver, parseTripDateRange, parseTripStartDate } from '../../../utils/tripPlanHelper';
import { getKoreanHolidays } from '../../../utils/koreanHolidays';

// Numbers behind the home bento tiles (v1.3.8). Everything is derived from the journey lists the home page already
// has, so a tile never waits on its own request.

export type Journey = Trip | Plan;

/** Days a journey lasts, counting both ends; 0 when its dates cannot be read */
export function journeyDays(j: Pick<Journey, 'date'>): number {
  const r = parseTripDateRange(j.date);
  return r ? Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1 : 0;
}

const first = (s: string) => s.split(',')[0].trim();

/** City names of a journey, in order, without repeats */
export function journeyCities(j: Journey): string[] {
  const names = j.locations?.length
    ? j.locations.map(l => first(l.name || ''))
    : (j.locationStr || '').split(/[,/·]/).map(s => s.trim());
  return Array.from(new Set(names.filter(Boolean)));
}

export function journeyCountry(j: Journey): string {
  const own = (j.country || '').trim();
  if (own) return own;
  const fromLoc = j.locations?.find(l => l.country)?.country;
  return (fromLoc || '').trim();
}

/** "2025.08" of a journey's first day */
export function journeyMonth(j: Pick<Journey, 'date'>): string {
  const d = parseTripStartDate(j.date || '');
  return d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}` : '';
}

export function rangeLabel(j: Pick<Journey, 'date'>): string {
  const r = parseTripDateRange(j.date);
  if (!r) return j.date || '';
  const f = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return r.start.getTime() === r.end.getTime() ? f(r.start) : `${f(r.start)}–${f(r.end)}`;
}

/** "3박 4일" */
export function nightsLabel(j: Pick<Journey, 'date'>): string {
  const d = journeyDays(j);
  return d > 1 ? `${d - 1}박 ${d}일` : d === 1 ? '당일' : '';
}

export interface NextJourney {
  journey: Journey;
  /** The journey is under way today */
  live: boolean;
  day: number;
  total: number;
  daysLeft: number;
}

/** The journey under way, else the nearest one still ahead */
export function nextJourney(trips: Trip[], plans: Plan[]): NextJourney | null {
  const all: Journey[] = [...trips, ...plans];
  for (const j of all) {
    const live = getLiveTripStatus(j.date);
    if (live.isLive) return { journey: j, live: true, day: live.currentDay, total: live.totalDays, daysLeft: 0 };
  }
  const ahead = all
    .map(j => ({ j, info: getUpcomingPlanInfo(j) }))
    .filter(x => x.info.isUpcoming)
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft)[0];
  return ahead ? { journey: ahead.j, live: false, day: 0, total: journeyDays(ahead.j), daysLeft: ahead.info.daysLeft } : null;
}

export interface BentoStats {
  past: Trip[];
  count: number;
  days: number;
  cities: number;
  countries: number;
  /** Journeys per year, oldest first, the last five years that have any */
  byYear: { year: number; count: number }[];
}

/** What the member has already done: finished journeys only (plans and journeys ahead are not counted) */
export function journeyStats(trips: Trip[]): BentoStats {
  const past = trips.filter(t => !t.deletedAt && isJourneyOver(t));
  const cities = new Set<string>();
  const countries = new Set<string>();
  const years = new Map<number, number>();
  let days = 0;
  past.forEach(t => {
    days += journeyDays(t);
    journeyCities(t).forEach(c => cities.add(c.toLowerCase()));
    const country = journeyCountry(t);
    if (country) countries.add(country.toLowerCase());
    const d = parseTripStartDate(t.date || '');
    if (d) years.set(d.getFullYear(), (years.get(d.getFullYear()) || 0) + 1);
  });
  const byYear = [...years.entries()].sort((a, b) => a[0] - b[0]).slice(-5).map(([year, count]) => ({ year, count }));
  return { past, count: past.length, days, cities: cities.size, countries: countries.size, byYear };
}

const dayOfYear = (d: Date) => Math.floor((new Date(2000, d.getMonth(), d.getDate()).getTime() - new Date(2000, 0, 1).getTime()) / 86400000);

export interface Memory {
  journey: Trip;
  yearsAgo: number;
  /** Same week of an earlier year, or only the latest journey when none is */
  sameWeek: boolean;
}

/** A journey from this week in an earlier year; failing that, the latest finished journey that has a picture */
export function pickMemory(trips: Trip[]): Memory | null {
  const today = new Date();
  const done = trips.filter(t => !t.deletedAt && isJourneyOver(t) && t.img);
  let best: { t: Trip; gap: number; start: Date } | null = null;
  for (const t of done) {
    const start = parseTripStartDate(t.date || '');
    if (!start || start.getFullYear() >= today.getFullYear()) continue;
    const raw = Math.abs(dayOfYear(start) - dayOfYear(today));
    const gap = Math.min(raw, 366 - raw);
    if (gap <= 7 && (!best || start.getTime() > best.start.getTime())) best = { t, gap, start };
  }
  if (best) return { journey: best.t, yearsAgo: today.getFullYear() - best.start.getFullYear(), sameWeek: true };
  const latest = [...done].sort((a, b) => (parseTripStartDate(b.date || '')?.getTime() ?? 0) - (parseTripStartDate(a.date || '')?.getTime() ?? 0))[0];
  if (!latest) return null;
  const start = parseTripStartDate(latest.date || '');
  return { journey: latest, yearsAgo: start ? Math.max(0, today.getFullYear() - start.getFullYear()) : 0, sameWeek: false };
}

export interface MapPoint { lat: number; lng: number }

/** Where a journey went, from its cities (or its own pin) */
export function journeyPoints(j: Journey): MapPoint[] {
  const pts: MapPoint[] = [];
  j.locations?.forEach(l => { if (typeof l.lat === 'number' && typeof l.lng === 'number') pts.push({ lat: l.lat, lng: l.lng }); });
  if (!pts.length && typeof j.lat === 'number' && typeof j.lng === 'number') pts.push({ lat: j.lat, lng: j.lng });
  return pts;
}

export interface CalCell {
  day: number;
  dow: number;
  today: boolean;
  /** A journey covers this day */
  trip: boolean;
  /** A journey that has not happened yet covers this day */
  ahead: boolean;
  holiday: string;
}

export interface CalMonth { year: number; month: number; lead: number; cells: CalCell[]; trips: Journey[] }

/** This month's days, with the journeys and holidays that fall on them */
export function monthCells(trips: Trip[], plans: Plan[], now = new Date()): CalMonth {
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const lead = new Date(year, month, 1).getDay();
  const holidays = getKoreanHolidays(year);
  const ranges = [...trips, ...plans]
    .filter(j => !(j as Trip).deletedAt)
    .map(j => ({ j, r: parseTripDateRange(j.date) }))
    .filter((x): x is { j: Journey; r: { start: Date; end: Date } } => !!x.r);
  const todayMid = new Date(year, month, now.getDate()).getTime();
  const cells: CalCell[] = [];
  const inMonth = new Set<Journey>();
  for (let d = 1; d <= days; d++) {
    const t = new Date(year, month, d).getTime();
    let trip = false;
    let ahead = false;
    ranges.forEach(({ j, r }) => {
      if (t >= r.start.getTime() && t <= r.end.getTime()) {
        trip = true;
        inMonth.add(j);
        if (t > todayMid || getUpcomingPlanInfo(j).isPlanOrFuture) ahead = true;
      }
    });
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const h = holidays.get(key);
    cells.push({ day: d, dow: (lead + d - 1) % 7, today: d === now.getDate(), trip, ahead, holiday: h?.isHoliday ? h.name : '' });
  }
  return { year, month, lead, cells, trips: [...inMonth] };
}

/** What the hero says about a journey: a status chip, and the line under its title */
export function describeJourney(j: Journey): { chip: string; meta: string } {
  const live = getLiveTripStatus(j.date);
  const info = getUpcomingPlanInfo(j);
  const month = journeyMonth(j);
  const chip = live.isLive
    ? `여행 중 · Day ${live.currentDay}/${live.totalDays}`
    : info.isUpcoming
      ? `예정 · ${info.dDayLabel}`
      : info.isPlanOrFuture
        ? '계획 중'
        : `다녀온 여정${month ? ` · ${month}` : ''}`;
  const meta = [rangeLabel(j), nightsLabel(j), journeyCities(j).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  return { chip, meta };
}
