// Calendar hub section (moved from CalendarHub.tsx, unchanged). Reads everything from the state hook.
import { ArrowRight, ArrowUpRight, Plus, Edit3, Share2 } from 'lucide-react';
import { Trip, Plan, CalendarCustomEvent } from '../../types';
import { getWeatherMeta } from '../../utils/weatherApi';
import { MONTH_TABS, WEEKDAYS, EVENT_CATEGORIES, getDaysDifference } from './calendarData';
import type { CalendarHubState } from './useCalendarHubState';
import { EmptyScene } from '../../components/scenes/EmptyScene';

export function CalendarBoard({ s }: { s: CalendarHubState }) {
  const {
    currentYear,
    setCurrentMonth,
    selectedYearDate,
    viewMode,
    isTransitioning,
    toggleViewMode,
    isEditMode,
    selectedRange,
    setSelectedRange,
    selectedScheduleId,
    setSelectedScheduleId,
    setDragAnchorDate,
    gridContainerRef,
    customEvents,
    isWeatherMode,
    selectedWeatherCity,
    cityWeatherData,
    selectedWeatherDay,
    destinationCityData,
    setIsYearTripsModalOpen,
    parsedJourneys,
    weatherForDate,
    currentYearJourneys,
    calendarGrid,
    yearMonthsData,
    handleCellClick,
    handleYearDayClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleTouchStart,
    handleTouchEnd,
    handleDayHover,
    handleDayLeave,
    handleCellTouchStart,
    handleGridTouchMove,
    handleGridTouchEnd,
    handleTripBandClick,
    handleCustomEventClick,
    handleShareEvent,
    openNewEventModal,
    openEditEventModal,
    selectedDaysCount,
  } = s;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Content Area: Month View vs Year View with Zoom Transition    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`transition-all duration-300 ease-out transform ${
        isTransitioning
          ? (viewMode === 'month' ? 'scale-105 opacity-0' : 'scale-95 opacity-0')
          : 'scale-100 opacity-100'
      }`}>
        {viewMode === 'month' ? (
          /* ──────────────── MONTH VIEW (Pure Circular Swiss Minimal) ──────────────── */
          <div 
            className="w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 sm:mt-5"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Edit Mode Control & Multi-Select Indicator Bar (Fixed height slot prevents calendar layout shift) */}
            {isEditMode && (
              <div className="h-9 sm:h-10 flex items-center justify-between pb-2 px-1 text-xs sm:text-sm font-mono font-bold select-none">
                {selectedRange ? (
                  <div className="flex items-center justify-between w-full animate-in fade-in duration-150">
                    <span className="text-red-600 dark:text-red-400 font-bold">
                      {selectedRange.start} ~ {selectedRange.end} ({selectedDaysCount}일 선택됨)
                    </span>
                    <button
                      type="button"
                      onClick={() => openNewEventModal(selectedRange.start, selectedRange.end)}
                      className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-meta sm:text-xs font-bold font-mono tracking-wider active:scale-95 transition cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>ADD SCHEDULE</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-black/60 dark:text-white/60 text-[11px] sm:text-xs tracking-wider font-medium">
                    날짜를 드래그하거나 클릭하여 일정을 선택하세요
                  </div>
                )}
              </div>
            )}

            {/* Weekday Header Row: SUN MON TUE WED THU FRI SAT */}
            <div className="grid grid-cols-7 border-b border-black/15 dark:border-white/15 pb-2.5 sm:pb-3 text-center text-xs sm:text-sm font-extrabold tracking-widest font-mono select-none">
              {WEEKDAYS.map((day, idx) => {
                const isSunday = idx === 0;
                const isSaturday = idx === 6;
                return (
                  <div 
                    key={day} 
                    className={`py-0.5 ${
                      isSunday 
                        ? 'text-red-600 dark:text-red-500 font-extrabold' 
                        : isSaturday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-black/60 dark:text-white/60'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Pure Circular Day Grid Cells with Continuous Trip Capsule Bands (사각 그리드 완전 제거) */}
            <div 
              ref={gridContainerRef}
              onClick={(e) => e.stopPropagation()}
              onTouchMove={handleGridTouchMove}
              onTouchEnd={handleGridTouchEnd}
              className={`grid grid-cols-7 select-none justify-items-center w-full py-3 sm:py-5 ${
                isEditMode ? 'touch-none' : 'touch-auto'
              }`}
            >
              {calendarGrid.map((cell, cellIdx) => {
                const col = cellIdx % 7;
                const isSunday = cell.dayOfWeek === 0;
                const isSaturday = cell.dayOfWeek === 6;
                const isHoliday = !!cell.holiday;
                const isInRange = !!(selectedRange && cell.dateStr >= selectedRange.start && cell.dateStr <= selectedRange.end);

                const hasTrip = cell.overlappingTrips.length > 0;
                const tripItem = hasTrip ? cell.overlappingTrips[0] : null;
                const trip = tripItem ? tripItem.trip : null;
                const isPlan = tripItem ? tripItem.isPlan : false;

                // Multi-day trip ribbon connection logic (전날/다음날 연속성 및 주/행 경계 틈새 없는 연결)
                const hasPrevTrip = hasTrip && cellIdx > 0 && calendarGrid[cellIdx - 1]?.overlappingTrips.some(t => t.trip.id === trip?.id);
                const hasNextTrip = hasTrip && cellIdx < calendarGrid.length - 1 && calendarGrid[cellIdx + 1]?.overlappingTrips.some(t => t.trip.id === trip?.id);

                const hasEvent = cell.overlappingEvents.length > 0;
                const eventItem = hasEvent ? cell.overlappingEvents[0].event : null;
                const eventCat = eventItem ? EVENT_CATEGORIES.find(c => c.id === eventItem.category) : null;

                // Circular badge styling based on Concept B & Swiss Minimal (웹 반응형 대형 스케일업)
                // 크기는 날씨 모드 전체 칸에 동일 적용(다음 달로 이어지는 여정 알약 높이가 달라지지 않게)
                const wxOn = isWeatherMode;
                // 날씨 모드 모바일: 원형은 유지하고 지름만 48px로 키워 숫자 · 아이콘 · 기온 간격 확보
                const cellW = wxOn ? 'w-12 land:w-12' : 'w-10';
                const cellH = wxOn ? 'h-12 land:h-12' : 'h-10';
                const cellRound = 'rounded-full';
                let circleClasses = `${cellW} ${cellH} sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${cellRound} sm:aspect-square shrink-0 flex flex-col items-center justify-center font-mono transition-all duration-150 relative z-10 cursor-pointer`;
                let textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-extrabold leading-none';

                const isSelectedDate = !!(selectedRange && selectedRange.start === cell.dateStr && selectedRange.end === cell.dateStr);
                const isSelectedWeather = isWeatherMode && selectedWeatherDay?.dateStr === cell.dateStr;
                const isSelected = isSelectedDate || isSelectedWeather;
                // 날씨 모드: 확대/오프셋 링은 온도 텍스트와 이웃 셀을 침범하므로 안쪽 링만 사용
                const weatherCell = isWeatherMode && cell.isCurrentMonth;
                const wx = weatherCell ? weatherForDate(cell.dateStr) : null;

                if (!cell.isCurrentMonth) {
                  circleClasses += ' opacity-20 text-black/60 dark:text-white/60 hover:opacity-40';
                  if (hasTrip) {
                    circleClasses += ' !opacity-60 text-white font-bold';
                  }
                } else if (cell.isToday) {
                  // 오늘 날짜: 스위스 미니멀 반전 상태 (블랙/화이트) + 선택 시 선명한 듀얼 링 인디케이터
                  circleClasses += ' bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold shadow-sm';
                  if (isSelected) {
                    circleClasses += ' ring-[2.5px] ring-black dark:ring-white ' + (weatherCell ? 'ring-inset' : 'ring-offset-2 ring-offset-[#fcfbf9] dark:ring-offset-[#121316] scale-105 shadow-md') + ' z-20';
                  }
                  textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-extrabold leading-none';
                } else if (hasTrip) {
                  // 여정 날짜: 오렌지 알약 위 텍스트 + 선택 시 여백 없이 핏되는 인셋 링
                  circleClasses += ' text-white font-extrabold hover:opacity-95';
                  if (isSelected) {
                    circleClasses += ' ring-[2.5px] ring-inset ring-white shadow-md z-20';
                  }
                  textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-extrabold leading-none text-white';
                } else if (isSelected) {
                  // 선택 날짜: 테두리 진하고 약간 더 두껍게 (ring-[2.5px]) + 내부 은은한 모노크롬 색상
                  circleClasses += ' bg-black/10 dark:bg-white/15 text-black dark:text-white font-extrabold ring-[2.5px] ring-black dark:ring-white z-20' + (weatherCell ? ' ring-inset' : ' scale-105 shadow-md');
                  textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-extrabold leading-none text-black dark:text-white';
                } else if (isInRange) {
                  circleClasses += ' bg-red-600/20 ring-2 ring-red-600 text-red-600 dark:text-red-400 font-extrabold';
                } else if (hasEvent) {
                  circleClasses += ' bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white';
                } else {
                  circleClasses += ' bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20';
                  if (isSunday || isHoliday) {
                    textClasses += ' text-red-600 dark:text-red-400';
                  } else if (isSaturday) {
                    textClasses += ' text-blue-600 dark:text-blue-400';
                  } else {
                    textClasses += ' text-black/80 dark:text-white/80';
                  }
                }

                const ribbonColor = isPlan ? 'bg-amber-500' : 'bg-[#FF4500] dark:bg-[#FF4500]';

                return (
                  <div
                    key={cell.dateStr}
                    data-calendar-date={cell.dateStr}
                    className="relative flex items-center justify-center h-14 sm:h-16 md:h-20 lg:h-22 w-full"
                  >
                    {/* Multi-day Trip Capsule Ribbon (날짜 원형과 100% 일치하는 정원 + 연결 바로 틈 없는 완벽 핏) */}
                    {hasTrip && (
                      <div className={`absolute inset-0 pointer-events-none z-0 ${cell.isCurrentMonth ? '' : 'opacity-35'}`}>
                        {/* 1. 좌측 연결 바: 어제에도 동일 여정이 있을 때 셀 왼쪽 끝(left-0)부터 중앙까지 확장 */}
                        {hasPrevTrip && (
                          <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-1/2 ${cellH} sm:h-12 md:h-14 lg:h-16 ${ribbonColor}`} />
                        )}

                        {/* 2. 우측 연결 바: 내일에도 동일 여정이 있을 때 중앙부터 셀 오른쪽 끝(right-0)까지 확장 */}
                        {hasNextTrip && (
                          <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 right-0 ${cellH} sm:h-12 md:h-14 lg:h-16 ${ribbonColor}`} />
                        )}

                        {/* 3. 중앙 정원: 날짜 원형 버튼과 100% 일치하는 라운드 베이스 */}
                        <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 ${cellW} sm:w-12 md:w-14 lg:w-16 ${cellH} sm:h-12 md:h-14 lg:h-16 ${cellRound} ${ribbonColor}`} />
                      </div>
                    )}

                    {/* Interactive Circular Day Button */}
                    <button
                      type="button"
                      data-calendar-month-cell={cell.dateStr}
                      onClick={(e) => handleCellClick(cell, e)}
                      onMouseDown={(e) => handleCellMouseDown(cell.dateStr, e)}
                      onMouseEnter={(e) => {
                        handleCellMouseEnter(cell.dateStr);
                        handleDayHover(
                          e,
                          cell.dateStr,
                          cell.holiday?.name,
                          cell.overlappingTrips.map(t => ({ title: t.trip.title, isPlan: t.isPlan, totalDays: t.totalDays })),
                          cell.overlappingEvents.map(e => ({ title: e.event.title, category: e.event.category, totalDays: e.totalDays }))
                        );
                      }}
                      onMouseLeave={handleDayLeave}
                      onTouchStart={() => handleCellTouchStart(cell.dateStr)}
                      className={circleClasses}
                      title={cell.holiday ? `${cell.dateStr} (${cell.holiday.name})` : cell.dateStr}
                    >
                      {/* Weather Mode 3-Tier Layout (실시간 예보는 OpenWeatherMap 사용, 타월/예보외 구간은 실제 기후 통계 시뮬레이터 연동) */}
                      {isWeatherMode && cell.isCurrentMonth ? (() => {
                        const { weather: weatherItem } = wx!;

                        if (!weatherItem) {
                          return <span className={textClasses}>{cell.dayNum}</span>;
                        }

                        const { icon: WeatherIconComponent, colorClass } = getWeatherMeta(weatherItem.weatherCode, weatherItem.precipitationProb);
                        const isOrangeBg = hasTrip;

                        return (
                          <div className="flex flex-col items-center justify-center gap-[2px] h-full w-full sm:justify-between sm:gap-0 sm:py-1.5 land:justify-center land:gap-[2px] land:py-0 pointer-events-none select-none">
                            {/* 1. 상단: 날짜 일자 숫자 */}
                            <span className={`text-[11px] sm:text-meta land:text-[10px] font-mono leading-none ${
                              isOrangeBg 
                                ? 'text-white font-extrabold' 
                                : cell.isToday
                                  ? 'text-white dark:text-black font-extrabold'
                                  : isSelected 
                                    ? 'text-black dark:text-white font-extrabold' 
                                    : (isSunday || isHoliday)
                                      ? 'text-red-700 dark:text-red-400 font-extrabold'
                                      : isSaturday
                                        ? 'text-blue-700 dark:text-blue-400 font-extrabold'
                                        : 'text-black/80 dark:text-white/80 font-bold'
                            }`}>
                              {cell.dayNum}
                            </span>

                            {/* 2. 중앙 메인: 날씨 아이콘 */}
                            <div className="flex items-center justify-center sm:my-auto land:my-0">
                              <WeatherIconComponent className={`w-[17px] h-[17px] sm:w-5 sm:h-5 md:w-6 md:h-6 land:w-[14px] land:h-[14px] shrink-0 ${
                                isOrangeBg 
                                  ? 'text-white stroke-[2.4] drop-shadow-xs' 
                                  : cell.isToday
                                    ? 'text-white dark:text-black stroke-[2.4]'
                                    : `${colorClass} stroke-[2.2]`
                              }`} />
                            </div>

                            {/* 3. 하단: 최저/최고 기온 */}
                            <span className={`text-[11px] sm:text-micro md:text-micro land:text-[10px] font-mono tracking-tighter leading-none ${
                              isOrangeBg 
                                ? 'text-white font-extrabold' 
                                : cell.isToday
                                  ? 'text-white dark:text-black font-extrabold'
                                  : isSelected 
                                    ? 'text-black dark:text-white font-extrabold' 
                                    : 'text-black/85 dark:text-white/85 font-bold'
                            }`}>
                              <span className="sm:hidden land:inline">{weatherItem.tempMax}°</span>
                              <span className="hidden sm:inline land:hidden">{weatherItem.tempMin}°/{weatherItem.tempMax}°</span>
                            </span>
                          </div>
                        );
                      })() : (
                        <>
                          <span className={textClasses}>{cell.dayNum}</span>

                          {/* Event Dots Indicator (Centered row of colored dots for multiple events) */}
                          {hasEvent && !hasTrip && !cell.isToday && cell.isCurrentMonth && (
                            <div className="flex items-center justify-center gap-0.5 sm:gap-1 mt-1 max-w-[28px] overflow-hidden">
                              {cell.overlappingEvents.slice(0, 4).map((evtWrap) => {
                                const cat = EVENT_CATEGORIES.find(c => c.id === evtWrap.event.category);
                                return (
                                  <span 
                                    key={evtWrap.event.id}
                                    className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: cat?.color || '#2563eb' }} 
                                  />
                                );
                              })}
                            </div>
                          )}
                          {cell.holiday && !hasTrip && !cell.isToday && !hasEvent && cell.isCurrentMonth && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1" />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Weather Detail Widget (날씨 모드에서 날짜 클릭 시 하단에 심플하게 표기되는 날씨 상세 위젯) */}
            {isWeatherMode && selectedWeatherDay && (() => {
              const { icon: WeatherIconComponent, colorClass, labelKo, label } = getWeatherMeta(
                selectedWeatherDay.weather.weatherCode, 
                selectedWeatherDay.weather.precipitationProb
              );
              
              // OpenWeatherMap 공식 도시 페이지 매칭 (기온/날씨 100% 일치)
              const openWeatherId = cityWeatherData?.openWeatherCityId;
              const weatherUrl = openWeatherId
                ? `https://openweathermap.org/city/${openWeatherId}`
                : `https://openweathermap.org/find?q=${encodeURIComponent(selectedWeatherDay.city.nameEn)}`;

              return (
                <a 
                  href={weatherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-3 p-3 rounded-card bg-surface dark:bg-surface-dark flex flex-row items-center justify-between gap-3 font-mono cursor-pointer hover:border-black/50 dark:hover:border-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition group select-none animate-in fade-in duration-200 no-underline text-inherit"
                  title={`${selectedWeatherDay.city.name} OpenWeatherMap 공식 예보 사이트 새 창 이동`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <WeatherIconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${colorClass} stroke-[2.2]`} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-2 truncate">
                        <span className="text-xs sm:text-sm font-extrabold text-black dark:text-white">
                          {selectedWeatherDay.dateStr.replace(/-/g, '.')} ({selectedWeatherDay.weather.dayOfWeek})
                        </span>
                        <span className="text-meta font-bold text-red-600 dark:text-red-400 uppercase truncate">
                          {selectedWeatherDay.city.name} ({selectedWeatherDay.city.nameEn})
                        </span>
                        <span className="shrink-0 text-micro font-bold uppercase tracking-widest px-2 rounded-full bg-black/[0.06] dark:bg-white/10 text-black/60 dark:text-white/60">
                          {selectedWeatherDay.isForecast ? '예보' : '평년'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-black/60 dark:text-white/60 mt-0.5 truncate">
                        <span className="font-bold text-black dark:text-white">{labelKo} ({label})</span>
                        <span>·</span>
                        <span>최고 {selectedWeatherDay.weather.tempMax}°C / 최저 {selectedWeatherDay.weather.tempMin}°C</span>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">강수확률 {selectedWeatherDay.weather.precipitationProb}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 날씨 이동 문구 없이 LUCIDE 대각화살 표기 심플 원형 버튼 (모바일에서도 우측에 1열 안착) */}
                  <div className="w-8 h-8 rounded-full border border-black/20 dark:border-white/20 group-hover:border-black dark:group-hover:border-white group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black flex items-center justify-center shrink-0 transition">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
                  </div>
                </a>
              );
            })()}

            {/* Mockup-Style Unified 1-Line Agenda Feed (달력 하단 상시 일정 목록 및 선택 영역 색상화) */}
            <div className="mt-4 sm:mt-6 border-t border-black/15 dark:border-white/15 pt-4">
              <div className="flex items-center justify-between pb-3 px-1 text-xs font-mono text-black/60 dark:text-white/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold tracking-wider uppercase text-black/80 dark:text-white/80 shrink-0">
                    SCHEDULES
                  </span>
                  {selectedRange && (
                    <span className="text-meta font-mono px-2 py-0.5 rounded-full bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold shrink-0 truncate">
                      {selectedRange.start === selectedRange.end
                        ? selectedRange.start.replace(/-/g, '.')
                        : `${selectedRange.start.replace(/-/g, '.')} ~ ${selectedRange.end.replace(/-/g, '.')}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openNewEventModal(selectedRange?.start, selectedRange?.end)}
                    className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-meta sm:text-xs font-bold font-mono tracking-wider flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-xs shrink-0"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>ADD</span>
                  </button>
                </div>
              </div>

              {/* Agenda List Items - Always Shows All Month Events in Chronological Order */}
              {(() => {
                const currentMonthCells = calendarGrid.filter(c => c.isCurrentMonth);
                const items: {
                  id: string;
                  type: 'trip' | 'event';
                  sortDate: string;
                  startDate: string;
                  endDate: string;
                  dateBadge: string;
                  displayTitle: string;
                  days: number;
                  eventCatColor?: string;
                  data: any;
                }[] = [];

                // 기간 날짜 배지 생성 헬퍼 (단일 날짜: '13 SEP', 기간 일정 동일 월: '13 - 16 SEP', 기간 일정 다른 월: '28 SEP - 02 OCT')
                const formatDateBadge = (startDate: string, endDate: string) => {
                  const sParts = startDate.split('-');
                  const sMonth = parseInt(sParts[1], 10);
                  const sDay = parseInt(sParts[2], 10);
                  const sMonthStr = MONTH_TABS[sMonth - 1]?.short || '';
                  const sDayStr = sDay < 10 ? `0${sDay}` : `${sDay}`;

                  if (!endDate || startDate === endDate) {
                    return `${sDayStr} ${sMonthStr}`;
                  }

                  const eParts = endDate.split('-');
                  const eMonth = parseInt(eParts[1], 10);
                  const eDay = parseInt(eParts[2], 10);
                  const eMonthStr = MONTH_TABS[eMonth - 1]?.short || '';
                  const eDayStr = eDay < 10 ? `0${eDay}` : `${eDay}`;

                  if (sMonth === eMonth) {
                    return `${sDayStr} - ${eDayStr} ${sMonthStr}`;
                  }
                  return `${sDayStr} ${sMonthStr} - ${eDayStr} ${eMonthStr}`;
                };

                // 여행(Trip) 수집 (중복 제거된 고유 여행 목록)
                const tripsMap = new Map<number, { trip: Trip; isPlan: boolean }>();
                currentMonthCells.forEach(cell => {
                  cell.overlappingTrips.forEach(t => {
                    if (!tripsMap.has(t.trip.id)) {
                      tripsMap.set(t.trip.id, { trip: t.trip, isPlan: t.isPlan });
                    }
                  });
                });

                tripsMap.forEach(({ trip, isPlan }) => {
                  const parsed = parsedJourneys.find(pj => pj.journey.id === trip.id);
                  const s = parsed?.range.start || '';
                  const e = parsed?.range.end || s;
                  const days = parsed ? getDaysDifference(s, e) : 1;

                  items.push({
                    id: `trip-${trip.id}`,
                    type: 'trip',
                    sortDate: s,
                    startDate: s,
                    endDate: e,
                    dateBadge: formatDateBadge(s, e),
                    displayTitle: `${trip.title}${isPlan ? ' (Plan)' : ''}`,
                    days,
                    data: { trip, isPlan }
                  });
                });

                // 커스텀 일정(Event) 수집 (중복 제거된 고유 이벤트 목록)
                const eventsMap = new Map<string, CalendarCustomEvent>();
                currentMonthCells.forEach(cell => {
                  cell.overlappingEvents.forEach(e => {
                    if (!eventsMap.has(e.event.id)) {
                      eventsMap.set(e.event.id, e.event);
                    }
                  });
                });

                eventsMap.forEach((evt) => {
                  const s = evt.startDate;
                  const e = evt.endDate || evt.startDate;
                  const days = getDaysDifference(s, e);
                  const cat = EVENT_CATEGORIES.find(c => c.id === evt.category) || EVENT_CATEGORIES[0];

                  items.push({
                    id: `evt-${evt.id}`,
                    type: 'event',
                    sortDate: s,
                    startDate: s,
                    endDate: e,
                    dateBadge: formatDateBadge(s, e),
                    displayTitle: `${cat.label}: ${evt.title}`,
                    days,
                    eventCatColor: cat.color,
                    data: evt
                  });
                });

                // 날짜 오름차순 정렬 절대 보존
                items.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

                if (items.length === 0) {
                  return (
                    <EmptyScene kind="calendar" mini bare className="py-6" title="이번 달에 등록된 일정이 없어요" />
                  );
                }

                return (
                  <div className="flex flex-col">
                    {items.map((item) => {
                      // 선택된 일정 판별:
                      // 1) 특정 일정을 직접 클릭한 경우(selectedScheduleId가 있는 경우) -> 해당 일정만 단독 활성화
                      // 2) 달력 날짜 알약을 클릭한 경우(selectedScheduleId가 null이고 selectedRange가 있는 경우) -> 해당 날짜에 걸친 일정들 활성화
                      const isHighlighted = selectedScheduleId
                        ? selectedScheduleId === item.id
                        : !!(
                            selectedRange &&
                            item.startDate <= selectedRange.end &&
                            item.endDate >= selectedRange.start
                          );

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            // 하단 일정 행 클릭: 이미 선택된 일정이면 해제(토글), 아니면 해당 일정 단독 선택
                            if (selectedScheduleId === item.id) {
                              setSelectedScheduleId(null);
                              setSelectedRange(null);
                              setDragAnchorDate(null);
                            } else {
                              setSelectedScheduleId(item.id);
                              setSelectedRange({ start: item.startDate, end: item.endDate });
                              setDragAnchorDate(item.startDate);
                            }
                          }}
                          className={`flex items-center justify-between py-2.5 sm:py-3 px-2 sm:px-3 font-mono text-xs sm:text-sm group cursor-pointer transition-all border-b border-black/10 dark:border-white/10 last:border-b-0 ${
                            isHighlighted
                              ? 'bg-red-600/10 dark:bg-red-500/15'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5 truncate flex-1 min-w-0 overflow-hidden">
                            <span className={`font-bold shrink-0 min-w-[4.2rem] sm:min-w-[6.2rem] whitespace-nowrap text-xs ${
                              isHighlighted ? 'text-red-600 dark:text-red-400' : 'text-black/70 dark:text-white/70'
                            }`}>
                              {item.dateBadge}
                            </span>
                            <span className="text-black/60 dark:text-white/60 shrink-0">|</span>
                            <span className={`font-sans truncate block whitespace-nowrap text-xs sm:text-sm ${
                              isHighlighted 
                                ? 'font-extrabold text-red-600 dark:text-red-400' 
                                : 'font-bold text-black dark:text-white group-hover:text-red-600 transition-colors'
                            }`}>
                              {item.displayTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {item.type === 'trip' && (
                              <span className="text-meta sm:text-xs font-mono font-bold text-red-600 dark:text-red-400 shrink-0">
                                {item.days === 1 ? '1 DAY' : `${item.days} DAYS`}
                              </span>
                            )}
                            {item.type === 'event' && (
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.eventCatColor }}
                                />
                                <span className="text-meta sm:text-xs font-mono font-bold text-black/60 dark:text-white/60 shrink-0">
                                  {item.days === 1 ? '1 DAY' : `${item.days} DAYS`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareEvent(item.data);
                                  }}
                                  className="tap-target p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                  title="일정 공유"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditEventModal(item.data);
                                  }}
                                  className="tap-target p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                  title="일정 수정"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {/* 우측 화살표 아이콘을 눌러야만 상세 모달 진입 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScheduleId(item.id);
                                setSelectedRange({ start: item.startDate, end: item.endDate });
                                if (item.type === 'trip') {
                                  handleTripBandClick(e, item.data.trip, item.startDate, item.data.isPlan);
                                } else {
                                  handleCustomEventClick(e, item.data);
                                }
                              }}
                              className={`tap-target p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer ${
                                isHighlighted ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                              }`}
                              title="상세 일정 보기"
                            >
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Weather Mode Attribution (Swiss Minimal Mono) */}
              {isWeatherMode && (
                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-micro sm:text-meta font-mono text-black/60 dark:text-white/60 select-none">
                  <span>WEATHER SOURCE: OPEN-METEO GLOBAL FORECAST API (HOURLY UPDATED)</span>
                  <span>{selectedWeatherCity.nameEn} ({selectedWeatherCity.name}) · 14-DAY FORECAST</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ──────────────── YEAR VIEW (3-Column Desktop / 2-Column Mobile Swiss Minimal) ──────────────── */
          <div className="max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 mt-5 sm:mt-6">
            {/* Year View Minimal Header */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 text-xs font-mono text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10 mb-4 sm:mb-6">
              <span className="font-bold text-black/60 dark:text-white/60 tracking-wider uppercase">
                ANNUAL CALENDAR
              </span>
              <button
                type="button"
                onClick={() => setIsYearTripsModalOpen(true)}
                className="font-bold text-red-600 dark:text-red-400 tracking-wider hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                title={`${currentYear}년 여정 목록 보기 (클릭 시 모달)`}
              >
                <span>{currentYearJourneys.length === 1 ? '1 Trip' : `${currentYearJourneys.length} Trips`}</span>
              </button>
            </div>

            {/* Restored 3-Column Desktop / 2-Column Mobile Grid (3 cols x 4 rows = 12M) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6 md:gap-8">
              {yearMonthsData.map((m) => {
                const isBestMonth = isWeatherMode && !!destinationCityData?.bestMonths?.includes(m.monthTab.num);
                const isAvoidMonth = isWeatherMode && !!destinationCityData?.avoidMonths?.some(a => a.months?.includes(m.monthTab.num));

                return (
                <div
                  key={m.monthIdx}
                  id={`year-month-${m.monthIdx}`}
                  className="tgl-cv-month bg-transparent p-2 sm:p-3 md:p-4 flex flex-col group relative"
                >
                  {/* Month Card Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMonth(m.monthIdx);
                        toggleViewMode('month');
                      }}
                      className="text-left cursor-pointer group"
                      title={`${m.monthTab.full} 월별 보기로 확대 이동`}
                    >
                      <div className="flex items-baseline gap-1.5 sm:gap-2 text-black dark:text-white group-hover:text-red-600 transition-colors">
                        <span className="text-base sm:text-lg md:text-xl font-extrabold font-mono tracking-tight">
                          {m.monthTab.num < 10 ? `0${m.monthTab.num}` : m.monthTab.num}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold font-['Inter',sans-serif] tracking-wider uppercase opacity-75">
                          {m.monthTab.short}
                        </span>
                      </div>
                    </button>
                    {/* Separated & High-Contrast Trip/Event & Best/Avoid Weather Badges */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                      {isBestMonth && (
                        <span 
                          className="text-micro sm:text-micro font-mono font-extrabold px-1.5 py-0.5 rounded-full bg-red-600 text-white tracking-wider shadow-2xs"
                          title={`${destinationCityData?.nameKo || selectedWeatherCity.nameEn} 최적 여행 시기`}
                        >
                          BEST
                        </span>
                      )}
                      {isAvoidMonth && (
                        <span 
                          className="text-micro sm:text-micro font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/15 text-black/60 dark:text-white/60 border border-black/10 dark:border-white/15 tracking-wider"
                          title={`${destinationCityData?.nameKo || selectedWeatherCity.nameEn} 비추천 시기`}
                        >
                          AVOID
                        </span>
                      )}
                      {m.totalTripDays > 0 && (
                        <span className="text-micro sm:text-micro font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600 text-white tracking-tight shadow-2xs">
                          TRIP {m.totalTripDays}-D
                        </span>
                      )}
                      {m.totalEventDays > 0 && (
                        <span className="text-micro sm:text-micro font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/15 tracking-tight">
                          EVENT {m.totalEventDays}-D
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini Weekday Headers (S M T W T F S) */}
                  <div className="grid grid-cols-7 text-center text-meta sm:text-xs font-mono font-bold mb-1.5 select-none">
                    {WEEKDAYS.map((wd, wIdx) => (
                      <div
                        key={wd}
                        className={wIdx === 0 ? 'text-red-500' : wIdx === 6 ? 'text-blue-500' : 'text-black/60 dark:text-white/60'}
                      >
                        {wd[0]}
                      </div>
                    ))}
                  </div>

                  {/* Mini Days Grid - Continuous Pill Ribbons & Non-overlapping Circles */}
                  <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1 text-center font-mono select-none">
                    {m.days.map((day, dIdx) => {
                      if (!day.isCurrentMonth) {
                        return <div key={`empty-${m.monthIdx}-${dIdx}`} className="w-full h-7 sm:h-8 md:h-8.5" />;
                      }

                      const col = dIdx % 7;
                      const isSun = day.dayOfWeek === 0;
                      const isSat = day.dayOfWeek === 6;

                      // 이전/다음 날짜와 동일한 여정 연속성 판별 (전체 날짜 인덱스 기반 연속 밴드 생성)
                      const hasPrevTrip = day.hasTrip && dIdx > 0 && m.days[dIdx - 1]?.hasTrip && (!day.tripId || !m.days[dIdx - 1]?.tripId || day.tripId === m.days[dIdx - 1]?.tripId);
                      const hasNextTrip = day.hasTrip && dIdx < m.days.length - 1 && m.days[dIdx + 1]?.hasTrip && (!day.tripId || !m.days[dIdx + 1]?.tripId || day.tripId === m.days[dIdx + 1]?.tripId);

                      // 날씨 데이터 획득 (예보 및 기후 통계 시뮬레이터)
                      const cellForecast = isWeatherMode ? weatherForDate(day.dateStr) : null;
                      const cellWeather = cellForecast?.weather ?? null;
                      const weatherMeta = cellWeather ? getWeatherMeta(cellWeather.weatherCode, cellWeather.precipitationProb) : null;
                      const WeatherIcon = weatherMeta?.icon;

                      // 날씨 모드와 일반 모드 모두 균일한 원형(rounded-full) 유지하여 겹침 방지 및 폰트 튐(jank) 완전 제거
                      let circleClasses = 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full aspect-square flex items-center justify-center shrink-0 text-meta sm:text-xs md:text-sm font-bold transition-colors relative z-10';
                      let textClasses = 'leading-none';

                      const isYearSelected = selectedYearDate === day.dateStr;

                      if (isYearSelected) {
                        circleClasses += ' ring-2 ring-red-600 ring-offset-1 dark:ring-offset-black scale-105 z-20 font-extrabold shadow-md';
                      }

                      if (day.isToday) {
                        circleClasses += ' bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold shadow-xs';
                      } else if (day.hasTrip) {
                        circleClasses += ' text-white font-extrabold hover:opacity-90';
                        textClasses += ' text-white';
                      } else if (day.hasEvent) {
                        circleClasses += ' bg-black/10 dark:bg-white/15 text-black dark:text-white font-bold';
                      } else {
                        circleClasses += ' hover:bg-black/5 dark:hover:bg-white/10';
                        textClasses = isSun || day.isHoliday
                          ? 'text-red-600 dark:text-red-400 font-bold'
                          : isSat
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-black/75 dark:text-white/75';
                      }

                      return (
                        <div
                          key={day.dateStr}
                          className="relative flex items-center justify-center w-full h-7 sm:h-8 md:h-8.5"
                        >
                          {/* Continuous Trip Pill Ribbon (원형 높이 h-6 sm:h-7 md:h-8 와 100% 동일 핏 & 주간 연속 밴드) */}
                          {day.hasTrip && (
                            <div className="absolute inset-0 pointer-events-none z-0">
                              {/* 1. 좌측 연결 바 */}
                              {hasPrevTrip && (
                                <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-1/2 h-6 sm:h-7 md:h-8 ${day.isPlan ? 'bg-amber-500' : 'bg-[#FF4500]'}`} />
                              )}

                              {/* 2. 우측 연결 바 */}
                              {hasNextTrip && (
                                <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 right-0 h-6 sm:h-7 md:h-8 ${day.isPlan ? 'bg-amber-500' : 'bg-[#FF4500]'}`} />
                              )}

                              {/* 3. 중앙 정원 (날짜 버튼 원형과 100% 동일 크기) */}
                              <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 rounded-full ${day.isPlan ? 'bg-amber-500' : 'bg-[#FF4500]'}`} />
                            </div>
                          )}

                          <button
                            type="button"
                            data-calendar-year-cell={day.dateStr}
                            onClick={(e) => handleYearDayClick(e, day, m.monthIdx)}
                            onMouseEnter={(e) => {
                              const matchedTrips = parsedJourneys.filter(pj => day.dateStr >= pj.range.start && day.dateStr <= pj.range.end);
                              const matchedEvents = customEvents.filter(evt => day.dateStr >= evt.startDate && day.dateStr <= (evt.endDate || evt.startDate));
                              handleDayHover(
                                e,
                                day.dateStr,
                                day.holidayName,
                                matchedTrips.map(mt => ({ title: mt.journey.title, isPlan: mt.isPlan, totalDays: getDaysDifference(mt.range.start, mt.range.end) })),
                                matchedEvents.map(me => ({ title: me.title, category: me.category, totalDays: getDaysDifference(me.startDate, me.endDate || me.startDate) }))
                              );
                            }}
                            onMouseLeave={() => {
                              if (!selectedYearDate) {
                                handleDayLeave();
                              }
                            }}
                            className={`cursor-pointer active:scale-95 ${circleClasses}`}
                            title={
                              day.holidayName 
                                ? `${day.dateStr} (${day.holidayName})` 
                                : day.tripTitles.length > 0 
                                  ? `${day.dateStr} · ${day.tripTitles.join(', ')}` 
                                  : cellWeather
                                    ? `${day.dateStr} · ${weatherMeta?.label} (${cellWeather.tempMin}°/${cellWeather.tempMax}°)`
                                    : day.dateStr
                            }
                          >
                            {isWeatherMode && WeatherIcon ? (
                              <div className="flex flex-col items-center justify-center w-full h-full p-0.5 leading-none select-none pointer-events-none">
                                <span className={`text-micro sm:text-micro font-mono font-bold leading-none mb-0.5 ${
                                  day.hasTrip
                                    ? 'text-white'
                                    : day.isToday
                                      ? 'text-white dark:text-black'
                                      : isSun || day.isHoliday
                                        ? 'text-red-600 dark:text-red-400'
                                        : isSat
                                          ? 'text-blue-600 dark:text-blue-400'
                                          : 'text-black/60 dark:text-white/60'
                                }`}>
                                  {day.dayNum}
                                </span>
                                <WeatherIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                                  day.hasTrip
                                    ? 'text-white stroke-[2.4]'
                                    : day.isToday
                                      ? 'text-white dark:text-black stroke-[2.4]'
                                      : `${weatherMeta.colorClass} stroke-[2.2]`
                                }`} />
                              </div>
                            ) : (
                              <span className={textClasses}>
                                {day.dayNum}
                              </span>
                            )}
                          </button>

                          {/* Minimal Holiday Indicator Dot */}
                          {day.isHoliday && !day.isToday && !day.hasTrip && (
                            <span className="w-1 h-1 rounded-full bg-red-600 dark:bg-red-400 absolute bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none z-20" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

    </>
  );
}
