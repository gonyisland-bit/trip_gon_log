import React, { useMemo } from 'react';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Trip, Plan, TimelineData, FlightItem, StayItem, TransitItem } from '../../types';
import { buildBoard, openJourneyBoard } from '../board/boardData';
import { generateDateList } from '../../pages/detail/detailUtils';
import { getLiveTripStatus, getUpcomingPlanInfo, parseTripStartDate } from '../../utils/tripPlanHelper';
import { CountUp } from '../CountUp';

// Home "now" strip (v1.3). Shows the one thing that matters at this moment:
//  - during a trip: the live day
//  - up to 120 days before departure: a countdown, with booking and planning progress and the board
//  - otherwise: a journey from the same week in an earlier year

const UPCOMING_WINDOW_DAYS = 120;
const MEMORY_WINDOW_DAYS = 7;

type Phase =
  | { kind: 'live'; trip: Trip | Plan; day: number; total: number }
  | { kind: 'upcoming'; trip: Trip | Plan; daysLeft: number }
  | { kind: 'memory'; trip: Trip | Plan; yearsAgo: number };

function dayOfYearDistance(a: Date, b: Date): number {
  const ay = new Date(2000, a.getMonth(), a.getDate()).getTime();
  const by = new Date(2000, b.getMonth(), b.getDate()).getTime();
  const diff = Math.abs(ay - by) / 86400000;
  return Math.min(diff, 366 - diff);
}

function resolvePhase(trips: Trip[], plans: Plan[]): Phase | null {
  const all = [...trips, ...plans];

  for (const t of all) {
    const live = getLiveTripStatus(t.date);
    if (live.isLive) return { kind: 'live', trip: t, day: live.currentDay, total: live.totalDays };
  }

  const upcoming = all
    .map(t => ({ t, info: getUpcomingPlanInfo(t) }))
    .filter(({ info }) => info.isUpcoming && info.daysLeft <= UPCOMING_WINDOW_DAYS)
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft)[0];
  if (upcoming) return { kind: 'upcoming', trip: upcoming.t, daysLeft: upcoming.info.daysLeft };

  const today = new Date();
  const memory = trips
    .map(t => ({ t, start: parseTripStartDate(t.date || '') }))
    .filter((x): x is { t: Trip; start: Date } => !!x.start && x.start.getFullYear() < today.getFullYear())
    .filter(({ start }) => dayOfYearDistance(start, today) <= MEMORY_WINDOW_DAYS)
    .sort((a, b) => b.start.getTime() - a.start.getTime())[0];
  if (memory) return { kind: 'memory', trip: memory.t, yearsAgo: today.getFullYear() - memory.start.getFullYear() };

  return null;
}

interface JourneyPhaseStripProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  timelineData?: TimelineData;
  flightsByTrip?: Record<number, FlightItem[]>;
  staysByTrip?: Record<number, StayItem[]>;
  transitByTrip?: Record<number, TransitItem[]>;
}

