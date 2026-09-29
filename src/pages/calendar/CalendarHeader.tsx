// Calendar hub section (moved from CalendarHub.tsx, unchanged). Reads everything from the state hook.
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Sparkles, Edit3, X, LayoutGrid, CalendarDays, Sun } from 'lucide-react';
import { Trip } from '../../types';
import { getWeatherMeta, cleanCityDisplayName } from '../../utils/weatherApi';
import { NewTripButton } from '../../components/NewTripButton';
import { MONTH_NAMES, MONTH_TABS } from './calendarData';
import type { CalendarHubState } from './useCalendarHubState';

export function CalendarHeader({ s }: { s: CalendarHubState }) {
  const {
    trips,
    plans,
    onCreateTrip,
    currentYear,
    setCurrentYear,
    currentMonth,
    setCurrentMonth,
    isYearDropdownOpen,
    setIsYearDropdownOpen,
    isMonthStripOpen,
    setIsMonthStripOpen,
    yearDropdownRef,
    monthDropdownRef,
    viewMode,
    toggleViewMode,
    isEditMode,
    setIsEditMode,
    setSelectedRange,
    weatherCities,
    isWeatherMode,
    setIsWeatherMode,
    selectedWeatherCity,
    cityWeatherData,
    isWeatherBgEnabled,
    toggleWeatherBg,
    handleSelectCity,
    weatherChipsRef,
    canScrollChipsLeft,
    canScrollChipsRight,
    scrollChipsLeft,
    scrollChipsRight,
    destinationCityData,
    nextUpcomingTrip,
    handlePrevMonth,
    handleNextMonth,
    handleGoToday,
  } = s;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Top Banner & Swiss Minimal Typography Header                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
        {/* Top Metadata Bar & Pure Typography Year */}
        <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <span className="shrink-0 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold px-2 py-0.5 text-meta tracking-widest font-mono">
              CALENDAR
            </span>

            {/* Pure Typography Year (알약 배지 X, 순수 텍스트 표기, 클릭 시 드롭다운) */}
            <div className="relative" ref={yearDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsYearDropdownOpen(prev => !prev);
                  setIsMonthStripOpen(false);
                }}
                className="flex items-baseline gap-1.5 cursor-pointer text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group select-none"
                title="클릭하여 연도 선택"
              >
                <span className="text-xl sm:text-2xl lg:text-3xl font-light font-satoshi tracking-tight">
                  {currentYear}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Scrollable Year Dropdown Popover */}
              {isYearDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-36 sm:w-44 max-h-64 overflow-y-auto rounded-card bg-surface dark:bg-surface-dark shadow-[0_12px_32px_rgba(0,0,0,0.14)] py-1 text-sm font-mono animate-in fade-in zoom-in-95 duration-150">
                  {Array.from({ length: 16 }, (_, i) => 2020 + i).map(year => {
                    const isSelected = year === currentYear;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setCurrentYear(year);
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white font-extrabold'
                            : 'text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm sm:text-base font-satoshi">{year}</span>
                        {isSelected && <span className="text-meta uppercase font-mono tracking-wider">선택</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="hidden sm:inline-block font-mono text-[11px] font-bold text-red-600 dark:text-red-400 tracking-wider">
              {viewMode === 'year' ? 'ANNUAL OVERVIEW' : 'SCHEDULE & TIMELINE'}
            </span>

            {/* Next Upcoming Trip D-Day Badge */}
            {nextUpcomingTrip && (
              <button
                type="button"
                onClick={() => {
                  const [y, m] = nextUpcomingTrip.startDate.split('-').map(Number);
                  if (y && m) {
                    setCurrentYear(y);
                    setCurrentMonth(m - 1);
                    setSelectedRange({ start: nextUpcomingTrip.startDate, end: nextUpcomingTrip.startDate });
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-black transition-colors font-mono font-bold text-meta sm:text-meta cursor-pointer group shadow-2xs shrink-0"
                title={`클릭하여 ${nextUpcomingTrip.title} 일정으로 바로 이동`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 group-hover:bg-white animate-pulse shrink-0" />
                {/* Phones show the countdown only; the title joins from sm up */}
                <span className="hidden sm:inline max-w-[150px] truncate">{nextUpcomingTrip.title}</span>
                <span className="font-extrabold tabular-nums whitespace-nowrap">D-{nextUpcomingTrip.daysLeft === 0 ? 'DAY' : nextUpcomingTrip.daysLeft}</span>
              </button>
            )}
          </div>

          <div className="shrink-0 text-[11px] sm:text-xs font-mono font-bold tracking-wider text-black/60 dark:text-white/60 flex items-center gap-3 whitespace-nowrap">
            <span className="hidden sm:inline">VOL. {currentYear}</span>
            <span className="hidden sm:inline">{trips.length + plans.length} JOURNEYS RECORDED</span>
            <span className="sm:hidden tabular-nums" title={`${trips.length + plans.length} journeys recorded`}>{trips.length + plans.length} TRIPS</span>
          </div>
        </div>

        {/* Center Hero: Giant Month (09 SEPTEMBER) & Expandable 1~12 Month Strip */}
        <div className="relative flex flex-col items-center justify-center my-4 sm:my-6 select-none" ref={monthDropdownRef}>
          {viewMode === 'month' ? (
            <>
              {/* Clickable Giant Month Heading */}
              <button
                type="button"
                onClick={() => setIsMonthStripOpen(prev => !prev)}
                className="group flex flex-col items-center cursor-pointer transition-transform duration-200 active:scale-98"
                title="클릭하여 1~12월 선택 탭 열기"
              >
                {/* Giant Month Number */}
                <span className="text-7xl sm:text-8xl lg:text-9xl font-extrabold font-satoshi tracking-tighter leading-none text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                  {String(currentMonth + 1).padStart(2, '0')}
                </span>
                {/* English Month Name */}
                <div className="flex items-center gap-2 mt-1 sm:mt-2">
                  <span className="text-base sm:text-xl lg:text-2xl font-bold font-satoshi tracking-[0.25em] sm:tracking-[0.3em] uppercase text-black/60 dark:text-white/60 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                    {MONTH_NAMES[currentMonth]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/60 dark:text-white/60 group-hover:text-red-600 transition-transform duration-200 ${isMonthStripOpen ? 'rotate-180 text-red-600' : ''}`} />
                </div>
              </button>

              {/* Expandable 12-Month Quick Selector Tabs (월 클릭 시 펼쳐지고 선택 시 자동 닫힘 + 날씨 도시 시즌 오버레이) */}
              {isMonthStripOpen && (
                <div className="w-full mt-3 sm:mt-5 py-2.5 sm:py-3 border-y border-black/10 dark:border-white/10 select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-12 gap-0.5 sm:gap-1">
                    {MONTH_TABS.map((mTab, idx) => {
                      const isActive = currentMonth === idx;
                      const isBest = Boolean(isWeatherMode && destinationCityData?.bestMonths?.includes(mTab.num));
                      const isAvoid = Boolean(isWeatherMode && destinationCityData?.avoidMonths?.some(a => a.months.includes(mTab.num)));

                      return (
                        <button
                          key={mTab.num}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(idx);
                            setIsMonthStripOpen(false); // 골라지면 즉시 자동 숨김
                          }}
                          className={`relative flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs ring-1 ring-black dark:ring-white'
                              : isAvoid
                              ? 'opacity-40 text-black/60 dark:text-white/60 hover:opacity-80 hover:bg-black/5 dark:hover:bg-white/5'
                              : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                          }`}
                          title={
                            isBest 
                              ? `${mTab.full} (${mTab.num}월) - ${destinationCityData?.nameKo || selectedWeatherCity.name} 최적 여행 시즌`
                              : isAvoid
                              ? `${mTab.full} (${mTab.num}월) - 여행 비추천/주의 시즌`
                              : `${mTab.full} (${mTab.num}월)`
                          }
                        >
                          {/* Season Indicator Dot (Best Season) */}
                          {isBest && (
                            <span className="absolute top-0.5 right-0.5 sm:right-1 w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 ring-2 ring-white dark:ring-zinc-900" />
                          )}
                          <span className="text-sm sm:text-lg md:text-xl font-extrabold font-['Inter',sans-serif] leading-none tracking-tight">
                            {mTab.num}
                          </span>
                          <span className={`text-micro sm:text-micro md:text-meta font-bold tracking-wider uppercase leading-tight mt-0.5 font-['Inter',sans-serif] ${
                            isActive 
                              ? 'text-white dark:text-black' 
                              : isBest
                              ? 'text-red-600 dark:text-red-400 font-extrabold'
                              : 'text-black/60 dark:text-white/60'
                          }`}>
                            {mTab.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Best Season Guide Caption (날씨 모드 켜졌을 때 해당 도시 시즌 요약 브리핑) */}
                  {isWeatherMode && destinationCityData && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-meta sm:text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-black/70 dark:text-white/70">
                        <span className="font-bold text-red-600 dark:text-red-400 uppercase">
                          [{destinationCityData.nameKo || selectedWeatherCity.name}]
                        </span>
                        <span>
                          최적 여행 시즌: {destinationCityData.bestMonths.map(m => `${m}월`).join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-black/60 dark:text-white/60 text-micro">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                          BEST
                        </span>
                        <span>·</span>
                        <span className="opacity-60">
                          AVOID (주의/혹서/우기)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-2 sm:py-4">
              <span className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-satoshi tracking-tight leading-none uppercase text-black/80 dark:text-white/80">
                {currentYear}
              </span>
              <span className="text-xs sm:text-sm font-mono tracking-widest text-black/60 dark:text-white/60 mt-1 uppercase">
                ANNUAL CALENDAR
              </span>
            </div>
          )}
        </div>

        {/* Bottom Unified Controls Bar (모바일에서도 완벽하게 가로 1줄 단일행 정렬) */}
        <div className="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-4 pt-3 border-t border-black/5 dark:border-white/5 select-none">
          {/* Group 1: Navigation & View Mode Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 1. < TODAY > Navigation */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                type="button"
                onClick={viewMode === 'month' ? handlePrevMonth : () => setCurrentYear(prev => prev - 1)}
                className="tap-target w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface dark:bg-surface-dark hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                title={viewMode === 'month' ? "이전 달" : "이전 연도"}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                onClick={handleGoToday}
                className="h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-full bg-surface dark:bg-surface-dark hover:bg-black text-black dark:text-white hover:text-white dark:hover:bg-white dark:hover:text-black text-micro sm:text-xs font-bold font-mono tracking-wider active:scale-95 transition cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                title="오늘 날짜로 이동"
              >
                TODAY
              </button>

              <button
                type="button"
                onClick={viewMode === 'month' ? handleNextMonth : () => setCurrentYear(prev => prev + 1)}
                className="tap-target w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface dark:bg-surface-dark hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                title={viewMode === 'month' ? "다음 달" : "다음 연도"}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* 2. [ MONTH | YEAR ] View Mode Switcher */}
            <div className="h-7 sm:h-8 flex items-center p-0.5 bg-black/[0.06] dark:bg-white/10 rounded-full font-mono text-micro sm:text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => toggleViewMode('month')}
                className={`h-full px-1.5 sm:px-2.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'month'
                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
                title="월별 보기로 전환"
              >
                <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">MONTH</span>
                <span className="inline sm:hidden">M</span>
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('year')}
                className={`h-full px-1.5 sm:px-2.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'year'
                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
                title="연간 보기로 전환"
              >
                <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">YEAR</span>
                <span className="inline sm:hidden">Y</span>
              </button>
            </div>
          </div>

          {/* Group 2: Action Tools (Weather, Edit, New Trip - 모바일 1줄 최적화) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 2.5 Weather Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsWeatherMode(prev => !prev)}
              className={`tap-target w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
                isWeatherMode
                  ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20'
                  : 'bg-white/80 dark:bg-zinc-900/80 border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
              }`}
              title={isWeatherMode ? "날씨 모드 끄기" : "날씨 모드 켜기 (캘린더에 일별 날씨/기온 표시)"}
            >
              <Sun className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWeatherMode ? 'text-amber-400 dark:text-amber-500' : ''}`} />
            </button>

            {/* 2.6 Weather Background Ambience Toggle (When Weather Mode is ON) */}
            {isWeatherMode && (
              <button
                type="button"
                onClick={toggleWeatherBg}
                className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-full border text-meta sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs ${
                  isWeatherBgEnabled
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-white/80 dark:bg-zinc-900/80 border-black/15 dark:border-white/15 text-black/60 dark:text-white/60'
                }`}
                title={isWeatherBgEnabled ? "날씨 배경 애니메이션 끄기" : "날씨 배경 애니메이션 켜기 (비/눈/햇살 모션)"}
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">{isWeatherBgEnabled ? 'BG: ON' : 'BG: OFF'}</span>
              </button>
            )}

            {/* 3. Edit Mode Toggle Button - 모바일에서는 아이콘만 컴팩트 노출 */}
            {viewMode === 'month' && (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(prev => {
                    const next = !prev;
                    if (!next) {
                      setSelectedRange(null);
                    }
                    return next;
                  });
                }}
                className={`w-7 h-7 sm:w-auto sm:h-8 sm:px-3 rounded-full border text-meta sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center sm:gap-1.5 shrink-0 shadow-xs ${
                  isEditMode
                    ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-600/30'
                    : 'bg-white/80 dark:bg-zinc-900/80 border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                }`}
                title={isEditMode ? "편집 모드 활성 (클릭 시 조회 전용 모드로 전환)" : "편집 모드 켜기 (날짜 선택 및 일정 등록)"}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isEditMode ? 'EDIT: ON' : 'EDIT'}
                </span>
                {isEditMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping hidden sm:inline-block" />}
              </button>
            )}

            {/* New trip for this month (icon only on phones, pill like the rest of this toolbar) */}
            {onCreateTrip && (
              <NewTripButton
                size="sm"
                compact
                className="rounded-full max-sm:!h-7 max-sm:!w-7"
                title="이 달을 기준으로 새로운 트립 생성"
                onClick={() => {
                  const mm = String(currentMonth + 1).padStart(2, '0');
                  onCreateTrip(`${currentYear}-${mm}-01`);
                }}
              />
            )}
          </div>
        </div>

        {/* Weather Forecast City Selector Bar - App Style Minimal Pill Chips */}
        {isWeatherMode && (
          <div className="w-full flex items-center gap-1.5 sm:gap-2 py-2 border-b border-black/10 dark:border-white/10 select-none animate-in fade-in duration-150">
            {/* Left Location Indicator with Live Weather Motion */}
            <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-black/15 dark:border-white/15 text-[11px] font-mono font-extrabold text-black dark:text-white uppercase tracking-wider">
              {cityWeatherData ? (() => {
                const todayPop = cityWeatherData.forecast?.[0]?.precipitationProb ?? 0;
                const meta = getWeatherMeta(cityWeatherData.weatherCode, todayPop);
                const IconComp = meta.icon;
                const isRainy = (cityWeatherData.weatherCode >= 51 && cityWeatherData.weatherCode <= 67) || (cityWeatherData.weatherCode >= 80 && cityWeatherData.weatherCode <= 82) || (todayPop >= 55);
                return (
                  <span className="flex items-center gap-1">
                    <IconComp className={`w-3.5 h-3.5 ${meta.colorClass} ${isRainy ? 'animate-bounce' : 'animate-pulse'}`} />
                    <span>{cityWeatherData.temp}°</span>
                  </span>
                );
              })() : (
                <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              )}
              <span>{cleanCityDisplayName(selectedWeatherCity.name)}</span>
              <span className="text-micro font-normal text-black/60 dark:text-white/60 hidden sm:inline">
                ({selectedWeatherCity.country})
              </span>
            </div>

            {/* Left Scroll Arrow Button */}
            <button
              type="button"
              onClick={scrollChipsLeft}
              disabled={!canScrollChipsLeft}
              className={`tap-target w-6 h-6 rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center shrink-0 transition-all ${
                canScrollChipsLeft
                  ? 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shadow-2xs'
                  : 'opacity-20 text-black/60 dark:text-white/60 cursor-not-allowed border-transparent'
              }`}
              title="이전 지역 보기"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* App-style Pill Chips Scroll */}
            <div
              ref={weatherChipsRef}
              className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1 py-0.5 scroll-smooth"
            >
              {weatherCities.map((c) => {
                const isSelected = selectedWeatherCity.nameEn.toUpperCase() === c.nameEn.toUpperCase();
                const displayName = cleanCityDisplayName(c.name);
                return (
                  <button
                    key={c.nameEn}
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className={`h-6 px-2.5 rounded-full text-meta sm:text-meta font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center shadow-2xs ${
                      isSelected
                        ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark font-extrabold'
                        : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black/70 dark:text-white/70'
                    }`}
                    title={`${displayName} (${c.nameEn})`}
                  >
                    <span>{displayName}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Scroll Arrow Button */}
            <button
              type="button"
              onClick={scrollChipsRight}
              disabled={!canScrollChipsRight}
              className={`tap-target w-6 h-6 rounded-full border border-black/15 dark:border-white/15 flex items-center justify-center shrink-0 transition-all ${
                canScrollChipsRight
                  ? 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shadow-2xs'
                  : 'opacity-20 text-black/60 dark:text-white/60 cursor-not-allowed border-transparent'
              }`}
              title="다음 지역 보기"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

    </>
  );
}
