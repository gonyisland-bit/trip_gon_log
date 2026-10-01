import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HubMapStyle, hubTileFor, isHubMapStyle, readHubMapStyle } from '../../utils/mapTiles';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List, Clock, LocateFixed, Plane, Sun, Moon, Droplets, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Trip, Plan, UserProfile } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../../components/SummaryView';
import { findCityByNameOrAlias, DestinationCountry, DestinationCity, PresetTripPlan, WORLD_CITIES } from '../../data/worldDestinations';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../../utils/weatherApi';
import { resolveMarkerOverlaps, clusterByPixel } from '../../utils/mapMarkerOverlap';
import { getNightTerminatorPolygon, shiftPolygonCoordinates, getContinuousNightPolygon, getSolarAltitude, nightAlphaForAltitude, paintNightMask, getSubsolarPoint } from '../../utils/solarTerminator';
import { notify } from '../../utils/feedback';

import { COUNTRIES_DATA, KNOWN_CITY_COORDS, CITY_KO_MAP, findCountryForGroup, COUNTRY_TIMEZONE_MAP, getCountryLiveTime, getOptimalCurrencyUnit, shiftGeoJsonCoordinates } from './mapData';
import type { CountryInfo } from './mapData';
import { MapLayerPanel } from './MapLayerPanel';

// Map hub state (split out of MapHub.tsx in v1.3): everything the page keeps, fetches and reacts to.
// Moved as is; the page shell and its sections read it through `s`.

let cachedCountriesGeoJson: any = null;

export interface MapPinGroup {
  city: string;
  country: string;
  lat: number;
  lng: number;
  journeys: (Trip | Plan)[];
}

export interface MapHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onCreateTripForCountry?: (countryName: string, cityName?: string) => void;
  /** Opens the New trip sheet with the country and the cities picked on the map */
  onStartNewTrip?: (countryName: string, cities: string[]) => void;
  isDarkMode: boolean;
  isAdmin?: boolean;
  currentUserProfile?: UserProfile | null;
}

