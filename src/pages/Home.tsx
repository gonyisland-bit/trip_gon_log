import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MoreVertical, Menu, Edit2, Trash2, GripVertical, Copy, ArrowUp, Tag, ChevronDown, ChevronUp, Search, X, LayoutGrid, StretchHorizontal, List, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { Trip, Plan, MagazineMoment, MagazineSection, TimelineData } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { ConfirmModal } from '../components/ConfirmModal';
import { cleanAdministrativeDistricts, generateJourneyMessage } from '../components/SummaryView';
import { preloadDetailPage } from '../utils/prefetchHelper';
import { getKoreanHolidays } from '../utils/koreanHolidays';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  handleMoveToArchive: (plan: Plan) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onCloneTrip?: (id: number) => void;
  onClonePlan?: (id: number) => void;
  homeTitle: string;
  homeSubtitle?: string;
  heroJourneyIds?: number[];
  heroAutoSlide?: boolean;
  heroMediaType?: 'image' | 'video';
  heroSlideDuration?: number;
  onEditTrip?: (id: number) => void;
  onDeleteTrip?: (id: number) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  onReorderPlans?: (orderedIds: number[]) => void;
  isLoggedIn?: boolean;
  isDarkMode?: boolean;
  homeGradientEnabled?: boolean;
  homeGradientFrom?: string;
  homeGradientTo?: string;
  magazineMoments?: MagazineMoment[];
  magazineSections?: MagazineSection[];
  homeMagazineSectionId?: string;
  homeMagazineLimit?: number;
  timelineData?: TimelineData;
}

