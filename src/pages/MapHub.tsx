import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List, Clock, LocateFixed, Plane, Sun, Moon, Droplets, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Plan, UserProfile } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';
import { TripBuilderPanel } from '../components/TripBuilderPanel';
import { findCityByNameOrAlias, DestinationCountry, DestinationCity, PresetTripPlan, WORLD_CITIES } from '../data/worldDestinations';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../utils/weatherApi';
import { resolveMarkerOverlaps, clusterByPixel } from '../utils/mapMarkerOverlap';
import { getNightTerminatorPolygon, shiftPolygonCoordinates, getContinuousNightPolygon, getSolarAltitude, nightAlphaForAltitude, paintNightMask, getSubsolarPoint } from '../utils/solarTerminator';
import { notify } from '../utils/feedback';

import { COUNTRIES_DATA, KNOWN_CITY_COORDS, CITY_KO_MAP, findCountryForGroup, COUNTRY_TIMEZONE_MAP, getCountryLiveTime, getOptimalCurrencyUnit, shiftGeoJsonCoordinates } from './map/mapData';
import type { CountryInfo } from './map/mapData';
import { MapLayerPanel } from './map/MapLayerPanel';

let cachedCountriesGeoJson: any = null;

interface MapPinGroup {
  city: string;
  country: string;
  lat: number;
  lng: number;
  journeys: (Trip | Plan)[];
}

interface MapHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onCreateTripForCountry?: (countryName: string, cityName?: string) => void;
  isDarkMode: boolean;
  isAdmin?: boolean;
  onSaveTrip?: (
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
    customTimelineItems?: { date: string; items: any[] }[]
  ) => void;
  initialBuilderOpen?: boolean;
  initialBuilderCountry?: string;
  initialBuilderCity?: string;
  initialBuilderDate?: string;
  onBuilderStateChange?: (isOpen: boolean) => void;
  currentUserProfile?: UserProfile | null;
}

