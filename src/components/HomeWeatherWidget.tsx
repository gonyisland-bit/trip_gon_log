import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  CloudLightning, 
  Wind, 
  RefreshCw 
} from 'lucide-react';
import { Trip } from '../types';

interface CityWeatherConfig {
  name: string;
  nameEn: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

const POPULAR_DESTINATIONS: CityWeatherConfig[] = [
  { name: '서울', nameEn: 'SEOUL', country: 'KR', lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
  { name: '도쿄', nameEn: 'TOKYO', country: 'JP', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: '파리', nameEn: 'PARIS', country: 'FR', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: '뉴욕', nameEn: 'NEW YORK', country: 'US', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  { name: '방콕', nameEn: 'BANGKOK', country: 'TH', lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  { name: '괌', nameEn: 'GUAM', country: 'GU', lat: 13.4443, lng: 144.7937, timezone: 'Pacific/Guam' },
  { name: '오사카', nameEn: 'OSAKA', country: 'JP', lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
  { name: '런던', nameEn: 'LONDON', country: 'GB', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: '로마', nameEn: 'ROME', country: 'IT', lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome' },
  { name: '싱가포르', nameEn: 'SINGAPORE', country: 'SG', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: '타이베이', nameEn: 'TAIPEI', country: 'TW', lat: 25.0330, lng: 121.5654, timezone: 'Asia/Taipei' },
  { name: '홍콩', nameEn: 'HONG KONG', country: 'HK', lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  { name: '시드니', nameEn: 'SYDNEY', country: 'AU', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  { name: '바르셀로나', nameEn: 'BARCELONA', country: 'ES', lat: 41.3851, lng: 2.1734, timezone: 'Europe/Madrid' },
  { name: '다낭', nameEn: 'DA NANG', country: 'VN', lat: 16.0544, lng: 108.2022, timezone: 'Asia/Ho_Chi_Minh' },
  { name: '후쿠오카', nameEn: 'FUKUOKA', country: 'JP', lat: 33.5902, lng: 130.4017, timezone: 'Asia/Tokyo' },
  { name: '삿포로', nameEn: 'SAPPORO', country: 'JP', lat: 43.0618, lng: 141.3545, timezone: 'Asia/Tokyo' },
];

interface WeatherData {
  cityEn: string;
  country: string;
  temp: number;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  localTime: string;
}

function getWeatherMeta(code: number) {
  if (code === 0) {
    return { label: 'CLEAR', icon: Sun };
  } else if (code === 1 || code === 2) {
    return { label: 'FAIR', icon: CloudSun };
  } else if (code === 3) {
    return { label: 'OVERCAST', icon: Cloud };
  } else if (code === 45 || code === 48) {
    return { label: 'FOGGY', icon: Cloud };
  } else if (code >= 51 && code <= 67) {
    return { label: 'RAIN', icon: CloudRain };
  } else if (code >= 71 && code <= 86) {
    return { label: 'SNOW', icon: Snowflake };
  } else if (code >= 95) {
    return { label: 'STORM', icon: CloudLightning };
  }
  return { label: 'BREEZE', icon: Wind };
}

interface HomeWeatherWidgetProps {
  trips?: Trip[];
}

export function HomeWeatherWidget({ trips = [] }: HomeWeatherWidgetProps) {
  const [weatherList, setWeatherList] = useState<WeatherData[]>(() => {
    try {
      const cached = localStorage.getItem('cached_home_weather');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.data) && Date.now() - parsed.timestamp < 1000 * 60 * 30) {
          return parsed.data;
        }
      }
    } catch (_) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const targetCities: CityWeatherConfig[] = useMemo(() => {
    const matched: CityWeatherConfig[] = [];
    const addedNames = new Set<string>();

    if (trips && trips.length > 0) {
      for (const trip of trips) {
        if (matched.length >= 5) break;
        const candidateCity = ((trip as any).city || trip.locationStr || trip.title || '').toLowerCase();
        const candidateCountry = (trip.country || '').toLowerCase();

        const found = POPULAR_DESTINATIONS.find(dest => {
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

    const defaults = [
      POPULAR_DESTINATIONS[0],
      POPULAR_DESTINATIONS[1],
      POPULAR_DESTINATIONS[2],
      POPULAR_DESTINATIONS[3],
      POPULAR_DESTINATIONS[4],
    ];

    for (const def of defaults) {
      if (matched.length >= 5) break;
      if (!addedNames.has(def.nameEn)) {
        matched.push(def);
        addedNames.add(def.nameEn);
      }
    }

    return matched.slice(0, 5);
  }, [trips]);

  const fetchWeather = async () => {
    if (targetCities.length === 0) return;
    setIsLoading(true);

    try {
      const results: WeatherData[] = await Promise.all(
        targetCities.map(async (city) => {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(city.timezone)}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();

          const nowInZone = new Intl.DateTimeFormat('en-GB', {
            timeZone: city.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(new Date());

          return {
            cityEn: city.nameEn,
            country: city.country,
            temp: Math.round(data.current?.temperature_2m ?? 20),
            tempMax: Math.round(data.daily?.temperature_2m_max?.[0] ?? 24),
            tempMin: Math.round(data.daily?.temperature_2m_min?.[0] ?? 16),
            weatherCode: data.current?.weather_code ?? 0,
            localTime: nowInZone,
          };
        })
      );

      setWeatherList(results);
      const d = new Date();
      setLastUpdated(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      try {
        localStorage.setItem('cached_home_weather', JSON.stringify({
          data: results,
          timestamp: Date.now()
        }));
      } catch (_) {}
    } catch (err) {
      console.warn("Weather fetch notice:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (weatherList.length === 0) {
      fetchWeather();
    }
  }, [targetCities]);

  return (
    <section className="w-full max-w-[1920px] mx-auto border-t border-black/10 dark:border-white/10 mt-12 pt-8 pb-4 px-4 sm:px-8 md:px-12 select-none font-sans transition-colors">
      <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 mb-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-black text-white dark:bg-white dark:text-black font-mono font-black text-[10px] px-2 py-0.5 uppercase tracking-widest">
            LIVE WEATHER
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase text-black/60 dark:text-white/60">
            DESTINATION CONDITIONS
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[10px] sm:text-[11px] text-black/50 dark:text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lastUpdated} KST</span>
          </div>
          <button
            type="button"
            onClick={fetchWeather}
            disabled={isLoading}
            className="p-1 hover:text-black dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            title="날씨 새로고침"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="w-full border-b border-black/10 dark:border-white/10 overflow-x-auto hide-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 min-w-[560px] md:min-w-0 divide-x divide-black/10 dark:divide-white/10">
          {(weatherList.length > 0 ? weatherList : targetCities.map(c => ({
            cityEn: c.nameEn,
            country: c.country,
            temp: 20,
            tempMax: 24,
            tempMin: 16,
            weatherCode: 0,
            localTime: '14:00'
          }))).map((item, idx) => {
            const { label, icon: IconComponent } = getWeatherMeta(item.weatherCode);

            return (
              <div 
                key={`${item.cityEn}-${idx}`}
                className="p-4 sm:p-5 flex flex-col justify-between gap-3 bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight text-black dark:text-white truncate">
                    {item.cityEn}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                    {item.country}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 my-1">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tighter text-black dark:text-white">
                    {item.temp}°
                  </span>
                  <div className="flex items-center gap-1.5 text-black/75 dark:text-white/75">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2] shrink-0 text-black dark:text-white" />
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase">
                      {label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] font-mono text-black/50 dark:text-white/50 pt-2 border-t border-black/5 dark:border-white/5">
                  <span>H:{item.tempMax}° L:{item.tempMin}°</span>
                  <span>{item.localTime} LOCAL</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
