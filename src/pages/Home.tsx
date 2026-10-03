import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Tag, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { auth } from '../firebase';
import { Trip, Plan, MagazineMoment, MagazineSection, TimelineData, FlightItem, StayItem, TransitItem } from '../types';
import { MagazineSpread, SpreadCard } from '../components/magazine/MagazineSpread';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { JourneyListRow, type JourneyRowBadge } from '../components/cards/JourneyListRow';
import { sharedOwner } from '../components/cards/SharedMark';
import { cardCoverUrl } from '../utils/journeyThumbs';
import { ViewModeSegment } from '../components/ui/ViewModeSegment';
import { Chip } from '../components/ui/Chip';
import { cleanAdministrativeDistricts, generateJourneyMessage } from '../components/SummaryView';
import { preloadDetailPage } from '../utils/prefetchHelper';
import { getKoreanHolidays } from '../utils/koreanHolidays';
import { HomeWeatherWidget } from '../components/HomeWeatherWidget';
import { getUpcomingPlanInfo, getLiveTripStatus } from '../utils/tripPlanHelper';
import { sortJourneysByOrder } from '../utils/journeyOrderHelper';
import { JourneyCard } from '../components/cards/JourneyCard';
import { openJourneyActions } from '../components/cards/JourneyActionsSheet';
import { JourneyPhaseStrip } from '../components/home/JourneyPhaseStrip';
import { DepartureTeaser } from '../components/home/DepartureTeaser';
import { FirstTripHero, type FirstTripPick } from '../components/home/FirstTripHero';
import { EmptyScene } from '../components/scenes/EmptyScene';
import { useMyCities } from '../utils/myCities';
import { useHomeWidgets } from '../utils/homeWidgetPrefs';
import { setDetailIntent } from '../utils/detailIntent';
import { openJourneyFromCard, warmJourney } from '../utils/journeyOpen';
import { HomeBento } from '../components/home/bento/HomeBento';
import { CURRENT_LOCATION_EN } from '../utils/userPrefs';

interface HomePageProps {
  onNavigate: (view: string, tripId?: number | null) => void;
  trips: Trip[];
  plans: Plan[];
  homeTitle: string;
  homeSubtitle?: string;
  heroJourneyIds?: number[];
  heroAutoSlide?: boolean;
  heroMediaType?: 'image' | 'video';
  heroSlideDuration?: number;
  onReorderTrips?: (orderedIds: number[]) => void;
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
  flightsByTrip?: Record<number, FlightItem[]>;
  staysByTrip?: Record<number, StayItem[]>;
  transitByTrip?: Record<number, TransitItem[]>;
  landingHeroImage?: string;
  onOpenAuthModal?: (mode?: 'login' | 'signup') => void;
  isAdmin?: boolean;
  /** Starts the New trip flow (the empty hero's button) */
  onNewTrip?: (pick?: FirstTripPick) => void;
  /** True once the journey lists have loaded, so the empty hero never flashes while loading */
  dataReady?: boolean;
}

// Home hero before the first journey: see FirstTripHero (v1.3.6)
export const EmptyHero = FirstTripHero;

// The year and month a journey starts, as one sortable number (202608)
function startScore(t: Trip | Plan): number {
  const m = (t.date || '').match(/(\d{4})[.-](\d{1,2})[.-]?(\d{1,2})?/);
  return m ? Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3] || 0) : 0;
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

export { getLiveTripStatus } from '../utils/tripPlanHelper';

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

interface HeroMediaProps {
  journey: Trip | Plan;
  isActive: boolean;
  mediaType?: 'image' | 'video';
  onMediaReady?: () => void;
}

function HeroMedia({ journey, isActive, onMediaReady }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [journey.id, journey.heroVideoUrl, journey.videoUrl]);

  // Smart resolution of hero media: heroVideoUrl > heroImg > videoUrl > img
  let finalVideoUrl = '';
  let finalImageUrl = '';

  if (journey.heroVideoUrl && !videoError) {
    finalVideoUrl = getEffectiveImageUrl(journey.heroVideoUrl);
  } else if (journey.videoUrl && !videoError && !journey.heroImg) {
    finalVideoUrl = getEffectiveImageUrl(journey.videoUrl);
  }

  if (journey.heroImg) {
    finalImageUrl = getEffectiveImageUrl(journey.heroImg);
  } else {
    finalImageUrl = getEffectiveImageUrl(journey.img);
  }

  const isVideo = Boolean(finalVideoUrl) && !videoError;

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
          onError={() => {
            console.warn("Hero video playback failed, falling back to image:", finalVideoUrl);
            setVideoError(true);
            if (onMediaReady) onMediaReady();
          }}
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


