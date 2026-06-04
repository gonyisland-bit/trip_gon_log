import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { PlanHubPage } from './pages/Plan';
import { JourneyDetailPage } from './pages/Detail';
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

function App() {
  const [currentView, setCurrentView] = useState<string>('home'); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [activeTripId, setActiveTripId] = useState<number>(initialTrips[0].id);
  
  // App-level lifted states for timeline & custom cards
  const [timelineData, setTimelineData] = useState<TimelineData>(timelineDataByDate);
  const [flightsByTrip, setFlightsByTrip] = useState<{ [id: number]: FlightItem[] }>(initialFlightsByTrip);
  const [staysByTrip, setStaysByTrip] = useState<{ [id: number]: StayItem[] }>(initialStaysByTrip);
  const [transitByTrip, setTransitByTrip] = useState<{ [id: number]: TransitItem[] }>(initialTransitByTrip);

  const activeTrip = trips.find(t => t.id === activeTripId) 
    || plans.find(p => p.id === activeTripId) 
    || trips[0];

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

  const navigateTo = (view: string, tripId: number | null = null) => {
    if (tripId) setActiveTripId(tripId);
    setCurrentView(view);
  };

  const handleMoveToArchive = (plan: Plan) => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    setPlans(plans.filter(p => p.id !== plan.id));
    setTrips([
      { 
        ...plan, 
        title: plan.title.replace(' (Plan)', ''), 
        tags: [...plan.tags.filter(t => t !== 'Plan'), 'Archived'] 
      }, 
      ...trips
    ]);
  };

  const handleAddArchive = () => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    const newTrip: Trip = { 
      id: Date.now(), 
      title: 'NEW DESTINATION', 
      date: 'YYYY.MM.DD - YYYY.MM.DD', 
      tags: ['New', 'Personal'], 
      img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop',
      mapImg: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop',
      locationStr: 'New Location'
    };
    setTrips([newTrip, ...trips]);
  };

  const handleAddPlan = () => {
    if (!isLoggedIn) return alert("로그인 후 이용 가능합니다.");
    const newPlan: Plan = { 
      id: Date.now(), 
      title: 'UPCOMING JOURNEY', 
      date: 'YYYY.MM.DD - YYYY.MM.DD', 
      tags: ['Plan', 'Personal'], 
      img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop',
      mapImg: 'https://images.unsplash.com/photo-1588421357574-87938a86fa28?q=80&w=1600&auto=format&fit=crop',
      locationStr: 'Plan Location'
    };
    setPlans([newPlan, ...plans]);
  };

  // --- Handlers for Timeline Items ---
  const handleUpdateTimelineItem = (date: string, itemId: number, field: keyof TimelineItem, value: string) => {
    setTimelineData(prev => {
      const items = prev[date] || [];
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, [date]: updatedItems };
    });
  };

  const handleDeleteTimelineItem = (date: string, itemId: number) => {
    setTimelineData(prev => {
      const items = prev[date] || [];
      return { ...prev, [date]: items.filter(item => item.id !== itemId) };
    });
  };

  const handleAddTimelineItem = (date: string) => {
    const newItem: TimelineItem = {
      id: Date.now(),
      time: '12:00 PM',
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50
    };
    setTimelineData(prev => {
      const items = prev[date] || [];
      return { ...prev, [date]: [...items, newItem] };
    });
  };

  // --- Handlers for Flights ---
  const handleUpdateFlight = (itemId: number, field: keyof FlightItem, val: string) => {
    setFlightsByTrip(prev => {
      const list = prev[activeTripId] || [];
      const updated = list.map(item => item.id === itemId ? { ...item, [field]: val } : item);
      return { ...prev, [activeTripId]: updated };
    });
  };

  const handleDeleteFlight = (itemId: number) => {
    setFlightsByTrip(prev => {
      const list = prev[activeTripId] || [];
      return { ...prev, [activeTripId]: list.filter(item => item.id !== itemId) };
    });
  };

  const handleAddFlight = (title: string) => {
    const newFlight: FlightItem = {
      id: Date.now(),
      title: title, // e.g., 'OUTBOUND FLIGHT'
      date: 'YYYY.MM.DD',
      fromCode: 'ICN',
      fromTerminal: 'TERMINAL T1',
      fromTime: '08:00 AM',
      toCode: 'KIX',
      toTerminal: 'TERMINAL T1',
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: '000000'
    };
    setFlightsByTrip(prev => ({
      ...prev,
      [activeTripId]: [...(prev[activeTripId] || []), newFlight]
    }));
  };

  // --- Handlers for Stays ---
  const handleUpdateStay = (itemId: number, field: keyof StayItem, val: string) => {
    setStaysByTrip(prev => {
      const list = prev[activeTripId] || [];
      const updated = list.map(item => item.id === itemId ? { ...item, [field]: val } : item);
      return { ...prev, [activeTripId]: updated };
    });
  };

  const handleDeleteStay = (itemId: number) => {
    setStaysByTrip(prev => {
      const list = prev[activeTripId] || [];
      return { ...prev, [activeTripId]: list.filter(item => item.id !== itemId) };
    });
  };

  const handleAddStay = () => {
    const newStay: StayItem = {
      id: Date.now(),
      status: 'BOOKING CONFIRMED',
      title: '새로운 숙소',
      dateRange: 'YYYY.MM.DD - YYYY.MM.DD (0 Nights)',
      address: '숙소 주소를 입력하세요',
      memo: '메모를 입력하세요',
      confNo: 'HTL-0000',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop'
    };
    setStaysByTrip(prev => ({
      ...prev,
      [activeTripId]: [...(prev[activeTripId] || []), newStay]
    }));
  };

  // --- Handlers for Transit ---
  const handleUpdateTransit = (itemId: number, field: keyof TransitItem, val: string) => {
    setTransitByTrip(prev => {
      const list = prev[activeTripId] || [];
      const updated = list.map(item => item.id === itemId ? { ...item, [field]: val } : item);
      return { ...prev, [activeTripId]: updated };
    });
  };

  const handleDeleteTransit = (itemId: number) => {
    setTransitByTrip(prev => {
      const list = prev[activeTripId] || [];
      return { ...prev, [activeTripId]: list.filter(item => item.id !== itemId) };
    });
  };

  const handleAddTransit = () => {
    const newTransit: TransitItem = {
      id: Date.now(),
      ticketType: 'TRAIN TICKET',
      date: 'YYYY.MM.DD',
      title: '열차/이동 수단 이름',
      route: '출발지 → 도착지',
      time: '12:00 PM',
      seat: 'Car 0, 00A',
      bookingRef: 'TRN-000'
    };
    setTransitByTrip(prev => ({
      ...prev,
      [activeTripId]: [...(prev[activeTripId] || []), newTransit]
    }));
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
            />
          )}
          {currentView === 'archive' && (
            <ArchiveHubPage 
              trips={trips} 
              onNavigate={navigateTo} 
              onAddArchive={handleAddArchive}
              isEditMode={isEditMode}
            />
          )}
          {currentView === 'plan' && (
            <PlanHubPage 
              plans={plans} 
              onNavigate={navigateTo} 
              onAddPlan={handleAddPlan}
              handleMoveToArchive={handleMoveToArchive}
              isEditMode={isEditMode}
            />
          )}
          {currentView === 'detail' && (
            <JourneyDetailPage 
              isLoggedIn={isLoggedIn} 
              trip={activeTrip}
              isEditMode={isEditMode}
              
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
            />
          )}
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default App;
