import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Clock, ArrowRight, Plane, Sparkles, Compass, 
  CheckCircle2, ArrowUpRight, Plus, Eye, Briefcase, Heart, 
  User, AlertCircle, Trash2, Edit3, X, Tag, FileText, Check,
  LayoutGrid, CalendarDays, Share2, Copy, MousePointerClick
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

const MONTH_TABS = [
  { num: 1, short: 'JAN', full: 'JANUARY' },
  { num: 2, short: 'FEB', full: 'FEBRUARY' },
  { num: 3, short: 'MAR', full: 'MARCH' },
  { num: 4, short: 'APR', full: 'APRIL' },
  { num: 5, short: 'MAY', full: 'MAY' },
  { num: 6, short: 'JUN', full: 'JUNE' },
  { num: 7, short: 'JUL', full: 'JULY' },
  { num: 8, short: 'AUG', full: 'AUGUST' },
  { num: 9, short: 'SEP', full: 'SEPTEMBER' },
  { num: 10, short: 'OCT', full: 'OCTOBER' },
  { num: 11, short: 'NOV', full: 'NOVEMBER' },
  { num: 12, short: 'DEC', full: 'DECEMBER' }
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
    trackIndex?: number;
  }[];
  overlappingEvents: {
    event: CalendarCustomEvent;
    isStart: boolean;
    isEnd: boolean;
    dayIndex: number;
    totalDays: number;
    trackIndex?: number;
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

  const [isEditingMonth, setIsEditingMonth] = useState<boolean>(false);
  const [monthInputVal, setMonthInputVal] = useState<string>(String(initialFocus.month + 1));

  // 뷰 모드: 월별 보기 ('month') vs 연간 보기 ('year')
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const toggleViewMode = (mode: 'month' | 'year') => {
    if (viewMode === mode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsTransitioning(false);
    }, 180);
  };

  // 드래그 선택 모드 토글 (기본값 false: 스크롤 원활, true: 날짜 범위 드래그 선택)
  const [isDragSelectMode, setIsDragSelectMode] = useState<boolean>(false);
  const isDragSelectModeRef = useRef<boolean>(false);

  useEffect(() => {
    isDragSelectModeRef.current = isDragSelectMode;
  }, [isDragSelectMode]);

  // 복수 날짜 선택 범위 상태 (단일 날짜 선택 시 start === end)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(() => {
    if (initialFocus.dateStr) {
      return { start: initialFocus.dateStr, end: initialFocus.dateStr };
    }
    return null;
  });
  const [dragAnchorDate, setDragAnchorDate] = useState<string | null>(initialFocus.dateStr);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isDraggingRef = useRef<boolean>(false);
  const dragAnchorDateRef = useRef<string | null>(initialFocus.dateStr);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    dragAnchorDateRef.current = dragAnchorDate;
  }, [dragAnchorDate]);

  // Non-passive touch listener to prevent vertical scrolling during mobile drag (드래그 모드 켜졌을 때만 동작)
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isDragSelectModeRef.current) return;
      if (!isDraggingRef.current || !dragAnchorDateRef.current) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellEl = targetEl?.closest('[data-calendar-date]') as HTMLElement | null;
      if (cellEl && cellEl.dataset.calendarDate) {
        const targetDate = cellEl.dataset.calendarDate;
        setSelectedRange(normalizeRange(dragAnchorDateRef.current, targetDate));
      }
    };

    const handleTouchEndNative = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
      }
    };

    el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    window.addEventListener('touchend', handleTouchEndNative);
    window.addEventListener('touchcancel', handleTouchEndNative);

    return () => {
      el.removeEventListener('touchmove', handleTouchMoveNative);
      window.removeEventListener('touchend', handleTouchEndNative);
      window.removeEventListener('touchcancel', handleTouchEndNative);
    };
  }, [viewMode, isDragSelectMode]);

  // 커스텀 사용자 등록 일정 상태
  const [customEvents, setCustomEvents] = useState<CalendarCustomEvent[]>(() => {
    try {
      const saved = localStorage.getItem('custom_calendar_events');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // 뷰 전용 스위스 모달 상태
  const [viewingEvent, setViewingEvent] = useState<CalendarCustomEvent | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // 일정 등록/수정 모달 상태
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarCustomEvent | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState<string>('');
  const [eventFormStartDate, setEventFormStartDate] = useState<string>('');
  const [eventFormEndDate, setEventFormEndDate] = useState<string>('');
  const [eventFormCategory, setEventFormCategory] = useState<'work' | 'family' | 'personal' | 'blocked'>('work');
  const [eventFormMemo, setEventFormMemo] = useState<string>('');

  const yearInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

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
    if (viewMode !== 'month') {
      toggleViewMode('month');
    }
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

  // 직접 월 입력 커밋
  const handleMonthSubmit = () => {
    const parsed = parseInt(monthInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
      setCurrentMonth(parsed - 1);
    } else {
      setMonthInputVal(String(currentMonth + 1).padStart(2, '0'));
    }
    setIsEditingMonth(false);
  };

  useEffect(() => {
    setYearInputVal(String(currentYear));
  }, [currentYear]);

  useEffect(() => {
    setMonthInputVal(String(currentMonth + 1).padStart(2, '0'));
  }, [currentMonth]);

  useEffect(() => {
    if (isEditingYear && yearInputRef.current) {
      yearInputRef.current.focus();
      yearInputRef.current.select();
    }
  }, [isEditingYear]);

  useEffect(() => {
    if (isEditingMonth && monthInputRef.current) {
      monthInputRef.current.focus();
      monthInputRef.current.select();
    }
  }, [isEditingMonth]);

  // 키보드 이벤트 (좌우 화살표로 달 전환, ESC로 모달 닫기 및 선택 해제)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingEvent) {
          setViewingEvent(null);
          return;
        }
        if (isEventModalOpen) {
          closeEventModal();
          return;
        }
        if (selectedRange) {
          setSelectedRange(null);
          setDragAnchorDate(null);
          return;
        }
        if (isEditingYear) {
          setIsEditingYear(false);
          setYearInputVal(String(currentYear));
          return;
        }
        if (isEditingMonth) {
          setIsEditingMonth(false);
          setMonthInputVal(String(currentMonth + 1).padStart(2, '0'));
          return;
        }
      }

      if (isEditingYear || isEditingMonth || isEventModalOpen || viewingEvent) return;
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
  }, [isEditingYear, isEditingMonth, isEventModalOpen, viewingEvent, currentYear, currentMonth, selectedRange]);

  // 전역 마우스업 리스너 (드래그 종료)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
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

    // 전체 일정들을 시작일 및 기간 순서대로 정렬하여 고정 슬롯(Track) 부여
    // 겹치지 않는 일정들은 같은 트랙 슬롯을 재사용할 수 있도록 계산
    const allIntervals: { id: string; start: string; end: string; type: 'trip' | 'event'; data: any }[] = [];
    
    parsedJourneys.forEach(({ journey, isPlan, range }) => {
      allIntervals.push({
        id: `trip_${journey.id}`,
        start: range.start,
        end: range.end,
        type: 'trip',
        data: { journey, isPlan, range }
      });
    });

    customEvents.forEach((evt) => {
      allIntervals.push({
        id: `evt_${evt.id}`,
        start: evt.startDate,
        end: evt.endDate || evt.startDate,
        type: 'event',
        data: evt
      });
    });

    // 시작일 오름차순, 기간 내림차순 정렬
    allIntervals.sort((a, b) => {
      if (a.start !== b.start) return a.start.localeCompare(b.start);
      return b.end.localeCompare(a.end);
    });

    // 트랙 슬롯 할당 (각 트랙별 마지막 종료일 기록)
    const trackEndDates: string[] = [];
    const itemTrackMap = new Map<string, number>();

    allIntervals.forEach(item => {
      let assignedTrack = -1;
      for (let i = 0; i < trackEndDates.length; i++) {
        if (trackEndDates[i] < item.start) {
          assignedTrack = i;
          trackEndDates[i] = item.end;
          break;
        }
      }
      if (assignedTrack === -1) {
        assignedTrack = trackEndDates.length;
        trackEndDates.push(item.end);
      }
      itemTrackMap.set(item.id, assignedTrack);
    });

    // 각 셀에 겹치는 여행 리본 밴드 계산
    cells.forEach(cell => {
      parsedJourneys.forEach(({ journey, isPlan, range }) => {
        if (cell.dateStr >= range.start && cell.dateStr <= range.end) {
          const isStart = cell.dateStr === range.start;
          const isEnd = cell.dateStr === range.end;
          const totalDays = getDaysDifference(range.start, range.end);
          const dayIndex = getDaysDifference(range.start, cell.dateStr);
          const trackIndex = itemTrackMap.get(`trip_${journey.id}`) ?? 0;

          cell.overlappingTrips.push({
            trip: journey,
            isPlan,
            isStart,
            isEnd,
            dayIndex,
            totalDays,
            trackIndex
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
          const trackIndex = itemTrackMap.get(`evt_${evt.id}`) ?? 0;

          cell.overlappingEvents.push({
            event: evt,
            isStart,
            isEnd,
            dayIndex,
            totalDays,
            trackIndex
          });
        }
      });
    });

    return cells;
  }, [currentYear, currentMonth, currentHolidays, parsedJourneys, customEvents, today]);

  // 이번 달 그리드 내 전체 최대 트랙 인덱스 (모든 셀이 동일한 트랙 높이 레벨을 공유하도록 보장)
  const globalMaxTracks = useMemo(() => {
    let max = 0;
    calendarGrid.forEach(cell => {
      cell.overlappingTrips.forEach(t => {
        if ((t.trackIndex ?? 0) > max) max = t.trackIndex ?? 0;
      });
      cell.overlappingEvents.forEach(e => {
        if ((e.trackIndex ?? 0) > max) max = e.trackIndex ?? 0;
      });
    });
    return max;
  }, [calendarGrid]);

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

  // 연간 12개월 전체 데이터 생성 (3열 x 4행 미니 달력용)
  const yearMonthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const firstDay = new Date(currentYear, monthIdx, 1);
      const lastDay = new Date(currentYear, monthIdx + 1, 0);
      const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 0: Mon, ..., 6: Sun
      const totalDays = lastDay.getDate();

      const days: {
        dateStr: string;
        dayNum: number;
        isCurrentMonth: boolean;
        isToday: boolean;
        isHoliday: boolean;
        holidayName?: string;
        dayOfWeek: number;
        hasTrip: boolean;
        isTripStart?: boolean;
        isTripEnd?: boolean;
        isTripMiddle?: boolean;
        tripTitles: string[];
        isPlan: boolean;
        hasEvent: boolean;
        isEventStart?: boolean;
        isEventEnd?: boolean;
        isEventMiddle?: boolean;
        eventCategory?: string;
        hasMultiEvents?: boolean;
      }[] = [];

      // 이전 달 패딩
      for (let p = 0; p < startDayOfWeek; p++) {
        days.push({
          dateStr: '',
          dayNum: 0,
          isCurrentMonth: false,
          isToday: false,
          isHoliday: false,
          dayOfWeek: p,
          hasTrip: false,
          tripTitles: [],
          isPlan: false,
          hasEvent: false
        });
      }

      // 이번 달 날짜들
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = (startDayOfWeek + d - 1) % 7;
        const isToday = today.getFullYear() === currentYear && today.getMonth() === monthIdx && today.getDate() === d;
        const holiday = currentHolidays.get(dateStr) || null;

        // 여행 확인 (다중 여행 겹침 시 가장 긴 연속 일정을 우선하여 캡슐로 렌더링)
        const matchedTrips = parsedJourneys.filter(pj => dateStr >= pj.range.start && dateStr <= pj.range.end);
        const hasTrip = matchedTrips.length > 0;
        const isPlan = matchedTrips.some(mt => mt.isPlan);
        const tripTitles = matchedTrips.map(mt => mt.journey.title);

        let isTripStart = false;
        let isTripEnd = false;
        let isTripMiddle = false;

        if (hasTrip) {
          // 기간이 가장 긴 여행 우선 선택
          const primaryTrip = [...matchedTrips].sort((a, b) => {
            const lenA = getDaysDifference(a.range.start, a.range.end);
            const lenB = getDaysDifference(b.range.start, b.range.end);
            return lenB - lenA;
          })[0];

          isTripStart = primaryTrip.range.start === dateStr;
          isTripEnd = primaryTrip.range.end === dateStr;
          isTripMiddle = !isTripStart && !isTripEnd;
        }

        // 커스텀 일정 확인 (1일 일정과 연속 일정이 겹쳤을 때, 연속 캡슐의 연속성이 깨지지 않도록 가장 긴 연속 일정 우선 판정)
        const matchedEvents = customEvents.filter(evt => dateStr >= evt.startDate && dateStr <= (evt.endDate || evt.startDate));
        const hasEvent = matchedEvents.length > 0;

        let isEventStart = false;
        let isEventEnd = false;
        let isEventMiddle = false;
        let eventCategory: string | undefined = undefined;

        if (hasEvent) {
          // 기간이 가장 긴 일정 우선 선택 (동일하면 시작일 기준)
          const primaryEvent = [...matchedEvents].sort((a, b) => {
            const endA = a.endDate || a.startDate;
            const endB = b.endDate || b.startDate;
            const lenA = getDaysDifference(a.startDate, endA);
            const lenB = getDaysDifference(b.startDate, endB);
            return lenB - lenA;
          })[0];

          const pEnd = primaryEvent.endDate || primaryEvent.startDate;
          isEventStart = primaryEvent.startDate === dateStr;
          isEventEnd = pEnd === dateStr;
          isEventMiddle = !isEventStart && !isEventEnd;
          eventCategory = primaryEvent.category;
        }

        const hasMultiEvents = matchedEvents.length > 1 || (hasTrip && hasEvent);

        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: true,
          isToday,
          isHoliday: Boolean(holiday),
          holidayName: holiday?.name,
          dayOfWeek,
          hasTrip,
          isTripStart,
          isTripEnd,
          isTripMiddle,
          tripTitles,
          isPlan,
          hasEvent,
          isEventStart,
          isEventEnd,
          isEventMiddle,
          eventCategory,
          hasMultiEvents
        });
      }

      const totalTripDays = days.filter(d => d.hasTrip).length;

      return {
        monthIdx,
        monthTab: MONTH_TABS[monthIdx],
        days,
        totalTripDays
      };
    });
  }, [currentYear, currentHolidays, parsedJourneys, customEvents, today]);

  // 연간 전체 여행 통계
  const yearStats = useMemo(() => {
    const allDays = yearMonthsData.flatMap(m => m.days.filter(d => d.isCurrentMonth));
    const travelDays = allDays.filter(d => d.hasTrip).length;
    const allTripsThisYear = new Set(
      parsedJourneys
        .filter(pj => pj.range.start.startsWith(String(currentYear)) || pj.range.end.startsWith(String(currentYear)))
        .map(pj => pj.journey.id)
    );
    const blockedDays = allDays.filter(d => d.hasEvent).length;

    return {
      travelDays,
      tripCount: allTripsThisYear.size,
      blockedDays
    };
  }, [yearMonthsData, parsedJourneys, currentYear]);

  // 날짜 셀 클릭 핸들러 (단일 클릭 및 Shift + 클릭 복수 선택 지원)
  const handleCellClick = (cell: DayCellData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && dragAnchorDate) {
      const newRange = normalizeRange(dragAnchorDate, cell.dateStr);
      setSelectedRange(newRange);
    } else {
      setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
      setDragAnchorDate(cell.dateStr);
    }
  };

  // 마우스 드래그 시작 (드래그 모드 활성화 시에만 동작)
  const handleCellMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    if (!isDragSelectMode) {
      // 드래그 모드가 꺼져있으면 단일 클릭만 처리
      return;
    }
    e.stopPropagation();
    setIsDragging(true);
    setDragAnchorDate(dateStr);
    setSelectedRange({ start: dateStr, end: dateStr });
  };

  // 마우스 호버 시 드래그 범위 확장
  const handleCellMouseEnter = (dateStr: string) => {
    if (!isDragSelectMode || !isDragging || !dragAnchorDate) return;
    setSelectedRange(normalizeRange(dragAnchorDate, dateStr));
  };

  // 모바일 터치 드래그 시작 (드래그 모드 활성화 시에만 동작)
  const handleCellTouchStart = (dateStr: string) => {
    if (!isDragSelectMode) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragAnchorDate(dateStr);
    dragAnchorDateRef.current = dateStr;
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

  // 커스텀 일정 클릭 시 스위스 뷰 모달 오픈
  const handleCustomEventClick = (e: React.MouseEvent, evt: CalendarCustomEvent) => {
    e.stopPropagation();
    setShareCopied(false);
    setViewingEvent(evt);
  };

  // 일정 공유 핸들러 (Web Share API 및 클립보드 복사)
  const handleShareEvent = async (evt: CalendarCustomEvent) => {
    const categoryInfo = EVENT_CATEGORIES.find(c => c.id === evt.category) || EVENT_CATEGORIES[0];
    const periodStr = evt.startDate === (evt.endDate || evt.startDate)
      ? evt.startDate
      : `${evt.startDate} ~ ${evt.endDate}`;
    const shareText = `[Trip Gon Log 일정]\n📌 ${evt.title}\n📅 ${periodStr}\n🏷️ ${categoryInfo.label}${evt.memo ? `\n📝 ${evt.memo}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: evt.title,
          text: shareText,
        });
        return;
      } catch (err) {
        // 사용자가 취소한 경우 외에는 클립보드로 폴백
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  // 새 일정 등록 모달 열기 (통합 기간 자동 세팅)
  const openNewEventModal = (startDate?: string, endDate?: string) => {
    const s = startDate || selectedRange?.start || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const e = endDate || selectedRange?.end || s;

    setViewingEvent(null);
    setEditingEvent(null);
    setEventFormTitle('');
    setEventFormStartDate(s);
    setEventFormEndDate(e >= s ? e : s);
    setEventFormCategory('work');
    setEventFormMemo('');
    setIsEventModalOpen(true);
  };

  // 기존 일정 수정 모달 열기 (통합 기간 자동 세팅)
  const openEditEventModal = (evt: CalendarCustomEvent) => {
    setViewingEvent(null);
    setEditingEvent(evt);
    setEventFormTitle(evt.title);
    setEventFormStartDate(evt.startDate);
    setEventFormEndDate(evt.endDate || evt.startDate);
    setEventFormCategory(evt.category || 'work');
    setEventFormMemo(evt.memo || '');
    setIsEventModalOpen(true);
  };

  // 모달 닫기
  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  // 일정 저장 (생성 또는 업데이트 - 시작일/종료일 통합 처리)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormTitle.trim() || !eventFormStartDate) return;

    const startDate = eventFormStartDate;
    // 종료일이 시작일보다 앞서면 시작일로 보정
    const endDate = eventFormEndDate && eventFormEndDate >= startDate ? eventFormEndDate : startDate;

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

  // 하단 아젠다 표시용 날짜 데이터 (선택 날짜가 있으면 선택 날짜들, 없으면 이번 달 전체 날짜)
  const displayedAgendaCells = useMemo(() => {
    if (selectedRange && selectedCells.length > 0) {
      return selectedCells;
    }
    return calendarGrid.filter(c => c.isCurrentMonth);
  }, [selectedRange, selectedCells, calendarGrid]);

  const isMultiDaySelected = selectedRange && selectedRange.start !== selectedRange.end;
  const selectedDaysCount = selectedRange ? getDaysDifference(selectedRange.start, selectedRange.end) : 0;

  return (
    <div className="w-full min-h-screen bg-transparent text-black dark:text-white transition-colors duration-300 select-none pb-24">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Top Banner & Swiss Minimal Typography Header                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Left: Giant Typography Year & Month */}
          <div>
            <div className="flex items-center gap-3 mb-1 text-red-600 dark:text-red-500 font-bold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
              <CalendarIcon className="w-4 h-4" />
              <span>
                CALENDAR ARCHIVE · {viewMode === 'year' ? `${currentYear} ANNUAL` : `${MONTH_TABS[currentMonth].num} ${MONTH_TABS[currentMonth].short}`}
              </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              {/* 1. Year Display & Direct Edit + Navigation */}
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 leading-tight">
                    YEAR
                  </span>
                  {isEditingYear ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleYearSubmit(); }}
                      className="inline-flex items-center h-9 sm:h-14 lg:h-16"
                    >
                      <input
                        ref={yearInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={yearInputVal}
                        onChange={(e) => setYearInputVal(e.target.value)}
                        onBlur={handleYearSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setCurrentYear(prev => prev + 1);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setCurrentYear(prev => prev - 1);
                          }
                        }}
                        className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter bg-transparent border-b-2 border-red-600 outline-none w-[4.5ch] h-full leading-none text-black dark:text-white p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </form>
                  ) : (
                    <h1
                      onClick={() => setIsEditingYear(true)}
                      className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-baseline group leading-none h-9 sm:h-14 lg:h-16"
                      title="클릭하여 연도 변경"
                    >
                      <span className="group-hover:underline decoration-red-600 decoration-2 underline-offset-4">{currentYear}</span>
                    </h1>
                  )}
                </div>

                {/* Year Prev/Next Buttons (클릭하여 연도 활성화 상태일 때만 표시) */}
                {isEditingYear && (
                  <div className="flex flex-col gap-0.5 ml-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setCurrentYear(prev => prev + 1)}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                      title="다음 연도 (+1)"
                    >
                      <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setCurrentYear(prev => prev - 1)}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                      title="이전 연도 (-1)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                  </div>
                )}
              </div>

              {/* Swiss Minimal Divider */}
              <span className="text-3xl sm:text-5xl font-light text-black/20 dark:text-white/20 select-none">/</span>

              {/* 2. Month Big Number & Direct Edit + Subtext */}
              {viewMode === 'month' ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 leading-tight">
                      MONTH
                    </span>
                    {isEditingMonth ? (
                      <div className="flex items-baseline gap-2.5 h-9 sm:h-14 lg:h-16">
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleMonthSubmit(); }}
                          className="inline-flex items-center h-full"
                        >
                          <input
                            ref={monthInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={monthInputVal}
                            onChange={(e) => setMonthInputVal(e.target.value)}
                            onBlur={handleMonthSubmit}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                handleNextMonth();
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                handlePrevMonth();
                              }
                            }}
                            className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter bg-transparent border-b-2 border-red-600 outline-none w-[2.2ch] h-full leading-none text-black dark:text-white p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </form>
                        <div className="flex flex-col justify-end pb-0.5 sm:pb-1">
                          <span className="text-base sm:text-lg md:text-xl font-black font-['Inter',sans-serif] tracking-wider uppercase text-red-600 dark:text-red-500 leading-none">
                            {MONTH_NAMES[currentMonth]}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingMonth(true)}
                        className="flex items-baseline gap-2.5 cursor-pointer hover:opacity-80 transition-opacity group h-9 sm:h-14 lg:h-16"
                        title="클릭하여 월 변경"
                      >
                        <span className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter leading-none text-black dark:text-white group-hover:underline decoration-red-600 decoration-2 underline-offset-4">
                          {String(currentMonth + 1).padStart(2, '0')}
                        </span>
                        <div className="flex flex-col justify-end pb-0.5 sm:pb-1">
                          <span className="text-base sm:text-lg md:text-xl font-black font-['Inter',sans-serif] tracking-wider uppercase text-red-600 dark:text-red-500 leading-none">
                            {MONTH_NAMES[currentMonth]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Month Prev/Next Buttons (클릭하여 월 활성화 상태일 때만 표시) */}
                  {isEditingMonth && (
                    <div className="flex flex-col gap-0.5 ml-0.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                        title="다음 달 (→)"
                      >
                        <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/15 rounded text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                        title="이전 달 (←)"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col justify-end h-9 sm:h-14 lg:h-16">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 leading-tight">
                    VIEW
                  </span>
                  <span className="text-2xl sm:text-4xl font-black font-satoshi tracking-tight leading-none uppercase text-black/80 dark:text-white/80">
                    ANNUAL 12M
                  </span>
                </div>
              )}
            </div>
          </div>

            {/* View Mode Toggle + DRAG Toggle + Navigation Buttons + ADD + Days Badge - Compact 1 Row Layout */}
            <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-2 w-full flex-wrap">
              {/* Left group: View Mode Switcher */}
              <div className="flex items-center p-0.5 bg-black/5 dark:bg-white/10 rounded-full border border-black/10 dark:border-white/10 font-mono text-[11px] sm:text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => toggleViewMode('month')}
                  className={`px-2 sm:px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'month'
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                  title="월별 보기로 전환"
                >
                  <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>MONTH</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleViewMode('year')}
                  className={`px-2 sm:px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'year'
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                  title="연간 보기로 전환 (3열 12개월)"
                >
                  <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>YEAR</span>
                </button>
              </div>

              {/* Drag Toggle Button (심플하게 DRAG 단일 표기, 끄면 선택 해제) */}
              {viewMode === 'month' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDragSelectMode(prev => {
                      const next = !prev;
                      if (!next) {
                        setSelectedRange(null);
                      }
                      return next;
                    });
                  }}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs ${
                    isDragSelectMode
                      ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-600/30'
                      : 'bg-white/80 dark:bg-zinc-900/80 border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                  }`}
                  title={isDragSelectMode ? "드래그 모드 활성 (클릭 시 해제)" : "드래그 모드 켜기"}
                >
                  <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{isDragSelectMode ? 'DRAG: ON' : 'DRAG'}</span>
                  {isDragSelectMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                </button>
              )}

              {/* Right group: Prev, Today, Next, Add & Days Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Prev Button */}
                <button
                  type="button"
                  onClick={viewMode === 'month' ? handlePrevMonth : () => setCurrentYear(prev => prev - 1)}
                  className="p-1 sm:p-1.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center"
                  title={viewMode === 'month' ? "이전 달" : "이전 연도"}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Today Button */}
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-2 sm:px-2.5 py-1 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black text-black dark:text-white hover:text-white dark:hover:bg-white dark:hover:text-black text-[10.5px] sm:text-xs font-bold font-mono tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs"
                  title="오늘 날짜로 이동"
                >
                  TODAY
                </button>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={viewMode === 'month' ? handleNextMonth : () => setCurrentYear(prev => prev + 1)}
                  className="p-1 sm:p-1.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-black dark:text-white cursor-pointer shadow-xs flex items-center justify-center"
                  title={viewMode === 'month' ? "다음 달" : "다음 연도"}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Add Schedule Button */}
                <button
                  type="button"
                  onClick={() => openNewEventModal()}
                  className="px-2 sm:px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10.5px] sm:text-xs font-bold font-mono tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                  title="새 일정 등록"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span>ADD</span>
                </button>

                {/* Days Metric Badge (우측에 나란히 배치하여 여백 낭비 제거, 이모지 제거) */}
                <div className="ml-0.5 px-2 sm:px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-full border border-black/10 dark:border-white/10 text-[10.5px] sm:text-xs font-mono font-bold tracking-wider text-black/80 dark:text-white/80 shrink-0">
                  <span>{viewMode === 'month' ? `${monthStats.travelDays} DAYS` : `${yearStats.travelDays} DAYS`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 12-Month Quick Selector Tabs: 2-Tier Stack (Big Bold Number + Small Month Code) in 12-Column Grid (No Horizontal Scroll) */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-12 gap-0.5 sm:gap-1 mt-4 sm:mt-5 pt-3 border-t border-black/10 dark:border-white/10 select-none">
            {MONTH_TABS.map((mTab, idx) => {
              const isActive = currentMonth === idx;
              return (
                <button
                  key={mTab.num}
                  type="button"
                  onClick={() => setCurrentMonth(idx)}
                  className={`flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs ring-1 ring-black dark:ring-white'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                  }`}
                  title={`${mTab.full} (${mTab.num}월)`}
                >
                  <span className="text-xs sm:text-base md:text-lg font-black font-mono leading-none tracking-tight">
                    {mTab.num}
                  </span>
                  <span className={`text-[8.5px] sm:text-[10px] md:text-[11px] font-bold tracking-tight uppercase leading-tight mt-0.5 font-['Inter',sans-serif] ${
                    isActive ? 'text-white dark:text-black' : 'text-black/40 dark:text-white/40'
                  }`}>
                    {mTab.short}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Content Area: Month View vs Year View with Zoom Transition    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`transition-all duration-300 ease-out transform ${
        isTransitioning
          ? (viewMode === 'month' ? 'scale-105 opacity-0' : 'scale-95 opacity-0')
          : 'scale-100 opacity-100'
      }`}>
        {viewMode === 'month' ? (
          /* ──────────────── MONTH VIEW ──────────────── */
          <div className="w-full max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 mt-4 sm:mt-6">
            {/* Multi-Select Range Indicator (불필요한 안내 문구 제거, 순수 상태만 간결하게 표시) */}
            {isMultiDaySelected && (
              <div className="flex items-center justify-end pb-2 px-1 text-xs sm:text-sm font-mono text-red-600 dark:text-red-400 font-bold animate-in fade-in">
                <span>{selectedRange?.start} ~ {selectedRange?.end} ({selectedDaysCount}일 선택됨)</span>
              </div>
            )}

            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 border-b border-black/20 dark:border-white/20 pb-1.5 sm:pb-2 text-center text-xs sm:text-sm md:text-base font-black tracking-widest font-mono select-none">
              {WEEKDAYS.map((day, idx) => {
                const isSunday = idx === 6;
                const isSaturday = idx === 5;
                return (
                  <div 
                    key={day} 
                    className={`py-0.5 sm:py-1 ${
                      isSunday 
                        ? 'text-red-600 dark:text-red-500 font-black' 
                        : isSaturday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-black/70 dark:text-white/70'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Day Grid Cells with Drag & Multi-Select Support (외곽 테두리 없는 스위스 미니멀 그리드) */}
            <div 
              ref={gridContainerRef}
              onTouchMove={handleGridTouchMove}
              onTouchEnd={handleGridTouchEnd}
              className={`grid grid-cols-7 bg-transparent rounded-none overflow-hidden select-none ${
                isDragSelectMode ? 'touch-none' : 'touch-auto'
              }`}
            >
              {calendarGrid.map((cell, cellIdx) => {
                const isSunday = cell.dayOfWeek === 6;
                const isSaturday = cell.dayOfWeek === 5;
                const isHoliday = !!cell.holiday;

                const isInRange = !!(selectedRange && cell.dateStr >= selectedRange.start && cell.dateStr <= selectedRange.end);
                const isRangeEnd = !!(selectedRange && cell.dateStr === selectedRange.end);

                // Unified Box Border Calculation (상하좌우 인접 셀이 선택 영역에 포함되는지 확인하여 외곽선만 렌더링)
                // 드래그 활성화 시: 빨간 테두리 + 빨간 틴트 / 일반 선택 시: 검정 테두리 + 검정 반투명 틴트
                let borderClasses = '';
                if (isInRange) {
                  const col = cellIdx % 7;
                  const row = Math.floor(cellIdx / 7);

                  const hasTopNeighbor = row > 0 && calendarGrid[cellIdx - 7]?.dateStr >= selectedRange!.start && calendarGrid[cellIdx - 7]?.dateStr <= selectedRange!.end;
                  const hasBottomNeighbor = cellIdx + 7 < calendarGrid.length && calendarGrid[cellIdx + 7]?.dateStr >= selectedRange!.start && calendarGrid[cellIdx + 7]?.dateStr <= selectedRange!.end;
                  const hasLeftNeighbor = col > 0 && calendarGrid[cellIdx - 1]?.dateStr >= selectedRange!.start && calendarGrid[cellIdx - 1]?.dateStr <= selectedRange!.end;
                  const hasRightNeighbor = col < 6 && calendarGrid[cellIdx + 1]?.dateStr >= selectedRange!.start && calendarGrid[cellIdx + 1]?.dateStr <= selectedRange!.end;

                  if (isDragSelectMode) {
                    borderClasses = `bg-red-500/10 dark:bg-red-500/15 z-10 ${
                      !hasTopNeighbor ? 'border-t-2 border-t-red-600 dark:border-t-red-500' : ''
                    } ${
                      !hasBottomNeighbor ? 'border-b-2 border-b-red-600 dark:border-b-red-500' : ''
                    } ${
                      !hasLeftNeighbor ? 'border-l-2 border-l-red-600 dark:border-l-red-500' : ''
                    } ${
                      !hasRightNeighbor ? 'border-r-2 border-r-red-600 dark:border-r-red-500' : ''
                    }`;
                  } else {
                    borderClasses = `bg-black/10 dark:bg-white/15 z-10 ${
                      !hasTopNeighbor ? 'border-t-2 border-t-black dark:border-t-white' : ''
                    } ${
                      !hasBottomNeighbor ? 'border-b-2 border-b-black dark:border-b-white' : ''
                    } ${
                      !hasLeftNeighbor ? 'border-l-2 border-l-black dark:border-l-white' : ''
                    } ${
                      !hasRightNeighbor ? 'border-r-2 border-r-black dark:border-r-white' : ''
                    }`;
                  }
                }

                // 트랙 슬롯 매핑: 월 전체의 globalMaxTracks를 기준으로 모든 셀이 일관된 슬롯 배열을 갖도록 보장
                // 이를 통해 날짜별 일정 개수가 달라도 같은 트랙(0, 1, 2...)의 일정들이 정확히 같은 수평 높이에 위치하게 됨
                const allItemsInCell: {
                  type: 'trip' | 'event';
                  trackIndex: number;
                  data: any;
                }[] = [
                  ...cell.overlappingTrips.map(t => ({ type: 'trip' as const, trackIndex: t.trackIndex ?? 0, data: t })),
                  ...cell.overlappingEvents.map(e => ({ type: 'event' as const, trackIndex: e.trackIndex ?? 0, data: e }))
                ];

                const trackSlots = Array.from({ length: globalMaxTracks + 1 }, (_, trackIdx) => {
                  return allItemsInCell.find(item => item.trackIndex === trackIdx) || null;
                });

                // 외곽 테두리 없이 내부 구분선만 유지: 맨 우측 열(col === 6)은 border-r 제거, 맨 아래 행은 border-b 제거
                const col = cellIdx % 7;
                const row = Math.floor(cellIdx / 7);
                const totalRows = Math.ceil(calendarGrid.length / 7);
                const isLastCol = col === 6;
                const isLastRow = row === totalRows - 1;

                return (
                  <div
                    key={cell.dateStr}
                    data-calendar-date={cell.dateStr}
                    onClick={(e) => handleCellClick(cell, e)}
                    onMouseDown={(e) => handleCellMouseDown(cell.dateStr, e)}
                    onMouseEnter={() => handleCellMouseEnter(cell.dateStr)}
                    onTouchStart={() => handleCellTouchStart(cell.dateStr)}
                    className={`min-h-[86px] sm:min-h-[124px] md:min-h-[144px] p-1 sm:p-2 ${
                      !isLastCol ? 'border-r border-black/10 dark:border-white/10' : ''
                    } ${
                      !isLastRow ? 'border-b border-black/10 dark:border-white/10' : ''
                    } flex flex-col justify-between transition-colors relative cursor-pointer group overflow-visible ${
                      !cell.isCurrentMonth
                        ? 'bg-black/[0.02] dark:bg-white/[0.02] opacity-40'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                    } ${borderClasses}`}
                  >
                    {/* Floating "+ ADD" Quick Action Badge (그리드 내부 우측 상단 고정, 이벤트 전파 차단) */}
                    {isRangeEnd && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedRange) {
                            openNewEventModal(selectedRange.start, selectedRange.end);
                          }
                        }}
                        className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-40 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-mono text-[9px] sm:text-[10.5px] font-black tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                        title="선택한 기간으로 새 일정 등록"
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                        <span>{isMultiDaySelected ? `ADD (${selectedDaysCount}D)` : 'ADD'}</span>
                      </button>
                    )}

                    {/* Top: Day Number & Holiday Tag (Enlarged & Prominent) */}
                    <div className="flex items-start justify-between gap-0.5 sm:gap-1 w-full">
                      {/* Day Number */}
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs sm:text-base md:text-lg font-black font-mono leading-none tracking-tighter ${
                            cell.isToday
                              ? 'w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs'
                              : isSunday || isHoliday
                                ? 'text-red-600 dark:text-red-500'
                                : isSaturday
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-black/90 dark:text-white/90'
                          }`}
                        >
                          {cell.dayNum < 10 ? `0${cell.dayNum}` : cell.dayNum}
                        </span>
                        {cell.isToday && (
                          <span className="hidden md:inline-block text-[8.5px] font-black uppercase text-red-600 font-mono tracking-tighter">
                            TODAY
                          </span>
                        )}
                      </div>

                      {/* Public Holiday Tag - Enlarged for high legibility */}
                      {cell.holiday && !isRangeEnd && (
                        <span
                          className="text-[9px] sm:text-[11px] md:text-xs font-bold text-red-600 dark:text-red-400 font-sans tracking-tight truncate max-w-[55px] sm:max-w-[110px] text-right"
                          title={cell.holiday.name}
                        >
                          {cell.holiday.name}
                        </span>
                      )}
                    </div>

                    {/* Middle / Bottom: Track Slot Aligned Ribbons (전체 셀의 트랙 레벨이 동일하여 밀림 없이 완벽한 수평선 유지) */}
                    <div className="mt-1 sm:mt-2 space-y-1 w-full flex-grow flex flex-col justify-end">
                      {trackSlots.map((slotItem, sIdx) => {
                        if (!slotItem) {
                          // 빈 슬롯은 높이만 유지하여 다른 날짜의 같은 트랙 일정과 높이를 일치시킴
                          return <div key={`spacer-${sIdx}`} className="h-[20px] sm:h-[23px] w-full" />;
                        }

                        if (slotItem.type === 'trip') {
                          const { trip, isPlan, isStart, isEnd, dayIndex, totalDays } = slotItem.data;
                          const isSingleDay = isStart && isEnd;
                          return (
                            <button
                              key={`trip-${trip.id}`}
                              type="button"
                              onClick={(e) => handleTripBandClick(e, trip, cell.dateStr)}
                              className={`h-[20px] sm:h-[23px] text-left text-[9px] sm:text-[10.5px] md:text-[11px] transition-all flex items-center select-none group/band cursor-pointer z-10 ${
                                isSingleDay
                                  ? 'w-full mx-0 rounded-xs px-1 sm:px-1.5'
                                  : isStart
                                    ? 'w-[calc(100%+0.25rem)] sm:w-[calc(100%+0.5rem)] -mr-1 sm:-mr-2 ml-0 rounded-l-xs pl-1 sm:pl-1.5 pr-0'
                                    : isEnd
                                      ? 'w-[calc(100%+0.25rem)] sm:w-[calc(100%+0.5rem)] -ml-1 sm:-ml-2 mr-0 rounded-r-xs pr-1 sm:pr-1.5 pl-0'
                                      : 'w-[calc(100%+0.5rem)] sm:w-[calc(100%+1rem)] -mx-1 sm:-mx-2 rounded-none px-0.5'
                              } ${
                                isPlan
                                  ? 'bg-amber-500/25 dark:bg-amber-500/35 text-amber-950 dark:text-amber-100 border-y border-dashed border-amber-500/50 hover:bg-amber-500/40'
                                  : 'bg-red-600 hover:bg-red-700 text-white font-black shadow-2xs'
                              }`}
                              title={`${trip.title} (DAY ${dayIndex}/${totalDays})`}
                            >
                              <div className="flex items-center gap-1 w-full min-w-0 px-0.5">
                                {isStart && (
                                  <Plane className="w-2.5 h-2.5 shrink-0 rotate-45 text-white/90" />
                                )}
                                <span className="font-bold truncate tracking-tight font-sans leading-tight text-white">
                                  {isStart ? trip.title : `DAY ${dayIndex}`}
                                </span>
                              </div>
                            </button>
                          );
                        }

                        // slotItem.type === 'event'
                        const { event, isStart, isEnd, dayIndex, totalDays } = slotItem.data;
                        const categoryInfo = EVENT_CATEGORIES.find(c => c.id === event.category) || EVENT_CATEGORIES[0];
                        const isSingleDay = isStart && isEnd;

                        return (
                          <button
                            key={`event-${event.id}`}
                            type="button"
                            onClick={(e) => handleCustomEventClick(e, event)}
                            className={`h-[20px] sm:h-[23px] text-left text-[8.5px] sm:text-[10px] transition-all flex items-center select-none cursor-pointer z-10 ${
                              isSingleDay
                                ? 'w-full mx-0 rounded-xs px-1 sm:px-1.5'
                                : isStart
                                  ? 'w-[calc(100%+0.25rem)] sm:w-[calc(100%+0.5rem)] -mr-1 sm:-mr-2 ml-0 rounded-l-xs pl-1 sm:pl-1.5 pr-0'
                                  : isEnd
                                    ? 'w-[calc(100%+0.25rem)] sm:w-[calc(100%+0.5rem)] -ml-1 sm:-ml-2 mr-0 rounded-r-xs pr-1 sm:pr-1.5 pl-0'
                                    : 'w-[calc(100%+0.5rem)] sm:w-[calc(100%+1rem)] -mx-1 sm:-mx-2 rounded-none px-0.5'
                            } bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 border-y border-zinc-800 dark:border-zinc-300 font-medium`}
                            title={`[${categoryInfo.label}] ${event.title} (클릭하여 보기/공유)`}
                          >
                            <div className="flex items-center gap-1.5 w-full min-w-0 px-0.5">
                              {isStart && (
                                <span 
                                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: categoryInfo.color }} 
                                  title={categoryInfo.label}
                                />
                              )}
                              <span className="font-semibold truncate tracking-tight font-sans leading-tight">
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
        ) : (
          /* ──────────────── YEAR VIEW (3-Column, 4-Row Grid) ──────────────── */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            {/* Year View Minimal Header (불필요한 설명 제거) */}
            <div className="flex items-center justify-between pb-3 text-xs font-mono text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10 mb-6">
              <span className="font-bold text-black/40 dark:text-white/40 tracking-wider uppercase">
                ANNUAL CALENDAR
              </span>
              <span className="font-bold text-red-600 dark:text-red-400 tracking-wider">
                {currentYear} OVERVIEW (12M)
              </span>
            </div>

            {/* 3-Column Year Grid (외곽 테두리 없이 플랫한 스위스 레이아웃) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
              {yearMonthsData.map((m) => (
                <div
                  key={m.monthIdx}
                  className="bg-transparent p-2 sm:p-3 flex flex-col justify-between transition-all group"
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
                      <div className="flex items-baseline gap-2 text-black dark:text-white group-hover:text-red-600 transition-colors">
                        <span className="text-lg sm:text-xl font-black font-mono tracking-tight">
                          {m.monthTab.num < 10 ? `0${m.monthTab.num}` : m.monthTab.num}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold font-['Inter',sans-serif] tracking-wider uppercase opacity-75">
                          {m.monthTab.full}
                        </span>
                      </div>
                    </button>
                    {m.totalTripDays > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/75 dark:text-white/75">
                        ✈️ {m.totalTripDays}D
                      </span>
                    )}
                  </div>

                  {/* Mini Weekday Headers (M T W T F S S) */}
                  <div className="grid grid-cols-7 text-center text-[10.5px] font-mono font-bold mb-1 select-none">
                    {WEEKDAYS.map((wd, wIdx) => (
                      <div
                        key={wd}
                        className={wIdx === 6 ? 'text-red-500' : wIdx === 5 ? 'text-blue-500' : 'text-black/40 dark:text-white/40'}
                      >
                        {wd[0]}
                      </div>
                    ))}
                  </div>

                  {/* Mini Days Grid */}
                  <div className="grid grid-cols-7 gap-y-1 text-center font-mono select-none">
                    {m.days.map((day, dIdx) => {
                      if (!day.isCurrentMonth) {
                        return <div key={`empty-${m.monthIdx}-${dIdx}`} className="h-7 sm:h-8" />;
                      }

                      const isSun = day.dayOfWeek === 6;
                      const isSat = day.dayOfWeek === 5;

                      // Continuous Region Classes for Trips
                      const isTripSingle = day.hasTrip && day.isTripStart && day.isTripEnd;
                      const isTripStart = day.hasTrip && day.isTripStart && !day.isTripEnd;
                      const isTripEnd = day.hasTrip && day.isTripEnd && !day.isTripStart;
                      const isTripMid = day.hasTrip && !day.isTripStart && !day.isTripEnd;

                      // Continuous Region Classes for Events
                      const isEventSingle = day.hasEvent && day.isEventStart && day.isEventEnd;
                      const isEventStart = day.hasEvent && day.isEventStart && !day.isEventEnd;
                      const isEventEnd = day.hasEvent && day.isEventEnd && !day.isEventStart;
                      const isEventMid = day.hasEvent && !day.isEventStart && !day.isEventEnd;

                      // Mini calendar styling: 연간 보기에서는 임의의 선택 영역(레드 하이라이트)을 표기하지 않고 전체 일정 분포를 명확히 보여줌
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => {
                            setCurrentMonth(m.monthIdx);
                            setSelectedRange({ start: day.dateStr, end: day.dateStr });
                            setDragAnchorDate(day.dateStr);
                            toggleViewMode('month');
                          }}
                          className={`h-7 sm:h-8 text-xs font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer hover:opacity-80 ${
                            day.isToday
                              ? 'bg-black text-white dark:bg-white dark:text-black font-black rounded-sm'
                              : day.hasTrip
                                ? `${
                                    isTripSingle
                                      ? 'rounded-full'
                                      : isTripStart
                                        ? 'rounded-l-full'
                                        : isTripEnd
                                          ? 'rounded-r-full'
                                          : 'rounded-none'
                                  } ${
                                    day.isPlan
                                      ? 'bg-amber-500/30 text-amber-950 dark:text-amber-200 font-bold'
                                      : 'bg-red-600 text-white font-bold'
                                  }`
                                : day.hasEvent
                                  ? `${
                                      isEventSingle
                                        ? 'rounded-full'
                                        : isEventStart
                                          ? 'rounded-l-full'
                                          : isEventEnd
                                            ? 'rounded-r-full'
                                            : 'rounded-none'
                                    } bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-medium`
                                  : day.isHoliday || isSun
                                    ? 'text-red-600 dark:text-red-400 font-bold rounded-sm'
                                    : isSat
                                      ? 'text-blue-600 dark:text-blue-400 font-bold rounded-sm'
                                      : 'text-black/80 dark:text-white/80 rounded-sm'
                          }`}
                          title={day.holidayName ? `${day.dateStr} (${day.holidayName})` : day.tripTitles.length > 0 ? `${day.dateStr} · ${day.tripTitles.join(', ')}` : day.dateStr}
                        >
                          <span className="leading-none text-[11px] sm:text-xs z-10">{day.dayNum}</span>
                          {/* Dot Indicator if multiple events/trips overlap on the same date */}
                          {day.hasMultiEvents && (
                            <span className="w-1 h-1 rounded-full bg-red-600 dark:bg-red-400 mt-0.5 z-10 animate-in fade-in" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Monthly / Selected Range Detail Drawer (Swiss Minimal Typography & Lines) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {displayedAgendaCells.length > 0 && (
        <div data-selected-drawer="true" className="w-full max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 mt-6 animate-in slide-in-from-bottom-3 duration-200">
          <div className="p-4 sm:p-6 rounded-none border-t-2 border-b border-black dark:border-white bg-transparent flex flex-col gap-5">
            {/* Top row: Date header & Add button */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-baseline gap-3 flex-wrap">
                {selectedRange ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-black dark:text-white">
                      {selectedRange.start === selectedRange.end
                        ? selectedRange.start.replace(/-/g, '.')
                        : `${selectedRange.start.replace(/-/g, '.')} — ${selectedRange.end.replace(/-/g, '.')}`}
                    </span>
                    {isMultiDaySelected && (
                      <span className="text-xs font-mono font-bold tracking-widest text-red-600 dark:text-red-400 uppercase">
                        [{selectedDaysCount} DAYS]
                      </span>
                    )}
                    {selectedCells.length === 1 && selectedCells[0].holiday && (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 font-sans">
                        · {selectedCells[0].holiday.name}
                      </span>
                    )}
                    {selectedCells.length === 1 && selectedCells[0].isToday && (
                      <span className="text-xs font-mono font-bold text-black/50 dark:text-white/50 uppercase">
                        · TODAY
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-2xl sm:text-3xl font-black font-satoshi tracking-tight text-black dark:text-white uppercase">
                      MONTH AGENDA
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openNewEventModal(selectedRange?.start, selectedRange?.end)}
                  className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{selectedRange && isMultiDaySelected ? '선택 기간에 일정 등록' : '새 일정 등록'}</span>
                </button>
                {selectedRange && (
                  <button
                    type="button"
                    onClick={() => setSelectedRange(null)}
                    className="p-1.5 rounded-full border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    title="선택 해제 후 월간 전체 일정 보기 (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Content: 2-Column Split with Clean Lines (No Box-in-Box) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Left Column: Travel Journeys in Range */}
              <div className="space-y-3">
                {(() => {
                  const uniqueTripsMap = new Map<number, { trip: Trip | Plan; isPlan: boolean }>();
                  displayedAgendaCells.forEach(cell => {
                    cell.overlappingTrips.forEach(t => {
                      if (!uniqueTripsMap.has(t.trip.id)) {
                        uniqueTripsMap.set(t.trip.id, { trip: t.trip, isPlan: t.isPlan });
                      }
                    });
                  });
                  const tripsList = Array.from(uniqueTripsMap.values());

                  return (
                    <>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40 pb-1 border-b border-black/10 dark:border-white/10">
                        <Plane className="w-3.5 h-3.5" />
                        <span>TRAVEL JOURNEYS ({tripsList.length})</span>
                      </div>

                      {tripsList.length === 0 ? (
                        <p className="text-xs font-mono text-black/40 dark:text-white/40 py-2">
                          {selectedRange ? '선택한 기간에 진행되는 여행 여정이 없습니다.' : '이번 달에 등록된 여행 여정이 없습니다.'}
                        </p>
                      ) : (
                        <div className="divide-y divide-black/10 dark:divide-white/10">
                          {tripsList.map(({ trip, isPlan }) => (
                            <div
                              key={`agenda-trip-${trip.id}`}
                              className="py-3 flex items-start justify-between gap-4 group cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-1 transition-colors"
                              onClick={(e) => handleTripBandClick(e, trip, selectedRange?.start || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                                    {trip.date}
                                  </span>
                                  {isPlan && (
                                    <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 border border-amber-500/40 text-amber-700 dark:text-amber-300 rounded-2xs">
                                      PLAN
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm sm:text-base font-black text-black dark:text-white truncate mt-1 group-hover:text-red-600 transition-colors">
                                  {trip.title}
                                </h4>
                                {trip.locationStr && (
                                  <p className="text-xs text-black/50 dark:text-white/50 truncate flex items-center gap-1 mt-0.5 font-mono">
                                    <MapPin className="w-3 h-3" />
                                    <span>{trip.locationStr}</span>
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 flex items-center gap-1 text-xs font-bold font-mono uppercase tracking-wider text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white pt-1">
                                <span>VIEW</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Personal / Blocked Events in Range */}
              <div className="space-y-3">
                {(() => {
                  const uniqueEventsMap = new Map<string, CalendarCustomEvent>();
                  displayedAgendaCells.forEach(cell => {
                    cell.overlappingEvents.forEach(e => {
                      uniqueEventsMap.set(e.event.id, e.event);
                    });
                  });
                  const eventsList = Array.from(uniqueEventsMap.values());

                  return (
                    <>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40 pb-1 border-b border-black/10 dark:border-white/10">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>SCHEDULES & EVENTS ({eventsList.length})</span>
                      </div>

                      {eventsList.length === 0 ? (
                        <p className="text-xs font-mono text-black/40 dark:text-white/40 py-2">
                          {selectedRange ? '선택한 기간에 등록된 개인 일정이 없습니다.' : '이번 달에 등록된 개인 일정이 없습니다.'}
                        </p>
                      ) : (
                        <div className="divide-y divide-black/10 dark:divide-white/10">
                          {eventsList.map((event) => {
                            const cat = EVENT_CATEGORIES.find(c => c.id === event.category) || EVENT_CATEGORIES[0];

                            return (
                              <div
                                key={`agenda-event-${event.id}`}
                                className="py-3 flex items-start justify-between gap-4 group cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-1 transition-colors"
                                onClick={(e) => handleCustomEventClick(e, event)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-2xs font-mono ${cat.badgeClass}`}>
                                      {cat.label}
                                    </span>
                                    <span className="font-mono text-xs text-black/50 dark:text-white/50 font-bold">
                                      {event.startDate === event.endDate ? event.startDate : `${event.startDate} ~ ${event.endDate}`}
                                    </span>
                                  </div>
                                  <h4 className="text-sm sm:text-base font-bold text-black dark:text-white truncate mt-1 group-hover:text-red-600 transition-colors">
                                    {event.title}
                                  </h4>
                                  {event.memo && (
                                    <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5 font-sans">
                                      {event.memo}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 pt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareEvent(event);
                                    }}
                                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                    title="일정 공유"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditEventModal(event);
                                    }}
                                    className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                    title="일정 수정"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
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
                  className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm font-bold text-black dark:text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  autoFocus
                />
              </div>

              {/* Unified Date & Period Inputs (No toggling, auto-synced) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  DATE & PERIOD *
                </label>
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
                      className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600"
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
                      className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600"
                    />
                  </div>
                </div>
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
                  className="w-full px-3 py-2 rounded-sm border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm text-black dark:text-white outline-none focus:border-red-600 resize-none"
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* View-Only Event Modal (Swiss Minimal Card & Share Action)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingEvent && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setViewingEvent(null)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 rounded-none shadow-2xl p-6 overflow-hidden relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Category, Share, Close */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              {(() => {
                const cat = EVENT_CATEGORIES.find(c => c.id === viewingEvent.category) || EVENT_CATEGORIES[0];
                const CatIcon = cat.icon;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-2xs flex items-center gap-1.5 ${cat.badgeClass}`}>
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase">
                      EVENT DETAIL
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-1">
                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => handleShareEvent(viewingEvent)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer relative"
                  title="일정 공유 (링크 / 텍스트 복사)"
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setViewingEvent(null)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Share Copied Toast */}
            {shareCopied && (
              <div className="py-1 px-3 mt-3 bg-emerald-600 text-white font-mono text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
                ✓ 일정 내용이 클립보드에 복사되었습니다.
              </div>
            )}

            {/* Card Content: Swiss Minimal Typography */}
            <div className="mt-5 space-y-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block mb-1">
                  SCHEDULE TITLE
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white font-satoshi tracking-tight">
                  {viewingEvent.title}
                </h2>
              </div>

              {/* Date & Duration */}
              <div className="py-3 border-y border-black/10 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block">
                    DATE & PERIOD
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-black dark:text-white mt-0.5 block">
                    {viewingEvent.startDate === (viewingEvent.endDate || viewingEvent.startDate)
                      ? viewingEvent.startDate
                      : `${viewingEvent.startDate} — ${viewingEvent.endDate}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block">
                    TOTAL
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-red-600 dark:text-red-400 mt-0.5 block">
                    {getDaysDifference(viewingEvent.startDate, viewingEvent.endDate || viewingEvent.startDate)} DAYS
                  </span>
                </div>
              </div>

              {/* Memo */}
              {viewingEvent.memo ? (
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block mb-1">
                    MEMO / NOTE
                  </span>
                  <p className="text-sm font-sans text-black/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed bg-black/[0.02] dark:bg-white/[0.03] p-3 border-l-2 border-black/20 dark:border-white/20">
                    {viewingEvent.memo}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Bottom Actions: Edit / Delete */}
            <div className="flex items-center justify-between pt-5 mt-6 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  const evt = viewingEvent;
                  setViewingEvent(null);
                  handleDeleteEvent(evt.id);
                }}
                className="px-3 py-1.5 rounded-sm border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const evt = viewingEvent;
                  setViewingEvent(null);
                  openEditEventModal(evt);
                }}
                className="px-4 py-1.5 rounded-sm bg-black dark:bg-white text-white dark:text-black hover:opacity-90 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDIT SCHEDULE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
