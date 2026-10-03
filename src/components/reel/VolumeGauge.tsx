import React, { useCallback, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Volume controls for the Memory Reel.
//  - VolumeGauge: a tall dark pill that fills from the bottom with white, like the player dock it rises from (phones).
//    Drag or tap anywhere on it, up for louder. The button above it (speaker and level) is the sound on / off switch.
//  - VolumeSlider: the same control laid flat inside the dock (wider screens), always in reach beside the speaker.

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
        aria-pressed={!muted}
        className="tgl-press h-9 min-w-[3.25rem] px-2.5 rounded-full bg-black/70 border border-white/15 inline-flex items-center justify-center gap-1 font-mono text-meta font-bold tabular-nums text-white"
      >
        {muted ? <VolumeX className="w-4 h-4" aria-hidden /> : <Volume2 className="w-4 h-4" aria-hidden />}
        <span>{muted ? 'OFF' : value}</span>
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
        className="w-11 h-40 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 touch-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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

interface VolumeSliderProps {
  /** 0–100 */
  value: number;
  muted: boolean;
  onChange: (value: number) => void;
  className?: string;
}

export function VolumeSlider({ value, muted, onChange, className = '' }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const shown = muted ? 0 : value;

  const setFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = (clientX - r.left) / Math.max(1, r.width);
    onChange(Math.round((Math.max(0, Math.min(1, ratio)) * 100) / STEP) * STEP);
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) setFromPointer(e.clientX);
  };
  const onPointerUp = () => { draggingRef.current = false; };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(100, shown + STEP)); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, shown - STEP)); }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="음량"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-valuetext={muted ? '소리 꺼짐' : `${value}%`}
      onKeyDown={onKeyDown}
      className={`items-center w-28 h-10 px-2 rounded-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${className}`}
    >
      {/* The whole 40px height takes the touch; the visible bar is a thin line inside it */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full h-10 touch-none cursor-pointer"
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/20" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white"
          style={{ width: `${shown}%`, transition: draggingRef.current ? 'none' : 'width 120ms var(--ease-cross)' }}
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow"
          style={{ left: `${shown}%`, transition: draggingRef.current ? 'none' : 'left 120ms var(--ease-cross)' }}
        />
      </div>
    </div>
  );
}
