import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  MapPin, 
  Tag, 
  Edit3, 
  Zap, 
  Sliders, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Compass, 
  Clock, 
  Plane, 
  Coffee, 
  ShoppingBag, 
  Camera, 
  Utensils, 
  Palmtree, 
  Building2 
} from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { 
  WORLD_COUNTRIES, 
  WORLD_CITIES, 
  PRESET_TRIP_PLANS, 
  findCountryByNameOrAlias, 
  findCityByNameOrAlias,
  DestinationCountry,
  DestinationCity,
  PresetTripPlan
} from '../data/worldDestinations';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    title: string, 
    dateRange: string, 
    location: string, 
    tags: string[], 
    lat?: number, 
    lng?: number, 
    members?: string[], 
    locations?: { name: string; lat?: number; lng?: number }[], 
    statusBadge?: string, 
    country?: string,
    customCoverImg?: string,
    customTimelineItems?: { date: string; items: any[] }[]
  ) => void;
  existingTags: string[];
  initialCountry?: string;
}

function extractCountry(address: string): string {
  if (!address) return '';
  const clean = address.trim().toLowerCase();
  
  for (const c of WORLD_COUNTRIES) {
    for (const key of c.aliases) {
      if (clean.includes(key.toLowerCase())) {
        return c.nameEn;
      }
    }
  }

  const parts = address.split(',');
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim().toUpperCase();
    for (const c of WORLD_COUNTRIES) {
      for (const key of c.aliases) {
        if (lastPart.toLowerCase() === key.toLowerCase()) {
          return c.nameEn;
        }
      }
    }
    return lastPart;
  }
  
  return address.trim().toUpperCase();
}

