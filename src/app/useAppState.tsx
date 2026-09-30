import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import type { NewTripPrefill } from '../components/newtrip/useNewTripDraft';
import { scheduleIdlePrefetch } from '../utils/prefetchHelper';
import { fetchCoordinates } from '../utils/googleMapsHelper';
import { resolveTimelinePlaceName, buildDefaultMagazineSections, syncSectionItemsWithTimeline } from '../utils/magazineHelper';
import {
  BgmTrack, saveStoredBgmTracks, saveStoredBgmAutoplay, saveStoredBgmDefaultVolume,
  saveStoredBgmShuffle, saveStoredSlideshowInterval
} from '../utils/audioHelper';
import {
  initialTrips, initialPlans, timelineDataByDate, initialFlightsByTrip, initialStaysByTrip,
  initialTransitByTrip
} from '../data/mockData';
import {
  Trip, Plan, TimelineData, TimelineItem, FlightItem, StayItem, TransitItem, MagazineMoment,
  MagazineSection, MagazineHubConfig, ArchiveHubConfig, TrashedMagazineSection, UserProfile,
  LandingHeroMediaItem, CityWeatherConfig
} from '../types';
import { fetchCityWeather, CityWeatherData } from '../utils/weatherApi';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, updateDoc, deleteDoc, onSnapshot, getDocs, query, where } from 'firebase/firestore';
// Journey content writes carry owner / access fields (v1.3.6)
import { setDoc, writeBatch } from '../utils/ownership';
import {
  cleanForFirestore, applyJourneyOrder, SUPER_ADMIN_EMAIL, ADMIN_EMAILS, getInitialNavigationState,
  NightModeSetting, isNightTimeNow, runViewTransition
} from './appUtils';
import { notify } from '../utils/feedback';
import { completeVerification } from '../utils/emailVerification';
import { clearOrphanAccount, hasNoProfile, isGhostProfile, isSettledAccount } from '../utils/accountCleanup';
import { linkFriendMembersByName, renameMembersInItems, shareWithMembers } from '../utils/memberLinks';
import { setNotificationSender } from '../utils/notifications';
import { pendingInvite, personCard, promptAcceptInvite, takeInviteFromUrl, type PersonCard } from '../utils/friends';
import { CONTENT_COLLECTIONS, journeyItems, ownTrash, pickHomeKeys, registerJourneys, sharedContent, visibleContent } from '../utils/ownership';
import type { RemixPayload } from '../components/RemixSheet';
import { afterLayerBack, isLayerBackPending, takeOverLayerEntry } from '../utils/overlayHistory';
import { TOGGLE_PALETTE_EVENT } from './layerEvents';
import { CURRENT_LOCATION_EN, applyJourneyOpen, cachedCurrentLocation, loadUserPrefs, locateMe, locationGranted, saveUserPref, selectWeatherCity } from '../utils/userPrefs';
import { applyMapStyle, isMapStyle } from '../utils/mapTiles';
import { noteRecentJourney } from '../utils/recentJourneys';
import { orderWithNewFirst } from '../utils/journeyOrderHelper';

