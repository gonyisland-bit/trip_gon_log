import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CityWeatherConfig } from '../types';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../utils/weatherApi';

const DEFAULT_CITIES: CityWeatherConfig[] = [
  { nameKo: '서울', nameEn: 'SEOUL', lat: 37.5665, lon: 126.9780, country: 'KR', timezone: 'Asia/Seoul' },
  { nameKo: '도쿄', nameEn: 'TOKYO', lat: 35.6762, lon: 139.6503, country: 'JP', timezone: 'Asia/Tokyo' },
  { nameKo: '파리', nameEn: 'PARIS', lat: 48.8566, lon: 2.3522, country: 'FR', timezone: 'Europe/Paris' },
  { nameKo: '런던', nameEn: 'LONDON', lat: 51.5074, lon: -0.1278, country: 'GB', timezone: 'Europe/London' },
];

interface MiniWeatherWidgetProps {
  className?: string;
}

export const MiniWeatherWidget: React.FC<MiniWeatherWidgetProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 날씨 도시 목록 구독 (Firestore 표준 경로)
  const [cities, setCities] = useState<CityWeatherConfig[]>(() => {
    try {
      const saved = localStorage.getItem('cached_calendar_weather_cities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_CITIES;
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.cities) && data.cities.length > 0) {
          setCities(data.cities);
          try {
            localStorage.setItem('cached_calendar_weather_cities', JSON.stringify(data.cities));
          } catch (_) {}
        }
      }
    }, (err) => {
      console.warn("MiniWeatherWidget cities sync notice:", err);
    });
    return () => unsub();
  }, []);

  // 선택된 날씨 도시 (영속 유지)
  const [selectedCity, setSelectedCity] = useState<CityWeatherConfig>(() => {
    try {
      const savedEn = localStorage.getItem('selected_weather_city_en');
      if (savedEn) {
        const found = cities.find(c => c.nameEn.toUpperCase() === savedEn.toUpperCase());
        if (found) return found;
      }
    } catch (_) {}
    return cities[0] || DEFAULT_CITIES[0];
  });

  // 다른 컴포넌트(CalendarHub 등)에서 도시를 변경했을 때 동기화 수신
  useEffect(() => {
    const handleGlobalChange = (e: Event) => {
      const customEvent = e as CustomEvent<CityWeatherConfig>;
      if (customEvent.detail && customEvent.detail.nameEn) {
        setSelectedCity(customEvent.detail);
      }
    };
    window.addEventListener('selectedWeatherCityChanged', handleGlobalChange);
    return () => {
      window.removeEventListener('selectedWeatherCityChanged', handleGlobalChange);
    };
  }, []);

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 선택된 도시의 실시간 날씨 데이터 조회
  const [weatherData, setWeatherData] = useState<CityWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    const lat = selectedCity.lat;
    const lon = (selectedCity as any).lng ?? (selectedCity as any).lon ?? 126.9780;
    const tz = selectedCity.timezone || 'Asia/Seoul';

    fetchCityWeather(lat, lon, tz, selectedCity.nameEn, selectedCity.country)
      .then((data) => {
        if (!isCancelled) {
          setWeatherData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('MiniWeatherWidget weather fetch notice:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  const handleSelectCity = (city: CityWeatherConfig) => {
    setSelectedCity(city);
    setIsOpen(false);
    try {
      localStorage.setItem('selected_weather_city_en', city.nameEn);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('selectedWeatherCityChanged', { detail: city }));
  };

  const weatherMeta = weatherData
    ? getWeatherMeta(weatherData.weatherCode, weatherData.precipitationProb)
    : null;
  const WeatherIcon = weatherMeta?.icon;

  return (
    <div className={`relative inline-block font-mono select-none ${className}`} ref={containerRef}>
      {/* Mini Toggle Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
          isOpen
            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
            : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border-black/10 dark:border-white/15 text-black dark:text-white'
        }`}
        title={`날씨 지역: ${selectedCity.nameKo || (selectedCity as any).name || selectedCity.nameEn} (클릭하여 변경)`}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin opacity-60 shrink-0" />
        ) : WeatherIcon ? (
          <WeatherIcon className={`w-3.5 h-3.5 ${weatherMeta?.colorClass || ''} shrink-0`} />
        ) : (
          <MapPin className="w-3 h-3 text-red-600 dark:text-red-500 shrink-0" />
        )}

        {weatherData && (
          <span className="text-[10.5px] sm:text-[11px] font-black tracking-tight shrink-0">
            {weatherData.temp}°
          </span>
        )}

        <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider hidden xs:inline shrink-0">
          {selectedCity.nameKo || (selectedCity as any).name || selectedCity.nameEn}
        </span>

        <ChevronDown className={`w-2.5 h-2.5 opacity-50 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Swiss Minimal Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 py-1.5 bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/15 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              SELECT CITY
            </span>
            <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
              {cities.length} CITIES
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto hide-scrollbar py-1">
            {cities.map((city) => {
              const isSelected = city.nameEn.toUpperCase() === selectedCity.nameEn.toUpperCase();
              const cityName = city.nameKo || (city as any).name || city.nameEn;
              return (
                <button
                  key={city.nameEn}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-black/5 dark:bg-white/10 font-black text-black dark:text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{cityName}</span>
                    <span className="text-[9.5px] font-mono text-black/40 dark:text-white/40 uppercase">
                      {city.nameEn}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-black dark:text-white shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
