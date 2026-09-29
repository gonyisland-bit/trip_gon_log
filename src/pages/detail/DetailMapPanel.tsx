import React from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, Pause, SkipForward, SkipBack, X as CloseIcon, X } from 'lucide-react';
import { DockButton } from '../../components/player/PlayerDock';
import { MapArea } from '../../components/MapArea';
import { cleanAdministrativeDistricts } from '../../components/SummaryView';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SpotPocketItem } from '../../types';
import { extractCountry, getCountryName } from './detailUtils';
import type { JourneyDetailState } from './useJourneyDetailState';

export function DetailMapPanel({ s }: { s: JourneyDetailState }) {
  const {
    trip, transits, isDarkMode, activeTab, detectedCountry, selectedDate, expandedItemId,
    hoveredItemId, setHoveredItemId, radarItems, setRadarItems, activeRadarIndex,
    setActiveRadarIndex, isRadarMinimized, setIsRadarMinimized, radarFocusedSpot,
    setRadarFocusedSpot, radarRouteTarget, setRadarRouteTarget, activeGhostSpotId, isEditing,
    draftTransits, transitFocusType, tripToUse, isCinematicMode, setIsCinematicMode, cinematicIndex,
    setCinematicIndex, isCinematicPaused, setIsCinematicPaused, cinematicSpeed, setCinematicSpeed,
    playSwipeStartXRef, mobileSheetSnap, setMobileSheetSnap, setIsPlayFabIdle, resetPlayFabIdleTimer,
    cinematicItems, currentCinematicItem, currentCinematicVehicleType, handleDirectAddFromPocket,
    handleStartPlaylog, mapPoints, handleItemToggle, renderInfoHeader, todayMode
  } = s;

  // 모바일: 레이더 알약은 Playlog 바와 겹치지 않게 한 칸 위로
  const hasPlaylog = cinematicItems.length > 0 && (activeTab === 'timeline' || activeTab === 'gallery');

  return (
    <>
      <section 
        className={`w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-[height,opacity] duration-300 ease-standard md:h-full shrink-0 ${
          mobileSheetSnap === 'expanded' 
            ? 'max-md:h-0 max-md:opacity-0 max-md:border-none overflow-hidden pointer-events-none' 
            : 'max-md:h-[38dvh]'
        }`}
        onClick={() => {
          if (window.innerWidth < 768 && mobileSheetSnap === 'expanded') {
            setMobileSheetSnap('half');
          }
        }}
      >
        {renderInfoHeader()}

        {/* Dynamic Map Area */}
        <div className="w-full relative flex-1 min-h-0 flex flex-col overflow-hidden" style={{ isolation: 'isolate' }}>
          {/* Magazine Cover Typography Overlay (Only in Summary tab) */}
          {activeTab === 'summary' && (() => {
            const loc = tripToUse?.locationStr || '';
            const parts = loc.split(',').map(p => p.trim());
            const hasMultipleLocations = tripToUse?.locations && tripToUse.locations.length >= 2;
            const locationsCountries = tripToUse?.locations
              ? Array.from(new Set(
                  tripToUse.locations.map((l: any) => {
                    if (l.country) return l.country.trim().toUpperCase();
                    const extracted = extractCountry(l.name || '');
                    if (extracted && extracted !== (l.name || '').trim().toUpperCase()) {
                      return extracted;
                    }
                    return getCountryName(l.name || '');
                  }).filter((c: string) => Boolean(c) && c !== 'TRAVEL')
                )) as string[]
              : [];

            let country = 'TRAVEL';
            if (tripToUse?.country && tripToUse.country.trim()) {
              country = tripToUse.country.trim().toUpperCase();
            } else if (locationsCountries.length > 0) {
              country = locationsCountries.join(', ');
            } else {
              const rawCountry = parts.length >= 2 ? parts[parts.length - 1] : (parts[0] || 'TRAVEL');
              const extractedFallback = extractCountry(rawCountry);
              country = (extractedFallback && extractedFallback !== rawCountry.toUpperCase())
                ? extractedFallback
                : getCountryName(rawCountry);
            }
            const rawCity = hasMultipleLocations 
              ? tripToUse?.locations?.map(l => l.name).join(', ') 
              : (parts.length >= 2 ? parts[0] : (loc || 'JOURNEY'));
            const city = cleanAdministrativeDistricts(rawCity);

            return (
              <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-[20] flex flex-col pointer-events-none select-none text-black dark:text-white animate-in fade-in duration-300">
                <span className="text-[13px] sm:text-sm md:text-base font-extrabold tracking-[0.25em] uppercase text-red-600 dark:text-red-500 mb-1 leading-none font-sans">
                  {detectedCountry || country}
                </span>
                <h2 className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tighter leading-[0.95] border-b-2 sm:border-b-4 border-black dark:border-white pb-1 sm:pb-2 max-w-[240px] sm:max-w-[480px] break-words font-sans text-black dark:text-white">
                  {city}
                </h2>
              </div>
            );
          })()}

          <ErrorBoundary fallback={
            <div className="flex-grow flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#111111] text-black/60 dark:text-white/60 p-6 relative h-full w-full">
              <span className="text-meta uppercase tracking-widest font-bold z-10 mb-2">Map Temporary Unavailable</span>
              <img src={tripToUse?.mapImg || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop'} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
            </div>
          }>
            <MapArea 
              trip={tripToUse!}
              isEditMode={isEditing}
              mapPoints={mapPoints}
              expandedItemId={expandedItemId}
              handleItemToggle={handleItemToggle}
              selectedDate={activeTab === 'gallery' ? 'ALL' : selectedDate}
              isDarkMode={isDarkMode}
              activeTab={activeTab}
              transitFocusType={transitFocusType}
              transits={isEditing ? draftTransits : transits}
              isCinematicMode={isCinematicMode}
              cinematicSpeed={cinematicSpeed}
              cinematicVehicleType={currentCinematicVehicleType}
              hoveredItemId={hoveredItemId}
              onItemHover={setHoveredItemId}
              onAddSpotToTimeline={handleDirectAddFromPocket}
              radarFocusedSpot={radarFocusedSpot}
              radarRouteTarget={radarRouteTarget}
              activeGhostSpotId={activeGhostSpotId}
              todayRoute={todayMode.todayKey ? { date: todayMode.todayKey, nowMin: todayMode.nowMin } : null}
            />
          </ErrorBoundary>

          {/* ── Ultra-Compact Swiss Minimal Radar Floating Widget in Map Bottom-Left (Avoiding Playlog) ── */}
          {radarItems.length > 0 && (() => {
            const currentRadarItem = radarItems[activeRadarIndex] || radarItems[0];
            const isPocket = currentRadarItem.type === 'pocket';
            const isRouteActive = Boolean(
              radarRouteTarget &&
              radarRouteTarget.lat === currentRadarItem.lat &&
              radarRouteTarget.lng === currentRadarItem.lng
            );

            const handleToggleRoute = () => {
              if (isRouteActive) {
                setRadarRouteTarget(null);
              } else {
                setRadarRouteTarget({
                  lat: currentRadarItem.lat,
                  lng: currentRadarItem.lng,
                  title: currentRadarItem.title,
                  distance: currentRadarItem.distance,
                });
                setRadarFocusedSpot({
                  lat: currentRadarItem.lat,
                  lng: currentRadarItem.lng,
                  title: currentRadarItem.title,
                });
              }
            };

            // 1. Minimized Mode: Compact Pill Toggle (Allows reopening anytime)
            if (isRadarMinimized) {
              return (
                <button
                  type="button"
                  onClick={() => setIsRadarMinimized(false)}
                  className={`absolute ${hasPlaylog ? 'bottom-16' : 'bottom-4'} left-4 sm:bottom-6 sm:left-6 z-35 bg-black/90 dark:bg-white/90 text-white dark:text-black px-2.5 py-1 border border-black/20 dark:border-white/20 shadow-lg rounded-full flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none cursor-pointer hover:border-red-500 transition-all`}
                  title="근접 레이더 위젯 열기"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span className="font-mono font-bold text-meta tracking-wider uppercase text-red-500">RADAR</span>
                  <span className="text-micro font-mono font-bold px-1 rounded bg-red-500/20 text-red-500">
                    {radarItems.length}
                  </span>
                </button>
              );
            }

            // 2. Expanded Mode: Ultra-Compact Minimal HUD
            return (
              <div className={`absolute ${hasPlaylog ? 'bottom-16' : 'bottom-4'} left-4 sm:bottom-6 sm:left-6 z-35 bg-black/90 dark:bg-white/90 text-white dark:text-black px-2.5 py-1.5 border border-black/20 dark:border-white/20 shadow-xl rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none max-w-[calc(100vw-32px)]`}>
                {/* Simple Radar Pulse Indicator */}
                <div className="relative flex items-center justify-center shrink-0 w-3.5 h-3.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 relative z-10" />
                </div>

                {/* Spot Name & Distance (Click to toggle route between GPS and Spot) */}
                <button
                  type="button"
                  onClick={handleToggleRoute}
                  className={`flex items-center gap-1 min-w-0 transition-all cursor-pointer text-left px-1.5 py-0.5 rounded ${
                    isRouteActive 
                      ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/50' 
                      : 'hover:opacity-80'
                  }`}
                  title={isRouteActive ? "이동경로 끄기" : "이동경로 보기 (클릭시 토글)"}
                >
                  <span className="font-bold text-xs truncate max-w-[110px] sm:max-w-[160px]">
                    {currentRadarItem.title}
                  </span>
                  <span className="text-meta text-red-500 font-mono font-bold shrink-0">
                    {currentRadarItem.distance}m
                  </span>
                </button>

                {/* Minimal multi-item pagination (if 2 or more targets) */}
                {radarItems.length > 1 && (
                  <div className="flex items-center gap-0.5 px-1 py-0.5 bg-white/10 dark:bg-black/10 rounded text-micro font-mono shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveRadarIndex(prev => (prev > 0 ? prev - 1 : radarItems.length - 1))}
                      className="tap-target hover:text-red-500 p-0.5 cursor-pointer"
                      title="이전 장소"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-bold px-0.5">{activeRadarIndex + 1}/{radarItems.length}</span>
                    <button
                      type="button"
                      onClick={() => setActiveRadarIndex(prev => (prev < radarItems.length - 1 ? prev + 1 : 0))}
                      className="tap-target hover:text-red-500 p-0.5 cursor-pointer"
                      title="다음 장소"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Simple ADD button icon (Pockets only) */}
                {isPocket && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDirectAddFromPocket(currentRadarItem.rawItem as SpotPocketItem);
                      setRadarItems(prev => prev.filter((_, idx) => idx !== activeRadarIndex));
                    }}
                    className="tap-target w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="타임라인에 추가"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </button>
                )}

                {/* Close / Minimize (X) icon */}
                <button
                  type="button"
                  onClick={() => setIsRadarMinimized(true)}
                  className="tap-target text-white/60 dark:text-black/60 hover:text-white dark:hover:text-black p-0.5 cursor-pointer shrink-0"
                  title="레이더 접기 (언제든 다시 열 수 있습니다)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })()}

          {/* Floating Morphing Player (Swiss Minimal Floating Widget <-> Expanded Editorial Bar) */}
          {cinematicItems.length > 0 && (activeTab === 'timeline' || activeTab === 'gallery') && (
            <div
              onMouseEnter={() => setIsPlayFabIdle(false)}
              onMouseLeave={resetPlayFabIdleTimer}
              onTouchStart={(e) => {
                playSwipeStartXRef.current = e.touches[0].clientX;
                setIsPlayFabIdle(false);
                resetPlayFabIdleTimer();
              }}
              onTouchEnd={(e) => {
                if (playSwipeStartXRef.current === null) return;
                const deltaX = e.changedTouches[0].clientX - playSwipeStartXRef.current;
                playSwipeStartXRef.current = null;
                if (isCinematicMode && cinematicItems.length > 0) {
                  if (deltaX > 40) {
                    // Swiped Right -> Previous Spot
                    setCinematicIndex(prev => (prev - 1 + cinematicItems.length) % cinematicItems.length);
                  } else if (deltaX < -40) {
                    // Swiped Left -> Next Spot
                    setCinematicIndex(prev => (prev + 1) % cinematicItems.length);
                  }
                }
              }}
              className={`absolute bottom-3 md:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto flex items-center rounded-full overflow-hidden opacity-100 bg-black/70 text-white border border-white/15 backdrop-blur-md p-1 ${
                isCinematicMode
                  ? 'h-11 w-[calc(100%-1.5rem)] max-w-[480px] justify-between'
                  : 'h-10 w-auto justify-center hover:scale-105 active:scale-95 cursor-pointer group'
              }`}
            >
              {/* Collapsed: play circle + 'Playlog' */}
              {!isCinematicMode ? (
                <button
                  onClick={handleStartPlaylog}
                  className="w-full h-full flex items-center gap-2 cursor-pointer select-none pl-0.5 pr-3"
                  title="플레이로그 시작 (Space)"
                  aria-label="Playlog"
                >
                  <div className="w-8 h-8 aspect-square shrink-0 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                    <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                  </div>
                  <span className="text-xs sm:text-meta font-sans font-bold tracking-tight text-white whitespace-nowrap select-none">
                    Playlog
                  </span>
                </button>
              ) : (
                /* Expanded: the shared player dock language (prev · play · next | spot and progress | speed · close) */
                currentCinematicItem && (
                  <div className="w-full h-full flex items-center gap-0.5 select-none animate-in fade-in duration-200">
                    <DockButton label="이전 스팟 (←)" className="!w-9 !h-9" onClick={() => setCinematicIndex(prev => (prev - 1 + cinematicItems.length) % cinematicItems.length)}>
                      <ChevronLeft className="w-4 h-4" />
                    </DockButton>
                    <button
                      onClick={() => setIsCinematicPaused(p => !p)}
                      className="tgl-press w-9 h-9 aspect-square shrink-0 rounded-full bg-white text-black flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-colors"
                      aria-label={isCinematicPaused ? '재생' : '일시정지'}
                      title={isCinematicPaused ? '재생 (Space)' : '일시정지 (Space)'}
                    >
                      {isCinematicPaused ? <Play className="w-3.5 h-3.5 fill-black ml-0.5" /> : <Pause className="w-3.5 h-3.5 fill-black" />}
                    </button>
                    <DockButton label="다음 스팟 (→)" className="!w-9 !h-9" onClick={() => setCinematicIndex(prev => (prev + 1) % cinematicItems.length)}>
                      <ChevronRight className="w-4 h-4" />
                    </DockButton>
                    <span className="w-px h-5 bg-white/20 mx-1 shrink-0" aria-hidden />

                    {/* Spot name, progress with the walker, count */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-1">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-bold text-white tracking-tight truncate font-sans">
                          {currentCinematicItem.place || 'Spot'}
                        </span>
                        <span className="text-micro font-mono font-bold text-white/60 shrink-0 tabular-nums">
                          {String(cinematicIndex + 1).padStart(2, '0')}/{String(cinematicItems.length).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="relative h-[2px] bg-white/25">
                        <div
                          key={`progress-${cinematicIndex}-${cinematicSpeed}`}
                          className="absolute top-0 bottom-0 left-0 bg-red-500 animate-cinematic-progress"
                          style={{ animationDuration: `${cinematicSpeed}ms`, animationPlayState: isCinematicPaused ? 'paused' : 'running' }}
                        />
                        <div
                          key={`walker-${cinematicIndex}-${cinematicSpeed}`}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 animate-cinematic-walker flex items-center justify-center pointer-events-none"
                          style={{ animationDuration: `${cinematicSpeed}ms`, animationPlayState: isCinematicPaused ? 'paused' : 'running' }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-900 flex items-center justify-center">
                            <img src="/walker.png" alt="" className="w-2 h-2 object-contain" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <span className="w-px h-5 bg-white/20 mx-1 shrink-0" aria-hidden />
                    <button
                      onClick={() => setCinematicSpeed(s => s === 3600 ? 1800 : (s === 1800 ? 7200 : 3600))}
                      className="tgl-press h-9 min-w-9 px-1.5 shrink-0 rounded-full text-xs font-mono font-extrabold text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer tabular-nums"
                      title="재생 속도 (1X / 2X / 0.5X)"
                    >
                      {cinematicSpeed === 1800 ? '2X' : (cinematicSpeed === 7200 ? '.5X' : '1X')}
                    </button>
                    <DockButton label="종료 (Esc)" className="!w-9 !h-9" onClick={() => setIsCinematicMode(false)}>
                      <CloseIcon className="w-4 h-4" />
                    </DockButton>
                  </div>
                )
              )}
            </div>
          )}
        </div>

      </section>
    </>
  );
}
