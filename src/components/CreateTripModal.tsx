import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Tag, 
  Edit3, 
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
  Layers,
  Calendar
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
  isAdmin?: boolean;
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
  onOpenManagePresets?: () => void;
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

/** 타이틀이 비어있을 때 도시 목록으로 자동 생성 */
function buildAutoTitle(currentLocations: { name: string }[], newCityName: string): string {
  const allNames = [...currentLocations.map(l => l.name), newCityName]
    .filter((n, i, arr) => arr.indexOf(n) === i); // dedupe
  return allNames.join(' · ').toUpperCase() + ' TRIP';
}

export function CreateTripModal({
  isOpen,
  onClose,
  isAdmin = false,
  onCreate,
  existingTags,
  initialCountry,
  onOpenManagePresets,
}: CreateTripModalProps) {
  // Modal Top Navigation Mode: PRESETS | BUILDER | MANUAL
  const [modalMode, setModalMode] = useState<'presets' | 'builder' | 'manual'>('presets');

  // Presets List State
  const [presets, setPresets] = useState<PresetTripPlan[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Preset Editor State (admin only)
  const [isPresetEditing, setIsPresetEditing] = useState(false);
  const [editingPresetData, setEditingPresetData] = useState<PresetTripPlan | null>(null);

  // Confirm Modal for Trip Generation
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    payload: (() => void) | null;
  }>({ isOpen: false, title: '', message: '', payload: null });

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
  const [builderCountrySearch, setBuilderCountrySearch] = useState('');
  const [isBuilderCountryOpen, setIsBuilderCountryOpen] = useState(false);
  const builderCountryRef = useRef<HTMLDivElement>(null);
  const [builderCitySearch, setBuilderCitySearch] = useState('');
  const [isBuilderCityOpen, setIsBuilderCityOpen] = useState(false);
  const builderCityRef = useRef<HTMLDivElement>(null);

  const [smartStartDate, setSmartStartDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [smartDurationDays, setSmartDurationDays] = useState<number>(4);

  // Sync presets on custom event
  useEffect(() => {
    const handlePresetsChanged = () => {
      setPresets(getSavedPresets());
    };
    window.addEventListener('tripPresetsChanged', handlePresetsChanged);
    return () => window.removeEventListener('tripPresetsChanged', handlePresetsChanged);
  }, []);

  // Initialize Modal Data
  useEffect(() => {
    if (isOpen) {
      setPresets(getSavedPresets());
      setSelectedPresetId(null);
      setIsPresetEditing(false);
      setEditingPresetData(null);
      setModalMode('presets');
      setTitle(initialCountry ? `${initialCountry} TRIP` : '');
      
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
          setBuilderCountrySearch(`${found.nameKo} (${found.nameEn})`);
          const firstCity = WORLD_CITIES.find(c => c.countryEn === found.nameEn);
          if (firstCity) {
            setSmartCity(firstCity);
            setBuilderCitySearch(firstCity.nameKo);
          }
        }
      } else {
        setSmartCountry(null);
        setSmartCity(null);
        setBuilderCountrySearch('');
        setBuilderCitySearch('');
      }
    }
  }, [isOpen, initialCountry]);

  // Close on Escape
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

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(target)) {
        setIsCountryDropdownOpen(false);
      }
      if (builderCountryRef.current && !builderCountryRef.current.contains(target)) {
        setIsBuilderCountryOpen(false);
      }
      if (builderCityRef.current && !builderCityRef.current.contains(target)) {
        setIsBuilderCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Season risk analysis for builder
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

  // Season risk analysis for manual tab
  const manualSeasonRisk = useMemo(() => {
    if (!startDate) return null;
    let targetCity: DestinationCity | undefined;
    let targetCountry: DestinationCountry | undefined;

    for (const loc of locations) {
      const c = findCityByNameOrAlias(loc.name);
      if (c) {
        targetCity = c;
        break;
      }
    }

    if (!targetCity && country) {
      targetCountry = findCountryByNameOrAlias(country);
    } else if (targetCity) {
      targetCountry = findCountryByNameOrAlias(targetCity.countryEn);
    }

    if (!targetCity && !targetCountry) return null;

    const startMonth = new Date(startDate).getMonth() + 1;
    if (isNaN(startMonth)) return null;

    let warningReason: string | null = null;
    if (targetCity) {
      for (const av of targetCity.avoidMonths) {
        if (av.months.includes(startMonth)) {
          warningReason = av.reason;
          break;
        }
      }
    }
    const isBestSeason = targetCity?.bestMonths.includes(startMonth);

    return {
      startMonth,
      targetName: targetCity ? targetCity.nameKo : (targetCountry ? targetCountry.nameKo : ''),
      countryBest: targetCountry?.bestSeason,
      avoidSeason: targetCountry?.avoidSeason,
      avoidReason: warningReason || targetCountry?.avoidReason,
      isWarning: Boolean(warningReason),
      isBestSeason: Boolean(isBestSeason),
    };
  }, [startDate, locations, country]);

  // Filtered lists for Builder autocomplete
  const filteredBuilderCountries = useMemo(() => {
    const q = builderCountrySearch.trim().toLowerCase();
    if (!q) return WORLD_COUNTRIES.slice(0, 15);
    return WORLD_COUNTRIES.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    );
  }, [builderCountrySearch]);

  const filteredBuilderCities = useMemo(() => {
    const pool = smartCountry ? WORLD_CITIES.filter(c => c.countryEn === smartCountry.nameEn) : WORLD_CITIES;
    const q = builderCitySearch.trim().toLowerCase();
    if (!q) return pool.slice(0, 20);
    return pool.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [smartCountry, builderCitySearch]);

  // Filtered Country List (only opens when typing)
  const filteredCountries = useMemo(() => {
    if (!countrySearchInput.trim()) return [];
    const q = countrySearchInput.trim().toLowerCase();
    return WORLD_COUNTRIES.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [countrySearchInput]);

  const matchedCountry = useMemo(() => findCountryByNameOrAlias(country), [country]);
  const citiesForSelectedCountry = useMemo(() => {
    if (!matchedCountry) return [];
    return WORLD_CITIES.filter(c => c.countryEn === matchedCountry.nameEn);
  }, [matchedCountry]);

  if (!isOpen) return null;

  // --- Handler: Select Country (Manual)
  const handleSelectCountry = (c: DestinationCountry) => {
    setCountry(c.nameEn);
    setCountrySearchInput(`${c.nameKo} (${c.nameEn})`);
    setIsCountryDropdownOpen(false);
    if (!locations.some(l => l.name.toUpperCase() === c.nameEn.toUpperCase())) {
      setLocations(prev => [{ name: c.nameEn, country: c.nameEn }, ...prev]);
    }
  };

  // --- Handler: Add City to Locations + auto-title
  const handleAddCityToLocations = (cityName: string, coords?: { lat: number; lng: number }, countryEn?: string) => {
    if (!cityName) return;
    if (locations.some(l => l.name.toLowerCase() === cityName.toLowerCase())) return;
    const newLoc = { name: cityName, lat: coords?.lat, lng: coords?.lng, country: countryEn };
    setLocations(prev => {
      const next = [...prev, newLoc];
      // Auto title if empty
      setTitle(t => t.trim() ? t : buildAutoTitle(prev, cityName));
      return next;
    });
    if (countryEn && !country) {
      setCountry(countryEn);
      const cObj = findCountryByNameOrAlias(countryEn);
      if (cObj) setCountrySearchInput(`${cObj.nameKo} (${cObj.nameEn})`);
    }
  };

  // --- Handler: Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('트립 제목을 입력해 주세요.');
    if (!startDate || !endDate) return setError('날짜를 입력해 주세요.');

    const startFormatted = startDate.replace(/-/g, '.');
    const endFormatted = endDate.replace(/-/g, '.');
    const dateRange = `${startFormatted} - ${endFormatted}`;
    const combinedLocationStr = locations.map(loc => loc.name).join(', ');
    const firstLat = locations[0]?.lat;
    const firstLng = locations[0]?.lng;

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE TRIP',
      message: `'${title.trim()}' 트립을 새로 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          title.trim(), dateRange, combinedLocationStr,
          tags.length > 0 ? tags : ['Personal'],
          firstLat, firstLng, members, locations, statusBadge, country.trim()
        );
        onClose();
      }
    });
  };

  // --- Handler: Select Preset Card
  const handleSelectPreset = (preset: PresetTripPlan) => {
    setSelectedPresetId(preset.id);
  };

  // --- Handler: Confirm Generation from Preset
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
        id: baseId + i * 100 + idx + 1, time: it.time, type: it.type,
        place: it.place, memo: it.memo, cost: it.cost || '-', date: dateKey
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
      message: `'${preset.title}' 프리셋으로 트립을 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          preset.title, dateRange, preset.city, [...preset.tags, preset.country],
          cityMeta?.lat, cityMeta?.lng, [],
          [{ name: preset.city, lat: cityMeta?.lat, lng: cityMeta?.lng, country: preset.country }],
          'NEW', preset.country, preset.coverImg, timelineDays
        );
        onClose();
      }
    });
  };

  // --- Handler: Smart Builder Submit
  const handleSmartBuilderSubmit = () => {
    if (!smartCity && !smartCountry) return setError('목표 도시 또는 국가를 선택해 주세요.');

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

    const titleStr = `${cityName.toUpperCase()} ${selectedTheme !== 'all' ? selectedTheme.toUpperCase() : 'SMART'} TRIP`;
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
      message: `'${titleStr}' 트립을 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          titleStr, dateRange, cityName,
          [countryName, cityName, selectedTheme !== 'all' ? selectedTheme : 'SmartTrip'],
          city?.lat, city?.lng, [],
          [{ name: cityName, lat: city?.lat, lng: city?.lng, country: countryName }],
          'NEW', countryName, coverImg, timelineDays
        );
        onClose();
      }
    });
  };

  // --- Preset CRUD (admin only)
  const handleOpenNewPreset = () => {
    setEditingPresetData({
      id: `custom-preset-${Date.now()}`,
      title: '', subtitle: '', country: 'JAPAN', city: '도쿄',
      durationDays: 4, tags: ['Custom'],
      coverImg: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
      theme: 'culture', highlights: ['핵심 명소 탐방', '로컬 미식 체험'],
      schedule: [], isCustom: true
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
    { id: 'food', label: 'FOOD', icon: Utensils },
    { id: 'nature', label: 'NATURE', icon: Palmtree },
    { id: 'activity', label: 'ACTIVITY', icon: Compass },
    { id: 'art', label: 'ART', icon: Building2 }
  ];

  const selectedPresetObj = presets.find(p => p.id === selectedPresetId);

  // Shared input style tokens
  const inputCls = 'w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-mono';
  const labelCls = 'text-[10px] font-mono uppercase font-bold tracking-widest text-black/50 dark:text-white/50';
  const iconCls = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30';
  const hintCls = 'text-[10px] text-black/40 dark:text-white/40 mt-0.5 leading-snug';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center items-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Card — no inner shadow-box, clean border */}
      <div className="relative w-full max-w-xl bg-[#F9F8F6] dark:bg-[#121212] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col z-10 text-black dark:text-white max-h-[95vh] overflow-hidden my-auto shrink-0">
        
        {/* Header — typography only, no icon box */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/10 dark:border-white/10">
          <div>
            <h2 className="text-sm font-black uppercase font-mono tracking-widest leading-none text-black dark:text-white">
              TRIP GUIDE
            </h2>
            <p className="text-[9px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest mt-0.5">
              SMART TRIP BUILDER
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher — compact */}
        <div className="flex border-b border-black/10 dark:border-white/10">
          {(['presets', 'builder', 'manual'] as const).map(tab => {
            const icons = { presets: Layers, builder: Globe, manual: Sliders };
            const labels = { presets: 'PRESETS', builder: 'BUILDER', manual: 'MANUAL' };
            const Icon = icons[tab];
            const active = modalMode === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setModalMode(tab)}
                className={`flex-1 py-2.5 text-[10px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  active
                    ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                    : 'border-transparent text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{labels[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <p className="text-red-600 dark:text-red-400 text-[11px] font-mono border-l-2 border-red-500 pl-3">{error}</p>
          )}

          {/* ============================================================ */}
          {/* TAB 1: PRESETS */}
          {/* ============================================================ */}
          {modalMode === 'presets' && (
            <div className="space-y-4">
              
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                  {presets.length} PRESETS
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {onOpenManagePresets && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenManagePresets();
                        }}
                        className="text-[9px] font-mono text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white underline cursor-pointer"
                      >
                        MANAGE HUB ↗
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenNewPreset}
                      className="flex items-center gap-1 text-[10px] font-mono font-black uppercase tracking-wider hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>NEW PRESET</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`group relative flex gap-3 items-center p-3 border transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.06]'
                          : 'border-black/12 dark:border-white/12 hover:border-black/40 dark:hover:border-white/40'
                      }`}
                    >
                      <img 
                        src={preset.coverImg} 
                        alt={preset.title}
                        className="w-14 h-14 object-cover grayscale group-hover:grayscale-0 transition-all shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[8px] font-mono font-black bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 uppercase tracking-wider">
                            {preset.country}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase">
                            {preset.durationDays}D
                          </span>
                        </div>
                        <h4 className="text-[11px] font-bold truncate text-black dark:text-white uppercase leading-tight">
                          {preset.title}
                        </h4>
                        <p className="text-[10px] text-black/45 dark:text-white/45 truncate leading-tight mt-0.5">
                          {preset.highlights[0]}
                        </p>
                      </div>
                      {/* Admin CRUD icons */}
                      {isAdmin && (
                        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditPreset(preset, e)}
                            className="p-1 hover:text-black dark:hover:text-white text-black/30 dark:text-white/30 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="p-1 hover:text-red-600 dark:hover:text-red-400 text-black/30 dark:text-white/30 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Preset — inline preview, no nested box */}
              {selectedPresetObj && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black dark:text-white">
                      {selectedPresetObj.title}
                    </span>
                    <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
                      {selectedPresetObj.city} · {selectedPresetObj.durationDays}박
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPresetObj.highlights.map((h, i) => (
                      <span key={i} className="text-[9px] font-mono text-black/55 dark:text-white/55 border-l border-black/20 dark:border-white/20 pl-1.5">
                        {h}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirmPresetGeneration(selectedPresetObj)}
                    className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>APPLY & CREATE TRIP</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: BUILDER */}
          {/* ============================================================ */}
          {modalMode === 'builder' && (
            <div className="space-y-4">
              
              {/* Theme */}
              <div className="space-y-1.5">
                <label className={labelCls}>THEME</label>
                <div className="flex flex-wrap gap-1">
                  {themes.map(t => {
                    const IconComp = t.icon;
                    const isSelected = selectedTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTheme(t.id)}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/15 dark:border-white/15 text-black/55 dark:text-white/55 hover:border-black/40 dark:hover:border-white/40'
                        }`}
                      >
                        <IconComp className="w-2.5 h-2.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Country & City (Text input with autocomplete) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Country Autocomplete */}
                <div className="space-y-1 relative" ref={builderCountryRef}>
                  <label className={labelCls}>COUNTRY</label>
                  <div className="relative">
                    <MapPin className={iconCls} />
                    <input
                      type="text"
                      value={builderCountrySearch}
                      onChange={(e) => {
                        setBuilderCountrySearch(e.target.value);
                        setIsBuilderCountryOpen(true);
                      }}
                      onFocus={() => setIsBuilderCountryOpen(true)}
                      placeholder="국가 검색 (예: 일본, France)..."
                      className={inputCls}
                    />
                  </div>
                  {isBuilderCountryOpen && filteredBuilderCountries.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                      {filteredBuilderCountries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSmartCountry(c);
                            setBuilderCountrySearch(`${c.nameKo} (${c.nameEn})`);
                            setIsBuilderCountryOpen(false);
                            const cFirst = WORLD_CITIES.find(city => city.countryEn === c.nameEn);
                            if (cFirst) {
                              setSmartCity(cFirst);
                              setBuilderCitySearch(cFirst.nameKo);
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                            {c.nameKo} ({c.nameEn})
                          </span>
                          <span className="text-[9px] font-mono text-black/35 dark:text-white/35">
                            {c.popularCities.slice(0, 2).join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* City Autocomplete */}
                <div className="space-y-1 relative" ref={builderCityRef}>
                  <label className={labelCls}>CITY</label>
                  <div className="relative">
                    <MapPin className={iconCls} />
                    <input
                      type="text"
                      value={builderCitySearch}
                      onChange={(e) => {
                        setBuilderCitySearch(e.target.value);
                        setIsBuilderCityOpen(true);
                      }}
                      onFocus={() => setIsBuilderCityOpen(true)}
                      placeholder={smartCountry ? `${smartCountry.nameKo} 도시 검색...` : "도시 검색 (예: 도쿄, 파리)..."}
                      className={inputCls}
                    />
                  </div>
                  {isBuilderCityOpen && filteredBuilderCities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                      {filteredBuilderCities.map(city => (
                        <button
                          key={city.nameEn}
                          type="button"
                          onClick={() => {
                            setSmartCity(city);
                            setBuilderCitySearch(city.nameKo);
                            setIsBuilderCityOpen(false);
                            const matchedCountry = WORLD_COUNTRIES.find(c => c.nameEn === city.countryEn);
                            if (matchedCountry) {
                              setSmartCountry(matchedCountry);
                              setBuilderCountrySearch(`${matchedCountry.nameKo} (${matchedCountry.nameEn})`);
                            }
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                            {city.nameKo} ({city.nameEn})
                          </span>
                          <span className="text-[9px] font-mono text-black/35 dark:text-white/35">
                            {city.countryKo}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={labelCls}>START DATE</label>
                  <input
                    type="date"
                    value={smartStartDate}
                    onChange={(e) => setSmartStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none rounded-none"
                  />
                  <p className={hintCls}>출발 예정일 — 피크 시즌 전 여유 있게</p>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>DURATION</label>
                  <div className="flex gap-1">
                    {[3, 4, 5, 6, 7].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSmartDurationDays(days)}
                        className={`flex-1 py-2 text-[10px] font-mono font-black border transition-all cursor-pointer ${
                          smartDurationDays === days
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/15 dark:border-white/15 text-black/55 dark:text-white/55 hover:border-black/30'
                        }`}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                  <p className={hintCls}>전체 여행 기간 (박+1일 기준)</p>
                </div>
              </div>

              {/* Season Analysis — inline, no box */}
              {seasonRiskCheck && (
                <div className={`border-l-2 pl-3 py-1 ${
                  seasonRiskCheck.isWarning 
                    ? 'border-amber-500 text-amber-800 dark:text-amber-300'
                    : seasonRiskCheck.isBestSeason
                      ? 'border-emerald-500 text-emerald-800 dark:text-emerald-300'
                      : 'border-black/20 dark:border-white/20 text-black/55 dark:text-white/55'
                }`}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    {seasonRiskCheck.startMonth}월 시즌 분석
                  </p>
                  <p className="text-[11px] font-sans mt-0.5 leading-snug">
                    {seasonRiskCheck.isWarning
                      ? `주의: ${seasonRiskCheck.avoidReason}`
                      : seasonRiskCheck.isBestSeason
                        ? '최적 시즌 — 야외 활동 및 관광에 이상적인 날씨입니다.'
                        : `시즌 참고: 추천 여행 시기는 ${seasonRiskCheck.countryBest || '봄/가을'}입니다.`
                    }
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleSmartBuilderSubmit}
                className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>GENERATE TRIP</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MANUAL */}
          {/* ============================================================ */}
          {modalMode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              
              {/* Trip Title */}
              <div className="space-y-1">
                <label className={labelCls}>TRIP TITLE</label>
                <div className="relative">
                  <Edit3 className={iconCls} />
                  <input 
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. KYOTO AUTUMN TRIP"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1 relative" ref={countryDropdownRef}>
                <label className={labelCls}>COUNTRY</label>
                <div className="relative">
                  <MapPin className={iconCls} />
                  <input 
                    type="text"
                    value={countrySearchInput}
                    onChange={(e) => {
                      setCountrySearchInput(e.target.value);
                      setCountry(e.target.value.toUpperCase());
                      setIsCountryDropdownOpen(e.target.value.trim().length > 0);
                    }}
                    placeholder="국가 검색 (예: 일본, France, 베트남)..."
                    className={inputCls}
                  />
                </div>
                {isCountryDropdownOpen && filteredCountries.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                          {c.nameKo} ({c.nameEn})
                        </span>
                        <span className="text-[9px] font-mono text-black/35 dark:text-white/35">
                          {c.popularCities.slice(0, 2).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Locations */}
              <div className="space-y-1.5">
                <label className={labelCls}>LOCATIONS</label>

                {/* Quick city chips — no box wrapper */}
                {citiesForSelectedCountry.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono text-black/40 dark:text-white/40 self-center">추천:</span>
                    {citiesForSelectedCountry.map(city => (
                      <button
                        key={city.nameEn}
                        type="button"
                        onClick={() => handleAddCityToLocations(city.nameKo, { lat: city.lat, lng: city.lng }, city.countryEn)}
                        className="px-2 py-0.5 text-[9px] font-mono font-bold border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                      >
                        {city.nameKo}
                      </button>
                    ))}
                  </div>
                )}

                {/* Location pills — minimal */}
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {locations.map((loc, idx) => (
                      <span 
                        key={idx} 
                        className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 border border-black/15 dark:border-white/15 text-black dark:text-white"
                      >
                        {loc.name}
                        <button 
                          type="button" 
                          onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))} 
                          className="text-black/35 dark:text-white/35 hover:text-red-500 transition-colors leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Place autocomplete with icon */}
                <div className="relative">
                  <MapPin className={iconCls} />
                  <PlaceAutocompleteInput 
                    value={locationInput}
                    onChange={setLocationInput}
                    onSelectPlace={(placeName, coords, address, countryName) => {
                      if (placeName && !locations.some(l => l.name.toLowerCase() === placeName.toLowerCase())) {
                        const detectedCountry = countryName || (address ? extractCountry(address) : country);
                        const newLoc = { name: placeName, lat: coords?.lat, lng: coords?.lng, country: detectedCountry };
                        setLocations(prev => {
                          const next = [...prev, newLoc];
                          setTitle(t => t.trim() ? t : buildAutoTitle(prev, placeName));
                          return next;
                        });
                        if (detectedCountry && !country) {
                          setCountry(detectedCountry);
                          const cObj = findCountryByNameOrAlias(detectedCountry);
                          if (cObj) setCountrySearchInput(`${cObj.nameKo} (${cObj.nameEn})`);
                        }
                      }
                      setLocationInput('');
                    }}
                    placeholder="도시/장소 검색 후 Enter..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={labelCls}>START DATE</label>
                  <input 
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                  <p className={hintCls}>출발 예정일을 선택하세요.</p>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>END DATE</label>
                  <input 
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none rounded-none text-black dark:text-white font-mono"
                  />
                  <p className={hintCls}>귀국 또는 마지막 일정일</p>
                </div>
              </div>

              {/* Season Analysis for Manual Trip — inline, no box */}
              {manualSeasonRisk && (
                <div className={`border-l-2 pl-3 py-1 ${
                  manualSeasonRisk.isWarning 
                    ? 'border-amber-500 text-amber-800 dark:text-amber-300'
                    : manualSeasonRisk.isBestSeason
                      ? 'border-emerald-500 text-emerald-800 dark:text-emerald-300'
                      : 'border-black/20 dark:border-white/20 text-black/55 dark:text-white/55'
                }`}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    {manualSeasonRisk.targetName ? `${manualSeasonRisk.targetName} ` : ''}{manualSeasonRisk.startMonth}월 시즌 분석
                  </p>
                  <p className="text-[11px] font-sans mt-0.5 leading-snug">
                    {manualSeasonRisk.isWarning
                      ? `주의: ${manualSeasonRisk.avoidReason}`
                      : manualSeasonRisk.isBestSeason
                        ? '최적 시즌 — 야외 활동 및 관광에 이상적인 날씨입니다.'
                        : `시즌 참고: 추천 여행 시기는 ${manualSeasonRisk.countryBest || '봄/가을'}입니다.`
                    }
                  </p>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-1.5">
                <label className={labelCls}>TAGS</label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <span 
                        key={tag} 
                        className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 border border-black/15 dark:border-white/15 text-black dark:text-white"
                      >
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => setTags(prev => prev.filter(t => t !== tag))} 
                          className="text-black/35 dark:text-white/35 hover:text-red-500 transition-colors leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Tag className={iconCls} />
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
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity cursor-pointer"
              >
                CREATE TRIP
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Preset Edit / Create Sub-Modal (admin only) */}
      {isAdmin && isPresetEditing && editingPresetData && (
        <div className="fixed inset-0 z-[10000] flex justify-center items-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#F9F8F6] dark:bg-[#141414] border border-black/30 dark:border-white/30 shadow-2xl p-5 text-black dark:text-white font-mono overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5 mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider">
                {editingPresetData.isCustom && !editingPresetData.title ? 'NEW PRESET' : 'EDIT PRESET'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsPresetEditing(false); setEditingPresetData(null); }}
                className="p-1 hover:opacity-70 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSavePresetData} className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">TITLE</label>
                <input type="text" required value={editingPresetData.title}
                  onChange={e => setEditingPresetData({ ...editingPresetData, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                  placeholder="e.g. TOKYO COFFEE & DESIGN TOUR" />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">SUBTITLE</label>
                <input type="text" value={editingPresetData.subtitle}
                  onChange={e => setEditingPresetData({ ...editingPresetData, subtitle: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                  placeholder="간단한 설명..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">COUNTRY</label>
                  <input type="text" required value={editingPresetData.country}
                    onChange={e => setEditingPresetData({ ...editingPresetData, country: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                    placeholder="JAPAN" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">CITY</label>
                  <input type="text" required value={editingPresetData.city}
                    onChange={e => setEditingPresetData({ ...editingPresetData, city: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                    placeholder="도쿄" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">DURATION (DAYS)</label>
                  <input type="number" min={1} max={30} value={editingPresetData.durationDays}
                    onChange={e => setEditingPresetData({ ...editingPresetData, durationDays: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">THEME</label>
                  <select value={editingPresetData.theme}
                    onChange={e => setEditingPresetData({ ...editingPresetData, theme: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs">
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
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">COVER IMAGE URL</label>
                <input type="text" value={editingPresetData.coverImg}
                  onChange={e => setEditingPresetData({ ...editingPresetData, coverImg: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                  placeholder="https://..." />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-55 mb-1">HIGHLIGHTS (쉼표 구분)</label>
                <input type="text" value={editingPresetData.highlights.join(', ')}
                  onChange={e => setEditingPresetData({ ...editingPresetData, highlights: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 outline-none rounded-none text-xs"
                  placeholder="명소 1, 명소 2, 명소 3" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button"
                  onClick={() => { setIsPresetEditing(false); setEditingPresetData(null); }}
                  className="flex-1 py-2 border border-black/20 dark:border-white/20 text-[10px] font-black uppercase tracking-wider hover:bg-black/5 transition-colors">
                  CANCEL
                </button>
                <button type="submit"
                  className="flex-1 py-2 bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-wider hover:opacity-85 transition-opacity">
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