// One progress line on a tinted panel (spec 4.2: the bar takes the tint's own ink)
function Progress({ label, done, total, ink }: { label: string; done: number; total: number; ink: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[13px] font-bold">
        <span className="truncate">{label}</span>
        <span className="font-mono text-meta font-semibold tabular-nums opacity-75">{done} / {total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.08] dark:bg-white/10 overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className={`h-full rounded-full ${ink} transition-[width] duration-emph ease-emphasized`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function JourneyPhaseStrip({ trips, plans, onNavigate, timelineData = {}, flightsByTrip = {}, staysByTrip = {}, transitByTrip = {} }: JourneyPhaseStripProps) {
  const phase = useMemo(() => resolvePhase(trips, plans), [trips, plans]);
  const board = useMemo(() => {
    if (!phase || phase.kind === 'memory') return null;
    const t = phase.trip;
    return buildBoard(t, timelineData, flightsByTrip[t.id] || [], staysByTrip[t.id] || [], transitByTrip[t.id] || []);
  }, [phase, timelineData, flightsByTrip, staysByTrip, transitByTrip]);
  if (!phase) return null;

  const { trip } = phase;
  const place = (trip.locationStr || '').split(',')[0].trim();

  // During a trip or before one: a tinted panel with a two-tone title, progress and the board
  if (board && phase.kind !== 'memory') {
    const live = phase.kind === 'live';
    const tint = live ? 'bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach' : 'bg-butter text-butter-ink dark:bg-butter-dark dark:text-butter';
    const ink = live ? 'bg-peach-ink dark:bg-peach' : 'bg-butter-ink dark:bg-butter';
    const days = generateDateList(trip.date || '');
    const filledDays = days.filter(d => (timelineData[d] || []).some(i => i.tripId === trip.id)).length;
    const booked = (board.flights.length ? 1 : 0) + (board.stays.length ? 1 : 0);
    const todayDone = board.focusDay.filter(i => i.at.past).length;
    return (
      <aside aria-label={live ? '진행 중인 여행' : '다가오는 여행'} className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-4 sm:pt-6">
        <div className={`tgl-rise rounded-card ${tint} p-5 sm:p-6 flex flex-col gap-5`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="flex items-center gap-2 font-mono text-micro sm:text-meta font-bold uppercase tracking-[0.14em] opacity-80">
                {live && <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-live-pulse" />}
                {live ? `Live · Day ${phase.day}/${phase.total}` : `Up next · ${trip.date}`}
              </span>
              <h2 className="text-[28px] sm:text-[40px] font-extrabold tracking-[-0.035em] leading-[1.02] break-keep">
                {live ? '여행 중' : '다음 여행'}
                <br />
                <span className="opacity-60 tabular-nums">
                  {place || trip.title}, {live ? `DAY ${phase.day}` : phase.daysLeft === 0 ? 'D-DAY' : <>D-<CountUp value={phase.daysLeft} /></>}
                </span>
              </h2>
              <span className="text-[13px] font-semibold opacity-75 truncate">{trip.title}</span>
            </div>
            {trip.img && (
              <div className="hidden sm:block w-28 md:w-36 aspect-[4/5] overflow-hidden rounded-thumb shrink-0 bg-black/5">
                <img src={cardCoverUrl(trip)} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {live ? (
              <>
                <Progress label="오늘 일정" done={todayDone} total={board.focusDay.length} ink={ink} />
                <Progress label="여행 일정" done={phase.day} total={phase.total} ink={ink} />
              </>
            ) : (
              <>
                <Progress label="예약 챙기기 · 항공 · 숙소" done={booked} total={2} ink={ink} />
                <Progress label="일정 채우기" done={filledDays} total={days.length || 1} ink={ink} />
              </>
            )}
          </div>

          {live && board.next && (
            <div className="flex items-center gap-3 rounded-thumb bg-surface/70 dark:bg-black/20 px-3 py-2.5 text-ink dark:text-ink-dark">
              <span className="font-mono text-meta font-bold text-red-600 dark:text-red-400 tabular-nums shrink-0">{board.next.time || '다음'}</span>
              <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{board.next.place}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-accent" onClick={() => openJourneyBoard(trip.id)}>
              <LayoutGrid className="w-4 h-4" aria-hidden />보드 열기
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onNavigate('detail', trip.id)}>
              여정 열기<ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const eyebrow =
    phase.kind === 'live' ? `LIVE · DAY ${phase.day}/${phase.total}` :
    phase.kind === 'upcoming' ? 'UP NEXT' :
    `${phase.yearsAgo}년 전 이맘때`;

  return (
    <aside
      aria-label={phase.kind === 'live' ? '진행 중인 여행' : phase.kind === 'upcoming' ? '다가오는 여행' : '지난 여행 회상'}
      className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-4 sm:pt-6"
    >
      <button
        type="button"
        onClick={() => onNavigate('detail', trip.id)}
        className="tgl-press tgl-rise group w-full text-left flex items-stretch gap-4 sm:gap-6 rounded-card bg-surface dark:bg-surface-dark px-4 sm:px-5 py-3 sm:py-4 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        {/* Big figure: live day, days left, or years ago */}
        <div className="shrink-0 flex flex-col justify-center min-w-[64px] sm:min-w-[96px]">
          <span className={`font-sans font-extrabold leading-none tracking-[-0.05em] tabular-nums text-4xl sm:text-6xl ${
            phase.kind === 'live' ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'
          }`}>
            {phase.kind === 'live' && <>D{phase.day}</>}
            {phase.kind === 'upcoming' && (phase.daysLeft === 0 ? 'D-DAY' : <>D-<CountUp value={phase.daysLeft} /></>)}
            {phase.kind === 'memory' && <>{phase.yearsAgo}Y</>}
          </span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <span className={`flex items-center gap-2 font-mono text-micro sm:text-meta font-bold uppercase tracking-widest ${
            phase.kind === 'live' ? 'text-red-600 dark:text-red-400' : phase.kind === 'upcoming' ? 'text-amber-600 dark:text-amber-500' : 'text-black/60 dark:text-white/60'
          }`}>
            {phase.kind === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-live-pulse" />}
            {eyebrow}
          </span>
          <span className="text-sm sm:text-lg font-extrabold tracking-tight text-black dark:text-white truncate transition-colors duration-base group-hover:text-red-600 dark:group-hover:text-red-500">
            {trip.title}
          </span>
          <span className="font-mono text-micro sm:text-meta text-black/60 dark:text-white/60 truncate">
            {[trip.date, place].filter(Boolean).join(' · ')}
          </span>
        </div>

        {/* Thumbnail + arrow */}
        <div className="shrink-0 flex items-center gap-3 sm:gap-4">
          {trip.img && (
            <div className="hidden sm:block w-24 md:w-32 aspect-[4/3] overflow-hidden rounded-thumb bg-black/5 dark:bg-white/5">
              <img
                src={cardCoverUrl(trip)}
                alt=""
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-hero ease-emphasized group-hover:scale-105 ${phase.kind === 'memory' ? 'grayscale group-hover:grayscale-0' : ''}`}
              />
            </div>
          )}
          <ArrowRight className="w-5 h-5 text-black dark:text-white transition-transform duration-base ease-emphasized group-hover:translate-x-1 group-hover:text-red-600 dark:group-hover:text-red-500" />
        </div>
      </button>
    </aside>
  );
}
