import {
  Plane, Ship, Train, Car, Lock, Trash2, Image as ImageIcon, MapPin, Plus, ExternalLink, MapPinOff,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Sun, Cloud, Cloudy, CloudRain, Snowflake,
  CloudLightning, GripVertical, Check, Coins, Copy, ChevronDown, ChevronsDownUp, ChevronsUpDown, MoreHorizontal
} from 'lucide-react';
import { ImageEditOverlay } from '../../components/ImageEditOverlay';
import { IconButton } from '../../components/ui/IconButton';
import { SettlementExpenseInput } from '../../components/SettlementExpenseInput';
import { fetchCoordinates } from '../../utils/googleMapsHelper';
import { fetchAddressFromCoords } from '../../utils/googleMapsHelper';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { TimelineItemPlaceInput } from './TimelineItemPlaceInput';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import {
  getDayOfWeek, minutesToTimeStr, parseTimeToMinutes, timeStrTo24h, time24hTo12h
} from './detailUtils';
import type { JourneyDetailState } from './useJourneyDetailState';
import { formatCountdown } from './useTodayMode';
import { useState } from 'react';

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
  const [toolsOpen, setToolsOpen] = useState(false);
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
    handleAddTimelineItem, handleDeleteTimelineItem, handleWeatherChange, todayMode, handleStartEditing,
    setLightboxIndex, setIsLightboxOpen, galleryUrlIndexMap
  } = s;

  // Today mode shows on today's page and on ALL, never while editing
  const live = !!todayMode.todayKey && !isEditing && (selectedDate === todayMode.todayKey || selectedDate === 'ALL');
  const nowAfterId = live ? todayMode.lastPassedId : null;
  const nowBeforeId = live && nowAfterId === null ? todayMode.next?.id ?? null : null;

  // Items per day, and the trip days with nothing planned yet
  const dayCounts: Record<string, number> = {};
  currentTimeline.forEach(it => { if (it.date) dayCounts[it.date] = (dayCounts[it.date] || 0) + 1; });
  const emptyDays = selectedDate === 'ALL' ? allTripDates.filter(d => !dayCounts[d]) : [];
  const emptyDaysBetween = (after: string, before: string) => emptyDays.filter(d => d > after && (!before || d < before));
  const foldableDays = allTripDates.filter(d => dayCounts[d]);
  const allFolded = foldableDays.length > 0 && foldableDays.every(d => collapsedDays.includes(d));
  const toggleDay = (date: string) => setCollapsedDays(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  // An empty day takes its first item: from the view, editing starts on the spot
  const addToDay = (date: string) => {
    if (!isEditing) handleStartEditing();
    handleAddTimelineItem(date);
  };

  const renderDayHeader = (date: string, count: number) => {
    const dayIndex = allTripDates.indexOf(date) + 1;
    const weatherInfo = tripToUse?.weatherData?.[date];
    const foldable = selectedDate === 'ALL' && count > 0;
    const folded = foldable && collapsedDays.includes(date);
    return (
          <div 
            id={`date-section-${date}`}
            data-date-section={date}
            onClick={foldable ? () => toggleDay(date) : undefined}
            onKeyDown={foldable ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleDay(date); } } : undefined}
            role={foldable ? 'button' : undefined}
            tabIndex={foldable ? 0 : undefined}
            aria-expanded={foldable ? !folded : undefined}
            className={`bg-paper/95 dark:bg-paper-dark/95 py-3 px-4 md:px-6 mt-2 flex items-center justify-between gap-3 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 ${foldable ? 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : ''} ${
              highlightedDateSection === date ? 'day-section-highlight' : 'tgl-reveal'
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
                  {date} {getDayOfWeek(date) ? `· ${getDayOfWeek(date)}` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  {/* Sunny */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'sunny', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'sunny' ? 'bg-orange-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Sunny (해)"
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  {/* Overcast */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'overcast', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'overcast' ? 'bg-slate-400 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Overcast (흐림)"
                  >
                    <Cloudy className="w-4 h-4" />
                  </button>
                  {/* Cloudy */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'cloudy', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'cloudy' ? 'bg-neutral-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Cloudy (구름)"
                  >
                    <Cloud className="w-4 h-4" />
                  </button>
                  {/* Rainy */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'rainy', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'rainy' ? 'bg-blue-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Rainy (비)"
                  >
                    <CloudRain className="w-4 h-4" />
                  </button>
                  {/* Snowy */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'snowy', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'snowy' ? 'bg-blue-300 text-black' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Snowy (눈)"
                  >
                    <Snowflake className="w-4 h-4" />
                  </button>
                  {/* Stormy */}
                  <button
                    type="button"
                    onClick={() => handleWeatherChange(date, 'stormy', weatherInfo?.temp || '')}
                    className={`tap-target p-1 rounded-xs transition-colors ${weatherInfo?.type === 'stormy' ? 'bg-red-500 text-white' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title="Stormy (태풍)"
                  >
                    <CloudLightning className="w-4 h-4" />
                  </button>
                  {weatherInfo?.type && (
                    <button
                      type="button"
                      onClick={() => handleWeatherChange(date, '', '')}
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
                            handleWeatherChange(date, weatherInfo?.type || '', newTemp);
                          }}
                          className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-meta text-center font-bold outline-none text-black dark:text-white rounded-full [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
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
                            handleWeatherChange(date, weatherInfo?.type || '', newTemp);
                          }}
                          className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-meta text-center font-bold outline-none text-black dark:text-white rounded-full [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
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
            {foldable && (
              <span className="flex items-center gap-1.5 shrink-0 text-black/55 dark:text-white/55">
                {folded && <span className="font-mono text-micro font-bold tracking-wider tabular-nums">일정 {count}</span>}
                <ChevronDown className={`w-4 h-4 transition-transform duration-base ${folded ? '-rotate-90' : ''}`} aria-hidden />
              </span>
            )}
          </div>
    );
  };

  const renderEmptyDay = (date: string) => (
    <div key={`empty-${date}`} className="w-full flex flex-col">
      {renderDayHeader(date, 0)}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 pb-2">
        <span className="text-sm text-black/50 dark:text-white/50">일정 없음</span>
        {isLoggedIn && (
          <button type="button" onClick={() => addToDay(date)} className="btn btn-secondary btn-sm">
            <Plus className="w-3.5 h-3.5" aria-hidden />일정 추가
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={`h-auto flex flex-col w-full relative ${activeTab === 'timeline' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('timeline') && (
          <>
            {/* Day filter selector bar - Slim and Sticky */}
            <div className="sticky top-0 z-[35] bg-paper/95 dark:bg-paper-dark/95 transition-colors shrink-0 w-full flex items-center py-1.5">
            {/* Scroll buttons for desktop/web */}
            <button 
              onClick={() => scrollDays('left')}
              className="tap-target absolute left-0 top-0 bottom-0 px-1.5 bg-gradient-to-r from-paper via-paper to-transparent dark:from-paper-dark dark:via-paper-dark z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
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
                    className={`shrink-0 min-w-[58px] sm:min-w-[72px] h-9 px-3.5 mx-0.5 rounded-full flex items-center justify-center transition-colors whitespace-nowrap cursor-pointer font-['Inter',sans-serif] ${
                      selectedDate === d.date
                        ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                        : 'bg-surface dark:bg-surface-dark hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-black dark:text-white font-extrabold'
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
              className="tap-target absolute right-0 top-0 bottom-0 px-1.5 bg-gradient-to-l from-paper via-paper to-transparent dark:from-paper-dark dark:via-paper-dark z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
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
            <div className="tgl-rise flex items-center gap-3 mx-3 sm:mx-4 mt-3 mb-1 px-4 py-3 rounded-card bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach shrink-0">
              <span className="flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-widest text-red-600 dark:text-red-500 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-live-pulse" />
                Today · Day {todayMode.dayIndex}
              </span>
              <span className="flex-1 min-w-0 text-sm truncate">
                {todayMode.next ? (
                  <>
                    <span className="opacity-70">다음 </span>
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
                    <span className="font-mono text-meta opacity-80 tabular-nums"> · {formatCountdown(todayMode.minutesToNext ?? 0)}</span>
                  </>
                ) : (
                  <span className="opacity-70">{todayMode.lastPassedId !== null ? '오늘 일정을 모두 지났습니다.' : '오늘은 시간이 정해진 일정이 없습니다.'}</span>
                )}
              </span>
              <span className="font-mono text-meta font-bold tabular-nums shrink-0" title={todayMode.offsetLabel ? '여행지 현지 시각' : undefined}>
                {todayMode.offsetLabel && <span className="font-normal opacity-70">현지 </span>}
                {todayMode.nowLabel}
                {todayMode.offsetLabel && <span className="ml-1 font-normal opacity-70">{todayMode.offsetLabel}</span>}
              </span>
            </div>
          )}

          {/* Timeline Items List */}
          <div className="flex flex-col pb-20 w-full relative">
            {((selectedDate === 'ALL' && foldableDays.length > 0) || isEditing) && (
              <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-2 shrink-0 select-none">
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds(selectedItemIds.length === currentTimeline.length ? [] : currentTimeline.map(item => item.id))}
                      className="btn btn-secondary btn-sm"
                    >
                      {selectedItemIds.length === currentTimeline.length && currentTimeline.length > 0 ? '선택 해제' : '전체 선택'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {selectedDate === 'ALL' && foldableDays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCollapsedDays(allFolded ? [] : [...foldableDays])}
                      className="btn btn-ghost btn-sm"
                    >
                      {allFolded ? <ChevronsUpDown className="w-3.5 h-3.5" aria-hidden /> : <ChevronsDownUp className="w-3.5 h-3.5" aria-hidden />}
                      {allFolded ? '모두 펼치기' : '모두 접기'}
                    </button>
                  )}
                  {isEditing && (
                    <div className="relative">
                      <IconButton icon={MoreHorizontal} label="편집 도구 더보기" size="sm" onClick={() => setToolsOpen(o => !o)} aria-expanded={toolsOpen} />
                      {toolsOpen && (
                        <>
                          <button type="button" aria-label="닫기" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setToolsOpen(false)} />
                          <div role="menu" className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] p-1.5 rounded-card bg-surface dark:bg-surface-dark shadow-lg">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => { setToolsOpen(false); handleGenerateDefaultTemplate(); }}
                              className="w-full text-left px-3 h-10 rounded-full text-sm font-bold hover:bg-black/[0.05] dark:hover:bg-white/10 transition-colors"
                            >
                              기본 템플릿으로 채우기
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {isEditing && selectedItemIds.length > 0 && (
              <div className="flex flex-col shrink-0 relative">
                {(
                  <div className="sticky top-0 z-20 mx-3 sm:mx-4 mb-1 flex justify-between items-center gap-2 py-2 pl-4 pr-2 rounded-full bg-red-600 text-white shadow-md animate-in slide-in-from-top duration-300">
                    <div className="text-xs font-bold uppercase tracking-widest">
                      {selectedItemIds.length}개 선택
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-meta font-bold opacity-80">날짜 이동</span>
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
                        className="bg-white text-black text-meta font-bold h-8 px-2.5 outline-none rounded-full w-32 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>날짜 선택</option>
                        {allTripDates.map((d, index) => (
                          <option key={d} value={d}>Day {index + 1} ({d.slice(5).replace('.', '/')})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSelectedItemIds([])}
                        className="h-8 px-3 rounded-full text-meta font-bold hover:bg-white/15"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentTimeline.length === 0 ? (
              selectedDate === 'ALL' && emptyDays.length > 0 ? (
                emptyDays.map(renderEmptyDay)
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-sm text-black/55 dark:text-white/55">
                  해당 날짜에 등록된 일정이 없습니다.
                  {isLoggedIn && selectedDate !== 'ALL' && !isEditing && (
                    <button type="button" onClick={() => addToDay(selectedDate)} className="btn btn-secondary btn-sm">
                      <Plus className="w-3.5 h-3.5" aria-hidden />일정 추가
                    </button>
                  )}
                </div>
              )
            ) : (
              currentTimeline.map((item, idx) => {
                const isActive = expandedItemId === item.id;
                const showDivider = (selectedDate === 'ALL' && (idx === 0 || currentTimeline[idx - 1].date !== item.date)) || (selectedDate !== 'ALL' && idx === 0);
                const isExcluded = !!item.excludeFromMap;
                const hasCoords = item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null;
                const hasLocation = !!item.location && item.location.trim() !== '';
                const dayFolded = selectedDate === 'ALL' && collapsedDays.includes(item.date || '');
                const prevDate = idx > 0 ? currentTimeline[idx - 1].date || '' : '';
                return (
                  <div key={item.id} className="w-full flex flex-col">
                    {showDivider && selectedDate === 'ALL' && emptyDaysBetween(prevDate, item.date || '').map(renderEmptyDay)}
                    {showDivider && renderDayHeader(item.date || '', dayCounts[item.date || ''] || 0)}
                    {!dayFolded && nowBeforeId === item.id && <NowLine label={todayMode.nowLabel} />}
                    <div 
                      id={`timeline-item-${item.id}`}
                      ref={el => { itemRefs.current[item.id] = el; }} 
                      className={`tgl-cv-row tgl-card-edge flex flex-col transition-colors mx-3 sm:mx-4 my-1.5 w-auto rounded-card overflow-hidden ${
                        isActive
                          ? 'bg-selected dark:bg-selected-dark ring-[1.5px] ring-inset ring-black/40 dark:ring-white/70 shadow-sm'
                          : 'bg-surface dark:bg-surface-dark hover:bg-black/[0.015] dark:hover:bg-white/[0.03]'
                      } ${dayFolded ? 'hidden' : ''} ${live && todayMode.pastIds.has(item.id) && !isActive ? 'opacity-60' : ''} ${
                        // The next stop today: the one card with a red edge
                        live && !isActive && todayMode.next?.id === item.id ? 'ring-2 ring-inset ring-red-600 dark:ring-red-500' : ''
                      }`}
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
                            <div className="flex items-center justify-between w-full py-1 px-2 rounded-full bg-black/5 dark:bg-white/10">
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
                                className="w-3.5 h-3.5 cursor-pointer accent-red-600"
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
                              className="bg-surface dark:bg-surface-dark h-8 px-1 outline-none font-mono font-bold text-micro sm:text-meta tracking-tight text-black dark:text-white border border-black/15 dark:border-white/15 w-full text-center rounded-full [&::-webkit-calendar-picker-indicator]:hidden"
                            />

                            <select
                              value={item.date}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                scrollTargetItemIdRef.current = item.id;
                                updateTimelineItem(item.id, 'date', newDate);
                                setSelectedDate(newDate);
                              }}
                              className="bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 text-micro md:text-meta font-mono font-bold h-8 px-2 outline-none text-black dark:text-white w-full text-center rounded-full cursor-pointer"
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
                                className={`tap-target h-7 flex items-center justify-center border transition-colors cursor-pointer rounded-full ${
                                  item.vehicleType === 'car'
                                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'car' ? "차량 선택 해제 (기본 도보)" : "차량으로 이동"}
                              >
                                <Car className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'train' ? null : 'train')}
                                className={`tap-target h-7 flex items-center justify-center border transition-colors cursor-pointer rounded-full ${
                                  item.vehicleType === 'train'
                                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'train' ? "열차 선택 해제 (기본 도보)" : "열차로 이동"}
                              >
                                <Train className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'ship' ? null : 'ship')}
                                className={`tap-target h-7 flex items-center justify-center border transition-colors cursor-pointer rounded-full ${
                                  item.vehicleType === 'ship'
                                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'ship' ? "선박 선택 해제 (기본 도보)" : "선박으로 이동"}
                              >
                                <Ship className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTimelineItem(item.id, 'vehicleType', item.vehicleType === 'flight' ? null : 'flight')}
                                className={`tap-target h-7 flex items-center justify-center border transition-colors cursor-pointer rounded-full ${
                                  item.vehicleType === 'flight'
                                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                                    : 'bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
                                }`}
                                title={item.vehicleType === 'flight' ? "항공 선택 해제 (기본 도보)" : "항공으로 이동"}
                              >
                                <Plane className="w-3 h-3" />
                              </button>
                            </div>

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
                            {item.vehicleType && <div className="flex items-center gap-1.5 mt-1.5 h-6">
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

                            </div>}
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
                                {hasCoords ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggleExcludeFromMap(item); }}
                                    className="tap-target p-1 -m-1 rounded-full shrink-0 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                    aria-pressed={!isExcluded}
                                    aria-label={isExcluded ? '지도에 표시' : '지도에서 숨기기'}
                                    title={isExcluded ? '지도에 표시 (지금 숨김)' : '지도에서 숨기기 (지금 표시)'}
                                  >
                                    {isExcluded ? <MapPinOff className="w-3.5 h-3.5 text-black/45 dark:text-white/45" /> : <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                                  </button>
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 text-black/35 dark:text-white/35 shrink-0" aria-hidden />
                                )}
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
                                  className="bg-surface dark:bg-surface-dark h-8 px-3 outline-none text-xs text-black dark:text-white rounded-full border border-black/15 dark:border-white/15 w-full"
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
                            (hasLocation || hasCoords) && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-sans text-black/65 dark:text-white/65">
                                {hasCoords ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggleExcludeFromMap(item); }}
                                    className="tap-target p-1 -m-1 rounded-full shrink-0 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                    aria-pressed={!isExcluded}
                                    aria-label={isExcluded ? '지도에 표시' : '지도에서 숨기기'}
                                    title={isExcluded ? '지도에 표시 (지금 숨김)' : '지도에서 숨기기 (지금 표시)'}
                                  >
                                    {isExcluded ? <MapPinOff className="w-3.5 h-3.5 text-black/45 dark:text-white/45" /> : <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                                  </button>
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 text-black/35 dark:text-white/35 shrink-0" aria-hidden />
                                )}
                                <span className={`truncate max-w-[170px] sm:max-w-md font-medium ${hasLocation ? 'text-black/75 dark:text-white/75' : 'text-black/45 dark:text-white/45'}`}>
                                  {hasLocation ? item.location : '지도 위치'}
                                </span>
                                {hasLocation && (<>
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
                                </>)}
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
                                <ArrowUp className="w-3 h-3" aria-hidden />
                                <span>위에 추가</span>
                              </button>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-sm flex" 
                                title="아래로 일정 추가"
                                onClick={() => handleAddTimelineItemRelativeTo(item.id, 'below')}
                              >
                                <ArrowDown className="w-3 h-3" aria-hidden />
                                <span>아래에 추가</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                        {/* Right Column: Full-Height 1:1 Edge-to-Edge Square Grid Thumbnail */}
                        {item.img ? (
                          <div 
                            className="w-24 sm:w-28 md:w-32 aspect-square self-center shrink-0 overflow-hidden m-2 rounded-thumb transition relative"
                            onClick={(e) => {
                              if (!isEditing) {
                                e.stopPropagation();
                                // The photo opens full screen, at its place in the journey's photos
                                setLightboxIndex(galleryUrlIndexMap.get(getEffectiveImageUrl(item.img as string)) ?? 0);
                                setIsLightboxOpen(true);
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
                          <div className={`w-24 sm:w-28 md:w-32 aspect-square self-center shrink-0 m-2 rounded-thumb bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center transition-colors relative ${isActive ? 'text-red-600' : ''}`}>
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
                    {!dayFolded && nowAfterId === item.id && <NowLine label={todayMode.nowLabel} />}

                    {/* Swiss Minimal GAP FILL Bar (Between items of the same date) */}
                    {(() => {
                      const nextItem = currentTimeline[idx + 1];
                      if (!nextItem || nextItem.date !== item.date) return null;
                      if (dayFolded) return null;

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
            {currentTimeline.length > 0 && selectedDate === 'ALL' && emptyDaysBetween(currentTimeline[currentTimeline.length - 1].date || '', '').map(renderEmptyDay)}

            {/* Add Timeline item button */}
            {isEditing && (
              <div className="p-6 flex justify-center w-full">
                <button 
                  onClick={() => handleAddTimelineItem(selectedDate === 'ALL' ? allTripDates[0] || '2025.04.12' : selectedDate)}
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-4 h-4" aria-hidden />일정 추가
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
