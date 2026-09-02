import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MoreVertical, Menu, Edit2, Trash2, GripVertical, Copy, ArrowUp, Tag, ChevronDown, ChevronUp, Search, X, LayoutGrid, StretchHorizontal, List } from 'lucide-react';
import { Trip, Plan, MagazineMoment } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { ConfirmModal } from '../components/ConfirmModal';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

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
  magazineMoments?: MagazineMoment[];
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

// Helper to extract year, English short month, and compact date for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string; compactDate: string } {
  if (!dateRangeStr) return { year: '', month: '', compactDate: '' };
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());
  const parsePart = (str: string) => {
    const match = str.match(/(\d{4})?[.-]?(\d{1,2})[.-](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y || '2026', 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    return null;
  };

  const p1 = parsePart(parts[0]);
  const p2 = parts[1] ? parsePart(parts[1]) : null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const year = p1?.y || (p2?.y ?? '');
  const monthNum = p1 ? p1.dateObj.getMonth() : (p2 ? p2.dateObj.getMonth() : -1);
  const month = monthNum >= 0 ? months[monthNum] : '';

  let compactDate = '';
  if (p1 && p2) {
    const diffDays = Math.max(1, Math.round((p2.dateObj.getTime() - p1.dateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    compactDate = `${p1.m}.${p1.d}-${p2.m}.${p2.d} / ${diffDays}d`;
  } else if (p1) {
    compactDate = `${p1.m}.${p1.d} / 1d`;
  } else {
    compactDate = dateRangeStr;
  }

  return { year, month, compactDate };
}

// Journey card hamburger menu
export function JourneyCardMenu({
  onEdit,
  onDelete,
  isLoggedIn,
  onClone,
  onMove,
  moveLabel,
  className,
  variant = 'card',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  isLoggedIn: boolean;
  onClone?: () => void;
  onMove?: () => void;
  moveLabel?: string;
  className?: string;
  variant?: 'card' | 'minimal';
}) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'e' || e.key === 'E') {
        if (onEdit) {
          e.preventDefault();
          setOpen(false);
          onEdit();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (onClone) {
          e.preventDefault();
          setOpen(false);
          onClone();
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (onMove) {
          e.preventDefault();
          setOpen(false);
          onMove();
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (onDelete) {
          e.preventDefault();
          setOpen(false);
          setShowDeleteConfirm(true);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onEdit, onClone, onMove, onDelete]);

  if (!isLoggedIn) return null;

  return (
    <>
      <div ref={menuRef} className={`${className || (variant === 'minimal' ? 'relative' : "absolute bottom-3 right-3 z-30")} pointer-events-auto`}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          className={variant === 'minimal'
            ? "p-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer bg-transparent border-0 shadow-none"
            : "p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-md transition-all shadow-md backdrop-blur-sm border border-white/20 opacity-90 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center cursor-pointer active:scale-95"
          }
          title="카드 관리 메뉴"
          aria-label="Journey menu"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div className={`absolute ${variant === 'minimal' ? 'top-full right-0 mt-1' : 'bottom-full right-0 mb-1'} w-48 bg-black text-white border border-white/20 shadow-2xl rounded-none z-50 overflow-hidden divide-y divide-white/10 animate-in zoom-in-95 duration-150`}>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-3.5 h-3.5 text-white/80" />
                  <span>EDIT</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">E</span>
              </button>
            )}
            {onClone && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onClone(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-white/80" />
                  <span>COPY</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">C</span>
              </button>
            )}
            {onMove && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onMove(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowUp className="w-3.5 h-3.5 text-white/80" />
                  <span>SWITCHING</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">S</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>DELETE</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-red-400/70 border border-red-500/30 px-1.5 py-0.5">D</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="DELETE CONFIRMATION"
        message="정말 이 여정을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmLabel="YES [Y]"
        cancelLabel="NO [N]"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          if (onDelete) onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

interface HeroMediaProps {
  journey: Trip | Plan;
  isActive: boolean;
  mediaType: 'image' | 'video';
  onMediaReady?: () => void;
}

function HeroMedia({ journey, isActive, mediaType, onMediaReady }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeVideoUrl = journey.heroVideoUrl || journey.videoUrl;
  const activeImageUrl = getEffectiveImageUrl(journey.heroImg || journey.img);
  const hasVideo = mediaType === 'video' && Boolean(activeVideoUrl);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (hasVideo && activeVideoUrl && videoRef.current) {
      if (isActive) {
        if (videoRef.current.currentTime > 0.5) {
          videoRef.current.currentTime = 0;
        }
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented or error:", error);
          });
        }
      } else {
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
  }, [isActive, hasVideo, activeVideoUrl]);

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-[1500ms] ${isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'}`}
      style={{ 
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {hasVideo && activeVideoUrl ? (
        <video
          ref={videoRef}
          src={activeVideoUrl}
          loop
          muted
          playsInline
          autoPlay={isActive}
          preload="auto"
          onLoadedData={() => { if (onMediaReady) onMediaReady(); }}
          onCanPlay={() => { if (onMediaReady) onMediaReady(); }}
          className="w-full h-full object-cover"
        />
      ) : activeImageUrl ? (
        <img
          src={activeImageUrl}
          alt={journey.title || "Hero Trip"}
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isActive ? "high" : "low"}
          onLoad={() => { if (isActive && onMediaReady) onMediaReady(); }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
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
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => localStorage.getItem('playVideoOnActivate') !== 'false');

  useEffect(() => {
    const handleConfigChange = () => {
      setAutoplayEnabled(localStorage.getItem('playVideoOnActivate') !== 'false');
    };
    window.addEventListener('playVideoConfigChanged', handleConfigChange);
    return () => window.removeEventListener('playVideoConfigChanged', handleConfigChange);
  }, []);

  useEffect(() => {
    if (autoplayEnabled && videoUrl && videoRef.current) {
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
  }, [isActive, videoUrl, autoplayEnabled]);

  return (
    <>
      <img
        src={getEffectiveImageUrl(img)}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
          isActive ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      />
      {videoUrl && autoplayEnabled && isActive && (
        <video
          ref={videoRef}
          src={getEffectiveImageUrl(videoUrl)}
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none scale-105 opacity-100 animate-in fade-in duration-300"
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
  magazineMoments = [],
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  const handleSetCardViewMode = (mode: 'grid' | 'wide' | 'list') => {
    setCardViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  const [magazineSpreadIndex, setMagazineSpreadIndex] = useState(0);

  // Drag-reorder state for archive cards
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  // Sync local order when props change (e.g. initial load)
  useEffect(() => { setLocalTrips(trips); }, [trips]);
  useEffect(() => { setLocalPlans(plans); }, [plans]);

  // Combined Journeys & Plans for unified archive view
  const combinedArchiveList = useMemo(() => {
    const formattedPlans = localPlans.map(p => ({
      ...p,
      isPlan: true,
      tags: p.tags ? Array.from(new Set([...p.tags, 'Plan'])) : ['Plan']
    }));
    return [...localTrips, ...formattedPlans];
  }, [localTrips, localPlans]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    combinedArchiveList.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [combinedArchiveList]);

  const visibleTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return filters;
    const q = tagSearchQuery.trim().toLowerCase();
    return filters.filter(f => f.toLowerCase().includes(q) || f === 'All');
  }, [filters, tagSearchQuery]);

  const filteredTrips = activeFilter === 'All' ? combinedArchiveList : combinedArchiveList.filter(t => t.tags?.includes(activeFilter));

  // Resolve hero journeys from heroJourneyIds. Fallback to trips[0] if nothing selected.
  const allJourneys: (Trip | Plan)[] = [...localTrips, ...localPlans];
  const heroJourneys: (Trip | Plan)[] = heroJourneyIds.length > 0
    ? heroJourneyIds.map(id => allJourneys.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[]
    : (localTrips[0] ? [localTrips[0]] : []);

  const [isHeroMediaReady, setIsHeroMediaReady] = useState(false);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];
  const isCurrentHeroVideo = heroMediaType === 'video' && currentHero && (('heroVideoUrl' in currentHero && currentHero.heroVideoUrl) || ('videoUrl' in currentHero && currentHero.videoUrl));
  const heroSlideDuration = isCurrentHeroVideo ? 10000 : 6000;

  const goToSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return;
    setIsHeroMediaReady(false);
    setHeroSlide(idx);
  }, [heroSlide]);

  const goToPrev = () => goToSlide((heroSlide - 1 + heroJourneys.length) % heroJourneys.length);
  const goToNext = () => goToSlide((heroSlide + 1) % heroJourneys.length);

  // Auto-advance carousel with dynamic duration (10s for video, 6s for image) when multiple heroes and auto-slide is enabled
  useEffect(() => {
    if (!heroAutoSlide || heroJourneys.length <= 1 || !isHeroMediaReady) return;
    
    const currentHeroItem = heroJourneys[heroSlide];
    const isVideo = heroMediaType === 'video' && currentHeroItem && (('heroVideoUrl' in currentHeroItem && currentHeroItem.heroVideoUrl) || ('videoUrl' in currentHeroItem && currentHeroItem.videoUrl));
    const duration = isVideo ? 10000 : 6000;

    const timer = setTimeout(() => {
      goToNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [heroJourneys.length, heroSlide, heroAutoSlide, heroMediaType, heroJourneys, isHeroMediaReady, goToNext]);

  useEffect(() => { 
    setHeroSlide(0); 
    setIsHeroMediaReady(false);
  }, [heroJourneyIds.join(',')]);

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
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
        ) : (
          heroJourneys.map((journey, index) => (
            <HeroMedia
              key={journey.id}
              journey={journey}
              isActive={index === heroSlide}
              mediaType={heroMediaType}
              onMediaReady={() => {
                if (index === heroSlide) {
                  setIsHeroMediaReady(true);
                }
              }}
            />
          ))
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 md:via-black/40 to-transparent pointer-events-none" />
        {currentHero && (
          <div className="absolute inset-0 cursor-pointer z-0" onClick={() => onNavigate('detail', currentHero.id)} />
        )}

        {/* Text content - Magazine Cover Style Hero */}
        <div className="absolute inset-0 p-6 sm:p-10 md:p-16 pb-16 sm:pb-16 md:pb-16 flex flex-col justify-between text-white z-10 pointer-events-none">
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
                  className="text-3xl min-[390px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] font-satoshi cursor-pointer hover:text-amber-500 transition-colors drop-shadow-xl line-clamp-3 select-none"
                  style={{ fontFamily: "'Satoshi', sans-serif", wordBreak: 'keep-all' }}
                >
                  {currentHero.title}
                </h2>
              </div>
            </div>
          )}
        </div>

        {/* Carousel slide indicators with animated progress gauge */}
        {currentHero && heroJourneys.length > 1 && (
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-20 pointer-events-auto">
            <div className="flex items-center gap-2 bg-black/45 backdrop-blur-md px-3 py-1.5 border border-white/15 rounded-full shadow-2xl">
              <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400">
                {String(heroSlide + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5">
                {heroJourneys.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                    className="h-1.5 rounded-full overflow-hidden transition-all bg-white/20 hover:bg-white/30 cursor-pointer relative"
                    style={{ width: idx === heroSlide ? '28px' : '8px' }}
                    title={`Slide ${idx + 1}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    {idx === heroSlide ? (
                      <div
                        key={`${heroSlide}-${heroSlideDuration}`}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300"
                        style={{
                          animation: (heroAutoSlide && isHeroMediaReady) ? `heroGauge ${heroSlideDuration}ms linear forwards` : 'none',
                          width: (heroAutoSlide && !isHeroMediaReady) ? '0%' : (heroAutoSlide ? undefined : '100%'),
                        }}
                      />
                    ) : idx < heroSlide ? (
                      <div className="h-full w-full bg-white/60" />
                    ) : null}
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/50">
                {String(heroJourneys.length).padStart(2, '0')}
              </span>
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 01. JOURNEYS & PLANS ARCHIVE (통합 아카이브 그리드 섹션)             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col w-full overflow-hidden border-b border-black/20 dark:border-white/20 transition-colors">
        <div className="p-6 md:px-12 border-b border-black/20 dark:border-white/20 flex flex-col md:flex-row md:items-end justify-between gap-4 transition-colors">
          {/* Left: Section Header with Unified Weight & Noto Sans Korean Subtitle */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-black text-red-600 dark:text-red-500 tracking-widest uppercase">
                01 / JOURNEYS ARCHIVE
              </span>
              {isLoggedIn && (
                <span className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase hidden sm:inline">
                  [드래그로 순서 변경]
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
              JOURNEYS & PLANS
            </h2>
            <p className="text-xs sm:text-sm font-sans font-medium text-black/70 dark:text-white/70 max-w-lg break-keep mt-0.5 leading-relaxed">
              기록된 모든 여정과 다가오는 여행 계획을 하나의 아카이브 컬렉션으로 탐색합니다.
            </p>
          </div>

          {/* Right: Controls (View Modes, Tag Filter, View All) */}
          <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
            <div className="flex items-center justify-between md:justify-end gap-2.5 w-full flex-wrap">
              {/* 1. Simple Tag Filter Button */}
              <button
                type="button"
                onClick={() => setIsTagAccordionOpen(prev => !prev)}
                className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider border rounded-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilter !== 'All'
                    ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                    : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5'
                }`}
                title="태그 필터 열기/닫기"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{activeFilter === 'All' ? 'TAG' : `#${activeFilter}`}</span>
                {isTagAccordionOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Reset Tag filter button if not 'All' */}
              {activeFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('All')}
                  className="text-[9px] px-1.5 py-1 uppercase font-bold tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  title="필터 초기화"
                >
                  <X className="w-3 h-3" />
                  초기화
                </button>
              )}

              {/* 2. View Mode Switcher (Grid / Wide / List) */}
              <div className="flex items-center border border-black/15 dark:border-white/15 rounded-xs p-0.5 bg-black/5 dark:bg-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('grid')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'grid' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="그리드 보기"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('wide')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'wide' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="와이드 보기"
                >
                  <StretchHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('list')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'list' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="리스트 보기"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3. View All Button */}
              <button 
                type="button"
                onClick={() => onNavigate('archive')} 
                className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest flex items-center hover:opacity-60 shrink-0 ml-1 cursor-pointer"
                title="모든 여정 및 계획 보기"
              >
                VIEW ALL <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {/* Collapsible Content: Search input & Tag pills */}
            {isTagAccordionOpen && (
              <div className="flex flex-col gap-2 p-3 bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 rounded-sm shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 mt-1 md:absolute md:top-full md:right-0 md:w-80">
                {/* Tag Search Input */}
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-black/40 dark:text-white/40 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="태그 검색..."
                    className="w-full pl-7 pr-7 py-1 text-[10px] bg-white dark:bg-[#222222] border border-black/10 dark:border-white/10 rounded-sm font-bold outline-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                  />
                  {tagSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTagSearchQuery('')}
                      className="absolute right-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Tag Buttons */}
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                  {visibleTags.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setActiveFilter(f);
                      }}
                      className={`text-[9.5px] px-2.5 py-1 uppercase font-bold tracking-wider border rounded-sm transition-colors shrink-0 cursor-pointer ${
                        activeFilter === f
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-black/15 bg-black/4 dark:bg-white/5 text-black/60 hover:border-black/40 dark:border-white/15 dark:text-white/60 dark:hover:border-white/40'
                      }`}
                    >
                      {f === 'All' ? '전체 (All)' : `#${f}`}
                    </button>
                  ))}
                  {visibleTags.length === 0 && (
                    <span className="text-[10px] text-black/40 dark:text-white/40 py-1 italic">
                      검색 결과가 없습니다.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {cardViewMode === 'list' ? (
          <div className="flex flex-col w-full border-t border-black/15 dark:border-white/15">
            {filteredTrips.slice(0, 8).map((trip, index) => {
              const isCardActive = activeCardId === trip.id;

              return (
                <div
                  key={trip.id}
                  onClick={() => onNavigate('detail', trip.id)}
                  className={`group flex flex-row items-stretch border-b border-black/15 dark:border-white/15 transition-colors cursor-pointer w-full select-none ${
                    isCardActive 
                      ? 'bg-neutral-100 dark:bg-white/[0.08] border-l-[4px] border-l-red-600 dark:border-l-red-500' 
                      : 'border-l-[4px] border-l-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Thumbnail: 1:1 full-height square edge-to-edge */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 aspect-square self-stretch shrink-0 border-r border-black/15 dark:border-white/15 overflow-hidden rounded-none relative bg-black/10">
                    <img src={getEffectiveImageUrl(trip.img)} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0 py-2.5 px-3 sm:px-4 md:px-6 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base md:text-lg text-black dark:text-white uppercase font-satoshi truncate">
                        {trip.title}
                      </h3>
                      {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) ? (
                        <span className="text-[9px] font-black px-2 py-0.5 font-mono uppercase bg-black text-white border-y border-white/30 tracking-widest">
                          PLAN
                        </span>
                      ) : trip.statusBadge ? (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-none font-mono uppercase ${
                          trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {trip.statusBadge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] sm:text-xs text-black/60 dark:text-white/60 font-mono flex-wrap mt-0.5">
                      <span className="font-bold text-black/80 dark:text-white/80">{trip.date}</span>
                      {trip.locationStr && (
                        <>
                          <span>·</span>
                          <span className="text-black/70 dark:text-white/70">{trip.locationStr.replace(/,/g, ' · ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Menu (Unboxed, NO right arrow button) */}
                  <div className="flex items-center pr-2 sm:pr-4 md:pr-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <JourneyCardMenu
                      isLoggedIn={isLoggedIn}
                      onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                      onDelete={onDeleteTrip ? () => onDeleteTrip(trip.id) : undefined}
                      onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                      onMove={onMoveToPlans ? () => onMoveToPlans(trip) : undefined}
                      moveLabel="계획으로 이동"
                      variant="minimal"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cardViewMode === 'wide' 
            ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-12 w-full"
            : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-6 md:p-12 w-full"
          }>
            {filteredTrips.slice(0, 8).map((trip, index) => {
              const { year, month, compactDate } = getYearAndMonth(trip.date);
              const days = calculateDays(trip.date);
              const isCardActive = activeCardId === trip.id;
              const issueNumber = String((trip.displayOrder ?? index) + 1).padStart(2, '0');

              return (
                <div key={trip.id} className="relative group">
                  {/* Ambient Glow Aura */}
                  <div
                    className={`absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-red-600/30 via-orange-500/20 to-amber-400/25 blur-xl transition-all duration-500 pointer-events-none -z-10 ${
                      isCardActive ? 'opacity-80 scale-105' : 'opacity-0 group-hover:opacity-50 scale-100'
                    }`}
                  />

                  <div
                    style={{ containerType: 'inline-size' }}
                    className={`cursor-pointer ${cardViewMode === 'wide' ? 'aspect-[16/10]' : 'aspect-[3/4]'} w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
                      draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'
                    } ${
                      isCardActive
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
                    {/* Top-Right Corner Flush Wide Bold PLAN Tag (그리드 가로 절반폭 와이드 사이즈) */}
                    {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) && (
                      <div className="absolute top-0 right-0 z-20 w-1/2 bg-black text-white dark:bg-white dark:text-black py-1 sm:py-1.5 px-2.5 flex items-center justify-center border-b border-l border-white/20 dark:border-black/20 shadow-md pointer-events-none">
                        <span className="font-mono text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase">
                          PLAN
                        </span>
                      </div>
                    )}

                    {/* Background cover image/video */}
                    <CardMedia
                      img={trip.img}
                      title={trip.title}
                      videoUrl={trip.videoUrl}
                      isActive={isCardActive}
                    />

                    {/* Magazine Overlay Gradient */}
                    <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                    {/* Swiss Editorial Poster Text Layout */}
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                      {/* Top Header Row: Giant Bold Year & Month / Status Badge */}
                      <div className="flex justify-between items-start w-full">
                        {year ? (
                          <div className="flex flex-col leading-none">
                            <span className="text-[10cqw] font-black font-sans tracking-tighter leading-none text-white drop-shadow-md">
                              {year}
                            </span>
                            {month && (
                              <span className="text-[7cqw] font-sans font-black tracking-tight text-white/95 uppercase mt-0.5 leading-none">
                                {month}
                              </span>
                            )}
                          </div>
                        ) : <div />}

                        {/* Status Badge (NEW / EDITING) for non-plans */}
                        {!((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) && trip.statusBadge && (
                          <span className={`px-1.5 py-0.5 text-[2.6cqw] font-black uppercase tracking-widest font-mono shadow-sm ${
                            trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {trip.statusBadge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Footer Row: Title, Location, Date (3-tier clean stack) */}
                      <div className="mt-auto flex flex-col gap-1 w-full max-w-[88%]">
                        <h3 className="text-[5.8cqw] sm:text-[6.2cqw] font-black uppercase tracking-tight leading-tight font-sans text-white drop-shadow-md line-clamp-2">
                          {trip.title}
                        </h3>
                        {trip.locationStr && (
                          <div className={cardViewMode === 'wide'
                            ? "text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                            : "text-[11px] sm:text-xs md:text-[3.8cqw] font-sans font-black uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                          }>
                            {cleanAdministrativeDistricts(trip.locationStr).replace(/,/g, ' · ')}
                          </div>
                        )}
                        {trip.date && (
                          <div className={cardViewMode === 'wide'
                            ? "text-[11px] sm:text-xs font-sans font-semibold text-white/80 tracking-wider truncate"
                            : "text-[10px] sm:text-[11px] md:text-[3.4cqw] font-sans font-bold text-white/85 tracking-wider truncate"
                          }>
                            {compactDate || trip.date}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hamburger menu */}
                    <JourneyCardMenu
                      className="absolute bottom-3 right-3 z-30"
                      isLoggedIn={isLoggedIn}
                      onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                      onDelete={onDeleteTrip ? () => onDeleteTrip(trip.id) : undefined}
                      onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                      onMove={onMoveToPlans ? () => onMoveToPlans(trip) : undefined}
                      moveLabel="계획으로 이동"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 02. EDITORIAL MAGAZINE MOMENTS (잡지 연출 섹션)                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {(() => {
          // Display curated moments or fallback to top trips' imagery
          const displayMoments: MagazineMoment[] = magazineMoments.length > 0 
            ? magazineMoments 
            : trips.slice(0, 3).map((t, idx) => ({
                id: `fallback-${t.id}`,
                tripId: t.id,
                title: t.title,
                date: t.date,
                location: t.locationStr,
                caption: t.locationStr ? `${cleanAdministrativeDistricts(t.locationStr)}에서의 기록된 기억` : '기억에 남은 순간',
                quote: idx === 0 
                  ? "“모든 여행은 우연을 가장한 필연이며, 남겨진 사진은 그날의 온도와 공기를 영원히 품는다.”" 
                  : "“도시의 골목과 마주친 풍경, 그 찰나의 순간.”",
                img: t.img,
                order: idx,
              }));

          if (displayMoments.length === 0) return null;

          const MOMENTS_PER_SPREAD = 3;
          const totalSpreads = Math.ceil(displayMoments.length / MOMENTS_PER_SPREAD);
          const currentSpread = Math.min(magazineSpreadIndex, Math.max(0, totalSpreads - 1));
          const currentSlice = displayMoments.slice(currentSpread * MOMENTS_PER_SPREAD, (currentSpread + 1) * MOMENTS_PER_SPREAD);

          return (
            <div className="w-full border-t border-black/10 dark:border-white/10 mt-12 pt-12 px-4 sm:px-8 md:px-12 flex flex-col gap-8">
              {/* Section Header: Swiss Minimal Magazine Header (Weight unified with Archive) */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-black/15 dark:border-white/15">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-black text-red-600 dark:text-red-500 tracking-widest uppercase">
                      02 / EDITORIAL MAGAZINE
                    </span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase hidden sm:inline">
                      [잡지 연출 컬렉션]
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                    JOURNEY MAGAZINE
                  </h2>
                  <p className="text-xs sm:text-sm font-sans font-medium text-black/70 dark:text-white/70 max-w-lg break-keep mt-0.5 leading-relaxed">
                    길 위에서 마주한 가장 선명한 순간들. 타임라인에 기록된 인상 깊은 기억과 사진들을 한 권의 포토북처럼 엮어냅니다.
                  </p>
                </div>

                {/* Big Bold Minimalist Swiss Spread Navigation Controls */}
                {totalSpreads > 1 && (
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto bg-black/5 dark:bg-white/5 p-1.5 border border-black/15 dark:border-white/15">
                    <span className="font-mono text-xs sm:text-sm font-black tracking-widest px-3 text-black dark:text-white">
                      {String(currentSpread + 1).padStart(2, '0')} / {String(totalSpreads).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMagazineSpreadIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentSpread === 0}
                      className="w-10 h-10 sm:w-11 sm:h-11 border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-white dark:bg-[#121212] text-black dark:text-white font-bold"
                      title="이전 화보 스프레드"
                    >
                      <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMagazineSpreadIndex(prev => Math.min(totalSpreads - 1, prev + 1))}
                      disabled={currentSpread >= totalSpreads - 1}
                      className="w-10 h-10 sm:w-11 sm:h-11 border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-white dark:bg-[#121212] text-black dark:text-white font-bold"
                      title="다음 화보 스프레드"
                    >
                      <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Magazine Editorial Spread Layout: Uniform Album Photo Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">
                {currentSlice.map((moment, idx) => {
                  const globalIdx = currentSpread * MOMENTS_PER_SPREAD + idx + 1;
                  return (
                    <div
                      key={moment.id || idx}
                      onClick={() => moment.tripId && onNavigate('detail', moment.tripId)}
                      className="group relative cursor-pointer overflow-hidden border border-black/15 dark:border-white/15 bg-white dark:bg-[#121212] flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 select-none"
                    >
                      {/* 1. Album Photo Section: 4:3 Minimal Matte Photo Frame */}
                      <div className="w-full aspect-[4/3] overflow-hidden relative bg-black/10 dark:bg-black/40 border-b border-black/10 dark:border-white/10">
                        <img
                          src={getEffectiveImageUrl(moment.img)}
                          alt={moment.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        {/* Top pill badges: Page & Location */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black shadow-md">
                            PAGE #{String(globalIdx).padStart(2, '0')}
                          </span>
                          {moment.location && (
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-white/90 dark:bg-black/90 text-black dark:text-white backdrop-blur-xs shadow-md truncate max-w-[55%]">
                              {cleanAdministrativeDistricts(moment.location)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Editorial Album Text & Meta Section */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-3 text-black dark:text-white">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-black/40 dark:text-white/40">
                            <span>{moment.date || 'EDITORIAL LOG'}</span>
                            <span className="text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">MOMENT</span>
                          </div>

                          <h3 className="text-base sm:text-lg font-black uppercase tracking-tight line-clamp-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors font-sans">
                            {moment.title}
                          </h3>

                          {moment.quote ? (
                            <p className="text-xs font-sans font-light italic text-black/75 dark:text-white/75 line-clamp-2 border-l-2 border-red-500 pl-2.5 my-0.5 leading-relaxed">
                              {moment.quote}
                            </p>
                          ) : moment.caption ? (
                            <p className="text-xs font-sans text-black/60 dark:text-white/60 line-clamp-2 leading-relaxed">
                              {moment.caption}
                            </p>
                          ) : null}
                        </div>

                        <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-black/50 dark:text-white/50 mt-1">
                          <span className="truncate max-w-[150px]">{cleanAdministrativeDistricts(moment.location || '')}</span>
                          <span className="font-bold text-black dark:text-white group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            VIEW ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="p-6 md:px-12 flex justify-center w-full">
          <button onClick={() => onNavigate('archive')} className="text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-8 py-3 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors w-full md:w-auto">
            View Entire Archive
          </button>
        </div>
      </section>
    </main>
  );
}
