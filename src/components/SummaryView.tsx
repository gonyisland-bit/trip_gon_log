import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  FileText, Share2, Download, X, Calendar, MapPin, 
  Bed, Plane, Train, Landmark, ChevronDown, ChevronUp, ArrowDownRight, ArrowRight,
  Copy, Check, ChevronsUpDown, ChevronsDownUp
} from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem } from '../types';
import html2canvas from 'html2canvas';
import { createPortal } from 'react-dom';

const EXCHANGE_RATES: { [currency: string]: number } = {
  KRW: 1,
  USD: 1380,
  JPY: 9.0,
  EUR: 1480,
  CNY: 190,
  GBP: 1750,
  TWD: 42,
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  KRW: 'KRW ', USD: 'USD ', JPY: 'JPY ', EUR: 'EUR ', CNY: 'CNY ', GBP: 'GBP ', TWD: 'TWD ',
};

interface SummaryViewProps {
  trip: Trip;
  timelineData: { [date: string]: TimelineItem[] };
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  defaultCurrency?: string;
  onSelectTab?: (tab: string) => void;
}

// Clean administrative suffixes like '시', '도', '특별시', '광역시', '특별자치도', '부', '현', and strip trailing country strings
export function cleanAdministrativeDistricts(locationStr?: string): string {
  if (!locationStr) return '';

  // 1. Strip trailing country identifiers (e.g. ", SOUTH KOREA", ", 대한민국")
  let preClean = locationStr
    .replace(/,\s*(SOUTH KOREA|KOREA|대한민국|한국|JAPAN|일본|VIETNAM|베트남|THAILAND|태국|TAIWAN|대만|CHINA|중국|USA|미국|FRANCE|프랑스|ITALY|이탈리아|UK|영국|SPAIN|스페인).*$/i, '')
    .trim();

  // 2. Special single-destination normalization (e.g. Jeju)
  const upper = preClean.toUpperCase();
  if (upper.includes('JEJU') || upper.includes('제주') || upper.includes('SEOGWIPO') || upper.includes('서귀포')) {
    return '제주';
  }

  const items = preClean.split(/[,·/]+/).map(s => s.trim()).filter(Boolean);
  const cleaned = items.map(name => {
    let n = name;
    // Strip common administrative endings
    n = n.replace(/(특별자치시|특별자치도|특별시|광역시|자치시|자치도)$/, '');
    if (n.length > 2) {
      n = n.replace(/(시|군|구|도|부|현)$/, '');
    } else if (n.length === 2 && !['도시', '군청', '구청'].includes(n)) {
      n = n.replace(/(시|부|현)$/, '');
    }
    return n.trim();
  }).filter(Boolean);

  // De-duplicate
  const unique = Array.from(new Set(cleaned));
  return unique.join(', ');
}

// Extract season from date string (3-5: 봄, 6-8: 여름, 9-11: 가을, 12-2: 겨울)
export function getSeason(dateStr?: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/[.-](\d{1,2})[.-]?/);
  if (match) {
    const month = parseInt(match[1], 10);
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    if (month === 12 || month === 1 || month === 2) return '겨울';
  }
  return '';
}

// Generate journey message: {장소}에서 {계절} {기간} 동안의 여정
export function generateJourneyMessage(locationStr?: string, dateStr?: string, days?: number): string {
  const cleanLoc = cleanAdministrativeDistricts(locationStr) || '여행지';
  const season = getSeason(dateStr);
  const daysStr = days && days > 0 ? `${days}일` : '';

  if (season && daysStr) {
    return `${cleanLoc}에서 ${season} ${daysStr} 동안의 여정`;
  } else if (daysStr) {
    return `${cleanLoc}에서 ${daysStr} 동안의 여정`;
  } else if (season) {
    return `${cleanLoc}에서 ${season} 여정`;
  }
  return `${cleanLoc}에서의 여정`;
}

