import React, { useMemo } from 'react';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { ArrowRight } from 'lucide-react';
import { Trip, Plan } from '../../types';
import { getLiveTripStatus, getUpcomingPlanInfo, parseTripStartDate } from '../../utils/tripPlanHelper';
import { CountUp } from '../CountUp';

// Home "now" strip (v1.3). Shows the one thing that matters at this moment:
//  - during a trip: the live day
//  - up to 60 days before departure: a countdown
//  - otherwise: a journey from the same week in an earlier year

const UPCOMING_WINDOW_DAYS = 60;
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
}

export function JourneyPhaseStrip({ trips, plans, onNavigate }: JourneyPhaseStripProps) {
  const phase = useMemo(() => resolvePhase(trips, plans), [trips, plans]);
  if (!phase) return null;

  const { trip } = phase;
  const place = (trip.locationStr || '').split(',')[0].trim();

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
