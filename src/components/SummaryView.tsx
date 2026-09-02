import React, { useState, useRef } from 'react';
import { 
  FileText, Share2, Download, X, Calendar, MapPin, 
  Bed, Plane, Train, Landmark
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
}

export function SummaryView({
  trip,
  timelineData,
  flights,
  stays,
  transits,
  defaultCurrency = 'KRW'
}: SummaryViewProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
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

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto overflow-x-hidden text-left text-black dark:text-white bg-[#F9F8F6] dark:bg-[#111111] animate-in fade-in duration-300">
      
      {/* Full-bleed Editorial Canvas */}
      <div 
        ref={printRef}
        className="w-full flex-grow p-4 sm:p-6 md:p-8 flex flex-col gap-7 text-black dark:text-white font-sans relative"
      >
        {/* 1. Header Masthead */}
        <div className="flex flex-col gap-3 pb-6 border-b border-black/15 dark:border-white/15">
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-500 mb-1 flex items-center gap-1.5 font-mono">
              <FileText className="w-3.5 h-3.5" />
              MEMORANDUM OF TRAVEL · EXECUTIVE SUMMARY
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-satoshi uppercase tracking-tight leading-tight break-words">
              {trip.title ? trip.title.replace(' (Plan)', '') : 'MY TRIP'}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-bold text-black/70 dark:text-white/70">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-black/50 dark:text-white/50" /> {formattedDateRange}</span>
              <span>·</span>
              <span className="text-black dark:text-white font-black">{totalDays} DAYS</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-black"><MapPin className="w-3.5 h-3.5" /> {formatDestinations(trip.locationStr)}</span>
            </div>

            {!isCapturing && (
              <button
                id="capture-exclude-btn"
                onClick={handleCapture}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[9.5px] font-black uppercase tracking-widest rounded-md transition-all shadow-sm w-fit cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>EXPORT SUMMARY</span>
              </button>
            )}
          </div>

          {/* Inline Weather Strip */}
          {weatherList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {weatherList.map((w, idx) => {
                const info = getWeatherInfo(w.type);
                const day = getDayOfWeek(w.date);
                const dateLabel = `${w.date.replace(/^\d{4}\./, '')}${day ? ` (${day})` : ''}`;
                return (
                  <div key={idx} title={`${dateLabel} · ${info.label}${w.temp ? ' ' + w.temp : ''}`} className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 px-2 py-1 rounded-md">
                    <span className="text-xs leading-none">{info.icon}</span>
                    <span className="text-[9px] font-bold text-black/60 dark:text-white/60">{dateLabel}</span>
                    {w.temp && <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 font-mono">{w.temp}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Key Highlights Stats Grid (2 col on mobile, 4 col on desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
          <div className="p-3.5 sm:p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">DURATION</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-satoshi text-black dark:text-white leading-none">{totalDays}</span>
              <span className="text-xs font-bold text-black/50 dark:text-white/50 uppercase">DAYS</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">ACCOMMODATIONS</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-satoshi text-black dark:text-white leading-none">{stays.length}</span>
              <span className="text-xs font-bold text-black/50 dark:text-white/50 uppercase">PROPERTIES</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">FLIGHTS</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-satoshi text-black dark:text-white leading-none">{flights.length}</span>
              <span className="text-xs font-bold text-black/50 dark:text-white/50 uppercase">LEGS</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">ESTIMATED EXPENSE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-500 leading-none">
                ₩ {Math.round(totalInBaseCurrency).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Accommodations Section */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 font-satoshi">
              <Bed className="w-4 h-4 text-amber-600 dark:text-amber-500" /> ACCOMMODATIONS
            </span>
            <span className="text-[10px] font-mono text-black/40 dark:text-white/40">{stays.length} STAYS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stays.length > 0 ? (
              stays.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-black text-sm text-black dark:text-white font-satoshi leading-tight">{s.title}</span>
                    {s.cost && (
                      <span className="text-[9.5px] font-mono font-bold bg-amber-600/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-sm shrink-0">
                        {CURRENCY_SYMBOLS[s.currency || 'KRW'] || s.currency} {parseCost(s.cost).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/60 dark:text-white/60 font-medium">
                    <span>🕒 {s.dateRange || '날짜 미지정'}</span>
                    {s.confNo && <span className="font-mono text-black/40 dark:text-white/40">#{s.confNo}</span>}
                  </div>
                  {s.address && (
                    <div className="text-[10px] text-black/70 dark:text-white/70 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-black/40 dark:text-white/40 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                  {s.memo && (
                    <p className="text-[10px] text-black/55 dark:text-white/55 italic pl-2 border-l border-black/15 dark:border-white/15 mt-0.5 leading-relaxed">
                      {s.memo}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <span className="text-black/30 dark:text-white/30 italic text-xs col-span-2 py-2">등록된 숙소 정보가 없습니다.</span>
            )}
          </div>
        </div>

        {/* 4. Flights Section */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 font-satoshi">
              <Plane className="w-4 h-4 text-amber-600 dark:text-amber-500" /> FLIGHT DETAILS
            </span>
            <span className="text-[10px] font-mono text-black/40 dark:text-white/40">{flights.length} FLIGHTS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {flights.length > 0 ? (
              flights.map((f, idx) => (
                <div key={idx} className="border border-black/10 dark:border-white/10 rounded-xl p-3.5 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2.5">
                  <div className="flex justify-between items-center border-b border-dashed border-black/10 dark:border-white/10 pb-2">
                    <span className="font-black text-xs text-amber-600 dark:text-amber-500 uppercase tracking-widest font-mono">{f.flightNo || 'FLIGHT'}</span>
                    <span className="text-[10px] font-bold text-black/60 dark:text-white/60">{f.date}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[8px] text-black/40 dark:text-white/40 block uppercase font-bold tracking-wider mb-0.5">DEP</span>
                      <span className="font-black text-black dark:text-white text-xs font-mono">{f.fromCode}</span>
                      {f.fromTerminal && <span className="text-[8.5px] text-black/50 dark:text-white/50 block font-bold">T.{f.fromTerminal}</span>}
                      {f.fromTime && <span className="text-[9.5px] text-black/60 dark:text-white/60 block font-mono mt-0.5">{f.fromTime}</span>}
                    </div>
                    <div>
                      <span className="text-[8px] text-black/40 dark:text-white/40 block uppercase font-bold tracking-wider mb-0.5">ARR</span>
                      <span className="font-black text-black dark:text-white text-xs font-mono">{f.toCode}</span>
                      {f.toTerminal && <span className="text-[8.5px] text-black/50 dark:text-white/50 block font-bold">T.{f.toTerminal}</span>}
                      {f.toTime && <span className="text-[9.5px] text-black/60 dark:text-white/60 block font-mono mt-0.5">{f.toTime}</span>}
                    </div>
                    <div>
                      <span className="text-[8px] text-black/40 dark:text-white/40 block uppercase font-bold tracking-wider mb-0.5">SEAT</span>
                      <span className="font-mono font-black text-black/80 dark:text-white/80 text-[11px] uppercase">{f.seat || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-black/40 dark:text-white/40 block uppercase font-bold tracking-wider mb-0.5">PNR</span>
                      <span className="font-mono font-black text-black/80 dark:text-white/80 text-[11px] uppercase">{f.pnr || '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-black/30 dark:text-white/30 italic text-xs col-span-2 py-2">등록된 항공 정보가 없습니다.</span>
            )}
          </div>
        </div>

        {/* 5. Transit Section */}
        {transits.length > 0 && (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 font-satoshi">
                <Train className="w-4 h-4 text-amber-600 dark:text-amber-500" /> TRANSIT & TRANSFERS
              </span>
              <span className="text-[10px] font-mono text-black/40 dark:text-white/40">{transits.length} TRIPS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {transits.map((t, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex justify-between items-center gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-black text-xs text-black dark:text-white truncate font-satoshi">{t.title || t.ticketType}</span>
                    <span className="text-[10px] text-black/55 dark:text-white/55 truncate mt-0.5">{t.route}</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md shrink-0">
                    {t.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Budget Breakdown Section */}
        <div className="flex flex-col gap-3 pt-2 border-t border-black/15 dark:border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 font-satoshi">
              <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-500" /> BUDGET & SETTLEMENT SUMMARY
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Currency Breakdown */}
            <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">BY CURRENCY</span>
              <div className="flex flex-col gap-1.5 text-xs font-mono">
                {Object.keys(budgetSummary).length > 0 ? (
                  Object.entries(budgetSummary).map(([curr, amt]) => (
                    <div key={curr} className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1">
                      <span className="text-black/60 dark:text-white/60">• {curr}</span>
                      <span className="font-black text-black dark:text-white">
                        {CURRENCY_SYMBOLS[curr] || curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-black/30 dark:text-white/30 italic text-xs py-1">등록된 지출 내역 없음</div>
                )}
              </div>
            </div>

            {/* Total Converted (KRW Standard) */}
            <div className="p-4 rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-amber-500/5 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">TOTAL CONVERTED (KRW BASE)</span>
                <span className="text-[8px] font-mono text-black/40 dark:text-white/40">EX.RATES STANDARD</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-500 leading-none">
                ₩ {Math.round(totalInBaseCurrency).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 7. Footer Editorial Masthead */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-[9px] font-mono text-black/40 dark:text-white/40">
          <span className="font-black tracking-[0.2em]">TRIP GON LOG · AUTONOMOUS RECORD</span>
          <span>v0.6c</span>
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
