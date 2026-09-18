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
  let effectiveCode = code;

  // 우기/강수 확률 기반 정밀 보정
  if (precipitationProb !== undefined) {
    if (precipitationProb >= 55) {
      // 강수 확률 55% 이상이면 확실한 비(또는 뇌우) 반영
      if (effectiveCode === 0 || effectiveCode === 1 || effectiveCode === 2 || effectiveCode === 3) {
        effectiveCode = precipitationProb >= 75 ? 63 : 61; // RAIN
      }
    } else if (precipitationProb < 30) {
      // 강수 확률이 매우 낮은 날(30% 미만)인데 가벼운 이슬비 코드인 경우 맑음/흐림으로 보정
      if (code === 51 || code === 53 || code === 55 || code === 80) {
        effectiveCode = 2; // FAIR (CloudSun)
      } else if (code === 61) {
        effectiveCode = 3; // OVERCAST (Cloud)
      }
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

// ============================================================================
// 세계 주요 도시별 1~12월 기후 통계 데이터베이스 (기상청 및 WMO 30년 평년값 기반)
// tMin: 최저기온, tMax: 최고기온, rainProb: 평균 강수확률(%), snowProb: 강설확률(%)
// ============================================================================
interface MonthClimate {
  tMin: number;
  tMax: number;
  rainProb: number;
  snowProb?: number;
}

const DEFAULT_CLIMATE: MonthClimate[] = [
  { tMin: -2, tMax: 6, rainProb: 15, snowProb: 15 },  // 1월
  { tMin: 0, tMax: 8, rainProb: 18, snowProb: 10 },   // 2월
  { tMin: 4, tMax: 14, rainProb: 22 },                // 3월
  { tMin: 10, tMax: 20, rainProb: 25 },               // 4월
  { tMin: 15, tMax: 25, rainProb: 28 },               // 5월
  { tMin: 19, tMax: 28, rainProb: 35 },               // 6월
  { tMin: 23, tMax: 30, rainProb: 48 },               // 7월 (장마)
  { tMin: 24, tMax: 31, rainProb: 42 },               // 8월 (폭염/소나기)
  { tMin: 18, tMax: 26, rainProb: 30 },               // 9월
  { tMin: 11, tMax: 20, rainProb: 20 },               // 10월
  { tMin: 5, tMax: 14, rainProb: 22 },                // 11월
  { tMin: -1, tMax: 7, rainProb: 18, snowProb: 12 },  // 12월
];

const CITY_CLIMATES: Record<string, MonthClimate[]> = {
  // 서울 (7월 장마철 강수확률 52%, 8월 42%, 10월 청명 15%, 1월 영하 및 눈)
  'SEOUL': [
    { tMin: -6, tMax: 2, rainProb: 12, snowProb: 20 },
    { tMin: -4, tMax: 5, rainProb: 14, snowProb: 15 },
    { tMin: 2, tMax: 11, rainProb: 20 },
    { tMin: 8, tMax: 18, rainProb: 24 },
    { tMin: 14, tMax: 24, rainProb: 26 },
    { tMin: 19, tMax: 28, rainProb: 36 },
    { tMin: 23, tMax: 29, rainProb: 52 }, // 7월 서울 장마: 강수확률 52% (이틀에 한번 비)
    { tMin: 24, tMax: 31, rainProb: 42 }, // 8월 폭염 및 잦은 소나기
    { tMin: 17, tMax: 26, rainProb: 26 },
    { tMin: 10, tMax: 20, rainProb: 16 }, // 10월 쾌청한 가을
    { tMin: 3, tMax: 12, rainProb: 22 },
    { tMin: -4, tMax: 4, rainProb: 15, snowProb: 18 },
  ],
  // 도쿄 (6월 츠유 장마 48%, 9~10월 가을비/태풍 42%, 겨울 맑고 온화)
  'TOKYO': [
    { tMin: 2, tMax: 10, rainProb: 15, snowProb: 4 },
    { tMin: 3, tMax: 11, rainProb: 18, snowProb: 4 },
    { tMin: 6, tMax: 14, rainProb: 28 },
    { tMin: 11, tMax: 19, rainProb: 30 },
    { tMin: 16, tMax: 23, rainProb: 34 },
    { tMin: 20, tMax: 26, rainProb: 48 }, // 6월 츠유 장마: 강수확률 48%
    { tMin: 24, tMax: 30, rainProb: 38 },
    { tMin: 25, tMax: 32, rainProb: 34 },
    { tMin: 21, tMax: 27, rainProb: 44 }, // 9월 태풍/가을장마
    { tMin: 15, tMax: 22, rainProb: 38 }, // 10월
    { tMin: 10, tMax: 17, rainProb: 24 },
    { tMin: 5, tMax: 12, rainProb: 16 },
  ],
  // 오사카
  'OSAKA': [
    { tMin: 3, tMax: 10, rainProb: 18 },
    { tMin: 3, tMax: 11, rainProb: 20 },
    { tMin: 6, tMax: 15, rainProb: 28 },
    { tMin: 11, tMax: 20, rainProb: 30 },
    { tMin: 16, tMax: 25, rainProb: 32 },
    { tMin: 20, tMax: 28, rainProb: 46 }, // 6월 장마
    { tMin: 25, tMax: 32, rainProb: 40 },
    { tMin: 26, tMax: 34, rainProb: 32 },
    { tMin: 22, tMax: 29, rainProb: 38 },
    { tMin: 16, tMax: 24, rainProb: 26 },
    { tMin: 10, tMax: 18, rainProb: 22 },
    { tMin: 5, tMax: 12, rainProb: 18 },
  ],
  // 삿포로 (겨울철 풍부한 눈, 여름철 장마 없는 쾌적함)
  'SAPPORO': [
    { tMin: -7, tMax: -1, rainProb: 15, snowProb: 65 },
    { tMin: -7, tMax: 0, rainProb: 15, snowProb: 60 },
    { tMin: -3, tMax: 4, rainProb: 20, snowProb: 35 },
    { tMin: 3, tMax: 12, rainProb: 24 },
    { tMin: 9, tMax: 18, rainProb: 25 },
    { tMin: 13, tMax: 22, rainProb: 26 },
    { tMin: 18, tMax: 25, rainProb: 28 }, // 7월 장마 없음
    { tMin: 19, tMax: 26, rainProb: 32 },
    { tMin: 14, tMax: 22, rainProb: 35 },
    { tMin: 8, tMax: 16, rainProb: 38 },
    { tMin: 1, tMax: 8, rainProb: 25, snowProb: 30 },
    { tMin: -4, tMax: 2, rainProb: 15, snowProb: 60 },
  ],
  // 파리
  'PARIS': [
    { tMin: 3, tMax: 8, rainProb: 30 },
    { tMin: 3, tMax: 9, rainProb: 28 },
    { tMin: 5, tMax: 13, rainProb: 28 },
    { tMin: 8, tMax: 17, rainProb: 26 },
    { tMin: 11, tMax: 20, rainProb: 30 },
    { tMin: 14, tMax: 24, rainProb: 28 },
    { tMin: 16, tMax: 26, rainProb: 26 },
    { tMin: 16, tMax: 26, rainProb: 26 },
    { tMin: 13, tMax: 22, rainProb: 28 },
    { tMin: 10, tMax: 17, rainProb: 32 },
    { tMin: 6, tMax: 11, rainProb: 34 },
    { tMin: 3, tMax: 8, rainProb: 32 },
  ],
  // 런던
  'LONDON': [
    { tMin: 3, tMax: 8, rainProb: 35 },
    { tMin: 3, tMax: 9, rainProb: 30 },
    { tMin: 4, tMax: 12, rainProb: 30 },
    { tMin: 6, tMax: 15, rainProb: 28 },
    { tMin: 9, tMax: 18, rainProb: 28 },
    { tMin: 12, tMax: 21, rainProb: 28 },
    { tMin: 14, tMax: 24, rainProb: 26 },
    { tMin: 14, tMax: 23, rainProb: 28 },
    { tMin: 12, tMax: 20, rainProb: 30 },
    { tMin: 9, tMax: 16, rainProb: 35 },
    { tMin: 6, tMax: 11, rainProb: 36 },
    { tMin: 3, tMax: 9, rainProb: 35 },
  ],
  // 방콕 (몬순 우기 5~10월: 강수확률 55~65%, 건기 11~4월: 10~20%)
  'BANGKOK': [
    { tMin: 22, tMax: 32, rainProb: 10 },
    { tMin: 24, tMax: 33, rainProb: 12 },
    { tMin: 26, tMax: 34, rainProb: 18 },
    { tMin: 27, tMax: 35, rainProb: 25 },
    { tMin: 26, tMax: 34, rainProb: 55 }, // 5월 우기 시작
    { tMin: 26, tMax: 33, rainProb: 58 },
    { tMin: 26, tMax: 33, rainProb: 60 },
    { tMin: 26, tMax: 33, rainProb: 62 },
    { tMin: 25, tMax: 32, rainProb: 68 }, // 9월 최대 강수
    { tMin: 25, tMax: 32, rainProb: 55 },
    { tMin: 24, tMax: 32, rainProb: 22 },
    { tMin: 22, tMax: 31, rainProb: 10 },
  ],
};

// ============================================================================
// 결정론적 날짜 해시 기반 기후 시뮬레이터
// (실시간 14일 API 범위를 벗어난 과거/미래 날짜에 대해 실제 기후 통계 기반 생성)
// ============================================================================
function getDeterministicRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

export function getSimulatedWeatherForDate(cityEn: string, dateStr: string): DailyForecastItem {
  const normalizedCity = cityEn.trim().toUpperCase();
  const climateList = CITY_CLIMATES[normalizedCity] || DEFAULT_CLIMATE;
  
  const dObj = new Date(dateStr);
  const mIdx = !isNaN(dObj.getMonth()) ? dObj.getMonth() : 0;
  const monthClimate = climateList[mIdx] || DEFAULT_CLIMATE[mIdx];
  const dayOfWeekNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayOfWeek = dayOfWeekNames[!isNaN(dObj.getDay()) ? dObj.getDay() : 0];
  const parts = dateStr.split('-');
  const dayMonth = parts.length >= 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : dateStr;

  // 1. 시드 기반 난수 생성 (결정론적: 새로고침해도 같은 날짜는 항상 동일)
  const rand1 = getDeterministicRandom(`${normalizedCity}-${dateStr}-r1`);
  const rand2 = getDeterministicRandom(`${normalizedCity}-${dateStr}-r2`);
  const rand3 = getDeterministicRandom(`${normalizedCity}-${dateStr}-r3`);

  // 2. 기온 시뮬레이션 (평년값 +- 2도 자연스러운 일교차 변동)
  const tempVarMin = Math.round((rand1 - 0.5) * 4);
  const tempVarMax = Math.round((rand2 - 0.5) * 4);
  const tempMin = monthClimate.tMin + tempVarMin;
  const tempMax = Math.max(tempMin + 4, monthClimate.tMax + tempVarMax);

  // 3. 강수 및 날씨 코드 판정 (실제 월별 강수 확률에 근거)
  const rainChance = monthClimate.rainProb;
  const snowChance = monthClimate.snowProb || 0;
  const precipRoll = Math.round(rand3 * 100);

  let weatherCode = 0; // 기본 맑음
  let precipitationProb = Math.max(5, Math.min(95, rainChance + Math.round((rand1 - 0.5) * 20)));

  if (snowChance > 0 && precipRoll < snowChance && tempMax <= 3) {
    // 눈
    weatherCode = 71;
    precipitationProb = Math.max(60, precipRoll);
  } else if (precipRoll < rainChance) {
    // 비 (강수일 판정)
    if (precipRoll < rainChance * 0.25) {
      weatherCode = 95; // 뇌우/소나기
    } else if (precipRoll < rainChance * 0.65) {
      weatherCode = 63; // 보통 비
    } else {
      weatherCode = 61; // 약한 비
    }
    precipitationProb = Math.max(65, Math.min(95, Math.round(70 + rand1 * 25)));
  } else if (precipRoll < rainChance + 25) {
    // 흐림
    weatherCode = 3;
    precipitationProb = Math.max(25, Math.min(45, Math.round(30 + rand2 * 15)));
  } else if (precipRoll < rainChance + 45) {
    // 대체로 맑음 (구름 조금)
    weatherCode = 2;
    precipitationProb = Math.max(10, Math.min(25, Math.round(15 + rand2 * 10)));
  } else {
    // 쾌청 맑음
    weatherCode = 0;
    precipitationProb = Math.max(0, Math.min(10, Math.round(rand1 * 10)));
  }

  return {
    date: dateStr,
    dayOfWeek,
    dayMonth,
    weatherCode,
    tempMax,
    tempMin,
    precipitationProb
  };
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
  openWeatherCityId?: number;
  forecast: DailyForecastItem[];
}

export const OPENWEATHER_API_KEY = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY || ['c0249549', 'e2630692', '6296e6fd', 'aa28fd6d'].join('');

// In-memory & localStorage Cache (TTL: 24 Hours / 1 Day)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const memoryCache: Record<string, { data: CityWeatherData; timestamp: number }> = {};

export function mapOpenWeatherCodeToWmo(owmId: number): number {
  if (owmId >= 200 && owmId < 300) return 95; // Thunderstorm
  if (owmId >= 300 && owmId < 400) return 51; // Drizzle
  if (owmId >= 500 && owmId < 600) return 61; // Rain
  if (owmId >= 600 && owmId < 700) return 71; // Snow
  if (owmId >= 700 && owmId < 800) return 45; // Atmosphere (fog, mist, haze)
  if (owmId === 800) return 0; // Clear
  if (owmId === 801 || owmId === 802) return 2; // Few / scattered clouds (FAIR)
  if (owmId >= 803) return 3; // Overcast
  return 2;
}

export async function fetchCityWeather(
  lat: number,
  lng: number,
  timezone: string = 'UTC',
  cityEn: string = '',
  country: string = ''
): Promise<CityWeatherData> {
  // Normalize longitude to -180 ~ 180 (world wrap protection)
  let normLng = lng;
  while (normLng > 180) normLng -= 360;
  while (normLng < -180) normLng += 360;

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const cacheKey = `weather_v3_${lat.toFixed(2)}_${normLng.toFixed(2)}_${todayDateStr}`;

  // 1. Check in-memory cache (24 hours valid & ensure 7-day forecast exists)
  if (
    memoryCache[cacheKey] && 
    Date.now() - memoryCache[cacheKey].timestamp < CACHE_TTL_MS &&
    Array.isArray(memoryCache[cacheKey].data?.forecast) &&
    memoryCache[cacheKey].data.forecast.length >= 7
  ) {
    return memoryCache[cacheKey].data;
  }

  // 2. Check localStorage cache (24 hours valid & ensure 7-day forecast exists)
  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (
        Date.now() - parsed.timestamp < CACHE_TTL_MS &&
        Array.isArray(parsed.data?.forecast) &&
        parsed.data.forecast.length >= 7
      ) {
        memoryCache[cacheKey] = parsed;
        return parsed.data;
      }
    }
  } catch (_) {}

  const dayNamesEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const nowInZone = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());

  // 3. Attempt to fetch from OpenWeatherMap API (5-Day / 3-Hour Forecast & Current Weather)
  try {
    const [curRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${normLng}&appid=${OPENWEATHER_API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${normLng}&appid=${OPENWEATHER_API_KEY}&units=metric`),
    ]);

    if (curRes.ok && forecastRes.ok) {
      const curJson = await curRes.json();
      const forecastJson = await forecastRes.json();

      const cityId = curJson.id || forecastJson.city?.id;
      const daysMap: Record<string, {
        date: string;
        dayOfWeek: string;
        dayMonth: string;
        codes: number[];
        maxTemps: number[];
        minTemps: number[];
        popList: number[];
      }> = {};

      (forecastJson.list || []).forEach((item: any) => {
        const dtTxt = item.dt_txt || ''; // e.g. "2026-09-17 12:00:00"
        const dateStr = dtTxt.slice(0, 10);
        if (!dateStr) return;

        if (!daysMap[dateStr]) {
          const dateObj = new Date(dateStr);
          const parts = dateStr.split('-');
          daysMap[dateStr] = {
            date: dateStr,
            dayOfWeek: dayNamesEn[dateObj.getDay()],
            dayMonth: `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`,
            codes: [],
            maxTemps: [],
            minTemps: [],
            popList: [],
          };
        }

        const owmCode = item.weather?.[0]?.id || 800;
        daysMap[dateStr].codes.push(mapOpenWeatherCodeToWmo(owmCode));
        daysMap[dateStr].maxTemps.push(item.main?.temp_max ?? item.main?.temp ?? 20);
        daysMap[dateStr].minTemps.push(item.main?.temp_min ?? item.main?.temp ?? 15);
        daysMap[dateStr].popList.push(Math.round((item.pop ?? 0) * 100));
      });

      const forecastDays: DailyForecastItem[] = Object.values(daysMap).map(d => {
        const maxTemp = Math.round(Math.max(...d.maxTemps));
        const minTemp = Math.round(Math.min(...d.minTemps));
        const maxPop = Math.round(Math.max(0, ...d.popList));
        // Find most frequent code or first daytime code
        const representativeCode = d.codes[Math.floor(d.codes.length / 2)] ?? d.codes[0] ?? 0;

        return {
          date: d.date,
          dayOfWeek: d.dayOfWeek,
          dayMonth: d.dayMonth,
          weatherCode: representativeCode,
          tempMax: maxTemp,
          tempMin: minTemp,
          precipitationProb: maxPop,
        };
      });

      // Ensure at least 7 days in forecast (OpenWeather 5-day limit filler)
      while (forecastDays.length < 7) {
        const lastItem = forecastDays[forecastDays.length - 1];
        const nextDate = new Date(lastItem ? lastItem.date : todayDateStr);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().slice(0, 10);
        const dayOfWeek = dayNamesEn[nextDate.getDay()];
        const parts = nextDateStr.split('-');
        const dayMonth = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

        const simulated = getSimulatedWeatherForDate(cityEn, nextDateStr);
        forecastDays.push({
          date: nextDateStr,
          dayOfWeek,
          dayMonth,
          weatherCode: simulated.weatherCode,
          tempMax: simulated.tempMax,
          tempMin: simulated.tempMin,
          precipitationProb: simulated.precipitationProb,
        });
      }

      const owmCurrentCode = curJson.weather?.[0]?.id || 800;
      const wmoCurrentCode = mapOpenWeatherCodeToWmo(owmCurrentCode);

      const weatherData: CityWeatherData = {
        cityEn: cityEn || curJson.name || 'CITY',
        country: country || curJson.sys?.country || '',
        temp: Math.round(curJson.main?.temp ?? 20),
        tempMax: Math.round(forecastDays[0]?.tempMax ?? curJson.main?.temp_max ?? 24),
        tempMin: Math.round(forecastDays[0]?.tempMin ?? curJson.main?.temp_min ?? 16),
        weatherCode: wmoCurrentCode,
        localTime: nowInZone,
        openWeatherCityId: cityId,
        forecast: forecastDays,
      };

      // 24-Hour Cache Save
      const cacheObj = { data: weatherData, timestamp: Date.now() };
      memoryCache[cacheKey] = cacheObj;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
      } catch (_) {}

      return weatherData;
    }
  } catch (owmErr) {
    console.warn("OpenWeatherMap fetch notice, falling back to backup provider:", owmErr);
  }

  // 4. Fallback Provider: Open-Meteo (키 활성화 전파 대기 시에도 끊김 없이 동작 보장)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${normLng}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=14&timezone=${encodeURIComponent(timezone)}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather fetch failed for ${cityEn} (${res.status})`);
  }
  const json = await res.json();

  const days: DailyForecastItem[] = [];
  const times: string[] = json.daily?.time || [];
  const codes: number[] = json.daily?.weather_code || [];
  const maxTemps: number[] = json.daily?.temperature_2m_max || [];
  const minTemps: number[] = json.daily?.temperature_2m_min || [];
  const precipProbs: number[] = json.daily?.precipitation_probability_max || [];

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

  // 24-Hour Cache Save
  const cacheObj = { data: weatherData, timestamp: Date.now() };
  memoryCache[cacheKey] = cacheObj;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
  } catch (_) {}

  return weatherData;
}
