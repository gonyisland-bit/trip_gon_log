import React, { useState, useRef } from 'react';
import { 
  FileText, Share2, Download, X, Calendar, MapPin, 
  CloudSun, Bed, Plane, Train, Landmark, Coins
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
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  KRW: '₩', USD: '$', JPY: '¥', EUR: '€', CNY: '¥',
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

  // Get day of week string
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim().replace(/\./g, '-');
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  // 1. Parse date and calculate duration with day of week
  const parseDateStr = (dateStr: string) => {
    if (!dateStr) return { start: '', end: '', days: 0, formatted: '' };
    const parts = dateStr.split('—').map(p => p.trim());
    if (parts.length < 2) {
      const day = getDayOfWeek(dateStr);
      const daySuffix = day ? ` (${day})` : '';
      return { start: dateStr, end: dateStr, days: 1, formatted: `${dateStr}${daySuffix}` };
    }
    
    const startDay = getDayOfWeek(parts[0]);
    const endDay = getDayOfWeek(parts[1]);
    const startDaySuffix = startDay ? ` (${startDay})` : '';
    const endDaySuffix = endDay ? ` (${endDay})` : '';

    const startStr = parts[0].replace(/\./g, '-');
    const endStr = parts[1].replace(/\./g, '-');
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    let diffDays = 1;
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
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

  // Format destinations as a single bold line: COUNTRY, CITY · COUNTRY, CITY
  const formatDestinations = (locStr?: string) => {
    if (!locStr) return 'NO DESTINATIONS SPECIFIED';
    const parts = locStr.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const pairs: string[] = [];
      for (let i = 0; i < parts.length; i += 2) {
        const city = parts[i];
        const country = parts[i + 1];
        if (country) {
          pairs.push(`${country.toUpperCase()}, ${city.toUpperCase()}`);
        } else {
          pairs.push(city.toUpperCase());
        }
      }
      return pairs.join(' · ');
    }
    return locStr.toUpperCase();
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
    const cost = parseCost(costVal);
    if (cost <= 0) return;
    const curr = (currencyVal || defaultCurrency).toUpperCase();
    
    budgetSummary[curr] = (budgetSummary[curr] || 0) + cost;

    const rate = EXCHANGE_RATES[curr] || 1;
    totalInBaseCurrency += cost * rate;
  };

  stays.forEach(s => addCost(s.cost, s.paidBy ? s.currency : defaultCurrency));
  flights.forEach(f => addCost(f.cost, f.paidBy ? f.currency : defaultCurrency));
  transits.forEach(t => addCost(t.cost, t.paidBy ? t.currency : defaultCurrency));
  if (trip.customExpenses) {
    trip.customExpenses.forEach(c => addCost(c.cost, c.currency));
  }
  Object.values(timelineData).forEach(items => {
    items.forEach(item => {
      if (item.cost) {
        addCost(item.cost, item.currency);
      }
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
    <div className="p-3 md:p-5 flex flex-col gap-5 text-left text-black dark:text-white max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Main Receipt Container */}
      <div className="w-full flex flex-col items-center">
        <div 
          ref={printRef}
          className="w-full max-w-2xl bg-[#FCFAF6] dark:bg-[#161616] border border-black/15 dark:border-white/15 p-6 md:p-8 flex flex-col gap-6 text-black dark:text-white font-sans relative shadow-md"
          style={{ backgroundImage: 'radial-gradient(circle, #00000003 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        >
          {/* Top Decorative Receipt Notch Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600/30 via-transparent to-amber-600/30" />
          
          {/* Header Section (Title & Export Button Inline) */}
          <div className="flex justify-between items-start pb-5 border-b border-dashed border-black/25 dark:border-white/25">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                MEMORANDUM OF TRAVEL
              </span>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight max-w-[450px] truncate">
                {trip.title ? trip.title.replace(' (Plan)', '') : 'MY TRIP'}
              </h2>
            </div>
            {!isCapturing && (
              <button
                id="capture-exclude-btn"
                onClick={handleCapture}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-[9px] font-black uppercase tracking-widest rounded-sm transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </button>
            )}
          </div>

          {/* Destinations */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> DESTINATIONS
            </span>
            <div className="pl-2.5 border-l-2 border-amber-600/30">
              <div className="text-base md:text-lg font-black text-amber-700 dark:text-amber-500 tracking-tight leading-tight uppercase">
                {formatDestinations(trip.locationStr)}
              </div>
            </div>
          </div>

          {/* Date & Duration (New item block) */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> DATE & DURATION
            </span>
            <div className="pl-2.5 border-l-2 border-amber-600/30 flex justify-between items-center gap-4 text-xs font-bold md:text-sm">
              <span className="text-black/85 dark:text-white/85">
                {formattedDateRange}
              </span>
              {totalDays > 0 && (
                <span className="bg-amber-600/10 text-amber-700 dark:text-amber-400 text-[9.5px] font-black uppercase tracking-widest px-3 py-1 rounded-full shrink-0">
                  {totalDays} DAYS
                </span>
              )}
            </div>
          </div>

          {/* Stays Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> ACCOMMODATIONS
            </span>
            <div className="pl-2.5 border-l-2 border-amber-600/30 flex flex-col gap-2.5 text-xs md:text-sm">
              {stays.length > 0 ? (
                stays.map((s, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-black text-black/80 dark:text-white/80">{s.title}</span>
                    <span className="text-[10px] text-black/50 dark:text-white/50 mt-0.5">{s.dateRange || '날짜 미지정'}</span>
                  </div>
                ))
              ) : (
                <span className="text-black/30 dark:text-white/30 italic text-xs">등록된 숙소 없음</span>
              )}
            </div>
          </div>

          {/* Flights Section (Boarding-pass Grid-style UI) */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <Plane className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> FLIGHT DETAILS
            </span>
            <div className="pl-2.5 border-l-2 border-amber-600/30 flex flex-col gap-3">
              {flights.length > 0 ? (
                flights.map((f, idx) => (
                  <div key={idx} className="border border-black/10 dark:border-white/10 rounded-sm p-3 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2.5">
                    <div className="flex justify-between items-center border-b border-dashed border-black/10 dark:border-white/10 pb-1.5">
                      <span className="font-extrabold text-[11px] text-amber-600 dark:text-amber-500 uppercase tracking-widest">{f.flightNo || 'FLIGHT'}</span>
                      <span className="text-[9px] font-bold text-black/55 dark:text-white/55">{f.date}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs leading-tight">
                      <div>
                        <span className="text-[7.5px] text-black/45 dark:text-white/45 block uppercase font-bold tracking-wider mb-0.5">Departure</span>
                        <span className="font-black text-black/85 dark:text-white/85 text-[11px]">{f.fromCode}</span>
                        {f.fromTerminal && <span className="text-[8px] text-black/50 dark:text-white/50 block font-bold mt-0.5">T.{f.fromTerminal}</span>}
                        {f.fromTime && <span className="text-[9px] text-black/60 dark:text-white/60 block font-mono mt-0.5">{f.fromTime}</span>}
                      </div>
                      <div>
                        <span className="text-[7.5px] text-black/45 dark:text-white/45 block uppercase font-bold tracking-wider mb-0.5">Arrival</span>
                        <span className="font-black text-black/85 dark:text-white/85 text-[11px]">{f.toCode}</span>
                        {f.toTerminal && <span className="text-[8px] text-black/50 dark:text-white/50 block font-bold mt-0.5">T.{f.toTerminal}</span>}
                        {f.toTime && <span className="text-[9px] text-black/60 dark:text-white/60 block font-mono mt-0.5">{f.toTime}</span>}
                      </div>
                      <div>
                        <span className="text-[7.5px] text-black/45 dark:text-white/45 block uppercase font-bold tracking-wider mb-0.5">Seat No</span>
                        <span className="font-mono font-black text-black/80 dark:text-white/80 text-[10px]">{f.seat || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-black/45 dark:text-white/45 block uppercase font-bold tracking-wider mb-0.5">Booking Ref (PNR)</span>
                        <span className="font-mono font-black text-black/80 dark:text-white/80 text-[10px] uppercase">{f.pnr || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-black/30 dark:text-white/30 italic text-xs">등록된 항공 정보 없음</span>
              )}
            </div>
          </div>

          {/* Transit Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <Train className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> TRANSIT INFO
            </span>
            <div className="pl-2.5 border-l-2 border-amber-600/30 flex flex-col gap-2.5 text-xs md:text-sm">
              {transits.length > 0 ? (
                transits.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-black text-black/80 dark:text-white/80">{t.title || t.ticketType}</span>
                      <span className="text-[10px] text-black/55 dark:text-white/55 mt-0.5">{t.route}</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-sm shrink-0">
                      {t.date}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-black/30 dark:text-white/30 italic text-xs">등록된 교통 정보 없음</span>
              )}
            </div>
          </div>

          {/* Weather Section */}
          {weatherList.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
                <CloudSun className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> WEATHER LOGS
              </span>
              <div className="grid grid-cols-2 gap-2 pl-2.5 text-xs">
                {weatherList.map((w, idx) => {
                  const info = getWeatherInfo(w.type);
                  return (
                    <div key={idx} className="flex items-center gap-1.5 bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 p-1.5 rounded-sm">
                      <span className="text-sm shrink-0">{info.icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 truncate">{w.date.replace(/^\d{4}\./, '')}</span>
                        <span className="font-black truncate text-[10px]">{info.label} {w.temp && `(${w.temp})`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Budget Section */}
          <div className="flex flex-col gap-2 pt-4 border-t border-dashed border-black/25 dark:border-white/25">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-black/45 dark:text-white/45 flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /> ESTIMATED BUDGET
            </span>
            <div className="pl-2.5 flex flex-col gap-2">
              {/* Cost Breakdown */}
              <div className="flex flex-col gap-1 text-[10px] text-black/60 dark:text-white/60 font-mono">
                {Object.keys(budgetSummary).length > 0 ? (
                  Object.entries(budgetSummary).map(([curr, amt]) => (
                    <div key={curr} className="flex justify-between border-b border-black/5 dark:border-white/5 pb-0.5">
                      <span>• Total in {curr}</span>
                      <span className="font-black text-black dark:text-white">
                        {CURRENCY_SYMBOLS[curr] || curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-black/30 dark:text-white/30 italic">지출액 합계 없음</div>
                )}
              </div>

              {/* Converted Total (KRW Standard) */}
              <div className="mt-2 bg-black/3 dark:bg-white/3 border border-black/10 dark:border-white/10 p-3 rounded-sm flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">Total Converted</span>
                  <span className="text-[7px] text-black/30 dark:text-white/30 font-bold uppercase leading-none">Ex.Rates Standard</span>
                </div>
                <span className="text-lg font-black text-amber-600 dark:text-amber-500 font-mono">
                  ₩ {Math.round(totalInBaseCurrency).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Footer Logo (Reduced spacing and compact) */}
          <div className="text-center pt-3 border-t border-black/10 dark:border-white/10">
            <span className="text-[8px] font-black tracking-[0.35em] text-black/35 dark:text-white/35">TRIP GON LOG v0.3c</span>
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
