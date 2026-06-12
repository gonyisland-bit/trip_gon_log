import React, { useState, useRef, useEffect } from 'react';
import { Plane, Trash2, RefreshCw, Clock } from 'lucide-react';
import { FlightItem } from '../types';
import { SettlementExpenseInput } from './SettlementExpenseInput';

interface FlightCardProps {
  flight: FlightItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof FlightItem, val: string) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
  onClick?: () => void;
  minDate?: string;
  maxDate?: string;
  onOpenMapConfirm?: (placeName: string, url: string) => void;
  members?: string[];
}

// Common Airport suggestions helper list
const airportSuggestions = [
  { code: 'ICN', city: '서울/인천', english: 'seoul incheon', name: '인천국제공항' },
  { code: 'GMP', city: '서울/김포', english: 'seoul gimpo', name: '김포국제공항' },
  { code: 'NRT', city: '도쿄/나리타', english: 'tokyo narita', name: '나리타국제공항' },
  { code: 'HND', city: '도쿄/하네다', english: 'tokyo haneda', name: '하네다국제공항' },
  { code: 'KIX', city: '오사카/간사이', english: 'osaka kansai', name: '간사이국제공항' },
  { code: 'CTS', city: '삿포로/신치토세', english: 'sapporo new chitose', name: '신치토세공항' },
  { code: 'FUK', city: '후쿠오카', english: 'fukuoka', name: '후쿠오카공항' },
  { code: 'CDG', city: '파리/샤를드골', english: 'paris charles de gaulle', name: '샤를드골공항' },
  { code: 'LHR', city: '런던/히드로', english: 'london heathrow', name: '히드로공항' },
  { code: 'JFK', city: '뉴욕/존F케네디', english: 'new york jfk john f kennedy', name: '존 F. 케네디 국제공항' },
  { code: 'LAX', city: '로스앤젤레스', english: 'los angeles lax', name: '로스앤젤레스국제공항' },
  { code: 'SIN', city: '싱가포르/창이', english: 'singapore changi', name: '창이국제공항' },
  { code: 'BKK', city: '방콕/수완나품', english: 'bangkok suvarnabhumi', name: '수완나품공항' },
  { code: 'HKG', city: '홍콩', english: 'hong kong hkg', name: '홍콩국제공항' },
  { code: 'PEK', city: '베이징/서우두', english: 'beijing capital pek', name: '베이징 서우두 국제공항' },
  { code: 'PVG', city: '상하이/푸동', english: 'shanghai pudong pvg', name: '상하이 푸둥 국제공항' },
];

// Time conversion helpers
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function minutesToTimeStr(minutes: number): string {
  const positiveMin = Math.max(0, Math.min(1439, minutes));
  let hours = Math.floor(positiveMin / 60);
  const mins = positiveMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minsStr = String(mins).padStart(2, '0');
  return `${hours}:${minsStr} ${ampm}`;
}

