import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { PlanHubPage } from './pages/Plan';
import { JourneyDetailPage } from './pages/Detail';
import { initialTrips, initialPlans } from './data/mockData';
import { Trip, Plan } from './types';

function App() {
  const [currentView, setCurrentView] = useState<string>('home'); 
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [activeTripId, setActiveTripId] = useState<number>(initialTrips[0].id);
  
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