export function SummaryView({
  trip,
  timelineData,
  flights,
  stays,
  transits,
  defaultCurrency = 'KRW',
  onSelectTab,
}: SummaryViewProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [expandedStayIds, setExpandedStayIds] = useState<Set<number>>(() => new Set([0]));
  const [expandedFlightIds, setExpandedFlightIds] = useState<Set<number>>(() => new Set([0]));
  const [expandedTransitIds, setExpandedTransitIds] = useState<Set<number>>(() => new Set());
  const [isTransitExpanded, setIsTransitExpanded] = useState(false);
  const [isCostExpanded, setIsCostExpanded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleStay = (idx: number) => {
    setExpandedStayIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleFlight = (idx: number) => {
    setExpandedFlightIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleTransit = (idx: number) => {
    setExpandedTransitIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const areAllExpanded = useMemo(() => {
    const allStays = stays.every((_, i) => expandedStayIds.has(i));
    const allFlights = flights.every((_, i) => expandedFlightIds.has(i));
    const allTransits = transits.length === 0 || (isTransitExpanded && transits.every((_, i) => expandedTransitIds.has(i)));
    return allStays && allFlights && allTransits && isCostExpanded;
  }, [stays, flights, transits, expandedStayIds, expandedFlightIds, expandedTransitIds, isTransitExpanded, isCostExpanded]);

  const handleToggleAll = () => {
    if (areAllExpanded) {
      setExpandedStayIds(new Set());
      setExpandedFlightIds(new Set());
      setExpandedTransitIds(new Set());
      setIsTransitExpanded(false);
      setIsCostExpanded(false);
    } else {
      setExpandedStayIds(new Set(stays.map((_, i) => i)));
      setExpandedFlightIds(new Set(flights.map((_, i) => i)));
      setExpandedTransitIds(new Set(transits.map((_, i) => i)));
      setIsTransitExpanded(true);
      setIsCostExpanded(true);
    }
  };

  const handleCopyAddress = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 1800);
  };

  // Safe date parser helper to prevent browser-specific bugs (e.g. Safari parsing dash format or timezone offset issues)
  const parseDateParts = (dateStr: string, defaultYear?: number): Date | null => {
    if (!dateStr) return null;
    
    const clean = dateStr.trim();
    
    // Match YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
    const match = clean.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    
    // Match YY.MM.DD or YY-MM-DD or YY/MM/DD (2-digit year)
    const match2 = clean.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match2) {
      let year = parseInt(match2[1], 10);
      year += year < 50 ? 2000 : 1900;
      const month = parseInt(match2[2], 10) - 1;
      const day = parseInt(match2[3], 10);
      return new Date(year, month, day);
    }

    // Match MM.DD (no year, e.g. "06.04")
    const matchMD = clean.match(/^(\d{1,2})[-./](\d{1,2})/);
    if (matchMD) {
      const year = defaultYear || new Date().getFullYear();
      const month = parseInt(matchMD[1], 10) - 1;
      const day = parseInt(matchMD[2], 10);
      return new Date(year, month, day);
    }
    
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  // Get day of week string
  const getDayOfWeek = (dateStr: string, defaultYear?: number) => {
    if (!dateStr) return '';
    const date = parseDateParts(dateStr, defaultYear);
    if (!date) return '';
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
  };

  // 1. Parse date and calculate duration with day of week
  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return { start: '', end: '', days: 0, formatted: '' };
    const parts = dateStr.split(/\s*[-—–]\s*/).map(p => p.trim());
    if (parts.length < 2) {
      const day = getDayOfWeek(dateStr);
      const daySuffix = day ? ` (${day})` : '';
      return { start: dateStr, end: dateStr, days: 1, formatted: `${dateStr}${daySuffix}` };
    }
    
    const startDate = parseDateParts(parts[0]);
    const defaultYear = startDate ? startDate.getFullYear() : undefined;
    const endDate = parseDateParts(parts[1], defaultYear);

    const startDay = getDayOfWeek(parts[0], defaultYear);
    const endDay = getDayOfWeek(parts[1], defaultYear);
    const startDaySuffix = startDay ? ` (${startDay})` : '';
    const endDaySuffix = endDay ? ` (${endDay})` : '';
    
    let diffDays = 1;
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    
    return { 
      start: parts[0], 
      end: parts[1], 
      days: diffDays, 
      formatted: `${parts[0]}${startDaySuffix} — ${parts[1]}${endDaySuffix}` 
    };
  };

  const { days: totalDays, formatted: formattedDateRange } = parseDateStr(trip.date);

  const calculateStayNights = (dateRangeStr?: string): number => {
    if (!dateRangeStr) return 1;
    const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());
    if (parts.length >= 2) {
      const d1 = parseDateParts(parts[0]);
      const defaultYear = d1 ? d1.getFullYear() : undefined;
      const d2 = parseDateParts(parts[1], defaultYear);
      if (d1 && d2) {
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return diffDays;
      }
    }
    return 1;
  };

  const getEffectiveTransitType = (t: TransitItem): 'train' | 'bus' | 'taxi' | 'rental' => {
    if (t.transitType === 'car') return 'rental';
    if (t.transitType === 'taxi') return 'taxi';
    if (t.transitType === 'bus') return 'bus';
    if (t.transitType === 'train') return 'train';
    const type = ((t.ticketType || '') + ' ' + (t.title || '')).toLowerCase();
    if (type.includes('car') || type.includes('렌트') || type.includes('rental')) return 'rental';
    if (type.includes('taxi') || type.includes('택시')) return 'taxi';
    if (type.includes('bus') || type.includes('버스')) return 'bus';
    return 'train';
  };

  const transitSummaryStr = useMemo(() => {
    let train = 0, bus = 0, taxi = 0, rental = 0, other = 0;
    transits.forEach(t => {
      const eType = getEffectiveTransitType(t);
      if (eType === 'train') train++;
      else if (eType === 'bus') bus++;
      else if (eType === 'taxi') taxi++;
      else if (eType === 'rental') rental++;
      else other++;
    });
    const parts: string[] = [];
    if (train > 0) parts.push(`train ${train}`);
    if (bus > 0) parts.push(`bus ${bus}`);
    if (taxi > 0) parts.push(`taxi ${taxi}`);
    if (rental > 0) parts.push(`rental ${rental}`);
    if (other > 0 && parts.length === 0) parts.push(`other ${other}`);
    return parts.join(', ') || `${transits.length} passes`;
  }, [transits]);

  // Format destinations dynamically: e.g. "Osaka, Kyoto, Japan" -> "JAPAN (OSAKA, KYOTO)"
  const formatDestinations = (locStr?: string) => {
    if (!locStr) return 'NO DESTINATIONS SPECIFIED';
    
    const countries = [
      'japan', 'korea', 'vietnam', 'taiwan', 'thailand', 'singapore', 'usa', 'france', 'italy', 'uk', 'germany', 'spain', 'china',
      '대한민국', '한국', '일본', '베트남', '대만', '태국', '싱가포르', '미국', '프랑스', '이탈리아', '영국', '독일', '스페인', '중국'
    ];
    
    const parts = locStr.split(',').map(p => p.trim());
    const groups: { country: string; cities: string[] }[] = [];
    let currentCities: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const lowerPart = part.toLowerCase();
      
      if (countries.includes(lowerPart)) {
        groups.push({
          country: part.toUpperCase(),
          cities: currentCities.map(c => c.toUpperCase())
        });
        currentCities = [];
      } else {
        currentCities.push(part);
      }
    }
    
    if (currentCities.length > 0) {
      groups.push({
        country: '',
        cities: currentCities.map(c => c.toUpperCase())
      });
    }
    
    const formattedGroups = groups.map(g => {
      if (g.country) {
        if (g.cities.length > 0) {
          return `${g.country} (${g.cities.join(', ')})`;
        }
        return g.country;
      }
      return g.cities.join(', ');
    });
    
    return formattedGroups.join(' · ');
  };

  // 2. Weather Summary
  const weatherList: { date: string; type: string; temp: string }[] = [];
  if (trip.weatherData) {
    Object.entries(trip.weatherData).forEach(([dt, val]) => {
      if (val && val.type) {
        weatherList.push({
          date: dt,
          type: val.type,
          temp: val.temp || ''
        });
      }
    });
    weatherList.sort((a, b) => a.date.localeCompare(b.date));
  }

  const getWeatherInfo = (type: string) => {
    switch (type) {
      case 'sunny': return { label: 'Sunny', icon: '☀️' };
      case 'cloudy': return { label: 'Cloudy', icon: '☁️' };
      case 'overcast': return { label: 'Overcast', icon: '⛅' };
      case 'rainy': return { label: 'Rainy', icon: '🌧️' };
      case 'snowy': return { label: 'Snowy', icon: '❄️' };
      case 'stormy': return { label: 'Stormy', icon: '⛈️' };
      default: return { label: type, icon: '🌤️' };
    }
  };

  // 3. Estimate Budget / Costs
  const parseCost = (costStr: string | undefined): number => {
    if (!costStr) return 0;
    const clean = costStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const budgetSummary: { [currency: string]: number } = {};
  let totalInBaseCurrency = 0;

  const addCost = (costVal: string | undefined, currencyVal: string | undefined) => {
    if (!costVal || costVal === '-' || costVal.trim() === '') return;
    const cost = parseCost(costVal);
    if (cost <= 0) return;
    const curr = (currencyVal || defaultCurrency).toUpperCase();
    
    budgetSummary[curr] = (budgetSummary[curr] || 0) + cost;

    const rate = EXCHANGE_RATES[curr] || 1;
    // SettlementView의 parseCostToKRW와 완전히 일치하도록 아이템별 Math.round 환전 처리
    totalInBaseCurrency += Math.round(cost * rate);
  };

  stays.forEach(s => addCost(s.cost, s.currency || defaultCurrency));
  flights.forEach(f => addCost(f.cost, f.currency || defaultCurrency));
  transits.forEach(t => addCost(t.cost, t.currency || defaultCurrency));
  if (trip.customExpenses) {
    trip.customExpenses.forEach(c => addCost(c.cost, c.currency));
  }
  Object.values(timelineData).forEach(items => {
    (items || []).forEach(item => {
      addCost(item.cost, item.currency);
    });
  });

  useEffect(() => {
    if (!capturedImg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCapturedImg(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capturedImg]);

  const handleCapture = async () => {
    setIsCapturing(true);

    // Backup current states
    const prevStays = new Set(expandedStayIds);
    const prevFlights = new Set(expandedFlightIds);
    const prevTransits = new Set(expandedTransitIds);
    const prevTransitExp = isTransitExpanded;
    const prevCostExp = isCostExpanded;

    // Temporarily expand all for complete receipt capture
    setExpandedStayIds(new Set(stays.map((_, i) => i)));
    setExpandedFlightIds(new Set(flights.map((_, i) => i)));
    setExpandedTransitIds(new Set(transits.map((_, i) => i)));
    setIsTransitExpanded(true);
    setIsCostExpanded(true);

    setTimeout(async () => {
      if (printRef.current) {
        try {
          const isDark = document.documentElement.classList.contains('dark');
          const el = printRef.current;
          const origMaxWidth = el.style.maxWidth;
          const origWidth = el.style.width;

          // Temporarily fix width to 480px for consistent long receipt proportions
          el.style.maxWidth = '480px';
          el.style.width = '480px';

          const canvas = await html2canvas(el, {
            useCORS: true,
            backgroundColor: isDark ? '#0A0A0A' : '#ffffff',
            scale: 2,
            windowWidth: 480,
            ignoreElements: (element) => element.id === 'capture-exclude-btn' || element.id === 'toggle-all-exclude-btn',
          });

          el.style.maxWidth = origMaxWidth;
          el.style.width = origWidth;

          const imgData = canvas.toDataURL('image/png');
          setCapturedImg(imgData);
        } catch (err) {
          console.error('Summary capture failed:', err);
          alert('이미지 생성에 실패했습니다.');
        } finally {
          setIsCapturing(false);
          // Restore previous expansion states
          setExpandedStayIds(prevStays);
          setExpandedFlightIds(prevFlights);
          setExpandedTransitIds(prevTransits);
          setIsTransitExpanded(prevTransitExp);
          setIsCostExpanded(prevCostExp);
        }
      } else {
        setIsCapturing(false);
      }
    }, 200);
  };

  const handleSaveImage = () => {
    if (!capturedImg) return;
    const link = document.createElement('a');
    link.href = capturedImg;
    link.download = `${trip.title || 'trip'}_여정요약.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async () => {
    if (!capturedImg) return;
    try {
      const response = await fetch(capturedImg);
      const blob = await response.blob();
      const file = new File([blob], `${trip.title || 'trip'}_여정요약.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${trip.title || '여행'} 여정 요약`,
          text: '여정 요약 결과 내역입니다.',
        });
      } else {
        alert('이 브라우저에서는 공유 기능을 지원하지 않습니다. 이미지 다운로드를 이용해 주세요.');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const recordedSpotsCount = Object.values(timelineData).flat().length;

  return (
    <div className="w-full flex flex-col text-left text-black dark:text-white bg-white dark:bg-[#0A0A0A] animate-in fade-in duration-300">
      
      {/* Full-bleed Minimal Editorial Canvas */}
      <div 
        ref={printRef}
        className="w-full max-w-4xl mx-auto flex-grow p-5 sm:p-8 md:p-12 flex flex-col gap-8 text-black dark:text-white font-sans relative bg-white dark:bg-[#0A0A0A]"
      >
        {/* 1. Masthead & Inverted Tag Pill */}
        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-xs text-[10px] font-black uppercase tracking-widest font-mono">
            <span>MEMORANDUM OF TRAVEL</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-sans uppercase tracking-tight leading-[1.05] text-black dark:text-white mt-1">
            {trip.title ? trip.title.replace(' (Plan)', '') : 'UNTITLED JOURNEY'}
          </h1>

          <p className="text-sm sm:text-base text-black/80 dark:text-white/80 font-medium leading-relaxed max-w-2xl font-sans mt-0.5">
            {generateJourneyMessage(trip.locationStr, trip.date, totalDays)}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-4 border-t border-black/15 dark:border-white/15">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-black/60 dark:text-white/60 flex-wrap">
              <span>{formattedDateRange}</span>
              <span>·</span>
              <span className="text-black dark:text-white font-black">{totalDays} DAYS</span>
              <span>·</span>
              <span className="text-black/80 dark:text-white/80">{formatDestinations(trip.locationStr)}</span>
            </div>

            {!isCapturing && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="toggle-all-exclude-btn"
                  onClick={handleToggleAll}
                  className="p-1 sm:p-1.5 border border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center text-black dark:text-white"
                  title={areAllExpanded ? "전체 접기 (Collapse All)" : "전체 펼치기 (Expand All)"}
                >
                  {areAllExpanded ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  id="capture-exclude-btn"
                  onClick={handleCapture}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:opacity-60 transition-opacity cursor-pointer active:scale-95 shrink-0"
                >
                  <span className="w-4 h-4 rounded-xs bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                    <ArrowDownRight className="w-3 h-3" />
                  </span>
                  <span>EXPORT SUMMARY</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Giant Typographic Metrics Grid (Inter Font, Consistent Size & Weight) */}
        <div className="py-6 border-y border-black dark:border-white grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 sm:gap-6 w-full font-sans">
          {/* Metric 1: Total Days */}
          <div className="flex items-baseline gap-1.5 sm:gap-2.5 min-w-0 flex-nowrap">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {totalDays < 10 ? `0${totalDays}` : totalDays}
            </span>
            <span className="text-xs sm:text-sm font-bold font-sans text-black/60 dark:text-white/60 lowercase shrink-0">
              days
            </span>
          </div>

          {/* Metric 2: Recorded Spots */}
          <div className="flex items-baseline gap-1.5 sm:gap-2.5 min-w-0 flex-nowrap">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {recordedSpotsCount < 10 ? `0${recordedSpotsCount}` : recordedSpotsCount}
            </span>
            <span className="text-xs sm:text-sm font-bold font-sans text-black/60 dark:text-white/60 lowercase shrink-0">
              spots
            </span>
          </div>

          {/* Metric 3: Flight Legs */}
          <div className="flex items-baseline gap-1.5 sm:gap-2.5 min-w-0 flex-nowrap">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {flights.length < 10 ? `0${flights.length}` : flights.length}
            </span>
            <span className="text-xs sm:text-sm font-bold font-sans text-black/60 dark:text-white/60 lowercase shrink-0">
              flights
            </span>
          </div>

          {/* Metric 4: Total Estimated Budget ('240,-' European/Swiss editorial format) */}
          <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0 flex-nowrap">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {Math.round(totalInBaseCurrency / 1000).toLocaleString()},-
            </span>
            <span className="text-xs sm:text-sm font-bold font-sans text-black/60 dark:text-white/60 lowercase shrink-0">
              cost
            </span>
          </div>
        </div>

        {/* 3. Stays: Full-Width Hairline Accordion List */}
        <div className="flex flex-col font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-black dark:border-white">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('stays')}
              className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest text-black dark:text-white font-sans hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer group"
              title="숙박 탭으로 이동"
            >
              <span>STAYS</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-red-600 dark:text-red-400" />
            </button>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50">{stays.length} PROPERTIES</span>
          </div>

          <div className="divide-y divide-black/15 dark:divide-white/15">
            {stays.length > 0 ? (
              stays.map((s, idx) => {
                const isOpen = expandedStayIds.has(idx);
                const isDefaultMemo = !s.memo || s.memo.trim() === '' || s.memo.includes('일정을 입력') || s.memo.includes('메모를 입력');
                const nights = calculateStayNights(s.dateRange);
                return (
                  <div key={idx} className="py-3.5 transition-colors">
                    <div 
                      onClick={() => toggleStay(idx)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <span className="font-bold text-sm sm:text-base text-black dark:text-white font-sans group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {s.title}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-black/60 dark:text-white/60">
                          {nights} {nights === 1 ? 'NIGHT' : 'NIGHTS'}
                        </span>
                        <span className="text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition-transform duration-200">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pt-2 pb-1 flex flex-col gap-1.5 text-xs sm:text-[13px] text-black/75 dark:text-white/75 animate-in fade-in duration-150">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-black/80 dark:text-white/80">
                          <span className="font-bold">{s.dateRange || 'DATES TBD'}</span>
                          {s.confNo && <span className="text-red-600 dark:text-red-400 font-bold font-mono"># {s.confNo}</span>}
                          {s.address && (
                            <div className="inline-flex items-start gap-1.5 bg-black/5 dark:bg-white/5 px-2 py-1 border border-black/10 dark:border-white/10 text-xs font-sans rounded-none w-full">
                              <span className="break-all whitespace-normal font-medium flex-1">{s.address}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyAddress(e, s.address)}
                                className="p-0.5 hover:text-red-600 dark:hover:text-red-400 text-black/50 dark:text-white/50 transition-colors cursor-pointer shrink-0 mt-0.5"
                                title="주소 복사"
                              >
                                {copiedAddress === s.address ? (
                                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                    <Check className="w-3 h-3" /> COPIED
                                  </span>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                        {!isDefaultMemo && (
                          <p className="text-black/60 dark:text-white/60 font-sans leading-relaxed pt-1 text-xs">
                            {s.memo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-xs italic text-black/40 dark:text-white/40">등록된 숙소 정보가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 4. Flights: Hairline Boarding Rows */}
        <div className="flex flex-col font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-black dark:border-white">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('flights')}
              className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest text-black dark:text-white font-sans hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer group"
              title="항공 탭으로 이동"
            >
              <span>FLIGHTS</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-red-600 dark:text-red-400" />
            </button>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50">{flights.length} SEGMENTS</span>
          </div>

          <div className="divide-y divide-black/15 dark:divide-white/15">
            {flights.length > 0 ? (
              flights.map((f, idx) => {
                const isOpen = expandedFlightIds.has(idx);
                return (
                  <div key={idx} className="py-3.5 transition-colors">
                    <div 
                      onClick={() => toggleFlight(idx)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base sm:text-lg font-black font-sans tracking-tight text-black dark:text-white">
                          {f.fromCode || 'DEP'} ➔ {f.toCode || 'ARR'}
                        </span>
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 rounded-xs">
                          {f.flightNo || 'FLIGHT'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-black/60 dark:text-white/60">
                          {f.date}
                        </span>
                        <span className="text-black/50 dark:text-white/50">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pt-3 pb-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono animate-in fade-in duration-150">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block">Departure</span>
                          <span className="font-bold text-black dark:text-white">{f.fromCode} {f.fromTime || ''}</span>
                          {f.fromTerminal && <span className="text-[10px] text-black/60 dark:text-white/60 block">Terminal {f.fromTerminal}</span>}
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block">Arrival</span>
                          <span className="font-bold text-black dark:text-white">{f.toCode} {f.toTime || ''}</span>
                          {f.toTerminal && <span className="text-[10px] text-black/60 dark:text-white/60 block">Terminal {f.toTerminal}</span>}
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block">Seat</span>
                          <span className="font-bold text-black dark:text-white">{f.seat || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block">Booking PNR</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{f.pnr || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-xs italic text-black/40 dark:text-white/40">등록된 항공 정보가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 5. Transit & Transfers: Hairline Accordion List */}
        {transits.length > 0 && (
          <div className="flex flex-col font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-black dark:border-white">
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('transit')}
                className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest text-black dark:text-white font-sans hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer group"
                title="교통 탭으로 이동"
              >
                <span>TRANSIT</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-red-600 dark:text-red-400" />
              </button>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50">{transits.length} PASSES</span>
            </div>

            {/* Collapsed 1-line summary toggle */}
            <div 
              onClick={() => setIsTransitExpanded(v => !v)}
              className="py-3 px-1 flex items-center justify-between cursor-pointer select-none group border-b border-black/15 dark:border-white/15"
            >
              <span className="text-xs sm:text-sm font-sans font-bold text-black/90 dark:text-white/90 uppercase tracking-wider group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {transitSummaryStr}
              </span>
              <span className="text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition-transform duration-200">
                {isTransitExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </div>

            {isTransitExpanded && (
              <div className="divide-y divide-black/15 dark:divide-white/15 animate-in fade-in duration-150 pl-1">
                {transits.map((t, idx) => {
                  const isOpen = expandedTransitIds.has(idx);
                  const eType = getEffectiveTransitType(t);
                  const isCar = eType === 'rental';

                  return (
                    <div key={idx} className="py-3 transition-colors">
                      <div 
                        onClick={() => toggleTransit(idx)}
                        className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 rounded-xs uppercase">
                            {eType.toUpperCase()}
                          </span>
                          <span className="font-bold text-sm text-black dark:text-white font-sans uppercase">
                            {t.title || (isCar ? 'RENTAL CAR' : t.ticketType)}
                          </span>
                          {t.route && (
                            <span className="text-xs text-black/60 dark:text-white/60 font-sans font-medium">
                              {t.route}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-black/60 dark:text-white/60">
                            {isCar && t.rentalDropoffDate ? `${t.date} ~ ${t.rentalDropoffDate}` : t.date}
                          </span>
                          <span className="text-black/50 dark:text-white/50">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="pt-3 pb-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono animate-in fade-in duration-150 border-t border-black/5 dark:border-white/5 mt-2">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                              {isCar ? 'PICKUP / 픽업' : 'ROUTE / 경로'}
                            </span>
                            <span className="font-bold text-black dark:text-white">
                              {t.departPlace && t.arrivePlace ? `${t.departPlace} → ${t.arrivePlace}` : (t.route || '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                              {isCar ? 'PERIOD / 대여기간' : 'TIME / 시간'}
                            </span>
                            <span className="font-bold text-black dark:text-white">
                              {isCar && t.rentalDropoffDate ? `${t.time || ''} ~ ${t.rentalDropoffTime || ''}` : (t.time || '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">
                              {isCar ? 'VEHICLE / 차량' : 'SEAT / 좌석'}
                            </span>
                            <span className="font-bold text-black dark:text-white">
                              {isCar ? (t.carModel || t.carNumber || '—') : (t.seat || '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">CONFIRMATION / 예약번호</span>
                            <span className="font-bold text-red-600 dark:text-red-400">{t.bookingRef || '—'}</span>
                          </div>
                          {t.memo && (
                            <div className="col-span-2 sm:col-span-4 pt-1">
                              <span className="text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40 block font-sans font-bold">MEMO / 메모</span>
                              <p className="text-black/80 dark:text-white/80 whitespace-pre-wrap font-sans">{t.memo}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. Estimated Budget & Settlement Summary */}
        <div className="flex flex-col pt-4 border-t border-black dark:border-white font-sans">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black dark:border-white">
            <button
              type="button"
              onClick={() => onSelectTab && onSelectTab('settlement')}
              className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest text-black dark:text-white font-sans hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer group"
              title="비용/정산 탭으로 이동"
            >
              <span>COST</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-red-600 dark:text-red-400" />
            </button>
            <div 
              onClick={() => setIsCostExpanded(v => !v)}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <span className="text-xs sm:text-sm font-mono font-bold text-black/80 dark:text-white/80">
                ₩{Math.round(totalInBaseCurrency).toLocaleString()}
              </span>
              <span className="text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition-transform duration-200">
                {isCostExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </div>
          </div>

          {isCostExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 animate-in fade-in duration-150">
              {/* By Currency Ledger */}
              <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10 font-sans text-xs">
                {Object.keys(budgetSummary).length > 0 ? (
                  Object.entries(budgetSummary).map(([curr, amt]) => (
                    <div key={curr} className="py-2.5 flex justify-between items-center">
                      <span className="text-black/60 dark:text-white/60 font-medium">{curr}</span>
                      <span className="font-bold text-black dark:text-white font-sans">
                        {CURRENCY_SYMBOLS[curr] || curr} {amt.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 italic text-black/40 dark:text-white/40">등록된 지출 내역 없음</div>
                )}
              </div>

              {/* Total Converted (Point Clean Accent Box) */}
              <div className="p-4 sm:p-5 border border-black/15 dark:border-white/15 flex flex-col justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest font-sans text-black/60 dark:text-white/60">
                    TOTAL ESTIMATED
                  </span>
                  <span className="text-[9px] font-sans text-black/40 dark:text-white/40 uppercase font-bold">
                    KRW BASE
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-sans text-black dark:text-white leading-none">
                  ₩{Math.round(totalInBaseCurrency).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Share / Download Modal (Rendered in Portal) */}
      {capturedImg && createPortal(
        <div 
          onClick={() => setCapturedImg(null)}
          className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0E0E] max-w-2xl lg:max-w-3xl w-full h-[92vh] max-h-[94vh] flex flex-col shadow-2xl text-left border border-black/20 dark:border-white/20 animate-in zoom-in-95 duration-150 rounded-none overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-black dark:text-white font-sans">
                MEMORANDUM SUMMARY
              </span>
              <button 
                onClick={() => setCapturedImg(null)} 
                className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white p-1 transition-colors cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Edge-to-Edge Scrollable Long Receipt Container */}
            <div className="flex-1 p-3 sm:p-6 overflow-y-auto bg-neutral-100 dark:bg-black/70 flex items-start justify-center border-b border-black/15 dark:border-white/15">
              <img 
                src={capturedImg} 
                alt="여정 요약 영수증" 
                className="w-full max-w-[440px] sm:max-w-[480px] h-auto object-contain shadow-2xl border border-black/10 dark:border-white/10 my-auto" 
              />
            </div>
            
            {/* Action Buttons: ONLY SAVE & SHARE, Inter Bold Minimalist */}
            <div className="flex items-stretch divide-x divide-black/15 dark:divide-white/15 bg-white dark:bg-[#0E0E0E] shrink-0">
              <button
                onClick={handleSaveImage}
                className="flex-1 py-3.5 sm:py-4 bg-black text-white dark:bg-white dark:text-black text-xs sm:text-sm font-black uppercase tracking-widest font-sans hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer rounded-none"
              >
                <Download className="w-4 h-4" />
                <span>SAVE</span>
              </button>
              <button
                onClick={handleShareImage}
                className="flex-1 py-3.5 sm:py-4 bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 text-xs sm:text-sm font-black uppercase tracking-widest font-sans transition-colors flex items-center justify-center gap-2 cursor-pointer rounded-none"
              >
                <Share2 className="w-4 h-4" />
                <span>SHARE</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