function timeStrTo24h(timeStr: string): string {
  if (!timeStr) return '00:00';
  const minutes = parseTimeToMinutes(timeStr);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function time24hTo12h(val24h: string): string {
  if (!val24h) return '12:00 AM';
  const parts = val24h.split(':');
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return minutesToTimeStr(h24 * 60 + m);
}

export function FlightCard({
  flight,
  isEditMode,
  onUpdate,
  onDelete,
  isActive,
  onClick,
  minDate,
  maxDate,
  onOpenMapConfirm,
  members = [],
}: FlightCardProps) {
  const [activeSearchField, setActiveSearchField] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fromTimeRef = useRef<HTMLInputElement>(null);
  const toTimeRef = useRef<HTMLInputElement>(null);

  const getTerminalNumber = (term: string) => {
    const match = String(term).match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  const formatTerminal = (term: string) => {
    if (!term) return '';
    const match = String(term).match(/\d+/);
    return match ? `TER ${match[0]}` : term;
  };

  // Local state to prevent typing lag
  const [localTitle, setLocalTitle] = useState(flight.title);
  const [localFromCode, setLocalFromCode] = useState(flight.fromCode);
  const [localFromTerminal, setLocalFromTerminal] = useState(getTerminalNumber(flight.fromTerminal));
  const [localFlightNo, setLocalFlightNo] = useState(flight.flightNo);
  const [localToCode, setLocalToCode] = useState(flight.toCode);
  const [localToTerminal, setLocalToTerminal] = useState(getTerminalNumber(flight.toTerminal));
  const [localSeat, setLocalSeat] = useState(flight.seat);
  const [localPnr, setLocalPnr] = useState(flight.pnr);

  useEffect(() => {
    setLocalTitle(flight.title);
    setLocalFromCode(flight.fromCode);
    setLocalFromTerminal(getTerminalNumber(flight.fromTerminal));
    setLocalFlightNo(flight.flightNo);
    setLocalToCode(flight.toCode);
    setLocalToTerminal(getTerminalNumber(flight.toTerminal));
    setLocalSeat(flight.seat);
    setLocalPnr(flight.pnr);
  }, [flight]);

  const filteredSuggestions = searchQuery.trim()
    ? airportSuggestions.filter(s =>
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div 
      onClick={onClick}
      className={`border mb-6 font-sans text-black dark:text-white relative shadow-sm transition-all duration-300 cursor-pointer ${
        isActive 
          ? 'border-red-600 dark:border-red-400 ring-1 ring-red-600/30 bg-red-500/[0.01] dark:bg-red-400/[0.01]' 
          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1a]'
      }`}
    >
      {/* Header bar */}
      <div className="bg-[#EAE8E3]/50 dark:bg-white/10 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60 border-b border-black/10 dark:border-white/10 gap-4">
        {isEditMode ? (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value.toUpperCase())}
            onBlur={() => onUpdate(flight.id, 'title', localTitle)}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm uppercase w-40"
            placeholder="FLIGHT TITLE"
          />
        ) : (
          <span className="uppercase">{flight.title}</span>
        )}
        {isEditMode ? (
          <input
            type="date"
            value={flight.date ? flight.date.replace(/\./g, '-') : ''}
            min={minDate}
            max={maxDate}
            onChange={(e) => onUpdate(flight.id, 'date', e.target.value.replace(/-/g, '.'))}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-36 text-right"
          />
        ) : (
          <span>{flight.date}</span>
        )}
      </div>
      
      {/* Card Body */}
      <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center min-w-0 w-full">
        {/* Left Side: Route and Airport Codes */}
        <div className="flex-grow flex items-center justify-around pr-4 relative min-w-0">
          
          {/* Departure */}
          <div className="text-center relative">
            {isEditMode ? (
              <div className="flex flex-col gap-1 items-center relative">
                <input
                  type="text"
                  maxLength={5}
                  value={localFromCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setLocalFromCode(val);
                    setSearchQuery(val);
                  }}
                  onFocus={() => {
                    setActiveSearchField('from');
                    setSearchQuery(localFromCode);
                  }}
                  onBlur={() => {
                    onUpdate(flight.id, 'fromCode', localFromCode);
                    setTimeout(() => setActiveSearchField(null), 250);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-black text-lg md:text-2xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-14"
                  placeholder="DEP"
                />
                
                {/* Suggestions drop down */}
                {activeSearchField === 'from' && filteredSuggestions.length > 0 && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-[#F9F8F6] dark:bg-[#1c1c1c] border border-black/10 dark:border-white/10 shadow-xl z-50 max-h-40 overflow-y-auto text-left rounded-sm" onClick={(e) => e.stopPropagation()}>
                    {filteredSuggestions.map(s => (
                      <button
                        key={s.code}
                        type="button"
                        onMouseDown={() => {
                          setLocalFromCode(s.code);
                          onUpdate(flight.id, 'fromCode', s.code);
                          const newTerminalNum = s.code === 'ICN' ? 1 : 1;
                          setLocalFromTerminal(newTerminalNum);
                          onUpdate(flight.id, 'fromTerminal', `TER ${newTerminalNum}`);
                          setActiveSearchField(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-[10px] hover:bg-black/5 dark:hover:bg-white/5 flex flex-col border-b border-black/5 dark:border-white/5 last:border-0 text-black dark:text-white"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-black text-red-600 dark:text-red-400">{s.code}</span>
                          <span className="font-bold opacity-75">{s.city}</span>
                        </div>
                        <span className="text-[8px] opacity-40 truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const placeName = `${flight.fromCode} Airport`;
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
                  if (onOpenMapConfirm) {
                    onOpenMapConfirm(placeName, url);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                className="text-2xl md:text-4xl font-black tracking-tighter block leading-none hover:underline hover:text-red-600 transition-colors bg-transparent border-none p-0 cursor-pointer text-black dark:text-white"
              >
                {flight.fromCode}
              </button>
            )}

            {isEditMode ? (
              <select
                value={localFromTerminal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setLocalFromTerminal(val);
                  onUpdate(flight.id, 'fromTerminal', `TER ${val}`);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-[#1a1a1a] px-1 py-0.5 outline-none text-[8px] md:text-[10px] font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-14 mt-1 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num} className="bg-[#EAE8E3] dark:bg-[#1a1a1a]">TER {num}</option>
                ))}
              </select>
            ) : (
              <span className="text-[9px] md:text-[10px] text-black/50 dark:text-white/50 mt-1.5 uppercase font-bold block">
                {formatTerminal(flight.fromTerminal)}
              </span>
            )}

            {isEditMode ? (
              <div className="flex items-center justify-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={fromTimeRef}
                  type="time"
                  value={timeStrTo24h(flight.fromTime)}
                  onChange={(e) => onUpdate(flight.id, 'fromTime', time24hTo12h(e.target.value))}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-[9px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-[72px] [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      fromTimeRef.current?.showPicker();
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-sm bg-[#EAE8E3] dark:bg-white/10 cursor-pointer flex items-center justify-center"
                  title="시간 선택"
                >
                  <Clock className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                </button>
              </div>
            ) : (
              <span className="text-xs md:text-sm font-bold mt-2 block">
                {flight.fromTime}
              </span>
            )}
          </div>
          
          {/* Connection Line & Flight Number & Swap Button */}
          <div className="flex flex-col items-center mx-3 sm:mx-6 shrink-0 relative">
            {isEditMode ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const tempCode = flight.fromCode;
                  const tempTerminal = flight.fromTerminal;
                  const tempTime = flight.fromTime;
                  
                  onUpdate(flight.id, 'fromCode', flight.toCode);
                  onUpdate(flight.id, 'fromTerminal', flight.toTerminal);
                  onUpdate(flight.id, 'fromTime', flight.toTime);
                  
                  onUpdate(flight.id, 'toCode', tempCode);
                  onUpdate(flight.id, 'toTerminal', tempTerminal);
                  onUpdate(flight.id, 'toTime', tempTime);
                }}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center text-red-600 dark:text-red-400 border border-black/10 dark:border-white/10 bg-[#F9F8F6] dark:bg-[#161616] cursor-pointer"
                title="출발지/도착지 반전"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Plane className="w-4 h-4 text-black/40 dark:text-white/40 rotate-90" />
            )}
            
            <div className="h-[1px] w-12 sm:w-16 md:w-24 bg-black/20 dark:bg-white/20 my-1 relative flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={localFlightNo}
                  onChange={(e) => setLocalFlightNo(e.target.value.toUpperCase())}
                  onBlur={() => onUpdate(flight.id, 'flightNo', localFlightNo)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] px-1 text-[9px] md:text-[10px] font-bold text-black/60 dark:text-white/60 tracking-wider text-center w-16 outline-none border border-black/10 dark:border-white/10 rounded-sm z-10 uppercase"
                  placeholder="KE000"
                />
              ) : (
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] px-2 text-[9px] md:text-[10px] font-bold text-black/60 dark:text-white/60 tracking-wider whitespace-nowrap z-10">
                  {flight.flightNo}
                </span>
              )}
            </div>
            
            {/* Layover Info (Display only if exists in database; edit is managed as separate ticket cards) */}
            {!isEditMode && flight.layoverCode && (
              <div className="text-[9px] md:text-[10px] font-bold text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                <span>
                  경유: {flight.layoverCode} {flight.layoverTime ? `(${flight.layoverTime})` : ''}
                </span>
              </div>
            )}
          </div>
          
          {/* Arrival */}
          <div className="text-center relative">
            {isEditMode ? (
              <div className="flex flex-col gap-1 items-center relative">
                <input
                  type="text"
                  maxLength={5}
                  value={localToCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setLocalToCode(val);
                    setSearchQuery(val);
                  }}
                  onFocus={() => {
                    setActiveSearchField('to');
                    setSearchQuery(localToCode);
                  }}
                  onBlur={() => {
                    onUpdate(flight.id, 'toCode', localToCode);
                    setTimeout(() => setActiveSearchField(null), 250);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none font-black text-lg md:text-2xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-14"
                  placeholder="ARR"
                />
                
                {/* Suggestions drop down */}
                {activeSearchField === 'to' && filteredSuggestions.length > 0 && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-[#F9F8F6] dark:bg-[#1c1c1c] border border-black/10 dark:border-white/10 shadow-xl z-50 max-h-40 overflow-y-auto text-left rounded-sm" onClick={(e) => e.stopPropagation()}>
                    {filteredSuggestions.map(s => (
                      <button
                        key={s.code}
                        type="button"
                        onMouseDown={() => {
                          setLocalToCode(s.code);
                          onUpdate(flight.id, 'toCode', s.code);
                          const newTerminalNum = s.code === 'ICN' ? 1 : 1;
                          setLocalToTerminal(newTerminalNum);
                          onUpdate(flight.id, 'toTerminal', `TER ${newTerminalNum}`);
                          setActiveSearchField(null);
                        }}
                        className="w-full px-2.5 py-1.5 text-[10px] hover:bg-black/5 dark:hover:bg-white/5 flex flex-col border-b border-black/5 dark:border-white/5 last:border-0 text-black dark:text-white"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-black text-red-600 dark:text-red-400">{s.code}</span>
                          <span className="font-bold opacity-75">{s.city}</span>
                        </div>
                        <span className="text-[8px] opacity-40 truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const placeName = `${flight.toCode} Airport`;
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
                  if (onOpenMapConfirm) {
                    onOpenMapConfirm(placeName, url);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                className="text-2xl md:text-4xl font-black tracking-tighter block leading-none hover:underline hover:text-red-600 transition-colors bg-transparent border-none p-0 cursor-pointer text-black dark:text-white"
              >
                {flight.toCode}
              </button>
            )}

            {isEditMode ? (
              <select
                value={localToTerminal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setLocalToTerminal(val);
                  onUpdate(flight.id, 'toTerminal', `TER ${val}`);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-[#1a1a1a] px-1 py-0.5 outline-none text-[8px] md:text-[10px] font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-14 mt-1 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num} className="bg-[#EAE8E3] dark:bg-[#1a1a1a]">TER {num}</option>
                ))}
              </select>
            ) : (
              <span className="text-[9px] md:text-[10px] text-black/50 dark:text-white/50 mt-1.5 uppercase font-bold block">
                {formatTerminal(flight.toTerminal)}
              </span>
            )}

            {isEditMode ? (
              <div className="flex items-center justify-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={toTimeRef}
                  type="time"
                  value={timeStrTo24h(flight.toTime)}
                  onChange={(e) => onUpdate(flight.id, 'toTime', time24hTo12h(e.target.value))}
                  className="bg-[#EAE8E3] dark:bg-white/10 px-1 py-0.5 outline-none text-[9px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-[72px] [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      toTimeRef.current?.showPicker();
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-sm bg-[#EAE8E3] dark:bg-white/10 cursor-pointer flex items-center justify-center"
                  title="시간 선택"
                >
                  <Clock className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                </button>
              </div>
            ) : (
              <span className="text-xs md:text-sm font-bold mt-2 block">
                {flight.toTime}
              </span>
            )}
          </div>
        </div>
        
        {/* Dividers: vertical on desktop, horizontal on mobile */}
        <div className="hidden md:block border-l border-dashed border-black/20 dark:border-white/20 h-16 self-stretch"></div>
        <div className="block md:hidden border-t border-dashed border-black/20 dark:border-white/20 w-full my-3"></div>
        
        {/* Right Side: Seat & PNR */}
        <div className="w-full md:w-28 md:pl-4 flex flex-row md:flex-col justify-between md:justify-center mt-3 md:mt-0 gap-4 md:gap-0 shrink-0">
          <div className="flex-1 md:flex-none md:mb-3">
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
            {isEditMode ? (
              <input
                type="text"
                value={localSeat}
                onChange={(e) => setLocalSeat(e.target.value.toUpperCase())}
                onBlur={() => onUpdate(flight.id, 'seat', localSeat)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                placeholder="00A"
              />
            ) : (
              <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 block uppercase">
                {flight.seat || 'N/A'}
              </span>
            )}
          </div>
          <div className="flex-1 md:flex-none">
            <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest block mb-0.5">PNR</span>
            {isEditMode ? (
              <input
                type="text"
                value={localPnr}
                onChange={(e) => setLocalPnr(e.target.value.toUpperCase())}
                onBlur={() => onUpdate(flight.id, 'pnr', localPnr)}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#EAE8E3] dark:bg-white/10 px-1.5 py-0.5 outline-none text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full uppercase"
                placeholder="XXXXXX"
              />
            ) : (
              <span className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 tracking-wide block uppercase">
                {flight.pnr || 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Settlement Section */}
      {(isEditMode || (flight.cost && flight.cost !== '-')) && (
        <div className="mt-4 pt-3 border-t border-dashed border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[8px] md:text-[9px] text-black/40 dark:text-white/40 uppercase font-bold tracking-widest">EXPENSE (정산)</span>
          <SettlementExpenseInput
            cost={flight.cost}
            currency={flight.currency}
            paidBy={flight.paidBy}
            members={members}
            isEditMode={isEditMode}
            onUpdate={(updates) => {
              if (updates.cost !== undefined) onUpdate(flight.id, 'cost', updates.cost);
              if (updates.currency !== undefined) onUpdate(flight.id, 'currency', updates.currency);
              if (updates.paidBy !== undefined) onUpdate(flight.id, 'paidBy', updates.paidBy);
            }}
          />
        </div>
      )}
      
      {/* Delete button in edit mode */}
      {isEditMode && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(flight.id); }}
          className="absolute bottom-2 right-2 p-1 text-red-500 hover:text-red-700 transition-colors"
          title="Delete Flight"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
