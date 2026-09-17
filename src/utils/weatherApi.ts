import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  CloudLightning, 
  Wind,
  LucideIcon
} from 'lucide-react';

export interface WeatherMeta {
  label: string;
  labelKo: string;
  icon: LucideIcon;
  colorClass: string;
}

export function getWeatherMeta(code: number, precipitationProb?: number): WeatherMeta {
  // If precipitation probability is low (< 35%), light drizzle (51, 53, 55) or light shower (80)
  // should not be rendered as a full-day rain when it's mostly fair or overcast.
  let effectiveCode = code;
  if (precipitationProb !== undefined && precipitationProb < 35) {
    if (code === 51 || code === 53 || code === 55 || code === 80) {
      effectiveCode = 2; // FAIR (CloudSun)
    } else if (code === 61) {
      effectiveCode = 3; // OVERCAST (Cloud)
    }
  }

  if (effectiveCode === 0) {
    return { label: 'CLEAR', labelKo: '맑음', icon: Sun, colorClass: 'text-amber-500' };
  } else if (effectiveCode === 1 || effectiveCode === 2) {
    return { label: 'FAIR', labelKo: '대체로 맑음', icon: CloudSun, colorClass: 'text-amber-400' };
  } else if (effectiveCode === 3) {
    return { label: 'OVERCAST', labelKo: '흐림', icon: Cloud, colorClass: 'text-zinc-400' };
  } else if (effectiveCode === 45 || effectiveCode === 48) {
    return { label: 'FOGGY', labelKo: '안개', icon: Cloud, colorClass: 'text-zinc-400' };
  } else if ((effectiveCode >= 51 && effectiveCode <= 67) || (effectiveCode >= 80 && effectiveCode <= 82)) {
    return { label: 'RAIN', labelKo: '비', icon: CloudRain, colorClass: 'text-blue-500' };
  } else if ((effectiveCode >= 71 && effectiveCode <= 77) || (effectiveCode >= 85 && effectiveCode <= 86)) {
    return { label: 'SNOW', labelKo: '눈', icon: Snowflake, colorClass: 'text-cyan-400' };
  } else if (effectiveCode >= 95) {
    return { label: 'STORM', labelKo: '뇌우', icon: CloudLightning, colorClass: 'text-purple-500' };
  }
  return { label: 'BREEZE', labelKo: '바람', icon: Wind, colorClass: 'text-teal-400' };
}

export interface DailyForecastItem {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // MON, TUE, etc.
  dayMonth: string; // 9/18
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProb: number;
}

export interface CityWeatherData {
  cityEn: string;
  country: string;
  temp: number;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  localTime: string;
  forecast: DailyForecastItem[];
}

// In-memory & localStorage Cache (TTL: 30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;
const memoryCache: Record<string, { data: CityWeatherData; timestamp: number }> = {};

export async function fetchCityWeather(
  lat: number,
  lng: number,
  timezone: string = 'UTC',
  cityEn: string = '',
  country: string = ''
): Promise<CityWeatherData> {
  const cacheKey = `weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

  // 1. Check in-memory cache
  if (memoryCache[cacheKey] && Date.now() - memoryCache[cacheKey].timestamp < CACHE_TTL_MS) {
    return memoryCache[cacheKey].data;
  }

  // 2. Check localStorage cache
  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        memoryCache[cacheKey] = parsed;
        return parsed.data;
      }
    }
  } catch (_) {}

  // 3. Fetch from Open-Meteo API (up to 14 days forecast)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=14&timezone=${encodeURIComponent(timezone)}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather fetch failed for ${cityEn} (${res.status})`);
  }
  const json = await res.json();

  const nowInZone = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());

  const days: DailyForecastItem[] = [];
  const times: string[] = json.daily?.time || [];
  const codes: number[] = json.daily?.weather_code || [];
  const maxTemps: number[] = json.daily?.temperature_2m_max || [];
  const minTemps: number[] = json.daily?.temperature_2m_min || [];
  const precipProbs: number[] = json.daily?.precipitation_probability_max || [];

  const dayNamesEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  times.forEach((tStr, idx) => {
    const dateObj = new Date(tStr);
    const dayOfWeek = dayNamesEn[dateObj.getDay()];
    const parts = tStr.split('-');
    const dayMonth = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

    days.push({
      date: tStr,
      dayOfWeek,
      dayMonth,
      weatherCode: codes[idx] ?? 0,
      tempMax: Math.round(maxTemps[idx] ?? 20),
      tempMin: Math.round(minTemps[idx] ?? 15),
      precipitationProb: Math.round(precipProbs[idx] ?? 0),
    });
  });

  const weatherData: CityWeatherData = {
    cityEn: cityEn || 'CITY',
    country: country || '',
    temp: Math.round(json.current?.temperature_2m ?? 20),
    tempMax: Math.round(json.daily?.temperature_2m_max?.[0] ?? 24),
    tempMin: Math.round(json.daily?.temperature_2m_min?.[0] ?? 16),
    weatherCode: json.current?.weather_code ?? 0,
    localTime: nowInZone,
    forecast: days,
  };

  // Save to cache
  const cacheObj = { data: weatherData, timestamp: Date.now() };
  memoryCache[cacheKey] = cacheObj;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
  } catch (_) {}

  return weatherData;
}
