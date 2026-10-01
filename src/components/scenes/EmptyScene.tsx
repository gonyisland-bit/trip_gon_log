import React from 'react';
import { Art } from '../../art/Art';
import type { ArtId } from '../../art/catalog';

export type EmptySceneKind =
  | 'trip' | 'pocket' | 'search'
  | 'ticket' | 'storage' | 'upcoming'
  | 'flights' | 'stays' | 'transit' | 'timeline'
  | 'spend' | 'settled' | 'calendar' | 'friends' | 'trash' | 'error';

interface EmptySceneProps {
  kind: EmptySceneKind;
  title: string;
  copy?: string;
  action?: { label: string; onClick: () => void };
  /** Shorter stage for sections inside a page */
  compact?: boolean;
  /** The smallest stage, for an empty list inside a card or a tab */
  mini?: boolean;
  /** No tinted card behind the scene (the parent already is one) */
  bare?: boolean;
  className?: string;
}

// An empty place as one scene (v1.3.8): the bear waits with what will fill it, one line says what it is,
// at most one button starts it. Each hub's tint sits behind its scene.
const TINT = {
  peach: 'bg-peach/45 dark:bg-peach-dark',
  sage: 'bg-sage/35 dark:bg-sage-dark',
  mist: 'bg-mist/60 dark:bg-mist-dark',
  butter: 'bg-butter/35 dark:bg-butter-dark',
  lilac: 'bg-lilac/55 dark:bg-lilac-dark',
} as const;

const SCENE: Record<EmptySceneKind, { art: ArtId; tint: keyof typeof TINT }> = {
  trip: { art: 'itinerary-empty', tint: 'peach' },
  pocket: { art: 'pocket-empty', tint: 'sage' },
  search: { art: 'no-results', tint: 'mist' },
  ticket: { art: 'waiting-gate', tint: 'butter' },
  storage: { art: 'luggage-travel-2', tint: 'butter' },
  upcoming: { art: 'train-station', tint: 'butter' },
  flights: { art: 'luggage-travel', tint: 'mist' },
  stays: { art: 'sleeping', tint: 'sage' },
  transit: { art: 'train-station', tint: 'mist' },
  timeline: { art: 'map-looking', tint: 'peach' },
  spend: { art: 'paying-bill', tint: 'peach' },
  settled: { art: 'beer-break', tint: 'sage' },
  calendar: { art: 'photo-memory', tint: 'mist' },
  friends: { art: 'outdoor-bistro', tint: 'lilac' },
  trash: { art: 'sofa-rest', tint: 'butter' },
  error: { art: 'pocket-empty', tint: 'mist' },
};

export function EmptyScene({ kind, title, copy, action, compact, mini, bare, className = '' }: EmptySceneProps) {
  const s = SCENE[kind];
  const stage = mini ? 'h-[104px] w-auto' : compact ? 'h-[150px] sm:h-[170px] w-auto' : 'h-[180px] sm:h-[220px] w-auto';
  const pad = mini ? 'px-4 py-4 gap-2' : 'px-6 pb-8 pt-6 sm:pb-10 gap-3';
  return (
    <div className={`${bare ? '' : `rounded-card ${TINT[s.tint]}`} flex flex-col items-center text-center ${pad} ${className}`}>
      <Art id={s.art} className={stage} />
      {mini
        ? <h2 className="text-[15px] font-extrabold tracking-tight text-ink dark:text-ink-dark break-keep">{title}</h2>
        : <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink dark:text-ink-dark break-keep">{title}</h2>}
      {copy && <p className="text-[14px] text-black/60 dark:text-white/60 max-w-md break-keep leading-relaxed">{copy}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="btn btn-accent mt-1">{action.label}</button>
      )}
    </div>
  );
}
