// Calendar hub state: everything the calendar screens read and do (moved from CalendarHub.tsx, unchanged).
import { saveUserPref } from '../../utils/userPrefs';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowRight, Sun } from 'lucide-react';
import { Trip, Plan, CalendarCustomEvent } from '../../types';
import { getKoreanHolidays, getHolidayInfo } from '../../utils/koreanHolidays';
import { auth, db } from '../../firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { fetchCityWeather, getSimulatedWeatherForDate, CityWeatherData, DailyForecastItem, cleanCityDisplayName } from '../../utils/weatherApi';
import { WORLD_CITIES, findCityByNameOrAlias } from '../../data/worldDestinations';
import { confirmDialog } from '../../utils/feedback';
import { swipeStart, swipeDirection, SwipeStart } from '../../utils/swipe';
import { useHubVisible } from '../../app/hubVisible';
import { useMyCities } from '../../utils/myCities';
import { CalendarWeatherCity, CALENDAR_WEATHER_CITIES, CalendarHubPageProps, MONTH_TABS, EVENT_CATEGORIES, DayCellData, parseTripDateRange, getDaysDifference, normalizeRange } from './calendarData';

export function useCalendarHubState({
  trips,
  plans,
  timelineData,
  onNavigate,
  onCreateTrip,
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

  // 연도 / 월 스크롤형 드롭다운 메뉴 및 12개월 스트립 상태 및 Ref
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState<boolean>(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);
  const [isMonthStripOpen, setIsMonthStripOpen] = useState<boolean>(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 년달력에서 1차 선택된 날짜 (2차 클릭 시 해당 월달력으로 진입)
  const [selectedYearDate, setSelectedYearDate] = useState<string | null>(null);

  // 일자 마우스 오버 및 모바일 탭 툴팁 상태
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    x: number;
    y: number;
    placement?: 'top' | 'bottom';
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

  // 날짜 상세 Quick View 바텀시트/팝오버 상태 및 부드러운 슬라이드 애니메이션 제어
  const [quickViewDate, setQuickViewDate] = useState<{
    dateStr: string;
    holidayName?: string;
    weather?: DailyForecastItem | null;
    items: {
      title: string;
      type: 'trip' | 'event';
      isPlan?: boolean;
      categoryColor?: string;
      days?: number;
      itemObj?: any;
    }[];
  } | null>(null);
  const [isQuickViewAnimOpen, setIsQuickViewAnimOpen] = useState<boolean>(false);
  const quickViewRef = useRef<HTMLDivElement>(null);
  const [isPeekExpanded, setIsPeekExpanded] = useState<boolean>(false);
  const peekTouchYRef = useRef<number | null>(null);
  const isPeekOpen = !!quickViewDate;

  // 하단 피크 바가 열려 있는 동안 다른 하단 플로팅(퀵 독, TOP)은 비켜선다
  // (only while the calendar is the hub on screen: a kept-alive calendar must not hide the tab bar from the other drawers)
  const hubVisible = useHubVisible();
  useEffect(() => {
    if (!isPeekOpen) { setIsPeekExpanded(false); return; }
    if (!hubVisible) return;
    document.documentElement.setAttribute('data-peek', '1');
    return () => document.documentElement.removeAttribute('data-peek');
  }, [isPeekOpen, hubVisible]);

  useEffect(() => {
    if (quickViewDate) {
      const raf = requestAnimationFrame(() => {
        setIsQuickViewAnimOpen(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsQuickViewAnimOpen(false);
    }
  }, [quickViewDate]);

  const closeQuickView = () => {
    setIsQuickViewAnimOpen(false);
    setTimeout(() => {
      setQuickViewDate(null);
    }, 280);
  };

  // 모바일 터치 스와이프 제스처 Ref
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // 드롭다운 및 모바일 툴팁/퀵뷰 외부 클릭/터치 감지하여 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(target)) {
        setIsMonthDropdownOpen(false);
        setIsMonthStripOpen(false);
      }
      if (hoveredTooltip) {
        // 년달력 또는 월달력 날짜 버튼 클릭이 아닌 다른 곳을 누르면 툴팁 및 선택 해제
        const clickedDayBtn = (target as HTMLElement)?.closest?.('[data-calendar-year-cell], [data-calendar-month-cell]');
        const clickedTooltip = tooltipRef.current?.contains(target);
        if (!clickedDayBtn && !clickedTooltip) {
          setHoveredTooltip(null);
          setSelectedYearDate(null);
        }
      }
    };
    if (isYearDropdownOpen || isMonthDropdownOpen || isMonthStripOpen || hoveredTooltip) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isYearDropdownOpen, isMonthDropdownOpen, isMonthStripOpen, hoveredTooltip]);

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
      const saved = localStorage.getItem(`custom_calendar_events:${auth.currentUser?.uid || 'guest'}`);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // This member's cities (main and favourites, myCities.ts); the operator's list is only the starting set
  const { list: myCityList } = useMyCities();
  const weatherCities: CalendarWeatherCity[] = myCityList;

  // 날씨 토글 및 선택 도시 상태 (기본: 저장된 도시 또는 서울)
  const [isWeatherMode, setIsWeatherMode] = useState<boolean>(false);
  const [selectedWeatherCity, setSelectedWeatherCity] = useState<CalendarWeatherCity>(() => {
    try {
      const savedEn = localStorage.getItem('selected_weather_city_en');
      if (savedEn) {
        const found = weatherCities.find(c => c.nameEn.toUpperCase() === savedEn.toUpperCase());
        if (found) return found;
      }
    } catch (_) {}
    return weatherCities[0] || CALENDAR_WEATHER_CITIES[0];
  });
  const [cityWeatherData, setCityWeatherData] = useState<CityWeatherData | null>(null);

  // 날씨 배경 모션 토글 (로컬스토리지 기억)
  const [isWeatherBgEnabled, setIsWeatherBgEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('calendar_weather_bg_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const toggleWeatherBg = () => {
    setIsWeatherBgEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('calendar_weather_bg_enabled', String(next));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('weatherBgToggled', { detail: next }));
      saveUserPref({ weatherBg: next });
      return next;
    });
  };

  // 전역 미니 날씨 위젯과의 실시간 도시 동기화
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvent = e as CustomEvent<CalendarWeatherCity>;
      if (customEvent.detail && customEvent.detail.nameEn) {
        const matchingCity = weatherCities.find(c => c.nameEn.toUpperCase() === customEvent.detail.nameEn.toUpperCase());
        if (matchingCity) {
          setSelectedWeatherCity(matchingCity);
        } else {
          setSelectedWeatherCity(customEvent.detail);
        }
      }
    };
    window.addEventListener('selectedWeatherCityChanged', handleGlobalChange);
    return () => {
      window.removeEventListener('selectedWeatherCityChanged', handleGlobalChange);
    };
  }, [weatherCities]);

  const handleSelectCity = (c: CalendarWeatherCity) => {
    setSelectedWeatherCity(c);
    // Only the calendar looks at this city; the main city stays where the member set it
    if (selectedWeatherDay) {
      const exact = cityWeatherData?.forecast?.find(f => f.date === selectedWeatherDay.dateStr);
      const w = exact || getSimulatedWeatherForDate(c.nameEn, selectedWeatherDay.dateStr);
      setSelectedWeatherDay({ dateStr: selectedWeatherDay.dateStr, city: c, weather: w });
    }
  };

  // 선택된 날짜의 상세 날씨 위젯 상태
  const [selectedWeatherDay, setSelectedWeatherDay] = useState<{
    dateStr: string;
    city: CalendarWeatherCity;
    weather: DailyForecastItem;
    isForecast?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isWeatherMode) return;
    let isCancelled = false;
    fetchCityWeather(
      selectedWeatherCity.lat,
      selectedWeatherCity.lng,
      selectedWeatherCity.timezone,
      selectedWeatherCity.nameEn,
      selectedWeatherCity.country
    ).then((data) => {
      if (!isCancelled) setCityWeatherData(data);
    }).catch((err) => {
      console.warn("Calendar weather fetch notice:", err);
    });
    return () => { isCancelled = true; };
  }, [isWeatherMode, selectedWeatherCity]);

  // 날씨 도시 알약 칩 가로 스크롤 상태 및 제어
  const weatherChipsRef = useRef<HTMLDivElement>(null);
  const [canScrollChipsLeft, setCanScrollChipsLeft] = useState(false);
  const [canScrollChipsRight, setCanScrollChipsRight] = useState(false);

  const checkChipsScroll = useCallback(() => {
    const el = weatherChipsRef.current;
    if (!el) return;
    setCanScrollChipsLeft(el.scrollLeft > 2);
    setCanScrollChipsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = weatherChipsRef.current;
    if (!el || !isWeatherMode) return;
    checkChipsScroll();
    el.addEventListener('scroll', checkChipsScroll, { passive: true });
    window.addEventListener('resize', checkChipsScroll);
    return () => {
      el.removeEventListener('scroll', checkChipsScroll);
      window.removeEventListener('resize', checkChipsScroll);
    };
  }, [weatherCities, isWeatherMode, checkChipsScroll]);

  const scrollChipsLeft = () => {
    weatherChipsRef.current?.scrollBy({ left: -160, behavior: 'smooth' });
  };

  const scrollChipsRight = () => {
    weatherChipsRef.current?.scrollBy({ left: 160, behavior: 'smooth' });
  };

  // 캘린더 허브 언마운트 시 오늘 날씨 모션으로 복귀
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', { detail: null }));
    };
  }, []);

  // 현재 선택된 날씨 도시의 최적 여행 시기 데이터 (WORLD_CITIES 매칭)
  const destinationCityData = useMemo(() => {
    if (!isWeatherMode || !selectedWeatherCity) return null;
    const targetEn = selectedWeatherCity.nameEn.toLowerCase();
    const targetKo = selectedWeatherCity.name;
    return WORLD_CITIES.find(
      c => c.nameEn.toLowerCase() === targetEn || c.nameKo === targetKo
    ) || null;
  }, [isWeatherMode, selectedWeatherCity]);

  // 다가오는 가장 가까운 미래 여정 계산 (D-Day 배지용)
  const nextUpcomingTrip = useMemo(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const allFuture: { title: string; startDate: string; daysLeft: number }[] = [];

    trips.forEach(t => {
      const range = parseTripDateRange(t.date);
      const s = range?.start;
      if (s && s >= todayStr) {
        const diffMs = new Date(s).getTime() - new Date(todayStr).getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        allFuture.push({ title: t.title, startDate: s, daysLeft });
      }
    });

    plans.forEach(p => {
      const range = parseTripDateRange(p.date);
      const s = range?.start;
      if (s && s >= todayStr) {
        const diffMs = new Date(s).getTime() - new Date(todayStr).getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        allFuture.push({ title: p.title, startDate: s, daysLeft });
      }
    });

    if (allFuture.length === 0) return null;
    allFuture.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return allFuture[0];
  }, [trips, plans, today]);

  // 뷰 전용 스위스 모달 상태
  const [viewingEvent, setViewingEvent] = useState<CalendarCustomEvent | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // 여정 퀵 프리뷰 모달 상태 (클릭 시 바로 이동하지 않고 미니멀 모달 노출)
  const [viewingTrip, setViewingTrip] = useState<{ trip: Trip | Plan; isPlan: boolean; dateStr: string } | null>(null);

  // 연간 달력 여정 카운터 클릭 시 팝업되는 여정 리스트 모달 상태
  const [isYearTripsModalOpen, setIsYearTripsModalOpen] = useState<boolean>(false);

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

  // Each member's own events (v1.3.6): Firestore users/{uid}/calendar_events, localStorage is the render cache
  const eventsCacheKey = `custom_calendar_events:${auth.currentUser?.uid || 'guest'}`;
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsubscribe = onSnapshot(collection(db, 'users', uid, 'calendar_events'), (snapshot) => {
      const eventsList: CalendarCustomEvent[] = [];
      snapshot.forEach((docSnap) => {
        eventsList.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setCustomEvents(eventsList);
      try {
        localStorage.setItem(eventsCacheKey, JSON.stringify(eventsList));
      } catch (_) {}
    }, (err) => {
      console.warn("Firestore calendar_events sync error, using cached data", err);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // P5-3: each journey's destination, so its days show the weather where the journey is
  const journeyWeatherCities = useMemo(() => {
    return parsedJourneys.map(({ journey, range }) => {
      const names = [journey.locations?.[0]?.name, (journey.locationStr || '').split(',')[0], journey.country].filter(Boolean) as string[];
      let city: CalendarWeatherCity | null = null;
      for (const n of names) {
        const found = findCityByNameOrAlias(n);
        if (found) {
          city = { name: found.nameKo, nameEn: found.nameEn.toUpperCase(), country: found.countryEn, lat: found.lat, lng: found.lng, timezone: 'UTC' };
          break;
        }
      }
      if (!city && typeof journey.lat === 'number' && typeof journey.lng === 'number' && (journey.lat || journey.lng)) {
        const label = cleanCityDisplayName(names[0] || journey.title);
        city = { name: label, nameEn: label.toUpperCase(), country: journey.country || '', lat: journey.lat, lng: journey.lng, timezone: 'UTC' };
      }
      return city ? { tripId: journey.id, range, city } : null;
    }).filter(Boolean) as { tripId: number; range: { start: string; end: string }; city: CalendarWeatherCity }[];
  }, [parsedJourneys]);

  // Forecasts (about five days ahead) for journeys under way or starting soon; fetchCityWeather caches per day
  const [journeyForecasts, setJourneyForecasts] = useState<Record<number, CityWeatherData>>({});
  useEffect(() => {
    if (!isWeatherMode) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const t = new Date();
    const from = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    const u = new Date(t.getTime() + 6 * 86400000);
    const to = `${u.getFullYear()}-${pad(u.getMonth() + 1)}-${pad(u.getDate())}`;
    let cancelled = false;
    journeyWeatherCities
      .filter(j => j.range.end >= from && j.range.start <= to)
      .forEach(j => {
        fetchCityWeather(j.city.lat, j.city.lng, j.city.timezone, j.city.nameEn, j.city.country)
          .then(data => { if (!cancelled) setJourneyForecasts(prev => ({ ...prev, [j.tripId]: data })); })
          .catch(() => {});
      });
    return () => { cancelled = true; };
  }, [isWeatherMode, journeyWeatherCities]);

  // The weather to show for a date: the journey's destination on its days, otherwise the chosen city
  const weatherForDate = useCallback((dateStr: string): { weather: DailyForecastItem; city: CalendarWeatherCity; isForecast: boolean } => {
    const j = journeyWeatherCities.find(x => dateStr >= x.range.start && dateStr <= x.range.end);
    if (j) {
      const exact = journeyForecasts[j.tripId]?.forecast?.find(f => f.date === dateStr);
      return { weather: exact || getSimulatedWeatherForDate(j.city.nameEn, dateStr), city: j.city, isForecast: !!exact };
    }
    const exact = cityWeatherData?.forecast?.find(f => f.date === dateStr);
    return { weather: exact || getSimulatedWeatherForDate(selectedWeatherCity.nameEn, dateStr), city: selectedWeatherCity, isForecast: !!exact };
  }, [journeyWeatherCities, journeyForecasts, cityWeatherData, selectedWeatherCity]);

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
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayStr = `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    setCurrentYear(todayY);
    setCurrentMonth(todayM);
    setSelectedRange({ start: todayStr, end: todayStr });
    setDragAnchorDate(todayStr);
    setSelectedScheduleId(null);

    // 날씨 모드인 경우 오늘 날씨 항목으로 선택 동기화하여 날씨 선택 링과 카드가 오늘로 즉시 이동
    if (isWeatherMode) {
      const { weather: w, city: wCity, isForecast } = weatherForDate(todayStr);
      if (w) {
        setSelectedWeatherDay({
          dateStr: todayStr,
          city: wCity,
          weather: w,
          isForecast
        });
        window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', {
          detail: { weatherCode: w.weatherCode, precipitationProb: w.precipitationProb }
        }));
      } else {
        setSelectedWeatherDay(null);
        window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', { detail: null }));
      }
    } else {
      setSelectedWeatherDay(null);
      // 일반 모드: 오늘 날짜 기준 실시간 날씨 배경으로 복귀
      window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', { detail: null }));
    }

    // 오늘 날짜에 속한 여정(Trip) 및 커스텀 일정(Event) 추출
    const matchingTrips: any[] = [];
    parsedJourneys.forEach(({ journey, isPlan, range }) => {
      if (todayStr >= range.start && todayStr <= range.end) {
        matchingTrips.push({
          title: journey.title,
          type: 'trip' as const,
          isPlan,
          days: getDaysDifference(range.start, range.end),
          categoryColor: isPlan ? '#3b82f6' : '#ef4444',
          itemObj: journey
        });
      }
    });

    const matchingEvents: any[] = [];
    customEvents.forEach((ev) => {
      const evEnd = ev.endDate || ev.startDate;
      if (todayStr >= ev.startDate && todayStr <= evEnd) {
        const cat = EVENT_CATEGORIES.find(c => c.id === ev.category);
        matchingEvents.push({
          title: ev.title,
          type: 'event' as const,
          categoryColor: cat?.color || '#10b981',
          days: getDaysDifference(ev.startDate, evEnd),
          itemObj: ev
        });
      }
    });

    const exactWeather = cityWeatherData?.forecast?.find(f => f.date === todayStr);
    const todayWeather = exactWeather || (isWeatherMode ? getSimulatedWeatherForDate(selectedWeatherCity.nameEn, todayStr) : undefined);

    setQuickViewDate({
      dateStr: todayStr,
      holidayName: getHolidayInfo(todayStr)?.name,
      weather: todayWeather,
      items: [...matchingTrips, ...matchingEvents]
    });

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
        if (isYearTripsModalOpen) {
          setIsYearTripsModalOpen(false);
          return;
        }
        if (quickViewDate) {
          setQuickViewDate(null);
          return;
        }
        if (isMonthStripOpen) {
          setIsMonthStripOpen(false);
          return;
        }
        if (isYearDropdownOpen) {
          setIsYearDropdownOpen(false);
          return;
        }
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

      if (isEditingYear || isEditingMonth || isEventModalOpen || viewingEvent || viewingTrip || quickViewDate) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (viewMode === 'month') handlePrevMonth();
        else setCurrentYear(prev => prev - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'month') handleNextMonth();
        else setCurrentYear(prev => prev + 1);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleGoToday();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleViewMode(viewMode === 'month' ? 'year' : 'month');
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setIsWeatherMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingYear, isEditingMonth, isEventModalOpen, isYearTripsModalOpen, viewingEvent, viewingTrip, quickViewDate, isMonthStripOpen, isYearDropdownOpen, currentYear, currentMonth, viewMode, selectedRange]);

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



  // 현재 연도에 속하거나 걸쳐 있는 여정 목록 (연간 달력 카운터 및 목록 모달용)
  const currentYearJourneys = useMemo(() => {
    const yearStr = String(currentYear);
    return parsedJourneys.filter(pj => {
      const sYear = pj.range.start.slice(0, 4);
      const eYear = pj.range.end.slice(0, 4);
      return sYear === yearStr || eYear === yearStr || (sYear < yearStr && eYear > yearStr);
    }).sort((a, b) => a.range.start.localeCompare(b.range.start));
  }, [parsedJourneys, currentYear]);

  // 현재 월의 7열 그리드 셀 데이터 생성
  const calendarGrid = useMemo(() => {
    const cells: DayCellData[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // 0: Sun, 1: Mon, ..., 6: Sat (일요일 시작 표준 기준)
    let startDayOfWeek = firstDayOfMonth.getDay(); 
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // 이전 달 패딩 일수
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = prevDate.getDay();
      
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
      const dayOfWeek = currDate.getDay();
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
      const dayOfWeek = nextDate.getDay();

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
      const startDayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
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
        tripId?: string;
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
        let primaryTripId: string | undefined = undefined;

        if (hasTrip) {
          // 기간이 가장 긴 여행 우선 선택
          const primaryTrip = [...matchedTrips].sort((a, b) => {
            const lenA = getDaysDifference(a.range.start, a.range.end);
            const lenB = getDaysDifference(b.range.start, b.range.end);
            return lenB - lenA;
          })[0];

          primaryTripId = String(primaryTrip.journey.id);
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
          tripId: primaryTripId,
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
    setHoveredTooltip(null);
    if (isEditMode) {
      if (e.shiftKey && dragAnchorDate) {
        const newRange = normalizeRange(dragAnchorDate, cell.dateStr);
        setSelectedRange(newRange);
      } else {
        setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
        setDragAnchorDate(cell.dateStr);
      }
    } else {
      // 일반 모드: 이미 선택된 날짜면 해제(토글), 아니면 해당 날짜 선택
      setSelectedScheduleId(null);
      const isSameDate = selectedRange && selectedRange.start === cell.dateStr && selectedRange.end === cell.dateStr;

      if (isSameDate && quickViewDate?.dateStr === cell.dateStr) {
        setSelectedRange(null);
        setDragAnchorDate(null);
        setHoveredTooltip(null);
        setQuickViewDate(null);
        setSelectedWeatherDay(null);
        window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', { detail: null }));
      } else {
        setSelectedRange({ start: cell.dateStr, end: cell.dateStr });
        setDragAnchorDate(cell.dateStr);

        const w = isWeatherMode ? weatherForDate(cell.dateStr).weather : cityWeatherData?.forecast?.find(f => f.date === cell.dateStr);

        if (w) {
          window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', {
            detail: { weatherCode: w.weatherCode, precipitationProb: w.precipitationProb }
          }));
        }

        const items: any[] = [
          ...cell.overlappingTrips.map(t => ({
            title: t.trip.title,
            type: 'trip' as const,
            isPlan: t.isPlan,
            days: t.totalDays,
            categoryColor: t.isPlan ? '#3b82f6' : '#ef4444',
            itemObj: t.trip
          })),
          ...cell.overlappingEvents.map(ev => ({
            title: ev.event.title,
            type: 'event' as const,
            categoryColor: '#10b981',
            days: ev.totalDays,
            itemObj: ev.event
          }))
        ];

        setQuickViewDate({
          dateStr: cell.dateStr,
          holidayName: cell.holiday?.name,
          weather: w,
          items
        });
      }
    }

    // 날씨 모드일 때 클릭한 일자의 상세 일기예보 데이터 세팅
    if (isWeatherMode && cell.isCurrentMonth) {
      const { weather: w, city: wCity, isForecast } = weatherForDate(cell.dateStr);
      if (w) {
        setSelectedWeatherDay({
          dateStr: cell.dateStr,
          city: wCity,
          weather: w,
          isForecast
        });
        window.dispatchEvent(new CustomEvent('weatherAmbienceOverride', {
          detail: { weatherCode: w.weatherCode, precipitationProb: w.precipitationProb }
        }));
      }
    }
  };

  // 년달력 날짜 셀 클릭 핸들러 (1차 클릭: 날짜 선택 강조 및 모달 표시, 2차 클릭: 월달력으로 진입)
  const handleYearDayClick = (
    e: React.MouseEvent,
    day: { dateStr: string; holidayName?: string },
    monthIdx: number
  ) => {
    e.stopPropagation();

    // 2차 클릭: 이미 선택 활성화된 날짜를 한 번 더 누르면 해당 월달력으로 진입
    if (selectedYearDate === day.dateStr) {
      setHoveredTooltip(null);
      setSelectedYearDate(null);
      setCurrentMonth(monthIdx);
      setSelectedRange({ start: day.dateStr, end: day.dateStr });
      setDragAnchorDate(day.dateStr);
      toggleViewMode('month');
      return;
    }

    // 1차 클릭: 년달력에서 해당 날짜 선택 활성화 및 일정 모달 표시
    setSelectedYearDate(day.dateStr);
    setSelectedRange({ start: day.dateStr, end: day.dateStr });
    setDragAnchorDate(day.dateStr);

    const matchedTrips = parsedJourneys.filter(pj => day.dateStr >= pj.range.start && day.dateStr <= pj.range.end);
    const matchedEvents = customEvents.filter(evt => day.dateStr >= evt.startDate && day.dateStr <= (evt.endDate || evt.startDate));
    const hasDetails = matchedTrips.length > 0 || matchedEvents.length > 0 || Boolean(day.holidayName);

    if (hasDetails) {
      handleDayHover(
        e,
        day.dateStr,
        day.holidayName,
        matchedTrips.map(mt => ({ title: mt.journey.title, isPlan: mt.isPlan, totalDays: getDaysDifference(mt.range.start, mt.range.end) })),
        matchedEvents.map(me => ({ title: me.title, category: me.category, totalDays: getDaysDifference(me.startDate, me.endDate || me.startDate) }))
      );
    } else {
      setHoveredTooltip(null);
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

  // 모바일 좌우 스와이프 제스처 (편집 모드가 아닐 때만 동작)
  const calSwipeRef = useRef<SwipeStart | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditMode) return;
    calSwipeRef.current = swipeStart(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isEditMode || !calSwipeRef.current) return;
    // A clear, quick sideways flick with no page scroll in between (see utils/swipe)
    const dir = swipeDirection(calSwipeRef.current, e, 50);
    calSwipeRef.current = null;
    if (dir !== 0) {
      if (dir === 1) {
        // 우로 스와이프 -> 이전 달
        if (viewMode === 'month') handlePrevMonth();
        else setCurrentYear(prev => prev - 1);
      } else {
        // 좌로 스와이프 -> 다음 달
        if (viewMode === 'month') handleNextMonth();
        else setCurrentYear(prev => prev + 1);
      }
    }
  };

  // 날짜 마우스 호버 및 모바일 탭 시 툴팁 표시 (뷰포트 클램핑 및 상하 자동 반전)
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

    // 상단 뷰포트 여백이 130px 미만이면 아래쪽에 렌더링하여 화면 상단 밖 잘림 방지
    const placement: 'top' | 'bottom' = rect.top < 130 ? 'bottom' : 'top';
    const clampedX = Math.max(100, Math.min(window.innerWidth - 100, rect.left + rect.width / 2));
    const targetY = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8;

    setHoveredTooltip({
      x: clampedX,
      y: targetY,
      placement,
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
    const shareText = `[TRIPGON LOG]\n· 일정: ${evt.title}\n· 기간: ${periodStr}\n· 분류: ${categoryInfo.label}${evt.memo ? `\n· 메모: ${evt.memo}` : ''}`;

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
        localStorage.setItem(eventsCacheKey, JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // Firestore 영구 저장 (undefined 필드 제거 후 전송)
    try {
      const docRef = doc(db, 'users', auth.currentUser?.uid || 'guest', 'calendar_events', eventId);
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
    if (!await confirmDialog("이 일정을 삭제하시겠습니까?")) return;

    setCustomEvents(prev => {
      const next = prev.filter(item => item.id !== eventId);
      try {
        localStorage.setItem(eventsCacheKey, JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    try {
      const docRef = doc(db, 'users', auth.currentUser?.uid || 'guest', 'calendar_events', eventId);
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

  return {
    trips,
    plans,
    timelineData,
    onNavigate,
    onCreateTrip,
    isDarkMode,
    today,
    initialFocus,
    currentYear,
    setCurrentYear,
    currentMonth,
    setCurrentMonth,
    isEditingYear,
    setIsEditingYear,
    yearInputVal,
    setYearInputVal,
    isEditingMonth,
    setIsEditingMonth,
    monthInputVal,
    setMonthInputVal,
    isYearDropdownOpen,
    setIsYearDropdownOpen,
    isMonthDropdownOpen,
    setIsMonthDropdownOpen,
    isMonthStripOpen,
    setIsMonthStripOpen,
    yearDropdownRef,
    monthDropdownRef,
    tooltipRef,
    selectedYearDate,
    setSelectedYearDate,
    hoveredTooltip,
    setHoveredTooltip,
    quickViewDate,
    setQuickViewDate,
    isQuickViewAnimOpen,
    setIsQuickViewAnimOpen,
    quickViewRef,
    isPeekExpanded,
    setIsPeekExpanded,
    peekTouchYRef,
    isPeekOpen,
    closeQuickView,
    touchStartXRef,
    touchStartYRef,
    viewMode,
    setViewMode,
    isTransitioning,
    setIsTransitioning,
    toggleViewMode,
    isEditMode,
    setIsEditMode,
    isEditModeRef,
    selectedRange,
    setSelectedRange,
    selectedScheduleId,
    setSelectedScheduleId,
    dragAnchorDate,
    setDragAnchorDate,
    isDragging,
    setIsDragging,
    isDraggingRef,
    dragAnchorDateRef,
    gridContainerRef,
    justDraggedRef,
    customEvents,
    setCustomEvents,
    weatherCities,
    isWeatherMode,
    setIsWeatherMode,
    selectedWeatherCity,
    setSelectedWeatherCity,
    cityWeatherData,
    setCityWeatherData,
    isWeatherBgEnabled,
    setIsWeatherBgEnabled,
    toggleWeatherBg,
    handleSelectCity,
    selectedWeatherDay,
    setSelectedWeatherDay,
    weatherChipsRef,
    canScrollChipsLeft,
    setCanScrollChipsLeft,
    canScrollChipsRight,
    setCanScrollChipsRight,
    checkChipsScroll,
    scrollChipsLeft,
    scrollChipsRight,
    destinationCityData,
    nextUpcomingTrip,
    viewingEvent,
    setViewingEvent,
    shareCopied,
    setShareCopied,
    viewingTrip,
    setViewingTrip,
    isYearTripsModalOpen,
    setIsYearTripsModalOpen,
    isEventModalOpen,
    setIsEventModalOpen,
    editingEvent,
    setEditingEvent,
    eventFormTitle,
    setEventFormTitle,
    eventFormStartDate,
    setEventFormStartDate,
    eventFormEndDate,
    setEventFormEndDate,
    eventFormCategory,
    setEventFormCategory,
    eventFormMemo,
    setEventFormMemo,
    isConfirmingDelete,
    setIsConfirmingDelete,
    yearInputRef,
    monthInputRef,
    parsedJourneys,
    journeyWeatherCities,
    journeyForecasts,
    setJourneyForecasts,
    weatherForDate,
    currentHolidays,
    handlePrevMonth,
    handleNextMonth,
    handleGoToday,
    handleYearSubmit,
    handleMonthSubmit,
    currentYearJourneys,
    calendarGrid,
    globalMaxTracks,
    monthStats,
    yearMonthsData,
    yearStats,
    handleCellClick,
    handleYearDayClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    calSwipeRef,
    handleTouchStart,
    handleTouchEnd,
    handleDayHover,
    handleDayLeave,
    handleCellTouchStart,
    handleGridTouchMove,
    handleGridTouchEnd,
    executeNavigateToTrip,
    handleTripBandClick,
    handleCustomEventClick,
    handleShareEvent,
    openNewEventModal,
    openEditEventModal,
    closeEventModal,
    handleSaveEvent,
    handleDeleteEvent,
    selectedCells,
    displayedAgendaCells,
    isMultiDaySelected,
    selectedDaysCount,
  };
}

export type CalendarHubState = ReturnType<typeof useCalendarHubState>;
