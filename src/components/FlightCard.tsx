import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plane, Trash2, RefreshCw, Clock, Paperclip, Loader2, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { FlightItem } from '../types';
import { SettlementExpenseInput } from './SettlementExpenseInput';
import { uploadFileToR2, getEffectiveImageUrl } from '../utils/storageHelper';
import { auth } from '../firebase';
import { Lightbox } from './Lightbox';

interface FlightCardProps {
  flight: FlightItem;
  isEditMode: boolean;
  onUpdate: (id: number, field: keyof FlightItem, val: any) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
  onClick?: () => void;
  minDate?: string;
  maxDate?: string;
  onOpenMapConfirm?: (placeName: string, url: string) => void;
  members?: string[];
  defaultCurrency?: string;
}

// Common Airport suggestions helper list
const airportSuggestions = [
  // Korea (대한민국)
  { code: 'ICN', city: '서울/인천', english: 'seoul incheon icn', name: '인천국제공항' },
  { code: 'GMP', city: '서울/김포', english: 'seoul gimpo gmp', name: '김포국제공항' },
  { code: 'CJU', city: '제주', english: 'jeju cju', name: '제주국제공항' },
  { code: 'PUS', city: '부산/김해', english: 'busan gimhae pus', name: '김해국제공항' },
  { code: 'TAE', city: '대구', english: 'daegu tae', name: '대구국제공항' },
  { code: 'CJJ', city: '청주', english: 'cheongju cjj', name: '청주국제공항' },
  { code: 'KWJ', city: '광주', english: 'gwangju kwj', name: '광주공항' },
  { code: 'RSU', city: '여수', english: 'yeosu rsu', name: '여수공항' },
  { code: 'USN', city: '울산', english: 'ulsan usn', name: '울산공항' },

  // Japan (일본)
  { code: 'NRT', city: '도쿄/나리타', english: 'tokyo narita nrt', name: '나리타국제공항' },
  { code: 'HND', city: '도쿄/하네다', english: 'tokyo haneda hnd', name: '하네다국제공항' },
  { code: 'KIX', city: '오사카/간사이', english: 'osaka kansai kix', name: '간사이국제공항' },
  { code: 'ITM', city: '오사카/이타미', english: 'osaka itami itm', name: '이타미공항' },
  { code: 'FUK', city: '후쿠오카', english: 'fukuoka fuk', name: '후쿠오카공항' },
  { code: 'CTS', city: '삿포로/신치토세', english: 'sapporo new chitose cts', name: '신치토세공항' },
  { code: 'OKA', city: '오키나와/나하', english: 'okinawa naha oka', name: '나하공항' },
  { code: 'NGO', city: '나고야/주부', english: 'nagoya chubu ngo', name: '주부국제공항' },
  { code: 'KOJ', city: '가고시마', english: 'kagoshima koj', name: '가고시마공항' },
  { code: 'KMJ', city: '구마모토', english: 'kumamoto kmj', name: '구마모토공항' },
  { code: 'TAK', city: '다카마쓰', english: 'takamatsu tak', name: '다카마쓰공항' },
  { code: 'MYJ', city: '마쓰야마', english: 'matsuyama myj', name: '마쓰야마공항' },
  { code: 'FSZ', city: '시즈오카', english: 'shizuoka fsz', name: '후지산 시즈오카공항' },

  // East Asia (동아시아)
  { code: 'TPE', city: '타이베이/타오위안', english: 'taipei taoyuan taiwan tpe', name: '타오위안국제공항' },
  { code: 'TSA', city: '타이베이/쑹산', english: 'taipei songshan tsa', name: '쑹산공항' },
  { code: 'KHH', city: '가오슝', english: 'kaohsiung khh', name: '가오슝국제공항' },
  { code: 'HKG', city: '홍콩', english: 'hong kong hkg', name: '홍콩국제공항' },
  { code: 'MFM', city: '마카오', english: 'macau macao mfm', name: '마카오국제공항' },
  { code: 'PEK', city: '베이징/서우두', english: 'beijing capital pek', name: '베이징 서우두 국제공항' },
  { code: 'PKX', city: '베이징/다싱', english: 'beijing daxing pkx', name: '베이징 다싱 국제공항' },
  { code: 'PVG', city: '상하이/푸동', english: 'shanghai pudong pvg', name: '상하이 푸둥 국제공항' },
  { code: 'SHA', city: '상하이/홍차오', english: 'shanghai hongqiao sha', name: '상하이 훙차오 국제공항' },
  { code: 'CAN', city: '광저우/바이윈', english: 'guangzhou baiyun can', name: '광저우 바이윈 국제공항' },

  // Southeast Asia (동남아시아)
  { code: 'DAD', city: '다낭', english: 'danang da nang dad', name: '다낭국제공항' },
  { code: 'CXR', city: '나트랑/깜라인', english: 'nha trang cam ranh cxr', name: '깜라인국제공항' },
  { code: 'HAN', city: '하노이/노이바이', english: 'hanoi noi bai han', name: '노이바이국제공항' },
  { code: 'SGN', city: '호치민/탄손누트', english: 'ho chi minh tan son nhat sgn', name: '탄손누트국제공항' },
  { code: 'PQC', city: '푸꾸옥', english: 'phu quoc pqc', name: '푸꾸옥국제공항' },
  { code: 'BKK', city: '방콕/수완나품', english: 'bangkok suvarnabhumi bkk', name: '수완나품국제공항' },
  { code: 'DMK', city: '방콕/돈므앙', english: 'bangkok don mueang dmk', name: '돈므앙국제공항' },
  { code: 'HKT', city: '푸켓', english: 'phuket hkt', name: '푸켓국제공항' },
  { code: 'CNX', city: '치앙마이', english: 'chiang mai cnx', name: '치앙마이국제공항' },
  { code: 'SIN', city: '싱가포르/창이', english: 'singapore changi sin', name: '창이국제공항' },
  { code: 'KUL', city: '쿠알라룸푸르', english: 'kuala lumpur kul', name: '쿠알라룸푸르국제공항' },
  { code: 'DPS', city: '발리/덴파사르', english: 'bali denpasar ngurah rai dps', name: '응우라라이국제공항' },
  { code: 'CEB', city: '세부/막탄', english: 'cebu mactan ceb', name: '막탄세부국제공항' },
  { code: 'MNL', city: '마닐라', english: 'manila ninoy aquino mnl', name: '니노이아키노국제공항' },
  { code: 'KLO', city: '보라카이/칼리보', english: 'boracay kalibo klo', name: '칼리보국제공항' },

  // Europe (유럽)
  { code: 'CDG', city: '파리/샤를드골', english: 'paris charles de gaulle cdg', name: '샤를드골국제공항' },
  { code: 'ORY', city: '파리/오를리', english: 'paris orly ory', name: '오를리공항' },
  { code: 'LHR', city: '런던/히드로', english: 'london heathrow lhr', name: '히드로국제공항' },
  { code: 'LGW', city: '런던/개트윅', english: 'london gatwick lgw', name: '개트윅공항' },
  { code: 'FCO', city: '로마/피우미치노', english: 'rome fiumicino leonardo da vinci fco', name: '피우미치노국제공항' },
  { code: 'MXP', city: '밀라노/말펜사', english: 'milan malpensa mxp', name: '말펜사국제공항' },
  { code: 'BCN', city: '바르셀로나', english: 'barcelona el prat bcn', name: '엘프라트국제공항' },
  { code: 'MAD', city: '마드리드/바라하스', english: 'madrid barajas mad', name: '바라하스국제공항' },
  { code: 'FRA', city: '프랑크푸르트', english: 'frankfurt fra', name: '프랑크푸르트공항' },
  { code: 'MUC', city: '뮌헨', english: 'munich muc', name: '뮌헨공항' },
  { code: 'ZRH', city: '취리히', english: 'zurich zrh', name: '취리히공항' },
  { code: 'VIE', city: '비엔나', english: 'vienna vie', name: '비엔나국제공항' },
  { code: 'PRG', city: '프라하/바츨라프하벨', english: 'prague vaclav havel prg', name: '바츨라프하벨국제공항' },
  { code: 'AMS', city: '암스테르담/스키폴', english: 'amsterdam schiphol ams', name: '스키폴국제공항' },
  { code: 'IST', city: '이스탄불', english: 'istanbul ist', name: '이스탄불공항' },
  { code: 'HEL', city: '헬싱키/반타', english: 'helsinki vantaa hel', name: '헬싱키반타공항' },

  // Americas & Oceania (미주/대양주)
  { code: 'JFK', city: '뉴욕/존F케네디', english: 'new york jfk john f kennedy', name: '존 F. 케네디 국제공항' },
  { code: 'EWR', city: '뉴욕/뉴어크', english: 'new york newark ewr', name: '뉴어크리버티국제공항' },
  { code: 'LAX', city: '로스앤젤레스', english: 'los angeles lax', name: '로스앤젤레스국제공항' },
  { code: 'SFO', city: '샌프란시스코', english: 'san francisco sfo', name: '샌프란시스코국제공항' },
  { code: 'SEA', city: '시애틀', english: 'seattle tacoma sea', name: '시애틀터코마국제공항' },
  { code: 'LAS', city: '라스베이거스', english: 'las vegas harry reid las', name: '해리리드국제공항' },
  { code: 'ORD', city: '시카고/오헤어', english: 'chicago ohare ord', name: '오헤어국제공항' },
  { code: 'HNL', city: '호놀룰루/하와이', english: 'honolulu hawaii daniel k inouye hnl', name: '대니얼 K. 이노우에 국제공항' },
  { code: 'OGG', city: '마우이/카훌루이', english: 'maui kahului ogg', name: '카훌루이공항' },
  { code: 'YVR', city: '밴쿠버', english: 'vancouver yvr', name: '밴쿠버국제공항' },
  { code: 'YYZ', city: '토론토/피어슨', english: 'toronto pearson yyz', name: '피어슨국제공항' },
  { code: 'GUM', city: '괌/안토니오원팻', english: 'guam antonio b won pat gum', name: '안토니오 B. 원 팻 국제공항' },
  { code: 'SPN', city: '사이판', english: 'saipan spn', name: '사이판국제공항' },
  { code: 'SYD', city: '시드니/킹스포드스미스', english: 'sydney kingsford smith syd', name: '킹스포드스미스국제공항' },
  { code: 'MEL', city: '멜버른/툴라마린', english: 'melbourne tullamarine mel', name: '멜버른공항' },
  { code: 'BNE', city: '브리즈번', english: 'brisbane bne', name: '브리즈번공항' },
  { code: 'AKL', city: '오클랜드', english: 'auckland akl', name: '오클랜드공항' },
  { code: 'DXB', city: '두바이', english: 'dubai dxb', name: '두바이국제공항' },
  { code: 'DOH', city: '도하/하마드', english: 'doha hamad doh', name: '하마드국제공항' },
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
  defaultCurrency,
}: FlightCardProps) {
  const [activeSearchField, setActiveSearchField] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fromTimeRef = useRef<HTMLInputElement>(null);
  const toTimeRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    setUploadingAttachment(true);
    try {
      const storagePath = `users/public/flights/${flight.id}/${Date.now()}_${file.name}`;
      const downloadUrl = await uploadFileToR2(file, storagePath);
      
      const currentList = flight.attachments || [];
      const newList = [...currentList, downloadUrl];
      onUpdate(flight.id, 'attachments', newList);
    } catch (error) {
      console.error("Flight attachment upload failed:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await uploadFile(file);
      }
    }
  };

  const removeAttachment = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    if (confirm("이 첨부파일을 삭제하시겠습니까?")) {
      const currentList = flight.attachments || [];
      const newList = currentList.filter((_, idx) => idx !== indexToRemove);
      onUpdate(flight.id, 'attachments', newList);
    }
  };

  const isPdf = (url: string) => url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('application%2Fpdf');

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

  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return airportSuggestions.slice(0, 10);
    }
    return airportSuggestions.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.english.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const resolveAirportCode = (input: string): string => {
    const clean = input.trim();
    if (!clean) return 'ICN';
    if (clean.length === 3 && /^[A-Za-z]+$/.test(clean)) {
      return clean.toUpperCase();
    }
    // Try matching prefix or Korean name/city
    const match = airportSuggestions.find(s =>
      s.code.toLowerCase() === clean.toLowerCase() ||
      s.code.toLowerCase().startsWith(clean.toLowerCase()) ||
      s.city.toLowerCase().includes(clean.toLowerCase()) ||
      s.name.toLowerCase().includes(clean.toLowerCase()) ||
      s.english.toLowerCase().includes(clean.toLowerCase())
    );
    return match ? match.code : clean.toUpperCase().slice(0, 3);
  };

  return (
    <div 
      onClick={onClick}
      className={`border-b font-sans text-black dark:text-white relative transition-all duration-300 cursor-pointer w-full ${
        isActive 
          ? 'border-b-red-600 dark:border-b-red-500 bg-neutral-100/50 dark:bg-white/[0.04]' 
          : 'border-b-black/15 dark:border-b-white/15 bg-white dark:bg-[#0A0A0A]'
      }`}
    >
      {/* Header bar */}
      <div className="bg-black/[0.03] dark:bg-white/5 px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest text-black/60 dark:text-white/60 border-b border-black/15 dark:border-white/15 gap-2 sm:gap-4">
        {isEditMode ? (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value.toUpperCase())}
            onBlur={() => onUpdate(flight.id, 'title', localTitle)}
            onClick={(e) => e.stopPropagation()}
            className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm uppercase w-32 sm:w-40"
            placeholder="FLIGHT TITLE"
          />
        ) : (
          <span className="uppercase truncate">{flight.title}</span>
        )}
        {isEditMode ? (
          <input
            type="date"
            value={flight.date ? flight.date.replace(/\./g, '-') : ''}
            min={minDate}
            max={maxDate}
            onChange={(e) => onUpdate(flight.id, 'date', e.target.value.replace(/-/g, '.'))}
            onClick={(e) => e.stopPropagation()}
            className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] md:text-xs font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-28 sm:w-36 text-right font-mono"
          />
        ) : (
          <span className="font-mono">{flight.date}</span>
        )}
      </div>
      
      {/* Card Body (Unclipped responsive layout) */}
      <div className="p-2.5 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center min-w-0 w-full gap-2 md:gap-0">
        {/* Left Side: Route and Airport Codes */}
        <div className="flex-1 flex items-center justify-between sm:justify-around relative min-w-0 w-full">
          
          {/* Departure */}
          <div className="text-center relative flex flex-col items-center shrink-0">
            {isEditMode ? (
              <div className="flex flex-col gap-1 items-center relative">
                <input
                  type="text"
                  maxLength={10}
                  value={localFromCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalFromCode(val);
                    setSearchQuery(val);
                    setActiveSearchField('from');
                  }}
                  onFocus={() => {
                    setActiveSearchField('from');
                    setSearchQuery(localFromCode);
                  }}
                  onBlur={() => {
                    const resolved = resolveAirportCode(localFromCode);
                    setLocalFromCode(resolved);
                    onUpdate(flight.id, 'fromCode', resolved);
                    setTimeout(() => setActiveSearchField(null), 250);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-black/5 dark:bg-white/10 px-1 py-0.5 outline-none font-black text-base sm:text-lg md:text-xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-12 sm:w-14 uppercase"
                  placeholder="DEP"
                />
                
                {/* Suggestions drop down */}
                {activeSearchField === 'from' && filteredSuggestions.length > 0 && (
                  <div className="absolute top-9 left-0 sm:left-1/2 sm:-translate-x-1/2 w-56 sm:w-64 bg-[#F9F8F6] dark:bg-[#1c1c1c] border border-black/15 dark:border-white/15 shadow-2xl z-50 max-h-56 overflow-y-auto text-left rounded-sm" onClick={(e) => e.stopPropagation()}>
                    {filteredSuggestions.map((s: { code: string; city: string; english: string; name: string }) => (
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
                        className="w-full px-3 py-2 text-xs sm:text-sm hover:bg-black/5 dark:hover:bg-white/5 flex flex-col border-b border-black/5 dark:border-white/5 last:border-0 text-black dark:text-white cursor-pointer"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-black text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm">{s.code}</span>
                          <span className="font-bold opacity-90 text-xs sm:text-sm">{s.city}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs opacity-60 truncate mt-0.5">{s.name}</span>
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
                className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter block leading-none hover:underline hover:text-red-600 transition-colors bg-transparent border-none p-0 cursor-pointer text-black dark:text-white font-mono"
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
                className="bg-black/5 dark:bg-[#1a1a1a] px-1 py-0.5 outline-none text-[10px] sm:text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-16 sm:w-20 mt-1 cursor-pointer font-mono"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num} className="bg-white dark:bg-[#1a1a1a]">TER {num}</option>
                ))}
              </select>
            ) : (
              <span className="text-[10px] sm:text-xs md:text-sm text-black/60 dark:text-white/60 mt-1 uppercase font-bold block font-mono">
                {formatTerminal(flight.fromTerminal)}
              </span>
            )}

            {isEditMode ? (
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={fromTimeRef}
                  type="time"
                  value={timeStrTo24h(flight.fromTime)}
                  onChange={(e) => onUpdate(flight.id, 'fromTime', time24hTo12h(e.target.value))}
                  className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] sm:text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-[76px] sm:w-[86px] md:w-[94px] font-mono [&::-webkit-calendar-picker-indicator]:hidden"
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
                  className="p-1 sm:p-1.5 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-sm bg-black/5 dark:bg-white/10 cursor-pointer flex items-center justify-center shrink-0"
                  title="시간 선택"
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/60 dark:text-white/60" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] sm:text-xs md:text-sm font-bold mt-1.5 block font-mono">
                {flight.fromTime}
              </span>
            )}
          </div>
          
          {/* Connection Line & Flight Number & Swap Button */}
          <div className="flex flex-col items-center mx-1 sm:mx-3 md:mx-4 shrink-0 relative">
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
                className="p-1 sm:p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center text-red-600 dark:text-red-400 border border-black/10 dark:border-white/10 bg-[#F9F8F6] dark:bg-[#161616] cursor-pointer"
                title="출발지/도착지 반전"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            ) : (
              <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/40 dark:text-white/40 rotate-90" />
            )}
            
            <div className="h-[1px] w-8 sm:w-14 md:w-20 bg-black/20 dark:bg-white/20 my-1 relative flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={localFlightNo}
                  onChange={(e) => setLocalFlightNo(e.target.value.toUpperCase())}
                  onBlur={() => onUpdate(flight.id, 'flightNo', localFlightNo)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] px-1.5 text-[10px] sm:text-xs md:text-sm font-bold text-black dark:text-white tracking-wider text-center w-16 sm:w-20 outline-none border border-black/10 dark:border-white/10 rounded-sm z-10 uppercase font-mono"
                  placeholder="KE000"
                />
              ) : (
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[#1a1a1a] px-1 sm:px-1.5 text-[10px] sm:text-xs md:text-sm font-bold text-black/70 dark:text-white/70 tracking-wider whitespace-nowrap z-10 font-mono">
                  {flight.flightNo}
                </span>
              )}
            </div>
            
            {/* Layover Info */}
            {!isEditMode && flight.layoverCode && (
              <div className="text-[9px] sm:text-[10px] md:text-xs font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 font-mono">
                <span>
                  경유: {flight.layoverCode} {flight.layoverTime ? `(${flight.layoverTime})` : ''}
                </span>
              </div>
            )}
          </div>
          
          {/* Arrival */}
          <div className="text-center relative flex flex-col items-center shrink-0">
            {isEditMode ? (
              <div className="flex flex-col gap-1 items-center relative">
                <input
                  type="text"
                  maxLength={10}
                  value={localToCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalToCode(val);
                    setSearchQuery(val);
                    setActiveSearchField('to');
                  }}
                  onFocus={() => {
                    setActiveSearchField('to');
                    setSearchQuery(localToCode);
                  }}
                  onBlur={() => {
                    const resolved = resolveAirportCode(localToCode);
                    setLocalToCode(resolved);
                    onUpdate(flight.id, 'toCode', resolved);
                    setTimeout(() => setActiveSearchField(null), 250);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-black/5 dark:bg-white/10 px-1 py-0.5 outline-none font-black text-base sm:text-lg md:text-xl text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-12 sm:w-14 uppercase"
                  placeholder="ARR"
                />
                
                {/* Suggestions drop down */}
                {activeSearchField === 'to' && filteredSuggestions.length > 0 && (
                  <div className="absolute top-9 right-0 sm:left-1/2 sm:-translate-x-1/2 w-56 sm:w-64 bg-[#F9F8F6] dark:bg-[#1c1c1c] border border-black/15 dark:border-white/15 shadow-2xl z-50 max-h-56 overflow-y-auto text-left rounded-sm" onClick={(e) => e.stopPropagation()}>
                    {filteredSuggestions.map((s: { code: string; city: string; english: string; name: string }) => (
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
                        className="w-full px-3 py-2 text-xs sm:text-sm hover:bg-black/5 dark:hover:bg-white/5 flex flex-col border-b border-black/5 dark:border-white/5 last:border-0 text-black dark:text-white cursor-pointer"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-black text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm">{s.code}</span>
                          <span className="font-bold opacity-90 text-xs sm:text-sm">{s.city}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs opacity-60 truncate mt-0.5">{s.name}</span>
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
                className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter block leading-none hover:underline hover:text-red-600 transition-colors bg-transparent border-none p-0 cursor-pointer text-black dark:text-white font-mono"
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
                className="bg-black/5 dark:bg-[#1a1a1a] px-1 py-0.5 outline-none text-[10px] sm:text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-16 sm:w-20 mt-1 cursor-pointer font-mono"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num} className="bg-white dark:bg-[#1a1a1a]">TER {num}</option>
                ))}
              </select>
            ) : (
              <span className="text-[10px] sm:text-xs md:text-sm text-black/60 dark:text-white/60 mt-1 uppercase font-bold block font-mono">
                {formatTerminal(flight.toTerminal)}
              </span>
            )}

            {isEditMode ? (
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={toTimeRef}
                  type="time"
                  value={timeStrTo24h(flight.toTime)}
                  onChange={(e) => onUpdate(flight.id, 'toTime', time24hTo12h(e.target.value))}
                  className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] sm:text-xs md:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm text-center w-[76px] sm:w-[86px] md:w-[94px] font-mono [&::-webkit-calendar-picker-indicator]:hidden"
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
                  className="p-1 sm:p-1.5 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-sm bg-black/5 dark:bg-white/10 cursor-pointer flex items-center justify-center shrink-0"
                  title="시간 선택"
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/60 dark:text-white/60" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] sm:text-xs md:text-sm font-bold mt-1.5 block font-mono">
                {flight.toTime}
              </span>
            )}
          </div>
        </div>
        
        {/* Dividers: vertical on desktop, horizontal on mobile */}
        <div className="hidden md:block border-l border-dashed border-black/20 dark:border-white/20 h-16 self-stretch mx-3"></div>
        <div className="block md:hidden border-t border-dashed border-black/15 dark:border-white/15 w-full my-1"></div>
        
        {/* Right Side: Seat & PNR (Balanced 2-column on mobile, vertical stack on desktop) */}
        <div className="w-full md:w-28 md:pl-2 grid grid-cols-2 md:flex md:flex-col items-center justify-between md:justify-center gap-2 md:gap-0 shrink-0">
          <div className="w-full text-center md:text-left md:mb-2">
            <span className="text-[9.5px] sm:text-[10px] text-black/50 dark:text-white/50 uppercase font-bold tracking-widest block mb-0.5">SEAT</span>
            {isEditMode ? (
              <input
                type="text"
                value={localSeat}
                onChange={(e) => setLocalSeat(e.target.value.toUpperCase())}
                onBlur={() => onUpdate(flight.id, 'seat', localSeat)}
                onClick={(e) => e.stopPropagation()}
                className="bg-black/5 dark:bg-white/10 px-1 py-0.5 outline-none text-xs sm:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full text-center md:text-left uppercase font-mono"
                placeholder="00A"
              />
            ) : (
              <span className="text-xs sm:text-sm font-bold text-black/80 dark:text-white/80 block uppercase font-mono">
                {flight.seat || 'N/A'}
              </span>
            )}
          </div>
          <div className="w-full text-center md:text-left">
            <span className="text-[9.5px] sm:text-[10px] text-black/50 dark:text-white/50 uppercase font-bold tracking-widest block mb-0.5">PNR</span>
            {isEditMode ? (
              <input
                type="text"
                value={localPnr}
                onChange={(e) => setLocalPnr(e.target.value.toUpperCase())}
                onBlur={() => onUpdate(flight.id, 'pnr', localPnr)}
                onClick={(e) => e.stopPropagation()}
                className="bg-black/5 dark:bg-white/10 px-1 py-0.5 outline-none text-xs sm:text-sm font-bold text-black dark:text-white border border-black/10 dark:border-white/10 rounded-sm w-full text-center md:text-left uppercase font-mono"
                placeholder="XXXXXX"
              />
            ) : (
              <span className="text-xs sm:text-sm font-bold text-black/80 dark:text-white/80 tracking-wide block uppercase font-mono">
                {flight.pnr || 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* ── Accordion Expand/Collapse Toggle Bar (Price shown ONLY when expanded) ── */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(prev => !prev);
        }}
        className="px-4 py-2 bg-black/[0.02] dark:bg-white/[0.02] border-t border-dashed border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 cursor-pointer select-none"
      >
        <span className="flex items-center gap-2">
          <span>EXPENSE & ATTACHMENTS</span>
          {flight.attachments && flight.attachments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-mono font-bold flex items-center gap-0.5">
              <Paperclip className="w-2.5 h-2.5" />
              {flight.attachments.length}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-black/50 dark:text-white/50">
          <span>{isExpanded ? '접기 (Close)' : '펼치기 (Expand)'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </div>

      {/* ── Accordion Expandable Content (Expense & Attachments) ── */}
      {(isExpanded || isEditMode) && (
        <div className="animate-in fade-in duration-200">
          {/* Settlement Section */}
          {(isEditMode || (flight.cost && flight.cost !== '-')) && (
            <div className="px-4 pb-4 md:px-6 md:pb-6">
              <div className={`pt-3 border-t border-dashed border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 ${isEditMode ? 'pr-8' : ''}`}>
                <span className="text-[10px] md:text-[11px] text-black/50 dark:text-white/50 uppercase font-bold tracking-widest">EXPENSE (정산)</span>
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
                  defaultCurrency={defaultCurrency}
                />
              </div>
            </div>
          )}
          
          {/* Attachments Section */}
          <div className="px-4 pb-4 md:px-6 md:pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="pt-3 border-t border-dashed border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] md:text-[11px] text-black/50 dark:text-white/50 uppercase font-bold tracking-widest flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> ATTACHMENTS (첨부파일)
                </span>
                {isEditMode && (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      className="text-[9px] md:text-[10px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-bold uppercase rounded-sm flex items-center gap-1 cursor-pointer text-black dark:text-white"
                    >
                      {uploadingAttachment ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                          <span>UPLOADING...</span>
                        </>
                      ) : (
                        <span>ADD FILE</span>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      multiple
                    />
                  </div>
                )}
              </div>

              {/* Attachment List */}
              {(!flight.attachments || flight.attachments.length === 0) ? (
                <div className="text-[9px] text-black/30 dark:text-white/30 italic py-1">
                  첨부된 파일이 없습니다.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {flight.attachments.map((url, idx) => {
                    const pdfMode = isPdf(url);
                    return (
                      <div key={idx} className="relative group">
                        {pdfMode ? (
                          <button
                            type="button"
                            onClick={() => window.open(getEffectiveImageUrl(url), '_blank')}
                            className="w-12 h-12 md:w-16 md:h-16 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center justify-center text-red-500 dark:text-red-400 hover:opacity-80 transition-opacity rounded-sm cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 mb-1" />
                            <span className="text-[8px] font-bold">PDF</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxIndex(idx);
                              setLightboxOpen(true);
                            }}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-sm overflow-hidden border border-black/10 dark:border-white/10 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <img src={getEffectiveImageUrl(url)} alt={`attachment-${idx}`} className="w-full h-full object-cover" />
                          </button>
                        )}
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={(e) => removeAttachment(e, idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] cursor-pointer"
                            title="첨부파일 삭제"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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

      {/* Lightbox for Image Attachments */}
      {lightboxOpen && (
        <Lightbox
          isOpen={lightboxOpen}
          images={(flight.attachments || []).map(url => ({ url: getEffectiveImageUrl(url) }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
}
