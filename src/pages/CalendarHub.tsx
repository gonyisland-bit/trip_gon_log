import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Clock, ArrowRight, Plane, Sparkles, Compass, 
  CheckCircle2, ArrowUpRight, Plus, Eye, Briefcase, Heart, 
  User, AlertCircle, Trash2, Edit3, X, Tag, FileText, Check
} from 'lucide-react';
import { Trip, Plan, TimelineData, TimelineItem, CalendarCustomEvent } from '../types';
import { getKoreanHolidays, getHolidayInfo, KoreanHoliday } from '../utils/koreanHolidays';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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

const EVENT_CATEGORIES = [
  { id: 'work', label: '출장/업무', icon: Briefcase, color: '#2563eb', badgeClass: 'bg-blue-600 text-white' },
  { id: 'family', label: '가족/경조사', icon: Heart, color: '#e11d48', badgeClass: 'bg-rose-600 text-white' },
  { id: 'personal', label: '개인/휴식', icon: User, color: '#059669', badgeClass: 'bg-emerald-600 text-white' },
  { id: 'blocked', label: '일정불가/참조', icon: AlertCircle, color: '#4b5563', badgeClass: 'bg-zinc-700 text-white' },
] as const;

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
  overlappingEvents: {
    event: CalendarCustomEvent;
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

// 두 날짜 문자열 정규화 ({ start: min, end: max })
function normalizeRange(d1: string, d2: string): { start: string; end: string } {
  return d1 <= d2 ? { start: d1, end: d2 } : { start: d2, end: d1 };
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

  // 복수 날짜 선택 범위 상태 (단일 날짜 선택 시 start === end)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(() => {
    if (initialFocus.dateStr) {
      return { start: initialFocus.dateStr, end: initialFocus.dateStr };
    }
    return null;
  });
  const [dragAnchorDate, setDragAnchorDate] = useState<string | null>(initialFocus.dateStr);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 커스텀 사용자 등록 일정 상태
  const [customEvents, setCustomEvents] = useState<CalendarCustomEvent[]>(() => {
    try {
      const saved = localStorage.getItem('custom_calendar_events');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // 일정 등록/수정 모달 상태
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarCustomEvent | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState<string>('');
  const [eventFormStartDate, setEventFormStartDate] = useState<string>('');
  const [eventFormEndDate, setEventFormEndDate] = useState<string>('');
  const [eventFormIsRange, setEventFormIsRange] = useState<boolean>(false);
  const [eventFormCategory, setEventFormCategory] = useState<'work' | 'family' | 'personal' | 'blocked'>('work');
  const [eventFormMemo, setEventFormMemo] = useState<string>('');

  const yearInputRef = useRef<HTMLInputElement>(null);

  // Firestore 동기화 (users/public/calendar_events)
  useEffect(() => {
    try {
      const colRef = collection(db, 'users', 'public', 'calendar_events');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const eventsList: CalendarCustomEvent[] = [];
        snapshot.forEach((docSnap) => {
          eventsList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (eventsList.length > 0 || snapshot.metadata.fromCache === false) {
          setCustomEvents(eventsList);
          try {
            localStorage.setItem('custom_calendar_events', JSON.stringify(eventsList));
          } catch (_) {}
        }
      }, (err) => {
        console.warn("Firestore calendar_events sync error, using local data", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase snapshot listener setup failed", e);
    }
  }, []);

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
    setSelectedRange({ start: todayStr, end: todayStr });
    setDragAnchorDate(todayStr);
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

  // 키보드 좌우 화살표로 달 전환
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingYear || isEventModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
  }, [currentMonth, currentYear, isEditingYear, isEventModalOpen]);

  // 전역 마우스업 리스너 (드래그 종료)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // 모든 여정(Archive)과 계획(Plan) 파싱
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
        overlappingTrips: [],
        overlappingEvents: []
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
        overlappingTrips: [],
        overlappingEvents: []
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
        overlappingTrips: [],
        overlappingEvents: []
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

      // 각 셀에 겹치는 사용자 커스텀 일정 계산
      customEvents.forEach((evt) => {
        const start = evt.startDate;
        const end = evt.endDate || evt.startDate;
        if (cell.dateStr >= start && cell.dateStr <= end) {
          const isStart = cell.dateStr === start;
          const isEnd = cell.dateStr === end;
          const totalDays = getDaysDifference(start, end);
          const dayIndex = getDaysDifference(start, cell.dateStr);

          cell.overlappingEvents.push({
            event: evt,
            isStart,
            isEnd,
            dayIndex,
            totalDays
          });
        }
      });
    });

    return cells;
  }, [currentYear, currentMonth, currentHolidays, parsedJourneys, customEvents, today]);

  // 이번 달 여행 및 일정 통계
  const monthStats = useMemo(() => {
    const currentMonthCells = calendarGrid.filter(c => c.isCurrentMonth);
    const travelDaysCount = currentMonthCells.filter(c => c.overlappingTrips.length > 0).length;
    const uniqueTrips = new Set(currentMonthCells.flatMap(c => c.overlappingTrips.map(t => t.trip.id)));
    const blockedDaysCount = currentMonthCells.filter(c => c.overlappingEvents.length > 0).length;
    
    return {
      travelDays: travelDaysCount,
      tripCount: uniqueTrips.size,
      blockedDays: blockedDaysCount
    };
  }, [calendarGrid]);

  // 날짜 셀 클릭 핸들러 (단일 클릭 및 Shift + 클릭 복수 선택 지원)
  const handleCellClick = (cell: DayCellData, e: React.MouseEvent) => {
    if (e.shiftKey && dragAnchorDate) {
      const newRange = normalizeRange(dragAnchorDate, cell.dateStr);
      setSelectedRange(newRange);
    } else {
      setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
      setDragAnchorDate(cell.dateStr);
    }
  };

  // 마우스 드래그 시작
  const handleCellMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    setIsDragging(true);
    setDragAnchorDate(dateStr);
    setSelectedRange({ start: dateStr, end: dateStr });
  };

  // 마우스 호버 시 드래그 범위 확장
  const handleCellMouseEnter = (dateStr: string) => {
    if (!isDragging || !dragAnchorDate) return;
    setSelectedRange(normalizeRange(dragAnchorDate, dateStr));
  };

  // 모바일 터치 드래그 시작
  const handleCellTouchStart = (dateStr: string) => {
    setIsDragging(true);
    setDragAnchorDate(dateStr);
    setSelectedRange({ start: dateStr, end: dateStr });
  };

  // 모바일 터치 이동 (화면 좌표 기반 셀 탐색)
  const handleGridTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragAnchorDate) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellEl = targetEl?.closest('[data-calendar-date]') as HTMLElement | null;
    if (cellEl && cellEl.dataset.calendarDate) {
      const targetDate = cellEl.dataset.calendarDate;
      setSelectedRange(normalizeRange(dragAnchorDate, targetDate));
    }
  };

  const handleGridTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
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

  // 커스텀 일정 클릭 시 편집 모달 오픈
  const handleCustomEventClick = (e: React.MouseEvent, evt: CalendarCustomEvent) => {
    e.stopPropagation();
    openEditEventModal(evt);
  };

  // 새 일정 등록 모달 열기 (시작일~종료일 자동 반영)
  const openNewEventModal = (startDate?: string, endDate?: string) => {
    const s = startDate || selectedRange?.start || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const e = endDate || selectedRange?.end || s;
    const isRange = s !== e;

    setEditingEvent(null);
    setEventFormTitle('');
    setEventFormStartDate(s);
    setEventFormEndDate(e);
    setEventFormIsRange(isRange);
    setEventFormCategory('work');
    setEventFormMemo('');
    setIsEventModalOpen(true);
  };

  // 기존 일정 수정 모달 열기
  const openEditEventModal = (evt: CalendarCustomEvent) => {
    setEditingEvent(evt);
    setEventFormTitle(evt.title);
    setEventFormStartDate(evt.startDate);
    setEventFormEndDate(evt.endDate || evt.startDate);
    setEventFormIsRange(evt.startDate !== evt.endDate);
    setEventFormCategory(evt.category || 'work');
    setEventFormMemo(evt.memo || '');
    setIsEventModalOpen(true);
  };

  // 모달 닫기
  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  // 일정 저장 (생성 또는 업데이트)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormTitle.trim() || !eventFormStartDate) return;

    const startDate = eventFormStartDate;
    const endDate = eventFormIsRange ? (eventFormEndDate >= startDate ? eventFormEndDate : startDate) : startDate;

    const eventId = editingEvent ? editingEvent.id : `evt_${Date.now()}`;
    const newEvent: CalendarCustomEvent = {
      id: eventId,
      title: eventFormTitle.trim(),
      startDate,
      endDate,
      category: eventFormCategory,
      memo: eventFormMemo.trim() || undefined,
      createdAt: editingEvent ? editingEvent.createdAt : Date.now()
    };

    // 로컬 상태 즉시 반영
    setCustomEvents(prev => {
      const filtered = prev.filter(item => item.id !== eventId);
      const next = [...filtered, newEvent];
      try {
        localStorage.setItem('custom_calendar_events', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // Firestore 영구 저장
    try {
      const docRef = doc(db, 'users', 'public', 'calendar_events', eventId);
      await setDoc(docRef, newEvent);
    } catch (err) {
      console.warn("Firestore save event failed, local cache preserved", err);
    }

    closeEventModal();
  };

  // 일정 삭제
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) return;

    setCustomEvents(prev => {
      const next = prev.filter(item => item.id !== eventId);
      try {
        localStorage.setItem('custom_calendar_events', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    try {
      const docRef = doc(db, 'users', 'public', 'calendar_events', eventId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Firestore delete event failed, local cache updated", err);
    }

    if (editingEvent && editingEvent.id === eventId) {
      closeEventModal();
    }
  };

  // 선택된 범위에 포함된 날짜들의 데이터
  const selectedCells = useMemo(() => {
    if (!selectedRange) return [];
    return calendarGrid.filter(c => c.dateStr >= selectedRange.start && c.dateStr <= selectedRange.end);
  }, [selectedRange, calendarGrid]);

  const isMultiDaySelected = selectedRange && selectedRange.start !== selectedRange.end;
  const selectedDaysCount = selectedRange ? getDaysDifference(selectedRange.start, selectedRange.end) : 0;

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

          {/* Right: Month Controls, Add Event & Summary Metrics */}
          <div className="flex flex-col items-start md:items-end gap-3.5">
            {/* Quick Month Navigation Buttons + Add Schedule Button */}
            <div className="flex items-center gap-2 flex-wrap">
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

              <button
                type="button"
                onClick={() => openNewEventModal()}
                className="ml-1 sm:ml-2 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                title="출장/생신/개인 일정 등록"
              >
                <Plus className="w-4 h-4" />
                <span>ADD SCHEDULE</span>
              </button>
            </div>

            {/* Monthly Travel & Blocked Metrics Badge */}
            <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs font-bold tracking-wider text-black/60 dark:text-white/60 flex-wrap">
              <span className="px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-sm border border-black/10 dark:border-white/10">
                ✈️ {monthStats.travelDays} DAYS OF TRAVEL
              </span>
              <span className="px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-sm border border-black/10 dark:border-white/10">
                📌 {monthStats.tripCount} JOURNEYS
              </span>
              {monthStats.blockedDays > 0 && (
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-sm border border-blue-500/20">
                  💼 {monthStats.blockedDays} BLOCKED DAYS
                </span>
              )}
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
        {/* Selection Helper Info Bar */}
        <div className="flex items-center justify-between pb-2 text-[11px] font-mono text-black/50 dark:text-white/50">
          <span>
            💡 <strong className="text-black dark:text-white">팁:</strong> 날짜를 드래그하거나 <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">Shift</kbd>를 누른 채 클릭하면 기간을 한 번에 선택할 수 있습니다.
          </span>
          {isMultiDaySelected && (
            <span className="text-red-600 dark:text-red-400 font-bold animate-in fade-in">
              {selectedRange?.start} ~ {selectedRange?.end} ({selectedDaysCount}일 선택됨)
            </span>
          )}
        </div>

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

        {/* Day Grid Cells with Drag & Multi-Select Support */}
        <div 
          onTouchMove={handleGridTouchMove}
          onTouchEnd={handleGridTouchEnd}
          className="grid grid-cols-7 border-l border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#111111] shadow-sm rounded-b-sm overflow-hidden select-none"
        >
          {calendarGrid.map((cell) => {
            const isSunday = cell.dayOfWeek === 6;
            const isSaturday = cell.dayOfWeek === 5;
            const isHoliday = !!cell.holiday;

            const isInRange = selectedRange && cell.dateStr >= selectedRange.start && cell.dateStr <= selectedRange.end;
            const isRangeStart = selectedRange && cell.dateStr === selectedRange.start;
            const isRangeEnd = selectedRange && cell.dateStr === selectedRange.end;

            return (
              <div
                key={cell.dateStr}
                data-calendar-date={cell.dateStr}
                onClick={(e) => handleCellClick(cell, e)}
                onMouseDown={(e) => handleCellMouseDown(cell.dateStr, e)}
                onMouseEnter={() => handleCellMouseEnter(cell.dateStr)}
                onTouchStart={() => handleCellTouchStart(cell.dateStr)}
                className={`min-h-[115px] sm:min-h-[135px] md:min-h-[150px] p-1.5 sm:p-2 border-r border-b border-black/10 dark:border-white/10 flex flex-col justify-between transition-colors relative cursor-pointer group ${
                  !cell.isCurrentMonth
                    ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-40'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                } ${
                  isInRange 
                    ? 'bg-red-500/10 dark:bg-red-500/15 ring-2 ring-inset ring-red-600 dark:ring-red-500' 
                    : ''
                }`}
              >
                {/* Floating "+ ADD" Quick Action Badge on Selected End Date Cell */}
                {isRangeEnd && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openNewEventModal(selectedRange.start, selectedRange.end);
                    }}
                    className="absolute -top-2.5 right-1.5 z-30 px-2 py-0.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-mono text-[9px] sm:text-[10px] font-black tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                    title="선택한 기간으로 새 일정 등록"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                    <span>{isMultiDaySelected ? `ADD (${selectedDaysCount}D)` : 'ADD'}</span>
                  </button>
                )}

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

                {/* Middle / Bottom: Overlapping Bands (Trips & Custom Events) */}
                <div className="mt-1.5 space-y-1 w-full flex-grow flex flex-col justify-end">
                  {/* 1. Travel Journeys (Solid / Plan Ribbon) */}
                  {cell.overlappingTrips.map(({ trip, isPlan, isStart, isEnd, dayIndex, totalDays }) => {
                    return (
                      <button
                        key={`trip-${trip.id}`}
                        type="button"
                        onClick={(e) => handleTripBandClick(e, trip, cell.dateStr)}
                        className={`w-full text-left text-[9px] sm:text-[10px] py-0.5 sm:py-1 px-1.5 transition-all truncate block select-none group/band shadow-2xs cursor-pointer ${
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

                  {/* 2. Custom Blocked / Reference Events (Diagonal Striped Swiss Bands) */}
                  {cell.overlappingEvents.map(({ event, isStart, isEnd, dayIndex, totalDays }) => {
                    const categoryInfo = EVENT_CATEGORIES.find(c => c.id === event.category) || EVENT_CATEGORIES[0];
                    const isSingleDay = isStart && isEnd;

                    return (
                      <button
                        key={`event-${event.id}`}
                        type="button"
                        onClick={(e) => handleCustomEventClick(e, event)}
                        className={`w-full text-left text-[8.5px] sm:text-[9.5px] py-0.5 px-1.5 transition-all truncate block select-none shadow-2xs cursor-pointer border border-black/10 dark:border-white/10 ${
                          isSingleDay
                            ? 'rounded-md'
                            : isStart
                              ? 'rounded-l-md mr-0'
                              : isEnd
                                ? 'rounded-r-md ml-0'
                                : 'rounded-none'
                        } ${
                          event.category === 'work'
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                            : event.category === 'family'
                              ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                              : event.category === 'personal'
                                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200'
                        }`}
                        style={{
                          backgroundImage: isDarkMode
                            ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 8px)'
                            : 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)'
                        }}
                        title={`[${categoryInfo.label}] ${event.title} (클릭하여 수정/삭제)`}
                      >
                        <div className="flex items-center gap-1 w-full min-w-0">
                          {isStart && (
                            <categoryInfo.icon className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          )}
                          <span className="font-semibold truncate tracking-tight font-sans">
                            {isStart ? event.title : `${event.title} (${dayIndex}/${totalDays})`}
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
      {/* Selected Range Detail Drawer (Agenda Preview & Actions)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedRange && selectedCells.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 animate-in slide-in-from-bottom-3 duration-200">
          <div className="p-4 sm:p-5 rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] shadow-md flex flex-col gap-4">
            {/* Top row: Date header & Add button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {selectedRange.start === selectedRange.end
                    ? selectedRange.start.replace(/-/g, '.')
                    : `${selectedRange.start.replace(/-/g, '.')} ~ ${selectedRange.end.replace(/-/g, '.')}`}
                </span>
                {isMultiDaySelected && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-red-600 text-white rounded-full">
                    {selectedDaysCount} DAYS SELECTED
                  </span>
                )}
                {selectedCells.length === 1 && selectedCells[0].holiday && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                    {selectedCells[0].holiday.name}
                  </span>
                )}
                {selectedCells.length === 1 && selectedCells[0].isToday && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-black text-white dark:bg-white dark:text-black rounded-full">
                    TODAY
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openNewEventModal(selectedRange.start, selectedRange.end)}
                  className="px-3.5 py-1.5 rounded-sm bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isMultiDaySelected ? '선택 기간에 일정 등록' : '이 날짜에 일정 등록'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Content: 2-Column Split (Travel Journeys & Personal Schedules) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Travel Journeys in Range */}
              <div className="space-y-2">
                {(() => {
                  const uniqueTripsMap = new Map<number, { trip: Trip | Plan; isPlan: boolean }>();
                  selectedCells.forEach(cell => {
                    cell.overlappingTrips.forEach(t => {
                      if (!uniqueTripsMap.has(t.trip.id)) {
                        uniqueTripsMap.set(t.trip.id, { trip: t.trip, isPlan: t.isPlan });
                      }
                    });
                  });
                  const tripsList = Array.from(uniqueTripsMap.values());

                  return (
                    <>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-black/50 dark:text-white/50">
                        <Plane className="w-3.5 h-3.5" />
                        <span>여행 여정 ({tripsList.length})</span>
                      </div>

                      {tripsList.length === 0 ? (
                        <p className="text-xs text-black/40 dark:text-white/40 italic py-2">
                          선택한 기간에 진행되는 여행이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tripsList.map(({ trip, isPlan }) => (
                            <div
                              key={`agenda-trip-${trip.id}`}
                              className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                                    {trip.date}
                                  </span>
                                  {isPlan && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-800 dark:text-amber-200 rounded">
                                      PLAN
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-black dark:text-white truncate mt-0.5">
                                  {trip.title}
                                </h4>
                                {trip.locationStr && (
                                  <p className="text-xs text-black/50 dark:text-white/50 truncate flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    <span>{trip.locationStr}</span>
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleTripBandClick(e, trip, selectedRange.start)}
                                className="px-3 py-1.5 rounded-sm bg-black text-white dark:bg-white dark:text-black hover:opacity-90 text-xs font-bold tracking-wider shrink-0 cursor-pointer flex items-center gap-1 group"
                              >
                                <span>여정 보기</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Personal / Blocked Events in Range */}
              <div className="space-y-2">
                {(() => {
                  const uniqueEventsMap = new Map<string, CalendarCustomEvent>();
                  selectedCells.forEach(cell => {
                    cell.overlappingEvents.forEach(e => {
                      uniqueEventsMap.set(e.event.id, e.event);
                    });
                  });
                  const eventsList = Array.from(uniqueEventsMap.values());

                  return (
                    <>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-black/50 dark:text-white/50">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>개인 / 참조 일정 ({eventsList.length})</span>
                      </div>

                      {eventsList.length === 0 ? (
                        <p className="text-xs text-black/40 dark:text-white/40 italic py-2">
                          선택한 기간에 등록된 출장이나 개인 일정이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {eventsList.map((event) => {
                            const cat = EVENT_CATEGORIES.find(c => c.id === event.category) || EVENT_CATEGORIES[0];

                            return (
                              <div
                                key={`agenda-event-${event.id}`}
                                className="p-3 rounded-sm border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${cat.badgeClass}`}>
                                      {cat.label}
                                    </span>
                                    <span className="font-mono text-xs text-black/50 dark:text-white/50 font-bold">
                                      {event.startDate === event.endDate ? event.startDate : `${event.startDate} ~ ${event.endDate}`}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-black dark:text-white truncate mt-1">
                                    {event.title}
                                  </h4>
                                  {event.memo && (
                                    <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5">
                                      {event.memo}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditEventModal(event)}
                                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                    title="일정 수정"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600/70 hover:text-red-600 transition-colors cursor-pointer"
                                    title="일정 삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Event Add / Edit Modal                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 rounded-md shadow-2xl p-5 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                <h3 className="text-base sm:text-lg font-black font-satoshi tracking-tight uppercase text-black dark:text-white">
                  {editingEvent ? 'EDIT SCHEDULE' : 'NEW SCHEDULE'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEventModal}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="mt-5 space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 도쿄 출장, 어머니 생신, 프로젝트 마감"
                  value={eventFormTitle}
                  onChange={(e) => setEventFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-sm font-bold text-black dark:text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  autoFocus
                />
              </div>

              {/* Date Mode Toggle & Inputs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60">
                    DATE & PERIOD *
                  </label>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setEventFormIsRange(false);
                        setEventFormEndDate(eventFormStartDate);
                      }}
                      className={`px-2 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                        !eventFormIsRange
                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                          : 'text-black/50 dark:text-white/50 hover:bg-black/5'
                      }`}
                    >
                      단일 날짜
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventFormIsRange(true)}
                      className={`px-2 py-0.5 rounded text-[10.5px] cursor-pointer transition-colors ${
                        eventFormIsRange
                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                          : 'text-black/50 dark:text-white/50 hover:bg-black/5'
                      }`}
                    >
                      기간 지정
                    </button>
                  </div>
                </div>

                {!eventFormIsRange ? (
                  <input
                    type="date"
                    required
                    value={eventFormStartDate}
                    onChange={(e) => {
                      setEventFormStartDate(e.target.value);
                      setEventFormEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-black/50 dark:text-white/50 block mb-1">시작일</span>
                      <input
                        type="date"
                        required
                        value={eventFormStartDate}
                        onChange={(e) => {
                          setEventFormStartDate(e.target.value);
                          if (eventFormEndDate < e.target.value) {
                            setEventFormEndDate(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-xs sm:text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-black/50 dark:text-white/50 block mb-1">종료일</span>
                      <input
                        type="date"
                        required
                        min={eventFormStartDate}
                        value={eventFormEndDate}
                        onChange={(e) => setEventFormEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-xs sm:text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category Radio Chips */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  CATEGORY
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EVENT_CATEGORIES.map(cat => {
                    const isSelected = eventFormCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEventFormCategory(cat.id)}
                        className={`p-2 rounded-sm border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400 shadow-2xs'
                            : 'border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  MEMO (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  placeholder="참고 사항, 항공편, 숙소 예약 번호 등 간단한 메모"
                  value={eventFormMemo}
                  onChange={(e) => setEventFormMemo(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-sm text-black dark:text-white outline-none focus:border-red-600 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="px-3 py-2 rounded-sm border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeEventModal}
                    className="px-4 py-2 rounded-sm border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 cursor-pointer transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-sm bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
