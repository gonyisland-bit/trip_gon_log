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
  Sliders,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  ChevronRight
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
import { 
  generateCuratedTripProposals, 
  CuratedTripProposal,
  CONTINENTS,
  CONTINENT_COUNTRY_MAP,
  getClimateMiniMetric
} from '../utils/tripRecommender';

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
  // Tabs: CURATOR | TEMPLATES | CUSTOM
  const [panelTab, setPanelTab] = useState<'curator' | 'templates' | 'custom'>('curator');

  // Presets List State
  const [presets, setPresets] = useState<PresetTripPlan[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetStartDate, setPresetStartDate] = useState<string>(() => {
    if (initialStartDate) return initialStartDate;
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    if (initialStartDate) {
      setPresetStartDate(initialStartDate);
    }
  }, [initialStartDate]);

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
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
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

  // Emotional Curated Proposals State
  const [builderStep, setBuilderStep] = useState<'criteria' | 'proposals'>('criteria');
  const [curatedProposals, setCuratedProposals] = useState<CuratedTripProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [seedOffset, setSeedOffset] = useState<number>(0);
  const [targetYear, setTargetYear] = useState<number>(() => new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(0); // 0: Auto Nearest Best, 1-12: Specific Month

  // Selected area's best months (for highlighting the best season range in month grid)
  const activeBestMonths = useMemo<number[]>(() => {
    if (smartCity && smartCity.bestMonths && smartCity.bestMonths.length > 0) {
      return smartCity.bestMonths;
    }
    if (smartCountry) {
      const cities = WORLD_CITIES.filter(c => c.countryEn.toUpperCase() === smartCountry.nameEn.toUpperCase());
      const monthsSet = new Set<number>();
      cities.forEach(c => (c.bestMonths || []).forEach(m => monthsSet.add(m)));
      if (monthsSet.size > 0) {
        return Array.from(monthsSet).sort((a, b) => a - b);
      }
    }
    return [4, 5, 9, 10, 11];
  }, [smartCity, smartCountry]);

  // Nearest best month for currently selected city or country
  const autoBestMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    if (activeBestMonths.length === 0) return 10;

    if (targetYear === currentYear) {
      // Find upcoming best month in this year (if past middle of month, look for upcoming)
      const upcoming = activeBestMonths.filter(m => m > currentMonth || (m === currentMonth && currentDay <= 15));
      if (upcoming.length > 0) {
        return upcoming[0];
      }
      return activeBestMonths[0];
    } else {
      return activeBestMonths[0];
    }
  }, [activeBestMonths, targetYear]);

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
      setPanelTab('curator');

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
      setBuilderStep('criteria');
      setCuratedProposals([]);
      setSelectedProposalId(null);

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
    if (panelTab === 'templates') {
      const activePreset = selectedPresetObj;
      if (activePreset) {
        // Parse cities from preset and look up coordinates
        const rawCities = activePreset.city.split(/[\/,·+]/).map(s => s.trim()).filter(Boolean);
        const presetLocs: { name: string; lat?: number; lng?: number; country?: string }[] = [];
        
        rawCities.forEach(cName => {
          const cObj = findCityByNameOrAlias(cName);
          if (cObj && cObj.lat && cObj.lng) {
            if (!presetLocs.some(l => l.name === (cObj.nameKo || cObj.nameEn))) {
              presetLocs.push({ name: cObj.nameKo || cObj.nameEn, lat: cObj.lat, lng: cObj.lng, country: activePreset.country });
            }
          }
        });

        // Fallback: try full city string
        if (presetLocs.length === 0) {
          const cObj = findCityByNameOrAlias(activePreset.city);
          if (cObj && cObj.lat && cObj.lng) {
            presetLocs.push({ name: cObj.nameKo || cObj.nameEn, lat: cObj.lat, lng: cObj.lng, country: activePreset.country });
          }
        }

        const countryObj = findCountryByNameOrAlias(activePreset.country);
        onFocusLocationChange?.({
          preset: activePreset,
          country: countryObj || null,
          city: presetLocs[0] ? (findCityByNameOrAlias(presetLocs[0].name) || null) : null,
          locations: presetLocs
        });
      } else {
        onFocusLocationChange?.({ preset: null });
      }
    } else if (panelTab === 'curator') {
      if (smartCity) {
        onFocusLocationChange?.({
          country: smartCountry,
          city: smartCity,
          locations: [{ name: smartCity.nameKo, lat: smartCity.lat, lng: smartCity.lng, country: smartCity.countryEn }]
        });
      } else if (smartCountry) {
        onFocusLocationChange?.({ country: smartCountry });
      }
    } else if (panelTab === 'custom') {
      if (smartCity) {
        onFocusLocationChange?.({
          country: smartCountry,
          city: smartCity,
          locations: [{ name: smartCity.nameKo, lat: smartCity.lat, lng: smartCity.lng, country: smartCity.countryEn }]
        });
      } else if (locations.length > 0) {
        onFocusLocationChange?.({ locations });
      }
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

  // Real-time season risk for curator tab
  const curatorSeasonRisk = useMemo(() => {
    if (!smartCity && !smartCountry) return null;
    const city = smartCity;
    const countryObj = smartCountry || (city ? findCountryByNameOrAlias(city.countryEn) : null);
    const activeM = targetMonth === 0 ? autoBestMonth : targetMonth;

    let warningReason: string | null = null;
    if (city) {
      for (const av of (city.avoidMonths || [])) {
        if (av.months.includes(activeM)) {
          warningReason = av.reason;
          break;
        }
      }
    }
    const isBestSeason = Boolean(city?.bestMonths.includes(activeM));

    return {
      startMonth: activeM,
      targetName: city ? city.nameKo : (countryObj ? countryObj.nameKo : ''),
      countryBest: countryObj?.bestSeason,
      avoidSeason: countryObj?.avoidSeason,
      avoidReason: warningReason || countryObj?.avoidReason,
      isWarning: Boolean(warningReason),
      isBestSeason
    };
  }, [smartCity, smartCountry, targetMonth, autoBestMonth]);

  // Autocomplete filters
  const filteredBuilderCountries = useMemo(() => {
    let pool = WORLD_COUNTRIES;
    if (selectedContinent !== 'all') {
      const allowed = CONTINENT_COUNTRY_MAP[selectedContinent] || [];
      pool = pool.filter(c => allowed.includes(c.nameEn.toUpperCase()));
    }
    const q = builderCountrySearch.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    );
  }, [builderCountrySearch, selectedContinent]);

  const filteredBuilderCities = useMemo(() => {
    let pool = smartCountry ? WORLD_CITIES.filter(c => c.countryEn === smartCountry.nameEn) : WORLD_CITIES;
    if (selectedContinent !== 'all' && !smartCountry) {
      const allowed = CONTINENT_COUNTRY_MAP[selectedContinent] || [];
      pool = pool.filter(c => allowed.includes(c.countryEn.toUpperCase()));
    }
    const q = builderCitySearch.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(c => 
      c.nameKo.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.countryKo.toLowerCase().includes(q) ||
      c.countryEn.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [smartCountry, builderCitySearch, selectedContinent]);

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
    
    const combinedLocationStr = locations.length > 0 
      ? locations.map(loc => loc.name).join(', ') 
      : (smartCity?.nameKo || smartCountry?.nameKo || country || '자유 여정');

    const firstLat = locations[0]?.lat || smartCity?.lat;
    const firstLng = locations[0]?.lng || smartCity?.lng;

    // 타임라인 생성 로직 (등록된 LOCATIONS 스팟들을 날짜별로 자동 분배 배치)
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const diffTime = Math.max(0, endD.getTime() - startD.getTime());
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const targetCityName = smartCity?.nameKo || (locations[0]?.name || '');

    const customTimelineItems = Array.from({ length: totalDays }).map((_, dIdx) => {
      const curDate = new Date(startD);
      curDate.setDate(curDate.getDate() + dIdx);
      const curStr = `${curDate.getFullYear()}.${String(curDate.getMonth() + 1).padStart(2, '0')}.${String(curDate.getDate()).padStart(2, '0')}`;
      
      // 일자별 스팟 분배 (예: 1일차, 2일차...)
      const daySpots = locations.filter((_, lIdx) => lIdx % totalDays === dIdx);
      const items = daySpots.map((sp, sIdx) => ({
        id: Date.now() + dIdx * 100 + sIdx,
        time: sIdx === 0 ? '11:00' : '15:30',
        title: `${sp.name} 방문`,
        location: sp.name,
        memo: '사용자 지정 희망 방문 스팟',
        category: '관광',
        type: 'activity' as const
      }));

      if (items.length === 0) {
        items.push({
          id: Date.now() + dIdx * 100,
          time: '11:00',
          title: `${targetCityName || '도심'} 투어 & 일정`,
          location: targetCityName || '',
          memo: '자유 일정 및 로컬 탐방',
          category: '관광',
          type: 'activity' as const
        });
      }

      return {
        date: curStr,
        items
      };
    });

    const finalLocations = locations.length > 0 
      ? locations 
      : (smartCity ? [{ name: smartCity.nameKo, lat: smartCity.lat, lng: smartCity.lng, country: smartCity.countryEn }] : []);

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE TRIP',
      message: `'${title.trim()}' 트립을 새로 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          title.trim(), 
          dateRange, 
          combinedLocationStr,
          tags.length > 0 ? tags : [country || 'Personal'],
          firstLat, 
          firstLng, 
          members, 
          finalLocations, 
          statusBadge, 
          country.trim(),
          smartCity?.coverImage || '',
          customTimelineItems
        );
        onClose();
      }
    });
  };

  const handleConfirmPresetGeneration = (preset: PresetTripPlan) => {
    const baseDate = presetStartDate ? new Date(presetStartDate) : new Date();
    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    const startStr = `${yyyy}.${mm}.${dd}`;

    const endD = new Date(baseDate);
    endD.setDate(endD.getDate() + preset.durationDays);
    const endStr = `${endD.getFullYear()}.${String(endD.getMonth() + 1).padStart(2, '0')}.${String(endD.getDate()).padStart(2, '0')}`;
    const dateRange = `${startStr} - ${endStr}`;

    const cityObj = findCityByNameOrAlias(preset.city);
    const lat = cityObj?.lat;
    const lng = cityObj?.lng;

    const timelineItemsToCreate = preset.schedule.map(day => {
      const curDate = new Date(baseDate);
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
      message: `'${preset.title}' 여정을 생성하시겠습니까?\n(${startStr} - ${endStr}, ${preset.durationDays}박 ${preset.durationDays + 1}일)`,
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

  // Propose Curated Trips using Smart Engine
  const handleProposeTrips = (customOffset?: number) => {
    setError('');
    const curOffset = customOffset !== undefined ? customOffset : seedOffset;
    const proposals = generateCuratedTripProposals({
      theme: selectedTheme,
      continent: selectedContinent,
      country: smartCountry,
      city: smartCity,
      targetYear,
      targetMonth,
      durationDays: smartDurationDays,
      seedOffset: curOffset
    });

    if (proposals.length === 0) {
      setError('추천 여정을 찾지 못했습니다. 다른 조건으로 시도해 주세요.');
      return;
    }

    setCuratedProposals(proposals);
    setSelectedProposalId(proposals[0].id);
    setBuilderStep('proposals');

    // Focus map on the first proposal
    const p = proposals[0];
    onFocusLocationChange?.({
      country: findCountryByNameOrAlias(p.countryEn),
      city: p.cityObj,
      locations: p.locations
    });
  };

  const handleShuffleProposals = () => {
    const nextOffset = seedOffset + 1;
    setSeedOffset(nextOffset);
    handleProposeTrips(nextOffset);
  };

  const handleSelectProposalForMap = (prop: CuratedTripProposal) => {
    setSelectedProposalId(prop.id);
    onFocusLocationChange?.({
      country: findCountryByNameOrAlias(prop.countryEn),
      city: prop.cityObj,
      locations: prop.locations
    });
  };

  const handleConfirmProposalGeneration = (prop: CuratedTripProposal) => {
    const dateRange = `${prop.startDate.replace(/-/g, '.')} - ${prop.endDate.replace(/-/g, '.')}`;
    const timelineItems = prop.timeline.map((day, dIdx) => ({
      date: day.date.replace(/-/g, '.'),
      items: day.items.map((item, iIdx) => ({
        id: Date.now() + dIdx * 100 + iIdx,
        time: item.time,
        title: item.title,
        memo: item.memo,
        category: item.category,
        type: item.type
      }))
    }));

    setConfirmModalState({
      isOpen: true,
      title: 'CREATE CURATED TRIP',
      message: `'${prop.title}' (${prop.nightsDays}) 여정을 생성하시겠습니까?`,
      payload: () => {
        onCreate(
          prop.title,
          dateRange,
          `${prop.countryEn}, ${prop.cityName}`,
          [prop.countryEn, prop.theme.toUpperCase(), `${prop.durationDays}박${prop.durationDays + 1}일`],
          prop.cityObj.lat,
          prop.cityObj.lng,
          [],
          prop.locations,
          'NEW',
          prop.countryEn,
          prop.coverImg,
          timelineItems
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

  const presetDateCalc = useMemo(() => {
    if (!selectedPresetObj) return null;
    const sDate = presetStartDate ? new Date(presetStartDate) : new Date();
    const eDate = new Date(sDate);
    eDate.setDate(eDate.getDate() + selectedPresetObj.durationDays);

    const formatDot = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    };

    return {
      startDateFormatted: formatDot(sDate),
      endDateFormatted: formatDot(eDate),
      rangeStr: `${formatDot(sDate)} - ${formatDot(eDate)}`,
      nightsDays: `${selectedPresetObj.durationDays}박 ${selectedPresetObj.durationDays + 1}일`,
      totalDays: selectedPresetObj.durationDays + 1
    };
  }, [selectedPresetObj, presetStartDate]);

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
          { id: 'curator', label: 'CURATOR', icon: Compass },
          { id: 'templates', label: 'TEMPLATES', icon: Layers },
          { id: 'custom', label: 'CUSTOM', icon: Sliders },
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

        {/* ─── TAB: TEMPLATES (formerly Presets) ─── */}
        {panelTab === 'templates' && (
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

            {/* Expanded Preset Specification Summary Sheet */}
            {selectedPresetObj && presetDateCalc && (
              <div className="pt-4 mt-2 border-t border-black/15 dark:border-white/15 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-500"></span>
                    <span className="text-[11px] font-mono font-black uppercase tracking-widest text-black dark:text-white">
                      PRESET SUMMARY
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {selectedPresetObj.theme.toUpperCase()}
                  </span>
                </div>

                {/* Swiss Minimal 1px Line Data Grid */}
                <div className="divide-y divide-black/10 dark:divide-white/10 text-xs font-sans">
                  {/* 1. Country / City */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-black/50 dark:text-white/50 shrink-0">
                      DESTINATION
                    </span>
                    <div className="text-right flex items-center gap-1.5">
                      <span className="font-mono font-black text-black dark:text-white uppercase px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-[10.5px]">
                        {selectedPresetObj.country}
                      </span>
                      <span className="font-bold text-black dark:text-white">
                        {selectedPresetObj.city}
                      </span>
                    </div>
                  </div>

                  {/* 2. Start Date (Adjustable) */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-black/50 dark:text-white/50 block">
                        START DATE
                      </span>
                      <span className="text-[9.5px] font-sans text-black/40 dark:text-white/40">
                        출발 예정일
                      </span>
                    </div>
                    <input
                      type="date"
                      value={presetStartDate}
                      onChange={(e) => setPresetStartDate(e.target.value)}
                      className="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 text-black dark:text-white outline-none focus:border-black dark:focus:border-white rounded-none cursor-pointer"
                    />
                  </div>

                  {/* 3. Duration & Calculated Period */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-black/50 dark:text-white/50 block">
                        DURATION
                      </span>
                      <span className="text-[9.5px] font-sans text-black/40 dark:text-white/40">
                        전체 일정
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-black dark:text-white text-xs">
                        {presetDateCalc.nightsDays}
                      </span>
                      <span className="text-[10.5px] font-mono text-black/50 dark:text-white/50 block mt-0.5">
                        {presetDateCalc.rangeStr}
                      </span>
                    </div>
                  </div>

                  {/* 4. Highlight Route */}
                  <div className="py-2.5">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-black/50 dark:text-white/50 block mb-2">
                      HIGHLIGHT ROUTE
                    </span>
                    <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-black/20 dark:border-white/20">
                      {selectedPresetObj.highlights.map((h, i) => (
                        <div key={i} className="flex items-baseline gap-2 text-xs">
                          <span className="text-[9.5px] font-mono font-bold text-red-600 dark:text-red-400 shrink-0">
                            0{i + 1}
                          </span>
                          <span className="text-black/80 dark:text-white/80 leading-relaxed font-medium">
                            {h}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Tags */}
                  {selectedPresetObj.tags && selectedPresetObj.tags.length > 0 && (
                    <div className="py-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-black/50 dark:text-white/50 shrink-0">
                        TAGS
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedPresetObj.tags.map((t, idx) => (
                          <span key={idx} className="text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Trip Action Button */}
                <button
                  type="button"
                  onClick={() => handleConfirmPresetGeneration(selectedPresetObj)}
                  className="w-full py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <Check className="w-4 h-4" />
                  <span>CREATE TRIP</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: CURATOR (formerly Builder) ─── */}
        {panelTab === 'curator' && (
          <div className="space-y-4">
            {builderStep === 'criteria' ? (
              <>
                {/* Intro Guide */}
                <div className="border-l-2 border-black/20 dark:border-white/20 pl-3 py-1">
                  <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans">
                    원하시는 조건(테마, 시기, 기간 등)만 가볍게 선택해 보세요. 최적 시즌의 완성도 높은 3가지 여정을 큐레이션해 드립니다.
                  </p>
                </div>

                {/* Continent Filter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>CONTINENT (대륙 필터)</label>
                    <span className="text-[9.5px] font-mono text-black/40 dark:text-white/40">
                      {CONTINENTS.find(c => c.id === selectedContinent)?.labelEn}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {CONTINENTS.map(c => {
                      const isSel = selectedContinent === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedContinent(c.id);
                            if (c.id !== 'all' && smartCountry) {
                              const allowed = CONTINENT_COUNTRY_MAP[c.id] || [];
                              if (!allowed.includes(smartCountry.nameEn.toUpperCase())) {
                                setSmartCountry(null);
                                setSmartCity(null);
                                setBuilderCountrySearch('');
                                setBuilderCitySearch('');
                                onFocusLocationChange?.({});
                              }
                            }
                          }}
                          className={`px-2 py-1 text-[10px] font-mono uppercase border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                              : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40'
                          }`}
                        >
                          {c.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1. Theme */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>1. THEME (여행 테마)</label>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">선택 사항</span>
                  </div>
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

                {/* 2. Region (Country & City) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>2. REGION (목적지 — 미선택 시 전 세계 자동 큐레이션)</label>
                    {(smartCountry || smartCity) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSmartCountry(null);
                          setSmartCity(null);
                          setBuilderCountrySearch('');
                          setBuilderCitySearch('');
                          setCountry('');
                          setCountrySearchInput('');
                          onFocusLocationChange?.({});
                        }}
                        className="text-[10px] font-mono text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 relative" ref={builderCountryRef}>
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
                          placeholder="국가 (전체 스크롤 가능)..."
                          className={`${inputCls} pr-7`}
                        />
                        {builderCountrySearch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSmartCountry(null);
                              setSmartCity(null);
                              setBuilderCountrySearch('');
                              setBuilderCitySearch('');
                              setCountry('');
                              setCountrySearchInput('');
                              onFocusLocationChange?.({});
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                            title="국가 선택 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isBuilderCountryOpen && filteredBuilderCountries.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                          {filteredBuilderCountries.map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSmartCountry(c);
                                setBuilderCountrySearch(`${c.nameKo} (${c.nameEn})`);
                                setCountry(c.nameEn);
                                setCountrySearchInput(`${c.nameKo} (${c.nameEn})`);
                                setIsBuilderCountryOpen(false);
                                setSmartCity(null);
                                setBuilderCitySearch('');
                                onFocusLocationChange?.({ country: c });
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                                {c.nameKo} ({c.nameEn})
                              </span>
                              <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                                {c.popularCities?.slice(0, 2).join(', ') || c.code}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 relative" ref={builderCityRef}>
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
                          placeholder="도시 (선택 사항)..."
                          className={`${inputCls} pr-7`}
                        />
                        {builderCitySearch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSmartCity(null);
                              setBuilderCitySearch('');
                              if (smartCountry) {
                                onFocusLocationChange?.({ country: smartCountry });
                              } else {
                                onFocusLocationChange?.({});
                              }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                            title="도시 선택 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isBuilderCityOpen && filteredBuilderCities.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                          {filteredBuilderCities.map(city => (
                            <button
                              key={city.nameEn}
                              type="button"
                              onClick={() => {
                                setSmartCity(city);
                                setBuilderCitySearch(city.nameKo);
                                setIsBuilderCityOpen(false);
                                let parentCountry = smartCountry;
                                if (!parentCountry) {
                                  parentCountry = findCountryByNameOrAlias(city.countryEn) || null;
                                  if (parentCountry) {
                                    setSmartCountry(parentCountry);
                                    setBuilderCountrySearch(`${parentCountry.nameKo} (${parentCountry.nameEn})`);
                                    setCountry(parentCountry.nameEn);
                                    setCountrySearchInput(`${parentCountry.nameKo} (${parentCountry.nameEn})`);
                                  }
                                }
                                onFocusLocationChange?.({
                                  country: parentCountry,
                                  city: city,
                                  locations: [{ name: city.nameKo, lat: city.lat, lng: city.lng, country: city.countryEn }]
                                });
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
                </div>

                {/* 3. Departure Timing (Year & Month) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>3. DEPARTURE PERIOD (출발 시기)</label>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      {targetMonth === 0 ? `최적 시즌 자동 배정 (${autoBestMonth}월)` : `${targetYear}년 ${targetMonth}월`}
                    </span>
                  </div>

                  {/* Year Selection */}
                  <div className="flex items-center gap-1 mb-1.5">
                    {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(yr => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setTargetYear(yr)}
                        className={`px-3 py-1 text-[10.5px] font-mono font-bold border transition-all cursor-pointer ${
                          targetYear === yr
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/35'
                        }`}
                      >
                        {yr}년
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTargetMonth(0)}
                      className={`ml-auto px-2.5 py-1 text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        targetMonth === 0
                          ? 'bg-red-600 text-white border-red-600'
                          : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/35'
                      }`}
                      title="지역별 가장 가까운 최적 시즌 월 자동 배정"
                    >
                      최적 시즌 자동 ({autoBestMonth}월)
                    </button>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 12 }).map((_, mIdx) => {
                      const m = mIdx + 1;
                      const isSelected = targetMonth === m;
                      const isAutoBest = targetMonth === 0 && autoBestMonth === m;
                      const isBestSeason = activeBestMonths.includes(m);

                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTargetMonth(isSelected ? 0 : m)}
                          className={`py-1.5 text-[10px] font-mono border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-black shadow-sm'
                              : isAutoBest
                                ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-500/10 ring-1 ring-red-500/50 font-black'
                                : isBestSeason
                                  ? 'border-orange-400 dark:border-orange-500/60 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-500/20'
                                  : 'border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:border-black/30'
                          }`}
                          title={isAutoBest ? `가장 빠른 추천 최적 시즌 (${m}월)` : isBestSeason ? `추천 최적 시즌 (${m}월)` : `${m}월`}
                        >
                          <span>{m}월</span>
                          {isAutoBest && (
                            <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-red-600 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Climate Metric & Season Warning */}
                  {(() => {
                    const activeM = targetMonth === 0 ? autoBestMonth : targetMonth;
                    const climateMetric = getClimateMiniMetric(smartCity?.nameKo, smartCountry?.nameKo, activeM);
                    return (
                      <div className="space-y-1 pt-1">
                        {climateMetric && (
                          <div className="text-[10px] font-mono text-black/70 dark:text-white/70 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 border-l-2 border-black/30 dark:border-white/30 flex items-center justify-between">
                            <span className="font-bold text-black/50 dark:text-white/50">{activeM}월 현지 기후</span>
                            <span className="font-semibold text-black dark:text-white">{climateMetric}</span>
                          </div>
                        )}
                        {curatorSeasonRisk && curatorSeasonRisk.isWarning && (
                          <div className="p-2 border-l-2 border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 text-[10.5px] font-mono leading-tight">
                            <span className="font-bold">[주의 시즌 알림] {curatorSeasonRisk.targetName} {curatorSeasonRisk.startMonth}월: </span>
                            <span>{curatorSeasonRisk.avoidReason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Duration */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>4. DURATION (희망 여행 기간)</label>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      {smartDurationDays}박 {smartDurationDays + 1}일
                    </span>
                  </div>
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
                        {days}D ({days}박)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Submit */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleProposeTrips()}
                    className="w-full py-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span>PROPOSE TRIPS (추천 여정 3선 탐색)</span>
                  </button>
                  <p className="text-[10px] font-mono text-center text-black/40 dark:text-white/40 mt-1.5">
                    선택하지 않은 항목은 해당 시즌 최고의 설정으로 자동 큐레이션됩니다.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Proposal View Header */}
                <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setBuilderStep('criteria')}
                    className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>CRITERIA</span>
                  </button>
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider text-black dark:text-white">
                    3 CURATED PROPOSALS
                  </span>
                  <button
                    type="button"
                    onClick={handleShuffleProposals}
                    className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:opacity-80 cursor-pointer transition-opacity"
                    title="다른 추천 조합 보기"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>SHUFFLE</span>
                  </button>
                </div>

                <p className="text-xs text-black/60 dark:text-white/60 font-sans leading-relaxed">
                  카드를 클릭하면 좌측 지도가 해당 여정의 위치로 이동합니다. 마음에 드는 옵션을 선택하여 여정을 생성하세요.
                </p>

                {/* Proposals Card List */}
                <div className="space-y-3">
                  {curatedProposals.map((prop, idx) => {
                    const isSelected = selectedProposalId === prop.id;
                    return (
                      <div
                        key={prop.id}
                        onClick={() => handleSelectProposalForMap(prop)}
                        className={`p-3.5 border transition-all cursor-pointer flex flex-col gap-2.5 ${
                          isSelected
                            ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 ring-1 ring-black dark:ring-white'
                            : 'border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 bg-white dark:bg-[#181818]'
                        }`}
                      >
                        {/* Card Top: Number, Region, Theme Badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-black">
                              0{idx + 1}
                            </span>
                            <span className="text-xs font-mono font-black uppercase text-black dark:text-white">
                              {prop.cityName} ({prop.countryKo})
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70">
                              {prop.themeLabel}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-orange-600 text-white uppercase tracking-wider">
                            {prop.seasonBadge}
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <div>
                          <h4 className="text-sm font-sans font-bold text-black dark:text-white leading-tight">
                            {prop.title}
                          </h4>
                          <p className="text-[11px] font-sans text-black/60 dark:text-white/60 mt-0.5 line-clamp-1">
                            {prop.subtitle}
                          </p>
                        </div>

                        {/* Schedule Line: Dates & Nights */}
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-black/75 dark:text-white/75 py-1 border-y border-black/10 dark:border-white/10">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
                            <span>{prop.startDate.replace(/-/g, '.')} - {prop.endDate.replace(/-/g, '.')}</span>
                          </div>
                          <span className="text-red-600 dark:text-red-400 font-black">{prop.nightsDays}</span>
                        </div>

                        {/* Highlights Chips */}
                        {prop.highlights && prop.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prop.highlights.map((h, hIdx) => (
                              <span
                                key={hIdx}
                                className="text-[9.5px] font-mono font-medium px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70"
                              >
                                #{h}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Season Note Bar */}
                        <div className="border-l-2 border-black/30 dark:border-white/30 pl-2 py-0.5 text-[10.5px] font-sans text-black/60 dark:text-white/60">
                          {prop.seasonNote}
                        </div>

                        {/* Select & Create Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmProposalGeneration(prop);
                          }}
                          className="w-full py-2.5 mt-1 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>SELECT & CREATE TRIP</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TAB: CUSTOM (formerly Manual) ─── */}
        {panelTab === 'custom' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            {/* Continent Filter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={labelCls}>CONTINENT (대륙 필터)</label>
                <span className="text-[9.5px] font-mono text-black/40 dark:text-white/40">
                  {CONTINENTS.find(c => c.id === selectedContinent)?.labelEn}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {CONTINENTS.map(c => {
                  const isSel = selectedContinent === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedContinent(c.id);
                        if (c.id !== 'all' && smartCountry) {
                          const allowed = CONTINENT_COUNTRY_MAP[c.id] || [];
                          if (!allowed.includes(smartCountry.nameEn.toUpperCase())) {
                            setSmartCountry(null);
                            setSmartCity(null);
                            setBuilderCountrySearch('');
                            setBuilderCitySearch('');
                            setCountry('');
                            setCountrySearchInput('');
                            onFocusLocationChange?.({});
                          }
                        }
                      }}
                      className={`px-2 py-1 text-[10px] font-mono uppercase border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                          : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40'
                      }`}
                    >
                      {c.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip Title */}
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
                  className={`${inputCls} pr-7`}
                />
                {title && (
                  <button
                    type="button"
                    onClick={() => setTitle('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                    title="제목 지우기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Region (Country & City) - Synced with Curator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>REGION (거점 국가 / 도시)</label>
                {(smartCountry || smartCity) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSmartCountry(null);
                      setSmartCity(null);
                      setBuilderCountrySearch('');
                      setBuilderCitySearch('');
                      setCountry('');
                      setCountrySearchInput('');
                      onFocusLocationChange?.({});
                    }}
                    className="text-[10px] font-mono text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 relative" ref={countryDropdownRef}>
                  <div className="relative">
                    <MapPin className={iconCls} />
                    <input
                      type="text"
                      value={builderCountrySearch}
                      onChange={(e) => {
                        setBuilderCountrySearch(e.target.value);
                        setIsCountryDropdownOpen(true);
                      }}
                      onFocus={() => setIsCountryDropdownOpen(true)}
                      placeholder="국가 검색..."
                      className={`${inputCls} pr-7`}
                    />
                    {builderCountrySearch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartCountry(null);
                          setSmartCity(null);
                          setBuilderCountrySearch('');
                          setBuilderCitySearch('');
                          setCountry('');
                          setCountrySearchInput('');
                          onFocusLocationChange?.({});
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                        title="국가 선택 해제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {isCountryDropdownOpen && filteredBuilderCountries.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                      {filteredBuilderCountries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSmartCountry(c);
                            setBuilderCountrySearch(`${c.nameKo} (${c.nameEn})`);
                            setCountry(c.nameEn);
                            setCountrySearchInput(`${c.nameKo} (${c.nameEn})`);
                            setIsCountryDropdownOpen(false);
                            setSmartCity(null);
                            setBuilderCitySearch('');
                            onFocusLocationChange?.({ country: c });
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-black dark:text-white font-mono text-[11px]">
                            {c.nameKo} ({c.nameEn})
                          </span>
                          <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                            {c.popularCities?.slice(0, 2).join(', ') || c.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1 relative" ref={builderCityRef}>
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
                      className={`${inputCls} pr-7`}
                    />
                    {builderCitySearch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmartCity(null);
                          setBuilderCitySearch('');
                          if (smartCountry) {
                            onFocusLocationChange?.({ country: smartCountry });
                          } else {
                            onFocusLocationChange?.({});
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                        title="도시 선택 해제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {isBuilderCityOpen && filteredBuilderCities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-[#1e1e1e] border border-black/20 dark:border-white/20 shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5">
                      {filteredBuilderCities.map(city => (
                        <button
                          key={city.nameEn}
                          type="button"
                          onClick={() => {
                            setSmartCity(city);
                            setBuilderCitySearch(city.nameKo);
                            setIsBuilderCityOpen(false);
                            let parentCountry = smartCountry;
                            if (!parentCountry) {
                              parentCountry = findCountryByNameOrAlias(city.countryEn) || null;
                              if (parentCountry) {
                                setSmartCountry(parentCountry);
                                setBuilderCountrySearch(`${parentCountry.nameKo} (${parentCountry.nameEn})`);
                                setCountry(parentCountry.nameEn);
                                setCountrySearchInput(`${parentCountry.nameKo} (${parentCountry.nameEn})`);
                              }
                            }
                            if (!title.trim()) {
                              setTitle(`${city.nameKo} TRIP`);
                            }
                            onFocusLocationChange?.({
                              country: parentCountry,
                              city: city,
                              locations: [{ name: city.nameKo, lat: city.lat, lng: city.lng, country: city.countryEn }]
                            });
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

            {/* Climate Metric for custom selected date */}
            {(() => {
              if (!startDate) return null;
              const m = new Date(startDate).getMonth() + 1;
              if (isNaN(m)) return null;
              const climateMetric = getClimateMiniMetric(smartCity?.nameKo, smartCountry?.nameKo || country, m);
              if (!climateMetric) return null;
              return (
                <div className="text-[10px] font-mono text-black/70 dark:text-white/70 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 border-l-2 border-black/30 dark:border-white/30 flex items-center justify-between">
                  <span className="font-bold text-black/50 dark:text-white/50">{m}월 현지 기후</span>
                  <span className="font-semibold text-black dark:text-white">{climateMetric}</span>
                </div>
              );
            })()}

            {/* Season Analysis */}
            {renderSeasonAnalysisBlock(manualSeasonRisk)}

            {/* Locations (방문 희망 스팟) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>LOCATIONS (일정에 넣을 세부 스팟)</label>
                <span className="text-[9.5px] font-mono text-black/40 dark:text-white/40">
                  타임라인에 자동 배치
                </span>
              </div>
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
                  placeholder="예: 도쿄타워, 시부야 스카이, 센소지 등 검색..."
                  className={inputCls}
                />
              </div>

              {/* Quick-Add Spots for selected city */}
              {(() => {
                const targetCityObj = smartCity || (smartCountry ? WORLD_CITIES.find(c => c.countryEn === smartCountry.nameEn) : null);
                if (!targetCityObj) return null;
                const recommendedSpots = [...(targetCityObj.iconicSpots || []), ...(targetCityObj.hiddenGems || [])].slice(0, 5);
                if (recommendedSpots.length === 0) return null;
                return (
                  <div className="space-y-1 pt-1">
                    <div className="text-[9.5px] font-mono text-black/50 dark:text-white/50 flex items-center justify-between">
                      <span>{targetCityObj.nameKo} 대표 명소 추천 (클릭하여 스팟에 추가)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {recommendedSpots.map(spot => {
                        const isAlreadyAdded = locations.some(l => l.name === spot);
                        return (
                          <button
                            key={spot}
                            type="button"
                            onClick={() => {
                              if (!isAlreadyAdded) {
                                handleAddCityToLocations(spot, undefined, targetCityObj.countryEn);
                              }
                            }}
                            disabled={isAlreadyAdded}
                            className={`px-2 py-0.5 text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                              isAlreadyAdded
                                ? 'border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 line-through bg-black/[0.02]'
                                : 'border-black/20 dark:border-white/20 text-black/75 dark:text-white/75 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white bg-white dark:bg-[#1a1a1a]'
                            }`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{spot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Added Locations Chips */}
              {locations.length > 0 && (
                <div className="space-y-1 mt-1.5">
                  <div className="flex flex-wrap gap-1">
                    {locations.map((loc, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 px-2 py-0.5 border border-black/10 dark:border-white/10">
                        <span>{loc.name}</span>
                        <button
                          type="button"
                          onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))}
                          className="text-black/40 dark:text-white/40 hover:text-red-500 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[9.5px] font-mono text-black/40 dark:text-white/40">
                    * 위 장소들은 트립 생성 시 일자별 추천 타임라인(1일차, 2일차...)에 자동 분배됩니다.
                  </p>
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
