import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CityWeatherConfig } from '../../types';
import { fetchCityWeather, getWeatherMeta, type CityWeatherData } from '../../utils/weatherApi';
import { CURRENT_LOCATION_EN, selectWeatherCity } from '../../utils/userPrefs';
import { CurrentLocationRow } from '../weather/CurrentLocationRow';

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
  const [now, setNow] = useState<Record<string, CityWeatherData>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cities.forEach(c => {
      if (now[c.nameEn]) return;
      fetchCityWeather(c.lat, c.lng, c.timezone, c.nameEn, c.country)
        .then(d => setNow(prev => ({ ...prev, [c.nameEn]: d })))
        .catch(() => {});
    });
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
        aria-expanded={open}
        aria-haspopup="listbox"
        title="창밖 날씨 위치"
        className="tgl-press h-7 sm:h-8 px-2 sm:px-2.5 inline-flex items-center gap-1 sm:gap-1.5 border border-black/25 hover:border-black dark:border-white/25 dark:hover:border-white font-mono text-[11px] sm:text-meta cursor-pointer"
      >
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        {temp !== undefined && <span className="tabular-nums font-bold">{temp}°</span>}
        <span className="hidden sm:inline uppercase tracking-wider max-w-[7rem] truncate">{name || nameEn || '날씨'}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" aria-label="창밖 날씨 위치" className="absolute right-0 top-full mt-1.5 z-40 w-60 max-h-80 overflow-y-auto overscroll-contain bg-[#F2F2EE] dark:bg-[#161618] border border-black/20 dark:border-white/20 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 font-mono text-micro uppercase tracking-[0.16em] text-black/60 dark:text-white/60">Window weather</div>
          <CurrentLocationRow selected={nameEn === CURRENT_LOCATION_EN} onLocated={pick} />
          {cities.map(c => {
            const d = now[c.nameEn];
            const m = d ? getWeatherMeta(d.weatherCode, d.forecast?.[0]?.precipitationProb, d.temp) : null;
            const I = m?.icon;
            const on = (nameEn || '').toUpperCase() === c.nameEn.toUpperCase();
            return (
              <button
                key={c.nameEn}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(c)}
                className={`w-full min-h-10 px-3 py-2 flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                  on ? 'bg-black/5 dark:bg-white/10 font-extrabold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80'
                }`}
              >
                <span className="truncate">{c.name || c.nameEn}</span>
                <span className="flex items-center gap-1.5 shrink-0 font-mono text-micro text-black/60 dark:text-white/60">
                  {I ? <I className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5" />}
                  {m ? <span>{m.labelKo ?? ''} {d!.temp}°</span> : <span>…</span>}
                  {on && <Check className="w-3.5 h-3.5 text-black dark:text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
