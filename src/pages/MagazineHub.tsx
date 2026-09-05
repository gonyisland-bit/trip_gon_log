import React, { useState, useMemo } from 'react';
import { 
  Trip, 
  Plan, 
  MagazineSection, 
  MagazineItem, 
  TimelineData 
} from '../types';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  SlidersHorizontal, 
  ExternalLink, 
  Maximize2, 
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { Lightbox } from '../components/Lightbox';

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
  // Active Section ID
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    return sections.length > 0 ? sections[0].id : 'main';
  });

  // Lightbox state for high-res photo viewing
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Fallback default sections if none exist yet
  const effectiveSections: MagazineSection[] = useMemo(() => {
    if (sections && sections.length > 0) {
      return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    // Default fallback starter sections from active trips
    const mainItems: MagazineItem[] = trips.slice(0, 6).map((t, idx) => ({
      id: `fallback-${t.id}`,
      tripId: t.id,
      title: t.title.replace(/\s*\(Plan\)$/i, ''),
      date: t.date,
      location: t.locationStr || t.country,
      placeName: (t.locations && t.locations[0]?.name) || t.locationStr,
      caption: '',
      img: t.img,
      layoutType: idx % 4 === 0 ? 'tall' : idx % 4 === 2 ? 'wide' : 'normal',
      order: idx,
    }));

    return [
      {
        id: 'main',
        title: 'MAGAZINE HOME',
        subtitle: 'Curated Moments & Editorial Stories',
        heroImg: trips[0]?.heroImg || trips[0]?.img || '',
        heroTitle: 'The Other Side of Paradise',
        heroSubtitle: '나만의 감성으로 기록하고 기억하는 여행의 순간들.',
        heroDate: trips[0]?.date || '2024 — 2026',
        heroLocation: trips[0]?.locationStr || 'GLOBAL ARCHIVE',
        heroTripId: trips[0]?.id,
        items: mainItems,
        order: 0,
        isDefault: true,
      }
    ];
  }, [sections, trips]);

  // Current Active Section
  const currentSection = useMemo(() => {
    const found = effectiveSections.find(s => s.id === activeSectionId);
    return found || effectiveSections[0] || null;
  }, [effectiveSections, activeSectionId]);

  // Items for the current active section
  const sectionItems: MagazineItem[] = useMemo(() => {
    if (!currentSection || !currentSection.items) return [];
    return [...currentSection.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [currentSection]);

  // Prepare images for Lightbox
  const lightboxImages = useMemo(() => {
    return sectionItems.map(item => ({
      url: getEffectiveImageUrl(item.img),
      date: item.date,
      place: item.placeName || item.location,
      imgNote: item.caption || item.quote || item.title,
    }));
  }, [sectionItems]);

  // Find linked trip for hero
  const heroTrip = useMemo(() => {
    if (!currentSection?.heroTripId) return null;
    return trips.find(t => t.id === currentSection.heroTripId) || null;
  }, [currentSection, trips]);

  // Jump to Manage Hub for this section
  const handleEditThisSection = () => {
    sessionStorage.setItem('lastNonManageView', 'magazine');
    sessionStorage.setItem('initialManageTab', 'MAGAZINE');
    sessionStorage.setItem('initialMagazineSectionId', currentSection?.id || 'main');
    onNavigate('manage');
  };

  return (
    <main className="min-h-screen w-full bg-[#FAF9F6] dark:bg-[#111111] text-black dark:text-white flex flex-col font-sans transition-colors duration-300">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Editorial Large Hero Banner with Typography)        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentSection && (
        <section className="relative w-full h-[54vh] sm:h-[60vh] md:h-[66vh] max-h-[680px] min-h-[400px] overflow-hidden bg-black select-none group">
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

          {/* Dark Overlay Gradients for Editorial Mood & Readability (Lighter for clearer photo visibility) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent hidden md:block" />

          {/* Hero Top Bar: Issue / Volume / Section Badge */}
          <div className="absolute top-5 sm:top-6 left-6 sm:left-12 right-6 sm:right-12 z-20 flex items-center justify-between text-white/80">
            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase bg-white/20 backdrop-blur-md px-2.5 py-1 border border-white/20">
                MAGAZINE ISSUE #{String(effectiveSections.findIndex(s => s.id === currentSection.id) + 1).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-mono tracking-wider uppercase opacity-80 hidden sm:inline">
                {currentSection.title}
              </span>
            </div>

            {/* Admin Quick Edit Button */}
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                onClick={handleEditThisSection}
                className="px-3.5 py-1.5 bg-white text-black hover:bg-white/90 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                title="이 매거진 섹션 편집하기"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>EDIT SECTION</span>
              </button>
            )}
          </div>

          {/* Hero Content (Centered Bottom Editorial Typography) */}
          <div className="absolute bottom-8 sm:bottom-12 left-6 sm:left-12 right-6 sm:right-12 z-20 max-w-4xl flex flex-col gap-2.5 sm:gap-3 text-white">
            {/* Meta Tags: Date & Location */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-mono tracking-widest uppercase text-white/70">
              {currentSection.heroDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentSection.heroDate}
                </span>
              )}
              {currentSection.heroDate && currentSection.heroLocation && (
                <span className="opacity-40">|</span>
              )}
              {currentSection.heroLocation && (
                <span className="flex items-center gap-1.5 text-white/90 font-bold">
                  <MapPin className="w-3.5 h-3.5" />
                  {currentSection.heroLocation}
                </span>
              )}
            </div>

            {/* Bold Large Editorial Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-normal tracking-tight leading-[1.08] text-white drop-shadow-sm">
              {currentSection.heroTitle || currentSection.title}
            </h1>

            {/* Link to Journey Detail */}
            {heroTrip && (
              <div className="pt-1">
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
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. SECTION NAVIGATOR / SELECTOR (Editorial Tabs)                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-14 sm:top-16 z-30 w-full bg-[#FAF9F6]/95 dark:bg-[#111111]/95 backdrop-blur-md border-b border-black/10 dark:border-white/10 px-4 sm:px-8 md:px-12 py-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {effectiveSections.map(sec => {
              const isActive = sec.id === currentSection?.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-3.5 sm:px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer rounded-none border ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-transparent hover:border-black/20 dark:hover:border-white/20 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span>{sec.title}</span>
                  {sec.items && sec.items.length > 0 && (
                    <span className={`ml-2 text-[10px] opacity-60 ${isActive ? 'font-black' : ''}`}>
                      ({sec.items.length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section Count / Editorial Label */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-black/40 dark:text-white/40">
            <BookOpen className="w-4 h-4" />
            <span className="uppercase tracking-wider">
              {currentSection?.title || 'MAGAZINE'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. EDITORIAL MAGAZINE GRID (Varied Layout Cards)                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-12 sm:py-16 flex flex-col gap-12">
        
        {/* Section Header Text (Journal Title & Curated Memo) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-black/15 dark:border-white/15">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-600 dark:text-red-500">
              EDITORIAL CURATION
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-black dark:text-white">
              {currentSection?.title}
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
                이 섹션에 등록된 매거진 사진이 아직 없습니다. 관리자 허브에서 여정 사진을 선택하여 매거진 카드를 추가해보세요.
              </p>
            </div>
            {isLoggedIn && isAdmin && (
              <button
                type="button"
                onClick={handleEditThisSection}
                className="mt-2 px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-85 transition-opacity"
              >
                + ADD MOMENTS IN MANAGE HUB
              </button>
            )}
          </div>
        ) : (
          /* Magazine Editorial Grid: Responsive 1 / 2 / 3 Columns with Varied Aspect Ratios */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 items-start">
            {sectionItems.map((item, idx) => {
              const layoutType = item.layoutType || 'normal';
              const parentTrip = trips.find(t => t.id === item.tripId);
              
              // Layout classes based on layoutType
              let colSpanClass = 'col-span-1';
              let aspectClass = 'aspect-[3/4]'; // Normal vertical

              if (layoutType === 'tall') {
                aspectClass = 'aspect-[2/3]'; // Taller vertical
              } else if (layoutType === 'wide') {
                colSpanClass = 'col-span-1 sm:col-span-2';
                aspectClass = 'aspect-[16/10] sm:aspect-[16/9]';
              } else if (layoutType === 'large') {
                colSpanClass = 'col-span-1 sm:col-span-2 lg:col-span-2';
                aspectClass = 'aspect-[4/3]';
              }

              return (
                <article
                  key={item.id || idx}
                  className={`group flex flex-col gap-4 ${colSpanClass} transition-all duration-300`}
                >
                  {/* Image Container with Zoom and Lightbox Trigger */}
                  <div 
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-full ${aspectClass} overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer border border-black/10 dark:border-white/10`}
                  >
                    <img
                      src={getEffectiveImageUrl(item.img)}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    {/* Subtle Overlay & Zoom Icon on Hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/90 dark:bg-black/90 text-black dark:text-white flex items-center justify-center shadow-md">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Sequential Index Badge */}
                    <div className="absolute top-3 left-3 bg-black/60 dark:bg-white/70 backdrop-blur-xs text-white dark:text-black font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Editorial Typography & Metadata Section */}
                  <div className="flex flex-col gap-2 pt-1">
                    
                    {/* Top Tiny Metadata Strip: Date & Location */}
                    <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-black/50 dark:text-white/50">
                      {item.date && (
                        <span>{item.date}</span>
                      )}
                      {item.date && (item.placeName || item.location) && (
                        <span className="opacity-30">•</span>
                      )}
                      {(item.placeName || item.location) && (
                        <span className="font-bold text-black/70 dark:text-white/70 truncate">
                          {item.placeName || item.location}
                        </span>
                      )}
                    </div>

                    {/* Bold Large Image Title */}
                    <h3 
                      onClick={() => setLightboxIndex(idx)}
                      className="text-lg sm:text-xl font-serif font-bold text-black dark:text-white leading-snug tracking-tight hover:underline cursor-pointer"
                    >
                      {item.title}
                    </h3>

                    {/* Editorial Caption / Short Description */}
                    {item.caption && (
                      <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans line-clamp-3">
                        {item.caption}
                      </p>
                    )}

                    {/* Quote / Subtext if present */}
                    {item.quote && (
                      <p className="text-xs font-serif italic text-black/60 dark:text-white/60 border-l-2 border-black/20 dark:border-white/20 pl-2.5 my-1">
                        “{item.quote}”
                      </p>
                    )}

                    {/* Bottom Action: Direct Link to Journey */}
                    {parentTrip && (
                      <div className="pt-1 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('detail', parentTrip.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:underline cursor-pointer transition-colors"
                        >
                          <span>JOURNEY: {parentTrip.title.replace(/\s*\(Plan\)$/i, '')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
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
