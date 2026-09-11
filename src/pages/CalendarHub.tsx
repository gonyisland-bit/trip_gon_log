import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Clock, ArrowRight, Plane, Sparkles, Compass, 
  CheckCircle2, ArrowUpRight, Plus, Eye
} from 'lucide-react';
import { Trip, Plan, TimelineData, TimelineItem } from '../types';
import { getKoreanHolidays, getHolidayInfo, KoreanHoliday } from '../utils/koreanHolidays';
import { getEffectiveImageUrl } from '../utils/storageHelper';

interface CalendarHubPageProps {
  trips: Trip[];
  plans: Plan[];
  timelineData?: TimelineData;
  onNavigate: (view: string, tripId?: number | null) => void;
  isDarkMode?: boolean;
}

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface DayCellData {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0: Mon, ..., 6: Sun
  holiday: KoreanHoliday | null;
  overlappingTrips: {
    trip: Trip | Plan;
    isPlan: boolean;
    isStart: boolean;
    isEnd: boolean;
    dayIndex: number;
    totalDays: number;
  }[];
}

// 날짜 범위 파싱 헬퍼: '2026.09.24 - 2026.09.28' -> { start: '2026-09-24', end: '2026-09-28' }
function parseTripDateRange(dateStr: string): { start: string; end: string } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(p => p.trim().replace(/\./g, '-'));
  if (parts.length === 1) {
    return { start: parts[0], end: parts[0] };
  }
  if (parts.length >= 2) {
    let start = parts[0];
    let end = parts[1];
    // 만약 end가 MM-DD 형태로만 되어 있다면 시작일의 연도 적용
    if (end.length <= 5) {
      const year = start.slice(0, 4);
      end = `${year}-${end}`;
    }
    return { start, end };
  }
  return null;
}

