import React, { useMemo } from 'react';
import { BedDouble, Copy, ExternalLink, Plane, TrainFront } from 'lucide-react';
import { Trip, Plan, FlightItem, StayItem, TransitItem } from '../../types';
import { parseTripDateRange } from '../../utils/tripPlanHelper';
import { bookingContextFromTrip, buildAgodaUrl, buildBookingComUrl, buildNaverFlightUrl, buildSkyscannerFlightUrl } from '../../utils/bookingDeepLinks';
import { notify } from '../../utils/feedback';
import { NewTripButton } from '../NewTripButton';

// Upcoming bookings (v1.3.6, the old Booking Wallet now inside the airport terminal): every flight,
// stay and transit booking of the journeys still ahead, with a D-day on each and a booked / missing
// check per kind. Rows open the booking in the journey; missing flights and stays get search links.

type Kind = 'flight' | 'stay' | 'transit';
const TAB: Record<Kind, string> = { flight: 'flights', stay: 'stays', transit: 'transit' };
const ICON: Record<Kind, React.ComponentType<{ className?: string }>> = { flight: Plane, stay: BedDouble, transit: TrainFront };
const SOON_DAYS = 3;

interface WalletRow {
  kind: Kind;
  id: number;
  date: Date | null;
  dateLabel: string;
  title: string;
  detail: string;
  ref: string;
}

interface WalletJourney {
  trip: Trip | Plan;
  start: Date;
  end: Date;
  rows: WalletRow[];
  hasFlight: boolean;
  hasStay: boolean;
  firstFlight?: FlightItem;
}

const DAY = 86400000;
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysFrom = (d: Date, base: Date) => Math.round((d.getTime() - base.getTime()) / DAY);
const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// Booking dates are free text: "2026.10.15", "10.15", "2026-10-15 ~ 10.18"; a missing year borrows the journey's
function parseItemDate(str: string | undefined, year: number): Date | null {
  if (!str) return null;
  const full = str.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (full) return new Date(+full[1], +full[2] - 1, +full[3]);
  const short = str.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (short) return new Date(year, +short[1] - 1, +short[2]);
  return null;
}

function dLabel(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : 'DONE';
}

