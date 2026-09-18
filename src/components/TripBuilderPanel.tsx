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
  ChevronRight,
  ChevronDown,
  Bookmark,
  AlertTriangle,
  ThermometerSun
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
  getClimateMiniMetric,
  parseBestMonthsFromSeasonString,
  convertProposalToPreset
} from '../utils/tripRecommender';
import { getSavedPockets } from '../utils/pocketStorage';
import { SpotPocketItem } from '../types';

export interface TripBuilderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  initialCountry?: string;
  initialCountryCode?: string;
  initialCity?: string;
  initialCities?: string[];
  initialStartDate?: string;
  initialSelectedPockets?: SpotPocketItem[];
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

export interface RoughTemplate {
  id: string;
  name: string;
  countryEn: string;
  countryKo: string;
  cityNameKo: string;
  nights: number;
  theme: string;
  description: string;
  badge: string;
}

export const ROUGH_TEMPLATES: RoughTemplate[] = [
  {
    id: 'rough-jp-3d',
    name: '일본 3일',
    countryEn: 'JAPAN',
    countryKo: '일본',
    cityNameKo: '도쿄',
    nights: 2, // 2박 3일
    theme: 'shopping',
    description: '도쿄/오사카 쇼핑, 미식 & 도심 명소 탐방',
    badge: '2박 3일'
  },
  {
    id: 'rough-sea-4d',
    name: '동남아 4일',
    countryEn: 'VIETNAM',
    countryKo: '베트남',
    cityNameKo: '다낭',
    nights: 3, // 3박 4일
    theme: 'nature',
    description: '다낭/방콕/세부 에메랄드 비치 & 힐링 휴양',
    badge: '3박 4일'
  },
  {
    id: 'rough-eu-6d',
    name: '유럽 6일',
    countryEn: 'FRANCE',
    countryKo: '프랑스',
    cityNameKo: '파리',
    nights: 5, // 5박 6일
    theme: 'culture',
    description: '파리/로마 명소 & 낭만 예술 건축 투어',
    badge: '5박 6일'
  },
  {
    id: 'rough-na-7d',
    name: '북미 7일',
    countryEn: 'UNITED STATES',
    countryKo: '미국',
    cityNameKo: '뉴욕',
    nights: 6, // 6박 7일
    theme: 'activity',
    description: '뉴욕/서부 대륙 랜드마크 & 로드트립',
    badge: '6박 7일'
  },
];

