// My cities (v1.3.6, one ordered list since v1.3.9): up to five cities per account in the order the member set, and
// one of them (or the current location) is the main city. Choosing the main city only points at a city; it never adds,
// drops or reorders the list, so a city picked in the header or the terminal leaves the member's list as it was.
// The main city drives the header weather pill, the terminal window and the weather ambience; the list is what the
// calendar, the home weather and the world clock show. Saved in users/{uid}/settings/prefs with the other viewer prefs
// (whole cities, so another device never has to look a name up); localStorage is only the cache.
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { CityWeatherConfig } from '../types';
import { WORLD_CITIES, type DestinationCity } from '../data/worldDestinations';
import { CURRENT_LOCATION_EN, cachedCurrentLocation, saveUserPref, selectWeatherCity } from './userPrefs';
import { pruneHomeCities } from './homeWidgetPrefs';

export const MAX_CITIES = 5;
const LIST_KEY = 'tgl_my_cities';
const FAV_KEY = 'tgl_favorite_cities';
const CATALOG_KEY = 'cached_calendar_weather_cities';
export const MY_CITIES_EVENT = 'myCitiesChanged';

/** One spelling per city: the operator's list writes "Fukuoka", the world catalog "FUKUOKA" */
export const cityKey = (nameEn?: string) => (nameEn || '').trim().toUpperCase();
const normal = (c: CityWeatherConfig): CityWeatherConfig => ({ ...c, nameEn: cityKey(c.nameEn) });

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
    return Array.isArray(list) ? list.filter(c => c?.nameEn).map(normal) : [];
  } catch { return []; }
}

export const sameCity = (a?: string, b?: string) => !!a && !!b && cityKey(a) === cityKey(b);
const same = sameCity;

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
    return findCity(en) || readMyCities().find(c => same(c.nameEn, en)) || SEOUL;
  } catch { return SEOUL; }
}

/** One city once, in the order given, at most five, never the current location (it is not a city of the list) */
function clean(list: CityWeatherConfig[]): CityWeatherConfig[] {
  const out: CityWeatherConfig[] = [];
  list.forEach(c => {
    if (!c?.nameEn || same(c.nameEn, CURRENT_LOCATION_EN) || out.some(x => same(x.nameEn, c.nameEn))) return;
    out.push(normal(c));
  });
  return out.slice(0, MAX_CITIES);
}

/** The member's cities on this device, in their order (an older device kept the main city and four favourites apart) */
export function readMyCities(): CityWeatherConfig[] {
  try {
    const list = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
    if (Array.isArray(list)) return clean(list);
  } catch { /* the older keys below */ }
  let favs: CityWeatherConfig[] = [];
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) || 'null');
    if (Array.isArray(v)) favs = v;
  } catch { /* none */ }
  let main: CityWeatherConfig | null = null;
  try {
    const en = localStorage.getItem('selected_weather_city_en') || 'SEOUL';
    main = same(en, CURRENT_LOCATION_EN) ? null : findCity(en);
  } catch { /* none */ }
  return clean([...(main ? [main] : []), ...favs]);
}

function announce() { window.dispatchEvent(new Event(MY_CITIES_EVENT)); }

/**
 * Replace this member's cities here and, with `save`, on the account. The whole cities are saved (myCities) and, for an
 * app that has not updated yet, the old shape too (favoriteCities: the names other than the main city). A city that
 * leaves the list leaves the home clock and weather choices with it.
 */
export function setMyCities(list: CityWeatherConfig[], save = true) {
  const next = clean(list);
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch { /* cache only */ }
  announce();
  pruneHomeCities(next.map(c => c.nameEn), save);
  if (save) {
    const mainEn = (() => { try { return localStorage.getItem('selected_weather_city_en') || ''; } catch { return ''; } })();
    saveUserPref({ myCities: next, favoriteCities: next.filter(c => !same(c.nameEn, mainEn)).map(c => c.nameEn) });
  }
}

/** A name from an account saved before whole cities were: this device's copy, the catalogs, or a search by name */
function resolveName(name: string, local: CityWeatherConfig[]): CityWeatherConfig | null {
  return local.find(c => same(c.nameEn, name)) ?? findCity(name) ?? searchCities(name, 1).find(c => same(c.nameEn, name)) ?? null;
}