export function useMapHubState({
  trips,
  plans,
  onNavigate,
  onCreateTripForCountry,
  onStartNewTrip,
  isDarkMode,
  isAdmin = false,
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

  // One city at a time; with "multiple" on, cities are added in the order they are tapped
  const [isMultiDest, setIsMultiDest] = useState(false);
  const isMultiDestRef = useRef(isMultiDest);
  isMultiDestRef.current = isMultiDest;
  const toggleDestCity = useCallback((cityName: string) => {
    setSelectedDestCities(prev => {
      const isAdding = !prev.includes(cityName);
      if (isAdding) {
        // 도시 선택 시 날씨도 해당 도시로 즉시 자동 동기화
        setActiveWeatherCity(cityName);
        return isMultiDestRef.current ? [...prev, cityName] : [cityName];
      } else {
        return prev.filter(c => c !== cityName);
      }
    });
  }, []);
  // Turning "multiple" off keeps the first city
  const toggleMultiDest = useCallback(() => {
    setIsMultiDest(on => {
      if (on) setSelectedDestCities(prev => prev.slice(0, 1));
      return !on;
    });
  }, []);

  const toggleDestCityRef = useRef(toggleDestCity);
  useEffect(() => {
    toggleDestCityRef.current = toggleDestCity;
  }, [toggleDestCity]);

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
        toggleDestCityRef.current(cityName);
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

  // World map style, this member's own (v1.3.7): picked from the map's style button
  const [mapTileStyle, setMapTileStyle] = useState<HubMapStyle>(readHubMapStyle);

  useEffect(() => {
    const handleTileChange = (e: any) => {
      const next = e?.detail;
      if (isHubMapStyle(next)) setMapTileStyle(next);
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
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser?.uid || 'public', 'settings', 'map_wishlist'), (docSnap) => {
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
      } else {
        // A member without a wishlist yet: never show a cache left by another account on this device
        setFavoriteCountries([]);
        setFavoriteCities([]);
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
      await setDoc(doc(db, 'users', auth.currentUser?.uid || 'public', 'settings', 'map_wishlist'), {
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
      await setDoc(doc(db, 'users', auth.currentUser?.uid || 'public', 'settings', 'map_wishlist'), {
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

    // Zoom sits top right under the search bar on phones (the tab bar covers the bottom), bottom right on desktop
    L.control.zoom({ position: 'topright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(map);
    map.getContainer().classList.add('tgl-hub-map');

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

    // Leaflet keeps the size it measured when the map was made; when the hub opens mid-transition
    // that is a fraction of the screen and only a corner fills with tiles. Re-measure on every change.
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { try { map.invalidateSize({ animate: false }); } catch (_) {} });
    });
    ro.observe(mapContainerRef.current);
    const settle = window.setTimeout(() => { try { map.invalidateSize({ animate: false }); } catch (_) {} }, 400);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
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

    const common = { updateWhenIdle: false, updateWhenZooming: false, crossOrigin: true };
    if (isDayNightEnabled) {
      // Day tiles everywhere, night tiles of the same style clipped to the dark side
      const day = hubTileFor(mapTileStyle, false), night = hubTileFor(mapTileStyle, true);
      tileLayerRef.current = L.tileLayer(day.url, { ...day.options, ...common }).addTo(map);
      nightTileLayerRef.current = L.tileLayer(night.url, { ...night.options, ...common, pane: 'nightTilePane' }).addTo(map);
    } else {
      const nightPane = map.getPane('nightTilePane');
      if (nightPane) {
        nightPane.style.clipPath = 'none';
        nightPane.style.webkitClipPath = 'none';
      }
      const t = hubTileFor(mapTileStyle, isDarkMode);
      tileLayerRef.current = L.tileLayer(t.url, { ...t.options, ...common }).addTo(map);
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
      // The frame may land after the map was removed (leaving the Map hub quickly)
      if (mapRef.current !== currentMap || !currentMap._mapPane) return;
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
              <span class="absolute -top-1.5 -right-1.5 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-mono font-extrabold text-micro min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-white dark:border-black">
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

  // New trip from the map: the same sheet as everywhere else, starting with what is picked here
  const handleStartNewTrip = useCallback((country?: string, cities: string[] = []) => {
    setSelectedPinGroup(null);
    setIsWishlistModalOpen(false);
    onStartNewTrip?.(country || '', cities);
  }, [onStartNewTrip]);

  return {
    trips,
    plans,
    onNavigate,
    onCreateTripForCountry,
    isDarkMode,
    isAdmin,
    currentUserProfile,
    mapContainerRef,
    mapRef,
    tileLayerRef,
    nightTileLayerRef,
    markersRef,
    highlightLayerRef,
    selectPinRef,
    yellowMarkersRef,
    countryDotsRef,
    geoJsonDataRef,
    prevDestCitiesCountRef,
    terminatorLayerRef,
    nightLightsLayerRef,
    isDayNightEnabled,
    setIsDayNightEnabled,
    currentClockTime,
    setCurrentClockTime,
    timeOffsetHours,
    setTimeOffsetHours,
    timeOffsetRef,
    sceneNow,
    redrawDayNightRef,
    previewTimeLabel,
    formattedClockTime,
    formattedClockShort,
    searchQuery,
    setSearchQuery,
    isSearchExpanded,
    setIsSearchExpanded,
    searchInputRef,
    searchContainerRef,
    selectedCountry,
    setSelectedCountry,
    selectedDestCities,
    setSelectedDestCities,
    activeWeatherCity,
    setActiveWeatherCity,
    countryWeather,
    setCountryWeather,
    isCountryWeatherLoading,
    setIsCountryWeatherLoading,
    isCountryForecastOpen,
    setIsCountryForecastOpen,
    destCityMarkersRef,
    countryCityDotsRef,
    toggleDestCity,
    isMultiDest,
    toggleMultiDest,
    handleStartNewTrip,
    onStartNewTrip,
    toggleDestCityRef,
    isFlyingToCountry,
    setIsFlyingToCountry,
    isFlyingToCountryRef,
    flightAnimRef,
    flightPlaneMarkerRef,
    flightTrailPolylineRef,
    flightPreTimeoutRef,
    flightLandingTimeoutRef,
    flightSessionIdRef,
    updateNightClipRef,
    selectedPinGroup,
    setSelectedPinGroup,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchSelectedIndex,
    setSearchSelectedIndex,
    searchDropdownRef,
    isWishlistModalOpen,
    setIsWishlistModalOpen,
    wishlistTab,
    setWishlistTab,
    isPlaceListModalOpen,
    setIsPlaceListModalOpen,
    placeSearchQuery,
    setPlaceSearchQuery,
    liveClockNow,
    setLiveClockNow,
    mapTileStyle,
    setMapTileStyle,
    favoriteCountries,
    setFavoriteCountries,
    favoriteCities,
    setFavoriteCities,
    showPinLabels,
    setShowPinLabels,
    showVisitedPins,
    setShowVisitedPins,
    showWishlistPins,
    setShowWishlistPins,
    isPlaneAnimEnabled,
    setIsPlaneAnimEnabled,
    isPlaneAnimEnabledRef,
    togglePinLabels,
    toggleVisitedPins,
    toggleWishlistPins,
    togglePlaneAnim,
    toggleFavoriteCountry,
    toggleFavoriteCity,
    allJourneys,
    pinGroups,
    filteredPlaceGroups,
    flyAirplaneToDestination,
    updateCountryHighlightAndPin,
    handleSelectCountry,
    handleCloseCountry,
    handleSelectCountryRef,
    matchCountryFromLatLng,
    handleResetToDefaultView,
    mapZoomLevel,
    setMapZoomLevel,
    resolveOverlapsRef,
    filteredCountries,
    wishlistCountriesData,
    isCurrentCountryFavorite,
  };
}

export type MapHubState = ReturnType<typeof useMapHubState>;
