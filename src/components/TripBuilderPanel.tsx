import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Tag, 
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
  Calendar,
  Sliders
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

export interface TripBuilderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  initialCountry?: string;
  initialCity?: string;
  initialStartDate?: string;
  existingTags?: string[];
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
  onFocusLocationChange?: (info: {
    country?: DestinationCountry | null;
    city?: DestinationCity | null;
    preset?: PresetTripPlan | null;
    locations?: { name: string; lat?: number; lng?: number; country?: string }[];
  }) => void;
}

function buildAutoTitle(currentLocations: { name: string }[], newCityName: string): string {
  const allNames = [...currentLocations.map(l => l.name), newCityName]
    .filter((n, i, arr) => arr.indexOf(n) === i);
  return allNames.join(' · ').toUpperCase() + ' TRIP';
}

export function TripBuilderPanel({
  isOpen,
  onClose,
  isAdmin = false,
  initialCountry,
  initialCity,
  initialStartDate,
  existingTags = [],
  onCreate,
  onFocusLocationChange,
}: TripBuilderPanelProps) {
  // Tabs: PRESETS | BUILDER | MANUAL
  const [panelTab, setPanelTab] = useState<'presets' | 'builder' | 'manual'>('builder');

  // Presets List State
  const [presets, setPresets] = useState<PresetTripPlan[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

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

  // Sync presets
  useEffect(() => {
    const handlePresetsChanged = () => setPresets(getSavedPresets());
    window.addEventListener('tripPresetsChanged', handlePresetsChanged);
    return () => window.removeEventListener('tripPresetsChanged', handlePresetsChanged);
  }, []);

  // Initialize Data when opened or initial values change
  useEffect(() => {
    if (isOpen) {
      setPresets(getSavedPresets());
      setSelectedPresetId(null);

      // Default tab: builder if city/country specified, else presets
      if (initialCity || initialCountry) {
        setPanelTab('builder');
      } else {
        setPanelTab('presets');
      }

      const defaultStart = initialStartDate ? new Date(initialStartDate) : new Date();
      if (!initialStartDate) defaultStart.setDate(defaultStart.getDate() + 7);
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
      setSmartStartDate(startStr);
      setLocationInput('');
      setTagInput('');
      setMembers([]);
      setMemberInput('');
      setStatusBadge('');
      setError('');

      let matchedCity: DestinationCity | undefined;
      let matchedCountryObj: DestinationCountry | undefined;

      if (initialCity) {
        matchedCity = findCityByNameOrAlias(initialCity);
        if (matchedCity) {
          matchedCountryObj = findCountryByNameOrAlias(matchedCity.countryEn);
        }
      }

      if (!matchedCountryObj && initialCountry) {
        matchedCountryObj = findCountryByNameOrAlias(initialCountry);
        if (!matchedCity && matchedCountryObj) {
          matchedCity = WORLD_CITIES.find(c => c.countryEn === matchedCountryObj!.nameEn);
        }
      }

      if (matchedCountryObj) {
        setSmartCountry(matchedCountryObj);
        setBuilderCountrySearch(`${matchedCountryObj.nameKo} (${matchedCountryObj.nameEn})`);
        setCountry(matchedCountryObj.nameEn);
        setCountrySearchInput(`${matchedCountryObj.nameKo} (${matchedCountryObj.nameEn})`);
        setTags([matchedCountryObj.nameEn]);
      } else {
        setSmartCountry(null);
        setBuilderCountrySearch('');
        setCountry('');
        setCountrySearchInput('');
        setTags([]);
      }

      if (matchedCity) {
        setSmartCity(matchedCity);
        setBuilderCitySearch(matchedCity.nameKo);
        setTitle(`${matchedCity.nameEn.toUpperCase()} TRIP`);
        const locs = [{ name: matchedCity.nameKo, lat: matchedCity.lat, lng: matchedCity.lng, country: matchedCity.countryEn }];
        setLocations(locs);
        onFocusLocationChange?.({ country: matchedCountryObj, city: matchedCity, locations: locs });
      } else if (matchedCountryObj) {
        setTitle(`${matchedCountryObj.nameEn.toUpperCase()} TRIP`);
        const locs = [{ name: matchedCountryObj.nameEn, country: matchedCountryObj.nameEn }];
        setLocations(locs);
        onFocusLocationChange?.({ country: matchedCountryObj, locations: locs });
      } else {
        setSmartCity(null);
        setBuilderCitySearch('');
        setTitle('');
        setLocations([]);
        onFocusLocationChange?.({});
      }
    }
  }, [isOpen, initialCountry, initialCity, initialStartDate]);

  // Notify parent MapHub on focus change
  useEffect(() => {
    if (!isOpen) return;
    const selectedPresetObj = presets.find(p => p.id === selectedPresetId);
    if (panelTab === 'presets') {
      onFocusLocationChange?.({ preset: selectedPresetObj || presets[0] || null });
    } else if (panelTab === 'builder') {
      onFocusLocationChange?.({ country: smartCountry, city: smartCity });
    } else if (panelTab === 'manual') {
      onFocusLocationChange?.({ locations });
    }
  }, [panelTab, smartCountry, smartCity, selectedPresetId, locations, isOpen]);

  // Click outside dropdowns
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

  // Builder season risk
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
    const isBestSeason = Boolean(city?.bestMonths.includes(startMonth));

    return {
      startMonth,
      targetName: city ? city.nameKo : (countryObj ? countryObj.nameKo : ''),
      countryBest: countryObj?.bestSeason,
      avoidSeason: countryObj?.avoidSeason,
      avoidReason: warningReason || countryObj?.avoidReason,
      isWarning: Boolean(warningReason),
      isBestSeason
    };
  }, [smartCity, smartCountry, smartStartDate]);

  // Manual season risk
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

  // Autocomplete filters
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

  // Handlers
  const handleAddCityToLocations = (cityName: string, coords?: { lat: number; lng: number }, countryEn?: string) => {
    if (!cityName) return;
    if (locations.some(l => l.name.toLowerCase() === cityName.toLowerCase())) return;
    const newLoc = { name: cityName, lat: coords?.lat, lng: coords?.lng, country: countryEn };
    setLocations(prev => {
      const next = [...prev, newLoc];
      setTitle(t => t.trim() ? t : buildAutoTitle(prev, cityName));
      return next;
    });
    if (countryEn && !country) {
      setCountry(countryEn);
      const cObj = findCountryByNameOrAlias(countryEn);
      if (cObj) setCountrySearchInput(`${cObj.nameKo} (${cObj.nameEn})`);
    }
  };

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

  const handleConfirmPresetGeneration = (preset: PresetTripPlan) => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const startStr = `${yyyy}.${mm}.${dd}`;

    const endD = new Date(today);
    endD.setDate(endD.getDate() + preset.durationDays);
    const endStr = `${endD.getFullYear()}.${String(endD.getMonth() + 1).padStart(2, '0')}.${String(endD.getDate()).padStart(2, '0')}`;
    const dateRange = `${startStr} - ${endStr}`;

    const cityObj = findCityByNameOrAlias(preset.city);
    const lat = cityObj?.lat;
    const lng = cityObj?.lng;

    const timelineItemsToCreate = preset.schedule.map(day => {
      const curDate = new Date(today);
      curDate.setDate(curDate.getDate() + day.dayOffset);
      const curStr = `${curDate.getFullYear()}.${String(curDate.getMonth() + 1).padStart(2, '0')}.${String(curDate.getDate()).padStart(2, '0')}`;
      return {
        date: curStr,
        items: day.items.map((it, idx) => ({
          id: Date.now() + day.dayOffset * 100 + idx,
          time: it.time,
          title: it.place,
          memo: it.memo,
          category: it.type === 'transit' ? '교통' : it.type === 'dining' ? '식사' : it.type === 'stay' ? '숙소' : '관광',
          type: it.type,
          cost: it.cost || '',
        }))
      };
    });

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE TRIP',
      message: `'${preset.title}' 추천 여정으로 새 트립을 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          preset.title,
          dateRange,
          `${preset.country}, ${preset.city}`,
          [preset.country, ...preset.tags],
          lat,
          lng,
          [],
          [{ name: preset.city, lat, lng, country: preset.country }],
          'NEW',
          preset.country,
          preset.coverImg,
          timelineItemsToCreate
        );
        onClose();
      }
    });
  };

  const handleSmartBuilderGenerate = () => {
    if (!smartCountry && !smartCity) {
      return setError('국가 또는 도시를 선택해 주세요.');
    }
    const finalCountry = smartCountry?.nameEn || smartCity?.countryEn || 'GLOBAL';
    const finalCity = smartCity?.nameKo || smartCountry?.popularCities[0] || 'CITY';
    const cityObj = smartCity || WORLD_CITIES.find(c => c.countryEn === finalCountry);

    const tripTitle = `${(cityObj?.nameEn || finalCity).toUpperCase()} TRIP`;
    const startObj = new Date(smartStartDate);
    const endObj = new Date(startObj);
    endObj.setDate(endObj.getDate() + smartDurationDays);

    const startStr = `${startObj.getFullYear()}.${String(startObj.getMonth() + 1).padStart(2, '0')}.${String(startObj.getDate()).padStart(2, '0')}`;
    const endStr = `${endObj.getFullYear()}.${String(endObj.getMonth() + 1).padStart(2, '0')}.${String(endObj.getDate()).padStart(2, '0')}`;
    const dateRange = `${startStr} - ${endStr}`;

    const spots = cityObj ? [...cityObj.iconicSpots, ...cityObj.hiddenGems] : ['도심 랜드마크 탐방'];
    const generatedTimeline = Array.from({ length: smartDurationDays + 1 }).map((_, dIdx) => {
      const cDate = new Date(startObj);
      cDate.setDate(cDate.getDate() + dIdx);
      const cDateStr = `${cDate.getFullYear()}.${String(cDate.getMonth() + 1).padStart(2, '0')}.${String(cDate.getDate()).padStart(2, '0')}`;
      const spotName = spots[dIdx % spots.length] || `${finalCity} 도심 명소`;

      return {
        date: cDateStr,
        items: [
          {
            id: Date.now() + dIdx * 10 + 1,
            time: '10:00',
            title: `${spotName} 방문`,
            memo: `${selectedTheme !== 'all' ? selectedTheme.toUpperCase() + ' 테마' : '추천 코스'} 도심 투어`,
            category: '관광',
            type: 'activity'
          },
          {
            id: Date.now() + dIdx * 10 + 2,
            time: '13:00',
            title: `${finalCity} 로컬 미식 탐방`,
            memo: '현지 인기 다이닝 및 카페 브레이크',
            category: '식사',
            type: 'dining'
          }
        ]
      };
    });

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE TRIP',
      message: `'${tripTitle}' 여정을 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          tripTitle,
          dateRange,
          `${finalCountry}, ${finalCity}`,
          [finalCountry, selectedTheme !== 'all' ? selectedTheme : 'Travel'],
          cityObj?.lat,
          cityObj?.lng,
          [],
          [{ name: finalCity, lat: cityObj?.lat, lng: cityObj?.lng, country: finalCountry }],
          'NEW',
          finalCountry,
          cityObj?.coverImage || '',
          generatedTimeline
        );
        onClose();
      }
    });
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

  const inputCls = 'w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none transition-colors rounded-none text-black dark:text-white font-sans';
  const labelCls = 'text-[10.5px] font-mono uppercase font-bold tracking-wider text-black/60 dark:text-white/60 mb-1 block';
  const iconCls = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 dark:text-white/40 pointer-events-none';

  const renderSeasonAnalysisBlock = (analysis: any) => {
    if (!analysis) return null;
    const badgeLabel = analysis.isWarning ? '주의 시즌' : analysis.isBestSeason ? '최적 시즌' : '시즌 참고';
    const badgeCls = analysis.isWarning
      ? 'bg-red-600 text-white'
      : analysis.isBestSeason
        ? 'bg-black text-white dark:bg-white dark:text-black'
        : 'bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70';

    const containerCls = analysis.isWarning
      ? 'border-red-600 text-red-700 dark:text-red-400 bg-red-500/5'
      : analysis.isBestSeason
        ? 'border-black dark:border-white text-black dark:text-white bg-black/5 dark:bg-white/5'
        : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 bg-black/[0.02] dark:bg-white/[0.02]';

    return (
      <div className={`border-l-4 pl-3 py-2 pr-2 text-xs font-sans ${containerCls} transition-all`}>
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${badgeCls}`}>
            {badgeLabel}
          </span>
          <span className="font-bold text-black dark:text-white">
            {analysis.targetName ? `${analysis.targetName} · ` : ''}{analysis.startMonth}월 시즌 분석
          </span>
        </div>
        <p className="text-[11px] leading-relaxed">
          {analysis.isWarning
            ? `주의: ${analysis.avoidReason || '기상 악화 또는 극심한 인파 집중 우려'}`
            : analysis.isBestSeason
              ? '최적 여행 시기 — 온화한 날씨와 관광에 가장 이상적인 시기입니다.'
              : `추천 시기: 해당 지역의 최적 시즌은 ${analysis.countryBest || '봄·가을'}입니다.`
          }
        </p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <aside className="w-full h-full flex flex-col bg-[#F9F8F6] dark:bg-[#121212] border-t lg:border-t-0 lg:border-l border-black/15 dark:border-white/15 text-black dark:text-white overflow-hidden font-sans select-none z-30 shadow-2xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/10 dark:border-white/10 shrink-0 bg-white/70 dark:bg-[#161616]/70 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase font-mono tracking-wider text-black dark:text-white">
            TRIP GUIDE
          </span>
          <span className="text-[11px] font-sans text-black/50 dark:text-white/50">
            여정 제작
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          title="닫고 풀스크린 지도로 복원"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
        {([
          { id: 'presets', label: 'PRESETS', icon: Layers },
          { id: 'builder', label: 'BUILDER', icon: Globe },
          { id: 'manual', label: 'MANUAL', icon: Sliders },
        ] as const).map(tab => {
          const Icon = tab.icon;
          const active = panelTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPanelTab(tab.id)}
              className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                active
                  ? 'border-black dark:border-white bg-white dark:bg-[#161616] text-black dark:text-white'
                  : 'border-transparent text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {error && (
          <p className="text-red-600 dark:text-red-400 text-xs font-mono border-l-2 border-red-500 pl-3">{error}</p>
        )}

        {/* ─── TAB 1: PRESETS ─── */}
        {panelTab === 'presets' && (
          <div className="space-y-3">
            <div className="border-l-2 border-black/20 dark:border-white/20 pl-3 py-1">
              <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans">
                추천 여정 템플릿을 선택하면 좌측 지도에 동선이 표시되며 원클릭 생성할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-black/60 dark:text-white/60">
                {presets.length} PRESETS
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {presets.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3 border transition-all cursor-pointer flex gap-3 items-center ${
                      isSelected
                        ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 ring-1 ring-black dark:ring-white'
                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 bg-white dark:bg-[#181818]'
                    }`}
                  >
                    <img
                      src={preset.coverImg}
                      alt={preset.title}
                      className="w-14 h-14 object-cover grayscale shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono font-black bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 uppercase">
                          {preset.country}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">
                          {preset.durationDays}D
                        </span>
                      </div>
                      <h4 className="text-xs font-bold truncate text-black dark:text-white uppercase leading-tight font-sans">
                        {preset.title}
                      </h4>
                      <p className="text-[11px] text-black/60 dark:text-white/60 truncate mt-0.5">
                        {preset.highlights[0]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedPresetObj && (
              <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                    {selectedPresetObj.title}
                  </span>
                  <span className="text-xs font-mono text-black/50 dark:text-white/50">
                    {selectedPresetObj.city} · {selectedPresetObj.durationDays}박 {selectedPresetObj.durationDays + 1}일
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPresetObj.highlights.map((h, i) => (
                    <span key={i} className="text-xs text-black/70 dark:text-white/70 border-l-2 border-black/30 dark:border-white/30 pl-2">
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleConfirmPresetGeneration(selectedPresetObj)}
                  className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>APPLY & CREATE TRIP</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: BUILDER ─── */}
        {panelTab === 'builder' && (
          <div className="space-y-4">
            <div className="border-l-2 border-black/20 dark:border-white/20 pl-3 py-1">
              <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans">
                방문할 국가와 도시를 지정하면 좌측 지도가 해당 지역으로 이동하며 추천 코스를 생성합니다.
              </p>
            </div>

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

            {/* Country & City */}
            <div className="grid grid-cols-2 gap-2">
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
                    placeholder="국가 검색..."
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
                        <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                          {c.popularCities.slice(0, 2).join(', ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 relative" ref={builderCityRef}>
                <label className={labelCls}>CITY</label>
                <div className="relative">
                  <Building2 className={iconCls} />
                  <input
                    type="text"
                    value={builderCitySearch}
                    onChange={(e) => {
                      setBuilderCitySearch(e.target.value);
                      setIsBuilderCityOpen(true);
                    }}
                    onFocus={() => setIsBuilderCityOpen(true)}
                    placeholder="도시 선택..."
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
                          if (!smartCountry) {
                            const cObj = findCountryByNameOrAlias(city.countryEn);
                            if (cObj) {
                              setSmartCountry(cObj);
                              setBuilderCountrySearch(`${cObj.nameKo} (${cObj.nameEn})`);
                            }
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                          {city.nameKo} ({city.nameEn})
                        </span>
                        <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                          {city.countryEn}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dates & Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>START DATE</label>
                <div className="relative">
                  <Calendar className={iconCls} />
                  <input
                    type="date"
                    value={smartStartDate}
                    onChange={(e) => setSmartStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>DURATION (일수)</label>
                <div className="flex items-center gap-1">
                  {[3, 4, 5, 7, 10].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSmartDurationDays(days)}
                      className={`flex-1 py-2 text-xs font-mono font-bold border transition-all cursor-pointer ${
                        smartDurationDays === days
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                          : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40 dark:hover:border-white/40'
                      }`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Season Analysis */}
            {renderSeasonAnalysisBlock(seasonRiskCheck)}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSmartBuilderGenerate}
              className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>GENERATE & CREATE TRIP</span>
            </button>
          </div>
        )}

        {/* ─── TAB 3: MANUAL ─── */}
        {panelTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className={labelCls}>TRIP TITLE *</label>
              <div className="relative">
                <Edit className={iconCls} />
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026 도쿄 미식 탐방..."
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>START DATE *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>END DATE *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 outline-none"
                />
              </div>
            </div>

            {/* Season Analysis */}
            {renderSeasonAnalysisBlock(manualSeasonRisk)}

            {/* Locations */}
            <div className="space-y-1">
              <label className={labelCls}>LOCATIONS</label>
              <div className="relative">
                <PlaceAutocompleteInput
                  value={locationInput}
                  onChange={setLocationInput}
                  onSelectPlace={(placeName: string, coords: { lat: number; lng: number } | null, _address: string, countryName?: string) => {
                    if (placeName) {
                      handleAddCityToLocations(placeName, coords || undefined, countryName);
                      setLocationInput('');
                    }
                  }}
                  placeholder="방문 장소 검색 후 추가..."
                  className={inputCls}
                />
              </div>
              {locations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {locations.map((loc, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 px-2 py-0.5 border border-black/10 dark:border-white/10">
                      <span>{loc.name}</span>
                      <button
                        type="button"
                        onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))}
                        className="text-black/40 dark:text-white/40 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className={labelCls}>TAGS</label>
              <div className="relative">
                <Tag className={iconCls} />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const val = tagInput.trim().replace(/,/g, '');
                      if (val && !tags.includes(val)) {
                        setTags(prev => [...prev, val]);
                        setTagInput('');
                      }
                    }
                  }}
                  placeholder="태그 입력 후 Enter..."
                  className={inputCls}
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-mono bg-black text-white dark:bg-white dark:text-black px-2 py-0.5">
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))}
                        className="opacity-60 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>CREATE TRIP</span>
            </button>
          </form>
        )}
      </div>

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
    </aside>
  );
}
