import React, { useCallback } from 'react';
import { useCanvasScene } from './useCanvasScene';
import { createEmptyScene, type EmptySceneKind } from './emptyScenes';

interface EmptySceneProps {
  kind: EmptySceneKind;
  title: string;
  copy?: string;
  action?: { label: string; onClick: () => void };
  /** Shorter stage for sections inside a page */
  compact?: boolean;
  className?: string;
}

// An empty hub as a small scene (v1.3.6): the traveler acts out what will fill this place,
// one line says what it is, one button starts it.
export function EmptyScene({ kind, title, copy, action, compact, className = '' }: EmptySceneProps) {
  const make = useCallback(() => createEmptyScene(kind), [kind]);
  const canvasRef = useCanvasScene(make, 3);
  return (
    <div className={`rounded-card bg-surface dark:bg-surface-dark flex flex-col items-center text-center gap-3 px-6 pb-8 pt-4 sm:pb-10 ${className}`}>
      <canvas ref={canvasRef} aria-hidden className={`w-full max-w-[520px] ${compact ? 'h-[150px] sm:h-[170px]' : 'h-[180px] sm:h-[220px]'}`} />
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink dark:text-ink-dark break-keep">{title}</h2>
      {copy && <p className="text-[14px] text-black/60 dark:text-white/60 max-w-md break-keep leading-relaxed">{copy}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="btn btn-accent mt-1">{action.label}</button>
      )}
    </div>
  );
}
