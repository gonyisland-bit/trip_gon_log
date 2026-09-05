import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MoreVertical, Menu, Edit2, Trash2, GripVertical, Copy, ArrowUp, Tag, ChevronDown, ChevronUp, Search, X, LayoutGrid, StretchHorizontal, List } from 'lucide-react';
import { Trip, Plan, MagazineMoment, TimelineData } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { ConfirmModal } from '../components/ConfirmModal';
import { cleanAdministrativeDistricts, generateJourneyMessage } from '../components/SummaryView';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  handleMoveToArchive: (plan: Plan) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onCloneTrip?: (id: number) => void;
  onClonePlan?: (id: number) => void;
  homeTitle: string;
  homeSubtitle?: string;
  heroJourneyIds?: number[];
  heroAutoSlide?: boolean;
  heroMediaType?: 'image' | 'video';
  heroSlideDuration?: number;
  onEditTrip?: (id: number) => void;
  onDeleteTrip?: (id: number) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  onReorderPlans?: (orderedIds: number[]) => void;
  isLoggedIn?: boolean;
  isDarkMode?: boolean;
  homeGradientEnabled?: boolean;
  homeGradientFrom?: string;
  homeGradientTo?: string;
  magazineMoments?: MagazineMoment[];
  timelineData?: TimelineData;
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
  
  return null;
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

