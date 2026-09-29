import React from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';

// One transport for every full-screen player (photo slideshow, Memory Reel, Intro):
//  - PlayerTopBar: progress segments, a label, the count and close, in one line at the top
//  - PlayerDock: a single bottom-centre pill (leading · prev · play · next · trailing);
//    an optional panel opens above it for everything else

interface DockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export function DockButton({ label, active, className = '', children, ...rest }: DockButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`tgl-press tap-target w-10 h-10 shrink-0 rounded-full grid place-items-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
        active ? 'text-red-400 bg-white/10' : 'text-white/85 hover:text-white hover:bg-white/15'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-5 bg-white/20 mx-0.5 shrink-0" aria-hidden />;

interface PlayerDockProps {
  visible: boolean;
  playing: boolean;
  onTogglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  prevIcon?: React.ReactNode;
  nextIcon?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Opens above the pill (settings, playlist, thumbnails) */
  panel?: React.ReactNode;
  /** Floats above the pill without taking clicks (volume readout) */
  hud?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PlayerDock({
  visible, playing, onTogglePlay, onPrev, onNext,
  prevLabel = '이전', nextLabel = '다음', prevIcon, nextIcon,
  leading, trailing, panel, hud, className = '', style,
}: PlayerDockProps) {
  return (
    <div className={`flex flex-col items-center gap-2 pointer-events-none ${className}`} style={style} onClick={(e) => e.stopPropagation()}>
      {panel}
      {hud}
      <div
        className={`flex items-center gap-0.5 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white transition-opacity duration-base ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
      >
        {leading}
        {leading && <Sep />}
        {onPrev && (
          <DockButton label={prevLabel} onClick={onPrev}>
            {prevIcon ?? <ChevronLeft className="w-5 h-5" />}
          </DockButton>
        )}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? '일시정지' : '재생'}
          title={playing ? '일시정지 (Space)' : '재생 (Space)'}
          className="tgl-press tap-target w-11 h-11 mx-0.5 shrink-0 rounded-full bg-white text-black grid place-items-center hover:bg-neutral-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-[1px]" />}
        </button>
        {onNext && (
          <DockButton label={nextLabel} onClick={onNext}>
            {nextIcon ?? <ChevronRight className="w-5 h-5" />}
          </DockButton>
        )}
        {trailing && <Sep />}
        {trailing}
      </div>
    </div>
  );
}

/** The panel that opens above the dock */
export function DockPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] max-h-[55dvh] overflow-y-auto overscroll-contain flex flex-col gap-3 p-3 bg-black/85 backdrop-blur-md border border-white/20 text-white animate-in fade-in slide-in-from-bottom-2 duration-150">
      {children}
    </div>
  );
}

export function DockPanelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="font-mono text-micro uppercase tracking-widest text-white/60 shrink-0">{label}</span>
      <div className="min-w-0 flex items-center justify-end gap-1.5">{children}</div>
    </div>
  );
}

interface PlayerTopBarProps {
  visible: boolean;
  count: number;
  index: number;
  /** 0–1 progress of the current segment when driven by state */
  progress?: number;
  /** Or: animate the current segment over this many ms with CSS */
  segmentMs?: number;
  running?: boolean;
  /** Changes whenever the current segment should restart its animation */
  segmentKey?: string | number;
  label?: React.ReactNode;
  countLabel?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

const MAX_SEGMENTS = 40;

export function PlayerTopBar({
  visible, count, index, progress, segmentMs, running = true, segmentKey,
  label, countLabel, onClose, closeLabel = '닫기',
}: PlayerTopBarProps) {
  const fill = (i: number): React.CSSProperties => {
    if (i < index) return { transform: 'scaleX(1)' };
    if (i > index) return { transform: 'scaleX(0)' };
    if (segmentMs) {
      return {
        transform: 'scaleX(0)',
        animation: `tglReelProgress ${segmentMs}ms linear forwards`,
        animationPlayState: running ? 'running' : 'paused',
      };
    }
    return { transform: `scaleX(${Math.max(0, Math.min(1, progress ?? 0))})` };
  };
  const continuous = count > MAX_SEGMENTS;

  return (
    <div
      className="absolute top-0 inset-x-0 z-[45] px-4 sm:px-8 pb-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className={`transition-opacity duration-base ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {continuous ? (
          <div className="h-[2px] bg-white/25 overflow-hidden">
            <div className="h-full bg-red-500 origin-left" style={{ transform: `scaleX(${(index + (progress ?? 0)) / count})` }} />
          </div>
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="h-[2px] flex-1 bg-white/25 overflow-hidden">
                <div
                  key={i === index ? `cur-${segmentKey ?? index}` : undefined}
                  className={`h-full origin-left ${i === index ? 'bg-red-500' : 'bg-white'}`}
                  style={fill(i)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className={`min-w-0 flex items-center gap-3 font-mono text-micro sm:text-meta tracking-[0.16em] uppercase text-white/85 transition-opacity duration-base ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {countLabel && <span className="tabular-nums shrink-0">{countLabel}</span>}
          {label && <span className="truncate text-white/60">{label}</span>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`pointer-events-auto tgl-press tap-target w-10 h-10 shrink-0 rounded-full grid place-items-center text-white bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 transition-opacity duration-base cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${visible ? 'opacity-100' : 'opacity-40'}`}
          aria-label={closeLabel}
          title={`${closeLabel} (Esc)`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
