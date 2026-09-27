import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Train, Bus, Car, Trash2, Image as ImageIcon, ChevronDown, MapPin, Loader2, ArrowLeft, ArrowUp,
  ArrowDown, ArrowRight, FileText, Share2, Play, Pause, Check, Edit3, DollarSign, ArrowRightLeft,
  X, Undo2, Redo2, Calendar, Sparkles, Users
} from 'lucide-react';
import { getUpcomingPlanInfo } from '../../utils/tripPlanHelper';
import { getDefaultCurrencyForLocation } from '../../components/SettlementExpenseInput';
import { generateJourneyMessage } from '../../components/SummaryView';
import { Lightbox, LightboxImageMeta } from '../../components/Lightbox';
import { getSavedPockets, calculateDistanceInMeters } from '../../utils/pocketStorage';
import { findUnifiedNearbyTargets, RadarItem } from '../../utils/radarService';
import {
  Trip, Plan, TimelineItem, TimelineData, FlightItem, StayItem, TransitItem, TabType,
  SpotPocketItem
} from '../../types';
import { fetchCoordinates } from '../../utils/googleMapsHelper';
import { fetchAddressFromCoords, fetchCountryFromCoords } from '../../utils/googleMapsHelper';
import { readExif, extractGpsFromImage } from '../../utils/exifHelper';
import { uploadFileToR2, deleteFileFromR2, getEffectiveImageUrl } from '../../utils/storageHelper';
import { auth, db } from '../../firebase';
import { compressImage } from '../../utils/imageHelper';
import { doc, setDoc } from 'firebase/firestore';
import { JourneyTitleInput } from './JourneyTitleInput';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import {
  airportCoords, extractCountry, getCountryName, generateDateList, minutesToTimeStr,
  parseTimeToMinutes, parseDateRange
} from './detailUtils';

export interface JourneyDetailPageProps {
  isLoggedIn: boolean;
  trip: Trip | undefined;
  timelineData: TimelineData;
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  onSave: (
    tripId: number,
    updatedTrip: Trip,
    updatedTimeline: TimelineItem[],
    updatedFlights: FlightItem[],
    updatedStays: StayItem[],
    updatedTransits: TransitItem[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isDarkMode: boolean;
  onNavigate: (view: string, tripId?: number | null, pushHistory?: boolean, tagFilter?: string | null) => void;
  searchFocusItemId?: number | null;
  searchFocusTab?: string | null;
  onClearSearchFocus?: () => void;
  onEditModeChange?: (editing: boolean) => void;
  saveRef?: React.MutableRefObject<((showModal?: boolean) => Promise<void>) | null>;
  allTrips?: Trip[];
  allPlans?: Plan[];
  isAdmin?: boolean;
}

export function useJourneyDetailState(props: JourneyDetailPageProps) {
  const {
  isLoggedIn,
  trip,
  timelineData,
  flights,
  stays,
  transits,
  onSave,
  onDelete,
  isDarkMode,
  onNavigate,
  searchFocusItemId,
  searchFocusTab,
  onClearSearchFocus,
  onEditModeChange,
  saveRef,
  allTrips = [],
  allPlans = [],
  isAdmin = false,
  } = props;

  // All hooks must be called before conditional return
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['summary']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [collapsedDays, setCollapsedDays] = useState<string[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [flashedItemId, setFlashedItemId] = useState<number | null>(null);

  // Floating Day Quick Jump state
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [isQuickJumpExpanded, setIsQuickJumpExpanded] = useState(false);
  const quickJumpAutoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSpyDate, setActiveSpyDate] = useState<string>('ALL');
  const [highlightedDateSection, setHighlightedDateSection] = useState<string | null>(null);
  const quickJumpChipsRef = useRef<HTMLDivElement | null>(null);

  const resetQuickJumpCollapseTimer = () => {
    if (quickJumpAutoCollapseTimerRef.current) {
      clearTimeout(quickJumpAutoCollapseTimerRef.current);
    }
    quickJumpAutoCollapseTimerRef.current = setTimeout(() => {
      setIsQuickJumpExpanded(false);
    }, 3500);
  };
  // Quick Switcher & Delete Confirm States
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [showTripDeleteConfirm, setShowTripDeleteConfirm] = useState(false);
  const [costModalItem, setCostModalItem] = useState<TimelineItem | null>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);

  // ── Unified 1km Proximity Radar State (RADAR 1KM) ──
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [activeRadarIndex, setActiveRadarIndex] = useState<number>(0);
  const [radarSnoozedUntil, setRadarSnoozedUntil] = useState<number>(0);
  const [isRadarMinimized, setIsRadarMinimized] = useState<boolean>(false);
  const [radarFocusedSpot, setRadarFocusedSpot] = useState<{ lat: number; lng: number; title: string } | null>(null);
  const [radarRouteTarget, setRadarRouteTarget] = useState<{ lat: number; lng: number; title: string; distance?: number } | null>(null);
  const [activeGhostSpotId, setActiveGhostSpotId] = useState<string | number | null>(null);
  const [isPocketWidgetOpen, setIsPocketWidgetOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isSwitcherOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSwitcherOpen]);

