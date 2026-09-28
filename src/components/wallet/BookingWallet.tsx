import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BedDouble, Copy, ExternalLink, Plane, TrainFront, X } from 'lucide-react';
import { Trip, Plan, FlightItem, StayItem, TransitItem } from '../../types';
import { parseTripDateRange } from '../../utils/tripPlanHelper';
import { bookingContextFromTrip, buildAgodaUrl, buildBookingComUrl, buildNaverFlightUrl, buildSkyscannerFlightUrl } from '../../utils/bookingDeepLinks';
import { notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { useBackToClose } from '../../utils/overlayHistory';

// Booking Wallet (v1.3 P5): every flight, stay and transit booking of the
// journeys still ahead, on one screen, with a D-day on each check-in.
// Rows open the booking in the journey; journeys missing a flight or a stay
// get prefilled search links instead.

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

interface BookingWalletProps {
  trips: Trip[];
  plans: Plan[];
  flightsByTrip: Record<number, FlightItem[]>;
  staysByTrip: Record<number, StayItem[]>;
  transitByTrip: Record<number, TransitItem[]>;
  onClose: () => void;
  onOpenBooking: (tripId: number, tab: string, itemId: number | null) => void;
  onNewTrip: () => void;
}

export function BookingWallet({ trips, plans, flightsByTrip, staysByTrip, transitByTrip, onClose, onOpenBooking, onNewTrip }: BookingWalletProps) {
  useBackToClose(true, onClose);
  const [leaving, setLeaving] = useState(false);
  // Close buttons and Escape leave with the lobby exit motion; row taps that navigate close at once
  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) { onClose(); return; }
    setLeaving(true);
    window.setTimeout(onClose, 380);
  }, [onClose]);
  const journeys = useMemo(() => buildJourneys(trips, plans, flightsByTrip, staysByTrip, transitByTrip), [trips, plans, flightsByTrip, staysByTrip, transitByTrip]);
  const now = today0();

  // The next check-in across every journey
  const next = useMemo(() => {
    for (const j of journeys) for (const r of j.rows) if (r.date && daysFrom(r.date, now) >= 0) return { j, r };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [requestClose]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notify(`${text} 복사했습니다.`, 'success'); }
    catch { notify('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.', 'error'); }
  };

  const open = (tripId: number, tab: string, itemId: number | null) => { onClose(); onOpenBooking(tripId, tab, itemId); };

  const nextDays = next?.r.date ? daysFrom(next.r.date, now) : null;
  const NextIcon = next ? ICON[next.r.kind] : Plane;

  return (
    <div
      role="dialog"
      aria-label="예약 지갑"
      className={`fixed inset-0 z-[185] bg-white dark:bg-[#111111] text-black dark:text-white overflow-y-auto overscroll-contain ${prefersReducedMotion() ? '' : leaving ? 'tgl-lobby-out' : 'tgl-lobby-in'}`}
    >
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 pt-4 pb-28 flex flex-col gap-8">
        {/* Top bar */}
        <div style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top, 0px))' }} className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 pb-3 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-sm border-b border-black/15 dark:border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-sans font-extrabold text-xl tracking-tight">Wallet</span>
            <span className="font-mono text-meta text-black/60 dark:text-white/60 tabular-nums">
              {journeys.length} journeys · {journeys.reduce((n, j) => n + j.rows.length, 0)} bookings
            </span>
          </div>
          <button type="button" onClick={requestClose} className="tgl-press tap-target w-9 h-9 grid place-items-center border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Next check-in */}
        {next && (
          <button
            type="button"
            onClick={() => open(next.j.trip.id, TAB[next.r.kind], next.r.id)}
            className="tgl-press tgl-rise group text-left flex items-stretch gap-5 border-y border-black/20 dark:border-white/20 py-4 cursor-pointer"
          >
            <span className={`shrink-0 min-w-[88px] font-sans font-extrabold leading-none tracking-[-0.05em] tabular-nums text-5xl sm:text-6xl self-center ${
              nextDays !== null && nextDays <= SOON_DAYS ? 'text-red-600 dark:text-red-500' : ''
            }`}>
              {nextDays === 0 ? 'D-DAY' : `D-${nextDays}`}
            </span>
            <span className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60 flex items-center gap-1.5">
                <NextIcon className="w-3.5 h-3.5" /> Next · {next.r.dateLabel}
              </span>
              <span className="text-lg font-extrabold tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{next.r.title}</span>
              <span className="text-sm text-black/65 dark:text-white/65 truncate">{next.j.trip.title}</span>
            </span>
          </button>
        )}

        {journeys.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <p className="text-black/60 dark:text-white/60">다가오는 여정이 없습니다.</p>
            <button type="button" onClick={() => { onClose(); onNewTrip(); }} className="tgl-press h-10 px-5 bg-black text-white dark:bg-white dark:text-black text-sm font-bold cursor-pointer hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white">
              새 여정 만들기
            </button>
          </div>
        )}

        {journeys.map((j, ji) => {
          const jDays = daysFrom(j.start, now);
          const live = jDays <= 0;
          const ctx = bookingContextFromTrip(j.trip, { start: j.start, end: j.end }, j.firstFlight);
          return (
            <section key={j.trip.id} className="tgl-rise flex flex-col" style={{ '--i': ji } as React.CSSProperties} aria-label={j.trip.title}>
              <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-black/80 dark:border-white/80">
                <button type="button" onClick={() => open(j.trip.id, 'summary', null)} className="min-w-0 text-left cursor-pointer group">
                  <span className="block text-base sm:text-lg font-extrabold tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{j.trip.title}</span>
                  <span className="block font-mono text-micro text-black/60 dark:text-white/60 tabular-nums">{j.trip.date}</span>
                </button>
                <span className={`shrink-0 font-mono text-meta font-bold tabular-nums ${live ? 'text-red-600 dark:text-red-500' : 'text-black/70 dark:text-white/70'}`}>
                  {live ? 'LIVE' : dLabel(jDays)}
                </span>
              </div>

              {j.rows.map(r => {
                const Icon = ICON[r.kind];
                const days = r.date ? daysFrom(r.date, now) : null;
                const soon = days !== null && days >= 0 && days <= SOON_DAYS;
                return (
                  <div key={`${r.kind}-${r.id}`} className={`flex items-center gap-3 py-3 border-b border-black/10 dark:border-white/10 ${days !== null && days < 0 ? 'opacity-50' : ''}`}>
                    <button type="button" onClick={() => open(j.trip.id, TAB[r.kind], r.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer group">
                      <Icon className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
                      <span className="w-12 shrink-0 font-mono text-meta tabular-nums text-black/70 dark:text-white/70">{r.dateLabel}</span>
                      <span className="min-w-0 flex flex-col">
                        <span className="text-sm font-bold truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{r.title}</span>
                        {r.detail && <span className="text-meta text-black/60 dark:text-white/60 truncate">{r.detail}</span>}
                      </span>
                    </button>
                    {r.ref && (
                      <button type="button" onClick={() => copy(r.ref)} className="tgl-press shrink-0 h-8 px-2 inline-flex items-center gap-1.5 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white font-mono text-meta tracking-wider cursor-pointer" aria-label={`예약번호 ${r.ref} 복사`}>
                        <span className="max-w-[88px] truncate">{r.ref}</span>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className={`w-14 shrink-0 text-right font-mono text-meta font-bold tabular-nums ${soon ? 'text-red-600 dark:text-red-500' : 'text-black/55 dark:text-white/55'}`}>
                      {dLabel(days)}
                    </span>
                  </div>
                );
              })}

              {(!j.hasFlight || !j.hasStay) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
                  {!j.hasFlight && (
                    <span className="flex items-center gap-2 text-meta">
                      <Plane className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                      <span className="text-black/60 dark:text-white/60">항공 없음</span>
                      <SearchLink href={buildSkyscannerFlightUrl(ctx)}>Skyscanner</SearchLink>
                      <SearchLink href={buildNaverFlightUrl(ctx)}>네이버</SearchLink>
                    </span>
                  )}
                  {!j.hasStay && (
                    <span className="flex items-center gap-2 text-meta">
                      <BedDouble className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                      <span className="text-black/60 dark:text-white/60">숙소 없음</span>
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
