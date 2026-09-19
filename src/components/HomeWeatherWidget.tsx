import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { fetchCityWeather, getWeatherMeta, getSimulatedWeatherForDate, CityWeatherData, DailyForecastItem } from '../utils/weatherApi';

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

  const widgetTopRef = useRef<HTMLElement>(null);
  const forecastRef = useRef<HTMLDivElement>(null);
  const prevSelectedRef = useRef<string | null>(null);

  // Auto-scroll when weekly forecast opens or collapses
  useEffect(() => {
    if (selectedCityEn && selectedCityEn !== prevSelectedRef.current) {
      const timer = setTimeout(() => {
        forecastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
      prevSelectedRef.current = selectedCityEn;
      return () => clearTimeout(timer);
    } else if (!selectedCityEn && prevSelectedRef.current) {
      const timer = setTimeout(() => {
        widgetTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
      prevSelectedRef.current = null;
      return () => clearTimeout(timer);
    }
  }, [selectedCityEn]);

  // Determine active target cities: customCities from settings OR auto-matched from trips + popular (Strictly 4 for clean 4-col web grid)
  const targetCities: CityWeatherConfig[] = useMemo(() => {
    if (customCities && customCities.length > 0) {
      return customCities.slice(0, 4);
    }

    const matched: CityWeatherConfig[] = [];
    const addedNames = new Set<string>();

    // 1. If trips exist, prioritize trip locations
    if (trips && trips.length > 0) {
      for (const trip of trips) {
        if (matched.length >= 4) break;
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
      if (matched.length >= 4) break;
      if (!addedNames.has(def.nameEn)) {
        matched.push(def);
        addedNames.add(def.nameEn);
      }
    }

    return matched.slice(0, 4);
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

  // Ensure exactly 7 days forecast even if cached data or api returned fewer days
  const displayForecast: DailyForecastItem[] = useMemo(() => {
    if (!activeForecastCity || !activeForecastCity.forecast || activeForecastCity.forecast.length === 0) {
      return [];
    }
    const dayNamesEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const list: DailyForecastItem[] = [...activeForecastCity.forecast];

    // If more than 7, keep first 7
    if (list.length > 7) {
      return list.slice(0, 7);
    }

    // If fewer than 7, fill missing days deterministically
    while (list.length < 7) {
      const lastItem = list[list.length - 1];
      const nextDate = new Date(lastItem ? lastItem.date : new Date());
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().slice(0, 10);
      const dayOfWeek = dayNamesEn[nextDate.getDay()];
      const parts = nextDateStr.split('-');
      const dayMonth = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

      const simulated = getSimulatedWeatherForDate(activeForecastCity.cityEn, nextDateStr);
      list.push({
        date: nextDateStr,
        dayOfWeek,
        dayMonth,
        weatherCode: simulated.weatherCode,
        tempMax: simulated.tempMax,
        tempMin: simulated.tempMin,
        precipitationProb: simulated.precipitationProb,
      });
    }

    return list;
  }, [activeForecastCity]);

  return (
    <section ref={widgetTopRef} className="w-full max-w-[1920px] mx-auto border-t border-black/10 dark:border-white/10 mt-4 sm:mt-8 pt-4 sm:pt-6 pb-8 px-4 sm:px-8 md:px-12 select-none font-sans transition-colors">
      
      {/* Sub-Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-black/10 dark:border-white/10 mb-0">
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

      {/* Grid Container: App Widget Style Cards (2-Cols Mobile, 4-Cols Desktop) */}
      <div className="w-full py-4 sm:py-5 border-b border-black/10 dark:border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {targetCities.map((city, idx) => {
            const data = weatherMap[city.nameEn];
            const isSelected = selectedCityEn === city.nameEn;
            const weatherCode = data ? data.weatherCode : 0;
            const precipProb = data?.forecast?.[0]?.precipitationProb ?? 0;
            const { label, icon: IconComponent, colorClass } = getWeatherMeta(weatherCode, precipProb);

            const temp = data ? data.temp : '--';
            const tempMax = data ? data.tempMax : '--';
            const tempMin = data ? data.tempMin : '--';
            const localTime = data ? data.localTime : '--:--';

            // Gauge circumference calculation (radius: 17, circ: ~106.8)
            const gaugePercent = Math.max(15, Math.min(95, precipProb > 0 ? precipProb : (typeof temp === 'number' ? Math.max(20, Math.min(85, (temp + 10) * 2)) : 60)));
            const dashOffset = 106.8 - (106.8 * gaugePercent) / 100;

            return (
              <button
                key={`${city.nameEn}-${idx}`}
                type="button"
                onClick={() => setSelectedCityEn(isSelected ? null : city.nameEn)}
                className={`p-3.5 sm:p-4 md:p-4.5 rounded-2xl flex flex-col justify-between gap-3 text-left transition-all duration-200 cursor-pointer relative ${
                  isSelected
                    ? 'bg-white dark:bg-[#141414] border border-black dark:border-white shadow-md ring-1 ring-black dark:ring-white scale-[1.01]'
                    : 'bg-black/[0.025] dark:bg-white/[0.035] border border-black/8 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] shadow-xs'
                }`}
                title="클릭하여 1주일 예보 확인"
              >
                {/* 1. Header: City Name & Country Pill Badge */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white leading-tight">
                    {city.nameEn}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 shrink-0">
                    {city.country}
                  </span>
                </div>

                {/* 2. Body: Big Temperature (Left) + Circular Gauge Ring (Right) */}
                <div className="flex items-center justify-between gap-2 my-0.5 w-full">
                  {/* Left: Large Temperature + High/Low */}
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl lg:text-[40px] font-black font-mono tracking-tighter text-black dark:text-white leading-none">
                      {temp}°
                    </span>
                    <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-black/50 dark:text-white/50 mt-1.5">
                      H:{tempMax}° L:{tempMin}°
                    </span>
                  </div>

                  {/* Right: Modern App Widget Circular Gauge Ring */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 40 40">
                        {/* Background track */}
                        <circle
                          cx="20"
                          cy="20"
                          r="17"
                          className="stroke-black/10 dark:stroke-white/10"
                          strokeWidth="2.5"
                          fill="transparent"
                        />
                        {/* Foreground gauge */}
                        <circle
                          cx="20"
                          cy="20"
                          r="17"
                          className={precipProb > 30 ? 'stroke-blue-500' : 'stroke-black/75 dark:stroke-white/80'}
                          strokeWidth="2.5"
                          strokeDasharray="106.8"
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      {/* Center weather icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <IconComponent className={`w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2] ${colorClass}`} />
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[9.5px] font-mono font-bold uppercase tracking-wider text-black/65 dark:text-white/65 mt-1 text-center truncate max-w-[62px]">
                      {label}
                    </span>
                  </div>
                </div>

                {/* 3. Footer: Local Time & Weekly Toggle Indicator */}
                <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] font-mono text-black/45 dark:text-white/45 pt-2 border-t border-black/5 dark:border-white/5 w-full">
                  <span>{localTime} · 7D</span>
                  <div className="flex items-center gap-1">
                    {isSelected ? (
                      <ChevronUp className="w-3.5 h-3.5 text-black dark:text-white" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1주일치 날씨 (배경 및 아웃라인 없는 스위스 슬림라인 스타일)        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeForecastCity && displayForecast.length === 7 && (
        <div ref={forecastRef} className="w-full py-4 sm:py-5 border-b border-black/10 dark:border-white/10 bg-transparent animate-in fade-in duration-200 select-none">
          {/* Sub Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10 mb-2 font-mono">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                {activeForecastCity.cityEn} · 7-DAY FORECAST
              </span>
              <span className="text-[10px] text-black/40 dark:text-white/40 hidden sm:inline">
                (향후 1주일 기상 전망)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCityEn(null)}
              className="p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="예보 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Mobile View (< 768px): 한 요일당 한 줄씩 세로 7행 슬림라인 나열 (배경/박스 없음) */}
          <div className="md:hidden flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {displayForecast.map((fItem: DailyForecastItem, fIdx: number) => {
              const { label, icon: DayIcon, colorClass } = getWeatherMeta(fItem.weatherCode, fItem.precipitationProb);
              const isToday = fIdx === 0;

              return (
                <div 
                  key={`m-forecast-${fItem.date}-${fIdx}`}
                  className="py-2.5 flex items-center justify-between text-xs font-mono"
                >
                  {/* Left: 요일 및 날짜 */}
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    <span className={`text-xs ${isToday ? 'font-black text-red-600 dark:text-red-500' : 'font-bold text-black/70 dark:text-white/70'}`}>
                      {isToday ? 'TODAY' : fItem.dayOfWeek}
                    </span>
                    <span className="text-[10px] text-black/40 dark:text-white/40">
                      {fItem.dayMonth}
                    </span>
                  </div>

                  {/* Center: 날씨 아이콘 및 상태 라벨 */}
                  <div className="flex items-center gap-1.5 flex-1 justify-center">
                    <DayIcon className={`w-4 h-4 stroke-[2] shrink-0 ${colorClass}`} />
                    <span className="text-[10px] font-mono font-bold uppercase text-black/75 dark:text-white/75 truncate">
                      {label}
                    </span>
                    {fItem.precipitationProb > 0 && (
                      <span className="text-[9px] font-mono text-blue-500 font-bold ml-1">
                        {fItem.precipitationProb}%
                      </span>
                    )}
                  </div>

                  {/* Right: 최고 / 최저 기온 */}
                  <div className="w-16 text-right font-mono text-xs shrink-0">
                    <span className="font-bold text-black dark:text-white">{fItem.tempMax}°</span>
                    <span className="text-black/40 dark:text-white/40 ml-1.5">{fItem.tempMin}°</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Web View (>= 768px): 7개 요일 가로 7열 나열 (배경/박스 없이 슬림 구분선) */}
          <div className="hidden md:grid md:grid-cols-7 divide-x divide-black/10 dark:divide-white/10 pt-1">
            {displayForecast.map((fItem: DailyForecastItem, fIdx: number) => {
              const { label, icon: DayIcon, colorClass } = getWeatherMeta(fItem.weatherCode, fItem.precipitationProb);
              const isToday = fIdx === 0;

              return (
                <div
                  key={`w-forecast-${fItem.date}-${fIdx}`}
                  className="px-2 py-3 flex flex-col items-center justify-between text-center gap-2.5"
                >
                  {/* 요일 & 날짜 */}
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-[11px] font-mono ${isToday ? 'font-black text-red-600 dark:text-red-500' : 'font-bold text-black/60 dark:text-white/60'}`}>
                      {isToday ? 'TODAY' : fItem.dayOfWeek}
                    </span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40 mt-0.5">
                      {fItem.dayMonth}
                    </span>
                  </div>

                  {/* 날씨 아이콘 & 라벨 */}
                  <div className="flex flex-col items-center gap-1.5 my-0.5">
                    <DayIcon className={`w-5 h-5 stroke-[2] ${colorClass}`} />
                    <span className="text-[10px] font-mono font-bold uppercase text-black/75 dark:text-white/75">
                      {label}
                    </span>
                  </div>

                  {/* 기온 & 강수 확률 */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-xs font-mono">
                      <span className="font-bold text-black dark:text-white">{fItem.tempMax}°</span>
                      <span className="text-black/40 dark:text-white/40 ml-1">{fItem.tempMin}°</span>
                    </div>
                    {fItem.precipitationProb > 0 ? (
                      <div className="flex items-center gap-0.5 text-[9px] font-mono text-blue-500">
                        <Droplets className="w-2.5 h-2.5" />
                        <span>{fItem.precipitationProb}%</span>
                      </div>
                    ) : (
                      <div className="h-[13.5px]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}
