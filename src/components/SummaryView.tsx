import React, { useState, useRef } from 'react';
import { 
  FileText, Share2, Download, X, Calendar, MapPin, 
  Bed, Plane, Train, Landmark, ChevronDown, ChevronUp, ArrowDownRight, ArrowRight
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
  const [expandedStayId, setExpandedStayId] = useState<number | null>(0);
  const [expandedFlightId, setExpandedFlightId] = useState<number | null>(0);
  const [expandedTransitId, setExpandedTransitId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

  const handleCapture = async () => {
    setIsCapturing(true);
    setTimeout(async () => {
      if (printRef.current) {
        try {
          const canvas = await html2canvas(printRef.current, {
            useCORS: true,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#121212' : '#ffffff',
            scale: 2,
            ignoreElements: (element) => element.id === 'capture-exclude-btn',
          });
          const imgData = canvas.toDataURL('image/png');
          setCapturedImg(imgData);
        } catch (err) {
          console.error('Summary capture failed:', err);
          alert('이미지 생성에 실패했습니다.');
        } finally {
          setIsCapturing(false);
        }
      }
    }, 150);
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
            {trip.locationStr ? formatDestinations(trip.locationStr) : '여행지'}를 {totalDays}일 동안 기록한 여행 메모입니다.
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
            )}
          </div>
        </div>

        {/* 2. Giant Typographic Metrics Grid (Inter Font, Consistent Size & Weight) */}
        <div className="py-6 border-y border-black dark:border-white grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 sm:gap-6 w-full font-sans">
          {/* Metric 1: Total Days */}
          <div className="flex items-baseline gap-2 sm:gap-2.5 min-w-0">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {totalDays < 10 ? `0${totalDays}` : totalDays}
            </span>
            <div className="flex flex-col text-left font-sans font-bold text-xs sm:text-sm leading-tight text-black/70 dark:text-white/70 min-w-0">
              <span>Total</span>
              <span>Days</span>
            </div>
          </div>

          {/* Metric 2: Recorded Spots */}
          <div className="flex items-baseline gap-2 sm:gap-2.5 min-w-0">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {recordedSpotsCount < 10 ? `0${recordedSpotsCount}` : recordedSpotsCount}
            </span>
            <div className="flex flex-col text-left font-sans font-bold text-xs sm:text-sm leading-tight text-black/70 dark:text-white/70 min-w-0">
              <span>Recorded</span>
              <span>Spots</span>
            </div>
          </div>

          {/* Metric 3: Flight Legs */}
          <div className="flex items-baseline gap-2 sm:gap-2.5 min-w-0">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              {flights.length < 10 ? `0${flights.length}` : flights.length}
            </span>
            <div className="flex flex-col text-left font-sans font-bold text-xs sm:text-sm leading-tight text-black/70 dark:text-white/70 min-w-0">
              <span>Flight</span>
              <span>Legs</span>
            </div>
          </div>

          {/* Metric 4: Total Estimated Budget (Inter font, identical size & weight) */}
          <div className="flex items-baseline gap-2 sm:gap-2.5 min-w-0">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tighter text-black dark:text-white leading-none shrink-0">
              ₩{totalInBaseCurrency >= 1000000 ? `${(totalInBaseCurrency / 1000000).toFixed(1)}M` : totalInBaseCurrency >= 10000 ? `${Math.round(totalInBaseCurrency / 10000)}만` : totalInBaseCurrency.toLocaleString()}
            </span>
            <div className="flex flex-col text-left font-sans font-bold text-xs sm:text-sm leading-tight text-black/70 dark:text-white/70 min-w-0">
              <span>Estimated</span>
              <span>Budget</span>
            </div>
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
                const isOpen = expandedStayId === idx;
                const isDefaultMemo = !s.memo || s.memo.trim() === '' || s.memo.includes('일정을 입력') || s.memo.includes('메모를 입력');
                return (
                  <div key={idx} className="py-3.5 transition-colors">
                    <div 
                      onClick={() => setExpandedStayId(isOpen ? null : idx)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <span className="font-bold text-sm sm:text-base text-black dark:text-white font-sans group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {s.title}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        {s.cost && (
                          <span className="text-xs font-mono font-bold text-black/70 dark:text-white/70">
                            {CURRENCY_SYMBOLS[s.currency || 'KRW'] || s.currency} {parseCost(s.cost).toLocaleString()}
                          </span>
                        )}
                        <span className="text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition-transform duration-200">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="pt-2 pb-1 flex flex-col gap-1.5 text-xs text-black/70 dark:text-white/70 animate-in fade-in duration-150">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                          <span>🗓 {s.dateRange || 'DATES TBD'}</span>
                          {s.confNo && <span className="text-red-600 dark:text-red-400 font-bold"># {s.confNo}</span>}
                          {s.address && <span>📍 {s.address}</span>}
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
                const isOpen = expandedFlightId === idx;
                return (
                  <div key={idx} className="py-3.5 transition-colors">
                    <div 
                      onClick={() => setExpandedFlightId(isOpen ? null : idx)}
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

            <div className="divide-y divide-black/15 dark:divide-white/15">
              {transits.map((t, idx) => {
                const isOpen = expandedTransitId === idx;
                return (
                  <div key={idx} className="py-3 transition-colors">
                    <div 
                      onClick={() => setExpandedTransitId(isOpen ? null : idx)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-black dark:text-white font-sans">
                          {t.title || t.ticketType}
                        </span>
                        {t.route && (
                          <span className="text-xs text-black/50 dark:text-white/50 font-mono">
                            {t.route}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-black/60 dark:text-white/60">
                          {t.date}
                        </span>
                        <span className="text-black/50 dark:text-white/50">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <span className="text-[10px] sm:text-xs font-mono font-bold text-black/50 dark:text-white/50">CURRENCY BREAKDOWN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
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
        </div>
      </div>

      {/* Image Share / Download Modal (Rendered in Portal) */}
      {capturedImg && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-lg max-w-2xl w-full flex flex-col gap-4 shadow-xl text-left border border-black/10 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-2.5 border-black/5 dark:border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                여정 요약 이미지 저장 및 공유
              </span>
              <button onClick={() => setCapturedImg(null)} className="text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white p-1 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="border border-black/10 dark:border-white/10 rounded-sm overflow-hidden max-h-[75vh] overflow-y-auto bg-black/5 dark:bg-black/40 flex justify-center p-2">
              <img src={capturedImg} alt="여정 요약 결과" className="max-w-full h-auto object-contain max-h-[70vh] shadow-md bg-white" />
            </div>
            
            <p className="text-[9px] text-black/50 dark:text-white/50 text-center leading-relaxed">
              💡 모바일 기기(카카오톡 등)에서는 이미지를 길게 누르면 저장하거나 공유할 수 있습니다.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveImage}
                className="flex-1 bg-black text-white dark:bg-white dark:text-black py-2.5 rounded-sm text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                저장 (다운로드)
              </button>
              {typeof navigator.share !== 'undefined' && (
                <button
                  onClick={handleShareImage}
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-sm text-xs font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  보내기 (공유)
                </button>
              )}
              <button
                onClick={() => setCapturedImg(null)}
                className="flex-1 border border-black/20 dark:border-white/20 py-2.5 rounded-sm text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
