import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';

// Lazy loaded non-home pages & modals for fast initial load
const ArchiveHubPage = lazy(() => import('./pages/Archive').then(m => ({ default: m.ArchiveHubPage })));
const MapHubPage = lazy(() => import('./pages/MapHub').then(m => ({ default: m.MapHubPage })));
const ManageHubPage = lazy(() => import('./pages/ManageHub').then(m => ({ default: m.ManageHubPage })));
const MagazineHubPage = lazy(() => import('./pages/MagazineHub').then(m => ({ default: m.MagazineHubPage })));
const JourneyDetailPage = lazy(() => import('./pages/Detail').then(m => ({ default: m.JourneyDetailPage })));

const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CreateTripModal = lazy(() => import('./components/CreateTripModal').then(m => ({ default: m.CreateTripModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SearchModal = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const EditTripModal = lazy(() => import('./components/EditTripModal').then(m => ({ default: m.EditTripModal })));
const ConfirmModal = lazy(() => import('./components/ConfirmModal').then(m => ({ default: m.ConfirmModal })));
import { Check, AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchCoordinates } from './utils/googleMapsHelper';
import { resolveTimelinePlaceName, buildDefaultMagazineSections } from './utils/magazineHelper';
import { 
  initialTrips, 
  initialPlans, 
  timelineDataByDate, 
  initialFlightsByTrip, 
  initialStaysByTrip, 
  initialTransitByTrip 
} from './data/mockData';
import { 
  Trip, 
  Plan, 
  TimelineData, 
  TimelineItem, 
  FlightItem, 
  StayItem, 
  TransitItem,
  MagazineMoment,
  MagazineSection,
  MagazineItem,
  MagazineHubConfig,
  ArchiveHubConfig,
  TrashedMagazineSection
} from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';

function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

function applyJourneyOrder<T extends { id: number; displayOrder?: number }>(items: T[]): T[] {
  try {
    const saved = localStorage.getItem('journey_order');
    if (saved) {
      const order: number[] = JSON.parse(saved);
      const idMap = new Map(order.map((id, idx) => [id, idx]));
      return [...items].sort((a, b) => {
        const orderA = idMap.has(a.id) ? idMap.get(a.id)! : (a.displayOrder ?? 999999);
        const orderB = idMap.has(b.id) ? idMap.get(b.id)! : (b.displayOrder ?? 999999);
        return orderA - orderB;
      });
    }
  } catch (_) {}
  return [...items].sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id));
}

const ADMIN_EMAILS = ['gonyisland@google.com'];

function App() {
  const [currentView, setCurrentView] = useState<string>('home'); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('isDarkMode') === 'true';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true' || Boolean(auth.currentUser);
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [adminEmails, setAdminEmails] = useState<string[]>(ADMIN_EMAILS);
  const [magazineMoments, setMagazineMoments] = useState<MagazineMoment[]>(() => {
    try {
      const cached = localStorage.getItem('cached_magazine_moments');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  });
  const [magazineSections, setMagazineSections] = useState<MagazineSection[]>(() => {
    try {
      const cached = localStorage.getItem('cached_magazine_sections');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  });
  const [homeMagazineSectionId, setHomeMagazineSectionId] = useState<string>(() => {
    return localStorage.getItem('home_magazine_section_id') || 'main';
  });
  const [homeMagazineLimit, setHomeMagazineLimit] = useState<number>(() => {
    const saved = localStorage.getItem('home_magazine_limit');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [magazineHubConfig, setMagazineHubConfig] = useState<MagazineHubConfig>(() => {
    try {
      const cached = localStorage.getItem('cached_magazine_hub_config');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {
      mainTitle: 'A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS',
      subtitle: '여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다. 이슈를 선택하여 전체 화보와 이야기를 감상하세요.',
      badgeText: 'CURATED ARCHIVE',
      volumeText: `VOL. ${new Date().getFullYear()}`,
    };
  });
  const [archiveHubConfig, setArchiveHubConfig] = useState<ArchiveHubConfig>(() => {
    try {
      const cached = localStorage.getItem('cached_archive_hub_config');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {
      mainTitle: 'A VISUAL CHRONICLE OF JOURNEYS & TRAVEL ARCHIVES',
      subtitle: '발걸음이 닿았던 모든 도시와 찬란했던 시간의 기록. 엄선된 사진과 함께 지난 여정들을 다시 마주합니다.',
      badgeText: 'JOURNEY ARCHIVE',
      volumeText: `VOL. ${new Date().getFullYear()}`,
    };
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isShareMode, setIsShareMode] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [fadeSplash, setFadeSplash] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [createModalType, setCreateModalType] = useState<'archive' | 'plan'>('archive');
  const [createCountryInitial, setCreateCountryInitial] = useState<string>('');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  // Hydrate from localStorage cache for instant 0ms mobile launch
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem('cached_trips');
      if (cached) return applyJourneyOrder(JSON.parse(cached));
    } catch (_) {}
    return [];
  });
  const [plans, setPlans] = useState<Plan[]>(() => {
    try {
      const cached = localStorage.getItem('cached_plans');
      if (cached) return applyJourneyOrder(JSON.parse(cached));
    } catch (_) {}
    return [];
  });
  const [trashedJourneys, setTrashedJourneys] = useState<Trip[]>([]);
  const [trashedSections, setTrashedSections] = useState<TrashedMagazineSection[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [tripsLoaded, setTripsLoaded] = useState<boolean>(false);
  const [plansLoaded, setPlansLoaded] = useState<boolean>(false);
  
  const [timelineData, setTimelineData] = useState<TimelineData>({});
  const [flightsByTrip, setFlightsByTrip] = useState<{ [id: number]: FlightItem[] }>({});
  const [staysByTrip, setStaysByTrip] = useState<{ [id: number]: StayItem[] }>({});
  const [transitByTrip, setTransitByTrip] = useState<{ [id: number]: TransitItem[] }>({});
  const [homeTitle, setHomeTitle] = useState("Your Personal Travel Magazine.");
  const [homeSubtitle, setHomeSubtitle] = useState("나만의 감성으로 기록하고 보관하는 여행 아카이브.");
  const [heroJourneyIds, setHeroJourneyIds] = useState<number[]>([]);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [heroMediaType, setHeroMediaType] = useState<'image' | 'video'>('image');
  
  const [heroSlideDuration, setHeroSlideDuration] = useState<number>(() => {
    const saved = localStorage.getItem('hero_slide_duration');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [heroAutoSlide, setHeroAutoSlide] = useState<boolean>(true);
  const [marqueeShow, setMarqueeShow] = useState<boolean>(() => {
    const saved = localStorage.getItem('marqueeShow');
    return saved !== null ? saved === 'true' : true;
  });
  const [marqueeMessage, setMarqueeMessage] = useState<string>("🎉 WELCOME TO TRIPGON LOG! PLAN YOUR JOURNEY OR EXPLORE ARCHIVED LOGS.");
  const [marqueeSpeed, setMarqueeSpeed] = useState<number>(30);
  const [homeGradientEnabled, setHomeGradientEnabled] = useState<boolean>(() => localStorage.getItem('home_gradient_enabled') === 'true');
  const [homeGradientFrom, setHomeGradientFrom] = useState<string>(() => localStorage.getItem('home_gradient_from') || '#F7F2EB');
  const [homeGradientTo, setHomeGradientTo] = useState<string>(() => localStorage.getItem('home_gradient_to') || '#E7DEC8');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchFocusItemId, setSearchFocusItemId] = useState<number | null>(null);
  const [searchFocusTab, setSearchFocusTab] = useState<string | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState<boolean>(false);
  const [isManageDirty, setIsManageDirty] = useState<boolean>(false);
  const [marqueeOverrideText, setMarqueeOverrideText] = useState<string | null>(null);
  const [showSaveCompleteModal, setShowSaveCompleteModal] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ view: string; tripId: number | null } | null>(null);
  const detailSaveRef = useRef<((showModal?: boolean) => Promise<void>) | null>(null);
  const manageSaveRef = useRef<((showModal?: boolean) => Promise<void>) | null>(null);
  const postSaveNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postSaveNavTargetRef = useRef<{ view: string; tripId: number | null } | null>(null);
  // settingsLoaded: true once Firestore settings/home listener fires (prevents premature hydration)
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  const handleCloseSaveCompleteModal = () => {
    setShowSaveCompleteModal(false);
    if (postSaveNavTimerRef.current) {
      clearTimeout(postSaveNavTimerRef.current);
      postSaveNavTimerRef.current = null;
    }
    if (postSaveNavTargetRef.current) {
      const { view, tripId } = postSaveNavTargetRef.current;
      postSaveNavTargetRef.current = null;
      navigateTo(view, tripId, true, null, true);
    }
  };

  const handleSaveAndNavigate = async () => {
    setShowUnsavedModal(false);
    try {
      if (isDetailEditing && detailSaveRef.current) {
        await detailSaveRef.current(false);
      }
      if (isManageDirty && manageSaveRef.current) {
        await manageSaveRef.current(false);
      }
    } catch (err) {
      console.warn("Save before navigation error:", err);
    }
    setShowSaveCompleteModal(true);
    if (pendingNavigation) {
      const { view, tripId } = pendingNavigation;
      setPendingNavigation(null);
      setIsDetailEditing(false);
      setIsManageDirty(false);
      postSaveNavTargetRef.current = { view, tripId };
      postSaveNavTimerRef.current = setTimeout(() => {
        postSaveNavTimerRef.current = null;
        postSaveNavTargetRef.current = null;
        navigateTo(view, tripId, true, null, true);
      }, 2000);
    }
  };

  const handleDiscardAndNavigate = () => {
    setShowUnsavedModal(false);
    setIsDetailEditing(false);
    setIsManageDirty(false);
    if (pendingNavigation) {
      const { view, tripId } = pendingNavigation;
      setPendingNavigation(null);
      navigateTo(view, tripId, true, null, true);
    }
  };

  const handleCancelUnsavedModal = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

  const currentUserEmail = auth.currentUser?.email?.toLowerCase() || '';
  const isGuest = currentUserEmail.startsWith('guest') || currentUserEmail.includes('guest') || Boolean(auth.currentUser?.isAnonymous);
  // Guest accounts can only edit journeys, while admin accounts (including other admin accounts) have full hub management rights
  const isAdmin = isLoggedIn && !isGuest;

  // Global shortcuts: Ctrl+K (Search), F (Fullscreen)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Search shortcut Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // 2. Ignore single-key shortcuts if user is currently typing
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      // 3. F key: Toggle Fullscreen across whole app
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Redirect non-admin if they try to access Management Hub
  useEffect(() => {
    if (currentView === 'manage' && (!isLoggedIn || !isAdmin)) {
      alert("관리자(Admin) 계정만 Management Hub를 이용할 수 있습니다. 여정은 상세 페이지에서 편집하실 수 있습니다.");
      navigateTo('home', null, true);
    }
  }, [currentView, isLoggedIn, isAdmin]);

  // activeTrip: strictly match activeTripId. Do not automatically fall back to trips[0]
  // to avoid rendering one trip's map with another trip's details during sync.
  const activeTrip = trips.find(t => String(t.id) === String(activeTripId)) 
    || plans.find(p => String(p.id) === String(activeTripId)) 
    || undefined;

  const displayMarqueeText = useMemo(() => {
    let text = "";
    if (marqueeOverrideText) {
      text = marqueeOverrideText;
    } else if (currentView === 'detail' && activeTrip) {
      const tagsStr = (activeTrip.tags || [])
        .filter(t => t !== 'Plan' && t !== 'Personal')
        .map(t => `#${t}`)
        .join(' ');

      const title = (activeTrip.title || '').replace(' (Plan)', '').toUpperCase();
      const location = activeTrip.locationStr.toUpperCase();
      const duration = activeTrip.date;

      // Extract flight details
      const tripFlights = flightsByTrip[activeTrip.id] || [];
      const flightInfo = tripFlights
        .map(f => `${f.fromCode} ➔ ${f.toCode} (${f.flightNo})`)
        .join(', ');

      // Extract stay details
      const tripStays = staysByTrip[activeTrip.id] || [];
      const stayInfo = tripStays
        .map(s => s.title)
        .join(', ');

      text = `✈️ ${title} • 📍 ${location} • 📅 ${duration}`;
      if (flightInfo) text += ` • 🛫 ${flightInfo}`;
      if (stayInfo) text += ` • 🏨 ${stayInfo}`;
      if (tagsStr) text += ` • ${tagsStr.toUpperCase()}`;
    } else {
      text = marqueeMessage || '';
    }

    const repeated = Array(6).fill(text).join('   ★   ');
    return `${repeated}   ★   `;
  }, [marqueeOverrideText, currentView, activeTrip, marqueeMessage, flightsByTrip, staysByTrip]);

  const marqueeTrips = useMemo(() => {
    if (trips.length === 0) return [];
    let list = [...trips];
    while (list.length < 10) {
      list = [...list, ...trips];
    }
    return list;
  }, [trips]);

  // Sync activeTripId with trips[0]?.id if it is null and trips have loaded
  useEffect(() => {
    if (activeTripId === null && trips.length > 0) {
      setActiveTripId(trips[0].id);
    }
  }, [trips, activeTripId]);

  useEffect(() => {
    if (!isLoggedIn) setIsEditMode(false);
  }, [isLoggedIn]);

  // Sync isDarkMode to html element classlist for Tailwind dark: modifiers and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Firestore seeding script (stores all mock data under 'public')
  const seedUserData = async (uid: string = 'public') => {
    const tripsRef = collection(db, 'users', uid, 'trips');
    const tripsSnapshot = await getDocs(tripsRef);
    if (!tripsSnapshot.empty) {
      return; // already has data
    }

    const batch = writeBatch(db);

    initialTrips.forEach(trip => {
      batch.set(doc(db, 'users', uid, 'trips', String(trip.id)), trip);
    });

    initialPlans.forEach(plan => {
      batch.set(doc(db, 'users', uid, 'plans', String(plan.id)), plan);
    });

    Object.entries(timelineDataByDate).forEach(([date, items]) => {
      items.forEach(item => {
        batch.set(doc(db, 'users', uid, 'timeline', String(item.id)), { ...item, date, tripId: 1 });
      });
    });

    Object.entries(initialFlightsByTrip).forEach(([tripId, items]) => {
      items.forEach(item => {
        batch.set(doc(db, 'users', uid, 'flights', String(item.id)), { ...item, tripId: Number(tripId) });
      });
    });

    Object.entries(initialStaysByTrip).forEach(([tripId, items]) => {
      items.forEach(item => {
        batch.set(doc(db, 'users', uid, 'stays', String(item.id)), { ...item, tripId: Number(tripId) });
      });
    });

    Object.entries(initialTransitByTrip).forEach(([tripId, items]) => {
      items.forEach(item => {
        batch.set(doc(db, 'users', uid, 'transits', String(item.id)), { ...item, tripId: Number(tripId) });
      });
    });

    await batch.commit();
  };

  // Real-time Firestore sync pointing to public path by default
  useEffect(() => {
    const uid = 'public';

    const unsubTrips = onSnapshot(collection(db, 'users', uid, 'trips'), (snapshot) => {
      const list: Trip[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Trip);
      });
      const ordered = applyJourneyOrder(list);
      setTrips(ordered);
      setTripsLoaded(true);
      setDbError(null);
      try {
        localStorage.setItem('cached_trips', JSON.stringify(ordered));
      } catch (_) {}
    }, (err) => {
      console.error("Trips snapshot subscription error:", err);
      setDbError(err.message);
      setTripsLoaded(true);
    });

    const unsubPlans = onSnapshot(collection(db, 'users', uid, 'plans'), (snapshot) => {
      const list: Plan[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Plan);
      });
      const ordered = applyJourneyOrder(list);
      setPlans(ordered);
      setPlansLoaded(true);
      setDbError(null);
      try {
        localStorage.setItem('cached_plans', JSON.stringify(ordered));
      } catch (_) {}
    }, (err) => {
      console.error("Plans snapshot subscription error:", err);
      setDbError(err.message);
      setPlansLoaded(true);
    });

    const unsubTimeline = onSnapshot(collection(db, 'users', uid, 'timeline'), (snapshot) => {
      const grouped: TimelineData = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date as string;
        if (!grouped[date]) grouped[date] = [];
        const { date: _, ...item } = data;
        grouped[date].push({ ...item, date } as TimelineItem);
      });
      Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.id - b.id);
      });
      setTimelineData(grouped);
      setDbError(null);
    }, (err) => {
      console.error("Timeline snapshot subscription error:", err);
      setDbError(err.message);
    });

    const unsubFlights = onSnapshot(collection(db, 'users', uid, 'flights'), (snapshot) => {
      const grouped: { [tripId: number]: FlightItem[] } = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const tripId = data.tripId as number;
        if (!grouped[tripId]) grouped[tripId] = [];
        const { tripId: _, ...item } = data;
        grouped[tripId].push(item as FlightItem);
      });
      Object.keys(grouped).forEach(tid => {
        grouped[Number(tid)].sort((a, b) => a.id - b.id);
      });
      setFlightsByTrip(grouped);
      setDbError(null);
    }, (err) => {
      console.error("Flights snapshot subscription error:", err);
      setDbError(err.message);
    });

    const unsubStays = onSnapshot(collection(db, 'users', uid, 'stays'), (snapshot) => {
      const grouped: { [tripId: number]: StayItem[] } = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const tripId = data.tripId as number;
        if (!grouped[tripId]) grouped[tripId] = [];
        const { tripId: _, ...item } = data;
        grouped[tripId].push(item as StayItem);
      });
      Object.keys(grouped).forEach(tid => {
        grouped[Number(tid)].sort((a, b) => a.id - b.id);
      });
      setStaysByTrip(grouped);
      setDbError(null);
    }, (err) => {
      console.error("Stays snapshot subscription error:", err);
      setDbError(err.message);
    });

    const unsubTransit = onSnapshot(collection(db, 'users', uid, 'transits'), (snapshot) => {
      const grouped: { [tripId: number]: TransitItem[] } = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const tripId = data.tripId as number;
        if (!grouped[tripId]) grouped[tripId] = [];
        const { tripId: _, ...item } = data;
        grouped[tripId].push(item as TransitItem);
      });
      Object.keys(grouped).forEach(tid => {
        grouped[Number(tid)].sort((a, b) => a.id - b.id);
      });
      setTransitByTrip(grouped);
      setDbError(null);
    }, (err) => {
      console.error("Transit snapshot subscription error:", err);
      setDbError(err.message);
    });

    const unsubTrash = onSnapshot(collection(db, 'users', uid, 'trash'), (snapshot) => {
      const journeyList: Trip[] = [];
      const sectionList: TrashedMagazineSection[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.deletedType === 'magazine_section' || (data.items && data.id && typeof data.id === 'string' && !data.locationStr && !data.tags)) {
          sectionList.push(data as TrashedMagazineSection);
        } else {
          journeyList.push(data as Trip);
        }
      });
      setTrashedJourneys(journeyList.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)));
      setTrashedSections(sectionList.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)));
    }, (err) => {
      console.error("Trash snapshot subscription error:", err);
    });

    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'settings', 'home'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.title) setHomeTitle(data.title);
        if (data.subtitle) setHomeSubtitle(data.subtitle);
        if (Array.isArray(data.heroJourneyIds)) setHeroJourneyIds(data.heroJourneyIds);
        if (data.heroAutoSlide !== undefined) setHeroAutoSlide(data.heroAutoSlide);
        if (data.heroMediaType !== undefined) setHeroMediaType(data.heroMediaType);
        if (data.marqueeShow !== undefined) setMarqueeShow(data.marqueeShow);
        if (data.marqueeMessage !== undefined) setMarqueeMessage(data.marqueeMessage);
        if (data.marqueeSpeed !== undefined) setMarqueeSpeed(data.marqueeSpeed);
        if (data.heroSlideDuration !== undefined) {
          setHeroSlideDuration(data.heroSlideDuration);
          localStorage.setItem('hero_slide_duration', String(data.heroSlideDuration));
        }
        if (data.homeMagazineSectionId !== undefined) {
          setHomeMagazineSectionId(data.homeMagazineSectionId);
          localStorage.setItem('home_magazine_section_id', data.homeMagazineSectionId);
        }
        if (data.homeMagazineLimit !== undefined) {
          setHomeMagazineLimit(data.homeMagazineLimit);
          localStorage.setItem('home_magazine_limit', String(data.homeMagazineLimit));
        }
        if (data.magazineHubConfig && typeof data.magazineHubConfig === 'object') {
          setMagazineHubConfig(data.magazineHubConfig);
          try {
            localStorage.setItem('cached_magazine_hub_config', JSON.stringify(data.magazineHubConfig));
          } catch (_) {}
        }
        if (data.archiveHubConfig && typeof data.archiveHubConfig === 'object') {
          setArchiveHubConfig(data.archiveHubConfig);
          try {
            localStorage.setItem('cached_archive_hub_config', JSON.stringify(data.archiveHubConfig));
          } catch (_) {}
        }
        if (Array.isArray(data.magazineSections) && data.magazineSections.length > 0) {
          setMagazineSections(data.magazineSections);
          try {
            localStorage.setItem('cached_magazine_sections', JSON.stringify(data.magazineSections));
          } catch (_) {}
          const targetSec = data.magazineSections.find((s: any) => s.id === (data.homeMagazineSectionId || 'main')) || data.magazineSections[0];
          if (targetSec && Array.isArray(targetSec.items)) {
            setMagazineMoments(targetSec.items);
            try {
              localStorage.setItem('cached_magazine_moments', JSON.stringify(targetSec.items));
            } catch (_) {}
          }
        } else if (Array.isArray(data.magazineMoments) && data.magazineMoments.length > 0) {
          setMagazineMoments(data.magazineMoments);
          try {
            localStorage.setItem('cached_magazine_moments', JSON.stringify(data.magazineMoments));
          } catch (_) {}
        }
        if (data.homeGradientEnabled !== undefined) {
          setHomeGradientEnabled(data.homeGradientEnabled);
          localStorage.setItem('home_gradient_enabled', String(data.homeGradientEnabled));
        }
        if (data.homeGradientFrom) {
          setHomeGradientFrom(data.homeGradientFrom);
          localStorage.setItem('home_gradient_from', data.homeGradientFrom);
        }
        if (data.homeGradientTo) {
          setHomeGradientTo(data.homeGradientTo);
          localStorage.setItem('home_gradient_to', data.homeGradientTo);
        }
      }
      // Always mark settings as loaded, even if doc doesn't exist (prevents premature hydration)
      setSettingsLoaded(true);
    }, (err) => {
      console.error("Settings snapshot subscription error:", err);
      // Still mark as loaded on error, so hydration can proceed with fallback
      setSettingsLoaded(true);
    });

    const unsubAdmin = onSnapshot(doc(db, 'users', uid, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.allowedAdmins)) {
          setAdminEmails(Array.from(new Set([...ADMIN_EMAILS, ...data.allowedAdmins.map((e: string) => String(e).toLowerCase().trim())])));
        }
      }
    }, (err) => {
      console.warn("Admin snapshot subscription notice:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      unsubTrips();
      unsubPlans();
      unsubTimeline();
      unsubFlights();
      unsubStays();
      unsubTransit();
      unsubTrash();
      unsubSettings();
      unsubAdmin();
    };
  }, []);

  // Sync real-time homeConfigChanged events (gradient / limits)
  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e?.detail?.gradientEnabled !== undefined) {
        setHomeGradientEnabled(Boolean(e.detail.gradientEnabled));
      }
      if (e?.detail?.gradientFrom) setHomeGradientFrom(e.detail.gradientFrom);
      if (e?.detail?.gradientTo) setHomeGradientTo(e.detail.gradientTo);
    };
    window.addEventListener('homeConfigChanged', handleConfigChange);
    return () => window.removeEventListener('homeConfigChanged', handleConfigChange);
  }, []);

  // Auto-seed if database is empty when admin logs in
  useEffect(() => {
    if (isLoggedIn && trips.length === 0 && plans.length === 0) {
      seedUserData('public');
    }
  }, [isLoggedIn, trips.length, plans.length]);

  // Auto-sync magazine moments with latest timeline data (Strict image/ID match & closest prior location)
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!magazineSections || magazineSections.length === 0 || Object.keys(timelineData).length === 0) return;

    const allTimelineItems: TimelineItem[] = [];
    Object.values(timelineData).forEach(items => {
      if (Array.isArray(items)) {
        allTimelineItems.push(...items);
      }
    });
    if (allTimelineItems.length === 0) return;

    let hasDifferences = false;
    const syncedSections = magazineSections.map(sec => {
      let secChanged = false;
      const syncedItems = (sec.items || []).map(m => {
        if (!m.tripId) return m;

        // Strict 1:1 match by timelineItemId, matching photo URL, or trip+date+title smart match
        let match: TimelineItem | undefined;
        if (m.timelineItemId !== undefined) {
          match = allTimelineItems.find(t => 
            Number(t.tripId) === Number(m.tripId) && 
            (Number(t.id) === Number(m.timelineItemId) || String(t.id) === String(m.timelineItemId))
          );
        }
        if (!match && m.img) {
          match = allTimelineItems.find(t => 
            Number(t.tripId) === Number(m.tripId) && 
            t.img && 
            (t.img === m.img || t.img.split('?')[0] === m.img.split('?')[0])
          );
        }
        if (!match && m.tripId && m.date && m.title) {
          const cleanTitle = m.title.trim().toLowerCase();
          match = allTimelineItems.find(t =>
            Number(t.tripId) === Number(m.tripId) &&
            t.date === m.date &&
            t.place && t.place.trim().toLowerCase() === cleanTitle
          );
        }

        if (match) {
          const parentTrip = trips.find(trip => Number(trip.id) === Number(m.tripId)) || plans.find(plan => Number(plan.id) === Number(m.tripId));
          const tripTimeline = allTimelineItems.filter(t => Number(t.tripId) === Number(m.tripId));
          const resolvedPlace = resolveTimelinePlaceName(match, tripTimeline, parentTrip);
          const newImg = match.img || m.img;
          const newTitle = match.place || m.title;
          const newDate = match.date || m.date;

          if (
            m.img !== newImg ||
            m.title !== newTitle ||
            m.placeName !== resolvedPlace ||
            m.date !== newDate ||
            m.timelineItemId !== match.id
          ) {
            secChanged = true;
            hasDifferences = true;
            return {
              ...m,
              timelineItemId: match.id,
              img: newImg,
              title: newTitle,
              placeName: resolvedPlace,
              date: newDate,
            };
          }
        }
        return m;
      });

      if (secChanged) {
        return { ...sec, items: syncedItems };
      }
      return sec;
    });

    if (hasDifferences) {
      setMagazineSections(syncedSections);
      const mainSec = syncedSections.find(s => s.id === 'main') || syncedSections[0];
      if (mainSec && mainSec.items) {
        setMagazineMoments(mainSec.items);
      }
      if (isLoggedIn && isAdmin) {
        setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
          magazineSections: cleanForFirestore(syncedSections),
          magazineMoments: cleanForFirestore(mainSec?.items || []),
        }, { merge: true }).catch((e) => console.warn('Background magazine sync persistence notice:', e));
      }
    }
  }, [settingsLoaded, timelineData, magazineSections?.length, isLoggedIn, isAdmin, trips, plans]);

  // Hydrate default magazine sections ONLY after Firestore settings have responded and magazineSections is still empty
  useEffect(() => {
    if (!settingsLoaded) return; // Wait for Firestore settings/home listener to fire first
    if (trips.length > 0 && (!magazineSections || magazineSections.length === 0)) {
      const defaults = buildDefaultMagazineSections(trips, magazineMoments.length > 0 ? magazineMoments : undefined);
      setMagazineSections(defaults);
      try {
        localStorage.setItem('cached_magazine_sections', JSON.stringify(defaults));
      } catch (_) {}
    }
  }, [settingsLoaded, trips, magazineSections?.length]);

  // Sync state with browser History API and parse share param on initial load
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const shareParam = params.get('share');

    let initialView = 'home';
    let initialTripId: number | null = null;
    const isShare = shareParam === 'true';

    if (isShare && idParam) {
      initialView = 'detail';
      initialTripId = Number(idParam);
      setIsShareMode(true);
    } else {
      if (path === '/archive' || window.location.hash === '#archive' || path === '/plan' || window.location.hash === '#plan') {
        initialView = 'archive';
      } else if (path === '/map' || window.location.hash === '#map') {
        initialView = 'map';
      } else if (path === '/manage' || window.location.hash === '#manage') {
        initialView = 'manage';
      } else if (path === '/magazine' || window.location.hash === '#magazine') {
        initialView = 'magazine';
      } else if (path === '/detail' || idParam) {
        initialView = 'detail';
        if (idParam) {
          initialTripId = Number(idParam);
        }
      } else {
        const lastView = sessionStorage.getItem('lastView');
        if (lastView && ['home', 'archive', 'map', 'manage', 'magazine'].includes(lastView)) {
          initialView = lastView;
        }
      }
    }

    if (initialTripId) {
      setActiveTripId(initialTripId);
    }
    setCurrentView(initialView);
    window.history.replaceState({ view: initialView, tripId: initialTripId, isShare }, '', window.location.pathname + window.location.search);

    // Splash screen timers
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 1200);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Listen to popstate events for browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (isDetailEditing || isManageDirty) {
        // Lock page transition and show unsaved changes modal
        window.history.pushState({ view: currentView, tripId: activeTripId }, '', window.location.pathname + window.location.search);
        if (state && state.view) {
          setPendingNavigation({ view: state.view, tripId: state.tripId || null });
        } else {
          setPendingNavigation({ view: 'home', tripId: null });
        }
        setShowUnsavedModal(true);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      setIsShareMode(params.get('share') === 'true');

      if (state && state.view) {
        if (state.tripId) {
          setActiveTripId(state.tripId);
        }
        setCurrentView(state.view);
      } else {
        const path = window.location.pathname;
        if (path === '/magazine' || window.location.hash === '#magazine') {
          setCurrentView('magazine');
        } else if (path === '/archive' || window.location.hash === '#archive') {
          setCurrentView('archive');
        } else if (path === '/map' || window.location.hash === '#map') {
          setCurrentView('map');
        } else if (path === '/manage' || window.location.hash === '#manage') {
          setCurrentView('manage');
        } else {
          setCurrentView('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDetailEditing, isManageDirty, currentView, activeTripId]);

  const navigateTo = (view: string, tripId: number | null = null, pushHistory = true, tagFilter: string | null = null, force = false) => {
    if (!force && (isDetailEditing || isManageDirty) && (view !== 'detail' || (tripId !== null && tripId !== activeTripId))) {
      setPendingNavigation({ view, tripId });
      setShowUnsavedModal(true);
      return;
    }

    if (view !== 'detail') {
      setIsShareMode(false);
    }

    const effectiveView = view === 'plan' ? 'archive' : view;
    if (tripId) setActiveTripId(tripId);
    if (effectiveView === 'magazine' && (!tagFilter || tagFilter === null)) {
      try {
        sessionStorage.setItem('magazineViewMode', 'hub');
      } catch (_) {}
    }
    setCurrentView(effectiveView);
    setSelectedTagFilter(tagFilter);

    // Always scroll to top when changing views
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    sessionStorage.setItem('lastView', effectiveView);
    if (tripId || activeTripId) {
      sessionStorage.setItem('lastTripId', String(tripId || activeTripId));
    }

    if (pushHistory) {
      let path = '/';
      if (effectiveView === 'archive') path = '/archive';
      else if (effectiveView === 'magazine') path = '/magazine';
      else if (effectiveView === 'map') path = '/map';
      else if (effectiveView === 'manage') path = '/manage';
      else if (effectiveView === 'detail') {
        const idToUse = tripId || activeTripId;
        const isShare = (effectiveView === 'detail' && (tripId === activeTripId || tripId === null || tripId === idToUse)) ? isShareMode : false;
        path = idToUse ? `/detail?id=${idToUse}${isShare ? '&share=true' : ''}` : '/detail';
      }
      window.history.pushState({ 
        view: effectiveView, 
        mode: effectiveView === 'magazine' ? 'hub' : undefined, 
        tripId: tripId || activeTripId 
      }, '', path);
    }
  };

  const handleSearchResultClick = (tripId: number, tabId: string, itemId: number | null) => {
    setActiveTripId(tripId);
    setSearchFocusTab(tabId);
    setSearchFocusItemId(itemId);
    navigateTo('detail', tripId);
  };

  const handleUpdateTrip = async (tripId: number, field: string, value: any) => {
    if (!isLoggedIn) return;
    const isPlan = plans.some(p => p.id === tripId);
    const collectionName = isPlan ? 'plans' : 'trips';
    try {
      await setDoc(doc(db, 'users', 'public', collectionName, String(tripId)), {
        [field]: value
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating trip:", err);
      alert("정보 저장에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleMoveToArchive = async (plan: Plan) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");

    const planRef = doc(db, 'users', 'public', 'plans', String(plan.id));
    const tripRef = doc(db, 'users', 'public', 'trips', String(plan.id));

    const cleanTags = (plan.tags || []).filter(t => t !== 'Plan' && t !== 'Archived');
    const cleanTitle = (plan.title || '').replace(/\s*\(Plan\)$/i, '').trim();

    const newTrip: any = { 
      ...plan, 
      title: cleanTitle, 
      tags: cleanTags,
    };
    delete newTrip.isPlan;

    try {
      const batch = writeBatch(db);
      batch.delete(planRef);
      batch.set(tripRef, cleanForFirestore(newTrip));
      await batch.commit();

      setPlans(prev => prev.filter(p => String(p.id) !== String(plan.id)));
      setTrips(prev => [...prev.filter(t => String(t.id) !== String(plan.id)), newTrip as Trip]);
    } catch (err: any) {
      console.error("Error moving plan to archive:", err);
      alert("로그(여정)로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleMoveToPlans = async (trip: Trip) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");

    const tripRef = doc(db, 'users', 'public', 'trips', String(trip.id));
    const planRef = doc(db, 'users', 'public', 'plans', String(trip.id));

    const cleanTags = (trip.tags || []).filter(t => t !== 'Archived');
    if (!cleanTags.includes('Plan')) {
      cleanTags.push('Plan');
    }
    const cleanTitle = trip.title.endsWith(' (Plan)') ? trip.title : `${trip.title} (Plan)`;

    const newPlan: any = { 
      ...trip, 
      title: cleanTitle, 
      tags: cleanTags,
      isPlan: true,
    };

    try {
      const batch = writeBatch(db);
      batch.delete(tripRef);
      batch.set(planRef, cleanForFirestore(newPlan));
      await batch.commit();

      setTrips(prev => prev.filter(t => String(t.id) !== String(trip.id)));
      setPlans(prev => [...prev.filter(p => String(p.id) !== String(trip.id)), newPlan as Plan]);
    } catch (err: any) {
      console.error("Error moving trip to plans:", err);
      alert("플랜으로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleCloneJourney = async (tripId: number) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    const oldTrip = trips.find(t => t.id === tripId);
    const oldPlan = plans.find(p => p.id === tripId);
    const oldJourney = oldTrip || oldPlan;
    if (!oldJourney) return alert("여정을 찾을 수 없습니다.");

    const newId = Date.now();
    const isPlan = !!oldPlan;
    const collectionName = isPlan ? 'plans' : 'trips';

    const clonedJourney = {
      ...oldJourney,
      id: newId,
      title: `${oldJourney.title} (복제)`,
      displayOrder: (oldJourney.displayOrder ?? 0) + 1,
    };

    try {
      const uid = 'public';
      
      // Parallelize fetching child items from Firestore
      const [timelineSnap, flightsSnap, staysSnap, transitsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users', uid, 'timeline'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'flights'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'stays'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'transits'), where('tripId', '==', tripId)))
      ]);

      const batch = writeBatch(db);

      // 1. Write the cloned main document
      batch.set(doc(db, 'users', uid, collectionName, String(newId)), cleanForFirestore(clonedJourney));

      // 2. Clone timeline items
      timelineSnap.forEach(dSnap => {
        const item = dSnap.data();
        const newSubId = Date.now() + Math.floor(Math.random() * 100000);
        batch.set(doc(db, 'users', uid, 'timeline', String(newSubId)), cleanForFirestore({
          ...item,
          id: newSubId,
          tripId: newId
        }));
      });

      // 3. Clone flights
      flightsSnap.forEach(dSnap => {
        const item = dSnap.data();
        const newSubId = Date.now() + Math.floor(Math.random() * 100000);
        batch.set(doc(db, 'users', uid, 'flights', String(newSubId)), cleanForFirestore({
          ...item,
          id: newSubId,
          tripId: newId
        }));
      });

      // 4. Clone stays
      staysSnap.forEach(dSnap => {
        const item = dSnap.data();
        const newSubId = Date.now() + Math.floor(Math.random() * 100000);
        batch.set(doc(db, 'users', uid, 'stays', String(newSubId)), cleanForFirestore({
          ...item,
          id: newSubId,
          tripId: newId
        }));
      });

      // 5. Clone transits
      transitsSnap.forEach(dSnap => {
        const item = dSnap.data();
        const newSubId = Date.now() + Math.floor(Math.random() * 100000);
        batch.set(doc(db, 'users', uid, 'transits', String(newSubId)), cleanForFirestore({
          ...item,
          id: newSubId,
          tripId: newId
        }));
      });

      await batch.commit();
      alert("여정이 성공적으로 복제되었습니다.");
    } catch (err: any) {
      console.error("Error cloning journey:", err);
      alert("여정 복제에 실패했습니다.");
    }
  };

  const handleSaveSettings = async (
    title: string,
    subtitle: string,
    heroIds: number[],
    autoSlide?: boolean,
    showMarquee?: boolean,
    marqueeMsg?: string,
    marqueeSpd?: number,
    heroMediaTypeParam?: 'image' | 'video',
    magazineMomentsParam?: MagazineMoment[],
    heroSlideDurationParam?: number,
    gradientEnabledParam?: boolean,
    gradientFromParam?: string,
    gradientToParam?: string,
    homeMagazineSectionIdParam?: string,
    homeMagazineLimitParam?: number,
    magazineSectionsParam?: MagazineSection[]
  ) => {
    if (!isLoggedIn) return;
    try {
      const dataToSave: any = {
        title,
        subtitle,
        heroJourneyIds: heroIds,
        heroAutoSlide: autoSlide ?? heroAutoSlide,
        heroMediaType: heroMediaTypeParam ?? heroMediaType,
        marqueeShow: showMarquee ?? marqueeShow,
        marqueeMessage: marqueeMsg ?? marqueeMessage,
        marqueeSpeed: marqueeSpd ?? marqueeSpeed,
        heroSlideDuration: heroSlideDurationParam ?? heroSlideDuration,
        homeGradientEnabled: gradientEnabledParam !== undefined ? gradientEnabledParam : homeGradientEnabled,
        homeGradientFrom: gradientFromParam !== undefined ? gradientFromParam : homeGradientFrom,
        homeGradientTo: gradientToParam !== undefined ? gradientToParam : homeGradientTo,
      };

      if (magazineMomentsParam !== undefined) {
        dataToSave.magazineMoments = cleanForFirestore(magazineMomentsParam);
      }
      if (homeMagazineSectionIdParam !== undefined) {
        dataToSave.homeMagazineSectionId = homeMagazineSectionIdParam;
      }
      if (homeMagazineLimitParam !== undefined) {
        dataToSave.homeMagazineLimit = homeMagazineLimitParam;
      }
      if (magazineSectionsParam !== undefined && Array.isArray(magazineSectionsParam) && magazineSectionsParam.length > 0) {
        dataToSave.magazineSections = cleanForFirestore(magazineSectionsParam);
      }

      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), cleanForFirestore(dataToSave), { merge: true });

      setHeroJourneyIds(heroIds);
      if (autoSlide !== undefined) setHeroAutoSlide(autoSlide);
      if (heroMediaTypeParam !== undefined) setHeroMediaType(heroMediaTypeParam);
      if (showMarquee !== undefined) setMarqueeShow(showMarquee);
      if (marqueeMsg !== undefined) setMarqueeMessage(marqueeMsg);
      if (marqueeSpd !== undefined) setMarqueeSpeed(marqueeSpd);
      if (heroSlideDurationParam !== undefined) {
        setHeroSlideDuration(heroSlideDurationParam);
        localStorage.setItem('hero_slide_duration', String(heroSlideDurationParam));
      }
      if (magazineMomentsParam !== undefined) {
        setMagazineMoments(magazineMomentsParam);
      }
      if (magazineSectionsParam !== undefined && Array.isArray(magazineSectionsParam) && magazineSectionsParam.length > 0) {
        setMagazineSections(magazineSectionsParam);
        try {
          localStorage.setItem('cached_magazine_sections', JSON.stringify(magazineSectionsParam));
        } catch (_) {}
      }
      if (homeMagazineSectionIdParam !== undefined) {
        setHomeMagazineSectionId(homeMagazineSectionIdParam);
        localStorage.setItem('home_magazine_section_id', homeMagazineSectionIdParam);
      }
      if (homeMagazineLimitParam !== undefined) {
        setHomeMagazineLimit(homeMagazineLimitParam);
        localStorage.setItem('home_magazine_limit', String(homeMagazineLimitParam));
      }
      if (gradientEnabledParam !== undefined) {
        setHomeGradientEnabled(gradientEnabledParam);
        localStorage.setItem('home_gradient_enabled', String(gradientEnabledParam));
      }
      if (gradientFromParam !== undefined) {
        setHomeGradientFrom(gradientFromParam);
        localStorage.setItem('home_gradient_from', gradientFromParam);
      }
      if (gradientToParam !== undefined) {
        setHomeGradientTo(gradientToParam);
        localStorage.setItem('home_gradient_to', gradientToParam);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      throw err;
    }
  };

  const handleSaveMagazineMoments = async (moments: MagazineMoment[]) => {
    if (!isLoggedIn || !isAdmin) {
      alert("관리자(Admin)만 잡지 연출 설정을 저장할 수 있습니다.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
        magazineMoments: cleanForFirestore(moments)
      }, { merge: true });
      setMagazineMoments(moments);
      try {
        localStorage.setItem('cached_magazine_moments', JSON.stringify(moments));
      } catch (_) {}
    } catch (err) {
      console.error("Failed to save magazine moments:", err);
      alert("잡지 연출 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveMagazineHubConfig = async (config: MagazineHubConfig) => {
    if (!isLoggedIn || !isAdmin) {
      alert("관리자(Admin)만 매거진 허브 설정을 저장할 수 있습니다.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
        magazineHubConfig: cleanForFirestore(config),
      }, { merge: true });
      setMagazineHubConfig(config);
      try {
        localStorage.setItem('cached_magazine_hub_config', JSON.stringify(config));
      } catch (_) {}
    } catch (err) {
      console.error("Failed to save magazine hub config:", err);
      alert("매거진 허브 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveArchiveHubConfig = async (config: ArchiveHubConfig) => {
    if (!isLoggedIn || !isAdmin) {
      alert("관리자(Admin)만 여정 허브 설정을 저장할 수 있습니다.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
        archiveHubConfig: cleanForFirestore(config),
      }, { merge: true });
      setArchiveHubConfig(config);
      try {
        localStorage.setItem('cached_archive_hub_config', JSON.stringify(config));
      } catch (_) {}
    } catch (err) {
      console.error("Failed to save archive hub config:", err);
      alert("여정 허브 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveMagazineSections = async (sections: MagazineSection[]) => {
    if (!isLoggedIn || !isAdmin) {
      alert("관리자(Admin)만 매거진 설정을 저장할 수 있습니다.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
        magazineSections: cleanForFirestore(sections),
      }, { merge: true });
      setMagazineSections(sections);
      try {
        localStorage.setItem('cached_magazine_sections', JSON.stringify(sections));
      } catch (_) {}
    } catch (err) {
      console.error("Failed to save magazine sections:", err);
      alert("매거진 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleUpdateMagazineSections = (sections: MagazineSection[]) => {
    setMagazineSections(sections);
    try {
      localStorage.setItem('cached_magazine_sections', JSON.stringify(sections));
    } catch (_) {}
  };

  // Helper to generate date list for shifting logic
  const generateDateList = (dateRangeStr: string): string[] => {
    if (!dateRangeStr) return [];
    const parts = dateRangeStr.split(' - ');
    if (parts.length < 2) return [];
    
    const startStr = parts[0].trim().replace(/\./g, '-');
    const rawEndStr = parts[1].trim().replace(/\./g, '-');
    const startYear = startStr.split('-')[0];
    const endStr = rawEndStr.split('-').length < 3 ? `${startYear}-${rawEndStr}` : rawEndStr;
    
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return [];
    }
    
    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const list: string[] = [];
    const cursor = new Date(startDate);
    
    for (let i = 0; i < 100 && cursor <= endDate; i++) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      list.push(`${yyyy}.${mm}.${dd}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    
    return list;
  };

  const handleEditTripSave = async (tripId: number, updatedData: Partial<Trip>) => {
    if (!isLoggedIn) return;
    const isPlan = plans.some(p => String(p.id) === String(tripId));
    const collectionName = isPlan ? 'plans' : 'trips';
    const oldTrip = (isPlan ? plans : trips).find(t => String(t.id) === String(tripId));
    const dateChanged = oldTrip && updatedData.date && oldTrip.date !== updatedData.date;

    try {
      await setDoc(doc(db, 'users', 'public', collectionName, String(tripId)), cleanForFirestore(updatedData), { merge: true });
      
      if (dateChanged && oldTrip && updatedData.date) {
        const oldDates = generateDateList(oldTrip.date);
        const newDates = generateDateList(updatedData.date);
        if (oldDates.length > 0 && newDates.length > 0) {
          const timelineRef = collection(db, 'users', 'public', 'timeline');
          const q = query(timelineRef, where('tripId', '==', tripId));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.forEach(docSnap => {
            const itemData = docSnap.data();
            const oldDate = itemData.date;
            if (oldDate) {
              const idx = oldDates.indexOf(oldDate);
              if (idx !== -1) {
                const newDateVal = newDates[Math.min(idx, newDates.length - 1)];
                batch.update(docSnap.ref, { date: newDateVal });
              }
            }
          });
          await batch.commit();
        }
      }
    } catch (err: any) {
      console.error("Error updating trip cover:", err);
      alert("여정 정보 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleAddArchive = async () => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    setCreateModalType('archive');
    setIsCreateModalOpen(true);
  };

  const handleCreateTripForCountry = (countryName: string) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    setCreateCountryInitial(countryName);
    setCreateModalType('plan');
    setIsCreateModalOpen(true);
  };

  const handleCreateJourney = async (
    title: string,
    dateRange: string,
    location: string,
    tags: string[],
    lat?: number,
    lng?: number,
    members?: string[],
    locations?: { name: string; lat?: number; lng?: number }[],
    statusBadge?: string,
    country?: string
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    const newId = Date.now();
    const img = createModalType === 'archive'
      ? 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop';

    const mapImg = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop';
    const collectionName = createModalType === 'archive' ? 'trips' : 'plans';

    const newJourney: any = {
      id: newId,
      title,
      date: dateRange,
      tags: createModalType === 'plan' ? [...tags, 'Plan'] : tags,
      img,
      mapImg,
      locationStr: location,
      lat,
      lng,
      locations: locations || [],
      gallery: [],
      members: members || [],
      statusBadge: statusBadge || '',
      country: country || ''
    };

    try {
      // 1. Save journey doc immediately with cleanForFirestore to purge undefined values
      await setDoc(doc(db, 'users', 'public', collectionName, String(newId)), cleanForFirestore(newJourney));

      // 2. Generate default template timeline items
      const generateTemplateDays = (): { date: string; items: any[] }[] => {
        const parts = dateRange.split(' - ');
        if (parts.length < 2) return [];
        const parseDate = (s: string) => {
          const d = s.trim().replace(/\./g, '-');
          return new Date(d);
        };
        const startDate = parseDate(parts[0]);
        const rawEnd = parts[1].trim().replace(/\./g, '-');
        const endDateStr = rawEnd.split('-').length < 3
          ? `${parts[0].trim().split('.')[0]}-${rawEnd}`
          : rawEnd;
        const endDate = new Date(endDateStr);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

        const dayList: string[] = [];
        const cur = new Date(startDate);
        for (let i = 0; i < 60 && cur <= endDate; i++) {
          const yyyy = cur.getFullYear();
          const mm = String(cur.getMonth() + 1).padStart(2, '0');
          const dd = String(cur.getDate()).padStart(2, '0');
          dayList.push(`${yyyy}.${mm}.${dd}`);
          cur.setDate(cur.getDate() + 1);
        }

        const totalDays = dayList.length;
        const cityDisplay = location.split(',')[0].trim().toUpperCase();

        return dayList.map((date, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === totalDays - 1;
          const baseId = newId + idx * 100 + 1;
          let items: any[] = [];

          if (isFirst && totalDays === 1) {
            items = [
              { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
              { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
              { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착`,     cost: '-',   memo: '입국 심사 및 현지 이동', date },
              { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 관람`,     cost: '-',   memo: '현지 관광 일정', date },
              { id: baseId + 4, time: '07:00 PM', type: 'transit',  place: '귀국 공항 이동',           cost: '-',   memo: '공항 이동 및 탑승수속', date },
              { id: baseId + 5, time: '09:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
            ];
          } else if (isFirst) {
            items = [
              { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
              { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
              { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착·입국`, cost: '-',   memo: '입국 심사 후 시내 이동', date },
              { id: baseId + 3, time: '02:00 PM', type: 'transit',  place: '시내 교통 이동',           cost: '-',   memo: '숙소까지 이동', date },
              { id: baseId + 4, time: '04:00 PM', type: 'stay',     place: '숙소 체크인',             cost: '-',   memo: '짐 풀고 휴식', date },
              { id: baseId + 5, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 식당 탐방', date },
            ];
          } else if (isLast) {
            items = [
              { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 근처 카페', date },
              { id: baseId + 1, time: '10:00 AM', type: 'stay',     place: '숙소 체크아웃',           cost: '-',   memo: '체크아웃 후 짐 보관', date },
              { id: baseId + 2, time: '11:00 AM', type: 'activity', place: '출발 전 마지막 일정',      cost: '-',   memo: '기념품 구입 등', date },
              { id: baseId + 3, time: '01:00 PM', type: 'transit',  place: '공항 이동',               cost: '-',   memo: '공항 셔틀 또는 대중교통', date },
              { id: baseId + 4, time: '03:00 PM', type: 'transit',  place: '귀국 탑승수속·출국심사',  cost: '-',   memo: '면세점 쇼핑', date },
              { id: baseId + 5, time: '06:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
            ];
          } else {
            items = [
              { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 인근 카페', date },
              { id: baseId + 1, time: '10:00 AM', type: 'activity', place: `${cityDisplay} 오전 관람`, cost: '-',   memo: '주요 명소 방문', date },
              { id: baseId + 2, time: '12:30 PM', type: 'dining',   place: '점심 식사',               cost: '-',   memo: '현지 맛집 방문', date },
              { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 오후 일정`, cost: '-',   memo: '쇼핑, 카페, 문화 체험 등', date },
              { id: baseId + 4, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 레스토랑 저녁', date },
              { id: baseId + 5, time: '09:30 PM', type: 'stay',     place: '숙소 복귀',               cost: '-',   memo: '숙소 휴식', date },
            ];
          }

          return { date, items };
        });
      };

      const templateDays = generateTemplateDays();
      if (templateDays.length > 0) {
        const batch = writeBatch(db);
        templateDays.forEach(({ date, items }) => {
          items.forEach(item => {
            batch.set(doc(db, 'users', 'public', 'timeline', String(item.id)), cleanForFirestore({ ...item, tripId: newId }));
          });
        });
        await batch.commit();
      }

      // Navigate to detail page
      navigateTo('detail', newId);

      // Background geocoding
      fetchCoordinates(location).then(async (coords) => {
        if (coords) {
          try {
            await setDoc(doc(db, 'users', 'public', collectionName, String(newId)), cleanForFirestore({
              lat: coords.lat,
              lng: coords.lng
            }), { merge: true });
          } catch (e) {
            console.error("Failed to update coordinates in background:", e);
          }
        }
      }).catch(err => {
        console.error("Background geocoding failed for new journey:", err);
      });
    } catch (err: any) {
      console.error("Error creating journey:", err);
      alert("여정 생성에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  // --- Core save handler for Detail page Edit/Save ---
  const handleSaveJourneyDetails = async (
    tripId: number,
    updatedTrip: Trip,
    updatedTimeline: TimelineItem[],
    updatedFlights: FlightItem[],
    updatedStays: StayItem[],
    updatedTransits: TransitItem[]
  ) => {
    if (!isLoggedIn) {
      alert('로그인 후 저장할 수 있습니다.');
      return;
    }

    try {
      const uid = 'public';

      // ── 1. Update trip/plan document ──────────────────────────────────────
      const isPlan = plans.some(p => p.id === tripId);
      const collectionName = isPlan ? 'plans' : 'trips';

      // Parallelize fetching existing documents to delete
      const [timelineSnap, flightsSnap, staysSnap, transitsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users', uid, 'timeline'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'flights'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'stays'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'users', uid, 'transits'), where('tripId', '==', tripId)))
      ]);

      // ── 2. Run delete in a single batch ───────────────────────────────────
      const deleteBatch = writeBatch(db);
      timelineSnap.forEach(d => deleteBatch.delete(d.ref));
      flightsSnap.forEach(d => deleteBatch.delete(d.ref));
      staysSnap.forEach(d => deleteBatch.delete(d.ref));
      transitsSnap.forEach(d => deleteBatch.delete(d.ref));
      await deleteBatch.commit();

      // ── 3. Save updated documents in a single batch (with cleanForFirestore) ──
      const saveBatch = writeBatch(db);
      
      // Save Trip document (cleaned)
      saveBatch.set(doc(db, 'users', uid, collectionName, String(tripId)), cleanForFirestore(updatedTrip), { merge: true });

      // Save Timeline items (cleaned)
      updatedTimeline.forEach(item => {
        const { originDate: _, ...cleanItem } = item as any;
        saveBatch.set(doc(db, 'users', uid, 'timeline', String(cleanItem.id)), cleanForFirestore({ ...cleanItem, tripId }));
      });

      // Save Flights (cleaned)
      updatedFlights.forEach(item => {
        saveBatch.set(doc(db, 'users', uid, 'flights', String(item.id)), cleanForFirestore({ ...item, tripId }));
      });

      // Save Stays (cleaned)
      updatedStays.forEach(item => {
        saveBatch.set(doc(db, 'users', uid, 'stays', String(item.id)), cleanForFirestore({ ...item, tripId }));
      });

      // Save Transits (cleaned)
      updatedTransits.forEach(item => {
        saveBatch.set(doc(db, 'users', uid, 'transits', String(item.id)), cleanForFirestore({ ...item, tripId }));
      });

      await saveBatch.commit();

      // ── 4. Auto-sync Magazine Moments and Sections with updated timeline items ──
      const previousTimelineDocs = timelineSnap.docs.map(d => d.data() as TimelineItem);
      const updatedTimelineMap = new Map<number, TimelineItem>();
      updatedTimeline.forEach(item => updatedTimelineMap.set(Number(item.id), item));

      let hasMagazineChanges = false;
      const syncMoment = (m: MagazineMoment): MagazineMoment => {
        if (Number(m.tripId) !== Number(tripId)) return m;

        // 1. Direct match by timelineItemId
        let matched: TimelineItem | undefined;
        if (m.timelineItemId !== undefined && updatedTimelineMap.has(Number(m.timelineItemId))) {
          matched = updatedTimelineMap.get(Number(m.timelineItemId));
        }

        // 2. Match by exact image URL, previous image match, or date+title smart match
        if (!matched && m.img) {
          matched = updatedTimeline.find(t => t.img && (t.img === m.img || t.img.split('?')[0] === m.img.split('?')[0]));
          if (!matched) {
            const prevItem = previousTimelineDocs.find(p => p.img && (p.img === m.img || p.img.split('?')[0] === m.img.split('?')[0]));
            if (prevItem) {
              matched = updatedTimelineMap.get(Number(prevItem.id));
            }
          }
        }
        if (!matched && m.date && m.title) {
          const cleanTitle = m.title.trim().toLowerCase();
          matched = updatedTimeline.find(t =>
            t.date === m.date &&
            t.place && t.place.trim().toLowerCase() === cleanTitle
          );
        }

        if (matched) {
          const resolvedPlace = resolveTimelinePlaceName(matched, updatedTimeline, updatedTrip);
          const newImg = matched.img || m.img;
          const newTitle = matched.place || m.title;
          const newDate = matched.date || m.date;

          if (
            m.img !== newImg ||
            m.title !== newTitle ||
            m.placeName !== resolvedPlace ||
            m.date !== newDate ||
            m.timelineItemId !== matched.id
          ) {
            hasMagazineChanges = true;
            return {
              ...m,
              timelineItemId: matched.id,
              img: newImg,
              title: newTitle,
              placeName: resolvedPlace,
              date: newDate,
            };
          }
        }

        return m;
      };

      const updatedSections = (magazineSections || []).map(sec => {
        let secChanged = false;
        const newItems = (sec.items || []).map(m => {
          const newM = syncMoment(m);
          if (newM !== m) secChanged = true;
          return newM;
        });

        let newHeroImg = sec.heroImg;
        const tripCover = updatedTrip.heroImg || updatedTrip.img;
        if (sec.heroTripId === tripId && tripCover && tripCover !== sec.heroImg) {
          newHeroImg = tripCover;
          secChanged = true;
        }

        if (secChanged) {
          hasMagazineChanges = true;
          return { ...sec, items: newItems, heroImg: newHeroImg };
        }
        return sec;
      });

      const updatedMoments = (magazineMoments || []).map(m => syncMoment(m));

      if (hasMagazineChanges) {
        try {
          const mainSec = updatedSections.find(s => s.id === 'main') || updatedSections[0];
          const mainMoments = mainSec ? (mainSec.items || []) : updatedMoments;
          await setDoc(doc(db, 'users', uid, 'settings', 'home'), {
            magazineSections: cleanForFirestore(updatedSections),
            magazineMoments: cleanForFirestore(mainMoments),
          }, { merge: true });
          setMagazineSections(updatedSections);
          setMagazineMoments(mainMoments);
        } catch (magErr) {
          console.warn("Auto-syncing magazine items failed in background:", magErr);
        }
      }

      setMarqueeOverrideText("🎉 JOURNEY SAVED SUCCESSFULLY!");
      setTimeout(() => {
        setMarqueeOverrideText(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error saving journey details:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      // Provide user-friendly message based on error type
      if (err?.code === 'permission-denied') {
        alert('저장 권한이 없습니다. 로그인 상태를 확인해주세요.');
      } else if (err?.code === 'unavailable') {
        alert('네트워크 연결을 확인해주세요.');
      } else {
        alert(`저장에 실패했습니다. (${err?.code || err?.message || '알 수 없는 오류'})`);
      }
      throw err;
    }
  };

  const handleDeleteJourney = async (tripId: number) => {
    if (!isLoggedIn) return;

    // First confirmation
    const tripToDelete = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
    const journeyTitle = tripToDelete?.title || '이 여정';
    const confirmed = window.confirm(`'${journeyTitle}' 여정을 삭제하시겠습니까?\n\n삭제된 여정은 휴지통(Settings)에서 복구하거나 완전히 삭제할 수 있습니다.`);
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      const isPlan = plans.some(p => p.id === tripId);
      const collectionName = isPlan ? 'plans' : 'trips';
      const tripRef = doc(db, 'users', 'public', collectionName, String(tripId));

      // Move to trash collection with deletedAt timestamp
      const trashedData: Trip = {
        ...(tripToDelete as Trip),
        deletedAt: Date.now(),
        tags: [...((tripToDelete?.tags || []).filter(t => t !== 'Plan')), isPlan ? 'Plan' : 'Archive']
      };
      const trashRef = doc(db, 'users', 'public', 'trash', String(tripId));
      batch.set(trashRef, cleanForFirestore(trashedData));
      batch.delete(tripRef);

      await batch.commit();
      alert(`'${journeyTitle}' 여정이 휴지통으로 이동되었습니다.\n\nSettings > 휴지통에서 복구하거나 완전히 삭제할 수 있습니다.`);
      navigateTo('home');
    } catch (err: any) {
      console.error("Error soft-deleting journey:", err);
      alert("삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleRestoreJourney = async (tripId: number) => {
    if (!isLoggedIn) return;
    const trashed = trashedJourneys.find(t => t.id === tripId);
    if (!trashed) return;

    try {
      const batch = writeBatch(db);
      const isPlan = (trashed.tags || []).includes('Plan');
      const collectionName = isPlan ? 'plans' : 'trips';

      const { deletedAt: _, ...restoredData } = trashed as any;
      const restoreRef = doc(db, 'users', 'public', collectionName, String(tripId));
      const trashRef = doc(db, 'users', 'public', 'trash', String(tripId));

      batch.set(restoreRef, cleanForFirestore(restoredData));
      batch.delete(trashRef);
      await batch.commit();
      alert(`'${trashed.title}' 여정이 성공적으로 복구되었습니다.`);
    } catch (err: any) {
      console.error("Error restoring journey:", err);
      alert("복구에 실패했습니다.");
    }
  };

  const handlePermanentDeleteJourney = async (tripId: number) => {
    if (!isLoggedIn) return;
    const trashed = trashedJourneys.find(t => t.id === tripId);
    const journeyTitle = trashed?.title || '이 여정';

    const confirmed = window.confirm(`'${journeyTitle}' 여정을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다. 모든 타임라인, 비행, 숙소 데이터가 삭제됩니다.`);
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      const trashRef = doc(db, 'users', 'public', 'trash', String(tripId));
      batch.delete(trashRef);

      // Clean timeline items for this trip
      const timelineRef = collection(db, 'users', 'public', 'timeline');
      const timelineSnap = await getDocs(timelineRef);
      timelineSnap.forEach(doc => {
        const data = doc.data();
        if (Number(data.tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const flightsSnap = await getDocs(collection(db, 'users', 'public', 'flights'));
      flightsSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const staysSnap = await getDocs(collection(db, 'users', 'public', 'stays'));
      staysSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const transitsSnap = await getDocs(collection(db, 'users', 'public', 'transits'));
      transitsSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      await batch.commit();
      alert(`'${journeyTitle}' 여정이 영구 삭제되었습니다.`);
    } catch (err: any) {
      console.error("Error permanently deleting journey:", err);
      alert("영구 삭제에 실패했습니다.");
    }
  };

  const handleDeleteMagazineSection = async (sectionId: string) => {
    if (!isLoggedIn || !isAdmin) return;
    const target = magazineSections.find(s => s.id === sectionId);
    if (!target) return;

    try {
      // 1. Move section to trash collection
      const trashedSectionData: TrashedMagazineSection = {
        ...target,
        deletedType: 'magazine_section',
        deletedAt: Date.now()
      };
      await setDoc(doc(db, 'users', 'public', 'trash', `section-${sectionId}`), cleanForFirestore(trashedSectionData));

      // 2. Remove from active sections & save
      const updated = magazineSections.filter(s => s.id !== sectionId).map((s, idx) => ({ ...s, order: idx }));
      await handleSaveMagazineSections(updated);
      alert(`'${target.title}' 매거진 섹션이 휴지통으로 이동되었습니다.\n\n휴지통(TRASH) 탭에서 복원하거나 완전히 삭제할 수 있습니다.`);
    } catch (err) {
      console.error("Error soft-deleting magazine section:", err);
      alert("매거진 섹션 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleRestoreMagazineSection = async (sectionId: string) => {
    if (!isLoggedIn || !isAdmin) return;
    const trashed = trashedSections.find(s => s.id === sectionId || `section-${s.id}` === sectionId);
    if (!trashed) return;

    try {
      const { deletedType: _, deletedAt: __, ...cleanSection } = trashed;
      const docId = trashed.id.startsWith('section-') ? trashed.id : `section-${trashed.id}`;
      
      // 1. Delete from trash
      await deleteDoc(doc(db, 'users', 'public', 'trash', docId));

      // 2. Add to active magazine sections
      const updated = [...magazineSections, { ...cleanSection, order: magazineSections.length }];
      await handleSaveMagazineSections(updated);
      alert(`'${trashed.title}' 매거진 섹션이 성공적으로 복구되었습니다.`);
    } catch (err) {
      console.error("Error restoring magazine section:", err);
      alert("매거진 섹션 복구 중 오류가 발생했습니다.");
    }
  };

  const handlePermanentDeleteMagazineSection = async (sectionId: string) => {
    if (!isLoggedIn || !isAdmin) return;
    const trashed = trashedSections.find(s => s.id === sectionId || `section-${s.id}` === sectionId);
    const title = trashed?.title || '이 매거진 섹션';

    if (!window.confirm(`'${title}' 매거진 섹션을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const docId = trashed ? (trashed.id.startsWith('section-') ? trashed.id : `section-${trashed.id}`) : sectionId;
      await deleteDoc(doc(db, 'users', 'public', 'trash', docId));
      alert(`'${title}' 매거진 섹션이 영구 삭제되었습니다.`);
    } catch (err) {
      console.error("Error permanently deleting magazine section:", err);
      alert("매거진 섹션 영구 삭제에 실패했습니다.");
    }
  };

  // Redirect guest if they try to view a Plan detail page
  useEffect(() => {
    if (currentView === 'detail' && activeTrip) {
      const isPlan = plans.some(p => String(p.id) === String(activeTrip.id));
      if (!isLoggedIn && isPlan) {
        alert("이 계획 여정은 로그인 후 조회할 수 있습니다.");
        navigateTo('home', null, true);
      }
    }
  }, [currentView, activeTrip, isLoggedIn, plans]);

  // Keyboard shortcut listener for SaveComplete and UnsavedChanges modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing in inputs, textareas, or contenteditables
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (showSaveCompleteModal) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          handleCloseSaveCompleteModal();
        }
      } else if (showUnsavedModal) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveAndNavigate();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelUnsavedModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSaveCompleteModal, showUnsavedModal, pendingNavigation]);

  const activeFlights = flightsByTrip[activeTripId || 0] || [];
  const activeStays = staysByTrip[activeTripId || 0] || [];
  const activeTransits = transitByTrip[activeTripId || 0] || [];

  const existingTags = Array.from(
    new Set([...trips, ...plans].flatMap(t => t.tags || []))
  ).filter(t => t !== 'Plan' && t !== 'Personal');

  const isGlobalGradientActive = (currentView === 'home' || currentView === 'archive' || currentView === 'magazine') && homeGradientEnabled && !isDarkMode;
  const isHomeGradientActive = isGlobalGradientActive;
  const appGradientStyle = isGlobalGradientActive
    ? { background: `linear-gradient(135deg, ${homeGradientFrom} 0%, ${homeGradientTo} 100%)` }
    : undefined;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} overflow-x-hidden w-full`}>
      <div 
        style={appGradientStyle}
        className={`min-h-screen ${appGradientStyle ? 'bg-transparent' : 'bg-white dark:bg-[#141414]'} text-black dark:text-white font-sans selection:bg-red-500 selection:text-white transition-colors duration-300 w-full overflow-x-hidden flex flex-col ${(currentView === 'detail' || currentView === 'map') ? 'h-screen overflow-hidden' : ''}`}
      >
        
        {/* Firebase Error/Status Banners */}
        {dbError && (
          <div className="bg-red-500/10 border-b border-red-500/20 backdrop-blur-md px-6 py-3 text-center text-xs tracking-wide text-red-600 dark:text-red-400 font-medium z-50">
            ⚠️ Firebase 연결 오류: {dbError}. Firestore의 보안 규칙(Security Rules)이나 Config 키가 올바른지 확인해 주세요.
          </div>
        )}
        {!dbError && tripsLoaded && plansLoaded && trips.length === 0 && plans.length === 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-6 py-3 text-center text-xs tracking-wide text-amber-700 dark:text-amber-400 font-medium z-50">
            ℹ️ 현재 Firebase(Public 경로)에 데이터가 없습니다. <strong>우측 상단의 로그인 버튼을 통해 로그인해 주시면</strong>, 기존의 기본 목업 데이터가 Firestore로 자동 업로드(Seed)됩니다.
          </div>
        )}

        {/* Global Navigation */}
        <Navigation 
          currentView={currentView}
          navigateTo={navigateTo}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          openAuthModal={(mode) => { setAuthModalMode(mode); setIsAuthModalOpen(true); }}
          openSettingModal={() => setIsManageModalOpen(true)}
          onSearchClick={() => setIsSearchOpen(true)}
          isAdmin={isAdmin}
          isHomeGradientActive={isHomeGradientActive}
        />

        {/* Marquee Banner - Only on Home View */}
        {currentView === 'home' && marqueeShow && (
          <div className="w-full bg-black text-white dark:bg-white dark:text-black border-b border-black dark:border-white py-2 overflow-hidden flex items-center shrink-0 transition-colors duration-300 select-none">
            <div 
              className="animate-marquee hover:[animation-play-state:paused] text-xs md:text-sm font-mono font-black tracking-widest uppercase flex items-center" 
              style={{ '--marquee-speed': `${(marqueeSpeed / 1.5) * 1.43 * 2}s` } as React.CSSProperties}
            >
              {marqueeTrips.length > 0 ? (
                <>
                  <div className="flex items-center shrink-0">
                    {marqueeTrips.map((t, idx) => (
                      <span key={`mq1-${t.id}-${idx}`} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => navigateTo('detail', t.id)}
                          className="hover:text-amber-400 dark:hover:text-amber-600 transition-all cursor-pointer font-black px-2 py-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 active:scale-95 inline-flex items-center gap-1.5"
                          title={`${t.title} 바로가기`}
                        >
                          <span>{t.title.toUpperCase()}</span>
                          {t.date && <span className="opacity-50 text-[10px] font-mono">({t.date.split('.')[0] || t.date.slice(0, 4)})</span>}
                        </button>
                        <span className="text-amber-500 font-bold mx-3 text-xs">✦</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center shrink-0">
                    {marqueeTrips.map((t, idx) => (
                      <span key={`mq2-${t.id}-${idx}`} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => navigateTo('detail', t.id)}
                          className="hover:text-amber-400 dark:hover:text-amber-600 transition-all cursor-pointer font-black px-2 py-0.5 rounded hover:bg-white/10 dark:hover:bg-black/10 active:scale-95 inline-flex items-center gap-1.5"
                          title={`${t.title} 바로가기`}
                        >
                          <span>{t.title.toUpperCase()}</span>
                          {t.date && <span className="opacity-50 text-[10px] font-mono">({t.date.split('.')[0] || t.date.slice(0, 4)})</span>}
                        </button>
                        <span className="text-amber-500 font-bold mx-3 text-xs">✦</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span>{displayMarqueeText}</span>
                  <span>{displayMarqueeText}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Routing */}
        <div className={`w-full flex-grow ${(currentView === 'detail' || currentView === 'map') ? 'overflow-hidden flex flex-col h-full flex-1 min-h-0' : ''}`}>
          {!isAuthReady ? (
            <div className="min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center p-8 bg-transparent text-center w-full">
              <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
            </div>
          ) : !isLoggedIn && !isShareMode ? (
            <div className="min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center p-8 bg-[#F4F3EF] dark:bg-[#0E0E0E] transition-colors text-center w-full">
              <div className="max-w-md flex flex-col items-center gap-5">
                <h2 className="text-xl md:text-2xl font-black tracking-widest uppercase text-black dark:text-white">
                  Access Restricted
                </h2>
                <p className="text-xs md:text-sm text-black/60 dark:text-white/60 font-medium leading-relaxed break-keep">
                  TRIPGON LOG 서비스는 로그인 후 이용 가능합니다.<br />
                  여정을 기록하고 탐색하려면 로그인해 주세요.
                </p>
                <button
                  onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                  className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-sm transition-all shadow-md cursor-pointer mt-2"
                >
                  Sign In to Account
                </button>
              </div>
            </div>
          ) : (
            <Suspense fallback={
              <div className="min-h-[60vh] flex items-center justify-center p-8">
                <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
              </div>
            }>
              {currentView === 'home' && (
                <HomePage 
                  onNavigate={navigateTo} 
                  trips={trips} 
                  plans={plans} 
                  handleMoveToArchive={handleMoveToArchive}
                  onMoveToPlans={handleMoveToPlans}
                  onCloneTrip={handleCloneJourney}
                  onClonePlan={handleCloneJourney}
                  homeTitle={homeTitle}
                  homeSubtitle={homeSubtitle}
                  heroJourneyIds={heroJourneyIds}
                  heroAutoSlide={heroAutoSlide}
                  heroMediaType={heroMediaType}
                  heroSlideDuration={heroSlideDuration}
                  onEditTrip={(id) => setEditingTripId(id)}
                  onDeleteTrip={(id) => handleDeleteJourney(id)}
                  onReorderTrips={async (orderedIds) => {
                    if (!isLoggedIn) return;
                    const batch = writeBatch(db);
                    orderedIds.forEach((id, idx) => {
                      batch.update(doc(db, 'users', 'public', 'trips', String(id)), { displayOrder: idx });
                    });
                    await batch.commit();
                  }}
                  onReorderPlans={async (orderedIds) => {
                    if (!isLoggedIn) return;
                    const batch = writeBatch(db);
                    orderedIds.forEach((id, idx) => {
                      batch.update(doc(db, 'users', 'public', 'plans', String(id)), { displayOrder: idx });
                    });
                    await batch.commit();
                  }}
                  isLoggedIn={isLoggedIn}
                  isDarkMode={isDarkMode}
                  homeGradientEnabled={homeGradientEnabled}
                  homeGradientFrom={homeGradientFrom}
                  homeGradientTo={homeGradientTo}
                  magazineMoments={magazineMoments}
                  magazineSections={magazineSections}
                  homeMagazineSectionId={homeMagazineSectionId}
                  homeMagazineLimit={homeMagazineLimit}
                  timelineData={timelineData}
                />
              )}
              {currentView === 'archive' && (
                <ArchiveHubPage 
                  trips={trips} 
                  plans={plans} 
                  onNavigate={navigateTo} 
                  onAddArchive={handleAddArchive}
                  isLoggedIn={isLoggedIn}
                  onDeleteTrip={handleDeleteJourney}
                  onEditTrip={(id) => setEditingTripId(id)}
                  onCloneTrip={handleCloneJourney}
                  onMoveToPlans={handleMoveToPlans}
                  onMoveToArchive={handleMoveToArchive}
                  onReorderTrips={async (orderedIds) => {
                    if (!isLoggedIn) return;
                    const batch = writeBatch(db);
                    orderedIds.forEach((id, idx) => {
                      batch.update(doc(db, 'users', 'public', 'trips', String(id)), { displayOrder: idx });
                    });
                    await batch.commit();
                  }}
                  initialTagFilter={selectedTagFilter}
                  hubConfig={archiveHubConfig}
                />
              )}
              {currentView === 'map' && (
                <MapHubPage
                  trips={trips}
                  plans={plans}
                  onNavigate={navigateTo}
                  onCreateTripForCountry={handleCreateTripForCountry}
                  isDarkMode={isDarkMode}
                />
              )}
              {currentView === 'manage' && (
                <ManageHubPage
                  trips={trips}
                  plans={plans}
                  onNavigate={navigateTo}
                  onSaveTrip={handleEditTripSave}
                  onDeleteTrip={handleDeleteJourney}
                  onCloneTrip={handleCloneJourney}
                  onMoveToPlans={handleMoveToPlans}
                  onMoveToArchive={handleMoveToArchive}
                  onReorderTrips={async (orderedIds) => {
                    try {
                      localStorage.setItem('journey_order', JSON.stringify(orderedIds));
                    } catch (_) {}

                    const idMap = new Map(orderedIds.map((id, idx) => [id, idx]));
                    setTrips(prev => [...prev].sort((a, b) => (idMap.get(a.id) ?? 9999) - (idMap.get(b.id) ?? 9999)));
                    setPlans(prev => [...prev].sort((a, b) => (idMap.get(a.id) ?? 9999) - (idMap.get(b.id) ?? 9999)));

                    if (isLoggedIn) {
                      try {
                        const batch = writeBatch(db);
                        orderedIds.forEach((id, idx) => {
                          const isPlan = plans.some(p => p.id === id);
                          const col = isPlan ? 'plans' : 'trips';
                          batch.update(doc(db, 'users', 'public', col, String(id)), { displayOrder: idx });
                        });
                        await batch.commit();
                      } catch (e) {
                        console.warn('Background Firestore order update skipped/failed:', e);
                      }
                    }
                  }}
                  homeTitle={homeTitle}
                  homeSubtitle={homeSubtitle}
                  heroJourneyIds={heroJourneyIds}
                  heroAutoSlide={heroAutoSlide}
                  heroMediaType={heroMediaType}
                  heroSlideDuration={heroSlideDuration}
                  marqueeShow={marqueeShow}
                  marqueeMessage={marqueeMessage}
                  marqueeSpeed={marqueeSpeed}
                  homeGradientEnabled={homeGradientEnabled}
                  homeGradientFrom={homeGradientFrom}
                  homeGradientTo={homeGradientTo}
                  homeMagazineSectionId={homeMagazineSectionId}
                  homeMagazineLimit={homeMagazineLimit}
                  onSaveAllHomeSettings={handleSaveSettings}
                  magazineMoments={magazineMoments}
                  magazineSections={magazineSections}
                  magazineHubConfig={magazineHubConfig}
                  onSaveMagazineHubConfig={handleSaveMagazineHubConfig}
                  archiveHubConfig={archiveHubConfig}
                  onSaveArchiveHubConfig={handleSaveArchiveHubConfig}
                  timelineData={timelineData}
                  onSaveMagazineMoments={handleSaveMagazineMoments}
                  onSaveMagazineSections={handleSaveMagazineSections}
                  onUpdateMagazineSections={handleUpdateMagazineSections}
                  trashedJourneys={trashedJourneys}
                  trashedSections={trashedSections}
                  onRestoreJourney={handleRestoreJourney}
                  onPermanentDeleteJourney={handlePermanentDeleteJourney}
                  onDeleteMagazineSection={handleDeleteMagazineSection}
                  onRestoreMagazineSection={handleRestoreMagazineSection}
                  onPermanentDeleteMagazineSection={handlePermanentDeleteMagazineSection}
                  isLoggedIn={isLoggedIn}
                  isDarkMode={isDarkMode}
                  onDirtyChange={setIsManageDirty}
                  saveRef={manageSaveRef}
                />
              )}
              {currentView === 'magazine' && (
                <MagazineHubPage
                  sections={magazineSections}
                  hubConfig={magazineHubConfig}
                  trips={trips}
                  plans={plans}
                  timelineData={timelineData}
                  onNavigate={navigateTo}
                  isLoggedIn={isLoggedIn}
                  isAdmin={isAdmin}
                  isDarkMode={isDarkMode}
                />
              )}
              {currentView === 'detail' && (
                activeTrip ? (() => {
                  const activeTimelineData: TimelineData = {};
                  Object.entries(timelineData).forEach(([date, items]) => {
                    const filtered = items.filter(item => Number(item.tripId) === Number(activeTrip.id));
                    if (filtered.length > 0) {
                      activeTimelineData[date] = filtered;
                    }
                  });

                  return (
                    <ErrorBoundary>
                      <JourneyDetailPage 
                        isLoggedIn={isLoggedIn} 
                        trip={activeTrip}
                        timelineData={activeTimelineData}
                        flights={activeFlights}
                        stays={activeStays}
                        transits={activeTransits}
                        onSave={handleSaveJourneyDetails}
                        onDelete={handleDeleteJourney}
                        isDarkMode={isDarkMode}
                        onNavigate={navigateTo}
                        searchFocusItemId={searchFocusItemId}
                        searchFocusTab={searchFocusTab}
                        onClearSearchFocus={() => {
                          setSearchFocusItemId(null);
                          setSearchFocusTab(null);
                        }}
                        onEditModeChange={setIsDetailEditing}
                        saveRef={detailSaveRef}
                        allTrips={trips}
                        allPlans={plans}
                      />
                    </ErrorBoundary>
                  );
                })() : (
                  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F9F8F6] dark:bg-[#111111] transition-colors w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white mb-2"></div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-black/40 dark:text-white/40">Loading Journey Data...</span>
                  </div>
                )
              )}
            </Suspense>
          )}
        </div>
        
        {/* Footer: Hidden on JourneyDetail; rendered with mt-0 on ArchiveHub and MapHub */}
        {currentView !== 'detail' && <Footer className={(currentView === 'map' || currentView === 'archive') ? 'mt-0' : 'mt-12'} />}

        {/* Modals with Suspense */}
        <Suspense fallback={null}>
          {/* Auth Modal Popup */}
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
            initialMode={authModalMode}
          />

          {/* Create Trip Modal Popup */}
          <CreateTripModal
            isOpen={isCreateModalOpen}
            onClose={() => {
              setIsCreateModalOpen(false);
              setCreateCountryInitial('');
            }}
            onCreate={handleCreateJourney}
            existingTags={existingTags}
            initialCountry={createCountryInitial}
          />

          {/* Settings Modal Popup */}
          <SettingsModal
            isOpen={isManageModalOpen}
            onClose={() => setIsManageModalOpen(false)}
            homeTitle={homeTitle}
            homeSubtitle={homeSubtitle}
            onSaveSettings={handleSaveSettings}
            trashedJourneys={trashedJourneys}
            onRestoreJourney={handleRestoreJourney}
            onPermanentDeleteJourney={handlePermanentDeleteJourney}
            isLoggedIn={isLoggedIn}
            trips={trips}
            plans={plans}
            initialHeroJourneyIds={heroJourneyIds}
            heroAutoSlide={heroAutoSlide}
            heroMediaType={heroMediaType}
            marqueeShow={marqueeShow}
            marqueeMessage={marqueeMessage}
            marqueeSpeed={marqueeSpeed}
          />

          {/* Edit Trip Cover Modal */}
          <EditTripModal
            isOpen={editingTripId !== null}
            onClose={() => setEditingTripId(null)}
            trip={trips.find(t => String(t.id) === String(editingTripId)) || plans.find(p => String(p.id) === String(editingTripId))}
            onSave={handleEditTripSave}
            onMoveToPlans={handleMoveToPlans}
            onMoveToArchive={handleMoveToArchive}
            isLoggedIn={isLoggedIn}
            existingTags={existingTags}
          />

          {/* Search Modal Popup */}
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            trips={trips}
            plans={plans}
            timelineData={timelineData}
            flightsByTrip={flightsByTrip}
            staysByTrip={staysByTrip}
            transitByTrip={transitByTrip}
            onResultClick={handleSearchResultClick}
          />

          {/* Save Complete Auto-Dismiss Modal */}
          <ConfirmModal
            isOpen={showSaveCompleteModal}
            title="SAVED"
            message="All changes have been successfully saved."
            confirmLabel="OK"
            iconType="check"
            singleButton
            autoDismiss
            autoDismissDuration={2000}
            onConfirm={handleCloseSaveCompleteModal}
            onCancel={handleCloseSaveCompleteModal}
          />

          {/* Unsaved Changes Warning Modal */}
          <ConfirmModal
            isOpen={showUnsavedModal}
            title="UNSAVED CHANGES"
            message="Are you sure?"
            confirmLabel="SAVE (Y)"
            discardLabel="DISCARD (N)"
            cancelLabel="SKIP (ESC)"
            onConfirm={handleSaveAndNavigate}
            onDiscard={handleDiscardAndNavigate}
            onCancel={handleCancelUnsavedModal}
          />
        </Suspense>
      </div>

      {/* Splash Screen V0.7 */}
      {showSplash && (
        <div className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center bg-white dark:bg-[#141414] p-8 md:p-12 splash-container ${fadeSplash ? 'splash-container-fade' : 'splash-container-active'}`}>
          {/* Top Micro Masthead */}
          <div className="flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-[0.3em] text-black/60 dark:text-white/60">
            <span>TRIP GON LOG</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span>AUTONOMOUS JOURNAL</span>
          </div>

          {/* Center Giant Satoshi Typography */}
          <div className="flex flex-col items-center select-none text-center">
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black font-satoshi tracking-tighter text-black dark:text-white leading-none">
              Tripgon log
            </h1>
            <div className="h-[2px] w-16 bg-red-600 my-4" />
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.35em] text-black/40 dark:text-white/40">
              EDITORIAL LOG SYSTEM
            </span>
          </div>

          {/* Bottom Version */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest">
            <span>V0.7</span>
            <span>·</span>
            <span>SYSTEM READY</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
