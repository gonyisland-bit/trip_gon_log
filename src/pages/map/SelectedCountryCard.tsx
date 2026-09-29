import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ArrowRight, Calendar, Star, Plus, Tag, MapPin, Bookmark, Home as HomeIcon, List, Clock, LocateFixed, Plane, Sun, Moon, Droplets, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trip, Plan, UserProfile } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../../components/SummaryView';
import { TripBuilderPanel } from '../../components/TripBuilderPanel';
import { findCityByNameOrAlias, DestinationCountry, DestinationCity, PresetTripPlan, WORLD_CITIES } from '../../data/worldDestinations';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../../utils/weatherApi';
import { resolveMarkerOverlaps, clusterByPixel } from '../../utils/mapMarkerOverlap';
import { getNightTerminatorPolygon, shiftPolygonCoordinates, getContinuousNightPolygon, getSolarAltitude, nightAlphaForAltitude, paintNightMask, getSubsolarPoint } from '../../utils/solarTerminator';
import { notify } from '../../utils/feedback';

import { COUNTRIES_DATA, KNOWN_CITY_COORDS, CITY_KO_MAP, findCountryForGroup, COUNTRY_TIMEZONE_MAP, getCountryLiveTime, getOptimalCurrencyUnit, shiftGeoJsonCoordinates } from './mapData';
import type { CountryInfo } from './mapData';
import { MapLayerPanel } from './MapLayerPanel';
import type { MapHubState } from './useMapHubState';
import { NewTripButton } from '../../components/NewTripButton';
import { useSnapSheet } from '../../components/sheet/useSnapSheet';

// Selected country card: journeys there, local clock, exchange rate, weather and major cities.
export function SelectedCountryCard({ s }: { s: MapHubState }) {
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

  // Phones: the card is a bottom sheet over the map, like the Trip Guide (half, full over the map, pull down to close)
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isCardOpen = !!selectedCountry && !isFlyingToCountry && !isBuilderOpen;
  const [sheetAreaHeight, setSheetAreaHeight] = useState(0);
  const countrySheet = useSnapSheet({
    enabled: isCardOpen && isPhone && sheetAreaHeight > 0,
    halfTop: Math.round(sheetAreaHeight * 0.42),
    areaHeight: sheetAreaHeight,
    onClose: handleCloseCountry,
  });
  useEffect(() => {
    const el = countrySheet.containerRef.current;
    if (!el || !isPhone) return;
    const measure = () => setSheetAreaHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isCardOpen, isPhone, countrySheet.containerRef]);
  const phoneSheet = isPhone && !isBuilderOpen;

  return (
    <>
      {/* 3. Selected Country Card (Swiss Minimal Editorial Style - Slim Lines, Compact Height, No Box Overload) */}
      {selectedCountry && !isFlyingToCountry && (
        <div
          ref={countrySheet.containerRef}
          data-sheet-snap={countrySheet.panelHeight !== undefined ? countrySheet.snap : undefined}
          className={phoneSheet
            ? 'absolute inset-0 z-[500] translate-y-full flex flex-col bg-surface dark:bg-surface-dark rounded-t-sheet shadow-[0_-8px_24px_rgba(0,0,0,0.18)] will-change-transform'
            : `${isBuilderOpen ? 'hidden lg:block' : 'block'} fixed sm:absolute bottom-0 sm:bottom-auto sm:top-20 left-0 right-0 ${
              isBuilderOpen ? 'sm:left-6 sm:right-auto' : 'sm:left-auto sm:right-6'
            } w-full sm:w-[380px] max-h-[65vh] sm:max-h-[82vh] bg-surface dark:bg-surface-dark rounded-t-sheet sm:rounded-card shadow-2xl z-[500] p-3 sm:p-5 overflow-y-auto animate-in fade-in slide-in-from-bottom ${
              isBuilderOpen ? 'sm:slide-in-from-left' : 'sm:slide-in-from-right'
            } duration-200`}
        >
          {phoneSheet && (
            <button
              type="button"
              data-sheet-handle
              onClick={countrySheet.toggle}
              className="w-full h-5 shrink-0 grid place-items-center cursor-grab touch-none"
              aria-label={countrySheet.snap === 'full' ? '카드 줄이기' : '카드 펼치기'}
            >
              <span className="block w-10 h-1 rounded-full bg-black/25 dark:bg-white/30" />
            </button>
          )}
          <div
            data-sheet-scroll={phoneSheet ? '' : undefined}
            className={phoneSheet ? 'overflow-y-auto overscroll-contain px-3 pb-3' : 'contents'}
            style={phoneSheet && countrySheet.panelHeight !== undefined ? { height: countrySheet.panelHeight - 20 } : undefined}
          >
          
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
                        className="h-8 px-3 rounded-full text-meta font-bold uppercase tracking-wider bg-black/[0.06] dark:bg-white/10 hover:bg-ink hover:text-surface dark:hover:bg-ink-dark dark:hover:text-paper-dark text-black dark:text-white border border-black/10 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{group.city}</span>
                        <span className="text-micro px-1.5 rounded-full bg-black/10 dark:bg-white/20 font-mono font-bold">
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
                    <div className="bg-paper dark:bg-paper-dark rounded-card p-2 sm:p-3 flex flex-col items-center justify-center text-center h-full">
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
              <div className="bg-paper dark:bg-paper-dark rounded-card p-2 sm:p-3 flex flex-col justify-between h-full select-none">
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
              <div className="bg-paper dark:bg-paper-dark rounded-card p-2 sm:p-3 shadow-xs border border-black/5 dark:border-white/10">
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

              <NewTripButton
                size="sm"
                block
                onClick={() => {
                  const targetCity = selectedDestCities.length > 0 ? selectedDestCities[0] : undefined;
                  handleOpenTripBuilder(selectedCountry.name, targetCity, undefined, selectedCountry.code, selectedDestCities);
                }}
                title="선택된 장소 또는 국가 기준으로 새로운 트립 생성"
                label={selectedDestCities.length > 0 ? `New trip (${selectedDestCities.length})` : 'New trip'}
              />
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