function parseDateParts(dateStr: string, defaultYear?: number): Date | null {
  if (!dateStr) return null;
  
  const clean = dateStr.trim();
  
  // Match YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD (optional spaces around separators)
  const match = clean.match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  // Match YY.MM.DD or YY-MM-DD or YY/MM/DD (2-digit year)
  const match2 = clean.match(/^(\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (match2) {
    let year = parseInt(match2[1], 10);
    year += year < 50 ? 2000 : 1900;
    const month = parseInt(match2[2], 10) - 1;
    const day = parseInt(match2[3], 10);
    return new Date(year, month, day);
  }

  // Match MM.DD (no year, e.g. "06.04")
  const matchMD = clean.match(/^(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (matchMD) {
    const year = defaultYear || new Date().getFullYear();
    const month = parseInt(matchMD[1], 10) - 1;
    const day = parseInt(matchMD[2], 10);
    return new Date(year, month, day);
  }
  
  return null;
}

function calculateDays(dateRangeStr: string): number {
  if (!dateRangeStr) return 0;
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/);
  if (parts.length < 2) return 1;
  const startDate = parseDateParts(parts[0].trim());
  const defaultYear = startDate ? startDate.getFullYear() : undefined;
  const endDate = parseDateParts(parts[1].trim(), defaultYear);
  if (!startDate || !endDate) return 1;
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// Format duration and day count in compact Swiss minimalist notation
function getYearAndMonth(dateRangeStr?: string): { year: string; month: string; compactDate: string } {
  if (!dateRangeStr) return { year: '', month: '', compactDate: '' };
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());

  // Find any 4-digit year present in the string
  const yearMatch = dateRangeStr.match(/(\d{4})/);
  const commonYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  const parsePart = (str: string, fallbackYear: string) => {
    if (!str) return null;
    const ymdMatch = str.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    const mdMatch = str.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (mdMatch) {
      const y = fallbackYear;
      const m = mdMatch[1].padStart(2, '0');
      const d = mdMatch[2].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    return null;
  };

  const p1 = parts[0] ? parsePart(parts[0], commonYear) : null;
  const p2 = parts[1] ? parsePart(parts[1], p1?.y || commonYear) : null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const year = p1?.y || p2?.y || (yearMatch ? yearMatch[1] : '');
  const monthNum = p1 ? p1.dateObj.getMonth() : (p2 ? p2.dateObj.getMonth() : -1);
  const month = monthNum >= 0 ? months[monthNum] : '';

  let compactDate = '';
  if (p1 && p2) {
    const diffDays = Math.max(1, Math.round((p2.dateObj.getTime() - p1.dateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    compactDate = `${p1.m}.${p1.d}-${p2.m}.${p2.d} / ${diffDays}d`;
  } else if (p1) {
    compactDate = `${p1.m}.${p1.d} / 1d`;
  } else {
    compactDate = dateRangeStr;
  }

  return { year, month, compactDate };
}

// Helper to format date range without repeating same year (e.g. 2026.05.01 - 05.05)
export function formatNonRepeatingDate(dateRangeStr?: string): string {
  if (!dateRangeStr) return '';
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());
  if (parts.length === 2) {
    const m1 = parts[0].match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    const m2 = parts[1].match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (m1 && m2) {
      const y1 = m1[1];
      const y2 = m2[1];
      const mo1 = m1[2].padStart(2, '0');
      const d1 = m1[3].padStart(2, '0');
      const mo2 = m2[2].padStart(2, '0');
      const d2 = m2[3].padStart(2, '0');
      if (y1 === y2) {
        return `${y1}.${mo1}.${d1} - ${mo2}.${d2}`;
      }
      return `${y1}.${mo1}.${d1} - ${y2}.${mo2}.${d2}`;
    }
  }
  return dateRangeStr;
}

const COUNTRY_NAME_EN: Record<string, string> = {
  '대한민국': 'KOREA',
  '한국': 'KOREA',
  '남한': 'KOREA',
  'KOREA': 'KOREA',
  'SOUTH KOREA': 'KOREA',
  '일본': 'JAPAN',
  'JAPAN': 'JAPAN',
  '미국': 'USA',
  'USA': 'USA',
  'UNITED STATES': 'USA',
  '프랑스': 'FRANCE',
  'FRANCE': 'FRANCE',
  '이탈리아': 'ITALY',
  'ITALY': 'ITALY',
  '스페인': 'SPAIN',
  'SPAIN': 'SPAIN',
  '영국': 'UK',
  'UK': 'UK',
  '대만': 'TAIWAN',
  'TAIWAN': 'TAIWAN',
  '베트남': 'VIETNAM',
  'VIETNAM': 'VIETNAM',
  '태국': 'THAILAND',
  'THAI': 'THAILAND',
  'THAILAND': 'THAILAND',
  '중국': 'CHINA',
  'CHINA': 'CHINA',
  '홍콩': 'HONG KONG',
  'HONG KONG': 'HONG KONG',
  '마카오': 'MACAU',
  'MACAU': 'MACAU',
  '싱가포르': 'SINGAPORE',
  'SINGAPORE': 'SINGAPORE',
  '독일': 'GERMANY',
  'GERMANY': 'GERMANY',
  '스위스': 'SWITZERLAND',
  'SWITZERLAND': 'SWITZERLAND',
  '오스트리아': 'AUSTRIA',
  'AUSTRIA': 'AUSTRIA',
  '호주': 'AUSTRALIA',
  'AUSTRALIA': 'AUSTRALIA',
  '체코': 'CZECH',
  '헝가리': 'HUNGARY',
  '캐나다': 'CANADA',
  'CANADA': 'CANADA',
};

// Helper to format country and city (나라명 영문 대문자 통일)
export function formatCountryAndCity(trip: { country?: string; locationStr?: string }): string {
  let rawCountry = trip.country?.trim() || '';
  const location = trip.locationStr?.trim() || '';

  if (!rawCountry && location) {
    const match = location.match(/,\s*(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본|VIETNAM|베트남|THAILAND|태국|TAIWAN|대만|CHINA|중국|USA|미국|FRANCE|프랑스|ITALY|이탈리아|UK|영국|SPAIN|스페인)/i);
    if (match) {
      rawCountry = match[1].trim();
    }
  }

  const enCountry = COUNTRY_NAME_EN[rawCountry] || COUNTRY_NAME_EN[rawCountry.toUpperCase()] || (rawCountry ? rawCountry.toUpperCase() : '');
  const city = cleanAdministrativeDistricts(location);

  if (enCountry && city) {
    if (enCountry.toLowerCase() === city.toLowerCase()) return enCountry;
    return `${enCountry}, ${city}`;
  }
  if (enCountry) return enCountry;
  if (city) return city;
  return location || 'KOREA';
}

// Helper to get structured 3-line card display data
export function getTripCardDisplayData(trip: Trip, index: number) {
  const issueNumber = String((trip.displayOrder ?? index) + 1).padStart(2, '0');
  const days = calculateDays(trip.date);
  const parts = trip.date ? trip.date.split(/\s*[-—–~]\s*/).map(p => p.trim()) : [];
  const yearMatch = trip.date ? trip.date.match(/(\d{4})/) : null;
  const commonYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  const parsePart = (str: string, fallbackYear: string) => {
    if (!str) return null;
    const ymdMatch = str.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    const mdMatch = str.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (mdMatch) {
      const y = fallbackYear;
      const m = mdMatch[1].padStart(2, '0');
      const d = mdMatch[2].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    return null;
  };

  const p1 = parts[0] ? parsePart(parts[0], commonYear) : null;
  const p2 = parts[1] ? parsePart(parts[1], p1?.y || commonYear) : null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const year = p1?.y || p2?.y || (yearMatch ? yearMatch[1] : String(new Date().getFullYear()));
  const monthNum = p1 ? p1.dateObj.getMonth() : (p2 ? p2.dateObj.getMonth() : -1);
  const month = monthNum >= 0 ? months[monthNum] : '';

  // 사진 위 1번줄: 년도, 월 (2026 · JUN)
  const topYearMonth = month ? `${year} · ${month}` : year;

  // 사진 아래 2번줄: 날짜, 기간 (08.13-08.15, 4 DAYS)
  let dateRange = '';
  if (p1 && p2) {
    dateRange = `${p1.m}.${p1.d}-${p2.m}.${p2.d}`;
  } else if (p1) {
    dateRange = `${p1.m}.${p1.d}`;
  } else {
    dateRange = trip.date;
  }
  const dayStr = days === 1 ? '1 DAY' : `${days} DAYS`;
  const line2DateDays = dateRange ? `${dateRange}, ${dayStr}` : dayStr;

  // 사진 아래 3번줄: 나라명, 도시 (나라명 영문 대문자 통일)
  const line3CountryCity = formatCountryAndCity(trip);

  // 감성 에디토리얼 서브 카피 (예: "제주에서 여름 3일동안의 여정")
  const editorialSubtitle = getEditorialSubtitle(trip, days, monthNum);

  return {
    issueNumber,
    topYearMonth,
    line2DateDays,
    line3CountryCity,
    editorialSubtitle,
  };
}

// Helper to generate poetic editorial subtitle like "제주에서 여름 3일동안의 여정"
export function getEditorialSubtitle(trip: Trip, days: number, monthNum: number): string {
  const customText = trip.subtitle?.trim() || trip.description?.trim() || (trip as any).desc?.trim();
  if (customText && customText.length > 0 && customText.length <= 60) {
    return customText;
  }

  let region = '';
  if (trip.locationStr) {
    const cleaned = cleanAdministrativeDistricts(trip.locationStr);
    region = cleaned.split(/[,·]/)[0].trim();
  }
  if (!region && trip.country) {
    region = trip.country.trim();
  }
  if (!region) {
    region = '여행지';
  }

  let season = '';
  if (monthNum >= 2 && monthNum <= 4) {
    season = '봄';
  } else if (monthNum >= 5 && monthNum <= 7) {
    season = '여름';
  } else if (monthNum >= 8 && monthNum <= 10) {
    season = '가을';
  } else if (monthNum === 11 || monthNum === 0 || monthNum === 1) {
    season = '겨울';
  }

  let durationStr = '의 여정';
  if (days > 1) {
    durationStr = `${days}일동안의 여정`;
  } else if (days === 1) {
    durationStr = '하루 동안의 여정';
  } else {
    durationStr = '떠난 여정';
  }

  if (season) {
    return `${region}에서 ${season} ${durationStr}`;
  } else {
    return `${region}에서 보낸 ${durationStr}`;
  }
}

// Helper to extract large bold uppercase English city/region name for magazine
export function getEnglishCityName(locationStr?: string): string {
  if (!locationStr) return '';
  const cleaned = cleanAdministrativeDistricts(locationStr);
  const cityMap: Record<string, string> = {
    '도쿄': 'TOKYO',
    '동경': 'TOKYO',
    '오사카': 'OSAKA',
    '교토': 'KYOTO',
    '후쿠오카': 'FUKUOKA',
    '삿포로': 'SAPPORO',
    '오키나와': 'OKINAWA',
    '제주': 'JEJU',
    '제주시': 'JEJU',
    '서귀포': 'SEOGWIPO',
    '서울': 'SEOUL',
    '부산': 'BUSAN',
    '강릉': 'GANGNEUNG',
    '속초': 'SOKCHO',
    '경주': 'GYEONGJU',
    '인천': 'INCHEON',
    '대구': 'DAEGU',
    '대전': 'DAEJEON',
    '방콕': 'BANGKOK',
    '치앙마이': 'CHIANG MAI',
    '다낭': 'DA NANG',
    '하노이': 'HANOI',
    '호치민': 'HO CHI MINH',
    '싱가포르': 'SINGAPORE',
    '타이베이': 'TAIPEI',
    '대만': 'TAIWAN',
    '홍콩': 'HONG KONG',
    '마카오': 'MACAU',
    '파리': 'PARIS',
    '런던': 'LONDON',
    '로마': 'ROME',
    '피렌체': 'FLORENCE',
    '베네치아': 'VENICE',
    '바르셀로나': 'BARCELONA',
    '마드리드': 'MADRID',
    '인터라켄': 'INTERLAKEN',
    '취리히': 'ZURICH',
    '뉴욕': 'NEW YORK',
    '로스앤젤레스': 'LOS ANGELES',
    '샌프란시스코': 'SAN FRANCISCO',
    '하와이': 'HAWAII',
    '괌': 'GUAM',
    '사이판': 'SAIPAN',
    '시드니': 'SYDNEY',
    '멜버른': 'MELBOURNE',
  };

  for (const [kr, en] of Object.entries(cityMap)) {
    if (cleaned.includes(kr)) return en;
  }

  const englishMatch = cleaned.match(/[a-zA-Z\s]+/);
  if (englishMatch && englishMatch[0].trim().length > 1) {
    return englishMatch[0].trim().toUpperCase();
  }

  return cleaned.toUpperCase();
}

// Helper to extract Hero meta details (month, year, days, date range, cities)
function getHeroDetails(journey: Trip) {
  const { year, month } = getYearAndMonth(journey.date);
  const days = calculateDays(journey.date);

  const parts = (journey.date || '').split(/\s*[-—–~]\s*/).map(p => p.trim());
  let dateRangeText = '';
  if (parts.length >= 2) {
    const d1Match = parts[0].match(/(\d{1,2})$/);
    const d2Match = parts[1].match(/(\d{1,2})$/);
    if (d1Match && d2Match) {
      dateRangeText = `${d1Match[1]} — ${d2Match[1]}`;
    } else {
      dateRangeText = journey.date;
    }
  } else if (parts[0]) {
    const dMatch = parts[0].match(/(\d{1,2})$/);
    dateRangeText = dMatch ? dMatch[1] : parts[0];
  }

  let cities = '';
  if (journey.locations && journey.locations.length > 0) {
    const cityNames = journey.locations
      .map(loc => getEnglishCityName(loc.name))
      .filter(Boolean);
    const unique = Array.from(new Set(cityNames));
    cities = unique.join(' — ');
  }
  if (!cities && journey.locationStr) {
    const splitLocs = journey.locationStr.split(/[,/·-]/).map(s => s.trim()).filter(Boolean);
    const cityNames = splitLocs.map(s => getEnglishCityName(s)).filter(Boolean);
    const unique = Array.from(new Set(cityNames));
    cities = unique.join(' — ');
  }
  if (!cities) {
    cities = getEnglishCityName(journey.locationStr) || 'JOURNEY';
  }

  return {
    year: year || '2024',
    month: month || 'JUL',
    daysCount: days,
    days: days > 0 ? `${days} ${days === 1 ? 'DAY' : 'DAYS'}` : '',
    dateRange: dateRangeText || '01 — 03',
    cities
  };
}

// Helper for minimal date + day format (e.g. 2024.07.19 FRI)
function formatSimpleDateWithDay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/\s*[-—–~]\s*/);
  const firstDate = parts[0]?.trim();
  const d = parseDateParts(firstDate);
  if (!d) return dateStr;
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = days[d.getDay()];
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day} ${dayName}`;
}

// Journey card hamburger menu
export function JourneyCardMenu({
  onEdit,
  onDelete,
  isLoggedIn,
  onClone,
  onMove,
  moveLabel,
  className,
  variant = 'card',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  isLoggedIn: boolean;
  onClone?: () => void;
  onMove?: () => void;
  moveLabel?: string;
  className?: string;
  variant?: 'card' | 'minimal';
}) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'e' || e.key === 'E') {
        if (onEdit) {
          e.preventDefault();
          setOpen(false);
          onEdit();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (onClone) {
          e.preventDefault();
          setOpen(false);
          onClone();
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (onMove) {
          e.preventDefault();
          setOpen(false);
          onMove();
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (onDelete) {
          e.preventDefault();
          setOpen(false);
          setShowDeleteConfirm(true);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onEdit, onClone, onMove, onDelete]);

  if (!isLoggedIn) return null;

  return (
    <>
      <div ref={menuRef} className={`${className || (variant === 'minimal' ? 'relative' : "absolute bottom-3 right-3 z-30")} pointer-events-auto`}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          className={variant === 'minimal'
            ? "p-2 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer bg-transparent border-0 shadow-none"
            : "p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-md transition-all shadow-md backdrop-blur-sm border border-white/20 opacity-90 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center cursor-pointer active:scale-95"
          }
          title="카드 관리 메뉴"
          aria-label="Journey menu"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div className={`absolute ${variant === 'minimal' ? 'top-full right-0 mt-1' : 'bottom-full right-0 mb-1'} w-48 bg-black text-white border border-white/20 shadow-2xl rounded-none z-50 overflow-hidden divide-y divide-white/10 animate-in zoom-in-95 duration-150`}>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit2 className="w-3.5 h-3.5 text-white/80" />
                  <span>EDIT</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">E</span>
              </button>
            )}
            {onClone && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onClone(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-3.5 h-3.5 text-white/80" />
                  <span>COPY</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">C</span>
              </button>
            )}
            {onMove && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onMove(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowUp className="w-3.5 h-3.5 text-white/80" />
                  <span>{moveLabel || "MOVE"}</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-white/50 border border-white/20 px-1.5 py-0.5">S</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-[13px] font-black uppercase tracking-widest text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>DELETE</span>
                </div>
                <span className="font-mono text-[9.5px] font-bold text-red-400/70 border border-red-500/30 px-1.5 py-0.5">D</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="DELETE JOURNEY"
        message="Are you sure you want to delete this journey?"
        confirmLabel="YES (Y)"
        cancelLabel="CANCEL (ESC)"
        confirmVariant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          if (onDelete) onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

interface HeroMediaProps {
  journey: Trip | Plan;
  isActive: boolean;
  mediaType?: 'image' | 'video';
  onMediaReady?: () => void;
}

function HeroMedia({ journey, isActive, onMediaReady }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Smart resolution of hero media: heroVideoUrl > heroImg > videoUrl > img
  let finalVideoUrl = '';
  let finalImageUrl = '';

  if (journey.heroVideoUrl) {
    finalVideoUrl = getEffectiveImageUrl(journey.heroVideoUrl);
  } else if (journey.heroImg) {
    finalImageUrl = getEffectiveImageUrl(journey.heroImg);
  } else if (journey.videoUrl) {
    finalVideoUrl = getEffectiveImageUrl(journey.videoUrl);
  } else {
    finalImageUrl = getEffectiveImageUrl(journey.img);
  }

  const isVideo = Boolean(finalVideoUrl);

  // Mobile WebKit / iOS autoplay policy: DOM properties must be explicitly set before play()
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.playsInline = true;
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.setAttribute('webkit-playsinline', '');
    }
  }, [finalVideoUrl, isVideo]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    if (isVideo && finalVideoUrl && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;

      if (isActive) {
        if (vid.currentTime > 0.5) {
          vid.currentTime = 0;
        }
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Hero video autoplay prevented/delayed:", error);
          });
        }
        if (onMediaReady) onMediaReady();
      } else {
        timeoutId = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }, 1000);
      }
    } else if (isActive && onMediaReady) {
      onMediaReady();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isActive, isVideo, finalVideoUrl, onMediaReady]);

  return (
    <div
      className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-out ${
        isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
      }`}
    >
      {isVideo && finalVideoUrl ? (
        <video
          ref={videoRef}
          src={finalVideoUrl}
          loop
          muted
          playsInline
          autoPlay={isActive}
          preload="auto"
          className="w-full h-full object-cover"
        />
      ) : finalImageUrl ? (
        <img
          src={finalImageUrl}
          alt={journey.title || "Hero Trip"}
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isActive ? "high" : "low"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-[#0E0E0E] dark:via-[#161616] dark:to-[#0A0A0A]" />
      )}
    </div>
  );
}

interface CardMediaProps {
  img: string;
  title: string;
  videoUrl?: string;
  isActive: boolean;
}

function CardMedia({ img, title, videoUrl, isActive }: CardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => localStorage.getItem('playVideoOnActivate') !== 'false');

  useEffect(() => {
    const handleConfigChange = () => {
      setAutoplayEnabled(localStorage.getItem('playVideoOnActivate') !== 'false');
    };
    window.addEventListener('playVideoConfigChanged', handleConfigChange);
    return () => window.removeEventListener('playVideoConfigChanged', handleConfigChange);
  }, []);

  useEffect(() => {
    if (autoplayEnabled && videoUrl && videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card video playback prevented or error:", error);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, videoUrl, autoplayEnabled]);

  return (
    <>
      <img
        src={getEffectiveImageUrl(img)}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
          isActive ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      />
      {videoUrl && autoplayEnabled && isActive && (
        <video
          ref={videoRef}
          src={getEffectiveImageUrl(videoUrl)}
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none scale-105 opacity-100 animate-in fade-in duration-300"
        />
      )}
    </>
  );
}

export function HomePage({
  onNavigate,
  trips,
  plans,
  handleMoveToArchive,
  homeTitle,
  homeSubtitle,
  heroJourneyIds = [],
  heroAutoSlide = true,
  heroMediaType = 'image',
  heroSlideDuration = 6,
  onEditTrip,
  onDeleteTrip,
  onReorderTrips,
  onReorderPlans,
  onMoveToPlans,
  onCloneTrip,
  onClonePlan,
  isLoggedIn = false,
  isDarkMode = false,
  homeGradientEnabled,
  homeGradientFrom,
  homeGradientTo,
  magazineMoments = [],
  magazineSections = [],
  homeMagazineSectionId = 'main',
  homeMagazineLimit = 6,
  timelineData,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  const handleSetCardViewMode = (mode: 'grid' | 'wide' | 'list') => {
    setCardViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  const [magazineSpreadIndex, setMagazineSpreadIndex] = useState(0);
  const [activeHomeSectionId, setActiveHomeSectionId] = useState<string>(() => {
    return homeMagazineSectionId || 'main';
  });

  useEffect(() => {
    if (homeMagazineSectionId) {
      setActiveHomeSectionId(homeMagazineSectionId);
    }
  }, [homeMagazineSectionId]);

  const homeMagTabsRef = useRef<HTMLDivElement>(null);
  const scrollHomeMagTabs = (direction: 'left' | 'right') => {
    if (homeMagTabsRef.current) {
      homeMagTabsRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  // Gradient background state
  const [gradientEnabled, setGradientEnabled] = useState<boolean>(() => {
    if (homeGradientEnabled !== undefined) return homeGradientEnabled;
    return localStorage.getItem('home_gradient_enabled') === 'true';
  });
  const [gradientFrom, setGradientFrom] = useState<string>(() => {
    return homeGradientFrom || localStorage.getItem('home_gradient_from') || '#F7F2EB';
  });
  const [gradientTo, setGradientTo] = useState<string>(() => {
    return homeGradientTo || localStorage.getItem('home_gradient_to') || '#E7DEC8';
  });

  // Magazine Touch Swipe Gesture Tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  const handleMagazineTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleMagazineTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleMagazineTouchEnd = (e: React.TouchEvent, totalSpreads: number) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Horizontal swipe threshold: 40px and dominant horizontal axis
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe Left -> Next Spread
        setMagazineSpreadIndex(prev => Math.min(totalSpreads - 1, prev + 1));
      } else {
        // Swipe Right -> Prev Spread
        setMagazineSpreadIndex(prev => Math.max(0, prev - 1));
      }
    }
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 80);
  };

  useEffect(() => {
    if (homeGradientEnabled !== undefined) setGradientEnabled(homeGradientEnabled);
    if (homeGradientFrom) setGradientFrom(homeGradientFrom);
    if (homeGradientTo) setGradientTo(homeGradientTo);
  }, [homeGradientEnabled, homeGradientFrom, homeGradientTo]);

  // Flatten all timeline items from timelineData ({ [date: string]: TimelineItem[] })
  const allTimelineItems = useMemo(() => {
    if (!timelineData) return [];
    return Object.values(timelineData).flat();
  }, [timelineData]);

  const [journeyLimit, setJourneyLimit] = useState<number>(() => {
    return parseInt(localStorage.getItem('home_journey_limit') || '4', 10);
  });

  useEffect(() => {
    const handleConfigChange = (e?: any) => {
      setJourneyLimit(parseInt(localStorage.getItem('home_journey_limit') || '4', 10));
      if (e?.detail?.gradientEnabled !== undefined) {
        setGradientEnabled(Boolean(e.detail.gradientEnabled));
      } else {
        setGradientEnabled(localStorage.getItem('home_gradient_enabled') === 'true');
      }
      if (e?.detail?.gradientFrom) setGradientFrom(e.detail.gradientFrom);
      else setGradientFrom(localStorage.getItem('home_gradient_from') || '#F7F2EB');
      if (e?.detail?.gradientTo) setGradientTo(e.detail.gradientTo);
      else setGradientTo(localStorage.getItem('home_gradient_to') || '#E7DEC8');
    };
    window.addEventListener('homeConfigChanged', handleConfigChange);
    return () => window.removeEventListener('homeConfigChanged', handleConfigChange);
  }, []);

  const gradientBackgroundStyle = useMemo(() => {
    if (!gradientEnabled || isDarkMode) return undefined;
    return {
      background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
    };
  }, [gradientEnabled, gradientFrom, gradientTo, isDarkMode]);

  // Drag-reorder state for archive cards
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);

  // Sync local order when props change (e.g. initial load)
  useEffect(() => { setLocalTrips(trips); }, [trips]);
  useEffect(() => { setLocalPlans(plans); }, [plans]);

  // Combined Journeys & Plans for unified archive view (matches Archive Hub sorting)
  const combinedArchiveList = useMemo(() => {
    const list: (Trip | Plan)[] = [...localTrips];
    if (localPlans && localPlans.length > 0) {
      localPlans.forEach(p => {
        const hasPlanTag = p.tags?.includes('Plan');
        list.push({
          ...p,
          isPlan: true,
          tags: hasPlanTag ? p.tags : [...(p.tags || []), 'Plan'],
        });
      });
    }

    try {
      const saved = localStorage.getItem('journey_order');
      if (saved) {
        const order: number[] = JSON.parse(saved);
        const idMap = new Map(order.map((id, idx) => [id, idx]));
        return list.sort((a, b) => {
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : (a.displayOrder ?? 999999);
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : (b.displayOrder ?? 999999);
          return orderA - orderB;
        });
      }
    } catch (_) {}

    return list.sort((a, b) => (a.displayOrder ?? 999999) - (b.displayOrder ?? 999999));
  }, [localTrips, localPlans]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    combinedArchiveList.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [combinedArchiveList]);

  const visibleTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return filters;
    const q = tagSearchQuery.trim().toLowerCase();
    return filters.filter(f => f.toLowerCase().includes(q) || f === 'All');
  }, [filters, tagSearchQuery]);

  const filteredTrips = activeFilter === 'All' ? combinedArchiveList : combinedArchiveList.filter(t => t.tags?.includes(activeFilter));

  // Resolve hero journeys from heroJourneyIds. Fallback to trips[0] if nothing selected.
  const heroJourneys = useMemo(() => {
    const all = [...localTrips, ...localPlans];
    if (heroJourneyIds.length > 0) {
      const filtered = heroJourneyIds.map(id => all.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[];
      if (filtered.length > 0) return filtered;
    }
    return localTrips[0] ? [localTrips[0]] : [];
  }, [localTrips, localPlans, heroJourneyIds]);

  const [isHeroMediaReady, setIsHeroMediaReady] = useState(false);

  const currentHero = heroJourneys[heroSlide] || heroJourneys[0];
  // Exact user-configured duration in ms (strictly follows 3s ~ 9s setting)
  const exactSlideDuration = (heroSlideDuration && heroSlideDuration >= 3 ? heroSlideDuration : 6) * 1000;

  const goToSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return;
    setIsHeroMediaReady(false);
    setHeroSlide(idx);
  }, [heroSlide]);

  const goToPrev = () => goToSlide((heroSlide - 1 + heroJourneys.length) % heroJourneys.length);
  const goToNext = useCallback(() => {
    goToSlide((heroSlide + 1) % heroJourneys.length);
  }, [goToSlide, heroSlide, heroJourneys.length]);

  // Safety fallback: if media ready doesn't fire within 800ms, force ready so carousel never gets stuck
  useEffect(() => {
    if (!isHeroMediaReady) {
      const fallbackTimer = setTimeout(() => {
        setIsHeroMediaReady(true);
      }, 800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [heroSlide, isHeroMediaReady]);

  // Auto-advance carousel with exact configured duration when multiple heroes and auto-slide is enabled
  useEffect(() => {
    if (!heroAutoSlide || heroJourneys.length <= 1 || !isHeroMediaReady) return;

    const timer = setTimeout(() => {
      goToNext();
    }, exactSlideDuration);

    return () => clearTimeout(timer);
  }, [heroJourneys.length, heroSlide, heroAutoSlide, exactSlideDuration, isHeroMediaReady, goToNext]);

  useEffect(() => { 
    setHeroSlide(0); 
    setIsHeroMediaReady(false);
  }, [heroJourneyIds]);

  // ── Drag-to-reorder for trip archive cards ──────────────────────────────
  const handleTripDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTripId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTripDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedTripId === null || draggedTripId === id) return;
    setLocalTrips(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === draggedTripId);
      const toIdx = arr.findIndex(t => t.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const handleTripDrop = () => {
    setDraggedTripId(null);
    const orderedIds = localTrips.map(t => t.id);
    try {
      localStorage.setItem('journey_order', JSON.stringify(orderedIds));
    } catch (_) {}
    if (onReorderTrips) onReorderTrips(orderedIds);
  };

  return (
    <main 
      onClick={() => setActiveCardId(null)} 
      style={gradientBackgroundStyle}
      className="animate-in fade-in duration-700 w-full transition-all"
    >

      {/* ===== Hero Section: 3-Column Swiss Editorial Layout (Matching Reference) ===== */}
      <section className={`relative w-full border-b border-black/15 dark:border-white/15 ${gradientEnabled && !isDarkMode ? 'bg-transparent' : 'bg-[#FBFBFA] dark:bg-[#141414]'} overflow-hidden transition-colors`}>
        {currentHero ? (
          (() => {
            const { year, month, days, dateRange, cities } = getHeroDetails(currentHero);

            return (
              <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-12 items-center">
                {/* 1. Left Column: Top branding, Big Title, Month/Year, Auto Journey Sentence */}
                <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-between h-full order-2 md:order-1 relative z-20 md:-mr-8 lg:-mr-12 pointer-events-none py-6 sm:py-8 md:py-12 lg:py-16 px-2 sm:px-4 md:px-0">
                  <div>
                    {/* Minimal Branding / Title in Inter */}
                    <div className="text-[11px] font-['Inter',sans-serif] font-bold tracking-[0.25em] text-black/40 dark:text-white/40 uppercase mb-3 sm:mb-4 md:mb-6 pointer-events-auto">
                      {homeTitle ? homeTitle.replace(/\\n|\n/g, ' ') : 'JOURNAL'}
                    </div>

                    {/* Massive Bold Magazine Title in Inter (Overlaps onto center frame) */}
                    <h2
                      onClick={() => onNavigate('detail', currentHero.id)}
                      onMouseEnter={preloadDetailPage}
                      onTouchStart={preloadDetailPage}
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black font-['Inter',sans-serif] uppercase tracking-tighter leading-[0.9] text-black dark:text-white cursor-pointer hover:opacity-85 transition-opacity select-none drop-shadow-sm pointer-events-auto"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {currentHero.title}
                    </h2>
                  </div>

                  {/* Year & Month with tight tracking + Auto Journey Sentence (Does NOT overlap hero media) */}
                  <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 flex flex-col gap-1.5 pointer-events-auto font-['Inter',sans-serif] max-w-[260px] lg:max-w-[300px]">
                    <div className="text-base sm:text-lg md:text-xl font-black tracking-tight text-black dark:text-white uppercase leading-none">
                      {month} {year}
                    </div>
                    {/* Auto journey generated sentence */}
                    <p className="text-[11px] sm:text-xs font-medium text-black/60 dark:text-white/60 leading-snug break-keep">
                      {generateJourneyMessage(currentHero.locationStr, currentHero.date, getHeroDetails(currentHero).daysCount)}
                    </p>
                  </div>
                </div>

                {/* 2. Center Column: Large 3:4 Aspect Ratio Borderless Hero Media Frame (Dead center of the screen, towering height) */}
                <div className="md:col-span-6 lg:col-span-6 flex items-center justify-center order-1 md:order-2 relative z-10 w-full px-0">
                  <div 
                    onClick={() => onNavigate('detail', currentHero.id)}
                    onMouseEnter={preloadDetailPage}
                    onTouchStart={preloadDetailPage}
                    className="relative w-full aspect-[3/4] max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[85vh] overflow-hidden bg-neutral-900 group cursor-pointer select-none mx-auto shadow-2xl"
                  >
                    {heroJourneys.map((journey, index) => (
                      <HeroMedia
                        key={journey.id}
                        journey={journey}
                        isActive={index === heroSlide}
                        mediaType={heroMediaType}
                        onMediaReady={() => {
                          if (index === heroSlide) {
                            setIsHeroMediaReady(true);
                          }
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors pointer-events-none" />
                  </div>
                </div>

                {/* 3. Right Column: Date range / Days duration, Cities, Minimal circular arrow button */}
                <div className="md:col-span-3 lg:col-span-3 flex flex-col justify-between h-full order-3 text-left md:text-right items-start md:items-end relative z-20 md:pl-6 lg:pl-10 font-['Inter',sans-serif] py-6 sm:py-8 md:py-12 lg:py-16 px-2 sm:px-4 md:px-0">
                  {/* Top Slide Indicator (e.g. 01 / 03) with minimal gauge & arrows */}
                  {heroJourneys.length > 1 ? (
                    <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
                      <span className="text-xs font-black tracking-widest text-black dark:text-white">
                        {String(heroSlide + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-1">
                        {heroJourneys.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            className="h-1 rounded-none transition-all cursor-pointer"
                            style={{
                              width: idx === heroSlide ? '24px' : '8px',
                              backgroundColor: idx === heroSlide ? 'currentColor' : 'rgba(150,150,150,0.3)'
                            }}
                            title={`Slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold tracking-widest text-black/40 dark:text-white/40">
                        {String(heroJourneys.length).padStart(2, '0')}
                      </span>

                      {/* Small Prev/Next */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="Prev"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToNext(); }}
                          className="p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="Next"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : <div className="mb-4 sm:mb-6" />}

                  {/* Middle: Duration & Dates (e.g. 18 — 20 / 3 DAYS) */}
                  <div className="my-auto flex flex-col items-start md:items-end">
                    <div className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-black dark:text-white leading-none font-['Inter',sans-serif]">
                      {dateRange}
                    </div>
                    {days && (
                      <div className="text-xs sm:text-sm font-bold text-black/50 dark:text-white/50 tracking-widest uppercase mt-2">
                        {days}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Cities and Circular Arrow ( → ) */}
                  <div className="mt-4 sm:mt-6 md:mt-10 lg:mt-12 flex flex-col items-start md:items-end gap-3 sm:gap-4">
                    <div className="text-xs sm:text-sm font-bold text-black/70 dark:text-white/70 uppercase tracking-widest leading-relaxed">
                      {cities}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('detail', currentHero.id)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer text-black dark:text-white shadow-xs"
                      title="VIEW TRIP"
                    >
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 01. TRIP (통합 여정 목록 섹션)                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col w-full overflow-hidden transition-colors border-t border-black/10 dark:border-white/10">
        <div className="w-full border-b border-black/15 dark:border-white/15">
          <div className="w-full max-w-[1920px] mx-auto p-6 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-4 transition-colors">
            {/* Left: Pure Minimal Title */}
            <div className="flex flex-col gap-0.5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                TRIP
              </h2>
            </div>

            {/* Right: Controls (View Modes, Tag Filter, All Trips) */}
            <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
              <div className="flex items-center justify-between md:justify-end gap-2.5 w-full flex-wrap">
                {/* 1. Simple Tag Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsTagAccordionOpen(prev => !prev)}
                  className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider border rounded-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFilter !== 'All'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                      : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5'
                  }`}
                  title="TAG FILTER"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{activeFilter === 'All' ? 'TAG' : `#${activeFilter}`}</span>
                  {isTagAccordionOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {/* Reset Tag filter button if not 'All' */}
                {activeFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('All')}
                    className="text-[9px] px-1.5 py-1 uppercase font-bold tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer flex items-center gap-0.5"
                    title="RESET"
                  >
                    <X className="w-3 h-3" />
                    RESET
                  </button>
                )}

                {/* 2. View Mode Switcher (Grid / Wide / List) */}
                <div className="flex items-center border border-black/15 dark:border-white/15 rounded-xs p-0.5 bg-black/5 dark:bg-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetCardViewMode('grid')}
                    className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                      cardViewMode === 'grid' 
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                        : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                    }`}
                    title="GRID"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCardViewMode('wide')}
                    className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                      cardViewMode === 'wide' 
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                        : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                    }`}
                    title="WIDE"
                  >
                    <StretchHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCardViewMode('list')}
                    className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                      cardViewMode === 'list' 
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                        : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                    }`}
                    title="LIST"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. All Trips Button */}
                <button 
                  type="button"
                  onClick={() => onNavigate('archive')} 
                  className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest flex items-center hover:opacity-60 shrink-0 ml-1 cursor-pointer text-black dark:text-white"
                  title="ALL TRIPS"
                >
                  ALL TRIPS <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>

              {/* Collapsible Content: Search input & Tag pills */}
              {isTagAccordionOpen && (
                <div className="flex flex-col gap-2 p-3 bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 rounded-sm shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 mt-1 md:absolute md:top-full md:right-0 md:w-80">
                  {/* Tag Search Input */}
                  <div className="relative flex items-center">
                    <Search className="w-3 h-3 text-black/40 dark:text-white/40 absolute left-2 pointer-events-none" />
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="태그 검색..."
                      className="w-full pl-7 pr-7 py-1 text-[10px] bg-white dark:bg-[#222222] border border-black/10 dark:border-white/10 rounded-sm font-bold outline-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                    {tagSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTagSearchQuery('')}
                        className="absolute right-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Tag Buttons */}
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                    {visibleTags.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setActiveFilter(f);
                        }}
                        className={`text-[9.5px] px-2.5 py-1 uppercase font-bold tracking-wider border rounded-sm transition-colors shrink-0 cursor-pointer ${
                          activeFilter === f
                            ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                            : 'border-black/15 bg-black/4 dark:bg-white/5 text-black/60 hover:border-black/40 dark:border-white/15 dark:text-white/60 dark:hover:border-white/40'
                        }`}
                      >
                        {f === 'All' ? '전체 (All)' : `#${f}`}
                      </button>
                    ))}
                    {visibleTags.length === 0 && (
                      <span className="text-[10px] text-black/40 dark:text-white/40 py-1 italic">
                        검색 결과가 없습니다.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {cardViewMode === 'list' ? (
          <div className="w-full border-b border-black/15 dark:border-white/15">
            <div className="flex flex-col w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12">
              {filteredTrips.slice(0, 8).map((trip, index) => {
                const isCardActive = activeCardId === trip.id;
                const { year, month } = getYearAndMonth(trip.date);
                const formattedDate = formatNonRepeatingDate(trip.date);
                const issueNumber = String((trip.displayOrder ?? index) + 1).padStart(2, '0');
                const days = calculateDays(trip.date);
                const isItemPlan = Boolean((trip as any).isPlan || (plans && plans.some(p => String(p.id) === String(trip.id))) || trip.tags?.includes('Plan') || trip.title.includes('(Plan)'));

                return (
                  <div
                    key={trip.id}
                    onClick={() => onNavigate('detail', trip.id)}
                    onMouseEnter={preloadDetailPage}
                    onTouchStart={preloadDetailPage}
                    className={`group flex flex-row items-stretch border-b border-black/15 dark:border-white/15 transition-colors cursor-pointer w-full select-none rounded-none ${
                      isCardActive 
                        ? 'bg-neutral-100 dark:bg-white/[0.08] border-l-[3px] border-l-red-600 dark:border-l-red-500' 
                        : 'border-l-[3px] border-l-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Monospace Index Column: Compact & Slim */}
                    <div className="w-7 sm:w-8 md:w-9 flex items-center justify-center font-mono font-bold text-[10px] sm:text-xs text-black/30 dark:text-white/30 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors shrink-0 border-r border-black/10 dark:border-white/10 select-none">
                      {issueNumber}
                    </div>

                    {/* Thumbnail: Unobstructed Clean Photo */}
                    <div className="w-24 sm:w-32 aspect-[4/3] self-stretch shrink-0 border-r border-black/10 dark:border-white/10 overflow-hidden rounded-none relative bg-black/10">
                      <img src={getEffectiveImageUrl(trip.img)} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none" />
                    </div>

                    {/* Meta Information Stack */}
                    <div className="flex-1 min-w-0 py-3 px-3.5 sm:px-5 md:px-6 flex flex-col justify-between gap-1.5">
                      {/* Top Row: Year/Month & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs">
                          <span className="font-black text-black dark:text-white tracking-tight">{year || '2024'}</span>
                          {month && <span className="opacity-30">/</span>}
                          {month && <span className="font-bold text-red-600 dark:text-red-500 uppercase tracking-tight">{month}</span>}
                        </div>
                        {isItemPlan ? (
                          <span className="px-2 py-0.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider font-mono bg-black text-white dark:bg-white dark:text-black border border-black/20 dark:border-white/20 rounded-none leading-none">
                            PLAN
                          </span>
                        ) : trip.statusBadge ? (
                          <span className={`px-2 py-0.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider font-mono rounded-none leading-none ${
                            trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {trip.statusBadge}
                          </span>
                        ) : null}
                      </div>

                      {/* Prominent Title */}
                      <h3 className="font-black text-base sm:text-lg md:text-xl text-black dark:text-white uppercase font-sans tracking-tight truncate group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                        {trip.title}
                      </h3>

                      {/* Bottom Unified Metadata Bar: Uniform Small Font Weight */}
                      <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-black/60 dark:text-white/60 font-mono">
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {trip.locationStr && (
                            <>
                              <span className="font-semibold text-black/75 dark:text-white/75 truncate">{cleanAdministrativeDistricts(trip.locationStr).replace(/,/g, ' · ')}</span>
                              <span className="opacity-40 shrink-0">·</span>
                            </>
                          )}
                          <span className="shrink-0">{formattedDate}</span>
                          {days > 0 && (
                            <>
                              <span className="opacity-40 shrink-0">·</span>
                              <span className="shrink-0">{days} DAYS</span>
                            </>
                          )}
                        </div>
                        <span className="text-sm font-bold text-black dark:text-white group-hover:translate-x-1 transition-transform shrink-0 pl-2">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={cardViewMode === 'wide' 
            ? "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-12 sm:gap-y-16 p-4 sm:p-8 md:p-12 w-full max-w-[1920px] mx-auto"
            : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10 sm:gap-y-14 md:gap-y-16 p-3 sm:p-6 md:p-12 w-full max-w-[1920px] mx-auto"
          }>
            {filteredTrips.slice(0, journeyLimit).map((trip, index) => {
              const { issueNumber, topYearMonth, line2DateDays, line3CountryCity, editorialSubtitle } = getTripCardDisplayData(trip, index);
              const isCardActive = activeCardId === trip.id;
              const isItemPlan = Boolean(
                (trip as any).isPlan ||
                (plans && plans.some(p => String(p.id) === String(trip.id))) ||
                trip.tags?.includes('Plan') ||
                trip.title?.includes('(Plan)')
              );
              const isWide = cardViewMode === 'wide';

              const [dateRangeOnly, durationBadge] = line2DateDays.includes(',') 
                ? line2DateDays.split(',').map(s => s.trim()) 
                : [line2DateDays, ''];

              return (
                <article
                  key={trip.id}
                  onClick={() => onNavigate('detail', trip.id)}
                  onMouseEnter={preloadDetailPage}
                  onTouchStart={preloadDetailPage}
                  className={`group flex flex-col cursor-pointer select-none rounded-none transition-all duration-300 ${
                    isCardActive ? 'ring-2 ring-red-600/40 dark:ring-red-500/40 p-1 bg-black/5 dark:bg-white/5' : ''
                  }`}
                  draggable={isLoggedIn}
                  onDragStart={(e) => handleTripDragStart(e, trip.id)}
                  onDragOver={(e) => handleTripDragOver(e, trip.id)}
                  onDrop={handleTripDrop}
                  onDragEnd={() => setDraggedTripId(null)}
                >
                  {/* 1. Photo Frame: 3:4 Vertical Editorial Aspect (or 4:3 Wide) */}
                  <div className={`relative ${isWide ? 'aspect-[4/3]' : 'aspect-[3/4]'} w-full overflow-hidden bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 rounded-xs shadow-xs group-hover:shadow-lg transition-all duration-300`}>
                    <CardMedia
                      img={trip.img}
                      title={trip.title}
                      videoUrl={trip.videoUrl}
                      isActive={isCardActive}
                    />
                    {durationBadge && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/75 dark:bg-white/85 backdrop-blur-xs text-white dark:text-black font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 tracking-wider uppercase shadow-xs">
                        {durationBadge}
                      </div>
                    )}
                  </div>

                  {/* 2. Editorial Text Block beneath Photo */}
                  <div className="mt-3 flex flex-col text-black dark:text-white">
                    {/* Category & Location Micro Header */}
                    <div className="flex items-center justify-between min-w-0 font-mono text-black dark:text-white gap-2">
                      <span className="font-bold text-[10.5px] sm:text-xs text-red-600 dark:text-red-400 tracking-wider truncate uppercase">
                        {topYearMonth}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0 shrink justify-end">
                        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-black/50 dark:text-white/50 uppercase truncate">
                          {line3CountryCity}
                        </span>
                        {isItemPlan && (
                          <span className="text-[9px] font-mono font-black text-red-600 dark:text-red-400 border border-red-600/40 dark:border-red-400/40 px-1.5 py-0.2 tracking-wider shrink-0 leading-none">
                            PLAN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Main Title (Bold & Snug, line-clamp-2) */}
                    <h3 className={`font-satoshi font-black ${isWide ? 'text-lg sm:text-xl md:text-2xl min-h-[3.25rem]' : 'text-base sm:text-lg md:text-[19px] min-h-[2.5rem] sm:min-h-[2.75rem]'} leading-snug tracking-tight text-black dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors break-keep mt-1`}>
                      {trip.title}
                    </h3>

                    {/* Poetic Korean Editorial Subtitle (예: "제주에서 여름 3일동안의 여정") */}
                    {editorialSubtitle && (
                      <p className="text-xs sm:text-[13px] font-medium text-black/65 dark:text-white/65 line-clamp-1 break-keep font-['Noto_Sans_KR',sans-serif] tracking-tight mt-0.5">
                        {editorialSubtitle}
                      </p>
                    )}

                    {/* Bottom Metadata Bar: Specific Date + LOG Action */}
                    <div className="pt-2 mt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10.5px] sm:text-xs font-mono text-black/60 dark:text-white/60 tracking-wider">
                      <span className="truncate mr-2">{dateRangeOnly || trip.date}</span>
                      <span className="font-bold text-black dark:text-white uppercase group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors flex items-center gap-1 shrink-0 group-hover:translate-x-0.5">
                        <span>LOG</span>
                        <span className="text-[10px]">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* VIEW ALL Button (유도 버튼: 여정이 한도보다 많을 때 노출) */}
        {filteredTrips.length > journeyLimit && (
          <div className="flex justify-center pt-6 pb-2 px-4 sm:px-6 md:px-12 w-full max-w-[1920px] mx-auto">
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-2.5 cursor-pointer shadow-md"
            >
              <span>ALL TRIPS ({filteredTrips.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 02. EDITORIAL MAGAZINE MOMENTS (잡지 연출 섹션)                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {(() => {
          // 1. First find selected magazine section from master magazineSections or active tab
          const availableSections = (magazineSections && magazineSections.length > 0)
            ? magazineSections
            : [];
          const selectedSection = availableSections.find(s => s.id === activeHomeSectionId)
            || availableSections.find(s => s.id === homeMagazineSectionId)
            || availableSections[0]
            || null;

          const currentSecIndex = availableSections.findIndex(s => s.id === (selectedSection?.id || activeHomeSectionId));
          const safeSecIndex = Math.max(0, currentSecIndex);

          const handleSelectSection = (sectionId: string) => {
            setActiveHomeSectionId(sectionId);
            setMagazineSpreadIndex(0);
            const tabBtn = document.getElementById(`home-mag-tab-${sectionId}`);
            if (tabBtn) {
              tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
          };

          const handlePrevSection = () => {
            if (safeSecIndex > 0) {
              handleSelectSection(availableSections[safeSecIndex - 1].id);
            }
          };

          const handleNextSection = () => {
            if (safeSecIndex < availableSections.length - 1) {
              handleSelectSection(availableSections[safeSecIndex + 1].id);
            }
          };

          const handleGoToMagazineSection = (secId?: string) => {
            const targetSec = secId || selectedSection?.id;
            if (targetSec) {
              sessionStorage.setItem('lastMagazineSectionId', String(targetSec));
              sessionStorage.setItem('magazineViewMode', 'section');
            }
            onNavigate('magazine');
          };

          if (availableSections.length === 0) return null;

          return (
            <div className="w-full max-w-[1920px] mx-auto border-t border-black/10 dark:border-white/10 mt-12 pt-12 px-4 sm:px-8 md:px-12 flex flex-col gap-6">
              {/* Section Header: Pure Swiss Minimal Magazine Header */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-black/15 dark:border-white/15">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
                    MAGAZINE
                  </h2>
                  {selectedSection && (
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                      {selectedSection.title}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleGoToMagazineSection()}
                    className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline decoration-1 underline-offset-4 cursor-pointer transition-colors"
                  >
                    VIEW MAGAZINE HUB →
                  </button>
                </div>

                {/* Section Selector Tabs & Adjacent Minimal Prev/Next Navigation Controls */}
                <div className="flex items-center gap-3 max-w-full lg:max-w-2xl shrink-0 self-start sm:self-auto">
                  {/* Section Tabs Scrollable Container */}
                  {availableSections.length > 1 && (
                    <div
                      ref={homeMagTabsRef}
                      className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1 scroll-smooth"
                    >
                      {availableSections.map((sec) => {
                        const isSelected = sec.id === (selectedSection?.id || activeHomeSectionId);
                        return (
                          <button
                            key={sec.id}
                            id={`home-mag-tab-${sec.id}`}
                            type="button"
                            onClick={() => handleSelectSection(sec.id)}
                            className={`px-3.5 py-1.5 text-xs font-bold uppercase font-['Noto_Sans_KR',sans-serif] tracking-wider transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                                : 'bg-transparent border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                            }`}
                          >
                            {sec.title}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Adjacent Left / Right Section Navigation Buttons (Classic Home Preview Style) */}
                  {availableSections.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrevSection}
                        disabled={safeSecIndex <= 0}
                        className="w-9 h-9 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-transparent text-black dark:text-white"
                        title="이전 섹션"
                      >
                        <ChevronLeft className="w-4 h-4 stroke-[2]" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSection}
                        disabled={safeSecIndex >= availableSections.length - 1}
                        className="w-9 h-9 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-transparent text-black dark:text-white"
                        title="다음 섹션"
                      >
                        <ChevronRight className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sliding 3-Card Visual Container (Smooth Horizontal Slide & Touch Swipe) */}
              <div
                className="w-full overflow-hidden touch-pan-y"
                onTouchStart={handleMagazineTouchStart}
                onTouchMove={handleMagazineTouchMove}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current === null || touchStartYRef.current === null) return;
                  const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
                  const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
                  touchStartXRef.current = null;
                  touchStartYRef.current = null;
                  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX < 0) {
                      handleNextSection();
                    } else {
                      handlePrevSection();
                    }
                  }
                  setTimeout(() => {
                    isSwipingRef.current = false;
                  }, 80);
                }}
              >
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${safeSecIndex * 100}%)` }}
                >
                  {availableSections.map((sec, secIdx) => {
                    let secMoments: MagazineMoment[] = [];
                    if (sec.items && sec.items.length > 0) {
                      secMoments = sec.items.filter(item => !item.isTextOnly && Boolean(item.img));
                    } else if (magazineMoments && magazineMoments.length > 0) {
                      secMoments = magazineMoments.filter(item => !item.isTextOnly && Boolean(item.img));
                    } else {
                      secMoments = trips.slice(0, 3).map((t, idx) => ({
                        id: `fallback-${t.id}`,
                        tripId: t.id,
                        title: t.title,
                        date: t.date,
                        location: t.locationStr,
                        placeName: (t.locations && t.locations[0]?.name) || '',
                        caption: '',
                        quote: '',
                        img: t.img,
                        order: idx,
                      })).filter(item => Boolean(item.img));
                    }

                    const displayMoments = secMoments.slice(0, 3);

                    return (
                      <div key={sec.id || secIdx} className="w-full shrink-0">
                        {displayMoments.length > 0 ? (
                          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                            {displayMoments.map((moment, idx) => {
                              const parentTrip = trips.find(t => t.id === moment.tripId);
                              let matchedTimelineItem: any = null;
                              if (allTimelineItems.length > 0 && moment.img) {
                                const momentEffImg = getEffectiveImageUrl(moment.img);
                                matchedTimelineItem = allTimelineItems.find(it => {
                                  if (!it.img) return false;
                                  if (it.img === moment.img) return true;
                                  return getEffectiveImageUrl(it.img) === momentEffImg;
                                });
                              }

                              const displayTitle = matchedTimelineItem?.place?.trim() || moment.title || 'UNTITLED MOMENT';
                              const rawDate = matchedTimelineItem?.date || moment.date;
                              const dateWithDay = formatSimpleDateWithDay(rawDate);

                              let resolvedGoogleLocation = '';
                              if (matchedTimelineItem?.location) {
                                if (typeof matchedTimelineItem.location === 'string' && matchedTimelineItem.location.trim()) {
                                  resolvedGoogleLocation = matchedTimelineItem.location.trim().split(',')[0].trim();
                                } else if (typeof matchedTimelineItem.location === 'object' && (matchedTimelineItem.location as any)?.name) {
                                  resolvedGoogleLocation = (matchedTimelineItem.location as any).name;
                                }
                              }
                              const displayPlace = resolvedGoogleLocation || moment.placeName || moment.location || parentTrip?.locationStr || parentTrip?.country || 'VISITED PLACE';

                              return (
                                <article
                                  key={moment.id || idx}
                                  onClick={() => handleGoToMagazineSection(sec.id)}
                                  className="group flex flex-col justify-between cursor-pointer"
                                >
                                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                                    <img
                                      src={getEffectiveImageUrl(moment.img)}
                                      alt={displayTitle}
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                                    />
                                    <div className="absolute top-2.5 left-2.5 bg-black/60 dark:bg-white/70 backdrop-blur-xs text-white dark:text-black font-mono text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                                      {String(idx + 1).padStart(2, '0')}
                                    </div>
                                  </div>

                                  <div className="pt-2.5 flex-1 flex flex-col justify-between text-black dark:text-white font-['Noto_Sans_KR',sans-serif]">
                                    <div>
                                      <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight text-black dark:text-white line-clamp-1 leading-snug group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                                        {displayTitle}
                                      </h3>
                                      {dateWithDay && (
                                        <div className="text-[10px] sm:text-[11px] font-mono font-medium text-black/50 dark:text-white/50 uppercase tracking-wider mt-0.5">
                                          {dateWithDay}
                                        </div>
                                      )}
                                    </div>
                                    <div className="pt-2 mt-auto flex items-center justify-between text-[11px] sm:text-xs font-sans text-black/70 dark:text-white/70 border-t border-black/10 dark:border-white/10">
                                      <span className="font-semibold tracking-tight truncate max-w-[85%]">{displayPlace}</span>
                                      <span className="text-sm font-bold text-black dark:text-white group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-dashed border-black/20 dark:border-white/20 p-6">
                            NO PREVIEW MOMENTS AVAILABLE IN THIS ISSUE
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EXPLORE MAGAZINE HUB Button */}
              <div className="flex justify-center pt-6 pb-2 w-full">
                <button
                  type="button"
                  onClick={() => handleGoToMagazineSection()}
                  className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-2.5 cursor-pointer shadow-md font-sans"
                >
                  <span>EXPLORE MAGAZINE HUB</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Swiss Minimal Circular Calendar Part (홈허브 하단 캘린더 파트)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed
        const dateNum = today.getDate();

        const MONTH_NAMES_EN = [
          'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
          'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
        ];
        const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeekStr = WEEKDAYS_SHORT[today.getDay()];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        // 0: Mon, 1: Tue, ..., 6: Sun (월요일 시작 그리드)
        const startDayOfWeek = (firstDay.getDay() + 6) % 7;

        // 공휴일 정보
        const holidays = getKoreanHolidays(year);

        // 여행/여정 날짜 확인
        const allJourneys = [...trips, ...plans];
        const hasTripOnDate = (dStr: string) => {
          return allJourneys.some(j => {
            if (!j.date) return false;
            const parsed = parseDateParts(j.date);
            if (!parsed) return false;
            const target = new Date(dStr);
            const duration = j.date.includes('~') ? (parseInt(j.date.split('~')[1]?.trim() || '', 10) || 1) : 1;
            // check single or range
            if (j.date.includes('~')) {
              const parts = j.date.split('~').map(s => s.trim());
              const pStart = parseDateParts(parts[0]);
              const pEnd = parseDateParts(parts[1]);
              if (pStart && pEnd) {
                const sStr = `${pStart.getFullYear()}-${String(pStart.getMonth() + 1).padStart(2, '0')}-${String(pStart.getDate()).padStart(2, '0')}`;
                const eStr = `${pEnd.getFullYear()}-${String(pEnd.getMonth() + 1).padStart(2, '0')}-${String(pEnd.getDate()).padStart(2, '0')}`;
                return dStr >= sStr && dStr <= eStr;
              }
            }
            const jStr = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
            return jStr === dStr;
          });
        };

        // 그리드 셀 생성
        const cells: {
          key: string;
          dayNum: number;
          dateStr: string;
          isCurrentMonth: boolean;
          isToday: boolean;
          hasTrip: boolean;
          isHoliday: boolean;
          holidayName?: string;
          isSunday: boolean;
        }[] = [];

        // 이전 달 패딩 (빈 링 표시)
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let p = startDayOfWeek - 1; p >= 0; p--) {
          const pDay = prevMonthLastDay - p;
          cells.push({
            key: `prev-${pDay}`,
            dayNum: pDay,
            dateStr: '',
            isCurrentMonth: false,
            isToday: false,
            hasTrip: false,
            isHoliday: false,
            isSunday: false
          });
        }

        // 이번 달
        for (let d = 1; d <= totalDays; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const curD = new Date(year, month, d);
          const isSun = curD.getDay() === 0;
          const holiday = holidays.get(dStr);
          const isToday = d === dateNum;
          const hasTrip = hasTripOnDate(dStr);

          cells.push({
            key: `curr-${d}`,
            dayNum: d,
            dateStr: dStr,
            isCurrentMonth: true,
            isToday,
            hasTrip,
            isHoliday: Boolean(holiday),
            holidayName: holiday?.name,
            isSunday: isSun
          });
        }

        // 다음 달 패딩 (그리드 줄 완성을 위한 빈 링 표시)
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let n = 1; n <= remaining; n++) {
          cells.push({
            key: `next-${n}`,
            dayNum: n,
            dateStr: '',
            isCurrentMonth: false,
            isToday: false,
            hasTrip: false,
            isHoliday: false,
            isSunday: false
          });
        }

        // 날짜 클릭 시 달력 허브 해당 날짜로 연계 이동
        const handleCellClick = (dStr: string) => {
          if (!dStr) return;
          try {
            sessionStorage.setItem('pending_calendar_focus', JSON.stringify({
              year,
              month,
              dateStr: dStr
            }));
          } catch (_) {}
          onNavigate('calendar');
        };

        return (
          <section className="w-full max-w-[1920px] mx-auto border-t border-black/10 dark:border-white/10 mt-14 pt-12 pb-16 px-4 sm:px-8 md:px-12 select-none">
            {/* Minimal Section Sub-Header */}
            <div className="flex items-center justify-between pb-6 border-b border-black/10 dark:border-white/10 mb-8">
              <div className="flex items-center gap-2.5">
                <span className="bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-widest">
                  CALENDAR ARCHIVE
                </span>
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-black/60 dark:text-white/60">
                  {MONTH_NAMES_EN[month]} {year}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>OPEN CALENDAR HUB</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Swiss Layout: Left Big Date & Month + Right Circular Dot Grid (2번 첨부 스타일) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center justify-between">
              {/* Left Column: Giant Typography */}
              <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center">
                <div 
                  onClick={() => onNavigate('calendar')}
                  className="cursor-pointer group flex flex-col items-start"
                  title="달력 허브로 이동"
                >
                  <span className="text-7xl sm:text-8xl lg:text-9xl font-black font-satoshi tracking-tighter leading-none text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                    {dateNum}
                  </span>
                  <div className="mt-2 flex flex-col">
                    <span className="text-xl sm:text-2xl font-black font-satoshi tracking-tight uppercase text-black dark:text-white leading-tight">
                      {MONTH_NAMES_EN[month]}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg sm:text-xl font-medium font-satoshi text-black/40 dark:text-white/40">
                        {year}
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono text-red-600 dark:text-red-500 uppercase">
                        · {dayOfWeekStr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro helper label */}
                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex items-center gap-3 text-xs font-mono text-black/50 dark:text-white/50">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />
                    <span className="text-[11px] font-bold">여정/오늘 강조</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white" />
                    <span className="text-[11px] font-bold">일반 날짜</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Circular Dot Grid (7 Columns: M T W T F S S) */}
              <div className="md:col-span-7 lg:col-span-8 flex flex-col items-center md:items-end justify-center w-full">
                <div className="inline-block max-w-full">
                  {/* Weekday Headers: M T W T F S S */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3.5 md:gap-4 mb-2 sm:mb-3 text-center text-xs sm:text-sm font-black font-mono select-none text-black/40 dark:text-white/40">
                    <div>M</div>
                    <div>T</div>
                    <div>W</div>
                    <div>T</div>
                    <div>F</div>
                    <div className="text-blue-500">S</div>
                    <div className="text-red-500">S</div>
                  </div>

                  {/* Circular Dot Grid */}
                  <div className="grid grid-cols-7 gap-2 sm:gap-3.5 md:gap-4">
                    {cells.map((cell) => {
                      if (!cell.isCurrentMonth) {
                        // Empty / Outline circle for padding days
                        return (
                          <div
                            key={cell.key}
                            className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center pointer-events-none"
                          />
                        );
                      }

                      // Is Highlighted (Journey or Today) -> Vibrant Orange / Red Accent
                      const isHighlighted = cell.hasTrip || cell.isToday;

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => handleCellClick(cell.dateStr)}
                          title={cell.holidayName ? `${cell.dateStr} (${cell.holidayName})` : cell.dateStr}
                          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full flex flex-col items-center justify-center font-mono transition-all duration-200 cursor-pointer relative group ${
                            isHighlighted
                              ? 'bg-[#FF6B35] hover:bg-[#FF5510] text-white shadow-md scale-105 active:scale-95'
                              : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-80 active:scale-95'
                          }`}
                        >
                          <span className={`text-[11px] sm:text-xs md:text-sm font-black leading-none ${
                            !isHighlighted && cell.isHoliday ? 'text-red-300 dark:text-red-600' : ''
                          }`}>
                            {cell.dayNum}
                          </span>
                          {/* Sub-dot for holiday or special note */}
                          {cell.isHoliday && (
                            <span className="w-1 h-1 rounded-full bg-red-400 dark:bg-red-500 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}
    </main>
  );
}