export function MapHubPage({
  trips,
  plans,
  onNavigate,
  onCreateTripForCountry,
  isDarkMode,
  isAdmin = false,
  onSaveTrip,
  initialBuilderOpen = false,
  initialBuilderCountry = '',
  initialBuilderCity = '',
  initialBuilderDate = '',
  onBuilderStateChange,
  currentUserProfile,
}: MapHubPageProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const nightTileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const highlightLayerRef = useRef<any>(null);
  const selectPinRef = useRef<any>(null);
  const yellowMarkersRef = useRef<any[]>([]);
  const countryDotsRef = useRef<any[]>([]);
  const geoJsonDataRef = useRef<any>(cachedCountriesGeoJson);
  const prevDestCitiesCountRef = useRef<number>(0);
  const terminatorLayerRef = useRef<any>(null);
  const nightLightsLayerRef = useRef<any>(null);
  const [isDayNightEnabled, setIsDayNightEnabled] = useState<boolean>(true);
  const [currentClockTime, setCurrentClockTime] = useState<Date>(() => new Date());
  // Day/night preview (P5-6): shift the terminator and city lights up to 12 hours either way
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const timeOffsetRef = useRef<number>(0);
  timeOffsetRef.current = timeOffsetHours;
  const sceneNow = () => new Date(Date.now() + timeOffsetRef.current * 3600000);
  const redrawDayNightRef = useRef<() => void>(() => {});
  const previewTimeLabel = useMemo(() => {
    const d = new Date(currentClockTime.getTime() + timeOffsetHours * 3600000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [currentClockTime, timeOffsetHours]);

  // Real-time map clock tick (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time formatted clock string (HH:mm:ss for desktop, HH:mm for mobile)
  const formattedClockTime = useMemo(() => {
    const hh = String(currentClockTime.getHours()).padStart(2, '0');
    const mm = String(currentClockTime.getMinutes()).padStart(2, '0');
    const ss = String(currentClockTime.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [currentClockTime]);

  const formattedClockShort = useMemo(() => {
    const hh = String(currentClockTime.getHours()).padStart(2, '0');
    const mm = String(currentClockTime.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [currentClockTime]);

  // In-place Trip Builder Split-Screen State
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(() => Boolean(initialBuilderOpen));
  const [builderCountry, setBuilderCountry] = useState<string>(initialBuilderCountry);
  const [builderCountryCode, setBuilderCountryCode] = useState<string>('');
  const [builderCity, setBuilderCity] = useState<string>(initialBuilderCity);
  const [builderCities, setBuilderCities] = useState<string[]>([]);
  const [builderDate, setBuilderDate] = useState<string>(initialBuilderDate);
  const builderRouteLayerRef = useRef<any>(null);
  const builderMarkersRef = useRef<any[]>([]);
  const builderActiveTargetRef = useRef<{
    name: string;
    center?: [number, number];
    zoom?: number;
    bounds?: any;
  } | null>(null);
  const [builderTargetName, setBuilderTargetName] = useState<string>('');
  const [isMapDivergedFromBuilder, setIsMapDivergedFromBuilder] = useState<boolean>(false);

  // Sync initial props & sessionStorage pockets
  useEffect(() => {
    if (initialBuilderOpen) {
      setIsBuilderOpen(true);
      if (initialBuilderCountry) setBuilderCountry(initialBuilderCountry);
      if (initialBuilderCity) setBuilderCity(initialBuilderCity);
      if (initialBuilderDate) setBuilderDate(initialBuilderDate);
      setSelectedCountry(null);
    } else {
      try {
        const storedPockets = sessionStorage.getItem('builder_selected_pockets');
        const targetCountry = sessionStorage.getItem('builder_target_country');
        const targetCity = sessionStorage.getItem('builder_target_city');
        if (storedPockets) {
          setIsBuilderOpen(true);
          if (targetCountry) setBuilderCountry(targetCountry);
          if (targetCity) setBuilderCity(targetCity);
          setSelectedCountry(null);
        }
      } catch (_) {}
    }
  }, [initialBuilderOpen, initialBuilderCountry, initialBuilderCity, initialBuilderDate]);

  // Invalidate Leaflet size on builder split change & sync isBuilderOpenRef & notify parent
  const isBuilderOpenRef = useRef<boolean>(isBuilderOpen);
  useEffect(() => {
    isBuilderOpenRef.current = isBuilderOpen;
    onBuilderStateChange?.(isBuilderOpen);
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isBuilderOpen, onBuilderStateChange]);

  // 도시 변경 확인 모달 상태 (Trip 가이드 생성 중 다른 도시 선택 시 실수 방지)

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle outside click & Escape key for expandable search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchExpanded(false);
        setIsSearchDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchQuery]);

  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);
  const mobileControlsRef = useRef<HTMLDivElement>(null);
  const isControlsClosingRef = useRef<boolean>(false);

  // Close mobile controls when tapping outside
  useEffect(() => {
    if (!isMobileControlsOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileControlsRef.current && !mobileControlsRef.current.contains(e.target as Node)) {
        isControlsClosingRef.current = true;
        setIsMobileControlsOpen(false);
        setTimeout(() => {
          isControlsClosingRef.current = false;
        }, 350);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileControlsOpen]);

  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedDestCities, setSelectedDestCities] = useState<string[]>([]);
  useEffect(() => {
    setSelectedDestCities([]);
  }, [selectedCountry?.code]);

  // Selected country weather data state & active city selector
  const [activeWeatherCity, setActiveWeatherCity] = useState<string>('');
  const [countryWeather, setCountryWeather] = useState<CityWeatherData | null>(null);
  const [isCountryWeatherLoading, setIsCountryWeatherLoading] = useState<boolean>(false);
  const [isCountryForecastOpen, setIsCountryForecastOpen] = useState<boolean>(false);

  // 국가 변경 시 대표 도시(수도 또는 제1도시)로 activeWeatherCity 초기화
  useEffect(() => {
    if (selectedCountry) {
      const defaultCity = selectedCountry.cities?.[0] || selectedCountry.name;
      setActiveWeatherCity(defaultCity);
    } else {
      setActiveWeatherCity('');
    }
  }, [selectedCountry?.code]);

  useEffect(() => {
    if (!selectedCountry) {
      setCountryWeather(null);
      setIsCountryForecastOpen(false);
      return;
    }

    let isCancelled = false;
    setIsCountryWeatherLoading(true);

    // 도시 좌표 조회 (findCityByNameOrAlias) 또는 국가 중심 좌표
    let lat = selectedCountry.center[0];
    let lng = selectedCountry.center[1];
    const targetCityName = activeWeatherCity || selectedCountry.cities?.[0] || selectedCountry.name;

    if (activeWeatherCity) {
      const cityObj = findCityByNameOrAlias(activeWeatherCity);
      if (cityObj && cityObj.lat && cityObj.lng) {
        lat = cityObj.lat;
        lng = cityObj.lng;
      }
    }

    fetchCityWeather(lat, lng, 'UTC', targetCityName, selectedCountry.code)
      .then((data) => {
        if (!isCancelled) {
          setCountryWeather(data);
        }
      })
      .catch((err) => {
        console.warn("Country weather fetch notice:", err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCountryWeatherLoading(false);
        }
      });

    return () => { isCancelled = true; };
  }, [selectedCountry?.code, activeWeatherCity]);

  // City markers on map when selected in DESTINATIONS
  const destCityMarkersRef = useRef<any[]>([]);
  // Mini dot pins for all cities belonging to selectedCountry
  const countryCityDotsRef = useRef<any[]>([]);

  const toggleDestCity = useCallback((cityName: string) => {
    setSelectedDestCities(prev => {
      const isAdding = !prev.includes(cityName);
      if (isAdding) {
        // 도시 선택 시 날씨도 해당 도시로 즉시 자동 동기화
        setActiveWeatherCity(cityName);
        return [...prev, cityName];
      } else {
        return prev.filter(c => c !== cityName);
      }
    });
  }, []);

  const toggleDestCityRef = useRef(toggleDestCity);
  useEffect(() => {
    toggleDestCityRef.current = toggleDestCity;
  }, [toggleDestCity]);

  // Trip 가이드 활성화 중 도시 변경: 지도·검색에서 고른 도시를 가이드 목적지로 즉시 반영
  const requestChangeBuilderCity = useCallback((cityName: string, countryName?: string, countryCode?: string) => {
    if (!cityName) return;
    if (isBuilderOpenRef.current) {
      if (builderCity === cityName) return;
      setBuilderCity(cityName);
      setBuilderCities([cityName]);
      if (countryName || selectedCountry?.name) setBuilderCountry(countryName || selectedCountry?.name || '');
      if (countryCode || selectedCountry?.code) setBuilderCountryCode(countryCode || selectedCountry?.code || '');
      setActiveWeatherCity(cityName);
    } else {
      toggleDestCity(cityName);
    }
  }, [builderCity, selectedCountry, toggleDestCity]);

  const requestChangeBuilderCityRef = useRef(requestChangeBuilderCity);
  useEffect(() => {
    requestChangeBuilderCityRef.current = requestChangeBuilderCity;
  }, [requestChangeBuilderCity]);

  // Render subtle mini dot pins for all travel destinations in the selected country
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    countryCityDotsRef.current.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    countryCityDotsRef.current = [];

    if (!selectedCountry || !selectedCountry.cities || selectedCountry.cities.length === 0) {
      return;
    }

    selectedCountry.cities.forEach(cityName => {
      const cleanKey = cityName.toLowerCase().replace(/\s+/g, '');
      const cityObj = findCityByNameOrAlias(cityName);
      const knownCoords = KNOWN_CITY_COORDS[cleanKey] || KNOWN_CITY_COORDS[cityName];
      const lat = cityObj?.lat || knownCoords?.[0];
      const lng = cityObj?.lng || knownCoords?.[1];

      if (!lat || !lng) return;

      const curCenterLng = map.getCenter()?.lng ?? 126.44;
      let effLng = lng;
      let diff = effLng - curCenterLng;
      while (diff > 180) { effLng -= 360; diff -= 360; }
      while (diff < -180) { effLng += 360; diff += 360; }

      const dotHtml = `
        <div class="group relative cursor-pointer flex items-center justify-center select-none" style="width: 40px; height: 40px;">
          <!-- Hover Tooltip -->
          <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 3px; pointer-events: none; white-space: nowrap; z-index: 1500;" class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 5px; line-height: 1; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
              ${cityName}
            </span>
          </div>
          <!-- Mini City Dot: 6.5px with clean contrast border -->
          <div style="width: 6.5px; height: 6.5px; border-radius: 9999px; background-color: ${isDarkMode ? '#FFFFFF' : '#111111'}; border: 1.5px solid ${isDarkMode ? '#000000' : '#FFFFFF'}; box-shadow: 0 0 0 1px ${isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'};" class="tgl-map-dot"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-country-city-dot',
        html: dotHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const dotMarker = L.marker([lat, effLng], { icon, zIndexOffset: 1200 }).addTo(map);
      dotMarker.on('click', (e: any) => {
        if (e && e.originalEvent) e.originalEvent.stopPropagation();
        if (isBuilderOpenRef.current) {
          requestChangeBuilderCityRef.current(cityName);
        } else {
          toggleDestCityRef.current(cityName);
        }
      });
      countryCityDotsRef.current.push(dotMarker);
    });
    requestAnimationFrame(() => resolveOverlapsRef.current());

    return () => {
      countryCityDotsRef.current.forEach(m => {
        try { m.remove(); } catch (_) {}
      });
      countryCityDotsRef.current = [];
    };
  }, [selectedCountry?.code, isDarkMode]);

  // Effect reacting to selectedDestCities: renders pulse pins and adjusts map camera (single city: flyTo, multi-city: fitBounds)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    // Clean previous dest city markers
    destCityMarkersRef.current.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    destCityMarkersRef.current = [];

    const prevCount = prevDestCitiesCountRef.current;
    prevDestCitiesCountRef.current = selectedDestCities.length;

    if (!selectedDestCities || selectedDestCities.length === 0) {
      // 복수 선택 후 모든 도시가 해제된 경우, 활성 국가의 원래 중심과 전체 줌으로 자연스럽게 복귀
      if (prevCount > 0 && selectedCountry && !isFlyingToCountryRef.current) {
        const isMobile = window.innerWidth < 640;
        let landingCoords: [number, number] = [selectedCountry.center[0], selectedCountry.center[1]];
        if (landingCoords[1] < -35) landingCoords[1] += 360;
        let targetCenter: [number, number] = landingCoords;
        if (isMobile) {
          const targetPoint = map.project(landingCoords, selectedCountry.zoom).add([0, window.innerHeight * 0.22]);
          targetCenter = [map.unproject(targetPoint, selectedCountry.zoom).lat, map.unproject(targetPoint, selectedCountry.zoom).lng];
        }
        map.flyTo(targetCenter, selectedCountry.zoom, { duration: 0.8 });
      }
      return;
    }

    const curCenterLng = map.getCenter()?.lng ?? 126.44;
    const selectedPoints: { name: string; lat: number; lng: number }[] = [];

    selectedDestCities.forEach(cityName => {
      const cleanKey = cityName.toLowerCase().replace(/\s+/g, '');
      const cityObj = findCityByNameOrAlias(cityName);
      const knownCoords = KNOWN_CITY_COORDS[cleanKey] || KNOWN_CITY_COORDS[cityName];
      const lat = cityObj?.lat || knownCoords?.[0];
      const lng = cityObj?.lng || knownCoords?.[1];

      if (lat && lng) {
        let effLng = lng;
        let diff = effLng - curCenterLng;
        while (diff > 180) { effLng -= 360; diff -= 360; }
        while (diff < -180) { effLng += 360; diff += 360; }
        selectedPoints.push({ name: cityName, lat, lng: effLng });
      }
    });

    if (selectedPoints.length === 0) return;

    // Render amber pulse pin for each selected city
    selectedPoints.forEach((pt, idx) => {
      const numBadge = selectedPoints.length > 1
        ? `<span class="mr-1 text-amber-400 font-bold">${String(idx + 1).padStart(2, '0')}</span>`
        : '';

      const pinHtml = `
        <div class="relative flex flex-col items-center pointer-events-none select-none">
          <span class="absolute w-8 h-8 rounded-full bg-amber-500/30 animate-ping"></span>
          <div class="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
          <div class="mt-1 px-1.5 py-0.5 bg-black text-white text-micro font-mono font-extrabold uppercase tracking-wider whitespace-nowrap shadow-md flex items-center">
            ${numBadge}${pt.name}
          </div>
        </div>
      `;

      const cityIcon = L.divIcon({
        className: 'custom-dest-city-pin',
        html: pinHtml,
        iconSize: [70, 36],
        iconAnchor: [35, 8],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: cityIcon, zIndexOffset: 2000 + idx }).addTo(map);
      destCityMarkersRef.current.push(marker);
    });

    // Camera adjustment: Single city -> flyTo, Multi-city -> fitBounds
    // 모바일에서는 하단 국가 모달(65vh)을 감안하여 상단 가시 지도(35vh) 중앙으로 오프셋 보정
    const isMobile = window.innerWidth < 640;
    if (selectedPoints.length === 1) {
      const targetZoom = Math.max(8.5, (selectedCountry?.zoom ?? 5) + 1.5);
      const rawLat = selectedPoints[0].lat;
      const rawLng = selectedPoints[0].lng;
      let targetCenter: [number, number] = [rawLat, rawLng];
      if (isMobile) {
        const pt = map.project([rawLat, rawLng], targetZoom).add([0, window.innerHeight * 0.26]);
        const unprojected = map.unproject(pt, targetZoom);
        targetCenter = [unprojected.lat, unprojected.lng];
      }
      map.flyTo(targetCenter, targetZoom, { duration: 0.9 });
    } else if (selectedPoints.length >= 2) {
      const bounds = L.latLngBounds(selectedPoints.map(p => [p.lat, p.lng]));
      if (isMobile) {
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, window.innerHeight * 0.55],
          maxZoom: 13
        });
      } else {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
      }
    }

    return () => {
      destCityMarkersRef.current.forEach(m => {
        try { m.remove(); } catch (_) {}
      });
      destCityMarkersRef.current = [];
    };
  }, [selectedDestCities, selectedCountry?.zoom]);

  // Flight Arc animation state from South Korea to destination country
  const [isFlyingToCountry, setIsFlyingToCountry] = useState(false);
  const isFlyingToCountryRef = useRef(false);
  const flightAnimRef = useRef<number | null>(null);
  const flightPlaneMarkerRef = useRef<any>(null);
  const flightTrailPolylineRef = useRef<any>(null);
  const flightPreTimeoutRef = useRef<any>(null);
  const flightLandingTimeoutRef = useRef<any>(null);
  const flightSessionIdRef = useRef<number>(0);
  const updateNightClipRef = useRef<(() => void) | null>(null);

  // Clean up flight animation on unmount
  useEffect(() => {
    return () => {
      flightSessionIdRef.current++;
      if (flightAnimRef.current !== null) {
        cancelAnimationFrame(flightAnimRef.current);
      }
      if (flightPreTimeoutRef.current !== null) {
        clearTimeout(flightPreTimeoutRef.current);
      }
      if (flightLandingTimeoutRef.current !== null) {
        clearTimeout(flightLandingTimeoutRef.current);
      }
      try {
        mapRef.current?.dragging?.enable();
        mapRef.current?.scrollWheelZoom?.enable();
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    isFlyingToCountryRef.current = isFlyingToCountry;
  }, [isFlyingToCountry]);

  const [selectedPinGroup, setSelectedPinGroup] = useState<MapPinGroup | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll focused item into view when navigating via keyboard
  useEffect(() => {
    if (searchSelectedIndex >= 0 && searchDropdownRef.current) {
      const container = searchDropdownRef.current;
      const targetItem = container.children[searchSelectedIndex] as HTMLElement | undefined;
      if (targetItem && typeof targetItem.scrollIntoView === 'function') {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [searchSelectedIndex]);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wishlistTab, setWishlistTab] = useState<'countries' | 'cities'>('countries');
  const [isPlaceListModalOpen, setIsPlaceListModalOpen] = useState(false);
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');

  // Live clock ticker for selected country
  const [liveClockNow, setLiveClockNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!selectedCountry) return;
    setLiveClockNow(new Date());
    const timer = setInterval(() => {
      setLiveClockNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedCountry]);

  // Map tile style state (esri or google)
  const [mapTileStyle, setMapTileStyle] = useState<'esri' | 'google'>(() => {
    return (localStorage.getItem('mapTileStyle') as any) || 'esri';
  });

  useEffect(() => {
    const handleTileChange = (e: any) => {
      const newStyle = e?.detail || localStorage.getItem('mapTileStyle') || 'esri';
      setMapTileStyle(newStyle);
    };
    window.addEventListener('mapTileStyleChanged', handleTileChange);
    return () => window.removeEventListener('mapTileStyleChanged', handleTileChange);
  }, []);

  // Favorite countries (Wishlist) state with Firebase Firestore synchronization & local fallback
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist_countries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorite cities (Wishlist) state with Firebase Firestore synchronization & local fallback
  const [favoriteCities, setFavoriteCities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist_cities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Real-time synchronization of Wishlist from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'map_wishlist'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.countries)) {
          setFavoriteCountries(data.countries);
          try {
            localStorage.setItem('wishlist_countries', JSON.stringify(data.countries));
          } catch (_) {}
        }
        if (Array.isArray(data.cities)) {
          setFavoriteCities(data.cities);
          try {
            localStorage.setItem('wishlist_cities', JSON.stringify(data.cities));
          } catch (_) {}
        }
      }
    }, (error) => {
      console.warn("Firestore map_wishlist sync error:", error);
    });

    return () => unsub();
  }, []);

  // View toggles: Pin Labels, Visited (Red pins), Wishlist (Yellow pins)
  // Pin labels are ALWAYS shown by default from the start
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);
  const [showVisitedPins, setShowVisitedPins] = useState<boolean>(true);
  const [showWishlistPins, setShowWishlistPins] = useState<boolean>(true);

  // Airplane flight animation toggle (persisted to localStorage)
  const [isPlaneAnimEnabled, setIsPlaneAnimEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('map_airplane_anim_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const isPlaneAnimEnabledRef = useRef<boolean>(isPlaneAnimEnabled);
  useEffect(() => {
    isPlaneAnimEnabledRef.current = isPlaneAnimEnabled;
  }, [isPlaneAnimEnabled]);

  const togglePinLabels = () => {
    setShowPinLabels(prev => !prev);
  };

  const toggleVisitedPins = () => {
    setShowVisitedPins(prev => !prev);
  };

  const toggleWishlistPins = () => {
    setShowWishlistPins(prev => !prev);
  };

  const togglePlaneAnim = () => {
    setIsPlaneAnimEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('map_airplane_anim_enabled', String(next));
      } catch (_) {}
      return next;
    });
  };

  const toggleFavoriteCountry = async (code: string) => {
    const isRemoving = favoriteCountries.includes(code);

    if (isRemoving) {
      // Check if any favorite city belongs to this country
      const countryData = COUNTRIES_DATA.find(c => c.code === code);
      if (countryData && countryData.cities) {
        const hasFavoritedCity = countryData.cities.some(city => 
          favoriteCities.includes(city.toUpperCase())
        );
        if (hasFavoritedCity) {
          notify(`위시리스트에 등록된 해당 국가의 도시가 포함되어 있어 국가 위시를 해제할 수 없습니다.\n먼저 도시 위시를 해제해주세요.`);
          return;
        }
      }
    }

    const updated = isRemoving
      ? favoriteCountries.filter(c => c !== code)
      : [...favoriteCountries, code];

    setFavoriteCountries(updated);
    try {
      localStorage.setItem('wishlist_countries', JSON.stringify(updated));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'map_wishlist'), {
        countries: updated,
        cities: favoriteCities,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save wishlist to server:", err);
    }
  };

  const toggleFavoriteCity = async (cityName: string) => {
    const cityUpper = cityName.toUpperCase();
    const isAdding = !favoriteCities.includes(cityUpper);
    const updatedCities = isAdding
      ? [...favoriteCities, cityUpper]
      : favoriteCities.filter(c => c !== cityUpper);

    let updatedCountries = [...favoriteCountries];
    if (isAdding) {
      const matchedCountry = COUNTRIES_DATA.find(c =>
        c.cities.some(cty => cty.toUpperCase() === cityUpper)
      );
      if (matchedCountry && !updatedCountries.includes(matchedCountry.code)) {
        updatedCountries.push(matchedCountry.code);
        setFavoriteCountries(updatedCountries);
        try {
          localStorage.setItem('wishlist_countries', JSON.stringify(updatedCountries));
        } catch (_) {}
      }
    }

    setFavoriteCities(updatedCities);
    try {
      localStorage.setItem('wishlist_cities', JSON.stringify(updatedCities));
    } catch (_) {}

    try {
      await setDoc(doc(db, 'users', 'public', 'settings', 'map_wishlist'), {
        countries: updatedCountries,
        cities: updatedCities,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save city wishlist to server:", err);
    }
  };

  const allJourneys = useMemo(() => [...trips, ...plans], [trips, plans]);

  // Group journeys into geographic pins (Multi-city per country & Same city deduplication)
  const pinGroups: MapPinGroup[] = useMemo(() => {
    const map = new Map<string, MapPinGroup>();

    allJourneys.forEach(journey => {
      const pointsToPin: { name: string; lat: number; lng: number }[] = [];

      // 1. Check locations array on journey
      if (journey.locations && journey.locations.length > 0) {
        journey.locations.forEach(locObj => {
          if (locObj.lat && locObj.lng) {
            pointsToPin.push({ name: locObj.name, lat: locObj.lat, lng: locObj.lng });
          } else if (locObj.name) {
            const clean = cleanAdministrativeDistricts(locObj.name).trim();
            const key = clean.toLowerCase().replace(/\s+/g, '');
            const coords = KNOWN_CITY_COORDS[key] || KNOWN_CITY_COORDS[clean];
            if (coords) {
              pointsToPin.push({ name: clean, lat: coords[0], lng: coords[1] });
            }
          }
        });
      }

      // 2. Parse locationStr (split multiple cities e.g. "도쿄, 오사카")
      const locStr = journey.locationStr || journey.country || '';
      if (locStr) {
        const cleanLoc = cleanAdministrativeDistricts(locStr);
        const parts = cleanLoc.split(/[,·/|]/).map(p => p.trim()).filter(Boolean);

        parts.forEach(part => {
          const cleanPart = cleanAdministrativeDistricts(part).trim();
          const key = cleanPart.toLowerCase().replace(/\s+/g, '');

          let coords: [number, number] | null = null;
          if (KNOWN_CITY_COORDS[key]) {
            coords = KNOWN_CITY_COORDS[key];
          } else if (KNOWN_CITY_COORDS[cleanPart]) {
            coords = KNOWN_CITY_COORDS[cleanPart];
          } else if (journey.lat && journey.lng && parts.length === 1) {
            coords = [journey.lat, journey.lng];
          } else {
            // Match against country
            const matchedCountry = COUNTRIES_DATA.find(c =>
              c.name.toLowerCase() === key ||
              c.nameKo === cleanPart ||
              c.cities.some(cty => cty.toLowerCase() === key)
            );
            if (matchedCountry) {
              coords = matchedCountry.center;
            }
          }

          if (coords) {
            if (!pointsToPin.some(p => Math.abs(p.lat - coords![0]) < 0.05 && Math.abs(p.lng - coords![1]) < 0.05)) {
              pointsToPin.push({ name: cleanPart, lat: coords[0], lng: coords[1] });
            }
          }
        });
      }

      // 3. Fallback to direct journey lat/lng
      if (pointsToPin.length === 0 && journey.lat && journey.lng) {
        pointsToPin.push({
          name: journey.locationStr || journey.country || 'Unknown',
          lat: journey.lat,
          lng: journey.lng,
        });
      }

      // Add each extracted point into the pin groups map, merging same cities
      pointsToPin.forEach(pt => {
        const ptCityClean = cleanAdministrativeDistricts(pt.name).toUpperCase().trim();

        // 1. Strip trailing country strings like ", SOUTH KOREA", ", KOREA", ", JAPAN", etc.
        let cityCleaned = ptCityClean
          .replace(/,\s*(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본|VIETNAM|베트남|THAILAND|태국|TAIWAN|대만|CHINA|중국|USA|미국|FRANCE|프랑스|ITALY|이탈리아|UK|영국|SPAIN|스페인).*$/i, '')
          .replace(/\s+(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본).*$/i, '')
          .trim();

        // 2. Canonical city normalizer with robust keyword matching
        let canonicalCity = cityCleaned;
        if (
          canonicalCity.includes('JEJU') || 
          canonicalCity.includes('제주') || 
          canonicalCity.includes('SEOGWIPO') || 
          canonicalCity.includes('서귀포')
        ) {
          canonicalCity = 'JEJU';
        } else if (
          canonicalCity.includes('TOKYO') || 
          canonicalCity.includes('도쿄') || 
          canonicalCity.includes('SHINJUKU') || 
          canonicalCity.includes('SHIBUYA') || 
          canonicalCity.includes('GINZA') || 
          canonicalCity.includes('신주쿠') || 
          canonicalCity.includes('시부야') || 
          canonicalCity.includes('긴자')
        ) {
          canonicalCity = 'TOKYO';
        } else if (
          canonicalCity.includes('OSAKA') || 
          canonicalCity.includes('오사카') || 
          canonicalCity.includes('UMEDA') || 
          canonicalCity.includes('NAMBA') || 
          canonicalCity.includes('우메다') || 
          canonicalCity.includes('난바')
        ) {
          canonicalCity = 'OSAKA';
        } else if (
          canonicalCity.includes('KYOTO') || 
          canonicalCity.includes('교토')
        ) {
          canonicalCity = 'KYOTO';
        } else if (
          canonicalCity.includes('FUKUOKA') || 
          canonicalCity.includes('후쿠오카') || 
          canonicalCity.includes('HAKATA') || 
          canonicalCity.includes('하카타')
        ) {
          canonicalCity = 'FUKUOKA';
        } else if (
          canonicalCity.includes('SEOUL') || 
          canonicalCity.includes('서울') || 
          canonicalCity.includes('GANGNAM') || 
          canonicalCity.includes('강남') || 
          canonicalCity.includes('HONGDAE') || 
          canonicalCity.includes('홍대') || 
          canonicalCity.includes('MYEONGDONG') || 
          canonicalCity.includes('명동')
        ) {
          canonicalCity = 'SEOUL';
        } else if (
          canonicalCity.includes('BUSAN') || 
          canonicalCity.includes('부산') || 
          canonicalCity.includes('HAEUNDAE') || 
          canonicalCity.includes('해운대')
        ) {
          canonicalCity = 'BUSAN';
        } else if (
          canonicalCity.includes('GANGNEUNG') || 
          canonicalCity.includes('강릉')
        ) {
          canonicalCity = 'GANGNEUNG';
        } else if (
          canonicalCity.includes('SOKCHO') || 
          canonicalCity.includes('속초')
        ) {
          canonicalCity = 'SOKCHO';
        } else if (
          canonicalCity.includes('GYEONGJU') || 
          canonicalCity.includes('경주')
        ) {
          canonicalCity = 'GYEONGJU';
        } else if (
          canonicalCity.includes('INCHEON') || 
          canonicalCity.includes('인천')
        ) {
          canonicalCity = 'INCHEON';
        } else if (
          canonicalCity.includes('JEONJU') || 
          canonicalCity.includes('전주')
        ) {
          canonicalCity = 'JEONJU';
        } else if (
          canonicalCity.includes('DANANG') || 
          canonicalCity.includes('DA NANG') || 
          canonicalCity.includes('다낭')
        ) {
          canonicalCity = 'DA NANG';
        } else if (
          canonicalCity.includes('HANOI') || 
          canonicalCity.includes('하노이')
        ) {
          canonicalCity = 'HANOI';
        } else if (
          canonicalCity.includes('HOCHIMINH') || 
          canonicalCity.includes('HO CHI MINH') || 
          canonicalCity.includes('호치민')
        ) {
          canonicalCity = 'HO CHI MINH';
        } else if (
          canonicalCity.includes('BANGKOK') || 
          canonicalCity.includes('방콕')
        ) {
          canonicalCity = 'BANGKOK';
        } else if (
          canonicalCity.includes('TAIPEI') || 
          canonicalCity.includes('타이베이')
        ) {
          canonicalCity = 'TAIPEI';
        } else if (
          canonicalCity.includes('HONG KONG') || 
          canonicalCity.includes('HONGKONG') || 
          canonicalCity.includes('홍콩')
        ) {
          canonicalCity = 'HONG KONG';
        } else if (
          canonicalCity.includes('PARIS') || 
          canonicalCity.includes('파리')
        ) {
          canonicalCity = 'PARIS';
        } else if (
          canonicalCity.includes('LONDON') || 
          canonicalCity.includes('런던')
        ) {
          canonicalCity = 'LONDON';
        } else if (
          canonicalCity.includes('GUAM') || 
          canonicalCity.includes('괌')
        ) {
          canonicalCity = 'GUAM';
        } else if (
          canonicalCity.includes('SAIPAN') || 
          canonicalCity.includes('사이판')
        ) {
          canonicalCity = 'SAIPAN';
        }

        // Find existing group by canonical city name OR proximity (< 0.28 degrees ~ 30km)
        let foundGroup: MapPinGroup | undefined;
        for (const existing of map.values()) {
          const sameCanonical = existing.city === canonicalCity;
          const closeDistance = Math.hypot(existing.lat - pt.lat, existing.lng - pt.lng) < 0.28;
          if (sameCanonical || closeDistance) {
            foundGroup = existing;
            break;
          }
        }

        if (foundGroup) {
          if (!foundGroup.journeys.some(j => j.id === journey.id)) {
            foundGroup.journeys.push(journey);
          }
        } else {
          const groupKey = `${canonicalCity}_${pt.lat.toFixed(2)}_${pt.lng.toFixed(2)}`;
          map.set(groupKey, {
            city: canonicalCity,
            country: (journey.country || '').toUpperCase(),
            lat: pt.lat,
            lng: pt.lng,
            journeys: [journey],
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allJourneys]);

  // Filter place groups for the Registered Places Directory
  const filteredPlaceGroups = useMemo(() => {
    if (!placeSearchQuery.trim()) return pinGroups;
    const q = placeSearchQuery.trim().toLowerCase();
    return pinGroups.filter(g => 
      g.city.toLowerCase().includes(q) ||
      (g.country && g.country.toLowerCase().includes(q)) ||
      g.journeys.some(j => j.title.toLowerCase().includes(q))
    );
  }, [pinGroups, placeSearchQuery]);

  // Fly airplane from South Korea (Incheon) to target country in an arc trajectory
  const flyAirplaneToDestination = (targetCountry: CountryInfo) => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) {
      setSelectedCountry(targetCountry);
      setSearchQuery(targetCountry.name);
      return;
    }

    // If airplane animation is disabled, skip trajectory and smoothly flyTo destination immediately
    if (!isPlaneAnimEnabledRef.current) {
      setSelectedCountry(targetCountry);
      setSearchQuery(targetCountry.name);
      const isMobile = window.innerWidth < 640;
      let targetCenterLat = targetCountry.center[0];
      let targetCenterLng = targetCountry.center[1];
      if (targetCenterLng < -35) targetCenterLng += 360;
      let targetCenter: [number, number] = [targetCenterLat, targetCenterLng];
      if (isMobile) {
        const targetPoint = map.project(targetCenter, targetCountry.zoom).add([0, window.innerHeight * 0.22]);
        targetCenter = [map.unproject(targetPoint, targetCountry.zoom).lat, map.unproject(targetPoint, targetCountry.zoom).lng];
      }
      try { map.setMaxBounds(null); } catch (_) {}
      map.flyTo(targetCenter, targetCountry.zoom, { duration: 0.9 });
      setTimeout(() => {
        try { mapRef.current?.setMaxBounds([[-62, -35], [82, 385]]); } catch (_) {}
      }, 950);
      return;
    }

    // Stop existing flight animation and timeouts if running
    if (flightAnimRef.current !== null) {
      cancelAnimationFrame(flightAnimRef.current);
      flightAnimRef.current = null;
    }
    if (flightPreTimeoutRef.current !== null) {
      clearTimeout(flightPreTimeoutRef.current);
      flightPreTimeoutRef.current = null;
    }
    if (flightPlaneMarkerRef.current) {
      try { map.removeLayer(flightPlaneMarkerRef.current); } catch (_) {}
      flightPlaneMarkerRef.current = null;
    }
    if (flightTrailPolylineRef.current) {
      try { map.removeLayer(flightTrailPolylineRef.current); } catch (_) {}
      flightTrailPolylineRef.current = null;
    }

    setIsFlyingToCountry(true);

    // Incheon International Airport (ICN, Korea) as Origin
    const startLat = 37.4602;
    const startLng = 126.4407;
    const endLat = targetCountry.center[0];
    const rawEndLng = targetCountry.center[1];

    // 한국(ICN, 126.4407°) 출발 기준 전 세계 100% 최단 거리 (Shortest Arc: -180° ~ 180°)
    // 유럽/아프리카는 서쪽 직진, 미주/태평양은 동쪽 직진으로 언제나 최단거리 보장
    let deltaLng = rawEndLng - startLng;
    while (deltaLng > 180) deltaLng -= 360;
    while (deltaLng < -180) deltaLng += 360;
    const effectiveEndLng = startLng + deltaLng;

    // Great-circle Arc control point calculation (subtle curvature)
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + effectiveEndLng) / 2;
    const dist = Math.sqrt((endLat - startLat) ** 2 + (effectiveEndLng - startLng) ** 2);
    const perpLat = -(effectiveEndLng - startLng) * 0.22;
    const perpLng = (endLat - startLat) * 0.22;
    const ctrlLat = midLat + perpLat;
    const ctrlLng = midLng + perpLng;

    // SVG sleek minimal white airliner icon with drop shadow
    const createAirplaneIcon = (angleDeg: number, scaleVal: number = 1) => {
      const iconHtml = `
        <div style="transform: rotate(${angleDeg}deg) scale(${scaleVal}); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: transform 0.04s linear;">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 44px; height: 44px; filter: drop-shadow(0px 6px 12px rgba(0,0,0,0.55));">
            <!-- Fuselage & Wings (Clean White with sleek border) -->
            <path d="M24 2C22.6 2 21.5 3.5 21.5 5.5V17L6 26.5V30.5L21.5 25.5V37.5L16 41.5V44.5L24 42.5L32 44.5V41.5L26.5 37.5V25.5L42 30.5V26.5L26.5 17V5.5C26.5 3.5 25.4 2 24 2Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.3" stroke-linejoin="round" />
            <!-- Cockpit Windows -->
            <ellipse cx="24" cy="7.5" rx="1.5" ry="2.6" fill="#1E293B" />
            <!-- Jet Engines -->
            <rect x="13.5" y="21.5" width="2.4" height="6.5" rx="1.2" fill="#E2E8F0" stroke="#475569" stroke-width="0.8" />
            <rect x="32.1" y="21.5" width="2.4" height="6.5" rx="1.2" fill="#E2E8F0" stroke="#475569" stroke-width="0.8" />
            <!-- Tail Accent Line -->
            <line x1="24" y1="35" x2="24" y2="42" stroke="#CBD5E1" stroke-width="1" />
          </svg>
        </div>
      `;
      return L.divIcon({
        className: 'sleek-flight-plane-marker',
        html: iconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    };

    // Session safety: 새로운 비행 시작 시 이전 세션 취소
    flightSessionIdRef.current++;
    const currentSessionId = flightSessionIdRef.current;

    // 비행 중 우발적 드래그/휠 줌 잠금 및 맵 바운드 일시 해제 (비행/착륙 바운스 방지)
    try {
      map.setMaxBounds(null);
      map.dragging.disable();
      map.scrollWheelZoom.disable();
    } catch (_) {}

    // Calculate initial bearing
    const initialAngle = Math.atan2(effectiveEndLng - startLng, endLat - startLat) * 180 / Math.PI;

    // Flight trail polyline (subtle dashed flight path)
    const trailLine = L.polyline([], {
      color: '#DC2626',
      weight: 2.2,
      opacity: 0.7,
      dashArray: '5, 7',
      lineCap: 'round',
    }).addTo(map);
    flightTrailPolylineRef.current = trailLine;

    // Plane marker with zIndexOffset 500000 (above spot pins)
    const planeMarker = L.marker([startLat, startLng], {
      icon: createAirplaneIcon(initialAngle, 0.8),
      zIndexOffset: 500000,
    }).addTo(map);
    if (planeMarker.bringToFront) planeMarker.bringToFront();
    flightPlaneMarkerRef.current = planeMarker;

    // 비행 시작 전 비행기를 중심으로 안정적인 크루즈 줌 설정 (비행기 중심 추종 모션)
    const isMobile = window.innerWidth < 640;
    const cruiseZoom = isMobile ? 3.4 : 3.7;
    map.setView([startLat, startLng], cruiseZoom, { animate: false });

    // Smooth duration between 2000ms ~ 2800ms
    const duration = Math.min(2800, Math.max(2000, dist * 24));
    let startTime: number | null = null;
    const trailPoints: [number, number][] = [];

    // EaseInOutCubic: gradual takeoff, cruise, gradual landing
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateFlight = (timestamp: number) => {
      // 세션 검증: 이미 취소되었거나 다른 비행이 시작된 경우 즉각 중단
      if (currentSessionId !== flightSessionIdRef.current) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const ease = easeInOutCubic(rawProgress);

      const inv = 1 - ease;
      const curLat = inv * inv * startLat + 2 * inv * ease * ctrlLat + ease * ease * endLat;
      const curLng = inv * inv * startLng + 2 * inv * ease * ctrlLng + ease * ease * effectiveEndLng;

      // Tangent bearing
      const dLat = 2 * inv * (ctrlLat - startLat) + 2 * ease * (endLat - ctrlLat);
      const dLng = 2 * inv * (ctrlLng - startLng) + 2 * ease * (effectiveEndLng - ctrlLng);
      const curAngle = Math.atan2(dLng, dLat) * 180 / Math.PI;

      // Elevation Scale: Takeoff (0.8) -> Cruise (1.2) -> Landing (0.85)
      const curScale = 0.8 + Math.sin(ease * Math.PI) * 0.4;

      planeMarker.setLatLng([curLat, curLng]);
      planeMarker.setIcon(createAirplaneIcon(curAngle, curScale));

      // 비행기를 항상 카메라 중심으로 이동 (부드러운 추종)
      map.panTo([curLat, curLng], { animate: false });

      // Append to flight trail
      trailPoints.push([curLat, curLng]);
      trailLine.setLatLngs(trailPoints);

      if (rawProgress < 1) {
        flightAnimRef.current = requestAnimationFrame(animateFlight);
      } else {
        // 비행기 터치다운 완료
        flightAnimRef.current = null;

        // 모바일 하단 시트를 고려한 착륙 중심점 계산 (경도 연속성 유지)
        const isMobile = window.innerWidth < 640;
        let landingCoords: [number, number] = [targetCountry.center[0], effectiveEndLng];
        let targetCenter: [number, number] = landingCoords;
        if (isMobile) {
          const targetPoint = map.project(landingCoords, targetCountry.zoom).add([0, window.innerHeight * 0.22]);
          targetCenter = [map.unproject(targetPoint, targetCountry.zoom).lat, map.unproject(targetPoint, targetCountry.zoom).lng];
        }

        // 목적지에 다 와서 부드럽게 착륙 줌인 실행 (내장 flyTo로 깜박임 없이 자연스럽게 확대)
        // 미국/남미 등 우측 지도 경계에서의 튕김(bounce) 방지를 위해 일시 해제 후 착륙 시 재설정
        try { map.setMaxBounds(null); } catch (_) {}
        map.flyTo(targetCenter, targetCountry.zoom, { duration: 0.9 });

        // 착륙 줌인 완료 후 비행기 마커 정리 및 모달 오픈
        flightLandingTimeoutRef.current = setTimeout(() => {
          flightLandingTimeoutRef.current = null;
          if (currentSessionId !== flightSessionIdRef.current) return;

          if (flightPlaneMarkerRef.current && mapRef.current) {
            try { mapRef.current.removeLayer(flightPlaneMarkerRef.current); } catch (_) {}
            flightPlaneMarkerRef.current = null;
          }
          if (flightTrailPolylineRef.current && mapRef.current) {
            try { mapRef.current.removeLayer(flightTrailPolylineRef.current); } catch (_) {}
            flightTrailPolylineRef.current = null;
          }

          // 지도 드래그 및 줌 다시 활성화 및 바운드 복원
          try {
            mapRef.current?.setMaxBounds([[-62, -35], [82, 385]]);
            mapRef.current?.dragging?.enable();
            mapRef.current?.scrollWheelZoom?.enable();
          } catch (_) {}

          setIsFlyingToCountry(false);
          // 비행 완료 후 낮/밤 명암 경계선 최종 위치 즉각 1회 동기화
          updateNightClipRef.current?.();
          setSelectedCountry(targetCountry);
          setSearchQuery(targetCountry.name);
        }, 920);
      }
    };

    flightAnimRef.current = requestAnimationFrame(animateFlight);
  };

  // Updates boundary highlight (exact GeoJSON polygon if available, or fallback circle) & pulse pin on map
  const updateCountryHighlightAndPin = useCallback((country: CountryInfo) => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }
    if (selectPinRef.current) {
      map.removeLayer(selectPinRef.current);
      selectPinRef.current = null;
    }

    const geoData = geoJsonDataRef.current || cachedCountriesGeoJson;
    const countryFeature = geoData?.features?.find((f: any) => f.properties?.code === country.code.toUpperCase());

    const highlightLayers: any[] = [];

    if (countryFeature) {
      const geoStyle = {
        color: '#DC2626',
        weight: 1.8,
        dashArray: '4, 4',
        fillColor: '#DC2626',
        fillOpacity: 0.13,
      };

      // 1. Base GeoJSON (Original coordinates)
      highlightLayers.push(L.geoJSON(countryFeature, { style: geoStyle, interactive: false }));

      // 2. World wrap replication: +360 shift (Essential for Pacific-centered Americas view)
      const shiftedCoordsPlus = shiftGeoJsonCoordinates(countryFeature.geometry.coordinates, 360);
      const shiftedFeaturePlus = {
        ...countryFeature,
        geometry: { ...countryFeature.geometry, coordinates: shiftedCoordsPlus }
      };
      highlightLayers.push(L.geoJSON(shiftedFeaturePlus, { style: geoStyle, interactive: false }));

      // 3. World wrap replication: -360 shift (Essential for Western wrap view)
      const shiftedCoordsMinus = shiftGeoJsonCoordinates(countryFeature.geometry.coordinates, -360);
      const shiftedFeatureMinus = {
        ...countryFeature,
        geometry: { ...countryFeature.geometry, coordinates: shiftedCoordsMinus }
      };
      highlightLayers.push(L.geoJSON(shiftedFeatureMinus, { style: geoStyle, interactive: false }));
    } else {
      // Fallback: circular boundary while geojson is loading
      const radiusMeters = country.zoom >= 11
        ? 15000 // Hong Kong, Macau, Singapore
        : country.zoom >= 9
          ? 35000 // Small island nations / city states
          : country.zoom >= 7
            ? 75000 // Taiwan, Maldives, Nepal, etc.
            : Math.max(110000, (10.5 - country.zoom) * 85000);

      const circleOptions = {
        radius: radiusMeters,
        color: '#DC2626',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#DC2626',
        fillOpacity: 0.12,
      };

      highlightLayers.push(L.circle(country.center, circleOptions));
      highlightLayers.push(L.circle([country.center[0], country.center[1] + 360], circleOptions));
      highlightLayers.push(L.circle([country.center[0], country.center[1] - 360], circleOptions));
    }

    highlightLayerRef.current = L.featureGroup(highlightLayers).addTo(map);

    // Selected country pulse pin
    const selectHtml = `
      <div class="relative w-10 h-10 flex items-center justify-center select-none pointer-events-none">
        <span class="absolute w-12 h-12 rounded-full bg-red-600/30 animate-ping"></span>
        <span class="absolute w-8 h-8 rounded-full bg-red-600/35"></span>
        <span class="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-lg"></span>
      </div>
    `;
    const selectIcon = L.divIcon({
      className: 'custom-select-pin',
      html: selectHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const markers: any[] = [
      L.marker(country.center, { icon: selectIcon, zIndexOffset: 1200 }),
      L.marker([country.center[0], country.center[1] + 360], { icon: selectIcon, zIndexOffset: 1200 }),
      L.marker([country.center[0], country.center[1] - 360], { icon: selectIcon, zIndexOffset: 1200 })
    ];

    selectPinRef.current = L.featureGroup(markers).addTo(map);
  }, []);

  // Load lightweight country GeoJSON dataset for exact boundary highlighting
  useEffect(() => {
    if (!cachedCountriesGeoJson) {
      fetch('/data/countries.geojson')
        .then(res => res.json())
        .then(data => {
          cachedCountriesGeoJson = data;
          geoJsonDataRef.current = data;
          if (selectedCountry) {
            updateCountryHighlightAndPin(selectedCountry);
          }
        })
        .catch(err => console.warn('Failed to load countries.geojson:', err));
    } else {
      geoJsonDataRef.current = cachedCountriesGeoJson;
    }
  }, [selectedCountry, updateCountryHighlightAndPin]);

  // Country selection handler: highlights country area and flies airplane from Korea
  const handleSelectCountry = (country: CountryInfo) => {
    // 트립 가이드가 열려 있으면 선택한 국가(대표 도시)를 가이드 목적지로 즉시 반영.
    // 이미 가이드 대상인 국가를 다시 고르면 작성 중인 가이드를 초기화하지 않음.
    if (isBuilderOpenRef.current) {
      const isSameCountry = (builderCountryCode && builderCountryCode.toUpperCase() === country.code.toUpperCase())
        || (!builderCountryCode && builderCountry === country.name);
      if (!isSameCountry) {
        const targetCity = country.cities?.[0] || '';
        setBuilderCountry(country.name);
        setBuilderCountryCode(country.code);
        setBuilderCity(targetCity);
        setBuilderCities(targetCity ? [targetCity] : []);
        if (targetCity) setActiveWeatherCity(targetCity);
      }
    }

    setIsSearchDropdownOpen(false);

    const map = mapRef.current;
    updateCountryHighlightAndPin(country);

    // 대한민국이거나 비행기 애니메이션 OFF 상태인 경우 비행 없이 즉시 선택 및 착륙 이동
    if (country.code === 'KR' || !isPlaneAnimEnabled) {
      setSelectedCountry(country);
      setSearchQuery(country.name);
      if (map) {
        const isMobile = window.innerWidth < 640;
        let targetCenterLat = country.center[0];
        let targetCenterLng = country.center[1];
        if (targetCenterLng < -35) targetCenterLng += 360;
        let targetCenter: [number, number] = [targetCenterLat, targetCenterLng];
        if (isMobile) {
          const targetPoint = map.project(targetCenter, country.zoom).add([0, window.innerHeight * 0.22]);
          targetCenter = [map.unproject(targetPoint, country.zoom).lat, map.unproject(targetPoint, country.zoom).lng];
        }
        try { map.setMaxBounds(null); } catch (_) {}
        map.flyTo(targetCenter, country.zoom, { duration: 0.9 });
        setTimeout(() => {
          try {
            mapRef.current?.setMaxBounds([[-62, -35], [82, 385]]);
          } catch (_) {}
        }, 950);
      }
      return;
    }

    // 외국인 경우: 한국에서 비행기가 날아가 착륙한 뒤 모달 오픈
    flyAirplaneToDestination(country);
  };

  // Close country handler: removes highlight, stops flight, and restores South Korea center view
  const handleCloseCountry = () => {
    flightSessionIdRef.current++;
    if (flightAnimRef.current !== null) {
      cancelAnimationFrame(flightAnimRef.current);
      flightAnimRef.current = null;
    }
    if (flightPreTimeoutRef.current !== null) {
      clearTimeout(flightPreTimeoutRef.current);
      flightPreTimeoutRef.current = null;
    }
    if (flightLandingTimeoutRef.current !== null) {
      clearTimeout(flightLandingTimeoutRef.current);
      flightLandingTimeoutRef.current = null;
    }
    if (flightPlaneMarkerRef.current && mapRef.current) {
      try { mapRef.current.removeLayer(flightPlaneMarkerRef.current); } catch (_) {}
      flightPlaneMarkerRef.current = null;
    }
    if (flightTrailPolylineRef.current && mapRef.current) {
      try { mapRef.current.removeLayer(flightTrailPolylineRef.current); } catch (_) {}
      flightTrailPolylineRef.current = null;
    }

    const map = mapRef.current;
    if (map) {
      try {
        map.dragging?.enable();
        map.scrollWheelZoom?.enable();
      } catch (_) {}

      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (selectPinRef.current) {
        map.removeLayer(selectPinRef.current);
        selectPinRef.current = null;
      }
      // Restore South Korea center view with layer sync
      map.setView([36.0, 127.5], 3.2);
      map.invalidateSize();
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 300);
    }

    setIsFlyingToCountry(false);
    updateNightClipRef.current?.();
    setSelectedCountry(null);
    setSearchQuery('');
  };

  // ESC key to close modal / selection, and 'h' key to reset to global home view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 'Escape') {
        if (selectedPinGroup) setSelectedPinGroup(null);
        else if (isPlaceListModalOpen) setIsPlaceListModalOpen(false);
        else if (isWishlistModalOpen) setIsWishlistModalOpen(false);
        else if (selectedCountry || isFlyingToCountry) handleCloseCountry();
        setIsSearchDropdownOpen(false);
      } else if (!isInput && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleResetToDefaultView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCountry, isFlyingToCountry, selectedPinGroup, isWishlistModalOpen, isPlaceListModalOpen]);

  const handleSelectCountryRef = useRef(handleSelectCountry);
  useEffect(() => {
    handleSelectCountryRef.current = handleSelectCountry;
  });

  // Geocoder & distance based country selector for direct map clicks
  const matchCountryFromLatLng = (latlng: { lat: number; lng: number }) => {
    const L = (window as any).L;
    if (!L || isFlyingToCountryRef.current) return;

    // Normalize longitude to [-180, 180] for accurate geometric matching across world copies
    let normLng = latlng.lng;
    while (normLng > 180) normLng -= 360;
    while (normLng < -180) normLng += 360;

    // Helper: geometric distance match within country influence radius
    const matchByDistance = () => {
      let closestCountry: CountryInfo | null = null;
      let minDistance = Infinity;

      for (const country of COUNTRIES_DATA) {
        let effLng = country.center[1];
        let diffLng = Math.abs(latlng.lng - effLng);
        while (diffLng > 180) {
          if (effLng < latlng.lng) effLng += 360;
          else effLng -= 360;
          diffLng = Math.abs(latlng.lng - effLng);
        }
        const cLatLng = L.latLng(country.center[0], effLng);
        const dist = cLatLng.distanceTo(L.latLng(latlng.lat, latlng.lng));

        const maxRadius = country.zoom >= 11
          ? 45000
          : country.zoom >= 9
            ? 90000
            : country.zoom >= 7
              ? 300000
              : country.zoom >= 5
                ? 800000
                : country.zoom >= 4
                  ? 1400000
                  : 2000000;

        if (dist <= maxRadius && dist < minDistance) {
          minDistance = dist;
          closestCountry = country;
        }
      }

      if (closestCountry) {
        handleSelectCountryRef.current(closestCountry);
      }
    };

    // 1. Try Google Reverse Geocoder for high-precision country matching
    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat: latlng.lat, lng: normLng } }, (results: any[], status: string) => {
          if (status === 'OK' && results && results.length > 0) {
            for (const result of results) {
              const countryComp = result.address_components?.find((c: any) => c.types?.includes('country'));
              if (countryComp) {
                const code = countryComp.short_name;
                const name = countryComp.long_name;
                const matched = COUNTRIES_DATA.find(c => 
                  c.code === code || 
                  c.name.toUpperCase() === name.toUpperCase() || 
                  c.nameKo === name ||
                  (result.formatted_address && c.cities.some(city => result.formatted_address.toUpperCase().includes(city)))
                );
                if (matched) {
                  handleSelectCountryRef.current(matched);
                  return;
                }
              }
            }
          }
          matchByDistance();
        });
      } catch (_) {
        matchByDistance();
      }
    } else {
      matchByDistance();
    }
  };

  // Initialize Leaflet Map centered on South Korea
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [36.0, 127.5], // Centered on South Korea
      zoom: 3.2,
      minZoom: 2.6, // 좌측 이전 세계 잔상 및 뷰포트 초과 튕김 방지
      maxZoom: 18,
      zoomControl: false,
      maxBounds: [[-62, -35], [82, 385]], // 좌측 대서양(-35도)부터 우측 남미/미주 대륙 전체를 커버하는 최적 바운드
      maxBoundsViscosity: 0.85,
      bounceAtZoomLimits: false,
      worldCopyJump: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dedicated pane for clipped night-time tiles (above base tilePane 200, below overlayPane 400)
    const nightPane = map.createPane('nightTilePane');
    nightPane.style.zIndex = '205';
    nightPane.style.pointerEvents = 'none';

    // Direct map click to select country
    map.on('click', (e: any) => {
      if (e && e.latlng) {
        matchCountryFromLatLng(e.latlng);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync dark mode, mapTileStyle & Day/Night Dual-Tile mode dynamically
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (tileLayerRef.current) {
      try { map.removeLayer(tileLayerRef.current); } catch (_) {}
      tileLayerRef.current = null;
    }
    if (nightTileLayerRef.current) {
      try { map.removeLayer(nightTileLayerRef.current); } catch (_) {}
      nightTileLayerRef.current = null;
    }

    if (isDayNightEnabled) {
      // DUAL TILE MODE: Base Day Tile + Clipped Night Tile on nightTilePane
      if (mapTileStyle === 'google') {
        // 1. Google Base Day Tile (Normal Light)
        tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          className: '',
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);

        // 2. Google Clipped Night Tile (Night Mode with Dark CSS Filter)
        nightTileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          className: 'map-tiles-dark',
          pane: 'nightTilePane',
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);
      } else {
        // 1. Esri Base Day Tile (World_Light_Gray_Base)
        tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 18,
          keepBuffer: 16,
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);

        // 2. Esri Clipped Night Tile (World_Dark_Gray_Base)
        nightTileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 18,
          keepBuffer: 16,
          pane: 'nightTilePane',
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);
      }
    } else {
      // SINGLE TILE MODE: When Day/Night is disabled, reset clip and respect isDarkMode
      const nightPane = map.getPane('nightTilePane');
      if (nightPane) {
        nightPane.style.clipPath = 'none';
        nightPane.style.webkitClipPath = 'none';
      }

      if (mapTileStyle === 'google') {
        tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
          attribution: '&copy; Google Maps',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          className: isDarkMode ? 'map-tiles-dark' : '',
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);
      } else {
        const tileUrl = isDarkMode
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

        tileLayerRef.current = L.tileLayer(tileUrl, {
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 18,
          keepBuffer: 16,
          updateWhenIdle: false,
          updateWhenZooming: false,
          crossOrigin: true,
        }).addTo(map);
      }
    }
    // Re-align the night mask with the freshly added night tile layer
    updateNightClipRef.current?.();
  }, [isDarkMode, mapTileStyle, isDayNightEnabled]);

  // Render Day/Night Solar Terminator Layer & Night City Lights (controlled by isDayNightEnabled)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    if (terminatorLayerRef.current) {
      try { map.removeLayer(terminatorLayerRef.current); } catch (_) {}
      terminatorLayerRef.current = null;
    }
    if (nightLightsLayerRef.current) {
      try { map.removeLayer(nightLightsLayerRef.current); } catch (_) {}
      nightLightsLayerRef.current = null;
    }

    if (!isDayNightEnabled) return;

    // Major global metropolitan hubs with enhanced night lighting glow
    const MAJOR_NIGHT_HUBS = new Set([
      '도쿄', '서울', '뉴욕', '런던', '파리', '싱가포르', '상하이', '베이징', '홍콩',
      '로스앤젤레스', '샌프란시스코', '시카고', '시드니', '방콕', '두바이', '로마',
      '마드리드', '베를린', '토론토', '밴쿠버', '이스탄불', '타이베이', '오사카'
    ]);

    // 1. Night tiles are revealed through a soft twilight mask (v1.3). The mask is a small canvas of
    //    night opacity per cell, placed in layer coordinates and upscaled by the browser, so the day/night
    //    edge fades over the twilight band instead of cutting sharply. A mask only paints inside its element's
    //    box, so the pane is moved and sized to the mask area and its layers are shifted back by the same amount.
    //    Browsers without CSS masks fall back to the previous hard clip-path polygon.
    const supportsSoftMask = typeof CSS !== 'undefined' && (CSS.supports('mask-image', 'url("a.png")') || CSS.supports('-webkit-mask-image', 'url("a.png")'));
    const maskCanvas = document.createElement('canvas');
    let cachedContinuousPoints: [number, number][] | null = null;
    let cachedPointsMinute = -1;
    let maskFrame = 0;

    // The mask is painted with half a screen of margin around the view and pinned in layer coordinates,
    // so a pan inside that margin needs no repaint. Repainting on every move frame made phones flash
    // the night side bright while each new mask image decoded.
    let maskRect: { x: number; y: number; w: number; h: number } | null = null;
    let maskToken = 0;
    const viewInsideMask = (currentMap: any) => {
      if (!maskRect) return false;
      const size = currentMap.getSize();
      const tl = currentMap.containerPointToLayerPoint([0, 0]);
      return tl.x >= maskRect.x && tl.y >= maskRect.y && tl.x + size.x <= maskRect.x + maskRect.w && tl.y + size.y <= maskRect.y + maskRect.h;
    };

    const applySoftMask = (currentMap: any, nightPane: HTMLElement) => {
      const size = currentMap.getSize();
      const padX = size.x * 0.5;
      const padY = size.y * 0.5;
      const cell = 6;
      const cols = Math.max(2, Math.ceil((size.x + padX * 2) / cell));
      const rows = Math.max(2, Math.ceil((size.y + padY * 2) / cell));
      const lats: number[] = [];
      const lngs: number[] = [];
      for (let r = 0; r < rows; r++) lats.push(currentMap.containerPointToLatLng([0, -padY + (r + 0.5) * cell]).lat);
      for (let c = 0; c < cols; c++) lngs.push(currentMap.containerPointToLatLng([-padX + (c + 0.5) * cell, 0]).lng);
      paintNightMask(maskCanvas, lats, lngs, sceneNow());
      const origin = currentMap.containerPointToLayerPoint([-padX, -padY]);
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);
      const url = `url(${maskCanvas.toDataURL()})`;
      const token = ++maskToken;
      const commit = () => {
        if (token !== maskToken) return;
        maskRect = { x: ox, y: oy, w: cols * cell, h: rows * cell };
        applyMaskStyles(nightPane, ox, oy, cols * cell, rows * cell, url);
      };
      // Decode first so the old mask stays until the new one can paint
      const img = new Image();
      img.src = url.slice(4, -1);
      (img.decode ? img.decode() : Promise.resolve()).then(commit, commit);
    };

    const applyMaskStyles = (nightPane: HTMLElement, ox: number, oy: number, w: number, h: number, url: string) => {
      const s = nightPane.style as any;
      s.left = `${ox}px`;
      s.top = `${oy}px`;
      s.width = `${w}px`;
      s.height = `${h}px`;
      Array.from(nightPane.children).forEach(child => {
        (child as HTMLElement).style.left = `${-ox}px`;
        (child as HTMLElement).style.top = `${-oy}px`;
      });
      for (const prefix of ['mask', 'webkitMask']) {
        s[`${prefix}Image`] = url;
        s[`${prefix}Size`] = '100% 100%';
        s[`${prefix}Position`] = '0 0';
        s[`${prefix}Repeat`] = 'no-repeat';
      }
      s.clipPath = 'none';
      s.webkitClipPath = 'none';
    };

    const resetNightPaneMask = (nightPane: HTMLElement) => {
      maskRect = null;
      maskToken++;
      const s = nightPane.style as any;
      s.maskImage = 'none';
      s.webkitMaskImage = 'none';
      s.left = '';
      s.top = '';
      s.width = '';
      s.height = '';
      Array.from(nightPane.children).forEach(child => {
        (child as HTMLElement).style.left = '';
        (child as HTMLElement).style.top = '';
      });
    };

    const updateNightClip = (e?: { type?: string }) => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      const live = e?.type === 'move' || e?.type === 'zoom';
      const nightPane = currentMap.getPane('nightTilePane');
      if (!nightPane) return;

      if (!isDayNightEnabled) {
        nightPane.style.clipPath = 'none';
        nightPane.style.webkitClipPath = 'none';
        resetNightPaneMask(nightPane);
        return;
      }

      // 비행기 활공 중 60fps 불필요한 고비용 마스크 재계산 및 GPU 재래스터화 원천 차단
      if (isFlyingToCountryRef.current) return;

      if (supportsSoftMask) {
        // Mid-gesture: keep the painted mask unless the view has run past its margin; pinch zoom waits for zoomend
        if (live && (e?.type === 'zoom' || viewInsideMask(currentMap))) return;
        cancelAnimationFrame(maskFrame);
        maskFrame = requestAnimationFrame(() => applySoftMask(currentMap, nightPane));
        return;
      }

      const now = sceneNow();
      const currentMinute = Math.floor(now.getTime() / 60000);
      if (!cachedContinuousPoints || cachedPointsMinute !== currentMinute) {
        cachedContinuousPoints = getContinuousNightPolygon(now, 2, -540, 540);
        cachedPointsMinute = currentMinute;
      }
      const layerPoints = cachedContinuousPoints.map(([lat, lng]) => {
        const pt = currentMap.latLngToLayerPoint([lat, lng]);
        return `${Math.round(pt.x)}px ${Math.round(pt.y)}px`;
      });
      const polygonCss = `polygon(${layerPoints.join(', ')})`;
      nightPane.style.clipPath = polygonCss;
      nightPane.style.webkitClipPath = polygonCss;
    };
    updateNightClipRef.current = updateNightClip;

    // One canvas renderer for the terminator line, the sun point and the city lights (no DOM marker per light)
    const lightRenderer = L.canvas({ padding: 0.5 });

    const renderTerminatorAndLights = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;

      const now = sceneNow();
      // Drop the two pole-closing points: only the terminator line itself is drawn
      const linePoints = getNightTerminatorPolygon(now, 2).slice(0, -2);
      const wraps = [linePoints, shiftPolygonCoordinates(linePoints, 360), shiftPolygonCoordinates(linePoints, -360)];

      // 2. Terminator: a crisp hairline with a light halo so it reads on both the day and the night side
      const layers: any[] = [];
      wraps.forEach(points => {
        layers.push(L.polyline(points, { renderer: lightRenderer, color: '#FFFFFF', weight: 3, opacity: 0.55, interactive: false }));
        layers.push(L.polyline(points, { renderer: lightRenderer, color: '#111111', weight: 1, opacity: 0.85, interactive: false }));
      });

      // 3. Subsolar point: where the sun is overhead right now
      const [sunLat, sunLng] = getSubsolarPoint(now);
      [-360, 0, 360].forEach(offset => {
        layers.push(L.circleMarker([sunLat, sunLng + offset], { renderer: lightRenderer, radius: 9, stroke: false, fillColor: '#F59E0B', fillOpacity: 0.18, interactive: false }));
        layers.push(L.circleMarker([sunLat, sunLng + offset], { renderer: lightRenderer, radius: 4, color: '#FFFFFF', weight: 1.5, fillColor: '#F59E0B', fillOpacity: 1, interactive: false }));
      });

      if (terminatorLayerRef.current) {
        try { currentMap.removeLayer(terminatorLayerRef.current); } catch (_) {}
      }
      terminatorLayerRef.current = L.layerGroup(layers).addTo(currentMap);

      // 4. City lights fade in through twilight (opacity follows the same night curve as the mask)
      const lightLayers: any[] = [];
      WORLD_CITIES.forEach(city => {
        if (!(Math.abs(city.lat) > 0.1 || Math.abs(city.lng) > 0.1) || city.lat < -90 || city.lat > 90) return;
        const alpha = nightAlphaForAltitude(getSolarAltitude(city.lat, city.lng, now));
        if (alpha < 0.05) return;
        const isHub = MAJOR_NIGHT_HUBS.has(city.nameKo);
        [-360, 0, 360].forEach(offsetLng => {
          const at: [number, number] = [city.lat, city.lng + offsetLng];
          lightLayers.push(L.circleMarker(at, { renderer: lightRenderer, radius: isHub ? 7 : 4.5, stroke: false, fillColor: '#F59E0B', fillOpacity: 0.22 * alpha, interactive: false }));
          lightLayers.push(L.circleMarker(at, { renderer: lightRenderer, radius: isHub ? 2.6 : 1.8, stroke: false, fillColor: '#FDE047', fillOpacity: 0.95 * alpha, interactive: false }));
        });
      });

      if (nightLightsLayerRef.current) {
        try { currentMap.removeLayer(nightLightsLayerRef.current); } catch (_) {}
      }
      nightLightsLayerRef.current = L.layerGroup(lightLayers).addTo(currentMap);
    };

    renderTerminatorAndLights();
    updateNightClip();
    redrawDayNightRef.current = () => { maskRect = null; renderTerminatorAndLights(); updateNightClip(); };

    // Bind real-time viewport projection listeners
    map.on('move', updateNightClip);
    map.on('moveend', updateNightClip);
    map.on('zoomend', updateNightClip);
    map.on('zoom', updateNightClip);
    map.on('viewreset', updateNightClip);
    map.on('resize', updateNightClip);

    const interval = setInterval(() => {
      maskRect = null;
      renderTerminatorAndLights();
      updateNightClip();
    }, 60000); // 1분마다 태양 위치 및 밤 조명 갱신

    return () => {
      redrawDayNightRef.current = () => {};
      clearInterval(interval);
      cancelAnimationFrame(maskFrame);
      map.off('move', updateNightClip);
      map.off('moveend', updateNightClip);
      map.off('zoomend', updateNightClip);
      map.off('zoom', updateNightClip);
      map.off('viewreset', updateNightClip);
      map.off('resize', updateNightClip);
      if (terminatorLayerRef.current && mapRef.current) {
        try { mapRef.current.removeLayer(terminatorLayerRef.current); } catch (_) {}
        terminatorLayerRef.current = null;
      }
      if (nightLightsLayerRef.current && mapRef.current) {
        try { mapRef.current.removeLayer(nightLightsLayerRef.current); } catch (_) {}
        nightLightsLayerRef.current = null;
      }
    };
  }, [isDayNightEnabled, isDarkMode]);

  // Redraw the terminator, twilight mask and city lights for the previewed time
  useEffect(() => {
    const id = requestAnimationFrame(() => redrawDayNightRef.current());
    return () => cancelAnimationFrame(id);
  }, [timeOffsetHours]);

  // Reset to default global view (Clean reset to South Korea center view with complete mapping sync)
  const handleResetToDefaultView = () => {
    setSelectedCountry(null);
    setSelectedPinGroup(null);
    setIsPlaceListModalOpen(false);
    setIsWishlistModalOpen(false);
    setSearchQuery('');
    const map = mapRef.current;
    if (map) {
      map.stop(); // Immediately stop any in-flight animations/pans
      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (selectPinRef.current) {
        map.removeLayer(selectPinRef.current);
        selectPinRef.current = null;
      }
      map.setView([36.0, 127.5], 3.2);
      map.invalidateSize();
      setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 300);
    }
  };

  // Track the zoom level so journey pins can cluster, and keep stacked markers tappable (v1.3)
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(3);
  const resolveOverlapsRef = useRef<() => void>(() => {});
  resolveOverlapsRef.current = () => {
    resolveMarkerOverlaps(mapRef.current, [
      { markers: countryCityDotsRef.current, yields: false },
      { markers: markersRef.current, yields: false },
      { markers: yellowMarkersRef.current, yields: true },
      { markers: countryDotsRef.current, yields: true },
    ]);
  };
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoomEnd = () => {
      setMapZoomLevel(Math.round(map.getZoom()));
      resolveOverlapsRef.current();
    };
    onZoomEnd();
    map.on('zoomend', onZoomEnd);
    return () => { map.off('zoomend', onZoomEnd); };
  }, []);

  // Render Red Pins for registered journeys (controlled by showVisitedPins and showPinLabels).
  // Pins closer than 40px at the current zoom merge into one pin with a total count; tapping it zooms in.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!showVisitedPins) return;

    const clusterRadius = mapZoomLevel <= 3 ? 56 : mapZoomLevel <= 5 ? 40 : 28;
    const clusters = clusterByPixel(map, pinGroups, mapZoomLevel, clusterRadius);
    const labelsOn = showPinLabels && mapZoomLevel >= 3;

    clusters.forEach(cluster => {
      const group = cluster[0];
      const isCluster = cluster.length > 1;
      const journeyCount = cluster.reduce((sum, g) => sum + g.journeys.length, 0);
      const label = isCluster ? group.city + ' +' + (cluster.length - 1) : group.city;
      const lat = cluster.reduce((s, g) => s + g.lat, 0) / cluster.length;
      const lng = cluster.reduce((s, g) => s + g.lng, 0) / cluster.length;

      const pinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          ${labelsOn ? `
            <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px; pointer-events: none; white-space: nowrap; z-index: 1000;">
              <span style="font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 6px; line-height: 1.2; display: inline-block; box-shadow: none; border-radius: 0;">
                ${label}
              </span>
            </div>
          ` : ''}
          <div class="relative w-full h-full drop-shadow-md transition-transform duration-150 group-hover:scale-110 origin-bottom">
            <svg viewBox="0 0 24 34" width="26" height="34" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
              <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
            </svg>
            ${journeyCount > 1 ? `
              <span class="absolute -top-1.5 -right-1.5 bg-black text-white dark:bg-white dark:text-black font-mono font-extrabold text-micro min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-white dark:border-black">
                ${journeyCount}
              </span>
            ` : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: pinHtml,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
      });

      const addPinMarkerAt = (pinLat: number, pinLng: number, lngOffset: number) => {
        const marker = L.marker([pinLat, pinLng], { icon, zIndexOffset: 900 }).addTo(map);
        marker.on('click', () => {
          if (isCluster) {
            const bounds = L.latLngBounds(cluster.map(g => [g.lat, g.lng + lngOffset]));
            map.flyToBounds(bounds, { padding: [80, 80], maxZoom: Math.max(mapZoomLevel + 2, 6), duration: 0.8 });
            return;
          }
          const c = findCountryForGroup(group.country, group.city, { lat: group.lat, lng: group.lng });
          if (c) {
            handleSelectCountryRef.current(c);
          } else {
            setSelectedPinGroup(group);
          }
        });
        markersRef.current.push(marker);
      };

      addPinMarkerAt(lat, lng, 0);
      // World wrap replication: Americas/Atlantic/Pacific
      if (lng < 60) addPinMarkerAt(lat, lng + 360, 360);
      if (lng > 0) addPinMarkerAt(lat, lng - 360, -360);
    });
    requestAnimationFrame(() => resolveOverlapsRef.current());
  }, [pinGroups, showVisitedPins, showPinLabels, isDarkMode, mapZoomLevel]);

  // Render Yellow Pins for favorite countries (Wishlist, controlled by showWishlistPins and showPinLabels)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    yellowMarkersRef.current.forEach(m => map.removeLayer(m));
    yellowMarkersRef.current = [];

    if (!showWishlistPins) return;

    favoriteCountries.forEach(code => {
      const country = COUNTRIES_DATA.find(c => c.code === code);
      if (!country) return;

      const yellowPinHtml = `
        <div class="relative cursor-pointer group select-none flex justify-center" style="width: 26px; height: 34px;">
          ${showPinLabels && mapZoomLevel >= 3 ? `
            <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px; pointer-events: none; white-space: nowrap; z-index: 1000;">
              <span style="font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1.5px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 6px; line-height: 1.2; display: inline-block; box-shadow: none; border-radius: 0;">
                ${country.name}
              </span>
            </div>
          ` : ''}
          <!-- Yellow SVG Pin: Sharp bottom tip is precisely at (13, 34) -->
          <div class="relative w-full h-full drop-shadow-md transition-transform duration-150 group-hover:scale-110 origin-bottom">
            <svg viewBox="0 0 24 34" width="26" height="34" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#D97706"/>
              <polygon points="12,6.5 13.6,9.8 17.2,10.3 14.6,12.8 15.2,16.5 12,14.8 8.8,16.5 9.4,12.8 6.8,10.3 10.4,9.8" fill="#FFFFFF"/>
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-yellow-pin',
        html: yellowPinHtml,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
      });

      const addYellowMarkerAt = (lat: number, lng: number) => {
        const marker = L.marker([lat, lng], { icon, zIndexOffset: 600 }).addTo(map);
        marker.on('click', () => {
          handleSelectCountryRef.current(country);
        });
        yellowMarkersRef.current.push(marker);
      };

      addYellowMarkerAt(country.center[0], country.center[1]);
      if (country.center[1] < 60) addYellowMarkerAt(country.center[0], country.center[1] + 360);
      if (country.center[1] > 0) addYellowMarkerAt(country.center[0], country.center[1] - 360);
    });
    requestAnimationFrame(() => resolveOverlapsRef.current());
  }, [favoriteCountries, showWishlistPins, showPinLabels, isDarkMode, mapZoomLevel]);

  // Render Faint Minimal Dot Markers for all travelable countries (Visual hint for clickable countries)
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!map || !L) return;

    countryDotsRef.current.forEach(m => map.removeLayer(m));
    countryDotsRef.current = [];

    COUNTRIES_DATA.forEach(country => {
      const dotHtml = `
        <div class="group relative cursor-pointer flex items-center justify-center select-none" style="width: 32px; height: 32px;">
          <!-- Hover Tooltip -->
          <div style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 4px; pointer-events: none; white-space: nowrap; z-index: 1000;" class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <span style="font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${isDarkMode ? '#FFFFFF' : '#000000'}; background-color: ${isDarkMode ? '#000000' : '#FFFFFF'}; border: 1px solid ${isDarkMode ? '#FFFFFF' : '#000000'}; padding: 1.5px 5px; line-height: 1; display: inline-block;">
              ${country.name}
            </span>
          </div>
          <!-- Faint Dot: 7px with subtle contrast ring -->
          <div style="width: 7px; height: 7px; border-radius: 9999px; background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)'}; border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};" class="tgl-map-dot shadow-2xs"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-country-dot',
        html: dotHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const addCountryDotAt = (lat: number, lng: number) => {
        const dotMarker = L.marker([lat, lng], { icon, zIndexOffset: 300 }).addTo(map);
        dotMarker.on('click', (e: any) => {
          if (e && e.originalEvent) e.originalEvent.stopPropagation();
          handleSelectCountryRef.current(country);
        });
        countryDotsRef.current.push(dotMarker);
      };

      addCountryDotAt(country.center[0], country.center[1]);
      if (country.center[1] < 60) addCountryDotAt(country.center[0], country.center[1] + 360);
      if (country.center[1] > 0) addCountryDotAt(country.center[0], country.center[1] - 360);
    });
    requestAnimationFrame(() => resolveOverlapsRef.current());
  }, [isDarkMode]);

  // Filtered countries for search (Supports continent search e.g. "아시아", "유럽", "아프리카", "남미" and Korean city search e.g. "뉴욕", "파리", "로스앤젤레스")
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES_DATA;
    const q = searchQuery.trim().toLowerCase();
    
    // Check if query matches any mapped Korean city
    const mappedEngCity = Object.entries(CITY_KO_MAP).find(([ko]) => ko.toLowerCase().includes(q) || q.includes(ko.toLowerCase()))?.[1];

    return COUNTRIES_DATA.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameKo.includes(q) ||
      c.continent.toLowerCase().includes(q) ||
      c.continentKo.includes(q) ||
      c.cities.some(city => city.toLowerCase().includes(q)) ||
      (mappedEngCity && c.cities.some(city => city.toUpperCase() === mappedEngCity.toUpperCase() || mappedEngCity.toUpperCase().includes(city.toUpperCase())))
    );
  }, [searchQuery]);

  // Wishlist countries full data
  const wishlistCountriesData = useMemo(() => {
    return favoriteCountries
      .map(code => COUNTRIES_DATA.find(c => c.code === code))
      .filter(Boolean) as CountryInfo[];
  }, [favoriteCountries]);

  const isCurrentCountryFavorite = selectedCountry && favoriteCountries.includes(selectedCountry.code);

  // In-place Trip Builder Handlers
  const handleOpenTripBuilder = useCallback((country?: string, city?: string, date?: string, countryCode?: string, initialCities?: string[]) => {
    setIsBuilderOpen(true);
    if (country) setBuilderCountry(country);
    if (countryCode) setBuilderCountryCode(countryCode);
    if (city) setBuilderCity(city);
    if (date) setBuilderDate(date);
    const targetCities = initialCities && initialCities.length > 0 ? initialCities : (city ? [city] : []);
    setBuilderCities(targetCities);
    // 국가 모달은 닫지 않고 유지 (사용자 요청: 나라 모달은 활성상태에서 유지할 것)
    setSelectedPinGroup(null);
    setIsWishlistModalOpen(false);

    // If multiple cities are provided, fit bounds across all cities
    if (targetCities.length > 1 && mapRef.current) {
      const L = (window as any).L;
      if (L) {
        const curCenterLng = mapRef.current.getCenter()?.lng ?? 126.44;
        const coords: [number, number][] = [];
        targetCities.forEach(c => {
          const cData = findCityByNameOrAlias(c);
          const cleanKey = c.toLowerCase().replace(/\s+/g, '');
          const knownCoords = KNOWN_CITY_COORDS[cleanKey] || KNOWN_CITY_COORDS[c];
          const lat = cData?.lat || knownCoords?.[0];
          const lng = cData?.lng || knownCoords?.[1];
          if (lat && lng) {
            let effLng = lng;
            let diff = effLng - curCenterLng;
            while (diff > 180) { effLng -= 360; diff -= 360; }
            while (diff < -180) { effLng += 360; diff += 360; }
            coords.push([lat, effLng]);
          }
        });
        if (coords.length > 1) {
          const bounds = L.latLngBounds(coords);
          mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
          return;
        }
      }
    }

    // If city is provided, fly to it immediately with continuous longitude and adaptive zoom
    if (city) {
      const cityData = findCityByNameOrAlias(city);
      if (cityData && mapRef.current) {
        const curCenterLng = mapRef.current.getCenter()?.lng ?? 126.44;
        let effLng = cityData.lng;
        let diff = effLng - curCenterLng;
        while (diff > 180) { effLng -= 360; diff -= 360; }
        while (diff < -180) { effLng += 360; diff += 360; }

        const matched = COUNTRIES_DATA.find(c => 
          (countryCode && c.code.toLowerCase() === countryCode.toLowerCase()) ||
          (country && (
            c.name.toLowerCase() === country.toLowerCase() ||
            c.nameKo === country ||
            c.code.toLowerCase() === country.toLowerCase()
          ))
        );
        const cityZoom = Math.max(8.5, (matched?.zoom ?? 5) + 1.5);
        mapRef.current.flyTo([cityData.lat, effLng], cityZoom, { duration: 1.2 });
        return;
      }
    }
    // If country is provided, fly to country center
    if (countryCode || country) {
      const matched = COUNTRIES_DATA.find(c => 
        (countryCode && c.code.toLowerCase() === countryCode.toLowerCase()) ||
        (country && (
          c.name.toLowerCase() === country.toLowerCase() ||
          c.nameKo === country ||
          c.code.toLowerCase() === country.toLowerCase()
        ))
      );
      if (matched && mapRef.current) {
        mapRef.current.flyTo(matched.center, matched.zoom || 5, { duration: 1.2 });
      }
    }
  }, []);

  // Divergence check effect: detect if user panned away from active builder target
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const checkDivergence = () => {
      if (!isBuilderOpen || !builderActiveTargetRef.current) {
        setIsMapDivergedFromBuilder(false);
        return;
      }
      const target = builderActiveTargetRef.current;
      if (target.bounds) {
        const intersects = map.getBounds().intersects(target.bounds);
        setIsMapDivergedFromBuilder(!intersects);
      } else if (target.center) {
        const L = (window as any).L;
        if (L) {
          const currentCenter = map.getCenter();
          const targetLatLng = L.latLng(target.center[0], target.center[1]);
          const dist = currentCenter.distanceTo(targetLatLng); // in meters
          setIsMapDivergedFromBuilder(dist > 150000); // 150km threshold
        }
      }
    };

    map.on('moveend', checkDivergence);
    return () => {
      map.off('moveend', checkDivergence);
    };
  }, [isBuilderOpen]);

  const handleReCenterBuilderTarget = useCallback(() => {
    const target = builderActiveTargetRef.current;
    const map = mapRef.current;
    if (!target || !map) return;

    if (target.bounds) {
      map.fitBounds(target.bounds, { padding: [60, 60], maxZoom: 9 });
    } else if (target.center) {
      map.flyTo(target.center, target.zoom || 8.5, { duration: 1.2 });
    }
    setIsMapDivergedFromBuilder(false);
  }, []);

  const handleCloseTripBuilder = useCallback(() => {
    setIsBuilderOpen(false);
    setBuilderCountry('');
    setBuilderCity('');
    setBuilderCities([]);
    setBuilderDate('');
    if (builderRouteLayerRef.current) {
      builderRouteLayerRef.current.remove();
      builderRouteLayerRef.current = null;
    }
    builderMarkersRef.current.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    builderMarkersRef.current = [];
    builderActiveTargetRef.current = null;
    setBuilderTargetName('');
    setIsMapDivergedFromBuilder(false);

    // Cleanly restore the map back to default global view (South Korea center)
    handleResetToDefaultView();
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 250);
  }, []);

  const handleBuilderFocusChange = useCallback((data: {
    country?: DestinationCountry | null;
    city?: DestinationCity | null;
    preset?: PresetTripPlan | null;
    locations?: { name: string; lat?: number; lng?: number }[];
  }) => {
    if (!mapRef.current) return;

    // 현재 지도 중심 경도 기준 연속 경도 계산 (아시아 중심 뷰 wrap 단절 및 지도 튐 완전 방지)
    const curCenterLng = mapRef.current.getCenter()?.lng ?? 126.44;
    const getContinuousLng = (lng: number, refLng: number = curCenterLng) => {
      let diff = lng - refLng;
      while (diff > 180) { lng -= 360; diff -= 360; }
      while (diff < -180) { lng += 360; diff += 360; }
      return lng;
    };

    // Clean previous route and builder markers
    if (builderRouteLayerRef.current) {
      builderRouteLayerRef.current.remove();
      builderRouteLayerRef.current = null;
    }
    builderMarkersRef.current.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    builderMarkersRef.current = [];

    // 트립 빌더에서 국가 변경 시 지도 핀, 에어리어, 국가 모달 실시간 동기화 (요청 3)
    let matchedCountryInfo: CountryInfo | undefined;
    if (data.country) {
      matchedCountryInfo = COUNTRIES_DATA.find(c => 
        c.code.toLowerCase() === data.country?.code.toLowerCase() ||
        c.name.toLowerCase() === data.country?.nameEn.toLowerCase() ||
        c.nameKo === data.country?.nameKo
      );
      if (matchedCountryInfo) {
        setSelectedCountry(matchedCountryInfo);
        setSearchQuery(matchedCountryInfo.name);
        updateCountryHighlightAndPin(matchedCountryInfo);
        if (matchedCountryInfo.cities && matchedCountryInfo.cities.length > 0) {
          setActiveWeatherCity(matchedCountryInfo.cities[0]);
        }
      }
    }

    const validLocs = (data.locations || [])
      .filter(l => l.lat && l.lng)
      .map(l => ({
        ...l,
        lng: getContinuousLng(l.lng!)
      }));
    const L = (window as any).L;

    if (validLocs.length > 0 && L) {
      const latLngs = validLocs.map(l => [l.lat!, l.lng!]);
      
      // Create polyline route connecting locations
      if (validLocs.length > 1) {
        const polyline = L.polyline(latLngs, {
          color: '#dc2626',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.85,
        }).addTo(mapRef.current);
        builderRouteLayerRef.current = polyline;

        // Add Swiss Minimal numbered badge markers for each stop
        validLocs.forEach((loc, idx) => {
          const numStr = String(idx + 1).padStart(2, '0');
          const stopIcon = L.divIcon({
            className: 'custom-builder-stop-icon',
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                <div style="background: #111111; color: #ffffff; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                  ${numStr}
                </div>
                <div style="margin-top: 2px; background: rgba(0,0,0,0.85); color: #ffffff; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 2px; white-space: nowrap; letter-spacing: 0.05em; text-transform: uppercase;">
                  ${loc.name}
                </div>
              </div>
            `,
            iconSize: [60, 42],
            iconAnchor: [30, 11],
          });

          const stopMarker = L.marker([loc.lat!, loc.lng!], { icon: stopIcon, interactive: false }).addTo(mapRef.current);
          builderMarkersRef.current.push(stopMarker);
        });

        const bounds = polyline.getBounds();
        const targetTitle = data.preset?.title || validLocs.map(l => l.name).join(' · ');
        builderActiveTargetRef.current = { name: targetTitle, bounds };
        setBuilderTargetName(targetTitle);
        setIsMapDivergedFromBuilder(false);
        mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 9 });
      } else {
        // Single location
        const loc = validLocs[0];
        const stopIcon = L.divIcon({
          className: 'custom-builder-single-stop',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
              <div style="background: #dc2626; color: #ffffff; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
                01
              </div>
              <div style="margin-top: 2px; background: rgba(0,0,0,0.85); color: #ffffff; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; padding: 1px 5px; border-radius: 2px; white-space: nowrap; letter-spacing: 0.05em; text-transform: uppercase;">
                ${loc.name}
              </div>
            </div>
          `,
          iconSize: [60, 42],
          iconAnchor: [30, 11],
        });
        const stopMarker = L.marker([loc.lat!, loc.lng!], { icon: stopIcon, interactive: false }).addTo(mapRef.current);
        builderMarkersRef.current.push(stopMarker);

        const targetTitle = data.preset?.title || loc.name;
        builderActiveTargetRef.current = { name: targetTitle, center: [loc.lat!, loc.lng!], zoom: 8.5 };
        setBuilderTargetName(targetTitle);
        setIsMapDivergedFromBuilder(false);
        mapRef.current.flyTo([loc.lat!, loc.lng!], 8.5, { duration: 1.2 });
      }
      return;
    }

    if (data.city && data.city.lat && data.city.lng) {
      const targetTitle = data.city.nameKo || data.city.nameEn;
      const cLng = getContinuousLng(data.city.lng);
      builderActiveTargetRef.current = { name: targetTitle, center: [data.city.lat, cLng], zoom: 8.5 };
      setBuilderTargetName(targetTitle);
      setIsMapDivergedFromBuilder(false);
      mapRef.current.flyTo([data.city.lat, cLng], 8.5, { duration: 1.2 });
      return;
    }

    if (matchedCountryInfo) {
      const targetTitle = data.country?.nameKo || data.country?.nameEn || matchedCountryInfo.nameKo;
      const cLng = getContinuousLng(matchedCountryInfo.center[1]);
      const targetCenter: [number, number] = [matchedCountryInfo.center[0], cLng];
      builderActiveTargetRef.current = { name: targetTitle, center: targetCenter, zoom: matchedCountryInfo.zoom || 5 };
      setBuilderTargetName(targetTitle);
      setIsMapDivergedFromBuilder(false);
      mapRef.current.flyTo(targetCenter, matchedCountryInfo.zoom || 5, { duration: 1.2 });
    }
  }, [updateCountryHighlightAndPin]);

  const handleCreateJourneyFromPanel = useCallback((
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
    customTimelineItems?: { date: string; items: any[] }[]
  ) => {
    if (onSaveTrip) {
      onSaveTrip(
        title,
        dateRange,
        location,
        tags,
        lat,
        lng,
        members,
        locations,
        statusBadge,
        country,
        customCoverImg,
        customTimelineItems
      );
    }
    handleCloseTripBuilder();
  }, [onSaveTrip, handleCloseTripBuilder]);

  return (
    <main className={`relative w-full h-[calc(100vh-56px)] h-[calc(100dvh-56px)] flex flex-col lg:flex-row bg-white dark:bg-[#141414] overflow-hidden overscroll-none select-none font-sans touch-pan-x touch-pan-y ${!showPinLabels ? 'map-hide-pin-labels' : ''}`}>
      
      {/* MAP VIEW CONTAINER (Full screen or Split 58% on Desktop / 38vh on Mobile). isolate keeps Leaflet's z-indexes inside it */}
      <div className={`relative isolate ${isBuilderOpen ? 'tgl-map-picking' : ''} transition-all duration-300 ease-in-out ${
        isBuilderOpen 
          ? 'w-full lg:w-[58%] h-[38vh] lg:h-full shrink-0 border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/15' 
          : 'w-full h-full'
      } overflow-hidden`}>
        
        {/* 1. Top Bar: Search with Integrated Wishlist Star & Swiss Minimal Layer Toggles */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-6 sm:right-auto z-[500] flex flex-nowrap items-center gap-1.5 sm:gap-2">
        
        {/* Country & Continent Search Bar with Integrated Wishlist Star Button (Expandable Swiss Minimal) */}
        <div 
          ref={searchContainerRef}
          onClick={() => {
            if (isMobileControlsOpen) {
              isControlsClosingRef.current = true;
              setIsMobileControlsOpen(false);
              setTimeout(() => {
                isControlsClosingRef.current = false;
              }, 350);
            }
          }}
          className={`relative flex items-center bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/20 dark:border-white/20 shadow-2xl z-30 shrink min-w-0 transition-all duration-200 ${
            isMobileControlsOpen ? 'cursor-pointer opacity-80' : ''
          }`}
        >
          {/* Collapsed Search Icon Trigger (Visible when search is closed & empty) */}
          {!isSearchExpanded && !searchQuery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMobileControlsOpen) {
                  isControlsClosingRef.current = true;
                  setIsMobileControlsOpen(false);
                  setTimeout(() => { isControlsClosingRef.current = false; }, 350);
                }
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
              className="tap-target p-2 sm:px-2.5 sm:py-2 flex items-center justify-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="검색 (클릭하여 열기)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Expanded Search Input Field */
            <div className="flex-1 w-[calc(100vw-150px)] max-w-[240px] xs:max-w-[280px] sm:max-w-none sm:w-72 flex items-center px-2 py-1.5 sm:px-3 sm:py-2 animate-card-entrance">
              <Search className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0 mr-1.5 sm:mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                readOnly={isMobileControlsOpen}
                onChange={(e) => {
                  if (isMobileControlsOpen || isControlsClosingRef.current) return;
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                  setSearchSelectedIndex(-1);
                }}
                onFocus={(e) => {
                  if (isMobileControlsOpen || isControlsClosingRef.current) {
                    e.target.blur();
                    return;
                  }
                  setIsMobileControlsOpen(false);
                  setIsSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (!isSearchDropdownOpen || filteredCountries.length === 0) {
                    if (e.key === 'ArrowDown' && filteredCountries.length > 0) {
                      e.preventDefault();
                      setIsSearchDropdownOpen(true);
                      setSearchSelectedIndex(0);
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => (prev + 1) % filteredCountries.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => (prev <= 0 ? filteredCountries.length - 1 : prev - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = (searchSelectedIndex >= 0 && searchSelectedIndex < filteredCountries.length)
                      ? filteredCountries[searchSelectedIndex]
                      : filteredCountries[0];
                    if (target) {
                      handleSelectCountry(target);
                      setIsSearchExpanded(false);
                      setIsSearchDropdownOpen(false);
                      setSearchSelectedIndex(-1);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsSearchDropdownOpen(false);
                    setSearchSelectedIndex(-1);
                  }
                }}
                placeholder="SEARCH..."
                className={`w-full bg-transparent text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none truncate ${
                  isMobileControlsOpen ? 'pointer-events-none' : ''
                }`}
              />
              {/* Clear / Close Search Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (searchQuery) {
                    handleCloseCountry();
                  } else {
                    setIsSearchExpanded(false);
                    setIsSearchDropdownOpen(false);
                    setSearchSelectedIndex(-1);
                  }
                }}
                className="tap-target p-0.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer mr-0.5"
                title={searchQuery ? "지우기" : "검색 닫기"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Integrated Wishlist Star Button on the right of Search */}
          <button
            type="button"
            onClick={(e) => {
              if (isMobileControlsOpen) {
                e.stopPropagation();
                isControlsClosingRef.current = true;
                setIsMobileControlsOpen(false);
                setTimeout(() => {
                  isControlsClosingRef.current = false;
                }, 350);
                return;
              }
              setIsWishlistModalOpen(true);
            }}
            className={`p-2 sm:px-3 sm:py-2 border-l border-black/15 dark:border-white/15 flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 ${
              favoriteCountries.length > 0
                ? 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
            title={`WISHLIST: ${favoriteCountries.length}`}
          >
            <Star className={`w-3.5 h-3.5 ${favoriteCountries.length > 0 ? 'fill-black text-black dark:fill-white dark:text-white' : ''}`} />
            {favoriteCountries.length > 0 && (
              <span className="text-micro sm:text-meta font-mono font-extrabold">{favoriteCountries.length}</span>
            )}
          </button>

          {/* Dropdown Suggestions: Expanded Width & Swiss Minimal 2-Row Editorial Layout */}
          {isSearchDropdownOpen && filteredCountries.length > 0 && !isMobileControlsOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => {
                  setIsSearchDropdownOpen(false);
                  setSearchSelectedIndex(-1);
                }}
              />
              <div 
                ref={searchDropdownRef}
                className="absolute top-full left-0 mt-1 w-[calc(100vw-24px)] max-w-sm sm:w-full sm:max-w-none bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border border-black/15 dark:border-white/15 max-h-60 overflow-y-auto z-[600] shadow-2xl divide-y divide-black/5 dark:divide-white/5"
              >
                {filteredCountries.map((c, idx) => {
                  const isSelected = searchSelectedIndex === idx;
                  return (
                    <div
                      key={c.code}
                      onClick={() => {
                        handleSelectCountry(c);
                        setIsSearchExpanded(false);
                        setIsSearchDropdownOpen(false);
                        setSearchSelectedIndex(-1);
                      }}
                      onMouseEnter={() => setSearchSelectedIndex(idx)}
                      className={`p-2 sm:p-2.5 cursor-pointer flex items-center justify-between gap-2.5 transition-colors ${
                        isSelected 
                          ? 'bg-black/10 dark:bg-white/10' 
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Code Badge + English Name + Korean Name */}
                        <div className="flex items-center gap-1.5 flex-nowrap truncate">
                          <span className="text-meta font-mono font-extrabold text-red-600 dark:text-red-500 shrink-0">
                            {c.code}
                          </span>
                          <span className="text-xs font-extrabold uppercase text-black dark:text-white truncate">
                            {c.name}
                          </span>
                          <span className="text-meta font-sans text-black/60 dark:text-white/60 shrink-0">
                            ({c.nameKo})
                          </span>
                        </div>
                        {/* Row 2: Continent Pill + Representative Cities */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-micro font-mono text-black/60 dark:text-white/60 truncate">
                          <span className="px-1 py-0.2 text-micro font-bold bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 shrink-0">
                            {c.continentKo}
                          </span>
                          <span className="truncate">
                            {c.cities.slice(0, 4).join(' · ')}
                          </span>
                        </div>
                      </div>
                      {/* Right: Currency Code */}
                      <span className="text-meta font-mono font-bold text-black/70 dark:text-white/70 shrink-0">
                        {c.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Layers and legend in one panel (popover on desktop, bottom sheet on phones) */}
        <MapLayerPanel
          showVisitedPins={showVisitedPins} onToggleVisited={toggleVisitedPins}
          showWishlistPins={showWishlistPins} onToggleWishlist={toggleWishlistPins}
          showPinLabels={showPinLabels} onToggleLabels={togglePinLabels}
          isPlaneAnimEnabled={isPlaneAnimEnabled} onTogglePlane={togglePlaneAnim}
          isDayNightEnabled={isDayNightEnabled} onToggleDayNight={() => setIsDayNightEnabled(prev => !prev)}
          timeOffsetHours={timeOffsetHours} onTimeOffsetChange={setTimeOffsetHours}
          previewTimeLabel={previewTimeLabel}
          onResetView={handleResetToDefaultView}
          onOpenPlaces={() => setIsPlaceListModalOpen(true)}
        />

        {/* Trip builder and re-center stay one tap away */}
        <div className="flex items-stretch h-8 sm:h-9 border border-black/20 dark:border-white/20 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md shadow-2xl divide-x divide-black/15 dark:divide-white/15 z-10 shrink-0">
          <button
            type="button"
            onClick={() => { if (isBuilderOpen) handleCloseTripBuilder(); else handleOpenTripBuilder(); }}
            className={`h-full px-2.5 sm:px-3 text-xs font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isBuilderOpen
                ? 'bg-red-600 text-white dark:bg-red-500 dark:text-black'
                : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-85'
            }`}
            title={isBuilderOpen ? "CLOSE TRIP BUILDER" : "CREATE NEW TRIP"}
          >
            <Plus className={`w-3.5 h-3.5 ${isBuilderOpen ? 'rotate-45' : ''} transition-transform`} />
            <span className="hidden sm:inline">TRIP</span>
          </button>
          {isBuilderOpen && builderTargetName && (
            <button
              type="button"
              onClick={handleReCenterBuilderTarget}
              className="tap-target h-full px-2.5 sm:px-3 text-black/70 dark:text-white/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title={`RE-CENTER TO: ${builderTargetName}`}
            >
              <LocateFixed className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>

        {/* Real-time Clock & Day/Night Shade Toggle Pill Widget (Native App Pill Style) */}
        <div className="flex items-center h-8 sm:h-9 px-2 sm:px-3 rounded-full border border-black/20 dark:border-white/20 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md shadow-2xl z-10 gap-1.5 sm:gap-2 text-black dark:text-white select-none shrink-0 transition-all">
          {/* Live Indicator Pulse Dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse shrink-0" />
          
          {/* Time Display (Mobile: HH:mm, Desktop: HH:mm:ss KST) */}
          <div className="flex items-baseline gap-1 font-mono tracking-tight font-extrabold">
            {/* Desktop Full Clock */}
            <span className="hidden sm:inline text-xs font-extrabold tabular-nums">
              {formattedClockTime}
            </span>
            {/* Mobile Compact Clock */}
            <span className="inline sm:hidden text-[11px] font-extrabold tabular-nums">
              {formattedClockShort}
            </span>
            <span className="text-micro sm:text-micro text-black/60 dark:text-white/60 font-bold uppercase hidden sm:inline">
              KST
            </span>
            {timeOffsetHours !== 0 && isDayNightEnabled && (
              <button type="button" onClick={() => setTimeOffsetHours(0)} className="text-micro font-bold text-amber-600 dark:text-amber-500 tabular-nums cursor-pointer" title="지금 시각으로 돌아가기">
                {timeOffsetHours > 0 ? `+${timeOffsetHours}` : timeOffsetHours}h
              </button>
            )}
          </div>

          <div className="w-[1px] h-3 bg-black/15 dark:bg-white/15" />

          {/* Integrated Day/Night Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDayNightEnabled(prev => !prev)}
            className={`p-1 rounded-full transition-all cursor-pointer flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 ${
              isDayNightEnabled
                ? 'text-amber-500'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
            title={isDayNightEnabled ? "낮/밤 명암 및 야경 조명 켜짐 (클릭 시 끄기)" : "낮/밤 명암 및 야경 조명 꺼짐 (클릭 시 켜기)"}
          >
            {isDayNightEnabled ? (
              <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </button>
        </div>

      </div>

      {/* 2. Map Container (Static classes to preserve Leaflet's internal DOM state) */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0" 
      />

      {/* 2.5 Floating Re-center Button when diverged during trip building */}
      {isBuilderOpen && isMapDivergedFromBuilder && builderTargetName && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
          <button
            type="button"
            onClick={handleReCenterBuilderTarget}
            className="flex items-center gap-2 px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black border border-white/20 dark:border-black/20 shadow-2xl hover:bg-black/90 dark:hover:bg-white/90 active:scale-95 transition-all text-xs font-mono font-bold tracking-wider uppercase cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>RE-CENTER: {builderTargetName}</span>
          </button>
        </div>
      )}

      {/* 3. Selected Country Card (Swiss Minimal Editorial Style - Slim Lines, Compact Height, No Box Overload) */}
      {selectedCountry && !isFlyingToCountry && (
        <div className={`${isBuilderOpen ? 'hidden lg:block' : 'block'} fixed sm:absolute bottom-0 sm:bottom-auto sm:top-20 left-0 right-0 ${
          isBuilderOpen ? 'sm:left-6 sm:right-auto' : 'sm:left-auto sm:right-6'
        } w-full sm:w-[380px] max-h-[65vh] sm:max-h-[82vh] bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border-t sm:border border-black/15 dark:border-white/15 shadow-2xl z-[500] p-3 sm:p-5 overflow-y-auto animate-in fade-in slide-in-from-bottom ${
          isBuilderOpen ? 'sm:slide-in-from-left' : 'sm:slide-in-from-right'
        } duration-200`}>
          
          {/* Header: Code + Continent & Country Name */}
          <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 border-b border-black/10 dark:border-white/10 mb-2 sm:mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5 font-['Inter',sans-serif]">
                <span className="text-micro font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500">
                  {selectedCountry.code}
                </span>
                <span className="text-micro font-bold text-black/60 dark:text-white/60">
                  · {selectedCountry.continentKo}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white font-['Inter',sans-serif] leading-tight">
                  {selectedCountry.name}
                </h3>
                <span className="text-xs font-semibold text-black/60 dark:text-white/60">
                  {selectedCountry.nameKo}
                </span>
              </div>
            </div>
            <button
              onClick={handleCloseCountry}
              className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer -mr-1"
              title="닫기 (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3">
            {/* 1. Recorded Journey Cities in this Country (Slim Line Pills) */}
            {(() => {
              const countryPinGroups = pinGroups.filter(g => {
                const matched = findCountryForGroup(g.country, g.city);
                return matched?.code === selectedCountry.code;
              });

              if (countryPinGroups.length === 0) return null;

              const totalJourneys = countryPinGroups.reduce((acc, g) => acc + g.journeys.length, 0);

              return (
                <div className="pb-2 sm:pb-3 border-b border-black/10 dark:border-white/10">
                  <div className="text-micro sm:text-meta font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 mb-1 sm:mb-1.5 flex items-center justify-between">
                    <span>RECORDED JOURNEYS</span>
                    <span className="text-micro sm:text-meta font-mono font-bold text-black/60 dark:text-white/60">
                      {totalJourneys} TOTAL
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-['Inter',sans-serif]">
                    {countryPinGroups.map(group => (
                      <button
                        key={group.city}
                        type="button"
                        onClick={() => setSelectedPinGroup(group)}
                        className="px-2 py-0.5 text-meta font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white border border-black/10 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{group.city}</span>
                        <span className="text-micro sm:text-micro px-1 py-0.2 bg-black/10 dark:bg-white/20 font-mono font-bold">
                          {group.journeys.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 2. Compact 2-Column Grid: Modern Travel Clock & Currency Exchange */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pb-2 sm:pb-3 border-b border-black/10 dark:border-white/10">
              {/* Col 1: Modern Travel Clock Card */}
              <div>
                {(() => {
                  const liveInfo = getCountryLiveTime(selectedCountry.code, liveClockNow);
                  const mainCity = selectedCountry.cities?.[0] || selectedCountry.nameKo;
                  const countryCode = selectedCountry.code === 'ES' ? 'SPA' : selectedCountry.code === 'JP' ? 'JPN' : selectedCountry.code === 'KR' ? 'KOR' : selectedCountry.code === 'US' ? 'USA' : selectedCountry.code;

                  return (
                    <div className="bg-[#f0f0f0] dark:bg-[#252525] rounded-xl sm:rounded-2xl p-2 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs border border-black/5 dark:border-white/10 h-full">
                      <span className="text-micro sm:text-[11px] font-bold text-black/60 dark:text-white/60 lowercase tracking-wider">
                        {liveInfo.ampm}
                      </span>
                      <span className="text-xl sm:text-4xl font-extrabold tracking-tight text-black dark:text-white my-0 sm:my-0.5 font-sans leading-none">
                        {liveInfo.dotTime}
                      </span>
                      <div className="mt-1 sm:mt-1.5 rounded-full bg-white/90 dark:bg-white/10 px-2 sm:px-2.5 py-0.5 inline-flex items-center gap-1 shadow-xs border border-black/5 dark:border-white/10">
                        <span className="text-micro sm:text-[11px] font-bold text-black dark:text-white truncate max-w-[80px] sm:max-w-none">{mainCity}</span>
                        <span className="text-micro sm:text-meta font-mono text-black/60 dark:text-white/60 uppercase">{countryCode}</span>
                      </div>
                      <div className="text-micro sm:text-micro font-mono text-black/60 dark:text-white/60 mt-0.5 sm:mt-1.5">
                        {liveInfo.diffText} (KST)
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Col 2: Balanced 50:50 Modern Travel Exchange Widget Card */}
              <div className="bg-[#f0f0f0] dark:bg-[#252525] rounded-xl sm:rounded-2xl p-2 sm:p-3 flex flex-col justify-between shadow-xs border border-black/5 dark:border-white/10 h-full select-none">
                {(() => {
                  const unit = getOptimalCurrencyUnit(selectedCountry.rateToKRW, selectedCountry.currency);
                  const approxKRW = Math.round(selectedCountry.rateToKRW * unit);

                  return (
                    <>
                      {/* Top Half (50%): Local Currency (e.g. 100 JPY) */}
                      <div className="flex-1 flex flex-col items-center justify-center pb-1 sm:pb-1.5 border-b border-black/10 dark:border-white/10 text-center">
                        <span className="text-micro sm:text-meta font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-widest">
                          LOCAL
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-3xl font-extrabold tracking-tight text-black dark:text-white font-sans leading-none">
                            {unit.toLocaleString()}
                          </span>
                          <span className="text-meta sm:text-sm font-mono font-extrabold text-black/70 dark:text-white/70 uppercase">
                            {selectedCountry.currency}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Half (50%): Korean Won (e.g. 930 KRW) */}
                      <div className="flex-1 flex flex-col items-center justify-center pt-1 sm:pt-1.5 text-center">
                        <span className="text-micro sm:text-meta font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-widest">
                          KRW
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-3xl font-extrabold tracking-tight text-black dark:text-white font-sans leading-none">
                            {approxKRW.toLocaleString()}
                          </span>
                          <span className="text-meta sm:text-sm font-mono font-extrabold text-black/70 dark:text-white/70 uppercase">
                            원
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 2.5 Live Weather & 7-Day Forecast Widget Card */}
            <div className="pb-2 sm:pb-3 border-b border-black/10 dark:border-white/10 select-none">
              <div className="bg-[#f0f0f0] dark:bg-[#252525] rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-xs border border-black/5 dark:border-white/10">
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-micro sm:text-meta font-mono font-extrabold uppercase tracking-widest text-black/60 dark:text-white/60 truncate">
                      WEATHER · {activeWeatherCity || selectedCountry.name}
                    </span>
                  </div>
                  {countryWeather && countryWeather.forecast && countryWeather.forecast.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCountryForecastOpen(prev => !prev)}
                      className="text-micro sm:text-meta font-mono font-bold text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      <span>7-DAY</span>
                      {isCountryForecastOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* City Weather Selector Chips (도시별 날씨 전환) */}
                {selectedCountry.cities && selectedCountry.cities.length > 1 && (
                  <div className="flex items-center gap-1 pt-1.5 sm:pt-2 overflow-x-auto scrollbar-none text-micro sm:text-micro font-mono select-none">
                    {selectedCountry.cities.map(c => {
                      const isCurCity = (activeWeatherCity || selectedCountry.cities[0]) === c;
                      return (
                        <button
                          key={`weather-city-${c}`}
                          type="button"
                          onClick={() => setActiveWeatherCity(c)}
                          className={`px-1.5 sm:px-2 py-0.5 whitespace-nowrap transition-colors cursor-pointer border ${
                            isCurCity
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-extrabold shadow-2xs'
                              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 font-bold'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isCountryWeatherLoading ? (
                  <div className="py-2.5 sm:py-4 flex items-center justify-center text-meta sm:text-xs font-mono text-black/60 dark:text-white/60">
                    LOADING CONDITIONS...
                  </div>
                ) : countryWeather ? (
                  <>
                    <div className="pt-1.5 sm:pt-2 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5 sm:gap-2">
                        <span className="text-2xl sm:text-4xl font-extrabold font-sans tracking-tight text-black dark:text-white leading-none">
                          {countryWeather.temp}°
                        </span>
                        <span className="text-meta sm:text-xs font-mono font-bold text-black/60 dark:text-white/60 uppercase">
                          {getWeatherMeta(countryWeather.weatherCode, countryWeather.forecast?.[0]?.precipitationProb).label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-right">
                        {(() => {
                          const { icon: WeatherIcon, colorClass } = getWeatherMeta(countryWeather.weatherCode, countryWeather.forecast?.[0]?.precipitationProb);
                          return <WeatherIcon className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[2] ${colorClass}`} />;
                        })()}
                        <div className="text-micro sm:text-meta font-mono font-bold text-black/60 dark:text-white/60">
                          <div>H:{countryWeather.tempMax}° L:{countryWeather.tempMin}°</div>
                          <div className="text-micro sm:text-micro text-black/60 dark:text-white/60">{countryWeather.localTime} LOCAL</div>
                        </div>
                      </div>
                    </div>

                    {/* 7-Day Forecast Expandable Accordion */}
                    {isCountryForecastOpen && countryWeather.forecast && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-black/10 dark:border-white/10 grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5 animate-in fade-in duration-150">
                        {countryWeather.forecast.slice(0, 7).map((item, fIdx) => {
                          const { icon: FIcon, colorClass } = getWeatherMeta(item.weatherCode, item.precipitationProb);
                          const isToday = fIdx === 0;

                          return (
                            <div 
                              key={`country-f-${item.date}`}
                              className={`p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-between text-center gap-0.5 sm:gap-1 ${
                                isToday 
                                  ? 'bg-black/5 dark:bg-white/10 font-bold border border-black/10 dark:border-white/20' 
                                  : 'bg-white/40 dark:bg-black/20'
                              }`}
                            >
                              <span className={`text-micro sm:text-micro font-mono ${isToday ? 'font-extrabold text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`}>
                                {isToday ? 'TODAY' : item.dayOfWeek}
                              </span>
                              <FIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2] ${colorClass}`} />
                              <span className="text-micro sm:text-micro font-mono font-bold text-black/80 dark:text-white/80 leading-none">
                                {item.tempMax}°
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-2 text-meta sm:text-xs font-mono text-black/60 dark:text-white/60 text-center">
                    WEATHER UNAVAILABLE
                  </div>
                )}
              </div>
            </div>

            {/* 3. Major Destinations (Clean Pill Buttons, No Star Icon, Toggle Selection) */}
            <div className="pb-2 sm:pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="text-micro sm:text-meta font-mono font-extrabold uppercase tracking-widest text-black/60 dark:text-white/60">
                  DESTINATIONS ({selectedCountry.cities.length})
                </div>
                {selectedDestCities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDestCities([])}
                    className="text-micro sm:text-meta font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline cursor-pointer"
                  >
                    RESET ({selectedDestCities.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 font-['Inter',sans-serif]">
                {selectedCountry.cities.map(city => {
                  const isCitySelected = selectedDestCities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleDestCity(city)}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-meta sm:text-meta font-mono font-bold uppercase transition-all border cursor-pointer select-none ${
                        isCitySelected
                          ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 hover:border-black dark:hover:border-white'
                      }`}
                      title={`${city} 선택 (하단 트립 생성 연동)`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Actions: Wishlist & Create Trip (Slim Swiss Minimal Buttons) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  toggleFavoriteCountry(selectedCountry.code);
                  // 선택된 도시들도 즐겨찾기에 함께 반영
                  selectedDestCities.forEach(c => {
                    if (!favoriteCities.includes(c.toUpperCase())) {
                      toggleFavoriteCity(c);
                    }
                  });
                }}
                className={`w-full py-1.5 sm:py-2 px-2.5 sm:px-3 text-[11px] sm:text-xs font-extrabold uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                  isCurrentCountryFavorite
                    ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-[#161616] text-black dark:text-white border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isCurrentCountryFavorite ? 'fill-black text-black' : ''}`} />
                <span>{isCurrentCountryFavorite ? 'SAVED WISH' : 'WISH'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetCity = selectedDestCities.length > 0 ? selectedDestCities[0] : undefined;
                  handleOpenTripBuilder(selectedCountry.name, targetCity, undefined, selectedCountry.code, selectedDestCities);
                }}
                className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 bg-black text-white dark:bg-white dark:text-black text-[11px] sm:text-xs font-extrabold uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer shadow-xs truncate"
                title="선택된 장소 또는 국가 기준으로 새로운 트립 생성"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {selectedDestCities.length > 0
                    ? `TRIP (${selectedDestCities.length})`
                    : 'CREATE TRIP'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* 4. INLINE SPLIT TRIP BUILDER PANEL (42% on Desktop / remaining height on Mobile) */}
      {isBuilderOpen && (
        <div className="w-full lg:w-[42%] h-[calc(100%-38vh)] lg:h-full flex-1 overflow-hidden z-20 bg-white dark:bg-[#121212] flex flex-col min-h-0 animate-in fade-in duration-200">
          <TripBuilderPanel
            isOpen={true}
            onClose={handleCloseTripBuilder}
            onCreate={handleCreateJourneyFromPanel}
            initialCountry={builderCountry}
            initialCountryCode={builderCountryCode}
            initialCity={builderCity}
            initialCities={builderCities}
            initialStartDate={builderDate}
            isAdmin={isAdmin}
            currentUserProfile={currentUserProfile}
            onFocusLocationChange={handleBuilderFocusChange}
          />
        </div>
      )}

      {/* Wishlist Modal (Favorite Countries & Cities) */}
      {isWishlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#FAF9F6] dark:bg-[#181818] border border-black/20 dark:border-white/20 p-5 shadow-2xl flex flex-col gap-4 font-['Inter',sans-serif]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-extrabold uppercase tracking-wider text-black dark:text-white font-mono">
                  WISHLIST
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsWishlistModalOpen(false)}
                className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Countries vs Cities */}
            <div className="flex border-b border-black/10 dark:border-white/10 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setWishlistTab('countries')}
                className={`pb-2 px-3 tracking-wider cursor-pointer transition-colors ${
                  wishlistTab === 'countries'
                    ? 'border-b-2 border-black dark:border-white text-black dark:text-white font-extrabold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                COUNTRIES ({favoriteCountries.length})
              </button>
              <button
                type="button"
                onClick={() => setWishlistTab('cities')}
                className={`pb-2 px-3 tracking-wider cursor-pointer transition-colors ${
                  wishlistTab === 'cities'
                    ? 'border-b-2 border-black dark:border-white text-black dark:text-white font-extrabold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                CITIES ({favoriteCities.length})
              </button>
            </div>

            {/* Modal Body */}
            {wishlistTab === 'countries' ? (
              favoriteCountries.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60">
                  즐겨찾기에 등록된 국가가 없습니다. <br />
                  지도에서 국가를 클릭한 후 ★ WISH 버튼을 눌러보세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 divide-y divide-black/5 dark:divide-white/5">
                  {favoriteCountries.map(code => {
                    const country = COUNTRIES_DATA.find(c => c.code === code);
                    if (!country) return null;
                    return (
                      <div key={code} className="pt-2 flex items-center justify-between gap-3">
                        <div 
                          className="cursor-pointer flex-1 min-w-0"
                          onClick={() => {
                            handleSelectCountry(country);
                            setIsWishlistModalOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold uppercase truncate text-black dark:text-white">
                              {country.name}
                            </span>
                            <span className="text-meta font-mono text-black/60 dark:text-white/60">
                              ({country.nameKo})
                            </span>
                          </div>
                          <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate block mt-0.5">
                            {country.cities.slice(0, 3).join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenTripBuilder(country.name, undefined, undefined, country.code);
                            }}
                            className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black font-sans text-meta font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-85 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>TRIP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavoriteCountry(country.code)}
                            className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-red-500 cursor-pointer"
                            title="즐겨찾기 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              favoriteCities.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60">
                  즐겨찾기에 등록된 도시가 없습니다. <br />
                  국가 상세 카드에서 원하는 여행 도시의 ★를 눌러 담아보세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 divide-y divide-black/5 dark:divide-white/5">
                  {favoriteCities.map(city => {
                    const matchedCountry = COUNTRIES_DATA.find(c => c.cities.some(cty => cty.toUpperCase() === city.toUpperCase()));
                    return (
                      <div key={city} className="pt-2 flex items-center justify-between gap-3">
                        <div 
                          className="cursor-pointer flex-1 min-w-0"
                          onClick={() => {
                            if (matchedCountry) {
                              handleSelectCountry(matchedCountry);
                            }
                            setIsWishlistModalOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold uppercase truncate text-black dark:text-white">
                              {city}
                            </span>
                            {matchedCountry && (
                              <span className="text-meta font-mono text-black/60 dark:text-white/60">
                                · {matchedCountry.name} ({matchedCountry.nameKo})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenTripBuilder(matchedCountry?.name || '', city, undefined, matchedCountry?.code);
                            }}
                            className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black font-sans text-meta font-extrabold uppercase tracking-wider cursor-pointer hover:opacity-85 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>TRIP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavoriteCity(city)}
                            className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-red-500 cursor-pointer"
                            title="도시 즐겨찾기 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 5. Pin Journeys Modal (When Clicking City Pin) */}
      {selectedPinGroup && (
        <div 
          className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPinGroup(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 shadow-2xl p-6 select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
              <div>
                <span className="text-meta font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  TRIP
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">
                  {selectedPinGroup.city}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-black/60 dark:text-white/60">
                    {selectedPinGroup.country} · {selectedPinGroup.journeys.length} JOURNEYS RECORDED
                  </span>
                  {(() => {
                    const c = findCountryForGroup(selectedPinGroup.country, selectedPinGroup.city);
                    if (!c) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPinGroup(null);
                          handleSelectCountry(c);
                        }}
                        className="text-meta font-mono font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        [➔ {c.name} 국가 정보 보기]
                      </button>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setSelectedPinGroup(null)}
                className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {selectedPinGroup.journeys.map(journey => {
                const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');
                const cleanTitle = journey.title.replace(' (Plan)', '');

                return (
                  <div
                    key={journey.id}
                    onClick={() => {
                      setSelectedPinGroup(null);
                      onNavigate('detail', journey.id);
                    }}
                    className="p-3 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-between gap-3 cursor-pointer group rounded-none"
                  >
                    <div className="w-12 h-12 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                      <img
                        src={getEffectiveImageUrl(journey.img)}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs sm:text-sm font-extrabold font-sans uppercase tracking-tight text-black dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {cleanTitle}
                        </h4>
                        {isPlan ? (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white font-mono text-micro font-extrabold uppercase tracking-widest shrink-0">
                            PLAN
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black font-mono text-micro font-extrabold uppercase tracking-widest shrink-0">
                            LOG
                          </span>
                        )}
                      </div>
                      <div className="text-meta font-mono text-black/60 dark:text-white/60 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-black/60 dark:text-white/60" />
                        <span>{journey.date}</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Registered Journey Places Directory Modal (신설) */}
      {isPlaceListModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPlaceListModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-xl bg-white dark:bg-[#151515] border border-black/15 dark:border-white/15 shadow-2xl p-4 sm:p-6 flex flex-col max-h-[82vh] overflow-hidden select-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/15 dark:border-white/15">
              <div>
                <span className="text-meta font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                  VISITED LOCATIONS DIRECTORY
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                  등록된 여정 장소 목록 ({pinGroups.length}개 도시)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlaceListModalOpen(false)}
                className="tap-target p-1.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter for locations */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60" />
                <input
                  type="text"
                  value={placeSearchQuery}
                  onChange={e => setPlaceSearchQuery(e.target.value)}
                  placeholder="도시 또는 국가 검색..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 outline-none text-black dark:text-white rounded-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Place list items */}
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-black/10 dark:divide-white/10 mt-2 pr-1">
              {filteredPlaceGroups.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60">
                  검색된 등록 장소가 없습니다.
                </div>
              ) : (
                filteredPlaceGroups.map((group, idx) => {
                  const repJourney = group.journeys[0];
                  return (
                    <div
                      key={`${group.city}-${group.lat}-${group.lng}-${idx}`}
                      onClick={() => {
                        setIsPlaceListModalOpen(false);
                        const map = mapRef.current;
                        if (map) {
                          map.flyTo([group.lat, group.lng], 8, { duration: 1.2 });
                        }
                        setSelectedPinGroup(group);
                      }}
                      className="group flex items-center justify-between py-2.5 px-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 aspect-square overflow-hidden bg-black/10 shrink-0 border border-black/10 dark:border-white/10">
                          {repJourney?.img ? (
                            <img src={getEffectiveImageUrl(repJourney.img)} alt={group.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black/60 dark:text-white/60">
                              <MapPin className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs sm:text-sm text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors uppercase truncate">
                              {group.city}
                            </span>
                            {group.country && (
                              <span className="text-meta font-mono text-black/60 dark:text-white/60 uppercase">
                                · {group.country}
                              </span>
                            )}
                          </div>
                          <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate">
                            {repJourney?.title || '기록된 여정'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-meta font-sans font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10">
                          {group.journeys.length} Trip
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Marker CSS Overrides, Swiss Minimal Typography & Label Toggle Rules */}
      <style>{`
        .custom-map-pin, .custom-yellow-pin, .custom-select-pin {
          background: transparent !important;
          border: none !important;
          overflow: visible !important;
        }
        .pin-label {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 5px;
          pointer-events: none;
          white-space: nowrap;
          display: block !important;
          z-index: 1000;
        }
        .swiss-pin-badge, .swiss-wishlist-badge {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #000000;
          background-color: #FFFFFF;
          border: 1px solid #000000;
          padding: 1.5px 5px;
          line-height: 1.25;
          display: inline-block;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .dark .swiss-pin-badge,
        .dark .swiss-wishlist-badge {
          color: #FFFFFF;
          background-color: #000000;
          border: 1px solid #FFFFFF;
        }
        .map-hide-pin-labels .pin-label {
          display: none !important;
        }
      `}</style>
    </main>
  );
}
