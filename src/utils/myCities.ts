// My cities (v1.3.6): one main city (or the current location) and up to four favourites per account.
// The main city drives the header weather pill, the mini widget and the weather ambience; main and
// favourites together are the list the calendar, the home weather widget and the terminal show.
// Saved in users/{uid}/settings/prefs with the other viewer prefs; localStorage is only the cache.
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { CityWeatherConfig } from '../types';
import { WORLD_CITIES, type DestinationCity } from '../data/worldDestinations';
import { CURRENT_LOCATION_EN, cachedCurrentLocation, saveUserPref, selectWeatherCity } from './userPrefs';

export const MAX_FAVORITES = 4;
const FAV_KEY = 'tgl_favorite_cities';
const CATALOG_KEY = 'cached_calendar_weather_cities';
export const MY_CITIES_EVENT = 'myCitiesChanged';

export const SEOUL: CityWeatherConfig = { name: '서울', nameEn: 'SEOUL', lat: 37.5665, lng: 126.978, country: 'KR', timezone: 'Asia/Seoul' };

// Time zone by country (one per country; the wide ones pick by longitude below)
const COUNTRY_TZ: Record<string, string> = {
  JAPAN: 'Asia/Tokyo', 'SOUTH KOREA': 'Asia/Seoul', TAIWAN: 'Asia/Taipei', 'HONG KONG': 'Asia/Hong_Kong', MACAU: 'Asia/Macau',
  CHINA: 'Asia/Shanghai', MONGOLIA: 'Asia/Ulaanbaatar', VIETNAM: 'Asia/Ho_Chi_Minh', THAILAND: 'Asia/Bangkok', PHILIPPINES: 'Asia/Manila',
  SINGAPORE: 'Asia/Singapore', MALAYSIA: 'Asia/Kuala_Lumpur', INDONESIA: 'Asia/Jakarta', LAOS: 'Asia/Vientiane', CAMBODIA: 'Asia/Phnom_Penh',
  MALDIVES: 'Indian/Maldives', INDIA: 'Asia/Kolkata', NEPAL: 'Asia/Kathmandu', FRANCE: 'Europe/Paris', ITALY: 'Europe/Rome', SPAIN: 'Europe/Madrid',
  'UNITED KINGDOM': 'Europe/London', SWITZERLAND: 'Europe/Zurich', GERMANY: 'Europe/Berlin', AUSTRIA: 'Europe/Vienna', 'CZECH REPUBLIC': 'Europe/Prague',
  HUNGARY: 'Europe/Budapest', CROATIA: 'Europe/Zagreb', PORTUGAL: 'Europe/Lisbon', GREECE: 'Europe/Athens', NETHERLANDS: 'Europe/Amsterdam',
  BELGIUM: 'Europe/Brussels', DENMARK: 'Europe/Copenhagen', NORWAY: 'Europe/Oslo', SWEDEN: 'Europe/Stockholm', FINLAND: 'Europe/Helsinki',
  POLAND: 'Europe/Warsaw', IRELAND: 'Europe/Dublin', ROMANIA: 'Europe/Bucharest', SLOVENIA: 'Europe/Ljubljana', ICELAND: 'Atlantic/Reykjavik',
  TURKEY: 'Europe/Istanbul', EGYPT: 'Africa/Cairo', MOROCCO: 'Africa/Casablanca', 'SOUTH AFRICA': 'Africa/Johannesburg', KENYA: 'Africa/Nairobi',
  TANZANIA: 'Africa/Dar_es_Salaam', 'UNITED ARAB EMIRATES': 'Asia/Dubai', JORDAN: 'Asia/Amman', QATAR: 'Asia/Qatar', 'SAUDI ARABIA': 'Asia/Riyadh',
  CUBA: 'America/Havana', PERU: 'America/Lima', ARGENTINA: 'America/Argentina/Buenos_Aires', CHILE: 'America/Santiago', COLOMBIA: 'America/Bogota',
  'NEW ZEALAND': 'Pacific/Auckland', FIJI: 'Pacific/Fiji', GUAM: 'Pacific/Guam', SAIPAN: 'Pacific/Saipan',
};

function zoneFor(c: DestinationCity): string {
  const { countryEn: k, lng, lat } = c;
  if (k === 'UNITED STATES') return lng < -150 ? 'Pacific/Honolulu' : lng < -114 ? 'America/Los_Angeles' : lng < -101 ? 'America/Denver' : lng < -87 ? 'America/Chicago' : 'America/New_York';
  if (k === 'CANADA') return lng < -114 ? 'America/Vancouver' : lng < -101 ? 'America/Edmonton' : lng < -90 ? 'America/Winnipeg' : lng < -64 ? 'America/Toronto' : 'America/Halifax';
  if (k === 'AUSTRALIA') return lng < 129 ? 'Australia/Perth' : lat > -26 && lng < 138 ? 'Australia/Darwin' : lng < 141 ? 'Australia/Adelaide' : lat > -29 ? 'Australia/Brisbane' : 'Australia/Sydney';
  if (k === 'BRAZIL') return lng < -60 ? 'America/Manaus' : 'America/Sao_Paulo';
  if (k === 'MEXICO') return lng < -106 ? 'America/Tijuana' : lng < -95 ? 'America/Mexico_City' : 'America/Cancun';
  return COUNTRY_TZ[k] || 'UTC';
}

export function cityFromDestination(c: DestinationCity): CityWeatherConfig {
  return { name: c.nameKo, nameEn: c.nameEn.toUpperCase(), country: c.countryKo, lat: c.lat, lng: c.lng, timezone: zoneFor(c) };
}

