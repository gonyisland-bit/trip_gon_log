import React, { useEffect, useMemo, useState } from 'react';
import { LocateFixed, Search, X } from 'lucide-react';
import type { CityWeatherConfig } from '../../types';
import { CURRENT_LOCATION_EN, saveUserPref } from '../../utils/userPrefs';
import { MAX_FAVORITES, makeMain, searchCities, setFavorites, useMyCities } from '../../utils/myCities';
import { CurrentLocationRow } from '../weather/CurrentLocationRow';
import { useCitiesWeather } from '../weather/useCitiesWeather';
import { WeatherReading } from '../weather/WeatherReading';

// Settings → 도시 (v1.3.6): the main city and up to four favourites. One list for the header
// weather pill, the mini widget, the calendar, the home weather widget and the terminal window.

export function MyCitiesEditor({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const { main, favorites } = useMyCities();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCities(query, 6), [query]);
  const { now, prefetch } = useCitiesWeather([main, ...favorites].filter(c => c.nameEn !== CURRENT_LOCATION_EN));
  // Fill each row's weather once the list is known (and again when it changes)
  const key = [main, ...favorites].map(c => c.nameEn).join('|');
  useEffect(() => { prefetch(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = favorites.length >= MAX_FAVORITES;
  const isHere = main.nameEn === CURRENT_LOCATION_EN;

  const has = (c: CityWeatherConfig) => [main, ...favorites].some(x => x.nameEn.toUpperCase() === c.nameEn.toUpperCase());
  const add = (c: CityWeatherConfig) => {
    if (has(c) || full) return;
    setFavorites([...favorites, c]);
    setQuery('');
  };
  const remove = (c: CityWeatherConfig) => setFavorites(favorites.filter(f => f.nameEn !== c.nameEn));

  return (
    <section className={cardClass}>
      <span className={labelClass}>My cities</span>

      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-bold">대표 도시</span>
        <span className="text-meta text-black/55 dark:text-white/55">헤더 날씨와 배경 날씨 효과에 쓰입니다.</span>
      </div>
      <div className="flex items-center gap-3 min-h-11 px-3 rounded-thumb bg-black/[0.04] dark:bg-white/[0.06]">
        {isHere ? <LocateFixed className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden /> : null}
        <span className="flex-1 min-w-0 font-extrabold truncate">{main.name || main.nameEn}</span>
        {!isHere && <WeatherReading data={now[main.nameEn]} />}
      </div>
      {!isHere && (
        <CurrentLocationRow selected={false} onLocated={makeMain} className="rounded-thumb -mt-1" />
      )}

      <div className="flex items-baseline justify-between gap-2 pt-2">
        <span className="text-[14px] font-bold">자주 보는 도시</span>
        <span className="font-mono text-micro text-black/50 dark:text-white/50 tabular-nums">{favorites.length} / {MAX_FAVORITES}</span>
      </div>
      {favorites.length === 0 ? (
        <span className="text-meta text-black/55 dark:text-white/55">달력과 홈 날씨, 터미널 창밖에 함께 보여 줄 도시를 더하세요.</span>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {favorites.map(c => (
            <li key={c.nameEn} className="flex items-center gap-2 min-h-11 pl-3 pr-1 rounded-thumb border border-black/10 dark:border-white/10">
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[14px] font-bold truncate">{c.name || c.nameEn}</span>
                <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{c.nameEn}</span>
              </span>
              <WeatherReading data={now[c.nameEn]} />
              <button type="button" onClick={() => makeMain(c)} className="btn btn-ghost btn-sm">대표로</button>
              <button
                type="button"
                onClick={() => remove(c)}
                aria-label={`${c.name || c.nameEn} 빼기`}
                className="w-9 h-9 rounded-full grid place-items-center text-black/55 dark:text-white/55 hover:bg-black/[0.05] dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={`flex items-center gap-2 h-11 px-3 rounded-full border border-black/15 dark:border-white/15 ${full ? 'opacity-50' : ''}`}>
        <Search className="w-4 h-4 text-black/50 dark:text-white/50 shrink-0" aria-hidden />
        <input
          id="my-cities-search"
          type="search"
          value={query}
          disabled={full}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={full ? '4곳까지 담을 수 있어요' : '도시 이름으로 찾기 (예: 오사카, Lisbon)'}
          className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
          aria-label="도시 찾기"
        />
      </label>
      {results.length > 0 && !full && (
        <ul className="flex flex-col -mt-1" role="listbox" aria-label="찾은 도시">
          {results.map(c => {
            const added = has(c);
            return (
              <li key={c.nameEn}>
                <button
                  type="button"
                  role="option"
                  aria-selected={added}
                  disabled={added}
                  onClick={() => add(c)}
                  className="w-full min-h-10 px-3 flex items-center justify-between gap-3 text-left rounded-thumb hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <span className="truncate text-[14px]"><b>{c.name}</b> <span className="text-black/50 dark:text-white/50">{c.country}</span></span>
                  <span className="text-meta font-bold text-black/55 dark:text-white/55 shrink-0">{added ? '담김' : '더하기'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Weather background effect switch (kept with the cities it follows) */
export function WeatherBgSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px] font-bold">배경 날씨 효과</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="배경 날씨 효과"
        onClick={() => { const next = !value; onChange(next); try { localStorage.setItem('calendar_weather_bg_enabled', String(next)); } catch { /* cache */ } window.dispatchEvent(new CustomEvent('weatherBgToggled', { detail: next })); saveUserPref({ weatherBg: next }); }}
        className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${value ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
