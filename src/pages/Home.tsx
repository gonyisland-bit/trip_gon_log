import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MoreVertical, Edit2, Trash2, GripVertical, Copy, ArrowUp } from 'lucide-react';
import { Trip, Plan } from '../types';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  handleMoveToArchive: (plan: Plan) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onCloneTrip?: (id: number) => void;
  onClonePlan?: (id: number) => void;
  homeTitle: string;
  homeSubtitle: string;
  heroJourneyIds?: number[];
  heroAutoSlide?: boolean;
  heroMediaType?: 'image' | 'video';
  onEditTrip?: (id: number) => void;
  onDeleteTrip?: (id: number) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  onReorderPlans?: (orderedIds: number[]) => void;
  isLoggedIn?: boolean;
}

function parseDateParts(dateStr: string, defaultYear?: number): Date | null {
  if (!dateStr) return null;
  
  const clean = dateStr.trim();
  
  // Match YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
  const match = clean.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  // Match YY.MM.DD or YY-MM-DD or YY/MM/DD (2-digit year)
  const match2 = clean.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match2) {
    let year = parseInt(match2[1], 10);
    year += year < 50 ? 2000 : 1900;
    const month = parseInt(match2[2], 10) - 1;
    const day = parseInt(match2[3], 10);
    return new Date(year, month, day);
  }

  // Match MM.DD (no year, e.g. "06.04")
  const matchMD = clean.match(/^(\d{1,2})[-./](\d{1,2})/);
  if (matchMD) {
    const year = defaultYear || new Date().getFullYear();
    const month = parseInt(matchMD[1], 10) - 1;
    const day = parseInt(matchMD[2], 10);
    return new Date(year, month, day);
  }
  
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function calculateDays(dateRangeStr: string): number {
  if (!dateRangeStr) return 0;
  const parts = dateRangeStr.split(/\s*[-—–]\s*/);
  if (parts.length < 2) return 1;
  const startDate = parseDateParts(parts[0].trim());
  const defaultYear = startDate ? startDate.getFullYear() : undefined;
  const endDate = parseDateParts(parts[1].trim(), defaultYear);
  if (!startDate || !endDate) return 1;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Helper to extract year and English short month for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string } {
  if (!dateRangeStr) return { year: '', month: '' };
  const parts = dateRangeStr.split(/\s*[-—–]\s*/);
  const cleanFirst = parts[0]?.trim();
  if (cleanFirst) {
    const dots = cleanFirst.split('.');
    if (dots.length >= 2) {
      const year = dots[0];
      const monthNum = parseInt(dots[1], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[monthNum - 1] || dots[1];
      return { year, month };
    }
  }
  return { year: '', month: '' };
}

// Journey card hamburger menu
export function JourneyCardMenu({
  onEdit,
  onDelete,
  isLoggedIn,
  onClone,
  onMove,
  moveLabel,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  isLoggedIn: boolean;
  onClone?: () => void;
  onMove?: () => void;
  moveLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isLoggedIn) return null;

  return (
    <div ref={menuRef} className="absolute bottom-3 right-3 z-20">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="메뉴"
        aria-label="Journey menu"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-32 bg-[#F9F8F6] dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 shadow-xl z-50 overflow-hidden">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Edit2 className="w-3 h-3" /> 수정
            </button>
          )}
          {onClone && (
            <button
              onClick={(e) => { e.stopPropagation(); onClone(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Copy className="w-3 h-3" /> 복제
            </button>
          )}
          {onMove && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowUp className="w-3 h-3" /> {moveLabel || '이동'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface HeroMediaProps {
  journey: Trip | Plan;
  isActive: boolean;
  mediaType: 'image' | 'video';
}

function HeroMedia({ journey, isActive, mediaType }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (mediaType === 'video' && journey.videoUrl && videoRef.current) {
      if (isActive) {
        // Reset to start and play immediately when active
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented or error:", error);
          });
        }
      } else {
        // Delay pausing for 1.5s to let the fade-out transition complete while playing
        timeoutId = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }, 1500);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isActive, mediaType, journey.videoUrl]);

  const hasVideo = mediaType === 'video' && journey.videoUrl;
  const hasImage = journey.img;

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-[1500ms] ${isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'}`}
      style={{ 
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          src={journey.videoUrl}
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />
      ) : hasImage ? (
        <img
          src={journey.img}
          alt={journey.title || "Hero Trip"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#EAE8E3] via-[#F4F3EF] to-[#D5D3CC] dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
      )}
    </div>
  );
}

interface CardMediaProps {
  img: string;
  title: string;
  videoUrl?: string;
  isActive: boolean;
}

function CardMedia({ img, title, videoUrl, isActive }: CardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card video playback prevented or error:", error);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, videoUrl]);

  return (
    <>
      <img
        src={img}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
          isActive ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      />
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none scale-105 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  );
}

export function HomePage({
  onNavigate,
  trips,
  plans,
  handleMoveToArchive,
  homeTitle,
  homeSubtitle,
  heroJourneyIds = [],
  heroAutoSlide = true,
  heroMediaType = 'image',
  onEditTrip,
  onDeleteTrip,
  onReorderTrips,
  onReorderPlans,
  onMoveToPlans,
  onCloneTrip,
  onClonePlan,
  isLoggedIn = false,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  // Drag-reorder state for archive cards
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  // Sync local order when props change (e.g. initial load)
  useEffect(() => { setLocalTrips(trips); }, [trips]);
  useEffect(() => { setLocalPlans(plans); }, [plans]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    localTrips.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [localTrips]);

  const filteredTrips = activeFilter === 'All' ? localTrips : localTrips.filter(t => t.tags?.includes(activeFilter));

  // Resolve hero journeys from heroJourneyIds. Fallback to trips[0] if nothing selected.
  const allJourneys: (Trip | Plan)[] = [...localTrips, ...localPlans];
  const heroJourneys: (Trip | Plan)[] = heroJourneyIds.length > 0
    ? heroJourneyIds.map(id => allJourneys.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[]
    : (localTrips[0] ? [localTrips[0]] : []);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];

  const goToSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return;
    setHeroSlide(idx);
  }, [heroSlide]);

  const goToPrev = () => goToSlide((heroSlide - 1 + heroJourneys.length) % heroJourneys.length);
  const goToNext = () => goToSlide((heroSlide + 1) % heroJourneys.length);

  // Auto-advance carousel with dynamic duration (10s for video, 6s for image) when multiple heroes and auto-slide is enabled
  useEffect(() => {
    if (!heroAutoSlide || heroJourneys.length <= 1) return;
    
    const currentHeroItem = heroJourneys[heroSlide];
    const isVideo = heroMediaType === 'video' && currentHeroItem && 'videoUrl' in currentHeroItem && currentHeroItem.videoUrl;
    const duration = isVideo ? 10000 : 6000;

    const timer = setTimeout(() => {
      goToNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [heroJourneys.length, heroSlide, heroAutoSlide, heroMediaType, heroJourneys, goToNext]);

  useEffect(() => { setHeroSlide(0); }, [heroJourneyIds.join(',')]);

  // ── Drag-to-reorder for trip archive cards ──────────────────────────────
  const handleTripDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTripId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTripDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedTripId === null || draggedTripId === id) return;
    setLocalTrips(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === draggedTripId);
      const toIdx = arr.findIndex(t => t.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const handleTripDrop = () => {
    setDraggedTripId(null);
    if (onReorderTrips) onReorderTrips(localTrips.map(t => t.id));
  };

  return (
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-700 w-full">

      {/* ===== Hero Section ===== */}
      <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden group border-b border-black/20 dark:border-white/20">
        {/* Background style */}
        {heroJourneys.length === 0 ? (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#EAE8E3] via-[#F4F3EF] to-[#D5D3CC] dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
        ) : (
          heroJourneys.map((journey, index) => (
            <HeroMedia
              key={journey.id}
              journey={journey}
              isActive={index === heroSlide}
              mediaType={heroMediaType}
            />
          ))
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 md:via-black/40 to-transparent pointer-events-none" />
        {currentHero && (
          <div className="absolute inset-0 cursor-pointer z-0" onClick={() => onNavigate('detail', currentHero.id)} />
        )}

        {/* Text content - Magazine Cover Style Hero */}
        <div className="absolute inset-0 p-6 sm:p-10 md:p-16 flex flex-col justify-between text-white z-10 pointer-events-none">
          {/* Top-Left: Static Home Hub Title & Subtitle (Minimized) */}
          <div className="pointer-events-auto max-w-full sm:max-w-md md:max-w-lg mt-4 md:mt-0">
            <h1 className="text-sm md:text-xs font-black tracking-[0.25em] uppercase text-amber-500 drop-shadow-sm mb-1">
              {homeTitle.replace(/\\n|\n/g, ' ')}
            </h1>
            <p className="text-[10px] md:text-[11px] text-white/60 uppercase tracking-widest font-bold max-w-xs drop-shadow-sm leading-relaxed break-keep">
              {homeSubtitle}
            </p>
          </div>

          {/* Bottom-Left: Dynamic Active Slide Info (Magazine Style - Massive Serif Title + Month/Year) */}
          {currentHero && (
            <div className="pointer-events-auto mt-auto max-w-full md:max-w-[70%] lg:max-w-[60%] flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
              {/* Year/Month Badge */}
              {(() => {
                const { year, month } = getYearAndMonth(currentHero.date);
                if (!month || !year) return null;
                return (
                  <div className="flex items-baseline md:flex-col items-start md:items-end shrink-0 leading-none font-mono border-l-2 md:border-l-0 md:border-r-2 border-amber-500 pl-3 md:pl-0 md:pr-4">
                    <span className="text-2xl md:text-3xl font-black tracking-widest text-amber-500 uppercase">{month}</span>
                    <span className="text-xs md:text-sm font-bold tracking-widest text-white/70 ml-2 md:ml-0 md:mt-1">{year}</span>
                  </div>
                );
              })()}

              {/* Title */}
              <div className="flex flex-col">
                <div className="text-[10px] tracking-[0.3em] font-bold text-white/50 uppercase mb-1 md:mb-2">FEATURED JOURNAL</div>
                <h2
                  onClick={() => onNavigate('detail', currentHero.id)}
                  className="text-3xl min-[390px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] font-serif cursor-pointer hover:text-amber-500 transition-colors drop-shadow-xl line-clamp-3 select-none"
                  style={{ fontFamily: "'Playfair Display', 'Georgia', serif", wordBreak: 'keep-all' }}
                >
                  {currentHero.title}
                </h2>
              </div>
            </div>
          )}
        </div>

        {/* Carousel slide dots */}
        {currentHero && heroJourneys.length > 1 && (
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-2 border border-white/10 rounded-full">
              {heroJourneys.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                  className={`rounded-full transition-all ${idx === heroSlide ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Carousel nav arrows */}
        {heroJourneys.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/25 border border-white/15 text-white rounded-full transition-all backdrop-blur-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 hover:bg-white/25 border border-white/15 text-white rounded-full transition-all backdrop-blur-sm">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </section>

      {/* Plans Section Preview */}
      {localPlans.length > 0 && (
        <section className="flex flex-col w-full overflow-hidden border-b border-black/20 dark:border-white/20 transition-colors">
          <div className="p-6 md:px-12 border-b border-black/20 dark:border-white/20 flex flex-col sm:flex-row justify-between sm:items-end gap-4 transition-colors bg-[#EAE8E3]/35 dark:bg-[#1a1a1a]/35">
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase break-keep">Upcoming Plans</h2>
              <p className="text-sm text-black/50 dark:text-white/50 mt-1 break-keep">다가오는 여행 계획을 준비하고, 여행 후 아카이브로 전환하세요.</p>
            </div>
            <button onClick={() => onNavigate('plan')} className="text-xs font-bold uppercase tracking-widest flex items-center hover:opacity-60 shrink-0">
              View All Plans <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-12 w-full">
            {localPlans.slice(0, 4).map((plan) => {
              const { year, month } = getYearAndMonth(plan.date);
              return (
                <div
                  key={plan.id}
                  style={{ containerType: 'inline-size' }}
                  className={`group cursor-pointer aspect-[3/4] w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(239,68,68,0.08)] ${
                    activeCardId === plan.id
                      ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                      : 'border-red-600/50 dark:border-red-400/50 bg-[#111]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeCardId === plan.id) {
                      onNavigate('detail', plan.id);
                    } else {
                      setActiveCardId(plan.id);
                    }
                  }}
                >
                  {/* Background cover image */}
                  <img
                    src={plan.img}
                    alt={plan.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
                      activeCardId === plan.id ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
                    }`}
                  />
                  
                  {/* Magazine Overlay Gradient */}
                  <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                  {/* Magazine Cover Text Layout */}
                  <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                    {/* Top Header Row: Title & Issue Date */}
                    <div className="flex justify-between items-start gap-3 w-full">
                      <h3 className="text-[5.5cqw] font-black uppercase tracking-tight leading-none font-serif text-white drop-shadow-md max-w-[70%] line-clamp-2" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                        {plan.title}
                      </h3>
                      {month && year && (
                        <div className="flex flex-col items-end shrink-0 text-right leading-none font-mono">
                          <span className="text-[3.8cqw] font-black tracking-widest text-amber-500 uppercase">{month}</span>
                          <span className="text-[2.8cqw] font-bold tracking-widest text-white/60 mt-0.5">{year}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer Row: Date & Status */}
                    <div className="mt-auto flex flex-col gap-0.5">
                      <div className="text-[3cqw] tracking-widest text-white/70 font-mono truncate uppercase">{plan.date}</div>
                      <div className="text-[2.6cqw] tracking-[0.2em] font-black text-amber-500/95 uppercase">UPCOMING PLAN</div>
                    </div>
                  </div>

                  {/* Hamburger menu */}
                  <JourneyCardMenu
                    isLoggedIn={isLoggedIn}
                    onEdit={onEditTrip ? () => onEditTrip(plan.id) : undefined}
                    onDelete={onDeleteTrip ? () => onDeleteTrip(plan.id) : undefined}
                    onClone={onClonePlan ? () => onClonePlan(plan.id) : undefined}
                    onMove={() => handleMoveToArchive(plan)}
                    moveLabel="아카이브로 이동"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Archive Grid Section */}
      <section className="flex flex-col w-full overflow-hidden">
        <div className="p-6 md:px-12 border-b border-black/20 dark:border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-4 shrink-0">
            <h2 className="text-2xl font-black tracking-tighter uppercase break-keep">Journeys Archive</h2>
            {isLoggedIn && (
              <span className="text-[9px] text-black/30 dark:text-white/30 uppercase tracking-widest font-bold hidden md:inline">
                드래그로 순서 변경
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border transition-colors shrink-0 ${
                  activeFilter === f
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-black/20 text-black/50 hover:border-black/50 dark:border-white/20 dark:text-white/50 dark:hover:border-white/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-12 w-full">
          {filteredTrips.slice(0, 4).map((trip) => {
            const { year, month } = getYearAndMonth(trip.date);
            const days = calculateDays(trip.date);
            return (
              <div
                key={trip.id}
                style={{ containerType: 'inline-size' }}
                className={`group cursor-pointer aspect-[3/4] w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
                  draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'
                } ${
                  activeCardId === trip.id
                    ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                    : 'border-black/10 dark:border-white/10 bg-[#111]'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeCardId === trip.id) {
                    onNavigate('detail', trip.id);
                  } else {
                    setActiveCardId(trip.id);
                  }
                }}
                draggable={isLoggedIn}
                onDragStart={(e) => handleTripDragStart(e, trip.id)}
                onDragOver={(e) => handleTripDragOver(e, trip.id)}
                onDrop={handleTripDrop}
                onDragEnd={() => setDraggedTripId(null)}
              >
                {/* Background cover image/video */}
                <CardMedia
                  img={trip.img}
                  title={trip.title}
                  videoUrl={trip.videoUrl}
                  isActive={activeCardId === trip.id}
                />

                {/* Magazine Overlay Gradient */}
                <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                {/* Magazine Cover Text Layout */}
                <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                  {/* Top Header Row: Title & Issue Date */}
                  <div className="flex justify-between items-start gap-3 w-full">
                    <h3
                      className="text-[5.5cqw] font-black uppercase tracking-tight leading-none font-serif text-white drop-shadow-md max-w-[70%] line-clamp-2"
                      style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                    >
                      {trip.title}
                    </h3>
                    {month && year && (
                      <div className="flex flex-col items-end shrink-0 text-right leading-none font-mono">
                        <span className="text-[3.8cqw] font-black tracking-widest text-amber-500 uppercase">{month}</span>
                        <span className="text-[2.8cqw] font-bold tracking-widest text-white/60 mt-0.5">{year}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Row: Date, Tags & Status */}
                  <div className="mt-auto flex flex-col gap-1.5">
                    {trip.tags && trip.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {trip.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[2.6cqw] uppercase font-bold tracking-widest bg-white/10 px-1.5 py-0.5 rounded-sm text-white/95">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[3cqw] tracking-widest text-white/70 font-mono truncate uppercase">
                        {trip.date}
                        {days > 0 && ` · ${days} DAYS`}
                      </div>
                      <div className="text-[2.6cqw] tracking-[0.2em] font-black text-amber-500/95 uppercase">ARCHIVED JOURNEY</div>
                    </div>
                  </div>
                </div>

                {/* Hamburger menu */}
                <JourneyCardMenu
                  isLoggedIn={isLoggedIn}
                  onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                  onDelete={onDeleteTrip ? () => onDeleteTrip(trip.id) : undefined}
                  onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                  onMove={onMoveToPlans ? () => onMoveToPlans(trip) : undefined}
                  moveLabel="계획으로 이동"
                />
              </div>
            );
          })}
        </div>
        <div className="p-6 md:px-12 flex justify-center w-full">
          <button onClick={() => onNavigate('archive')} className="text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-8 py-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors w-full md:w-auto">
            View Entire Archive
          </button>
        </div>
      </section>
    </main>
  );
}
