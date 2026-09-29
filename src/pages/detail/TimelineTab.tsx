import {
  Plane, Ship, Train, Car, Lock, Trash2, Image as ImageIcon, MapPin, Plus, ExternalLink, MapPinOff,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Sun, Cloud, Cloudy, CloudRain, Snowflake,
  CloudLightning, GripVertical, Check, Coins, Copy
} from 'lucide-react';
import { ImageEditOverlay } from '../../components/ImageEditOverlay';
import { SettlementExpenseInput } from '../../components/SettlementExpenseInput';
import { fetchCoordinates } from '../../utils/googleMapsHelper';
import { fetchAddressFromCoords } from '../../utils/googleMapsHelper';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { TimelineItemPlaceInput } from './TimelineItemPlaceInput';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import {
  dayColors, getDayOfWeek, minutesToTimeStr, parseTimeToMinutes, timeStrTo24h, time24hTo12h
} from './detailUtils';
import type { JourneyDetailState } from './useJourneyDetailState';
import { formatCountdown } from './useTodayMode';

// The red hairline that marks the current time between today's items
function NowLine({ label }: { label: string }) {
  return (
    <div className="tgl-now-line relative flex items-center gap-2 px-4 md:px-6 h-7" aria-label={`현재 시각 ${label}`}>
      <span className="w-2 h-2 rounded-full bg-red-600 animate-live-pulse shrink-0" />
      <span className="font-mono text-micro font-bold tracking-widest text-red-600 dark:text-red-500 tabular-nums">NOW {label}</span>
      <span className="flex-1 h-px bg-red-600 dark:bg-red-500" />
    </div>
  );
}