// 두 날짜 사이의 일수 계산
function getDaysDifference(startStr: string, endStr: string): number {
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function CalendarHubPage({
  trips,
  plans,
  timelineData,
  onNavigate,
  isDarkMode = false
}: CalendarHubPageProps) {
  const today = useMemo(() => new Date(), []);
  
  // 외부에서 특정 날짜로 포커스 진입했는지 확인
  const initialFocus = useMemo(() => {
    try {
      const stored = sessionStorage.getItem('calendar_target_date');
      if (stored) {
        sessionStorage.removeItem('calendar_target_date');
        const [y, m, d] = stored.replace(/\./g, '-').split('-').map(Number);
        if (y && m) {
          return { year: y, month: m - 1, dateStr: stored.replace(/\./g, '-') };
        }
      }
    } catch (_) {}
    return { year: today.getFullYear(), month: today.getMonth(), dateStr: null };
  }, [today]);

  const [currentYear, setCurrentYear] = useState<number>(initialFocus.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialFocus.month); // 0 ~ 11
  const [isEditingYear, setIsEditingYear] = useState<boolean>(false);
  const [yearInputVal, setYearInputVal] = useState<string>(String(initialFocus.year));
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(initialFocus.dateStr);

  const yearInputRef = useRef<HTMLInputElement>(null);

  // 현재 연도의 한국 공휴일 계산 (메모이제이션)
  const currentHolidays = useMemo(() => {
    return getKoreanHolidays(currentYear);
  }, [currentYear]);

  // 이전/다음 달 전환 핸들러
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDateStr(todayStr);
  };

  // 직접 연도 입력 커밋
  const handleYearSubmit = () => {
    const parsed = parseInt(yearInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1990 && parsed <= 2100) {
      setCurrentYear(parsed);
    } else {
      setYearInputVal(String(currentYear));
    }
    setIsEditingYear(false);
  };

  useEffect(() => {
    setYearInputVal(String(currentYear));
  }, [currentYear]);

  useEffect(() => {
    if (isEditingYear && yearInputRef.current) {
      yearInputRef.current.focus();
      yearInputRef.current.select();
    }
  }, [isEditingYear]);

  // 키보드 단축키 (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 인풋 필드 입력 중일 때는 무시
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevMonth();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextMonth();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleGoToday();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth, currentYear]);

  // 모든 여정(Archive)과 계획(Plan)을 파싱하여 정렬
  const parsedJourneys = useMemo(() => {
    const all = [
      ...trips.map(t => ({ ...t, isPlan: false })),
      ...plans.map(p => ({ ...p, isPlan: true }))
    ];

    return all.map(j => {
      const range = parseTripDateRange(j.date);
      return {
        journey: j,
        isPlan: j.isPlan,
        range,
      };
    }).filter(item => item.range !== null) as {
      journey: Trip | Plan;
      isPlan: boolean;
      range: { start: string; end: string };
    }[];
  }, [trips, plans]);

  // 현재 월의 7열 그리드 셀 데이터 생성
  const calendarGrid = useMemo(() => {
    const cells: DayCellData[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // 0: Mon, 1: Tue, ..., 6: Sun (월요일 시작 기준)
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // 이전 달 패딩 일수
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (prevDate.getDay() + 6) % 7;
      
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek,
        holiday: currentHolidays.get(dateStr) || null,
        overlappingTrips: []
      });
    }

    // 당월 일수
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const currDate = new Date(currentYear, currentMonth, d);
      const dayOfWeek = (currDate.getDay() + 6) % 7;
      const isToday = (currentYear === todayY && currentMonth === todayM && d === todayD);

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        dayOfWeek,
        holiday: currentHolidays.get(dateStr) || null,
        overlappingTrips: []
      });
    }

    // 다음 달 패딩 일수 (총 35개 또는 42개 셀로 채움)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (nextDate.getDay() + 6) % 7;

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek,
        holiday: getHolidayInfo(dateStr),
        overlappingTrips: []
      });
    }

    // 각 셀에 겹치는 여행 리본 밴드 계산
    cells.forEach(cell => {
      parsedJourneys.forEach(({ journey, isPlan, range }) => {
        if (cell.dateStr >= range.start && cell.dateStr <= range.end) {
          const isStart = cell.dateStr === range.start;
          const isEnd = cell.dateStr === range.end;
          const totalDays = getDaysDifference(range.start, range.end);
          const dayIndex = getDaysDifference(range.start, cell.dateStr);

          cell.overlappingTrips.push({
            trip: journey,
            isPlan,
            isStart,
            isEnd,
            dayIndex,
            totalDays
          });
        }
      });
    });

    return cells;
  }, [currentYear, currentMonth, currentHolidays, parsedJourneys, today]);

  // 이번 달 여행 통계
  const monthStats = useMemo(() => {
    const currentMonthCells = calendarGrid.filter(c => c.isCurrentMonth);
    const travelDaysCount = currentMonthCells.filter(c => c.overlappingTrips.length > 0).length;
    const uniqueTrips = new Set(currentMonthCells.flatMap(c => c.overlappingTrips.map(t => t.trip.id)));
    
    return {
      travelDays: travelDaysCount,
      tripCount: uniqueTrips.size
    };
  }, [calendarGrid]);

  // 날짜 클릭 시 해당 날짜의 여행으로 이동 또는 날짜 선택
  const handleDateClick = (cell: DayCellData) => {
    setSelectedDateStr(cell.dateStr);
    
    // 만약 해당 날짜에 단 하나의 여정만 있는 경우 바로 상세로 이동할 수도 있음
    if (cell.overlappingTrips.length === 1) {
      const targetTrip = cell.overlappingTrips[0].trip;
      const targetDateKey = cell.dateStr.replace(/-/g, '.');
      try {
        sessionStorage.setItem('pending_detail_jump', JSON.stringify({
          tab: 'timeline',
          date: targetDateKey,
        }));
      } catch (_) {}
      onNavigate('detail', targetTrip.id);
    }
  };

  // 특정 여정 클릭 시 상세 페이지로 이동
  const handleTripBandClick = (e: React.MouseEvent, trip: Trip | Plan, dateStr: string) => {
    e.stopPropagation();
    const targetDateKey = dateStr.replace(/-/g, '.');
    try {
      sessionStorage.setItem('pending_detail_jump', JSON.stringify({
        tab: 'timeline',
        date: targetDateKey,
      }));
    } catch (_) {}
    onNavigate('detail', trip.id);
  };

  // 선택된 날짜의 데이터 (모바일 바텀 시트 또는 상세 프리뷰용)
  const selectedCell = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarGrid.find(c => c.dateStr === selectedDateStr) || null;
  }, [selectedDateStr, calendarGrid]);

  return (
    <div className="w-full min-h-screen bg-[#FAF9F5] dark:bg-[#0A0A0A] text-black dark:text-white transition-colors duration-300 select-none pb-24">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Top Banner & Swiss Minimal Typography Header                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Left: Giant Typography Year & Month */}
          <div>
            <div className="flex items-center gap-3 mb-1 text-red-600 dark:text-red-500 font-bold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
              <CalendarIcon className="w-4 h-4" />
              <span>CALENDAR ARCHIVE · {MONTH_SHORT[currentMonth]}</span>
            </div>

            <div className="flex items-baseline gap-4 sm:gap-6 flex-wrap">
              {/* Year Selector / Inline Editable */}
              {isEditingYear ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleYearSubmit(); }}
                  className="inline-flex items-center"
                >
                  <input
                    ref={yearInputRef}
                    type="number"
                    value={yearInputVal}
                    onChange={(e) => setYearInputVal(e.target.value)}
                    onBlur={handleYearSubmit}
                    min="1990"
                    max="2100"
                    className="text-5xl sm:text-7xl lg:text-8xl font-black font-satoshi tracking-tighter bg-black/5 dark:bg-white/10 px-2 rounded-sm border-2 border-red-600 outline-none w-44 sm:w-60"
                  />
                </form>
              ) : (
                <h1
                  onClick={() => setIsEditingYear(true)}
                  className="text-5xl sm:text-7xl lg:text-8xl font-black font-satoshi tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center group leading-none"
                  title="클릭하여 연도 직접 입력"
                >
                  <span>{currentYear}</span>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    (EDIT)
                  </span>
                </h1>
              )}

              {/* Month Display */}
              <div className="flex flex-col">
                <span className="text-2xl sm:text-4xl lg:text-5xl font-black font-satoshi tracking-tight leading-none uppercase text-black/80 dark:text-white/80">
                  {MONTH_NAMES[currentMonth]}
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-black/40 dark:text-white/40 tracking-widest mt-1">
                  MONTH {String(currentMonth + 1).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Month Controls & Summary Metrics */}
          <div className="flex flex-col items-start md:items-end gap-3.5">
            {/* Quick Month Navigation Buttons (ChevronLeft / ChevronRight / TODAY) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 sm:p-2.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center"
                title="이전 달 (← 화살표)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleGoToday}
                className="px-3.5 py-1.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black text-black dark:text-white hover:text-white dark:hover:bg-white dark:hover:text-black text-xs font-bold font-mono tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs"
                title="오늘 날짜로 이동 (T)"
              >
                TODAY
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 sm:p-2.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center"
                title="다음 달 (→ 화살표)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Travel Metrics Badge */}
            <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold tracking-wider text-black/60 dark:text-white/60">
              <span className="px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-sm border border-black/10 dark:border-white/10">
                ✈️ {monthStats.travelDays} DAYS OF TRAVEL
              </span>
              <span className="px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-sm border border-black/10 dark:border-white/10">
                📌 {monthStats.tripCount} JOURNEYS
              </span>
            </div>
          </div>
        </div>

        {/* 12-Month Quick Selector Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto hide-scrollbar mt-6 pt-4 border-t border-black/5 dark:border-white/5 select-none">
          {MONTH_SHORT.map((mShort, idx) => {
            const isActive = currentMonth === idx;
            return (
              <button
                key={mShort}
                type="button"
                onClick={() => setCurrentMonth(idx)}
                className={`flex-1 min-w-[50px] sm:min-w-[62px] py-1.5 rounded-xs text-[10.5px] sm:text-xs font-black font-mono tracking-wider transition-all cursor-pointer text-center ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs scale-105'
                    : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                }`}
              >
                {mShort}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7-Column Calendar Grid                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Weekday Header Row */}
        <div className="grid grid-cols-7 border-b border-black/20 dark:border-white/20 pb-2 text-center text-xs sm:text-sm font-black tracking-widest font-mono select-none">
          {WEEKDAYS.map((day, idx) => {
            const isSunday = idx === 6;
            const isSaturday = idx === 5;
            return (
              <div 
                key={day} 
                className={`py-1 ${
                  isSunday 
                    ? 'text-red-600 dark:text-red-500 font-black' 
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

        {/* Day Grid Cells */}
        <div className="grid grid-cols-7 border-l border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#111111] shadow-sm rounded-b-sm overflow-hidden">
          {calendarGrid.map((cell) => {
            const isSunday = cell.dayOfWeek === 6;
            const isSaturday = cell.dayOfWeek === 5;
            const isHoliday = !!cell.holiday;
            const isSelected = selectedDateStr === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                onClick={() => handleDateClick(cell)}
                className={`min-h-[105px] sm:min-h-[125px] md:min-h-[140px] p-1.5 sm:p-2 border-r border-b border-black/10 dark:border-white/10 flex flex-col justify-between transition-colors relative cursor-pointer group ${
                  !cell.isCurrentMonth
                    ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-40'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                } ${
                  isSelected ? 'ring-2 ring-inset ring-red-600 dark:ring-red-500' : ''
                }`}
              >
                {/* Top: Day Number & Holiday Tag */}
                <div className="flex items-start justify-between gap-1 w-full">
                  {/* Day Number */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs sm:text-sm md:text-base font-black font-mono leading-none tracking-tighter ${
                        cell.isToday
                          ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs'
                          : isSunday || isHoliday
                            ? 'text-red-600 dark:text-red-500'
                            : isSaturday
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-black/80 dark:text-white/80'
                      }`}
                    >
                      {cell.dayNum < 10 ? `0${cell.dayNum}` : cell.dayNum}
                    </span>
                    {cell.isToday && (
                      <span className="hidden sm:inline-block text-[8px] font-black uppercase text-red-600 font-mono tracking-tighter">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Public Holiday Tag */}
                  {cell.holiday && (
                    <span
                      className="text-[8.5px] sm:text-[9.5px] font-bold text-red-600 dark:text-red-400 font-sans tracking-tight truncate max-w-[85px] sm:max-w-[110px] text-right"
                      title={cell.holiday.name}
                    >
                      {cell.holiday.name}
                    </span>
                  )}
                </div>

                {/* Middle / Bottom: Overlapping Trip Ribbon Bands */}
                <div className="mt-1.5 space-y-1 w-full flex-grow flex flex-col justify-end">
                  {cell.overlappingTrips.map(({ trip, isPlan, isStart, isEnd, dayIndex, totalDays }) => {
                    const isSingleDay = isStart && isEnd;

                    return (
                      <button
                        key={trip.id}
                        type="button"
                        onClick={(e) => handleTripBandClick(e, trip, cell.dateStr)}
                        className={`w-full text-left text-[9.5px] sm:text-[10.5px] py-0.5 sm:py-1 px-1.5 transition-all truncate block select-none group/band shadow-2xs cursor-pointer ${
                          isStart && isEnd
                            ? 'rounded-md'
                            : isStart
                              ? 'rounded-l-md mr-0'
                              : isEnd
                                ? 'rounded-r-md ml-0'
                                : 'rounded-none'
                        } ${
                          isPlan
                            ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-dashed border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-[#18181B] dark:bg-white text-white dark:text-black hover:opacity-90 font-bold'
                        }`}
                        title={`${trip.title} (DAY ${dayIndex}/${totalDays})`}
                      >
                        <div className="flex items-center gap-1 w-full min-w-0">
                          {isStart && (
                            <Plane className="w-2.5 h-2.5 shrink-0 rotate-45 opacity-80" />
                          )}
                          <span className="font-bold truncate tracking-tight font-sans">
                            {isStart ? trip.title : `DAY ${dayIndex}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Selected Date Detail Drawer (Mobile & Desktop Preview)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedCell && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 animate-in slide-in-from-bottom-3 duration-200">
          <div className="p-4 sm:p-5 rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Date info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {selectedCell.dateStr.replace(/-/g, '.')}
                </span>
                {selectedCell.holiday && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                    {selectedCell.holiday.name}
                  </span>
                )}
                {selectedCell.isToday && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-black text-white dark:bg-white dark:text-black rounded-full">
                    TODAY
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-1 font-medium">
                {selectedCell.overlappingTrips.length > 0 
                  ? `총 ${selectedCell.overlappingTrips.length}개의 여정이 진행 중인 날짜입니다.`
                  : '등록된 여정이 없는 날입니다.'}
              </p>
            </div>

            {/* Right: Journey Cards for this Day */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCell.overlappingTrips.map(({ trip, isPlan, dayIndex, totalDays }) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={(e) => handleTripBandClick(e, trip, selectedCell.dateStr)}
                  className="px-3.5 py-2 rounded-sm border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all text-xs font-bold flex items-center gap-2 cursor-pointer group"
                >
                  <span className="font-mono text-red-600 dark:text-red-400">
                    DAY {dayIndex}/{totalDays}
                  </span>
                  <span className="font-bold truncate max-w-[160px]">{trip.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