export function TripBuilderPanel({
  isOpen,
  onClose,
  isAdmin = false,
  initialCountry,
  initialCountryCode,
  initialCity,
  initialCities,
  initialStartDate,
  initialSelectedPockets,
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

  // Saved Pockets and Selected Pockets for trip creation
  const [savedPockets, setSavedPockets] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedPocketIds, setSelectedPocketIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    if (initialSelectedPockets && initialSelectedPockets.length > 0) {
      initialSelectedPockets.forEach(p => ids.add(p.id));
    }
    try {
      const stored = sessionStorage.getItem('builder_selected_pockets');
      if (stored) {
        const parsed: SpotPocketItem[] = JSON.parse(stored);
        parsed.forEach(p => ids.add(p.id));
      }
    } catch (_) {}
    return ids;
  });

  // Reload pockets when panel opens or external changes happen
  useEffect(() => {
    if (isOpen) {
      const currentPockets = getSavedPockets();
      setSavedPockets(currentPockets);
      try {
        const stored = sessionStorage.getItem('builder_selected_pockets');
        if (stored) {
          const parsed: SpotPocketItem[] = JSON.parse(stored);
          setSelectedPocketIds(prev => {
            const next = new Set(prev);
            parsed.forEach(p => next.add(p.id));
            return next;
          });
        }
      } catch (_) {}
    }
  }, [isOpen]);

  const handleTogglePocketCheck = (pocketId: string) => {
    setSelectedPocketIds(prev => {
      const next = new Set(prev);
      if (next.has(pocketId)) {
        next.delete(pocketId);
      } else {
        next.add(pocketId);
      }
      return next;
    });
  };

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
  const [savedTemplateIds, setSavedTemplateIds] = useState<Set<string>>(new Set());
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState<boolean>(false);
  const [templateToastMessage, setTemplateToastMessage] = useState<string | null>(null);

  // Selected area's best months (for highlighting the best season range in month grid)
  const activeBestMonths = useMemo<number[]>(() => {
    // 1. 특정 도시가 선택된 경우 해당 도시의 최적 월
    if (smartCity && smartCity.bestMonths && smartCity.bestMonths.length > 0) {
      return smartCity.bestMonths;
    }
    // 2. 국가가 선택된 경우: 국가의 bestSeason ("11월~3월", "4월~6월, 9월~10월" 등) 정밀 파싱
    if (smartCountry) {
      const parsedCountryMonths = parseBestMonthsFromSeasonString(smartCountry.bestSeason);
      if (parsedCountryMonths.length > 0) {
        return parsedCountryMonths;
      }
      const cities = WORLD_CITIES.filter(c => c.countryEn.toUpperCase() === smartCountry.nameEn.toUpperCase());
      const monthsSet = new Set<number>();
      cities.forEach(c => (c.bestMonths || []).forEach(m => monthsSet.add(m)));
      if (monthsSet.size > 0) {
        return Array.from(monthsSet).sort((a, b) => a - b);
      }
    }
    return [4, 5, 9, 10, 11];
  }, [smartCity, smartCountry]);

  // ── Smart Pocket Spots for Selected Country/City ──
  const [isCuratorPocketOpen, setIsCuratorPocketOpen] = useState(true);
  const [isCustomPocketOpen, setIsCustomPocketOpen] = useState(true);

  const { relevantPocketSpots, isAreaMatched, totalSavedCount } = useMemo(() => {
    const allPockets = savedPockets.length > 0 ? savedPockets : getSavedPockets();
    const totalCount = allPockets.length;
    if (totalCount === 0) {
      return { relevantPocketSpots: [] as SpotPocketItem[], isAreaMatched: false, totalSavedCount: 0 };
    }

    // 대상 국가/도시 정밀 키워드 추출 (한글, 영문, 별칭 모두 포함)
    const targetCountryObj = smartCountry || (country ? findCountryByNameOrAlias(country) : null);
    const targetCityObj = smartCity || (locations[0]?.name ? findCityByNameOrAlias(locations[0].name) : null);

    const countryTokens = new Set<string>();
    if (targetCountryObj) {
      countryTokens.add(targetCountryObj.nameKo.toLowerCase());
      countryTokens.add(targetCountryObj.nameEn.toLowerCase());
      countryTokens.add(targetCountryObj.code.toLowerCase());
      (targetCountryObj.aliases || []).forEach(a => countryTokens.add(a.toLowerCase()));
    } else if (country) {
      countryTokens.add(country.toLowerCase().trim());
    }

    const cityTokens = new Set<string>();
    if (targetCityObj) {
      cityTokens.add(targetCityObj.nameKo.toLowerCase());
      cityTokens.add(targetCityObj.nameEn.toLowerCase());
    }
    locations.forEach(l => {
      if (l.name) {
        cityTokens.add(l.name.toLowerCase().trim());
        const matched = findCityByNameOrAlias(l.name);
        if (matched) {
          cityTokens.add(matched.nameKo.toLowerCase());
          cityTokens.add(matched.nameEn.toLowerCase());
        }
      }
    });

    const hasTargetFilter = countryTokens.size > 0 || cityTokens.size > 0;

    // 1단계: 명시적 선택 또는 현재 국가/도시 매칭 필터링
    const matchedSpots = allPockets.filter(s => {
      if (selectedPocketIds.has(s.id)) return true;
      if (!hasTargetFilter) return false;

      const sCountry = (s.country || '').toLowerCase().trim();
      const sCity = (s.city || '').toLowerCase().trim();
      const sAddr = (s.address || '').toLowerCase().trim();
      const sTitle = (s.title || '').toLowerCase().trim();

      const spotCountryObj = findCountryByNameOrAlias(s.country || '');
      const spotCityObj = findCityByNameOrAlias(s.city || '');

      // 국가 일치 검사
      if (countryTokens.size > 0) {
        if (sCountry && countryTokens.has(sCountry)) return true;
        if (spotCountryObj && (countryTokens.has(spotCountryObj.nameEn.toLowerCase()) || countryTokens.has(spotCountryObj.nameKo.toLowerCase()))) return true;
        for (const tok of countryTokens) {
          if (tok && (sCountry.includes(tok) || sAddr.includes(tok) || sTitle.includes(tok))) return true;
        }
      }

      // 도시 일치 검사
      if (cityTokens.size > 0) {
        if (sCity && cityTokens.has(sCity)) return true;
        if (spotCityObj && (cityTokens.has(spotCityObj.nameEn.toLowerCase()) || cityTokens.has(spotCityObj.nameKo.toLowerCase()))) return true;
        for (const tok of cityTokens) {
          if (tok && (sCity.includes(tok) || sAddr.includes(tok) || sTitle.includes(tok))) return true;
        }
      }

      return false;
    });

    // 2단계: 국가/도시 타겟 필터가 있는 경우, 해당 지역에 매칭된 스팟만 정밀 반환 (무관한 타 지역 포켓 누출 차단)
    if (hasTargetFilter) {
      return { relevantPocketSpots: matchedSpots, isAreaMatched: matchedSpots.length > 0, totalSavedCount: totalCount };
    }

    return { relevantPocketSpots: allPockets, isAreaMatched: false, totalSavedCount: totalCount };
  }, [savedPockets, selectedPocketIds, smartCountry, country, smartCity, locations]);

  // Reusable Swiss Minimal Pocket Accordion Renderer
  const renderPocketAccordion = (isOpen: boolean, setIsOpen: (open: boolean) => void) => {
    if (totalSavedCount === 0) {
      return (
        <div className="rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-neutral-800/90 p-3.5 flex items-center justify-between text-xs transition-all">
          <div className="flex items-center gap-2 text-black/60 dark:text-white/60 font-mono">
            <Bookmark className="w-4 h-4 text-black/40 dark:text-white/40" />
            <span>보관된 포켓 장소가 없습니다. 포켓 허브에서 장소를 스크랩해 보세요.</span>
          </div>
        </div>
      );
    }

    if (relevantPocketSpots.length === 0) {
      return (
        <div className="rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-neutral-800/90 p-3.5 flex items-center justify-between text-xs transition-all">
          <div className="flex items-center gap-2 text-black/60 dark:text-white/60 font-mono">
            <Bookmark className="w-4 h-4 text-black/40 dark:text-white/40" />
            <span>선택한 지역과 관련된 보관된 포켓이 없습니다. (총 {totalSavedCount}개 보관됨)</span>
          </div>
        </div>
      );
    }

    const allSelected = relevantPocketSpots.every(s => selectedPocketIds.has(s.id));
    const selectedCount = relevantPocketSpots.filter(s => selectedPocketIds.has(s.id)).length;

    const handleToggleAll = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedPocketIds(prev => {
        const next = new Set(prev);
        if (allSelected) {
          relevantPocketSpots.forEach(s => next.delete(s.id));
        } else {
          relevantPocketSpots.forEach(s => next.add(s.id));
        }
        return next;
      });
    };

    return (
      <div className="rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-neutral-800/90 overflow-hidden transition-all shadow-2xs">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bookmark className="w-4 h-4 text-red-500 shrink-0" />
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-black dark:text-white">
                {isAreaMatched ? 'MATCHING POCKETS' : 'SAVED POCKETS'}
              </span>
              <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
                ({relevantPocketSpots.length}개 {isAreaMatched ? '지역 맞춤' : '보관 장소'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">
                {selectedCount}개 선택됨
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-black/40 dark:text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Accordion Body */}
        {isOpen && (
          <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-2.5 bg-white/70 dark:bg-[#181818]/70">
            <div className="flex items-center justify-between text-xs font-mono px-0.5">
              <span className="text-black/50 dark:text-white/50">
                {isAreaMatched 
                  ? '현재 선택 지역과 일치하는 장소입니다. 선택 시 1일차 일정에 자동 배치됩니다.' 
                  : '보관함 전체 장소 목록입니다. 원하는 장소를 선택하여 일정에 추가하세요.'}
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer shrink-0 ml-2"
              >
                {allSelected ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
              {relevantPocketSpots.map(spot => {
                const isChecked = selectedPocketIds.has(spot.id);
                const catMeta = {
                  food: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'FOOD', icon: Utensils },
                  cafe: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'CAFE', icon: ShoppingBag },
                  spot: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'SPOT', icon: MapPin },
                  shopping: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'SHOPPING', icon: ShoppingBag },
                  tip: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'TIP', icon: Sparkles },
                }[spot.category] || { bg: 'bg-blue-500/10 text-blue-600', label: 'SPOT', icon: MapPin };

                const CatIcon = catMeta.icon;
                const locationText = [spot.city, spot.country].filter(Boolean).join(' · ');

                return (
                  <div
                    key={spot.id}
                    onClick={() => handleTogglePocketCheck(spot.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-neutral-100 dark:bg-neutral-800/95 border-black/30 dark:border-white/30 shadow-xs' 
                        : 'bg-white dark:bg-[#202020] border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Modern Soft Checkbox */}
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                          : 'border border-black/20 dark:border-white/20 bg-neutral-50 dark:bg-neutral-800'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Pocket Thumbnail Preview */}
                      {spot.thumbnailUrl ? (
                        <img
                          src={spot.thumbnailUrl}
                          alt=""
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop'; }}
                          className="w-12 h-12 rounded-lg object-cover shadow-2xs shrink-0 bg-neutral-100 dark:bg-neutral-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg shrink-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black/30 dark:text-white/30">
                          <CatIcon className="w-5 h-5" />
                        </div>
                      )}

                      {/* Meta Information & Title */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 ${catMeta.bg}`}>
                            <CatIcon className="w-2.5 h-2.5" />
                            {catMeta.label}
                          </span>
                          {spot.platform && spot.platform !== 'web' && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                              {spot.platform}
                            </span>
                          )}
                          {locationText && (
                            <span className="text-xs font-mono text-black/50 dark:text-white/50 truncate">
                              {locationText}
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-bold text-black dark:text-white truncate font-sans">
                          {spot.title}
                        </div>

                        {spot.memo && (
                          <div className="text-xs font-mono text-black/60 dark:text-white/60 truncate">
                            {spot.memo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

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
      setSavedTemplateIds(new Set());

      let matchedCity: DestinationCity | undefined;
      let matchedCountryObj: DestinationCountry | undefined;

      const targetCities = (initialCities && initialCities.length > 0) ? initialCities : (initialCity ? [initialCity] : []);

      let matchedCities: DestinationCity[] = [];
      if (targetCities.length > 0) {
        matchedCities = targetCities
          .map(c => findCityByNameOrAlias(c))
          .filter(Boolean) as DestinationCity[];
        if (matchedCities.length > 0) {
          matchedCity = matchedCities[0];
          if (!matchedCountryObj) {
            matchedCountryObj = findCountryByNameOrAlias(matchedCity.countryEn);
          }
        }
      }

      if (!matchedCountryObj && initialCountryCode) {
        matchedCountryObj = WORLD_COUNTRIES.find(c => c.code.toUpperCase() === initialCountryCode.toUpperCase());
      }

      if (!matchedCountryObj && initialCountry) {
        matchedCountryObj = findCountryByNameOrAlias(initialCountry);
      }

      if (!matchedCity && matchedCountryObj) {
        const popCityName = matchedCountryObj.popularCities?.[0];
        if (popCityName) {
          matchedCity = findCityByNameOrAlias(popCityName) || WORLD_CITIES.find(c => c.countryEn.toUpperCase() === matchedCountryObj!.nameEn.toUpperCase());
        } else {
          matchedCity = WORLD_CITIES.find(c => c.countryEn.toUpperCase() === matchedCountryObj!.nameEn.toUpperCase());
        }
        if (matchedCity) {
          matchedCities = [matchedCity];
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

      if (matchedCities.length > 0) {
        setSmartCity(matchedCities[0]);
        setBuilderCitySearch(matchedCities.map(c => c.nameKo).join(', '));
        setTitle(matchedCities.length > 1
          ? `${matchedCities.map(c => c.nameKo).join(' · ')} TRIP`
          : `${matchedCities[0].nameEn.toUpperCase()} TRIP`
        );
        const locs = matchedCities.map(c => ({
          name: c.nameKo,
          lat: c.lat,
          lng: c.lng,
          country: c.countryEn
        }));
        setLocations(locs);
        onFocusLocationChange?.({ country: matchedCountryObj, city: matchedCities[0], locations: locs });
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
  }, [isOpen, initialCountry, initialCountryCode, initialCity, initialCities, initialStartDate]);

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

    // 선택된 포켓들을 1일차 타임라인에 적절한 시간대(10:00, 13:00, 16:00...)로 자동 배치
    const selectedPocketsList = (savedPockets.length > 0 ? savedPockets : getSavedPockets())
      .filter(p => selectedPocketIds.has(p.id));
    if (selectedPocketsList.length > 0 && customTimelineItems.length > 0) {
      const defaultTimeSlots = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '09:00 PM'];
      const pocketTimelineItems = selectedPocketsList.map((p, idx) => ({
        id: Date.now() + 5000 + idx,
        time: defaultTimeSlots[idx % defaultTimeSlots.length],
        title: p.title,
        location: [p.city, p.country].filter(Boolean).join(' · ') || p.title,
        memo: p.memo || (p.address ? `주소: ${p.address}` : '보관된 포켓 장소'),
        category: p.category === 'food' || p.category === 'cafe' ? '식사' : p.category === 'shopping' ? '쇼핑' : '관광',
        type: (p.category === 'food' || p.category === 'cafe' ? 'dining' : p.category === 'shopping' ? 'shopping' : 'activity') as any,
        cost: '-',
        img: p.thumbnailUrl || ''
      }));
      customTimelineItems[0].items = [
        ...pocketTimelineItems,
        ...customTimelineItems[0].items.filter(it => !pocketTimelineItems.some(pi => pi.title === it.title))
      ];
    }

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
        try {
          sessionStorage.removeItem('builder_selected_pockets');
          sessionStorage.removeItem('builder_target_country');
          sessionStorage.removeItem('builder_target_city');
        } catch (_) {}
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
    // 선택된 포켓들을 1일차 타임라인에 적절한 시간대로 자동 배치
    const selectedPocketsList = (savedPockets.length > 0 ? savedPockets : getSavedPockets())
      .filter(p => selectedPocketIds.has(p.id));
    if (selectedPocketsList.length > 0 && timelineItems.length > 0) {
      const defaultTimeSlots = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '09:00 PM'];
      const pocketTimelineItems = selectedPocketsList.map((p, idx) => ({
        id: Date.now() + 5000 + idx,
        time: defaultTimeSlots[idx % defaultTimeSlots.length],
        title: p.title,
        location: [p.city, p.country].filter(Boolean).join(' · ') || p.title,
        memo: p.memo || (p.address ? `주소: ${p.address}` : '보관된 포켓 장소'),
        category: p.category === 'food' || p.category === 'cafe' ? '식사' : p.category === 'shopping' ? '쇼핑' : '관광',
        type: (p.category === 'food' || p.category === 'cafe' ? 'dining' : p.category === 'shopping' ? 'shopping' : 'activity') as any,
        cost: '-',
        img: p.thumbnailUrl || ''
      }));
      timelineItems[0].items = [
        ...pocketTimelineItems,
        ...timelineItems[0].items.filter(it => !pocketTimelineItems.some(pi => pi.title === it.title))
      ];
    }

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

  const handleSaveProposalAsTemplate = (prop: CuratedTripProposal) => {
    try {
      const presetPlan = convertProposalToPreset(prop);
      saveCustomPreset(presetPlan);
      setSavedTemplateIds(prev => new Set(prev).add(prop.id));
      window.dispatchEvent(new Event('tripPresetsChanged'));
    } catch (err) {
      console.error('Failed to save proposal as template:', err);
    }
  };

  const applyRoughTemplate = (tpl: RoughTemplate) => {
    const matchedCountry = WORLD_COUNTRIES.find(c => c.nameEn.toUpperCase() === tpl.countryEn.toUpperCase()) || null;
    const matchedCity = WORLD_CITIES.find(c => c.nameKo === tpl.cityNameKo || c.nameEn.toUpperCase() === tpl.cityNameKo.toUpperCase()) || null;

    if (matchedCountry) {
      setSmartCountry(matchedCountry);
      setCountry(matchedCountry.nameEn);
      setCountrySearchInput(`${matchedCountry.nameKo} (${matchedCountry.nameEn})`);
      setBuilderCountrySearch(`${matchedCountry.nameKo} (${matchedCountry.nameEn})`);
    }
    if (matchedCity) {
      setSmartCity(matchedCity);
      setBuilderCitySearch(matchedCity.nameKo);
    }
    setSmartDurationDays(tpl.nights);
    setSelectedTheme(tpl.theme);

    onFocusLocationChange?.({
      country: matchedCountry,
      city: matchedCity,
      locations: matchedCity ? [{ name: matchedCity.nameKo, lat: matchedCity.lat, lng: matchedCity.lng, country: matchedCity.countryEn }] : undefined
    });

    setIsTemplateDrawerOpen(false);
    setTemplateToastMessage(`'${tpl.name}' 기본 설정이 큐레이터에 적용되었습니다.`);
    setTimeout(() => setTemplateToastMessage(null), 3000);
  };

  const applyPresetToCurator = (preset: PresetTripPlan) => {
    const matchedCountry = WORLD_COUNTRIES.find(c => c.nameEn.toUpperCase() === (preset.country || '').toUpperCase() || c.nameKo === preset.country) || null;
    const matchedCity = WORLD_CITIES.find(c => c.nameKo === preset.city || c.nameEn.toUpperCase() === (preset.city || '').toUpperCase()) || null;

    if (matchedCountry) {
      setSmartCountry(matchedCountry);
      setCountry(matchedCountry.nameEn);
      setCountrySearchInput(`${matchedCountry.nameKo} (${matchedCountry.nameEn})`);
      setBuilderCountrySearch(`${matchedCountry.nameKo} (${matchedCountry.nameEn})`);
    }
    if (matchedCity) {
      setSmartCity(matchedCity);
      setBuilderCitySearch(matchedCity.nameKo);
    }
    const nights = Math.max(1, (preset.durationDays || 3) - 1);
    setSmartDurationDays(nights);
    if (preset.theme) setSelectedTheme(preset.theme);

    onFocusLocationChange?.({
      country: matchedCountry,
      city: matchedCity,
      locations: matchedCity ? [{ name: matchedCity.nameKo, lat: matchedCity.lat, lng: matchedCity.lng, country: matchedCity.countryEn }] : undefined
    });

    setIsTemplateDrawerOpen(false);
    setTemplateToastMessage(`'${preset.title}' 템플릿이 큐레이터에 적용되었습니다.`);
    setTimeout(() => setTemplateToastMessage(null), 3000);
  };

  const handleSaveCurrentCriteriaAsTemplate = () => {
    const finalCountry = smartCountry?.nameEn || smartCity?.countryEn || 'GLOBAL';
    const finalCityKo = smartCity?.nameKo || smartCountry?.popularCities?.[0] || '도시';
    const templateTitle = `${(smartCity?.nameKo || smartCountry?.nameKo || '추천')} ${smartDurationDays}박 ${smartDurationDays + 1}일`;

    const cityObj = smartCity || WORLD_CITIES.find(c => c.countryEn === finalCountry);
    const spots = cityObj ? [...cityObj.iconicSpots, ...cityObj.hiddenGems] : ['도심 랜드마크 탐방'];

    const validThemes: ('shopping' | 'food' | 'activity' | 'nature' | 'art' | 'culture')[] = [
      'shopping', 'food', 'activity', 'nature', 'art', 'culture'
    ];
    const themeValue: 'shopping' | 'food' | 'activity' | 'nature' | 'art' | 'culture' = validThemes.includes(selectedTheme as any)
      ? (selectedTheme as any)
      : 'activity';

    const newCustomPreset: PresetTripPlan = {
      id: `custom-template-${Date.now()}`,
      title: templateTitle,
      subtitle: `${finalCountry} · ${finalCityKo} ${smartDurationDays}박 ${smartDurationDays + 1}일 맞춤 템플릿`,
      country: finalCountry.toUpperCase(),
      city: finalCityKo,
      durationDays: smartDurationDays + 1,
      tags: [finalCountry, selectedTheme !== 'all' ? selectedTheme.toUpperCase() : 'TRAVEL', `${smartDurationDays}박${smartDurationDays + 1}일`],
      coverImg: smartCity?.coverImage || cityObj?.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop',
      theme: themeValue,
      highlights: spots.slice(0, 3),
      isCustom: true,
      schedule: Array.from({ length: smartDurationDays + 1 }).map((_, dIdx) => ({
        dayOffset: dIdx,
        items: [
          { time: '10:00 AM', type: 'activity', place: spots[dIdx % spots.length] || `${finalCityKo} 명소`, memo: '추천 스팟 탐방' },
          { time: '01:00 PM', type: 'dining', place: `${finalCityKo} 로컬 맛집`, memo: '시그니처 미식' },
          { time: '04:00 PM', type: 'activity', place: spots[(dIdx + 1) % spots.length] || `${finalCityKo} 시내 산책`, memo: '자유 힐링 코스' }
        ]
      }))
    };

    saveCustomPreset(newCustomPreset);
    setPresets(getSavedPresets());
    setTemplateToastMessage(`'${templateTitle}'이(가) 나만의 템플릿으로 저장되었습니다.`);
    setTimeout(() => setTemplateToastMessage(null), 3000);
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

  // Soft Mobile Native Form Styles (Nou producte reference style)
  const softInputCls = 'w-full px-4 py-3 text-sm bg-neutral-100 dark:bg-neutral-800/90 rounded-xl text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 font-medium border border-transparent focus:border-black/20 dark:focus:border-white/20 outline-none transition-all';
  const fieldLabelCls = 'text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1 mb-1.5 font-sans';

  const renderSeasonAnalysisBlock = (analysis: any) => {
    if (!analysis) return null;
    const isWarn = Boolean(analysis.isWarning);
    const isBest = Boolean(analysis.isBestSeason);

    const badgeLabel = isWarn ? '주의 시즌' : isBest ? '최적 시즌' : '시즌 참고';
    const badgeCls = isWarn
      ? 'bg-red-600 text-white font-black'
      : isBest
        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black font-black'
        : 'bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70 font-bold';

    const containerCls = isWarn
      ? 'border-l-4 border-red-500 bg-red-500/10 dark:bg-red-500/15 border-y border-r border-red-500/20 text-red-700 dark:text-red-300'
      : isBest
        ? 'border-l-4 border-emerald-500 bg-emerald-500/[0.07] dark:bg-emerald-500/10 border-y border-r border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
        : 'border-l-4 border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800/80 border-y border-r border-black/5 dark:border-white/5 text-neutral-700 dark:text-neutral-300';

    return (
      <div className={`rounded-xl p-3 space-y-1.5 text-xs font-sans ${containerCls} transition-all`}>
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isWarn ? 'bg-red-500' : isBest ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
            <span className="font-bold text-black dark:text-white">
              {analysis.targetName ? `${analysis.targetName} · ` : ''}{analysis.startMonth}월 시즌 분석
            </span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wider ${badgeCls}`}>
            {isWarn && <AlertTriangle className="w-3 h-3 stroke-[2.5]" />}
            {isBest && <Check className="w-3 h-3 stroke-[2.5]" />}
            {badgeLabel}
          </span>
        </div>
        {isWarn ? (
          <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-snug">
            주의: {analysis.avoidReason || '기상 악화 또는 극심한 인파 집중 우려'}
          </p>
        ) : isBest ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 leading-snug">
            최적 여행 시기 — 온화하고 쾌적한 날씨로 관광에 가장 이상적인 시기입니다.
          </p>
        ) : (
          <p className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">
            추천 시기: 해당 지역의 최적 시즌은 {analysis.countryBest || '봄·가을'}입니다.
          </p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <aside className="w-full h-full flex flex-col bg-white dark:bg-[#121212] border-t lg:border-t-0 lg:border-l border-black/10 dark:border-white/10 text-black dark:text-white overflow-hidden font-sans select-none z-30 shadow-2xl">
      {/* Panel Header (Nou producte Reference Style) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
            title="닫기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight text-black dark:text-white font-sans">
            Trip Guide
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
          title="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5 dark:border-white/5 bg-neutral-50 dark:bg-[#181818] shrink-0">
        {([
          { id: 'curator', label: 'CURATOR', icon: Compass },
          { id: 'custom', label: 'CUSTOM', icon: Sliders },
        ] as const).map(tab => {
          const Icon = tab.icon;
          const active = panelTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPanelTab(tab.id)}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
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
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop'; }}
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
                {/* ─── SOFT ROUND HERO WIDGET (Nou producte reference style) ─── */}
                <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 p-5 border border-black/5 dark:border-white/5 flex flex-col justify-between min-h-[140px] relative overflow-hidden transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                      {smartCountry ? `${smartCountry.nameKo} · ${smartCountry.nameEn}` : 'GLOBAL TRIP'}
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-[#1f1f1f] px-2.5 py-0.5 rounded-full shadow-2xs">
                      {smartDurationDays}박 {smartDurationDays + 1}일
                    </span>
                  </div>

                  {/* Visual & Title Center */}
                  <div className="my-2.5">
                    {smartCity || smartCountry ? (
                      <div className="flex items-center gap-3">
                        {smartCity?.coverImage && (
                          <img
                            src={smartCity.coverImage}
                            alt={smartCity.nameKo}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop'; }}
                            className="w-14 h-14 rounded-xl object-cover shadow-xs shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-black dark:text-white truncate">
                            {smartCity ? `${smartCity.nameKo} (${smartCity.nameEn})` : smartCountry?.nameKo}
                          </h3>
                          <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5">
                            {selectedTheme !== 'all' ? `${themes.find(t => t.id === selectedTheme)?.label || selectedTheme} 테마` : '전체 테마 큐레이션'} • {targetMonth === 0 ? '자동 시즌' : `${targetYear}.${String(targetMonth).padStart(2, '0')}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsTemplateDrawerOpen(true)}
                        className="flex flex-col items-center justify-center py-2 text-center cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div className="w-9 h-9 rounded-full bg-white dark:bg-neutral-700 shadow-2xs flex items-center justify-center text-black dark:text-white mb-1.5">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-black/70 dark:text-white/70">
                          여정 템플릿 불러오기
                        </span>
                        <span className="text-[10.5px] font-mono text-black/40 dark:text-white/40 mt-0.5">
                          일본 3일 · 동남아 4일 · 유럽 6일 등
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Quick Controls */}
                  <div className="pt-2 flex items-center gap-2 border-t border-black/5 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsTemplateDrawerOpen(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-black dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>TEMPLATES</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCurrentCriteriaAsTemplate}
                      className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-black dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="현재 설정을 나만의 템플릿으로 저장"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>SAVE TEMPLATE</span>
                    </button>
                  </div>
                </div>

                {/* Toast Notification for Template actions */}
                {templateToastMessage && (
                  <div className="p-3 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-xl text-xs font-medium flex items-center justify-between shadow-lg">
                    <span>{templateToastMessage}</span>
                    <button
                      type="button"
                      onClick={() => setTemplateToastMessage(null)}
                      className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 1. Trip Title Field (Nom * style) */}
                <div className="space-y-1">
                  <label className={fieldLabelCls}>
                    Trip Title <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={title || (smartCity ? `${smartCity.nameKo} TRIP` : smartCountry ? `${smartCountry.nameKo} TRIP` : '')}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="여정 타이틀을 입력하세요..."
                    className={softInputCls}
                  />
                </div>

                {/* 2. Destination Field (Preu * style 2-column) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={fieldLabelCls}>
                      Destination <span className="text-red-500 font-bold">*</span>
                    </label>
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
                        className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 relative" ref={builderCountryRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={builderCountrySearch}
                          onChange={(e) => {
                            setBuilderCountrySearch(e.target.value);
                            setIsBuilderCountryOpen(true);
                          }}
                          onFocus={() => setIsBuilderCountryOpen(true)}
                          placeholder="국가 검색..."
                          className={`${softInputCls} pr-7`}
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                            title="국가 선택 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isBuilderCountryOpen && filteredBuilderCountries.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5 p-1">
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
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-bold text-black dark:text-white">
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
                        <input
                          type="text"
                          value={builderCitySearch}
                          onChange={(e) => {
                            setBuilderCitySearch(e.target.value);
                            setIsBuilderCityOpen(true);
                          }}
                          onFocus={() => setIsBuilderCityOpen(true)}
                          placeholder="도시 (선택 사항)..."
                          className={`${softInputCls} pr-7`}
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                            title="도시 선택 해제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isBuilderCityOpen && filteredBuilderCities.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-black/10 dark:border-white/10 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-black/5 dark:divide-white/5 p-1">
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
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-bold text-black dark:text-white">
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

                {/* Matching Pockets Accordion */}
                {renderPocketAccordion(isCuratorPocketOpen, setIsCuratorPocketOpen)}

                {/* 3. Dates & Duration (Unitats disponibles * style) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={fieldLabelCls}>
                      Dates & Duration <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-xs font-bold text-black dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                      {smartDurationDays}박 {smartDurationDays + 1}일
                    </span>
                  </div>

                  {/* Year Dropdown & AUTO */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-neutral-100 dark:bg-neutral-800/90 rounded-xl px-3 py-2">
                      <select
                        value={targetYear}
                        onChange={(e) => setTargetYear(Number(e.target.value))}
                        className="bg-transparent text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                      >
                        {Array.from({ length: 11 }).map((_, i) => {
                          const yr = new Date().getFullYear() + i;
                          return (
                            <option key={yr} value={yr} className="bg-white dark:bg-[#202020] text-black dark:text-white">
                              {yr}년
                            </option>
                          );
                        })}
                      </select>
                      <span className="text-xs text-black/20 dark:text-white/20 mx-2">|</span>
                      <input
                        type="number"
                        min={2020}
                        max={2099}
                        value={targetYear}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 2000 && v <= 2099) setTargetYear(v);
                        }}
                        className="w-14 bg-transparent text-xs font-bold text-black dark:text-white outline-none text-right"
                        placeholder="연도"
                      />
                      <span className="text-xs text-black/50 dark:text-white/50 ml-0.5">년</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTargetMonth(0)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        targetMonth === 0
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-black/60 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                      title="지역별 가장 가까운 최적 시즌 자동 배정"
                    >
                      AUTO 시즌
                    </button>
                  </div>

                  {/* Month Buttons */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 justify-items-center py-1">
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
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                              : isAutoBest
                                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 ring-1.5 ring-orange-500 font-bold'
                                : isBestSeason
                                  ? 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white font-bold'
                                  : 'text-black/50 dark:text-white/50 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                          title={isAutoBest ? `AUTO 추천 월 (${m}월)` : isBestSeason ? `추천 최적 시즌 (${m}월)` : `${m}월`}
                        >
                          <span>{m}</span>
                          {isAutoBest && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full ring-1 ring-white dark:ring-black" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Climate & Season Insight for Selected Month / Area */}
                  {(() => {
                    const activeMonth = targetMonth === 0 ? autoBestMonth : targetMonth;
                    const climateMetric = getClimateMiniMetric(
                      smartCity?.nameKo, 
                      smartCountry?.nameKo || country, 
                      activeMonth
                    );
                    const isWarning = Boolean(curatorSeasonRisk?.isWarning);
                    const isBest = !isWarning && (activeBestMonths.includes(activeMonth) || Boolean(curatorSeasonRisk?.isBestSeason));
                    const warningReason = curatorSeasonRisk?.avoidReason;
                    const bestSeasonText = (smartCity && smartCity.bestMonths && smartCity.bestMonths.length > 0)
                      ? smartCity.bestMonths.map(m => `${m}월`).join(', ')
                      : smartCountry?.bestSeason;

                    const containerCls = isWarning
                      ? 'border-l-4 border-red-500 bg-red-500/10 dark:bg-red-500/15 border-y border-r border-red-500/20 dark:border-red-500/30'
                      : isBest
                        ? 'border-l-4 border-emerald-500 bg-emerald-500/[0.07] dark:bg-emerald-500/10 border-y border-r border-emerald-500/20 dark:border-emerald-500/25'
                        : 'border-l-4 border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800/80 border-y border-r border-black/5 dark:border-white/5';

                    return (
                      <div className={`rounded-xl p-3 space-y-1.5 transition-all ${containerCls}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isWarning ? 'bg-red-500 animate-pulse' : isBest ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                            <span className="text-xs font-bold text-black dark:text-white">
                              {activeMonth}월 여행 시즌 리포트
                            </span>
                            {targetMonth === 0 && (
                              <span className="text-[10px] font-mono font-bold uppercase text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded-md">
                                AUTO 추천
                              </span>
                            )}
                          </div>
                          {isWarning ? (
                            <span className="text-[10.5px] font-black text-white bg-red-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                              주의 시즌
                            </span>
                          ) : isBest ? (
                            <span className="text-[10.5px] font-black text-white bg-emerald-600 dark:bg-emerald-500 dark:text-black px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              최적 시즌
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-mono font-bold text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                              시즌 참고
                            </span>
                          )}
                        </div>

                        {/* 시즌 상태별 안내 및 주의사항 강조 */}
                        {isWarning && (
                          <div className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 flex items-start gap-1.5 leading-snug">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                            <span>주의 사유: {warningReason || '기상 악화 및 인파 집중 우려'}</span>
                          </div>
                        )}

                        {isBest && !isWarning && (
                          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 leading-snug">
                            온화하고 쾌적한 최적의 날씨로 야외 활동 및 관광에 가장 이상적인 시기입니다.
                          </div>
                        )}

                        {/* 기후 메트릭 (온도 및 강수 특징) */}
                        {climateMetric && (
                          <div className="text-xs font-mono text-black/80 dark:text-white/80 leading-relaxed flex items-center gap-1.5 pt-0.5">
                            <ThermometerSun className={`w-3.5 h-3.5 shrink-0 ${isWarning ? 'text-red-500' : isBest ? 'text-emerald-500' : 'text-orange-500'}`} />
                            <span>{climateMetric}</span>
                          </div>
                        )}

                        {/* 추천 방문 시기 */}
                        {bestSeasonText && (
                          <div className="text-[11px] text-black/50 dark:text-white/50 pt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 shrink-0 text-black/40 dark:text-white/40" />
                            <span>추천 방문 시기: {bestSeasonText}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Duration Stepper & Quick Chips */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/90 rounded-xl px-1 py-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSmartDurationDays(prev => Math.max(1, prev - 1))}
                        disabled={smartDurationDays <= 1}
                        className="w-7 h-7 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        title="1박 감소"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold">
                        {smartDurationDays}박
                      </span>
                      <button
                        type="button"
                        onClick={() => setSmartDurationDays(prev => Math.min(30, prev + 1))}
                        disabled={smartDurationDays >= 30}
                        className="w-7 h-7 rounded-lg text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        title="1박 증가"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-4 sm:grid-cols-7 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map(nights => (
                        <button
                          key={nights}
                          type="button"
                          onClick={() => setSmartDurationDays(nights)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                            smartDurationDays === nights
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-black/60 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {nights}박
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Theme Field (Categoría * style) */}
                <div className="space-y-1.5">
                  <label className={fieldLabelCls}>
                    Theme <span className="text-red-500 font-bold">*</span>
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
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-black/60 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Action Submit Button (Crear producte reference style) */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => handleProposeTrips()}
                    className="w-full py-3.5 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>CREATE TRIP</span>
                  </button>
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

                {/* Matching Pockets Accordion for Proposals View */}
                {renderPocketAccordion(isCuratorPocketOpen, setIsCuratorPocketOpen)}

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

                        {/* Action Buttons: Save Template & Select Create */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveProposalAsTemplate(prop);
                            }}
                            disabled={savedTemplateIds.has(prop.id)}
                            className={`py-2 px-2 text-[11px] font-mono font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              savedTemplateIds.has(prop.id)
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            title="TEMPLATES 탭에 저장하여 나중에 언제든 불러오기"
                          >
                            {savedTemplateIds.has(prop.id) ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>SAVED</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>SAVE TEMPLATE</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmProposalGeneration(prop);
                            }}
                            className="py-2 px-2 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-black uppercase tracking-wider hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>CREATE TRIP</span>
                          </button>
                        </div>
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
              <label className={fieldLabelCls}>
                Trip Title <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 2026 도쿄 미식 탐방..."
                className={softInputCls}
              />
            </div>

            {/* Region (Country & City) - Synced with Curator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={fieldLabelCls}>
                  Destination <span className="text-red-500 font-bold">*</span>
                </label>
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
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    초기화
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 relative" ref={countryDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={builderCountrySearch}
                      onChange={(e) => {
                        setBuilderCountrySearch(e.target.value);
                        setIsCountryDropdownOpen(true);
                      }}
                      onFocus={() => setIsCountryDropdownOpen(true)}
                      placeholder="국가 검색..."
                      className={`${softInputCls} pr-7`}
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
                    <input
                      type="text"
                      value={builderCitySearch}
                      onChange={(e) => {
                        setBuilderCitySearch(e.target.value);
                        setIsBuilderCityOpen(true);
                      }}
                      onFocus={() => setIsBuilderCityOpen(true)}
                      placeholder="도시 선택..."
                      className={`${softInputCls} pr-7`}
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
                <label className={fieldLabelCls}>
                  START DATE <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={softInputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={fieldLabelCls}>
                  END DATE <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={softInputCls}
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
                <div className="rounded-xl bg-neutral-100 dark:bg-neutral-800/80 p-3 text-xs font-mono text-black/80 dark:text-white/80 flex items-center justify-between border border-black/5 dark:border-white/5">
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
                <label className={fieldLabelCls}>LOCATIONS (일정에 넣을 세부 스팟)</label>
                <span className="text-xs font-mono text-black/40 dark:text-white/40">
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
                  className={softInputCls}
                />
              </div>

              {/* Quick-Add Spots for selected city */}
              {(() => {
                const targetCityObj = smartCity || (smartCountry ? WORLD_CITIES.find(c => c.countryEn === smartCountry.nameEn) : null);
                if (!targetCityObj) return null;
                const recommendedSpots = [...(targetCityObj.iconicSpots || []), ...(targetCityObj.hiddenGems || [])].slice(0, 5);
                if (recommendedSpots.length === 0) return null;
                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-mono text-black/50 dark:text-white/50 flex items-center justify-between">
                      <span>{targetCityObj.nameKo} 대표 명소 추천 (클릭하여 추가)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
                            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              isAlreadyAdded
                                ? 'bg-neutral-100 dark:bg-neutral-800/40 text-black/30 dark:text-white/30 line-through'
                                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white shadow-2xs'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{spot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Saved Matching Pocket Spots for this Destination ── */}
              {renderPocketAccordion(isCustomPocketOpen, setIsCustomPocketOpen)}

              {/* Added Locations Chips */}
              {locations.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map((loc, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white px-3 py-1.5 rounded-xl shadow-2xs">
                        <span>{loc.name}</span>
                        <button
                          type="button"
                          onClick={() => setLocations(prev => prev.filter((_, i) => i !== idx))}
                          className="text-black/40 dark:text-white/40 hover:text-red-500 cursor-pointer text-sm font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] font-mono text-black/40 dark:text-white/40">
                    * 위 장소들은 트립 생성 시 일자별 추천 타임라인(1일차, 2일차...)에 자동 분배됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className={fieldLabelCls}>TAGS</label>
              <div className="relative">
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
                  className={softInputCls}
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-black px-3 py-1 rounded-xl shadow-2xs">
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))}
                        className="opacity-60 hover:opacity-100 cursor-pointer text-sm font-bold"
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
              className="w-full py-3.5 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>CREATE TRIP</span>
            </button>
          </form>
        )}
      </div>

      {/* ─── INTEGRATED TEMPLATES DRAWER / MODAL ─── */}
      {isTemplateDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col overflow-hidden text-black dark:text-white">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black dark:text-white" />
                <span className="text-sm font-black uppercase font-mono tracking-wider">
                  TEMPLATES LIBRARY
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateDrawerOpen(false)}
                className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 divide-y divide-black/10 dark:divide-white/10">
              {/* 1. Rough Quick Templates */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    대중적 러프 템플릿 (QUICK START)
                  </span>
                  <span className="text-[10px] font-mono text-black/40 dark:text-white/40">4 PRESETS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROUGH_TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => applyRoughTemplate(tpl)}
                      className="p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase font-sans tracking-tight">
                          {tpl.name}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-black/60 dark:text-white/60 line-clamp-2 leading-relaxed font-sans">
                        {tpl.description}
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 text-[9.5px] font-mono text-black/40 dark:text-white/40">
                        <span>{tpl.countryKo}</span>
                        <span>•</span>
                        <span className="uppercase">{tpl.theme}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. My Custom Saved Templates */}
              {presets.some(p => p.isCustom) && (
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                      나만의 맞춤 템플릿 (SAVED TEMPLATES)
                    </span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      {presets.filter(p => p.isCustom).length} SAVED
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {presets.filter(p => p.isCustom).map(cp => (
                      <div
                        key={cp.id}
                        className="p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white bg-white dark:bg-[#1a1a1a] transition-all flex items-center justify-between gap-3 group"
                      >
                        <div
                          onClick={() => applyPresetToCurator(cp)}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold font-sans text-black dark:text-white truncate">
                              {cp.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 shrink-0">
                              {cp.durationDays}D
                            </span>
                          </div>
                          <p className="text-[11px] text-black/60 dark:text-white/60 truncate">
                            {cp.subtitle || cp.highlights?.[0] || '맞춤 저장된 여정'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`'${cp.title}' 템플릿을 삭제하시겠습니까?`)) {
                              deletePresetById(cp.id);
                              setPresets(getSavedPresets());
                            }
                          }}
                          className="p-1.5 text-black/30 dark:text-white/30 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                          title="템플릿 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Global Curated Presets */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black/70 dark:text-white/70">
                    전 세계 추천 여정 (WORLD PRESETS)
                  </span>
                  <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                    {presets.filter(p => !p.isCustom).length} AVAILABLE
                  </span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {presets.filter(p => !p.isCustom).map(wp => (
                    <div
                      key={wp.id}
                      onClick={() => applyPresetToCurator(wp)}
                      className="p-2.5 border border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white bg-white dark:bg-[#1a1a1a] transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 px-1.5 py-0.5">
                            {wp.country}
                          </span>
                          <span className="text-xs font-bold text-black dark:text-white truncate">
                            {wp.title}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-black/50 dark:text-white/50 truncate mt-0.5">
                          {wp.highlights?.[0] || wp.subtitle}
                        </p>
                      </div>
                      <span className="text-[10.5px] font-mono font-bold text-orange-600 dark:text-orange-400 shrink-0">
                        {wp.durationDays}D
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
    </aside>
  );
}
