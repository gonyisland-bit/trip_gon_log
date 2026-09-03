import React, { useState, useRef, useEffect, useMemo, useTransition, useCallback } from 'react';
import { 
  Clock, Plane, Bed, Train, Bus, Car, User, Edit2, Trash2, 
  Image as ImageIcon, ChevronUp, ChevronDown, MapPin, Plus, Loader2, Search, ArrowLeft,
  ExternalLink, MapPinOff, Maximize2, Star, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  Sun, Cloud, Cloudy, CloudRain, Snowflake, CloudLightning, ArrowRight, Calculator, FileText, Share2, GripVertical,
  Play, Pause, SkipForward, SkipBack, X as CloseIcon, Check, Edit3, DollarSign,
  Columns2, LayoutGrid, ArrowRightLeft, X, Coins
} from 'lucide-react';
import { MapArea } from '../components/MapArea';
import { ImageEditOverlay } from '../components/ImageEditOverlay';
import { FlightCard } from '../components/FlightCard';
import { StayCard } from '../components/StayCard';
import { TransitCard } from '../components/TransitCard';
import { SettlementExpenseInput, formatNumberWithCommas, getDefaultCurrencyForLocation } from '../components/SettlementExpenseInput';
import { SettlementView } from '../components/SettlementView';
import { SummaryView, cleanAdministrativeDistricts, generateJourneyMessage } from '../components/SummaryView';
import { Lightbox, LightboxImageMeta } from '../components/Lightbox';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Footer } from '../components/Footer';
import { ConfirmModal } from '../components/ConfirmModal';
import { 
  Trip, 
  Plan,
  TimelineItem, 
  TimelineData, 
  FlightItem, 
  StayItem, 
  TransitItem,
  TabType
} from '../types';
import { fetchCoordinates, fetchPlacePredictions, fetchCoordinatesByPlaceId } from '../utils/googleMapsHelper';
import { fetchAddressFromCoords, fetchCountryFromCoords } from '../utils/googleMapsHelper';
import { readExif } from '../utils/exifHelper';
import { uploadFileToR2, deleteFileFromR2, getEffectiveImageUrl } from '../utils/storageHelper';
import { auth, db } from '../firebase';
import { compressImage } from '../utils/imageHelper';
import { doc, setDoc } from 'firebase/firestore';
const dayColors = [
  '#dc2626', // Day 1: Red
  '#2563eb', // Day 2: Blue
  '#16a34a', // Day 3: Green
  '#d97706', // Day 4: Orange/Amber
  '#7c3aed', // Day 5: Purple
  '#db2777', // Day 6: Pink
  '#0891b2', // Day 7: Cyan
  '#4b5563', // Day 8: Gray
];

function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    if (!isNaN(d.getTime())) {
      return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
    }
  }
  return '';
}



interface JourneyDetailPageProps {
  isLoggedIn: boolean;
  trip: Trip | undefined;
  timelineData: TimelineData;
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  onSave: (
    tripId: number,
    updatedTrip: Trip,
    updatedTimeline: TimelineItem[],
    updatedFlights: FlightItem[],
    updatedStays: StayItem[],
    updatedTransits: TransitItem[]
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isDarkMode: boolean;
  onNavigate: (view: string, tripId?: number | null, pushHistory?: boolean, tagFilter?: string | null) => void;
  searchFocusItemId?: number | null;
  searchFocusTab?: string | null;
  onClearSearchFocus?: () => void;
  onEditModeChange?: (editing: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  allTrips?: Trip[];
  allPlans?: Plan[];
}



const airportCoords: { [code: string]: { lat: number; lng: number } } = {
  ICN: { lat: 37.4602, lng: 126.4407 },
  GMP: { lat: 37.5583, lng: 126.7906 },
  NRT: { lat: 35.7720, lng: 140.3929 },
  HND: { lat: 35.5494, lng: 139.7798 },
  KIX: { lat: 34.4320, lng: 135.2304 },
  ITM: { lat: 34.7895, lng: 135.4382 },
  CTS: { lat: 42.7752, lng: 141.6923 },
  FUK: { lat: 33.5860, lng: 130.4507 },
  LAX: { lat: 33.9416, lng: -118.4085 },
  JFK: { lat: 40.6413, lng: -73.7781 },
  CDG: { lat: 49.0097, lng: 2.5479 },
  TPE: { lat: 25.0797, lng: 121.2342 },
  OKA: { lat: 26.1958, lng: 127.6458 },
  BKK: { lat: 13.6900, lng: 100.7501 },
  CXR: { lat: 11.9981, lng: 109.2194 },
  DAD: { lat: 16.0439, lng: 108.1994 },
  SGN: { lat: 10.8188, lng: 106.6519 },
  HAN: { lat: 21.2212, lng: 105.8072 },
  SIN: { lat: 1.3644, lng: 103.9915 },
  HKG: { lat: 22.3080, lng: 113.9185 },
  CEB: { lat: 10.3075, lng: 123.9794 },
  DPS: { lat: -8.7481, lng: 115.1672 },
  NGO: { lat: 34.8584, lng: 136.8054 },
  KOJ: { lat: 31.8007, lng: 130.7196 },
  OKJ: { lat: 34.7567, lng: 133.8549 },
  MYJ: { lat: 33.8272, lng: 132.6997 },
  TAK: { lat: 34.2141, lng: 134.0156 },
  OIT: { lat: 33.4794, lng: 131.7375 },
  KMJ: { lat: 32.8372, lng: 130.8550 },
  KUV: { lat: 35.9264, lng: 126.6153 },
  CJU: { lat: 33.5113, lng: 126.4930 },
  PUS: { lat: 35.1796, lng: 128.9382 },
  TAE: { lat: 35.8939, lng: 128.6589 },
  USN: { lat: 35.5936, lng: 129.3517 },
  YNY: { lat: 38.0611, lng: 128.6692 },
  MWX: { lat: 34.9814, lng: 126.3833 },
  LHR: { lat: 51.4700, lng: -0.4543 },
  FCO: { lat: 41.8003, lng: 12.2389 },
  MXP: { lat: 45.6301, lng: 8.7259 },
  MAD: { lat: 40.4839, lng: -3.5680 },
  BCN: { lat: 41.2974, lng: 2.0833 },
  MUC: { lat: 48.3537, lng: 11.7860 },
  FRA: { lat: 50.0379, lng: 8.5622 },
  AMS: { lat: 52.3105, lng: 4.7683 },
  ZRH: { lat: 47.4582, lng: 8.5555 },
  VIE: { lat: 48.1103, lng: 16.5697 },
  SYD: { lat: -33.9461, lng: 151.1772 },
  MEL: { lat: -37.6690, lng: 144.8410 },
  BNE: { lat: -27.3842, lng: 153.1175 },
  YVR: { lat: 49.1967, lng: -123.1815 },
  YYZ: { lat: 43.6777, lng: -79.6248 },
  SFO: { lat: 37.6213, lng: -122.3790 },
  SEA: { lat: 47.4502, lng: -122.3088 },
  ORD: { lat: 41.9742, lng: -87.9073 },
  DFW: { lat: 32.8998, lng: -97.0403 },
  ATL: { lat: 33.6407, lng: -84.4277 },
  HNL: { lat: 21.3245, lng: -157.9251 },
  GUM: { lat: 13.4839, lng: 144.7961 },
  SPN: { lat: 15.1190, lng: 145.7290 },
};

function calculateLayoverTime(arrDate: string, arrTime: string, depDate: string, depTime: string): string {
  try {
    const parseDate = (dStr: string) => dStr.replace(/\./g, '-');
    
    const parseTimeTo24 = (tStr: string) => {
      let [time, modifier] = tStr.split(' ');
      if (!modifier) {
        const match = tStr.match(/([0-9:]+)\s*(AM|PM)/i);
        if (match) {
          time = match[1];
          modifier = match[2];
        }
      }
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      }
      if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      return { hours, minutes };
    };

    const arr = parseTimeTo24(arrTime);
    const dep = parseTimeTo24(depTime);

    const arrD = new Date(parseDate(arrDate));
    arrD.setHours(arr.hours, arr.minutes, 0, 0);

    const depD = new Date(parseDate(depDate));
    depD.setHours(dep.hours, dep.minutes, 0, 0);

    const diffMs = depD.getTime() - arrD.getTime();
    if (diffMs <= 0) return '';

    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m layover`;
    }
    return `${mins}m layover`;
  } catch (e) {
    return '';
  }
}

function extractCountry(address: string): string {
  if (!address) return '';
  const clean = address.trim().toLowerCase();
  
  const countries = [
    { name: 'JAPAN', keys: ['japan', '일본', 'nihon', 'nippon', '日本', 'jp'] },
    { name: 'SOUTH KOREA', keys: ['korea', '대한민국', '한국', 'south korea', 'kr', 'seoul'] },
    { name: 'VIETNAM', keys: ['vietnam', '베트남', 'việt nam', 'viet nam', 'vn'] },
    { name: 'TAIWAN', keys: ['taiwan', '대만', '타이완', 'tai wan', '台灣', '臺灣', 'tw'] },
    { name: 'THAILAND', keys: ['thailand', '태국', 'ประเทศไทย', 'thai', 'th'] },
    { name: 'SINGAPORE', keys: ['singapore', '싱가포르', '싱가폴', 'sg'] },
    { name: 'USA', keys: ['usa', '미국', 'united states', 'america', 'us'] },
    { name: 'FRANCE', keys: ['france', '프랑스', 'french', 'fr'] },
    { name: 'ITALY', keys: ['italy', '이탈리아', '이태리', 'italia', 'it'] },
    { name: 'UNITED KINGDOM', keys: ['uk', 'united kingdom', '영국', 'great britain', 'england', 'gb'] },
    { name: 'GERMANY', keys: ['germany', '독일', 'deutschland', 'de'] },
    { name: 'SPAIN', keys: ['spain', '스페인', 'españa', 'espana', 'es'] },
    { name: 'CHINA', keys: ['china', '중국', '中国', 'cn'] },
    { name: 'HONG KONG', keys: ['hong kong', '홍콩', 'hk'] },
    { name: 'MACAU', keys: ['macau', '마카오', 'mo'] },
    { name: 'PHILIPPINES', keys: ['philippines', '필리핀', 'ph'] },
    { name: 'MALAYSIA', keys: ['malaysia', '말레이시아', 'my'] },
    { name: 'INDONESIA', keys: ['indonesia', '인도네시아', '발리', 'bali', 'id'] },
    { name: 'AUSTRALIA', keys: ['australia', '호주', 'au'] },
    { name: 'NEW ZEALAND', keys: ['new zealand', '뉴질랜드', 'nz'] },
    { name: 'SWITZERLAND', keys: ['switzerland', '스위스', 'ch'] },
    { name: 'AUSTRIA', keys: ['austria', '오스트리아', 'at'] },
    { name: 'CZECHIA', keys: ['czechia', 'czech', '체코', 'cz'] },
    { name: 'HUNGARY', keys: ['hungary', '헝가리', 'hu'] }
  ];

  for (const c of countries) {
    for (const key of c.keys) {
      if (clean.includes(key)) {
        return c.name;
      }
    }
  }

  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim().toUpperCase();
    for (const c of countries) {
      for (const key of c.keys) {
        if (lastPart.toLowerCase() === key) {
          return c.name;
        }
      }
    }
    return lastPart;
  }
  
  return address.trim().toUpperCase();
}

function getCountryName(locationToken: string): string {
  if (!locationToken) return 'TRAVEL';
  const cleanToken = locationToken.trim().toLowerCase();
  const CITY_TO_COUNTRY_MAP: { [key: string]: string } = {
    'kyoto': 'JAPAN',
    '교토': 'JAPAN',
    'osaka': 'JAPAN',
    '오사카': 'JAPAN',
    'tokyo': 'JAPAN',
    '도쿄': 'JAPAN',
    'fukuoka': 'JAPAN',
    '후쿠오카': 'JAPAN',
    'sapporo': 'JAPAN',
    '삿포로': 'JAPAN',
    'okinawa': 'JAPAN',
    '오키나와': 'JAPAN',
    'nagoya': 'JAPAN',
    '나고야': 'JAPAN',
    'kobe': 'JAPAN',
    '고베': 'JAPAN',
    'takamatsu': 'JAPAN',
    '다카마쓰': 'JAPAN',
    'matsuyama': 'JAPAN',
    '마쓰야마': 'JAPAN',
    'shizuoka': 'JAPAN',
    '시즈오카': 'JAPAN',
    'kagoshima': 'JAPAN',
    '가고시마': 'JAPAN',
    'kumamoto': 'JAPAN',
    '구마모토': 'JAPAN',
    'miyazaki': 'JAPAN',
    '미야자키': 'JAPAN',
    'oita': 'JAPAN',
    '오이타': 'JAPAN',
    'nagasaki': 'JAPAN',
    '나가사키': 'JAPAN',
    'saga': 'JAPAN',
    '사가': 'JAPAN',
    'paris': 'FRANCE',
    '파리': 'FRANCE',
    'nice': 'FRANCE',
    '니스': 'FRANCE',
    'lyon': 'FRANCE',
    '리옹': 'FRANCE',
    'london': 'UNITED KINGDOM',
    '런던': 'UNITED KINGDOM',
    'taipei': 'TAIWAN',
    '타이베이': 'TAIWAN',
    'taiwan': 'TAIWAN',
    '대만': 'TAIWAN',
    'kaohsiung': 'TAIWAN',
    '가오슝': 'TAIWAN',
    'new york': 'USA',
    '뉴욕': 'USA',
    'la': 'USA',
    'los angeles': 'USA',
    '로스앤젤레스': 'USA',
    'san francisco': 'USA',
    '샌프란시스코': 'USA',
    'seattle': 'USA',
    '시애틀': 'USA',
    'chicago': 'USA',
    '시카고': 'USA',
    'las vegas': 'USA',
    '라스베이거스': 'USA',
    'boston': 'USA',
    '보스턴': 'USA',
    'washington': 'USA',
    '워싱턴': 'USA',
    'guam': 'USA',
    '괌': 'USA',
    'saipan': 'USA',
    '사이판': 'USA',
    'bangkok': 'THAILAND',
    '방콕': 'THAILAND',
    'chiang mai': 'THAILAND',
    '치앙마이': 'THAILAND',
    'phuket': 'THAILAND',
    '푸켓': 'THAILAND',
    'pattaya': 'THAILAND',
    '파타야': 'THAILAND',
    'danang': 'VIETNAM',
    '다낭': 'VIETNAM',
    'hanoi': 'VIETNAM',
    '하노이': 'VIETNAM',
    'ho chi minh': 'VIETNAM',
    '호치민': 'VIETNAM',
    'saigon': 'VIETNAM',
    '사이공': 'VIETNAM',
    'nha trang': 'VIETNAM',
    '나트랑': 'VIETNAM',
    '냐짱': 'VIETNAM',
    'phu quoc': 'VIETNAM',
    '푸꾸옥': 'VIETNAM',
    'da lat': 'VIETNAM',
    '달랏': 'VIETNAM',
    'sapa': 'VIETNAM',
    '사파': 'VIETNAM',
    'hoi an': 'VIETNAM',
    '호이안': 'VIETNAM',
    'singapore': 'SINGAPORE',
    '싱가포르': 'SINGAPORE',
    'sydney': 'AUSTRALIA',
    '시드니': 'AUSTRALIA',
    'melbourne': 'AUSTRALIA',
    '멜버른': 'AUSTRALIA',
    'brisbane': 'AUSTRALIA',
    '브리즈번': 'AUSTRALIA',
    'rome': 'ITALY',
    '로마': 'ITALY',
    'florence': 'ITALY',
    '피렌체': 'ITALY',
    'firenze': 'ITALY',
    'venice': 'ITALY',
    '베네치아': 'ITALY',
    '베니스': 'ITALY',
    'milan': 'ITALY',
    '밀라노': 'ITALY',
    'barcelona': 'SPAIN',
    '바르셀로나': 'SPAIN',
    'sevilla': 'SPAIN',
    '세비야': 'SPAIN',
    'granada': 'SPAIN',
    '그라나다': 'SPAIN',
    'berlin': 'GERMANY',
    '베를린': 'GERMANY',
    'frankfurt': 'GERMANY',
    '프랑크푸르트': 'GERMANY',
    'vienna': 'AUSTRIA',
    '빈': 'AUSTRIA',
    '비엔나': 'AUSTRIA',
    'salzburg': 'AUSTRIA',
    '잘츠부르크': 'AUSTRIA',
    'prague': 'CZECHIA',
    '프라하': 'CZECHIA',
    'budapest': 'HUNGARY',
    '부다페스트': 'HUNGARY',
    'zurich': 'SWITZERLAND',
    '취리히': 'SWITZERLAND',
    'interlaken': 'SWITZERLAND',
    '인터라켄': 'SWITZERLAND',
    'seoul': 'SOUTH KOREA',
    '서울': 'SOUTH KOREA',
    'jeju': 'SOUTH KOREA',
    '제주': 'SOUTH KOREA',
    'busan': 'SOUTH KOREA',
    '부산': 'SOUTH KOREA',
    'incheon': 'SOUTH KOREA',
    '인천': 'SOUTH KOREA',
    'daegu': 'SOUTH KOREA',
    '대구': 'SOUTH KOREA',
    'daejeon': 'SOUTH KOREA',
    '대전': 'SOUTH KOREA',
    'gwangju': 'SOUTH KOREA',
    '광주': 'SOUTH KOREA',
    'ulsan': 'SOUTH KOREA',
    '울산': 'SOUTH KOREA',
    'suwon': 'SOUTH KOREA',
    '수원': 'SOUTH KOREA',
    'gyeongju': 'SOUTH KOREA',
    '경주': 'SOUTH KOREA',
    'gangneung': 'SOUTH KOREA',
    '강릉': 'SOUTH KOREA',
    'sokcho': 'SOUTH KOREA',
    '속초': 'SOUTH KOREA',
    'yeosu': 'SOUTH KOREA',
    '여수': 'SOUTH KOREA',
    'jeonju': 'SOUTH KOREA',
    '전주': 'SOUTH KOREA',
    'chuncheon': 'SOUTH KOREA',
    '춘천': 'SOUTH KOREA',
    'cebu': 'PHILIPPINES',
    '세부': 'PHILIPPINES',
    'boracay': 'PHILIPPINES',
    '보라카이': 'PHILIPPINES',
    'bohol': 'PHILIPPINES',
    '보홀': 'PHILIPPINES',
    'clark': 'PHILIPPINES',
    '클락': 'PHILIPPINES',
    'kuala lumpur': 'MALAYSIA',
    '쿠알라룸푸르': 'MALAYSIA',
    'kota kinabalu': 'MALAYSIA',
    '코타키나발루': 'MALAYSIA',
    'penang': 'MALAYSIA',
    '페낭': 'MALAYSIA',
    'bali': 'INDONESIA',
    '발리': 'INDONESIA',
    'jakarta': 'INDONESIA',
    '자카르타': 'INDONESIA',
    'macau': 'MACAU',
    '마카오': 'MACAU',
    'hong kong': 'HONG KONG',
    '홍콩': 'HONG KONG'
  };
  return CITY_TO_COUNTRY_MAP[cleanToken] || locationToken.toUpperCase();
}

// Parse dateRange: 'YYYY.MM.DD - YYYY.MM.DD'
function generateDateList(dateRangeStr: string): string[] {
  if (!dateRangeStr) return [];
  const parts = dateRangeStr.split(' - ');
  if (parts.length < 2) return [];
  
  const startStr = parts[0].trim().replace(/\./g, '-');
  const rawEndStr = parts[1].trim().replace(/\./g, '-');
  const startYear = startStr.split('-')[0];
  const endStr = rawEndStr.split('-').length < 3 ? `${startYear}-${rawEndStr}` : rawEndStr;
  
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return [];
  }
  
  if (endDate < startDate) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const list: string[] = [];
  const cursor = new Date(startDate);
  
  for (let i = 0; i < 100 && cursor <= endDate; i++) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    list.push(`${yyyy}.${mm}.${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  
  return list;
}

// Convert total minutes from midnight to "HH:MM AM/PM" format
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

// Convert "10:30 AM" or "15:30" into total minutes from midnight for sorting
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

// Autocomplete Input component using google.maps.places.Autocomplete widget
interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (placeName: string, coords: { lat: number; lng: number } | null, address: string) => void;
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
}

function PlaceAutocompleteInput({
  value,
  onChange,
  onSelectPlace,
  className,
  placeholder,
  onBlur
}: PlaceAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [localVal, setLocalVal] = useState(value);
  const hasSelectedRef = useRef(false);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onChange(localVal);
    }
  };

  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !google.maps || !google.maps.places || !inputRef.current) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address']
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      try {
        const place = autocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || place.formatted_address || '';
          const address = place.formatted_address || name;
          hasSelectedRef.current = true; // Mark selection in progress to prevent blur race condition
          setLocalVal(address);
          onSelectPlaceRef.current(name, { lat, lng }, address);
        }
      } catch (err) {
        console.error("Autocomplete select failed:", err);
      }
    });

    return () => {
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, []);

  const handleBlur = () => {
    // Delay the blur action slightly to allow the place_changed listener to run first
    setTimeout(() => {
      if (hasSelectedRef.current) {
        hasSelectedRef.current = false; // Reset the flag
        if (onBlur) onBlur();
      } else {
        onChange(localVal);
        if (onBlur) onBlur();
      }
    }, 250);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
        />
        <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-35" />
      </div>
    </div>
  );
}

