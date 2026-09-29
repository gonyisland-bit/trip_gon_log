import { Suspense, useEffect, useState } from 'react';
import { Compass, Sun, Moon } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/Home';
import { ArchiveHubPage } from './pages/Archive';
import { MagazineHubPage } from './pages/MagazineHub';
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


// Lazy loaded secondary pages & modals with auto retry on reconnect
const MapHubPage = lazyWithRetry(() => import('./pages/MapHub').then(m => ({ default: m.MapHubPage })));
const ManageHubPage = lazyWithRetry(() => import('./pages/ManageHub').then(m => ({ default: m.ManageHubPage })));
const JourneyDetailPage = lazyWithRetry(() => import('./pages/Detail').then(m => ({ default: m.JourneyDetailPage })));
const CalendarHubPage = lazyWithRetry(() => import('./pages/CalendarHub').then(m => ({ default: m.CalendarHubPage })));
const PocketHubPage = lazyWithRetry(() => import('./pages/PocketHub').then(m => ({ default: m.PocketHubPage })));
const NewTripSheet = lazyWithRetry(() => import('./components/newtrip/NewTripSheet').then(m => ({ default: m.NewTripSheet })));

const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const SettingsModal = lazyWithRetry(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SearchModal = lazyWithRetry(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const EditTripModal = lazyWithRetry(() => import('./components/EditTripModal').then(m => ({ default: m.EditTripModal })));
import { ConfirmModal } from './components/ConfirmModal';
const LandingGuestView = lazyWithRetry(() => import('./components/LandingGuestView').then(m => ({ default: m.LandingGuestView })));
import { ErrorBoundary } from './components/ErrorBoundary';
import { Trip, TimelineData } from './types';
import { WeatherEffectLayer } from './components/WeatherEffectLayer';
import { auth, db } from './firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { lazyWithRetry, cleanForFirestore } from './app/appUtils';
import { useAppState } from './app/useAppState';
import { OPEN_INTRO_EVENT, isIntroPath } from './intro/openIntro';
import { IntroTip } from './components/home/IntroTip';

const DepartureBoard = lazyWithRetry(() => import('./components/departure/DepartureBoard').then(m => ({ default: m.DepartureBoard })));
const BookingWallet = lazyWithRetry(() => import('./components/wallet/BookingWallet').then(m => ({ default: m.BookingWallet })));
const CommandPalette = lazyWithRetry(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const RemixSheet = lazyWithRetry(() => import('./components/RemixSheet').then(m => ({ default: m.RemixSheet })));
// Intro 2.0 (Three.js) loads only when opened
const IntroView = lazyWithRetry(() => import('./intro/IntroView').then(m => ({ default: m.IntroView })));

// A departure date for the Trip Guide: a week out this month, otherwise the first Friday of the month
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
    isAuthReady, superAdminEmail, magazineMoments, magazineSections, homeMagazineSectionId,
    homeMagazineLimit, magazineHubConfig, archiveHubConfig, showSettings, setShowSettings,
    isAuthModalOpen, setIsAuthModalOpen, isShareMode, isManageModalOpen, setIsManageModalOpen,
    createCountryInitial, createCityInitial, createDateInitial, mapBuilderRequested, authModalMode,
    setAuthModalMode, isSigningUpRef, globalWeatherData, globalWeatherCity, isGlobalWeatherBgEnabled, ambienceOverride,
    trips, setTrips, plans, setPlans, trashedJourneys, trashedSections, selectedTagFilter, dbError,
    tripsLoaded, plansLoaded, setIsMapBuilderActive, pendingLeaveBuilderModal,
    setPendingLeaveBuilderModal, timelineData, setTimelineData, flightsByTrip, staysByTrip,
    transitByTrip, homeTitle, homeSubtitle, heroJourneyIds, editingTripId, setEditingTripId,
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
    handleUpdateMagazineSections, handleSaveBgmSettings, handleEditTripSave, handleAddArchive,
    handleCreateTripForCountry, openMapBuilder, newTripPrefill, setNewTripPrefill, handleCreateJourney, handleSaveJourneyDetails, handleDeleteJourney,
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
  const [isWalletOpen, setIsWalletOpen] = useState(false);
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
    const openDeparture = () => setIsDepartureOpen(true);
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
        {!dbError && tripsLoaded && plansLoaded && trips.length === 0 && plans.length === 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-6 py-3 text-center text-xs tracking-wide text-amber-700 dark:text-amber-400 font-medium z-50">
            [NOTICE] 현재 Firebase(Public 경로)에 데이터가 없습니다. <strong>우측 상단의 로그인 버튼을 통해 로그인해 주시면</strong>, 기존의 기본 목업 데이터가 Firestore로 자동 업로드(Seed)됩니다.
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
            onSearchClick={() => { setSearchInitialQuery(''); setIsSearchOpen(true); }}
            onNewTrip={() => handleCreateTripForCountry('', '')}
            isAdmin={isAdmin}
            isHomeGradientActive={isHomeGradientActive}
            currentUserProfile={currentUserProfile}
            onUpdateCurrentUserProfile={setCurrentUserProfile}
          />
        )}

        {/* Pending approval notice: members are read-only until an admin approves them */}
        {isLoggedIn && !isAdmin && currentUserProfile?.status === 'pending' && (
          <div className="w-full border-b border-black/20 dark:border-white/20 px-4 py-2 flex items-center justify-center gap-3 shrink-0 text-black dark:text-white">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-500">Pending</span>
            <span className="text-xs text-black/60 dark:text-white/60">관리자 승인 후 여정을 추가하거나 수정할 수 있습니다.</span>
          </div>
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
                    onAddArchive={handleAddArchive}
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
                    onSaveTrip={handleCreateJourney}
                    initialBuilderOpen={mapBuilderRequested}
                    initialBuilderCountry={createCountryInitial}
                    initialBuilderCity={createCityInitial}
                    initialBuilderDate={createDateInitial}
                    onBuilderStateChange={setIsMapBuilderActive}
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
            onSignupEnd={() => { isSigningUpRef.current = false; }}
            onSuccess={() => setCurrentView('home')}
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
            onSaveBgmSettings={handleSaveBgmSettings}
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

          {/* Leave Trip Builder Swiss Minimal Confirmation Modal */}
          <ConfirmModal
            isOpen={pendingLeaveBuilderModal.isOpen}
            title="LEAVE BUILDER"
            message={`작성 중인 여정 설정이 저장되지 않을 수 있습니다.\n정말 다른 화면으로 이동하시겠습니까?`}
            confirmLabel="Leave"
            cancelLabel="Continue"
            confirmVariant="danger"
            iconType="alert"
            onConfirm={() => {
              const { targetView, targetTripId, pushHistory, tagFilter } = pendingLeaveBuilderModal;
              setIsMapBuilderActive(false);
              setPendingLeaveBuilderModal({ isOpen: false });
              if (targetView) {
                navigateTo(targetView, targetTripId, pushHistory, tagFilter || null, true);
              }
            }}
            onCancel={() => setPendingLeaveBuilderModal({ isOpen: false })}
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
          <LayerBoundary name="명령 팔레트" onClose={() => setIsPaletteOpen(false)}>
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
              defaultMember={currentUserProfile?.firstName || currentUserProfile?.username || auth.currentUser?.email?.split('@')[0] || '나'}
              recentCities={[...plans, ...trips].flatMap(j => (j.locations?.length ? j.locations.map(l => l.name) : [j.locationStr])).filter(Boolean).slice(0, 12)}
              onClose={() => setNewTripPrefill(null)}
              onCreate={(p) => handleCreateJourney(p.title, p.dateRange, p.location, p.tags, p.lat, p.lng, p.members, p.locations, 'NEW', p.country, p.coverImg, p.timeline)}
              onSurprise={openDepartureBoard}
              onOpenMapBuilder={(country, city, date) => openMapBuilder(country, city, date)}
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
              onBuildTrip={({ countryEn, cityKo, year, month }) => { setIsDepartureOpen(false); handleCreateTripForCountry(countryEn, cityKo, departureDate(year, month)); }}
              onOpenPocket={() => navigateTo('pocket')}
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
