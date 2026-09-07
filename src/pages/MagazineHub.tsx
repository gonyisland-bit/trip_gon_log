import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Trip, 
  Plan, 
  MagazineSection, 
  MagazineItem, 
  TimelineData,
  TimelineItem
} from '../types';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  ExternalLink, 
  Maximize2, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { Lightbox } from '../components/Lightbox';
import { cleanAdministrativeDistricts, resolveTimelineItemLocation } from '../components/SummaryView';
import { resolveTimelinePlaceName, buildDefaultMagazineSections } from '../utils/magazineHelper';

// Helper for minimal date + day format (e.g. 2024.07.19 FRI)
function formatSimpleDateWithDay(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return dateStr;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[d.getDay()];
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}.${monthStr}.${dayStr} ${dayName}`;
}

interface MagazineHubPageProps {
  sections: MagazineSection[];
  trips: Trip[];
  plans?: Plan[];
  timelineData?: TimelineData;
  onNavigate: (view: string, tripId?: number | null) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDarkMode: boolean;
}

export function MagazineHubPage({
  sections = [],
  trips = [],
  plans = [],
  timelineData = {},
  onNavigate,
  isLoggedIn,
  isAdmin,
  isDarkMode,
}: MagazineHubPageProps) {
  // Active Section ID with sessionStorage restoration
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const saved = sessionStorage.getItem('lastMagazineSectionId');
    if (saved && sections && sections.some(s => s.id === saved)) {
      return saved;
    }
    return sections && sections.length > 0 ? sections[0].id : 'main';
  });

  // Accordion drawer state for magazine issues showcase
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Lightbox state for high-res photo viewing
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    sessionStorage.setItem('lastMagazineSectionId', id);
  };

  // Keep lastMagazineSectionId updated whenever activeSectionId changes
  useEffect(() => {
    if (activeSectionId) {
      sessionStorage.setItem('lastMagazineSectionId', activeSectionId);
    }
  }, [activeSectionId]);

  // Scroll to top on mount or section switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeSectionId]);

  // Effective sections: directly use user-configured sections or fallback to default starter sections
  const effectiveSections: MagazineSection[] = useMemo(() => {
    if (sections && sections.length > 0) {
      return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return buildDefaultMagazineSections(trips);
  }, [sections, trips]);

  // Touch swipe state for Hero section
  const touchStartXRef = useRef<number | null>(null);

  // Switch to next/prev section
  const handlePrevSection = () => {
    if (effectiveSections.length <= 1) return;
    const currIdx = effectiveSections.findIndex(s => s.id === (currentSection?.id || activeSectionId));
    const prevIdx = (currIdx - 1 + effectiveSections.length) % effectiveSections.length;
    setActiveSectionId(effectiveSections[prevIdx].id);
  };

  const handleNextSection = () => {
    if (effectiveSections.length <= 1) return;
    const currIdx = effectiveSections.findIndex(s => s.id === (currentSection?.id || activeSectionId));
    const nextIdx = (currIdx + 1) % effectiveSections.length;
    setActiveSectionId(effectiveSections[nextIdx].id);
  };

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0) {
        // Swipe Right -> Prev Section
        handlePrevSection();
      } else {
        // Swipe Left -> Next Section
        handleNextSection();
      }
    }
  };

  // Current Active Section
  const currentSection = useMemo(() => {
    const found = effectiveSections.find(s => s.id === activeSectionId);
    return found || effectiveSections[0] || null;
  }, [effectiveSections, activeSectionId]);

  // Items for the current active section with real-time sync from timelineData
  const sectionItems: MagazineItem[] = useMemo(() => {
    if (!currentSection || !currentSection.items) return [];

    // Fast lookup maps for live timeline items
    const timelineByUrl = new Map<string, TimelineItem>();
    const timelineById = new Map<number | string, TimelineItem>();
    if (timelineData) {
      Object.values(timelineData).forEach(items => {
        if (Array.isArray(items)) {
          items.forEach(t => {
            if (t.id !== undefined) {
              timelineById.set(t.id, t);
              timelineById.set(Number(t.id), t);
              timelineById.set(String(t.id), t);
            }
            if (t.img) {
              timelineByUrl.set(t.img, t);
              const eff = getEffectiveImageUrl(t.img);
              if (eff) timelineByUrl.set(eff, t);
            }
            const gImages = (t as any).galleryImages;
            if (Array.isArray(gImages)) {
              gImages.forEach((g: any) => {
                const gUrl = typeof g === 'string' ? g : g?.url;
                if (gUrl) {
                  timelineByUrl.set(gUrl, {
                    ...t,
                    place: (typeof g !== 'string' && g?.place) || t.place,
                    location: (typeof g !== 'string' && g?.location) || t.location,
                    date: (typeof g !== 'string' && g?.date) || t.date,
                  });
                }
              });
            }
          });
        }
      });
    }

    // Gather all trip timeline items for location resolution
    const allTimelineList: TimelineItem[] = [];
    if (timelineData) {
      Object.values(timelineData).forEach(tItems => {
        if (Array.isArray(tItems)) {
          allTimelineList.push(...tItems);
        }
      });
    }

    return [...currentSection.items]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(item => {
        if (item.isTextOnly || !item.img) return item;

        // Sync with live timeline item if available (ID match first, then URL, then date+place smart match)
        let matched: TimelineItem | undefined;
        if (item.timelineItemId !== undefined) {
          matched = timelineById.get(Number(item.timelineItemId)) || timelineById.get(String(item.timelineItemId));
        }
        if (!matched && item.img) {
          matched = timelineByUrl.get(item.img) || timelineByUrl.get(getEffectiveImageUrl(item.img));
        }
        if (!matched && item.tripId && item.date && item.title) {
          const cleanTitle = item.title.trim().toLowerCase();
          matched = allTimelineList.find(t =>
            Number(t.tripId) === Number(item.tripId) &&
            t.date === item.date &&
            t.place && t.place.trim().toLowerCase() === cleanTitle
          );
        }

        const targetTripId = matched?.tripId || item.tripId;
        const parentTrip = trips.find(t => t.id === targetTripId);
        const tripTimeline = allTimelineList.filter(t => t.tripId === targetTripId);

        if (matched) {
          const pName = matched.place?.trim() || '';
          const jTitle = parentTrip?.title?.replace(/\s*\(Plan\)$/i, '') || '';
          const resolvedLocation = resolveTimelinePlaceName(matched, tripTimeline, parentTrip);

          return {
            ...item,
            timelineItemId: matched.id,
            tripId: targetTripId,
            img: matched.img || item.img, // Live update to latest high-resolution photo from timeline
            title: pName || jTitle || item.title || 'UNTITLED MOMENT',
            placeName: resolvedLocation,
            location: resolvedLocation,
            date: matched.date || item.date,
          };
        } else {
          // If no matched timeline, use existing or parent trip fallback (never duplicate title)
          let resolvedLocation = item.placeName || '';
          const pName = (item.title || '').trim().toLowerCase();
          if (!resolvedLocation || resolvedLocation.trim().toLowerCase() === pName) {
            resolvedLocation = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || parentTrip?.country || 'VISITED PLACE';
          }
          return {
            ...item,
            placeName: resolvedLocation,
            location: resolvedLocation,
          };
        }
      });
  }, [currentSection, timelineData, trips]);

  // Filter only items with actual photos for Lightbox (exclude text-only cards)
  const photoItems = useMemo(() => {
    return sectionItems.filter(item => !item.isTextOnly && !!item.img);
  }, [sectionItems]);

  // Prepare images for Lightbox
  const lightboxImages = useMemo(() => {
    return photoItems.map(item => ({
      url: getEffectiveImageUrl(item.img),
      date: item.date,
      place: item.title,
      location: item.placeName || item.location,
      imgNote: item.caption || item.textContent || '',
    }));
  }, [photoItems]);

  // Find linked trip for hero
  const heroTrip = useMemo(() => {
    if (!currentSection?.heroTripId) return null;
    return trips.find(t => t.id === currentSection.heroTripId) || null;
  }, [currentSection, trips]);

  // Jump to Manage Hub for this section
  const handleEditThisSection = () => {
    const secId = currentSection?.id || 'main';
    sessionStorage.setItem('lastNonManageView', 'magazine');
    sessionStorage.setItem('initialManageTab', 'MAGAZINE');
    sessionStorage.setItem('initialMagazineSectionId', secId);
    sessionStorage.setItem('lastMagazineSectionId', secId);
    onNavigate('manage');
  };

  // Group sectionItems into smart editorial rows based on 3-column magazine rules:
  // - [P, P, P] -> 3 portrait cards row (1 col each in 3-col grid)
  // - [P, L] -> 1 portrait (1 col) + 1 landscape (2 cols, matched height) in 3-col grid
  // - [L, P] -> 1 landscape (2 cols, matched height) + 1 portrait (1 col) in 3-col grid
  // - [L, L] -> 2 landscape cards row (50% : 50% in 2-col grid)
  // - [L] (single) -> 1 landscape card (50% max width in 2-col grid)
  // - [P, P] -> 2 portrait cards row (33% each in 3-col grid)
  // - [P] (single) -> 1 portrait card (33% in 3-col grid)
  const isLandscapeItem = (item: MagazineItem) =>
    item.layoutType === 'landscape' || item.layoutType === 'wide' || item.layoutType === 'large';

  type MagazineRow = 
    | { type: 'PPP'; items: [MagazineItem, MagazineItem, MagazineItem] }
    | { type: 'PL'; items: [MagazineItem, MagazineItem] }
    | { type: 'LP'; items: [MagazineItem, MagazineItem] }
    | { type: 'LL'; items: [MagazineItem, MagazineItem] }
    | { type: 'SINGLE_LANDSCAPE'; items: [MagazineItem] }
    | { type: 'PP'; items: [MagazineItem, MagazineItem] }
    | { type: 'SINGLE_PORTRAIT'; items: [MagazineItem] };

  const magazineRows = useMemo<MagazineRow[]>(() => {
    const rows: MagazineRow[] = [];
    let i = 0;
    while (i < sectionItems.length) {
      const cur = sectionItems[i];
      const next1 = sectionItems[i + 1];
      const next2 = sectionItems[i + 2];

      if (isLandscapeItem(cur)) {
        // Current is Landscape
        if (next1 && !isLandscapeItem(next1)) {
          // [L, P] -> 2 cols Landscape + 1 col Portrait (matched height)
          rows.push({ type: 'LP', items: [cur, next1] });
          i += 2;
        } else if (next1 && isLandscapeItem(next1)) {
          // [L, L] -> 2 landscape items in a 2-col row (50% : 50%)
          rows.push({ type: 'LL', items: [cur, next1] });
          i += 2;
        } else {
          // Single [L] -> 50% max width in 2-col row
          rows.push({ type: 'SINGLE_LANDSCAPE', items: [cur] });
          i += 1;
        }
      } else {
        // Current is Portrait
        if (next1 && isLandscapeItem(next1)) {
          // [P, L] -> 1 col Portrait + 2 cols Landscape (matched height)
          rows.push({ type: 'PL', items: [cur, next1] });
          i += 2;
        } else if (next1 && !isLandscapeItem(next1) && next2 && !isLandscapeItem(next2)) {
          // [P, P, P] -> 3 portrait cards (33% each in 3-col row)
          rows.push({ type: 'PPP', items: [cur, next1, next2] });
          i += 3;
        } else if (next1 && !isLandscapeItem(next1)) {
          // [P, P] -> 2 portrait cards (33% each in 3-col row)
          rows.push({ type: 'PP', items: [cur, next1] });
          i += 2;
        } else {
          // Single [P] -> 1 portrait card (33% in 3-col row)
          rows.push({ type: 'SINGLE_PORTRAIT', items: [cur] });
          i += 1;
        }
      }
    }
    return rows;
  }, [sectionItems]);

  // Card Rendering Component
  const renderCard = (
    item: MagazineItem,
    options: {
      spanClass?: string;
      isMatchedHeight?: boolean;
    } = {}
  ) => {
    const globalIdx = sectionItems.findIndex(x => x.id === item.id);
    const itemIndex = globalIdx !== -1 ? globalIdx : 0;
    const isLand = isLandscapeItem(item);
    const isTextCard = item.isTextOnly || !item.img;
    const parentTrip = trips.find(t => t.id === item.tripId);

    // Height & aspect ratio logic:
    // Portrait is 3:4.
    // Landscape on mobile (< md) adapts to 4:3 for prominent vertical presence; on desktop (>= md) it aligns with 16:10.
    let visualFrameClass = 'aspect-[3/4] w-full';
    if (options.isMatchedHeight) {
      visualFrameClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
    } else if (isLand) {
      visualFrameClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
    }

    // Full-bleed expansion on mobile for landscape cards
    const containerBleedClass = isLand
      ? '-mx-4 sm:-mx-8 md:mx-0 w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] md:w-full'
      : 'w-full';

    // Pure Text Card Rendering: No borders, no metadata headers/footers, ONLY text content
    if (isTextCard) {
      return (
        <article
          key={item.id || itemIndex}
          className={`group flex flex-col h-full justify-center transition-all duration-300 ${containerBleedClass} ${options.spanClass || ''}`}
        >
          <div
            className={`relative ${visualFrameClass} overflow-hidden bg-transparent text-black dark:text-white p-4 sm:p-6 md:p-8 flex items-center justify-center select-none border-0`}
          >
            <p className="font-['Inter',sans-serif] font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-tight leading-snug break-keep text-black dark:text-white text-center">
              {item.textContent || item.title}
            </p>
          </div>
        </article>
      );
    }

    // Extract Home Magazine Card properties
    const displayTitle = item.title;
    const rawDate = item.date;
    const dateWithDay = formatSimpleDateWithDay(rawDate);
    let displayPlace = item.placeName || item.location || '';
    if (!displayPlace || displayPlace.trim() === '' || displayPlace.trim().toLowerCase() === displayTitle.trim().toLowerCase()) {
      displayPlace = parentTrip?.locationStr || parentTrip?.country || 'VISITED PLACE';
    }

    // Open Lightbox at correct photo index (excluding text-only cards)
    const photoIdx = photoItems.findIndex(p => p.id === item.id);
    const openLightbox = () => {
      if (photoIdx !== -1) {
        setLightboxIndex(photoIdx);
      }
    };

    // Direct jump handler to journey timeline
    const handleJumpToTimeline = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.tripId) {
        try {
          localStorage.setItem('pending_detail_jump', JSON.stringify({
            tab: 'timeline',
            imgUrl: item.img,
            date: rawDate,
            placeName: displayPlace,
            title: displayTitle
          }));
        } catch (err) {
          console.warn(err);
        }
        onNavigate('detail', item.tripId);
      }
    };

    // Photo Card Rendering
    return (
      <article
        key={item.id || itemIndex}
        className={`group relative flex flex-col justify-between h-full transition-all duration-300 select-none bg-transparent border-none shadow-none ${containerBleedClass} ${options.spanClass || ''}`}
      >
        {/* 1. Photo Section */}
        <div
          onClick={openLightbox}
          className={`relative ${visualFrameClass} overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer border border-black/10 dark:border-white/10`}
        >
          <img
            src={getEffectiveImageUrl(item.img)}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out select-none"
          />

          {/* Minimal Subtle Zoom Icon at Bottom-Right on Hover */}
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-3 right-3 w-8 h-8 bg-black/75 dark:bg-white/85 backdrop-blur-xs text-white dark:text-black flex items-center justify-center shadow-md transition-transform group-hover:scale-100 scale-90">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Sequential Index Badge (Top-Left) */}
          <div className="absolute top-3 left-3 bg-black/60 dark:bg-white/70 backdrop-blur-xs text-white dark:text-black font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
            {String(itemIndex + 1).padStart(2, '0')}
          </div>
        </div>

        {/* 2. Editorial Typography & Metadata (Home Magazine Style: Title -> Date -> Location Row) */}
        <div className={`pt-3.5 flex-1 flex flex-col justify-between text-black dark:text-white font-['Inter',sans-serif] ${isLand ? 'px-4 sm:px-8 md:px-0' : ''}`}>
          <div className="flex flex-col">
            {/* 1) Title */}
            <h3
              onClick={openLightbox}
              className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-black dark:text-white font-sans line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors cursor-pointer"
            >
              {displayTitle}
            </h3>

            {/* 2) Date and Day (e.g. 2024.07.19 FRI) */}
            {dateWithDay && (
              <div className="text-[11px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50 uppercase tracking-wider mt-1">
                {dateWithDay}
              </div>
            )}
          </div>

          {/* 3) Bottom Row: Google Autocomplete Place Name & Simple Arrow -> Direct Timeline Jump */}
          <div
            onClick={handleJumpToTimeline}
            className="pt-3 mt-auto flex items-center justify-between text-xs font-sans text-black/75 dark:text-white/75 border-t border-black/10 dark:border-white/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer group/link transition-colors"
            title={item.tripId ? "여정 타임라인으로 바로 이동" : undefined}
          >
            <span className="font-bold tracking-tight truncate max-w-[85%]" title={displayPlace}>
              {displayPlace}
            </span>
            <span className="text-base font-bold text-black dark:text-white group-hover/link:translate-x-1.5 transition-transform shrink-0">
              →
            </span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-screen w-full bg-transparent dark:bg-[#111111] text-black dark:text-white flex flex-col font-sans transition-colors duration-300">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Editorial Large Hero Banner with Typography)        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSection && (
        <section 
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
          className="relative w-full aspect-[16/10] sm:aspect-[21/9] md:aspect-[24/10] min-h-[50vh] max-h-[80vh] overflow-hidden bg-black select-none group"
        >
          {/* Background Image */}
          {currentSection.heroImg ? (
            <img
              src={getEffectiveImageUrl(currentSection.heroImg)}
              alt={currentSection.heroTitle || currentSection.title}
              className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0a0a0a]" />
          )}

          {/* Dark Overlay Gradients for Editorial Mood & Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent hidden md:block" />

          {/* Minimal Translucent Prev/Next Navigation Buttons */}
          {effectiveSections.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSection();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center opacity-80 group-hover:opacity-100"
                title="이전 매거진 섹션"
                aria-label="Previous magazine section"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextSection();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center opacity-80 group-hover:opacity-100"
                title="다음 매거진 섹션"
                aria-label="Next magazine section"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          {/* Hero Top Bar: Magazine Masthead & Issue Barcode/Volume */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-10 right-4 sm:right-10 z-20 flex items-center justify-between text-white/90 border-b border-white/20 pb-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-[9px] sm:text-[10px] font-mono font-black tracking-widest uppercase bg-white text-black px-2 py-0.5 shadow-sm">
                ISSUE N°{String(effectiveSections.findIndex(s => s.id === currentSection.id) + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-white/90">
                TRIPGON MAGAZINE
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase text-white/70">
              <span className="hidden md:inline">VOL. {new Date().getFullYear()} · EDITORIAL EDITION</span>
              <span className="hidden sm:inline bg-white/15 px-2 py-0.5 border border-white/20">
                {currentSection.items?.length || 0} STORIES
              </span>
            </div>
          </div>

          {/* Hero Content (Centered Bottom Editorial Typography) */}
          <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 z-20 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white">
            <div className="max-w-3xl flex flex-col gap-2 sm:gap-3">
              {/* Meta Tags: Date & Location */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono tracking-widest uppercase text-white/80">
                {currentSection.heroDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {currentSection.heroDate}
                  </span>
                )}
                {currentSection.heroDate && currentSection.heroLocation && (
                  <span className="opacity-40">/</span>
                )}
                {currentSection.heroLocation && (
                  <span className="flex items-center gap-1.5 text-white font-bold bg-black/40 backdrop-blur-xs px-2 py-0.5 border border-white/20">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    {currentSection.heroLocation}
                  </span>
                )}
              </div>

              {/* Bold Large Editorial Magazine Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-satoshi font-light tracking-tight leading-[1.05] uppercase text-white drop-shadow-md">
                {currentSection.heroTitle || currentSection.title}
              </h1>

              {/* Link to Journey Detail */}
              {heroTrip && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('detail', heroTrip.id)}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-white hover:text-white/80 underline decoration-1 underline-offset-8 cursor-pointer transition-colors"
                  >
                    <span>EXPLORE FULL JOURNEY ({heroTrip.title})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Editorial Minimal Magazine Barcode / Archive Stamp (Bottom Right) */}
            <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 select-none opacity-85">
              <div className="flex items-center gap-0.5 h-5">
                {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2].map((w, i) => (
                  <div key={i} className="bg-white/80 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="text-[8px] font-mono tracking-widest text-white/70">
                ISSN 2026-TRIPGON · #{String(currentSection.id).slice(-6).toUpperCase()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. SECTION NAVIGATOR / SELECTOR (Editorial Tabs & Showcase Accordion) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-14 sm:top-16 z-30 w-full bg-white/40 dark:bg-[#111111]/95 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-4 sm:px-8 md:px-12 py-2.5 transition-colors">
        <div className="flex items-center justify-between gap-3">
          {/* Section Tabs (Horizontal Scrollable) */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar py-1 flex-1 min-w-0">
            {effectiveSections.map((sec, idx) => {
              const isActive = sec.id === (currentSection?.id || activeSectionId);
              return (
                <button
                  key={sec.id}
                  onClick={() => handleSelectSection(sec.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold uppercase font-['Inter',sans-serif] tracking-wider transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                      : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-60 mr-1.5">{String(idx + 1).padStart(2, '0')}.</span>
                  {sec.title}
                </button>
              );
            })}
          </div>

          {/* Accordion Showcase Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAccordionOpen(prev => !prev)}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
              isAccordionOpen
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-black/5 dark:bg-white/5 border-black/15 dark:border-white/15 text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title="매거진 커버 진열장 (Issue Showcase) 열기/닫기"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ALL ISSUES</span>
            <span className="text-[10px] opacity-75 font-mono">({effectiveSections.length})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isAccordionOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Magazine Cover Showcase Accordion / Rack */}
        {isAccordionOpen && (
          <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                  MAGAZINE RACK & ARCHIVE
                </span>
                <span className="text-[10px] text-black/40 dark:text-white/40 hidden sm:inline">
                  — 커버를 선택하여 원하는 매거진 이슈를 바로 탐색하세요
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAccordionOpen(false)}
                className="text-[10px] font-mono font-bold uppercase text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
              >
                닫기 ✕
              </button>
            </div>

            {/* Grid of Magazine Covers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pb-2 max-h-[60vh] overflow-y-auto pr-1">
              {effectiveSections.map((sec, idx) => {
                const isActive = sec.id === (currentSection?.id || activeSectionId);
                const coverImg = sec.heroImg || (sec.items && sec.items.find(it => it.img)?.img) || '';
                const displayHeroTitle = sec.heroTitle || sec.title;
                const showSeparateSectionTitle = sec.heroTitle && sec.heroTitle.trim() !== '' && sec.heroTitle.trim().toLowerCase() !== sec.title.trim().toLowerCase();
                return (
                  <div
                    key={sec.id}
                    onClick={() => {
                      handleSelectSection(sec.id);
                      setIsAccordionOpen(false);
                    }}
                    className={`group relative flex flex-col border transition-all cursor-pointer bg-white dark:bg-[#1a1a1a] select-none ${
                      isActive
                        ? 'border-red-600 dark:border-red-500 shadow-xl ring-2 ring-red-600/30 dark:ring-red-500/30'
                        : 'border-black/15 dark:border-white/15 hover:border-black/50 dark:hover:border-white/50 hover:-translate-y-1 shadow-xs'
                    }`}
                  >
                    {/* Magazine Cover Image (3:4 ratio) */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/10 dark:bg-white/10">
                      {coverImg ? (
                        <img
                          src={getEffectiveImageUrl(coverImg)}
                          alt={displayHeroTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white/40 font-mono text-[10px]">
                          NO COVER
                        </div>
                      )}
                      {/* Top & bottom gradient for optimal readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/70 opacity-90" />

                      {/* Top Magazine Masthead & Hero Big Title on Cover */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-col gap-1.5 z-10 text-white">
                        <div className="flex items-center justify-between">
                          <div className="bg-black/85 backdrop-blur-xs text-white font-mono text-[9px] font-black px-1.5 py-0.5 border border-white/20 uppercase tracking-widest shadow-xs">
                            ISSUE #{String(idx + 1).padStart(2, '0')}
                          </div>
                          {isActive && (
                            <div className="bg-red-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
                              READING
                            </div>
                          )}
                        </div>

                        {/* Hero Big Title (Magazine Masthead Style with Satoshi Light) */}
                        <h4 className="text-xs sm:text-sm md:text-base font-satoshi font-light tracking-tight leading-[1.1] uppercase drop-shadow-md text-white line-clamp-2 pt-0.5">
                          {displayHeroTitle}
                        </h4>
                      </div>

                      {/* Meta in Cover Bottom (Section Title & Location) */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white z-10 flex flex-col gap-0.5">
                        {showSeparateSectionTitle && (
                          <div className="text-[10px] sm:text-[11px] font-satoshi font-bold tracking-wider uppercase text-white/90 drop-shadow-md truncate">
                            {sec.title}
                          </div>
                        )}
                        <div className="text-[9px] sm:text-[10px] font-mono font-bold text-white/80 truncate tracking-wider uppercase drop-shadow-xs flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-red-400 shrink-0" />
                          <span className="truncate">{sec.heroLocation || `${sec.items?.length || 0} STORIES`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-2.5 flex items-center justify-between text-[10px] font-mono font-bold text-black/70 dark:text-white/70 bg-[#FAF9F6] dark:bg-[#141414] border-t border-black/5 dark:border-white/5">
                      <span className="truncate font-sans font-semibold">{sec.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-black/40 dark:text-white/40 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. SECTION CONTENT (Curated Moments & Stories)                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-10 sm:py-16 flex-1">
        
        {/* Section Header Title & Story Count */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-black/15 dark:border-white/15 pb-4 mb-8 sm:mb-12">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              CURATED STORIES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase font-['Inter',sans-serif] tracking-tight text-black dark:text-white">
              {currentSection?.title || 'EDITORIAL MOMENTS'}
            </h2>
          </div>

          <div className="text-xs font-mono text-black/40 dark:text-white/40 shrink-0">
            TOTAL {sectionItems.length} STORIES / MOMENTS
          </div>
        </div>

        {/* Empty State */}
        {sectionItems.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4 border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] p-8">
            <Compass className="w-8 h-8 text-black/30 dark:text-white/30 stroke-1" />
            <div className="flex flex-col gap-1 max-w-md">
              <span className="text-sm font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                NO MAGAZINE MOMENTS YET
              </span>
              <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
                이 섹션에 등록된 매거진 사진이나 텍스트 카드가 아직 없습니다. 설정에서 카드를 추가해보세요.
              </p>
            </div>
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                onClick={handleEditThisSection}
                className="mt-2 px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-85 transition-opacity"
              >
                + ADD MOMENTS IN SETTINGS
              </button>
            )}
          </div>
        ) : (
          /* Magazine Editorial 3-Column Smart Grid */
          <div className="flex flex-col gap-10 sm:gap-14">
            {magazineRows.map((row, rowIdx) => {
              if (row.type === 'PPP') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                    {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                    {renderCard(row.items[2], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              if (row.type === 'PL') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                    {renderCard(row.items[1], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                  </div>
                );
              }
              if (row.type === 'LP') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                    {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              if (row.type === 'LL') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                    {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              if (row.type === 'SINGLE_LANDSCAPE') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              if (row.type === 'PP') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                    {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              if (row.type === 'SINGLE_PORTRAIT') {
                return (
                  <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">
                    {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. LIGHTBOX MODAL (Full Resolution View)                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <Lightbox
          isOpen={lightboxIndex !== null}
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </main>
  );
}
