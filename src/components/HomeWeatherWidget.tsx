import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Droplets,
  Calendar,
  X
} from 'lucide-react';
import { Trip, CityWeatherConfig } from '../types';
import { fetchCityWeather, getWeatherMeta, CityWeatherData, DailyForecastItem } from '../utils/weatherApi';

interface HomeWeatherWidgetProps {
  trips?: Trip[];
  isAdmin?: boolean;
  onOpenConfig?: () => void;
  customCities?: CityWeatherConfig[];
}

const DEFAULT_POPULAR_DESTINATIONS: CityWeatherConfig[] = [
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
];

export function HomeWeatherWidget({ 
  trips = [], 
  isAdmin = false,
  onOpenConfig,
  customCities
}: HomeWeatherWidgetProps) {
  const [weatherMap, setWeatherMap] = useState<Record<string, CityWeatherData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCityEn, setSelectedCityEn] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Determine active target cities: customCities from settings OR auto-matched from trips + popular
  const targetCities: CityWeatherConfig[] = useMemo(() => {
    if (customCities && customCities.length > 0) {
      return customCities.slice(0, 8);
    }

    const matched: CityWeatherConfig[] = [];
    const addedNames = new Set<string>();

    // 1. If trips exist, prioritize trip locations
    if (trips && trips.length > 0) {
      for (const trip of trips) {
        if (matched.length >= 5) break;
        const candidateCity = ((trip as any).city || trip.locationStr || trip.title || '').toLowerCase();
        const candidateCountry = (trip.country || '').toLowerCase();

        const found = DEFAULT_POPULAR_DESTINATIONS.find(dest => {
          if (addedNames.has(dest.nameEn)) return false;
          return candidateCity.includes(dest.name.toLowerCase()) ||
                 candidateCity.includes(dest.nameEn.toLowerCase()) ||
                 candidateCountry.includes(dest.name.toLowerCase()) ||
                 candidateCountry.includes(dest.nameEn.toLowerCase());
        });

        if (found) {
          matched.push(found);
          addedNames.add(found.nameEn);
        }
      }
    }

    // 2. Fill with standard popular destinations (Seoul is #0)
    for (const def of DEFAULT_POPULAR_DESTINATIONS) {
      if (matched.length >= 5) break;
      if (!addedNames.has(def.nameEn)) {
        matched.push(def);
        addedNames.add(def.nameEn);
      }
    }

    return matched.slice(0, 5);
  }, [trips, customCities]);

  const fetchAllWeather = async () => {
    if (targetCities.length === 0) return;
    setIsLoading(true);

    try {
      const results = await Promise.all(
        targetCities.map(async (city) => {
          try {
            const data = await fetchCityWeather(city.lat, city.lng, city.timezone, city.nameEn, city.country);
            return { cityEn: city.nameEn, data };
          } catch (e) {
            console.warn(`Weather fetch failed for ${city.nameEn}:`, e);
            return null;
          }
        })
      );

      const newMap: Record<string, CityWeatherData> = {};
      results.forEach(res => {
        if (res) newMap[res.cityEn] = res.data;
      });

      setWeatherMap(prev => ({ ...prev, ...newMap }));
      const d = new Date();
      setLastUpdated(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } catch (err) {
      console.warn("Weather fetch notice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllWeather();
  }, [targetCities]);

  const activeForecastCity = selectedCityEn ? weatherMap[selectedCityEn] : null;

  return (
    <section className="w-full max-w-[1920px] mx-auto border-t border-black/10 dark:border-white/10 mt-12 pt-8 pb-8 px-4 sm:px-8 md:px-12 select-none font-sans transition-colors">
      
      {/* Sub-Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 mb-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-widest">
            LIVE WEATHER
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase text-black/60 dark:text-white/60">
            DESTINATION CONDITIONS
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[10px] sm:text-[11px] text-black/50 dark:text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lastUpdated} KST</span>
          </div>

          <button
            type="button"
            onClick={fetchAllWeather}
            disabled={isLoading}
            className="p-1 hover:text-black dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            title="날씨 새로고침"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid Container: Responsive 2-Cols on Mobile (No horizontal cutoff!), 3-Cols on sm, 5-Cols on md+ */}
      <div className="w-full border-b border-black/10 dark:border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-black/10 dark:bg-white/10">
          {targetCities.map((city, idx) => {
            const data = weatherMap[city.nameEn];
            const isSelected = selectedCityEn === city.nameEn;
            const weatherCode = data ? data.weatherCode : 0;
            const precipProb = data?.forecast?.[0]?.precipitationProb;
            const { label, icon: IconComponent, colorClass } = getWeatherMeta(weatherCode, precipProb);

            const temp = data ? data.temp : '--';
            const tempMax = data ? data.tempMax : '--';
            const tempMin = data ? data.tempMin : '--';
            const localTime = data ? data.localTime : '--:--';

            return (
              <button
                key={`${city.nameEn}-${idx}`}
                type="button"
                onClick={() => setSelectedCityEn(isSelected ? null : city.nameEn)}
                className={`p-4 sm:p-5 flex flex-col justify-between gap-3 text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-black/5 dark:bg-white/10 ring-1 ring-inset ring-black dark:ring-white'
                    : 'bg-white dark:bg-[#0c0c0c] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                }`}
                title="클릭하여 1주일 예보 확인"
              >
                {/* Header: City Name + Country Code */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate">
                      {city.nameEn}
                    </span>
                    <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">
                      {city.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 shrink-0">
                    {city.country}
                  </span>
                </div>

                {/* Main Temperature & Weather Icon */}
                <div className="flex items-baseline justify-between gap-2 my-1 w-full">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tighter text-black dark:text-white">
                    {temp}°
                  </span>
                  <div className="flex items-center gap-1.5 text-black/75 dark:text-white/75">
                    <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2] shrink-0 ${colorClass}`} />
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase">
                      {label}
                    </span>
                  </div>
                </div>

                {/* Footer: H/L & Local Time */}
                <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] font-mono text-black/50 dark:text-white/50 pt-2 border-t border-black/5 dark:border-white/5 w-full">
                  <span>H:{tempMax}° L:{tempMin}°</span>
                  <div className="flex items-center gap-1">
                    <span>{localTime}</span>
                    {isSelected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 opacity-40" />}
                  </div>
                </div>

                {/* Selected Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1주일치 날씨 (7-Day Forecast Sub-Panel)                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeForecastCity && activeForecastCity.forecast && activeForecastCity.forecast.length > 0 && (
        <div className="border-b border-l border-r border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2 font-mono">
              <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                {activeForecastCity.cityEn} · 7-DAY FORECAST
              </span>
              <span className="text-[10.5px] text-black/50 dark:text-white/50">
                (향후 1주일 기상 전망)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCityEn(null)}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="예보 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 7-Days Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {activeForecastCity.forecast.slice(0, 7).map((fItem: DailyForecastItem, fIdx: number) => {
              const { label, icon: DayIcon, colorClass } = getWeatherMeta(fItem.weatherCode, fItem.precipitationProb);
              const isToday = fIdx === 0;

              return (
                <div
                  key={`forecast-${fItem.date}-${fIdx}`}
                  className={`p-3 border flex flex-col items-center justify-between text-center gap-2 ${
                    isToday
                      ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 font-bold'
                      : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#111111]'
                  }`}
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-[11px] font-mono font-black ${isToday ? 'text-red-600 dark:text-red-500' : 'text-black/60 dark:text-white/60'}`}>
                      {isToday ? 'TODAY' : fItem.dayOfWeek}
                    </span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                      {fItem.dayMonth}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 my-1">
                    <DayIcon className={`w-6 h-6 stroke-[2] ${colorClass}`} />
                    <span className="text-[9.5px] font-mono font-bold uppercase text-black/75 dark:text-white/75">
                      {label}
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-between text-[10.5px] font-mono pt-1.5 border-t border-black/5 dark:border-white/5">
                    <span className="font-black text-black dark:text-white">
                      {fItem.tempMax}°
                    </span>
                    <span className="text-black/40 dark:text-white/40">
                      {fItem.tempMin}°
                    </span>
                  </div>

                  {fItem.precipitationProb > 0 && (
                    <div className="flex items-center gap-0.5 text-[9px] font-mono text-blue-600 dark:text-blue-400">
                      <Droplets className="w-2.5 h-2.5" />
                      <span>{fItem.precipitationProb}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}
