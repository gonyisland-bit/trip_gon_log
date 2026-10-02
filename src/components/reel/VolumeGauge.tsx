import React, { useCallback, useRef } from 'react';

// Volume gauge for the Memory Reel: a tall dark pill that fills from the bottom with white, like the player dock
// it rises from. Drag or tap anywhere on it, up for louder. The number above it is the mute switch.

interface VolumeGaugeProps {
  /** 0–100 */
  value: number;
  muted: boolean;
  onChange: (value: number) => void;
  onToggleMute: () => void;
  /** Any touch or change, so the gauge can stay up while it is being used */
  onActivity?: () => void;
  className?: string;
}

const STEP = 5;

export function VolumeGauge({ value, muted, onChange, onToggleMute, onActivity, className = '' }: VolumeGaugeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const shown = muted ? 0 : value;

  const setFromPointer = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = 1 - (clientY - r.top) / Math.max(1, r.height);
    const next = Math.round((Math.max(0, Math.min(1, ratio)) * 100) / STEP) * STEP;
    onChange(next);
    onActivity?.();
  }, [onChange, onActivity]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromPointer(e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) setFromPointer(e.clientY);
  };
  const onPointerUp = () => { draggingRef.current = false; };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(100, shown + STEP)); onActivity?.(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, shown - STEP)); onActivity?.(); }
  };

  return (
    <div
      className={`tgl-vgauge-in flex flex-col items-center gap-2 pointer-events-auto select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => { onToggleMute(); onActivity?.(); }}
        aria-label={muted ? '소리 켜기 (M)' : '소리 끄기 (M)'}
        className="tgl-press h-6 min-w-10 px-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 font-mono text-micro font-bold tabular-nums text-white/90 hover:text-white"
      >
        {muted ? 'OFF' : `${value}`}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="음량"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        onKeyDown={onKeyDown}
        className="w-10 h-32 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 touch-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative w-full h-full rounded-full overflow-hidden bg-white/15"
        >
          <div
            className="absolute inset-x-0 bottom-0 bg-white"
            style={{ height: `${shown}%`, transition: draggingRef.current ? 'none' : 'height 120ms var(--ease-cross)' }}
          />
        </div>
      </div>
    </div>
  );
}