export function TimelineTab({ s }: { s: JourneyDetailState }) {
  const {
    isLoggedIn, activeTab, setActiveTab, visitedTabs, selectedDate, setSelectedDate, collapsedDays,
    setCollapsedDays, expandedItemId, setExpandedItemId, highlightedDateSection, setCostModalItem,
    setIsPocketWidgetOpen, isEditing, setDraftTimeline, draftTimelineRef, setMapConfirm,
    setDraggedItemId, selectedItemIds, setSelectedItemIds, frequentPlaces, tripToUse,
    defaultCurrency, tabContentRef, isCinematicMode, setCinematicIndex, copiedSpotId,
    setCopiedSpotId, cinematicItems, itemRefs, scrollTargetItemIdRef, dateBarRef, hasMovedRef,
    handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove, scrollDays,
    handleDropTimelineItem, handleGenerateDefaultTemplate, allTripDates, dynamicDates,
    currentTimeline, handleAddTimelineItemRelativeTo, updateTimelineItem, updateTimelineItemFields,
    toggleFrequentPlace, isFrequent, handleSelectFrequent, handleToggleExcludeFromMap,
    handleAddTimelineItem, handleDeleteTimelineItem, handleWeatherChange, todayMode
  } = s;

  // Today mode shows on today's page and on ALL, never while editing
  const live = !!todayMode.todayKey && !isEditing && (selectedDate === todayMode.todayKey || selectedDate === 'ALL');
  const nowAfterId = live ? todayMode.lastPassedId : null;
  const nowBeforeId = live && nowAfterId === null ? todayMode.next?.id ?? null : null;

  return (
    <>
      <div className={`h-auto flex flex-col w-full relative ${activeTab === 'timeline' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('timeline') && (
          <>
            {/* Day filter selector bar - Slim and Sticky */}
            <div className="sticky top-0 z-[35] border-b border-black/15 dark:border-white/15 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md transition-colors shrink-0 w-full flex items-center shadow-xs">
            {/* Scroll buttons for desktop/web */}
            <button 
              onClick={() => scrollDays('left')}
              className="tap-target absolute left-0 top-0 bottom-0 px-1.5 bg-gradient-to-r from-white via-white to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div 
              ref={dateBarRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="flex overflow-x-auto hide-scrollbar w-full scroll-smooth select-none cursor-grab active:cursor-grabbing px-5 h-9 sm:h-10"
            >
              {dynamicDates.map((d) => {
                const isAll = d.date === 'ALL';
                const displayDate = isAll ? 'ALL' : d.date.slice(5).replace('.', '/');
                return (
                  <button 
                    key={d.id} 
                    data-active={selectedDate === d.date}
                    onClick={() => { 
                      if (!hasMovedRef.current) {
                        setSelectedDate(d.date); 
                        setExpandedItemId(null); 
                        if (isCinematicMode && cinematicItems.length > 0) {
                          if (d.date === 'ALL') {
                            setCinematicIndex(0);
                          } else {
                            const foundIdx = cinematicItems.findIndex(i => i.dateKey === d.date);
                            if (foundIdx !== -1) {
                              setCinematicIndex(foundIdx);
                            }
                          }
                        }
                        if (tabContentRef.current) {
                          tabContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
                        }
                      }
                    }} 
                    className={`flex-1 min-w-[58px] sm:min-w-[72px] md:min-w-[85px] h-full px-3 flex items-center justify-center border-r border-black/15 dark:border-white/15 last:border-r-0 transition-all whitespace-nowrap cursor-pointer font-['Inter',sans-serif] ${
                      selectedDate === d.date 
                        ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold shadow-xs' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white font-extrabold'
                    }`}
                  >
                    <span className="text-xs sm:text-[13px] font-extrabold tracking-tight font-['Inter',sans-serif]">
                      {displayDate}
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => scrollDays('right')}
              className="tap-target absolute right-0 top-0 bottom-0 px-1.5 bg-gradient-to-l from-white via-white to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!isLoggedIn && (
            <div
              className="px-4 py-1 text-micro font-mono uppercase font-bold tracking-widest text-black/60 dark:text-white/60 flex items-center justify-center gap-1.5 shrink-0 w-full border-b border-black/10 dark:border-white/10"
              title="로그인 후 기록을 수정하거나 새 일정을 추가할 수 있습니다."
            >
              <Lock className="w-3 h-3 shrink-0" /> Read only
            </div>
          )}

          {/* Today mode: what is next, and how long until it starts */}
          {live && (
            <div className="tgl-rise flex items-center gap-3 px-4 md:px-6 py-2.5 border-b border-black/15 dark:border-white/15 shrink-0 w-full">
              <span className="flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-widest text-red-600 dark:text-red-500 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-live-pulse" />
                Today · Day {todayMode.dayIndex}
              </span>
              <span className="flex-1 min-w-0 text-sm truncate">
                {todayMode.next ? (
                  <>
                    <span className="text-black/60 dark:text-white/60">다음 </span>
                    <button
                      type="button"
                      onClick={() => {
                        const id = todayMode.next!.id;
                        setExpandedItemId(id);
                        itemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="font-bold hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                    >
                      {todayMode.next.place || '다음 일정'}
                    </button>
                    <span className="font-mono text-meta text-black/70 dark:text-white/70 tabular-nums"> · {formatCountdown(todayMode.minutesToNext ?? 0)}</span>
                  </>
                ) : (
                  <span className="text-black/60 dark:text-white/60">{todayMode.lastPassedId !== null ? '오늘 일정을 모두 지났습니다.' : '오늘은 시간이 정해진 일정이 없습니다.'}</span>
                )}
              </span>
              <span className="font-mono text-meta font-bold tabular-nums shrink-0" title={todayMode.offsetLabel ? '여행지 현지 시각' : undefined}>
                {todayMode.offsetLabel && <span className="font-normal text-black/55 dark:text-white/55">현지 </span>}
                {todayMode.nowLabel}
                {todayMode.offsetLabel && <span className="ml-1 font-normal text-black/55 dark:text-white/55">{todayMode.offsetLabel}</span>}
              </span>
            </div>
          )}

          {/* Timeline Items List */}
          <div className="flex flex-col pb-20 w-full relative">
            {selectedDate === 'ALL' && currentTimeline.length > 0 && (
              <div className="flex justify-end px-4 md:px-6 py-2 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 shrink-0 select-none">
                <button
                  onClick={() => {
                    if (collapsedDays.length === allTripDates.length) {
                      setCollapsedDays([]);
                    } else {
                      setCollapsedDays([...allTripDates]);
                    }
                  }}
                  className="text-micro md:text-meta font-extrabold uppercase tracking-widest text-black/60 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {collapsedDays.length === allTripDates.length ? '▼ EXPAND ALL DAYS' : '▲ COLLAPSE ALL DAYS'}
                </button>
              </div>
            )}
            {isEditing && (
              <div className="flex flex-col shrink-0 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 relative">
                <div className="flex justify-between items-center py-3 px-4 md:px-6 flex-wrap gap-2">
                  <button
                    onClick={handleGenerateDefaultTemplate}
                    className="text-meta font-extrabold uppercase tracking-widest border border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 transition-colors flex items-center gap-1.5"
                  >
                    Generate Default Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItemIds.length === currentTimeline.length) {
                        setSelectedItemIds([]);
                      } else {
                        setSelectedItemIds(currentTimeline.map(item => item.id));
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    {selectedItemIds.length === currentTimeline.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {selectedItemIds.length > 0 && (
                  <div className="sticky top-0 z-20 flex justify-between items-center py-3 px-4 md:px-6 bg-red-600 text-white shadow-md transition-all animate-in slide-in-from-top duration-300">
                    <div className="text-xs font-bold uppercase tracking-widest">
                      {selectedItemIds.length} items selected
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-meta font-bold uppercase tracking-widest opacity-80">Move to:</span>
                      <select
                        onChange={(e) => {
                          const targetDate = e.target.value;
                          if (!targetDate) return;

                          setDraftTimeline(prev => 
                            prev.map(item => {
                              if (selectedItemIds.includes(item.id)) {
                                return { ...item, date: targetDate };
                              }
                              return item;
                            })
                          );

                          setSelectedItemIds([]);
                          setSelectedDate(targetDate);
                        }}
                        className="bg-white text-black text-meta font-bold p-1 outline-none border border-white/20 rounded-none w-28"
                        defaultValue=""
                      >
                        <option value="" disabled>Select Day</option>
                        {allTripDates.map((d, index) => (
                          <option key={d} value={d}>Day {index + 1} ({d.slice(5).replace('.', '/')})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSelectedItemIds([])}
                        className="text-meta font-bold uppercase tracking-widest hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentTimeline.length === 0 ? (
              <div className="text-center py-16 text-black/60 dark:text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase">
                해당 날짜에 등록된 일정이 없습니다.
              </div>
            ) : (
              currentTimeline.map((item, idx) => {
                const isActive = expandedItemId === item.id;
                const showDivider = (selectedDate === 'ALL' && (idx === 0 || currentTimeline[idx - 1].date !== item.date)) || (selectedDate !== 'ALL' && idx === 0);
                const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
                const isExcluded = !!item.excludeFromMap;
                const dayColor = dayIndex > 0 ? dayColors[(dayIndex - 1) % dayColors.length] : undefined;
                const weatherInfo = tripToUse?.weatherData?.[item.date || ''];
                return (
                  <div key={item.id} className="w-full flex flex-col">
                    {showDivider && (
                      <div 
                        id={`date-section-${item.date}`}
                        data-date-section={item.date}
                        onClick={() => {
                          const dVal = item.date || '';
                          if (collapsedDays.includes(dVal)) {
                            setCollapsedDays(prev => prev.filter(d => d !== dVal));
                          } else {
                            setCollapsedDays(prev => [...prev, dVal]);
                          }
                        }}
                        className={`bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-xs py-3.5 px-4 md:px-6 border-b border-t border-black/15 dark:border-white/15 flex items-center justify-between cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors select-none ${
                          highlightedDateSection === item.date ? 'day-section-highlight' : 'tgl-reveal'
                        }`}
                      >
                        <div className="flex items-baseline gap-2.5 sm:gap-3.5">
                          <span className="text-3xl sm:text-4xl font-extrabold font-satoshi tracking-tighter text-black dark:text-white leading-none">
                            {dayIndex < 10 ? `0${dayIndex}` : dayIndex}
                          </span>
                          <div className="flex flex-col text-left font-satoshi leading-tight">
                            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-black dark:text-white font-satoshi">
                              DAY {dayIndex}
                            </span>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-black/65 dark:text-white/65 mt-0.5 tracking-wider">
                              {item.date} {getDayOfWeek(item.date || '') ? `· ${getDayOfWeek(item.date || '')}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                              {/* Sunny */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'sunny', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'sunny' ? 'bg-orange-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Sunny (해)"
                              >
                                <Sun className="w-4 h-4" />
                              </button>
                              {/* Overcast */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'overcast', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'overcast' ? 'bg-slate-400 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Overcast (흐림)"
                              >
                                <Cloudy className="w-4 h-4" />
                              </button>
                              {/* Cloudy */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'cloudy', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'cloudy' ? 'bg-neutral-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Cloudy (구름)"
                              >
                                <Cloud className="w-4 h-4" />
                              </button>
                              {/* Rainy */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'rainy', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'rainy' ? 'bg-blue-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Rainy (비)"
                              >
                                <CloudRain className="w-4 h-4" />
                              </button>
                              {/* Snowy */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'snowy', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'snowy' ? 'bg-blue-300 text-black' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Snowy (눈)"
                              >
                                <Snowflake className="w-4 h-4" />
                              </button>
                              {/* Stormy */}
                              <button
                                type="button"
                                onClick={() => handleWeatherChange(item.date || '', 'stormy', weatherInfo?.temp || '')}
                                className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'stormy' ? 'bg-red-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Stormy (태풍)"
                              >
                                <CloudLightning className="w-4 h-4" />
                              </button>
                              {weatherInfo?.type && (
                                <button
                                  type="button"
                                  onClick={() => handleWeatherChange(item.date || '', '', '')}
                                  className="text-meta font-bold text-red-500 dark:text-red-400 hover:underline px-1 font-mono"
                                >
                                  CLEAR
                                </button>
                              )}
                              {(() => {
                                const parseMinMaxTemp = (tempStr: string) => {
                                  if (!tempStr) return { min: '', max: '' };
                                  const parts = tempStr.split('/');
                                  if (parts.length === 2) {
                                    const minVal = parts[0].replace(/[^0-9-]/g, '');
                                    const maxVal = parts[1].replace(/[^0-9-]/g, '');
                                    return { min: minVal, max: maxVal };
                                  }
                                  const cleanVal = tempStr.replace(/[^0-9-]/g, '');
                                  if (tempStr.startsWith('/')) {
                                    return { min: '', max: cleanVal };
                                  }
                                  return { min: cleanVal, max: '' };
                                };
                                const { min, max } = parseMinMaxTemp(weatherInfo?.temp || '');
                                return (
                                  <div className="flex items-center gap-1 ml-1.5 font-mono">
                                    <input
                                      type="number"
                                      placeholder="Min"
                                      value={min}
                                      onChange={(e) => {
                                        const minNum = e.target.value;
                                        const newTemp = (minNum || max) ? `${minNum ? minNum + '°' : ''}/${max ? max + '°' : ''}` : '';
                                        handleWeatherChange(item.date || '', weatherInfo?.type || '', newTemp);
                                      }}
                                      className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-meta text-center font-bold outline-none text-black dark:text-white rounded-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-meta text-black/60 dark:text-white/60 font-bold">/</span>
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={max}
                                      onChange={(e) => {
                                        const maxNum = e.target.value;
                                        const newTemp = (min || maxNum) ? `${min ? min + '°' : ''}/${maxNum ? maxNum + '°' : ''}` : '';
                                        handleWeatherChange(item.date || '', weatherInfo?.type || '', newTemp);
                                      }}
                                      className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-meta text-center font-bold outline-none text-black dark:text-white rounded-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            weatherInfo && (weatherInfo.type || weatherInfo.temp) && (
                              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-black/85 dark:text-white/85 normal-case ml-2">
                                {weatherInfo.type === 'sunny' && <Sun className="w-4 h-4 text-amber-500 shrink-0" />}
                                {weatherInfo.type === 'overcast' && <Cloudy className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />}
                                {weatherInfo.type === 'cloudy' && <Cloud className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />}
                                {weatherInfo.type === 'rainy' && <CloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />}
                                {weatherInfo.type === 'snowy' && <Snowflake className="w-4 h-4 text-blue-300 shrink-0" />}
                                {weatherInfo.type === 'stormy' && <CloudLightning className="w-4 h-4 text-red-500 shrink-0" />}
                                {weatherInfo.temp && <span className="text-black/80 dark:text-white/80">{weatherInfo.temp}</span>}
                              </div>
                            )
                          )}
                        </div>
                        <span className="text-meta font-extrabold font-mono text-black/60 dark:text-white/60 flex items-center gap-1 shrink-0">
                          {collapsedDays.includes(item.date || '') ? '▼ EXPAND' : '▲ COLLAPSE'}
                        </span>
                      </div>
                    )}
                    {nowBeforeId === item.id && <NowLine label={todayMode.nowLabel} />}
                    <div 
                      id={`timeline-item-${item.id}`}
                      ref={el => { itemRefs.current[item.id] = el; }} 
                      className={`flex flex-col transition-colors w-full border-b border-black/15 dark:border-white/15 ${
                        isActive 
                          ? 'bg-black/[0.06] dark:bg-white/[0.09] ring-1 ring-inset ring-black/25 dark:ring-white/30 border-b-black/30 dark:border-b-white/30 shadow-xs' 
                          : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]'
                      } ${collapsedDays.includes(item.date || '') && selectedDate === 'ALL' ? 'hidden' : ''} ${live && todayMode.pastIds.has(item.id) && !isActive ? 'opacity-60' : ''}`}
                      draggable={isEditing}
                      onDragStart={(e) => {
                        const target = e.target as HTMLElement;
                        // GripVertical 아이콘이 위치한 drag-handle 내부에서 드래그를 시작한 경우에만 드래그 허용
                        if (!target.closest('.drag-handle')) {
                          e.preventDefault();
                          return;
                        }
                        setDraggedItemId(item.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropTimelineItem(item.id)}
                    >
                      <div 
                        className="group flex flex-row items-stretch hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors cursor-pointer relative w-full" 
                        onClick={() => {
                          if (expandedItemId !== item.id) {
                            setExpandedItemId(item.id);
                            if (cinematicItems.length > 0) {
                              const targetIdx = cinematicItems.findIndex(i => i.id === item.id);
                              if (targetIdx !== -1) {
                                setCinematicIndex(targetIdx);
                              }
                            }
                          } else if (!isEditing) {
                            setExpandedItemId(null);
                          }
                        }}
                        onFocusCapture={() => {
                          if (isEditing && expandedItemId !== item.id) {
                            setExpandedItemId(item.id);
                          }
                        }}
                      >
                        <div className="flex-1 flex flex-row items-start py-4 px-4 md:py-5 md:px-6 min-w-0">
                        {/* Left Column: Fixed Width in BOTH view and edit mode (w-24 sm:w-28 md:w-32 shrink-0 pr-2.5) */}
                        {isEditing ? (
                          <div className="w-24 sm:w-28 md:w-32 shrink-0 pr-2.5 flex flex-col gap-1.5 text-meta md:text-xs font-bold">
                            {/* Compact action row: Grip, Checkbox, Trash (Swiss Minimal) */}
                            <div className="flex items-center justify-between w-full py-1 px-1.5 bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15">
                              <div className="drag-handle cursor-grab active:cursor-grabbing text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white p-0.5" title="순서 이동">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedItemIds.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItemIds(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 border-black/20 text-red-600 cursor-pointer accent-red-600 rounded-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteTimelineItem(item.id)}
                                className="tap-target text-red-500 hover:text-red-700 p-0.5 transition-colors cursor-pointer"
                                title="일정 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <input
                              type="time"
                              value={timeStrTo24h(item.time)}
                              onChange={(e) => {
                                const val24h = e.target.value;
                                if (!val24h) return;
                                scrollTargetItemIdRef.current = item.id;
                                updateTimelineItem(item.id, 'time', time24hTo12h(val24h));
                              }}
                              className="bg-black/5 dark:bg-white/10 px-1 py-1 outline-none font-mono font-bold text-meta md:text-xs text-black dark:text-white border border-black/15 dark:border-white/15 w-full text-center rounded-none"
                            />

                            <select
                              value={item.date}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                scrollTargetItemIdRef.current = item.id;
                                updateTimelineItem(item.id, 'date', newDate);
                                setSelectedDate(newDate);
                              }}
                              className="bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/15 text-micro md:text-meta font-mono font-bold p-1 outline-none text-black dark:text-white w-full text-center rounded-none cursor-pointer"
                            >
                              {allTripDates.map(d => (
                                <option key={d} value={d}>{d.slice(5).replace('.', '/')}</option>
                              ))}
                            </select>

                            {/* Vehicle type selection: 4종 아이콘 토글 그리드 (기본 해제 = 도보) */}
                            <div className="grid grid-cols-4 gap-1 w-full py-0.5">
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'car' ? null : 'car')}
                                className={`tap-target py-1 flex items-center justify-center border transition-colors cursor-pointer rounded-xs ${
                                  item.vehicleType === 'car'
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'car' ? "차량 선택 해제 (기본 도보)" : "차량으로 이동"}
                              >
                                <Car className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'train' ? null : 'train')}
                                className={`tap-target py-1 flex items-center justify-center border transition-colors cursor-pointer rounded-xs ${
                                  item.vehicleType === 'train'
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'train' ? "열차 선택 해제 (기본 도보)" : "열차로 이동"}
                              >
                                <Train className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'ship' ? null : 'ship')}
                                className={`tap-target py-1 flex items-center justify-center border transition-colors cursor-pointer rounded-xs ${
                                  item.vehicleType === 'ship'
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'ship' ? "선박 선택 해제 (기본 도보)" : "선박으로 이동"}
                              >
                                <Ship className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'flight' ? null : 'flight')}
                                className={`tap-target py-1 flex items-center justify-center border transition-colors cursor-pointer rounded-xs ${
                                  item.vehicleType === 'flight'
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'flight' ? "항공 선택 해제 (기본 도보)" : "항공으로 이동"}
                              >
                                <Plane className="w-3 h-3" />
                              </button>
                            </div>

                            {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                              <button
                                onClick={() => handleToggleExcludeFromMap(item)}
                                className={`flex items-center justify-center py-1 border border-black/15 dark:border-white/15 text-meta font-mono font-bold w-full transition-colors rounded-none cursor-pointer ${
                                  isExcluded
                                    ? 'text-black/60 dark:text-white/60'
                                    : 'hover:opacity-80'
                                }`}
                                style={!isExcluded && dayColor ? { color: dayColor, borderColor: dayColor } : undefined}
                                title={isExcluded ? "지도에 표시하기" : "지도에서 제외하기"}
                              >
                                {isExcluded ? <MapPinOff className="w-3 h-3 mr-0.5" /> : <MapPin className="w-3 h-3 mr-0.5" style={dayColor ? { color: dayColor } : undefined} />}
                                <span>{isExcluded ? "OFF" : "ON"}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="w-24 sm:w-28 md:w-32 shrink-0 pr-2.5 flex flex-col tracking-tight mt-0.5 transition-colors text-black dark:text-white">
                            <div>
                              {(() => {
                                const match = (item.time || '').match(/^(\d{1,2}:\d{2})\s*(AM|PM)?$/i);
                                if (match) {
                                  return (
                                    <div className="flex items-baseline gap-1 leading-none">
                                      <span className="text-base sm:text-lg md:text-xl font-extrabold font-satoshi tracking-tight leading-none text-black dark:text-white">
                                        {match[1]}
                                      </span>
                                      {match[2] && (
                                        <span className="text-micro sm:text-micro font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60">
                                          {match[2].toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <span className="text-base sm:text-lg md:text-xl font-extrabold font-satoshi tracking-tight leading-none text-black dark:text-white">
                                    {item.time}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 h-6">
                              {/* Vehicle indicator in view mode */}
                              {item.vehicleType === 'car' && (
                                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-micro font-mono font-bold text-black/70 dark:text-white/70" title="다음 스팟까지 차량 이동">
                                  <Car className="w-3 h-3" />
                                </span>
                              )}
                              {item.vehicleType === 'train' && (
                                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-micro font-mono font-bold text-black/70 dark:text-white/70" title="다음 스팟까지 열차 이동">
                                  <Train className="w-3 h-3" />
                                </span>
                              )}
                              {item.vehicleType === 'ship' && (
                                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-micro font-mono font-bold text-black/70 dark:text-white/70" title="다음 스팟까지 선박 이동">
                                  <Ship className="w-3 h-3" />
                                </span>
                              )}
                              {item.vehicleType === 'flight' && (
                                <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-micro font-mono font-bold text-black/70 dark:text-white/70" title="다음 스팟까지 항공 이동">
                                  <Plane className="w-3 h-3" />
                                </span>
                              )}

                              {/* 장소 좌표가 있는 경우: 지도 표시 토글 핀 아이콘 */}
                              {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleExcludeFromMap(item);
                                  }}
                                  className="p-1 hover:text-red-600 dark:hover:text-red-400 transition-colors select-none cursor-pointer shrink-0"
                                  title={isExcluded ? "지도에 표시하기 (현재 OFF)" : "지도에서 제외하기 (현재 ON)"}
                                >
                                  {isExcluded ? (
                                    <MapPinOff className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                                  ) : (
                                    <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex-grow pr-2 md:pr-4 min-w-0 overflow-hidden flex flex-col gap-1.5">
                          {/* 1. Title (제목) & Coin Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`font-bold text-sm md:text-base flex-1 min-w-0 flex items-center gap-2 ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {isEditing ? (
                                <TimelineItemPlaceInput
                                  itemId={item.id}
                                  initialValue={item.place}
                                  onUpdatePlace={(id, val) => updateTimelineItem(id, 'place', val)}
                                  frequentPlaces={frequentPlaces}
                                  onSelectFrequent={handleSelectFrequent}
                                  toggleFrequentPlace={toggleFrequentPlace}
                                  isFrequent={isFrequent}
                                  item={item}
                                />
                              ) : (
                                <h3 className="break-keep font-sans font-bold text-sm sm:text-base text-black dark:text-white leading-snug tracking-normal">
                                  {item.place || (item as any).title}
                                </h3>
                              )}
                            </div>

                            {/* Coin icon button in view mode if cost exists */}
                            {!isEditing && item.cost && item.cost !== '-' && item.cost.trim() !== '' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCostModalItem(item);
                                }}
                                className="tap-target p-1 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-110 transition-transform cursor-pointer shrink-0"
                                title={`비용 확인: ${item.currency || 'KRW'} ${item.cost}`}
                              >
                                <Coins className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* 2. Place Input in Edit mode (Replaced subtitle memo with Place Autocomplete Input) */}
                          {isEditing ? (
                            <div className="w-full flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <PlaceAutocompleteInput
                                  value={item.location || ''}
                                  onChange={(val) => updateTimelineItemFields(item.id, { location: val, lat: undefined, lng: undefined })}
                                  onBlur={async () => {
                                    setTimeout(async () => {
                                      const latestTimeline = draftTimelineRef.current;
                                      const currentItem = latestTimeline.find((t: any) => t.id === item.id);
                                      if (!currentItem) return;
                                      if (
                                        currentItem.location &&
                                        currentItem.location.trim() !== '' &&
                                        (currentItem.lat === undefined || currentItem.lat === null || currentItem.lng === undefined || currentItem.lng === null)
                                      ) {
                                        const coords = await fetchCoordinates(currentItem.location);
                                        if (coords) {
                                          updateTimelineItemFields(currentItem.id, {
                                            lat: coords.lat,
                                            lng: coords.lng,
                                          });
                                        }
                                      }
                                    }, 300);
                                  }}
                                  onSelectPlace={(name, coords, address) => {
                                    updateTimelineItemFields(item.id, {
                                      location: name || address,
                                      lat: coords?.lat ?? item.lat,
                                      lng: coords?.lng ?? item.lng,
                                    });
                                  }}
                                  className="bg-black/5 dark:bg-white/10 px-2 py-1 outline-none text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                  placeholder="장소 입력"
                                />
                              </div>

                              {/* Direct Cost Input in Edit Mode (No accordion needed) */}
                              <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                <SettlementExpenseInput
                                  cost={item.cost}
                                  currency={item.currency}
                                  paidBy={item.paidBy}
                                  members={tripToUse?.members || []}
                                  isEditMode={isEditing}
                                  vertical={false}
                                  onUpdate={(updates) => {
                                    if (updates.cost !== undefined) updateTimelineItem(item.id, 'cost', updates.cost);
                                    if (updates.currency !== undefined) updateTimelineItem(item.id, 'currency', updates.currency);
                                    if (updates.paidBy !== undefined) updateTimelineItem(item.id, 'paidBy', updates.paidBy);
                                  }}
                                  defaultCurrency={defaultCurrency}
                                />
                              </div>
                            </div>
                          ) : (
                            /* View Mode: Location text, One-Touch Copy & Google Maps link */
                            item.location && item.location.trim() !== '' && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-sans text-black/65 dark:text-white/65">
                                <MapPin className="w-3.5 h-3.5 text-red-500/70 dark:text-red-400/70 shrink-0" />
                                <span className="truncate max-w-[170px] sm:max-w-md font-medium text-black/75 dark:text-white/75">
                                  {item.location}
                                </span>
                                {/* One-Touch Copy Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const textToCopy = item.location || item.place || '';
                                    if (textToCopy) {
                                      navigator.clipboard.writeText(textToCopy);
                                      setCopiedSpotId(item.id);
                                      setTimeout(() => setCopiedSpotId(null), 1500);
                                    }
                                  }}
                                  className="p-1 -m-1 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/5"
                                  title="주소/장소명 복사"
                                  aria-label="주소 복사"
                                >
                                  {copiedSpotId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || '')}`;
                                    setMapConfirm({ placeName: item.location || '', url });
                                  }}
                                  className="tap-target p-1 -m-1 text-black/60 hover:text-red-600 dark:text-white/60 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/5"
                                  title="구글 지도에서 위치 확인 (새 창)"
                                  aria-label="구글 지도 열기"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          )}

                          {/* Actions (Edit mode) - Swiss Minimal Icon & ADD Buttons */}
                          {isEditing && isActive && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-sm flex" 
                                title="위로 일정 추가"
                                onClick={() => handleAddTimelineItemRelativeTo(item.id, 'above')}
                              >
                                <ArrowUp className="w-3 h-3"/>
                                <span>ADD</span>
                              </button>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-sm flex" 
                                title="아래로 일정 추가"
                                onClick={() => handleAddTimelineItemRelativeTo(item.id, 'below')}
                              >
                                <ArrowDown className="w-3 h-3"/>
                                <span>ADD</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                        {/* Right Column: Full-Height 1:1 Edge-to-Edge Square Grid Thumbnail */}
                        {item.img ? (
                          <div 
                            className={`w-24 sm:w-28 md:w-32 aspect-square self-stretch shrink-0 overflow-hidden border-l transition-all relative rounded-none ${isActive ? 'border-l-black/30 dark:border-l-white/30' : 'border-black/15 dark:border-white/15'}`}
                            onClick={(e) => {
                              if (!isEditing) {
                                e.stopPropagation();
                                setActiveTab('gallery');
                                setExpandedItemId(600000000 + item.id);
                                setTimeout(() => {
                                  const el = itemRefs.current[600000000 + item.id];
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }, 300);
                              }
                            }}
                          >
                            <img src={getEffectiveImageUrl(item.img)} alt={item.place} className={`w-full h-full object-cover transition-all duration-300 ${isActive ? 'grayscale-0 scale-105' : 'grayscale group-hover:grayscale-0 group-hover:scale-105'}`} />
                            <ImageEditOverlay 
                              isEditMode={isEditing} 
                              hasImage={true}
                              onImageRemoved={() => {
                                updateTimelineItemFields(item.id, { img: '' });
                              }}
                              onImageUploaded={async (url, gps) => {
                                if (gps) {
                                  let addr = '';
                                  try {
                                    addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                  } catch (e) {
                                    console.warn(e);
                                  }
                                  updateTimelineItemFields(item.id, { 
                                    img: url, 
                                    lat: gps.lat, 
                                    lng: gps.lng,
                                    location: addr || item.location,
                                    place: addr ? addr.split(',')[0].trim() : item.place
                                  });
                                } else {
                                  updateTimelineItemFields(item.id, { img: url });
                                }
                              }} 
                            />
                          </div>
                        ) : isEditing ? (
                          <div className={`w-24 sm:w-28 md:w-32 aspect-square self-stretch shrink-0 border-l bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center transition-colors relative rounded-none ${isActive ? 'border-red-600 dark:border-red-400 text-red-600' : 'border-black/15 dark:border-white/15'}`}>
                            <ImageIcon className="w-5 h-5 text-black/60 dark:text-white/60" />
                            <ImageEditOverlay 
                              isEditMode={isEditing} 
                              hasImage={false}
                              onImageUploaded={async (url, gps) => {
                                if (gps) {
                                  let addr = '';
                                  try {
                                    addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                  } catch (e) {
                                    console.warn(e);
                                  }
                                  updateTimelineItemFields(item.id, { 
                                    img: url, 
                                    lat: gps.lat, 
                                    lng: gps.lng,
                                    location: addr || item.location,
                                    place: addr ? addr.split(',')[0].trim() : item.place
                                  });
                                } else {
                                  updateTimelineItemFields(item.id, { img: url });
                                }
                              }} 
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {nowAfterId === item.id && <NowLine label={todayMode.nowLabel} />}

                    {/* Swiss Minimal GAP FILL Bar (Between items of the same date) */}
                    {(() => {
                      const nextItem = currentTimeline[idx + 1];
                      if (!nextItem || nextItem.date !== item.date) return null;
                      if (collapsedDays.includes(item.date || '') && selectedDate === 'ALL') return null;

                      const curMin = parseTimeToMinutes(item.time);
                      const nextMin = parseTimeToMinutes(nextItem.time);
                      const diffMin = nextMin - curMin;

                      if (diffMin < 150) return null; // 2.5시간 이상 빈틈

                      const gapHours = (diffMin / 60).toFixed(1).replace(/\.0$/, '');
                      const midMin = Math.round(curMin + diffMin / 2);
                      const midTimeStr = minutesToTimeStr(midMin);

                      return (
                        <div className="w-full px-4 md:px-6 py-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setIsPocketWidgetOpen(true)}
                            className="btn btn-secondary w-full flex group"
                            title={`${gapHours}시간의 빈틈이 있습니다. 포켓 위젯을 열어 스팟을 채워보세요.`}
                          >
                            <Plus className="w-3 h-3 group-hover:scale-110 transition-transform text-red-500 shrink-0" />
                            <span>GAP FILL ({gapHours}h)</span>
                            <span className="text-micro opacity-70 font-normal">· {midTimeStr}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}

            {/* Add Timeline item button */}
            {isEditing && (
              <div className="p-6 flex justify-center w-full">
                <button 
                  onClick={() => handleAddTimelineItem(selectedDate === 'ALL' ? allTripDates[0] || '2025.04.12' : selectedDate)}
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-4 h-4" /> Add Timeline Event
                </button>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </>
  );
}
