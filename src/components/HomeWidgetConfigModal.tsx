import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Sliders, 
  Calendar, 
  CloudSun, 
  Coins, 
  Clock,
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HomeWidgetConfig, CityWeatherConfig } from '../types';
import { WORLD_CITIES } from '../data/worldDestinations';

interface HomeWidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HomeWidgetConfig;
  onSaveConfig?: (newConfig: HomeWidgetConfig) => void;
}

const DEFAULT_POPULAR_CITIES: CityWeatherConfig[] = [
  { name: '서울', nameEn: 'SEOUL', country: 'KR', lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
  { name: '도쿄', nameEn: 'TOKYO', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: '파리', nameEn: 'PARIS', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: '뉴욕', nameEn: 'NEW YORK', country: 'US', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  { name: '방콕', nameEn: 'BANGKOK', country: 'TH', lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  { name: '오사카', nameEn: 'OSAKA', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
  { name: '런던', nameEn: 'LONDON', country: 'GB', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: '싱가포르', nameEn: 'SINGAPORE', country: 'SG', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: '타이베이', nameEn: 'TAIPEI', country: 'TW', lat: 25.0330, lng: 121.5654, timezone: 'Asia/Taipei' },
  { name: '홍콩', nameEn: 'HONG KONG', country: 'HK', lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  { name: '다낭', nameEn: 'DA NANG', country: 'VN', lat: 16.0544, lng: 108.2022, timezone: 'Asia/Ho_Chi_Minh' },
  { name: '바르셀로나', nameEn: 'BARCELONA', country: 'ES', lat: 41.3851, lng: 2.1734, timezone: 'Europe/Madrid' },
];

export function HomeWidgetConfigModal({
  isOpen,
  onClose,
  config,
  onSaveConfig
}: HomeWidgetConfigModalProps) {
  const [showCalendar, setShowCalendar] = useState<boolean>(config.showCalendarArchive);
  const [showWeather, setShowWeather] = useState<boolean>(config.showLiveWeather);
  const [widgetOrder, setWidgetOrder] = useState<'calendar-first' | 'weather-first'>(config.widgetOrder || 'calendar-first');
  const [showExchange, setShowExchange] = useState<boolean>(!!config.showExchangeRates);
  const [showDDay, setShowDDay] = useState<boolean>(!!config.showUpcomingDDay);
  
  const [cities, setCities] = useState<CityWeatherConfig[]>(
    config.cities && config.cities.length > 0 ? config.cities : DEFAULT_POPULAR_CITIES.slice(0, 5)
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  // Search cities from worldDestinations or popular list
  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    const results: CityWeatherConfig[] = [];
    const addedEn = new Set(cities.map(c => c.nameEn.toUpperCase()));

    // Search in popular defaults first
    for (const d of DEFAULT_POPULAR_CITIES) {
      if (addedEn.has(d.nameEn.toUpperCase())) continue;
      if (d.name.toLowerCase().includes(query) || d.nameEn.toLowerCase().includes(query)) {
        results.push(d);
        addedEn.add(d.nameEn.toUpperCase());
      }
    }

    // Search in WORLD_CITIES
    for (const city of WORLD_CITIES) {
      if (results.length >= 10) break;
      if (addedEn.has(city.nameEn.toUpperCase())) continue;
      if (city.nameKo.toLowerCase().includes(query) || city.nameEn.toLowerCase().includes(query) || city.countryKo.toLowerCase().includes(query) || city.countryEn.toLowerCase().includes(query)) {
        results.push({
          name: city.nameKo,
          nameEn: city.nameEn.toUpperCase(),
          country: city.countryEn,
          lat: city.lat,
          lng: city.lng,
          timezone: 'UTC'
        });
        addedEn.add(city.nameEn.toUpperCase());
      }
    }

    return results.slice(0, 8);
  })();

  const handleAddCity = (city: CityWeatherConfig) => {
    if (cities.length >= 8) {
      alert("도시 목록은 최대 8개까지 설정 가능합니다.");
      return;
    }
    setCities(prev => [...prev, city]);
    setSearchQuery('');
  };

  const handleRemoveCity = (index: number) => {
    if (cities.length <= 1) {
      alert("최소 1개 이상의 도시가 유지되어야 합니다.");
      return;
    }
    setCities(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveCity = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cities.length) return;
    const newCities = [...cities];
    const [moved] = newCities.splice(index, 1);
    newCities.splice(targetIndex, 0, moved);
    setCities(newCities);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const newConfig: HomeWidgetConfig = {
      showCalendarArchive: showCalendar,
      showLiveWeather: showWeather,
      widgetOrder,
      showExchangeRates: showExchange,
      showUpcomingDDay: showDDay,
      cities,
      updatedAt: Date.now()
    };

    try {
      // 1. Cloud persistence: Firestore app_settings/home_widgets
      const docRef = doc(db, 'app_settings', 'home_widgets');
      await setDoc(docRef, newConfig, { merge: true });

      // 2. Local fallback
      localStorage.setItem('cached_home_widget_config', JSON.stringify(newConfig));

      if (onSaveConfig) {
        onSaveConfig(newConfig);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save home widget config:", err);
      // Even if firestore errors, update locally
      localStorage.setItem('cached_home_widget_config', JSON.stringify(newConfig));
      if (onSaveConfig) onSaveConfig(newConfig);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-black dark:text-white" />
            <span className="font-mono font-black text-sm uppercase tracking-wider text-black dark:text-white">
              HOME WIDGET SETTINGS
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-black dark:text-white">
          
          {/* Section 1: Visibility & Layout Order */}
          <div className="space-y-3">
            <span className="text-[10.5px] font-mono font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              1. WIDGET VISIBILITY & ORDER
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Calendar Toggle */}
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className={`p-3 border flex items-center justify-between transition-colors cursor-pointer ${
                  showCalendar
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold'
                    : 'border-black/15 dark:border-white/15 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>CALENDAR ARCHIVE</span>
                </div>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 ${showCalendar ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/10 dark:bg-white/20'}`}>
                  {showCalendar ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Weather Toggle */}
              <button
                type="button"
                onClick={() => setShowWeather(!showWeather)}
                className={`p-3 border flex items-center justify-between transition-colors cursor-pointer ${
                  showWeather
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold'
                    : 'border-black/15 dark:border-white/15 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono">
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>LIVE WEATHER</span>
                </div>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 ${showWeather ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/10 dark:bg-white/20'}`}>
                  {showWeather ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Display Order Selection */}
            <div className="pt-1 flex items-center justify-between p-3 border border-black/10 dark:border-white/10 text-xs font-mono">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
                <span className="text-black/70 dark:text-white/70">WIDGET ORDER</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWidgetOrder('calendar-first')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    widgetOrder === 'calendar-first'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  CALENDAR FIRST
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetOrder('weather-first')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    widgetOrder === 'weather-first'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  WEATHER FIRST
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Extended Feature Modules (Exchange Rates & D-Day) */}
          <div className="space-y-3">
            <span className="text-[10.5px] font-mono font-black uppercase tracking-widest text-black/40 dark:text-white/40 block">
              2. EXTENDED MODULES (OPTIONAL)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowExchange(!showExchange)}
                className={`p-3 border flex items-center justify-between transition-colors cursor-pointer ${
                  showExchange
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold'
                    : 'border-black/15 dark:border-white/15 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Coins className="w-3.5 h-3.5" />
                  <span>EXCHANGE RATES</span>
                </div>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 ${showExchange ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/10 dark:bg-white/20'}`}>
                  {showExchange ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowDDay(!showDDay)}
                className={`p-3 border flex items-center justify-between transition-colors cursor-pointer ${
                  showDDay
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold'
                    : 'border-black/15 dark:border-white/15 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>UPCOMING D-DAY</span>
                </div>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 ${showDDay ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/10 dark:bg-white/20'}`}>
                  {showDDay ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Weather Destination Cities Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-mono font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                3. DESTINATION CITIES ({cities.length}/8)
              </span>
              <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                DRAG OR USE ARROWS TO REORDER
              </span>
            </div>

            {/* City List */}
            <div className="border border-black/10 dark:border-white/10 divide-y divide-black/10 dark:divide-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
              {cities.map((city, idx) => (
                <div 
                  key={`${city.nameEn}-${idx}`}
                  className="p-2.5 sm:px-3 sm:py-2 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-[10px] font-bold text-black/40 dark:text-white/40">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-black dark:text-white truncate">
                      {city.nameEn}
                    </span>
                    <span className="text-[10px] text-black/50 dark:text-white/50">
                      ({city.name})
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                      {city.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCity(idx, 'up')}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === cities.length - 1}
                      onClick={() => handleMoveCity(idx, 'down')}
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCity(idx)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer ml-1"
                      title="도시 제거"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* City Search & Add Box */}
            <div className="relative pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="도시명 검색 후 추가 (예: 서울, 도쿄, 뉴욕, 파리, 런던...)"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-black/5 dark:bg-white/10 border border-black/15 dark:border-white/15 outline-none focus:border-black dark:focus:border-white text-black dark:text-white"
                />
              </div>

              {/* Search Suggestions Popover */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#18181B] border border-black/20 dark:border-white/20 shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                  {searchResults.map((sCity, sIdx) => (
                    <button
                      key={`search-res-${sCity.nameEn}-${sIdx}`}
                      type="button"
                      onClick={() => handleAddCity(sCity)}
                      className="w-full p-2.5 flex items-center justify-between text-xs font-mono hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black dark:text-white">
                          {sCity.nameEn}
                        </span>
                        <span className="text-black/50 dark:text-white/50">
                          {sCity.name}
                        </span>
                        <span className="text-[9.5px] px-1 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                          {sCity.country}
                        </span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-mono font-black uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>SAVE CONFIG</span>
          </button>
        </div>

      </div>
    </div>
  );
}
