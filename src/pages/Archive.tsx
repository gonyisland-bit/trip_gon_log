import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HubHeader } from '../components/ui/HubHeader';
import { Plus, GripVertical, ChevronDown, ChevronUp, Tag, Search, X, LayoutGrid, StretchHorizontal, List, ArrowRight, ArrowUpDown, Compass } from 'lucide-react';
import { Trip, Plan, ArchiveHubConfig } from '../types';
import { JourneyCardMenu, getEnglishCityName } from './Home';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { JourneyListRow, type JourneyRowBadge } from '../components/cards/JourneyListRow';
import { sharedOwner } from '../components/cards/SharedMark';
import { cardCoverUrl } from '../utils/journeyThumbs';
import { ViewModeSegment } from '../components/ui/ViewModeSegment';
import { cleanAdministrativeDistricts } from '../components/SummaryView';
import { preloadDetailPage } from '../utils/prefetchHelper';
import { getUpcomingPlanInfo } from '../utils/tripPlanHelper';
import { JourneyCard } from '../components/cards/JourneyCard';
import { openJourneyActions } from '../components/cards/JourneyActionsSheet';
import { sortJourneysByOrder } from '../utils/journeyOrderHelper';
import { NewTripButton } from '../components/NewTripButton';
import { EmptyScene } from '../components/scenes/EmptyScene';


