import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CityWeatherConfig } from '../../types';
import { getWeatherMeta } from '../../utils/weatherApi';
import { CURRENT_LOCATION_EN, cachedCurrentLocation, selectWeatherCity } from '../../utils/userPrefs';
import { CurrentLocationRow } from '../weather/CurrentLocationRow';
import { useCitiesWeather } from '../weather/useCitiesWeather';
import { WeatherReading } from '../weather/WeatherReading';

// Weather location for the terminal window: the same per-user choice as the header weather pill.
// Each row shows that place's weather now, so the user can pick the sky they want to see.

const FALLBACK: CityWeatherConfig[] = [
  { name: '서울', nameEn: 'SEOUL', lat: 37.5665, lng: 126.978, country: 'KR', timezone: 'Asia/Seoul' },
  { name: '도쿄', nameEn: 'TOKYO', lat: 35.6762, lng: 139.6503, country: 'JP', timezone: 'Asia/Tokyo' },
  { name: '파리', nameEn: 'PARIS', lat: 48.8566, lng: 2.3522, country: 'FR', timezone: 'Europe/Paris' },
  { name: '런던', nameEn: 'LONDON', lat: 51.5074, lng: -0.1278, country: 'GB', timezone: 'Europe/London' },
];

function savedCities(): CityWeatherConfig[] {
  try {
    const list = JSON.parse(localStorage.getItem('cached_calendar_weather_cities') || '[]');
    if (Array.isArray(list) && list.length) return list;
  } catch { /* fall back */ }
  return FALLBACK;
}

export function TerminalWeatherPicker({ name, nameEn, temp, code, pop }: {
  name?: string; nameEn?: string; temp?: number; code?: number; pop?: number;
}) {
  const [open, setOpen] = useState(false);
  const [cities] = useState(savedCities);
  const { now, prefetch } = useCitiesWeather(cities);
  const here = cachedCurrentLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    prefetch(here);
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const meta = code !== undefined ? getWeatherMeta(code, pop, temp) : null;
  const Icon = meta?.icon;
  const pick = (c: CityWeatherConfig) => { selectWeatherCity(c); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onPointerEnter={() => prefetch(here)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="창밖 날씨 위치"
        className="tgl-press h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] font-mono text-[11px] sm:text-meta cursor-pointer"
      >
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        {temp !== undefined && <span className="tabular-nums font-bold">{temp}°</span>}
        <span className="hidden sm:inline uppercase tracking-wider max-w-[7rem] truncate">{name || nameEn || '날씨'}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label="창밖 날씨 위치" className="absolute right-0 top-full mt-1.5 z-40 w-60 max-h-80 overflow-y-auto overscroll-contain rounded-card bg-surface dark:bg-surface-dark shadow-[0_12px_32px_rgba(0,0,0,0.16)] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 font-mono text-micro uppercase tracking-[0.16em] text-black/50 dark:text-white/50">Window weather</div>
          <CurrentLocationRow selected={nameEn === CURRENT_LOCATION_EN} onLocated={pick} trailing={here ? <WeatherReading data={now[here.nameEn]} /> : undefined} />
          {cities.map(c => {
            const on = (nameEn || '').toUpperCase() === c.nameEn.toUpperCase();
            return (
              <button
                key={c.nameEn}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(c)}
                className={`w-full min-h-10 px-3 py-2 flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                  on ? 'bg-black/5 dark:bg-white/[0.18] font-extrabold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80'
                }`}
              >
                <span className="truncate">{c.name || c.nameEn}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <WeatherReading data={now[c.nameEn]} />
                  <span className="w-3.5 h-3.5 inline-grid place-items-center">{on && <Check className="w-3.5 h-3.5" />}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