export function useAppState() {
  const [initialNavState] = useState(() => getInitialNavigationState());
  const [currentView, setCurrentView] = useState<string>(() => initialNavState.view); 
  const [nightModeSetting, setNightModeSetting] = useState<NightModeSetting>(() => {
    const saved = localStorage.getItem('nightModeSetting');
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
    const legacyDark = localStorage.getItem('isDarkMode');
    if (legacyDark === 'true') return 'dark';
    if (legacyDark === 'false') return 'light';
    return 'auto';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedSetting = localStorage.getItem('nightModeSetting');
    if (savedSetting === 'dark') return true;
    if (savedSetting === 'light') return false;
    if (savedSetting === 'auto') return isNightTimeNow();
    const legacyDark = localStorage.getItem('isDarkMode');
    if (legacyDark !== null) return legacyDark === 'true';
    return isNightTimeNow();
  });

  // Swiss Minimal Night Mode 3-Tier Cycle & Floating HUD Indicator State
  const nightModeSettingRef = useRef<NightModeSetting>(nightModeSetting);
  useEffect(() => {
    nightModeSettingRef.current = nightModeSetting;
  }, [nightModeSetting]);

  const [nightModeHud, setNightModeHud] = useState<{ visible: boolean; mode: NightModeSetting }>({
    visible: false,
    mode: 'auto',
  });
  const nightModeHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editorial Kinetic Splash Screen state (Option 2: Kinetic Typography & Flight Motion)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('splash_screen_viewed');
    } catch (_) {
      return true;
    }
  });

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('splash_screen_viewed', 'true');
    } catch (_) {}
  }, []);

  // Listen for logo click splash trigger
  useEffect(() => {
    const handleTriggerSplash = () => {
      setShowSplash(true);
      setCurrentView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('triggerSplashScreen', handleTriggerSplash);
    return () => {
      window.removeEventListener('triggerSplashScreen', handleTriggerSplash);
    };
  }, []);

  const triggerNightModeHud = useCallback((mode: NightModeSetting) => {
    setNightModeHud({ visible: true, mode });
    if (nightModeHudTimerRef.current) clearTimeout(nightModeHudTimerRef.current);
    nightModeHudTimerRef.current = setTimeout(() => {
      setNightModeHud(prev => ({ ...prev, visible: false }));
    }, 1300);
  }, []);

  const handleCycleNightMode = useCallback(() => {
    const current = nightModeSettingRef.current;
    let next: NightModeSetting;
    if (current === 'auto') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'auto';
    }
    setNightModeSetting(next);
    triggerNightModeHud(next);
  }, [triggerNightModeHud]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true' || Boolean(auth.currentUser);
  });
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [superAdminEmail, setSuperAdminEmail] = useState<string>(() => {
    return localStorage.getItem('cached_super_admin_email') || SUPER_ADMIN_EMAIL;
  });
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
  const [isShareMode, setIsShareMode] = useState<boolean>(() => initialNavState.isShare);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [createModalType, setCreateModalType] = useState<'archive' | 'plan'>('archive');
  // New trip sheet (v1.3.5 P3): null = closed, otherwise the values it opens with
  const [newTripPrefill, setNewTripPrefill] = useState<NewTripPrefill | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const initialAuthCheckedRef = useRef<boolean>(false);
  // Prevents onAuthStateChanged from triggering login flow during account creation+signOut cycle
  const isSigningUpRef = useRef<boolean>(false);
  const homeSettingsApplierRef = useRef<((data: Record<string, any>) => void) | null>(null);
  // Email confirmed through Firebase's verification link (v1.3.6: replaces admin approval)
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(() => Boolean(auth.currentUser?.emailVerified));
  
  // ── Global Weather Ambience State (All Hubs Realtime Sync) ──
  const [globalWeatherCity, setGlobalWeatherCity] = useState<CityWeatherConfig | null>(() => {
    try {
      const savedEn = localStorage.getItem('selected_weather_city_en') || 'SEOUL';
      if (savedEn === CURRENT_LOCATION_EN) { const here = cachedCurrentLocation(); if (here) return here; }
      const cached = localStorage.getItem('cached_calendar_weather_cities');
      if (cached) {
        const parsed: CityWeatherConfig[] = JSON.parse(cached);
        const found = parsed.find(c => c.nameEn.toUpperCase() === savedEn.toUpperCase());
        if (found) return found;
      }
    } catch (_) {}
    return { name: '서울', nameEn: 'SEOUL', lat: 37.5665, lng: 126.9780, country: 'KR', timezone: 'Asia/Seoul' };
  });

  const [globalWeatherData, setGlobalWeatherData] = useState<CityWeatherData | null>(null);

  const [isGlobalWeatherBgEnabled, setIsGlobalWeatherBgEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('calendar_weather_bg_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [ambienceOverride, setAmbienceOverride] = useState<{ weatherCode: number; precipitationProb: number } | null>(null);

  // Listen for weather city change, ambience toggle & date-specific override across all hubs
  useEffect(() => {
    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent<CityWeatherConfig>;
      if (customEvent.detail && customEvent.detail.nameEn) {
        setGlobalWeatherCity(customEvent.detail);
      }
    };
    const handleBgToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setIsGlobalWeatherBgEnabled(customEvent.detail);
      }
    };
    const handleAmbienceOverride = (e: Event) => {
      const customEvent = e as CustomEvent<{ weatherCode: number; precipitationProb: number } | null>;
      setAmbienceOverride(customEvent.detail || null);
    };

    window.addEventListener('selectedWeatherCityChanged', handleCityChange);
    window.addEventListener('weatherBgToggled', handleBgToggle);
    window.addEventListener('weatherAmbienceOverride', handleAmbienceOverride);

    return () => {
      window.removeEventListener('selectedWeatherCityChanged', handleCityChange);
      window.removeEventListener('weatherBgToggled', handleBgToggle);
      window.removeEventListener('weatherAmbienceOverride', handleAmbienceOverride);
    };
  }, []);

  // Each account keeps its own weather location, weather background and screen mode (users/{uid}/settings/prefs).
  // On sign-in the account's choices replace this device's cache; a first sign-in stores the current ones.
  const applyUserPrefs = (uid: string) => {
    loadUserPrefs(uid).then(async prefs => {
      if (!prefs.weatherCity && prefs.weatherBg === undefined && !prefs.nightMode) {
        let bg = true;
        try { bg = localStorage.getItem('calendar_weather_bg_enabled') !== 'false'; } catch (_) {}
        saveUserPref({ weatherCity: localStorage.getItem('selected_weather_city_en') || 'SEOUL', weatherBg: bg, nightMode: (localStorage.getItem('nightModeSetting') as NightModeSetting) || 'auto' });
        return;
      }
      if (prefs.nightMode) setNightModeSetting(prefs.nightMode);
      if (isMapStyle(prefs.mapStyle)) applyMapStyle(prefs.mapStyle, false);
      if (prefs.journeyOpen === 'record' || prefs.journeyOpen === 'magazine') applyJourneyOpen(prefs.journeyOpen, false);
      if (prefs.weatherBg !== undefined) {
        setIsGlobalWeatherBgEnabled(prefs.weatherBg);
        try { localStorage.setItem('calendar_weather_bg_enabled', String(prefs.weatherBg)); } catch (_) {}
        window.dispatchEvent(new CustomEvent('weatherBgToggled', { detail: prefs.weatherBg }));
      }
      if (prefs.weatherCity === CURRENT_LOCATION_EN) {
        // Resolve on this device without prompting; otherwise keep the last known spot
        const here = cachedCurrentLocation();
        if (await locationGranted()) {
          locateMe().then(selectWeatherCity).catch(() => { if (here) selectWeatherCity(here); });
        } else if (here) selectWeatherCity(here);
      } else if (prefs.weatherCity) {
        try {
          const list: CityWeatherConfig[] = JSON.parse(localStorage.getItem('cached_calendar_weather_cities') || '[]');
          const found = list.find(c => c.nameEn.toUpperCase() === prefs.weatherCity!.toUpperCase());
          if (found) {
            localStorage.setItem('selected_weather_city_en', found.nameEn);
            window.dispatchEvent(new CustomEvent('selectedWeatherCityChanged', { detail: found }));
          }
        } catch (_) {}
      }
    });
  };

  // Reset ambience override when navigating between views/hubs so today's live weather is restored
  useEffect(() => {
    setAmbienceOverride(null);
  }, [currentView]);

  // Fetch live weather data for the globally selected city
  useEffect(() => {
    if (!globalWeatherCity) return;
    let isCancelled = false;
    fetchCityWeather(
      globalWeatherCity.lat,
      globalWeatherCity.lng,
      globalWeatherCity.timezone,
      globalWeatherCity.nameEn,
      globalWeatherCity.country
    ).then(data => {
      if (!isCancelled) {
        setGlobalWeatherData(data);
      }
    }).catch(err => {
      console.warn("Global weather fetch notice:", err);
    });

    return () => { isCancelled = true; };
  }, [globalWeatherCity]);

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
  const [activeTripId, setActiveTripId] = useState<number | null>(() => initialNavState.tripId);
  // The quick finder lists the journeys opened lately on this device
  useEffect(() => { if (activeTripId != null) noteRecentJourney(activeTripId); }, [activeTripId]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [tripsLoaded, setTripsLoaded] = useState<boolean>(false);
  const [plansLoaded, setPlansLoaded] = useState<boolean>(false);
  
  const [timelineData, setTimelineData] = useState<TimelineData>(() => {
    try {
      const cached = localStorage.getItem('cached_timeline');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {};
  });
  const [flightsByTrip, setFlightsByTrip] = useState<{ [id: number]: FlightItem[] }>(() => {
    try {
      const cached = localStorage.getItem('cached_flights');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {};
  });
  const [staysByTrip, setStaysByTrip] = useState<{ [id: number]: StayItem[] }>(() => {
    try {
      const cached = localStorage.getItem('cached_stays');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {};
  });
  const [transitByTrip, setTransitByTrip] = useState<{ [id: number]: TransitItem[] }>(() => {
    try {
      const cached = localStorage.getItem('cached_transits');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {};
  });
  const [homeTitle, setHomeTitle] = useState("Your Personal Travel Magazine.");
  const [homeSubtitle, setHomeSubtitle] = useState("나만의 감성으로 기록하고 보관하는 여행 아카이브.");
  const [heroJourneyIds, setHeroJourneyIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('heroJourneyIds');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [heroMediaType, setHeroMediaType] = useState<'image' | 'video'>('image');
  
  const [heroSlideDuration, setHeroSlideDuration] = useState<number>(() => {
    const saved = localStorage.getItem('hero_slide_duration');
    return saved ? parseInt(saved, 10) : 6;
  });
  const [heroAutoSlide, setHeroAutoSlide] = useState<boolean>(true);
  const [marqueeShow, setMarqueeShow] = useState<boolean>(() => {
    return localStorage.getItem('marqueeShow') === 'true';
  });
  const [marqueeMessage, setMarqueeMessage] = useState<string>("WELCOME TO TRIPGON LOG — PLAN YOUR JOURNEY OR EXPLORE ARCHIVED LOGS.");
  const [marqueeSpeed, setMarqueeSpeed] = useState<number>(30);
  const [homeGradientEnabled, setHomeGradientEnabled] = useState<boolean>(() => localStorage.getItem('home_gradient_enabled') === 'true');
  const [homeGradientFrom, setHomeGradientFrom] = useState<string>(() => localStorage.getItem('home_gradient_from') || '#F7F2EB');
  const [homeGradientTo, setHomeGradientTo] = useState<string>(() => localStorage.getItem('home_gradient_to') || '#E7DEC8');
  const [landingHeroImage, setLandingHeroImage] = useState<string>(() => localStorage.getItem('landing_hero_image') || '');
  const [landingHeroMedia, setLandingHeroMedia] = useState<LandingHeroMediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('landing_hero_media');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchFocusItemId, setSearchFocusItemId] = useState<number | null>(null);
  const [searchFocusTab, setSearchFocusTab] = useState<string | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState<boolean>(false);
  const [isManageDirty, setIsManageDirty] = useState<boolean>(false);
  const [marqueeOverrideText, setMarqueeOverrideText] = useState<string | null>(null);
  const [showSaveCompleteModal, setShowSaveCompleteModal] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [journeyDeleteConfirm, setJourneyDeleteConfirm] = useState<{ isOpen: boolean; tripId: number | null; title: string }>({
    isOpen: false,
    tripId: null,
    title: ''
  });
  const [pendingNavigation, setPendingNavigation] = useState<{ view: string; tripId: number | null } | null>(null);
  const detailSaveRef = useRef<((showModal?: boolean) => Promise<void>) | null>(null);
  const manageSaveRef = useRef<((showModal?: boolean) => Promise<void>) | null>(null);
  const postSaveNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postSaveNavTargetRef = useRef<{ view: string; tripId: number | null } | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [flightTransition, setFlightTransition] = useState<{
    isActive: boolean;
    targetTripId: number | null;
    destinationTitle?: string;
  }>({ isActive: false, targetTripId: null });
  // settingsLoaded: true once Firestore settings/home listener fires (prevents premature hydration)
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  // Background idle prefetch: Preloads heavy routes only when browser is completely idle & connected
  useEffect(() => {
    const cancelPrefetch = scheduleIdlePrefetch(2500);
    return () => cancelPrefetch();
  }, []);

  // Background Tab Recovery Guard: Eliminates blank/white screen when returning to an idle browser tab
  useEffect(() => {
    const handleTabReentry = () => {
      if (document.visibilityState === 'visible') {
        // 1. Clear any pending animation or navigation locks
        setIsNavigating(false);
        setFlightTransition({ isActive: false, targetTripId: null });

        // 2. Ensure currentView is valid; fallback to home if corrupted or empty
        setCurrentView(prev => {
          const validViews = ['home', 'archive', 'magazine', 'calendar', 'map', 'manage', 'detail', 'pocket'];
          return validViews.includes(prev) ? prev : 'home';
        });

        // 3. Resync Auth state if needed
        if (auth.currentUser) {
          setIsLoggedIn(true);
        }

        // 4. Fallback hydration from localStorage if memory was trimmed during sleep
        try {
          const cachedTrips = localStorage.getItem('cached_trips');
          if (cachedTrips) {
            setTrips(prev => (prev.length === 0 ? applyJourneyOrder(JSON.parse(cachedTrips)) : prev));
          }
          const cachedPlans = localStorage.getItem('cached_plans');
          if (cachedPlans) {
            setPlans(prev => (prev.length === 0 ? applyJourneyOrder(JSON.parse(cachedPlans)) : prev));
          }
        } catch (_) {}
      }
    };

    document.addEventListener('visibilitychange', handleTabReentry);
    window.addEventListener('pageshow', handleTabReentry);
    window.addEventListener('focus', handleTabReentry);

    return () => {
      document.removeEventListener('visibilitychange', handleTabReentry);
      window.removeEventListener('pageshow', handleTabReentry);
      window.removeEventListener('focus', handleTabReentry);
    };
  }, []);

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
        setShowSaveCompleteModal(false);
        navigateTo(view, tripId, true, null, true);
      }, 1000);
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
  const isSuperAdmin = Boolean(
    currentUserEmail && (
      currentUserEmail === superAdminEmail.toLowerCase().trim() ||
      currentUserEmail === SUPER_ADMIN_EMAIL
    )
  );
  const isGuest = currentUserEmail.startsWith('guest') || currentUserEmail.includes('guest') || Boolean(auth.currentUser?.isAnonymous);
  
  // Super Admin or users with admin role have full management rights
  const isAdmin = isLoggedIn && (
    isSuperAdmin || 
    currentUserProfile?.role === 'admin' || 
    adminEmails.includes(currentUserEmail) || 
    ADMIN_EMAILS.includes(currentUserEmail)
  );

  // The signed-in account as Firebase reports it. isLoggedIn starts true from localStorage before
  // Firebase restores the session, so it cannot tell the profile listener when the account arrives.
  const [authUid, setAuthUid] = useState<string | null>(() => auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, user => setAuthUid(user?.uid ?? null)), []);

  // Sync current user's profile from Firestore users collection
  useEffect(() => {
    if (!authUid || auth.currentUser?.uid !== authUid) {
      setCurrentUserProfile(null);
      return;
    }
    const currentUid = authUid;
    let unsubPublic: (() => void) | null = null;
    const unsub = onSnapshot(doc(db, 'users', currentUid), (snapshot) => {
      // A document with no identity in it (left by older builds) is not a profile
      if (snapshot.exists() && !isGhostProfile(snapshot.data())) {
        const profile = snapshot.data() as UserProfile;
        // Pending members stay read-only until they verify their email (enforced by Firestore rules)
        if (!isSuperAdmin && profile.status === 'rejected') {
          // Explicitly rejected by admin
          auth.signOut();
          setIsLoggedIn(false);
          setCurrentUserProfile(null);
          notify('이용이 제한된 계정입니다.');
          return;
        }
        setCurrentUserProfile(profile);
      } else if (isSuperAdmin) {
        // Auto initialize super admin profile in Firestore if not yet exists
        const adminProfile: UserProfile = {
          uid: currentUid,
          email: SUPER_ADMIN_EMAIL,
          lastName: 'SUPER',
          firstName: 'ADMIN',
          birthdate: '',
          phone: '',
          role: 'admin',
          permissions: { canCreate: true, canEdit: true, canDelete: true },
          createdAt: Date.now(),
        };
        setDoc(doc(db, 'users', currentUid), adminProfile, { merge: true });
        setDoc(doc(db, 'users', 'public', 'users', currentUid), adminProfile, { merge: true });
        setCurrentUserProfile(adminProfile);
      } else {
        // Fallback to public users collection
        if (!unsubPublic) {
          unsubPublic = onSnapshot(doc(db, 'users', 'public', 'users', currentUid), (pubSnap) => {
            if (pubSnap.exists() && !isGhostProfile(pubSnap.data())) {
              const pubProfile = pubSnap.data() as UserProfile;
              if (!isSuperAdmin && pubProfile.status === 'rejected') {
                auth.signOut();
                setIsLoggedIn(false);
                setCurrentUserProfile(null);
                notify('이용이 제한된 계정입니다.');
                return;
              }
              setCurrentUserProfile(pubProfile);
            } else {
              // Neither profile exists: the operator deleted this member (v1.3.6). A session that
              // was still signed in removes its account instead of living on as an empty member.
              // Accounts made minutes ago may still be writing their profile, so they are left alone.
              const user = auth.currentUser;
              if (user && user.uid === currentUid && !pubSnap.metadata.fromCache && !isSigningUpRef.current && isSettledAccount(user)) {
                hasNoProfile(currentUid).then(gone => {
                  if (!gone || auth.currentUser?.uid !== currentUid) return;
                  setCurrentUserProfile(null);
                  clearOrphanAccount(user).finally(() => notify('삭제된 계정입니다. 같은 이메일로 다시 가입할 수 있습니다.'));
                }).catch(() => {});
              }
            }
          }, (pubErr) => {
            console.warn('Failed to listen to public user profile fallback:', pubErr);
          });
        }
      }
    }, (err) => {
      console.warn('Failed to listen to user profile, listening to public fallback:', err);
      if (!unsubPublic) {
        unsubPublic = onSnapshot(doc(db, 'users', 'public', 'users', currentUid), (pubSnap) => {
          if (pubSnap.exists()) {
            const pubProfile = pubSnap.data() as UserProfile;
            setCurrentUserProfile(pubProfile);
          }
        });
      }
    });
    return () => {
      unsub();
      if (unsubPublic) unsubPublic();
    };
  }, [isSuperAdmin, isLoggedIn, authUid]);

  // Update lastActiveAt heartbeat periodically (every 5 minutes and on mount)
  // Only updates profiles that exist: a merge write here used to recreate a deleted member's
  // shared profile as an empty "ghost" row in the manage hub.
  const hasProfile = Boolean(currentUserProfile);
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser || !hasProfile) return;
    const currentUid = auth.currentUser.uid;
    const updateActivity = () => {
      const now = Date.now();
      Promise.allSettled([
        updateDoc(doc(db, 'users', currentUid), { lastActiveAt: now }),
        updateDoc(doc(db, 'users', 'public', 'users', currentUid), { lastActiveAt: now }),
      ]).catch(() => {});
    };

    updateActivity();
    const interval = setInterval(updateActivity, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, [isLoggedIn, hasProfile]);

  // Trip permission helpers: Super Admin/Admin has all rights; users can edit/delete their own trips, or trips they are delegated to
  // Own content (v1.3.6): the owner edits and deletes; editors the owner named may edit.
  // Journeys from before the move to owners (no ownerId yet) stay with the operator account.
  const canEditTrip = useCallback((trip?: Trip) => {
    if (!isLoggedIn || !trip) return false;
    if (currentUserProfile?.status === 'pending' && !isEmailVerified) return false;
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    if (!trip.ownerId) return isAdmin;
    return trip.ownerId === uid || Boolean(trip.editors?.includes(uid));
  }, [isLoggedIn, isAdmin, currentUserProfile, isEmailVerified]);

  const canDeleteTrip = useCallback((trip?: Trip) => {
    if (!isLoggedIn || !trip) return false;
    if (currentUserProfile?.status === 'pending' && !isEmailVerified) return false;
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    if (!trip.ownerId) return isAdmin;
    return trip.ownerId === uid;
  }, [isLoggedIn, isAdmin, currentUserProfile, isEmailVerified]);

  // May write shared content: the same test as the rules' canWrite (v1.3.6)
  const canWriteContent = isLoggedIn && (isAdmin || (currentUserProfile?.status !== 'rejected'
    && (currentUserProfile?.status !== 'pending' || isEmailVerified)));

  // This member as friends see them: name and picture (v1.3.6 5-a)
  const myCard = useMemo<PersonCard | null>(() => {
    const uid = auth.currentUser?.uid;
    return isLoggedIn && uid && currentUserProfile ? personCard(uid, currentUserProfile, auth.currentUser?.displayName) : null;
  }, [isLoggedIn, currentUserProfile]);
  useEffect(() => { setNotificationSender(myCard); }, [myCard]);

  // Global shortcuts: Ctrl+K (한번에 찾기), / (통합 검색), Ctrl+, (Settings), Ctrl+Shift+L (Night Mode), F (Fullscreen)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Command palette Ctrl+K / Cmd+K (its last row opens the full search)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isLoggedIn) window.dispatchEvent(new Event(TOGGLE_PALETTE_EVENT));
        else setIsSearchOpen(prev => !prev);
        return;
      }

      // 2. Settings / Management Hub shortcut: Ctrl + , (Cmd + ,)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (isLoggedIn && isAdmin) {
          if (currentView === 'manage') {
            const returnView = sessionStorage.getItem('lastNonManageView') || 'home';
            navigateTo(returnView);
          } else {
            sessionStorage.setItem('lastNonManageView', currentView);
            sessionStorage.setItem('initialManageTab', currentView.toUpperCase());
            navigateTo('manage');
          }
        } else {
          setIsManageModalOpen(true);
        }
        return;
      }

      // 3. Night Mode 3-Tier Cycle shortcut: Ctrl + Shift + L (Cmd + Shift + L)
      // 순환: AUTO -> DAY(LIGHT) -> NIGHT(DARK) -> AUTO
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleCycleNightMode();
        return;
      }

      // 4. Ignore single-key shortcuts if user is currently typing
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      // 5. / : the full search (Ctrl+K is the quick finder); not while another layer covers the page
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !document.documentElement.hasAttribute('data-overlay')) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // 6. F key: Toggle Fullscreen across whole app
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
  }, [isLoggedIn, isAdmin, currentView]);

  // Redirect non-admin if they try to access Management Hub
  useEffect(() => {
    if (!isAuthReady) return;
    if (currentView === 'manage' && (!isLoggedIn || !isAdmin)) {
      notify("관리자(Admin) 계정만 Management Hub를 이용할 수 있습니다. 여정은 상세 페이지에서 편집하실 수 있습니다.");
      navigateTo('home', null, true);
    }
  }, [currentView, isLoggedIn, isAdmin, isAuthReady]);

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
        .map(f => `${f.fromCode} → ${f.toCode} (${f.flightNo})`)
        .join(', ');

      // Extract stay details
      const tripStays = staysByTrip[activeTrip.id] || [];
      const stayInfo = tripStays
        .map(s => s.title)
        .join(', ');

      text = `${title} • ${location} • ${duration}`;
      if (flightInfo) text += ` • FLIGHT: ${flightInfo}`;
      if (stayInfo) text += ` • STAY: ${stayInfo}`;
      if (tagsStr) text += ` • ${tagsStr.toUpperCase()}`;
    } else {
      text = marqueeMessage || '';
    }

    const repeated = Array(6).fill(text).join('   ·   ');
    return `${repeated}   ·   `;
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

  // Synchronize nightModeSetting with isDarkMode and set up auto timer (18:00 ~ 06:00)
  useEffect(() => {
    try {
      localStorage.setItem('nightModeSetting', nightModeSetting);
    } catch (_) {}
    saveUserPref({ nightMode: nightModeSetting });

    if (nightModeSetting === 'dark') {
      setIsDarkMode(true);
      return;
    }
    if (nightModeSetting === 'light') {
      setIsDarkMode(false);
      return;
    }

    // 'auto' mode: sync immediately and setup periodic check + visibility listener
    const updateAutoNight = () => {
      setIsDarkMode(isNightTimeNow());
    };
    updateAutoNight();

    const intervalId = setInterval(updateAutoNight, 60000); // Check every minute
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        updateAutoNight();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [nightModeSetting]);

  // Sync isDarkMode to html element classlist for Tailwind dark: modifiers and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('isDarkMode', isDarkMode.toString());
    } catch (_) {}
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

  // Shared home settings and the sign-in listener (journey content is subscribed after sign-in, below)
  useEffect(() => {
    // Home settings (v1.3.6): the shared doc holds the landing, ticker and music; each member's own
    // doc holds their hero journeys and magazine. Each listener applies only its own keys.
    const applyHomeSettings = (data: Record<string, any>) => {
      {
        if (data.title) setHomeTitle(data.title);
        if (data.subtitle) setHomeSubtitle(data.subtitle);
        if (Array.isArray(data.heroJourneyIds)) {
          setHeroJourneyIds(data.heroJourneyIds);
          localStorage.setItem('heroJourneyIds', JSON.stringify(data.heroJourneyIds));
        }
        if (data.heroAutoSlide !== undefined) setHeroAutoSlide(data.heroAutoSlide);
        if (data.heroMediaType !== undefined) setHeroMediaType(data.heroMediaType);
        if (data.marqueeShow !== undefined) {
          setMarqueeShow(data.marqueeShow);
          localStorage.setItem('marqueeShow', String(data.marqueeShow));
        }
        if (data.marqueeMessage !== undefined) {
          setMarqueeMessage(data.marqueeMessage);
          localStorage.setItem('marqueeMessage', data.marqueeMessage);
        }
        if (data.marqueeSpeed !== undefined) {
          setMarqueeSpeed(data.marqueeSpeed);
          localStorage.setItem('marqueeSpeed', String(data.marqueeSpeed));
        }
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
        if (data.landingHeroImage !== undefined) {
          setLandingHeroImage(data.landingHeroImage);
          localStorage.setItem('landing_hero_image', data.landingHeroImage);
        }
        if (Array.isArray(data.landingHeroMedia)) {
          setLandingHeroMedia(data.landingHeroMedia);
          try {
            localStorage.setItem('landing_hero_media', JSON.stringify(data.landingHeroMedia));
          } catch (_) {}
        } else if (data.landingHeroImage) {
          // Fallback migration from single image
          const fallbackMedia: LandingHeroMediaItem[] = [{
            id: 'legacy-hero',
            url: data.landingHeroImage,
            type: 'image',
            title: 'FEATURED MOMENT'
          }];
          setLandingHeroMedia(fallbackMedia);
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
        if (Array.isArray(data.bgmPlaylist) && data.bgmPlaylist.length > 0) {
          saveStoredBgmTracks(data.bgmPlaylist);
        }
        if (data.bgmAutoplay !== undefined) {
          saveStoredBgmAutoplay(data.bgmAutoplay);
        }
        if (data.bgmDefaultVolume !== undefined) {
          saveStoredBgmDefaultVolume(data.bgmDefaultVolume);
        }
        if (data.bgmShuffle !== undefined) {
          saveStoredBgmShuffle(data.bgmShuffle);
        }
        if (data.slideshowInterval !== undefined) {
          saveStoredSlideshowInterval(data.slideshowInterval);
        }
      }
    };
    homeSettingsApplierRef.current = applyHomeSettings;
    const unsubSettings = onSnapshot(doc(db, 'users', 'public', 'settings', 'home'), (docSnap) => {
      if (docSnap.exists()) applyHomeSettings(pickHomeKeys(docSnap.data(), 'shared'));
      // Always mark settings as loaded, even if doc doesn't exist (prevents premature hydration)
      setSettingsLoaded(true);
    }, (err) => {
      console.error("Settings snapshot subscription error:", err);
      // Still mark as loaded on error, so hydration can proceed with fallback
      setSettingsLoaded(true);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If we are in the middle of creating an account, ignore this transient login event
        if (isSigningUpRef.current) return;
        setIsEmailVerified(user.emailVerified);
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        applyUserPrefs(user.uid);
        if (initialAuthCheckedRef.current) {
          setCurrentView('home');
        }
      } else {
        // Also ignore the signOut that happens at the end of signup flow
        if (isSigningUpRef.current) {
          initialAuthCheckedRef.current = true;
          setIsAuthReady(true);
          return;
        }
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
      }
      initialAuthCheckedRef.current = true;
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  // Journey content this member may see (v1.3.6): their own and their family's journeys, followed
  // live once sign-in is known. A journey opened by share link loads on its own, signed in or not.
  const shareTripId = isShareMode ? activeTripId : null;
  useEffect(() => {
    if (!isAuthReady) return;
    const uid = auth.currentUser?.uid;
    const unsubs: Array<() => void> = [];
    const onError = (label: string) => (err: Error) => {
      console.error(`${label} snapshot subscription error:`, err);
      setDbError(err.message);
    };

    const journeys = (col: 'trips' | 'plans', docs: Trip[]) => {
      registerJourneys(docs);
      const ordered = applyJourneyOrder(docs);
      if (col === 'trips') { setTrips(ordered); setTripsLoaded(true); } else { setPlans(ordered as Plan[]); setPlansLoaded(true); }
      setDbError(null);
      try { localStorage.setItem(col === 'trips' ? 'cached_trips' : 'cached_plans', JSON.stringify(ordered)); } catch (_) {}
    };
    const timeline = (docs: Record<string, any>[]) => {
      const grouped: TimelineData = {};
      docs.forEach(data => {
        const date = data.date as string;
        if (!grouped[date]) grouped[date] = [];
        const { date: _, ...item } = data;
        grouped[date].push({ ...item, date } as TimelineItem);
      });
      Object.keys(grouped).forEach(date => grouped[date].sort((a, b) => a.id - b.id));
      setTimelineData(grouped);
      try { localStorage.setItem('cached_timeline', JSON.stringify(grouped)); } catch (_) {}
    };
    const byTrip = <T extends { id: number }>(docs: Record<string, any>[]) => {
      const grouped: { [tripId: number]: T[] } = {};
      docs.forEach(data => {
        const tripId = data.tripId as number;
        if (!grouped[tripId]) grouped[tripId] = [];
        const { tripId: _, ...item } = data;
        grouped[tripId].push(item as unknown as T);
      });
      Object.keys(grouped).forEach(tid => grouped[Number(tid)].sort((a, b) => a.id - b.id));
      return grouped;
    };
    const apply = {
      trips: (docs: any[]) => journeys('trips', docs as Trip[]),
      plans: (docs: any[]) => journeys('plans', docs as Trip[]),
      timeline,
      flights: (docs: any[]) => { const g = byTrip<FlightItem>(docs); setFlightsByTrip(g); try { localStorage.setItem('cached_flights', JSON.stringify(g)); } catch (_) {} },
      stays: (docs: any[]) => { const g = byTrip<StayItem>(docs); setStaysByTrip(g); try { localStorage.setItem('cached_stays', JSON.stringify(g)); } catch (_) {} },
      transits: (docs: any[]) => { const g = byTrip<TransitItem>(docs); setTransitByTrip(g); try { localStorage.setItem('cached_transits', JSON.stringify(g)); } catch (_) {} },
    };

    if (shareTripId !== null && shareTripId !== undefined) {
      // A shared journey: the journey itself (a trip or a plan) and its items marked for link sharing
      (['trips', 'plans'] as const).forEach(col => {
        unsubs.push(onSnapshot(doc(db, 'users', 'public', col, String(shareTripId)), snap => {
          if (snap.exists()) apply[col]([snap.data()]);
          else if (col === 'trips') setTripsLoaded(true); else setPlansLoaded(true);
        }, () => { if (col === 'trips') setTripsLoaded(true); else setPlansLoaded(true); }));
      });
      (['timeline', 'flights', 'stays', 'transits'] as const).forEach(col => {
        unsubs.push(onSnapshot(sharedContent(col, shareTripId), snap => apply[col](snap.docs.map(d => d.data())), onError(col)));
      });
    } else if (uid && isLoggedIn) {
      CONTENT_COLLECTIONS.forEach(col => {
        const q = visibleContent(col);
        if (q) unsubs.push(onSnapshot(q, snap => apply[col](snap.docs.map(d => d.data())), onError(col)));
      });
      // This member's hero journeys and magazine
      unsubs.push(onSnapshot(doc(db, 'users', uid, 'settings', 'home'), snap => {
        if (snap.exists()) homeSettingsApplierRef.current?.(pickHomeKeys(snap.data(), 'personal'));
      }, () => {}));
    } else {
      // Signed out: nothing of the previous account stays on screen or in this device's cache
      setTrips([]);
      setPlans([]);
      setTimelineData({});
      setFlightsByTrip({});
      setStaysByTrip({});
      setTransitByTrip({});
      ['cached_trips', 'cached_plans', 'cached_timeline', 'cached_flights', 'cached_stays', 'cached_transits'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      setTripsLoaded(true);
      setPlansLoaded(true);
    }
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, isLoggedIn, shareTripId]);

  // Trash and admin config are readable only when signed in (Firestore rules).
  // Subscribe after auth resolves so a sign-in without reload re-creates the listeners.
  useEffect(() => {
    if (!isAuthReady || !isLoggedIn) return;
    const uid = 'public';

    const trashQuery = ownTrash();
    if (!trashQuery) return;
    const unsubTrash = onSnapshot(trashQuery, (snapshot) => {
      const journeyList: Trip[] = [];
      const sectionList: TrashedMagazineSection[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.deletedType === 'magazine_section' || (data.items && data.id && typeof data.id === 'string' && !data.locationStr && !data.tags)) {
          sectionList.push({
            ...data,
            id: data.id || doc.id,
            docId: doc.id,
          } as unknown as TrashedMagazineSection);
        } else {
          journeyList.push({
            ...data,
            id: typeof data.id === 'number' ? data.id : (Number(doc.id) || data.id),
            docId: doc.id,
          } as unknown as Trip);
        }
      });
      setTrashedJourneys(journeyList.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)));
      setTrashedSections(sectionList.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)));
    }, (err) => {
      console.error("Trash snapshot subscription error:", err);
    });

    const unsubAdmin = onSnapshot(doc(db, 'users', uid, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.superAdminEmail && typeof data.superAdminEmail === 'string') {
          const email = data.superAdminEmail.toLowerCase().trim();
          setSuperAdminEmail(email);
          try {
            localStorage.setItem('cached_super_admin_email', email);
          } catch (_) {}
        }
        const customAdmins = Array.isArray(data.allowedAdmins) ? data.allowedAdmins.map((e: string) => String(e).toLowerCase().trim()) : [];
        const dynamicSuper = data.superAdminEmail ? [data.superAdminEmail.toLowerCase().trim()] : [];
        setAdminEmails(Array.from(new Set([...ADMIN_EMAILS, ...dynamicSuper, ...customAdmins])));
      }
    }, (err) => {
      console.warn("Admin snapshot subscription notice:", err);
    });

    return () => {
      unsubTrash();
      unsubAdmin();
      // Signed out: drop trash data that is no longer readable
      setTrashedJourneys([]);
      setTrashedSections([]);
    };
  }, [isAuthReady, isLoggedIn]);

  // Email verification (v1.3.6): a pending member who has clicked the link (here or on another
  // device) is approved on their next load; ?verified=1 is where the link lands.
  const profileStatus = currentUserProfile?.status;
  useEffect(() => {
    if (!isLoggedIn || !profileStatus) return;
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get('verified') === '1';
    if (fromLink) {
      params.delete('verified');
      const rest = params.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);
    }
    if (profileStatus !== 'pending') return;
    completeVerification('pending')
      .then(ok => {
        setIsEmailVerified(ok);
        if (ok && fromLink) notify('메일 인증이 끝났습니다. 이제 여정을 만들 수 있습니다.', 'success');
      })
      .catch(() => {});
  }, [isLoggedIn, profileStatus]);

  // Friend invites (v1.3.6 5-a): ?invite=CODE is kept until the member has signed in (and, for a
  // new member, verified their email), then "OO님과 친구가 될까요?" is asked once.
  useEffect(() => {
    if (!isAuthReady) return;
    const fromUrl = takeInviteFromUrl();
    if (fromUrl && !isLoggedIn) {
      notify('로그인하면 친구 초대를 받을 수 있습니다.', 'info');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
    }
  }, [isAuthReady]);

  const myUid = myCard?.uid;
  useEffect(() => {
    if (!myCard) return;
    const code = pendingInvite();
    if (!code) return;
    if (!canWriteContent) {
      notify('메일 인증을 마치면 친구 초대를 받을 수 있습니다.', 'info');
      return;
    }
    promptAcceptInvite(code, myCard);
  }, [myUid, canWriteContent]);

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

  // (v1.3.6) No sample data is written for an empty list any more: a new member starts empty.

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

        // Strict 1:1 match by timelineItemId only
        let match: TimelineItem | undefined;
        if (m.timelineItemId !== undefined) {
          match = allTimelineItems.find(t => 
            Number(t.tripId) === Number(m.tripId) && 
            (Number(t.id) === Number(m.timelineItemId) || String(t.id) === String(m.timelineItemId))
          );
        }

        if (match) {
          const parentTrip = trips.find(trip => Number(trip.id) === Number(m.tripId)) || plans.find(plan => Number(plan.id) === Number(m.tripId));
          const tripTimeline = allTimelineItems.filter(t => Number(t.tripId) === Number(m.tripId));
          const resolvedPlace = resolveTimelinePlaceName(match, tripTimeline, parentTrip);
          const newTitle = match.place || m.title;
          const newDate = match.date || m.date;

          // Never overwrite m.img unless m.img is completely empty
          const newImg = m.img || match.img || '';

          if (
            (!m.img && newImg) ||
            m.title !== newTitle ||
            (resolvedPlace && m.placeName !== resolvedPlace) ||
            (newDate && m.date !== newDate)
          ) {
            secChanged = true;
            hasDifferences = true;
            return {
              ...m,
              img: newImg,
              title: newTitle,
              placeName: resolvedPlace || m.placeName,
              date: newDate || m.date,
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
      if (isLoggedIn) {
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

  // Sync state with browser History API on initial load
  useEffect(() => {
    window.history.replaceState(
      { view: initialNavState.view, tripId: initialNavState.tripId, isShare: initialNavState.isShare },
      '',
      window.location.pathname + window.location.search
    );

    try {
      localStorage.setItem('has_visited', 'true');
      localStorage.setItem('last_active_time', Date.now().toString());
      sessionStorage.setItem('splash_shown', 'true');
    } catch (_) {}
  }, []);

  // Listen to popstate events for browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 뒤로가기 시 진행 중인 비행기 전환 즉시 강제 취소 (원복 및 지연 방지)
      setFlightTransition({ isActive: false, targetTripId: null });

      const state = event.state;
      const isUnsaved = (currentView === 'manage' && isManageDirty) || (currentView === 'detail' && isDetailEditing);
      if (isUnsaved) {
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

      // Leaving manage or detail safely resets dirty flags
      if (currentView === 'manage') setIsManageDirty(false);
      if (currentView === 'detail') setIsDetailEditing(false);

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
        } else if (path === '/calendar' || window.location.hash === '#calendar') {
          setCurrentView('calendar');
        } else if (path === '/pocket' || window.location.hash === '#pocket') {
          setCurrentView('pocket');
        } else {
          setCurrentView('home');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDetailEditing, isManageDirty, currentView, activeTripId]);

  const navigateTo = (view: string, tripId: number | null = null, pushHistory = true, tagFilter: string | null = null, force = false) => {
    // A layer closed by its own button is still stepping history back; navigate once that has landed
    if (isLayerBackPending()) {
      afterLayerBack(() => navigateTo(view, tripId, pushHistory, tagFilter, force));
      return;
    }
    const isUnsaved = (currentView === 'manage' && isManageDirty) || (currentView === 'detail' && isDetailEditing);
    if (!force && isUnsaved && (view !== 'detail' || (tripId !== null && tripId !== activeTripId))) {
      setPendingNavigation({ view, tripId });
      setShowUnsavedModal(true);
      return;
    }

    // Leaving manage or detail safely resets dirty flags
    if (view !== 'manage' && currentView === 'manage') setIsManageDirty(false);
    if (view !== 'detail' && currentView === 'detail') setIsDetailEditing(false);

    // Entering manage: automatically record previous non-manage view for seamless return
    if (view === 'manage' && currentView !== 'manage') {
      try {
        sessionStorage.setItem('lastNonManageView', currentView);
        sessionStorage.setItem('initialManageTab', currentView.toUpperCase());
      } catch (_) {}
    }

    // Close any residual save complete modal upon navigation
    setShowSaveCompleteModal(false);

    // 트립허브나 다른 화면으로 이동 시 잔여 비행기 전환 즉시 강제 취소 (원복 증상 원천 차단)
    if (view !== 'detail' || (tripId !== null && tripId !== flightTransition.targetTripId)) {
      setFlightTransition({ isActive: false, targetTripId: null });
    }

    // 트립카드 클릭으로 여정 상세 페이지로 진입 시 비행기 활공 전환 애니메이션 실행
    if (!force && currentView !== 'detail' && view === 'detail' && tripId !== null) {
      const targetTrip = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
      const destTitle = targetTrip?.title || '';
      setFlightTransition({
        isActive: true,
        targetTripId: tripId,
        destinationTitle: destTitle,
      });
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

    setIsNavigating(true);
    const applyView = () => {
      setCurrentView(effectiveView);
      setSelectedTagFilter(tagFilter);
    };
    // Hub-to-hub changes cross-fade with a View Transition; same-view updates stay a plain transition
    if (effectiveView !== currentView) {
      runViewTransition(applyView, (fn) => startTransition(fn));
    } else {
      startTransition(applyView);
    }
    setTimeout(() => {
      setIsNavigating(false);
    }, 280);

    // Always scroll to top when changing views
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    try {
      sessionStorage.setItem('lastView', effectiveView);
      localStorage.setItem('lastView', effectiveView);
      if (tripId || activeTripId) {
        sessionStorage.setItem('lastTripId', String(tripId || activeTripId));
        localStorage.setItem('lastTripId', String(tripId || activeTripId));
      }
    } catch (_) {}

    if (pushHistory) {
      let path = '/';
      if (effectiveView === 'archive') path = '/archive';
      else if (effectiveView === 'magazine') path = '/magazine';
      else if (effectiveView === 'map') path = '/map';
      else if (effectiveView === 'manage') path = '/manage';
      else if (effectiveView === 'calendar') path = '/calendar';
      else if (effectiveView === 'pocket') path = '/pocket';
      else if (effectiveView === 'detail') {
        const idToUse = tripId || activeTripId;
        const isShare = (effectiveView === 'detail' && (tripId === activeTripId || tripId === null || tripId === idToUse)) ? isShareMode : false;
        path = idToUse ? `/detail?id=${idToUse}${isShare ? '&share=true' : ''}` : '/detail';
      }

      const currentPath = window.location.pathname + window.location.search;
      // Leaving from inside a layer: the new page replaces the layer's history entry
      const fromLayer = takeOverLayerEntry();
      if (currentPath === path || fromLayer) {
        window.history.replaceState({ 
          view: effectiveView, 
          mode: effectiveView === 'magazine' ? 'hub' : undefined, 
          tripId: tripId || activeTripId 
        }, '', path);
      } else {
        window.history.pushState({ 
          view: effectiveView, 
          mode: effectiveView === 'magazine' ? 'hub' : undefined, 
          tripId: tripId || activeTripId 
        }, '', path);
      }
    }
  };

  const handleFlightHalfway = useCallback(() => {
    if (flightTransition.isActive && flightTransition.targetTripId) {
      navigateTo('detail', flightTransition.targetTripId, true, null, true);
    }
  }, [flightTransition.isActive, flightTransition.targetTripId]);

  const handleFlightComplete = useCallback(() => {
    setFlightTransition({ isActive: false, targetTripId: null });
  }, []);

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
      notify("정보 저장에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleMoveToArchive = async (plan: Plan) => {
    if (!isLoggedIn) return notify("로그인 후 이용 가능합니다.");

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
      notify("로그(여정)로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleMoveToPlans = async (trip: Trip) => {
    if (!isLoggedIn) return notify("로그인 후 이용 가능합니다.");

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
      notify("플랜으로 이동하는 데 실패했습니다. Firebase 권한 설정을 확인해주세요.");
    }
  };

  const handleCloneJourney = async (tripId: number) => {
    if (!isLoggedIn) return notify("로그인 후 이용 가능합니다.");
    const oldTrip = trips.find(t => t.id === tripId);
    const oldPlan = plans.find(p => p.id === tripId);
    const oldJourney = oldTrip || oldPlan;
    if (!oldJourney) return notify("여정을 찾을 수 없습니다.");

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
        getDocs(journeyItems('timeline', tripId)),
        getDocs(journeyItems('flights', tripId)),
        getDocs(journeyItems('stays', tripId)),
        getDocs(journeyItems('transits', tripId))
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
      notify("여정이 성공적으로 복제되었습니다.");
    } catch (err: any) {
      console.error("Error cloning journey:", err);
      notify("여정 복제에 실패했습니다.");
    }
  };

  // Journey Remix (P5-4): a new plan made of places and stays picked from another journey
  const handleRemixJourney = async (sourceId: number, payload: RemixPayload) => {
    const user = auth.currentUser;
    if (!isLoggedIn || !user) { notify('로그인 후 이용 가능합니다.'); return; }
    const source = [...trips, ...plans].find(j => j.id === sourceId);
    if (!source) { notify('여정을 찾을 수 없습니다.'); return; }

    const pad = (n: number) => String(n).padStart(2, '0');
    const dotted = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    const start = new Date(`${payload.startDate}T00:00:00`);
    const dayCount = Math.max(1, payload.days.length);
    const pocketDay = Math.min(Math.max(0, payload.pocketDay || 0), dayCount - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + dayCount - 1);
    const dateRange = dayCount > 1 ? `${dotted(start)} - ${dotted(end).slice(5)}` : dotted(start);

    const newId = Date.now();
    const newPlan: any = {
      id: newId,
      title: payload.title,
      date: dateRange,
      tags: [...(source.tags || []).filter(t => t !== 'Plan' && t !== 'plan'), 'Plan'],
      img: source.img,
      mapImg: source.mapImg,
      locationStr: source.locationStr,
      lat: source.lat,
      lng: source.lng,
      locations: source.locations || [],
      country: source.country || '',
      gallery: [],
      members: [],
      statusBadge: 'PLAN',
      isPlan: true,
      displayOrder: 0,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      allowedEditors: [],
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', 'public', 'plans', String(newId)), cleanForFirestore(newPlan));
      payload.days.forEach((items, dayIdx) => {
        const day = new Date(start);
        day.setDate(day.getDate() + dayIdx);
        const date = dotted(day);
        items.forEach((item, i) => {
          const id = newId + (dayIdx + 1) * 1000 + i;
          // Keep where and what; leave the old times, costs and payers behind
          batch.set(doc(db, 'users', 'public', 'timeline', String(id)), cleanForFirestore({
            id, date, tripId: newId,
            time: '', type: item.type || 'activity', place: item.place, title: item.place,
            location: item.location || item.place, lat: item.lat, lng: item.lng,
            memo: item.memo || '', link: item.link, hours: item.hours, img: item.img || null,
            cost: '-', vehicleType: item.vehicleType ?? null,
          }));
        });
      });
      payload.pockets.forEach((p, i) => {
        const day = new Date(start);
        day.setDate(day.getDate() + pocketDay);
        const id = newId + 800000 + i;
        batch.set(doc(db, 'users', 'public', 'timeline', String(id)), cleanForFirestore({
          id, date: dotted(day), tripId: newId,
          time: '', type: p.category === 'food' || p.category === 'cafe' ? 'food' : 'activity',
          place: p.title, title: p.title, location: p.address || p.title, lat: p.lat, lng: p.lng,
          memo: p.memo || '', link: p.linkUrl || p.sourceUrl, img: p.thumbnailUrl || null, cost: '-',
        }));
      });
      payload.stays.forEach((st, i) => {
        const id = newId + 900000 + i;
        batch.set(doc(db, 'users', 'public', 'stays', String(id)), cleanForFirestore({
          id, tripId: newId, status: 'PLANNED', title: st.title, dateRange: '', address: st.address,
          memo: st.memo || '', confNo: '', img: st.img, lat: st.lat, lng: st.lng, additionalImages: st.additionalImages || [],
        }));
      });
      // Everyone else moves back one place, so the new plan is first on every device
      orderWithNewFirst([...trips, ...plans], newId).slice(1).forEach((id, idx) => {
        const col = plans.some(p => p.id === id) ? 'plans' : 'trips';
        batch.update(doc(db, 'users', 'public', col, String(id)), { displayOrder: idx + 1 });
      });
      await batch.commit();
      notify(`"${payload.title}" 계획을 만들었습니다.`, 'success');
      navigateTo('detail', newId, true, null, true);
    } catch (err) {
      console.error('Error remixing journey:', err);
      notify('Remix에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
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
    magazineSectionsParam?: MagazineSection[],
    landingHeroImageParam?: string,
    landingHeroMediaParam?: LandingHeroMediaItem[]
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

      if (landingHeroImageParam !== undefined) {
        dataToSave.landingHeroImage = landingHeroImageParam;
      }
      if (landingHeroMediaParam !== undefined) {
        dataToSave.landingHeroMedia = cleanForFirestore(landingHeroMediaParam);
      }
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

      setHomeTitle(title);
      setHomeSubtitle(subtitle);
      setHeroJourneyIds(heroIds);
      localStorage.setItem('heroJourneyIds', JSON.stringify(heroIds));
      if (landingHeroImageParam !== undefined) {
        setLandingHeroImage(landingHeroImageParam);
        localStorage.setItem('landing_hero_image', landingHeroImageParam);
      }
      if (landingHeroMediaParam !== undefined) {
        setLandingHeroMedia(landingHeroMediaParam);
        try {
          localStorage.setItem('landing_hero_media', JSON.stringify(landingHeroMediaParam));
        } catch (_) {}
      }
      if (autoSlide !== undefined) setHeroAutoSlide(autoSlide);
      if (heroMediaTypeParam !== undefined) setHeroMediaType(heroMediaTypeParam);
      if (showMarquee !== undefined) {
        setMarqueeShow(showMarquee);
        localStorage.setItem('marqueeShow', String(showMarquee));
      }
      if (marqueeMsg !== undefined) {
        setMarqueeMessage(marqueeMsg);
        localStorage.setItem('marqueeMessage', marqueeMsg);
      }
      if (marqueeSpd !== undefined) {
        setMarqueeSpeed(marqueeSpd);
        localStorage.setItem('marqueeSpeed', String(marqueeSpd));
      }
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
      notify("관리자(Admin)만 잡지 연출 설정을 저장할 수 있습니다.");
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
      notify("잡지 연출 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveMagazineHubConfig = async (config: MagazineHubConfig) => {
    if (!isLoggedIn || !isAdmin) {
      notify("관리자(Admin)만 매거진 허브 설정을 저장할 수 있습니다.");
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
      notify("매거진 허브 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveArchiveHubConfig = async (config: ArchiveHubConfig) => {
    if (!isLoggedIn || !isAdmin) {
      notify("관리자(Admin)만 여정 허브 설정을 저장할 수 있습니다.");
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
      notify("여정 허브 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleSaveMagazineSections = async (sections: MagazineSection[]) => {
    if (!isLoggedIn || !isAdmin) {
      notify("관리자(Admin)만 매거진 설정을 저장할 수 있습니다.");
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
      notify("매거진 설정 저장에 실패했습니다.");
      throw err;
    }
  };

  const handleUpdateMagazineSections = (sections: MagazineSection[]) => {
    setMagazineSections(sections);
    try {
      localStorage.setItem('cached_magazine_sections', JSON.stringify(sections));
    } catch (_) {}
  };

  const handleSaveBgmSettings = async (
    tracks: BgmTrack[],
    autoplay?: boolean,
    defaultVolume?: number,
    shuffle?: boolean,
    defaultInterval?: number
  ) => {
    try {
      saveStoredBgmTracks(tracks);
      if (autoplay !== undefined) {
        saveStoredBgmAutoplay(autoplay);
      }
      if (defaultVolume !== undefined) {
        saveStoredBgmDefaultVolume(defaultVolume);
      }
      if (shuffle !== undefined) {
        saveStoredBgmShuffle(shuffle);
      }
      if (defaultInterval !== undefined) {
        saveStoredSlideshowInterval(defaultInterval);
      }

      const dataToSave: any = {
        bgmPlaylist: cleanForFirestore(tracks),
      };
      if (autoplay !== undefined) {
        dataToSave.bgmAutoplay = autoplay;
      }
      if (defaultVolume !== undefined) {
        dataToSave.bgmDefaultVolume = defaultVolume;
      }
      if (shuffle !== undefined) {
        dataToSave.bgmShuffle = shuffle;
      }
      if (defaultInterval !== undefined) {
        dataToSave.slideshowInterval = defaultInterval;
      }

      await setDoc(doc(db, 'users', 'public', 'settings', 'home'), cleanForFirestore(dataToSave), { merge: true });
    } catch (err) {
      console.error("Failed to save BGM settings to Firestore:", err);
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

  const handleEditTripSave = async (tripId: number, updatedData: Partial<Trip>, extra?: { renames?: Record<string, string> }) => {
    if (!isLoggedIn) return;
    const isPlan = plans.some(p => String(p.id) === String(tripId));
    const collectionName = isPlan ? 'plans' : 'trips';
    const oldTrip = (isPlan ? plans : trips).find(t => String(t.id) === String(tripId));
    const dateChanged = oldTrip && updatedData.date && oldTrip.date !== updatedData.date;
    const renames = extra?.renames || {};
    // A member renamed to a friend's name keeps their custom expenses (5-c)
    if (Object.keys(renames).length && oldTrip?.customExpenses?.length) {
      updatedData = { ...updatedData, customExpenses: oldTrip.customExpenses.map(e => (renames[e.paidBy] ? { ...e, paidBy: renames[e.paidBy] } : e)) };
    }

    try {
      await setDoc(doc(db, 'users', 'public', collectionName, String(tripId)), cleanForFirestore(updatedData), { merge: true });
      await renameMembersInItems(tripId, renames).catch(err => console.warn('Member rename on items failed:', err));
      // Linked friends see the journey (view; the share sheet raises it to edit)
      if (myCard && updatedData.memberLinks?.length) {
        await shareWithMembers(tripId, isPlan, updatedData.memberLinks, myCard)
          .catch(err => { console.warn('Sharing with linked members failed:', err); notify('친구에게 공유하지 못했습니다. 공유 시트에서 다시 시도해 주세요.', 'error'); });
      }

      if (dateChanged && oldTrip && updatedData.date) {
        const oldDates = generateDateList(oldTrip.date);
        const newDates = generateDateList(updatedData.date);
        if (oldDates.length > 0 && newDates.length > 0) {
          const snapshot = await getDocs(journeyItems('timeline', tripId));
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
      notify("여정 정보 저장에 실패했습니다.");
      throw err;
    }
  };

  // Every "new trip" entry point opens the new trip sheet
  const handleCreateTripForCountry = (countryName: string, cityName?: string, initialDate?: string, pocketIds?: string[]) => {
    if (!isLoggedIn) return notify("로그인 후 이용 가능합니다.");
    setCreateModalType('plan');
    setNewTripPrefill({ country: countryName || undefined, city: cityName || undefined, date: initialDate || undefined, pocketIds });
  };

  const handleCreateJourney = async (
    title: string,
    dateRange: string,
    location: string,
    tags: string[],
    lat?: number,
    lng?: number,
    members?: string[],
    locations?: { name: string; lat?: number; lng?: number; country?: string }[],
    statusBadge?: string,
    country?: string,
    customCoverImg?: string,
    customTimelineItems?: { date: string; items: any[] }[],
    /** Where the journey goes; defaults to the open create modal's kind */
    kindOverride?: 'archive' | 'plan'
  ) => {
    const user = auth.currentUser;
    if (!user) return;
    const kind = kindOverride ?? createModalType;

    const newId = Date.now();
    const defaultImg = kind === 'archive'
      ? 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop';
    const img = customCoverImg || defaultImg;

    const mapImg = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop';
    const collectionName = kind === 'archive' ? 'trips' : 'plans';

    // Calculate front-most display order
    // 신규 여정은 무조건 맨 앞(인덱스 0)에 위치하며, 기존 여정들은 뒤로 차례대로 순차 정렬
    const updatedOrder = orderWithNewFirst([...trips, ...plans], newId);

    // Ensure unique journey title if identical title already exists
    let finalTitle = (title || '').trim();
    const allExistingJourneys = [...trips, ...plans];
    const existingTitles = new Set(allExistingJourneys.map(j => (j.title || '').trim().toLowerCase()));
    if (existingTitles.has(finalTitle.toLowerCase())) {
      const baseName = finalTitle.replace(/\s*#\d+$/, '').trim();
      let nextNumber = 2;
      while (existingTitles.has(`${baseName} #${nextNumber}`.toLowerCase())) {
        nextNumber++;
      }
      finalTitle = `${baseName} #${nextNumber}`;
    }

    const newJourney: any = {
      id: newId,
      title: finalTitle,
      date: dateRange,
      tags: kind === 'plan' ? [...tags, 'Plan'] : tags,
      img,
      mapImg,
      locationStr: location,
      lat,
      lng,
      locations: locations || [],
      gallery: [],
      members: members || [],
      statusBadge: statusBadge || '',
      country: country || '',
      displayOrder: 0,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      allowedEditors: []
    };

    try {
      // 1. Save journey doc immediately with cleanForFirestore to purge undefined values
      await setDoc(doc(db, 'users', 'public', collectionName, String(newId)), cleanForFirestore(newJourney));
      // Members picked from the friend list see the new journey from the start (5-c)
      if (myCard && members?.length) {
        await linkFriendMembersByName(newId, collectionName === 'plans', members, myCard)
          .catch(err => console.warn('Linking friend members failed:', err));
      }

      // 1-1. 기존 여정들의 displayOrder를 배치 업데이트하여 클라우드 서버 영속성 보장 (일관된 최신순 정렬)
      try {
        const batch = writeBatch(db);
        const allOther = [...trips, ...plans].filter(t => t.id !== newId);
        allOther.forEach((it) => {
          const newIdx = updatedOrder.indexOf(it.id);
          const effectiveIdx = newIdx !== -1 ? newIdx : ((it.displayOrder ?? 0) + 1);
          const col = plans.some(p => p.id === it.id) ? 'plans' : 'trips';
          batch.update(doc(db, 'users', 'public', col, String(it.id)), { displayOrder: effectiveIdx });
        });
        await batch.commit();
      } catch (orderErr) {
        console.warn('Batch displayOrder sync warning:', orderErr);
      }

      // 2. Generate template or custom timeline items
      const generateTemplateDays = (): { date: string; items: any[] }[] => {
        if (customTimelineItems && customTimelineItems.length > 0) {
          return customTimelineItems;
        }
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
            const finalDate = item.date || date;
            const placeVal = (item.place || item.title || '').trim() || '일정 스팟';
            const locationVal = (item.location || item.place || item.title || '').trim();
            batch.set(doc(db, 'users', 'public', 'timeline', String(item.id)), cleanForFirestore({
              ...item,
              place: placeVal,
              title: item.title || placeVal,
              location: locationVal,
              date: finalDate,
              tripId: newId
            }));
          });
        });
        await batch.commit();
      }

      // Navigate to the new journey
      navigateTo('detail', newId, true, null, true);

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
      notify("여정 생성에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
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
      notify('로그인 후 저장할 수 있습니다.');
      return;
    }

    try {
      const uid = 'public';

      // ── 1. Update trip/plan document ──────────────────────────────────────
      const isPlan = plans.some(p => p.id === tripId);
      const collectionName = isPlan ? 'plans' : 'trips';

      // Parallelize fetching existing documents to delete
      const [timelineSnap, flightsSnap, staysSnap, transitsSnap] = await Promise.all([
        getDocs(journeyItems('timeline', tripId)),
        getDocs(journeyItems('flights', tripId)),
        getDocs(journeyItems('stays', tripId)),
        getDocs(journeyItems('transits', tripId))
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
        let finalItems = (sec.items || []).map(m => {
          const newM = syncMoment(m);
          if (newM !== m) secChanged = true;
          return newM;
        });

        // If this section is linked to the currently updated trip, sync newly added timeline items in chronological order
        const isLinkedSection = Number(sec.heroTripId) === Number(tripId) || 
          sec.id === `section-${tripId}` || 
          sec.id.startsWith(`trip-section-${tripId}-`);

        if (isLinkedSection) {
          const syncResult = syncSectionItemsWithTimeline(
            finalItems,
            updatedTimeline,
            updatedTrip
          );
          if (syncResult.addedCount > 0 || syncResult.changesCount > 0) {
            secChanged = true;
            finalItems = syncResult.syncedItems;
          }
        }

        let newHeroImg = sec.heroImg;
        const tripCover = updatedTrip.heroImg || updatedTrip.img;
        // Only set tripCover if sec.heroImg is completely empty, preserving user-selected or auto-generated hero moments
        if (sec.heroTripId === tripId && !sec.heroImg && tripCover) {
          newHeroImg = tripCover;
          secChanged = true;
        }

        if (secChanged) {
          hasMagazineChanges = true;
          return { ...sec, items: finalItems, heroImg: newHeroImg };
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

      setMarqueeOverrideText("JOURNEY SAVED SUCCESSFULLY!");
      setTimeout(() => {
        setMarqueeOverrideText(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error saving journey details:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      // Provide user-friendly message based on error type
      if (err?.code === 'permission-denied') {
        notify('저장 권한이 없습니다. 로그인 상태를 확인해주세요.');
      } else if (err?.code === 'unavailable') {
        notify('네트워크 연결을 확인해주세요.');
      } else {
        notify(`저장에 실패했습니다. (${err?.code || err?.message || '알 수 없는 오류'})`);
      }
      throw err;
    }
  };

  const handleDeleteJourney = async (tripId: number) => {
    if (!isLoggedIn) return;
    const tripToDelete = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
    const journeyTitle = tripToDelete?.title || '이 여정';
    setJourneyDeleteConfirm({
      isOpen: true,
      tripId,
      title: journeyTitle
    });
  };

  const handleConfirmDeleteJourney = async () => {
    const tripId = journeyDeleteConfirm.tripId;
    if (!tripId || !isLoggedIn) {
      setJourneyDeleteConfirm({ isOpen: false, tripId: null, title: '' });
      return;
    }

    const tripToDelete = trips.find(t => t.id === tripId) || plans.find(p => p.id === tripId);
    const journeyTitle = tripToDelete?.title || journeyDeleteConfirm.title;
    setJourneyDeleteConfirm({ isOpen: false, tripId: null, title: '' });

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
      
      // If currently on Manage page, DO NOT navigate to home - stay on manage page!
      if (currentView === 'detail' && activeTripId === tripId) {
        navigateTo('archive');
      } else if (currentView !== 'manage') {
        navigateTo('archive');
      }
    } catch (err: any) {
      console.error("Error soft-deleting journey:", err);
      notify("삭제에 실패했습니다. Firebase 권한 설정을 확인해주세요.");
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
      notify(`'${trashed.title}' 여정이 성공적으로 복구되었습니다.`);
    } catch (err: any) {
      console.error("Error restoring journey:", err);
      notify("복구에 실패했습니다.");
    }
  };

  const handlePermanentDeleteJourney = async (tripId: number) => {
    if (!isLoggedIn) return;

    try {
      const batch = writeBatch(db);
      const trashRef = doc(db, 'users', 'public', 'trash', String(tripId));
      batch.delete(trashRef);

      // Clean timeline items for this trip
      const timelineSnap = await getDocs(visibleContent('timeline')!);
      timelineSnap.forEach(doc => {
        const data = doc.data();
        if (Number(data.tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const flightsSnap = await getDocs(visibleContent('flights')!);
      flightsSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const staysSnap = await getDocs(visibleContent('stays')!);
      staysSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      const transitsSnap = await getDocs(visibleContent('transits')!);
      transitsSnap.forEach(doc => {
        if (Number(doc.data().tripId) === Number(tripId)) batch.delete(doc.ref);
      });

      await batch.commit();

      // Local state update immediately
      setTrashedJourneys(prev => prev.filter(t => t.id !== tripId));
    } catch (err: any) {
      console.error("Error permanently deleting journey:", err);
      throw err;
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
      notify(`'${target.title}' 매거진 섹션이 휴지통으로 이동되었습니다.\n\n휴지통(TRASH) 탭에서 복원하거나 완전히 삭제할 수 있습니다.`);
    } catch (err) {
      console.error("Error soft-deleting magazine section:", err);
      notify("매거진 섹션 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleRestoreMagazineSection = async (sectionId: string) => {
    if (!isLoggedIn || !isAdmin) return;
    const trashed = trashedSections.find(s => s.id === sectionId || s.docId === sectionId || `section-${s.id}` === sectionId);
    if (!trashed) return;

    try {
      const { deletedType: _, deletedAt: __, docId: ___, ...cleanSection } = trashed as any;
      
      // Collect all possible trash docIds to ensure 100% complete deletion from trash
      const targetDocIds = new Set<string>();
      if (trashed.docId) targetDocIds.add(trashed.docId);
      if (sectionId) {
        targetDocIds.add(sectionId);
        targetDocIds.add(sectionId.startsWith('section-') ? sectionId : `section-${sectionId}`);
      }
      if (trashed.id) {
        targetDocIds.add(trashed.id);
        targetDocIds.add(trashed.id.startsWith('section-') ? trashed.id : `section-${trashed.id}`);
      }

      // 1. Delete from trash
      await Promise.all(
        Array.from(targetDocIds).map(dId => 
          deleteDoc(doc(db, 'users', 'public', 'trash', dId)).catch(err => console.warn('deleteDoc error:', err))
        )
      );

      // Local state update immediately
      setTrashedSections(prev => prev.filter(s => s.id !== sectionId && s.docId !== trashed.docId && `section-${s.id}` !== sectionId));

      // 2. Add to active magazine sections
      const updated = [...magazineSections, { ...cleanSection, order: magazineSections.length }];
      await handleSaveMagazineSections(updated);
      notify(`'${trashed.title}' 매거진 섹션이 성공적으로 복구되었습니다.`);
    } catch (err) {
      console.error("Error restoring magazine section:", err);
      notify("매거진 섹션 복구 중 오류가 발생했습니다.");
    }
  };

  const handlePermanentDeleteMagazineSection = async (sectionId: string) => {
    if (!isLoggedIn || !isAdmin) return;
    const trashed = trashedSections.find(s => s.id === sectionId || s.docId === sectionId || `section-${s.id}` === sectionId);

    try {
      // Collect all possible trash docIds to ensure 100% complete deletion from trash
      const targetDocIds = new Set<string>();
      if (trashed?.docId) targetDocIds.add(trashed.docId);
      if (sectionId) {
        targetDocIds.add(sectionId);
        targetDocIds.add(sectionId.startsWith('section-') ? sectionId : `section-${sectionId}`);
      }
      if (trashed?.id) {
        targetDocIds.add(trashed.id);
        targetDocIds.add(trashed.id.startsWith('section-') ? trashed.id : `section-${trashed.id}`);
      }

      await Promise.all(
        Array.from(targetDocIds).map(dId => 
          deleteDoc(doc(db, 'users', 'public', 'trash', dId)).catch(err => console.warn('deleteDoc error:', err))
        )
      );

      // Local state update immediately so it never stays in the UI
      setTrashedSections(prev => prev.filter(s => s.id !== sectionId && s.docId !== trashed?.docId && `section-${s.id}` !== sectionId));
    } catch (err) {
      console.error("Error permanently deleting magazine section:", err);
      throw err;
    }
  };

  const handleBatchPermanentDelete = async (params: { journeyIds: number[]; sectionIds: string[] }) => {
    if (!isLoggedIn || !isAdmin) return;
    const { journeyIds, sectionIds } = params;
    if (journeyIds.length === 0 && sectionIds.length === 0) return;

    try {
      // 1. Delete Magazine Sections
      if (sectionIds.length > 0) {
        const targetSectionDocIds = new Set<string>();
        sectionIds.forEach(sId => {
          const sec = trashedSections.find(s => s.id === sId || s.docId === sId || `section-${s.id}` === sId);
          if (sec?.docId) targetSectionDocIds.add(sec.docId);
          targetSectionDocIds.add(sId);
          targetSectionDocIds.add(sId.startsWith('section-') ? sId : `section-${sId}`);
          if (sec?.id) {
            targetSectionDocIds.add(sec.id);
            targetSectionDocIds.add(sec.id.startsWith('section-') ? sec.id : `section-${sec.id}`);
          }
        });

        await Promise.all(
          Array.from(targetSectionDocIds).map(dId => 
            deleteDoc(doc(db, 'users', 'public', 'trash', dId)).catch(err => console.warn('deleteDoc error:', err))
          )
        );

        setTrashedSections(prev => prev.filter(s => 
          !sectionIds.includes(s.id) && (!s.docId || !targetSectionDocIds.has(s.docId))
        ));
      }

      // 2. Delete Journeys & Sub-items
      if (journeyIds.length > 0) {
        const batch = writeBatch(db);
        const journeyIdSet = new Set(journeyIds.map(Number));

        journeyIds.forEach(jId => {
          const trashRef = doc(db, 'users', 'public', 'trash', String(jId));
          batch.delete(trashRef);
        });

        const timelineSnap = await getDocs(visibleContent('timeline')!);
        timelineSnap.forEach(doc => {
          const data = doc.data();
          if (journeyIdSet.has(Number(data.tripId))) batch.delete(doc.ref);
        });

        const flightsSnap = await getDocs(visibleContent('flights')!);
        flightsSnap.forEach(doc => {
          if (journeyIdSet.has(Number(doc.data().tripId))) batch.delete(doc.ref);
        });

        const staysSnap = await getDocs(visibleContent('stays')!);
        staysSnap.forEach(doc => {
          if (journeyIdSet.has(Number(doc.data().tripId))) batch.delete(doc.ref);
        });

        const transitsSnap = await getDocs(visibleContent('transits')!);
        transitsSnap.forEach(doc => {
          if (journeyIdSet.has(Number(doc.data().tripId))) batch.delete(doc.ref);
        });

        await batch.commit();

        setTrashedJourneys(prev => prev.filter(t => !journeyIdSet.has(t.id)));
      }
    } catch (err) {
      console.error("Error in batch permanent delete:", err);
      throw err;
    }
  };

  // Redirect guest if they try to view a Plan detail page
  useEffect(() => {
    if (currentView === 'detail' && activeTrip) {
      const isPlan = plans.some(p => String(p.id) === String(activeTrip.id));
      if (!isLoggedIn && isPlan) {
        notify("이 계획 여정은 로그인 후 조회할 수 있습니다.");
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

  const isGlobalGradientActive = (currentView === 'home' || currentView === 'archive' || currentView === 'magazine' || currentView === 'calendar' || currentView === 'pocket' || currentView === 'detail') && homeGradientEnabled && !isDarkMode;
  const isHomeGradientActive = isGlobalGradientActive;
  const appGradientStyle = isGlobalGradientActive
    ? { background: `linear-gradient(135deg, ${homeGradientFrom} 0%, ${homeGradientTo} 100%)` }
    : undefined;

  return {
    initialNavState, currentView, setCurrentView, nightModeSetting, setNightModeSetting, isDarkMode,
    setIsDarkMode, nightModeSettingRef, nightModeHud, setNightModeHud, nightModeHudTimerRef,
    showSplash, setShowSplash, handleFinishSplash, triggerNightModeHud, handleCycleNightMode,
    canWriteContent, myCard,
    isLoggedIn, setIsLoggedIn, isEmailVerified, setIsEmailVerified, isAuthReady, setIsAuthReady, superAdminEmail, setSuperAdminEmail,
    adminEmails, setAdminEmails, magazineMoments, setMagazineMoments, magazineSections,
    setMagazineSections, homeMagazineSectionId, setHomeMagazineSectionId, homeMagazineLimit,
    setHomeMagazineLimit, magazineHubConfig, setMagazineHubConfig, archiveHubConfig,
    setArchiveHubConfig, showSettings, setShowSettings, isEditMode, setIsEditMode, isAuthModalOpen,
    setIsAuthModalOpen, isShareMode, setIsShareMode, isManageModalOpen, setIsManageModalOpen,
    createModalType, setCreateModalType, authModalMode, setAuthModalMode,
    initialAuthCheckedRef, isSigningUpRef, globalWeatherCity, setGlobalWeatherCity,
    globalWeatherData, setGlobalWeatherData, isGlobalWeatherBgEnabled, setIsGlobalWeatherBgEnabled,
    ambienceOverride, setAmbienceOverride, trips, setTrips, plans, setPlans, trashedJourneys,
    setTrashedJourneys, trashedSections, setTrashedSections, activeTripId, setActiveTripId,
    selectedTagFilter, setSelectedTagFilter, dbError, setDbError, tripsLoaded, setTripsLoaded,
    plansLoaded, setPlansLoaded, timelineData, setTimelineData, flightsByTrip, setFlightsByTrip,
    staysByTrip, setStaysByTrip, transitByTrip, setTransitByTrip, homeTitle, setHomeTitle,
    homeSubtitle, setHomeSubtitle, heroJourneyIds, setHeroJourneyIds, editingTripId,
    setEditingTripId, heroMediaType, setHeroMediaType, heroSlideDuration, setHeroSlideDuration,
    heroAutoSlide, setHeroAutoSlide, marqueeShow, setMarqueeShow, marqueeMessage, setMarqueeMessage,
    marqueeSpeed, setMarqueeSpeed, homeGradientEnabled, setHomeGradientEnabled, homeGradientFrom,
    setHomeGradientFrom, homeGradientTo, setHomeGradientTo, landingHeroImage, setLandingHeroImage,
    landingHeroMedia, setLandingHeroMedia, currentUserProfile, setCurrentUserProfile, isSearchOpen,
    setIsSearchOpen, searchFocusItemId, setSearchFocusItemId, searchFocusTab, setSearchFocusTab,
    isDetailEditing, setIsDetailEditing, isManageDirty, setIsManageDirty, marqueeOverrideText,
    setMarqueeOverrideText, showSaveCompleteModal, setShowSaveCompleteModal, showUnsavedModal,
    setShowUnsavedModal, journeyDeleteConfirm, setJourneyDeleteConfirm, pendingNavigation,
    setPendingNavigation, detailSaveRef, manageSaveRef, postSaveNavTimerRef, postSaveNavTargetRef,
    isNavigating, setIsNavigating, flightTransition, setFlightTransition, settingsLoaded,
    setSettingsLoaded, handleCloseSaveCompleteModal, handleSaveAndNavigate, handleDiscardAndNavigate,
    handleCancelUnsavedModal, currentUserEmail, isSuperAdmin, isGuest, isAdmin, canEditTrip,
    canDeleteTrip, activeTrip, displayMarqueeText, marqueeTrips, seedUserData, navigateTo,
    handleFlightHalfway, handleFlightComplete, handleSearchResultClick, handleUpdateTrip,
    handleMoveToArchive, handleMoveToPlans, handleCloneJourney, handleRemixJourney, handleSaveSettings,
    handleSaveMagazineMoments, handleSaveMagazineHubConfig, handleSaveArchiveHubConfig,
    handleSaveMagazineSections, handleUpdateMagazineSections, handleSaveBgmSettings,
    generateDateList, handleEditTripSave, handleCreateTripForCountry, newTripPrefill, setNewTripPrefill,
    handleCreateJourney, handleSaveJourneyDetails, handleDeleteJourney, handleConfirmDeleteJourney,
    handleRestoreJourney, handlePermanentDeleteJourney, handleDeleteMagazineSection,
    handleRestoreMagazineSection, handlePermanentDeleteMagazineSection, handleBatchPermanentDelete,
    activeFlights, activeStays, activeTransits, existingTags, isGlobalGradientActive,
    isHomeGradientActive, appGradientStyle
  };
}

export type AppState = ReturnType<typeof useAppState>;
