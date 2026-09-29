// Calendar constants, types and date helpers (moved from CalendarHub.tsx, unchanged).
import { Briefcase, Heart, User, AlertCircle, Sun } from 'lucide-react';
import { Trip, Plan, TimelineData, CalendarCustomEvent } from '../../types';
import { KoreanHoliday } from '../../utils/koreanHolidays';

export interface CalendarWeatherCity {
  name: string;
  nameEn: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

export const CALENDAR_WEATHER_CITIES: CalendarWeatherCity[] = [
  { name: '서울', nameEn: 'SEOUL', country: 'KR', lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
  { name: '도쿄', nameEn: 'TOKYO', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: '오사카', nameEn: 'OSAKA', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
  { name: '파리', nameEn: 'PARIS', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: '런던', nameEn: 'LONDON', country: 'GB', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: '뉴욕', nameEn: 'NEW YORK', country: 'US', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  { name: '방콕', nameEn: 'BANGKOK', country: 'TH', lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  { name: '다낭', nameEn: 'DA NANG', country: 'VN', lat: 16.0544, lng: 108.2022, timezone: 'Asia/Ho_Chi_Minh' },
  { name: '싱가포르', nameEn: 'SINGAPORE', country: 'SG', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: '타이베이', nameEn: 'TAIPEI', country: 'TW', lat: 25.0330, lng: 121.5654, timezone: 'Asia/Taipei' },
  { name: '홍콩', nameEn: 'HONG KONG', country: 'HK', lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  { name: '바르셀로나', nameEn: 'BARCELONA', country: 'ES', lat: 41.3851, lng: 2.1734, timezone: 'Europe/Madrid' },
];

export interface CalendarHubPageProps {
  trips: Trip[];
  plans: Plan[];
  timelineData?: TimelineData;
  onNavigate: (view: string, tripId?: number | null) => void;
  onCreateTrip?: (dateStr?: string) => void;
  isDarkMode?: boolean;
}

export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export const MONTH_TABS = [
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

export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const EVENT_CATEGORIES = [
  { id: 'work', label: '출장/업무', icon: Briefcase, color: '#2563eb', badgeClass: 'bg-blue-600 text-white' },
  { id: 'family', label: '가족/경조사', icon: Heart, color: '#e11d48', badgeClass: 'bg-rose-600 text-white' },
  { id: 'personal', label: '개인/휴식', icon: User, color: '#059669', badgeClass: 'bg-emerald-600 text-white' },
  { id: 'blocked', label: '일정불가/참조', icon: AlertCircle, color: '#4b5563', badgeClass: 'bg-zinc-700 text-white' },
] as const;

export interface DayCellData {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0: Sun, 1: Mon, ..., 6: Sat
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
export function parseTripDateRange(dateStr: string): { start: string; end: string } | null {
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
export function getDaysDifference(startStr: string, endStr: string): number {
  const d1 = new Date(startStr);
  const d2 = new Date(endStr);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// 두 날짜 문자열 정규화 ({ start: min, end: max })
export function normalizeRange(d1: string, d2: string): { start: string; end: string } {
  return d1 <= d2 ? { start: d1, end: d2 } : { start: d2, end: d1 };
}
