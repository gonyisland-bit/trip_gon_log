import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List, Clock, LocateFixed, Plane, Sun, Moon, Droplets, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, Plan, UserProfile } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';
import { findCityByNameOrAlias, DestinationCountry, DestinationCity, PresetTripPlan, WORLD_CITIES } from '../data/worldDestinations';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../utils/weatherApi';
import { resolveMarkerOverlaps, clusterByPixel } from '../utils/mapMarkerOverlap';
import { getNightTerminatorPolygon, shiftPolygonCoordinates, getContinuousNightPolygon, getSolarAltitude, nightAlphaForAltitude, paintNightMask, getSubsolarPoint } from '../utils/solarTerminator';
import { notify } from '../utils/feedback';

import { COUNTRIES_DATA, KNOWN_CITY_COORDS, CITY_KO_MAP, findCountryForGroup, COUNTRY_TIMEZONE_MAP, getCountryLiveTime, getOptimalCurrencyUnit, shiftGeoJsonCoordinates } from './map/mapData';
import { useHubVisible } from '../app/hubVisible';
import type { CountryInfo } from './map/mapData';
import { MapLayerPanel } from './map/MapLayerPanel';
import { useMapHubState, MapHubPageProps } from './map/useMapHubState';
import { MapTopBar } from './map/MapTopBar';
import { SelectedCountryCard } from './map/SelectedCountryCard';
import { MapModals } from './map/MapModals';
import { PlaceMap } from './map/PlaceMap';
import { Segment } from '../components/ui/Segment';
import { Globe2, MapPinned } from 'lucide-react';

// Map hub (v1.3): the page shell. State lives in useMapHubState; the top bar, the country card
// and the modals are sections that read it through `s`.
// v1.3.8: two tabs. The world map is for choosing where to go and ticking off where one has been; the place map
// (made the first time it is opened, then kept) is for being there: stays, saved spots and quick spots nearby.

type MapMode = 'world' | 'place';
const MODE_KEY = 'tgl_map_mode';
const readMode = (): MapMode => { try { return localStorage.getItem(MODE_KEY) === 'place' ? 'place' : 'world'; } catch { return 'world'; } };

export function MapHubPage(props: MapHubPageProps) {
  const s = useMapHubState(props);
  const {
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
  } = s;

  // The phone tab bar floats over the map; it steps aside while a country card is open
  // (only while this is the hub on screen: a kept-alive map must not hide the tab bar from the other drawers)
  const hubVisible = useHubVisible();
  const [mode, setMode] = useState<MapMode>(readMode);
  const [placeMade, setPlaceMade] = useState(mode === 'place');
  const changeMode = (m: MapMode) => {
    setMode(m);
    if (m === 'place') { setPlaceMade(true); if (selectedCountry) handleCloseCountry(); }
    try { localStorage.setItem(MODE_KEY, m); } catch { /* a view convenience */ }
  };
  useEffect(() => {
    document.documentElement.toggleAttribute('data-map-sheet', hubVisible && mode === 'world' && !!selectedCountry);
    return () => document.documentElement.removeAttribute('data-map-sheet');
  }, [selectedCountry, hubVisible, mode]);

  return (
    <main className={`relative w-full h-[var(--hub-h,calc(100vh-56px))] supports-[height:100dvh]:h-[var(--hub-h,calc(100dvh-56px))] flex flex-col lg:flex-row bg-paper dark:bg-paper-dark overflow-hidden overscroll-none select-none font-sans touch-pan-x touch-pan-y ${!showPinLabels ? 'map-hide-pin-labels' : ''}`}>
      
      {/* MAP VIEW CONTAINER. isolate keeps Leaflet's z-indexes inside it */}
      <div className="relative isolate w-full h-full overflow-hidden">
        
      <MapTopBar s={s} />

      {/* 2. Map Container (Static classes to preserve Leaflet's internal DOM state) */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0" 
      />

      <SelectedCountryCard s={s} />

      {placeMade && (
        <div className={`absolute inset-0 z-[550] bg-paper dark:bg-paper-dark ${mode === 'place' ? '' : 'hidden'}`}>
          <PlaceMap trips={trips} plans={plans} staysByTrip={props.staysByTrip} isDarkMode={isDarkMode} />
        </div>
      )}

      {/* World or place: under the top bar on the left */}
      <div className={`absolute z-[560] top-[52px] left-3 sm:top-16 sm:left-6 ${mode === 'world' && selectedCountry ? 'max-sm:hidden' : ''}`}>
        <Segment<MapMode>
          size="sm"
          ariaLabel="지도 보기"
          value={mode}
          onChange={changeMode}
          options={[{ value: 'world', label: '세계', icon: Globe2 }, { value: 'place', label: '장소', icon: MapPinned }]}
          className="!bg-surface/95 dark:!bg-surface-dark/95 shadow-lg"
        />
      </div>

      </div>

      <MapModals s={s} />

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