export function HomePage({
  onNavigate,
  trips,
  plans,
  homeTitle,
  homeSubtitle,
  heroJourneyIds = [],
  onNewTrip,
  dataReady = true,
  heroAutoSlide = true,
  heroMediaType = 'image',
  heroSlideDuration = 6,
  onReorderTrips,
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
  flightsByTrip,
  staysByTrip,
  transitByTrip,
  landingHeroImage = '',
  onOpenAuthModal,
  isAdmin = false,
}: HomePageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  // Which widgets this member turned on in Settings → 화면 (homeWidgetPrefs.ts)
  const widgetConfig = useHomeWidgets();

  // The weather widget shows this member's cities (main first), not the operator's list
  const { list: myCityList } = useMyCities();

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

    return sortJourneysByOrder(list);
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

  // Hero journeys (v1.3.6 4-c), with nothing to set up:
  //  1. journeys the member pinned to home (card menu), in the order they were pinned
  //  2. otherwise published journeys, newest first
  //  3. otherwise journeys that are over, newest first; then anything at all
  const heroJourneys = useMemo(() => {
    const all = [...localTrips, ...localPlans];
    const pinned = (heroJourneyIds || []).map(id => all.find(j => j.id === id)).filter(Boolean) as (Trip | Plan)[];
    if (pinned.length > 0) return pinned;
    const newest = (a: Trip | Plan, b: Trip | Plan) => startScore(b) - startScore(a);
    const past = localTrips.filter(t => !getUpcomingPlanInfo(t).isPlanOrFuture).sort(newest);
    const published = past.filter(t => t.publishedAt);
    if (published.length > 0) return published.slice(0, 8);
    if (past.length > 0) return past.slice(0, 6);
    return all.slice(0, 1);
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
    if (onReorderTrips) onReorderTrips(orderedIds);
  };

  return (
    <main 
      onClick={() => setActiveCardId(null)} 
      className="animate-in fade-in duration-700 w-full bg-transparent transition"
    >

      {/* ===== Hero Section: Guest Fullscreen Landing Hero or Swiss Editorial Hero ===== */}
      {!isLoggedIn ? (
        <section className="relative w-full h-[78vh] min-h-[540px] max-h-[900px] overflow-hidden border-b border-black/15 dark:border-white/15 select-none bg-black">
          {/* Landing Background Image filling the whole frame without margins */}
          <img
            src={getEffectiveImageUrl(landingHeroImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop')}
            alt="Landing Hero"
            className="absolute inset-0 w-full h-full object-cover brightness-[0.82] dark:brightness-[0.7] transition-transform duration-1000 scale-100 hover:scale-105"
          />
          {/* Swiss Subtle Dark Vignette Overlay for Typography */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40" />

          {/* Minimal Swiss Typographic Content */}
          <div className="relative z-10 w-full h-full max-w-[1920px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24 flex flex-col justify-between py-12 md:py-20 text-white">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono tracking-[0.3em] uppercase opacity-75">
                CURATED TRAVEL ARCHIVE & EDITORIAL JOURNAL
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-none font-['Inter',sans-serif] drop-shadow-md">
                Tripgon log
              </h1>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-md">
                <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-85 break-keep">
                  발걸음이 머물렀던 도시와 순간의 기록.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal ? onOpenAuthModal('login') : onNavigate('archive')}
                  className="h-12 px-7 sm:px-8 rounded-full bg-surface text-ink hover:bg-white text-sm font-bold transition-colors cursor-pointer shadow-xl"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal ? onOpenAuthModal('signup') : onNavigate('archive')}
                  className="h-12 px-7 sm:px-8 rounded-full bg-white/20 text-white hover:bg-white/30 text-sm font-bold transition-colors cursor-pointer backdrop-blur-xs"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <HomeBento
          trips={trips}
          plans={plans}
          heroJourneys={heroJourneys}
          heroSlide={heroSlide}
          onHeroSlide={goToSlide}
          renderHeroMedia={(journey, active) => (
            <HeroMedia
              journey={journey}
              isActive={active}
              mediaType={heroMediaType}
              onMediaReady={() => { if (active) setIsHeroMediaReady(true); }}
            />
          )}
          dataReady={dataReady}
          isDarkMode={isDarkMode}
          onNavigate={onNavigate}
          onNewTrip={() => onNewTrip?.()}
        />
      )}
  </main>
);
}
