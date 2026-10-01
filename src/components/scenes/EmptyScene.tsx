import React from 'react';
import { Art } from '../../art/Art';
import type { ArtId } from '../../art/catalog';

export type EmptySceneKind = 'trip' | 'pocket' | 'search';

interface EmptySceneProps {
  kind: EmptySceneKind;
  title: string;
  copy?: string;
  action?: { label: string; onClick: () => void };
  /** Shorter stage for sections inside a page */
  compact?: boolean;
  className?: string;
}

// An empty hub as one scene (v1.3.8): the traveler waits with what will fill this place,
// one line says what it is, one button starts it. Each hub's tint sits behind its scene.
const SCENE: Record<EmptySceneKind, { art: ArtId; tint: string }> = {
  trip: { art: 'itinerary-empty', tint: 'bg-peach/45 dark:bg-peach-dark' },
  pocket: { art: 'pocket-empty', tint: 'bg-sage/35 dark:bg-sage-dark' },
  search: { art: 'no-results', tint: 'bg-mist/60 dark:bg-mist-dark' },
};

export function EmptyScene({ kind, title, copy, action, compact, className = '' }: EmptySceneProps) {
  const s = SCENE[kind];
  return (
    <div className={`rounded-card ${s.tint} flex flex-col items-center text-center gap-3 px-6 pb-8 pt-6 sm:pb-10 ${className}`}>
      <Art id={s.art} className={compact ? 'h-[150px] sm:h-[170px] w-auto' : 'h-[180px] sm:h-[220px] w-auto'} />
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink dark:text-ink-dark break-keep">{title}</h2>
      {copy && <p className="text-[14px] text-black/60 dark:text-white/60 max-w-md break-keep leading-relaxed">{copy}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="btn btn-accent mt-1">{action.label}</button>
      )}
    </div>
  );
}
