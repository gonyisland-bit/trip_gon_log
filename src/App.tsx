import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { PlanHubPage } from './pages/Plan';
import { JourneyDetailPage } from './pages/Detail';
import { AuthModal } from './components/AuthModal';
import { CreateTripModal } from './components/CreateTripModal';
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
  writeBatch 
} from 'firebase/firestore';

function App() {
  const [currentView, setCurrentView] = useState<string>('home'); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createModalType, setCreateModalType] = useState<'archive' | 'plan'>('archive');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [activeTripId, setActiveTripId] = useState<number>(initialTrips[0].id);
  
  // App-level lifted states for timeline & custom cards
  const [timelineData, setTimelineData] = useState<TimelineData>(timelineDataByDate);
  const [flightsByTrip, setFlightsByTrip] = useState<{ [id: number]: FlightItem[] }>(initialFlightsByTrip);
  const [staysByTrip, setStaysByTrip] = useState<{ [id: number]: StayItem[] }>(initialStaysByTrip);
  const [transitByTrip, setTransitByTrip] = useState<{ [id: number]: TransitItem[] }>(initialTransitByTrip);

  // Firebase 로딩 중에 trips[0]을 폴백으로 쓰면 잘못된 여정이 보임.
  // undefined를 반환하면 App의 로딩 스피너가 표시되고, 데이터 로드 후 올바른 여정으로 업데이트됨.
  const activeTrip = trips.find(t => String(t.id) === String(activeTripId)) 
    || plans.find(p => String(p.id) === String(activeTripId)) 
    || undefined;

  useEffect(() => {
    if (!isLoggedIn) setIsEditMode(false);
  }, [isLoggedIn]);

  // Sync isDarkMode to html element classlist for Tailwind dark: modifiers
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Firestore seeding script
  const seedUserData = async (uid: string) => {
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
        batch.set(doc(db, 'users', uid, 'timeline', String(item.id)), { ...item, date });
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

  // Real-time Firestore sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        await seedUserData(user.uid);

        const uid = user.uid;

        const unsubTrips = onSnapshot(collection(db, 'users', uid, 'trips'), (snapshot) => {
          const list: Trip[] = [];
          snapshot.forEach(doc => {
            list.push(doc.data() as Trip);
          });
          setTrips(list.sort((a, b) => a.id - b.id));
        });

        const unsubPlans = onSnapshot(collection(db, 'users', uid, 'plans'), (snapshot) => {
          const list: Plan[] = [];
          snapshot.forEach(doc => {
            list.push(doc.data() as Plan);
          });
          setPlans(list.sort((a, b) => a.id - b.id));
        });

        const unsubTimeline = onSnapshot(collection(db, 'users', uid, 'timeline'), (snapshot) => {
          const grouped: TimelineData = {};
          snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.date as string;
            if (!grouped[date]) grouped[date] = [];
            const { date: _, ...item } = data;
            grouped[date].push(item as TimelineItem);
          });
          Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => a.id - b.id);
          });
          setTimelineData(grouped);
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
        });

        return () => {
          unsubTrips();
          unsubPlans();
          unsubTimeline();
          unsubFlights();
          unsubStays();
          unsubTransit();
        };

      } else {
        setIsLoggedIn(false);
        setTrips(initialTrips);
        setPlans(initialPlans);
        setTimelineData(timelineDataByDate);
        setFlightsByTrip(initialFlightsByTrip);
        setStaysByTrip(initialStaysByTrip);
        setTransitByTrip(initialTransitByTrip);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state with browser History API on initial load
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    let initialView = 'home';
    let initialTripId: number | null = null;

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

    if (initialTripId) {
      setActiveTripId(initialTripId);
    }
    setCurrentView(initialView);
    window.history.replaceState({ view: initialView, tripId: initialTripId }, '', window.location.pathname + window.location.search);
  }, []);

  // Listen to popstate events for browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
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
  }, []);

  const navigateTo = (view: string, tripId: number | null = null, pushHistory = true) => {
    if (tripId) setActiveTripId(tripId);
    setCurrentView(view);

    if (pushHistory) {
      let path = '/';
      if (view === 'archive') path = '/archive';
      else if (view === 'plan') path = '/plan';
      else if (view === 'detail') {
        const idToUse = tripId || activeTripId;
        path = idToUse ? `/detail?id=${idToUse}` : '/detail';
      }
      window.history.pushState({ view, tripId: tripId || activeTripId }, '', path);
    }
  };

  const handleUpdateTrip = async (tripId: number, field: string, value: any) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    const isPlan = plans.some(p => p.id === tripId);
    const collectionName = isPlan ? 'plans' : 'trips';
    await setDoc(doc(db, 'users', user.uid, collectionName, String(tripId)), {
      [field]: value
    }, { merge: true });
  };

  const handleMoveToArchive = async (plan: Plan) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    const user = auth.currentUser;
    if (!user) return;

    const planRef = doc(db, 'users', user.uid, 'plans', String(plan.id));
    const tripRef = doc(db, 'users', user.uid, 'trips', String(plan.id));

    const newTrip: Trip = { 
      ...plan, 
      title: plan.title.replace(' (Plan)', ''), 
      tags: [...plan.tags.filter(t => t !== 'Plan'), 'Archived'] 
    };

    const batch = writeBatch(db);
    batch.delete(planRef);
    batch.set(tripRef, newTrip);
    await batch.commit();
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

  const handleCreateJourney = async (title: string, dateRange: string, location: string, tags: string[]) => {
    const user = auth.currentUser;
    if (!user) return;

    const newId = Date.now();
    
    // Geocoding으로 위경도 구하기
    const coords = await fetchCoordinates(location);
    const lat = coords?.lat;
    const lng = coords?.lng;

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
      gallery: []
    };

    if (lat !== undefined && lng !== undefined) {
      newJourney.lat = lat;
      newJourney.lng = lng;
    }

    await setDoc(doc(db, 'users', user.uid, collectionName, String(newId)), newJourney);
    
    // 생성과 동시에 상세 페이지로 즉시 전환
    navigateTo('detail', newId);
  };

  // --- Handlers for Timeline Items ---
  const handleUpdateTimelineItem = async (date: string, itemId: number, field: keyof TimelineItem, value: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    // Special case for Detail page date hack
    if (itemId === 0 && field === 'time') {
      await handleUpdateTrip(activeTripId, 'date', value);
      return;
    }

    await setDoc(doc(db, 'users', user.uid, 'timeline', String(itemId)), {
      [field]: value
    }, { merge: true });
  };

  const handleDeleteTimelineItem = async (date: string, itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'timeline', String(itemId)));
  };

  const handleAddTimelineItem = async (date: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    const newItemId = Date.now();
    const newItem = {
      id: newItemId,
      time: '12:00 PM',
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: date
    };
    await setDoc(doc(db, 'users', user.uid, 'timeline', String(newItemId)), newItem);
  };

  // --- Handlers for Flights ---
  const handleUpdateFlight = async (itemId: number, field: keyof FlightItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'users', user.uid, 'flights', String(itemId)), {
      [field]: val
    }, { merge: true });
  };

  const handleDeleteFlight = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'flights', String(itemId)));
  };

  const handleAddFlight = async (title: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    const newFlightId = Date.now();
    const newFlight = {
      id: newFlightId,
      title: title,
      date: 'YYYY.MM.DD',
      fromCode: 'ICN',
      fromTerminal: 'TERMINAL T1',
      fromTime: '08:00 AM',
      toCode: 'KIX',
      toTerminal: 'TERMINAL T1',
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: '000000',
      tripId: activeTripId
    };
    await setDoc(doc(db, 'users', user.uid, 'flights', String(newFlightId)), newFlight);
  };

  // --- Handlers for Stays ---
  const handleUpdateStay = async (itemId: number, field: keyof StayItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'users', user.uid, 'stays', String(itemId)), {
      [field]: val
    }, { merge: true });
  };

  const handleDeleteStay = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'stays', String(itemId)));
  };

  const handleAddStay = async () => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    const newStayId = Date.now();
    const newStay = {
      id: newStayId,
      status: 'BOOKING CONFIRMED',
      title: '새로운 숙소',
      dateRange: 'YYYY.MM.DD - YYYY.MM.DD (0 Nights)',
      address: '숙소 주소를 입력하세요',
      memo: '메모를 입력하세요',
      confNo: 'HTL-0000',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop',
      tripId: activeTripId
    };
    await setDoc(doc(db, 'users', user.uid, 'stays', String(newStayId)), newStay);
  };

  // --- Handlers for Transit ---
  const handleUpdateTransit = async (itemId: number, field: keyof TransitItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'users', user.uid, 'transits', String(itemId)), {
      [field]: val
    }, { merge: true });
  };

  const handleDeleteTransit = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, 'users', user.uid, 'transits', String(itemId)));
  };

  const handleAddTransit = async () => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    const newTransitId = Date.now();
    const newTransit = {
      id: newTransitId,
      ticketType: 'TRAIN TICKET',
      date: 'YYYY.MM.DD',
      title: '열차/이동 수단 이름',
      route: '출발지 → 도착지',
      time: '12:00 PM',
      seat: 'Car 0, 00A',
      bookingRef: 'TRN-000',
      tripId: activeTripId
    };
    await setDoc(doc(db, 'users', user.uid, 'transits', String(newTransitId)), newTransit);
  };

  const activeFlights = flightsByTrip[activeTripId] || [];
  const activeStays = staysByTrip[activeTripId] || [];
  const activeTransits = transitByTrip[activeTripId] || [];

  return (
    <div className={`${isDarkMode ? 'dark' : ''} overflow-x-hidden w-full`}>
      <div className="min-h-screen bg-[#F9F8F6] text-[#111111] dark:bg-[#111111] dark:text-[#F9F8F6] font-sans selection:bg-red-500 selection:text-white transition-colors duration-300 w-full overflow-x-hidden">
        
        {/* Global Navigation */}
        <Navigation 
          currentView={currentView}
          navigateTo={navigateTo}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          openAuthModal={(mode) => { setAuthModalMode(mode); setIsAuthModalOpen(true); }}
        />

        {/* View Routing */}
        <div className="w-full">
          {currentView === 'home' && (
            <HomePage 
              onNavigate={navigateTo} 
              trips={trips} 
              plans={plans} 
              handleMoveToArchive={handleMoveToArchive}
              isEditMode={isEditMode}
              onUpdateTrip={handleUpdateTrip}
            />
          )}
          {currentView === 'archive' && (
            <ArchiveHubPage 
              trips={trips} 
              onNavigate={navigateTo} 
              onAddArchive={handleAddArchive}
              isEditMode={isEditMode}
              onUpdateTrip={handleUpdateTrip}
            />
          )}
          {currentView === 'plan' && (
            <PlanHubPage 
              plans={plans} 
              onNavigate={navigateTo} 
              onAddPlan={handleAddPlan}
              handleMoveToArchive={handleMoveToArchive}
              isEditMode={isEditMode}
              onUpdateTrip={handleUpdateTrip}
            />
          )}
          {currentView === 'detail' && (
            activeTrip ? (
              <JourneyDetailPage 
                isLoggedIn={isLoggedIn} 
                trip={activeTrip}
                isEditMode={isEditMode}
                onUpdateTrip={handleUpdateTrip}
                
                timelineData={timelineData}
                onUpdateTimelineItem={handleUpdateTimelineItem}
                onDeleteTimelineItem={handleDeleteTimelineItem}
                onAddTimelineItem={handleAddTimelineItem}

                flights={activeFlights}
                onUpdateFlight={handleUpdateFlight}
                onDeleteFlight={handleDeleteFlight}
                onAddFlight={handleAddFlight}

                stays={activeStays}
                onUpdateStay={handleUpdateStay}
                onDeleteStay={handleDeleteStay}
                onAddStay={handleAddStay}

                transits={activeTransits}
                onUpdateTransit={handleUpdateTransit}
                onDeleteTransit={handleDeleteTransit}
                onAddTransit={handleAddTransit}
                isDarkMode={isDarkMode}
              />
            ) : (
              <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F9F8F6] dark:bg-[#111111] transition-colors w-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white mb-2"></div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-black/40 dark:text-white/40">Loading Journey Data...</span>
              </div>
            )
          )}
        </div>
        
        {/* Footer */}
        <Footer />

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
        />
      </div>
    </div>
  );
}

export default App;