function buildJourneys(
  trips: Trip[], plans: Plan[],
  flightsByTrip: Record<number, FlightItem[]>, staysByTrip: Record<number, StayItem[]>, transitByTrip: Record<number, TransitItem[]>,
): WalletJourney[] {
  const now = today0();
  const seen = new Set<number>();
  return [...trips, ...plans]
    .filter(t => !t.deletedAt && !seen.has(t.id) && seen.add(t.id))
    .map((trip): WalletJourney | null => {
      const range = parseTripDateRange(trip.date);
      if (!range || range.end < now) return null;
      const year = range.start.getFullYear();
      const flights = flightsByTrip[trip.id] || [];
      const stays = staysByTrip[trip.id] || [];
      const transits = transitByTrip[trip.id] || [];
      const rows: WalletRow[] = [
        ...flights.map(f => {
          const date = parseItemDate(f.date, year);
          return {
            kind: 'flight' as const, id: f.id, date, dateLabel: date ? md(date) : f.date || '',
            title: [f.fromCode, f.toCode].filter(Boolean).join(' → ') || f.title,
            detail: [f.flightNo, f.fromTime && `${f.fromTime} 출발`, f.seat && `좌석 ${f.seat}`].filter(Boolean).join(' · '),
            ref: f.pnr || '',
          };
        }),
        ...stays.map(s => {
          const date = parseItemDate(s.dateRange, year);
          return {
            kind: 'stay' as const, id: s.id, date, dateLabel: date ? md(date) : s.dateRange || '',
            title: s.title, detail: [s.dateRange, s.address].filter(Boolean).join(' · '), ref: s.confNo || '',
          };
        }),
        ...transits.map(t => {
          const date = parseItemDate(t.date, year);
          return {
            kind: 'transit' as const, id: t.id, date, dateLabel: date ? md(date) : t.date || '',
            title: t.title || t.route, detail: [t.route !== t.title && t.route, t.time, t.seat].filter(Boolean).join(' · '), ref: t.bookingRef || '',
          };
        }),
      ].sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
      return { trip, start: range.start, end: range.end, rows, hasFlight: flights.length > 0, hasStay: stays.length > 0, firstFlight: flights[0] };
    })
    .filter((j): j is WalletJourney => !!j)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

interface UpcomingBookingsProps {
  trips: Trip[];
  plans: Plan[];
  flightsByTrip: Record<number, FlightItem[]>;
  staysByTrip: Record<number, StayItem[]>;
  transitByTrip: Record<number, TransitItem[]>;
  /** Opens a booking inside its journey (the terminal closes first) */
  onOpenBooking: (tripId: number, tab: string, itemId: number | null) => void;
  onNewTrip: () => void;
}

/** Journeys ahead with what is booked and what is missing, for the terminal's "탑승 예정" tab */
export function countUpcoming(trips: Trip[], plans: Plan[]): number {
  return buildJourneys(trips, plans, {}, {}, {}).length;
}

export function UpcomingBookings({ trips, plans, flightsByTrip, staysByTrip, transitByTrip, onOpenBooking, onNewTrip }: UpcomingBookingsProps) {
  const journeys = useMemo(() => buildJourneys(trips, plans, flightsByTrip, staysByTrip, transitByTrip), [trips, plans, flightsByTrip, staysByTrip, transitByTrip]);
  const now = today0();

  // The next check-in across every journey
  const next = useMemo(() => {
    for (const j of journeys) for (const r of j.rows) if (r.date && daysFrom(r.date, now) >= 0) return { j, r };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notify(`${text} 복사했습니다.`, 'success'); }
    catch { notify('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.', 'error'); }
  };

  const nextDays = next?.r.date ? daysFrom(next.r.date, now) : null;
  const NextIcon = next ? ICON[next.r.kind] : Plane;

  if (journeys.length === 0) {
    return (
      <div className="rounded-card bg-surface dark:bg-surface-dark py-12 px-6 flex flex-col items-center gap-3 text-center">
        <span className="text-[15px] font-extrabold">탑승 예정인 여정이 없어요</span>
        <span className="text-meta text-black/55 dark:text-white/55 max-w-sm break-keep">보관 티켓에서 탑승하거나 새 여행을 만들면, 항공 · 숙소 · 교통 예약을 여기서 한눈에 챙길 수 있습니다.</span>
        <NewTripButton onClick={onNewTrip} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Next check-in */}
      {next && (
        <button
          type="button"
          onClick={() => onOpenBooking(next.j.trip.id, TAB[next.r.kind], next.r.id)}
          className="tgl-press group text-left flex items-stretch gap-4 rounded-card bg-surface dark:bg-surface-dark p-4 cursor-pointer"
        >
          <span className={`shrink-0 min-w-[84px] font-sans font-extrabold leading-none tracking-[-0.05em] tabular-nums text-4xl sm:text-5xl self-center ${
            nextDays !== null && nextDays <= SOON_DAYS ? 'text-red-600 dark:text-red-500' : ''
          }`}>
            {nextDays === 0 ? 'D-DAY' : `D-${nextDays}`}
          </span>
          <span className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60 flex items-center gap-1.5">
              <NextIcon className="w-3.5 h-3.5" /> Next · {next.r.dateLabel}
            </span>
            <span className="text-base sm:text-lg font-extrabold tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{next.r.title}</span>
            <span className="text-meta text-black/65 dark:text-white/65 truncate">{next.j.trip.title}</span>
          </span>
        </button>
      )}

      {journeys.map(j => {
        const jDays = daysFrom(j.start, now);
        const live = jDays <= 0;
        const ctx = bookingContextFromTrip(j.trip, { start: j.start, end: j.end }, j.firstFlight);
        const kinds: { kind: Kind; label: string; has: boolean }[] = [
          { kind: 'flight', label: '항공', has: j.hasFlight },
          { kind: 'stay', label: '숙소', has: j.hasStay },
          { kind: 'transit', label: '교통', has: j.rows.some(r => r.kind === 'transit') },
        ];
        return (
          <section key={j.trip.id} className="rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-1" aria-label={j.trip.title}>
            <div className="flex items-baseline justify-between gap-3">
              <button type="button" onClick={() => onOpenBooking(j.trip.id, 'summary', null)} className="min-w-0 text-left cursor-pointer group">
                <span className="block text-base sm:text-lg font-extrabold tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{j.trip.title}</span>
                <span className="block font-mono text-micro text-black/60 dark:text-white/60 tabular-nums">{j.trip.date}</span>
              </button>
              <span className={`shrink-0 font-mono text-meta font-bold tabular-nums ${live ? 'text-red-600 dark:text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                {live ? 'LIVE' : dLabel(jDays)}
              </span>
            </div>

            {/* What is booked, at a glance */}
            <div className="flex flex-wrap gap-1.5 py-2" aria-label="예약 상태">
              {kinds.map(({ kind, label, has }) => {
                const Icon = ICON[kind];
                return (
                  <span key={kind} className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-meta font-bold ${
                    has ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400' : 'border border-black/15 dark:border-white/15 text-black/50 dark:text-white/50'
                  }`}>
                    <Icon className="w-3.5 h-3.5" aria-hidden />{label} {has ? '완료' : '없음'}
                  </span>
                );
              })}
            </div>

            {j.rows.map(r => {
              const Icon = ICON[r.kind];
              const days = r.date ? daysFrom(r.date, now) : null;
              const soon = days !== null && days >= 0 && days <= SOON_DAYS;
              return (
                <div key={`${r.kind}-${r.id}`} className={`flex items-center gap-3 py-2.5 border-t border-black/[0.07] dark:border-white/10 ${days !== null && days < 0 ? 'opacity-50' : ''}`}>
                  <button type="button" onClick={() => onOpenBooking(j.trip.id, TAB[r.kind], r.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer group">
                    <Icon className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
                    <span className="w-11 shrink-0 font-mono text-meta tabular-nums text-black/70 dark:text-white/70">{r.dateLabel}</span>
                    <span className="min-w-0 flex flex-col">
                      <span className="text-sm font-bold truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{r.title}</span>
                      {r.detail && <span className="text-meta text-black/60 dark:text-white/60 truncate">{r.detail}</span>}
                    </span>
                  </button>
                  {r.ref && (
                    <button type="button" onClick={() => copy(r.ref)} className="btn btn-secondary btn-sm tgl-press shrink-0 inline-flex" aria-label={`예약번호 ${r.ref} 복사`}>
                      <span className="max-w-[80px] truncate">{r.ref}</span>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className={`w-12 shrink-0 text-right font-mono text-meta font-bold tabular-nums ${soon ? 'text-red-600 dark:text-red-500' : 'text-black/55 dark:text-white/55'}`}>
                    {dLabel(days)}
                  </span>
                </div>
              );
            })}

            {(!j.hasFlight || !j.hasStay) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-black/[0.07] dark:border-white/10">
                {!j.hasFlight && (
                  <span className="flex items-center gap-2 text-meta">
                    <Plane className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                    <span className="text-black/60 dark:text-white/60">항공 찾기</span>
                    <SearchLink href={buildSkyscannerFlightUrl(ctx)}>Skyscanner</SearchLink>
                    <SearchLink href={buildNaverFlightUrl(ctx)}>네이버</SearchLink>
                  </span>
                )}
                {!j.hasStay && (
                  <span className="flex items-center gap-2 text-meta">
                    <BedDouble className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                    <span className="text-black/60 dark:text-white/60">숙소 찾기</span>
                    <SearchLink href={buildAgodaUrl(ctx)}>Agoda</SearchLink>
                    <SearchLink href={buildBookingComUrl(ctx)}>Booking.com</SearchLink>
                  </span>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SearchLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline decoration-black/25 dark:decoration-white/25 underline-offset-4 hover:text-red-600 dark:hover:text-red-500 hover:decoration-current">
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
