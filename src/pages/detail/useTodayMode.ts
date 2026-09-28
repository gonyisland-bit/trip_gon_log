import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineItem } from '../../types';
import { parseTimeToMinutes } from './detailUtils';

// Today mode (v1.3 P5): while a journey is under way, the timeline knows what
// time it is where the journey is. The time zone comes from the journey's country;
// without one, the device clock is used.

export interface TodayMode {
  todayKey: string | null;     // today's date key as the journey spells it, or null outside the journey
  dayIndex: number;            // 1-based day of the journey
  nowMin: number;              // minutes since local midnight
  nowLabel: string;            // "14:32"
  next: TimelineItem | null;   // first timed item still ahead today
  minutesToNext: number | null;
  lastPassedId: number | null; // the timed item the NOW line follows
  pastIds: Set<number>;        // timed items already behind the clock
  offsetLabel: string;         // journey time minus device time, e.g. "-7h"; empty when they match
}

interface ZonedNow { y: number; m: number; d: number; h: number; min: number }

// The wall-clock date and time in a time zone (falls back to the device zone)
function zonedNow(now: Date, timeZone?: string | null): ZonedNow {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
      }).formatToParts(now);
      const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
      const z = { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, min: get('minute') };
      if (Object.values(z).every(Number.isFinite)) return z;
    } catch (_) {}
  }
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(), h: now.getHours(), min: now.getMinutes() };
}

// Whole-hour (or half-hour) difference between the journey clock and the device clock
function offsetBetween(z: ZonedNow, now: Date): string {
  const zoned = Date.UTC(z.y, z.m - 1, z.d, z.h, z.min);
  const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const hours = Math.round((zoned - local) / 1800000) / 2;
  if (!hours) return '';
  return `${hours > 0 ? '+' : ''}${hours}h`;
}

const digits = (s: string) => s.replace(/\D/g, '');
const isTimed = (t?: string) => !!t && /\d:\d/.test(t);

export function formatCountdown(min: number): string {
  if (min < 1) return '곧';
  if (min < 60) return `${min}분 후`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}시간 ${m}분 후` : `${h}시간 후`;
}

export function useTodayMode(allTripDates: string[], timeline: TimelineItem[], timeZone?: string | null): TodayMode {
  const [now, setNow] = useState(() => new Date());
  const zoned = useMemo(() => zonedNow(now, timeZone), [now, timeZone]);
  const todayKey = useMemo(() => {
    const key = `${zoned.y}${String(zoned.m).padStart(2, '0')}${String(zoned.d).padStart(2, '0')}`;
    return allTripDates.find(x => digits(x) === key) ?? null;
    // Day changes are picked up by the minute tick below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTripDates, zoned.y, zoned.m, zoned.d]);

  // Tick on the minute, only while the journey is live
  useEffect(() => {
    if (!todayKey) return;
    let interval = 0;
    const first = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60000);
    }, 60000 - (Date.now() % 60000) + 50);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [todayKey]);

  return useMemo(() => {
    const nowMin = zoned.h * 60 + zoned.min;
    const nowLabel = `${String(zoned.h).padStart(2, '0')}:${String(zoned.min).padStart(2, '0')}`;
    const offsetLabel = offsetBetween(zoned, now);
    const empty: TodayMode = { todayKey: null, dayIndex: 0, nowMin, nowLabel, next: null, minutesToNext: null, lastPassedId: null, pastIds: new Set(), offsetLabel };
    if (!todayKey) return empty;
    const today = timeline.filter(i => i.date === todayKey && isTimed(i.time));
    const pastIds = new Set<number>();
    let next: TimelineItem | null = null;
    let lastPassedId: number | null = null;
    for (const item of today) {
      const m = parseTimeToMinutes(item.time);
      if (m <= nowMin) { pastIds.add(item.id); lastPassedId = item.id; }
      else if (!next) next = item;
    }
    return {
      todayKey,
      dayIndex: allTripDates.indexOf(todayKey) + 1,
      nowMin,
      nowLabel,
      next,
      minutesToNext: next ? parseTimeToMinutes(next.time) - nowMin : null,
      lastPassedId,
      pastIds,
      offsetLabel,
    };
  }, [todayKey, timeline, now, zoned, allTripDates]);
}

// Open a live journey on today's page once, unless something else asked for a specific date
export function useOpenOnToday(tripId: number | undefined, todayKey: string | null, selectedDate: string, setSelectedDate: (d: string) => void, blocked: boolean) {
  const doneFor = useRef<number | null>(null);
  useEffect(() => {
    if (!tripId || !todayKey || doneFor.current === tripId) return;
    doneFor.current = tripId;
    if (!blocked && selectedDate === 'ALL') setSelectedDate(todayKey);
  }, [tripId, todayKey, selectedDate, setSelectedDate, blocked]);
}
