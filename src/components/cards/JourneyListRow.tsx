import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getEffectiveImageUrl } from '../../utils/storageHelper';

// A journey in list view (v1.3.5, spec 4.9): one surface card per trip on the paper ground.
// Thumbnail · year/month and status · title · place, dates and days. Used by Home and Trips.

export type JourneyRowBadge =
  | { kind: 'live'; text: string }
  | { kind: 'plan'; text: string }
  | { kind: 'new' | 'editing'; text: string };

interface JourneyListRowProps {
  img: string;
  title: string;
  year: string;
  month?: string;
  /** Place, dates and days, already joined */
  meta: React.ReactNode;
  badge?: JourneyRowBadge | null;
  /** D-n shown on the thumbnail of a plan */
  dDay?: string;
  active?: boolean;
  onOpen: () => void;
  onPreload?: () => void;
  style?: React.CSSProperties;
}

const BADGE: Record<JourneyRowBadge['kind'], string> = {
  live: 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark',
  plan: 'bg-amber-500 text-black',
  new: 'bg-red-600 text-white dark:bg-red-500',
  editing: 'bg-amber-500 text-black',
};

export function JourneyListRow({ img, title, year, month, meta, badge, dDay, active, onOpen, onPreload, style }: JourneyListRowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={onPreload}
      onTouchStart={onPreload}
      style={style}
      className={`group w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-card bg-surface dark:bg-surface-dark text-left select-none transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
        active ? 'ring-[1.5px] ring-inset ring-red-600 dark:ring-red-500' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
      }`}
    >
      <span className={`relative w-20 sm:w-28 aspect-[4/3] shrink-0 rounded-thumb overflow-hidden bg-black/[0.06] dark:bg-white/10 ${badge?.kind === 'plan' ? 'outline outline-[1.5px] outline-dashed outline-offset-2 outline-amber-500' : ''}`}>
        <img src={getEffectiveImageUrl(img)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {dDay && (
          <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-mono text-micro font-bold leading-none tabular-nums">
            {dDay}
          </span>
        )}
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-micro sm:text-meta tabular-nums">
            <span className="font-extrabold tracking-tight">{year}</span>
            {month && <span className="font-bold uppercase text-black/60 dark:text-white/60">{month}</span>}
          </span>
          {badge && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-micro font-bold uppercase tracking-wider leading-tight ${BADGE[badge.kind]}`}>
              {badge.kind === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-pulse" />}
              {badge.text}
            </span>
          )}
        </span>
        <span className="text-[15px] sm:text-lg font-extrabold tracking-tight truncate transition-colors group-hover:text-red-600 dark:group-hover:text-red-500">
          {title}
        </span>
        <span className="flex items-center justify-between gap-2 font-mono text-micro sm:text-meta text-black/60 dark:text-white/60">
          <span className="truncate min-w-0">{meta}</span>
          <ArrowUpRight className="w-4 h-4 shrink-0 text-black dark:text-white transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}
