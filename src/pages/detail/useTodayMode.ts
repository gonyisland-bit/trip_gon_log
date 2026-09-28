import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineItem } from '../../types';
import { parseTimeToMinutes } from './detailUtils';

// Today mode (v1.3 P5): while a journey is under way, the timeline knows what
// time it is. Clock is the device's own; journeys carry no time zone.

export interface TodayMode {
  todayKey: string | null;     // today's date key as the journey spells it, or null outside the journey
  dayIndex: number;            // 1-based day of the journey
  nowMin: number;              // minutes since local midnight
  nowLabel: string;            // "14:32"
  next: TimelineItem | null;   // first timed item still ahead today
  minutesToNext: number | null;
  lastPassedId: number | null; // the timed item the NOW line follows
  pastIds: Set<number>;        // timed items already behind the clock
}

const digits = (s: string) => s.replace(/\D/g, '');
const isTimed = (t?: string) => !!t && /\d:\d/.test(t);

export function formatCountdown(min: number): string {
  if (min < 1) return '곧';
  if (min < 60) return `${min}분 후`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}시간 ${m}분 후` : `${h}시간 후`;
}

export function useTodayMode(allTripDates: string[], timeline: TimelineItem[]): TodayMode {
  const [now, setNow] = useState(() => new Date());
  const todayKey = useMemo(() => {
    const d = now;
    const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return allTripDates.find(x => digits(x) === key) ?? null;
    // Day changes are picked up by the minute tick below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTripDates, now.getDate()]);

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
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const empty: TodayMode = { todayKey: null, dayIndex: 0, nowMin, nowLabel, next: null, minutesToNext: null, lastPassedId: null, pastIds: new Set() };
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
    };
  }, [todayKey, timeline, now, allTripDates]);
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
