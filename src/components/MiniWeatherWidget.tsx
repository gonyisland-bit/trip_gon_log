import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CityWeatherConfig } from '../types';
import { fetchCityWeather, getWeatherMeta, CityWeatherData } from '../utils/weatherApi';
import { cachedCurrentLocation, CURRENT_LOCATION_EN, saveUserPref } from '../utils/userPrefs';
import { makeMain, openSettings, useMyCities } from '../utils/myCities';
import { CurrentLocationRow } from './weather/CurrentLocationRow';
import { useCitiesWeather } from './weather/useCitiesWeather';
import { WeatherReading } from './weather/WeatherReading';

interface MiniWeatherWidgetProps {
  className?: string;
}

export const MiniWeatherWidget: React.FC<MiniWeatherWidgetProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // This member's cities: the main one is the pill, the list is main plus favourites (myCities.ts)
  const { main: selectedCity, list: cities } = useMyCities();

  // 날씨 배경 모션 토글 상태 및 동기화
  const [isBgEnabled, setIsBgEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('calendar_weather_bg_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    const handleBgToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === 'boolean') {
        setIsBgEnabled(customEvent.detail);
      }
    };
    window.addEventListener('weatherBgToggled', handleBgToggle);
    return () => {
      window.removeEventListener('weatherBgToggled', handleBgToggle);
    };
  }, []);

  const handleToggleBg = () => {
    setIsBgEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('calendar_weather_bg_enabled', String(next));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('weatherBgToggled', { detail: next }));
      saveUserPref({ weatherBg: next });
      return next;
    });
  };

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
    const lon = selectedCity.lng;
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
    setIsOpen(false);
    makeMain(city);
  };

  // Every row's weather, fetched on hover or open so the list shows it straight away
  const { now: cityNow, prefetch } = useCitiesWeather(cities);
  const here = cachedCurrentLocation();
  const warm = () => prefetch(here);

  const todayPop = weatherData?.forecast?.[0]?.precipitationProb ?? 0;
  const weatherMeta = weatherData
    ? getWeatherMeta(weatherData.weatherCode, todayPop)
    : null;
  const WeatherIcon = weatherMeta?.icon;

  return (
    <div className={`relative inline-block font-mono select-none ${className}`} ref={containerRef}>
      {/* Pill: icon · temperature · place */}
      <button
        type="button"
        onClick={() => { if (!isOpen) warm(); setIsOpen(!isOpen); }}
        onPointerEnter={warm}
        onFocus={warm}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`h-8 px-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${
          isOpen
            ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark'
            : 'bg-black/[0.05] dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-black dark:text-white'
        }`}
        title={`날씨 위치: ${selectedCity.name || selectedCity.nameEn}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60 shrink-0" />
        ) : WeatherIcon ? (
          <WeatherIcon className={`w-3.5 h-3.5 ${isOpen ? '' : weatherMeta?.colorClass || ''} shrink-0`} />
        ) : (
          <MapPin className="w-3.5 h-3.5 shrink-0" />
        )}
        {weatherData && <span className="text-meta font-bold tabular-nums shrink-0">{weatherData.temp}°</span>}
        <span className="text-meta font-bold hidden xs:inline shrink-0 max-w-[6rem] truncate">{selectedCity.name || selectedCity.nameEn}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Places with their weather now, and the background effect switch */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 py-1.5 bg-surface dark:bg-surface-dark rounded-card shadow-[0_12px_32px_rgba(0,0,0,0.16)] z-50 font-sans animate-in fade-in slide-in-from-top-1 duration-150">
          <div role="listbox" aria-label="날씨 위치" className="max-h-72 overflow-y-auto overscroll-contain hide-scrollbar">
            <CurrentLocationRow
              selected={selectedCity.nameEn === CURRENT_LOCATION_EN}
              onLocated={handleSelectCity}
              trailing={here ? <WeatherReading data={cityNow[here.nameEn]} /> : undefined}
            />
            {cities.filter(c => c.nameEn !== CURRENT_LOCATION_EN).map((city) => {
              const isSelected = city.nameEn.toUpperCase() === selectedCity.nameEn.toUpperCase();
              return (
                <button
                  key={city.nameEn}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCity(city)}
                  className={`w-full min-h-10 px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer text-sm ${
                    isSelected
                      ? 'bg-selected dark:bg-white/[0.18] font-bold text-black dark:text-white'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-black/80 dark:text-white/80'
                  }`}
                >
                  <span className="truncate">{city.name || city.nameEn}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <WeatherReading data={cityNow[city.nameEn]} />
                    <span className="w-3.5 h-3.5 inline-grid place-items-center">{isSelected && <Check className="w-3.5 h-3.5" />}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { setIsOpen(false); openSettings('cities'); }}
            className="w-full min-h-10 px-3 py-2 text-left text-sm font-semibold text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
          >
            도시 편집
          </button>
          <div className="mt-1 px-3 pt-2 pb-1 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <span className="text-sm font-bold">배경 날씨 효과</span>
            <button
              type="button"
              role="switch"
              aria-checked={isBgEnabled}
              aria-label="배경 날씨 효과"
              onClick={handleToggleBg}
              className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${isBgEnabled ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${isBgEnabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
