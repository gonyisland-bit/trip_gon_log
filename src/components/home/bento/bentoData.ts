import type { Plan, Trip } from '../../../types';
import { getLiveTripStatus, getUpcomingPlanInfo, isJourneyOver, parseTripDateRange, parseTripStartDate } from '../../../utils/tripPlanHelper';
import { getKoreanHolidays } from '../../../utils/koreanHolidays';
import { daysUntil, ticketCity, ticketRange, ticketStops, type DepartureTicket } from '../../departure/departureData';
import { canonicalPlace, normalizeCountry, placesOf } from './placeNames';

// Numbers behind the home bento tiles (v1.3.8). Everything is derived from the journey lists the home page already
// has, so a tile never waits on its own request.

export type Journey = Trip | Plan;

/** Days a journey lasts, counting both ends; 0 when its dates cannot be read */
export function journeyDays(j: Pick<Journey, 'date'>): number {
  const r = parseTripDateRange(j.date);
  return r ? Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1 : 0;
}

/** City names of a journey, in order, without repeats (a street or a market after a city name is the same city) */
export function journeyCities(j: Journey): string[] {
  return placesOf(j).filter(p => !p.countryOnly).map(p => p.city);
}

/** The countries of a journey, told once each (한국, 대한민국 and KR are one) */
export function journeyCountries(j: Journey): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  placesOf(j).forEach(p => { if (p.countryKey && !seen.has(p.countryKey)) seen.set(p.countryKey, p.country); });
  if (seen.size === 0) {
    const own = normalizeCountry(j.country);
    if (own) seen.set(own.key, own.label);
  }
  return [...seen.entries()].map(([key, label]) => ({ key, label }));
}

export function journeyCountry(j: Journey): string {
  return journeyCountries(j)[0]?.label ?? '';
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
    placesOf(t).forEach(p => { if (!p.countryOnly) cities.add(p.cityKey); });
    journeyCountries(t).forEach(c => countries.add(c.key));
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

// ── The nearest plan (v1.3.8) ──
// The "next" tile and the terminal tile show one and the same trip: the nearest of every journey, plan and ticket.
// A ticket and a journey that start the same day and share a city are one trip.

export interface FocusTrip {
  title: string;
  cities: string[];
  start: Date | null;
  daysLeft: number;
  live: boolean;
  day: number;
  total: number;
  range: string;
  nights: string;
  journey?: Journey;
  ticket?: DepartureTicket;
}

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function ticketStart(t: DepartureTicket): Date | null {
  return t.startDate ? parseTripStartDate(t.startDate) : null;
}

function ticketPlaceKeys(t: DepartureTicket): string[] {
  return ticketStops(t).map(s => canonicalPlace(s.ko || s.en)?.cityKey || '').filter(Boolean);
}

function journeyPlaceKeys(j: Journey): string[] {
  return placesOf(j).filter(p => !p.countryOnly).map(p => p.cityKey);
}

function ticketRangeLabel(t: DepartureTicket): string {
  const f = (s: string) => s.slice(5).replace('-', '.');
  if (!t.startDate) return ticketRange(t);
  return t.endDate && t.endDate !== t.startDate ? `${f(t.startDate)}–${f(t.endDate)}` : f(t.startDate);
}

/**
 * The trip the home shows as "next": the journey under way, else the nearest one ahead, counting plans and tickets.
 * `pinnedTicketId` is the ticket the member picked at the counter, which overrides the nearest.
 */
export function focusTrip(trips: Trip[], plans: Plan[], tickets: DepartureTicket[], pinnedTicketId?: string): FocusTrip | null {
  type Entry = { journey?: Journey; ticket?: DepartureTicket; live: boolean; day: number; total: number; daysLeft: number; start: Date | null };
  const entries: Entry[] = [];
  [...trips, ...plans].forEach(j => {
    if ((j as Trip).deletedAt) return;
    const live = getLiveTripStatus(j.date);
    if (live.isLive) { entries.push({ journey: j, live: true, day: live.currentDay, total: live.totalDays, daysLeft: 0, start: parseTripStartDate(j.date || '') }); return; }
    const info = getUpcomingPlanInfo(j);
    if (info.isUpcoming) entries.push({ journey: j, live: false, day: 0, total: journeyDays(j), daysLeft: info.daysLeft, start: parseTripStartDate(j.date || '') });
  });
  tickets.forEach(t => {
    const start = ticketStart(t);
    if (!start || !t.startDate || daysUntil(t.startDate) < 0) return;
    const keys = ticketPlaceKeys(t);
    const mate = entries.find(e => !e.live && !e.ticket && e.journey && sameDay(e.start, start) && journeyPlaceKeys(e.journey).some(k => keys.includes(k)));
    if (mate) { mate.ticket = t; return; }
    entries.push({ ticket: t, live: false, day: 0, total: (t.nights ?? 0) + 1, daysLeft: daysUntil(t.startDate), start });
  });
  // A ticket picked on purpose stays the focus even when it has no dates yet
  if (pinnedTicketId && !entries.some(e => e.ticket?.id === pinnedTicketId)) {
    const t = tickets.find(x => x.id === pinnedTicketId);
    if (t && (!t.startDate || daysUntil(t.startDate) >= 0)) entries.push({ ticket: t, live: false, day: 0, total: (t.nights ?? 0) + 1, daysLeft: t.startDate ? daysUntil(t.startDate) : 9999, start: ticketStart(t) });
  }
  if (!entries.length) return null;
  const pinned = pinnedTicketId ? entries.find(e => e.ticket?.id === pinnedTicketId) : undefined;
  const e = pinned ?? [...entries].sort((a, b) => (a.live === b.live ? a.daysLeft - b.daysLeft : a.live ? -1 : 1))[0];
  const j = e.journey;
  const t = e.ticket;
  return {
    title: j ? j.title.replace(' (Plan)', '') : t!.plan?.title || `${t!.cityKo} 여행`,
    cities: j ? journeyCities(j) : ticketStops(t!).map(s => s.ko),
    start: e.start,
    daysLeft: e.daysLeft,
    live: e.live,
    day: e.day,
    total: e.total,
    range: j ? rangeLabel(j) : ticketRangeLabel(t!),
    nights: j ? nightsLabel(j) : t!.nights ? `${t!.nights}박 ${t!.nights + 1}일` : '',
    journey: j,
    ticket: t,
  };
}

/** Where the focus trip goes, as map points */
export function focusPoints(f: FocusTrip | null): MapPoint[] {
  if (!f) return [];
  if (f.journey) return journeyPoints(f.journey);
  const c = f.ticket ? ticketCity(f.ticket) : undefined;
  return c ? [{ lat: c.lat, lng: c.lng }] : [];
}
