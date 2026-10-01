import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List, Clock, LocateFixed, Plane, Sun, Moon, Droplets, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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
import type { MapHubState } from './useMapHubState';
import { HUB_MAP_STYLES, HUB_MAP_STYLE_LABEL, applyHubMapStyle, type HubMapStyle } from '../../utils/mapTiles';
import { Layers } from 'lucide-react';

function MapStylePicker({ value, onChange }: { value: HubMapStyle; onChange: (v: HubMapStyle) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0 z-10">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="지도 스타일"
        title="지도 스타일"
        className={`h-8 sm:h-9 px-3 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${open ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' : 'bg-surface/95 dark:bg-surface-dark/95 text-black dark:text-white'}`}
      >
        <Layers className="w-3.5 h-3.5" aria-hidden />
        <span className="hidden sm:inline">{HUB_MAP_STYLE_LABEL[value]}</span>
      </button>
      {open && (
        <div role="radiogroup" aria-label="지도 스타일" className="absolute left-0 top-full mt-1.5 flex items-center gap-0.5 p-1 rounded-full bg-surface/95 dark:bg-surface-dark/95 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {HUB_MAP_STYLES.map(st => (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={value === st}
              onClick={() => { onChange(st); setOpen(false); }}
              className={`h-8 px-3.5 rounded-full text-meta whitespace-nowrap transition-colors ${value === st ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-bold' : 'text-black/65 dark:text-white/65 font-medium hover:text-black dark:hover:text-white'}`}
            >
              {HUB_MAP_STYLE_LABEL[st]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Map hub top bar: search, wishlist, layers, trip builder and the clock.
export function MapTopBar({ s }: { s: MapHubState }) {
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

  return (
    <>
        {/* 1. Top Bar: Search with Integrated Wishlist Star & Swiss Minimal Layer Toggles */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-6 sm:right-auto z-[500] flex flex-nowrap items-center gap-1.5 sm:gap-2">
        
        {/* Country & Continent Search Bar with Integrated Wishlist Star Button (Expandable Swiss Minimal) */}
        <div
          ref={searchContainerRef}
          className="relative flex items-center h-8 sm:h-9 rounded-full bg-surface/95 dark:bg-surface-dark/95 shadow-lg z-30 shrink min-w-0 transition duration-200"
        >
          {/* Collapsed Search Icon Trigger (Visible when search is closed & empty) */}
          {!isSearchExpanded && !searchQuery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
              className="tap-target h-full pl-3 pr-2 rounded-l-full flex items-center justify-center text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="검색 (클릭하여 열기)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Expanded Search Input Field */
            <div className="flex-1 w-[calc(100vw-150px)] max-w-[240px] xs:max-w-[280px] sm:max-w-none sm:w-72 flex items-center pl-3 pr-2 animate-card-entrance">
              <Search className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0 mr-1.5 sm:mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                  setSearchSelectedIndex(-1);
                }}
                onFocus={() => {
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
                className="w-full bg-transparent text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none truncate"
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
            onClick={() => setIsWishlistModalOpen(true)}
            className={`h-full pl-2 pr-3 rounded-r-full border-l border-black/10 dark:border-white/10 flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 ${
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
          {isSearchDropdownOpen && filteredCountries.length > 0 && (
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
                className="absolute top-full left-0 mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-full sm:min-w-[18rem] sm:max-w-none rounded-card bg-surface dark:bg-surface-dark max-h-60 overflow-y-auto z-[600] shadow-xl divide-y divide-black/5 dark:divide-white/5"
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
                          ? 'bg-black/10 dark:bg-white/[0.18]' 
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
                          <span className="px-1.5 rounded-full text-micro font-bold bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 shrink-0">
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

        {/* Map style, as on the journey map (v1.3.7): saved per account */}
        <MapStylePicker value={mapTileStyle} onChange={(v) => { setMapTileStyle(v); applyHubMapStyle(v); }} />

        {/* Real-time Clock & Day/Night Shade Toggle Pill Widget (Native App Pill Style) */}
        <div className="flex items-center h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-surface/95 dark:bg-surface-dark/95 shadow-lg z-10 gap-1.5 sm:gap-2 text-black dark:text-white select-none shrink-0 transition">
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
    </>
  );
}
