import React, { useEffect, useRef, useState } from 'react';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { ArrowUpRight } from 'lucide-react';
import { Trip } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { getUpcomingPlanInfo, getLiveTripStatus } from '../../utils/tripPlanHelper';

// Journey card (v1.3): the year is the first thing you read, set large on the photo.
// Below the photo: period, title, short line (ment) and place, in that order.

export interface JourneyCardDisplay {
  topYearMonth: string;    // "2026 · JUN"
  line2DateDays: string;   // "06.13-06.15, 3 DAYS"
  line3CountryCity: string;
  editorialSubtitle: string;
}

interface JourneyCardProps {
  trip: Trip;
  display: JourneyCardDisplay;
  isActive: boolean;
  isWide: boolean;
  index?: number;
  draggable?: boolean;
  onOpen: () => void;
  onPreload?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

// Plans are shown in grey and regain colour over the last 30 days before departure
function planGrayscale(daysLeft: number, isUpcoming: boolean): number {
  if (!isUpcoming) return 0.85;
  return Math.max(0, Math.min(0.85, (daysLeft / 30) * 0.85));
}

export function JourneyCard({
  trip, display, isActive, isWide, index = 0, draggable,
  onOpen, onPreload, onDragStart, onDragOver, onDrop, onDragEnd,
}: JourneyCardProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const planInfo = getUpcomingPlanInfo(trip);
  const isPlan = planInfo.isPlanOrFuture || trip.statusBadge === 'PLAN';
  const live = getLiveTripStatus(trip.date);

  const [year, month] = display.topYearMonth.split('·').map(s => s.trim());
  const [dateRange, duration] = display.line2DateDays.includes(',')
    ? display.line2DateDays.split(',').map(s => s.trim())
    : [display.line2DateDays, ''];
  const rightMeta = isPlan && planInfo.dDayLabel !== 'PLAN' ? planInfo.dDayLabel : duration;

  // Pointer parallax: the photo drifts a few pixels away from the pointer
  const handlePointerMove = (e: React.PointerEvent) => {
    const el = mediaRef.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * -10}px`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * -10}px`);
  };
  const resetParallax = () => {
    mediaRef.current?.style.removeProperty('--mx');
    mediaRef.current?.style.removeProperty('--my');
  };

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      onMouseEnter={onPreload}
      onTouchStart={onPreload}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
      tabIndex={0}
      aria-label={`${year} ${trip.title}`}
      className="tgl-journey-card tgl-rise group relative flex flex-col gap-3 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#11110F]"
      style={{ '--i': index } as React.CSSProperties}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Photo with the year */}
      <div
        ref={mediaRef}
        className={`tgl-journey-media relative ${isWide ? 'aspect-[16/10]' : 'aspect-[4/5]'} w-full overflow-hidden rounded-card bg-black/5 dark:bg-white/5 ${
          isPlan ? 'outline outline-2 outline-dashed outline-offset-2 outline-amber-500' : ''
        } ${isActive ? 'ring-2 ring-red-600/60 ring-offset-2 dark:ring-offset-[#11110F]' : ''}`}
      >
        {/* Only the photo goes grey, so the plan outline and badge keep their amber */}
        <div
          className="absolute inset-0"
          style={isPlan ? { filter: `grayscale(${planGrayscale(planInfo.daysLeft, planInfo.isUpcoming)})` } : undefined}
        >
          <CardMedia img={cardCoverUrl(trip)} title={trip.title} videoUrl={trip.videoUrl} isActive={isActive} />
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        <div className="absolute left-3 top-2 sm:left-4 sm:top-3 text-white pointer-events-none">
          <div className={`font-sans font-extrabold leading-none tracking-[-0.05em] tabular-nums ${isWide ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}>
            {year}
          </div>
          {month && <div className="mt-1 font-mono text-micro font-semibold tracking-[0.14em] opacity-90">{month}</div>}
        </div>

        {live.isLive ? (
          <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 font-mono text-micro font-bold tracking-wider text-white pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-pulse" />
            <span>DAY {live.currentDay}/{live.totalDays}</span>
          </div>
        ) : isPlan ? (
          <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-black font-mono text-micro font-bold tracking-wider pointer-events-none">
            <span>PLAN</span>
            {planInfo.dDayLabel && planInfo.dDayLabel !== 'PLAN' && <span className="tabular-nums">· {planInfo.dDayLabel}</span>}
          </div>
        ) : (trip.statusBadge === 'NEW' || trip.statusBadge === 'EDITING') && (
          <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 px-2.5 py-1 rounded-full bg-black/35 font-mono text-micro font-bold tracking-wider text-white pointer-events-none flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${trip.statusBadge === 'NEW' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <span>{trip.statusBadge}</span>
          </div>
        )}
      </div>

      {/* Period */}
      <div className="flex items-baseline justify-between gap-2 font-mono text-meta tabular-nums">
        <span className="font-semibold text-black dark:text-white truncate">{dateRange || trip.date}</span>
        {rightMeta && (
          <span className={`shrink-0 ${isPlan ? 'font-semibold text-amber-600 dark:text-amber-500' : 'text-black/60 dark:text-white/60'}`}>
            {rightMeta}
          </span>
        )}
      </div>

      {/* Title and ment */}
      <div className="flex flex-col gap-1 -mt-1">
        <h3 className={`font-extrabold tracking-tight leading-snug break-keep line-clamp-2 text-black dark:text-white transition-colors duration-base group-hover:text-red-600 dark:group-hover:text-red-500 ${
          isWide ? 'text-base sm:text-lg md:text-xl' : 'text-sm sm:text-base md:text-lg'
        }`}>
          {trip.title}
        </h3>
        {display.editorialSubtitle && (
          <p className="text-meta sm:text-[13px] text-black/60 dark:text-white/65 leading-relaxed line-clamp-2 break-keep">
            {display.editorialSubtitle}
          </p>
        )}
      </div>

      {/* Place */}
      <div className="mt-auto pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2 font-mono text-micro sm:text-meta uppercase tracking-wider">
        <span className="truncate text-black/80 dark:text-white/80">{display.line3CountryCity || 'JOURNEY'}</span>
        <ArrowUpRight className="w-4 h-4 shrink-0 text-black dark:text-white transition-transform duration-base ease-emphasized group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-red-600 dark:group-hover:text-red-500" />
      </div>
    </article>
  );
}

interface CardMediaProps {
  img: string;
  title: string;
  videoUrl?: string;
  isActive: boolean;
}

// Cover photo (plus an optional muted clip that plays while the card is active)
export function CardMedia({ img, title, videoUrl, isActive }: CardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => localStorage.getItem('playVideoOnActivate') !== 'false');

  useEffect(() => {
    const handleConfigChange = () => setAutoplayEnabled(localStorage.getItem('playVideoOnActivate') !== 'false');
    window.addEventListener('playVideoConfigChanged', handleConfigChange);
    return () => window.removeEventListener('playVideoConfigChanged', handleConfigChange);
  }, []);

  useEffect(() => {
    if (!autoplayEnabled || !videoUrl || !videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.play()?.catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, videoUrl, autoplayEnabled]);

  return (
    <>
      <img
        src={getEffectiveImageUrl(img)}
        alt={title}
        loading="lazy"
        className="tgl-journey-photo absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      {videoUrl && autoplayEnabled && isActive && (
        <video
          ref={videoRef}
          src={getEffectiveImageUrl(videoUrl)}
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
    </>
  );
}