  useEffect(() => {
    if (!costModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCostModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [costModalItem]);

  const switcherJourneys = useMemo(() => {
    const list: Array<{ id: number; title: string; date: string; locationStr: string; img?: string; type: 'ARCHIVE' | 'PLAN' }> = [];
    (allTrips || []).forEach(t => {
      list.push({
        id: t.id,
        title: t.title || 'UNTITLED JOURNEY',
        date: t.date || '',
        locationStr: t.locationStr || '',
        img: t.img,
        type: 'ARCHIVE'
      });
    });
    (allPlans || []).forEach(p => {
      list.push({
        id: p.id,
        title: p.title || 'UNTITLED PLAN',
        date: p.date || '',
        locationStr: p.locationStr || '',
        img: p.img,
        type: 'PLAN'
      });
    });

    if (!switcherSearch.trim()) return list;
    const q = switcherSearch.toLowerCase().trim();
    return list.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.locationStr.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  }, [allTrips, allPlans, switcherSearch]);

  // Edit / Draft state
  const [isEditing, setIsEditing] = useState(false);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [draftTimeline, setDraftTimeline] = useState<TimelineItem[]>([]);
  const [draftFlights, setDraftFlights] = useState<FlightItem[]>([]);
  const [draftStays, setDraftStays] = useState<StayItem[]>([]);
  const [draftTransits, setDraftTransits] = useState<TransitItem[]>([]);
  
  // Refs to always hold the absolute latest draft values (bypasses stale React state closure issues in async callbacks/handlers)
  const draftTripRef = useRef(draftTrip);
  const draftTimelineRef = useRef(draftTimeline);
  const draftFlightsRef = useRef(draftFlights);
  const draftStaysRef = useRef(draftStays);
  const draftTransitsRef = useRef(draftTransits);

  useEffect(() => { draftTripRef.current = draftTrip; }, [draftTrip]);
  useEffect(() => { draftTimelineRef.current = draftTimeline; }, [draftTimeline]);
  useEffect(() => { draftFlightsRef.current = draftFlights; }, [draftFlights]);
  useEffect(() => { draftStaysRef.current = draftStays; }, [draftStays]);
  useEffect(() => { draftTransitsRef.current = draftTransits; }, [draftTransits]);

  // ── Undo / Redo History Management (Ctrl+Z / Ctrl+Y) ────────────────────
  type EditSnapshot = {
    trip: Trip | null;
    timeline: TimelineItem[];
    flights: FlightItem[];
    stays: StayItem[];
    transits: TransitItem[];
  };

  const undoStackRef = useRef<EditSnapshot[]>([]);
  const redoStackRef = useRef<EditSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const recordHistory = useCallback(() => {
    if (!isEditing) return;
    const snapshot: EditSnapshot = {
      trip: draftTripRef.current ? JSON.parse(JSON.stringify(draftTripRef.current)) : null,
      timeline: JSON.parse(JSON.stringify(draftTimelineRef.current)),
      flights: JSON.parse(JSON.stringify(draftFlightsRef.current)),
      stays: JSON.parse(JSON.stringify(draftStaysRef.current)),
      transits: JSON.parse(JSON.stringify(draftTransitsRef.current)),
    };
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    updateUndoRedoFlags();
  }, [isEditing, updateUndoRedoFlags]);

  const handleUndo = useCallback(() => {
    if (!isEditing || undoStackRef.current.length === 0) return;
    const currentSnapshot: EditSnapshot = {
      trip: draftTripRef.current ? JSON.parse(JSON.stringify(draftTripRef.current)) : null,
      timeline: JSON.parse(JSON.stringify(draftTimelineRef.current)),
      flights: JSON.parse(JSON.stringify(draftFlightsRef.current)),
      stays: JSON.parse(JSON.stringify(draftStaysRef.current)),
      transits: JSON.parse(JSON.stringify(draftTransitsRef.current)),
    };
    redoStackRef.current.push(currentSnapshot);

    const previousSnapshot = undoStackRef.current.pop()!;
    setDraftTrip(previousSnapshot.trip);
    setDraftTimeline(previousSnapshot.timeline);
    setDraftFlights(previousSnapshot.flights);
    setDraftStays(previousSnapshot.stays);
    setDraftTransits(previousSnapshot.transits);
    updateUndoRedoFlags();
  }, [isEditing, updateUndoRedoFlags]);

  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

  const handleRedo = useCallback(() => {
    if (!isEditing || redoStackRef.current.length === 0) return;
    const currentSnapshot: EditSnapshot = {
      trip: draftTripRef.current ? JSON.parse(JSON.stringify(draftTripRef.current)) : null,
      timeline: JSON.parse(JSON.stringify(draftTimelineRef.current)),
      flights: JSON.parse(JSON.stringify(draftFlightsRef.current)),
      stays: JSON.parse(JSON.stringify(draftStaysRef.current)),
      transits: JSON.parse(JSON.stringify(draftTransitsRef.current)),
    };
    undoStackRef.current.push(currentSnapshot);

    const nextSnapshot = redoStackRef.current.pop()!;
    setDraftTrip(nextSnapshot.trip);
    setDraftTimeline(nextSnapshot.timeline);
    setDraftFlights(nextSnapshot.flights);
    setDraftStays(nextSnapshot.stays);
    setDraftTransits(nextSnapshot.transits);
    updateUndoRedoFlags();
  }, [isEditing, updateUndoRedoFlags]);

  // Global Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z Keyboard Listener
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing inside an active text input or textarea, let native browser undo handle text within the input
      const activeEl = document.activeElement;
      const isTypingInInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          if (!isTypingInInput) {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey)) {
          if (!isTypingInInput) {
            e.preventDefault();
            handleRedo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleUndo, handleRedo]);

  const [transitSortType, setTransitSortType] = useState<'time' | 'type'>('time');
  const [mapConfirm, setMapConfirm] = useState<{ placeName: string; url: string } | null>(null);

  const handleCopyShareLink = () => {
    if (!trip) return;
    const shareUrl = `${window.location.origin}?id=${trip.id}&share=true`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert("공유 전용 링크가 클립보드에 복사되었습니다.");
      })
      .catch((err) => {
        console.error("공유 링크 복사 실패:", err);
        alert("링크 복사에 실패했습니다.");
      });
  };

  // Lightbox & Gallery state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGalleryDragActive, setIsGalleryDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'accordion'>('accordion');
  const [galleryColumns, setGalleryColumns] = useState<2 | 4>(4);
  const [collapsedGalleryDays, setCollapsedGalleryDays] = useState<string[]>([]);
  const [detailLocInput, setDetailLocInput] = useState('');
  
  // Autosave state
  const [showAutosaveModal, setShowAutosaveModal] = useState(false);
  const autosaveTimerRef = useRef<any>(null);

  // Multi-select & map visibilities state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [hiddenMapItemIds, setHiddenMapItemIds] = useState<number[]>([]);
  const [stayCoords, setStayCoords] = useState<{ [stayId: number]: { lat: number; lng: number } }>({});
  const [transitFocusType, setTransitFocusType] = useState<'depart' | 'arrive' | 'boarding' | null>(null);

  // Frequent places states
  const [frequentPlaces, setFrequentPlaces] = useState<{place: string, location: string, hours: string, lat: number, lng: number}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('frequentPlaces') || '[]');
    } catch (_) {
      return [];
    }
  });
  const [activePlaceInputId, setActivePlaceInputId] = useState<number | null>(null);

  const tripToUse = isEditing ? draftTrip : trip;
  const defaultCurrency = useMemo(() => {
    return getDefaultCurrencyForLocation(tripToUse?.locationStr);
  }, [tripToUse?.locationStr]);
  const generatedDates = useMemo(() => generateDateList(tripToUse?.date || ''), [tripToUse?.date]);
  const { start: minDate, end: maxDate } = parseDateRange(tripToUse?.date || '');
  const [airportGeocodedCoords, setAirportGeocodedCoords] = useState<{ [code: string]: { lat: number; lng: number } }>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  // ─── Cover Image Change Modal States & Handlers ───
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverInputUrl, setCoverInputUrl] = useState('');
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateTripCover = async (newCoverUrl: string) => {
    if (!newCoverUrl.trim() || !trip) return;
    const cleanUrl = newCoverUrl.trim();
    if (isEditing && draftTrip) {
      recordHistory();
      setDraftTrip({ ...draftTrip, img: cleanUrl });
      setIsCoverModalOpen(false);
      return;
    }
    try {
      setIsCoverUploading(true);
      const isPlan = (trip.tags || []).includes('Plan');
      const coll = isPlan ? 'plans' : 'trips';
      await setDoc(doc(db, 'users', 'public', coll, String(trip.id)), { img: cleanUrl }, { merge: true });
      if (draftTrip) setDraftTrip({ ...draftTrip, img: cleanUrl });
      trip.img = cleanUrl;
      setIsCoverModalOpen(false);
    } catch (err) {
      console.error("Failed to update trip cover:", err);
      alert("커버 변경 저장에 실패했습니다.");
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleUploadCoverFile = async (file: File) => {
    setIsCoverUploading(true);
    try {
      const compressed = await compressImage(file, 2560, 2560, 0.82);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `users/public/covers/${Date.now()}_${safeName}`;
      const url = await uploadFileToR2(compressed, storagePath);
      setCoverInputUrl(url);
    } catch (err) {
      console.error("Cover upload error:", err);
      alert("커버 이미지 업로드 실패");
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handlePasteCoverFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const file = new File([blob], `cover_pasted_${Date.now()}.${ext}`, { type: imageType });
            await handleUploadCoverFile(file);
            return;
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          setCoverInputUrl(text.trim());
          return;
        }
      }
      alert("클립보드에 이미지나 이미지 URL이 없습니다.");
    } catch (err) {
      console.warn("Clipboard paste error:", err);
    }
  };

  // ─── Cinematic Tour Mode ("Play Log") States & Logic ───
  const [isCinematicMode, setIsCinematicMode] = useState(false);
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [isCinematicPaused, setIsCinematicPaused] = useState(false);
  const [cinematicSpeed, setCinematicSpeed] = useState<number>(3600); // ms per step (default 1X = 3600ms)
  const [isMobilePlayCollapsed, setIsMobilePlayCollapsed] = useState(true);

  // Cinematic single-timeout references (Zero-Re-render architecture)
  const cinematicStartTimeRef = useRef<number>(0);
  const cinematicRemainingRef = useRef<number>(3600);
  const cinematicTimerRef = useRef<any>(null);

  // Mobile swipe gesture for playlog bar
  const playSwipeStartXRef = useRef<number | null>(null);

  // Quick Spot Inspector copy feedback state
  const [copiedSpotId, setCopiedSpotId] = useState<number | null>(null);

  // ─── Mobile Bottom Sheet States & Gesture Logic ───
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'half' | 'expanded'>('half');
  const sheetTouchStartYRef = useRef<number | null>(null);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);

  // ─── Log Play FAB Idle Transparency ───
  const [isPlayFabIdle, setIsPlayFabIdle] = useState(false);
  const playFabTimerRef = useRef<any>(null);

  const resetPlayFabIdleTimer = () => {
    setIsPlayFabIdle(false);
    if (playFabTimerRef.current) clearTimeout(playFabTimerRef.current);
    playFabTimerRef.current = setTimeout(() => {
      setIsPlayFabIdle(true);
    }, 3000);
  };

  useEffect(() => {
    resetPlayFabIdleTimer();
    return () => {
      if (playFabTimerRef.current) clearTimeout(playFabTimerRef.current);
    };
  }, [isCinematicMode]);

  // Flatten and sort timeline items for Cinematic Tour strictly by date & parsed time
  const cinematicItems = useMemo(() => {
    const rawItems = isEditing
      ? draftTimeline
      : Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );

    const items: (TimelineItem & { dateKey: string })[] = [];
    rawItems.forEach(item => {
      if (item.date && item.date.trim()) {
        items.push({ ...item, dateKey: item.date.trim() });
      }
    });

    // Sort strictly: date ascending, then time ascending, then ID
    return items.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id - b.id;
    });
  }, [timelineData, draftTimeline, isEditing]);

  const currentCinematicItem = cinematicItems[cinematicIndex] || null;

  // Track previous cinematic index to determine direction (forward vs backward)
  const prevCinematicIndexRef = useRef<number>(0);

  // Compute current cinematic vehicle type strictly in sync during render (No 1-tick async delay)
  const currentCinematicVehicleType = useMemo(() => {
    if (cinematicItems.length === 0) return null;
    const prevIdx = prevCinematicIndexRef.current;
    const curIdx = cinematicIndex;

    if (curIdx === prevIdx) {
      return curIdx > 0 ? (cinematicItems[curIdx - 1]?.vehicleType || null) : null;
    }

    if (curIdx > prevIdx) {
      // 정방향 이동: 출발 스팟(curIdx - 1부터 prevIdx까지 역순 탐색)의 지정 탈것을 우선 적용
      for (let i = curIdx - 1; i >= prevIdx; i--) {
        if (cinematicItems[i]?.vehicleType) {
          return cinematicItems[i].vehicleType;
        }
      }
      return cinematicItems[curIdx - 1]?.vehicleType || null;
    } else {
      // 뒤로 역방향 이동: 돌아가는 구간의 시작점(curIdx부터 prevIdx-1)의 탈것 유지
      for (let i = curIdx; i <= prevIdx - 1; i++) {
        if (cinematicItems[i]?.vehicleType) {
          return cinematicItems[i].vehicleType;
        }
      }
      return cinematicItems[curIdx]?.vehicleType || null;
    }
  }, [cinematicIndex, cinematicItems]);

  useEffect(() => {
    prevCinematicIndexRef.current = cinematicIndex;
  }, [cinematicIndex]);

  // Reset timeline scroll to top when switching dates, and sync playlog index to the new date
  const prevSelectedDateRef = useRef<string>(selectedDate);
  useEffect(() => {
    if (prevSelectedDateRef.current !== selectedDate) {
      prevSelectedDateRef.current = selectedDate;

      // When date changes while cinematic mode is active, reset cinematic index to the new date's first spot
      if (isCinematicMode && cinematicItems.length > 0) {
        if (selectedDate === 'ALL') {
          setCinematicIndex(0);
        } else {
          const foundIdx = cinematicItems.findIndex(i => i.dateKey === selectedDate);
          if (foundIdx !== -1) {
            setCinematicIndex(foundIdx);
          }
        }
      }

      if (!isCinematicMode && tabContentRef.current) {
        tabContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [selectedDate, isCinematicMode, cinematicItems]);

  // Perfectly safe vertical-only scroll that never alters parent scrollLeft or flex container boundaries
  const scrollToTimelineItemSafe = useCallback((itemId: number, align: 'center' | 'top' = 'center') => {
    const container = tabContentRef.current;
    if (!container) return;
    const el = itemRefs.current[itemId] || document.getElementById(`timeline-item-${itemId}`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top + container.scrollTop;

    const targetTop = align === 'center'
      ? relativeTop - (container.clientHeight / 2) + (elRect.height / 2)
      : relativeTop - 24;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth'
    });
  }, []);

  // Sync active step to timeline and map
  useEffect(() => {
    if (!isCinematicMode || !currentCinematicItem) return;
    setExpandedItemId(currentCinematicItem.id);
    setSelectedDate(currentCinematicItem.dateKey);

    // Smoothly scroll timeline item into view only in timeline tab
    if (activeTab === 'timeline') {
      setTimeout(() => {
        scrollToTimelineItemSafe(currentCinematicItem.id, 'center');
      }, 150);
    }
  }, [isCinematicMode, cinematicIndex, currentCinematicItem, activeTab, scrollToTimelineItemSafe]);

  // Reset remaining playback duration when index or speed changes
  useEffect(() => {
    cinematicRemainingRef.current = cinematicSpeed;
  }, [cinematicIndex, cinematicSpeed]);

  // Cinematic single-timeout loop (Zero-Re-render architecture: eliminates 50ms interval completely)
  useEffect(() => {
    if (!isCinematicMode || cinematicItems.length === 0) {
      if (cinematicTimerRef.current) clearTimeout(cinematicTimerRef.current);
      return;
    }

    if (isCinematicPaused) {
      if (cinematicTimerRef.current) {
        clearTimeout(cinematicTimerRef.current);
        cinematicTimerRef.current = null;
        const elapsed = Date.now() - cinematicStartTimeRef.current;
        cinematicRemainingRef.current = Math.max(0, cinematicRemainingRef.current - elapsed);
      }
      return;
    }

    cinematicStartTimeRef.current = Date.now();
    const delay = Math.max(100, cinematicRemainingRef.current);

    cinematicTimerRef.current = setTimeout(() => {
      cinematicRemainingRef.current = cinematicSpeed;
      setCinematicIndex(prev => (prev + 1) % cinematicItems.length);
    }, delay);

    return () => {
      if (cinematicTimerRef.current) clearTimeout(cinematicTimerRef.current);
    };
  }, [isCinematicMode, isCinematicPaused, cinematicIndex, cinematicItems.length, cinematicSpeed]);

  // Turn off cinematic mode when user edits or changes tab away from timeline or gallery
  useEffect(() => {
    if (activeTab !== 'timeline' && activeTab !== 'gallery' && isCinematicMode) {
      setIsCinematicMode(false);
    }
  }, [activeTab, isCinematicMode]);

  // Auto-clear flash highlight after 1.6s
  useEffect(() => {
    if (flashedItemId !== null) {
      const timer = setTimeout(() => {
        setFlashedItemId(null);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [flashedItemId]);

  // Smooth scroll and flash highlight when expandedItemId changes
  useEffect(() => {
    if (expandedItemId !== null && activeTab === 'timeline' && !isCinematicMode) {
      scrollToTimelineItemSafe(expandedItemId, 'center');
      setFlashedItemId(expandedItemId);
    }
  }, [expandedItemId, activeTab, isCinematicMode, scrollToTimelineItemSafe]);

  const handlePlayFromItem = (itemId: number) => {
    setActiveTab('timeline');
    const foundIdx = cinematicItems.findIndex(i => i.id === itemId);
    if (foundIdx !== -1) {
      setCinematicIndex(foundIdx);
    } else {
      setCinematicIndex(0);
    }
    setIsCinematicMode(true);
    setIsCinematicPaused(false);
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - sheetTouchStartYRef.current;
    sheetTouchStartYRef.current = null;

    if (deltaY < -35) {
      // Swiped UP -> expand sheet (minimize map)
      setMobileSheetSnap('expanded');
    } else if (deltaY > 35) {
      // Swiped DOWN -> return to standard half view
      setMobileSheetSnap('half');
    }
  };

  // Destination Local Time
  const [destLocalTime, setDestLocalTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        const country = (detectedCountry || tripToUse?.country || '').toUpperCase();
        let timeZone = 'Asia/Tokyo'; // Default JST
        if (country.includes('KOREA') || country.includes('한국')) timeZone = 'Asia/Seoul';
        else if (country.includes('JAPAN') || country.includes('일본')) timeZone = 'Asia/Tokyo';
        else if (country.includes('FRANCE') || country.includes('ITALY') || country.includes('GERMANY') || country.includes('SPAIN')) timeZone = 'Europe/Paris';
        else if (country.includes('UK') || country.includes('BRITAIN') || country.includes('LONDON')) timeZone = 'Europe/London';
        else if (country.includes('USA') || country.includes('AMERICA') || country.includes('US')) timeZone = 'America/New_York';
        else if (country.includes('THAILAND') || country.includes('BANGKOK') || country.includes('VIETNAM')) timeZone = 'Asia/Bangkok';
        else if (tripToUse?.lng !== undefined && tripToUse?.lng !== null) {
          const offsetHours = Math.round(tripToUse.lng / 15);
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const destDate = new Date(utc + (3600000 * offsetHours));
          const hours = String(destDate.getHours()).padStart(2, '0');
          const minutes = String(destDate.getMinutes()).padStart(2, '0');
          setDestLocalTime(`${hours}:${minutes}`);
          return;
        }

        const now = new Date();
        const formatted = new Intl.DateTimeFormat('ko-KR', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now);
        setDestLocalTime(formatted);
      } catch (e) {
        setDestLocalTime('');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [detectedCountry, tripToUse?.country, tripToUse?.lng]);
  // Scroll window and tab container to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (tabContentRef.current) {
      tabContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);


  useEffect(() => {
    if (!isEditing) {
      setSelectedItemIds([]);
    }
  }, [isEditing]);

  // Geocode stay addresses & restore from DB
  useEffect(() => {
    if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      staysToUse.forEach(async (stay) => {
        // If DB has coordinates, restore immediately
        if (stay.lat !== undefined && stay.lng !== undefined && stay.lat !== null && stay.lng !== null) {
          setStayCoords(prev => {
            if (prev[stay.id] && prev[stay.id].lat === stay.lat && prev[stay.id].lng === stay.lng) {
              return prev;
            }
            return {
              ...prev,
              [stay.id]: { lat: stay.lat!, lng: stay.lng! }
            };
          });
        } else if (stay.address && !stayCoords[stay.id] && stay.address !== '숙소 주소를 입력하세요') {
          try {
            const coords = await fetchCoordinates(stay.address);
            if (coords) {
              setStayCoords(prev => ({
                ...prev,
                [stay.id]: coords
              }));
            }
          } catch (e) {
            console.error("Geocoding stay failed:", e);
          }
        }
      });
    }
  }, [activeTab, draftStays, stays, isEditing]);

  // Geocode airports
  useEffect(() => {
    if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      flightsToUse.forEach((f) => {
        ['fromCode', 'toCode'].forEach(async (key) => {
          const code = (f as any)[key];
          if (code && !airportCoords[code] && !airportGeocodedCoords[code]) {
            try {
              const coords = await fetchCoordinates(`${code} Airport`);
              if (coords) {
                setAirportGeocodedCoords(prev => ({
                  ...prev,
                  [code]: coords
                }));
              }
            } catch (e) {
              console.error(`Geocoding airport ${code} failed:`, e);
            }
          }
        });
      });
    }
  }, [activeTab, draftFlights, flights, isEditing]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const scrollTargetItemIdRef = useRef<number | null>(null);
  const lastGalleryTapRef = useRef<{ [key: number]: number }>({});

  // 시간 변경 등으로 정렬 순서가 바뀌었을 때 해당 일정 편집 위치로 스크롤 이동
  useEffect(() => {
    if (scrollTargetItemIdRef.current !== null) {
      const targetId = scrollTargetItemIdRef.current;
      // 리렌더링 후 DOM 정렬 및 배치가 완료될 시간을 약간 주기 위해 setTimeout 사용
      setTimeout(() => {
        const element = itemRefs.current[targetId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      scrollTargetItemIdRef.current = null;
    }
  }, [draftTimeline]);

  const dateBarRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const hasMovedRef = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dateBarRef.current) return;
    isDown.current = true;
    hasMovedRef.current = false;
    startX.current = e.pageX - dateBarRef.current.offsetLeft;
    scrollLeftRef.current = dateBarRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !dateBarRef.current) return;
    const x = e.pageX - dateBarRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      e.preventDefault();
      dateBarRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const scrollDays = (direction: 'left' | 'right') => {
    const container = dateBarRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    if (direction === 'right') {
      const nextChild = children.find(child => child.offsetLeft > container.scrollLeft + container.clientWidth - 5);
      if (nextChild) {
        container.scrollTo({ left: nextChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
      }
    } else {
      const prevChildren = children.filter(child => child.offsetLeft < container.scrollLeft - 5);
      if (prevChildren.length > 0) {
        const prevChild = prevChildren[prevChildren.length - 1];
        container.scrollTo({ left: prevChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
      }
    }
  };

  // Deep-linking search focus effect
  useEffect(() => {
    if (searchFocusTab) {
      setActiveTab(searchFocusTab as TabType);
      
      if (searchFocusTab === 'timeline' && searchFocusItemId) {
        const rawTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
        const item = rawTimeline.find(x => x.id === searchFocusItemId);
        if (item && item.date) {
          setSelectedDate(item.date);
        } else {
          setSelectedDate('ALL');
        }
      } else {
        setSelectedDate('ALL');
      }

      if (searchFocusItemId) {
        setExpandedItemId(searchFocusItemId);
        setTimeout(() => {
          if (itemRefs.current[searchFocusItemId]) {
            itemRefs.current[searchFocusItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      
      if (onClearSearchFocus) {
        onClearSearchFocus();
      }
    }
  }, [searchFocusTab, searchFocusItemId, timelineData, onClearSearchFocus]);

  // Note: We preserve timeline items' authentic dates and dynamically derive all days to avoid data corruption.

  // Dynamically resolve country name with coordinate geocoding fallback (for data efficiency and error prevention)
  useEffect(() => {
    let isMounted = true;
    const detect = async () => {
      if (!tripToUse) return;

      // 0. Prioritize manually entered country name from user (highest priority)
      if (tripToUse.country && tripToUse.country.trim()) {
        setDetectedCountry(tripToUse.country.trim().toUpperCase());
        return;
      }

      // 1. Prioritize locationsCountries from database (0 API traffic)
      const locationsCountries = tripToUse.locations
        ? Array.from(
            new Set(
              tripToUse.locations
                .map((l: any) => {
                  // If country is already stored (e.g. 'JAPAN'), use it directly
                  if (l.country) return l.country.trim().toUpperCase();
                  // Try to extract from name first
                  const extracted = extractCountry(l.name || '');
                  if (extracted && extracted !== (l.name || '').trim().toUpperCase()) {
                    return extracted;
                  }
                  // Otherwise, look up the city name in CITY_TO_COUNTRY_MAP
                  return getCountryName(l.name || '');
                })
                .filter((c: string) => Boolean(c) && c !== 'TRAVEL')
            )
          ) as string[]
        : [];

      if (locationsCountries.length > 0) {
        setDetectedCountry(locationsCountries.join(', '));
        return;
      }

      // 2. If empty, fallback to reverse geocoding the main lat/lng coordinates (Geocoding API)
      if (tripToUse.lat !== undefined && tripToUse.lng !== undefined && tripToUse.lat !== null && tripToUse.lng !== null) {
        try {
          const countryRaw = await fetchCountryFromCoords(tripToUse.lat, tripToUse.lng);
          if (countryRaw && isMounted) {
            const countryName = extractCountry(countryRaw) || countryRaw.toUpperCase();
            if (countryName && countryName !== 'TRAVEL') {
              setDetectedCountry(countryName);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to detect country from coordinates:", e);
        }
      }

      // 3. Worst-case fallback: string parsing on locationStr using the local dictionary map
      const loc = tripToUse.locationStr || '';
      const parts = loc.split(',').map(p => p.trim());
      const raw = parts.length >= 2 ? parts[parts.length - 1] : (parts[0] || 'TRAVEL');
      const extractedFallback = extractCountry(raw);
      const fallbackCountry = (extractedFallback && extractedFallback !== raw.toUpperCase())
        ? extractedFallback
        : getCountryName(raw);

      if (isMounted) {
        setDetectedCountry(fallbackCountry);
      }
    };

    detect();

    return () => {
      isMounted = false;
    };
  }, [tripToUse]);


  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (!draftTrip) return;
    const { start, end } = parseDateRange(draftTrip.date);
    
    const newStart = type === 'start' ? val : start;
    const newEnd = type === 'end' ? val : end;
    
    const formatFromInputDate = (d: string) => d.replace(/-/g, '.');
    
    if (newStart && newEnd) {
      const formattedStart = formatFromInputDate(newStart);
      let formattedEnd = formatFromInputDate(newEnd);
      
      const startYear = newStart.slice(0, 4);
      const endYear = newEnd.slice(0, 4);
      if (startYear === endYear && formattedEnd.startsWith(startYear + '.')) {
        formattedEnd = formattedEnd.slice(5); // removes "YYYY."
      }
      
      const oldDates = generateDateList(draftTrip.date);
      const newDateStr = `${formattedStart} - ${formattedEnd}`;

      setDraftTrip({
        ...draftTrip,
        date: newDateStr
      });

      const newDates = generateDateList(newDateStr);

      if (oldDates.length > 0 && newDates.length > 0) {
        setDraftTimeline(prev => 
          prev.map(item => {
            if (!item.date) return item;
            const idx = oldDates.indexOf(item.date);
            if (idx !== -1) {
              const newDateVal = newDates[Math.min(idx, newDates.length - 1)];
              return { ...item, date: newDateVal };
            }
            return item;
          })
        );
      }
    }
  };

  // Drag and Drop reorder helper
  const handleDropTimelineItem = (targetId: number) => {
    if (draggedItemId === null || draggedItemId === targetId) return;

    const flatTimeline = [...draftTimeline];
    const draggedIndex = flatTimeline.findIndex(item => item.id === draggedItemId);
    const targetIndex = flatTimeline.findIndex(item => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove item and insert at target
    const [draggedItem] = flatTimeline.splice(draggedIndex, 1);
    flatTimeline.splice(targetIndex, 0, draggedItem);

    // Recompute time for dragged item based on its new neighbors
    const prevItem = targetIndex > 0 ? flatTimeline[targetIndex - 1] : null;
    const nextItem = targetIndex < flatTimeline.length - 1 ? flatTimeline[targetIndex + 1] : null;

    let newTime = draggedItem.time;

    if (prevItem && nextItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      const nextMin = parseTimeToMinutes(nextItem.time);
      let midMin = Math.round((prevMin + nextMin) / 2);
      if (Math.abs(prevMin - nextMin) <= 1) {
        midMin = prevMin + 5;
      }
      newTime = minutesToTimeStr(midMin);
    } else if (prevItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      newTime = minutesToTimeStr(prevMin + 60);
    } else if (nextItem) {
      const nextMin = parseTimeToMinutes(nextItem.time);
      newTime = minutesToTimeStr(Math.max(0, nextMin - 60));
    }

    draggedItem.time = newTime;
    
    // Ensure it belongs to the target item's date context
    const targetItem = flatTimeline.find(item => item.id === targetId);
    if (targetItem) {
      draggedItem.date = targetItem.date;
    }

    setDraftTimeline(flatTimeline);
    setDraggedItemId(null);
  };

  // Generate default timeline template for the entire journey duration
  const handleGenerateDefaultTemplate = () => {
    if (!draftTrip) return;
    if (draftTimeline.length > 0) {
      if (!window.confirm("기존의 모든 타임라인 일정이 초기화되고 기본 템플릿으로 대체됩니다. 진행하시겠습니까?")) {
        return;
      }
    }

    const dates = generatedDates;
    const totalDays = dates.length;
    const cityDisplay = (draftTrip.locationStr || '').split(',')[0].trim().toUpperCase() || 'CITY';

    const items: TimelineItem[] = [];
    dates.forEach((date, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === totalDays - 1;
      const baseId = Date.now() + idx * 100 + 1;

      let dayItems: any[] = [];
      if (isFirst && totalDays === 1) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착`,     cost: '-',   memo: '입국 심사 및 현지 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 관람`,     cost: '-',   memo: '현지 관광 일정', date },
          { id: baseId + 4, time: '07:00 PM', type: 'transit',  place: '귀국 공항 이동',           cost: '-',   memo: '공항 이동 및 탑승수속', date },
          { id: baseId + 5, time: '09:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else if (isFirst) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착·입국`, cost: '-',   memo: '입국 심사 후 시내 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'transit',  place: '시내 교통 이동',           cost: '-',   memo: '숙소까지 이동', date },
          { id: baseId + 4, time: '04:00 PM', type: 'stay',     place: '숙소 체크인',             cost: '-',   memo: '짐 풀고 휴식', date },
          { id: baseId + 5, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 식당 탐방', date },
        ];
      } else if (isLast) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 근처 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'stay',     place: '숙소 체크아웃',           cost: '-',   memo: '체크아웃 후 짐 보관', date },
          { id: baseId + 2, time: '11:00 AM', type: 'activity', place: '출발 전 마지막 일정',      cost: '-',   memo: '기념품 구입 등', date },
          { id: baseId + 3, time: '01:00 PM', type: 'transit',  place: '공항 이동',               cost: '-',   memo: '공항 셔틀 또는 대중교통', date },
          { id: baseId + 4, time: '03:00 PM', type: 'transit',  place: '귀국 탑승수속·출국심사',  cost: '-',   memo: '면세점 쇼핑', date },
          { id: baseId + 5, time: '06:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 인근 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'activity', place: `${cityDisplay} 오전 관람`, cost: '-',   memo: '주요 명소 방문', date },
          { id: baseId + 2, time: '12:30 PM', type: 'dining',   place: '점심 식사',               cost: '-',   memo: '현지 맛집 방문', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 오후 일정`, cost: '-',   memo: '쇼핑, 카페, 문화 체험 등', date },
          { id: baseId + 4, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 레스토랑 저녁', date },
          { id: baseId + 5, time: '09:30 PM', type: 'stay',     place: '숙소 복귀',               cost: '-',   memo: '숙소 휴식', date },
        ];
      }

      dayItems.forEach(di => {
        items.push({ ...di, tripId: draftTrip.id });
      });
    });

    setDraftTimeline(items);
  };

  // Set draft state when entering edit mode
  const handleStartEditing = () => {
    if (!trip) return;
    setDraftTrip({ ...trip });
    // Flatten current timelineData
    const flatTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
      (list || []).map(item => ({ ...item, date: item.date || d }))
    );
    setDraftTimeline(flatTimeline);
    setDraftFlights([...flights]);
    setDraftStays([...stays]);
    setDraftTransits([...transits]);
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateUndoRedoFlags();
    setIsEditing(true);
    onEditModeChange?.(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    onEditModeChange?.(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateUndoRedoFlags();
    setDraftTrip(null);
    setDraftTimeline([]);
    setDraftFlights([]);
    setDraftStays([]);
    setDraftTransits([]);
  };

  const handleSave = async (showModal: boolean = true) => {
    if (!trip) return;

    // Force blur active input/textarea to trigger its onChange/composition commit
    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      document.activeElement.blur();
      // Give React/browser time to trigger events and run state updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!draftTripRef.current) return;

    setSaving(true);
    try {
      const latestTrip = draftTripRef.current;
      const latestTimeline = draftTimelineRef.current;
      const latestFlights = draftFlightsRef.current;
      const latestStays = draftStaysRef.current;
      const latestTransits = draftTransitsRef.current;

      // Geocode empty coordinates before saving
      const resolvedTimeline = await Promise.all(
        latestTimeline.map(async (item) => {
          if (
            (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null) &&
            item.location && item.location.trim() !== ''
          ) {
            try {
              const coords = await fetchCoordinates(item.location);
              if (coords) {
                return { ...item, lat: coords.lat, lng: coords.lng };
              }
            } catch (e) {
              console.error(`Geocoding failed for ${item.location} during save:`, e);
            }
          }
          return item;
        })
      );

      // Update draftTimeline with resolved coords so map pins show immediately
      setDraftTimeline(resolvedTimeline);

      await onSave(
        trip.id,
        latestTrip,
        resolvedTimeline,
        latestFlights,
        latestStays,
        latestTransits
      );
      setIsEditing(false);
      onEditModeChange?.(false);
      setIsBannerMenuOpen(false);
      if (showModal) {
        setShowSaveSuccessModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saveRef) {
      saveRef.current = (showModal?: boolean) => handleSave(showModal ?? true);
      return () => {
        saveRef.current = null;
      };
    }
  }, [handleSave, saveRef]);

  const triggerAutosave = async () => {
    if (!trip || !draftTrip) return;
    try {
      const resolvedTimeline = await Promise.all(
        draftTimeline.map(async (item) => {
          if (
            (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null) &&
            item.location && item.location.trim() !== ''
          ) {
            try {
              const coords = await fetchCoordinates(item.location);
              if (coords) {
                return { ...item, lat: coords.lat, lng: coords.lng };
              }
            } catch (e) {
              console.error(`Geocoding failed for ${item.location} during autosave:`, e);
            }
          }
          return item;
        })
      );

      await onSave(
        trip.id,
        draftTrip,
        resolvedTimeline,
        draftFlights,
        draftStays,
        draftTransits
      );

      setShowAutosaveModal(true);
      setTimeout(() => {
        setShowAutosaveModal(false);
      }, 3000);
    } catch (e) {
      console.error("Autosave failed:", e);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      triggerAutosave();
    }, 5 * 60 * 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isEditing, draftTrip, draftTimeline, draftFlights, draftStays, draftTransits]);


  // Determine current timeline items (original or draft) preserving authentic item dates
  const baseTimeline = useMemo(() => {
    return isEditing
      ? draftTimeline
      : Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
  }, [isEditing, draftTimeline, timelineData]);

  // Combine trip's date-range dates with any dates actually present in the timeline
  const allTripDates = useMemo(() => {
    const datesSet = new Set<string>(generatedDates);
    baseTimeline.forEach(item => {
      if (item.date && item.date.trim()) {
        datesSet.add(item.date.trim());
      }
    });
    return Array.from(datesSet).sort();
  }, [generatedDates, baseTimeline]);

  const dynamicDates = useMemo(() => [
    { id: 'all', date: 'ALL', label: 'ALL' },
    ...allTripDates.map((d) => ({
      id: d,
      date: d,
      label: d.slice(5).replace('.', '/')
    }))
  ], [allTripDates]);

  const groupedTimelineData = useMemo(() => {
    const map: { [date: string]: TimelineItem[] } = {};
    baseTimeline.forEach(item => {
      const d = item.date || 'No Date';
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [baseTimeline]);

  // 시간 연산 헬퍼: 기존 시간 기준 1시간 뒤 자동 계산 (12시간제/24시간제 완벽 대응)
  const calculateNextTimelineTime = (baseTimeStr?: string): string => {
    if (!baseTimeStr) return '10:00 AM';
    const clean = baseTimeStr.trim().toUpperCase();

    // 12-hour format e.g. "10:30 AM", "12:00 PM", "02:15 PM"
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const ampm = ampmMatch[3];

      if (ampm) {
        if (hours === 11 && ampm === 'AM') {
          return `12:${minutes} PM`;
        } else if (hours === 12 && ampm === 'AM') {
          return `01:${minutes} AM`;
        } else if (hours === 11 && ampm === 'PM') {
          return `12:${minutes} AM`;
        } else if (hours === 12 && ampm === 'PM') {
          return `01:${minutes} PM`;
        } else {
          const nextHour = hours + 1;
          return `${String(nextHour).padStart(2, '0')}:${minutes} ${ampm}`;
        }
      } else {
        const nextHour = (hours + 1) % 24;
        return `${String(nextHour).padStart(2, '0')}:${minutes}`;
      }
    }

    const hourMatch = clean.match(/^(\d{1,2})/);
    if (hourMatch) {
      const nextH = (parseInt(hourMatch[1], 10) + 1) % 24;
      return `${String(nextH).padStart(2, '0')}:00`;
    }

    return '01:00 PM';
  };

  // ── Unified 1km Proximity Radar Watcher (Trip Spots & Saved Pockets) ──
  useEffect(() => {
    // If user snoozed radar, skip
    if (Date.now() < radarSnoozedUntil) return;

    if (!('geolocation' in navigator)) return;

    const checkRadar = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // 여정 지역과의 거리 검사 (반경 50km 이내에 실제 사용자가 있을 때만 가동)
          const currentTimelinePoints = (isEditing ? draftTimeline : baseTimeline)
            .filter(item => typeof item.lat === 'number' && typeof item.lng === 'number');
          const tripLat = trip?.lat ?? currentTimelinePoints[0]?.lat;
          const tripLng = trip?.lng ?? currentTimelinePoints[0]?.lng;

          if (typeof tripLat === 'number' && typeof tripLng === 'number') {
            const distToTrip = calculateDistanceInMeters(userLat, userLng, tripLat, tripLng);
            if (distToTrip > 50000) {
              setRadarItems([]);
              return; // 50km 밖이면 레이더 오작동 원천 차단
            }
          }

          const savedPockets = getSavedPockets();
          const timelineItems = isEditing ? draftTimeline : baseTimeline;
          const nearby = findUnifiedNearbyTargets(userLat, userLng, timelineItems, savedPockets, 1000);

          setRadarItems(nearby);
          setActiveRadarIndex(0);
        },
        () => {
          // GPS 실패 시 가상 좌표 fallback 금지 (현재 위치 기준 원칙)
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    };

    checkRadar();
    // 30초 주기로 현장 도보 이동 갱신
    const intervalId = setInterval(checkRadar, 30000);
    return () => clearInterval(intervalId);
  }, [trip?.id, baseTimeline, draftTimeline, isEditing, radarSnoozedUntil]);

  const handleFocusRadarItemOnMap = (item: RadarItem) => {
    if (!item) return;
    if (item.type === 'trip_spot' && item.rawItem && typeof (item.rawItem as TimelineItem).id === 'number') {
      handleItemToggle((item.rawItem as TimelineItem).id);
    }
    setRadarFocusedSpot({ lat: item.lat, lng: item.lng, title: item.title });
  };

  const handleDirectAddFromPocket = (spot: SpotPocketItem, targetDateParam?: string, targetTimeParam?: string) => {
    // 1. 타임라인에서 현재 선택된 아이템 파악
    const currentList = isEditing ? draftTimeline : baseTimeline;
    const selectedItem = expandedItemId !== null ? currentList.find(i => i.id === expandedItemId) : null;

    // 타깃 일자: 파라미터 > 선택된 아이템의 날짜 > 현재 탭 선택 날짜 > 첫째 날
    const targetDate = targetDateParam || 
      selectedItem?.date || 
      (selectedDate === 'ALL' ? (allTripDates[0] || trip?.date?.split('-')[0]?.trim() || '2025.04.12') : selectedDate);

    // 타깃 시간: 파라미터 > 선택된 아이템의 다음 시간(+1시간) > 해당 날짜 마지막 아이템 다음 시간 > 기본 10:00 AM
    let targetTime = targetTimeParam;
    if (!targetTime) {
      if (selectedItem && selectedItem.time) {
        targetTime = calculateNextTimelineTime(selectedItem.time);
      } else {
        const sameDayItems = currentList.filter(i => (i.date || targetDate) === targetDate);
        if (sameDayItems.length > 0) {
          const lastItem = sameDayItems[sameDayItems.length - 1];
          targetTime = calculateNextTimelineTime(lastItem.time);
        } else {
          targetTime = '10:00 AM';
        }
      }
    }

    const newId = Date.now();
    const newItem: TimelineItem = {
      id: newId,
      time: targetTime,
      type: spot.category === 'food' || spot.category === 'cafe' ? 'restaurant' : 'activity',
      place: spot.title,
      cost: '-',
      memo: spot.memo ? `${spot.memo}${spot.sourceUrl ? `\n참고: ${spot.sourceUrl}` : ''}` : (spot.sourceUrl ? `참고: ${spot.sourceUrl}` : ''),
      lat: spot.lat,
      lng: spot.lng,
      location: spot.address || spot.city || spot.title,
      date: targetDate,
      tripId: trip?.id,
      link: spot.sourceUrl || ''
    };

    recordHistory();

    // 선택된 아이템이 있으면 바로 뒤에 삽입, 없으면 끝에 추가
    setDraftTimeline(prev => {
      if (selectedItem) {
        const insertIdx = prev.findIndex(i => i.id === selectedItem.id);
        if (insertIdx !== -1) {
          const next = [...prev];
          next.splice(insertIdx + 1, 0, newItem);
          return next;
        }
      }
      return [...prev, newItem];
    });

    setIsEditing(true);
    setActiveTab('timeline');
    setExpandedItemId(newId);
    setIsPocketWidgetOpen(false);

    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
  };

  // Auto-clear day section flash highlight
  useEffect(() => {
    if (highlightedDateSection) {
      const timer = setTimeout(() => {
        setHighlightedDateSection(null);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [highlightedDateSection]);

  // Center active day chip inside Quick Jump bar (Container-isolated scrollTo, prevents window horizontal shift)
  useEffect(() => {
    if (activeSpyDate && quickJumpChipsRef.current) {
      const chipsContainer = quickJumpChipsRef.current;
      const activeEl = chipsContainer.querySelector(`[data-quick-date="${activeSpyDate}"]`) as HTMLElement;
      if (activeEl) {
        const targetScrollLeft = activeEl.offsetLeft - (chipsContainer.clientWidth / 2) + (activeEl.clientWidth / 2);
        chipsContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeSpyDate]);

  // Scroll Spy for Floating Day Quick Jump
  useEffect(() => {
    const container = tabContentRef.current;
    if (!container || activeTab !== 'timeline') {
      setShowQuickJump(false);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = container.scrollTop;
          setShowQuickJump(scrollTop > 120);

          if (selectedDate !== 'ALL') {
            setActiveSpyDate(selectedDate);
          } else {
            const containerRect = container.getBoundingClientRect();
            let currentActiveDate = 'ALL';

            if (scrollTop < 80) {
              currentActiveDate = 'ALL';
            } else {
              for (let i = allTripDates.length - 1; i >= 0; i--) {
                const d = allTripDates[i];
                const el = document.getElementById(`date-section-${d}`);
                if (el) {
                  const elRect = el.getBoundingClientRect();
                  if (elRect.top <= containerRect.top + 140) {
                    currentActiveDate = d;
                    break;
                  }
                }
              }
            }
            setActiveSpyDate(currentActiveDate);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, selectedDate, allTripDates]);

  const handleQuickJumpToDate = (targetDate: string) => {
    if (targetDate === 'ALL') {
      setSelectedDate('ALL');
      if (tabContentRef.current) {
        tabContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Auto uncollapse if collapsed
    if (collapsedDays.includes(targetDate)) {
      setCollapsedDays(prev => prev.filter(d => d !== targetDate));
    }

    const scrollToDateSection = (date: string) => {
      const container = tabContentRef.current;
      const el = document.getElementById(`date-section-${date}`);
      if (container && el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        // Offset for top sticky date bar (44px) so section header lands cleanly at top
        const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - 44;
        container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
        setHighlightedDateSection(date);
      }
    };

    if (selectedDate !== 'ALL') {
      setSelectedDate('ALL');
      setTimeout(() => {
        scrollToDateSection(targetDate);
      }, 60);
    } else {
      scrollToDateSection(targetDate);
    }
  };

  const handleScrollToTop = () => {
    if (tabContentRef.current) {
      tabContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Separate gallery: metadata gallery (from trip.gallery) and timeline images (from timeline items)
  // Normalize gallery entries: string → { url } object
  const galleryMetaImages = useMemo(() => {
    const rawGalleryEntries = tripToUse?.gallery || [];
    return rawGalleryEntries.map(entry =>
      typeof entry === 'string' 
        ? { url: getEffectiveImageUrl(entry) } 
        : { ...(entry as any), url: getEffectiveImageUrl((entry as any).url) }
    ) as { url: string; date?: string; time?: string; place?: string; imgNote?: string; lat?: number | null; lng?: number | null; excludeFromMap?: boolean }[];
  }, [tripToUse?.gallery]);

  const timelineImages = useMemo(() => {
    return baseTimeline
      .filter(item => item.img)
      .map(item => ({
        url: getEffectiveImageUrl(item.img as string),
        place: item.place,
        location: item.location,
        date: item.date || '',
        time: item.time || '',
        imgNote: item.imgNote || '',
        type: 'timeline' as const,
        itemId: item.id,
        lat: item.lat,
        lng: item.lng,
      }));
  }, [baseTimeline]);

  const allGalleryImages = useMemo(() => {
    const metas = galleryMetaImages.map((g, idx) => ({
      ...g,
      type: 'gallery' as const,
      id: 500000 + idx,
      time: g.time || ''
    }));

    const tls = timelineImages.map((t) => ({
      url: t.url,
      place: t.place,
      location: t.location,
      date: t.date,
      imgNote: t.imgNote || '',
      type: 'timeline' as const,
      id: 600000000 + t.itemId,
      lat: t.lat,
      lng: t.lng,
      time: t.time || '',
      itemId: t.itemId,
      excludeFromMap: false
    }));

    const combined = [...metas, ...tls];
    const seenUrls = new Set<string>();
    const unique = combined.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    unique.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      
      if (dateA === dateB) {
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeA - timeB;
      }
      
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const normalizedA = dateA.replace(/\./g, '-');
      const normalizedB = dateB.replace(/\./g, '-');
      return normalizedA.localeCompare(normalizedB);
    });

    return unique;
  }, [galleryMetaImages, timelineImages]);

  // Combined LightboxImageMeta array matching allGalleryImages sorting
  const galleryAllMeta = useMemo(() => {
    return allGalleryImages.map(item => ({
      url: item.url,
      place: item.place,
      location: (item as any).location,
      date: item.date,
      imgNote: item.imgNote || '',
      type: item.type,
    }));
  }, [allGalleryImages]);

  // Fast O(1) Map for opening Lightbox immediately without findIndex array traversal
  const galleryUrlIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    galleryAllMeta.forEach((item, idx) => {
      map.set(item.url, idx);
    });
    return map;
  }, [galleryAllMeta]);

  const galleryGroups = useMemo(() => {
    const groups: { [date: string]: typeof allGalleryImages } = {};
    allTripDates.forEach(d => {
      groups[d] = [];
    });
    groups['NO_DATE'] = [];

    allGalleryImages.forEach(img => {
      const dVal = img.date || '';
      if (dVal && groups[dVal]) {
        groups[dVal].push(img);
      } else {
        groups['NO_DATE'].push(img);
      }
    });
    return groups;
  }, [allGalleryImages, allTripDates]);

  // Keep backward compat
  const galleryAllUnique = useMemo(() => {
    return galleryAllMeta.map(m => m.url);
  }, [galleryAllMeta]);

  const timelinePhotoPoints = useMemo(() => {
    const points: any[] = [];
    baseTimeline.forEach((item) => {
      if (item.img && item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) {
        const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
        points.push({
          id: 600000000 + item.id, // unique ID offset for timeline photo pins
          place: item.place || '일정 사진 위치',
          lat: Number(item.lat),
          lng: Number(item.lng),
          time: item.time || '12:00 PM',
          date: item.date || '',
          memo: item.imgNote || item.memo || '일정 사진',
          isPhoto: true,
          photoUrl: item.img,
          dayIndex
        });
      }
    });
    return points;
  }, [baseTimeline, allTripDates]);


  // Sort chronologically: by date, then by parsed time
  const currentTimeline = useMemo(() => {
    const filtered = selectedDate === 'ALL'
      ? baseTimeline
      : baseTimeline.filter(item => item.date === selectedDate);

    return [...filtered].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id - b.id;
    });
  }, [baseTimeline, selectedDate]);

  // Handle pending detail jump (e.g. from Magazine moment click on Home page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pending_detail_jump');
      if (raw) {
        localStorage.removeItem('pending_detail_jump');
        const parsed = JSON.parse(raw);
        if (parsed.tab === 'timeline') {
          setActiveTab('timeline');
          if (parsed.date) {
            setSelectedDate(parsed.date);
          } else {
            setSelectedDate('ALL');
          }
          setTimeout(() => {
            const allItems = Object.values(timelineData).flat();
            let match = null;
            if (parsed.imgUrl) {
              match = allItems.find(i => i.img === parsed.imgUrl);
            }
            if (!match && parsed.placeName) {
              match = allItems.find(i => i.place && i.place.includes(parsed.placeName));
            }
            if (!match && parsed.date) {
              match = allItems.find(i => i.date === parsed.date);
            }
            if (match) {
              setExpandedItemId(match.id);
              const el = itemRefs.current[match.id];
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 350);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, [trip?.id, timelineData]);

  // Helper to determine the best starting spot index for Playlog
  const getPlaylogStartIndex = () => {
    const items = cinematicItemsRef.current;
    if (items.length === 0) return 0;

    const currentExpandedId = expandedItemIdRef.current;

    // 1. 직접 선택된 타임라인 스팟인 경우
    if (currentExpandedId !== null) {
      const directIdx = items.findIndex(i => i.id === currentExpandedId);
      if (directIdx !== -1) {
        return directIdx;
      }

      // 2. 포토 탭 사진 또는 핀(500000대)이 선택된 경우
      const selectedPhoto = allGalleryImages.find(g => g.id === currentExpandedId);
      if (selectedPhoto && selectedPhoto.date) {
        const photoTimeMin = selectedPhoto.time ? parseTimeToMinutes(selectedPhoto.time) : 0;
        const sameDateItems = items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.dateKey === selectedPhoto.date);

        if (sameDateItems.length > 0) {
          if (selectedPhoto.time) {
            let bestIdx = sameDateItems[0].idx;
            let minDiff = Infinity;
            for (const { item, idx } of sameDateItems) {
              const itemMin = parseTimeToMinutes(item.time);
              const diff = Math.abs(itemMin - photoTimeMin);
              if (diff < minDiff) {
                minDiff = diff;
                bestIdx = idx;
              }
            }
            return bestIdx;
          } else {
            return sameDateItems[0].idx;
          }
        }
      }
    }

    // 2. 선택 비활성화(null) 시에는 날짜 필터와 무관하게 무조건 처음(0)부터 재생
    return 0;
  };

  const isCinematicModeRef = useRef(isCinematicMode);
  isCinematicModeRef.current = isCinematicMode;

  const isCinematicPausedRef = useRef(isCinematicPaused);
  isCinematicPausedRef.current = isCinematicPaused;

  const cinematicItemsRef = useRef(cinematicItems);
  cinematicItemsRef.current = cinematicItems;

  const cinematicIndexRef = useRef(cinematicIndex);
  cinematicIndexRef.current = cinematicIndex;

  const expandedItemIdRef = useRef(expandedItemId);
  expandedItemIdRef.current = expandedItemId;

  const currentTimelineRef = useRef(currentTimeline);
  currentTimelineRef.current = currentTimeline;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handleStartPlaylog = () => {
    const items = cinematicItemsRef.current;
    if (items.length === 0) return;
    if (activeTabRef.current !== 'gallery') {
      setActiveTab('timeline');
    }
    const startIndex = getPlaylogStartIndex();
    setCinematicIndex(startIndex);
    setIsCinematicMode(true);
    setIsCinematicPaused(false);
  };

  // Keyboard shortcut listener for Detail Page (Capture-phase with real-time Refs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. If Lightbox is open, delegate all keyboard shortcuts to Lightbox component
      if (isLightboxOpen) return;

      // 1. mapConfirm shortcut: Y (confirm) / N or Escape (cancel)
      if (mapConfirm) {
        if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          e.stopPropagation();
          setMapConfirm(null);
          return;
        }
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          window.open(mapConfirm.url, '_blank', 'noopener,noreferrer');
          setMapConfirm(null);
          return;
        }
      }

      // 2. Ignore single-key shortcuts if user is currently typing in an input, textarea, select or contenteditable
      const target = e.target as HTMLElement | null;
      if (target && (
        target.closest('input, textarea, select, [contenteditable="true"]') ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      )) {
        return;
      }

      // De-focus buttons on keyboard shortcut to avoid double-toggle / virtual click
      if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
      }

      // Escape: exit cinematic mode
      if (e.key === 'Escape') {
        if (isCinematicModeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setIsCinematicMode(false);
          return;
        }
      }

      // 3. Space / P / K shortcut: Play / Pause toggle or start playback
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'p' || e.key === 'P' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        e.stopPropagation();
        if (!isCinematicModeRef.current) {
          handleStartPlaylog();
        } else {
          setIsCinematicPaused(prev => !prev);
        }
        return;
      }

      // 4. ArrowLeft / ArrowRight shortcut: Move previous / next spot (사용자 지정: 플레이로그 재생 시 좌우 버튼으로 스팟 이동)
      if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.key === 'ArrowRight' || e.code === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const isRight = e.key === 'ArrowRight' || e.code === 'ArrowRight';
        const cItems = cinematicItemsRef.current;
        const cTimeline = currentTimelineRef.current;

        if (isCinematicModeRef.current && cItems.length > 0) {
          setCinematicIndex(prev => {
            const nextIdx = isRight 
              ? (prev + 1) % cItems.length 
              : (prev - 1 + cItems.length) % cItems.length;
            return nextIdx;
          });
        } else if (cTimeline.length > 0) {
          const currentIdx = cTimeline.findIndex(item => item.id === expandedItemIdRef.current);
          let targetIdx = 0;
          if (currentIdx === -1) {
            targetIdx = isRight ? 0 : cTimeline.length - 1;
          } else {
            targetIdx = isRight ? currentIdx + 1 : currentIdx - 1;
            if (targetIdx < 0) targetIdx = 0;
            if (targetIdx >= cTimeline.length) targetIdx = cTimeline.length - 1;
          }
          const targetItem = cTimeline[targetIdx];
          if (targetItem) {
            setExpandedItemId(targetItem.id);
            scrollToTimelineItemSafe(targetItem.id, 'center');
          }
        }
        return;
      }

      // 5. PageUp / PageDown shortcut: Pure page scroll up / down without window horizontal displacement (사용자 지정: 평소대로 스크롤 업다운)
      if (e.key === 'PageUp' || e.code === 'PageUp' || e.key === 'PageDown' || e.code === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        const isDown = e.key === 'PageDown' || e.code === 'PageDown';
        if (tabContentRef.current) {
          const scrollDistance = (tabContentRef.current.clientHeight || 500) * 0.8;
          tabContentRef.current.scrollBy({
            top: isDown ? scrollDistance : -scrollDistance,
            behavior: 'smooth'
          });
        }
        return;
      }

      // 6. ArrowUp / ArrowDown shortcut: Navigate timeline items vertically
      if (e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.key === 'ArrowDown' || e.code === 'ArrowDown') {
        const cTimeline = currentTimelineRef.current;
        const cItems = cinematicItemsRef.current;
        if (cTimeline.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const isDown = e.key === 'ArrowDown' || e.code === 'ArrowDown';
          const currentIdx = cTimeline.findIndex(item => item.id === expandedItemIdRef.current);
          let targetIdx = 0;
          if (currentIdx === -1) {
            targetIdx = isDown ? 0 : cTimeline.length - 1;
          } else {
            targetIdx = isDown ? currentIdx + 1 : currentIdx - 1;
            if (targetIdx < 0) targetIdx = 0;
            if (targetIdx >= cTimeline.length) targetIdx = cTimeline.length - 1;
          }
          const targetItem = cTimeline[targetIdx];
          if (targetItem) {
            setExpandedItemId(targetItem.id);
            if (isCinematicModeRef.current && cItems.length > 0) {
              const cIdx = cItems.findIndex(i => i.id === targetItem.id);
              if (cIdx !== -1) {
                setCinematicIndex(cIdx);
              }
            }
            scrollToTimelineItemSafe(targetItem.id, 'center');
          }
        }
      }

      // 7. F key: Toggle browser fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        e.stopPropagation();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [mapConfirm, isLightboxOpen, allGalleryImages, selectedDate, scrollToTimelineItemSafe]);

  const mapPoints = useMemo(() => {
    // Collect gallery photo points that have valid coordinates
    const galleryMetaImages = (tripToUse?.gallery || []).map(img => {
      if (typeof img === 'string') return { url: img };
      return img;
    });

    const photoPoints: any[] = [];
    galleryMetaImages.forEach((imgMeta, idx) => {
      if (imgMeta.lat !== undefined && imgMeta.lng !== undefined && imgMeta.lat !== null && imgMeta.lng !== null) {
        if (imgMeta.excludeFromMap) return;
        const dayIndex = imgMeta.date ? allTripDates.indexOf(imgMeta.date) + 1 : 0;
        photoPoints.push({
          id: 500000 + idx, // unique ID offset for photo pins
          place: imgMeta.place || '사진 위치',
          lat: Number(imgMeta.lat),
          lng: Number(imgMeta.lng),
          time: imgMeta.time || '12:00 PM', // Fallback time if none
          date: imgMeta.date || '',
          memo: imgMeta.imgNote || '갤러리 사진',
          isPhoto: true,
          photoUrl: imgMeta.url,
          dayIndex
        });
      }
    });

    if (activeTab === 'timeline') {
      const timelinePoints = currentTimeline
        .filter(item => !item.excludeFromMap)
        .map(item => {
          const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
          return {
            ...item,
            lat: item.lat !== undefined && item.lat !== null ? Number(item.lat) : undefined,
            lng: item.lng !== undefined && item.lng !== null ? Number(item.lng) : undefined,
            dayIndex
          };
        });

      // Add photo points if they match the selectedDate (or ALL)
      const visiblePhotoPoints = photoPoints.filter(p => {
        if (selectedDate === 'ALL') return true;
        return p.date === selectedDate;
      });

      // Combine and sort by date first, then by time
      const combined = [...timelinePoints, ...visiblePhotoPoints];
      combined.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return combined;
    } else if (activeTab === 'gallery') {
      // Use the outer timelinePhotoPoints (which contains all photo points unfiltered)
      const allPhotoPoints = [...photoPoints, ...timelinePhotoPoints];
      // 플레이로그(시네마틱 모드) 진행 중일 때는 타임라인 스팟도 지도에 포함하여 여행자 마커 및 경로 완벽 지원
      if (isCinematicMode) {
        const timelinePoints = currentTimeline
          .filter(item => !item.excludeFromMap && item.lat !== undefined && item.lat !== null && item.lng !== undefined && item.lng !== null)
          .map(item => ({
            ...item,
            lat: Number(item.lat),
            lng: Number(item.lng),
            dayIndex: item.date ? allTripDates.indexOf(item.date) + 1 : 0
          }));
        const existingIds = new Set(allPhotoPoints.map(p => p.id));
        timelinePoints.forEach(p => {
          if (!existingIds.has(p.id)) {
            allPhotoPoints.push(p);
          }
        });
      }
      // Sort photos by date first, then by time to construct chronological photo paths
      allPhotoPoints.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return allPhotoPoints;
    } else if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      const flightPoints: any[] = [];
      flightsToUse.forEach(f => {
        const fromVal = airportCoords[f.fromCode] || airportGeocodedCoords[f.fromCode];
        const toVal = airportCoords[f.toCode] || airportGeocodedCoords[f.toCode];
        
        if (fromVal) {
          flightPoints.push({
            id: f.id * 10,
            place: f.fromCode,
            lat: fromVal.lat,
            lng: fromVal.lng,
            time: f.fromTime,
            memo: `${f.flightNo} Departure from ${f.fromCode}`
          });
        }
        if (toVal) {
          flightPoints.push({
            id: f.id * 10 + 1,
            place: f.toCode,
            lat: toVal.lat,
            lng: toVal.lng,
            time: f.toTime,
            memo: `${f.flightNo} Arrival at ${f.toCode}`
          });
        }
      });
      return flightPoints;
    } else if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      const stayPoints: any[] = [];
      staysToUse.forEach(s => {
        const coords = stayCoords[s.id];
        if (coords) {
          stayPoints.push({
            id: s.id,
            place: s.title,
            lat: coords.lat,
            lng: coords.lng,
            time: '',
            memo: s.address
          });
        }
      });
      return stayPoints;
    } else if (activeTab === 'transit') {
      const transitsToUse = isEditing ? draftTransits : transits;
      const transitPoints: any[] = [];
      transitsToUse.forEach(t => {
        const ticketLower = (t.ticketType || '').toLowerCase();
        const titleLower = (t.title || '').toLowerCase();
        const isCar = (t.transitType === 'car' || t.transitType === 'taxi') ||
          ticketLower.includes('car') || ticketLower.includes('렌트') || ticketLower.includes('렌터') || ticketLower.includes('rent') || ticketLower.includes('taxi') || ticketLower.includes('택시') ||
          titleLower.includes('렌트') || titleLower.includes('렌터') || titleLower.includes('rent') || titleLower.includes('car');
        const resolvedType = isCar ? 'car' : (t.transitType || 'train');

        if (t.departLat !== undefined && t.departLng !== undefined) {
          transitPoints.push({
            id: t.id * 10,
            place: t.departPlace || 'Departure',
            lat: t.departLat,
            lng: t.departLng,
            time: t.time || '',
            memo: `${t.title || 'Transit'} - Departure from ${t.departPlace || ''}`,
            type: 'transit_depart',
            transitId: t.id,
            transitType: resolvedType
          });
        }
        if (t.arriveLat !== undefined && t.arriveLng !== undefined) {
          transitPoints.push({
            id: t.id * 10 + 1,
            place: t.arrivePlace || 'Arrival',
            lat: t.arriveLat,
            lng: t.arriveLng,
            time: '',
            memo: `${t.title || 'Transit'} - Arrival at ${t.arrivePlace || ''}`,
            type: 'transit_arrive',
            transitId: t.id,
            transitType: resolvedType
          });
        }

      });
      return transitPoints;
    }
    // summary 탭: 타임라인 전체 좌표를 마커로 전달해 지도에 도시 핀이 찍히도록
    if (activeTab === 'summary') {
      const allTimelinePoints = baseTimeline
        .filter(item => item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null && !item.excludeFromMap)
        .map(item => {
          const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
          return {
            ...item,
            lat: Number(item.lat),
            lng: Number(item.lng),
            dayIndex
          };
        });
      return allTimelinePoints;
    }
    return [];
  }, [tripToUse?.gallery, allTripDates, activeTab, currentTimeline, selectedDate, timelinePhotoPoints, isCinematicMode, isEditing, draftFlights, flights, airportCoords, airportGeocodedCoords, draftStays, stays, stayCoords, draftTransits, transits, baseTimeline]);

  // Center active date tab in top sticky date bar (Container-isolated scrollTo, prevents window horizontal shift)
  useEffect(() => {
    if (!dateBarRef.current) return;
    const dateBarContainer = dateBarRef.current;
    const activeBtn = dateBarContainer.querySelector('[data-active="true"]') as HTMLElement;
    if (activeBtn) {
      const targetScrollLeft = activeBtn.offsetLeft - (dateBarContainer.clientWidth / 2) + (activeBtn.clientWidth / 2);
      dateBarContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
  }, [selectedDate]);

  const handleItemToggle = (id: number) => {
    let targetId = id;
    if (activeTab === 'flights' || activeTab === 'transit') {
      targetId = Math.floor(id / 10);
    }

    // Check if it's a gallery photo click or timeline photo click from the map
    if (targetId >= 500000 && targetId < 600000) {
      setActiveTab('gallery');
    } else if (targetId >= 600000000 && targetId < 700000000) {
      setActiveTab('gallery');
    }

    setExpandedItemId(prevId => prevId === targetId ? null : targetId);

    // Sync cinematic player spot
    if (cinematicItems.length > 0) {
      const targetIdx = cinematicItems.findIndex(i => i.id === targetId);
      if (targetIdx !== -1) {
        setCinematicIndex(targetIdx);
      }
    }

    if (expandedItemId !== targetId && itemRefs.current[targetId]) {
      setTimeout(() => {
        itemRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleJumpToTimelineItem = (itemId: number, date: string) => {
    setActiveTab('timeline');
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate('ALL');
    }
    setExpandedItemId(itemId);
    setTimeout(() => {
      const el = itemRefs.current[itemId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  const handleAddTimelineItemRelativeTo = (relativeId: number, position: 'above' | 'below') => {
    if (!trip) return;
    const sorted = [...currentTimeline];
    const targetIdx = sorted.findIndex(item => item.id === relativeId);
    if (targetIdx === -1) return;
    const targetItem = sorted[targetIdx];

    const targetMin = parseTimeToMinutes(targetItem.time);
    let newMin = targetMin;

    if (position === 'above') {
      const prevSameDay = targetIdx > 0 && sorted[targetIdx - 1].date === targetItem.date ? sorted[targetIdx - 1] : null;
      if (prevSameDay) {
        const prevMin = parseTimeToMinutes(prevSameDay.time);
        newMin = Math.round((prevMin + targetMin) / 2);
        if (Math.abs(prevMin - targetMin) <= 1) {
          newMin = targetMin - 5;
        }
      } else {
        newMin = targetMin - 30;
      }
    } else {
      const nextSameDay = targetIdx < sorted.length - 1 && sorted[targetIdx + 1].date === targetItem.date ? sorted[targetIdx + 1] : null;
      if (nextSameDay) {
        const nextMin = parseTimeToMinutes(nextSameDay.time);
        newMin = Math.round((targetMin + nextMin) / 2);
        if (Math.abs(targetMin - nextMin) <= 1) {
          newMin = targetMin + 5;
        }
      } else {
        newMin = targetMin + 30;
      }
    }

    newMin = Math.max(0, Math.min(1439, newMin));
    const newTimeStr = minutesToTimeStr(newMin);

    const newId = Date.now();
    const newItem: TimelineItem = {
      id: newId,
      time: newTimeStr,
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: targetItem.date,
      tripId: trip.id
    };

    recordHistory();
    setDraftTimeline(prev => {
      const copy = [...prev];
      const targetDraftIdx = copy.findIndex(item => item.id === relativeId);
      if (targetDraftIdx !== -1) {
        const insertIdx = position === 'above' ? targetDraftIdx : targetDraftIdx + 1;
        copy.splice(insertIdx, 0, newItem);
      } else {
        copy.push(newItem);
      }
      return copy;
    });

    setExpandedItemId(newId);

    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  // Draft update helpers
  const updateTimelineItem = (id: number, field: keyof TimelineItem, value: any) => {
    setDraftTimeline(prev => 
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  // Atomic multi-field update — avoids race condition when calling updateTimelineItem multiple times
  const updateTimelineItemFields = (id: number, fields: Partial<TimelineItem>) => {
    setDraftTimeline(prev =>
      prev.map(item => item.id === id ? { ...item, ...fields } : item)
    );
  };

  const uploadTimelineImageFile = async (itemId: number, file: File) => {
    const user = auth.currentUser;
    if (!user) {
      alert("이미지를 업로드하려면 로그인이 필요합니다.");
      return;
    }
    try {
      const gps = await extractGpsFromImage(file);
      const compressedBlob = await compressImage(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `users/public/images/${Date.now()}_${safeName}`;
      const downloadUrl = await uploadFileToR2(compressedBlob, storagePath);

      if (gps) {
        let addr = '';
        try {
          addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
        } catch (e) {
          console.warn(e);
        }
        const currentItem = draftTimelineRef.current.find((t: any) => t.id === itemId);
        updateTimelineItemFields(itemId, {
          img: downloadUrl,
          lat: gps.lat,
          lng: gps.lng,
          location: addr || currentItem?.location,
          place: addr ? addr.split(',')[0].trim() : currentItem?.place
        });
      } else {
        updateTimelineItemFields(itemId, { img: downloadUrl });
      }
    } catch (err) {
      console.error("Paste image upload failed:", err);
      alert("이미지 업로드에 실패했습니다.");
    }
  };

  // Global Ctrl+V / Cmd+V paste handler for active timeline item
  useEffect(() => {
    if (!isEditing || activeTab !== 'timeline' || expandedItemId === null) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await uploadTimelineImageFile(expandedItemId, file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isEditing, activeTab, expandedItemId]);


  // Frequent places helpers
  const toggleFrequentPlace = (item: TimelineItem) => {
    const exists = frequentPlaces.some(p => p.place === item.place);
    let updated;
    if (exists) {
      updated = frequentPlaces.filter(p => p.place !== item.place);
    } else {
      updated = [
        ...frequentPlaces,
        {
          place: item.place,
          location: item.location || '',
          hours: item.hours || '',
          lat: item.lat !== undefined ? Number(item.lat) : 0,
          lng: item.lng !== undefined ? Number(item.lng) : 0
        }
      ];
    }
    setFrequentPlaces(updated);
    localStorage.setItem('frequentPlaces', JSON.stringify(updated));
  };

  const isFrequent = (place: string) => {
    return frequentPlaces.some(p => p.place === place);
  };

  const handleSelectFrequent = (item: TimelineItem, fp: typeof frequentPlaces[0]) => {
    updateTimelineItemFields(item.id, {
      place: fp.place,
      location: fp.location || '',
      hours: fp.hours || '',
      lat: fp.lat,
      lng: fp.lng
    });
    setActivePlaceInputId(null);
  };

  const handleToggleExcludeFromMap = async (item: TimelineItem) => {
    const newExclude = !item.excludeFromMap;
    if (isEditing) {
      updateTimelineItem(item.id, 'excludeFromMap', newExclude);
    } else {
      if (!isLoggedIn) {
        alert('로그인 후 지도의 표시 상태를 변경할 수 있습니다.');
        return;
      }
      try {
        const itemRef = doc(db, 'users', 'public', 'timeline', String(item.id));
        await setDoc(itemRef, { excludeFromMap: newExclude }, { merge: true });
      } catch (err) {
        console.error("Failed to update excludeFromMap in Firestore:", err);
      }
    }
  };

  const handleAddTimelineItem = (date: string) => {
    const newId = Date.now();

    // 해당 날짜의 기존 일정 중에서 가장 늦은 시간 계산하여 30분 뒤로 기본 지정 (없으면 07:00 AM 기상시간)
    const sameDateItems = (isEditing ? draftTimeline : baseTimeline).filter(item => item.date === date);
    let defaultTime = '07:00 AM';
    if (sameDateItems.length > 0) {
      const sortedTimes = sameDateItems
        .map(item => parseTimeToMinutes(item.time))
        .sort((a, b) => b - a); // 내림차순 정렬
      const maxMinutes = sortedTimes[0];
      const newMinutes = Math.min(1439, maxMinutes + 30);
      defaultTime = minutesToTimeStr(newMinutes);
    }

    const newItem: TimelineItem = {
      id: newId,
      time: defaultTime,
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: date,
      tripId: trip!.id
    };
    recordHistory();
    setDraftTimeline(prev => [...prev, newItem]);
    setExpandedItemId(newId);

    // Scroll and focus newly added item
    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  const handleDeleteTimelineItem = (id: number) => {
    recordHistory();
    setDraftTimeline(prev => prev.filter(item => item.id !== id));
  };

  const handleScrollToDateSection = (direction: 'up' | 'down') => {
    const sections = Array.from(document.querySelectorAll('[data-date-section]')) as HTMLElement[];
    if (sections.length === 0) return;

    const container = dateBarRef.current?.closest('.overflow-y-auto') || window;
    const containerTop = container === window ? 0 : (container as HTMLElement).getBoundingClientRect().top;

    let targetSection: HTMLElement | null = null;

    if (direction === 'down') {
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop > 10) {
          targetSection = section;
          break;
        }
      }
    } else {
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop < -10) {
          targetSection = section;
          break;
        }
      }
    }

    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Draft updates for custom cards
  const updateFlight = (id: number, field: keyof FlightItem, val: string) => {
    setDraftFlights(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };
  const deleteFlight = (id: number) => {
    recordHistory();
    setDraftFlights(prev => prev.filter(f => f.id !== id));
  };
  const handleAddFlight = (title: string) => {
    let defaultFrom = 'ICN';
    let defaultTo = 'KIX';
    let defaultFromTerminal = 'TERMINAL T1';
    let defaultToTerminal = 'TERMINAL T1';
    let defaultPnr = '000000';

    const outbound = draftFlights.find(f => f.title.toUpperCase().includes('OUTBOUND') || f.fromCode !== 'ICN');

    if (title.toUpperCase().includes('INBOUND') && outbound) {
      defaultFrom = outbound.toCode || 'KIX';
      defaultTo = outbound.fromCode || 'ICN';
      defaultFromTerminal = outbound.toTerminal || 'TERMINAL T1';
      defaultToTerminal = outbound.fromTerminal || 'TERMINAL T1';
      defaultPnr = outbound.pnr || '000000';
    } else if (title.toUpperCase().includes('OUTBOUND') && draftFlights.length > 0) {
      const inbound = draftFlights.find(f => f.title.toUpperCase().includes('INBOUND'));
      if (inbound) {
        defaultFrom = inbound.toCode || 'ICN';
        defaultTo = inbound.fromCode || 'KIX';
        defaultFromTerminal = inbound.toTerminal || 'TERMINAL T1';
        defaultToTerminal = inbound.fromTerminal || 'TERMINAL T1';
        defaultPnr = inbound.pnr || '000000';
      }
    } else if (title.toUpperCase().includes('LAYOVER') && draftFlights.length > 0) {
      // Chaining layover flight
      const sortedExisting = [...draftFlights].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.fromTime || '').localeCompare(b.fromTime || '');
      });
      const lastFlight = sortedExisting[sortedExisting.length - 1];
      defaultFrom = lastFlight.toCode || 'ICN';
      defaultTo = lastFlight.fromCode || 'ICN';
      defaultFromTerminal = lastFlight.toTerminal || 'TERMINAL T1';
      defaultToTerminal = lastFlight.fromTerminal || 'TERMINAL T1';
      defaultPnr = lastFlight.pnr || '000000';
    }

    const tripStartDot = minDate ? minDate.replace(/-/g, '.') : '';
    const tripEndDot = maxDate ? maxDate.replace(/-/g, '.') : '';
    let defaultFlightDate = 'YYYY.MM.DD';

    if (title.toUpperCase().includes('INBOUND')) {
      defaultFlightDate = tripEndDot || tripStartDot || 'YYYY.MM.DD';
    } else {
      defaultFlightDate = tripStartDot || 'YYYY.MM.DD';
    }

    const newFlight: FlightItem = {
      id: Date.now(),
      title: title,
      date: defaultFlightDate,
      fromCode: defaultFrom,
      fromTerminal: defaultFromTerminal,
      fromTime: '08:00 AM',
      toCode: defaultTo,
      toTerminal: defaultToTerminal,
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: defaultPnr,
      tripId: trip?.id
    };
    recordHistory();
    setDraftFlights(prev => [...prev, newFlight]);
  };

  const updateStay = (id: number, field: keyof StayItem, val: any) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const updateStayPlace = (id: number, address: string, coords: { lat: number; lng: number } | null) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { 
      ...s, 
      address,
      lat: coords ? coords.lat : undefined,
      lng: coords ? coords.lng : undefined
    } : s));
    if (coords) {
      setStayCoords(prev => ({
        ...prev,
        [id]: coords
      }));
    }
  };
  const deleteStay = (id: number) => {
    recordHistory();
    setDraftStays(prev => prev.filter(s => s.id !== id));
  };
  const handleAddStay = () => {
    const tripStartDot = minDate ? minDate.replace(/-/g, '.') : '';
    const tripEndDot = maxDate ? maxDate.replace(/-/g, '.') : '';

    let stayCheckIn = tripStartDot;
    let stayCheckOut = tripEndDot;

    if (draftStays.length > 0 && tripStartDot && tripEndDot) {
      const parseStayDates = (dr: string) => {
        const parts = dr.split('-').map(p => p.trim());
        if (parts.length >= 2) {
          const matchStart = parts[0].match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
          const matchEnd = parts[1].match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
          return {
            start: matchStart ? matchStart[1] : '',
            end: matchEnd ? matchEnd[1] : ''
          };
        }
        return { start: '', end: '' };
      };

      const existingCheckouts = draftStays
        .map(s => parseStayDates(s.dateRange).end)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      if (existingCheckouts.length > 0) {
        const latestCheckout = existingCheckouts[existingCheckouts.length - 1];
        if (latestCheckout < tripEndDot) {
          stayCheckIn = latestCheckout;
          stayCheckOut = tripEndDot;
        } else {
          stayCheckIn = latestCheckout;
          const [y, m, d] = latestCheckout.split('.').map(Number);
          const nextDay = new Date(y, m - 1, d + 1);
          stayCheckOut = `${nextDay.getFullYear()}.${String(nextDay.getMonth() + 1).padStart(2, '0')}.${String(nextDay.getDate()).padStart(2, '0')}`;
        }
      }
    }

    let nightsCount = 1;
    if (stayCheckIn && stayCheckOut) {
      const d1 = new Date(stayCheckIn.replace(/\./g, '-'));
      const d2 = new Date(stayCheckOut.replace(/\./g, '-'));
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        nightsCount = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    const defaultDateRange = stayCheckIn && stayCheckOut
      ? `${stayCheckIn} - ${stayCheckOut} (${nightsCount} Nights)`
      : 'YYYY.MM.DD - YYYY.MM.DD (0 Nights)';

    const newStay: StayItem = {
      id: Date.now(),
      status: 'BOOKING CONFIRMED',
      title: '새로운 숙소',
      dateRange: defaultDateRange,
      address: '',
      memo: '',
      confNo: 'HTL-0000',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop',
    };
    recordHistory();
    setDraftStays(prev => [...prev, newStay]);
  };

  const updateTransit = (id: number, fieldOrFields: keyof TransitItem | Partial<TransitItem>, val?: any) => {
    setDraftTransits(prev => prev.map(t => {
      if (t.id === id) {
        let updated = { ...t };
        if (typeof fieldOrFields === 'object') {
          updated = { ...updated, ...fieldOrFields };
        } else {
          updated = { ...updated, [fieldOrFields]: val };
        }
        
        // Sync ticketType and transitType
        if (typeof fieldOrFields === 'string') {
          if (fieldOrFields === 'ticketType') {
            const typeUpper = (val || '').toUpperCase();
            if (typeUpper.includes('CAR')) {
              updated.transitType = 'car';
            } else if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        } else {
          if ('ticketType' in fieldOrFields) {
            const typeUpper = (fieldOrFields.ticketType || '').toUpperCase();
            if (typeUpper.includes('CAR')) {
              updated.transitType = 'car';
            } else if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        }
        return updated;
      }
      return t;
    }));
  };
  const deleteTransit = (id: number) => {
    recordHistory();
    setDraftTransits(prev => prev.filter(t => t.id !== id));
  };

  const updateExpenseItem = (
    itemType: 'timeline' | 'flight' | 'stay' | 'transit',
    id: number,
    field: string,
    value: any
  ) => {
    if (itemType === 'timeline') {
      updateTimelineItem(id, field as any, value);
    } else if (itemType === 'flight') {
      updateFlight(id, field as any, value);
    } else if (itemType === 'stay') {
      updateStay(id, field as any, value);
    } else if (itemType === 'transit') {
      updateTransit(id, field as any, value);
    }
  };
  const handleAddTransit = (type: 'train' | 'bus' | 'taxi' | 'car') => {
    const ticketType = type === 'train' ? 'TRAIN TICKET' : type === 'bus' ? 'BUS TICKET' : type === 'car' ? 'RENTAL' : 'TAXI TICKET';
    const title = type === 'train' ? 'Train' : type === 'bus' ? 'Bus' : type === 'car' ? 'Rental' : 'Taxi';
    const route = type === 'car' ? '픽업 장소' : type === 'taxi' ? '출발지 → 도착지' : '출발역 → 도착역';
    const bookingRef = type === 'train' ? 'TRN-000' : type === 'bus' ? 'BUS-000' : type === 'car' ? 'N/A' : 'TX-000';
    const seat = type === 'car' || type === 'taxi' ? 'N/A' : 'Car 0, 00A';

    const newTransit: TransitItem = {
      id: Date.now(),
      ticketType,
      transitType: type,
      date: 'YYYY.MM.DD',
      rentalDropoffDate: type === 'car' ? 'YYYY.MM.DD' : undefined,
      rentalDropoffTime: type === 'car' ? '06:00 PM' : undefined,
      carModel: type === 'car' ? '' : undefined,
      carNumber: type === 'car' ? '' : undefined,
      title,
      route,
      time: type === 'car' ? '10:00 AM' : '12:00 PM',
      seat,
      bookingRef,
      memo: '',
    };
    recordHistory();
    setDraftTransits(prev => [...prev, newTransit]);
  };

  // Gallery actions with image compression + EXIF metadata extraction
  const processGalleryFiles = async (files: FileList | File[]) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인 상태에서만 업로드할 수 있습니다.");
      return;
    }

    setUploadingImage(true);
    try {
      const newEntries: (string | { url: string; date?: string; place?: string })[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // 1. Extract EXIF BEFORE compressing (canvas strips metadata)
        const exif = await readExif(file);
        let exifDate: string | undefined;
        let exifTime: string | undefined;
        let exifPlace: string | undefined;

        if (exif.dateTime) {
          // Format YYYY:MM:DD HH:MM:SS → YYYY.MM.DD
          exifDate = exif.dateTime.slice(0, 10).replace(/:/g, '.');
          exifTime = exif.dateTime.slice(11, 16); // "HH:MM"
        }
        if (exif.latitude !== undefined && exif.longitude !== undefined) {
          try {
            const addr = await fetchAddressFromCoords(exif.latitude, exif.longitude);
            if (addr) exifPlace = addr;
          } catch (_) {/* silently ignore geocoding errors */}
        }

        // 2. Compress and upload
        const compressedBlob = await compressImage(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `users/public/gallery/${Date.now()}_${safeName}`;
        const url = await uploadFileToR2(compressedBlob, storagePath);

        // 3. Build GalleryImageMeta
        const defaultDate = allTripDates[0] || '';
        const finalDate = (exifDate && allTripDates.includes(exifDate)) ? exifDate : defaultDate;

        const newEntry = {
          url,
          date: finalDate,
          time: exifTime || '12:00 PM',
          place: exifPlace || '',
          lat: exif.latitude !== undefined ? exif.latitude : null,
          lng: exif.longitude !== undefined ? exif.longitude : null,
          imgNote: ''
        };
        
        newEntries.push(newEntry);
      }

      if (newEntries.length === 0) return;

      if (isEditing && draftTrip) {
        const currentGallery = draftTrip.gallery || [];
        setDraftTrip({ ...draftTrip, gallery: [...currentGallery, ...newEntries] });
      } else {
        const currentGallery = trip!.gallery || [];
        const updatedGallery = [...currentGallery, ...newEntries];
        await onSave(
          trip!.id,
          { ...trip!, gallery: updatedGallery },
          baseTimeline,
          flights,
          stays,
          transits
        );
      }
    } catch (error) {
      console.error("Gallery image upload failed:", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processGalleryFiles(e.target.files);
    }
  };

  const handleGalleryDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);

    if (isLoggedIn && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (filesArray.length > 0) {
        await processGalleryFiles(filesArray);
      } else {
        alert("이미지 파일만 업로드할 수 있습니다.");
      }
    }
  };

  // Update imgNote on a gallery (non-timeline) image
  const handleUpdateGalleryImageNote = (imageUrl: string, newNote: string) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return item === imageUrl ? { url: item, imgNote: newNote } : item;
        return item.url === imageUrl ? { ...item, imgNote: newNote } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    }
  };

  const handleWeatherChange = (date: string, type: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'stormy' | '', temp: string) => {
    if (!draftTrip) return;
    const currentWeatherData = draftTrip.weatherData || {};
    setDraftTrip({
      ...draftTrip,
      weatherData: {
        ...currentWeatherData,
        [date]: { type, temp }
      }
    });
  };

  const handleRemoveGalleryImage = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Delete actual file from R2
    deleteFileFromR2(imageUrl);

    const filterGallery = (gallery: (string | any)[]) =>
      gallery.filter(item => {
        const itemUrl = typeof item === 'string' ? item : item.url;
        return itemUrl !== imageUrl;
      });

    if (isEditing && draftTrip) {
      const currentGallery = draftTrip.gallery || [];
      setDraftTrip({ ...draftTrip, gallery: filterGallery(currentGallery) });
    } else {
      const currentGallery = trip!.gallery || [];
      const updatedGallery = filterGallery(currentGallery);
      await onSave(
        trip!.id,
        { ...trip!, gallery: updatedGallery },
        baseTimeline,
        flights,
        stays,
        transits
      );
    }
  };
    const handleToggleGalleryImagePin = async (imageUrl: string, exclude: boolean) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return { url: item, excludeFromMap: exclude };
        return item.url === imageUrl ? { ...item, excludeFromMap: exclude } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    } else {
      const currentGallery = trip!.gallery || [];
      const updatedGallery = updateGallery(currentGallery);
      await onSave(
        trip!.id,
        { ...trip!, gallery: updatedGallery },
        baseTimeline,
        flights,
        stays,
        transits
      );
    }
  };

  // Format destinations dynamically: e.g. "Osaka, Kyoto, Japan" -> "JAPAN (OSAKA, KYOTO)"
  const formatDestinations = (locStr?: string) => {
    if (!locStr) return 'NO DESTINATIONS SPECIFIED';
    
    const countries = [
      'japan', 'korea', 'vietnam', 'taiwan', 'thailand', 'singapore', 'usa', 'france', 'italy', 'uk', 'germany', 'spain', 'china',
      '대한민국', '한국', '일본', '베트남', '대만', '태국', '싱가포르', '미국', '프랑스', '이탈리아', '영국', '독일', '스페인', '중국'
    ];
    
    const parts = locStr.split(',').map(p => p.trim());
    const groups: { country: string; cities: string[] }[] = [];
    let currentCities: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const lowerPart = part.toLowerCase();
      
      if (countries.includes(lowerPart)) {
        groups.push({
          country: part.toUpperCase(),
          cities: currentCities.map(c => c.toUpperCase())
        });
        currentCities = [];
      } else {
        currentCities.push(part);
      }
    }
    
    if (currentCities.length > 0) {
      groups.push({
        country: '',
        cities: currentCities.map(c => c.toUpperCase())
      });
    }
    
    const formattedGroups = groups.map(g => {
      if (g.country) {
        if (g.cities.length > 0) {
          return `${g.country} (${g.cities.join(', ')})`;
        }
        return g.country;
      }
      return g.cities.join(', ');
    });
    
    return formattedGroups.join(' · ');
  };

  // Open current journey in Swiss Minimal Calendar Hub
  const handleOpenInCalendar = () => {
    if (trip!.date) {
      const firstDate = trip!.date.split('-')[0].trim().replace(/\./g, '-');
      try {
        sessionStorage.setItem('calendar_target_date', firstDate);
      } catch (_) {}
    }
    onNavigate('calendar');
  };

  // Render Info Header ("여정배너"): Single-line compact top banner with collapsible accordion menu
  const renderInfoHeader = () => (
    <div className="w-full border-b border-black/15 dark:border-white/15 z-20 bg-white/85 dark:bg-[#0A0A0A]/85 backdrop-blur-md transition-colors shrink-0 select-none">
      {/* 1. Compact Banner with Flexible Height (min-h-[52px] sm:min-h-[58px] py-1.5 sm:py-2) */}
      <div className="flex items-center justify-between px-3 md:px-5 min-h-[52px] sm:min-h-[58px] py-1.5 sm:py-2 gap-2">
        {/* Left: Back button + Divider + Issue badge + Title & Date */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => {
              onNavigate('archive');
            }}
            className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <span className="text-black/20 dark:text-white/20 shrink-0">|</span>

          {/* Issue # badge (minimalist) */}
          <span className="hidden md:inline-block bg-black/10 dark:bg-white/15 px-1.5 py-0.5 rounded-[2px] font-mono text-[8.5px] font-extrabold text-black dark:text-white shrink-0">
            #{String((trip!.displayOrder ?? (trip!.id % 99)) + 1).padStart(2, '0')}
          </span>

          {/* Title & Date: 2-tier stacked on both mobile and web for maximal legibility without clipping */}
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <h1 
              onClick={() => {
                setActiveTab(prev => prev === 'summary' ? 'timeline' : 'summary');
                setExpandedItemId(null);
              }}
              className="text-xs sm:text-sm md:text-[15px] font-extrabold uppercase tracking-tight text-black dark:text-white truncate font-satoshi cursor-pointer hover:opacity-75 transition-opacity leading-tight"
              title="클릭하여 여정 요약(Summary) 보기"
            >
              {(trip!.title || '').replace(' (Plan)', '')}
            </h1>

            {/* Date & Destination summary - placed beneath title with clean typography & full visibility */}
            <div className="flex items-center gap-1.5 text-[10.5px] sm:text-xs font-mono font-medium text-black/75 dark:text-white/75 min-w-0 leading-tight mt-0.5">
              <span className="truncate break-keep font-medium">{generateJourneyMessage(trip!.locationStr, trip!.date, generatedDates.length)}</span>
              <button
                type="button"
                onClick={handleOpenInCalendar}
                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white shrink-0 cursor-pointer"
                title="스위스 달력에서 이 여정 확인하기"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Accordion Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Destination Current Local Time Badge (Clean, no 'LOCAL' text) */}
          {destLocalTime && (
            <div className="hidden min-[480px]:flex items-center gap-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono text-[9px] font-bold text-black/70 dark:text-white/70 border border-black/5 dark:border-white/5" title="현지 시각">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{destLocalTime}</span>
            </div>
          )}

          {/* Quick Journey Switcher Button */}
          <button
            onClick={() => {
              setIsSwitcherOpen(true);
              setSwitcherSearch('');
            }}
            className="p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60"
            title="다른 여정으로 바로 이동 (Quick Switcher)"
            aria-label="Switch journey"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>

          {/* Quick Summary Icon Button (Unified Icon on Web & Mobile) */}
          <button
            onClick={() => {
              setActiveTab(prev => prev === 'summary' ? 'timeline' : 'summary');
              setExpandedItemId(null);
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
              activeTab === 'summary'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
            }`}
            title="Summary View (요약 보기)"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Undo / Redo buttons in Edit mode */}
          {isEditing && (
            <div className="flex items-center gap-0.5 mr-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-colors flex items-center justify-center ${
                  canUndo
                    ? 'hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80 cursor-pointer'
                    : 'text-black/25 dark:text-white/25 cursor-not-allowed'
                }`}
                title="실행 취소 (Undo: Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-colors flex items-center justify-center ${
                  canRedo
                    ? 'hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80 cursor-pointer'
                    : 'text-black/25 dark:text-white/25 cursor-not-allowed'
                }`}
                title="다시 실행 (Redo: Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Edit / Done Icon Button (Unified Icon on Web & Mobile) */}
          {isLoggedIn && (
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  handleStartEditing();
                }
              }}
              disabled={saving}
              className={`p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                isEditing
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80'
              }`}
              title={isEditing ? "저장 완료 (Done)" : "여정 편집 (Edit)"}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />)}
            </button>
          )}

          {/* Quick Cover Change Button (Logged in) */}
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                setCoverInputUrl(tripToUse?.img || '');
                setIsCoverModalOpen(true);
              }}
              className="p-1.5 rounded border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80 transition-colors cursor-pointer flex items-center justify-center"
              title="카드 커버 이미지 변경"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Accordion Menu Toggle Button */}
          <button
            onClick={() => setIsBannerMenuOpen(p => !p)}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              isBannerMenuOpen
                ? 'bg-black/10 dark:bg-white/15 text-red-600 dark:text-red-400'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/55 dark:text-white/55'
            }`}
            title="여정 상세 메뉴 토글"
            aria-label="Toggle banner menu"
          >
            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isBannerMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Accordion Dropdown Panel (Shown ONLY when isBannerMenuOpen) */}
      {isBannerMenuOpen && (
        <div className="border-t border-black/10 dark:border-white/10 bg-[#F4F2EC] dark:bg-[#161616] p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200 flex flex-col gap-3 shadow-inner">
          {/* Row 1: Title Input (in Edit mode) or Detailed Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {isEditing && draftTrip ? (
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold block mb-1">Journey Title</span>
                <JourneyTitleInput
                  initialTitle={draftTrip.title}
                  onUpdateTitle={(title) => setDraftTrip(prev => prev ? { ...prev, title } : null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold uppercase text-black dark:text-white font-sans">
                  {trip!.title}
                </span>
              </div>
            )}

            {/* Actions: Cost, Share, Delete */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <button
                onClick={() => {
                  setActiveTab(prev => prev === 'settlement' ? 'timeline' : 'settlement');
                  setExpandedItemId(null);
                }}
                className={`px-2.5 py-1 border rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'settlement'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
                }`}
                title="비용/정산 관리"
              >
                <DollarSign className="w-3 h-3" />
                <span>Cost</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
                title="공유 링크 복사"
              >
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </button>

              <button
                onClick={handleOpenInCalendar}
                className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
                title="달력에서 보기"
              >
                <Calendar className="w-3 h-3" />
                <span>Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCoverInputUrl(tripToUse?.img || '');
                  setIsCoverModalOpen(true);
                }}
                className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
                title="카드 커버 이미지 변경"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Cover</span>
              </button>

              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {isEditing && (
                <button
                  onClick={() => setShowTripDeleteConfirm(true)}
                  className="px-2.5 py-1 border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  title="여정 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Dates & Destinations */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-[9px] sm:text-[10px] font-bold border-t border-black/10 dark:border-white/10 pt-2.5">
            {isEditing && draftTrip ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">Dates:</span>
                  <input
                    type="date"
                    value={parseDateRange(draftTrip.date).start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] text-black dark:text-white rounded border border-black/15 font-mono"
                  />
                  <span>—</span>
                  <input
                    type="date"
                    value={parseDateRange(draftTrip.date).end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] text-black dark:text-white rounded border border-black/15 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">Cities:</span>
                  <div className="flex flex-wrap items-center gap-1 border border-black/15 dark:border-white/15 p-1 bg-white/5 rounded flex-1">
                    {(draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : [])).map((loc, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-white dark:bg-[#222] text-[10px] font-bold px-1.5 py-0.5 border border-black/15 text-black dark:text-white rounded-sm">
                        {loc.name}
                        <button
                          type="button"
                          onClick={() => {
                            const currentLocs = draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : []);
                            const updated = currentLocs.filter((_, i) => i !== idx);
                            setDraftTrip({
                              ...draftTrip,
                              locations: updated,
                              locationStr: updated.map(l => l.name).join(', '),
                              lat: updated[0]?.lat,
                              lng: updated[0]?.lng
                            });
                          }}
                          className="text-red-500 font-bold hover:text-red-700 ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <div className="w-24 md:w-32">
                      <PlaceAutocompleteInput
                        value={detailLocInput}
                        onChange={(val) => setDetailLocInput(val)}
                        onSelectPlace={(name, coords) => {
                          if (name.trim()) {
                            const currentLocs = draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : []);
                            if (!currentLocs.some(loc => loc.name === name.trim())) {
                              const updated = [...currentLocs, { name: name.trim(), lat: coords?.lat, lng: coords?.lng }];
                              setDraftTrip({
                                ...draftTrip,
                                locations: updated,
                                locationStr: updated.map(l => l.name).join(', '),
                                lat: updated[0]?.lat,
                                lng: updated[0]?.lng
                              });
                            }
                            setDetailLocInput('');
                          }
                        }}
                        className="bg-transparent outline-none text-[8px] text-black dark:text-white w-full border-none px-1 py-0.5"
                        placeholder="+ City..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 flex-wrap text-black/70 dark:text-white/70 w-full">
                <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                  {(() => {
                    const planInfo = getUpcomingPlanInfo(trip!);
                    if (planInfo.isPlanOrFuture) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-600/90 text-white font-sans text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <span>PLAN</span>
                          {planInfo.dDayLabel && planInfo.dDayLabel !== 'PLAN' && (
                            <span className="font-mono font-bold opacity-90">· {planInfo.dDayLabel}</span>
                          )}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                    <span>{trip!.date}</span>
                  </span>
                  <span className="text-black/30 dark:text-white/30">•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                    <span className="font-sans font-bold">{formatDestinations(trip!.locationStr)}</span>
                  </span>
                </div>

                {/* 1-Click Smart Booking Shortcut Button */}
                <button
                  type="button"
                  onClick={() => setIsQuickBookingOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/15 dark:border-white/15 text-[10px] font-mono font-bold uppercase tracking-wider text-black dark:text-white transition-all active:scale-[0.98] cursor-pointer"
                  title="항공권 & 숙소 원클릭 스마트 예약 비교"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>SMART BOOKING</span>
                </button>
              </div>
            )}
          </div>

          {/* Row 3: Members & Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 pt-2.5">
            {/* Members */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">
                <Users className="w-3 h-3" /> MEMBERS:
              </span>
              {isEditing && draftTrip ? (
                <div className="flex flex-wrap gap-2 items-center">
                  {(draftTrip.members || []).map(m => (
                    <span key={m} className="luggage-tag group/luggage cursor-default">
                      <span className="luggage-tag-hole" />
                      <span className="font-mono font-bold tracking-tight">{m}</span>
                      <span className="luggage-barcode-strip ml-0.5">
                        <span className="luggage-barcode-bar w-[1px]" />
                        <span className="luggage-barcode-bar w-[2px]" />
                        <span className="luggage-barcode-bar w-[1px]" />
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newMembers = (draftTrip.members || []).filter(x => x !== m);
                          setDraftTrip({ ...draftTrip, members: newMembers });
                        }}
                        className="hover:text-red-500 text-red-600 font-bold text-[10px] ml-1 leading-none"
                        title="삭제"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Member"
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !(draftTrip.members || []).includes(val)) {
                          setDraftTrip({ ...draftTrip, members: [...(draftTrip.members || []), val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="text-[10px] font-bold font-mono border border-black/20 dark:border-white/20 px-2 py-0.5 rounded-sm bg-transparent outline-none w-20 focus:w-28 text-black dark:text-white"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {tripToUse?.members && tripToUse.members.length > 0 ? (
                    tripToUse.members.map((m, idx) => (
                      <span key={m} className="luggage-tag cursor-default" title={`Passenger ${idx + 1}: ${m}`}>
                        <span className="luggage-tag-hole" />
                        <span className="font-mono font-bold tracking-tight">{m}</span>
                        <span className="luggage-barcode-strip ml-0.5">
                          <span className="luggage-barcode-bar w-[1px]" />
                          <span className="luggage-barcode-bar w-[2px]" />
                          <span className="luggage-barcode-bar w-[1px]" />
                          <span className="luggage-barcode-bar w-[1.5px]" />
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="luggage-tag cursor-default" title="Solo Traveler">
                      <span className="luggage-tag-hole" />
                      <span className="font-mono font-bold tracking-tight">SOLO (나)</span>
                      <span className="luggage-barcode-strip ml-0.5">
                        <span className="luggage-barcode-bar w-[1px]" />
                        <span className="luggage-barcode-bar w-[2px]" />
                        <span className="luggage-barcode-bar w-[1px]" />
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return {
    isLoggedIn, trip, timelineData, flights, stays, transits, onSave, onDelete, isDarkMode,
    onNavigate, searchFocusItemId, searchFocusTab, onClearSearchFocus, onEditModeChange, saveRef,
    allTrips, allPlans, isAdmin, activeTab, setActiveTab, visitedTabs, setVisitedTabs,
    detectedCountry, setDetectedCountry, selectedDate, setSelectedDate, collapsedDays,
    setCollapsedDays, expandedItemId, setExpandedItemId, hoveredItemId, setHoveredItemId,
    flashedItemId, setFlashedItemId, showQuickJump, setShowQuickJump, isQuickJumpExpanded,
    setIsQuickJumpExpanded, quickJumpAutoCollapseTimerRef, activeSpyDate, setActiveSpyDate,
    highlightedDateSection, setHighlightedDateSection, quickJumpChipsRef,
    resetQuickJumpCollapseTimer, isSwitcherOpen, setIsSwitcherOpen, switcherSearch,
    setSwitcherSearch, showTripDeleteConfirm, setShowTripDeleteConfirm, costModalItem,
    setCostModalItem, isQuickBookingOpen, setIsQuickBookingOpen, radarItems, setRadarItems,
    activeRadarIndex, setActiveRadarIndex, radarSnoozedUntil, setRadarSnoozedUntil, isRadarMinimized,
    setIsRadarMinimized, radarFocusedSpot, setRadarFocusedSpot, radarRouteTarget,
    setRadarRouteTarget, activeGhostSpotId, setActiveGhostSpotId, isPocketWidgetOpen,
    setIsPocketWidgetOpen, switcherJourneys, isEditing, setIsEditing, draftTrip, setDraftTrip,
    draftTimeline, setDraftTimeline, draftFlights, setDraftFlights, draftStays, setDraftStays,
    draftTransits, setDraftTransits, draftTripRef, draftTimelineRef, draftFlightsRef, draftStaysRef,
    draftTransitsRef, undoStackRef, redoStackRef, canUndo, setCanUndo, canRedo, setCanRedo,
    updateUndoRedoFlags, recordHistory, handleUndo, showSaveSuccessModal, setShowSaveSuccessModal,
    handleRedo, transitSortType, setTransitSortType, mapConfirm, setMapConfirm, handleCopyShareLink,
    isLightboxOpen, setIsLightboxOpen, lightboxIndex, setLightboxIndex, uploadingImage,
    setUploadingImage, isGalleryDragActive, setIsGalleryDragActive, saving, setSaving, draggedItemId,
    setDraggedItemId, galleryViewMode, setGalleryViewMode, galleryColumns, setGalleryColumns,
    collapsedGalleryDays, setCollapsedGalleryDays, detailLocInput, setDetailLocInput,
    showAutosaveModal, setShowAutosaveModal, autosaveTimerRef, selectedItemIds, setSelectedItemIds,
    hiddenMapItemIds, setHiddenMapItemIds, stayCoords, setStayCoords, transitFocusType,
    setTransitFocusType, frequentPlaces, setFrequentPlaces, activePlaceInputId,
    setActivePlaceInputId, tripToUse, defaultCurrency, generatedDates, minDate, maxDate,
    airportGeocodedCoords, setAirportGeocodedCoords, tabContentRef, isCoverModalOpen,
    setIsCoverModalOpen, coverInputUrl, setCoverInputUrl, isCoverUploading, setIsCoverUploading,
    coverFileInputRef, handleUpdateTripCover, handleUploadCoverFile, handlePasteCoverFromClipboard,
    isCinematicMode, setIsCinematicMode, cinematicIndex, setCinematicIndex, isCinematicPaused,
    setIsCinematicPaused, cinematicSpeed, setCinematicSpeed, isMobilePlayCollapsed,
    setIsMobilePlayCollapsed, cinematicStartTimeRef, cinematicRemainingRef, cinematicTimerRef,
    playSwipeStartXRef, copiedSpotId, setCopiedSpotId, mobileSheetSnap, setMobileSheetSnap,
    sheetTouchStartYRef, isBannerMenuOpen, setIsBannerMenuOpen, isPlayFabIdle, setIsPlayFabIdle,
    playFabTimerRef, resetPlayFabIdleTimer, cinematicItems, currentCinematicItem,
    prevCinematicIndexRef, currentCinematicVehicleType, prevSelectedDateRef,
    scrollToTimelineItemSafe, handlePlayFromItem, handleSheetTouchStart, handleSheetTouchEnd,
    destLocalTime, setDestLocalTime, fileInputRef, itemRefs, scrollTargetItemIdRef,
    lastGalleryTapRef, dateBarRef, isDown, hasMovedRef, startX, scrollLeftRef, handleMouseDown,
    handleMouseLeave, handleMouseUp, handleMouseMove, scrollDays, handleDateChange,
    handleDropTimelineItem, handleGenerateDefaultTemplate, handleStartEditing, handleCancel,
    handleSave, triggerAutosave, baseTimeline, allTripDates, dynamicDates, groupedTimelineData,
    calculateNextTimelineTime, handleFocusRadarItemOnMap, handleDirectAddFromPocket,
    handleQuickJumpToDate, handleScrollToTop, galleryMetaImages, timelineImages, allGalleryImages,
    galleryAllMeta, galleryUrlIndexMap, galleryGroups, galleryAllUnique, timelinePhotoPoints,
    currentTimeline, getPlaylogStartIndex, isCinematicModeRef, isCinematicPausedRef,
    cinematicItemsRef, cinematicIndexRef, expandedItemIdRef, currentTimelineRef, activeTabRef,
    handleStartPlaylog, mapPoints, handleItemToggle, handleJumpToTimelineItem,
    handleAddTimelineItemRelativeTo, updateTimelineItem, updateTimelineItemFields,
    uploadTimelineImageFile, toggleFrequentPlace, isFrequent, handleSelectFrequent,
    handleToggleExcludeFromMap, handleAddTimelineItem, handleDeleteTimelineItem,
    handleScrollToDateSection, updateFlight, deleteFlight, handleAddFlight, updateStay,
    updateStayPlace, deleteStay, handleAddStay, updateTransit, deleteTransit, updateExpenseItem,
    handleAddTransit, processGalleryFiles, handleGalleryUpload, handleGalleryDragEnter,
    handleGalleryDragOver, handleGalleryDragLeave, handleGalleryDrop, handleUpdateGalleryImageNote,
    handleWeatherChange, handleRemoveGalleryImage, handleToggleGalleryImagePin, formatDestinations,
    handleOpenInCalendar, renderInfoHeader
  };
}

export type JourneyDetailState = ReturnType<typeof useJourneyDetailState>;