/** The operator's city list (defaults for new members) as cached on this device */
function catalog(): CityWeatherConfig[] {
  try {
    const list = JSON.parse(localStorage.getItem(CATALOG_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

const same = (a?: string, b?: string) => !!a && !!b && a.toUpperCase() === b.toUpperCase();

/** A city by its English name: the operator's list first (exact settings), then the world catalog */
export function findCity(nameEn: string): CityWeatherConfig | null {
  if (nameEn === CURRENT_LOCATION_EN) return cachedCurrentLocation();
  const fromCatalog = catalog().find(c => same(c.nameEn, nameEn));
  if (fromCatalog) return fromCatalog;
  if (same(nameEn, 'SEOUL')) return SEOUL;
  const w = WORLD_CITIES.find(c => same(c.nameEn, nameEn));
  return w ? cityFromDestination(w) : null;
}

/** Cities matching a Korean or English query, for the picker */
export function searchCities(query: string, limit = 8): CityWeatherConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: CityWeatherConfig[] = [];
  const push = (c: CityWeatherConfig) => { const k = c.nameEn.toUpperCase(); if (!seen.has(k)) { seen.add(k); out.push(c); } };
  catalog().filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q)).forEach(push);
  WORLD_CITIES.filter(c => c.nameKo.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.countryKo.includes(q))
    .forEach(c => push(cityFromDestination(c)));
  return out.slice(0, limit);
}

export function readMainCity(): CityWeatherConfig {
  try {
    const en = localStorage.getItem('selected_weather_city_en') || 'SEOUL';
    return findCity(en) || SEOUL;
  } catch { return SEOUL; }
}

export function readFavorites(): CityWeatherConfig[] {
  try {
    const list = JSON.parse(localStorage.getItem(FAV_KEY) || 'null');
    if (Array.isArray(list)) return list.slice(0, MAX_FAVORITES);
  } catch { /* fall through */ }
  return [];
}

function announce() { window.dispatchEvent(new Event(MY_CITIES_EVENT)); }

/** Replace this member's favourites (at most four) here and on the account */
export function setFavorites(list: CityWeatherConfig[], save = true) {
  const clean = list.filter((c, i, a) => a.findIndex(x => same(x.nameEn, c.nameEn)) === i && !same(c.nameEn, CURRENT_LOCATION_EN)).slice(0, MAX_FAVORITES);
  try { localStorage.setItem(FAV_KEY, JSON.stringify(clean)); } catch { /* cache only */ }
  announce();
  if (save) saveUserPref({ favoriteCities: clean.map(c => c.nameEn) });
}

/**
 * On sign-in: the account's favourites replace this device's. A member who has none yet starts with
 * the operator's first cities (or a few well-known ones), saved to their account.
 */
export async function applyFavoritePrefs(names: string[] | undefined) {
  if (Array.isArray(names)) {
    setFavorites(names.map(findCity).filter((c): c is CityWeatherConfig => !!c), false);
    return;
  }
  let list = catalog();
  if (!list.length) {
    try {
      const snap = await getDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'));
      const cities = snap.exists() ? snap.data()?.cities : null;
      if (Array.isArray(cities)) { list = cities; localStorage.setItem(CATALOG_KEY, JSON.stringify(cities)); }
    } catch { /* defaults below */ }
  }
  const main = readMainCity();
  const defaults = (list.length ? list : ['TOKYO', 'PARIS', 'NEW YORK', 'BANGKOK'].map(findCity).filter((c): c is CityWeatherConfig => !!c))
    .filter(c => !same(c.nameEn, main.nameEn));
  setFavorites(defaults.slice(0, MAX_FAVORITES), true);
}

/** Main city plus favourites, kept current as either changes anywhere in the app */
export function useMyCities() {
  const [main, setMain] = useState<CityWeatherConfig>(readMainCity);
  const [favorites, setFavs] = useState<CityWeatherConfig[]>(readFavorites);
  useEffect(() => {
    const onMain = (e: Event) => { const c = (e as CustomEvent<CityWeatherConfig>).detail; if (c?.nameEn) setMain(c); };
    const onFavs = () => setFavs(readFavorites());
    window.addEventListener('selectedWeatherCityChanged', onMain);
    window.addEventListener(MY_CITIES_EVENT, onFavs);
    return () => { window.removeEventListener('selectedWeatherCityChanged', onMain); window.removeEventListener(MY_CITIES_EVENT, onFavs); };
  }, []);
  const list = [main, ...favorites.filter(f => !same(f.nameEn, main.nameEn))];
  return { main, favorites, list };
}

/**
 * Picks the main city from the list. A favourite that becomes main trades places with the old
 * main, so switching back and forth never loses a city.
 */
export function makeMain(city: CityWeatherConfig) {
  const old = readMainCity();
  const favs = readFavorites();
  const i = favs.findIndex(f => same(f.nameEn, city.nameEn));
  if (i >= 0) {
    const next = [...favs];
    if (!same(old.nameEn, CURRENT_LOCATION_EN) && !same(old.nameEn, city.nameEn)) next[i] = old; else next.splice(i, 1);
    setFavorites(next);
  }
  selectWeatherCity(city);
}

export const OPEN_SETTINGS_EVENT = 'tgl:open-settings';
/** Opens Settings on one of its tabs from anywhere ("도시 편집" in a weather list, for example) */
export function openSettings(tab?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: tab }));
}
