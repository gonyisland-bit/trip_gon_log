import type { FlightItem, Plan, StayItem, TimelineData, TimelineItem, TransitItem, Trip } from '../../types';
import { getLiveTripStatus, getUpcomingPlanInfo, parseTripDateRange } from '../../utils/tripPlanHelper';
import { parseTimeToMinutes } from '../../pages/detail/detailUtils';
import { md, parseItemDate, parseItemRange } from '../../utils/itemDate';

export { md, parseItemDate };

// Journey board data: one journey's bookings and places in time order, read from the app state
// (which is live from Firestore and cached on the device, so the board opens offline too).

export const OPEN_JOURNEY_BOARD = 'tgl:journey-board';
export function openJourneyBoard(tripId: number) {
  window.dispatchEvent(new CustomEvent(OPEN_JOURNEY_BOARD, { detail: tripId }));
}

export type BoardKind = 'flight' | 'stay' | 'transit' | 'place';

export interface BoardEntry {
  kind: BoardKind;
  id: number;
  /** Day the entry happens, when the free-text date can be read */
  date: Date | null;
  /** Last day of a stay (check-out) or a rental, when it has one */
  endDate: Date | null;
  /** Minutes from midnight, for ordering within a day */
  minutes: number;
  past: boolean;
}

export interface BoardModel {
  trip: Trip | Plan;
  start: Date | null;
  end: Date | null;
  nights: number;
  phase: 'live' | 'upcoming' | 'past';
  day: number;
  totalDays: number;
  daysLeft: number;
  flights: Array<FlightItem & { at: BoardEntry }>;
  stays: Array<StayItem & { at: BoardEntry }>;
  transits: Array<TransitItem & { at: BoardEntry }>;
  places: Array<TimelineItem & { at: BoardEntry; dayKey: string }>;
  next: (TimelineItem & { at: BoardEntry; dayKey: string }) | null;
  /** Places on today's date during the trip, or on day one before it */
  focusDay: Array<TimelineItem & { at: BoardEntry; dayKey: string }>;
}

const DAY = 86400000;
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

function entry(kind: BoardKind, id: number, date: Date | null, time: string | undefined, endDate: Date | null = null): BoardEntry {
  const minutes = time ? parseTimeToMinutes(time) : 0;
  let past = false;
  if (date) {
    const at = new Date(date.getTime() + minutes * 60000);
    // A booking stays current through its whole day; a stay or a rental, through its last day
    past = endDate ? endDate.getTime() + DAY <= Date.now() : time ? at.getTime() < Date.now() - 60 * 60000 : date.getTime() + DAY <= Date.now();
  }
  return { kind, id, date, endDate, minutes, past };
}

const byTime = (a: { at: BoardEntry }, b: { at: BoardEntry }) =>
  (a.at.date?.getTime() ?? Infinity) - (b.at.date?.getTime() ?? Infinity) || a.at.minutes - b.at.minutes;

export function buildBoard(
  trip: Trip | Plan,
  timelineData: TimelineData,
  flights: FlightItem[],
  stays: StayItem[],
  transits: TransitItem[],
): BoardModel {
  const range = parseTripDateRange(trip.date);
  const year = range?.start.getFullYear() ?? new Date().getFullYear();
  const live = getLiveTripStatus(trip.date);
  const plan = getUpcomingPlanInfo(trip);
  const now = today0();
  const phase: BoardModel['phase'] = live.isLive ? 'live' : range && range.start > now ? 'upcoming' : range ? 'past' : 'upcoming';

  const f = flights.map(x => ({ ...x, at: entry('flight', x.id, parseItemDate(x.date, year, range), x.fromTime) })).sort(byTime);
  const s = stays.map(x => {
    const r = parseItemRange(x.dateRange, year, range);
    return { ...x, at: entry('stay', x.id, r.start, undefined, r.end) };
  }).sort(byTime);
  const t = transits.map(x => ({ ...x, at: entry('transit', x.id, parseItemDate(x.date, year, range), x.time, x.transitType === 'car' ? parseItemDate(x.rentalDropoffDate, year, range) : null) })).sort(byTime);
  const p = Object.entries(timelineData || {})
    .flatMap(([dayKey, list]) => (list || []).filter(i => i.tripId === trip.id).map(i => ({ ...i, dayKey, at: entry('place', i.id, parseItemDate(dayKey, year, range), i.time) })))
    .sort(byTime);

  const focusKey = phase === 'live' ? now : range?.start ?? null;
  const focusDay = focusKey ? p.filter(i => i.at.date && i.at.date.getTime() === focusKey.getTime()) : [];
  const next = phase === 'past' ? null : p.find(i => !i.at.past) ?? null;

  return {
    trip,
    start: range?.start ?? null,
    end: range?.end ?? null,
    nights: range ? Math.max(0, Math.round((range.end.getTime() - range.start.getTime()) / DAY)) : 0,
    phase,
    day: live.currentDay,
    totalDays: live.totalDays,
    daysLeft: plan.daysLeft,
    flights: f,
    stays: s,
    transits: t,
    places: p,
    next,
    focusDay,
  };
}

/** The head tile's status: where the journey stands */
export function boardStatus(b: BoardModel): string {
  if (b.phase === 'live') return `DAY ${b.day}/${b.totalDays}`;
  if (b.phase === 'upcoming') return b.daysLeft === 0 ? 'D-DAY' : b.daysLeft > 0 ? `D-${b.daysLeft}` : '계획';
  return '다녀온 여행';
}

/** Up to three places of the journey's location line */
export const boardPlaces = (trip: Trip | Plan) => (trip.locationStr || '').split(',').map(s => s.trim()).filter(Boolean);

/** Where a transport booking leaves from and arrives at: the named places, else the two halves of its route */
export function transitEnds(t: TransitItem): { from?: string; to?: string } {
  const parts = t.route?.split(/→|->|-|~/);
  return { from: t.departPlace || parts?.[0]?.trim(), to: t.arrivePlace || parts?.[1]?.trim() };
}

/** Places per day (up to 14 days), for the little bars on the places tile */
export function placesPerDay(b: BoardModel): number[] {
  const counts = new Map<string, number>();
  b.places.forEach(p => counts.set(p.dayKey, (counts.get(p.dayKey) || 0) + 1));
  return Array.from(counts.entries()).sort((x, y) => x[0].localeCompare(y[0])).map(([, n]) => n).slice(0, 14);
}

/** The journey worth a board right now: the one under way, else the next to leave (null when none) */
export function boardJourney(trips: Array<Trip | Plan>): Trip | Plan | null {
  const now = today0();
  const live = trips.find(t => !t.deletedAt && getLiveTripStatus(t.date).isLive);
  if (live) return live;
  return trips
    .filter(t => !t.deletedAt)
    .map(t => ({ t, r: parseTripDateRange(t.date) }))
    .filter((x): x is { t: Trip | Plan; r: { start: Date; end: Date } } => !!x.r && x.r.start > now)
    .sort((a, b) => a.r.start.getTime() - b.r.start.getTime())[0]?.t ?? null;
}
