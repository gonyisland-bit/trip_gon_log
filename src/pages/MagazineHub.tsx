import React, { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { 
  Trip, 
  Plan, 
  MagazineSection, 
  MagazineItem, 
  MagazineHubConfig,
  TimelineData,
  TimelineItem
} from '../types';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  Maximize2, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BookOpen,
  Layers,
  ArrowUpRight,
  Tag,
  Search,
  ArrowUpDown,
  Check,
  X,
  Play
} from 'lucide-react';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { IssueCard } from '../components/cards/IssueCard';
import { MemoryReel } from '../components/reel/MemoryReel';
import { IssueTextWindow } from '../components/reel/IssueTextWindow';
import { MagazineSpread, SpreadCard } from '../components/magazine/MagazineSpread';
import { swipeStart, swipeDirection, SwipeStart } from '../utils/swipe';
import { Lightbox } from '../components/Lightbox';
import { resolveTimelinePlaceName, buildDefaultMagazineSections, sortTimelineChronologically } from '../utils/magazineHelper';

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
  hubConfig?: MagazineHubConfig;
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
  hubConfig,
  trips = [],
  plans = [],
  timelineData = {},
  onNavigate,
  isLoggedIn,
  isAdmin,
  isDarkMode,
}: MagazineHubPageProps) {
  // Effective sections: directly use user-configured sections or fallback to default starter sections
  const effectiveSections: MagazineSection[] = useMemo(() => {
    if (sections && sections.length > 0) {
      return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return buildDefaultMagazineSections(trips);
  }, [sections, trips]);

  // View Mode: 'hub' (Magazine Directory & Showcase) or 'section' (Individual Section Detail)
  const [viewMode, setViewMode] = useState<'hub' | 'section'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('section')) return 'section';
    const savedMode = sessionStorage.getItem('magazineViewMode');
    return savedMode === 'section' ? 'section' : 'hub';
  });

  // Active Section ID for Section Detail view
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const secParam = params.get('section');
    if (secParam && sections && sections.some(s => s.id === secParam)) {
      return secParam;
    }
    const saved = sessionStorage.getItem('lastMagazineSectionId');
    if (saved && sections && sections.some(s => s.id === saved)) {
      return saved;
    }
    return sections && sections.length > 0 ? sections[0].id : 'main';
  });

  // Preview Section ID for Hub lower preview spread
  const [hubPreviewSectionId, setHubPreviewSectionId] = useState<string>(() => {
    const saved = sessionStorage.getItem('lastMagazineSectionId');
    if (saved && sections && sections.some(s => s.id === saved)) {
      return saved;
    }
    return sections && sections.length > 0 ? sections[0].id : 'main';
  });

  const previewTabsRef = useRef<HTMLDivElement>(null);
  const scrollPreviewTabs = (direction: 'left' | 'right') => {
    if (previewTabsRef.current) {
      previewTabsRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  // Accordion drawer state for magazine issues showcase in Section view
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Magazine Hub Filter & Search & Sort states (Trip standard pattern)
  const [magSearchQuery, setMagSearchQuery] = useState('');
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [magLocationFilter, setMagLocationFilter] = useState('All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [magSortBy, setMagSortBy] = useState<'user' | 'newest' | 'oldest' | 'title'>('user');

  // Available Locations for filter dropdown, with their issue counts
  const { availableLocations, locationCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    const locSet = new Set<string>();
    effectiveSections.forEach(s => {
      const loc = (s.heroLocation || '').trim();
      if (loc) locSet.add(loc);
      if (s.heroLocation) counts.set(s.heroLocation, (counts.get(s.heroLocation) || 0) + 1);
    });
    return { availableLocations: Array.from(locSet).sort(), locationCounts: counts };
  }, [effectiveSections]);

  // Typing stays instant; the grid filters a beat behind
  const deferredSearchQuery = useDeferredValue(magSearchQuery);

  // Filtered & Sorted sections
  const filteredSections = useMemo(() => {
    let list = effectiveSections.filter(sec => {
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase().trim();
        const matchesTitle = (sec.title || '').toLowerCase().includes(q);
        const matchesHero = (sec.heroTitle || '').toLowerCase().includes(q);
        const matchesLoc = (sec.heroLocation || '').toLowerCase().includes(q);
        const matchesItems = sec.items && sec.items.some(it => (it.caption || '').toLowerCase().includes(q) || (it.location || '').toLowerCase().includes(q));
        if (!matchesTitle && !matchesHero && !matchesLoc && !matchesItems) return false;
      }
      if (magLocationFilter !== 'All') {
        if (sec.heroLocation !== magLocationFilter) return false;
      }
      return true;
    });

    if (magSortBy === 'title') {
      list = [...list].sort((a, b) => (a.heroTitle || a.title).localeCompare(b.heroTitle || b.title));
    } else if (magSortBy === 'newest') {
      list = [...list].reverse();
    }
    return list;
  }, [effectiveSections, deferredSearchQuery, magLocationFilter, magSortBy]);

  // Lightbox state for high-res photo viewing
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // PopState handler for browser back / forward navigation within MagazineHub
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const params = new URLSearchParams(window.location.search);
      const secParam = params.get('section');

      if (state && state.view === 'magazine') {
        if (state.mode === 'section' || secParam) {
          const targetId = state.sectionId || secParam;
          if (targetId) {
            setActiveSectionId(targetId);
            setHubPreviewSectionId(targetId);
          }
          setViewMode('section');
          sessionStorage.setItem('magazineViewMode', 'section');
        } else {
          setViewMode('hub');
          sessionStorage.setItem('magazineViewMode', 'hub');
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      } else if (!state && (window.location.pathname === '/magazine' || window.location.hash === '#magazine')) {
        if (secParam) {
          setActiveSectionId(secParam);
          setHubPreviewSectionId(secParam);
          setViewMode('section');
          sessionStorage.setItem('magazineViewMode', 'section');
        } else {
          setViewMode('hub');
          sessionStorage.setItem('magazineViewMode', 'hub');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for resetMagazineHub custom event when user clicks MAGAZINE header link
  useEffect(() => {
    const handleResetHub = () => {
      setViewMode('hub');
      try {
        sessionStorage.setItem('magazineViewMode', 'hub');
      } catch (_) {}
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    window.addEventListener('resetMagazineHub', handleResetHub);
    return () => window.removeEventListener('resetMagazineHub', handleResetHub);
  }, []);

  // Synchronize active section with sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('lastMagazineSectionId');
    if (saved && effectiveSections.some(s => s.id === saved)) {
      setActiveSectionId(saved);
      setHubPreviewSectionId(saved);
    } else if (!effectiveSections.some(s => s.id === activeSectionId)) {
      if (effectiveSections.length > 0) {
        setActiveSectionId(effectiveSections[0].id);
        setHubPreviewSectionId(effectiveSections[0].id);
      }
    }
  }, [effectiveSections]);

  // An issue can open without a history entry of its own (from the home page, a shared link or a reload
  // after navigating away). Put the hub under it so the back gesture returns to the hub, not further back.
  useEffect(() => {
    if (viewMode !== 'section') return;
    const st = window.history.state;
    if (st?.view === 'magazine' && st?.mode === 'section') return;
    const sectionId = activeSectionId;
    window.history.replaceState({ ...(st || {}), view: 'magazine', mode: 'hub' }, '', '/magazine');
    window.history.pushState({ view: 'magazine', mode: 'section', sectionId }, '', `/magazine?section=${encodeURIComponent(sectionId)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const handleOpenSection = (id: string) => {
    setActiveSectionId(id);
    setHubPreviewSectionId(id);
    setViewMode('section');
    sessionStorage.setItem('lastMagazineSectionId', id);
    sessionStorage.setItem('magazineViewMode', 'section');
    window.history.pushState(
      { view: 'magazine', mode: 'section', sectionId: id },
      '',
      `/magazine?section=${encodeURIComponent(id)}`
    );
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Stable identities so memoized issue cards and the spread don't re-render with the hub
  const openSectionRef = useRef(handleOpenSection);
  openSectionRef.current = handleOpenSection;
  const openSection = useCallback((id: string) => openSectionRef.current(id), []);
  const openHandlers = useMemo(() => {
    const map = new Map<string, () => void>();
    effectiveSections.forEach(sec => map.set(sec.id, () => openSection(sec.id)));
    return map;
  }, [effectiveSections, openSection]);

  const handleBackToHub = () => {
    setViewMode('hub');
    sessionStorage.setItem('magazineViewMode', 'hub');
    // Every issue entry sits on a hub entry (see above), so stepping back is always the hub
    if (window.history.state?.mode === 'section') {
      window.history.back();
    } else {
      window.history.replaceState({ view: 'magazine', mode: 'hub' }, '', '/magazine');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    setHubPreviewSectionId(id);
    sessionStorage.setItem('lastMagazineSectionId', id);
    if (viewMode === 'section') {
      window.history.replaceState(
        { view: 'magazine', mode: 'section', sectionId: id },
        '',
        `/magazine?section=${encodeURIComponent(id)}`
      );
    }
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
  }, [activeSectionId, viewMode]);

  // Touch swipe state for Hero section
  const touchStartXRef = useRef<number | null>(null);
  // Touch swipe state for Bottom Preview section
  const previewTouchStartXRef = useRef<number | null>(null);
  const previewTouchStartYRef = useRef<number | null>(null);

  // Horizontal Section Tabs Scroll Reference & State
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = () => {
    if (!tabScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  const handleScrollTab = (direction: 'left' | 'right') => {
    if (!tabScrollRef.current) return;
    const offset = direction === 'left' ? -220 : 220;
    tabScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkTabScroll, 300);
  };

  useEffect(() => {
    checkTabScroll();
    window.addEventListener('resize', checkTabScroll);
    return () => window.removeEventListener('resize', checkTabScroll);
  }, [effectiveSections, viewMode]);

  useEffect(() => {
    if (tabScrollRef.current) {
      setTimeout(checkTabScroll, 200);
    }
  }, [activeSectionId, viewMode]);

  // Switch to next/prev section
  const handlePrevSection = () => {
    if (effectiveSections.length <= 1) return;
    const currIdx = effectiveSections.findIndex(s => s.id === (currentSection?.id || activeSectionId));
    const prevIdx = (currIdx - 1 + effectiveSections.length) % effectiveSections.length;
    handleSelectSection(effectiveSections[prevIdx].id);
  };

  const handleNextSection = () => {
    if (effectiveSections.length <= 1) return;
    const currIdx = effectiveSections.findIndex(s => s.id === (currentSection?.id || activeSectionId));
    const nextIdx = (currIdx + 1) % effectiveSections.length;
    handleSelectSection(effectiveSections[nextIdx].id);
  };

  // The hero stays pinned while the issue scrolls under it, so only a clear sideways flick changes issue;
  // the drift of a vertical scroll used to flip issues on real phones
  const heroSwipeRef = useRef<SwipeStart | null>(null);
  const handleHeroTouchStart = (e: React.TouchEvent) => {
    heroSwipeRef.current = swipeStart(e);
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    const dir = swipeDirection(heroSwipeRef.current, e);
    heroSwipeRef.current = null;
    if (dir === 1) handlePrevSection();
    else if (dir === -1) handleNextSection();
  };

  // Current Active Section in Section Detail View
  const currentSection = useMemo(() => {
    const found = effectiveSections.find(s => s.id === activeSectionId);
    return found || effectiveSections[0] || null;
  }, [effectiveSections, activeSectionId]);

  // Current Preview Section in Hub View
  const currentPreviewSection = useMemo(() => {
    const found = effectiveSections.find(s => s.id === hubPreviewSectionId);
    return found || currentSection || effectiveSections[0] || null;
  }, [effectiveSections, hubPreviewSectionId, currentSection]);

  // Fast lookup maps for live timeline items
  const { timelineByUrl, timelineById, allTimelineList } = useMemo(() => {
    const byUrl = new Map<string, TimelineItem>();
    const byId = new Map<number | string, TimelineItem>();
    const list: TimelineItem[] = [];

    if (timelineData) {
      Object.values(timelineData).forEach(items => {
        if (Array.isArray(items)) {
          items.forEach(t => {
            list.push(t);
            if (t.id !== undefined) {
              byId.set(t.id, t);
              byId.set(Number(t.id), t);
              byId.set(String(t.id), t);
            }
            if (t.img) {
              byUrl.set(t.img, t);
              const eff = getEffectiveImageUrl(t.img);
              if (eff) byUrl.set(eff, t);
            }
            const gImages = (t as any).galleryImages;
            if (Array.isArray(gImages)) {
              gImages.forEach((g: any) => {
                const gUrl = typeof g === 'string' ? g : g?.url;
                if (gUrl) {
                  byUrl.set(gUrl, {
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

    return { timelineByUrl: byUrl, timelineById: byId, allTimelineList: list };
  }, [timelineData]);

  const tripById = useMemo(() => new Map(trips.map(t => [t.id, t])), [trips]);

  // Each trip's timeline sorted once, so place resolution doesn't re-sort it per card
  const sortedTimelineByTrip = useMemo(() => {
    const grouped = new Map<number | string | undefined, TimelineItem[]>();
    allTimelineList.forEach(t => {
      const list = grouped.get(t.tripId);
      if (list) list.push(t);
      else grouped.set(t.tripId, [t]);
    });
    const sorted = new Map<number | string | undefined, TimelineItem[]>();
    grouped.forEach((list, key) => sorted.set(key, sortTimelineChronologically(list)));
    return sorted;
  }, [allTimelineList]);

  // Sync items for any section
  const synchronizeItems = (sec: MagazineSection | null): MagazineItem[] => {
    if (!sec || !sec.items) return [];

    return [...sec.items]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(item => {
        if (item.isTextOnly || !item.img) return item;

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
        const parentTrip = targetTripId !== undefined ? tripById.get(targetTripId) : undefined;

        if (matched) {
          const pName = matched.place?.trim() || '';
          const jTitle = parentTrip?.title?.replace(/\s*\(Plan\)$/i, '') || '';
          const tripTimeline = sortedTimelineByTrip.get(targetTripId) || [];
          const resolvedLocation = resolveTimelinePlaceName(matched, tripTimeline, parentTrip, true);

          return {
            ...item,
            timelineItemId: matched.id,
            tripId: targetTripId,
            img: matched.img || item.img,
            title: pName || jTitle || item.title || 'UNTITLED MOMENT',
            placeName: resolvedLocation,
            location: resolvedLocation,
            date: matched.date || item.date,
          };
        } else {
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
  };

  // Every section synced once per data change; the hub, preview and issue view all read from here
  const syncedItemsBySection = useMemo(() => {
    const map = new Map<string, MagazineItem[]>();
    effectiveSections.forEach(sec => map.set(sec.id, synchronizeItems(sec)));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSections, timelineById, timelineByUrl, allTimelineList, tripById, sortedTimelineByTrip]);

  const getSynchronizedItems = (sec: MagazineSection | null): MagazineItem[] =>
    sec ? (syncedItemsBySection.get(sec.id) || synchronizeItems(sec)) : [];

  // Items for the current active section in Section Detail View
  const sectionItems: MagazineItem[] = useMemo(() => {
    return getSynchronizedItems(currentSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, syncedItemsBySection]);

  // O(1) lookups for card numbering and lightbox index
  const sectionIndexById = useMemo(() => new Map(sectionItems.map((it, i) => [it.id, i])), [sectionItems]);

  const [isReelOpen, setIsReelOpen] = useState(false);

  // Filter only items with actual photos for Lightbox
  const photoItems = useMemo(() => {
    return sectionItems.filter(item => !item.isTextOnly && !!item.img);
  }, [sectionItems]);
  const photoIndexById = useMemo(() => new Map(photoItems.map((it, i) => [it.id, i])), [photoItems]);

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

  // Spread cards for the hub preview, built once per data change
  const spreadCardsBySection = useMemo(() => {
    const map = new Map<string, SpreadCard[]>();
    syncedItemsBySection.forEach((items, secId) => {
      map.set(secId, items.filter(it => !it.isTextOnly && Boolean(it.img)).slice(0, 3).map((item, i) => {
        const parentTrip = item.tripId !== undefined ? tripById.get(item.tripId) : undefined;
        let place = item.placeName || item.location || '';
        if (!place.trim() || place.trim().toLowerCase() === (item.title || '').trim().toLowerCase()) {
          place = parentTrip?.locationStr || parentTrip?.country || 'VISITED PLACE';
        }
        return { key: String(item.id || i), img: item.img, title: item.title, place, date: formatSimpleDateWithDay(item.date) };
      }));
    });
    return map;
  }, [syncedItemsBySection, tripById]);
  const previewTitle = currentPreviewSection?.title || 'FEATURED STORIES';
  const previewHeading = useMemo(() => (
    <div className="flex flex-col gap-1">
      <span className="text-xs sm:text-[13px] font-bold tracking-tight text-red-600 dark:text-red-400">Magazine preview</span>
      <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white">
        {previewTitle}
      </h2>
    </div>
  ), [previewTitle]);
  const spreadCardsFor = useCallback((sec: MagazineSection) => spreadCardsBySection.get(sec.id) || [], [spreadCardsBySection]);

  // Find linked trip for hero (search trips first, then plans)
  const heroTrip = useMemo(() => {
    if (!currentSection?.heroTripId) return null;
    return trips.find(t => t.id === currentSection.heroTripId) || plans.find(p => p.id === currentSection.heroTripId) || null;
  }, [currentSection, trips, plans]);

  // Jump to Manage Hub for this section
  const handleEditThisSection = () => {
    const secId = currentSection?.id || 'main';
    sessionStorage.setItem('lastNonManageView', 'magazine');
    sessionStorage.setItem('initialManageTab', 'MAGAZINE');
    sessionStorage.setItem('initialMagazineSectionId', secId);
    sessionStorage.setItem('lastMagazineSectionId', secId);
    onNavigate('manage');
  };

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
        if (next1 && !isLandscapeItem(next1)) {
          rows.push({ type: 'LP', items: [cur, next1] });
          i += 2;
        } else if (next1 && isLandscapeItem(next1)) {
          rows.push({ type: 'LL', items: [cur, next1] });
          i += 2;
        } else {
          rows.push({ type: 'SINGLE_LANDSCAPE', items: [cur] });
          i += 1;
        }
      } else {
        if (next1 && isLandscapeItem(next1)) {
          rows.push({ type: 'PL', items: [cur, next1] });
          i += 2;
        } else if (next1 && !isLandscapeItem(next1) && next2 && !isLandscapeItem(next2)) {
          rows.push({ type: 'PPP', items: [cur, next1, next2] });
          i += 3;
        } else if (next1 && !isLandscapeItem(next1)) {
          rows.push({ type: 'PP', items: [cur, next1] });
          i += 2;
        } else {
          rows.push({ type: 'SINGLE_PORTRAIT', items: [cur] });
          i += 1;
        }
      }
    }
    return rows;
  }, [sectionItems]);

  // Card Rendering Component for Section Detail
  const renderCard = (
    item: MagazineItem,
    options: {
      spanClass?: string;
      isMatchedHeight?: boolean;
    } = {}
  ) => {
    const itemIndex = sectionIndexById.get(item.id) ?? 0;
    const isLand = isLandscapeItem(item);
    const isTextCard = item.isTextOnly || !item.img;
    const parentTrip = item.tripId !== undefined ? tripById.get(item.tripId) : undefined;

    let visualFrameClass = 'aspect-[3/4] w-full';
    if (options.isMatchedHeight) {
      // Beside a portrait: take the portrait's height instead of a fixed ratio, so both rows line up
      visualFrameClass = 'aspect-[4/3] md:aspect-auto md:flex-1 md:min-h-0 w-full';
    } else if (isLand) {
      visualFrameClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
    }

    const containerBleedClass = isLand
      ? '-mx-4 sm:-mx-8 md:mx-0 w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] md:w-full'
      : 'w-full';

    if (isTextCard) {
      return (
        <article
          key={item.id || itemIndex}
          style={{
            animation: 'cardEntrance 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: `${Math.min(itemIndex * 30, 240)}ms`
          }}
          className={`group flex flex-col h-full justify-center transition-all duration-300 ${containerBleedClass} ${options.spanClass || ''}`}
        >
          <div
            className={`relative ${visualFrameClass} overflow-hidden bg-transparent text-black dark:text-white p-4 sm:p-6 md:p-8 flex items-center justify-center select-none border-0`}
          >
            <p className="font-['Noto_Sans_KR',sans-serif] font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-tight leading-snug break-keep text-black dark:text-white text-center whitespace-pre-line">
              {item.textContent || item.title}
            </p>
          </div>
        </article>
      );
    }

    const displayTitle = item.title;
    const rawDate = item.date;
    const dateWithDay = formatSimpleDateWithDay(rawDate);
    let displayPlace = item.placeName || item.location || '';
    if (!displayPlace || displayPlace.trim() === '' || displayPlace.trim().toLowerCase() === displayTitle.trim().toLowerCase()) {
      displayPlace = parentTrip?.locationStr || parentTrip?.country || 'VISITED PLACE';
    }

    const photoIdx = photoIndexById.get(item.id) ?? -1;
    const openLightbox = () => {
      if (photoIdx !== -1) {
        setLightboxIndex(photoIdx);
      }
    };

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

    return (
      <article
        key={item.id || itemIndex}
        style={{
          animation: 'cardEntrance 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
          animationDelay: `${Math.min(itemIndex * 30, 240)}ms`
        }}
        className={`group relative flex flex-col justify-between h-full transition-all duration-300 select-none bg-transparent border-none shadow-none ${containerBleedClass} ${options.spanClass || ''}`}
      >
        <div
          onClick={openLightbox}
          className={`relative ${visualFrameClass} overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer border border-black/10 dark:border-white/10`}
        >
          <img
            src={getEffectiveImageUrl(item.img)}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out select-none"
          />

          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-3 right-3 w-8 h-8 bg-black/75 dark:bg-white/85 backdrop-blur-xs text-white dark:text-black flex items-center justify-center shadow-md transition-transform group-hover:scale-100 scale-90">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="absolute top-3 left-3 bg-black/60 dark:bg-white/70 backdrop-blur-xs text-white dark:text-black font-mono text-micro font-bold px-1.5 py-0.5 uppercase tracking-widest">
            {String(itemIndex + 1).padStart(2, '0')}
          </div>
        </div>

        <div className={`pt-3.5 ${options.isMatchedHeight ? 'flex-none' : 'flex-1'} flex flex-col justify-between text-black dark:text-white font-['Noto_Sans_KR',sans-serif] ${isLand ? 'px-4 sm:px-8 md:px-0' : ''}`}>
          <div className="flex flex-col">
            <h3
              onClick={openLightbox}
              className="text-base sm:text-lg md:text-xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans line-clamp-2 leading-snug md:min-h-[2.75em] group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors cursor-pointer"
            >
              {displayTitle}
            </h3>

            {dateWithDay && (
              <div className="text-[11px] sm:text-xs font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider mt-1">
                {dateWithDay}
              </div>
            )}
          </div>

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

  const headerMainTitle = hubConfig?.mainTitle || 'A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS';
  const headerSubtitle = hubConfig?.subtitle || '여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다. 이슈를 선택하여 전체 화보와 이야기를 감상하세요.';
  const headerBadge = hubConfig?.badgeText || 'CURATED ARCHIVE';
  const headerVolume = hubConfig?.volumeText || `VOL. ${new Date().getFullYear()}`;

  return (
    <main className="min-h-screen w-full bg-transparent dark:bg-transparent text-black dark:text-white flex flex-col font-sans transition-colors duration-300">
      
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: MAGAZINE DIRECTORY HUB (전체 매거진 이슈 디렉토리 쇼케이스)      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'hub' ? (
        <div className="w-full flex flex-col flex-1 bg-transparent">
          {/* 1-1. Editorial Large Headline & Directory Masthead */}
          <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-8 sm:pt-14 pb-8 border-b border-black/10 dark:border-white/10">
            {/* Top Barcode & Category Tag */}
            <div className="flex items-center justify-between text-xs font-mono tracking-widest uppercase text-black/60 dark:text-white/60 mb-4 sm:mb-6">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="bg-black text-white dark:bg-white dark:text-black font-extrabold px-2 py-0.5 text-meta">
                  MAGAZINE DIRECTORY
                </span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {headerBadge}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">{headerVolume}</span>
                <span>{effectiveSections.length} ISSUES PUBLISHED</span>
              </div>
            </div>

            {/* MOUTHWASH Style Large Editorial Typography Title */}
            <div className="flex flex-col gap-2 sm:gap-4 max-w-5xl">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-satoshi font-extrabold uppercase tracking-tight leading-[0.98] text-black dark:text-white">
                {headerMainTitle}
              </h1>
              <p className="hidden sm:block text-sm md:text-base font-['Noto_Sans_KR',sans-serif] font-medium text-black/60 dark:text-white/60 max-w-2xl leading-relaxed pt-1 break-keep">
                {headerSubtitle}
              </p>
            </div>
          </section>

          {/* Controls Bar — Standard 2nd Line (Trip Standard Height py-4 & Standard Controls) */}
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-4 border-b border-black/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            {/* Left: Section Sub-label (Pure Inter, No red icon) */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-['Inter',sans-serif] font-bold uppercase tracking-wider text-black dark:text-white">
                ALL ISSUES ({filteredSections.length})
              </span>
            </div>

            {/* Right: Active Filter, Search, and Controls Layout (Trip Standard Style) */}
            <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
                {/* Location Filter Dropdown Button */}
                <div className="relative inline-block text-left">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                      className={`text-meta px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider border rounded-none transition-all flex items-center gap-1.5 cursor-pointer relative ${
                        magLocationFilter !== 'All'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5 text-black dark:text-white'
                      }`}
                      title="FILTER (LOCATION)"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">FILTER</span>
                      {magLocationFilter !== 'All' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      )}
                    </button>

                    {/* Separated Search Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchInputOpen(v => !v);
                        if (isSearchInputOpen) setMagSearchQuery('');
                      }}
                      className={`p-2 border transition-colors flex items-center justify-center rounded-none cursor-pointer relative ${
                        isSearchInputOpen || magSearchQuery
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                          : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white'
                      }`}
                      title="매거진 검색"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {magSearchQuery && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600" />
                      )}
                    </button>

                    {/* Inline Search Input */}
                    {isSearchInputOpen && (
                      <div className="relative flex items-center animate-in fade-in slide-in-from-left-2 duration-150">
                        <input
                          type="text"
                          autoFocus
                          value={magSearchQuery}
                          onChange={(e) => setMagSearchQuery(e.target.value)}
                          placeholder="매거진 검색..."
                          className="w-24 sm:w-44 pl-2.5 pr-6 py-1.5 text-xs bg-white dark:bg-[#181818] border border-black/20 dark:border-white/20 font-sans font-medium outline-none text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 rounded-none"
                        />
                        {magSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMagSearchQuery('')}
                            className="tap-target absolute right-1.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                            title="검색어 지우기"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Active Filter Chips */}
                    {(magLocationFilter !== 'All' || magSearchQuery) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {magSearchQuery && (
                          <span className="text-meta font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                            "{magSearchQuery}"
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setMagSearchQuery('')} />
                          </span>
                        )}
                        {magLocationFilter !== 'All' && (
                          <span className="text-meta font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                            {magLocationFilter}
                            <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setMagLocationFilter('All')} />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMagLocationFilter('All');
                            setMagSearchQuery('');
                          }}
                          className="text-micro px-1.5 py-0.5 uppercase font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          RESET
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter Dropdown Popover */}
                  {isTagDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                      <div className="absolute left-0 mt-1.5 w-64 bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 shadow-2xl z-20 rounded-none p-3 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150 text-black dark:text-white">
                        <span className="text-micro font-mono font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                          LOCATION (지역)
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setMagLocationFilter('All'); setIsTagDropdownOpen(false); }}
                            className={`text-meta px-2 py-0.5 uppercase font-mono font-bold border transition-colors cursor-pointer ${
                              magLocationFilter === 'All' ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                            }`}
                          >
                            All ({effectiveSections.length})
                          </button>
                          {availableLocations.map(loc => {
                            const count = locationCounts.get(loc) || 0;
                            return (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => { setMagLocationFilter(loc === magLocationFilter ? 'All' : loc); setIsTagDropdownOpen(false); }}
                                className={`text-meta px-2 py-0.5 uppercase font-mono font-bold border transition-colors cursor-pointer ${
                                  magLocationFilter === loc ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                                }`}
                              >
                                {loc} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sort Dropdown (Trip Standard Style) */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0" />
                  <select
                    value={magSortBy}
                    onChange={(e) => setMagSortBy(e.target.value as any)}
                    className="bg-transparent text-meta sm:text-xs font-extrabold uppercase tracking-widest border border-black/20 dark:border-white/20 px-2.5 py-1.5 focus:outline-none focus:border-black dark:focus:border-white transition-colors cursor-pointer rounded-none font-sans"
                  >
                    <option value="user" className="bg-[#F9F8F6] dark:bg-[#111111]">USER</option>
                    <option value="newest" className="bg-[#F9F8F6] dark:bg-[#111111]">NEWEST</option>
                    <option value="title" className="bg-[#F9F8F6] dark:bg-[#111111]">TITLE</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 1-2. Magazine Issues Directory Grid (Matching Trip Standard Padding py-6 sm:py-10) */}
          <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-6 sm:py-10">
            {filteredSections.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-black/15 dark:border-white/15 flex flex-col items-center justify-center gap-2">
                <BookOpen className="w-8 h-8 text-black/60 dark:text-white/60 mb-1" />
                <p className="text-sm font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                  검색 조건과 일치하는 매거진 이슈가 없습니다.
                </p>
                <button
                  type="button"
                  onClick={() => { setMagSearchQuery(''); setMagLocationFilter('All'); }}
                  className="mt-2 text-xs font-mono font-bold uppercase text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  RESET FILTER
                </button>
              </div>
            ) : (
              /* Magazine Cover Cards Grid (Responsive 2 Cols on Mobile -> 4 Cols on Web) */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6">
                {filteredSections.map((sec, idx) => {
                const coverImg = sec.heroImg || (sec.items && sec.items.find(it => it.img)?.img) || '';
                const displayHeroTitle = sec.heroTitle || sec.title;
                const formattedNumber = String(idx + 1).padStart(2, '0');
                const itemCount = sec.items?.length || 0;
                const locationLabel = sec.heroLocation || 'CURATED ARCHIVE';

                return (
                  <IssueCard
                    key={sec.id}
                    index={idx}
                    coverImg={coverImg ? getEffectiveImageUrl(coverImg) : ''}
                    issueNumber={formattedNumber}
                    dateLabel={sec.heroDate || 'VOL. 2026'}
                    title={displayHeroTitle}
                    subtitle={sec.heroSubtitle || sec.subtitle}
                    location={locationLabel}
                    storyCount={itemCount}
                    onOpen={openHandlers.get(sec.id)!}
                  />
                );
              })}
            </div>
          )}
        </section>

          {/* 1-3. Selected issue preview, shared with the home page (P5-7) */}
          <section className="w-full bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/10 dark:border-white/10 py-12 sm:py-20">
            <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12">
              <MagazineSpread
                sections={effectiveSections}
                activeId={currentPreviewSection?.id || hubPreviewSectionId}
                onSelect={setHubPreviewSectionId}
                cardsFor={spreadCardsFor}
                onOpen={openSection}
                heading={previewHeading}
                ctaLabel="READ FULL"
                tabIdPrefix="mag-hub-preview-tab"
              />
            </div>
          </section>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════ */
        /* MODE 2: SECTION DETAIL VIEW (개별 섹션 풀스토리 에디토리얼 뷰)       */
        /* ═════════════════════════════════════════════════════════════════ */
        <div className="w-full flex flex-col flex-1 bg-transparent">
          
          {/* Back to Hub Floating / Top Navigation Bar */}
          <div className="w-full bg-black/90 backdrop-blur-md text-white px-4 sm:px-8 md:px-12 py-3 flex items-center justify-between text-xs font-mono tracking-wider uppercase z-30 border-b border-white/10">
            <button
              type="button"
              onClick={handleBackToHub}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/20 hover:border-white text-white font-semibold text-[11px] tracking-widest transition-all duration-200 cursor-pointer group shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>ALL ISSUES</span>
            </button>
            <span className="text-[11px] font-mono text-white/60 hidden sm:inline tracking-widest">
              ISSUE N°{String(effectiveSections.findIndex(s => s.id === (currentSection?.id || activeSectionId)) + 1).padStart(2, '0')} · {currentSection?.title}
            </span>
          </div>

          {/* Reading progress for the open issue */}
          <div aria-hidden className="tgl-read-progress" />

          {/* 2-0. OPENER + HERO: the magazine title as a window onto the cover photo, then the hero details (v1.3) */}
          {currentSection?.heroImg && (() => {
            const issueNo = String(effectiveSections.findIndex(s => s.id === currentSection.id) + 1).padStart(2, '0');
            return (
              <IssueTextWindow
                key={currentSection.id}
                word={currentSection.title}
                img={getEffectiveImageUrl(currentSection.heroImg)}
                eyebrow={`NO. ${issueNo}${currentSection.heroDate ? ' · ' + currentSection.heroDate : ''}`}
                onTouchStart={handleHeroTouchStart}
                onTouchEnd={handleHeroTouchEnd}
                overlay={
                  <>
                    {effectiveSections.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePrevSection(); }}
                          className="tgl-press tap-target absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-colors cursor-pointer flex items-center justify-center"
                          aria-label="이전 매거진"
                        >
                          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleNextSection(); }}
                          className="tgl-press tap-target absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-colors cursor-pointer flex items-center justify-center"
                          aria-label="다음 매거진"
                        >
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </>
                    )}

                    <div className="absolute left-4 right-4 sm:left-10 sm:right-10 bottom-8 sm:bottom-12 flex flex-col gap-2.5 sm:gap-3 text-white max-w-4xl">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-micro sm:text-meta tracking-widest uppercase text-white/85">
                        <span className="bg-white text-black font-extrabold px-2 py-0.5">ISSUE N°{issueNo}</span>
                        {currentSection.heroDate && <span>{currentSection.heroDate}</span>}
                        {currentSection.heroLocation && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-400" />{currentSection.heroLocation}</span>}
                        <span>{currentSection.items?.length || 0} STORIES</span>
                      </div>
                      <h1 className="text-3xl sm:text-5xl md:text-6xl font-satoshi font-light tracking-tight leading-[1.05] uppercase break-keep">
                        {currentSection.title}
                      </h1>
                      {(currentSection.heroSubtitle || currentSection.subtitle) && (
                        <p className="max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed break-keep line-clamp-2">
                          {currentSection.heroSubtitle || currentSection.subtitle}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                        {photoItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsReelOpen(true)}
                            className="tgl-press group/reel inline-flex items-center gap-3 h-10 pl-1.5 pr-4 rounded-full bg-white text-black hover:bg-red-600 hover:text-white transition-colors duration-base cursor-pointer"
                          >
                            <span className="w-7 h-7 rounded-full bg-black text-white group-hover/reel:bg-white group-hover/reel:text-red-600 flex items-center justify-center transition-colors duration-base">
                              <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
                            </span>
                            <span className="font-mono text-meta font-bold uppercase tracking-widest">Memory Reel · {photoItems.length}</span>
                          </button>
                        )}
                        {heroTrip && (
                          <button
                            type="button"
                            onClick={() => onNavigate('detail', heroTrip.id)}
                            className="tgl-sweep inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-white cursor-pointer"
                          >
                            <span className="truncate max-w-[60vw]">{heroTrip.title}</span>
                            <ArrowRight className="w-4 h-4 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                }
              />
            );
          })()}

          {/* 2-1. HERO SECTION (issues without a cover photo) */}
          {currentSection && !currentSection.heroImg && (
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

              {/* Dark Overlay Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent hidden md:block" />

              {/* Minimal Translucent Prev/Next Buttons */}
              {effectiveSections.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevSection();
                    }}
                    className="tap-target absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center opacity-80 group-hover:opacity-100"
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
                    className="tap-target absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center opacity-80 group-hover:opacity-100"
                    title="다음 매거진 섹션"
                    aria-label="Next magazine section"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </>
              )}

              {/* Hero Top Bar */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-10 right-4 sm:right-10 z-20 flex items-center justify-between text-white/90 border-b border-white/20 pb-2.5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="text-micro sm:text-meta font-mono font-extrabold tracking-widest uppercase bg-white text-black px-2 py-0.5 shadow-sm">
                    ISSUE N°{String(effectiveSections.findIndex(s => s.id === currentSection.id) + 1).padStart(2, '0')}
                  </span>
                  <span className="text-meta sm:text-xs font-mono font-bold tracking-widest uppercase text-white/90">
                    TRIPGON MAGAZINE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-meta font-mono tracking-widest uppercase text-white/70">
                  <span className="hidden md:inline">VOL. {new Date().getFullYear()} · EDITORIAL EDITION</span>
                  <span className="hidden sm:inline bg-white/15 px-2 py-0.5 border border-white/20">
                    {currentSection.items?.length || 0} STORIES
                  </span>
                </div>
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 z-20 flex flex-col md:flex-row md:items-end justify-between gap-6 text-white">
                <div className="max-w-3xl flex flex-col gap-2 sm:gap-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-meta sm:text-xs font-mono tracking-widest uppercase text-white/80">
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

                  {/* Bold Large Editorial Magazine Title with Satoshi Light */}
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

                  {/* Memory Reel: the issue as a photo film with music */}
                  {photoItems.length > 1 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsReelOpen(true)}
                        className="tgl-press group/reel inline-flex items-center gap-3 h-10 pl-1.5 pr-4 rounded-full bg-white text-black hover:bg-red-600 hover:text-white transition-colors duration-base cursor-pointer"
                      >
                        <span className="w-7 h-7 rounded-full bg-black text-white group-hover/reel:bg-white group-hover/reel:text-red-600 flex items-center justify-center transition-colors duration-base">
                          <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
                        </span>
                        <span className="font-mono text-meta font-bold uppercase tracking-widest">Memory Reel · {photoItems.length}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Minimal Magazine Barcode */}
                <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 select-none opacity-85">
                  <div className="flex items-center gap-0.5 h-5">
                    {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2].map((w, i) => (
                      <div key={i} className="bg-white/80 h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="text-micro font-mono tracking-widest text-white/70">
                    ISSN 2026-TRIPGON · #{String(currentSection.id).slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 2-2. SECTION NAVIGATOR / SELECTOR */}
          <div className="sticky top-14 sm:top-16 z-30 w-full bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md border-b border-black/15 dark:border-white/15 px-3 sm:px-8 md:px-12 py-2.5 transition-colors">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleScrollTab('left')}
                  disabled={!canScrollLeft}
                  className={`tap-target p-1.5 rounded transition-all shrink-0 cursor-pointer ${
                    canScrollLeft
                      ? 'text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white opacity-90'
                      : 'text-black/60 dark:text-white/60 opacity-20 pointer-events-none'
                  }`}
                  title="이전 탭 보기"
                  aria-label="Scroll tabs left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div
                  ref={tabScrollRef}
                  onScroll={checkTabScroll}
                  className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar py-0.5 flex-1 min-w-0 scroll-smooth"
                >
                  {effectiveSections.map((sec, idx) => {
                    const isActive = sec.id === (currentSection?.id || activeSectionId);
                    return (
                      <button
                        key={sec.id}
                        onClick={() => handleSelectSection(sec.id)}
                        className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold uppercase font-['Inter',sans-serif] tracking-wider transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                            : 'bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                        }`}
                      >
                        <span className="font-mono text-micro opacity-60 mr-1">{String(idx + 1).padStart(2, '0')}.</span>
                        {sec.title}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleScrollTab('right')}
                  disabled={!canScrollRight}
                  className={`tap-target p-1.5 rounded transition-all shrink-0 cursor-pointer ${
                    canScrollRight
                      ? 'text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white opacity-90'
                      : 'text-black/60 dark:text-white/60 opacity-20 pointer-events-none'
                  }`}
                  title="다음 탭 보기"
                  aria-label="Scroll tabs right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAccordionOpen(prev => !prev)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                  isAccordionOpen
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/40 dark:hover:border-white/40'
                }`}
                title="매거진 커버 진열장 (Issue Showcase) 열기/닫기"
              >
                <BookOpen className="w-3.5 h-3.5 text-black/70 dark:text-white/70" />
                <span>ALL</span>
                <span className="text-meta opacity-75 font-mono">({effectiveSections.length})</span>
                <div className={`p-0.5 rounded transition-transform duration-300 ${isAccordionOpen ? 'rotate-180 bg-white/20' : 'bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </button>
            </div>

            {/* Magazine Cover Showcase Accordion / Rack */}
            {isAccordionOpen && (
              <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-meta font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                      MAGAZINE RACK & ARCHIVE
                    </span>
                    <span className="text-meta text-black/60 dark:text-white/60 hidden sm:inline">
                      — 커버를 선택하여 원하는 매거진 이슈를 바로 탐색하세요
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAccordionOpen(false)}
                    className="inline-flex items-center gap-1 text-meta font-mono font-bold uppercase text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <span>닫기</span>
                    <X className="w-3 h-3" />
                  </button>
                </div>

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
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/10 dark:bg-white/10">
                          {coverImg ? (
                            <img
                              src={getEffectiveImageUrl(coverImg)}
                              alt={displayHeroTitle}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white/60 font-mono text-meta">
                              NO COVER
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/70 opacity-90" />

                          <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-col gap-1.5 z-10 text-white">
                            <div className="flex items-center justify-between">
                              <div className="bg-black/85 backdrop-blur-xs text-white font-mono text-micro font-extrabold px-1.5 py-0.5 border border-white/20 uppercase tracking-widest shadow-xs">
                                ISSUE #{String(idx + 1).padStart(2, '0')}
                              </div>
                              {isActive && (
                                <div className="bg-red-600 text-white font-mono text-micro font-bold px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
                                  READING
                                </div>
                              )}
                            </div>

                            <h4 className="text-xs sm:text-sm md:text-base font-satoshi font-light tracking-tight leading-[1.1] uppercase drop-shadow-md text-white line-clamp-2 pt-0.5">
                              {displayHeroTitle}
                            </h4>
                          </div>

                          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white z-10 flex flex-col gap-0.5">
                            {showSeparateSectionTitle && (
                              <div className="text-meta font-satoshi font-bold tracking-wider uppercase text-white/90 drop-shadow-md truncate">
                                {sec.title}
                              </div>
                            )}
                            <div className="text-micro sm:text-meta font-mono font-bold text-white/80 truncate tracking-wider uppercase drop-shadow-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-red-400 shrink-0" />
                              <span className="truncate">{sec.heroLocation || `${sec.items?.length || 0} STORIES`}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 flex items-center justify-between text-meta font-mono font-bold text-black/70 dark:text-white/70 bg-[#FAF9F6] dark:bg-[#141414] border-t border-black/5 dark:border-white/5">
                          <span className="truncate font-sans font-semibold uppercase">{sec.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-black/60 dark:text-white/60 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2-3. SECTION CONTENT (Curated Moments & Stories) */}
          <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-10 sm:py-16 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-black/15 dark:border-white/15 pb-4 mb-8 sm:mb-12">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                  CURATED STORIES
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-['Inter',sans-serif] tracking-tight text-black dark:text-white">
                  {currentSection?.title || 'EDITORIAL MOMENTS'}
                </h2>
              </div>

              <div className="text-xs font-mono text-black/60 dark:text-white/60 shrink-0">
                TOTAL {sectionItems.length} STORIES / MOMENTS
              </div>
            </div>

            {sectionItems.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-4 border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] p-8">
                <Compass className="w-8 h-8 text-black/60 dark:text-white/60 stroke-1" />
                <div className="flex flex-col gap-1 max-w-md">
                  <span className="text-sm font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                    NO MAGAZINE MOMENTS YET
                  </span>
                  <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
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
              <div className="flex flex-col gap-10 md:gap-12">
                {magazineRows.map((row, rowIdx) => {
                  if (row.type === 'PPP') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                        {renderCard(row.items[2], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'PL') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderCard(row.items[1], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                      </div>
                    );
                  }
                  if (row.type === 'LP') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                        {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'LL') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'SINGLE_LANDSCAPE') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'PP') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'SINGLE_PORTRAIT') {
                    return (
                      <div key={rowIdx} className="tgl-reveal grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 md:gap-x-10 md:gap-y-0 items-stretch">
                        {renderCard(row.items[0], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. LIGHTBOX MODAL (Full Resolution View)                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isReelOpen && currentSection && (
        <MemoryReel
          title={currentSection.heroTitle || currentSection.title}
          subtitle={currentSection.heroSubtitle || currentSection.subtitle}
          location={currentSection.heroLocation}
          dateLabel={currentSection.heroDate}
          shots={photoItems.map(item => ({
            src: getEffectiveImageUrl(item.img),
            place: item.title,
            location: item.placeName || item.location,
            date: item.date,
            line: item.quote || item.caption || item.textContent || '',
          }))}
          onClose={() => setIsReelOpen(false)}
        />
      )}

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

