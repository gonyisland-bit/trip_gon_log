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

// Map hub modals: wishlist, journeys at a pin, and the registered places directory.
export function MapModals({ s }: { s: MapHubState }) {
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

  return (
    <>
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
                            className="btn btn-primary btn-sm flex"
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
                            className="btn btn-primary btn-sm flex"
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
                        {c.name} →
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
                          <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-micro font-extrabold uppercase tracking-widest shrink-0">
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
          className="fixed inset-0 z-modal bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
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
    </>
  );
}
