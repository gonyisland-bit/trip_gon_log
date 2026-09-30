import { Suspense, useEffect, useRef, useState } from 'react';
import { Compass, Sun, Moon } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
// v1.3.6 4-b: the magazine tab gathers published journeys; the hand-curated magazine hub is retired
import { MagazineLibrary } from './pages/MagazineLibrary';
import { ScrollToTop } from './components/ScrollToTop';
import { OPEN_DEPARTURE_EVENT, OPEN_WALLET_EVENT, POCKET_OPEN_SCRAP_EVENT, POCKET_OPEN_SCRAP_FLAG, openBookingWallet, openDepartureBoard } from './app/quickActions';
import { TabBar } from './components/TabBar';
import { useJourneyThumbs } from './app/useJourneyThumbs';
import { TOGGLE_PALETTE_EVENT, OPEN_REMIX_EVENT, openRemix } from './app/layerEvents';
import { getSavedPockets } from './utils/pocketStorage';
import { LayerBoundary } from './components/LayerBoundary';
import { watchFullScreenOverlays } from './app/overlayWatcher';
import { DetailSkeleton, TopProgressBar } from './components/EditorialSkeleton';
import { FlightTransitionOverlay } from './components/FlightTransitionOverlay';
import { SplashScreen } from './components/SplashScreen';
import { FeedbackHost } from './components/FeedbackHost';
import { notify } from './utils/feedback';


// Lazy loaded secondary pages & modals with auto retry on reconnect
const MapHubPage = lazyWithRetry(() => import('./pages/MapHub').then(m => ({ default: m.MapHubPage })));
const ManageHubPage = lazyWithRetry(() => import('./pages/ManageHub').then(m => ({ default: m.ManageHubPage })));
const JourneyDetailPage = lazyWithRetry(() => import('./pages/Detail').then(m => ({ default: m.JourneyDetailPage })));
const CalendarHubPage = lazyWithRetry(() => import('./pages/CalendarHub').then(m => ({ default: m.CalendarHubPage })));
const PocketHubPage = lazyWithRetry(() => import('./pages/PocketHub').then(m => ({ default: m.PocketHubPage })));
const NewTripSheet = lazyWithRetry(() => import('./components/newtrip/NewTripSheet').then(m => ({ default: m.NewTripSheet })));