export function CreateTripModal({
  isOpen,
  onClose,
  onCreate,
  existingTags,
  initialCountry,
}: CreateTripModalProps) {
  // Mode: SMART (One-Click & Builder) vs MANUAL (Custom Form)
  const [modalMode, setModalMode] = useState<'smart' | 'manual'>('smart');

  // Manual Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locations, setLocations] = useState<{ name: string; lat?: number; lng?: number; country?: string }[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [statusBadge, setStatusBadge] = useState<'NEW' | 'EDITING' | ''>('');
  const [country, setCountry] = useState('');
  const [countrySearchInput, setCountrySearchInput] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  // Smart Builder State
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [smartCountry, setSmartCountry] = useState<DestinationCountry | null>(null);
  const [smartCity, setSmartCity] = useState<DestinationCity | null>(null);
  const [smartStartDate, setSmartStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 14); // 2주 후 기본 추천
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [smartDurationDays, setSmartDurationDays] = useState<number>(4);

  // Initialize
  useEffect(() => {
    if (isOpen) {
      setModalMode('smart');
      setTitle(initialCountry ? `${initialCountry} Journey` : '');
      
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() + 7);
      const yyyy = defaultStart.getFullYear();
      const mm = String(defaultStart.getMonth() + 1).padStart(2, '0');
      const dd = String(defaultStart.getDate()).padStart(2, '0');
      const startStr = `${yyyy}-${mm}-${dd}`;
      
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setDate(defaultEnd.getDate() + 3);
      const endY = defaultEnd.getFullYear();
      const endM = String(defaultEnd.getMonth() + 1).padStart(2, '0');
      const endD = String(defaultEnd.getDate()).padStart(2, '0');
      const endStr = `${endY}-${endM}-${endD}`;

      setStartDate(startStr);
      setEndDate(endStr);
      setCountry(initialCountry || '');
      setCountrySearchInput(initialCountry || '');
      setLocations(initialCountry ? [{ name: initialCountry }] : []);
      setLocationInput('');
      setTags(initialCountry ? [initialCountry] : []);
      setTagInput('');
      setMembers([]);
      setMemberInput('');
      setStatusBadge('');
      setError('');

      // Smart builder initialization
      if (initialCountry) {
        const found = findCountryByNameOrAlias(initialCountry);
        if (found) {
          setSmartCountry(found);
          const firstCity = WORLD_CITIES.find(c => c.countryEn === found.nameEn);
          if (firstCity) setSmartCity(firstCity);
        }
      } else {
        setSmartCountry(null);
        setSmartCity(null);
      }
    }
  }, [isOpen, initialCountry]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close country dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filtered Country List for Autocomplete
  const filteredCountries = WORLD_COUNTRIES.filter(c => {
    if (!countrySearchInput.trim()) return true;
    const q = countrySearchInput.trim().toLowerCase();
    return (
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    );
  });

  // Matched Country Object from current manual `country` state
  const matchedCountry = findCountryByNameOrAlias(country);

  // Available cities under selected country for quick pills
  const citiesForSelectedCountry = matchedCountry
    ? WORLD_CITIES.filter(c => c.countryEn === matchedCountry.nameEn)
    : [];

  // Handle selecting a country in manual mode
  const handleSelectCountry = (c: DestinationCountry) => {
    setCountry(c.nameEn);
    setCountrySearchInput(`${c.nameKo} (${c.nameEn})`);
    setIsCountryDropdownOpen(false);
    // If no tags yet, add country tag
    if (!tags.includes(c.nameKo)) {
      setTags(prev => [...prev, c.nameKo]);
    }
  };

  // Handle adding city in manual mode with reverse country mapping
  const handleAddCityToLocations = (cityName: string, coords?: { lat: number; lng: number }, detectedCountry?: string) => {
    const clean = cityName.trim();
    if (!clean) return;

    // Check if city exists in dictionary
    const dictCity = findCityByNameOrAlias(clean);
    const resolvedCountry = detectedCountry || (dictCity ? dictCity.countryEn : extractCountry(clean));

    // Reverse map: if country not set or different, auto-set country!
    if (resolvedCountry && (!country || country.trim() === '')) {
      setCountry(resolvedCountry);
      const cObj = findCountryByNameOrAlias(resolvedCountry);
      setCountrySearchInput(cObj ? `${cObj.nameKo} (${cObj.nameEn})` : resolvedCountry);
    }

    setLocations(prev => {
      if (prev.some(loc => loc.name.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, { 
        name: dictCity ? `${dictCity.nameKo} (${dictCity.nameEn})` : clean, 
        lat: coords?.lat || dictCity?.lat, 
        lng: coords?.lng || dictCity?.lng, 
        country: resolvedCountry 
      }];
    });

    setLocationInput('');
  };

  // Handle Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('여정 제목을 입력해 주세요.');
    if (!startDate) return setError('시작 날짜를 입력해 주세요.');
    if (!endDate) return setError('종료 날짜를 입력해 주세요.');
    if (new Date(startDate) > new Date(endDate)) return setError('종료일은 시작일보다 빠를 수 없습니다.');
    if (locations.length === 0) return setError('여행 위치(도시명)를 1개 이상 추가해 주세요.');

    const startFormatted = startDate.replace(/-/g, '.');
    const endFormatted = endDate.replace(/-/g, '.');
    const dateRange = `${startFormatted} - ${endFormatted}`;

    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const firstLat = locations[0]?.lat;
    const firstLng = locations[0]?.lng;

    onCreate(
      title.trim(),
      dateRange,
      combinedLocationStr,
      tags.length > 0 ? tags : ['Personal'],
      firstLat,
      firstLng,
      members,
      locations,
      statusBadge,
      country.trim()
    );
    onClose();
  };

  // --- ONE-CLICK PRESET CREATION ---
  const handleCreateFromPreset = (preset: PresetTripPlan) => {
    const today = new Date();
    today.setDate(today.getDate() + 14); // 2주 후 출발 추천
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const startStr = `${yyyy}.${mm}.${dd}`;

    const endDateObj = new Date(today);
    endDateObj.setDate(endDateObj.getDate() + preset.durationDays - 1);
    const endY = endDateObj.getFullYear();
    const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endDateObj.getDate()).padStart(2, '0');
    const endStr = `${endY}.${endM}.${endD}`;
    const dateRange = `${startStr} - ${endStr}`;

    // Build timeline items from preset schedule
    const timelineDays: { date: string; items: any[] }[] = [];
    const baseId = Date.now();

    for (let i = 0; i < preset.durationDays; i++) {
      const curDate = new Date(today);
      curDate.setDate(curDate.getDate() + i);
      const curY = curDate.getFullYear();
      const curM = String(curDate.getMonth() + 1).padStart(2, '0');
      const curD = String(curDate.getDate()).padStart(2, '0');
      const dateKey = `${curY}.${curM}.${curD}`;

      const daySched = preset.schedule.find(s => s.dayOffset === i) || preset.schedule[i % preset.schedule.length];
      const items = daySched ? daySched.items.map((it, idx) => ({
        id: baseId + i * 100 + idx + 1,
        time: it.time,
        type: it.type,
        place: it.place,
        memo: it.memo,
        cost: it.cost || '-',
        date: dateKey
      })) : [
        { id: baseId + i * 100 + 1, time: '10:00 AM', type: 'activity', place: `${preset.city} 관광`, memo: '추천 명소 탐방', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 2, time: '01:00 PM', type: 'dining', place: `${preset.city} 맛집`, memo: '현지 식사', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 3, time: '07:00 PM', type: 'activity', place: `${preset.city} 야경`, memo: '야경 및 휴식', cost: '-', date: dateKey }
      ];

      timelineDays.push({ date: dateKey, items });
    }

    const cityMeta = findCityByNameOrAlias(preset.city);

    onCreate(
      preset.title,
      dateRange,
      preset.city,
      [...preset.tags, preset.country],
      cityMeta?.lat,
      cityMeta?.lng,
      [],
      [{ name: preset.city, lat: cityMeta?.lat, lng: cityMeta?.lng, country: preset.country }],
      'NEW',
      preset.country,
      preset.coverImg,
      timelineDays
    );
    onClose();
  };

  // --- SMART INTERACTIVE BUILDER SUBMIT ---
  const handleSmartBuilderSubmit = () => {
    if (!smartCity && !smartCountry) {
      return setError('목표 도시 또는 국가를 선택해 주세요.');
    }

    const city = smartCity;
    const countryObj = smartCountry || (city ? findCountryByNameOrAlias(city.countryEn) : null);
    const countryName = countryObj ? countryObj.nameEn : (city?.countryEn || 'GLOBAL');
    const cityName = city ? city.nameKo : (countryObj?.popularCities[0] || countryName);

    const startObj = new Date(smartStartDate);
    const yyyy = startObj.getFullYear();
    const mm = String(startObj.getMonth() + 1).padStart(2, '0');
    const dd = String(startObj.getDate()).padStart(2, '0');
    const startStr = `${yyyy}.${mm}.${dd}`;

    const endObj = new Date(startObj);
    endObj.setDate(endObj.getDate() + smartDurationDays - 1);
    const endY = endObj.getFullYear();
    const endM = String(endObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endObj.getDate()).padStart(2, '0');
    const endStr = `${endY}.${endM}.${endD}`;
    const dateRange = `${startStr} - ${endStr}`;

    const titleStr = `${cityName.toUpperCase()} ${selectedTheme !== 'all' ? selectedTheme.toUpperCase() : 'SMART'} JOURNEY`;
    const coverImg = city?.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop';

    // Generate intelligent timeline items matching city spots
    const timelineDays: { date: string; items: any[] }[] = [];
    const baseId = Date.now();
    const spots = [...(city?.iconicSpots || []), ...(city?.hiddenGems || [])];

    for (let i = 0; i < smartDurationDays; i++) {
      const curDate = new Date(startObj);
      curDate.setDate(curDate.getDate() + i);
      const curY = curDate.getFullYear();
      const curM = String(curDate.getMonth() + 1).padStart(2, '0');
      const curD = String(curDate.getDate()).padStart(2, '0');
      const dateKey = `${curY}.${curM}.${curD}`;

      const spot1 = spots[(i * 2) % spots.length] || `${cityName} 오전 명소`;
      const spot2 = spots[(i * 2 + 1) % spots.length] || `${cityName} 오후 핫플레이스`;

      const items = [
        { id: baseId + i * 100 + 1, time: '09:30 AM', type: 'dining', place: `${cityName} 로컬 카페/조식`, memo: '아침 식사 및 하루 일정 준비', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 2, time: '11:00 AM', type: 'activity', place: spot1, memo: '추천 랜드마크 방문 및 사진 촬영', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 3, time: '01:00 PM', type: 'dining', place: `${cityName} 미식 레스토랑`, memo: '대표 로컬 메뉴 점심', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 4, time: '03:30 PM', type: 'activity', place: spot2, memo: '트렌디 거리 탐방 & 쇼핑', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 5, time: '07:30 PM', type: 'dining', place: `${cityName} 디너 & 야경 바`, memo: '낭만적인 저녁 식사와 야경 감상', cost: '-', date: dateKey }
      ];

      timelineDays.push({ date: dateKey, items });
    }

    onCreate(
      titleStr,
      dateRange,
      cityName,
      [countryName, cityName, selectedTheme !== 'all' ? selectedTheme : 'SmartTrip'],
      city?.lat,
      city?.lng,
      [],
      [{ name: cityName, lat: city?.lat, lng: city?.lng, country: countryName }],
      'NEW',
      countryName,
      coverImg,
      timelineDays
    );
    onClose();
  };

  // Check seasonal risks for smart builder
  const seasonRiskCheck = useMemo(() => {
    if (!smartCity && !smartCountry) return null;
    const city = smartCity;
    const countryObj = smartCountry || (city ? findCountryByNameOrAlias(city.countryEn) : null);
    
    const startMonth = new Date(smartStartDate).getMonth() + 1;

    let warningReason: string | null = null;
    if (city) {
      for (const av of city.avoidMonths) {
        if (av.months.includes(startMonth)) {
          warningReason = av.reason;
          break;
        }
      }
    }

    const isBestSeason = city?.bestMonths.includes(startMonth);

    return {
      startMonth,
      countryBest: countryObj?.bestSeason,
      avoidSeason: countryObj?.avoidSeason,
      avoidReason: warningReason || countryObj?.avoidReason,
      isWarning: Boolean(warningReason),
      isBestSeason
    };
  }, [smartCity, smartCountry, smartStartDate]);

  const themes = [
    { id: 'all', label: '전체 (ALL)', icon: Sparkles },
    { id: 'shopping', label: '쇼핑 & 카페', icon: ShoppingBag },
    { id: 'food', label: '미식 탐방', icon: Utensils },
    { id: 'nature', label: '자연 & 힐링', icon: Palmtree },
    { id: 'activity', label: '액티비티', icon: Compass },
    { id: 'art', label: '예술 & 건축', icon: Building2 }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#F9F8F6] dark:bg-[#121212] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col z-10 transition-colors duration-300 text-black dark:text-white max-h-[92vh] overflow-hidden my-auto shrink-0">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-black text-white dark:bg-white dark:text-black">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase font-mono tracking-tight leading-none">
                NEW TRIP GENERATOR
              </h2>
              <p className="text-[10px] font-mono text-black/45 dark:text-white/45 uppercase tracking-widest mt-0.5">
                스마트 원클릭 생성 및 여행 일정 빌더
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: SMART vs MANUAL */}
        <div className="flex border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setModalMode('smart')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              modalMode === 'smart'
                ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>SMART ONE-CLICK (원클릭 생성)</span>
          </button>
          <button
            type="button"
            onClick={() => setModalMode('manual')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              modalMode === 'manual'
                ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>MANUAL FORM (직접 입력)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(92vh-130px)] space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-mono font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. SMART MODE: Presets & Interactive Builder */}
          {/* ========================================================================= */}
          {modalMode === 'smart' && (
            <div className="space-y-7">
              
              {/* SECTION A: One-Click Curated Preset Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black dark:text-white">
                      원클릭 추천 프리셋 (ONE-CLICK PRESETS)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                    카드 클릭 시 코스 자동 완성
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_TRIP_PLANS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleCreateFromPreset(preset)}
                      className="group relative border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616] p-3.5 flex flex-col justify-between hover:border-black dark:hover:border-white hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                    >
                      {/* Thumbnail background snippet */}
                      <div className="flex gap-3 items-center">
                        <img 
                          src={preset.coverImg} 
                          alt={preset.title}
                          className="w-16 h-16 object-cover grayscale group-hover:grayscale-0 transition-all border border-black/10 dark:border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-mono font-black bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 uppercase tracking-wider">
                              {preset.country}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase">
                              {preset.durationDays} DAYS
                            </span>
                          </div>
                          <h4 className="text-xs font-bold truncate text-black dark:text-white font-sans uppercase">
                            {preset.title}
                          </h4>
                          <p className="text-[10px] text-black/55 dark:text-white/55 truncate">
                            {preset.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Highlights Pill */}
                      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] font-mono text-black/50 dark:text-white/50">
                        <span className="truncate max-w-[80%]">{preset.highlights[0]}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-black dark:text-white shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: Interactive Smart Builder */}
              <div className="pt-5 border-t border-black/15 dark:border-white/15 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-black/60 dark:text-white/60" />
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black dark:text-white">
                    맞춤형 스마트 빌더 (INTERACTIVE BUILDER)
                  </h3>
                </div>

                {/* Step 1: Theme selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                    1. 여행 테마 & 무드 선택 (THEME)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {themes.map(t => {
                      const IconComp = t.icon;
                      const isSelected = selectedTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTheme(t.id)}
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                              : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40 dark:hover:border-white/40'
                          }`}
                        >
                          <IconComp className="w-3 h-3" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Destination Select (Country & City) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Select Country */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      2. 목표 국가 선택 (COUNTRY)
                    </label>
                    <select
                      value={smartCountry?.code || ''}
                      onChange={(e) => {
                        const found = WORLD_COUNTRIES.find(c => c.code === e.target.value);
                        setSmartCountry(found || null);
                        if (found) {
                          const firstCity = WORLD_CITIES.find(c => c.countryEn === found.nameEn);
                          setSmartCity(firstCity || null);
                        } else {
                          setSmartCity(null);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none rounded-none"
                    >
                      <option value="">국가 직접 선택...</option>
                      {WORLD_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.nameKo} ({c.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select City */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      3. 목표 도시 선택 (CITY)
                    </label>
                    <select
                      value={smartCity?.nameEn || ''}
                      onChange={(e) => {
                        const found = WORLD_CITIES.find(c => c.nameEn === e.target.value);
                        setSmartCity(found || null);
                        if (found) {
                          const matchedC = WORLD_COUNTRIES.find(c => c.nameEn === found.countryEn);
                          if (matchedC) setSmartCountry(matchedC);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none rounded-none"
                    >
                      <option value="">도시 직접 선택...</option>
                      {(smartCountry ? WORLD_CITIES.filter(c => c.countryEn === smartCountry.nameEn) : WORLD_CITIES).map(c => (
                        <option key={c.nameEn} value={c.nameEn}>
                          {c.nameKo} - {c.nameEn} ({c.countryKo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3: Date & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      4. 출발 예정일 (START DATE)
                    </label>
                    <input
                      type="date"
                      value={smartStartDate}
                      onChange={(e) => setSmartStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none rounded-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      5. 여행 기간 (DURATION)
                    </label>
                    <div className="flex gap-1.5">
                      {[3, 4, 5, 6, 7].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setSmartDurationDays(days)}
                          className={`flex-1 py-2 text-xs font-mono font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            smartDurationDays === days
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                              : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/30'
                          }`}
                        >
                          {days}일
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 4: Smart Season & Avoidance Alert Engine */}
                {seasonRiskCheck && (
                  <div className={`p-3.5 border ${
                    seasonRiskCheck.isWarning 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' 
                      : (seasonRiskCheck.isBestSeason 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200' 
                          : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70')
                  } space-y-1.5`}>
                    <div className="flex items-center gap-2">
                      {seasonRiskCheck.isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                        {seasonRiskCheck.startMonth}월 여행 시즌 스마트 진단
                      </span>
                    </div>

                    <p className="text-xs font-sans leading-relaxed">
                      {seasonRiskCheck.isWarning ? (
                        <>⚠️ <strong>주의 시기:</strong> {seasonRiskCheck.avoidReason}</>
                      ) : seasonRiskCheck.isBestSeason ? (
                        <>✨ <strong>최적의 여행 시즌!</strong> 현지 기후가 온화하며 야외 활동 및 관광에 가장 이상적입니다.</>
                      ) : (
                        <>ℹ️ <strong>시즌 참고:</strong> 추천 계절은 {seasonRiskCheck.countryBest || '봄/가을'}입니다.</>
                      )}
                    </p>
                  </div>
                )}

                {/* Generate Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSmartBuilderSubmit}
                    className="w-full py-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Zap className="w-4 h-4 text-orange-400 dark:text-orange-600" />
                    <span>GENERATE TRIP (맞춤 일정 자동 생성)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. MANUAL MODE: Bidirectional Country-City Autocomplete Form */}
          {/* ========================================================================= */}
          {modalMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  여정 제목 (JOURNEY TITLE)
                </label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                  <input 
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. KYOTO AUTUMN TRIP"
                    className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Country with Bidirectional Autocomplete */}
              <div className="flex flex-col gap-1.5 relative" ref={countryDropdownRef}>
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50 flex justify-between">
                  <span>대표 국가명 (COUNTRY)</span>
                  <span className="text-[9px] text-black/40 dark:text-white/40 font-normal">한글/영문 자동완성</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                  <input 
                    type="text"
                    value={countrySearchInput}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    onChange={(e) => {
                      setCountrySearchInput(e.target.value);
                      setCountry(e.target.value.toUpperCase());
                      setIsCountryDropdownOpen(true);
                    }}
                    placeholder="국가명 검색... (예: 일본, France, 베트남)"
                    className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono"
                  />
                </div>

                {/* Country dropdown */}
                {isCountryDropdownOpen && filteredCountries.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-black dark:text-white font-sans">
                          {c.nameKo} <span className="font-mono opacity-50 font-normal">({c.nameEn})</span>
                        </span>
                        <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                          {c.popularCities.slice(0, 3).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Locations (방문 도시 지정 + 양방향 매핑) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                    방문 장소 & 도시 (LOCATIONS)
                  </label>
                  {matchedCountry && (
                    <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400">
                      {matchedCountry.nameKo} 인기 도시 추천 가능
                    </span>
                  )}
                </div>

                {/* Country Popular City Recommendation Chips */}
                {citiesForSelectedCountry.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-black/[0.025] dark:bg-white/[0.025] border border-black/10 dark:border-white/10">
                    <span className="text-[9px] font-mono font-bold text-black/50 dark:text-white/50 self-center mr-1">
                      추천:
                    </span>
                    {citiesForSelectedCountry.map(city => (
                      <button
                        key={city.nameEn}
                        type="button"
                        onClick={() => handleAddCityToLocations(city.nameKo, { lat: city.lat, lng: city.lng }, city.countryEn)}
                        className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                      >
                        + {city.nameKo}
                      </button>
                    ))}
                  </div>
                )}

                {/* Location Pill Display */}
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1 max-h-24 overflow-y-auto p-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    {locations.map((loc, idx) => (
                      <span 
                        key={idx} 
                        className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 border border-black/15 dark:border-white/15 text-black dark:text-white shadow-xs"
                      >
                        {loc.name}
                        <button 
                          type="button" 
                          onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))} 
                          className="text-black/45 dark:text-white/45 hover:text-red-500 transition-colors text-xs leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Location Input with Autocomplete */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-grow">
                    <MapPin className="absolute left-3 w-4 h-4 text-black/30 dark:text-white/30 z-10 pointer-events-none top-1/2 -translate-y-1/2" />
                    <PlaceAutocompleteInput
                      value={locationInput}
                      onChange={(val) => setLocationInput(val)}
                      onSelectPlace={(name, coords, address, countryName) => {
                        handleAddCityToLocations(name, coords || undefined, countryName);
                      }}
                      className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
                      placeholder="도시 검색... (예: 도쿄, 파리, 다낭)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (locationInput.trim()) {
                        handleAddCityToLocations(locationInput.trim());
                      }
                    }}
                    className="px-3.5 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest hover:opacity-85 transition-opacity shrink-0 rounded-none border border-black/20 dark:border-white/20 cursor-pointer"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                    시작일 (START DATE)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30 pointer-events-none" />
                    <input 
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setStartDate(newStart);
                        if (newStart) {
                          const d = new Date(newStart);
                          d.setDate(d.getDate() + 3);
                          const yyyy = d.getFullYear();
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const dd = String(d.getDate()).padStart(2, '0');
                          setEndDate(`${yyyy}-${mm}-${dd}`);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                    종료일 (END DATE)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30 pointer-events-none" />
                    <input 
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  태그 (TAGS)
                </label>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1 max-h-24 overflow-y-auto p-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    {tags.map(tag => (
                      <span 
                        key={tag} 
                        className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-black/15 dark:border-white/15 text-black dark:text-white"
                      >
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => setTags(prev => prev.filter(t => t !== tag))} 
                          className="text-black/45 dark:text-white/45 hover:text-red-500 transition-colors text-xs leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === ',' || e.key === 'Enter') {
                        e.preventDefault();
                        const clean = tagInput.trim().replace(/,/g, '');
                        if (clean && !tags.includes(clean)) setTags(prev => [...prev, clean]);
                        setTagInput('');
                      }
                    }}
                    placeholder="태그 입력 후 Enter 또는 쉼표..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white"
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="mt-3 py-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-opacity flex items-center justify-center rounded-none cursor-pointer"
              >
                CREATE JOURNEY (수동 생성)
              </button>
            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