// Date range picker parsing and formatting helpers
const parseDateRange = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return { start: '', end: '' };
  const parts = dateStr.split('-').map(p => p.trim());
  if (parts.length < 2) return { start: '', end: '' };
  
  const formatToInputDate = (d: string, yearFallback?: string) => {
    let normalized = d.replace(/\./g, '-').replace(/\s+/g, '');
    if (normalized.length === 5 && yearFallback) {
      normalized = `${yearFallback}-${normalized}`;
    }
    return normalized;
  };

  const startRaw = parts[0];
  const startYear = startRaw.slice(0, 4);
  const start = formatToInputDate(startRaw);
  const end = formatToInputDate(parts[1], startYear);
  return { start, end };
};

export function JourneyDetailPage({
  isLoggedIn,
  trip,
  timelineData,
  flights,
  stays,
  transits,
  onSave,
  onDelete,
  isDarkMode,
  onNavigate,
  searchFocusItemId,
  searchFocusTab,
  onClearSearchFocus,
  onEditModeChange,
  saveRef,
  allTrips = [],
  allPlans = [],
}: JourneyDetailPageProps) {
  // All hooks must be called before conditional return
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  // Progressive chunked rendering for gallery to ensure 0ms instant tab switching on mobile
  const [galleryRenderLimit, setGalleryRenderLimit] = useState<number>(24);

  useEffect(() => {
    if (activeTab === 'gallery') {
      setGalleryRenderLimit(24);
      const timer = setTimeout(() => {
        setGalleryRenderLimit(9999);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setGalleryRenderLimit(24);
    }
  }, [activeTab]);

  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [collapsedDays, setCollapsedDays] = useState<string[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Quick Switcher & Delete Confirm States
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [showTripDeleteConfirm, setShowTripDeleteConfirm] = useState(false);
  const [costModalItem, setCostModalItem] = useState<TimelineItem | null>(null);

  useEffect(() => {
    if (!isSwitcherOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSwitcherOpen]);

  useEffect(() => {
    if (!costModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCostModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [costModalItem]);

  const switcherJourneys = useMemo(() => {
    const list: Array<{ id: number; title: string; date: string; locationStr: string; img?: string; type: 'ARCHIVE' | 'PLAN' }> = [];
    (allTrips || []).forEach(t => {
      list.push({
        id: t.id,
        title: t.title || 'UNTITLED JOURNEY',
        date: t.date || '',
        locationStr: t.locationStr || '',
        img: t.img,
        type: 'ARCHIVE'
      });
    });
    (allPlans || []).forEach(p => {
      list.push({
        id: p.id,
        title: p.title || 'UNTITLED PLAN',
        date: p.date || '',
        locationStr: p.locationStr || '',
        img: p.img,
        type: 'PLAN'
      });
    });

    if (!switcherSearch.trim()) return list;
    const q = switcherSearch.toLowerCase().trim();
    return list.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.locationStr.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  }, [allTrips, allPlans, switcherSearch]);

  // Edit / Draft state
  const [isEditing, setIsEditing] = useState(false);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [draftTimeline, setDraftTimeline] = useState<TimelineItem[]>([]);
  const [draftFlights, setDraftFlights] = useState<FlightItem[]>([]);
  const [draftStays, setDraftStays] = useState<StayItem[]>([]);
  const [draftTransits, setDraftTransits] = useState<TransitItem[]>([]);
  
  // Refs to always hold the absolute latest draft values (bypasses stale React state closure issues in async callbacks/handlers)
  const draftTripRef = useRef(draftTrip);
  const draftTimelineRef = useRef(draftTimeline);
  const draftFlightsRef = useRef(draftFlights);
  const draftStaysRef = useRef(draftStays);
  const draftTransitsRef = useRef(draftTransits);

  useEffect(() => { draftTripRef.current = draftTrip; }, [draftTrip]);
  useEffect(() => { draftTimelineRef.current = draftTimeline; }, [draftTimeline]);
  useEffect(() => { draftFlightsRef.current = draftFlights; }, [draftFlights]);
  useEffect(() => { draftStaysRef.current = draftStays; }, [draftStays]);
  useEffect(() => { draftTransitsRef.current = draftTransits; }, [draftTransits]);

  const [transitSortType, setTransitSortType] = useState<'time' | 'type'>('time');
  const [mapConfirm, setMapConfirm] = useState<{ placeName: string; url: string } | null>(null);

  const handleCopyShareLink = () => {
    if (!trip) return;
    const shareUrl = `${window.location.origin}?id=${trip.id}&share=true`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert("공유 전용 링크가 클립보드에 복사되었습니다.");
      })
      .catch((err) => {
        console.error("공유 링크 복사 실패:", err);
        alert("링크 복사에 실패했습니다.");
      });
  };

  // Lightbox & Gallery state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGalleryDragActive, setIsGalleryDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'accordion'>('accordion');
  const [galleryColumns, setGalleryColumns] = useState<2 | 4>(4);
  const [collapsedGalleryDays, setCollapsedGalleryDays] = useState<string[]>([]);
  const [detailLocInput, setDetailLocInput] = useState('');
  
  // Autosave state
  const [showAutosaveModal, setShowAutosaveModal] = useState(false);
  const autosaveTimerRef = useRef<any>(null);

  // Multi-select & map visibilities state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [hiddenMapItemIds, setHiddenMapItemIds] = useState<number[]>([]);
  const [stayCoords, setStayCoords] = useState<{ [stayId: number]: { lat: number; lng: number } }>({});
  const [transitFocusType, setTransitFocusType] = useState<'depart' | 'arrive' | 'boarding' | null>(null);

  // Frequent places states
  const [frequentPlaces, setFrequentPlaces] = useState<{place: string, location: string, hours: string, lat: number, lng: number}[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('frequentPlaces') || '[]');
    } catch (_) {
      return [];
    }
  });
  const [activePlaceInputId, setActivePlaceInputId] = useState<number | null>(null);

  const tripToUse = isEditing ? draftTrip : trip;
  const defaultCurrency = useMemo(() => {
    return getDefaultCurrencyForLocation(tripToUse?.locationStr);
  }, [tripToUse?.locationStr]);
  const generatedDates = generateDateList(tripToUse?.date || '');
  const { start: minDate, end: maxDate } = parseDateRange(tripToUse?.date || '');
  const [airportGeocodedCoords, setAirportGeocodedCoords] = useState<{ [code: string]: { lat: number; lng: number } }>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  // ─── Cinematic Tour Mode ("Play Log") States & Logic ───
  const [isCinematicMode, setIsCinematicMode] = useState(false);
  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [isCinematicPaused, setIsCinematicPaused] = useState(false);
  const [cinematicSpeed, setCinematicSpeed] = useState<number>(3800); // ms per step
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const [isMobilePlayCollapsed, setIsMobilePlayCollapsed] = useState(true);

  // ─── Mobile Bottom Sheet States & Gesture Logic ───
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'half' | 'expanded'>('half');
  const sheetTouchStartYRef = useRef<number | null>(null);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);

  // ─── Log Play FAB Idle Transparency ───
  const [isPlayFabIdle, setIsPlayFabIdle] = useState(false);
  const playFabTimerRef = useRef<any>(null);

  const resetPlayFabIdleTimer = () => {
    setIsPlayFabIdle(false);
    if (playFabTimerRef.current) clearTimeout(playFabTimerRef.current);
    playFabTimerRef.current = setTimeout(() => {
      setIsPlayFabIdle(true);
    }, 3000);
  };

  useEffect(() => {
    resetPlayFabIdleTimer();
    return () => {
      if (playFabTimerRef.current) clearTimeout(playFabTimerRef.current);
    };
  }, [isCinematicMode]);

  // Flatten and sort timeline items for Cinematic Tour strictly by date & parsed time
  const cinematicItems = useMemo(() => {
    const rawItems = isEditing
      ? draftTimeline
      : Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );

    const items: (TimelineItem & { dateKey: string })[] = [];
    rawItems.forEach(item => {
      if (item.date && item.date.trim()) {
        items.push({ ...item, dateKey: item.date.trim() });
      }
    });

    // Sort strictly: date ascending, then time ascending, then ID
    return items.sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey.localeCompare(b.dateKey);
      }
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id - b.id;
    });
  }, [timelineData, draftTimeline, isEditing]);

  const currentCinematicItem = cinematicItems[cinematicIndex] || null;

  // Sync active step to timeline and map
  useEffect(() => {
    if (!isCinematicMode || !currentCinematicItem) return;
    setExpandedItemId(currentCinematicItem.id);
    setSelectedDate(currentCinematicItem.dateKey);

    // Smoothly scroll timeline item into view
    setTimeout(() => {
      const el = document.getElementById(`timeline-item-${currentCinematicItem.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [isCinematicMode, cinematicIndex, currentCinematicItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cinematic timer loop
  useEffect(() => {
    if (!isCinematicMode || isCinematicPaused || cinematicItems.length === 0) {
      return;
    }

    const interval = 50;
    const totalTicks = cinematicSpeed / interval;
    let currentTick = 0;
    setCinematicProgress(0);

    const timer = setInterval(() => {
      currentTick++;
      setCinematicProgress(Math.min(100, (currentTick / totalTicks) * 100));
      if (currentTick >= totalTicks) {
        currentTick = 0;
        setCinematicIndex(prev => (prev + 1) % cinematicItems.length);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isCinematicMode, isCinematicPaused, cinematicIndex, cinematicItems.length, cinematicSpeed]);

  // Turn off cinematic mode when user edits or changes tab away from timeline
  useEffect(() => {
    if (activeTab !== 'timeline' && isCinematicMode) {
      setIsCinematicMode(false);
    }
  }, [activeTab, isCinematicMode]);

  const handlePlayFromItem = (itemId: number) => {
    setActiveTab('timeline');
    const foundIdx = cinematicItems.findIndex(i => i.id === itemId);
    if (foundIdx !== -1) {
      setCinematicIndex(foundIdx);
    } else {
      setCinematicIndex(0);
    }
    setIsCinematicMode(true);
    setIsCinematicPaused(false);
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - sheetTouchStartYRef.current;
    sheetTouchStartYRef.current = null;

    if (deltaY < -35) {
      // Swiped UP -> expand sheet (minimize map)
      setMobileSheetSnap('expanded');
    } else if (deltaY > 35) {
      // Swiped DOWN -> return to standard half view
      setMobileSheetSnap('half');
    }
  };

  // Destination Local Time
  const [destLocalTime, setDestLocalTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        const country = (detectedCountry || tripToUse?.country || '').toUpperCase();
        let timeZone = 'Asia/Tokyo'; // Default JST
        if (country.includes('KOREA') || country.includes('한국')) timeZone = 'Asia/Seoul';
        else if (country.includes('JAPAN') || country.includes('일본')) timeZone = 'Asia/Tokyo';
        else if (country.includes('FRANCE') || country.includes('ITALY') || country.includes('GERMANY') || country.includes('SPAIN')) timeZone = 'Europe/Paris';
        else if (country.includes('UK') || country.includes('BRITAIN') || country.includes('LONDON')) timeZone = 'Europe/London';
        else if (country.includes('USA') || country.includes('AMERICA') || country.includes('US')) timeZone = 'America/New_York';
        else if (country.includes('THAILAND') || country.includes('BANGKOK') || country.includes('VIETNAM')) timeZone = 'Asia/Bangkok';
        else if (tripToUse?.lng !== undefined && tripToUse?.lng !== null) {
          const offsetHours = Math.round(tripToUse.lng / 15);
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const destDate = new Date(utc + (3600000 * offsetHours));
          const hours = String(destDate.getHours()).padStart(2, '0');
          const minutes = String(destDate.getMinutes()).padStart(2, '0');
          setDestLocalTime(`${hours}:${minutes}`);
          return;
        }

        const now = new Date();
        const formatted = new Intl.DateTimeFormat('ko-KR', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now);
        setDestLocalTime(formatted);
      } catch (e) {
        setDestLocalTime('');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [detectedCountry, tripToUse?.country, tripToUse?.lng]);
  // Scroll window and tab container to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (tabContentRef.current) {
      tabContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);


  useEffect(() => {
    if (!isEditing) {
      setSelectedItemIds([]);
    }
  }, [isEditing]);

  // Geocode stay addresses & restore from DB
  useEffect(() => {
    if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      staysToUse.forEach(async (stay) => {
        // If DB has coordinates, restore immediately
        if (stay.lat !== undefined && stay.lng !== undefined && stay.lat !== null && stay.lng !== null) {
          setStayCoords(prev => {
            if (prev[stay.id] && prev[stay.id].lat === stay.lat && prev[stay.id].lng === stay.lng) {
              return prev;
            }
            return {
              ...prev,
              [stay.id]: { lat: stay.lat!, lng: stay.lng! }
            };
          });
        } else if (stay.address && !stayCoords[stay.id] && stay.address !== '숙소 주소를 입력하세요') {
          try {
            const coords = await fetchCoordinates(stay.address);
            if (coords) {
              setStayCoords(prev => ({
                ...prev,
                [stay.id]: coords
              }));
            }
          } catch (e) {
            console.error("Geocoding stay failed:", e);
          }
        }
      });
    }
  }, [activeTab, draftStays, stays, isEditing]);

  // Geocode airports
  useEffect(() => {
    if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      flightsToUse.forEach((f) => {
        ['fromCode', 'toCode'].forEach(async (key) => {
          const code = (f as any)[key];
          if (code && !airportCoords[code] && !airportGeocodedCoords[code]) {
            try {
              const coords = await fetchCoordinates(`${code} Airport`);
              if (coords) {
                setAirportGeocodedCoords(prev => ({
                  ...prev,
                  [code]: coords
                }));
              }
            } catch (e) {
              console.error(`Geocoding airport ${code} failed:`, e);
            }
          }
        });
      });
    }
  }, [activeTab, draftFlights, flights, isEditing]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const scrollTargetItemIdRef = useRef<number | null>(null);
  const lastGalleryTapRef = useRef<{ [key: number]: number }>({});

  // 시간 변경 등으로 정렬 순서가 바뀌었을 때 해당 일정 편집 위치로 스크롤 이동
  useEffect(() => {
    if (scrollTargetItemIdRef.current !== null) {
      const targetId = scrollTargetItemIdRef.current;
      // 리렌더링 후 DOM 정렬 및 배치가 완료될 시간을 약간 주기 위해 setTimeout 사용
      setTimeout(() => {
        const element = itemRefs.current[targetId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      scrollTargetItemIdRef.current = null;
    }
  }, [draftTimeline]);

  const dateBarRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const hasMovedRef = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dateBarRef.current) return;
    isDown.current = true;
    hasMovedRef.current = false;
    startX.current = e.pageX - dateBarRef.current.offsetLeft;
    scrollLeftRef.current = dateBarRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
  };

  const handleMouseUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !dateBarRef.current) return;
    const x = e.pageX - dateBarRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      e.preventDefault();
      dateBarRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const scrollDays = (direction: 'left' | 'right') => {
    const container = dateBarRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    if (direction === 'right') {
      const nextChild = children.find(child => child.offsetLeft > container.scrollLeft + container.clientWidth - 5);
      if (nextChild) {
        container.scrollTo({ left: nextChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
      }
    } else {
      const prevChildren = children.filter(child => child.offsetLeft < container.scrollLeft - 5);
      if (prevChildren.length > 0) {
        const prevChild = prevChildren[prevChildren.length - 1];
        container.scrollTo({ left: prevChild.offsetLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
      }
    }
  };

  // Deep-linking search focus effect
  useEffect(() => {
    if (searchFocusTab) {
      setActiveTab(searchFocusTab as TabType);
      
      if (searchFocusTab === 'timeline' && searchFocusItemId) {
        const rawTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
        const item = rawTimeline.find(x => x.id === searchFocusItemId);
        if (item && item.date) {
          setSelectedDate(item.date);
        } else {
          setSelectedDate('ALL');
        }
      } else {
        setSelectedDate('ALL');
      }

      if (searchFocusItemId) {
        setExpandedItemId(searchFocusItemId);
        setTimeout(() => {
          if (itemRefs.current[searchFocusItemId]) {
            itemRefs.current[searchFocusItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      
      if (onClearSearchFocus) {
        onClearSearchFocus();
      }
    }
  }, [searchFocusTab, searchFocusItemId, timelineData, onClearSearchFocus]);

  // Note: We preserve timeline items' authentic dates and dynamically derive all days to avoid data corruption.

  // Dynamically resolve country name with coordinate geocoding fallback (for data efficiency and error prevention)
  useEffect(() => {
    let isMounted = true;
    const detect = async () => {
      if (!tripToUse) return;

      // 0. Prioritize manually entered country name from user (highest priority)
      if (tripToUse.country && tripToUse.country.trim()) {
        setDetectedCountry(tripToUse.country.trim().toUpperCase());
        return;
      }

      // 1. Prioritize locationsCountries from database (0 API traffic)
      const locationsCountries = tripToUse.locations
        ? Array.from(
            new Set(
              tripToUse.locations
                .map((l: any) => {
                  // If country is already stored (e.g. 'JAPAN'), use it directly
                  if (l.country) return l.country.trim().toUpperCase();
                  // Try to extract from name first
                  const extracted = extractCountry(l.name || '');
                  if (extracted && extracted !== (l.name || '').trim().toUpperCase()) {
                    return extracted;
                  }
                  // Otherwise, look up the city name in CITY_TO_COUNTRY_MAP
                  return getCountryName(l.name || '');
                })
                .filter((c: string) => Boolean(c) && c !== 'TRAVEL')
            )
          ) as string[]
        : [];

      if (locationsCountries.length > 0) {
        setDetectedCountry(locationsCountries.join(', '));
        return;
      }

      // 2. If empty, fallback to reverse geocoding the main lat/lng coordinates (Geocoding API)
      if (tripToUse.lat !== undefined && tripToUse.lng !== undefined && tripToUse.lat !== null && tripToUse.lng !== null) {
        try {
          const countryRaw = await fetchCountryFromCoords(tripToUse.lat, tripToUse.lng);
          if (countryRaw && isMounted) {
            const countryName = extractCountry(countryRaw) || countryRaw.toUpperCase();
            if (countryName && countryName !== 'TRAVEL') {
              setDetectedCountry(countryName);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to detect country from coordinates:", e);
        }
      }

      // 3. Worst-case fallback: string parsing on locationStr using the local dictionary map
      const loc = tripToUse.locationStr || '';
      const parts = loc.split(',').map(p => p.trim());
      const raw = parts.length >= 2 ? parts[parts.length - 1] : (parts[0] || 'TRAVEL');
      const extractedFallback = extractCountry(raw);
      const fallbackCountry = (extractedFallback && extractedFallback !== raw.toUpperCase())
        ? extractedFallback
        : getCountryName(raw);

      if (isMounted) {
        setDetectedCountry(fallbackCountry);
      }
    };

    detect();

    return () => {
      isMounted = false;
    };
  }, [tripToUse]);


  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (!draftTrip) return;
    const { start, end } = parseDateRange(draftTrip.date);
    
    const newStart = type === 'start' ? val : start;
    const newEnd = type === 'end' ? val : end;
    
    const formatFromInputDate = (d: string) => d.replace(/-/g, '.');
    
    if (newStart && newEnd) {
      const formattedStart = formatFromInputDate(newStart);
      let formattedEnd = formatFromInputDate(newEnd);
      
      const startYear = newStart.slice(0, 4);
      const endYear = newEnd.slice(0, 4);
      if (startYear === endYear && formattedEnd.startsWith(startYear + '.')) {
        formattedEnd = formattedEnd.slice(5); // removes "YYYY."
      }
      
      const oldDates = generateDateList(draftTrip.date);
      const newDateStr = `${formattedStart} - ${formattedEnd}`;

      setDraftTrip({
        ...draftTrip,
        date: newDateStr
      });

      const newDates = generateDateList(newDateStr);

      if (oldDates.length > 0 && newDates.length > 0) {
        setDraftTimeline(prev => 
          prev.map(item => {
            if (!item.date) return item;
            const idx = oldDates.indexOf(item.date);
            if (idx !== -1) {
              const newDateVal = newDates[Math.min(idx, newDates.length - 1)];
              return { ...item, date: newDateVal };
            }
            return item;
          })
        );
      }
    }
  };

  // Drag and Drop reorder helper
  const handleDropTimelineItem = (targetId: number) => {
    if (draggedItemId === null || draggedItemId === targetId) return;

    const flatTimeline = [...draftTimeline];
    const draggedIndex = flatTimeline.findIndex(item => item.id === draggedItemId);
    const targetIndex = flatTimeline.findIndex(item => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove item and insert at target
    const [draggedItem] = flatTimeline.splice(draggedIndex, 1);
    flatTimeline.splice(targetIndex, 0, draggedItem);

    // Recompute time for dragged item based on its new neighbors
    const prevItem = targetIndex > 0 ? flatTimeline[targetIndex - 1] : null;
    const nextItem = targetIndex < flatTimeline.length - 1 ? flatTimeline[targetIndex + 1] : null;

    let newTime = draggedItem.time;

    if (prevItem && nextItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      const nextMin = parseTimeToMinutes(nextItem.time);
      let midMin = Math.round((prevMin + nextMin) / 2);
      if (Math.abs(prevMin - nextMin) <= 1) {
        midMin = prevMin + 5;
      }
      newTime = minutesToTimeStr(midMin);
    } else if (prevItem) {
      const prevMin = parseTimeToMinutes(prevItem.time);
      newTime = minutesToTimeStr(prevMin + 60);
    } else if (nextItem) {
      const nextMin = parseTimeToMinutes(nextItem.time);
      newTime = minutesToTimeStr(Math.max(0, nextMin - 60));
    }

    draggedItem.time = newTime;
    
    // Ensure it belongs to the target item's date context
    const targetItem = flatTimeline.find(item => item.id === targetId);
    if (targetItem) {
      draggedItem.date = targetItem.date;
    }

    setDraftTimeline(flatTimeline);
    setDraggedItemId(null);
  };

  // Generate default timeline template for the entire journey duration
  const handleGenerateDefaultTemplate = () => {
    if (!draftTrip) return;
    if (draftTimeline.length > 0) {
      if (!window.confirm("기존의 모든 타임라인 일정이 초기화되고 기본 템플릿으로 대체됩니다. 진행하시겠습니까?")) {
        return;
      }
    }

    const dates = generatedDates;
    const totalDays = dates.length;
    const cityDisplay = (draftTrip.locationStr || '').split(',')[0].trim().toUpperCase() || 'CITY';

    const items: TimelineItem[] = [];
    dates.forEach((date, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === totalDays - 1;
      const baseId = Date.now() + idx * 100 + 1;

      let dayItems: any[] = [];
      if (isFirst && totalDays === 1) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착`,     cost: '-',   memo: '입국 심사 및 현지 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 관람`,     cost: '-',   memo: '현지 관광 일정', date },
          { id: baseId + 4, time: '07:00 PM', type: 'transit',  place: '귀국 공항 이동',           cost: '-',   memo: '공항 이동 및 탑승수속', date },
          { id: baseId + 5, time: '09:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else if (isFirst) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'transit',  place: '출국 공항 도착',          cost: '-',   memo: '탑승 수속 및 출국심사', date },
          { id: baseId + 1, time: '10:00 AM', type: 'transit',  place: '항공기 탑승 (출발)',       cost: '-',   memo: '항공편 출발', date },
          { id: baseId + 2, time: '12:00 PM', type: 'transit',  place: `${cityDisplay} 도착·입국`, cost: '-',   memo: '입국 심사 후 시내 이동', date },
          { id: baseId + 3, time: '02:00 PM', type: 'transit',  place: '시내 교통 이동',           cost: '-',   memo: '숙소까지 이동', date },
          { id: baseId + 4, time: '04:00 PM', type: 'stay',     place: '숙소 체크인',             cost: '-',   memo: '짐 풀고 휴식', date },
          { id: baseId + 5, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 식당 탐방', date },
        ];
      } else if (isLast) {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 근처 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'stay',     place: '숙소 체크아웃',           cost: '-',   memo: '체크아웃 후 짐 보관', date },
          { id: baseId + 2, time: '11:00 AM', type: 'activity', place: '출발 전 마지막 일정',      cost: '-',   memo: '기념품 구입 등', date },
          { id: baseId + 3, time: '01:00 PM', type: 'transit',  place: '공항 이동',               cost: '-',   memo: '공항 셔틀 또는 대중교통', date },
          { id: baseId + 4, time: '03:00 PM', type: 'transit',  place: '귀국 탑승수속·출국심사',  cost: '-',   memo: '면세점 쇼핑', date },
          { id: baseId + 5, time: '06:00 PM', type: 'transit',  place: '항공기 탑승 (귀국)',       cost: '-',   memo: '귀국 항공편 탑승', date },
        ];
      } else {
        dayItems = [
          { id: baseId,     time: '08:00 AM', type: 'dining',   place: '아침 식사',               cost: '-',   memo: '숙소 조식 또는 인근 카페', date },
          { id: baseId + 1, time: '10:00 AM', type: 'activity', place: `${cityDisplay} 오전 관람`, cost: '-',   memo: '주요 명소 방문', date },
          { id: baseId + 2, time: '12:30 PM', type: 'dining',   place: '점심 식사',               cost: '-',   memo: '현지 맛집 방문', date },
          { id: baseId + 3, time: '02:00 PM', type: 'activity', place: `${cityDisplay} 오후 일정`, cost: '-',   memo: '쇼핑, 카페, 문화 체험 등', date },
          { id: baseId + 4, time: '07:00 PM', type: 'dining',   place: '저녁 식사',               cost: '-',   memo: '현지 레스토랑 저녁', date },
          { id: baseId + 5, time: '09:30 PM', type: 'stay',     place: '숙소 복귀',               cost: '-',   memo: '숙소 휴식', date },
        ];
      }

      dayItems.forEach(di => {
        items.push({ ...di, tripId: draftTrip.id });
      });
    });

    setDraftTimeline(items);
  };

  // Set draft state when entering edit mode
  const handleStartEditing = () => {
    if (!trip) return;
    setDraftTrip({ ...trip });
    // Flatten current timelineData
    const flatTimeline = Object.entries(timelineData || {}).flatMap(([d, list]) => 
      (list || []).map(item => ({ ...item, date: item.date || d }))
    );
    setDraftTimeline(flatTimeline);
    setDraftFlights([...flights]);
    setDraftStays([...stays]);
    setDraftTransits([...transits]);
    setIsEditing(true);
    onEditModeChange?.(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    onEditModeChange?.(false);
    setDraftTrip(null);
    setDraftTimeline([]);
    setDraftFlights([]);
    setDraftStays([]);
    setDraftTransits([]);
  };

  const handleSave = async () => {
    if (!trip) return;

    // Force blur active input/textarea to trigger its onChange/composition commit
    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      document.activeElement.blur();
      // Give React/browser time to trigger events and run state updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!draftTripRef.current) return;

    setSaving(true);
    try {
      const latestTrip = draftTripRef.current;
      const latestTimeline = draftTimelineRef.current;
      const latestFlights = draftFlightsRef.current;
      const latestStays = draftStaysRef.current;
      const latestTransits = draftTransitsRef.current;

      // Geocode empty coordinates before saving
      const resolvedTimeline = await Promise.all(
        latestTimeline.map(async (item) => {
          if (
            (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null) &&
            item.location && item.location.trim() !== ''
          ) {
            try {
              const coords = await fetchCoordinates(item.location);
              if (coords) {
                return { ...item, lat: coords.lat, lng: coords.lng };
              }
            } catch (e) {
              console.error(`Geocoding failed for ${item.location} during save:`, e);
            }
          }
          return item;
        })
      );

      // Update draftTimeline with resolved coords so map pins show immediately
      setDraftTimeline(resolvedTimeline);

      await onSave(
        trip.id,
        latestTrip,
        resolvedTimeline,
        latestFlights,
        latestStays,
        latestTransits
      );
      setIsEditing(false);
      onEditModeChange?.(false);
      setIsBannerMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSave;
      return () => {
        saveRef.current = null;
      };
    }
  }, [handleSave, saveRef]);

  const triggerAutosave = async () => {
    if (!trip || !draftTrip) return;
    try {
      const resolvedTimeline = await Promise.all(
        draftTimeline.map(async (item) => {
          if (
            (item.lat === undefined || item.lng === undefined || item.lat === null || item.lng === null) &&
            item.location && item.location.trim() !== ''
          ) {
            try {
              const coords = await fetchCoordinates(item.location);
              if (coords) {
                return { ...item, lat: coords.lat, lng: coords.lng };
              }
            } catch (e) {
              console.error(`Geocoding failed for ${item.location} during autosave:`, e);
            }
          }
          return item;
        })
      );

      await onSave(
        trip.id,
        draftTrip,
        resolvedTimeline,
        draftFlights,
        draftStays,
        draftTransits
      );

      setShowAutosaveModal(true);
      setTimeout(() => {
        setShowAutosaveModal(false);
      }, 3000);
    } catch (e) {
      console.error("Autosave failed:", e);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      triggerAutosave();
    }, 5 * 60 * 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isEditing, draftTrip, draftTimeline, draftFlights, draftStays, draftTransits]);



  // Determine current timeline items (original or draft) preserving authentic item dates
  const baseTimeline = useMemo(() => {
    return isEditing
      ? draftTimeline
      : Object.entries(timelineData || {}).flatMap(([d, list]) => 
          (list || []).map(item => ({ ...item, date: item.date || d }))
        );
  }, [isEditing, draftTimeline, timelineData]);

  // Combine trip's date-range dates with any dates actually present in the timeline
  const allTripDates = useMemo(() => {
    const datesSet = new Set<string>(generatedDates);
    baseTimeline.forEach(item => {
      if (item.date && item.date.trim()) {
        datesSet.add(item.date.trim());
      }
    });
    return Array.from(datesSet).sort();
  }, [generatedDates, baseTimeline]);

  const dynamicDates = useMemo(() => [
    { id: 'all', date: 'ALL', label: 'ALL' },
    ...allTripDates.map((d) => ({
      id: d,
      date: d,
      label: d.slice(5).replace('.', '/')
    }))
  ], [allTripDates]);

  const groupedTimelineData = useMemo(() => {
    const map: { [date: string]: TimelineItem[] } = {};
    baseTimeline.forEach(item => {
      const d = item.date || 'No Date';
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    return map;
  }, [baseTimeline]);

  // Separate gallery: metadata gallery (from trip.gallery) and timeline images (from timeline items)
  // Normalize gallery entries: string → { url } object
  const galleryMetaImages = useMemo(() => {
    const rawGalleryEntries = tripToUse?.gallery || [];
    return rawGalleryEntries.map(entry =>
      typeof entry === 'string' 
        ? { url: getEffectiveImageUrl(entry) } 
        : { ...(entry as any), url: getEffectiveImageUrl((entry as any).url) }
    ) as { url: string; date?: string; time?: string; place?: string; imgNote?: string; lat?: number | null; lng?: number | null; excludeFromMap?: boolean }[];
  }, [tripToUse?.gallery]);

  const timelineImages = useMemo(() => {
    return baseTimeline
      .filter(item => item.img)
      .map(item => ({
        url: getEffectiveImageUrl(item.img as string),
        place: item.place,
        date: item.date || '',
        time: item.time || '',
        memo: item.memo,
        imgNote: item.imgNote || '',
        type: 'timeline' as const,
        itemId: item.id,
        lat: item.lat,
        lng: item.lng,
      }));
  }, [baseTimeline]);

  const allGalleryImages = useMemo(() => {
    const metas = galleryMetaImages.map((g, idx) => ({
      ...g,
      type: 'gallery' as const,
      id: 500000 + idx,
      time: g.time || ''
    }));

    const tls = timelineImages.map((t) => ({
      url: t.url,
      place: t.place,
      date: t.date,
      imgNote: t.imgNote || t.memo || '',
      type: 'timeline' as const,
      id: 600000000 + t.itemId,
      lat: t.lat,
      lng: t.lng,
      time: t.time || '',
      itemId: t.itemId,
      excludeFromMap: false
    }));

    const combined = [...metas, ...tls];
    const seenUrls = new Set<string>();
    const unique = combined.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    unique.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      
      if (dateA === dateB) {
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        return timeA - timeB;
      }
      
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const normalizedA = dateA.replace(/\./g, '-');
      const normalizedB = dateB.replace(/\./g, '-');
      return normalizedA.localeCompare(normalizedB);
    });

    return unique;
  }, [galleryMetaImages, timelineImages]);

  // Combined LightboxImageMeta array matching allGalleryImages sorting
  const galleryAllMeta = useMemo(() => {
    return allGalleryImages.map(item => ({
      url: item.url,
      place: item.place,
      date: item.date,
      imgNote: item.imgNote || '',
      type: item.type,
      memo: item.type === 'timeline' ? (item as any).memo : undefined
    }));
  }, [allGalleryImages]);

  // Fast O(1) Map for opening Lightbox immediately without findIndex array traversal
  const galleryUrlIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    galleryAllMeta.forEach((item, idx) => {
      map.set(item.url, idx);
    });
    return map;
  }, [galleryAllMeta]);

  const galleryGroups = useMemo(() => {
    const groups: { [date: string]: typeof allGalleryImages } = {};
    allTripDates.forEach(d => {
      groups[d] = [];
    });
    groups['NO_DATE'] = [];

    allGalleryImages.forEach(img => {
      const dVal = img.date || '';
      if (dVal && groups[dVal]) {
        groups[dVal].push(img);
      } else {
        groups['NO_DATE'].push(img);
      }
    });
    return groups;
  }, [allGalleryImages, allTripDates]);

  // Keep backward compat
  const galleryAllUnique = useMemo(() => {
    return galleryAllMeta.map(m => m.url);
  }, [galleryAllMeta]);

  const timelinePhotoPoints = useMemo(() => {
    const points: any[] = [];
    baseTimeline.forEach((item) => {
      if (item.img && item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) {
        const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
        points.push({
          id: 600000000 + item.id, // unique ID offset for timeline photo pins
          place: item.place || '일정 사진 위치',
          lat: Number(item.lat),
          lng: Number(item.lng),
          time: item.time || '12:00 PM',
          date: item.date || '',
          memo: item.imgNote || item.memo || '일정 사진',
          isPhoto: true,
          photoUrl: item.img,
          dayIndex
        });
      }
    });
    return points;
  }, [baseTimeline, allTripDates]);



  const filteredTimeline = selectedDate === 'ALL'
    ? baseTimeline
    : baseTimeline.filter(item => item.date === selectedDate);

  // Sort chronologically: by date, then by parsed time
  const currentTimeline = [...filteredTimeline].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id - b.id;
  });

  // Handle pending detail jump (e.g. from Magazine moment click on Home page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pending_detail_jump');
      if (raw) {
        localStorage.removeItem('pending_detail_jump');
        const parsed = JSON.parse(raw);
        if (parsed.tab === 'timeline') {
          setActiveTab('timeline');
          if (parsed.date) {
            setSelectedDate(parsed.date);
          } else {
            setSelectedDate('ALL');
          }
          setTimeout(() => {
            const allItems = Object.values(timelineData).flat();
            let match = null;
            if (parsed.imgUrl) {
              match = allItems.find(i => i.img === parsed.imgUrl);
            }
            if (!match && parsed.placeName) {
              match = allItems.find(i => i.place && i.place.includes(parsed.placeName));
            }
            if (!match && parsed.date) {
              match = allItems.find(i => i.date === parsed.date);
            }
            if (match) {
              setExpandedItemId(match.id);
              const el = itemRefs.current[match.id];
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 350);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, [trip?.id, timelineData]);

  // Global Keyboard Shortcuts (Space play/pause, ArrowLeft/Right tour, ArrowUp/Down timeline navigation, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. mapConfirm shortcut: Y (confirm) / N or Escape (cancel)
      if (mapConfirm) {
        if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setMapConfirm(null);
          return;
        }
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          e.preventDefault();
          window.open(mapConfirm.url, '_blank', 'noopener,noreferrer');
          setMapConfirm(null);
          return;
        }
      }

      // Escape: exit cinematic mode
      if (e.key === 'Escape') {
        if (isCinematicMode) {
          setIsCinematicMode(false);
          return;
        }
      }

      // 2. Ignore shortcut if user is currently typing in an input, textarea, select or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      );
      if (isInput) return;

      // 3. Space shortcut: Play / Pause toggle or start playback
      if (e.code === 'Space' || e.key === ' ') {
        if (cinematicItems.length === 0) return;
        e.preventDefault();
        if (!isCinematicMode) {
          setActiveTab('timeline');
          if (expandedItemId !== null) {
            const targetIdx = cinematicItems.findIndex(i => i.id === expandedItemId);
            setCinematicIndex(targetIdx !== -1 ? targetIdx : 0);
          } else {
            setCinematicIndex(0);
          }
          setIsCinematicMode(true);
          setIsCinematicPaused(false);
        } else {
          setIsCinematicPaused(prev => !prev);
        }
      }

      // 4. ArrowLeft / ArrowRight shortcut: Previous / Next spot in tour
      if (e.key === 'ArrowLeft') {
        if (isCinematicMode && cinematicItems.length > 0) {
          e.preventDefault();
          setCinematicIndex(prev => (prev - 1 + cinematicItems.length) % cinematicItems.length);
          setCinematicProgress(0);
        }
      } else if (e.key === 'ArrowRight') {
        if (isCinematicMode && cinematicItems.length > 0) {
          e.preventDefault();
          setCinematicIndex(prev => (prev + 1) % cinematicItems.length);
          setCinematicProgress(0);
        }
      }

      // 5. ArrowUp / ArrowDown shortcut: Navigate timeline items
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (currentTimeline.length > 0) {
          e.preventDefault();
          const currentIdx = currentTimeline.findIndex(item => item.id === expandedItemId);
          let targetIdx = 0;
          if (currentIdx === -1) {
            targetIdx = e.key === 'ArrowDown' ? 0 : currentTimeline.length - 1;
          } else {
            targetIdx = e.key === 'ArrowUp' ? currentIdx - 1 : currentIdx + 1;
            if (targetIdx < 0) targetIdx = 0;
            if (targetIdx >= currentTimeline.length) targetIdx = currentTimeline.length - 1;
          }
          const targetItem = currentTimeline[targetIdx];
          if (targetItem) {
            setExpandedItemId(targetItem.id);
            if (isCinematicMode && cinematicItems.length > 0) {
              const cIdx = cinematicItems.findIndex(i => i.id === targetItem.id);
              if (cIdx !== -1) {
                setCinematicIndex(cIdx);
                setCinematicProgress(0);
              }
            }
            setTimeout(() => {
              const el = itemRefs.current[targetItem.id];
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapConfirm, isCinematicMode, cinematicItems, expandedItemId, currentTimeline]);

  const mapPoints = (() => {
    // Collect gallery photo points that have valid coordinates
    const galleryMetaImages = (tripToUse?.gallery || []).map(img => {
      if (typeof img === 'string') return { url: img };
      return img;
    });

    const photoPoints: any[] = [];
    galleryMetaImages.forEach((imgMeta, idx) => {
      if (imgMeta.lat !== undefined && imgMeta.lng !== undefined && imgMeta.lat !== null && imgMeta.lng !== null) {
        if (imgMeta.excludeFromMap) return;
        const dayIndex = imgMeta.date ? allTripDates.indexOf(imgMeta.date) + 1 : 0;
        photoPoints.push({
          id: 500000 + idx, // unique ID offset for photo pins
          place: imgMeta.place || '사진 위치',
          lat: Number(imgMeta.lat),
          lng: Number(imgMeta.lng),
          time: imgMeta.time || '12:00 PM', // Fallback time if none
          date: imgMeta.date || '',
          memo: imgMeta.imgNote || '갤러리 사진',
          isPhoto: true,
          photoUrl: imgMeta.url,
          dayIndex
        });
      }
    });

    if (activeTab === 'timeline') {
      const timelinePoints = currentTimeline
        .filter(item => !item.excludeFromMap)
        .map(item => {
          const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
          return {
            ...item,
            lat: item.lat !== undefined && item.lat !== null ? Number(item.lat) : undefined,
            lng: item.lng !== undefined && item.lng !== null ? Number(item.lng) : undefined,
            dayIndex
          };
        });

      // Add photo points if they match the selectedDate (or ALL)
      const visiblePhotoPoints = photoPoints.filter(p => {
        if (selectedDate === 'ALL') return true;
        return p.date === selectedDate;
      });

      // Combine and sort by date first, then by time
      const combined = [...timelinePoints, ...visiblePhotoPoints];
      combined.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return combined;
    } else if (activeTab === 'gallery') {
      // Use the outer timelinePhotoPoints (which contains all photo points unfiltered)
      const allPhotoPoints = [...photoPoints, ...timelinePhotoPoints];
      // Do NOT filter by selectedDate. Keep "View All" on the map consistently.
      // Sort photos by date first, then by time to construct chronological photo paths
      allPhotoPoints.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      return allPhotoPoints;
    } else if (activeTab === 'flights') {
      const flightsToUse = isEditing ? draftFlights : flights;
      const flightPoints: any[] = [];
      flightsToUse.forEach(f => {
        const fromVal = airportCoords[f.fromCode] || airportGeocodedCoords[f.fromCode];
        const toVal = airportCoords[f.toCode] || airportGeocodedCoords[f.toCode];
        
        if (fromVal) {
          flightPoints.push({
            id: f.id * 10,
            place: f.fromCode,
            lat: fromVal.lat,
            lng: fromVal.lng,
            time: f.fromTime,
            memo: `${f.flightNo} Departure from ${f.fromCode}`
          });
        }
        if (toVal) {
          flightPoints.push({
            id: f.id * 10 + 1,
            place: f.toCode,
            lat: toVal.lat,
            lng: toVal.lng,
            time: f.toTime,
            memo: `${f.flightNo} Arrival at ${f.toCode}`
          });
        }
      });
      return flightPoints;
    } else if (activeTab === 'stays') {
      const staysToUse = isEditing ? draftStays : stays;
      const stayPoints: any[] = [];
      staysToUse.forEach(s => {
        const coords = stayCoords[s.id];
        if (coords) {
          stayPoints.push({
            id: s.id,
            place: s.title,
            lat: coords.lat,
            lng: coords.lng,
            time: '',
            memo: s.address
          });
        }
      });
      return stayPoints;
    } else if (activeTab === 'transit') {
      const transitsToUse = isEditing ? draftTransits : transits;
      const transitPoints: any[] = [];
      transitsToUse.forEach(t => {
        if (t.departLat !== undefined && t.departLng !== undefined) {
          transitPoints.push({
            id: t.id * 10,
            place: t.departPlace || 'Departure',
            lat: t.departLat,
            lng: t.departLng,
            time: t.time || '',
            memo: `${t.title || 'Transit'} - Departure from ${t.departPlace || ''}`,
            type: 'transit_depart',
            transitId: t.id,
            transitType: t.transitType || 'train'
          });
        }
        if (t.arriveLat !== undefined && t.arriveLng !== undefined) {
          transitPoints.push({
            id: t.id * 10 + 1,
            place: t.arrivePlace || 'Arrival',
            lat: t.arriveLat,
            lng: t.arriveLng,
            time: '',
            memo: `${t.title || 'Transit'} - Arrival at ${t.arrivePlace || ''}`,
            type: 'transit_arrive',
            transitId: t.id,
            transitType: t.transitType || 'train'
          });
        }

      });
      return transitPoints;
    }
    // summary 탭: 타임라인 전체 좌표를 마커로 전달해 지도에 도시 핀이 찍히도록
    if (activeTab === 'summary') {
      const allTimelinePoints = baseTimeline
        .filter(item => item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null && !item.excludeFromMap)
        .map(item => {
          const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
          return {
            ...item,
            lat: Number(item.lat),
            lng: Number(item.lng),
            dayIndex
          };
        });
      return allTimelinePoints;
    }
    return [];
  })();

  useEffect(() => {
    if (!dateBarRef.current) return;
    const activeBtn = dateBarRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDate]);

  // Early Return (conditional render)
  if (!trip) {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F9F8F6] dark:bg-[#111111] h-[80vh] text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
        Loading Journey Details...
      </div>
    );
  }

  const handleItemToggle = (id: number) => {
    let targetId = id;
    if (activeTab === 'flights' || activeTab === 'transit') {
      targetId = Math.floor(id / 10);
    }

    // Check if it's a gallery photo click or timeline photo click from the map
    if (targetId >= 500000 && targetId < 600000) {
      setActiveTab('gallery');
    } else if (targetId >= 600000000 && targetId < 700000000) {
      setActiveTab('gallery');
    }

    setExpandedItemId(prevId => prevId === targetId ? null : targetId);

    // Sync cinematic player spot if cinematic mode is active
    if (isCinematicMode && cinematicItems.length > 0) {
      const targetIdx = cinematicItems.findIndex(i => i.id === targetId);
      if (targetIdx !== -1) {
        setCinematicIndex(targetIdx);
        setCinematicProgress(0);
      }
    }

    if (expandedItemId !== targetId && itemRefs.current[targetId]) {
      setTimeout(() => {
        itemRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleJumpToTimelineItem = (itemId: number, date: string) => {
    setActiveTab('timeline');
    if (date) {
      setSelectedDate(date);
    } else {
      setSelectedDate('ALL');
    }
    setExpandedItemId(itemId);
    setTimeout(() => {
      const el = itemRefs.current[itemId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  const handleAddTimelineItemRelativeTo = (relativeId: number, position: 'above' | 'below') => {
    const sorted = [...currentTimeline];
    const targetIdx = sorted.findIndex(item => item.id === relativeId);
    if (targetIdx === -1) return;
    const targetItem = sorted[targetIdx];

    const targetMin = parseTimeToMinutes(targetItem.time);
    let newMin = targetMin;

    if (position === 'above') {
      const prevSameDay = targetIdx > 0 && sorted[targetIdx - 1].date === targetItem.date ? sorted[targetIdx - 1] : null;
      if (prevSameDay) {
        const prevMin = parseTimeToMinutes(prevSameDay.time);
        newMin = Math.round((prevMin + targetMin) / 2);
        if (Math.abs(prevMin - targetMin) <= 1) {
          newMin = targetMin - 5;
        }
      } else {
        newMin = targetMin - 30;
      }
    } else {
      const nextSameDay = targetIdx < sorted.length - 1 && sorted[targetIdx + 1].date === targetItem.date ? sorted[targetIdx + 1] : null;
      if (nextSameDay) {
        const nextMin = parseTimeToMinutes(nextSameDay.time);
        newMin = Math.round((targetMin + nextMin) / 2);
        if (Math.abs(targetMin - nextMin) <= 1) {
          newMin = targetMin + 5;
        }
      } else {
        newMin = targetMin + 60;
      }
    }

    newMin = Math.max(0, Math.min(1439, newMin));
    const newTimeStr = minutesToTimeStr(newMin);

    const newId = Date.now();
    const newItem: TimelineItem = {
      id: newId,
      time: newTimeStr,
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: targetItem.date,
      tripId: trip.id
    };

    setDraftTimeline(prev => {
      const copy = [...prev];
      const targetDraftIdx = copy.findIndex(item => item.id === relativeId);
      if (targetDraftIdx !== -1) {
        const insertIdx = position === 'above' ? targetDraftIdx : targetDraftIdx + 1;
        copy.splice(insertIdx, 0, newItem);
      } else {
        copy.push(newItem);
      }
      return copy;
    });

    setExpandedItemId(newId);

    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  // Draft update helpers
  const updateTimelineItem = (id: number, field: keyof TimelineItem, value: any) => {
    setDraftTimeline(prev => 
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  // Atomic multi-field update — avoids race condition when calling updateTimelineItem multiple times
  const updateTimelineItemFields = (id: number, fields: Partial<TimelineItem>) => {
    setDraftTimeline(prev =>
      prev.map(item => item.id === id ? { ...item, ...fields } : item)
    );
  };

  // Frequent places helpers
  const toggleFrequentPlace = (item: TimelineItem) => {
    const exists = frequentPlaces.some(p => p.place === item.place);
    let updated;
    if (exists) {
      updated = frequentPlaces.filter(p => p.place !== item.place);
    } else {
      updated = [
        ...frequentPlaces,
        {
          place: item.place,
          location: item.location || '',
          hours: item.hours || '',
          lat: item.lat !== undefined ? Number(item.lat) : 0,
          lng: item.lng !== undefined ? Number(item.lng) : 0
        }
      ];
    }
    setFrequentPlaces(updated);
    localStorage.setItem('frequentPlaces', JSON.stringify(updated));
  };

  const isFrequent = (place: string) => {
    return frequentPlaces.some(p => p.place === place);
  };

  const handleSelectFrequent = (item: TimelineItem, fp: typeof frequentPlaces[0]) => {
    updateTimelineItemFields(item.id, {
      place: fp.place,
      location: fp.location || '',
      hours: fp.hours || '',
      lat: fp.lat,
      lng: fp.lng
    });
    setActivePlaceInputId(null);
  };

  const handleToggleExcludeFromMap = async (item: TimelineItem) => {
    const newExclude = !item.excludeFromMap;
    if (isEditing) {
      updateTimelineItem(item.id, 'excludeFromMap', newExclude);
    } else {
      if (!isLoggedIn) {
        alert('로그인 후 지도의 표시 상태를 변경할 수 있습니다.');
        return;
      }
      try {
        const itemRef = doc(db, 'users', 'public', 'timeline', String(item.id));
        await setDoc(itemRef, { excludeFromMap: newExclude }, { merge: true });
      } catch (err) {
        console.error("Failed to update excludeFromMap in Firestore:", err);
      }
    }
  };

  const handleAddTimelineItem = (date: string) => {
    const newId = Date.now();

    // 해당 날짜의 기존 일정 중에서 가장 늦은 시간 계산하여 10분 뒤로 기본 지정
    const sameDateItems = (isEditing ? draftTimeline : baseTimeline).filter(item => item.date === date);
    let defaultTime = '12:00 PM';
    if (sameDateItems.length > 0) {
      const sortedTimes = sameDateItems
        .map(item => parseTimeToMinutes(item.time))
        .sort((a, b) => b - a); // 내림차순 정렬
      const maxMinutes = sortedTimes[0];
      const newMinutes = Math.min(1439, maxMinutes + 10);
      defaultTime = minutesToTimeStr(newMinutes);
    }

    const newItem: TimelineItem = {
      id: newId,
      time: defaultTime,
      type: 'activity',
      place: '새로운 장소',
      cost: '-',
      memo: '메모를 입력하세요',
      x: 50,
      y: 50,
      date: date,
      tripId: trip.id
    };
    setDraftTimeline(prev => [...prev, newItem]);
    setExpandedItemId(newId);

    // Scroll and focus newly added item
    setTimeout(() => {
      if (itemRefs.current[newId]) {
        itemRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const inputEl = document.getElementById(`title-input-${newId}`) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  };

  const handleDeleteTimelineItem = (id: number) => {
    setDraftTimeline(prev => prev.filter(item => item.id !== id));
  };

  const handleScrollToDateSection = (direction: 'up' | 'down') => {
    const sections = Array.from(document.querySelectorAll('[data-date-section]')) as HTMLElement[];
    if (sections.length === 0) return;

    const container = dateBarRef.current?.closest('.overflow-y-auto') || window;
    const containerTop = container === window ? 0 : (container as HTMLElement).getBoundingClientRect().top;

    let targetSection: HTMLElement | null = null;

    if (direction === 'down') {
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop > 10) {
          targetSection = section;
          break;
        }
      }
    } else {
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop < -10) {
          targetSection = section;
          break;
        }
      }
    }

    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Draft updates for custom cards
  const updateFlight = (id: number, field: keyof FlightItem, val: string) => {
    setDraftFlights(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };
  const deleteFlight = (id: number) => {
    setDraftFlights(prev => prev.filter(f => f.id !== id));
  };
  const handleAddFlight = (title: string) => {
    let defaultFrom = 'ICN';
    let defaultTo = 'KIX';
    let defaultFromTerminal = 'TERMINAL T1';
    let defaultToTerminal = 'TERMINAL T1';
    let defaultPnr = '000000';

    const outbound = draftFlights.find(f => f.title.toUpperCase().includes('OUTBOUND') || f.fromCode !== 'ICN');

    if (title.toUpperCase().includes('INBOUND') && outbound) {
      defaultFrom = outbound.toCode || 'KIX';
      defaultTo = outbound.fromCode || 'ICN';
      defaultFromTerminal = outbound.toTerminal || 'TERMINAL T1';
      defaultToTerminal = outbound.fromTerminal || 'TERMINAL T1';
      defaultPnr = outbound.pnr || '000000';
    } else if (title.toUpperCase().includes('OUTBOUND') && draftFlights.length > 0) {
      const inbound = draftFlights.find(f => f.title.toUpperCase().includes('INBOUND'));
      if (inbound) {
        defaultFrom = inbound.toCode || 'ICN';
        defaultTo = inbound.fromCode || 'KIX';
        defaultFromTerminal = inbound.toTerminal || 'TERMINAL T1';
        defaultToTerminal = inbound.fromTerminal || 'TERMINAL T1';
        defaultPnr = inbound.pnr || '000000';
      }
    } else if (title.toUpperCase().includes('LAYOVER') && draftFlights.length > 0) {
      // Chaining layover flight
      const sortedExisting = [...draftFlights].sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.fromTime || '').localeCompare(b.fromTime || '');
      });
      const lastFlight = sortedExisting[sortedExisting.length - 1];
      defaultFrom = lastFlight.toCode || 'ICN';
      defaultTo = lastFlight.fromCode || 'ICN';
      defaultFromTerminal = lastFlight.toTerminal || 'TERMINAL T1';
      defaultToTerminal = lastFlight.fromTerminal || 'TERMINAL T1';
      defaultPnr = lastFlight.pnr || '000000';
    }

    const newFlight: FlightItem = {
      id: Date.now(),
      title: title,
      date: 'YYYY.MM.DD',
      fromCode: defaultFrom,
      fromTerminal: defaultFromTerminal,
      fromTime: '08:00 AM',
      toCode: defaultTo,
      toTerminal: defaultToTerminal,
      toTime: '10:00 AM',
      flightNo: 'KE000',
      seat: '00A',
      pnr: defaultPnr,
      tripId: trip.id
    };
    setDraftFlights(prev => [...prev, newFlight]);
  };

  const updateStay = (id: number, field: keyof StayItem, val: any) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };
  const updateStayPlace = (id: number, address: string, coords: { lat: number; lng: number } | null) => {
    setDraftStays(prev => prev.map(s => s.id === id ? { 
      ...s, 
      address,
      lat: coords ? coords.lat : undefined,
      lng: coords ? coords.lng : undefined
    } : s));
    if (coords) {
      setStayCoords(prev => ({
        ...prev,
        [id]: coords
      }));
    }
  };
  const deleteStay = (id: number) => {
    setDraftStays(prev => prev.filter(s => s.id !== id));
  };
  const handleAddStay = () => {
    const newStay: StayItem = {
      id: Date.now(),
      status: 'BOOKING CONFIRMED',
      title: '새로운 숙소',
      dateRange: 'YYYY.MM.DD - YYYY.MM.DD (0 Nights)',
      address: '숙소 주소를 입력하세요',
      memo: '메모를 입력하세요',
      confNo: 'HTL-0000',
      img: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800&auto=format&fit=crop',
    };
    setDraftStays(prev => [...prev, newStay]);
  };

  const updateTransit = (id: number, fieldOrFields: keyof TransitItem | Partial<TransitItem>, val?: any) => {
    setDraftTransits(prev => prev.map(t => {
      if (t.id === id) {
        let updated = { ...t };
        if (typeof fieldOrFields === 'object') {
          updated = { ...updated, ...fieldOrFields };
        } else {
          updated = { ...updated, [fieldOrFields]: val };
        }
        
        // Sync ticketType and transitType
        if (typeof fieldOrFields === 'string') {
          if (fieldOrFields === 'ticketType') {
            const typeUpper = (val || '').toUpperCase();
            if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        } else {
          if ('ticketType' in fieldOrFields) {
            const typeUpper = (fieldOrFields.ticketType || '').toUpperCase();
            if (typeUpper.includes('BUS')) {
              updated.transitType = 'bus';
            } else if (typeUpper.includes('TAXI') || typeUpper.includes('CAR')) {
              updated.transitType = 'taxi';
            } else {
              updated.transitType = 'train';
            }
          }
        }
        return updated;
      }
      return t;
    }));
  };
  const deleteTransit = (id: number) => {
    setDraftTransits(prev => prev.filter(t => t.id !== id));
  };

  const updateExpenseItem = (
    itemType: 'timeline' | 'flight' | 'stay' | 'transit',
    id: number,
    field: string,
    value: any
  ) => {
    if (itemType === 'timeline') {
      updateTimelineItem(id, field as any, value);
    } else if (itemType === 'flight') {
      updateFlight(id, field as any, value);
    } else if (itemType === 'stay') {
      updateStay(id, field as any, value);
    } else if (itemType === 'transit') {
      updateTransit(id, field as any, value);
    }
  };
  const handleAddTransit = (type: 'train' | 'bus' | 'taxi') => {
    const ticketType = type === 'train' ? 'TRAIN TICKET' : type === 'bus' ? 'BUS TICKET' : 'TAXI TICKET';
    const title = type === 'train' ? 'Train' : type === 'bus' ? 'Bus' : 'Taxi';
    const route = type === 'taxi' ? '출발지 → 도착지' : '출발역 → 도착역';
    const bookingRef = type === 'train' ? 'TRN-000' : type === 'bus' ? 'BUS-000' : 'TX-000';
    const seat = type === 'taxi' ? 'N/A' : 'Car 0, 00A';

    const newTransit: TransitItem = {
      id: Date.now(),
      ticketType,
      transitType: type,
      date: 'YYYY.MM.DD',
      title,
      route,
      time: '12:00 PM',
      seat,
      bookingRef,
      memo: '',
    };
    setDraftTransits(prev => [...prev, newTransit]);
  };

  // Gallery actions with image compression + EXIF metadata extraction
  const processGalleryFiles = async (files: FileList | File[]) => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인 상태에서만 업로드할 수 있습니다.");
      return;
    }

    setUploadingImage(true);
    try {
      const newEntries: (string | { url: string; date?: string; place?: string })[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // 1. Extract EXIF BEFORE compressing (canvas strips metadata)
        const exif = await readExif(file);
        let exifDate: string | undefined;
        let exifTime: string | undefined;
        let exifPlace: string | undefined;

        if (exif.dateTime) {
          // Format YYYY:MM:DD HH:MM:SS → YYYY.MM.DD
          exifDate = exif.dateTime.slice(0, 10).replace(/:/g, '.');
          exifTime = exif.dateTime.slice(11, 16); // "HH:MM"
        }
        if (exif.latitude !== undefined && exif.longitude !== undefined) {
          try {
            const addr = await fetchAddressFromCoords(exif.latitude, exif.longitude);
            if (addr) exifPlace = addr;
          } catch (_) {/* silently ignore geocoding errors */}
        }

        // 2. Compress and upload
        const compressedBlob = await compressImage(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `users/public/gallery/${Date.now()}_${safeName}`;
        const url = await uploadFileToR2(compressedBlob, storagePath);

        // 3. Build GalleryImageMeta
        const defaultDate = allTripDates[0] || '';
        const finalDate = (exifDate && allTripDates.includes(exifDate)) ? exifDate : defaultDate;

        const newEntry = {
          url,
          date: finalDate,
          time: exifTime || '12:00 PM',
          place: exifPlace || '',
          lat: exif.latitude !== undefined ? exif.latitude : null,
          lng: exif.longitude !== undefined ? exif.longitude : null,
          imgNote: ''
        };
        
        newEntries.push(newEntry);
      }

      if (newEntries.length === 0) return;

      if (isEditing && draftTrip) {
        const currentGallery = draftTrip.gallery || [];
        setDraftTrip({ ...draftTrip, gallery: [...currentGallery, ...newEntries] });
      } else {
        const currentGallery = trip.gallery || [];
        const updatedGallery = [...currentGallery, ...newEntries];
        await onSave(
          trip.id,
          { ...trip, gallery: updatedGallery },
          baseTimeline,
          flights,
          stays,
          transits
        );
      }
    } catch (error) {
      console.error("Gallery image upload failed:", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processGalleryFiles(e.target.files);
    }
  };

  const handleGalleryDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggedIn) {
      setIsGalleryDragActive(true);
    }
  };

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragActive(false);

    if (isLoggedIn && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (filesArray.length > 0) {
        await processGalleryFiles(filesArray);
      } else {
        alert("이미지 파일만 업로드할 수 있습니다.");
      }
    }
  };

  // Update imgNote on a gallery (non-timeline) image
  const handleUpdateGalleryImageNote = (imageUrl: string, newNote: string) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return item === imageUrl ? { url: item, imgNote: newNote } : item;
        return item.url === imageUrl ? { ...item, imgNote: newNote } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    }
  };

  const handleWeatherChange = (date: string, type: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'stormy' | '', temp: string) => {
    if (!draftTrip) return;
    const currentWeatherData = draftTrip.weatherData || {};
    setDraftTrip({
      ...draftTrip,
      weatherData: {
        ...currentWeatherData,
        [date]: { type, temp }
      }
    });
  };

  const handleRemoveGalleryImage = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 이미지를 갤러리에서 삭제하시겠습니까?")) return;

    // Delete actual file from R2
    deleteFileFromR2(imageUrl);

    const filterGallery = (gallery: (string | any)[]) =>
      gallery.filter(item => {
        const itemUrl = typeof item === 'string' ? item : item.url;
        return itemUrl !== imageUrl;
      });

    if (isEditing && draftTrip) {
      const currentGallery = draftTrip.gallery || [];
      setDraftTrip({ ...draftTrip, gallery: filterGallery(currentGallery) });
    } else {
      const currentGallery = trip.gallery || [];
      const updatedGallery = filterGallery(currentGallery);
      await onSave(
        trip.id,
        { ...trip, gallery: updatedGallery },
        baseTimeline,
        flights,
        stays,
        transits
      );
    }
  };
    const handleToggleGalleryImagePin = async (imageUrl: string, exclude: boolean) => {
    const updateGallery = (gallery: (string | any)[]): (string | any)[] =>
      gallery.map(item => {
        if (typeof item === 'string') return { url: item, excludeFromMap: exclude };
        return item.url === imageUrl ? { ...item, excludeFromMap: exclude } : item;
      });

    if (isEditing && draftTrip) {
      setDraftTrip({ ...draftTrip, gallery: updateGallery(draftTrip.gallery || []) });
    } else {
      const currentGallery = trip.gallery || [];
      const updatedGallery = updateGallery(currentGallery);
      await onSave(
        trip.id,
        { ...trip, gallery: updatedGallery },
        baseTimeline,
        flights,
        stays,
        transits
      );
    }
  };

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

  // Render Info Header ("여정배너"): Single-line compact top banner with collapsible accordion menu
  const renderInfoHeader = () => (
    <div className="w-full border-b border-black/15 dark:border-white/15 z-20 bg-white dark:bg-[#0A0A0A] transition-colors shrink-0 select-none">
      {/* 1. Single-line Compact Banner (h-12 sm:h-13) */}
      <div className="flex items-center justify-between px-3 md:px-5 h-12 sm:h-13 gap-2">
        {/* Left: Back button + Divider + Issue badge + Title & Date */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => {
              onNavigate('archive');
            }}
            className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <span className="text-black/20 dark:text-white/20 shrink-0">|</span>

          {/* Issue # badge (minimalist) */}
          <span className="hidden md:inline-block bg-black/10 dark:bg-white/15 px-1.5 py-0.5 rounded-[2px] font-mono text-[8.5px] font-black text-black dark:text-white shrink-0">
            #{String((trip.displayOrder ?? (trip.id % 99)) + 1).padStart(2, '0')}
          </span>

          {/* Title & Date: 2-tier stacked on mobile, inline unclipped on web */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
            <h1 
              onClick={() => {
                setActiveTab(prev => prev === 'summary' ? 'timeline' : 'summary');
                setExpandedItemId(null);
              }}
              className="text-xs sm:text-sm font-black uppercase tracking-tight text-black dark:text-white truncate font-satoshi cursor-pointer hover:opacity-75 transition-opacity"
              title="클릭하여 여정 요약(Summary) 보기"
            >
              {(trip.title || '').replace(' (Plan)', '')}
            </h1>

            {/* Date & Destination summary - visible on mobile & web with high legibility */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-medium text-black/65 dark:text-white/65 min-w-0">
              <span className="hidden sm:inline text-black/25 dark:text-white/25">·</span>
              <span className="truncate sm:break-keep font-medium leading-tight">{generateJourneyMessage(trip.locationStr, trip.date, generatedDates.length)}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Accordion Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Destination Current Local Time Badge (Clean, no 'LOCAL' text) */}
          {destLocalTime && (
            <div className="hidden min-[480px]:flex items-center gap-1 px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono text-[9px] font-bold text-black/70 dark:text-white/70 border border-black/5 dark:border-white/5" title="현지 시각">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{destLocalTime}</span>
            </div>
          )}

          {/* Quick Journey Switcher Button */}
          <button
            onClick={() => {
              setIsSwitcherOpen(true);
              setSwitcherSearch('');
            }}
            className="p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60"
            title="다른 여정으로 바로 이동 (Quick Switcher)"
            aria-label="Switch journey"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>

          {/* Quick Summary Icon Button (Unified Icon on Web & Mobile) */}
          <button
            onClick={() => {
              setActiveTab(prev => prev === 'summary' ? 'timeline' : 'summary');
              setExpandedItemId(null);
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
              activeTab === 'summary'
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'
            }`}
            title="Summary View (요약 보기)"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Quick Edit / Done Icon Button (Unified Icon on Web & Mobile) */}
          {isLoggedIn && (
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  handleStartEditing();
                }
              }}
              disabled={saving}
              className={`p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center ${
                isEditing
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80'
              }`}
              title={isEditing ? "저장 완료 (Done)" : "여정 편집 (Edit)"}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />)}
            </button>
          )}

          {/* Accordion Menu Toggle Button */}
          <button
            onClick={() => setIsBannerMenuOpen(p => !p)}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              isBannerMenuOpen
                ? 'bg-black/10 dark:bg-white/15 text-red-600 dark:text-red-400'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/55 dark:text-white/55'
            }`}
            title="여정 상세 메뉴 토글"
            aria-label="Toggle banner menu"
          >
            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isBannerMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Accordion Dropdown Panel (Shown ONLY when isBannerMenuOpen) */}
      {isBannerMenuOpen && (
        <div className="border-t border-black/10 dark:border-white/10 bg-[#F4F2EC] dark:bg-[#161616] p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200 flex flex-col gap-3 shadow-inner">
          {/* Row 1: Title Input (in Edit mode) or Detailed Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {isEditing && draftTrip ? (
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold block mb-1">Journey Title</span>
                <input
                  type="text"
                  value={draftTrip.title}
                  onChange={(e) => setDraftTrip({ ...draftTrip, title: e.target.value })}
                  className="text-base sm:text-lg md:text-xl font-black uppercase bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/15 px-2.5 py-1 outline-none w-full text-black dark:text-white rounded font-satoshi"
                  placeholder="JOURNEY TITLE"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black uppercase text-black dark:text-white font-sans">
                  {trip.title}
                </span>
              </div>
            )}

            {/* Actions: Cost, Share, Delete */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <button
                onClick={() => {
                  setActiveTab(prev => prev === 'settlement' ? 'timeline' : 'settlement');
                  setExpandedItemId(null);
                }}
                className={`px-2.5 py-1 border rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'settlement'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
                }`}
                title="비용/정산 관리"
              >
                <DollarSign className="w-3 h-3" />
                <span>Cost</span>
              </button>

              <button
                onClick={handleCopyShareLink}
                className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
                title="공유 링크 복사"
              >
                <Share2 className="w-3 h-3" />
                <span>Share</span>
              </button>

              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[9px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {isEditing && (
                <button
                  onClick={() => setShowTripDeleteConfirm(true)}
                  className="px-2.5 py-1 border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  title="여정 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Dates & Destinations */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-[9px] sm:text-[10px] font-bold border-t border-black/10 dark:border-white/10 pt-2.5">
            {isEditing && draftTrip ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">Dates:</span>
                  <input
                    type="date"
                    value={parseDateRange(draftTrip.date).start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] text-black dark:text-white rounded border border-black/15 font-mono"
                  />
                  <span>—</span>
                  <input
                    type="date"
                    value={parseDateRange(draftTrip.date).end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 outline-none text-[10px] text-black dark:text-white rounded border border-black/15 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">Cities:</span>
                  <div className="flex flex-wrap items-center gap-1 border border-black/15 dark:border-white/15 p-1 bg-white/5 rounded flex-1">
                    {(draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : [])).map((loc, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-white dark:bg-[#222] text-[10px] font-bold px-1.5 py-0.5 border border-black/15 text-black dark:text-white rounded-sm">
                        {loc.name}
                        <button
                          type="button"
                          onClick={() => {
                            const currentLocs = draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : []);
                            const updated = currentLocs.filter((_, i) => i !== idx);
                            setDraftTrip({
                              ...draftTrip,
                              locations: updated,
                              locationStr: updated.map(l => l.name).join(', '),
                              lat: updated[0]?.lat,
                              lng: updated[0]?.lng
                            });
                          }}
                          className="text-red-500 font-bold hover:text-red-700 ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <div className="w-24 md:w-32">
                      <PlaceAutocompleteInput
                        value={detailLocInput}
                        onChange={(val) => setDetailLocInput(val)}
                        onSelectPlace={(name, coords) => {
                          if (name.trim()) {
                            const currentLocs = draftTrip.locations && Array.isArray(draftTrip.locations) ? draftTrip.locations : (draftTrip.locationStr ? [{ name: draftTrip.locationStr, lat: draftTrip.lat, lng: draftTrip.lng }] : []);
                            if (!currentLocs.some(loc => loc.name === name.trim())) {
                              const updated = [...currentLocs, { name: name.trim(), lat: coords?.lat, lng: coords?.lng }];
                              setDraftTrip({
                                ...draftTrip,
                                locations: updated,
                                locationStr: updated.map(l => l.name).join(', '),
                                lat: updated[0]?.lat,
                                lng: updated[0]?.lng
                              });
                            }
                            setDetailLocInput('');
                          }
                        }}
                        className="bg-transparent outline-none text-[8px] text-black dark:text-white w-full border-none px-1 py-0.5"
                        placeholder="+ City..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap text-black/60 dark:text-white/60">
                <span>🗓 {trip.date}</span>
                <span>•</span>
                <span>📍 {formatDestinations(trip.locationStr)}</span>
              </div>
            )}
          </div>

          {/* Row 3: Members & Tags */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 pt-2.5">
            {/* Members */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 font-bold shrink-0">👥 Members:</span>
              {isEditing && draftTrip ? (
                <div className="flex flex-wrap gap-1 items-center">
                  {(draftTrip.members || []).map(m => (
                    <span key={m} className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 border border-red-500/30 rounded text-black/75 dark:text-white/75 font-bold flex items-center gap-1 text-[10.5px]">
                      {m}
                      <button
                        type="button"
                        onClick={() => {
                          const newMembers = (draftTrip.members || []).filter(x => x !== m);
                          setDraftTrip({ ...draftTrip, members: newMembers });
                        }}
                        className="hover:text-red-500 text-red-600 font-bold text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Member"
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !(draftTrip.members || []).includes(val)) {
                          setDraftTrip({ ...draftTrip, members: [...(draftTrip.members || []), val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="text-[10px] font-bold border border-black/15 px-2 py-0.5 rounded-full bg-transparent outline-none w-20 focus:w-28 text-black dark:text-white"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {tripToUse?.members && tripToUse.members.length > 0 ? (
                    tripToUse.members.map(m => (
                      <span key={m} className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-black/75 dark:text-white/75 font-bold text-[10.5px]">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] font-medium text-black/50 dark:text-white/50 font-sans">나</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <main className="animate-in slide-in-from-right-8 duration-500 flex flex-col md:flex-row h-full w-full overflow-hidden">
      
      {/* Left: Map & Info Section (Responsive Height driven by mobileSheetSnap) */}
      <section 
        className={`w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20 relative transition-all duration-300 md:h-full shrink-0 ${
          mobileSheetSnap === 'expanded' ? 'max-md:h-[18dvh]' : 'max-md:h-[48dvh]'
        }`}
        onClick={() => {
          if (window.innerWidth < 768 && mobileSheetSnap === 'expanded') {
            setMobileSheetSnap('half');
          }
        }}
      >
        {renderInfoHeader()}
        
        {/* Dynamic Map Area */}
        <div className="w-full relative flex flex-col flex-grow h-full overflow-hidden">
          {/* Magazine Cover Typography Overlay (Only in Summary tab) */}
          {activeTab === 'summary' && (() => {
            const loc = tripToUse?.locationStr || '';
            const parts = loc.split(',').map(p => p.trim());
            const hasMultipleLocations = tripToUse?.locations && tripToUse.locations.length >= 2;
            const locationsCountries = tripToUse?.locations
              ? Array.from(new Set(
                  tripToUse.locations.map((l: any) => {
                    if (l.country) return l.country.trim().toUpperCase();
                    const extracted = extractCountry(l.name || '');
                    if (extracted && extracted !== (l.name || '').trim().toUpperCase()) {
                      return extracted;
                    }
                    return getCountryName(l.name || '');
                  }).filter((c: string) => Boolean(c) && c !== 'TRAVEL')
                )) as string[]
              : [];

            let country = 'TRAVEL';
            if (tripToUse?.country && tripToUse.country.trim()) {
              country = tripToUse.country.trim().toUpperCase();
            } else if (locationsCountries.length > 0) {
              country = locationsCountries.join(', ');
            } else {
              const rawCountry = parts.length >= 2 ? parts[parts.length - 1] : (parts[0] || 'TRAVEL');
              const extractedFallback = extractCountry(rawCountry);
              country = (extractedFallback && extractedFallback !== rawCountry.toUpperCase())
                ? extractedFallback
                : getCountryName(rawCountry);
            }
            const rawCity = hasMultipleLocations 
              ? tripToUse?.locations?.map(l => l.name).join(', ') 
              : (parts.length >= 2 ? parts[0] : (loc || 'JOURNEY'));
            const city = cleanAdministrativeDistricts(rawCity);
            
            return (
              <div className="absolute top-8 left-8 z-[20] flex flex-col pointer-events-none select-none text-black dark:text-white animate-in fade-in duration-300">
                <span className="text-[13px] sm:text-sm md:text-base font-black tracking-[0.25em] uppercase text-red-600 dark:text-red-500 mb-1 leading-none font-sans">
                  {detectedCountry || country}
                </span>
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.95] border-b-2 sm:border-b-4 border-black dark:border-white pb-2 max-w-[340px] sm:max-w-[480px] break-words font-sans text-black dark:text-white">
                  {city}
                </h2>
              </div>
            );
          })()}

          <ErrorBoundary fallback={
            <div className="flex-grow flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#111111] text-black/40 dark:text-white/40 p-6 relative h-full w-full">
              <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Map Temporary Unavailable</span>
              <img src={tripToUse?.mapImg || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600&auto=format&fit=crop'} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
            </div>
          }>
            <MapArea 
              trip={tripToUse!}
              isEditMode={isEditing}
              mapPoints={mapPoints}
              expandedItemId={expandedItemId}
              handleItemToggle={handleItemToggle}
              selectedDate={activeTab === 'gallery' ? 'ALL' : selectedDate}
              isDarkMode={isDarkMode}
              activeTab={activeTab}
              transitFocusType={transitFocusType}
              transits={isEditing ? draftTransits : transits}
              isCinematicMode={isCinematicMode}
            />
          </ErrorBoundary>

          {/* Floating Morphing Player (Circular FAB <-> Expanded Stadium Pill) */}
          {cinematicItems.length > 0 && (
            <div
              onMouseEnter={() => setIsPlayFabIdle(false)}
              onMouseLeave={resetPlayFabIdleTimer}
              onTouchStart={() => { setIsPlayFabIdle(false); resetPlayFabIdleTimer(); }}
              className={`absolute bottom-3 md:bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 z-30 rounded-full shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden pointer-events-auto flex items-center ${
                !isCinematicMode && isPlayFabIdle ? 'opacity-40 hover:opacity-100' : 'opacity-100'
              } ${
                isCinematicMode
                  ? 'w-[calc(100%-1.5rem)] max-w-[480px] h-13 sm:h-14 bg-black/90 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 sm:px-4 sm:py-2 justify-between gap-2.5'
                  : 'w-8 h-8 sm:w-8.5 sm:h-8.5 bg-red-600 hover:bg-red-700 border border-white/30 text-white p-0 hover:scale-105 active:scale-95 cursor-pointer justify-center group'
              }`}
            >
              {/* Collapsed State: Circular FAB Content */}
              {!isCinematicMode ? (
                <button
                  onClick={() => {
                    setActiveTab('timeline');
                    if (expandedItemId !== null) {
                      const targetIdx = cinematicItems.findIndex(i => i.id === expandedItemId);
                      setCinematicIndex(targetIdx !== -1 ? targetIdx : 0);
                    } else {
                      setCinematicIndex(0);
                    }
                    setIsCinematicMode(true);
                    setIsCinematicPaused(false);
                  }}
                  className="w-full h-full flex items-center justify-center cursor-pointer transition-opacity duration-300"
                  title="시네마틱 플레이로그 시작 (Space)"
                  aria-label="Play Log"
                >
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                  <span className="hidden group-hover:md:inline-block absolute bottom-full mb-2 px-2.5 py-1 bg-black/85 backdrop-blur-md text-white text-[9.5px] font-bold rounded-full whitespace-nowrap uppercase tracking-wider shadow-lg border border-white/10">
                    Play Log (Space)
                  </span>
                </button>
              ) : (
                /* Expanded State: Stadium Pill Content */
                currentCinematicItem && (
                  <div className="w-full h-full flex items-center justify-between gap-2.5 transition-opacity duration-300 animate-in fade-in">
                    {/* Mini Progress Bar along the bottom of the pill */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-75"
                        style={{ width: `${cinematicProgress}%` }}
                      />
                    </div>

                    {/* Spot info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {currentCinematicItem.img && (
                        <img
                          src={getEffectiveImageUrl(currentCinematicItem.img)}
                          alt={currentCinematicItem.place}
                          className="w-7 h-7 sm:w-8 sm:h-8 object-cover rounded-full shrink-0 border border-white/20 shadow-sm"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-red-600 text-white px-1.5 py-0.2 text-[7.5px] font-black uppercase rounded-full tracking-wider shrink-0">
                            DAY {allTripDates.indexOf(currentCinematicItem.dateKey) + 1}
                          </span>
                          {currentCinematicItem.time && (
                            <span className="text-[8.5px] font-mono text-amber-400 font-bold shrink-0">
                              {currentCinematicItem.time}
                            </span>
                          )}
                          <span className="text-[7.5px] font-mono text-white/50 shrink-0">
                            {cinematicIndex + 1}/{cinematicItems.length}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white tracking-tight truncate uppercase font-satoshi">
                          {currentCinematicItem.place || 'Spot'}
                        </h4>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setCinematicSpeed(s => s === 3800 ? 2200 : (s === 2200 ? 5500 : 3800))}
                        className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded-full text-white/80 text-[7.5px] font-mono transition-colors cursor-pointer"
                        title="속도 조절"
                      >
                        {cinematicSpeed === 3800 ? '1x' : (cinematicSpeed === 2200 ? '1.5x' : '0.7x')}
                      </button>

                      <button
                        onClick={() => {
                          setCinematicIndex(prev => (prev - 1 + cinematicItems.length) % cinematicItems.length);
                          setCinematicProgress(0);
                        }}
                        className="p-1 sm:p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                        title="이전 스팟 (←)"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setIsCinematicPaused(p => !p)}
                        className="p-1.5 bg-white text-black hover:bg-amber-400 rounded-full shadow transition-all active:scale-95 cursor-pointer"
                        title={isCinematicPaused ? '재생 (Space)' : '일시정지 (Space)'}
                      >
                        {isCinematicPaused ? <Play className="w-3 h-3 fill-current ml-0.5" /> : <Pause className="w-3 h-3 fill-current" />}
                      </button>

                      <button
                        onClick={() => {
                          setCinematicIndex(prev => (prev + 1) % cinematicItems.length);
                          setCinematicProgress(0);
                        }}
                        className="p-1 sm:p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                        title="다음 스팟 (→)"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setIsCinematicMode(false)}
                        className="p-1 sm:p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-0.5 cursor-pointer"
                        title="종료 (축소 / Esc)"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

      </section>
      
      {/* Right: Record / Tabs Section (Responsive Bottom Sheet on Mobile) */}
      <section 
        className={`w-full md:w-1/2 flex flex-col bg-white dark:bg-[#0A0A0A] transition-all duration-300 flex-grow md:h-full overflow-hidden ${
          mobileSheetSnap === 'expanded' ? 'max-md:h-[82dvh]' : 'max-md:h-[52dvh]'
        }`}
      >
        {/* Mobile Bottom Sheet Grab Handle */}
        <div 
          className="md:hidden flex flex-col items-center justify-center py-2 px-4 bg-white dark:bg-[#0A0A0A] border-b border-black/10 dark:border-white/10 cursor-pointer select-none touch-none shrink-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/grab"
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
          onClick={() => {
            setMobileSheetSnap(prev => prev === 'half' ? 'expanded' : 'half');
          }}
          title="지도/일정 분할 토글"
        >
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-black/25 dark:bg-white/25 group-hover/grab:bg-black/40 rounded-full transition-colors" />
            {mobileSheetSnap === 'expanded' ? (
              <ChevronDown className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
            )}
          </div>
        </div>
        
        {/* Tab Headers - Unified Single-line Sleek Design (SUM, TIME, FLIGHT, STAY, TRANS, PHOTO) */}
        <div className="flex overflow-x-hidden flex-nowrap border-b border-black/15 dark:border-white/15 bg-white dark:bg-[#0A0A0A] transition-colors shrink-0 w-full h-9 sm:h-10">
          {[ 
            { id: 'summary', label: 'SUM' },
            { id: 'timeline', label: 'TIME' }, 
            { id: 'flights', label: 'FLIGHT' }, 
            { id: 'stays', label: 'STAY' }, 
            { id: 'transit', label: 'TRANS' }, 
            { id: 'gallery', label: 'PHOTO' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setExpandedItemId(null);
              }} 
              className={`flex-1 h-full px-0.5 sm:px-2 flex items-center justify-center text-[10px] sm:text-[11px] md:text-xs font-black uppercase tracking-wider border-r border-black/15 dark:border-white/15 last:border-r-0 transition-colors whitespace-nowrap cursor-pointer font-sans select-none ${
                activeTab === tab.id 
                  ? 'bg-black text-white dark:bg-white dark:text-black font-black' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div 
          ref={tabContentRef}
          className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full h-full bg-white dark:bg-[#0A0A0A]"
        >
          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <SummaryView 
              trip={tripToUse!}
              timelineData={timelineData}
              flights={isEditing ? draftFlights : flights}
              stays={isEditing ? draftStays : stays}
              transits={isEditing ? draftTransits : transits}
              defaultCurrency={getDefaultCurrencyForLocation(tripToUse?.locationStr || '')}
              onSelectTab={(tab) => {
                setActiveTab(tab as TabType);
                setExpandedItemId(null);
              }}
            />
          )}
          
          {/* LOG TAB */}
          {activeTab === 'timeline' && (

            <div className="animate-in fade-in duration-300 h-auto flex flex-col w-full relative">
              {/* Day filter selector bar - Slim and Sticky */}
              <div className="sticky top-0 z-20 border-b border-black/15 dark:border-white/15 bg-white dark:bg-[#0A0A0A] transition-colors shrink-0 w-full flex items-center shadow-xs">
                {/* Scroll buttons for desktop/web */}
                <button 
                  onClick={() => scrollDays('left')}
                  className="absolute left-0 top-0 bottom-0 px-1.5 bg-gradient-to-r from-white via-white to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div 
                  ref={dateBarRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className="flex overflow-x-auto hide-scrollbar w-full scroll-smooth select-none cursor-grab active:cursor-grabbing px-5 h-9 sm:h-10"
                >
                  {dynamicDates.map((d) => {
                    const isAll = d.date === 'ALL';
                    const displayDate = isAll ? 'ALL' : d.date.slice(5).replace('.', '/');
                    return (
                      <button 
                        key={d.id} 
                        data-active={selectedDate === d.date}
                        onClick={() => { 
                          if (!hasMovedRef.current) {
                            setSelectedDate(d.date); 
                            setExpandedItemId(null); 
                          }
                        }} 
                        className={`flex-1 min-w-[58px] sm:min-w-[72px] md:min-w-[85px] h-full px-3 flex items-center justify-center border-r border-black/15 dark:border-white/15 last:border-r-0 transition-all whitespace-nowrap cursor-pointer font-['Inter',sans-serif] ${
                          selectedDate === d.date 
                            ? 'bg-black text-white dark:bg-white dark:text-black font-black shadow-xs' 
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white font-extrabold'
                        }`}
                      >
                        <span className="text-xs sm:text-[13px] font-black tracking-tight font-['Inter',sans-serif]">
                          {displayDate}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => scrollDays('right')}
                  className="absolute right-0 top-0 bottom-0 px-1.5 bg-gradient-to-l from-white via-white to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A] z-10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isLoggedIn && (
                <div className="bg-black/5 dark:bg-white/10 px-4 py-1.5 text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shrink-0 w-full">
                  <User className="w-3 h-3 shrink-0" /> <span className="truncate">로그인 후 기록을 수정하거나 새 일정을 추가할 수 있습니다.</span>
                </div>
              )}

              {/* Timeline Items List */}
              <div className="flex flex-col pb-20 w-full relative">
                {selectedDate === 'ALL' && currentTimeline.length > 0 && (
                  <div className="flex justify-end px-4 md:px-6 py-2 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 shrink-0 select-none">
                    <button
                      onClick={() => {
                        if (collapsedDays.length === allTripDates.length) {
                          setCollapsedDays([]);
                        } else {
                          setCollapsedDays([...allTripDates]);
                        }
                      }}
                      className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      {collapsedDays.length === allTripDates.length ? '▼ EXPAND ALL DAYS' : '▲ COLLAPSE ALL DAYS'}
                    </button>
                  </div>
                )}
                {isEditing && (
                  <div className="flex flex-col shrink-0 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 relative">
                    <div className="flex justify-between items-center py-3 px-4 md:px-6 flex-wrap gap-2">
                      <button
                        onClick={handleGenerateDefaultTemplate}
                        className="text-[10px] font-black uppercase tracking-widest border border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 transition-colors flex items-center gap-1.5"
                      >
                        Generate Default Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedItemIds.length === currentTimeline.length) {
                            setSelectedItemIds([]);
                          } else {
                            setSelectedItemIds(currentTimeline.map(item => item.id));
                          }
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-black/10 dark:border-white/10 px-3 py-1.5 transition-colors"
                      >
                        {selectedItemIds.length === currentTimeline.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {selectedItemIds.length > 0 && (
                      <div className="sticky top-0 z-20 flex justify-between items-center py-3 px-4 md:px-6 bg-red-600 text-white shadow-md transition-all animate-in slide-in-from-top duration-300">
                        <div className="text-xs font-bold uppercase tracking-widest">
                          {selectedItemIds.length} items selected
                        </div>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Move to:</span>
                          <select
                            onChange={(e) => {
                              const targetDate = e.target.value;
                              if (!targetDate) return;
                              
                              setDraftTimeline(prev => 
                                prev.map(item => {
                                  if (selectedItemIds.includes(item.id)) {
                                    return { ...item, date: targetDate };
                                  }
                                  return item;
                                })
                              );
                              
                              setSelectedItemIds([]);
                              setSelectedDate(targetDate);
                            }}
                            className="bg-white text-black text-[10px] font-bold p-1 outline-none border border-white/20 rounded-none w-28"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Day</option>
                            {allTripDates.map((d, index) => (
                              <option key={d} value={d}>Day {index + 1} ({d.slice(5).replace('.', '/')})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedItemIds([])}
                            className="text-[10px] font-bold uppercase tracking-widest hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentTimeline.length === 0 ? (
                  <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                    해당 날짜에 등록된 일정이 없습니다.
                  </div>
                ) : (
                  currentTimeline.map((item, idx) => {
                    const isActive = expandedItemId === item.id;
                    const showDivider = (selectedDate === 'ALL' && (idx === 0 || currentTimeline[idx - 1].date !== item.date)) || (selectedDate !== 'ALL' && idx === 0);
                    const dayIndex = item.date ? allTripDates.indexOf(item.date) + 1 : 0;
                    const isExcluded = !!item.excludeFromMap;
                    const dayColor = dayIndex > 0 ? dayColors[(dayIndex - 1) % dayColors.length] : undefined;
                    const weatherInfo = tripToUse?.weatherData?.[item.date || ''];
                    return (
                      <div key={item.id} className="w-full flex flex-col">
                        {showDivider && (
                          <div 
                            id={`date-section-${item.date}`}
                            data-date-section={item.date}
                            onClick={() => {
                              const dVal = item.date || '';
                              if (collapsedDays.includes(dVal)) {
                                setCollapsedDays(prev => prev.filter(d => d !== dVal));
                              } else {
                                setCollapsedDays(prev => [...prev, dVal]);
                              }
                            }}
                            className="bg-white dark:bg-[#0A0A0A] py-3.5 px-4 md:px-6 border-b border-t border-black/15 dark:border-white/15 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors select-none"
                          >
                            <div className="flex items-baseline gap-2.5 sm:gap-3.5">
                              <span className="text-3xl sm:text-4xl font-black font-satoshi tracking-tighter text-black dark:text-white leading-none">
                                {dayIndex < 10 ? `0${dayIndex}` : dayIndex}
                              </span>
                              <div className="flex flex-col text-left font-satoshi leading-tight">
                                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-black dark:text-white font-satoshi">
                                  DAY {dayIndex}
                                </span>
                                <span className="text-[11px] sm:text-xs font-mono font-bold text-black/65 dark:text-white/65 mt-0.5 tracking-wider">
                                  {item.date} {getDayOfWeek(item.date || '') ? `· ${getDayOfWeek(item.date || '')}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                  {/* Sunny */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'sunny', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'sunny' ? 'bg-orange-500 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Sunny (해)"
                                  >
                                    <Sun className="w-4 h-4" />
                                  </button>
                                  {/* Overcast */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'overcast', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'overcast' ? 'bg-slate-400 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Overcast (흐림)"
                                  >
                                    <Cloudy className="w-4 h-4" />
                                  </button>
                                  {/* Cloudy */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'cloudy', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'cloudy' ? 'bg-blue-400 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Cloudy (구름)"
                                  >
                                    <Cloud className="w-4 h-4" />
                                  </button>
                                  {/* Rainy */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'rainy', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'rainy' ? 'bg-indigo-400 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Rainy (비)"
                                  >
                                    <CloudRain className="w-4 h-4" />
                                  </button>
                                  {/* Snowy */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'snowy', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'snowy' ? 'bg-sky-400 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Snowy (눈)"
                                  >
                                    <Snowflake className="w-4 h-4" />
                                  </button>
                                  {/* Stormy */}
                                  <button
                                    type="button"
                                    onClick={() => handleWeatherChange(item.date || '', 'stormy', weatherInfo?.temp || '')}
                                    className={`p-1 rounded-xs transition-colors ${weatherInfo?.type === 'stormy' ? 'bg-red-500 text-white' : 'text-black/45 dark:text-white/45 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    title="Stormy (태풍)"
                                  >
                                    <CloudLightning className="w-4 h-4" />
                                  </button>
                                  {weatherInfo?.type && (
                                    <button
                                      type="button"
                                      onClick={() => handleWeatherChange(item.date || '', '', '')}
                                      className="text-[10px] font-bold text-red-500 dark:text-red-400 hover:underline px-1 font-mono"
                                    >
                                      CLEAR
                                    </button>
                                  )}
                                  {(() => {
                                    const parseMinMaxTemp = (tempStr: string) => {
                                      if (!tempStr) return { min: '', max: '' };
                                      const parts = tempStr.split('/');
                                      if (parts.length === 2) {
                                        const minVal = parts[0].replace(/[^0-9-]/g, '');
                                        const maxVal = parts[1].replace(/[^0-9-]/g, '');
                                        return { min: minVal, max: maxVal };
                                      }
                                      const cleanVal = tempStr.replace(/[^0-9-]/g, '');
                                      if (tempStr.startsWith('/')) {
                                        return { min: '', max: cleanVal };
                                      }
                                      return { min: cleanVal, max: '' };
                                    };
                                    const { min, max } = parseMinMaxTemp(weatherInfo?.temp || '');
                                    return (
                                      <div className="flex items-center gap-1 ml-1.5 font-mono">
                                        <input
                                          type="number"
                                          placeholder="Min"
                                          value={min}
                                          onChange={(e) => {
                                            const minNum = e.target.value;
                                            const newTemp = (minNum || max) ? `${minNum ? minNum + '°' : ''}/${max ? max + '°' : ''}` : '';
                                            handleWeatherChange(item.date || '', weatherInfo?.type || '', newTemp);
                                          }}
                                          className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-[10px] text-center font-bold outline-none text-black dark:text-white rounded-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-[10px] text-black/50 dark:text-white/50 font-bold">/</span>
                                        <input
                                          type="number"
                                          placeholder="Max"
                                          value={max}
                                          onChange={(e) => {
                                            const maxNum = e.target.value;
                                            const newTemp = (min || maxNum) ? `${min ? min + '°' : ''}/${maxNum ? maxNum + '°' : ''}` : '';
                                            handleWeatherChange(item.date || '', weatherInfo?.type || '', newTemp);
                                          }}
                                          className="w-9 md:w-10 bg-white dark:bg-black/20 border border-black/15 dark:border-white/15 px-1 py-0.5 text-[10px] text-center font-bold outline-none text-black dark:text-white rounded-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                weatherInfo && (weatherInfo.type || weatherInfo.temp) && (
                                  <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-black/85 dark:text-white/85 normal-case ml-2">
                                    {weatherInfo.type === 'sunny' && <Sun className="w-4 h-4 text-amber-500 shrink-0" />}
                                    {weatherInfo.type === 'overcast' && <Cloudy className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />}
                                    {weatherInfo.type === 'cloudy' && <Cloud className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />}
                                    {weatherInfo.type === 'rainy' && <CloudRain className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                                    {weatherInfo.type === 'snowy' && <Snowflake className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />}
                                    {weatherInfo.type === 'stormy' && <CloudLightning className="w-4 h-4 text-red-500 shrink-0" />}
                                    {weatherInfo.temp && <span className="text-black/80 dark:text-white/80">{weatherInfo.temp}</span>}
                                  </div>
                                )
                              )}
                            </div>
                            <span className="text-[10px] md:text-[11px] font-black font-mono text-black/45 dark:text-white/45 flex items-center gap-1 shrink-0">
                              {collapsedDays.includes(item.date || '') ? '▼ EXPAND' : '▲ COLLAPSE'}
                            </span>
                          </div>
                        )}
                        <div 
                          id={`timeline-item-${item.id}`}
                          ref={el => { itemRefs.current[item.id] = el; }} 
                          className={`flex flex-col border-b border-black/15 dark:border-white/15 transition-all w-full ${isActive ? 'bg-neutral-100 dark:bg-white/[0.08] border-l-[5px] border-l-red-600 dark:border-l-red-500' : 'border-l-[5px] border-l-transparent'} ${collapsedDays.includes(item.date || '') && selectedDate === 'ALL' ? 'hidden' : ''}`}
                          draggable={isEditing}
                          onDragStart={(e) => {
                            const target = e.target as HTMLElement;
                            // GripVertical 아이콘이 위치한 drag-handle 내부에서 드래그를 시작한 경우에만 드래그 허용
                            if (!target.closest('.drag-handle')) {
                              e.preventDefault();
                              return;
                            }
                            setDraggedItemId(item.id);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropTimelineItem(item.id)}
                        >
                          <div 
                            className="group flex flex-row items-stretch hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer relative w-full" 
                            onClick={() => handleItemToggle(item.id)}
                          >
                            <div className="flex-1 flex flex-row items-start py-4 px-4 md:py-5 md:px-6 min-w-0">
                            {/* Left Column: Fixed Width in BOTH view and edit mode (w-24 sm:w-28 md:w-32 shrink-0 pr-2.5) */}
                            {isEditing ? (
                              <div className="w-24 sm:w-28 md:w-32 shrink-0 pr-2.5 flex flex-col gap-1.5 text-[10px] md:text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                                {/* Compact action row: Grip, Checkbox, Trash (Swiss Minimal) */}
                                <div className="flex items-center justify-between w-full py-1 px-1.5 bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15">
                                  <div className="drag-handle cursor-grab active:cursor-grabbing text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white p-0.5" title="순서 이동">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItemIds(prev => [...prev, item.id]);
                                      } else {
                                        setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 border-black/20 text-red-600 cursor-pointer accent-red-600 rounded-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTimelineItem(item.id)}
                                    className="text-red-500 hover:text-red-700 p-0.5 transition-colors cursor-pointer"
                                    title="일정 삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <input
                                  type="time"
                                  value={timeStrTo24h(item.time)}
                                  onChange={(e) => {
                                    const val24h = e.target.value;
                                    if (!val24h) return;
                                    scrollTargetItemIdRef.current = item.id;
                                    updateTimelineItem(item.id, 'time', time24hTo12h(val24h));
                                  }}
                                  className="bg-black/5 dark:bg-white/10 px-1 py-1 outline-none font-mono font-bold text-[10px] md:text-xs text-black dark:text-white border border-black/15 dark:border-white/15 w-full text-center rounded-none"
                                />

                                <select
                                  value={item.date}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    scrollTargetItemIdRef.current = item.id;
                                    updateTimelineItem(item.id, 'date', newDate);
                                    setSelectedDate(newDate);
                                  }}
                                  className="bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/15 text-[9px] md:text-[10px] font-mono font-bold p-1 outline-none text-black dark:text-white w-full text-center rounded-none cursor-pointer"
                                >
                                  {allTripDates.map(d => (
                                    <option key={d} value={d}>{d.slice(5).replace('.', '/')}</option>
                                  ))}
                                </select>

                                {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) && (
                                  <button
                                    onClick={() => handleToggleExcludeFromMap(item)}
                                    className={`flex items-center justify-center py-1 border border-black/15 dark:border-white/15 text-[10px] font-mono font-bold w-full transition-colors rounded-none cursor-pointer ${
                                      isExcluded
                                        ? 'text-black/20 dark:text-white/20'
                                        : 'hover:opacity-80'
                                    }`}
                                    style={!isExcluded && dayColor ? { color: dayColor, borderColor: dayColor } : undefined}
                                    title={isExcluded ? "지도에 표시하기" : "지도에서 제외하기"}
                                  >
                                    {isExcluded ? <MapPinOff className="w-3 h-3 mr-0.5" /> : <MapPin className="w-3 h-3 mr-0.5" style={dayColor ? { color: dayColor } : undefined} />}
                                    <span>{isExcluded ? "OFF" : "ON"}</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className={`w-24 sm:w-28 md:w-32 shrink-0 pr-2.5 flex flex-col tracking-tight mt-0.5 transition-colors ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black/80 dark:text-white/80'}`}>
                                <div>
                                  {(() => {
                                    const match = (item.time || '').match(/^(\d{1,2}:\d{2})\s*(AM|PM)?$/i);
                                    if (match) {
                                      return (
                                        <div className="flex items-baseline gap-1 leading-none">
                                          <span className={`text-base sm:text-lg md:text-xl font-black font-satoshi tracking-tight leading-none ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                                            {match[1]}
                                          </span>
                                          {match[2] && (
                                            <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
                                              {match[2].toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    return (
                                      <span className={`text-base sm:text-lg md:text-xl font-black font-satoshi tracking-tight leading-none ${isActive ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                                        {item.time}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 h-6">
                                  {(item.lat !== undefined && item.lng !== undefined && item.lat !== null && item.lng !== null) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleExcludeFromMap(item)}
                                      className="p-1 hover:text-red-600 dark:hover:text-red-400 transition-colors select-none cursor-pointer"
                                      title={isExcluded ? "지도에 표시하기 (현재 OFF)" : "지도에서 제외하기 (현재 ON)"}
                                    >
                                      {isExcluded ? (
                                        <MapPinOff className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                                      ) : (
                                        <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-5 h-5" />
                                  )}

                                  {!isEditing && isActive ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayFromItem(item.id);
                                      }}
                                      className="w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 text-white shadow-sm flex items-center justify-center transition-all animate-in fade-in zoom-in-75 cursor-pointer shrink-0"
                                      title="여기서부터 시네마틱 재생 (Play Log)"
                                      aria-label="Play Log"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                                    </button>
                                  ) : (
                                    <div className="w-5 h-5" />
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex-grow pr-2 md:pr-4 min-w-0 overflow-hidden flex flex-col gap-1.5">
                              {/* 1. Title (제목) & Coin Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <div className={`font-bold text-sm md:text-base flex-1 min-w-0 flex items-center gap-2 ${isActive ? 'text-red-600 dark:text-red-400' : ''}`}>
                                  {isEditing ? (
                                    <TimelineItemPlaceInput
                                      itemId={item.id}
                                      initialValue={item.place}
                                      onUpdatePlace={(id, val) => updateTimelineItem(id, 'place', val)}
                                      frequentPlaces={frequentPlaces}
                                      onSelectFrequent={handleSelectFrequent}
                                      toggleFrequentPlace={toggleFrequentPlace}
                                      isFrequent={isFrequent}
                                      item={item}
                                    />
                                  ) : (
                                    <h3 className="break-keep font-sans font-bold text-sm sm:text-base text-black dark:text-white leading-snug tracking-normal">
                                      {item.place}
                                    </h3>
                                  )}
                                </div>

                                {/* Coin icon button in view mode if cost exists */}
                                {!isEditing && item.cost && item.cost !== '-' && item.cost.trim() !== '' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCostModalItem(item);
                                    }}
                                    className="p-1 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-110 transition-transform cursor-pointer shrink-0"
                                    title={`비용 확인: ${item.currency || 'KRW'} ${item.cost}`}
                                  >
                                    <Coins className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              
                              {/* 2. Place Input in Edit mode (Replaced subtitle memo with Place Autocomplete Input) */}
                              {isEditing ? (
                                <div className="w-full flex flex-col gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <PlaceAutocompleteInput
                                      value={item.location || ''}
                                      onChange={(val) => updateTimelineItemFields(item.id, { location: val, lat: undefined, lng: undefined })}
                                      onBlur={async () => {
                                        setTimeout(async () => {
                                          const latestTimeline = draftTimelineRef.current;
                                          const currentItem = latestTimeline.find((t: any) => t.id === item.id);
                                          if (!currentItem) return;
                                          if (
                                            currentItem.location &&
                                            currentItem.location.trim() !== '' &&
                                            (currentItem.lat === undefined || currentItem.lat === null || currentItem.lng === undefined || currentItem.lng === null)
                                          ) {
                                            const coords = await fetchCoordinates(currentItem.location);
                                            if (coords) {
                                              updateTimelineItemFields(currentItem.id, {
                                                lat: coords.lat,
                                                lng: coords.lng,
                                              });
                                            }
                                          }
                                        }, 300);
                                      }}
                                      onSelectPlace={(name, coords, address) => {
                                        updateTimelineItemFields(item.id, {
                                          location: name || address,
                                          lat: coords?.lat ?? item.lat,
                                          lng: coords?.lng ?? item.lng,
                                        });
                                      }}
                                      className="bg-black/5 dark:bg-white/10 px-2 py-1 outline-none text-xs text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full"
                                      placeholder="장소 지정 (예: 나리타공항, 도쿄 타워)"
                                    />
                                  </div>

                                  {/* Direct Cost Input in Edit Mode (No accordion needed) */}
                                  <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                                    <SettlementExpenseInput
                                      cost={item.cost}
                                      currency={item.currency}
                                      paidBy={item.paidBy}
                                      members={tripToUse?.members || []}
                                      isEditMode={isEditing}
                                      vertical={false}
                                      onUpdate={(updates) => {
                                        if (updates.cost !== undefined) updateTimelineItem(item.id, 'cost', updates.cost);
                                        if (updates.currency !== undefined) updateTimelineItem(item.id, 'currency', updates.currency);
                                        if (updates.paidBy !== undefined) updateTimelineItem(item.id, 'paidBy', updates.paidBy);
                                      }}
                                      defaultCurrency={defaultCurrency}
                                    />
                                  </div>
                                </div>
                              ) : (
                                /* View Mode: Location link below title */
                                item.location && item.location.trim() !== '' && (
                                  <div className="mt-0.5 flex items-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || '')}`;
                                        setMapConfirm({ placeName: item.location || '', url });
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-sans text-black/65 dark:text-white/65 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer group/loc not-italic"
                                      title="구글 지도에서 위치 확인"
                                    >
                                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover/loc:scale-110 transition-transform" />
                                      <span className="truncate max-w-[220px] sm:max-w-md font-medium">{item.location}</span>
                                    </button>
                                  </div>
                                )
                              )}

                              {/* Actions (Edit mode) - Swiss Minimal Icon Only Buttons */}
                              {isEditing && isActive && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    type="button"
                                    className="p-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors cursor-pointer" 
                                    title="위로 일정 추가"
                                    onClick={() => handleAddTimelineItemRelativeTo(item.id, 'above')}
                                  >
                                    <ArrowUp className="w-3.5 h-3.5"/>
                                  </button>
                                  <button 
                                    type="button"
                                    className="p-1 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-colors cursor-pointer" 
                                    title="아래로 일정 추가"
                                    onClick={() => handleAddTimelineItemRelativeTo(item.id, 'below')}
                                  >
                                    <ArrowDown className="w-3.5 h-3.5"/>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                            {/* Right Column: Full-Height 1:1 Edge-to-Edge Square Grid Thumbnail */}
                            {item.img ? (
                              <div 
                                className={`w-24 sm:w-28 md:w-32 aspect-square self-stretch shrink-0 overflow-hidden border-l transition-all relative rounded-none ${isActive ? 'border-l-[2px] border-l-red-600 dark:border-l-red-500' : 'border-black/15 dark:border-white/15'}`}
                                onClick={(e) => {
                                  if (!isEditing) {
                                    e.stopPropagation();
                                    setActiveTab('gallery');
                                    setExpandedItemId(600000000 + item.id);
                                    setTimeout(() => {
                                      const el = itemRefs.current[600000000 + item.id];
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 300);
                                  }
                                }}
                              >
                                <img src={getEffectiveImageUrl(item.img)} alt={item.place} className={`w-full h-full object-cover transition-all duration-300 ${isActive ? 'grayscale-0 scale-105' : 'grayscale group-hover:grayscale-0 group-hover:scale-105'}`} />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  hasImage={true}
                                  onImageRemoved={() => {
                                    updateTimelineItemFields(item.id, { img: '' });
                                  }}
                                  onImageUploaded={async (url, gps) => {
                                    if (gps) {
                                      let addr = '';
                                      try {
                                        addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                      updateTimelineItemFields(item.id, { 
                                        img: url, 
                                        lat: gps.lat, 
                                        lng: gps.lng,
                                        location: addr || item.location,
                                        place: addr ? addr.split(',')[0].trim() : item.place
                                      });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            ) : isEditing ? (
                              <div className={`w-24 sm:w-28 md:w-32 aspect-square self-stretch shrink-0 border-l bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center transition-colors relative rounded-none ${isActive ? 'border-red-600 dark:border-red-400 text-red-600' : 'border-black/15 dark:border-white/15'}`}>
                                <ImageIcon className="w-5 h-5 text-black/20 dark:text-white/20" />
                                <ImageEditOverlay 
                                  isEditMode={isEditing} 
                                  hasImage={false}
                                  onImageUploaded={async (url, gps) => {
                                    if (gps) {
                                      let addr = '';
                                      try {
                                        addr = await fetchAddressFromCoords(gps.lat, gps.lng) || '';
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                      updateTimelineItemFields(item.id, { 
                                        img: url, 
                                        lat: gps.lat, 
                                        lng: gps.lng,
                                        location: addr || item.location,
                                        place: addr ? addr.split(',')[0].trim() : item.place
                                      });
                                    } else {
                                      updateTimelineItemFields(item.id, { img: url });
                                    }
                                  }} 
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Add Timeline item button */}
                {isEditing && (
                  <div className="p-6 flex justify-center w-full">
                    <button 
                      onClick={() => handleAddTimelineItem(selectedDate === 'ALL' ? allTripDates[0] || '2025.04.12' : selectedDate)}
                      className="text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Timeline Event
                    </button>
                  </div>
                )}

                {selectedDate === 'ALL' && currentTimeline.length > 0 && (
                  <>
                    <button
                      onClick={() => handleScrollToDateSection('up')}
                      className="sticky top-2 right-2 ml-auto z-40 p-1.5 bg-black/80 hover:bg-black text-white dark:bg-white/80 dark:hover:bg-white dark:text-black rounded-full shadow-md transition-colors duration-200 pointer-events-auto shrink-0 w-8 h-8 flex items-center justify-center"
                      style={{ marginBottom: '-32px' }}
                      title="Scroll to Previous Day"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollToDateSection('down')}
                      className="sticky bottom-2 right-2 ml-auto mt-auto z-40 p-1.5 bg-black/80 hover:bg-black text-white dark:bg-white/80 dark:hover:bg-white dark:text-black rounded-full shadow-md transition-colors duration-200 pointer-events-auto shrink-0 w-8 h-8 flex items-center justify-center"
                      style={{ marginTop: '-32px' }}
                      title="Scroll to Next Day"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* FLIGHTS TAB */}
          {activeTab === 'flights' && (
            <div className="w-full flex flex-col animate-in fade-in duration-300">
              {(() => {
                const flightsToUse = isEditing ? draftFlights : flights;
                if (flightsToUse.length === 0) {
                  return (
                    <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                      등록된 항공편이 없습니다.
                    </div>
                  );
                }
                
                const sorted = [...flightsToUse].sort((a, b) => {
                  const dateCompare = (a.date || '').localeCompare(b.date || '');
                  if (dateCompare !== 0) return dateCompare;
                  return (a.fromTime || '').localeCompare(b.fromTime || '');
                });

                const getFlightGroup = (f: FlightItem): 'outbound' | 'inbound' => {
                  const fTitle = f.title.toUpperCase();
                  if (fTitle.includes('OUTBOUND')) return 'outbound';
                  if (fTitle.includes('INBOUND')) return 'inbound';
                  
                  if (minDate && maxDate && f.date && f.date !== 'YYYY.MM.DD') {
                    const startMs = new Date(minDate).getTime();
                    const endMs = new Date(maxDate).getTime();
                    const fDateStr = f.date.replace(/\./g, '-');
                    const fMs = new Date(fDateStr).getTime();
                    if (!isNaN(startMs) && !isNaN(endMs) && !isNaN(fMs)) {
                      const midMs = (startMs + endMs) / 2;
                      return fMs <= midMs ? 'outbound' : 'inbound';
                    }
                  }
                  return 'outbound';
                };

                const outbound = sorted.filter(f => getFlightGroup(f) === 'outbound');
                const inbound = sorted.filter(f => getFlightGroup(f) === 'inbound');

                const renderGroup = (groupFlights: FlightItem[], groupLabel: string) => {
                  if (groupFlights.length === 0) return null;
                  return (
                    <div className="w-full flex flex-col">
                      <div className="flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15">
                        <span className="text-[10px] md:text-xs uppercase font-black tracking-widest text-red-600 dark:text-red-400 font-mono">
                          {groupLabel}
                        </span>
                        <span className="text-[9px] md:text-[10px] font-mono font-bold text-black/40 dark:text-white/40 tracking-wider">
                          {groupFlights.length} FLIGHT{groupFlights.length > 1 ? 'S' : ''}
                        </span>
                      </div>
                      
                      {groupFlights.map((flight, idx) => {
                        const prevFlight = idx > 0 ? groupFlights[idx - 1] : null;
                        const layoverTimeStr = prevFlight 
                          ? calculateLayoverTime(prevFlight.date, prevFlight.toTime, flight.date, flight.fromTime)
                          : '';
                        
                        return (
                          <div 
                            ref={el => { itemRefs.current[flight.id] = el; }} 
                            key={flight.id}
                            className="w-full flex flex-col"
                          >
                            {prevFlight && layoverTimeStr && (
                              <div className="py-2 px-4 md:px-6 flex items-center justify-center bg-red-50/60 dark:bg-red-950/20 border-b border-red-500/20 w-full" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                  ✈️ Layover at {prevFlight.toCode} · {layoverTimeStr}
                                </span>
                              </div>
                            )}
                            <FlightCard 
                              flight={flight} 
                              isEditMode={isEditing} 
                              onUpdate={updateFlight} 
                              onDelete={deleteFlight} 
                              isActive={expandedItemId === flight.id}
                              minDate={minDate}
                              maxDate={maxDate}
                              onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                              onClick={() => {
                                setExpandedItemId(prev => prev === flight.id ? null : flight.id);
                              }}
                              members={tripToUse?.members || []}
                              defaultCurrency={defaultCurrency}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                };

                return (
                  <div className="flex flex-col w-full">
                    {renderGroup(outbound, 'Outbound Flights')}
                    {renderGroup(inbound, 'Inbound Flights')}
                  </div>
                );
              })()}
              
              {/* Add Flight controls */}
              {isEditing && (
                <div className="flex gap-4 justify-center py-6">
                  <button 
                    onClick={() => handleAddFlight('OUTBOUND FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Outbound Flight
                  </button>
                  <button 
                    onClick={() => handleAddFlight('LAYOVER FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Layover Flight
                  </button>
                  <button 
                    onClick={() => handleAddFlight('INBOUND FLIGHT')} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inbound Flight
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAYS TAB */}
          {activeTab === 'stays' && (
            <div className="w-full flex flex-col animate-in fade-in duration-300">
              {(isEditing ? draftStays : stays).length === 0 ? (
                <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 숙소 정보가 없습니다.
                </div>
              ) : (
                (isEditing ? draftStays : stays).map(stay => (
                  <div ref={el => { itemRefs.current[stay.id] = el; }} key={stay.id} className="w-full">
                    <StayCard 
                      stay={stay} 
                      isEditMode={isEditing} 
                      onUpdate={updateStay} 
                      onSelectPlace={updateStayPlace}
                      onDelete={deleteStay} 
                      isActive={expandedItemId === stay.id}
                      minDate={minDate}
                      maxDate={maxDate}
                      onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                      onClick={() => {
                        setExpandedItemId(prev => prev === stay.id ? null : stay.id);
                      }}
                      members={tripToUse?.members || []}
                      defaultCurrency={defaultCurrency}
                    />
                  </div>
                ))
              )}

              {/* Add Stay control */}
              {isEditing && (
                <div className="flex justify-center py-6">
                  <button 
                    onClick={handleAddStay} 
                    className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-6 py-2.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Accommodation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSIT TAB */}
          {activeTab === 'transit' && (
            <div className="w-full flex flex-col animate-in fade-in duration-300">
              {/* Sort Type Control */}
              <div className="w-full flex justify-end items-center gap-2 py-2 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15 text-[9px] md:text-[10px] font-bold uppercase tracking-widest select-none">
                <button 
                  onClick={() => setTransitSortType('time')} 
                  className={`px-2.5 py-1 border transition-colors rounded-sm cursor-pointer ${transitSortType === 'time' ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
                >
                  탑승시간순
                </button>
                <button 
                  onClick={() => setTransitSortType('type')} 
                  className={`px-2.5 py-1 border transition-colors rounded-sm cursor-pointer ${transitSortType === 'type' ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
                >
                  탑승종류순
                </button>
              </div>

              {(() => {
                const rawTransitList = isEditing ? draftTransits : transits;
                if (rawTransitList.length === 0) {
                  return (
                    <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                      등록된 교통편이 없습니다.
                    </div>
                  );
                }

                // YYYY.MM.DD 기본값인 티켓은 정렬 시 맨 하단으로 미는 정렬 헬퍼
                const sortTransits = (list: TransitItem[]) => {
                  return [...list].sort((a, b) => {
                    const isBasicA = !a.date || a.date === 'YYYY.MM.DD';
                    const isBasicB = !b.date || b.date === 'YYYY.MM.DD';
                    if (isBasicA && !isBasicB) return 1;
                    if (!isBasicA && isBasicB) return -1;
                    if (isBasicA && isBasicB) return a.id - b.id; // 생성순 (ID)

                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    if (dateA !== dateB) {
                      return dateA.localeCompare(dateB);
                    }
                    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
                  });
                };

                const transitList = sortTransits(rawTransitList);

                const renderGroup = (items: TransitItem[], label: string, IconComponent: any) => {
                  if (items.length === 0) return null;
                  return (
                    <div className="w-full flex flex-col">
                      <div className="flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          <span className="text-[10px] md:text-xs uppercase font-black tracking-widest text-red-600 dark:text-red-400 font-mono">
                            {label}
                          </span>
                        </div>
                        <span className="text-[9px] md:text-[10px] font-mono font-bold text-black/40 dark:text-white/40 tracking-wider">
                          {items.length} ITEM{items.length > 1 ? 'S' : ''}
                        </span>
                      </div>
                      <div className="flex flex-col w-full">
                        {items.map(transit => (
                          <div ref={el => { itemRefs.current[transit.id] = el; }} key={transit.id} className="w-full">
                            <TransitCard 
                              transit={transit} 
                              isEditMode={isEditing} 
                              onUpdate={updateTransit} 
                              onDelete={deleteTransit} 
                              isActive={expandedItemId === transit.id}
                              minDate={minDate}
                              maxDate={maxDate}
                              onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                              onClick={() => {
                                setExpandedItemId(prev => prev === transit.id ? null : transit.id);
                                setTransitFocusType(null);
                              }}
                              onFocusPlace={(type) => {
                                setExpandedItemId(transit.id);
                                setTransitFocusType(type);
                              }}
                              members={tripToUse?.members || []}
                              defaultCurrency={defaultCurrency}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                if (transitSortType === 'time') {
                  // 탑승시간순 정렬: Train/Bus/Taxi 묶지 않고 시간순으로 정렬된 전체 리스트를 하나의 그룹으로 렌더링
                  return (
                    <div className="flex flex-col text-left w-full">
                      {renderGroup(transitList, 'Transit Schedule', Train)}
                    </div>
                  );
                } else {
                  // 탑승종류순 정렬: 기존과 같이 Train / Bus / Taxi 분류
                  const trains = transitList.filter(t => t.transitType === 'train' || (!t.transitType || (t.transitType !== 'bus' && t.transitType !== 'taxi')));
                  const buses = transitList.filter(t => t.transitType === 'bus');
                  const taxis = transitList.filter(t => t.transitType === 'taxi');
                  return (
                    <div className="flex flex-col text-left w-full">
                      {renderGroup(trains, 'Train Tickets', Train)}
                      {renderGroup(buses, 'Bus Tickets', Bus)}
                      {renderGroup(taxis, 'Taxi/Car Tickets', Car)}
                    </div>
                  );
                }
              })()}

              {/* Add Transit control */}
              {isEditing && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <span className="text-[10px] md:text-[11px] text-black/50 dark:text-white/50 uppercase font-black tracking-widest font-sans break-keep">Add Transit Ticket (교통 티켓 추가)</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => handleAddTransit('train')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Train
                    </button>
                    <button 
                      onClick={() => handleAddTransit('bus')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Bus
                    </button>
                    <button 
                      onClick={() => handleAddTransit('taxi')} 
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Taxi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (() => {
            // Helper function to render a single gallery item
            const renderGalleryItem = (imgItem: typeof allGalleryImages[0], idx: number) => {
              const isPhotoActive = expandedItemId === imgItem.id;
              
              return (
                <div 
                  ref={el => { itemRefs.current[imgItem.id] = el; }}
                  key={`${imgItem.type}-${imgItem.url}-${idx}`} 
                  className={`flex flex-col group/gallery transition-all duration-300 relative border select-none ${
                    isPhotoActive 
                      ? 'bg-white dark:bg-[#161616] border-black dark:border-white ring-2 ring-black dark:ring-white shadow-2xl z-20 scale-[1.015] opacity-100' 
                      : (expandedItemId 
                          ? 'bg-white dark:bg-[#0E0E0E] border-black/10 dark:border-white/10 opacity-40 hover:opacity-85' 
                          : 'bg-white dark:bg-[#0E0E0E] border-black/10 dark:border-white/10 opacity-100 hover:border-black/30 dark:hover:border-white/30')
                  }`}
                >
                  {/* Film-photo styled image container */}
                  <div
                    className="relative overflow-hidden border-b border-black/10 dark:border-white/10 transition-all duration-300 cursor-pointer aspect-[4/3] group"
                    onClick={() => {
                      setExpandedItemId(prev => prev === imgItem.id ? null : imgItem.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const globalIdx = galleryUrlIndexMap.get(imgItem.url) ?? 0;
                      setLightboxIndex(globalIdx);
                      setExpandedItemId(imgItem.id);
                      setIsLightboxOpen(true);
                    }}
                  >
                    <img
                      src={imgItem.url}
                      alt={imgItem.place || 'Gallery Photo'}
                      loading="lazy"
                      decoding="async"
                      data-pin-nopin="true"
                      data-pin-no-hover="true"
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                    />

                    {/* Delete image button (only for gallery type) */}
                    {isLoggedIn && imgItem.type === 'gallery' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveGalleryImage(imgItem.url, e);
                        }}
                        className={`absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-red-600 text-white transition-colors z-10 rounded-none ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100'}`}
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Map Pin Toggle Button (only for gallery type if coords exist) */}
                    {imgItem.type === 'gallery' && imgItem.lat !== undefined && imgItem.lng !== undefined && imgItem.lat !== null && imgItem.lng !== null && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newExclude = !imgItem.excludeFromMap;
                          await handleToggleGalleryImagePin(imgItem.url, newExclude);
                          if (!newExclude) {
                            setExpandedItemId(imgItem.id);
                          }
                        }}
                        className={`absolute top-2 ${isLoggedIn ? 'right-9' : 'right-2'} p-1.5 transition-colors z-10 rounded-none ${!imgItem.excludeFromMap ? 'bg-orange-500 hover:bg-orange-600 text-white opacity-100' : (isPhotoActive ? 'bg-black/75 hover:bg-black text-white/50 hover:text-white opacity-100' : 'bg-black/75 hover:bg-black text-white/50 hover:text-white opacity-0 group-hover/gallery:opacity-100 focus:opacity-100')}`}
                        title={imgItem.excludeFromMap ? "지도에 핀 표시하기" : "지도에서 핀 숨기기"}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Maximize / Expand button to trigger lightbox (bottom-right) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const globalIdx = galleryUrlIndexMap.get(imgItem.url) ?? 0;
                        setLightboxIndex(globalIdx);
                        setIsLightboxOpen(true);
                      }}
                      className={`absolute bottom-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white transition-colors z-10 rounded-none ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100 focus:opacity-100'}`}
                      title="전체화면"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                  </div>

                  {/* Note / description area below image (Unified Single Body Swiss Style) */}
                  <div className={`px-3 py-2.5 flex flex-col gap-1 transition-colors ${
                    isPhotoActive ? 'bg-white dark:bg-[#161616]' : 'bg-white dark:bg-[#0E0E0E] text-black dark:text-white'
                  }`}>
                    {/* Top Meta: Date and Time (Black / White high contrast, no emojis) */}
                    {imgItem.date && (
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 not-italic">
                        <span>{imgItem.date}</span>
                        {imgItem.time && (
                          <>
                            <span className="text-black/30 dark:text-white/30">·</span>
                            <span>{imgItem.time}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Title / Description */}
                    <div className="flex items-start justify-between gap-2 w-full mt-0.5">
                      <div className="flex-1 min-w-0">
                        {/* 1. Main Title or Note (No timeline subtitle/memo) */}
                        {imgItem.imgNote ? (
                          <h4 className="text-xs sm:text-[13px] font-sans font-bold text-black dark:text-white leading-snug break-keep line-clamp-2 not-italic">
                            {imgItem.imgNote}
                          </h4>
                        ) : imgItem.type === 'gallery' && isEditing ? (
                          <input
                            type="text"
                            value={imgItem.imgNote || ''}
                            onChange={(e) => handleUpdateGalleryImageNote(imgItem.url, e.target.value)}
                            placeholder="사진 설명 추가..."
                            className="w-full bg-transparent outline-none text-xs sm:text-[13px] font-sans font-bold text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 not-italic border-b border-black/20 dark:border-white/20 pb-0.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : imgItem.place ? (
                          <h4 className="text-xs sm:text-[13px] font-sans font-bold text-black dark:text-white leading-snug break-keep line-clamp-2 not-italic">
                            {imgItem.place}
                          </h4>
                        ) : (
                          <p className="text-[10.5px] font-sans font-medium text-black/35 dark:text-white/35 not-italic">기록된 메모 없음</p>
                        )}

                        {/* 2. Specified Place Name right below title if different from main title */}
                        {imgItem.place && imgItem.imgNote && (
                          <div className="text-[10.5px] sm:text-xs font-sans font-semibold text-black/70 dark:text-white/70 tracking-tight flex items-center gap-1 mt-1 not-italic truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" />
                            <span className="truncate">{imgItem.place}</span>
                          </div>
                        )}
                      </div>

                      {/* Right action icons */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {(() => {
                          let targetItemId = imgItem.type === 'timeline' ? (imgItem as any).itemId : undefined;
                          const targetDate = imgItem.date || '';
                          
                          if (imgItem.type === 'gallery' && targetDate) {
                            const itemsForDate = timelineData[targetDate] || [];
                            if (itemsForDate.length > 0) {
                              targetItemId = itemsForDate[0].id;
                            }
                          }
                          
                          if (targetItemId !== undefined) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpToTimelineItem(targetItemId, targetDate);
                                }}
                                className="p-1 bg-black/5 dark:bg-white/5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black/60 dark:text-white/60 transition-colors cursor-pointer"
                                title="일정으로 이동"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div 
                className="w-full flex flex-col relative min-h-[400px] animate-in fade-in duration-300"
                onDragOver={handleGalleryDragOver}
                onDragLeave={handleGalleryDragLeave}
                onDrop={handleGalleryDrop}
              >
                {/* Drag & Drop Visual Overlay */}
                {isGalleryDragActive && isLoggedIn && (
                  <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center border-4 border-dashed border-red-600 m-2 transition-all">
                    <div className="text-white flex flex-col items-center gap-3">
                      <Plus className="w-12 h-12 animate-bounce text-red-500" />
                      <p className="text-sm md:text-base font-black tracking-widest uppercase text-center">
                        Drop images here to add to gallery
                      </p>
                      <p className="text-xs text-white/60">
                        이미지를 여기에 놓으면 갤러리에 즉시 추가됩니다
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Add Gallery Image Area */}
                {isLoggedIn && (
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                )}

                {/* Gallery View Mode & Column Toggle */}
                {allGalleryImages.length > 0 && (
                  <div className="w-full flex items-center justify-between gap-2 py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      {allGalleryImages.length} Photos
                    </span>
                    <div className="flex items-center gap-2">
                      {/* GRID / WIDE Toggle */}
                      <div className="flex border border-black/15 dark:border-white/15 p-0.5 bg-black/5 dark:bg-white/5 rounded-none">
                        <button
                          onClick={() => setGalleryColumns(4)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                            galleryColumns === 4
                              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                          }`}
                          title="Grid view (4 columns)"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>GRID</span>
                        </button>
                        <button
                          onClick={() => setGalleryColumns(2)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                            galleryColumns === 2
                              ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                          }`}
                          title="Wide view (2 columns)"
                        >
                          <Columns2 className="w-3.5 h-3.5" />
                          <span>WIDE</span>
                        </button>
                      </div>

                      {/* DATE / TIME Toggle */}
                      <div className="flex border border-black/10 dark:border-white/10 p-0.5 bg-black/5 dark:bg-white/5">
                        <button
                          onClick={() => setGalleryViewMode('accordion')}
                          className={`px-2.5 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            galleryViewMode === 'accordion'
                              ? 'bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-sm'
                              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          DATE
                        </button>
                        <button
                          onClick={() => setGalleryViewMode('grid')}
                          className={`px-2.5 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            galleryViewMode === 'grid'
                              ? 'bg-white dark:bg-[#1a1a1a] text-black dark:text-white shadow-sm'
                              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          TIME
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {allGalleryImages.length === 0 ? (
                  <div className="text-center py-16 text-black/40 dark:text-white/40 text-xs md:text-sm font-bold tracking-widest uppercase">
                    등록된 갤러리 사진이 없습니다.
                  </div>
                ) : galleryViewMode === 'accordion' ? (() => {
                  let renderedCount = 0;
                  return (
                    <div className="flex flex-col w-full">
                      {/* Date Accordions */}
                      {allTripDates.map((date, idx) => {
                        const items = galleryGroups[date] || [];
                        const isCollapsed = collapsedGalleryDays.includes(date);
                        if (items.length === 0) return null;

                        const visibleItems = items.filter(() => {
                          if (renderedCount < galleryRenderLimit) {
                            renderedCount++;
                            return true;
                          }
                          return false;
                        });

                        return (
                          <div key={date} className="w-full border-b border-black/15 dark:border-white/15">
                            <button
                              onClick={() => {
                                if (isCollapsed) {
                                  setCollapsedGalleryDays(prev => prev.filter(d => d !== date));
                                } else {
                                  setCollapsedGalleryDays(prev => [...prev, date]);
                                }
                              }}
                              className="w-full flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] text-[10px] sm:text-xs font-black uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-black">DAY {idx + 1}</span>
                                <span className="text-black/30 dark:text-white/30">·</span>
                                <span className="font-mono text-black/70 dark:text-white/70">{date}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-black/50 dark:text-white/50 tracking-wider">
                                {items.length} PHOTOS {isCollapsed ? '▼' : '▲'}
                              </span>
                            </button>
                            {!isCollapsed && visibleItems.length > 0 && (
                              <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-[1px]' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[1px]'} bg-black/15 dark:bg-white/15 border-b border-black/15 dark:border-white/15`}>
                                {visibleItems.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* No Date Accordion */}
                      {galleryGroups['NO_DATE'] && galleryGroups['NO_DATE'].length > 0 && (() => {
                        const items = galleryGroups['NO_DATE'];
                        const isCollapsed = collapsedGalleryDays.includes('NO_DATE');
                        const visibleItems = items.filter(() => {
                          if (renderedCount < galleryRenderLimit) {
                            renderedCount++;
                            return true;
                          }
                          return false;
                        });

                        return (
                          <div className="w-full border-b border-black/15 dark:border-white/15">
                            <button
                              onClick={() => {
                                if (isCollapsed) {
                                  setCollapsedGalleryDays(prev => prev.filter(d => d !== 'NO_DATE'));
                                } else {
                                  setCollapsedGalleryDays(prev => [...prev, 'NO_DATE']);
                                }
                              }}
                              className="w-full flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] text-[10px] sm:text-xs font-black uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                            >
                              <span className="font-black">NO DATE</span>
                              <span className="text-[10px] font-mono font-bold text-black/50 dark:text-white/50 tracking-wider">
                                {items.length} PHOTOS {isCollapsed ? '▼' : '▲'}
                              </span>
                            </button>
                            {!isCollapsed && visibleItems.length > 0 && (
                              <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-[1px]' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[1px]'} bg-black/15 dark:bg-white/15 border-b border-black/15 dark:border-white/15`}>
                                {visibleItems.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })() : (
                  /* Timeline Grid View */
                  <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-[1px]' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[1px]'} bg-black/15 dark:bg-white/15 border-b border-black/15 dark:border-white/15`}>
                    {allGalleryImages.slice(0, galleryRenderLimit).map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                  </div>
                )}
                {/* Gallery footer */}
                <div className="w-full shrink-0 mt-12">
                  <Footer className="mt-0" />
                </div>
              </div>
            );
          })()}

          {/* SETTLEMENT TAB */}
          {activeTab === 'settlement' && (
            <SettlementView
              isLoggedIn={isLoggedIn}
              trip={tripToUse!}
              timelineData={groupedTimelineData}
              flights={isEditing ? draftFlights : flights}
              stays={isEditing ? draftStays : stays}
              transits={isEditing ? draftTransits : transits}
              isEditing={isEditing}
              onUpdateMembers={(newMembers) => {
                if (isEditing && draftTrip) {
                  setDraftTrip({ ...draftTrip, members: newMembers });
                }
              }}
              onJumpToItem={(itemType, id, date) => {
                setActiveTab(itemType);
                setExpandedItemId(id);
                if (date) {
                  setSelectedDate(date);
                }
                setTimeout(() => {
                  const el = itemRefs.current[id];
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
              defaultCurrency={defaultCurrency}
              onUpdateExpense={updateExpenseItem}
              onUpdateCustomExpenses={(items) => {
                if (isEditing && draftTrip) {
                  setDraftTrip({ ...draftTrip, customExpenses: items });
                } else if (trip) {
                  // Save immediately even outside editing mode
                  const updated = { ...tripToUse!, customExpenses: items };
                  const uid = auth.currentUser?.uid || 'public';
                  setDoc(doc(db, 'users', uid, 'trips', String(trip.id)), { customExpenses: items }, { merge: true })
                    .catch(e => console.error('Failed to save custom expenses:', e));
                }
              }}
            />
          )}

          {/* Footer inside Detail scroll container */}
          {activeTab !== 'settlement' && activeTab !== 'gallery' && (
            <div className="w-full shrink-0">
              <Footer className="mt-12" />
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen Lightbox component */}
      <Lightbox 
        isOpen={isLightboxOpen}
        images={galleryAllMeta}
        currentIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />

      {/* Autosave Feedback Toast Modal */}
      {showAutosaveModal && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 shadow-2xl border border-emerald-500/20 rounded-sm font-bold text-xs uppercase tracking-wider flex items-center gap-2 animate-bounce animate-in slide-in-from-bottom-5 duration-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>자동 저장되었습니다. (Autosaved)</span>
        </div>
      )}

      {/* Google Maps Confirmation Modal */}
      {mapConfirm && (
        <div 
          onClick={() => setMapConfirm(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 p-5 md:p-6 w-full max-w-xs text-center shadow-2xl rounded-2xl text-black dark:text-white"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-black/50 dark:text-white/50 mb-1.5">구글 지도 이동</h3>
            <p className="text-xs font-bold tracking-tight mb-5 leading-relaxed break-keep" style={{ wordBreak: 'keep-all' }}>
              '<span className="text-red-600 dark:text-red-400">{mapConfirm.placeName}</span>' 위치를 구글 지도에서 확인하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMapConfirm(null)}
                className="flex-1 py-2 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                취소 (N)
              </button>
              <a
                href={mapConfirm.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMapConfirm(null)}
                className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-sm"
              >
                이동 (Y)
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Quick Journey Switcher Modal */}
      {isSwitcherOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsSwitcherOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#141414] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-black dark:text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-black/15 dark:border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest font-sans">
                  SWITCH JOURNEY
                </span>
              </div>
              <button 
                onClick={() => setIsSwitcherOpen(false)}
                className="p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-2">
              <Search className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
              <input
                type="text"
                autoFocus
                value={switcherSearch}
                onChange={(e) => setSwitcherSearch(e.target.value)}
                placeholder="여정 제목, 도시, 국가 검색..."
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-medium text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
              />
              {switcherSearch && (
                <button 
                  onClick={() => setSwitcherSearch('')}
                  className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Journey List */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/10 dark:divide-white/10">
              {switcherJourneys.length > 0 ? (
                switcherJourneys.map((item) => {
                  const isCurrent = trip && item.id === trip.id;
                  const itemImg = getEffectiveImageUrl(item.img);
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        if (!isCurrent) {
                          onNavigate('detail', item.id);
                        }
                      }}
                      className={`w-full flex items-stretch text-left transition-colors cursor-pointer group hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                        isCurrent ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {/* 1:1 Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 aspect-square bg-black/5 dark:bg-white/5 border-r border-black/10 dark:border-white/10 relative overflow-hidden">
                        {itemImg ? (
                          <img src={itemImg} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-black/20 dark:text-white/20 text-xs font-mono">
                            NO IMG
                          </div>
                        )}
                        <span className="absolute top-1 left-1 text-[8px] font-mono font-bold px-1 py-0.2 bg-black/70 text-white rounded-none">
                          {item.type}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-2.5 sm:p-3 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs sm:text-sm font-black truncate font-sans ${isCurrent ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'}`}>
                            {item.title}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] font-bold px-1 py-0.2 bg-red-600 text-white shrink-0">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-black/50 dark:text-white/50 font-mono truncate mt-0.5">
                          {item.date || 'DATE TBD'} {item.locationStr ? `· ${item.locationStr}` : ''}
                        </div>
                      </div>

                      {/* Right indicator */}
                      <div className="px-3 flex items-center text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4 -translate-x-1 group-hover:translate-x-0 transition-transform" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-black/40 dark:text-white/40 font-sans">
                  검색 결과와 일치하는 여정이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showTripDeleteConfirm}
        title="DELETE JOURNEY"
        message="정말 이 여정을 완전히 삭제하시겠습니까? 기록된 타임라인, 항공, 숙소, 교통 데이터가 모두 영구 삭제됩니다."
        confirmLabel="YES [Y]"
        cancelLabel="NO [N]"
        onConfirm={async () => {
          setShowTripDeleteConfirm(false);
          if (trip && onDelete) {
            await onDelete(trip.id);
          }
        }}
        onCancel={() => setShowTripDeleteConfirm(false)}
      />

      {/* Swiss Minimal Timeline Cost Detail Modal */}
      {costModalItem && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setCostModalItem(null)}
        >
          <div 
            className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col gap-5 text-black dark:text-white rounded-none select-none relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-black dark:border-white pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
                  EXPENSE DETAIL · 비용 상세
                </span>
                <h3 className="text-base sm:text-lg font-black font-sans tracking-tight break-keep mt-0.5">
                  {costModalItem.place}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCostModalItem(null)}
                className="p-1 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white hover:rotate-90 transition-all cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cost Display: Large Swiss Minimal Typography */}
            <div className="flex flex-col gap-1 py-1">
              <span className="text-[10px] font-mono font-bold text-black/50 dark:text-white/50 uppercase tracking-wider">
                AMOUNT (금액)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-red-600 dark:text-red-400">
                  {costModalItem.currency || 'KRW'} {costModalItem.cost}
                </span>
              </div>
            </div>

            {/* Meta Rows: Date, Time, Paid By */}
            <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/10 font-sans text-xs">
              {costModalItem.date && (
                <div className="flex justify-between items-center text-black/70 dark:text-white/70">
                  <span className="font-mono text-black/40 dark:text-white/40 uppercase font-bold">DATE / TIME</span>
                  <span className="font-mono font-bold">{costModalItem.date} {costModalItem.time && `· ${costModalItem.time}`}</span>
                </div>
              )}
              {costModalItem.paidBy && (
                <div className="flex justify-between items-center text-black/70 dark:text-white/70">
                  <span className="font-mono text-black/40 dark:text-white/40 uppercase font-bold">PAID BY (결제자)</span>
                  <span className="font-bold px-2 py-0.5 bg-black/5 dark:bg-white/10">{costModalItem.paidBy}</span>
                </div>
              )}
              {costModalItem.location && (
                <div className="flex justify-between items-start text-black/70 dark:text-white/70 gap-2">
                  <span className="font-mono text-black/40 dark:text-white/40 uppercase font-bold shrink-0">LOCATION</span>
                  <span className="font-medium text-right break-words line-clamp-2">{costModalItem.location}</span>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCostModalItem(null)}
              className="mt-2 w-full py-2.5 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-mono font-black text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

interface TimelineItemPlaceInputProps {
  itemId: number;
  initialValue: string;
  onUpdatePlace: (id: number, val: string) => void;
  frequentPlaces: any[];
  onSelectFrequent: (item: any, fp: any) => void;
  toggleFrequentPlace: (item: any) => void;
  isFrequent: (place: string) => boolean;
  item: any;
}

function TimelineItemPlaceInput({
  itemId,
  initialValue,
  onUpdatePlace,
  frequentPlaces,
  onSelectFrequent,
  toggleFrequentPlace,
  isFrequent,
  item,
}: TimelineItemPlaceInputProps) {
  const [localVal, setLocalVal] = useState(initialValue);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    onUpdatePlace(itemId, localVal);
    setTimeout(() => setShowDropdown(false), 250);
  };

  const handleSelect = (fp: any) => {
    setLocalVal(fp.place);
    onSelectFrequent(item, fp);
    setShowDropdown(false);
  };

  const filteredFrequent = frequentPlaces.filter(fp =>
    fp.place.toLowerCase().includes(localVal.toLowerCase())
  );

  return (
    <div className="w-full relative" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 w-full relative">
        <input
          id={`title-input-${itemId}`}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          className="bg-black/5 dark:bg-white/10 px-1 py-0.5 outline-none font-bold text-sm md:text-base text-black dark:text-white rounded-none border border-black/10 dark:border-white/10 w-full select-text"
          placeholder="일정 이름"
        />
        <button 
          type="button"
          onClick={() => toggleFrequentPlace(item)}
          className="p-1 hover:text-yellow-500 text-black/30 dark:text-white/30 transition-colors shrink-0"
          title={isFrequent(localVal) ? "자주 가는 장소 등록 해제" : "자주 가는 장소로 등록"}
        >
          <Star className={`w-3.5 h-3.5 ${isFrequent(localVal) ? 'fill-yellow-400 text-yellow-500' : ''}`} />
        </button>
      </div>

      {/* Frequent Places Auto-complete Dropdown */}
      {showDropdown && filteredFrequent.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#222222] border border-black/20 dark:border-white/20 shadow-xl z-50 max-h-40 overflow-y-auto rounded-none" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1 text-[8px] font-bold text-black/40 dark:text-white/40 border-b border-black/5 dark:border-white/5 uppercase tracking-widest">
            자주 사용하는 장소
          </div>
          {filteredFrequent.map((fp, idx) => (
            <div 
              key={idx}
              onMouseDown={() => handleSelect(fp)}
              className="px-2.5 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left border-b border-black/5 dark:border-white/5 last:border-b-0 text-xs font-bold text-black dark:text-white"
            >
              <div className="font-bold flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-red-500" />
                {fp.place}
              </div>
              {fp.location && <div className="text-[10px] text-black/50 dark:text-white/50 truncate pl-4.5">{fp.location}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
