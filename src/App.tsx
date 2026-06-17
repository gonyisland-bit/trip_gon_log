import { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { PlanHubPage } from './pages/Plan';
import { JourneyDetailPage } from './pages/Detail';
import { AuthModal } from './components/AuthModal';
import { CreateTripModal } from './components/CreateTripModal';
import { SettingsModal } from './components/SettingsModal';
import { SearchModal } from './components/SearchModal';
import { EditTripModal } from './components/EditTripModal';
import { Check, AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchCoordinates } from './utils/googleMapsHelper';
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
  TransitItem 
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

function App() {
  const [currentView, setCurrentView] = useState<string>('home'); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('isDarkMode') === 'true';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isShareMode, setIsShareMode] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [fadeSplash, setFadeSplash] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [createModalType, setCreateModalType] = useState<'archive' | 'plan'>('archive');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  // Start with empty state for clean public load
  const [trips, setTrips] = useState<Trip[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trashedJourneys, setTrashedJourneys] = useState<Trip[]>([]);
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
  
  const [heroAutoSlide, setHeroAutoSlide] = useState<boolean>(true);
  const [marqueeShow, setMarqueeShow] = useState<boolean>(true);
  const [marqueeMessage, setMarqueeMessage] = useState<string>("🎉 WELCOME TO TRIPGON LOG! PLAN YOUR JOURNEY OR EXPLORE ARCHIVED LOGS.");
  const [marqueeSpeed, setMarqueeSpeed] = useState<number>(30);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchFocusItemId, setSearchFocusItemId] = useState<number | null>(null);
  const [searchFocusTab, setSearchFocusTab] = useState<string | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState<boolean>(false);
  const [marqueeOverrideText, setMarqueeOverrideText] = useState<string | null>(null);
  const [showSaveCompleteModal, setShowSaveCompleteModal] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ view: string; tripId: number | null } | null>(null);
  const detailSaveRef = useRef<(() => Promise<void>) | null>(null);

  const handleSaveAndNavigate = async () => {
    setShowUnsavedModal(false);
    if (detailSaveRef.current) {
      await detailSaveRef.current();
    }
    if (pendingNavigation) {
      const { view, tripId } = pendingNavigation;
      setPendingNavigation(null);
      setIsDetailEditing(false);
      setTimeout(() => {
        navigateTo(view, tripId, true, null, true);
      }, 100);
    }
  };

  const handleDiscardAndNavigate = () => {
    setShowUnsavedModal(false);
    setIsDetailEditing(false);
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
      setTrips(list.sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id)));
      setTripsLoaded(true);
      setDbError(null);
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
      setPlans(list.sort((a, b) => (a.displayOrder ?? a.id) - (b.displayOrder ?? b.id)));
      setPlansLoaded(true);
      setDbError(null);
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
      const list: Trip[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Trip);
      });
      setTrashedJourneys(list.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)));
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
      }
    }, (err) => {
      console.error("Settings snapshot subscription error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
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
    };
  }, []);

  // Auto-seed if database is empty when admin logs in
  useEffect(() => {
    if (isLoggedIn && trips.length === 0 && plans.length === 0) {
      seedUserData('public');
    }
  }, [isLoggedIn, trips.length, plans.length]);

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
      if (path === '/archive') {
        initialView = 'archive';
      } else if (path === '/plan') {
        initialView = 'plan';
      } else if (path === '/detail' || idParam) {
        initialView = 'detail';
        if (idParam) {
          initialTripId = Number(idParam);
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
      if (isDetailEditing) {
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
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDetailEditing, currentView, activeTripId]);

  const navigateTo = (view: string, tripId: number | null = null, pushHistory = true, tagFilter: string | null = null, force = false) => {
    if (!force && isDetailEditing && (view !== 'detail' || (tripId !== null && tripId !== activeTripId))) {
      setPendingNavigation({ view, tripId });
      setShowUnsavedModal(true);
      return;
    }

    if (view !== 'detail') {
      setIsShareMode(false);
    }

    if (tripId) setActiveTripId(tripId);
    setCurrentView(view);
    setSelectedTagFilter(tagFilter);

    if (pushHistory) {
      let path = '/';
      if (view === 'archive') path = '/archive';
      else if (view === 'plan') path = '/plan';
      else if (view === 'detail') {
        const idToUse = tripId || activeTripId;
        const isShare = (view === 'detail' && (tripId === activeTripId || tripId === null || tripId === idToUse)) ? isShareMode : false;
        path = idToUse ? `/detail?id=${idToUse}${isShare ? '&share=true' : ''}` : '/detail';
      }
      window.history.pushState({ view, tripId: tripId || activeTripId }, '', path);
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

    const newTrip: Trip = { 
      ...plan, 
      title: plan.title.replace(' (Plan)', ''), 
      tags: [...plan.tags.filter(t => t !== 'Plan'), 'Archived'] 
    };

    try {
      const batch = writeBatch(db);
      batch.delete(planRef);
      batch.set(tripRef, newTrip);
      await batch.commit();
    } catch (err: any) {
      console.error("Error moving plan to archive:", err);
      alert("아카이브로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleMoveToPlans = async (trip: Trip) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");

    const tripRef = doc(db, 'users', 'public', 'trips', String(trip.id));
    const planRef = doc(db, 'users', 'public', 'plans', String(trip.id));

    const newPlan: Plan = { 
      ...trip, 
      title: trip.title.endsWith(' (Plan)') ? trip.title : `${trip.title} (Plan)`, 
      tags: [...trip.tags.filter(t => t !== 'Archived'), 'Plan'] 
    };

    try {
      const batch = writeBatch(db);
      batch.delete(tripRef);
      batch.set(planRef, newPlan);
      await batch.commit();
    } catch (err: any) {
      console.error("Error moving trip to plans:", err);
      alert("계획으로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
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
    heroMediaTypeParam?: 'image' | 'video'
  ) => {
    if (!isLoggedIn) return;
    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), {
        title,
        subtitle,
        heroJourneyIds: heroIds,
        heroAutoSlide: autoSlide ?? heroAutoSlide,
        heroMediaType: heroMediaTypeParam ?? heroMediaType,
        marqueeShow: showMarquee ?? marqueeShow,
        marqueeMessage: marqueeMsg ?? marqueeMessage,
        marqueeSpeed: marqueeSpd ?? marqueeSpeed,
      });
      setHeroJourneyIds(heroIds);
      if (autoSlide !== undefined) setHeroAutoSlide(autoSlide);
      if (heroMediaTypeParam !== undefined) setHeroMediaType(heroMediaTypeParam);
      if (showMarquee !== undefined) setMarqueeShow(showMarquee);
      if (marqueeMsg !== undefined) setMarqueeMessage(marqueeMsg);
      if (marqueeSpd !== undefined) setMarqueeSpeed(marqueeSpd);
    } catch (err) {
      console.error("Failed to save settings:", err);
      throw err;
    }
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
    const isPlan = plans.some(p => p.id === tripId);
    const collectionName = isPlan ? 'plans' : 'trips';
    const oldTrip = (isPlan ? plans : trips).find(t => t.id === tripId);
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

  const handleAddPlan = async () => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
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
    locations?: { name: string; lat?: number; lng?: number }[]
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
      members: members || []
    };

    try {
      // 1. Save journey doc immediately
      await setDoc(doc(db, 'users', 'public', collectionName, String(newId)), newJourney);

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
            batch.set(doc(db, 'users', 'public', 'timeline', String(item.id)), { ...item, tripId: newId });
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
            await setDoc(doc(db, 'users', 'public', collectionName, String(newId)), {
              lat: coords.lat,
              lng: coords.lng
            }, { merge: true });
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

      setMarqueeOverrideText("🎉 JOURNEY SAVED SUCCESSFULLY!");
      setTimeout(() => {
        setMarqueeOverrideText(null);
      }, 5000);
      setShowSaveCompleteModal(true);
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
          setShowSaveCompleteModal(false);
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

  return (
    <div className={`${isDarkMode ? 'dark' : ''} overflow-x-hidden w-full`}>
      <div className={`min-h-screen bg-[#F9F8F6] text-[#111111] dark:bg-[#111111] dark:text-[#F9F8F6] font-sans selection:bg-red-500 selection:text-white transition-colors duration-300 w-full overflow-x-hidden flex flex-col ${currentView === 'detail' ? 'h-screen overflow-hidden' : ''}`}>
        
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
        />

        {/* Marquee Banner */}
        {marqueeShow && (
          <div className="w-full bg-[#EAE8E3] dark:bg-[#161616] border-b border-black/10 dark:border-white/10 py-2 overflow-hidden flex items-center shrink-0">
            <div 
              key={displayMarqueeText}
              className="animate-marquee text-[10px] md:text-xs font-black tracking-widest uppercase text-red-600 dark:text-red-400" 
              style={{ '--marquee-speed': `${(marqueeSpeed / 1.5) * 1.43}s` } as React.CSSProperties}
            >
              <span>{displayMarqueeText}</span>
              <span>{displayMarqueeText}</span>
            </div>
          </div>
        )}

        {/* View Routing */}
        <div className={`w-full flex-grow ${currentView === 'detail' ? 'overflow-hidden flex flex-col' : ''}`}>
          {!isLoggedIn && !isShareMode ? (
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
            <>
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
                />
              )}
              {currentView === 'archive' && (
                <ArchiveHubPage 
                  trips={trips} 
                  onNavigate={navigateTo} 
                  onAddArchive={handleAddArchive}
                  isLoggedIn={isLoggedIn}
                  onDeleteTrip={handleDeleteJourney}
                  onEditTrip={(id) => setEditingTripId(id)}
                  onCloneTrip={handleCloneJourney}
                  onMoveToPlans={handleMoveToPlans}
                  onReorderTrips={async (orderedIds) => {
                    if (!isLoggedIn) return;
                    const batch = writeBatch(db);
                    orderedIds.forEach((id, idx) => {
                      batch.update(doc(db, 'users', 'public', 'trips', String(id)), { displayOrder: idx });
                    });
                    await batch.commit();
                  }}
                  initialTagFilter={selectedTagFilter}
                />
              )}
              {currentView === 'plan' && (
                <PlanHubPage 
                  plans={plans} 
                  onNavigate={navigateTo} 
                  onAddPlan={handleAddPlan}
                  handleMoveToArchive={handleMoveToArchive}
                  isLoggedIn={isLoggedIn}
                  onDeletePlan={handleDeleteJourney}
                  onEditPlan={(id) => setEditingTripId(id)}
                  onClonePlan={handleCloneJourney}
                  onReorderPlans={async (orderedIds) => {
                    if (!isLoggedIn) return;
                    const batch = writeBatch(db);
                    orderedIds.forEach((id, idx) => {
                      batch.update(doc(db, 'users', 'public', 'plans', String(id)), { displayOrder: idx });
                    });
                    await batch.commit();
                  }}
                  initialTagFilter={selectedTagFilter}
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
            </>
          )}
        </div>
        
        {/* Footer */}
        {currentView !== 'detail' && <Footer />}

        {/* Auth Modal Popup */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          initialMode={authModalMode}
        />

        {/* Create Trip Modal Popup */}
        <CreateTripModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateJourney}
          existingTags={existingTags}
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
          trip={trips.find(t => t.id === editingTripId) || plans.find(p => p.id === editingTripId)}
          onSave={handleEditTripSave}
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

        {/* Save Complete Modal */}
        {showSaveCompleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 p-6 md:p-8 w-full max-w-sm text-center shadow-2xl rounded-none text-black dark:text-white">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase tracking-widest mb-6">Saved</h3>
              <button
                onClick={() => setShowSaveCompleteModal(false)}
                className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest rounded-none transition-all"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* Unsaved Changes Warning Modal */}
        {showUnsavedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#F9F8F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 p-6 md:p-8 w-full max-w-sm text-center shadow-2xl rounded-none text-black dark:text-white">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black tracking-tight mb-6 leading-relaxed">
                저장되지 않은 변경 사항이 있습니다.<br />저장하고 이동하시겠습니까?
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSaveAndNavigate}
                  className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-1.5"
                >
                  저장하고 이동
                </button>
                <button
                  onClick={handleDiscardAndNavigate}
                  className="w-full py-2.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-none transition-all"
                >
                  저장하지 않고 이동
                </button>
                <button
                  onClick={handleCancelUnsavedModal}
                  className="w-full py-2.5 text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors mt-1"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Splash Screen */}
      {showSplash && (
        <div className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center bg-[#F4F3EF] dark:bg-[#0E0E0E] splash-container ${fadeSplash ? 'splash-container-fade' : 'splash-container-active'}`}>
          <div /> {/* Top spacing */}
          <div className="flex flex-col items-center">
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter splash-title-shimmer splash-text-animate select-none">
              Tripgon log
            </h1>
          </div>
          <div className="pb-8">
            <span className="text-[10px] md:text-xs font-bold tracking-widest text-black/40 dark:text-white/40 uppercase">
              v0.4
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