async function ensureCatalog() {
  if (catalog().length) return;
  try {
    const snap = await getDoc(doc(db, 'users', 'public', 'settings', 'calendar_weather_cities'));
    const cities = snap.exists() ? snap.data()?.cities : null;
    if (Array.isArray(cities)) localStorage.setItem(CATALOG_KEY, JSON.stringify(cities));
  } catch { /* the world catalog is enough */ }
}

/**
 * On sign-in: the account's cities replace this device's. Whole cities (myCities) are taken as they are. An account from
 * before keeps its main city and favourites, looked up by name; a name no catalog knows yet waits for the operator's list
 * before it is given up, and the list is then saved whole so the next device needs no lookup. A member with no cities
 * yet starts with the operator's first ones (or a few well-known ones).
 */
export async function applyMyCitiesPrefs(prefs: { myCities?: CityWeatherConfig[]; favoriteCities?: string[]; weatherCity?: string }) {
  if (Array.isArray(prefs.myCities)) {
    setMyCities(prefs.myCities, false);
    return;
  }
  const local = readMyCities();
  const main = prefs.weatherCity && !same(prefs.weatherCity, CURRENT_LOCATION_EN) ? prefs.weatherCity : undefined;
  if (Array.isArray(prefs.favoriteCities)) {
    const names = [...(main ? [main] : []), ...prefs.favoriteCities];
    if (names.some(n => !resolveName(n, local))) await ensureCatalog();
    setMyCities(names.map(n => resolveName(n, local)).filter((c): c is CityWeatherConfig => !!c), true);
    return;
  }
  await ensureCatalog();
  const first = main ? resolveName(main, local) : readMainCity();
  const defaults = catalog().length ? catalog() : ['TOKYO', 'PARIS', 'NEW YORK', 'BANGKOK'].map(findCity).filter((c): c is CityWeatherConfig => !!c);
  setMyCities([...(first && !same(first.nameEn, CURRENT_LOCATION_EN) ? [first] : []), ...defaults], true);
}

/**
 * The main city and the member's cities, kept current as either changes anywhere in the app.
 * `cities` is the list in the member's order; `list` is the same with the main city in front when it is not one of them
 * (the current location, or a city an older device chose); `favorites` is the list without the main city.
 */
export function useMyCities() {
  const [main, setMain] = useState<CityWeatherConfig>(readMainCity);
  const [cities, setCities] = useState<CityWeatherConfig[]>(readMyCities);
  useEffect(() => {
    const onMain = (e: Event) => { const c = (e as CustomEvent<CityWeatherConfig>).detail; if (c?.nameEn) setMain(normal(c)); };
    const onList = () => setCities(readMyCities());
    window.addEventListener('selectedWeatherCityChanged', onMain);
    window.addEventListener(MY_CITIES_EVENT, onList);
    return () => { window.removeEventListener('selectedWeatherCityChanged', onMain); window.removeEventListener(MY_CITIES_EVENT, onList); };
  }, []);
  const inList = cities.some(c => same(c.nameEn, main.nameEn));
  const list = inList ? cities : [main, ...cities];
  const favorites = cities.filter(c => !same(c.nameEn, main.nameEn));
  return { main, cities, favorites, list };
}

/**
 * Makes a city the main one. It only points at the city: the list keeps its cities and their order. A city not in the
 * list yet joins it at the end while there is room.
 */
export function makeMain(city: CityWeatherConfig) {
  if (!same(city.nameEn, CURRENT_LOCATION_EN)) {
    const list = readMyCities();
    if (!list.some(c => same(c.nameEn, city.nameEn)) && list.length < MAX_CITIES) setMyCities([...list, city]);
  }
  selectWeatherCity(same(city.nameEn, CURRENT_LOCATION_EN) ? city : normal(city));
  // The old shape follows the main city (the names other than it)
  const mainEn = city.nameEn;
  saveUserPref({ favoriteCities: readMyCities().filter(c => !same(c.nameEn, mainEn)).map(c => c.nameEn) });
}

/** Takes a city off the list; when it was the main city, the first city left becomes the main one */
export function removeMyCity(city: CityWeatherConfig) {
  const next = readMyCities().filter(c => !same(c.nameEn, city.nameEn));
  setMyCities(next);
  if (same(readMainCity().nameEn, city.nameEn)) selectWeatherCity(next[0] ?? SEOUL);
}

export const OPEN_SETTINGS_EVENT = 'tgl:open-settings';
/** Opens Settings on one of its tabs from anywhere ("도시 편집" in a weather list, for example) */
export function openSettings(tab?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: tab }));
}