interface ArchiveHubPageProps {
  trips: Trip[];
  plans?: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddArchive: () => void;
  isLoggedIn: boolean;
  /** True once the journey lists have loaded, so the empty scene never flashes while loading */
  dataReady?: boolean;
  onDeleteTrip: (id: number) => Promise<void>;
  onEditTrip?: (id: number) => void;
  onCloneTrip?: (id: number) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onMoveToArchive?: (plan: Plan) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  initialTagFilter?: string | null;
  hubConfig?: ArchiveHubConfig;
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
  
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function getTripStartDate(dateRangeStr: string): Date {
  if (!dateRangeStr) return new Date(0);
  const parts = dateRangeStr.split(' - ');
  const d = parseDateParts(parts[0].trim());
  return d || new Date(0);
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

// Helper to extract year, English short month, and compact date for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string; compactDate: string } {
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

export function ArchiveHubPage({
  trips,
  plans = [],
  onNavigate,
  onAddArchive,
  isLoggedIn,
  dataReady,
  onDeleteTrip,
  onEditTrip,
  onCloneTrip,
  onMoveToPlans,
  onMoveToArchive,
  onReorderTrips,
  initialTagFilter,
  hubConfig,
}: ArchiveHubPageProps) {
  const [activeFilter, setActiveFilter] = useState(initialTagFilter || 'All');
  const [activeYearFilter, setActiveYearFilter] = useState('All');
  const [activeLocationFilter, setActiveLocationFilter] = useState('All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);


  const combinedTrips = useMemo(() => {
    const list: Trip[] = [...trips];
    if (plans && plans.length > 0) {
      plans.forEach(p => {
        const hasPlanTag = p.tags?.includes('Plan');
        list.push({
          ...p,
          isPlan: true,
          tags: hasPlanTag ? p.tags : [...(p.tags || []), 'Plan'],
        });
      });
    }

    return sortJourneysByOrder(list);
  }, [trips, plans]);

  const [localTrips, setLocalTrips] = useState<Trip[]>(combinedTrips);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  const handleSetCardViewMode = (mode: 'grid' | 'wide' | 'list') => {
    setCardViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  useEffect(() => {
    setLocalTrips(combinedTrips);
  }, [combinedTrips]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    localTrips.forEach(t => {
      const { year } = getYearAndMonth(t.date);
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [localTrips]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    localTrips.forEach(t => {
      if (t.country?.trim()) {
        locs.add(t.country.trim().toUpperCase());
      } else if (t.locationStr) {
        const parts = t.locationStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) locs.add(last);
      }
    });
    return Array.from(locs).sort();
  }, [localTrips]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    localTrips.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [localTrips]);

  const visibleTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return filters;
    const q = tagSearchQuery.trim().toLowerCase();
    return filters.filter(f => f.toLowerCase().includes(q) || f === 'All');
  }, [filters, tagSearchQuery]);

  const sortedTrips = useMemo(() => {
    if (sortBy === 'date') {
      return [...localTrips].sort((a, b) => {
        // Most recent first for archive
        return getTripStartDate(b.date).getTime() - getTripStartDate(a.date).getTime();
      });
    }
    if (sortBy === 'place') {
      return [...localTrips].sort((a, b) => {
        const locA = a.locationStr || '';
        const locB = b.locationStr || '';
        return locA.localeCompare(locB);
      });
    }
    return localTrips;
  }, [localTrips, sortBy]);

  const filteredTrips = useMemo(() => {
    return sortedTrips.filter(t => {
      if (hubSearchQuery.trim()) {
        const q = hubSearchQuery.trim().toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchLoc = (t.locationStr || '').toLowerCase().includes(q);
        const matchCountry = (t.country || '').toLowerCase().includes(q);
        const matchDate = (t.date || '').toLowerCase().includes(q);
        const matchTag = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchLoc && !matchCountry && !matchDate && !matchTag) return false;
      }
      if (activeFilter !== 'All' && (!t.tags || !t.tags.includes(activeFilter))) return false;
      if (activeYearFilter !== 'All') {
        const { year } = getYearAndMonth(t.date);
        if (year !== activeYearFilter) return false;
      }
      if (activeLocationFilter !== 'All') {
        const matchCountry = t.country && t.country.trim().toUpperCase() === activeLocationFilter;
        const matchLoc = t.locationStr && t.locationStr.toUpperCase().includes(activeLocationFilter);
        if (!matchCountry && !matchLoc) return false;
      }
      return true;
    });
  }, [sortedTrips, activeFilter, activeYearFilter, activeLocationFilter, hubSearchQuery]);

  // Collapsed sections for Time (Year) / Place (City) accordion
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  // Grouped trips by Year or City when sortBy is 'date' or 'place'
  const groupedTrips = useMemo(() => {
    if (sortBy === 'user') {
      return [{ key: 'ALL', title: 'ALL JOURNEYS', items: filteredTrips }];
    }

    const groupsMap = new Map<string, Trip[]>();

    filteredTrips.forEach(trip => {
      let groupKey = '';
      if (sortBy === 'date') {
        const { year } = getYearAndMonth(trip.date);
        groupKey = year || 'OTHER';
      } else if (sortBy === 'place') {
        const engCity = getEnglishCityName(trip.locationStr);
        if (engCity) {
          groupKey = engCity;
        } else if (trip.country?.trim()) {
          groupKey = trip.country.trim().toUpperCase();
        } else if (trip.locationStr?.trim()) {
          const parts = trip.locationStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          groupKey = parts[parts.length - 1] || 'OTHER';
        } else {
          groupKey = 'OTHER';
        }
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      groupsMap.get(groupKey)!.push(trip);
    });

    const entries = Array.from(groupsMap.entries()).map(([key, items]) => ({
      key,
      title: key,
      items
    }));

    if (sortBy === 'date') {
      // Sort descending by year
      entries.sort((a, b) => b.key.localeCompare(a.key));
    } else if (sortBy === 'place') {
      // Sort alphabetically by city name
      entries.sort((a, b) => a.key.localeCompare(b.key));
    }

    return entries;
  }, [filteredTrips, sortBy]);

  const handleTripDragStart = (e: React.DragEvent, id: number) => {
    if (sortBy !== 'user') return;
    setDraggedTripId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTripDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (sortBy !== 'user' || draggedTripId === null || draggedTripId === id) return;
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
    if (sortBy === 'user' && onReorderTrips) {
      onReorderTrips(localTrips.map(t => t.id));
    }
  };

  // Compute comprehensive trip summary statistics
  const tripStats = useMemo(() => {
    const list = localTrips;
    const totalTrips = list.length;
    
    // Unique countries
    const countrySet = new Set<string>();
    list.forEach(t => {
      if (t.country) {
        countrySet.add(t.country.trim().toUpperCase());
      }
      if (t.locations && t.locations.length > 0) {
        t.locations.forEach(loc => {
          if (loc.country) countrySet.add(loc.country.trim().toUpperCase());
        });
      }
    });

    // Unique cities / places
    const citySet = new Set<string>();
    list.forEach(t => {
      if (t.locationStr) {
        t.locationStr.split(/[,/·-]/).map(s => s.trim()).filter(Boolean).forEach(c => citySet.add(c.toUpperCase()));
      }
      if (t.locations && t.locations.length > 0) {
        t.locations.forEach(loc => {
          if (loc.name) citySet.add(loc.name.trim().toUpperCase());
        });
      }
    });

    // Total days traveled
    const totalDays = list.reduce((acc, t) => acc + calculateDays(t.date), 0);

    return {
      totalTrips,
      totalCountries: countrySet.size,
      totalCities: citySet.size,
      totalDays
    };
  }, [localTrips]);

  return (
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-500 min-h-screen w-full flex flex-col justify-between">
      <div>
        {/* Masthead: the trip hub in its peach face colour (v1.3.7) */}
        <HubHeader
          tint="peach"
          eyebrow={<>Trip · {tripStats.totalTrips} journeys</>}
          title="모든 여정"
          sub={<span className="tabular-nums">{tripStats.totalCountries}개 나라 · {tripStats.totalDays}일</span>}
          className="pb-4"
        />

        {/* Filter & Controls Bar */}
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-4 border-b border-black/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          {/* Left: Section Sub-label */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-['Inter',sans-serif] font-bold uppercase tracking-wider text-black dark:text-white">
              ALL TRIPS ({filteredTrips.length})
            </span>
          </div>
          
          {/* Right: Active Filter, Search, Controls Layout, and ADD Button */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
            <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
              {/* Tag / Multi-Filter Dropdown Button */}
              <div className="relative inline-block text-left">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className={`h-9 px-3.5 rounded-full text-[13px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                      activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All'
                        ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                        : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-black dark:text-white'
                    }`}
                    title="태그 · 연도 · 장소로 거르기"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Filter</span>
                    {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    )}
                  </button>

                {/* Separated Search Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchInputOpen(v => !v);
                    if (isSearchInputOpen) setHubSearchQuery('');
                  }}
                  aria-label="여정 검색"
                  className={`w-9 h-9 border transition-colors grid place-items-center rounded-full cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                    isSearchInputOpen || hubSearchQuery
                      ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent'
                      : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-black dark:text-white'
                  }`}
                  title="여정 검색"
                >
                  <Search className="w-3.5 h-3.5" />
                  {hubSearchQuery && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600" />
                  )}
                </button>

                {/* Inline Search Input */}
                {isSearchInputOpen && (
                  <div className="relative flex items-center animate-in fade-in slide-in-from-left-2 duration-150">
                    <input
                      type="text"
                      autoFocus
                      value={hubSearchQuery}
                      onChange={(e) => setHubSearchQuery(e.target.value)}
                      placeholder="여정 검색..."
                      className="w-32 sm:w-48 h-9 pl-3.5 pr-8 text-[13px] bg-black/[0.05] dark:bg-white/[0.08] rounded-full font-medium outline-none focus-visible:ring-2 focus-visible:ring-red-600 text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50"
                    />
                    {hubSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setHubSearchQuery('')}
                        className="tap-target absolute right-3 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                        title="검색어 지우기"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All' || hubSearchQuery) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hubSearchQuery && (
                      <span className="text-meta font-mono font-bold h-7 px-2.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        "{hubSearchQuery}"
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setHubSearchQuery('')} />
                      </span>
                    )}
                    {activeFilter !== 'All' && (
                      <span className="text-meta font-mono font-bold h-7 px-2.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        #{activeFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveFilter('All')} />
                      </span>
                    )}
                    {activeYearFilter !== 'All' && (
                      <span className="text-meta font-mono font-bold h-7 px-2.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        {activeYearFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveYearFilter('All')} />
                      </span>
                    )}
                    {activeLocationFilter !== 'All' && (
                      <span className="text-meta font-mono font-bold h-7 px-2.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        {activeLocationFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveLocationFilter('All')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFilter('All');
                        setActiveYearFilter('All');
                        setActiveLocationFilter('All');
                        setHubSearchQuery('');
                      }}
                      className="text-micro px-1.5 py-0.5 uppercase font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>
                )}
              </div>
              
              {isTagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-72 bg-surface dark:bg-surface-dark shadow-[0_12px_32px_rgba(0,0,0,0.14)] z-20 rounded-card p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-1 duration-150 text-black dark:text-white">
                    {/* 1. Year Filter Section */}
                    {availableYears.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-micro font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                          Year
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setActiveYearFilter('All'); }}
                            className={`h-8 px-3 rounded-full text-meta font-bold border transition-colors cursor-pointer ${activeYearFilter === 'All' ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                          >
                            All
                          </button>
                          {availableYears.map(yr => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => { setActiveYearFilter(yr === activeYearFilter ? 'All' : yr); }}
                              className={`h-8 px-3 rounded-full text-meta font-bold border transition-colors cursor-pointer ${activeYearFilter === yr ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Location Section */}
                    {availableLocations.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-micro font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                          Place
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setActiveLocationFilter('All'); }}
                            className={`h-8 px-3 rounded-full text-meta font-bold border transition-colors cursor-pointer ${activeLocationFilter === 'All' ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                          >
                            All
                          </button>
                          {availableLocations.map(loc => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => { setActiveLocationFilter(loc === activeLocationFilter ? 'All' : loc); }}
                              className={`h-8 px-3 rounded-full text-meta font-bold border transition-colors cursor-pointer ${activeLocationFilter === loc ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Tags Section */}
                    <div className="flex flex-col gap-1">
                      <span className="text-micro font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5">
                        {visibleTags.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setActiveFilter(f === activeFilter ? 'All' : f);
                            }}
                            className={`h-8 px-3 rounded-full text-meta font-bold border transition-colors cursor-pointer ${activeFilter === f ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                          >
                            {f === 'All' ? 'All' : `#${f}`}
                          </button>
                        ))}
                        {visibleTags.length === 0 && (
                          <span className="text-meta text-black/60 dark:text-white/60 py-1 italic">
                            검색 결과가 없습니다.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* View Mode Switcher: Grid (모바일 2열) / Wide (모바일 1열) / List */}
              <ViewModeSegment value={cardViewMode} onChange={handleSetCardViewMode} />

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="정렬"
                  className="h-9 bg-black/[0.06] dark:bg-white/10 text-[13px] font-bold px-3.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 cursor-pointer font-sans"
                >
                  <option value="user">My order</option>
                  <option value="date">Time</option>
                  <option value="place">Place</option>
                </select>
              </div>
            </div>
            </div>
            </div>
            {isLoggedIn && (
              <NewTripButton size="sm" onClick={onAddArchive} className="w-full sm:w-auto shrink-0" />
            )}
          </div>
        </div>
      
      {/* Journeys Container: Flat list/grid for USER, or Accordion Sections for TIME / PLACE */}
      <div className="flex flex-col w-full">
        {dataReady && trips.length === 0 && (plans?.length ?? 0) === 0 && (
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-6 sm:py-10">
            <EmptyScene
              kind="trip"
              title="아직 여정이 없어요"
              copy="여행을 계획하면 여기에 카드로 모이고, 다녀온 뒤에는 사진과 함께 기록으로 남습니다."
              action={isLoggedIn ? { label: 'New trip', onClick: onAddArchive } : undefined}
            />
          </div>
        )}

        {groupedTrips.map(group => {
          const isCollapsed = collapsedSections.has(group.key);
          const showGroupHeader = sortBy !== 'user';

          return (
            <div key={group.key} className="flex flex-col w-full">
              {/* Section Header for Time (Year) and Place (City) */}
              {showGroupHeader && (
                <div 
                  onClick={() => toggleSection(group.key)}
                  className="w-full border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors select-none group"
                >
                  <div className="max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-3.5 sm:py-4 flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold uppercase font-sans tracking-tight text-black dark:text-white">
                        {group.title}
                      </h2>
                      <span className="font-mono text-xs font-bold text-black/60 dark:text-white/60 tracking-wider">
                        {group.items.length} {group.items.length === 1 ? 'JOURNEY' : 'JOURNEYS'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="p-1 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Group Body: List or Grid */}
              {!isCollapsed && (
                cardViewMode === 'list' ? (
                  <div className="flex flex-col gap-2 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-5 sm:py-8">
                    {group.items.map((trip, index) => {
                      const { year, month } = getYearAndMonth(trip.date);
                      const days = calculateDays(trip.date);
                      const planInfo = getUpcomingPlanInfo(trip);
                      const badge: JourneyRowBadge | null = planInfo.isPlanOrFuture || trip.statusBadge === 'PLAN'
                        ? { kind: 'plan', text: 'Plan' }
                        : trip.statusBadge === 'NEW' ? { kind: 'new', text: 'New' }
                        : trip.statusBadge === 'EDITING' ? { kind: 'editing', text: 'Editing' } : null;
                      const place = trip.locationStr ? cleanAdministrativeDistricts(trip.locationStr).replace(/,/g, ' · ') : '';
                      return (
                        <JourneyListRow
                          key={trip.id}
                          style={{ animation: 'cardEntrance 260ms cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${Math.min(index * 20, 200)}ms` }}
                          img={cardCoverUrl(trip)}
                          title={trip.title}
                          year={year || ''}
                          month={month}
                          badge={badge}
                          dDay={planInfo.isPlanOrFuture && planInfo.dDayLabel && planInfo.dDayLabel !== 'PLAN' ? planInfo.dDayLabel : undefined}
                          meta={[place, formatNonRepeatingDate(trip.date), days > 0 ? `${days} days` : ''].filter(Boolean).join(' · ')}
                          active={activeCardId === trip.id}
                          onOpen={() => onNavigate('detail', trip.id)}
                          onPreload={preloadDetailPage}
                          onMenu={isLoggedIn ? () => openJourneyActions(trip.id) : undefined}
                          sharedBy={sharedOwner(trip)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className={cardViewMode === 'wide'
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 gap-y-10 sm:gap-y-14 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-6 sm:py-10"
                    : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6 gap-y-8 sm:gap-y-12 md:gap-y-14 w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-6 sm:py-10"
                  }>
                    {group.items.map((trip, index) => {
                      const display = getTripCardDisplayData(trip, index);
                      return (
                        <JourneyCard
                          key={trip.id}
                          trip={trip}
                          display={display}
                          index={index}
                          isActive={activeCardId === trip.id}
                          isWide={cardViewMode === 'wide'}
                          onOpen={() => onNavigate('detail', trip.id)}
                          onPreload={preloadDetailPage}
                          onMenu={isLoggedIn ? () => openJourneyActions(trip.id) : undefined}
                          draggable={isLoggedIn && sortBy === 'user'}
                          onDragStart={(e) => handleTripDragStart(e, trip.id)}
                          onDragOver={(e) => handleTripDragOver(e, trip.id)}
                          onDrop={handleTripDrop}
                          onDragEnd={() => setDraggedTripId(null)}
                        />
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* ===== Bottom Bold Typography Statistics Banner (Seamlessly attached without white gap) ===== */}
      <footer className="w-full border-t border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03] py-8 sm:py-12 md:py-16 px-6 sm:px-12 md:px-16 mt-0 transition-colors">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-2.5 sm:gap-3 font-['Inter',sans-serif]">
          <span className="text-xs font-extrabold text-black/60 dark:text-white/60 tracking-[0.25em] uppercase">
            TOTAL TRAVEL RECORD
          </span>
          <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold uppercase tracking-tighter leading-[1.1] text-black dark:text-white flex flex-col sm:flex-row sm:items-center sm:flex-nowrap whitespace-nowrap gap-1 sm:gap-0">
            {/* Mobile Row 1 / Desktop Left Half: TRIPS · COUNTRIES */}
            <div className="flex items-center">
              <span>{tripStats.totalTrips} {tripStats.totalTrips === 1 ? 'TRIP' : 'TRIPS'}</span>
              <span className="text-black/60 dark:text-white/60 mx-2 sm:mx-2.5 lg:mx-3">·</span>
              <span>{tripStats.totalCountries} {tripStats.totalCountries === 1 ? 'COUNTRY' : 'COUNTRIES'}</span>
            </div>

            {/* Middle divider on Desktop */}
            <span className="hidden sm:inline text-black/60 dark:text-white/60 mx-2 sm:mx-2.5 lg:mx-3">·</span>

            {/* Mobile Row 2 / Desktop Right Half: CITIES · DAYS */}
            <div className="flex items-center">
              <span>{tripStats.totalCities} {tripStats.totalCities === 1 ? 'CITY' : 'CITIES'}</span>
              <span className="text-black/60 dark:text-white/60 mx-2 sm:mx-2.5 lg:mx-3">·</span>
              <span>{tripStats.totalDays} {tripStats.totalDays === 1 ? 'DAY' : 'DAYS'}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

