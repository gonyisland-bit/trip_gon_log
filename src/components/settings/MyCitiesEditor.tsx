import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, LocateFixed, Search, X } from 'lucide-react';
import type { CityWeatherConfig } from '../../types';
import { CURRENT_LOCATION_EN, saveUserPref } from '../../utils/userPrefs';
import { MAX_CITIES, cityKey, makeMain, removeMyCity, searchCities, setMyCities, useMyCities } from '../../utils/myCities';
import { CurrentLocationRow } from '../weather/CurrentLocationRow';
import { LOCATION_EVENT, getPosition, locationPermission, locationProblem, locationSwitchedOff, setLocationSwitchedOff, type LocationPermission } from '../../utils/location';
import { notify } from '../../utils/feedback';
import { useCitiesWeather } from '../weather/useCitiesWeather';
import { WeatherReading } from '../weather/WeatherReading';

// Settings → 도시 (v1.3.6, one list since v1.3.9): up to five cities in the member's order, and the main city among
// them (or the current location). The same list, in this order, is what the calendar, the home weather, the world clock
// and the terminal show. Making a city the main one only marks it; the list keeps its cities and their order.

export function MyCitiesEditor({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const { main, cities } = useMyCities();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCities(query, 6), [query]);
  const { now, prefetch } = useCitiesWeather(cities);
  // Fill each row's weather once the list is known (and again when it changes)
  const key = cities.map(c => c.nameEn).join('|');
  useEffect(() => { prefetch(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = cities.length >= MAX_CITIES;
  const isHere = main.nameEn === CURRENT_LOCATION_EN;
  const isMain = (c: CityWeatherConfig) => cityKey(c.nameEn) === cityKey(main.nameEn);

  const has = (c: CityWeatherConfig) => cities.some(x => cityKey(x.nameEn) === cityKey(c.nameEn));
  const add = (c: CityWeatherConfig) => {
    if (has(c) || full) return;
    setMyCities([...cities, c]);
    setQuery('');
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cities.length) return;
    const next = [...cities];
    [next[i], next[j]] = [next[j], next[i]];
    setMyCities(next);
  };
  const iconBtn = 'w-10 h-6 rounded-full grid place-items-center text-black/55 dark:text-white/55 hover:bg-black/[0.06] dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none';

  return (
    <section className={cardClass}>
      <span className={labelClass}>My cities</span>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-bold">내 도시</span>
        <span className="font-mono text-micro text-black/50 dark:text-white/50 tabular-nums">{cities.length} / {MAX_CITIES}</span>
      </div>
      <span className="text-meta text-black/55 dark:text-white/55 -mt-1">대표 도시는 헤더 날씨와 배경 날씨 효과에 쓰입니다. 목록 순서대로 달력, 홈, 세계시간, 터미널에 나옵니다.</span>

      <CurrentLocationRow selected={isHere} onLocated={makeMain} className="rounded-thumb" />

      {cities.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {cities.map((c, i) => {
            const on = isMain(c);
            return (
              <li key={c.nameEn} className={`flex items-center gap-2 min-h-12 pl-1 pr-1 rounded-thumb border ${on ? 'border-black/40 dark:border-white/40' : 'border-black/10 dark:border-white/10'}`}>
                {cities.length > 1 && (
                  <span className="flex flex-col shrink-0">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${c.name || c.nameEn} 위로`} className={iconBtn}><ChevronUp className="w-4 h-4" aria-hidden /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === cities.length - 1} aria-label={`${c.name || c.nameEn} 아래로`} className={iconBtn}><ChevronDown className="w-4 h-4" aria-hidden /></button>
                  </span>
                )}
                <span className="flex-1 min-w-0 flex flex-col pl-1.5">
                  <span className="text-[14px] font-bold truncate">{c.name || c.nameEn}</span>
                  <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{c.nameEn}</span>
                </span>
                <WeatherReading data={now[c.nameEn]} />
                {on
                  ? <span className="h-8 px-2.5 inline-flex items-center text-meta font-bold text-red-600 dark:text-red-400">대표</span>
                  : <button type="button" onClick={() => makeMain(c)} className="btn btn-ghost btn-sm">대표로</button>}
                <button
                  type="button"
                  onClick={() => removeMyCity(c)}
                  aria-label={`${c.name || c.nameEn} 빼기`}
                  className="w-9 h-9 rounded-full grid place-items-center text-black/55 dark:text-white/55 hover:bg-black/[0.05] dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </li>
            );
          })}
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
          placeholder={full ? `${MAX_CITIES}곳까지 담을 수 있어요` : '도시 이름으로 찾기 (예: 오사카, Lisbon)'}
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

/**
 * Current location on or off for this account. On: screens use the place wherever the OS or browser already allows it
 * (switching on asks once if it has not been allowed). Off: no screen reads it on its own; a tap on a "current
 * location" button still can.
 */
export function LocationSwitch() {
  const [off, setOff] = useState(locationSwitchedOff);
  const [perm, setPerm] = useState<LocationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => { setOff(locationSwitchedOff()); locationPermission().then(setPerm); };
    read();
    window.addEventListener(LOCATION_EVENT, read);
    return () => window.removeEventListener(LOCATION_EVENT, read);
  }, []);
  const on = !off && perm === 'granted';
  const toggle = async () => {
    if (busy) return;
    if (on) {
      setLocationSwitchedOff(true);
      saveUserPref({ locationOff: true });
      return;
    }
    setBusy(true);
    try {
      await getPosition({ ask: true });
      setLocationSwitchedOff(false);
      saveUserPref({ locationOff: false });
    } catch (err) {
      notify(locationProblem(err), 'error');
    } finally {
      setBusy(false);
      locationPermission().then(setPerm);
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-bold inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <LocateFixed className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden />}
          현재 위치 사용
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="현재 위치 사용"
          onClick={toggle}
          className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${on ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      {perm === 'denied' && <span className="text-[12px] text-amber-700 dark:text-amber-400 leading-snug">{locationProblem({ code: 1 })}</span>}
    </div>
  );
}
