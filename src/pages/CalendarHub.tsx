import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, 
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

  // 연도 / 월 스크롤형 드롭다운 메뉴 상태 및 Ref
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지하여 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    if (isYearDropdownOpen || isMonthDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isYearDropdownOpen, isMonthDropdownOpen]);

  // 일자 마우스 오버 툴팁 상태
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    x: number;
    y: number;
    dateStr: string;
    holidayName?: string;
    items: {
      title: string;
      type: 'trip' | 'event';
      isPlan?: boolean;
      categoryColor?: string;
      days?: number;
    }[];
  } | null>(null);

  // 뷰 모드: 월별 보기 ('month') vs 연간 보기 ('year')
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const toggleViewMode = (mode: 'month' | 'year') => {
    if (viewMode === mode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsTransitioning(false);
      if (mode === 'year') {
        setTimeout(() => {
          const el = document.getElementById(`year-month-${currentMonth}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    }, 180);
  };

  // 편집 모드 토글 (기본값 false: 안전한 순수 조회 모드 & 자유 스크롤, true: 날짜 선택/드래그 및 일정 추가 활성화)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const isEditModeRef = useRef<boolean>(false);

  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  // 복수 날짜 선택 범위 상태 (단일 날짜 선택 시 start === end)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(() => {
    if (initialFocus.dateStr) {
      return { start: initialFocus.dateStr, end: initialFocus.dateStr };
    }
    return null;
  });
  // 특정 개별 일정 선택 상태 (동일 날짜 복수 일정 등록 시 개별 일정 단독 활성화용)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [dragAnchorDate, setDragAnchorDate] = useState<string | null>(initialFocus.dateStr);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isDraggingRef = useRef<boolean>(false);
  const dragAnchorDateRef = useRef<string | null>(initialFocus.dateStr);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const justDraggedRef = useRef<boolean>(false);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    dragAnchorDateRef.current = dragAnchorDate;
  }, [dragAnchorDate]);

  // 전역 마우스 및 터치 드래그 종료 리스너 (브라우저 어디서 마우스/터치를 떼도 정상 완료 및 선택 유지)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Non-passive touch listener to prevent vertical scrolling during mobile drag (편집 모드 켜졌을 때만 동작)
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (!isEditModeRef.current) return;
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
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);
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
  }, [viewMode, isEditMode]);

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

  // 여정 퀵 프리뷰 모달 상태 (클릭 시 바로 이동하지 않고 미니멀 모달 노출)
  const [viewingTrip, setViewingTrip] = useState<{ trip: Trip | Plan; isPlan: boolean; dateStr: string } | null>(null);

  // 일정 등록/수정 모달 상태
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarCustomEvent | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState<string>('');
  const [eventFormStartDate, setEventFormStartDate] = useState<string>('');
  const [eventFormEndDate, setEventFormEndDate] = useState<string>('');
  const [eventFormCategory, setEventFormCategory] = useState<'work' | 'family' | 'personal' | 'blocked'>('work');
  const [eventFormMemo, setEventFormMemo] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const yearInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Firestore 동기화 (users/public/calendar_events) - 로컬 데이터 영구성 보장
  useEffect(() => {
    try {
      const colRef = collection(db, 'users', 'public', 'calendar_events');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const eventsList: CalendarCustomEvent[] = [];
        snapshot.forEach((docSnap) => {
          eventsList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        if (eventsList.length > 0) {
          // 원격에 데이터가 있으면 로컬과 동기화
          setCustomEvents(eventsList);
          try {
            localStorage.setItem('custom_calendar_events', JSON.stringify(eventsList));
          } catch (_) {}
        } else {
          // 원격이 빈 목록인 경우: 로컬 캐시가 이미 존재한다면 이를 지우지 않고 원격으로 복원 업로드
          try {
            const localSaved = localStorage.getItem('custom_calendar_events');
            if (localSaved) {
              const localList: CalendarCustomEvent[] = JSON.parse(localSaved);
              if (Array.isArray(localList) && localList.length > 0) {
                setCustomEvents(localList);
                // Firestore에 누락된 로컬 데이터 업로드
                localList.forEach(evt => {
                  try {
                    const docRef = doc(db, 'users', 'public', 'calendar_events', evt.id);
                    const cleaned: any = {};
                    Object.entries(evt).forEach(([k, v]) => {
                      if (v !== undefined) cleaned[k] = v;
                    });
                    setDoc(docRef, cleaned).catch(() => {});
                  } catch (_) {}
                });
              }
            }
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
        if (viewingTrip) {
          setViewingTrip(null);
          return;
        }
        if (viewingEvent) {
          setViewingEvent(null);
          return;
        }
        if (isEventModalOpen) {
          setIsConfirmingDelete(false);
          closeEventModal();
          return;
        }
        if (selectedRange || selectedScheduleId) {
          setSelectedRange(null);
          setSelectedScheduleId(null);
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

      if (isEditingYear || isEditingMonth || isEventModalOpen || viewingEvent || viewingTrip) return;
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
      const totalEventDays = days.filter(d => d.hasEvent && !d.hasTrip).length;

      return {
        monthIdx,
        monthTab: MONTH_TABS[monthIdx],
        days,
        totalTripDays,
        totalEventDays
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

  // 날짜 셀 클릭 핸들러 (편집 모드 시 범위 선택 지원, 일반 모드 시 해당 날짜 일정 필터링)
  const handleCellClick = (cell: DayCellData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditMode) {
      if (e.shiftKey && dragAnchorDate) {
        const newRange = normalizeRange(dragAnchorDate, cell.dateStr);
        setSelectedRange(newRange);
      } else {
        setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
        setDragAnchorDate(cell.dateStr);
      }
    } else {
      // 일반 모드: 이미 선택된 날짜면 해제(토글), 아니면 해당 날짜 선택 (모달은 바로 띄우지 않고 하단 일정 영역 색상화만 수행)
      setSelectedScheduleId(null);
      if (selectedRange && selectedRange.start === cell.dateStr && selectedRange.end === cell.dateStr) {
        setSelectedRange(null);
        setDragAnchorDate(null);
      } else {
        setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
        setDragAnchorDate(cell.dateStr);
      }
    }
  };

  // 마우스 드래그 시작 (편집 모드 활성화 시에만 동작)
  const handleCellMouseDown = (dateStr: string, e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    if (!isEditMode) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragAnchorDate(dateStr);
    setSelectedRange({ start: dateStr, end: dateStr });
  };

  // 마우스 호버 시 드래그 범위 확장
  const handleCellMouseEnter = (dateStr: string) => {
    if (!isEditMode || !isDragging || !dragAnchorDate) return;
    setSelectedRange(normalizeRange(dragAnchorDate, dateStr));
  };

  // 날짜 마우스 호버 시 툴팁 표시
  const handleDayHover = (
    e: React.MouseEvent,
    dateStr: string,
    holidayName?: string,
    trips: { title: string; isPlan?: boolean; totalDays?: number }[] = [],
    events: { title: string; category?: string; totalDays?: number }[] = []
  ) => {
    if (isDragging) {
      setHoveredTooltip(null);
      return;
    }
    const hasItems = trips.length > 0 || events.length > 0 || !!holidayName;
    if (!hasItems) {
      setHoveredTooltip(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipItems: {
      title: string;
      type: 'trip' | 'event';
      isPlan?: boolean;
      categoryColor?: string;
      days?: number;
    }[] = [];

    trips.forEach(t => {
      tooltipItems.push({
        title: t.title,
        type: 'trip',
        isPlan: t.isPlan,
        days: t.totalDays
      });
    });

    events.forEach(ev => {
      const cat = EVENT_CATEGORIES.find(c => c.id === ev.category);
      tooltipItems.push({
        title: ev.title,
        type: 'event',
        categoryColor: cat?.color,
        days: ev.totalDays
      });
    });

    setHoveredTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      dateStr,
      holidayName,
      items: tooltipItems
    });
  };

  const handleDayLeave = () => {
    setHoveredTooltip(null);
  };

  // 모바일 터치 드래그 시작 (편집 모드 활성화 시에만 동작)
  const handleCellTouchStart = (dateStr: string) => {
    if (!isEditMode) return;
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

  // 실제 여정 상세 페이지로 비행기 전환과 함께 이동 (모달 내 진입 버튼에서 호출)
  const executeNavigateToTrip = (trip: Trip | Plan, dateStr?: string) => {
    const targetDateKey = (dateStr || trip.date).replace(/-/g, '.');
    try {
      sessionStorage.setItem('pending_detail_jump', JSON.stringify({
        tab: 'timeline',
        date: targetDateKey,
      }));
    } catch (_) {}
    onNavigate('detail', trip.id);
  };

  // 특정 여정 클릭 시 바로 이동하지 않고 미니멀 퀵 프리뷰 모달 오픈
  const handleTripBandClick = (e: React.MouseEvent, trip: Trip | Plan, dateStr: string, isPlan: boolean = false) => {
    e.stopPropagation();
    setViewingTrip({ trip, isPlan, dateStr });
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
    setIsConfirmingDelete(false);
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
    setIsConfirmingDelete(false);
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

    // Firestore 영구 저장 (undefined 필드 제거 후 전송)
    try {
      const docRef = doc(db, 'users', 'public', 'calendar_events', eventId);
      const cleanedData: any = {};
      Object.entries(newEvent).forEach(([k, v]) => {
        if (v !== undefined) cleanedData[k] = v;
      });
      await setDoc(docRef, cleanedData);
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
    <div 
      onClick={() => {
        if (justDraggedRef.current || isDragging || isDraggingRef.current) return;
        if (selectedRange || selectedScheduleId) {
          setSelectedRange(null);
          setSelectedScheduleId(null);
          setDragAnchorDate(null);
        }
      }}
      className="w-full min-h-screen bg-transparent text-black dark:text-white transition-colors duration-300 select-none pb-24"
    >
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

            <div className="flex items-center gap-3 sm:gap-6 flex-nowrap whitespace-nowrap select-none">
              {/* 1. Year Display & Scrollable Dropdown Selector */}
              <div className="relative" ref={yearDropdownRef}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 leading-tight">
                    YEAR
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearDropdownOpen(prev => !prev);
                      setIsMonthDropdownOpen(false);
                    }}
                    className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 leading-none h-9 sm:h-14 lg:h-16 group text-black dark:text-white"
                    title="클릭하여 연도 선택"
                  >
                    <span className="group-hover:underline decoration-red-600 decoration-2 underline-offset-4">{currentYear}</span>
                    <ChevronDown className={`w-4 h-4 sm:w-6 sm:h-6 text-black/30 dark:text-white/30 group-hover:text-red-600 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
                  </button>
                </div>

                {/* Scrollable Year Dropdown Popover */}
                {isYearDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 w-36 sm:w-44 max-h-64 overflow-y-auto rounded-md border border-black/15 dark:border-white/15 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl py-1 text-sm font-mono animate-in fade-in zoom-in-95 duration-150">
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
                              ? 'bg-red-600 text-white font-black'
                              : 'text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          <span className="text-sm sm:text-base font-satoshi">{year}</span>
                          {isSelected && <span className="text-[10px] uppercase font-mono tracking-wider">선택</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Swiss Minimal Divider */}
              <span className="text-3xl sm:text-5xl font-light text-black/20 dark:text-white/20 select-none shrink-0">/</span>

              {/* 2. Month Big Number & Scrollable Dropdown Selector */}
              {viewMode === 'month' ? (
                <div className="relative" ref={monthDropdownRef}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 leading-tight">
                      MONTH
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMonthDropdownOpen(prev => !prev);
                        setIsYearDropdownOpen(false);
                      }}
                      className="flex items-baseline gap-2 sm:gap-2.5 cursor-pointer hover:opacity-80 transition-opacity group h-9 sm:h-14 lg:h-16 text-black dark:text-white"
                      title="클릭하여 월 선택"
                    >
                      <span className="text-4xl sm:text-6xl lg:text-7xl font-black font-satoshi tracking-tighter leading-none group-hover:underline decoration-red-600 decoration-2 underline-offset-4">
                        {String(currentMonth + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-1 justify-end pb-0.5 sm:pb-1">
                        <span className="text-base sm:text-lg md:text-xl font-black font-['Inter',sans-serif] tracking-wider uppercase text-red-600 dark:text-red-500 leading-none">
                          {MONTH_NAMES[currentMonth]}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/30 dark:text-white/30 group-hover:text-red-600 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180 text-red-600' : ''}`} />
                      </div>
                    </button>
                  </div>

                  {/* Scrollable Month Dropdown Popover */}
                  {isMonthDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 z-50 w-44 sm:w-52 max-h-72 overflow-y-auto rounded-md border border-black/15 dark:border-white/15 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl py-1 text-sm animate-in fade-in zoom-in-95 duration-150">
                      {MONTH_TABS.map((mTab, idx) => {
                        const isSelected = idx === currentMonth;
                        return (
                          <button
                            key={mTab.num}
                            type="button"
                            onClick={() => {
                              setCurrentMonth(idx);
                              setIsMonthDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white font-black'
                                : 'text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs sm:text-sm">{String(mTab.num).padStart(2, '0')}</span>
                              <span className="font-['Inter',sans-serif] font-black text-sm uppercase">{mTab.full}</span>
                            </div>
                            {isSelected && <span className="text-[10px] uppercase font-mono tracking-wider">선택</span>}
                          </button>
                        );
                      })}
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

              {/* Edit Mode Toggle Button (DRAG와 ADD 통폐합 단일 버튼: 켜야만 날짜 선택/일정 등록 가능) */}
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
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
                    isEditMode
                      ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-600/30'
                      : 'bg-white/80 dark:bg-zinc-900/80 border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                  }`}
                  title={isEditMode ? "편집 모드 활성 (클릭 시 조회 전용 모드로 전환)" : "편집 모드 켜기 (날짜 선택 및 일정 등록)"}
                >
                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{isEditMode ? 'EDIT: ON' : 'EDIT'}</span>
                  {isEditMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                </button>
              )}

              {/* Right group: Prev, Today, Next & Days Badge */}
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

                {/* Days Metric Badge (우측에 나란히 배치하여 여백 낭비 제거, 이모지 제거) */}
                <div className="ml-0.5 px-2 sm:px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-full border border-black/10 dark:border-white/10 text-[10.5px] sm:text-xs font-mono font-bold tracking-wider text-black/80 dark:text-white/80 shrink-0">
                  <span>{viewMode === 'month' ? `${monthStats.travelDays} DAYS` : `${yearStats.travelDays} DAYS`}</span>
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
                  <span className="text-sm sm:text-lg md:text-xl font-black font-['Inter',sans-serif] leading-none tracking-tight">
                    {mTab.num}
                  </span>
                  <span className={`text-[8px] sm:text-[9.5px] md:text-[10.5px] font-bold tracking-wider uppercase leading-tight mt-0.5 font-['Inter',sans-serif] ${
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
          /* ──────────────── MONTH VIEW (Pure Circular Swiss Minimal) ──────────────── */
          <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-2 sm:px-6 mt-3 sm:mt-5">
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
                      className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10.5px] sm:text-xs font-bold font-mono tracking-wider active:scale-95 transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>ADD SCHEDULE</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-black/40 dark:text-white/40 text-[11px] sm:text-xs tracking-wider font-medium">
                    날짜를 드래그하거나 클릭하여 일정을 선택하세요
                  </div>
                )}
              </div>
            )}

            {/* Weekday Header Row: MON TUE WED THU FRI SAT SUN */}
            <div className="grid grid-cols-7 border-b border-black/15 dark:border-white/15 pb-2.5 sm:pb-3 text-center text-xs sm:text-sm font-black tracking-widest font-mono select-none">
              {WEEKDAYS.map((day, idx) => {
                const isSunday = idx === 6;
                const isSaturday = idx === 5;
                return (
                  <div 
                    key={day} 
                    className={`py-0.5 ${
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
                const isSunday = cell.dayOfWeek === 6;
                const isSaturday = cell.dayOfWeek === 5;
                const isHoliday = !!cell.holiday;
                const isInRange = !!(selectedRange && cell.dateStr >= selectedRange.start && cell.dateStr <= selectedRange.end);

                const hasTrip = cell.overlappingTrips.length > 0;
                const tripItem = hasTrip ? cell.overlappingTrips[0] : null;
                const trip = tripItem ? tripItem.trip : null;
                const isPlan = tripItem ? tripItem.isPlan : false;

                // Multi-day trip ribbon connection logic for current row
                const prevInRowHasSameTrip = hasTrip && col > 0 && calendarGrid[cellIdx - 1]?.overlappingTrips.some(t => t.trip.id === trip?.id);
                const nextInRowHasSameTrip = hasTrip && col < 6 && calendarGrid[cellIdx + 1]?.overlappingTrips.some(t => t.trip.id === trip?.id);

                const hasEvent = cell.overlappingEvents.length > 0;
                const eventItem = hasEvent ? cell.overlappingEvents[0].event : null;
                const eventCat = eventItem ? EVENT_CATEGORIES.find(c => c.id === eventItem.category) : null;

                // Circular badge styling based on Concept B & Swiss Minimal (웹 반응형 대형 스케일업)
                let circleClasses = 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full aspect-square shrink-0 flex flex-col items-center justify-center font-mono transition-all duration-150 relative z-10 cursor-pointer';
                let textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-black leading-none';

                if (!cell.isCurrentMonth) {
                  circleClasses += ' opacity-20 text-black/40 dark:text-white/40 hover:opacity-40';
                } else if (cell.isToday) {
                  circleClasses += ' bg-black text-white dark:bg-white dark:text-black font-black shadow-sm scale-105';
                  textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-black leading-none';
                } else if (hasTrip) {
                  circleClasses += ' text-white font-black hover:opacity-95';
                  textClasses = 'text-xs sm:text-base md:text-lg lg:text-xl font-black leading-none text-white';
                } else if (isInRange) {
                  circleClasses += ' bg-red-600/20 ring-2 ring-red-600 text-red-600 dark:text-red-400 font-black';
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

                return (
                  <div
                    key={cell.dateStr}
                    data-calendar-date={cell.dateStr}
                    className="relative flex items-center justify-center h-14 sm:h-16 md:h-20 lg:h-22 w-full"
                  >
                    {/* Multi-day Trip Capsule Ribbon spanning across columns in row (상하/좌우 여백 황금비율 최적화) */}
                    {hasTrip && cell.isCurrentMonth && (
                      <div
                        className={`absolute top-2 bottom-2 sm:top-2.5 sm:bottom-2.5 md:top-3 md:bottom-3 lg:top-3.5 lg:bottom-3.5 z-0 ${
                          !prevInRowHasSameTrip && !nextInRowHasSameTrip
                            ? 'inset-x-1.5 sm:inset-x-2 md:inset-x-2.5 lg:inset-x-3 rounded-full'
                            : !prevInRowHasSameTrip && nextInRowHasSameTrip
                              ? 'left-1.5 sm:left-2 md:left-2.5 lg:left-3 right-0 rounded-l-full'
                              : prevInRowHasSameTrip && !nextInRowHasSameTrip
                                ? 'left-0 right-1.5 sm:right-2 md:right-2.5 lg:right-3 rounded-r-full'
                                : 'left-0 right-0 rounded-none'
                        } ${isPlan ? 'bg-amber-500' : 'bg-[#FF4500] dark:bg-[#FF4500]'}`}
                      />
                    )}

                    {/* Interactive Circular Day Button */}
                    <button
                      type="button"
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
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Mockup-Style Unified 1-Line Agenda Feed (달력 하단 상시 일정 목록 및 선택 영역 색상화) */}
            <div className="mt-4 sm:mt-6 border-t border-black/15 dark:border-white/15 pt-4">
              <div className="flex items-center justify-between pb-3 px-1 text-xs font-mono text-black/60 dark:text-white/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold tracking-wider uppercase text-black/80 dark:text-white/80 shrink-0">
                    SCHEDULES
                  </span>
                  {selectedRange && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold shrink-0 truncate">
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
                    className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] sm:text-xs font-bold font-mono tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
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
                    <div className="text-xs font-mono text-black/40 dark:text-white/40 py-8 text-center uppercase tracking-wider">
                      이번 달에 등록된 일정이 없습니다.
                    </div>
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
                            <span className="text-black/30 dark:text-white/30 shrink-0">|</span>
                            <span className={`font-sans truncate block whitespace-nowrap text-xs sm:text-sm ${
                              isHighlighted 
                                ? 'font-black text-red-600 dark:text-red-400' 
                                : 'font-bold text-black dark:text-white group-hover:text-red-600 transition-colors'
                            }`}>
                              {item.displayTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {item.type === 'trip' && (
                              <span className="text-[10.5px] sm:text-xs font-mono font-bold text-red-600 dark:text-red-400 shrink-0">
                                {item.days === 1 ? '1 DAY' : `${item.days} DAYS`}
                              </span>
                            )}
                            {item.type === 'event' && (
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.eventCatColor }}
                                />
                                <span className="text-[10.5px] sm:text-xs font-mono font-bold text-black/60 dark:text-white/60 shrink-0">
                                  {item.days === 1 ? '1 DAY' : `${item.days} DAYS`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareEvent(item.data);
                                  }}
                                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
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
                                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
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
                              className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer ${
                                isHighlighted ? 'text-red-600 dark:text-red-400' : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
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
            </div>
          </div>
        ) : (
          /* ──────────────── YEAR VIEW (3-Column Desktop / 2-Column Mobile Swiss Minimal) ──────────────── */
          <div className="max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 mt-5 sm:mt-6">
            {/* Year View Minimal Header (불필요한 설명 제거) */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 text-xs font-mono text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10 mb-4 sm:mb-6">
              <span className="font-bold text-black/40 dark:text-white/40 tracking-wider uppercase">
                ANNUAL CALENDAR
              </span>
              <span className="font-bold text-red-600 dark:text-red-400 tracking-wider">
                {currentYear} OVERVIEW (12M)
              </span>
            </div>

            {/* Restored 3-Column Desktop / 2-Column Mobile Grid (3 cols x 4 rows = 12M) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6 md:gap-8">
              {yearMonthsData.map((m) => (
                <div
                  key={m.monthIdx}
                  id={`year-month-${m.monthIdx}`}
                  className="bg-transparent p-2 sm:p-3 md:p-4 flex flex-col transition-all group"
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
                        <span className="text-base sm:text-lg md:text-xl font-black font-mono tracking-tight">
                          {m.monthTab.num < 10 ? `0${m.monthTab.num}` : m.monthTab.num}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold font-['Inter',sans-serif] tracking-wider uppercase opacity-75">
                          {m.monthTab.short}
                        </span>
                      </div>
                    </button>
                    {/* Separated & High-Contrast Trip/Event Badges with Hyphen (3-D, 1-D 가독성 개선) */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {m.totalTripDays > 0 && (
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600 text-white tracking-tight shadow-2xs">
                          TRIP {m.totalTripDays}-D
                        </span>
                      )}
                      {m.totalEventDays > 0 && (
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/15 tracking-tight">
                          EVENT {m.totalEventDays}-D
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini Weekday Headers (M T W T F S S) */}
                  <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-mono font-bold mb-1.5 select-none">
                    {WEEKDAYS.map((wd, wIdx) => (
                      <div
                        key={wd}
                        className={wIdx === 6 ? 'text-red-500' : wIdx === 5 ? 'text-blue-500' : 'text-black/40 dark:text-white/40'}
                      >
                        {wd[0]}
                      </div>
                    ))}
                  </div>

                  {/* Mini Days Grid - Continuous Pill Ribbons & Non-overlapping Circles */}
                  <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1 text-center font-mono select-none">
                    {m.days.map((day, dIdx) => {
                      if (!day.isCurrentMonth) {
                        return <div key={`empty-${m.monthIdx}-${dIdx}`} className="w-full aspect-square max-w-[28px] max-h-[28px] sm:max-w-[34px] sm:max-h-[34px] mx-auto" />;
                      }

                      const col = dIdx % 7;
                      const isSun = day.dayOfWeek === 6;
                      const isSat = day.dayOfWeek === 5;

                      // 이전/다음 날짜와 동일한 여정 연속성 판별 (주 단위 가로 알약 리본 생성)
                      const prevInRowHasTrip = day.hasTrip && col > 0 && m.days[dIdx - 1]?.hasTrip;
                      const nextInRowHasTrip = day.hasTrip && col < 6 && m.days[dIdx + 1]?.hasTrip;

                      // 모바일 2열에서도 절대 겹치지 않는 스케일 (w-6 h-6 sm:w-7 sm:h-7)
                      let circleClasses = 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full aspect-square flex items-center justify-center shrink-0 text-[10px] sm:text-xs md:text-sm font-bold transition-all relative z-10';
                      let textClasses = 'leading-none';

                      if (day.isToday) {
                        circleClasses += ' bg-black text-white dark:bg-white dark:text-black font-black shadow-xs';
                      } else if (day.hasTrip) {
                        circleClasses += ' text-white font-black hover:opacity-90';
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
                          className="w-full aspect-square max-w-[28px] max-h-[28px] sm:max-w-[34px] sm:max-h-[34px] mx-auto flex items-center justify-center relative"
                        >
                          {/* Continuous Trip Pill Ribbon (월달력과 동일한 이어진 알약 느낌) */}
                          {day.hasTrip && (
                            <div
                              className={`absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 z-0 ${
                                !prevInRowHasTrip && !nextInRowHasTrip
                                  ? 'inset-x-0.5 sm:inset-x-1 rounded-full'
                                  : !prevInRowHasTrip && nextInRowHasTrip
                                    ? 'left-0.5 sm:left-1 right-0 rounded-l-full'
                                    : prevInRowHasTrip && !nextInRowHasTrip
                                      ? 'left-0 right-0.5 sm:right-1 rounded-r-full'
                                      : 'left-0 right-0 rounded-none'
                              } ${day.isPlan ? 'bg-amber-500' : 'bg-[#FF4500]'}`}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setCurrentMonth(m.monthIdx);
                              setSelectedRange({ start: day.dateStr, end: day.dateStr });
                              setDragAnchorDate(day.dateStr);
                              toggleViewMode('month');
                            }}
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
                            onMouseLeave={handleDayLeave}
                            className={`cursor-pointer active:scale-95 ${circleClasses}`}
                            title={day.holidayName ? `${day.dateStr} (${day.holidayName})` : day.tripTitles.length > 0 ? `${day.dateStr} · ${day.tripTitles.join(', ')}` : day.dateStr}
                          >
                            <span className={textClasses}>
                              {day.dayNum}
                            </span>
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
              ))}
            </div>
          </div>
        )}
      </div>

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
                  placeholder="예: 도쿄 출장, 가족 모임, 프로젝트 마감"
                  value={eventFormTitle}
                  onChange={(e) => setEventFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-sm border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm font-bold text-black dark:text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                />
              </div>

              {/* Unified Date & Period Inputs (No overlapping or overflow) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  DATE & PERIOD *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0 w-full max-w-full">
                  <div className="min-w-0 w-full max-w-full relative overflow-hidden box-border">
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
                      className="block w-full max-w-full box-border min-w-0 pl-2.5 pr-1 py-2 rounded-sm border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.05] text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="min-w-0 w-full max-w-full relative overflow-hidden box-border">
                    <span className="text-[10px] font-mono text-black/50 dark:text-white/50 block mb-1">종료일</span>
                    <input
                      type="date"
                      required
                      min={eventFormStartDate}
                      value={eventFormEndDate}
                      onChange={(e) => setEventFormEndDate(e.target.value)}
                      className="block w-full max-w-full box-border min-w-0 pl-2.5 pr-1 py-2 rounded-sm border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.05] text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-inner-spin-button]:appearance-none"
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
                  className="w-full px-3 py-2 rounded-sm border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.05] text-base sm:text-sm text-black dark:text-white outline-none focus:border-red-600 resize-none"
                />
              </div>

              {/* Action Buttons with Safe Delete Confirmation */}
              <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
                {editingEvent ? (
                  <div className="flex items-center">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingDelete(false);
                            handleDeleteEvent(editingEvent.id);
                          }}
                          className="px-2.5 py-1.5 rounded-sm bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold tracking-wider cursor-pointer shadow-xs"
                        >
                          CONFIRM DELETE
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="px-2 py-1.5 rounded-sm border border-black/20 dark:border-white/20 text-xs font-mono font-bold text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="p-2 rounded-sm border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        title="일정 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono font-bold">DELETE</span>
                      </button>
                    )}
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      closeEventModal();
                    }}
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
      {/* View-Only Event Modal (Swiss Minimal Card & Top Edit Icon)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingEvent && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setViewingEvent(null)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 rounded-none shadow-2xl p-6 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Category, Edit Icon, Share, Close */}
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
                {/* Minimal Edit Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    const evt = viewingEvent;
                    setViewingEvent(null);
                    openEditEventModal(evt);
                  }}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="일정 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

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
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Journey Preview Modal (Swiss Minimal Editorial Card)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingTrip && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setViewingTrip(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 shadow-2xl p-5 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Journey Type Badge & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-500">
                  {viewingTrip.isPlan ? 'TRAVEL PLAN' : 'JOURNEY LOG'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingTrip(null)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block mb-0.5">
                  TITLE
                </span>
                <h3 className="text-xl font-black text-black dark:text-white font-satoshi tracking-tight leading-tight">
                  {viewingTrip.trip.title}
                </h3>
              </div>

              <div className="flex items-baseline justify-between py-2 border-y border-black/10 dark:border-white/10">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40 block">
                    PERIOD
                  </span>
                  <span className="font-mono text-sm font-bold text-black dark:text-white">
                    {viewingTrip.trip.date}
                  </span>
                </div>
                {(() => {
                  const range = parseTripDateRange(viewingTrip.trip.date);
                  if (range) {
                    const days = getDaysDifference(range.start, range.end);
                    return (
                      <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">
                        {days} DAYS
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {(viewingTrip.trip.locationStr || (viewingTrip.trip.tags && viewingTrip.trip.tags.length > 0)) && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-black/60 dark:text-white/60">
                  <MapPin className="w-3 h-3 text-black/40 dark:text-white/40" />
                  <span>{viewingTrip.trip.locationStr || viewingTrip.trip.tags.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Action: Enter Journey Arrow Button (비행기 전환 모션과 함께 상세 페이지 진입) */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  const t = viewingTrip.trip;
                  const d = viewingTrip.dateStr;
                  setViewingTrip(null);
                  executeNavigateToTrip(t, d);
                }}
                className="w-full py-2.5 px-4 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.99] text-xs font-black font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>OPEN JOURNEY</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Date Hover Information Tooltip (Swiss Minimal Floating Card)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {hoveredTooltip && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-md bg-black/95 dark:bg-zinc-900/95 text-white border border-white/15 shadow-2xl backdrop-blur-md min-w-[160px] max-w-xs animate-in fade-in zoom-in-95 duration-150 select-none"
          style={{ left: hoveredTooltip.x, top: hoveredTooltip.y - 8 }}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/15 text-[10px] font-mono">
            <span className="font-bold text-red-500 tracking-wider">
              {hoveredTooltip.dateStr.replace(/-/g, '.')}
            </span>
            {hoveredTooltip.holidayName && (
              <span className="text-red-400 font-bold truncate">
                {hoveredTooltip.holidayName}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            {hoveredTooltip.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: it.categoryColor || (it.isPlan ? '#F59E0B' : '#FF4500') }}
                  />
                  <span className="font-sans font-bold truncate text-white">
                    {it.title}
                  </span>
                </div>
                {it.days && (
                  <span className="text-[10px] font-mono text-white/60 shrink-0 font-bold">
                    {it.days === 1 ? '1 DAY' : `${it.days} DAYS`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