// Format duration and day count in compact Swiss minimalist notation
function getYearAndMonth(dateRangeStr?: string): { year: string; month: string; compactDate: string } {
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

// Helper to extract large bold uppercase English city/region name for magazine
export function getEnglishCityName(locationStr?: string): string {
  if (!locationStr) return '';
  const cleaned = cleanAdministrativeDistricts(locationStr);
  const cityMap: Record<string, string> = {
    '도쿄': 'TOKYO',
    '동경': 'TOKYO',
    '오사카': 'OSAKA',
    '교토': 'KYOTO',
    '후쿠오카': 'FUKUOKA',
    '삿포로': 'SAPPORO',
    '오키나와': 'OKINAWA',
    '제주': 'JEJU',
    '제주시': 'JEJU',
    '서귀포': 'SEOGWIPO',
    '서울': 'SEOUL',
    '부산': 'BUSAN',
    '강릉': 'GANGNEUNG',
    '속초': 'SOKCHO',
    '경주': 'GYEONGJU',
    '인천': 'INCHEON',
    '대구': 'DAEGU',
    '대전': 'DAEJEON',
    '방콕': 'BANGKOK',
    '치앙마이': 'CHIANG MAI',
    '다낭': 'DA NANG',
    '하노이': 'HANOI',
    '호치민': 'HO CHI MINH',
    '싱가포르': 'SINGAPORE',
    '타이베이': 'TAIPEI',
    '대만': 'TAIWAN',
    '홍콩': 'HONG KONG',
    '마카오': 'MACAU',
    '파리': 'PARIS',
    '런던': 'LONDON',
    '로마': 'ROME',
    '피렌체': 'FLORENCE',
    '베네치아': 'VENICE',
    '바르셀로나': 'BARCELONA',
    '마드리드': 'MADRID',
    '인터라켄': 'INTERLAKEN',
    '취리히': 'ZURICH',
    '뉴욕': 'NEW YORK',
    '로스앤젤레스': 'LOS ANGELES',
    '샌프란시스코': 'SAN FRANCISCO',
    '하와이': 'HAWAII',
    '괌': 'GUAM',
    '사이판': 'SAIPAN',
    '시드니': 'SYDNEY',
    '멜버른': 'MELBOURNE',
  };

  for (const [kr, en] of Object.entries(cityMap)) {
    if (cleaned.includes(kr)) return en;
  }

  const englishMatch = cleaned.match(/[a-zA-Z\s]+/);
  if (englishMatch && englishMatch[0].trim().length > 1) {
    return englishMatch[0].trim().toUpperCase();
  }

  return cleaned.toUpperCase();
}

// Helper to extract Hero meta details (month, year, days, date range, cities)
function getHeroDetails(journey: Trip) {
  const { year, month } = getYearAndMonth(journey.date);
  const days = calculateDays(journey.date);

  const parts = (journey.date || '').split(/\s*[-—–~]\s*/).map(p => p.trim());
  let dateRangeText = '';
  if (parts.length >= 2) {
    const d1Match = parts[0].match(/(\d{1,2})$/);
    const d2Match = parts[1].match(/(\d{1,2})$/);
    if (d1Match && d2Match) {
      dateRangeText = `${d1Match[1]} — ${d2Match[1]}`;
    } else {
      dateRangeText = journey.date;
    }
  } else if (parts[0]) {
    const dMatch = parts[0].match(/(\d{1,2})$/);
    dateRangeText = dMatch ? dMatch[1] : parts[0];
  }

  let cities = '';
  if (journey.locations && journey.locations.length > 0) {
    const cityNames = journey.locations
      .map(loc => getEnglishCityName(loc.name))
      .filter(Boolean);
    const unique = Array.from(new Set(cityNames));
    cities = unique.join(' — ');
  }
  if (!cities && journey.locationStr) {
    const splitLocs = journey.locationStr.split(/[,/·-]/).map(s => s.trim()).filter(Boolean);
    const cityNames = splitLocs.map(s => getEnglishCityName(s)).filter(Boolean);
    const unique = Array.from(new Set(cityNames));
    cities = unique.join(' — ');
  }
  if (!cities) {
    cities = getEnglishCityName(journey.locationStr) || 'JOURNEY';
  }

  return {
    year: year || '2024',
    month: month || 'JUL',
    daysCount: days,
    days: days > 0 ? `${days} ${days === 1 ? 'DAY' : 'DAYS'}` : '',
    dateRange: dateRangeText || '01 — 03',
    cities
  };
}

// Helper for minimal date + day format (e.g. 2024.07.19 FRI)
function formatSimpleDateWithDay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/\s*[-—–~]\s*/);
  const firstDate = parts[0]?.trim();
  const d = parseDateParts(firstDate);
  if (!d) return dateStr;
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[d.getDay()];
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day} ${dayName}`;
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
                  <span>{moveLabel || "MOVE"}</span>
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
        title="DELETE JOURNEY"
        message="Are you sure you want to delete this journey?"
        confirmLabel="YES (Y)"
        cancelLabel="CANCEL (ESC)"
        confirmVariant="danger"
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
  mediaType?: 'image' | 'video';
  onMediaReady?: () => void;
}

function HeroMedia({ journey, isActive, onMediaReady }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Smart resolution of hero media: heroVideoUrl > heroImg > videoUrl > img
  let finalVideoUrl = '';
  let finalImageUrl = '';

  if (journey.heroVideoUrl) {
    finalVideoUrl = getEffectiveImageUrl(journey.heroVideoUrl);
  } else if (journey.heroImg) {
    finalImageUrl = getEffectiveImageUrl(journey.heroImg);
  } else if (journey.videoUrl) {
    finalVideoUrl = getEffectiveImageUrl(journey.videoUrl);
  } else {
    finalImageUrl = getEffectiveImageUrl(journey.img);
  }

  const isVideo = Boolean(finalVideoUrl);

  // Mobile WebKit / iOS autoplay policy: DOM properties must be explicitly set before play()
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.playsInline = true;
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.setAttribute('webkit-playsinline', '');
    }
  }, [finalVideoUrl, isVideo]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (isVideo && finalVideoUrl && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;

      if (isActive) {
        if (vid.currentTime > 0.5) {
          vid.currentTime = 0;
        }
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Hero video autoplay prevented/delayed:", error);
          });
        }
        if (onMediaReady) onMediaReady();
      } else {
        timeoutId = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }, 1000);
      }
    } else if (isActive && onMediaReady) {
      onMediaReady();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isActive, isVideo, finalVideoUrl, onMediaReady]);

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-out ${
        isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      {isVideo && finalVideoUrl ? (
        <video
          ref={videoRef}
          src={finalVideoUrl}
          loop
          muted
          playsInline
          autoPlay={isActive}
          preload="auto"
          className="w-full h-full object-cover"
        />
      ) : finalImageUrl ? (
        <img
          src={finalImageUrl}
          alt={journey.title || "Hero Trip"}
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isActive ? "high" : "low"}
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
  heroSlideDuration = 6,
  onEditTrip,
  onDeleteTrip,
  onReorderTrips,
  onReorderPlans,
  onMoveToPlans,
  onCloneTrip,
  onClonePlan,
  isLoggedIn = false,
  isDarkMode = false,
  homeGradientEnabled,
  homeGradientFrom,
  homeGradientTo,
  magazineMoments = [],
  timelineData,
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

  // Gradient background state
  const [gradientEnabled, setGradientEnabled] = useState<boolean>(() => {
    if (homeGradientEnabled !== undefined) return homeGradientEnabled;
    return localStorage.getItem('home_gradient_enabled') === 'true';
  });
  const [gradientFrom, setGradientFrom] = useState<string>(() => {
    return homeGradientFrom || localStorage.getItem('home_gradient_from') || '#F7F2EB';
  });
  const [gradientTo, setGradientTo] = useState<string>(() => {
    return homeGradientTo || localStorage.getItem('home_gradient_to') || '#E7DEC8';
  });

  // Magazine Touch Swipe Gesture Tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  const handleMagazineTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleMagazineTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleMagazineTouchEnd = (e: React.TouchEvent, totalSpreads: number) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Horizontal swipe threshold: 40px and dominant horizontal axis
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe Left -> Next Spread
        setMagazineSpreadIndex(prev => Math.min(totalSpreads - 1, prev + 1));
      } else {
        // Swipe Right -> Prev Spread
        setMagazineSpreadIndex(prev => Math.max(0, prev - 1));
      }
    }
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 80);
  };

  useEffect(() => {
    if (homeGradientEnabled !== undefined) setGradientEnabled(homeGradientEnabled);
    if (homeGradientFrom) setGradientFrom(homeGradientFrom);
    if (homeGradientTo) setGradientTo(homeGradientTo);
  }, [homeGradientEnabled, homeGradientFrom, homeGradientTo]);

  // Flatten all timeline items from timelineData ({ [date: string]: TimelineItem[] })
  const allTimelineItems = useMemo(() => {
    if (!timelineData) return [];
    return Object.values(timelineData).flat();
  }, [timelineData]);

  const [journeyLimit, setJourneyLimit] = useState<number>(() => {
    return parseInt(localStorage.getItem('home_journey_limit') || '4', 10);
  });

  useEffect(() => {
    const handleConfigChange = (e?: any) => {
      setJourneyLimit(parseInt(localStorage.getItem('home_journey_limit') || '4', 10));
      if (e?.detail?.gradientEnabled !== undefined) {
        setGradientEnabled(Boolean(e.detail.gradientEnabled));
      } else {
        setGradientEnabled(localStorage.getItem('home_gradient_enabled') === 'true');
      }
      if (e?.detail?.gradientFrom) setGradientFrom(e.detail.gradientFrom);
      else setGradientFrom(localStorage.getItem('home_gradient_from') || '#F7F2EB');
      if (e?.detail?.gradientTo) setGradientTo(e.detail.gradientTo);
      else setGradientTo(localStorage.getItem('home_gradient_to') || '#E7DEC8');
    };
    window.addEventListener('homeConfigChanged', handleConfigChange);
    return () => window.removeEventListener('homeConfigChanged', handleConfigChange);
  }, []);

  const gradientBackgroundStyle = useMemo(() => {
    if (!gradientEnabled || isDarkMode) return undefined;
    return {
      background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
    };
  }, [gradientEnabled, gradientFrom, gradientTo, isDarkMode]);

  // Drag-reorder state for archive cards
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  // Sync local order when props change (e.g. initial load)
  useEffect(() => { setLocalTrips(trips); }, [trips]);
  useEffect(() => { setLocalPlans(plans); }, [plans]);

  // Combined Journeys & Plans for unified archive view (matches Archive Hub sorting)
  const combinedArchiveList = useMemo(() => {
    const list: (Trip | Plan)[] = [...localTrips];
    if (localPlans && localPlans.length > 0) {
      localPlans.forEach(p => {
        const hasPlanTag = p.tags?.includes('Plan');
        list.push({
          ...p,
          isPlan: true,
          tags: hasPlanTag ? p.tags : [...(p.tags || []), 'Plan'],
        });
      });
    }

    try {
      const saved = localStorage.getItem('journey_order');
      if (saved) {
        const order: number[] = JSON.parse(saved);
        const idMap = new Map(order.map((id, idx) => [id, idx]));
        return list.sort((a, b) => {
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : (a.displayOrder ?? 999999);
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : (b.displayOrder ?? 999999);
          return orderA - orderB;
        });
      }
    } catch (_) {}

    return list.sort((a, b) => (a.displayOrder ?? 999999) - (b.displayOrder ?? 999999));
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
  const heroJourneys = useMemo(() => {
    const all = [...localTrips, ...localPlans];
    if (heroJourneyIds.length > 0) {
      const filtered = heroJourneyIds.map(id => all.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[];
      if (filtered.length > 0) return filtered;
    }
    return localTrips[0] ? [localTrips[0]] : [];
  }, [localTrips, localPlans, heroJourneyIds]);

  const [isHeroMediaReady, setIsHeroMediaReady] = useState(false);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];
  // Exact user-configured duration in ms (strictly follows 3s ~ 9s setting)
  const exactSlideDuration = (heroSlideDuration && heroSlideDuration >= 3 ? heroSlideDuration : 6) * 1000;

  const goToSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return;
    setIsHeroMediaReady(false);
    setHeroSlide(idx);
  }, [heroSlide]);

  const goToPrev = () => goToSlide((heroSlide - 1 + heroJourneys.length) % heroJourneys.length);
  const goToNext = useCallback(() => {
    goToSlide((heroSlide + 1) % heroJourneys.length);
  }, [goToSlide, heroSlide, heroJourneys.length]);

  // Safety fallback: if media ready doesn't fire within 800ms, force ready so carousel never gets stuck
  useEffect(() => {
    if (!isHeroMediaReady) {
      const fallbackTimer = setTimeout(() => {
        setIsHeroMediaReady(true);
      }, 800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [heroSlide, isHeroMediaReady]);

  // Auto-advance carousel with exact configured duration when multiple heroes and auto-slide is enabled
  useEffect(() => {
    if (!heroAutoSlide || heroJourneys.length <= 1 || !isHeroMediaReady) return;

    const timer = setTimeout(() => {
      goToNext();
    }, exactSlideDuration);

    return () => clearTimeout(timer);
  }, [heroJourneys.length, heroSlide, heroAutoSlide, exactSlideDuration, isHeroMediaReady, goToNext]);

  useEffect(() => { 
    setHeroSlide(0); 
    setIsHeroMediaReady(false);
  }, [heroJourneyIds]);

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
    const orderedIds = localTrips.map(t => t.id);
    try {
      localStorage.setItem('journey_order', JSON.stringify(orderedIds));
    } catch (_) {}
    if (onReorderTrips) onReorderTrips(orderedIds);
  };

  return (
    <main 
      onClick={() => setActiveCardId(null)} 
      style={gradientBackgroundStyle}
      className="animate-in fade-in duration-700 w-full transition-all"
    >

      {/* ===== Hero Section: 3-Column Swiss Editorial Layout (Matching Reference) ===== */}
      <section className={`relative w-full border-b border-black/15 dark:border-white/15 ${gradientEnabled && !isDarkMode ? 'bg-transparent' : 'bg-[#FBFBFA] dark:bg-[#141414]'} overflow-hidden transition-colors`}>
        {currentHero ? (
          (() => {
            const { year, month, days, dateRange, cities } = getHeroDetails(currentHero);

            return (
              <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-12 items-center">
                {/* 1. Left Column: Top branding, Big Title, Month/Year, Auto Journey Sentence */}
                <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-between h-full order-2 md:order-1 relative z-20 md:-mr-8 lg:-mr-12 pointer-events-none py-6 sm:py-8 md:py-12 lg:py-16 px-2 sm:px-4 md:px-0">
                  <div>
                    {/* Minimal Branding / Title in Inter */}
                    <div className="text-[11px] font-['Inter',sans-serif] font-bold tracking-[0.25em] text-black/40 dark:text-white/40 uppercase mb-3 sm:mb-4 md:mb-6 pointer-events-auto">
                      {homeTitle ? homeTitle.replace(/\\n|\n/g, ' ') : 'JOURNAL'}
                    </div>

                    {/* Massive Bold Magazine Title in Inter (Overlaps onto center frame) */}
                    <h2
                      onClick={() => onNavigate('detail', currentHero.id)}
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black font-['Inter',sans-serif] uppercase tracking-tighter leading-[0.9] text-black dark:text-white cursor-pointer hover:opacity-85 transition-opacity select-none drop-shadow-sm pointer-events-auto"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {currentHero.title}
                    </h2>
                  </div>

                  {/* Year & Month with tight tracking + Auto Journey Sentence (Does NOT overlap hero media) */}
                  <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 flex flex-col gap-1.5 pointer-events-auto font-['Inter',sans-serif] max-w-[260px] lg:max-w-[300px]">
                    <div className="text-base sm:text-lg md:text-xl font-black tracking-tight text-black dark:text-white uppercase leading-none">
                      {month} {year}
                    </div>
                    {/* Auto journey generated sentence */}
                    <p className="text-[11px] sm:text-xs font-medium text-black/60 dark:text-white/60 leading-snug break-keep">
                      {generateJourneyMessage(currentHero.locationStr, currentHero.date, getHeroDetails(currentHero).daysCount)}
                    </p>
                  </div>
                </div>

                {/* 2. Center Column: Large 3:4 Aspect Ratio Borderless Hero Media Frame (Dead center of the screen, towering height) */}
                <div className="md:col-span-6 lg:col-span-6 flex items-center justify-center order-1 md:order-2 relative z-10 w-full px-0">
                  <div 
                    onClick={() => onNavigate('detail', currentHero.id)}
                    className="relative w-full aspect-[3/4] max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[85vh] overflow-hidden bg-neutral-900 group cursor-pointer select-none mx-auto shadow-2xl"
                  >
                    {heroJourneys.map((journey, index) => (
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
                    ))}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors pointer-events-none" />
                  </div>
                </div>

                {/* 3. Right Column: Date range / Days duration, Cities, Minimal circular arrow button */}
                <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-between h-full order-3 text-left md:text-right items-start md:items-end relative z-20 md:pl-6 lg:pl-10 font-['Inter',sans-serif] py-6 sm:py-8 md:py-12 lg:py-16 px-2 sm:px-4 md:px-0">
                  {/* Top Slide Indicator (e.g. 01 / 03) with minimal gauge & arrows */}
                  {heroJourneys.length > 1 ? (
                    <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
                      <span className="text-xs font-black tracking-widest text-black dark:text-white">
                        {String(heroSlide + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-1">
                        {heroJourneys.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            className="h-1 rounded-none transition-all cursor-pointer"
                            style={{
                              width: idx === heroSlide ? '24px' : '8px',
                              backgroundColor: idx === heroSlide ? 'currentColor' : 'rgba(150,150,150,0.3)'
                            }}
                            title={`Slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold tracking-widest text-black/40 dark:text-white/40">
                        {String(heroJourneys.length).padStart(2, '0')}
                      </span>

                      {/* Small Prev/Next */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="Prev"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToNext(); }}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="Next"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : <div className="mb-4 sm:mb-6" />}

                  {/* Middle: Duration & Dates (e.g. 18 — 20 / 3 DAYS) */}
                  <div className="my-auto flex flex-col items-start md:items-end">
                    <div className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-black dark:text-white leading-none font-['Inter',sans-serif]">
                      {dateRange}
                    </div>
                    {days && (
                      <div className="text-xs sm:text-sm font-bold text-black/50 dark:text-white/50 tracking-widest uppercase mt-2">
                        {days}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Cities and Circular Arrow ( → ) */}
                  <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 flex flex-col items-start md:items-end gap-3 sm:gap-4">
                    <div className="text-xs sm:text-sm font-bold text-black/70 dark:text-white/70 uppercase tracking-widest leading-relaxed">
                      {cities}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('detail', currentHero.id)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer text-black dark:text-white shadow-xs"
                      title="VIEW TRIP"
                    >
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 01. TRIP (통합 여정 목록 섹션)                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col w-full overflow-hidden transition-colors border-t border-black/10 dark:border-white/10">
        <div className="p-6 md:px-12 border-b border-black/15 dark:border-white/15 flex flex-col md:flex-row md:items-end justify-between gap-4 transition-colors">
          {/* Left: Pure Minimal Title */}
          <div className="flex flex-col gap-0.5">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
              TRIP
            </h2>
          </div>

          {/* Right: Controls (View Modes, Tag Filter, All Trips) */}
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
                title="TAG FILTER"
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
                  className="text-[9px] px-1.5 py-1 uppercase font-bold tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer flex items-center gap-0.5"
                  title="RESET"
                >
                  <X className="w-3 h-3" />
                  RESET
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
                  title="GRID"
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
                  title="WIDE"
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
                  title="LIST"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3. All Trips Button */}
              <button 
                type="button"
                onClick={() => onNavigate('archive')} 
                className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest flex items-center hover:opacity-60 shrink-0 ml-1 cursor-pointer text-black dark:text-white"
                title="ALL TRIPS"
              >
                ALL TRIPS <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
                      <h3 className="font-black text-sm sm:text-base md:text-lg text-black dark:text-white uppercase font-['Inter',sans-serif] tracking-tight truncate">
                        {trip.title}
                      </h3>
                      {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) ? (
                        <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 font-mono uppercase bg-black text-white dark:bg-white dark:text-black border border-white/40 dark:border-black/40 tracking-wider shadow-xs">
                          PLAN
                        </span>
                      ) : trip.statusBadge ? (
                        <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-none font-mono uppercase tracking-wider shadow-xs ${
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
                    {(() => {
                      const isItemPlan = Boolean((trip as any).isPlan || (plans && plans.some(p => String(p.id) === String(trip.id))) || trip.tags?.includes('Plan') || trip.title.includes('(Plan)'));
                      return (
                        <JourneyCardMenu
                          isLoggedIn={isLoggedIn}
                          onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                          onDelete={onDeleteTrip ? () => onDeleteTrip(trip.id) : undefined}
                          onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                          onMove={() => {
                            if (isItemPlan) {
                              handleMoveToArchive(trip as Plan);
                            } else if (onMoveToPlans) {
                              onMoveToPlans(trip);
                            }
                          }}
                          moveLabel={isItemPlan ? "LOG" : "PLAN"}
                          variant="minimal"
                        />
                      );
                    })()}
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
            {filteredTrips.slice(0, journeyLimit).map((trip, index) => {
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
                      onNavigate('detail', trip.id);
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
                      isActive={isCardActive}
                    />

                    {/* Magazine Overlay Gradient */}
                    <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                    {/* Swiss Editorial Poster Text Layout */}
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                      {/* Top Header Row: Giant Bold Year & Month / Status Badge (Aligned with Year) */}
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

                        {/* Responsive Large Bold Tag Box: PLAN or Status Badge (NEW/EDITING) */}
                        {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) ? (
                          <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[5.5cqw] sm:text-[6.5cqw] font-black uppercase tracking-wider font-mono shadow-md bg-black text-white dark:bg-white dark:text-black border border-white/40 dark:border-black/40 leading-none">
                            PLAN
                          </span>
                        ) : trip.statusBadge ? (
                          <span className={`px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[5.5cqw] sm:text-[6.5cqw] font-black uppercase tracking-wider font-mono shadow-md leading-none ${
                            trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {trip.statusBadge}
                          </span>
                        ) : null}
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
                    {(() => {
                      const isItemPlan = Boolean((trip as any).isPlan || (plans && plans.some(p => String(p.id) === String(trip.id))) || trip.tags?.includes('Plan') || trip.title.includes('(Plan)'));
                      return (
                        <JourneyCardMenu
                          className="absolute bottom-3 right-3 z-30"
                          isLoggedIn={isLoggedIn}
                          onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                          onDelete={onDeleteTrip ? () => onDeleteTrip(trip.id) : undefined}
                          onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                          onMove={() => {
                            if (isItemPlan) {
                              handleMoveToArchive(trip as Plan);
                            } else if (onMoveToPlans) {
                              onMoveToPlans(trip);
                            }
                          }}
                          moveLabel={isItemPlan ? "LOG" : "PLAN"}
                        />
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW ALL Button (유도 버튼: 여정이 한도보다 많을 때 노출) */}
        {filteredTrips.length > journeyLimit && (
          <div className="flex justify-center pt-6 pb-2 px-4 sm:px-6 md:px-12 w-full">
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-2.5 cursor-pointer shadow-md"
            >
              <span>ALL TRIPS ({filteredTrips.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 02. EDITORIAL MAGAZINE MOMENTS (잡지 연출 섹션)                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {(() => {
          // Display curated moments or fallback to top trips' imagery
          const displayMoments: MagazineMoment[] = magazineMoments && magazineMoments.length > 0 
            ? magazineMoments 
            : trips.slice(0, 3).map((t, idx) => ({
                id: `fallback-${t.id}`,
                tripId: t.id,
                title: t.title,
                date: t.date,
                location: t.locationStr,
                placeName: (t.locations && t.locations[0]?.name) || '',
                caption: '',
                quote: '',
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
              {/* Section Header: Pure Swiss Minimal Magazine Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-black/15 dark:border-white/15">
                <div className="flex items-baseline gap-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                    MAGAZINE
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('magazine')}
                    className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline decoration-1 underline-offset-4 cursor-pointer transition-colors"
                  >
                    VIEW MAGAZINE HUB →
                  </button>
                </div>

                {/* Swiss Minimal Spread Navigation Controls */}
                {totalSpreads > 1 && (
                  <div className="flex items-center gap-3.5 shrink-0 self-start sm:self-auto">
                    {/* Minimal Hero-Style Indicator Bars */}
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalSpreads }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setMagazineSpreadIndex(i)}
                          className={`h-1.5 transition-all duration-300 cursor-pointer ${
                            currentSpread === i 
                              ? 'w-6 bg-black dark:bg-white' 
                              : 'w-2 bg-black/20 dark:bg-white/20 hover:bg-black/50 dark:hover:bg-white/50'
                          }`}
                          title={`SPREAD ${i + 1}`}
                        />
                      ))}
                    </div>

                    {/* Minimal Left / Right Arrows */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMagazineSpreadIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentSpread === 0}
                        className="w-9 h-9 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-transparent text-black dark:text-white"
                        title="PREV"
                      >
                        <ChevronLeft className="w-4 h-4 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMagazineSpreadIndex(prev => Math.min(totalSpreads - 1, prev + 1))}
                        disabled={currentSpread >= totalSpreads - 1}
                        className="w-9 h-9 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-transparent text-black dark:text-white"
                        title="NEXT"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Magazine Editorial Spread Layout: 3:4 Vertical Cards (Boundary-free Swiss Minimal) with Smooth Horizontal Slide & Mobile Touch Swipe */}
              <div 
                className="w-full overflow-hidden touch-pan-y"
                onTouchStart={handleMagazineTouchStart}
                onTouchMove={handleMagazineTouchMove}
                onTouchEnd={(e) => handleMagazineTouchEnd(e, totalSpreads)}
              >
                <div 
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentSpread * 100}%)` }}
                >
                  {Array.from({ length: totalSpreads }).map((_, spreadIdx) => {
                    const slice = displayMoments.slice(spreadIdx * MOMENTS_PER_SPREAD, (spreadIdx + 1) * MOMENTS_PER_SPREAD);
                    return (
                      <div 
                        key={spreadIdx} 
                        className="w-full shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 items-stretch"
                      >
                        {slice.map((moment, idx) => {
                          const parentTrip = trips.find(t => t.id === moment.tripId);
                          const tripDestination = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || moment.location || '';
                          const engCity = getEnglishCityName(tripDestination) || 'JOURNEY';

                          let matchedTimelineItem: any = null;
                          if (allTimelineItems.length > 0 && moment.img) {
                            const momentEffImg = getEffectiveImageUrl(moment.img);
                            matchedTimelineItem = allTimelineItems.find(it => {
                              if (!it.img) return false;
                              if (it.img === moment.img) return true;
                              return getEffectiveImageUrl(it.img) === momentEffImg;
                            });
                          }

                          // 1. Title from timeline place or moment title
                          const displayTitle = matchedTimelineItem?.place?.trim() || moment.title;

                          // 2. Formatted date and day
                          const rawDate = matchedTimelineItem?.date || moment.date;
                          const dateWithDay = formatSimpleDateWithDay(rawDate);

                          // 3. Google autocomplete location name for bottom row
                          let resolvedGoogleLocation = '';
                          if (matchedTimelineItem?.location) {
                            if (typeof matchedTimelineItem.location === 'string' && matchedTimelineItem.location.trim()) {
                              resolvedGoogleLocation = matchedTimelineItem.location.trim().split(',')[0].trim();
                            } else if (typeof matchedTimelineItem.location === 'object' && (matchedTimelineItem.location as any)?.name) {
                              resolvedGoogleLocation = (matchedTimelineItem.location as any).name;
                            }
                          }
                          const displayPlace = resolvedGoogleLocation || moment.location || moment.placeName || cleanAdministrativeDistricts(moment.location || '') || 'VISITED PLACE';

                          return (
                            <div
                              key={moment.id || idx}
                              onClick={() => {
                                if (isSwipingRef.current) return;
                                if (moment.tripId) {
                                  try {
                                    localStorage.setItem('pending_detail_jump', JSON.stringify({
                                      tab: 'timeline',
                                      imgUrl: moment.img,
                                      date: moment.date,
                                      placeName: moment.placeName,
                                      title: moment.title
                                    }));
                                  } catch (e) {
                                    console.warn(e);
                                  }
                                  onNavigate('detail', moment.tripId);
                                }
                              }}
                              className="group relative cursor-pointer flex flex-col justify-between transition-all duration-300 select-none bg-transparent border-none shadow-none"
                            >
                              {/* 1. Boundary-free Editorial Photo Section: 3:4 Vertical Frame */}
                              <div className="w-full aspect-[3/4] overflow-hidden relative bg-black/5 dark:bg-white/5">
                                <img
                                  src={getEffectiveImageUrl(moment.img)}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out select-none"
                                />
                                {/* Top-Right: Swiss Minimal Black Label (여행지명: TOKYO, OSAKA, etc.) */}
                                {engCity && (
                                  <div className="absolute top-3 right-3 pointer-events-none z-10">
                                    <span className="px-2.5 py-1 text-[11px] sm:text-xs font-black font-['Inter',sans-serif] uppercase tracking-[0.2em] bg-black text-white leading-none inline-block shadow-sm">
                                      {engCity}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* 2. Editorial Text Hierarchy (Title + Date + Bottom Google Place / Arrow) */}
                              <div className="pt-3.5 flex-1 flex flex-col justify-between text-black dark:text-white">
                                <div className="flex flex-col">
                                  {/* 1) Timeline Title */}
                                  <h3 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-black dark:text-white font-sans line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                                    {displayTitle}
                                  </h3>

                                  {/* 2) Date and Day (e.g. 2024.07.19 FRI) */}
                                  {dateWithDay && (
                                    <div className="text-[11px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50 uppercase tracking-wider mt-1">
                                      {dateWithDay}
                                    </div>
                                  )}
                                </div>

                                {/* 3) Bottom Row: Google Autocomplete Place Name & Simple Arrow */}
                                <div className="pt-3 mt-auto flex items-center justify-between text-xs font-sans text-black/75 dark:text-white/75 border-t border-black/10 dark:border-white/10">
                                  <span className="font-bold tracking-tight truncate max-w-[85%]" title={displayPlace}>
                                    {displayPlace}
                                  </span>
                                  <span className="text-base font-bold text-black dark:text-white group-hover:translate-x-1.5 transition-transform shrink-0">
                                    →
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EXPLORE MAGAZINE HUB Button */}
              <div className="flex justify-center pt-6 pb-2 w-full">
                <button
                  type="button"
                  onClick={() => onNavigate('magazine')}
                  className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-2.5 cursor-pointer shadow-md font-sans"
                >
                  <span>EXPLORE MAGAZINE HUB</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </section>
    </main>
  );
}