const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ShareJourneySheet = lazyWithRetry(() => import('./components/share/ShareJourneySheet').then(m => ({ default: m.ShareJourneySheet })));
const SettingsSheet = lazyWithRetry(() => import('./components/settings/SettingsSheet').then(m => ({ default: m.SettingsSheet })));
const SearchModal = lazyWithRetry(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const EditTripModal = lazyWithRetry(() => import('./components/EditTripModal').then(m => ({ default: m.EditTripModal })));
import { ConfirmModal } from './components/ConfirmModal';
const LandingGuestView = lazyWithRetry(() => import('./components/LandingGuestView').then(m => ({ default: m.LandingGuestView })));
import { ErrorBoundary } from './components/ErrorBoundary';
import { Trip, TimelineData } from './types';
import { WeatherEffectLayer } from './components/WeatherEffectLayer';
import { auth, db } from './firebase';
import { doc } from 'firebase/firestore';
// Journey content writes carry owner / access fields (v1.3.6)
import { setDoc, writeBatch } from './utils/ownership';
import { lazyWithRetry, cleanForFirestore } from './app/appUtils';
import { useAppState } from './app/useAppState';
import { OPEN_INTRO_EVENT, isIntroPath } from './intro/openIntro';
import { IntroTip } from './components/home/IntroTip';
import { personName } from './utils/personName';
import { VerifyEmailPanel } from './components/account/VerifyEmailPanel';
import { JourneyActionsSheet, OPEN_JOURNEY_ACTIONS } from './components/cards/JourneyActionsSheet';
import { OPEN_JOURNEY_SHARE } from './components/share/ShareJourneySheet';
import { setDetailIntent } from './utils/detailIntent';

const DepartureBoard = lazyWithRetry(() => import('./components/departure/DepartureBoard').then(m => ({ default: m.DepartureBoard })));
const BookingWallet = lazyWithRetry(() => import('./components/wallet/BookingWallet').then(m => ({ default: m.BookingWallet })));
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const RemixSheet = lazyWithRetry(() => import('./components/RemixSheet').then(m => ({ default: m.RemixSheet })));
// Intro 2.0 (Three.js) loads only when opened
const IntroView = lazyWithRetry(() => import('./intro/IntroView').then(m => ({ default: m.IntroView })));

// A departure date for a ticket kept with only a month: a week out this month, otherwise the first Friday
function departureDate(year: number, month: number): string {
  const now = new Date();
  let d = new Date(year, month - 1, 1);
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  } else {
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function App() {
  const s = useAppState();
  const {
    currentView, setCurrentView, nightModeSetting, setNightModeSetting, isDarkMode, setIsDarkMode,
    nightModeHud, showSplash, handleFinishSplash, triggerNightModeHud, isLoggedIn, setIsLoggedIn,
    isEmailVerified, setIsEmailVerified,
    isAuthReady, superAdminEmail, magazineMoments, magazineSections, homeMagazineSectionId,
    homeMagazineLimit, magazineHubConfig, archiveHubConfig, showSettings, setShowSettings,
    isAuthModalOpen, setIsAuthModalOpen, isShareMode, isManageModalOpen, setIsManageModalOpen,
    authModalMode,
    setAuthModalMode, isSigningUpRef, globalWeatherData, globalWeatherCity, isGlobalWeatherBgEnabled, ambienceOverride,
    canWriteContent, myCard,
    trips, setTrips, plans, setPlans, trashedJourneys, trashedSections, selectedTagFilter, dbError,
    tripsLoaded, plansLoaded,
    timelineData, setTimelineData, flightsByTrip, staysByTrip,
    transitByTrip, homeTitle, homeSubtitle, heroJourneyIds, setHeroJourneyIds, editingTripId, setEditingTripId,
    heroMediaType, heroSlideDuration, heroAutoSlide, marqueeShow, marqueeMessage, marqueeSpeed,
    homeGradientEnabled, homeGradientFrom, homeGradientTo, landingHeroImage, landingHeroMedia,
    currentUserProfile, setCurrentUserProfile, isSearchOpen, setIsSearchOpen, searchFocusItemId,
    setSearchFocusItemId, searchFocusTab, setSearchFocusTab, setIsDetailEditing, setIsManageDirty,
    showSaveCompleteModal, showUnsavedModal, journeyDeleteConfirm, setJourneyDeleteConfirm,
    detailSaveRef, manageSaveRef, isNavigating, flightTransition, handleCloseSaveCompleteModal,
    handleSaveAndNavigate, handleDiscardAndNavigate, handleCancelUnsavedModal, isSuperAdmin, isAdmin,
    canEditTrip, canDeleteTrip, activeTrip, displayMarqueeText, marqueeTrips, navigateTo,
    handleFlightHalfway, handleFlightComplete, handleSearchResultClick, handleMoveToArchive,
    handleMoveToPlans, handleCloneJourney, handleSaveSettings, handleSaveMagazineMoments,
    handleSaveMagazineHubConfig, handleSaveArchiveHubConfig, handleSaveMagazineSections,
    handleUpdateMagazineSections, handleSaveBgmSettings, handleEditTripSave,
    handleCreateTripForCountry, newTripPrefill, setNewTripPrefill, handleCreateJourney, handleSaveJourneyDetails, handleDeleteJourney,
    handleConfirmDeleteJourney, handleRestoreJourney, handlePermanentDeleteJourney,
    handleDeleteMagazineSection, handleRestoreMagazineSection, handlePermanentDeleteMagazineSection,
    handleBatchPermanentDelete, activeFlights, activeStays, activeTransits, existingTags,
    isHomeGradientActive, appGradientStyle, handleCycleNightMode, handleRemixJourney
  } = s;

  // Small copies of journey covers and gallery photos for lists and grids (v1.3.5 P5-b1)
  useJourneyThumbs({
    trips, plans, activeTrip, timelineData, currentView,
    canWrite: isLoggedIn && (isAdmin || currentUserProfile?.status !== 'pending'),
  });

  const [isDepartureOpen, setIsDepartureOpen] = useState(false);
  // The ticket the terminal opens on (just issued from the New trip sheet)
  const [departureTicketId, setDepartureTicketId] = useState<string | undefined>(undefined);
  const issuedTicketRef = useRef<string | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  // One journey's card menu (v1.3.6 4-a), opened from any journey card
  const [actionsTripId, setActionsTripId] = useState<number | null>(null);
  useEffect(() => {
    const open = (e: Event) => setActionsTripId((e as CustomEvent<number>).detail);
    window.addEventListener(OPEN_JOURNEY_ACTIONS, open);
    return () => window.removeEventListener(OPEN_JOURNEY_ACTIONS, open);
  }, []);
  // Sharing one journey with friends (v1.3.6 5-b), from the card menu or the journey header
  const [shareTripId, setShareTripId] = useState<number | null>(null);
  useEffect(() => {
    const open = (e: Event) => setShareTripId((e as CustomEvent<number>).detail);
    window.addEventListener(OPEN_JOURNEY_SHARE, open);
    return () => window.removeEventListener(OPEN_JOURNEY_SHARE, open);
  }, []);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [remixSourceId, setRemixSourceId] = useState<number | null>(null);
  // Intro 2.0: from the menu, footer, landing, palette, or a shared /intro link
  const [introFromLink] = useState(() => isIntroPath());
  const [isIntroOpen, setIsIntroOpen] = useState(introFromLink);
  // A shared /intro link should not reopen the film on the next reload
  const closeIntro = () => {
    setIsIntroOpen(false);
    setTimeout(() => { if (isIntroPath()) window.history.replaceState(window.history.state, '', '/'); }, 300);
  };
  useEffect(() => {
    if (introFromLink && showSplash) handleFinishSplash();
    const open = () => setIsIntroOpen(true);
    window.addEventListener(OPEN_INTRO_EVENT, open);
    return () => window.removeEventListener(OPEN_INTRO_EVENT, open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Floating chrome (quick dock, TOP, intro tip) steps aside while anything covers the screen
  useEffect(() => watchFullScreenOverlays(), []);
  // Watching the intro from anywhere retires the first-visit hint (kept per account)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (isIntroOpen && uid) setDoc(doc(db, 'users', uid, 'settings', 'intro'), { seenAt: Date.now(), watched: true }, { merge: true }).catch(() => {});
  }, [isIntroOpen]);
  useEffect(() => {
    const openDeparture = () => { setDepartureTicketId(undefined); setIsDepartureOpen(true); };
    const openWallet = () => setIsWalletOpen(true);
    const togglePalette = () => setIsPaletteOpen(v => !v);
    const openRemixSheet = (e: Event) => { const id = (e as CustomEvent<number>).detail; if (typeof id === 'number') setRemixSourceId(id); };
    window.addEventListener(OPEN_DEPARTURE_EVENT, openDeparture);
    window.addEventListener(OPEN_WALLET_EVENT, openWallet);
    window.addEventListener(TOGGLE_PALETTE_EVENT, togglePalette);
    window.addEventListener(OPEN_REMIX_EVENT, openRemixSheet);
    return () => {
      window.removeEventListener(OPEN_REMIX_EVENT, openRemixSheet);
      window.removeEventListener(OPEN_DEPARTURE_EVENT, openDeparture);
      window.removeEventListener(OPEN_WALLET_EVENT, openWallet);
      window.removeEventListener(TOGGLE_PALETTE_EVENT, togglePalette);
    };
  }, []);

  // Open the pocket's scrap sheet, from the pocket itself or from any other hub
  const keepPlace = () => {
    if (currentView === 'pocket') { window.dispatchEvent(new Event(POCKET_OPEN_SCRAP_EVENT)); return; }
    try { sessionStorage.setItem(POCKET_OPEN_SCRAP_FLAG, '1'); } catch {}
    navigateTo('pocket');
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} overflow-x-clip w-full`}>
      {/* Toasts (notify) and confirm dialogs (confirmDialog) */}
      <FeedbackHost />

      {/* Tiny Planet motion splash */}
      {showSplash && (
        <SplashScreen onFinish={handleFinishSplash} />
      )}

      {/* Seamless Top Progress Indicator during route transitions (hidden during flight sweep) */}
      <TopProgressBar isNavigating={isNavigating && !flightTransition.isActive} />

      {/* Fullscreen Airplane Vector Transition Overlay */}
      <FlightTransitionOverlay
        isActive={flightTransition.isActive}
        onHalfway={handleFlightHalfway}
        onComplete={handleFlightComplete}
        isDarkMode={isDarkMode}
        destinationTitle={flightTransition.destinationTitle}
      />

      <div 
        style={appGradientStyle}
        className={`relative min-h-screen ${appGradientStyle ? 'bg-transparent' : 'bg-paper dark:bg-paper-dark'} text-black dark:text-white font-sans selection:bg-red-500 selection:text-white transition-colors duration-300 w-full overflow-x-clip flex flex-col ${(currentView === 'detail' || currentView === 'map') ? 'h-screen supports-[height:100dvh]:h-dvh overflow-hidden overscroll-none' : ''}`}
      >
        {/* Global Live Weather Background Ambience Layer (Home, Trip, Magazine, Pocket, Calendar, Detail) */}
        {isLoggedIn && isGlobalWeatherBgEnabled && globalWeatherData && currentView !== 'map' && (
          <WeatherEffectLayer
            weatherCode={ambienceOverride?.weatherCode ?? globalWeatherData.weatherCode}
            precipitationProb={ambienceOverride?.precipitationProb ?? (globalWeatherData.forecast?.[0]?.precipitationProb ?? 0)}
            isDarkMode={isDarkMode}
          />
        )}
        
        {/* Firebase Error/Status Banners */}
        {dbError && (
          <div className="bg-red-500/10 border-b border-red-500/20 backdrop-blur-md px-6 py-3 text-center text-xs tracking-wide text-red-600 dark:text-red-400 font-medium z-50">
            [ERROR] Firebase 연결 오류: {dbError}. Firestore의 보안 규칙(Security Rules)이나 Config 키가 올바른지 확인해 주세요.
          </div>
        )}

        {/* Global Navigation - Only rendered when logged in or in share mode */}
        {(isLoggedIn || isShareMode) && (
          <Navigation 
            currentView={currentView}
            navigateTo={navigateTo}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            nightModeSetting={nightModeSetting}
            setNightModeSetting={(setting) => {
              setNightModeSetting(setting);
              triggerNightModeHud(setting);
            }}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            openAuthModal={(mode) => { setAuthModalMode(mode); setIsAuthModalOpen(true); }}
            openSettingModal={() => setIsManageModalOpen(true)}
            // Signed in, the header search is the quick finder (Ctrl+K); its last row and / open the full search
            onSearchClick={() => { if (isLoggedIn) { setIsPaletteOpen(true); return; } setSearchInitialQuery(''); setIsSearchOpen(true); }}
            onNewTrip={() => handleCreateTripForCountry('', '')}
            isAdmin={isAdmin}
            isHomeGradientActive={isHomeGradientActive}
            currentUserProfile={currentUserProfile}
            onUpdateCurrentUserProfile={setCurrentUserProfile}
          />
        )}

        {/* Unverified members are read-only until they confirm their email */}
        {isLoggedIn && !isAdmin && currentUserProfile?.status === 'pending' && !isEmailVerified && (
          <VerifyEmailPanel variant="bar" profileStatus="pending" onVerified={() => setIsEmailVerified(true)} />
        )}

        {/* Marquee Banner - Only on Home View when logged in (Swiss Minimal Journal Ticker) */}
        {currentView === 'home' && isLoggedIn && marqueeShow && (
          <div className="w-full bg-black/[0.025] dark:bg-white/[0.035] border-y border-black/10 dark:border-white/10 backdrop-blur-xs py-1.5 overflow-hidden flex items-center shrink-0 transition-colors duration-300 select-none text-black dark:text-white">
            <div 
              className="animate-marquee hover:[animation-play-state:paused] text-xs sm:text-[12.5px] font-mono font-bold tracking-wider uppercase flex items-center" 
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
                          className="hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer font-bold px-2 py-0.5 rounded-none active:scale-95 inline-flex items-center gap-1.5"
                          title={`${t.title} 바로가기`}
                        >
                          <span className="text-black dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">{t.title.toUpperCase()}</span>
                          {t.date && <span className="opacity-45 text-meta font-mono font-medium">({t.date.split('.')[0] || t.date.slice(0, 4)})</span>}
                        </button>
                        <span className="text-red-600 dark:text-red-400 font-bold mx-3 text-xs opacity-60">/</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center shrink-0">
                    {marqueeTrips.map((t, idx) => (
                      <span key={`mq2-${t.id}-${idx}`} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => navigateTo('detail', t.id)}
                          className="hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer font-bold px-2 py-0.5 rounded-none active:scale-95 inline-flex items-center gap-1.5"
                          title={`${t.title} 바로가기`}
                        >
                          <span className="text-black dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">{t.title.toUpperCase()}</span>
                          {t.date && <span className="opacity-45 text-meta font-mono font-medium">({t.date.split('.')[0] || t.date.slice(0, 4)})</span>}
                        </button>
                        <span className="text-red-600 dark:text-red-400 font-bold mx-3 text-xs opacity-60">/</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="px-4 text-black/70 dark:text-white/70">{displayMarqueeText}</span>
                  <span className="text-red-600 dark:text-red-400 font-bold mx-3 text-xs opacity-60">/</span>
                  <span className="px-4 text-black/70 dark:text-white/70">{displayMarqueeText}</span>
                  <span className="text-red-600 dark:text-red-400 font-bold mx-3 text-xs opacity-60">/</span>
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
            <Suspense fallback={
              <div className="w-full h-screen supports-[height:100dvh]:h-dvh bg-black flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            }>
              <LandingGuestView 
                mediaList={landingHeroMedia}
                onOpenAuthModal={(mode) => { setAuthModalMode(mode); setIsAuthModalOpen(true); }}
              />
            </Suspense>
          ) : (
            <Suspense fallback={
              currentView === 'detail' ? (
                <DetailSkeleton />
              ) : (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-transparent text-center w-full">
                  <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin mb-3" />
                  <span className="text-meta font-mono uppercase tracking-widest text-black/60 dark:text-white/60">Loading</span>
                </div>
              )
            }>
              {currentView === 'home' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <HomePage 
                    onNavigate={navigateTo} 
                    trips={trips} 
                    plans={plans} 
                    handleMoveToArchive={handleMoveToArchive}
                    onMoveToPlans={handleMoveToPlans}
                    onCloneTrip={openRemix}
                    onClonePlan={openRemix}
                    homeTitle={homeTitle}
                    homeSubtitle={homeSubtitle}
                    heroJourneyIds={heroJourneyIds}
                    onNewTrip={() => handleCreateTripForCountry('', '')}
                    dataReady={tripsLoaded && plansLoaded}
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
                    landingHeroImage={landingHeroImage}
                    canEditTrip={canEditTrip}
                    canDeleteTrip={canDeleteTrip}
                    onOpenAuthModal={(mode) => { setAuthModalMode(mode || 'login'); setIsAuthModalOpen(true); }}
                    homeGradientEnabled={homeGradientEnabled}
                    homeGradientFrom={homeGradientFrom}
                    homeGradientTo={homeGradientTo}
                    magazineMoments={magazineMoments}
                    magazineSections={magazineSections}
                    homeMagazineSectionId={homeMagazineSectionId}
                    homeMagazineLimit={homeMagazineLimit}
                    timelineData={timelineData}
                    isAdmin={isAdmin}
                  />
                </div>
              )}
              {currentView === 'archive' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <ArchiveHubPage 
                    trips={trips} 
                    plans={plans} 
                    onNavigate={navigateTo} 
                    onAddArchive={() => handleCreateTripForCountry('')}
                    isLoggedIn={isLoggedIn}
                    onDeleteTrip={handleDeleteJourney}
                    onEditTrip={(id) => setEditingTripId(id)}
                    onCloneTrip={openRemix}
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
                </div>
              )}
              {currentView === 'map' && (
                <div className="w-full h-full flex flex-col flex-1 min-h-0 animate-in fade-in duration-300">
                  <MapHubPage
                    trips={trips}
                    plans={plans}
                    onNavigate={navigateTo}
                    onCreateTripForCountry={handleCreateTripForCountry}
                    isDarkMode={isDarkMode}
                    isAdmin={isAdmin}
                    onStartNewTrip={(country, cities) => {
                      if (!isLoggedIn) { notify('로그인 후 이용 가능합니다.'); return; }
                      setNewTripPrefill({ country: country || undefined, city: cities[0], cities });
                    }}
                    currentUserProfile={currentUserProfile}
                  />
                </div>
              )}
              {currentView === 'manage' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <ManageHubPage
                    trips={trips}
                    plans={plans}
                    onNavigate={navigateTo}
                    onSaveTrip={handleEditTripSave}
                    onDeleteTrip={handleDeleteJourney}
                    onCloneTrip={async (id: number) => openRemix(id)}
                    onMoveToPlans={handleMoveToPlans}
                    onMoveToArchive={handleMoveToArchive}
                    onReorderTrips={async (orderedIds) => {
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
                    landingHeroImage={landingHeroImage}
                    landingHeroMedia={landingHeroMedia}
                    currentUserProfile={currentUserProfile}
                    isSuperAdmin={isSuperAdmin}
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
                    onBatchPermanentDelete={handleBatchPermanentDelete}
                    isLoggedIn={isLoggedIn}
                    isDarkMode={isDarkMode}
                    onDirtyChange={setIsManageDirty}
                    saveRef={manageSaveRef}
                    onSaveBgmSettings={handleSaveBgmSettings}
                  />
                </div>
              )}
              {currentView === 'magazine' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <MagazineLibrary trips={trips} onNavigate={navigateTo} />
                </div>
              )}
              {currentView === 'calendar' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <CalendarHubPage
                    trips={trips}
                    plans={plans}
                    timelineData={timelineData}
                    onNavigate={navigateTo}
                    onCreateTrip={(dateStr) => handleCreateTripForCountry('', '', dateStr)}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}
              {currentView === 'pocket' && (
                <div className="w-full h-full animate-in fade-in duration-300">
                  <PocketHubPage
                    trips={trips}
                    plans={plans}
                    onNavigate={navigateTo}
                    onCreateTripWithPockets={(selectedPockets) => {
                      const firstCountry = selectedPockets.find(p => p.country)?.country || '';
                      const firstCity = selectedPockets.find(p => p.city)?.city || '';
                      handleCreateTripForCountry(firstCountry, firstCity, undefined, selectedPockets.map(p => p.id));
                    }}
                    onAddTimelineItemToTrip={async (tripId, newItem) => {
                      const date = newItem.date || '2025.04.12';
                      setTimelineData(prev => {
                        const updated = { ...prev };
                        if (!updated[date]) updated[date] = [];
                        updated[date] = [...updated[date], newItem];
                        return updated;
                      });

                      // Persist to Firestore
                      try {
                        const uid = 'public';
                        const { originDate: _, ...cleanItem } = newItem as any;
                        await setDoc(doc(db, 'users', uid, 'timeline', String(newItem.id)), cleanForFirestore({ ...cleanItem, tripId }));
                      } catch (e) {
                        console.warn('Failed to persist timeline item to Firestore:', e);
                      }

                      // Local storage fallback
                      try {
                        const raw = localStorage.getItem('timeline_data') || '{}';
                        const parsed = JSON.parse(raw);
                        if (!parsed[date]) parsed[date] = [];
                        parsed[date].push(newItem);
                        localStorage.setItem('timeline_data', JSON.stringify(parsed));
                      } catch (_) {}
                    }}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    isDarkMode={isDarkMode}
                    currentUserProfile={currentUserProfile}
                    onOpenAuthModal={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                  />
                </div>
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
                      <div className="w-full h-full animate-in fade-in duration-300">
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
                      </div>
                    </ErrorBoundary>
                  );
                })() : (
                  <DetailSkeleton />
                )
              )}
            </Suspense>
          )}
        </div>
        
        {/* Footer: Hidden on JourneyDetail, MapHub, and Guest Landing View */}
        {(isLoggedIn || isShareMode) && currentView !== 'detail' && currentView !== 'map' && (
          <Footer className={currentView === 'archive' ? 'mt-0' : 'mt-12'} />
        )}

        {/* Modals with Suspense */}
        <Suspense fallback={null}>
          {/* Auth Modal Popup */}
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
            initialMode={authModalMode}
            adminEmail={superAdminEmail}
            onSignupStart={() => { isSigningUpRef.current = true; }}
            onSignupEnd={() => {
              isSigningUpRef.current = false;
              // The sign-in during sign-up was skipped by the auth listener: take it now
              if (auth.currentUser) {
                setIsEmailVerified(auth.currentUser.emailVerified);
                setIsLoggedIn(true);
                try { localStorage.setItem('isLoggedIn', 'true'); } catch {}
              }
            }}
            onSuccess={() => setCurrentView('home')}
          />

          {/* Settings (v1.3.6 4-d): account, friends, display, slideshow, storage, trash. The operator's
              tools (hero list, ticker, music list) live in the manage hub. */}
          {isManageModalOpen && isLoggedIn && (
            <SettingsSheet
              onClose={() => setIsManageModalOpen(false)}
              profile={currentUserProfile}
              displayName={personName(currentUserProfile, auth.currentUser?.displayName) || '나'}
              email={auth.currentUser?.email || ''}
              nightMode={nightModeSetting}
              onNightMode={(v) => {
                setNightModeSetting(v);
                if (v === 'light') setIsDarkMode(false);
                else if (v === 'dark') setIsDarkMode(true);
              }}
              trashed={trashedJourneys}
              onRestore={handleRestoreJourney}
              onPermanentDelete={handlePermanentDeleteJourney}
              me={myCard}
              canWrite={canWriteContent}
              journeys={[...plans, ...trips]}
              onOpenJourney={(id) => navigateTo('detail', id)}
              onOpenPocket={() => navigateTo('pocket')}
            />
          )}

          {/* Journey card menu: cover, edit, share, pin to home, delete */}
          {actionsTripId !== null && (() => {
            const plan = plans.find(p => p.id === actionsTripId);
            const trip = plan || trips.find(t => t.id === actionsTripId);
            if (!trip) return null;
            // Photos of this journey: its gallery and its timeline pictures
            const photos = Array.from(new Set([
              ...(trip.gallery || []).map(g => (typeof g === 'string' ? g : g.url)),
              ...Object.values(timelineData).flat().filter(i => i.tripId === trip.id && i.img).map(i => i.img as string),
            ].filter(Boolean)));
            const pinned = heroJourneyIds.includes(trip.id);
            return (
              <JourneyActionsSheet
                trip={trip}
                isPlan={Boolean(plan)}
                photos={photos}
                pinned={pinned}
                onOpenAs={(view) => { setDetailIntent(view); navigateTo('detail', trip.id); }}
                onClose={() => setActionsTripId(null)}
                onEdit={() => setEditingTripId(trip.id)}
                onDelete={() => handleDeleteJourney(trip.id)}
                onTogglePin={() => {
                  const next = pinned ? heroJourneyIds.filter(id => id !== trip.id) : [...heroJourneyIds, trip.id];
                  setHeroJourneyIds(next);
                  try { localStorage.setItem('heroJourneyIds', JSON.stringify(next)); } catch {}
                  // Saved to this member's own home settings (the writer routes hero keys there)
                  setDoc(doc(db, 'users', 'public', 'settings', 'home'), { heroJourneyIds: next }, { merge: true })
                    .then(() => notify(pinned ? '홈 고정을 해제했습니다.' : '홈에 고정했습니다.', 'success'))
                    .catch(() => notify('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error'));
                }}
              />
            );
          })()}

          {shareTripId !== null && isLoggedIn && (() => {
            const trip = plans.find(p => p.id === shareTripId) || trips.find(t => t.id === shareTripId);
            if (!trip) return null;
            return (
              <ShareJourneySheet
                trip={trip}
                me={myCard}
                onClose={() => setShareTripId(null)}
                onLeft={() => { if (currentView === 'detail' && activeTrip?.id === trip.id) navigateTo('home', null, true, null, true); }}
              />
            );
          })()}

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
            initialQuery={searchInitialQuery}
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
            autoDismissDuration={1000}
            onConfirm={handleCloseSaveCompleteModal}
            onCancel={handleCloseSaveCompleteModal}
          />

          {/* Unsaved Changes Warning Modal */}
          <ConfirmModal
            isOpen={showUnsavedModal}
            title="UNSAVED CHANGES"
            message="Are you sure?"
            confirmLabel="Save (Y)"
            discardLabel="Discard (N)"
            cancelLabel="Skip (Esc)"
            onConfirm={handleSaveAndNavigate}
            onDiscard={handleDiscardAndNavigate}
            onCancel={handleCancelUnsavedModal}
          />

          {/* Delete Journey Swiss Minimal Confirmation Modal */}
          <ConfirmModal
            isOpen={journeyDeleteConfirm.isOpen}
            title="MOVE TO TRASH"
            message={`'${journeyDeleteConfirm.title}' 여정을 휴지통으로 이동하시겠습니까?`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            confirmVariant="danger"
            iconType="alert"
            onConfirm={handleConfirmDeleteJourney}
            onCancel={() => setJourneyDeleteConfirm({ isOpen: false, tripId: null, title: '' })}
          />

        </Suspense>

        {/* Phone tab bar across hubs (v1.3.5). On the map it steps aside while a sheet is open; detail and manage keep their own bottom controls */}
        {isLoggedIn && ['home', 'archive', 'magazine', 'calendar', 'pocket', 'map'].includes(currentView) && (
          <>
            {/* Room under the page so the bar never sits on its last lines (the map fills the screen instead) */}
            {currentView !== 'map' && <div className="md:hidden shrink-0" style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }} aria-hidden />}
            <TabBar
              currentView={currentView}
              onNavigate={(view) => navigateTo(view)}
              onNewTrip={() => handleCreateTripForCountry('', '')}
            />
          </>
        )}

        {/* Booking Wallet: every upcoming booking with its D-day (v1.3 P5) */}
        {isWalletOpen && (
          <LayerBoundary name="예약 지갑" onClose={() => setIsWalletOpen(false)}>
          <Suspense fallback={null}>
            <BookingWallet
              trips={trips}
              plans={plans}
              flightsByTrip={flightsByTrip}
              staysByTrip={staysByTrip}
              transitByTrip={transitByTrip}
              onClose={() => setIsWalletOpen(false)}
              onOpenBooking={handleSearchResultClick}
              onNewTrip={() => handleCreateTripForCountry('', '')}
            />
          </Suspense>
          </LayerBoundary>
        )}

        {/* Journey Remix: pick places from a journey into a new plan (v1.3 P5) */}
        {remixSourceId !== null && isLoggedIn && (() => {
          const source = [...trips, ...plans].find(j => j.id === remixSourceId);
          if (!source) return null;
          const timeline = Object.entries(timelineData || {}).flatMap(([d, list]) =>
            (list || []).filter(i => i.tripId === source.id).map(i => ({ ...i, date: i.date || d }))
          );
          return (
            <LayerBoundary name="Remix" onClose={() => setRemixSourceId(null)}>
            <Suspense fallback={null}>
              <RemixSheet
                journey={source}
                timeline={timeline}
                stays={staysByTrip[source.id] || []}
                pockets={(() => {
                  const city = ((source.locations?.[0]?.name || source.locationStr || '').split(',')[0] || '').trim().toLowerCase();
                  return getSavedPockets().filter(p => p.tripId === source.id || (!!city && (p.city || '').trim().toLowerCase() === city));
                })()}
                onClose={() => setRemixSourceId(null)}
                onCreate={(payload) => handleRemixJourney(source.id, payload)}
              />
            </Suspense>
            </LayerBoundary>
          );
        })()}

        {/* Command palette: Cmd/Ctrl+K (v1.3 P5) */}
        {isPaletteOpen && isLoggedIn && (
          <LayerBoundary name="한번에 찾기" onClose={() => setIsPaletteOpen(false)}>
          <Suspense fallback={null}>
            <CommandPalette
              trips={trips}
              plans={plans}
              onClose={() => setIsPaletteOpen(false)}
              onNavigate={(view, tripId) => navigateTo(view, tripId ?? null)}
              onNewTrip={() => handleCreateTripForCountry('', '')}
              onOpenDeparture={openDepartureBoard}
              onOpenWallet={openBookingWallet}
              onKeepPlace={keepPlace}
              onCycleNightMode={handleCycleNightMode}
              onFullSearch={(q) => { setSearchInitialQuery(q); setIsSearchOpen(true); }}
              onRemix={openRemix}
            />
          </Suspense>
          </LayerBoundary>
        )}

        {/* Intro 2.0: motion-graphics film of the app, rendered live */}
        {isIntroOpen && (
          <LayerBoundary name="소개 영상" onClose={closeIntro}>
          <Suspense fallback={null}>
            <IntroView
              onClose={closeIntro}
              startLabel={isLoggedIn ? '앱으로 돌아가기' : '지금 시작하기'}
              onStart={isLoggedIn ? undefined : () => { setIsIntroOpen(false); setAuthModalMode('signup'); setIsAuthModalOpen(true); }}
            />
          </Suspense>
          </LayerBoundary>
        )}

        {/* New trip: one sheet for every entry point (v1.3.5 P3) */}
        {newTripPrefill && isLoggedIn && (
          <LayerBoundary name="새 여행" onClose={() => setNewTripPrefill(null)}>
          <Suspense fallback={null}>
            <NewTripSheet
              prefill={newTripPrefill}
              defaultMember={personName(currentUserProfile, auth.currentUser?.displayName) || '나'}
              accountIds={[currentUserProfile?.username, auth.currentUser?.email?.split('@')[0]].filter((v): v is string => !!v)}
              recentCities={[...plans, ...trips].flatMap(j => (j.locations?.length ? j.locations.map(l => l.name) : [j.locationStr])).filter(Boolean).slice(0, 12)}
              onClose={() => {
                setNewTripPrefill(null);
                // A ticket was just issued: the terminal rolls over to it (opened from the terminal,
                // it stayed open under the sheet; from anywhere else, walk into it)
                const issued = issuedTicketRef.current;
                issuedTicketRef.current = null;
                if (issued) {
                  setDepartureTicketId(issued);
                  setIsDepartureOpen(true);
                }
              }}
              onIssue={async (plan, info) => {
                // Issued, not created yet: the ticket waits in the airport terminal until boarding
                const { issueTicket, putTicket } = await import('./components/departure/departureData');
                const ticket = issueTicket({ ...info, plan });
                try {
                  await putTicket(ticket, newTripPrefill.replaceTicketId);
                } catch {
                  notify('티켓을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
                  throw new Error('ticket not saved');
                }
                issuedTicketRef.current = ticket.id;
              }}
            />
          </Suspense>
          </LayerBoundary>
        )}

        {/* First visit after sign-in: one hint to watch the intro */}
        {isLoggedIn && !showSplash && !isIntroOpen && currentView === 'home' && <IntroTip />}

        {/* Airport terminal: the destination picker (v1.3, renamed from Departure Board) */}
        {isDepartureOpen && (
          <LayerBoundary name="공항 터미널" onClose={() => setIsDepartureOpen(false)}>
          <Suspense fallback={null}>
            <DepartureBoard
              onClose={() => setIsDepartureOpen(false)}
              initialTicketId={departureTicketId}
              onBoard={async (t) => {
                const p = t.plan!;
                await handleCreateJourney(p.title, p.dateRange, p.location, p.tags, p.lat, p.lng, p.members, p.locations, 'NEW', p.country, p.coverImg, p.timeline, 'plan');
              }}
              covered={!!newTripPrefill}
              onPlan={(t) => {
                // The sheet opens over the terminal, which stays where it is
                if (!t) { handleCreateTripForCountry(''); return; }
                if (!isLoggedIn) return;
                setNewTripPrefill({
                  country: t.countryEn,
                  city: t.cityEn,
                  cities: t.cities?.map(c => c.en),
                  date: t.startDate ?? departureDate(t.year, t.month),
                  members: t.members,
                  nights: t.nights,
                  replaceTicketId: t.id,
                });
              }}
              isDarkMode={isDarkMode}
              weatherCode={ambienceOverride?.weatherCode ?? globalWeatherData?.weatherCode}
              weatherCityName={globalWeatherCity?.name}
              weatherCityEn={globalWeatherCity?.nameEn}
              weatherTemp={globalWeatherData?.temp}
              precipitationProb={ambienceOverride?.precipitationProb ?? (globalWeatherData?.forecast?.[0]?.precipitationProb ?? 0)}
            />
          </Suspense>
          </LayerBoundary>
        )}

        {/* Global Floating Scroll To Top Navigator (Hidden on Detail, Map, and Guest Landing View) */}
        {(isLoggedIn || isShareMode) && currentView !== 'detail' && currentView !== 'map' && <ScrollToTop />}

        {/* Swiss Minimal Night Mode 3-Tier Cycle HUD Indicator */}
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-system pointer-events-none transition-all duration-300 ease-out ${
            nightModeHud.visible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 -translate-y-3 scale-95'
          }`}
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-black/15 dark:border-white/20 bg-white/95 dark:bg-[#121214]/95 text-black dark:text-white shadow-xl">
            {nightModeHud.mode === 'auto' && (
              <>
                <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="font-mono text-xs font-extrabold tracking-wider uppercase">AUTO (18:00 - 06:00)</span>
              </>
            )}
            {nightModeHud.mode === 'light' && (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                <span className="font-mono text-xs font-extrabold tracking-wider uppercase">DAY MODE</span>
              </>
            )}
            {nightModeHud.mode === 'dark' && (
              <>
                <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="font-mono text-xs font-extrabold tracking-wider uppercase">NIGHT MODE</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
