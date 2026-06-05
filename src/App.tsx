import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { PlanHubPage } from './pages/Plan';
import { JourneyDetailPage } from './pages/Detail';
import { AuthModal } from './components/AuthModal';
import { CreateTripModal } from './components/CreateTripModal';
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

  // activeTrip: find by id first; fall back to trips[0] only (not plans)
  // Falling back to plans[0] caused wrong trip (Tokyo) to show during Firestore sync.
  const activeTrip = trips.find(t => String(t.id) === String(activeTripId)) 
    || plans.find(p => String(p.id) === String(activeTripId)) 
    || trips[0]
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
    let unsubTrips = () => {};
    let unsubPlans = () => {};
    let unsubTimeline = () => {};
    let unsubFlights = () => {};
    let unsubStays = () => {};
    let unsubTransit = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up previous listeners if any
      unsubTrips();
      unsubPlans();
      unsubTimeline();
      unsubFlights();
      unsubStays();
      unsubTransit();

      if (user) {
        setIsLoggedIn(true);
        try {
          await seedUserData(user.uid);
        } catch (err) {
          console.error("Error seeding user data:", err);
        }

        const uid = user.uid;

        try {
          unsubTrips = onSnapshot(collection(db, 'users', uid, 'trips'), (snapshot) => {
            const list: Trip[] = [];
            snapshot.forEach(doc => {
              list.push(doc.data() as Trip);
            });
            setTrips(list.sort((a, b) => a.id - b.id));
          }, (err) => {
            console.error("Trips snapshot subscription error:", err);
          });

          unsubPlans = onSnapshot(collection(db, 'users', uid, 'plans'), (snapshot) => {
            const list: Plan[] = [];
            snapshot.forEach(doc => {
              list.push(doc.data() as Plan);
            });
            setPlans(list.sort((a, b) => a.id - b.id));
          }, (err) => {
            console.error("Plans snapshot subscription error:", err);
          });

          unsubTimeline = onSnapshot(collection(db, 'users', uid, 'timeline'), (snapshot) => {
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
          }, (err) => {
            console.error("Timeline snapshot subscription error:", err);
          });

          unsubFlights = onSnapshot(collection(db, 'users', uid, 'flights'), (snapshot) => {
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
          }, (err) => {
            console.error("Flights snapshot subscription error:", err);
          });

          unsubStays = onSnapshot(collection(db, 'users', uid, 'stays'), (snapshot) => {
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
          }, (err) => {
            console.error("Stays snapshot subscription error:", err);
          });

          unsubTransit = onSnapshot(collection(db, 'users', uid, 'transits'), (snapshot) => {
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
          }, (err) => {
            console.error("Transit snapshot subscription error:", err);
          });
        } catch (err) {
          console.error("Error setting up firestore snapshots:", err);
        }

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

    return () => {
      unsubscribe();
      unsubTrips();
      unsubPlans();
      unsubTimeline();
      unsubFlights();
      unsubStays();
      unsubTransit();
    };
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
    try {
      await setDoc(doc(db, 'users', user.uid, collectionName, String(tripId)), {
        [field]: value
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating trip:", err);
      alert("정보 저장에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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

    try {
      // 1. Save journey doc immediately (before geocoding)
      await setDoc(doc(db, 'users', user.uid, collectionName, String(newId)), newJourney);

      // 2. Generate default template timeline items by date
      const generateTemplateDays = (): { date: string; items: any[] }[] => {
        // Parse dateRange: 'YYYY.MM.DD - YYYY.MM.DD'
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
            // Single day trip
            items = [
              { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
              { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
              { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착`,     cost: '-',   memo: '입국 심사 및 현지 이동', date },
              { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 관람`,     cost: '-',   memo: '현지 관광 일정', date },
              { id: baseId + 4, time: '07:00 PM', type: 'transit',  place: '귀국 공항 이동',           cost: '-',   memo: '공항 이동 및 탑승수속', date },
              { id: baseId + 5, time: '09:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
            ];
          } else if (isFirst) {
            // First day: departure
            items = [
              { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
              { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
              { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착·입국`, cost: '-',   memo: '입국 심사 후 시내 이동', date },
              { id: baseId + 3, time: '02:00 PM', type: 'transit',  place: '시내 교통 이동',           cost: '-',   memo: '숙소까지 이동', date },
              { id: baseId + 4, time: '04:00 PM', type: 'stay',     place: '숙소 체크인',             cost: '-',   memo: '짐 풀고 휴식', date },
              { id: baseId + 5, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 식당 탐방', date },
            ];
          } else if (isLast) {
            // Last day: return
            items = [
              { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 근처 카페', date },
              { id: baseId + 1, time: '10:00 AM', type: 'stay',     place: '숙소 체크아웃',           cost: '-',   memo: '체크아웃 후 짐 보관', date },
              { id: baseId + 2, time: '11:00 AM', type: 'activity', place: '출발 전 마지막 일정',      cost: '-',   memo: '기념품 구입 등', date },
              { id: baseId + 3, time: '01:00 PM', type: 'transit',  place: '공항 이동',               cost: '-',   memo: '공항 셔틀 또는 대중교통', date },
              { id: baseId + 4, time: '03:00 PM', type: 'transit',  place: '귀국 탑승수속·출국심사',  cost: '-',   memo: '면세점 쇼핑', date },
              { id: baseId + 5, time: '06:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
            ];
          } else {
            // Middle days
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

      // 3. Batch-write template timeline items
      const templateDays = generateTemplateDays();
      if (templateDays.length > 0) {
        const batch = writeBatch(db);
        templateDays.forEach(({ date, items }) => {
          items.forEach(item => {
            batch.set(doc(db, 'users', user.uid, 'timeline', String(item.id)), item);
          });
        });
        await batch.commit();
      }

      // 4. Navigate to the new journey immediately
      navigateTo('detail', newId);

      // 5. Background geocoding for the trip location
      fetchCoordinates(location).then(async (coords) => {
        if (coords && user) {
          try {
            await setDoc(doc(db, 'users', user.uid, collectionName, String(newId)), {
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

    try {
      await setDoc(doc(db, 'users', user.uid, 'timeline', String(itemId)), {
        [field]: value
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating timeline item:", err);
      alert("타임라인 업데이트에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleDeleteTimelineItem = async (date: string, itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'timeline', String(itemId)));
    } catch (err: any) {
      console.error("Error deleting timeline item:", err);
      alert("타임라인 삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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
    try {
      await setDoc(doc(db, 'users', user.uid, 'timeline', String(newItemId)), newItem);
    } catch (err: any) {
      console.error("Error adding timeline item:", err);
      alert("타임라인 추가에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  // --- Handlers for Flights ---
  const handleUpdateFlight = async (itemId: number, field: keyof FlightItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.uid, 'flights', String(itemId)), {
        [field]: val
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating flight:", err);
      alert("항공 정보 업데이트에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleDeleteFlight = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'flights', String(itemId)));
    } catch (err: any) {
      console.error("Error deleting flight:", err);
      alert("항공 정보 삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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
    try {
      await setDoc(doc(db, 'users', user.uid, 'flights', String(newFlightId)), newFlight);
    } catch (err: any) {
      console.error("Error adding flight:", err);
      alert("항공 정보 추가에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  // --- Handlers for Stays ---
  const handleUpdateStay = async (itemId: number, field: keyof StayItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.uid, 'stays', String(itemId)), {
        [field]: val
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating stay:", err);
      alert("숙소 정보 업데이트에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleDeleteStay = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'stays', String(itemId)));
    } catch (err: any) {
      console.error("Error deleting stay:", err);
      alert("숙소 정보 삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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
    try {
      await setDoc(doc(db, 'users', user.uid, 'stays', String(newStayId)), newStay);
    } catch (err: any) {
      console.error("Error adding stay:", err);
      alert("숙소 정보 추가에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  // --- Handlers for Transit ---
  const handleUpdateTransit = async (itemId: number, field: keyof TransitItem, val: string) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.uid, 'transits', String(itemId)), {
        [field]: val
      }, { merge: true });
    } catch (err: any) {
      console.error("Error updating transit:", err);
      alert("교통 정보 업데이트에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleDeleteTransit = async (itemId: number) => {
    if (!isLoggedIn) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transits', String(itemId)));
    } catch (err: any) {
      console.error("Error deleting transit:", err);
      alert("교통 정보 삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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
    try {
      await setDoc(doc(db, 'users', user.uid, 'transits', String(newTransitId)), newTransit);
    } catch (err: any) {
      console.error("Error adding transit:", err);
      alert("교통 정보 추가에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
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
              <ErrorBoundary>
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
              </ErrorBoundary>
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
