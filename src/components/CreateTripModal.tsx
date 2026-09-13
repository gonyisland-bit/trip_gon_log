import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Tag, 
  Edit3, 
  Zap, 
  Sliders, 
  CheckCircle, 
  Compass, 
  ShoppingBag, 
  Utensils, 
  Palmtree, 
  Building2,
  Plus,
  Trash2,
  Edit,
  Check,
  Globe,
  Layers
} from 'lucide-react';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { 
  WORLD_COUNTRIES, 
  WORLD_CITIES, 
  getSavedPresets,
  saveCustomPreset,
  deletePresetById,
  findCountryByNameOrAlias, 
  findCityByNameOrAlias,
  DestinationCountry,
  DestinationCity,
  PresetTripPlan
} from '../data/worldDestinations';
import { ConfirmModal } from './ConfirmModal';

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
    locations?: { name: string; lat?: number; lng?: number; country?: string }[], 
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
  // Modal Top Navigation Mode: PRESETS | BUILDER | MANUAL
  const [modalMode, setModalMode] = useState<'presets' | 'builder' | 'manual'>('presets');

  // Presets List State (loaded from worldDestinations + localStorage)
  const [presets, setPresets] = useState<PresetTripPlan[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Preset Editor Modal/Panel State
  const [isPresetEditing, setIsPresetEditing] = useState(false);
  const [editingPresetData, setEditingPresetData] = useState<PresetTripPlan | null>(null);

  // Confirm Modal for Trip Generation
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    payload: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    payload: null,
  });

  // Manual & Common Form State
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
    today.setDate(today.getDate() + 14);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [smartDurationDays, setSmartDurationDays] = useState<number>(4);

  // Initialize Modal Data
  useEffect(() => {
    if (isOpen) {
      setPresets(getSavedPresets());
      setSelectedPresetId(null);
      setIsPresetEditing(false);
      setEditingPresetData(null);
      setModalMode('presets');
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
        if (confirmModalState.isOpen) {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        } else if (isPresetEditing) {
          setIsPresetEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmModalState.isOpen, isPresetEditing, onClose]);

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

  // Filtered Country List for Autocomplete
  const filteredCountries = useMemo(() => {
    if (!countrySearchInput.trim()) return [];
    const q = countrySearchInput.trim().toLowerCase();
    return WORLD_COUNTRIES.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [countrySearchInput]);

  // Matched Country Object from current manual country state
  const matchedCountry = useMemo(() => findCountryByNameOrAlias(country), [country]);

  // Available cities under selected country for quick pills
  const citiesForSelectedCountry = useMemo(() => {
    if (!matchedCountry) return [];
    return WORLD_CITIES.filter(c => c.countryEn === matchedCountry.nameEn);
  }, [matchedCountry]);

  if (!isOpen) return null;

  // Select a country in manual mode
  const handleSelectCountry = (c: DestinationCountry) => {
    setCountry(c.nameEn);
    setCountrySearchInput(`${c.nameKo} (${c.nameEn})`);
    setIsCountryDropdownOpen(false);
    if (!locations.some(l => l.name.toUpperCase() === c.nameEn.toUpperCase())) {
      setLocations(prev => [{ name: c.nameEn, country: c.nameEn }, ...prev]);
    }
  };

  // Add city to locations
  const handleAddCityToLocations = (cityName: string, coords?: { lat: number; lng: number }, countryEn?: string) => {
    if (!cityName) return;
    if (!locations.some(l => l.name.toLowerCase() === cityName.toLowerCase())) {
      setLocations(prev => [...prev, { name: cityName, lat: coords?.lat, lng: coords?.lng, country: countryEn }]);
    }
    if (countryEn && !country) {
      setCountry(countryEn);
      const cObj = findCountryByNameOrAlias(countryEn);
      if (cObj) setCountrySearchInput(`${cObj.nameKo} (${cObj.nameEn})`);
    }
  };

  // Manual Form Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('여정 제목을 입력해 주세요.');
    if (!startDate || !endDate) return setError('날짜를 입력해 주세요.');

    const startFormatted = startDate.replace(/-/g, '.');
    const endFormatted = endDate.replace(/-/g, '.');
    const dateRange = `${startFormatted} - ${endFormatted}`;
    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const firstLat = locations[0]?.lat;
    const firstLng = locations[0]?.lng;

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE JOURNEY',
      message: `'${title.trim()}' 여정을 새로 생성하시겠습니까?`,
      payload: () => {
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
      }
    });
  };

  // Select Preset Card -> Fill Details & Prompt Confirmation
  const handleSelectPreset = (preset: PresetTripPlan) => {
    setSelectedPresetId(preset.id);
  };

  // Confirm Generation from Preset
  const handleConfirmPresetGeneration = (preset: PresetTripPlan) => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
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

    const timelineDays: { date: string; items: any[] }[] = [];
    const baseId = Date.now();

    for (let i = 0; i < preset.durationDays; i++) {
      const curDate = new Date(today);
      curDate.setDate(curDate.getDate() + i);
      const curY = curDate.getFullYear();
      const curM = String(curDate.getMonth() + 1).padStart(2, '0');
      const curD = String(curDate.getDate()).padStart(2, '0');
      const dateKey = `${curY}.${curM}.${curD}`;

      const daySched = preset.schedule.find(s => s.dayOffset === i) || preset.schedule[i % (preset.schedule.length || 1)];
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

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE PRESET TRIP',
      message: `'${preset.title}' 프리셋으로 여정을 생성하시겠습니까?`,
      payload: () => {
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
      }
    });
  };

  // Smart Builder Submit
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

      const spot1 = spots[(i * 2) % (spots.length || 1)] || `${cityName} 오전 명소`;
      const spot2 = spots[(i * 2 + 1) % (spots.length || 1)] || `${cityName} 오후 핫플레이스`;

      const items = [
        { id: baseId + i * 100 + 1, time: '09:30 AM', type: 'dining', place: `${cityName} 로컬 카페/조식`, memo: '아침 식사 및 하루 일정 준비', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 2, time: '11:00 AM', type: 'activity', place: spot1, memo: '추천 랜드마크 방문 및 사진 촬영', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 3, time: '01:00 PM', type: 'dining', place: `${cityName} 미식 레스토랑`, memo: '대표 로컬 메뉴 점심', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 4, time: '03:30 PM', type: 'activity', place: spot2, memo: '트렌디 거리 탐방 & 쇼핑', cost: '-', date: dateKey },
        { id: baseId + i * 100 + 5, time: '07:30 PM', type: 'dining', place: `${cityName} 디너 & 야경 바`, memo: '낭만적인 저녁 식사와 야경 감상', cost: '-', date: dateKey }
      ];

      timelineDays.push({ date: dateKey, items });
    }

    setConfirmModalState({
      isOpen: true,
      title: 'GENERATE TRIP',
      message: `'${titleStr}' 여정을 생성하시겠습니까?`,
      payload: () => {
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
      }
    });
  };

  // Preset CRUD Operations
  const handleOpenNewPreset = () => {
    setEditingPresetData({
      id: `custom-preset-${Date.now()}`,
      title: '',
      subtitle: '',
      country: 'JAPAN',
      city: '도쿄',
      durationDays: 4,
      tags: ['Custom'],
      coverImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
      theme: 'culture',
      highlights: ['핵심 명소 탐방', '로컬 미식 체험'],
      schedule: [],
      isCustom: true
    });
    setIsPresetEditing(true);
  };

  const handleOpenEditPreset = (preset: PresetTripPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetData({ ...preset });
    setIsPresetEditing(true);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deletePresetById(id);
    setPresets(updated);
    if (selectedPresetId === id) setSelectedPresetId(null);
  };

  const handleSavePresetData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPresetData || !editingPresetData.title.trim()) return;
    const updated = saveCustomPreset(editingPresetData);
    setPresets(updated);
    setSelectedPresetId(editingPresetData.id);
    setIsPresetEditing(false);
    setEditingPresetData(null);
  };

  const themes = [
    { id: 'all', label: 'ALL', icon: Globe },
    { id: 'shopping', label: 'SHOPPING', icon: ShoppingBag },
    { id: 'food', label: 'FOOD & DINING', icon: Utensils },
    { id: 'nature', label: 'NATURE', icon: Palmtree },
    { id: 'activity', label: 'ACTIVITY', icon: Compass },
    { id: 'art', label: 'ART & ARCHITECTURE', icon: Building2 }
  ];

  const selectedPresetObj = presets.find(p => p.id === selectedPresetId);

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
                SWISS MINIMAL TRAVEL ARCHITECTURE
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

        {/* Tab Switcher: PRESETS | BUILDER | MANUAL */}
        <div className="flex border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setModalMode('presets')}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              modalMode === 'presets'
                ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>PRESETS</span>
          </button>
          <button
            type="button"
            onClick={() => setModalMode('builder')}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              modalMode === 'builder'
                ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>BUILDER</span>
          </button>
          <button
            type="button"
            onClick={() => setModalMode('manual')}
            className={`flex-1 py-3 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              modalMode === 'manual'
                ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                : 'border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>MANUAL</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(92vh-130px)] space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-mono font-medium flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: PRESETS (Curated + Custom + CRUD) */}
          {/* ========================================================================= */}
          {modalMode === 'presets' && (
            <div className="space-y-6">
              
              {/* Header & Add Preset Action */}
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black dark:text-white">
                    CURATED & CUSTOM PRESETS
                  </h3>
                  <p className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase">
                    Select a preset to inspect details before generation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewPreset}
                  className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>NEW PRESET</span>
                </button>
              </div>

              {/* Grid of Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`group relative border p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${
                        isSelected 
                          ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-md ring-1 ring-black dark:ring-white'
                          : 'border-black/15 dark:border-white/15 bg-white dark:bg-[#161616] hover:border-black/50 dark:hover:border-white/50'
                      }`}
                    >
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

                      {/* Footer Info & Action Icons */}
                      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] font-mono text-black/50 dark:text-white/50">
                        <span className="truncate max-w-[65%]">{preset.highlights[0]}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditPreset(preset, e)}
                            className="p-1 hover:text-black dark:hover:text-white transition-colors"
                            title="Edit Preset"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="p-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Preset Detailed Preview & Action Confirmation */}
              {selectedPresetObj && (
                <div className="p-4 border border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                        SELECTED PRESET
                      </span>
                      <h4 className="text-sm font-bold font-mono uppercase text-black dark:text-white">
                        {selectedPresetObj.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-black/50 dark:text-white/50">
                      {selectedPresetObj.city}, {selectedPresetObj.country} ({selectedPresetObj.durationDays} DAYS)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPresetObj.highlights.map((h, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 border border-black/10 dark:border-white/10 bg-white dark:bg-[#181818]">
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmPresetGeneration(selectedPresetObj)}
                      className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>APPLY & GENERATE JOURNEY</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BUILDER (Theme + Destination + Date) */}
          {/* ========================================================================= */}
          {modalMode === 'builder' && (
            <div className="space-y-5">
              
              {/* Step 1: Theme selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                  THEME & MOOD
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
                    COUNTRY
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
                    <option value="">SELECT COUNTRY...</option>
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
                    CITY
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
                    <option value="">SELECT CITY...</option>
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
                    START DATE
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
                    DURATION
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
                        {days}D
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4: Season Diagnostic */}
              {seasonRiskCheck && (
                <div className={`p-3.5 border text-xs font-mono ${
                  seasonRiskCheck.isWarning 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' 
                    : (seasonRiskCheck.isBestSeason 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200' 
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70')
                } space-y-1`}>
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>MONTH {seasonRiskCheck.startMonth} SEASON ANALYSIS</span>
                  </div>
                  <p className="leading-relaxed font-sans text-xs">
                    {seasonRiskCheck.isWarning ? (
                      <span><strong>NOTICE:</strong> {seasonRiskCheck.avoidReason}</span>
                    ) : seasonRiskCheck.isBestSeason ? (
                      <span><strong>OPTIMAL SEASON:</strong> Ideal weather conditions for outdoor excursions.</span>
                    ) : (
                      <span><strong>SEASON INFO:</strong> Recommended period is {seasonRiskCheck.countryBest || 'Spring / Autumn'}.</span>
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
                  <span>GENERATE TRIP</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MANUAL FORM (Minimal Clean Inputs) */}
          {/* ========================================================================= */}
          {modalMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  JOURNEY TITLE
                </label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                  <input 
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. KYOTO AUTUMN TRIP"
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Country with Bidirectional Autocomplete (Only opens on typing) */}
              <div className="flex flex-col gap-1.5 relative" ref={countryDropdownRef}>
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  COUNTRY
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                  <input 
                    type="text"
                    value={countrySearchInput}
                    onChange={(e) => {
                      setCountrySearchInput(e.target.value);
                      setCountry(e.target.value.toUpperCase());
                      setIsCountryDropdownOpen(e.target.value.trim().length > 0);
                    }}
                    placeholder="Search country (e.g. 일본, France, 베트남)..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono"
                  />
                </div>

                {/* Country dropdown (only when typing) */}
                {isCountryDropdownOpen && filteredCountries.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-black dark:text-white font-mono">
                          {c.nameKo} ({c.nameEn})
                        </span>
                        <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                          {c.popularCities.slice(0, 3).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Locations (Spots & Cities) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  LOCATIONS
                </label>

                {/* Popular City Recommendation Chips */}
                {citiesForSelectedCountry.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-black/[0.025] dark:bg-white/[0.025] border border-black/10 dark:border-white/10">
                    <span className="text-[9px] font-mono font-bold text-black/50 dark:text-white/50 self-center mr-1">
                      QUICK:
                    </span>
                    {citiesForSelectedCountry.map(city => (
                      <button
                        key={city.nameEn}
                        type="button"
                        onClick={() => handleAddCityToLocations(city.nameKo, { lat: city.lat, lng: city.lng }, city.countryEn)}
                        className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                      >
                        {city.nameKo}
                      </button>
                    ))}
                  </div>
                )}

                {/* Location Pills */}
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1 max-h-24 overflow-y-auto p-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    {locations.map((loc, idx) => (
                      <span 
                        key={idx} 
                        className="flex items-center gap-1.5 bg-white dark:bg-[#151515] text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 border border-black/15 dark:border-white/15 text-black dark:text-white"
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

                <PlaceAutocompleteInput 
                  value={locationInput}
                  onChange={setLocationInput}
                  onSelectPlace={(placeName, coords, address, countryName) => {
                    if (placeName && !locations.some(l => l.name.toLowerCase() === placeName.toLowerCase())) {
                      const detectedCountry = countryName || (address ? extractCountry(address) : country);
                      setLocations(prev => [...prev, { name: placeName, lat: coords?.lat, lng: coords?.lng, country: detectedCountry }]);
                      if (detectedCountry && !country) {
                        setCountry(detectedCountry);
                        const cObj = findCountryByNameOrAlias(detectedCountry);
                        if (cObj) setCountrySearchInput(`${cObj.nameKo} (${cObj.nameEn})`);
                      }
                    }
                    setLocationInput('');
                  }}
                  placeholder="Type city or spot name and press Enter..."
                  className="w-full py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                    START DATE
                  </label>
                  <input 
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                    END DATE
                  </label>
                  <input 
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50">
                  TAGS
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
                    placeholder="Enter tags separated by comma or Enter..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="mt-3 py-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 active:opacity-95 transition-opacity flex items-center justify-center rounded-none cursor-pointer"
              >
                CREATE JOURNEY
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Preset Edit / Creation Sub-Modal */}
      {isPresetEditing && editingPresetData && (
        <div className="fixed inset-0 z-[10000] flex justify-center items-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#F9F8F6] dark:bg-[#141414] border border-black/30 dark:border-white/30 shadow-2xl p-6 text-black dark:text-white font-mono">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider">
                {editingPresetData.title ? 'EDIT PRESET' : 'NEW CUSTOM PRESET'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsPresetEditing(false); setEditingPresetData(null); }}
                className="p-1 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePresetData} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                  TITLE
                </label>
                <input
                  type="text"
                  required
                  value={editingPresetData.title}
                  onChange={e => setEditingPresetData({ ...editingPresetData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  placeholder="e.g. TOKYO COFFEE & DESIGN TOUR"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                  SUBTITLE / SUMMARY
                </label>
                <input
                  type="text"
                  value={editingPresetData.subtitle}
                  onChange={e => setEditingPresetData({ ...editingPresetData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  placeholder="e.g. 4박 5일 감성 카페 및 건축 명소 탐방"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    COUNTRY
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPresetData.country}
                    onChange={e => setEditingPresetData({ ...editingPresetData, country: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                    placeholder="e.g. JAPAN"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    CITY
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPresetData.city}
                    onChange={e => setEditingPresetData({ ...editingPresetData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                    placeholder="e.g. 도쿄"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    DURATION (DAYS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editingPresetData.durationDays}
                    onChange={e => setEditingPresetData({ ...editingPresetData, durationDays: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    THEME
                  </label>
                  <select
                    value={editingPresetData.theme}
                    onChange={e => setEditingPresetData({ ...editingPresetData, theme: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  >
                    <option value="culture">CULTURE</option>
                    <option value="shopping">SHOPPING</option>
                    <option value="food">FOOD</option>
                    <option value="nature">NATURE</option>
                    <option value="activity">ACTIVITY</option>
                    <option value="art">ART</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                  COVER IMAGE URL
                </label>
                <input
                  type="text"
                  value={editingPresetData.coverImg}
                  onChange={e => setEditingPresetData({ ...editingPresetData, coverImg: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                  HIGHLIGHTS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={editingPresetData.highlights.join(', ')}
                  onChange={e => setEditingPresetData({ ...editingPresetData, highlights: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none"
                  placeholder="명소 1, 명소 2, 명소 3"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsPresetEditing(false); setEditingPresetData(null); }}
                  className="flex-1 py-2.5 border border-black/20 dark:border-white/20 font-bold uppercase tracking-wider hover:bg-black/5 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black font-black uppercase tracking-wider hover:opacity-85 transition-opacity"
                >
                  SAVE PRESET
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel="CREATE"
        cancelLabel="CANCEL"
        confirmVariant="black"
        iconType="check"
        onConfirm={() => {
          if (confirmModalState.payload) confirmModalState.payload();
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

    </div>,
    document.body
  );
}
