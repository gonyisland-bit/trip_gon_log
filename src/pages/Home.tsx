import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export function HomePage({
  onNavigate,
  trips,
  plans,
  handleMoveToArchive,
  homeTitle,
  homeSubtitle,
  heroJourneyIds = [],
  heroAutoSlide = true,
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  // Drag-reorder state for archive cards
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  // Sync local order when props change (e.g. initial load)
  useEffect(() => { setLocalTrips(trips); }, [trips]);
  useEffect(() => { setLocalPlans(plans); }, [plans]);

  const filters = ['All', '2026', '2025', '2024', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filteredTrips = activeFilter === 'All' ? localTrips : localTrips.filter(t => t.tags?.includes(activeFilter));

  // Resolve hero journeys from heroJourneyIds. Fallback to trips[0] if nothing selected.
  const allJourneys: (Trip | Plan)[] = [...localTrips, ...localPlans];
  const heroJourneys: (Trip | Plan)[] = heroJourneyIds.length > 0
    ? heroJourneyIds.map(id => allJourneys.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[]
    : (localTrips[0] ? [localTrips[0]] : []);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];

  // Auto-advance carousel every 6s when multiple heroes and auto-slide is enabled
  useEffect(() => {
    if (!heroAutoSlide || heroJourneys.length <= 1) return;
    const timer = setInterval(() => { goToNext(); }, 6000);
    return () => clearInterval(timer);
  }, [heroJourneys.length, heroSlide, heroAutoSlide]);

  useEffect(() => { setHeroSlide(0); }, [heroJourneyIds.join(',')]);

  const goToSlide = useCallback((idx: number) => {
    if (isTransitioning || idx === heroSlide) return;
    setIsTransitioning(true);
    setTimeout(() => { setHeroSlide(idx); setIsTransitioning(false); }, 350);
  }, [heroSlide, isTransitioning]);

  const goToPrev = () => goToSlide((heroSlide - 1 + heroJourneys.length) % heroJourneys.length);
  const goToNext = () => goToSlide((heroSlide + 1) % heroJourneys.length);

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
        {currentHero && currentHero.img ? (
          <img
            key={currentHero.id}
            src={currentHero.img}
            alt={currentHero.title || "Hero Trip"}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ${isTransitioning ? 'opacity-0 scale-110' : 'opacity-100 scale-100 group-hover:scale-105'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#EAE8E3] via-[#F4F3EF] to-[#D5D3CC] dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 md:via-black/40 to-transparent pointer-events-none" />
        {currentHero && (
          <div className="absolute inset-0 cursor-pointer z-0" onClick={() => onNavigate('detail', currentHero.id)} />
        )}

        {/* Text content */}
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-16 w-full md:w-2/3 lg:w-1/2 text-white z-10 pointer-events-none">
          <div className="pointer-events-auto max-w-full">
            <h1 className="text-4xl min-[390px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] uppercase drop-shadow-xl" style={{ wordBreak: 'keep-all' }}>
              {homeTitle.split(/\\n|\n/).map((part, idx, arr) => (
                <React.Fragment key={idx}>{part}{idx < arr.length - 1 && <br />}</React.Fragment>
              ))}
            </h1>
          </div>
          <div className="pointer-events-auto max-w-full pr-4 mt-6 md:mt-8">
            <p className="text-sm md:text-base text-white/80 drop-shadow-md break-keep">{homeSubtitle}</p>
          </div>
        </div>

        {/* Featured label + slide dots */}
        {currentHero && (
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col items-end gap-2 z-10">
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-white/20 dark:border-white/10 rounded-sm">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black/90 dark:text-white/90 drop-shadow-sm">
                Featured: {currentHero.title}
              </span>
            </div>
            {heroJourneys.length > 1 && (
              <div className="flex items-center gap-1.5">
                {heroJourneys.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                    className={`rounded-full transition-all ${idx === heroSlide ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
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
            {localPlans.slice(0, 4).map((plan) => (
              <div
                key={plan.id}
                className={`group cursor-pointer p-6 flex flex-col h-full transition-all border w-full relative shadow-[0_0_15px_rgba(239,68,68,0.08)] ${
                  activeCardId === plan.id
                    ? 'border-red-600 dark:border-red-400 bg-red-500/[0.05] dark:bg-red-400/[0.05] ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                    : 'border-red-600/80 dark:border-red-400/80 bg-red-500/[0.02] dark:bg-red-400/[0.02] hover:bg-red-500/[0.04] dark:hover:bg-red-400/[0.04]'
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
                <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
                  <img
                    src={plan.img}
                    alt={plan.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none ${
                      activeCardId === plan.id
                        ? 'opacity-100 scale-105'
                        : 'opacity-90 group-hover:opacity-100 group-hover:scale-105'
                    }`}
                  />
                </div>
                <div className="mt-auto">
                  <div className="text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 break-words">{plan.date}</div>
                  <div className="font-bold tracking-tight uppercase text-sm break-words">{plan.title}</div>
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
            ))}
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
          {filteredTrips.slice(0, 4).map((trip) => (
            <div
              key={trip.id}
              className={`group cursor-pointer p-6 flex flex-col h-full transition-all relative w-full border ${
                draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'
              } ${
                activeCardId === trip.id
                  ? 'bg-black/5 dark:bg-white/5 border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                  : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a] hover:bg-black/5 dark:hover:bg-white/5'
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
              {/* Drag handle indicator */}
              {isLoggedIn && (
                <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                  <GripVertical className="w-4 h-4 text-black dark:text-white" />
                </div>
              )}

              <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
                <img
                  src={trip.img}
                  alt={trip.title}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none ${
                    activeCardId === trip.id
                      ? 'grayscale-0 opacity-100 scale-105'
                      : 'grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'
                  }`}
                />
              </div>
              <div className="mt-auto">
                <div className="flex flex-wrap gap-1 mb-2">
                  {trip.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] uppercase font-bold tracking-widest bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm text-black/60 dark:text-white/60">{tag}</span>
                  ))}
                </div>
                <div className="text-xs tracking-widest text-black/50 dark:text-white/50 mb-1 transition-colors break-words">
                  {trip.date}
                  {calculateDays(trip.date) > 0 && ` · ${calculateDays(trip.date)} DAYS`}
                </div>
                <div className="font-bold tracking-tight uppercase text-sm break-words">{trip.title}</div>
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
          ))}
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
