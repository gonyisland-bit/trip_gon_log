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
import { useMapHubState, MapHubPageProps } from './map/useMapHubState';
import { MapTopBar } from './map/MapTopBar';
import { SelectedCountryCard } from './map/SelectedCountryCard';
import { MapModals } from './map/MapModals';
import { useSnapSheet } from '../components/sheet/useSnapSheet';

// Map hub (v1.3): the page shell. State lives in useMapHubState; the top bar, the country card
// and the modals are sections that read it through `s`.

export function MapHubPage(props: MapHubPageProps) {
  const s = useMapHubState(props);
  const {
    trips,
    plans,
    onNavigate,
    onCreateTripForCountry,
    isDarkMode,
    isAdmin,
    onSaveTrip,
    initialBuilderOpen,
    initialBuilderCountry,
    initialBuilderCity,
    initialBuilderDate,
    onBuilderStateChange,
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
    isBuilderOpen,
    setIsBuilderOpen,
    builderCountry,
    setBuilderCountry,
    builderCountryCode,
    setBuilderCountryCode,
    builderCity,
    setBuilderCity,
    builderCities,
    setBuilderCities,
    builderDate,
    setBuilderDate,
    builderRouteLayerRef,
    builderMarkersRef,
    builderActiveTargetRef,
    builderTargetName,
    setBuilderTargetName,
    isMapDivergedFromBuilder,
    setIsMapDivergedFromBuilder,
    isBuilderOpenRef,
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
    toggleDestCityRef,
    requestChangeBuilderCity,
    requestChangeBuilderCityRef,
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
    handleOpenTripBuilder,
    handleReCenterBuilderTarget,
    handleCloseTripBuilder,
    handleBuilderFocusChange,
    handleCreateJourneyFromPanel,
  } = s;

  // The phone tab bar floats over the map; it steps aside while a country card or the Trip Guide is open
  useEffect(() => {
    const open = !!selectedCountry || isBuilderOpen;
    document.documentElement.toggleAttribute('data-map-sheet', open);
    return () => document.documentElement.removeAttribute('data-map-sheet');
  }, [selectedCountry, isBuilderOpen]);

  // Phones: the Trip Guide is a bottom sheet over the map(rests below the 38vh map, opens to the top)
  const mainRef = useRef<HTMLElement>(null);
  const [sheetArea, setSheetArea] = useState({ height: 0, halfTop: 0, phone: false });
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const measure = () => setSheetArea({
      height: main.clientHeight,
      halfTop: Math.round(window.innerHeight * 0.38),
      phone: window.innerWidth < 1024,
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    return () => ro.disconnect();
  }, []);
  const guideSheet = useSnapSheet({
    enabled: isBuilderOpen && sheetArea.phone && sheetArea.height > 0,
    halfTop: sheetArea.halfTop,
    areaHeight: sheetArea.height,
    onClose: handleCloseTripBuilder,
  });

  return (
    <main ref={mainRef} className={`relative w-full h-[calc(100vh-56px)] supports-[height:100dvh]:h-[calc(100dvh-56px)] flex flex-col lg:flex-row bg-paper dark:bg-paper-dark overflow-hidden overscroll-none select-none font-sans touch-pan-x touch-pan-y ${!showPinLabels ? 'map-hide-pin-labels' : ''}`}>
      
      {/* MAP VIEW CONTAINER (Full screen or Split 58% on Desktop / 38vh on Mobile). isolate keeps Leaflet's z-indexes inside it */}
      <div className={`relative isolate ${isBuilderOpen ? 'tgl-map-picking' : ''} transition-all duration-300 ease-in-out ${
        isBuilderOpen 
          ? 'w-full lg:w-[58%] h-[38vh] supports-[height:100dvh]:max-lg:h-[38dvh] lg:h-full shrink-0 border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/15' 
          : 'w-full h-full'
      } overflow-hidden`}>
        
      <MapTopBar s={s} />

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
            className="flex items-center gap-2 px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black border border-white/20 dark:border-black/20 shadow-2xl hover:bg-black/90 dark:hover:bg-white/90 active:scale-95 transition text-xs font-mono font-bold tracking-wider uppercase cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>RE-CENTER: {builderTargetName}</span>
          </button>
        </div>
      )}

      <SelectedCountryCard s={s} />

      </div>

      {/* 4. INLINE SPLIT TRIP BUILDER PANEL (42% on Desktop / remaining height on Mobile) */}
      {isBuilderOpen && (
        <div
          ref={guideSheet.containerRef}
          data-sheet-snap={guideSheet.panelHeight !== undefined ? guideSheet.snap : undefined}
          className="max-lg:absolute max-lg:inset-0 max-lg:z-30 max-lg:rounded-t-sheet max-lg:shadow-[0_-8px_24px_rgba(0,0,0,0.18)] w-full lg:w-[42%] lg:h-full lg:flex-1 min-h-0 overflow-hidden z-20 bg-surface dark:bg-surface-dark flex flex-col lg:animate-in lg:fade-in lg:duration-200 will-change-transform"
        >
          {/* Grab bar: drag the sheet, or tap to switch between half and full */}
          <button
            type="button"
            data-sheet-handle
            onClick={guideSheet.toggle}
            className="lg:hidden w-full h-6 shrink-0 grid place-items-center cursor-grab touch-none"
            aria-label={guideSheet.snap === 'full' ? '가이드 줄이기' : '가이드 펼치기'}
          >
            <span className="block w-10 h-1 rounded-full bg-black/25 dark:bg-white/30" />
          </button>
          <div className="flex flex-col min-h-0 flex-1 lg:h-full" style={guideSheet.panelHeight !== undefined ? { height: guideSheet.panelHeight - 20, flex: 'none' } : undefined}>
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
        </div>
      )}

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
