// Per-account display preferences: weather location, weather background and screen mode.
// Each signed-in user keeps their own copy in Firestore (users/{uid}/settings/prefs), so one
// person's choice never changes another person's screen; localStorage is only the instant cache.
// Coordinates are never stored: "current location" is saved as a mode and resolved on the device.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { canReadLocationQuietly, getPosition } from './location';
import { auth, db } from '../firebase';
import type { CityWeatherConfig } from '../types';

export const CURRENT_LOCATION_EN = 'CURRENT LOCATION';

export interface UserPrefs {
  weatherCity?: string;           // nameEn, or CURRENT_LOCATION_EN
  weatherBg?: boolean;
  nightMode?: 'auto' | 'light' | 'dark';
  /** Journey map tiles (see mapTiles.ts) */
  mapStyle?: 'normal' | 'terrain' | 'simple';
  /** How each journey opens from its card, by journey id (see journeyOpen.ts) */
  journeyOpenBy?: Record<string, 'board' | 'magazine'>;
  /** The member's cities other than weatherCity, by English name (the shape before v1.3.9; still written for older apps) */
  favoriteCities?: string[];
  /** The member's cities, whole and in their order (see myCities.ts) */
  myCities?: CityWeatherConfig[];
  /** Page backdrop template id (see backdrop.ts) */
  backdrop?: string;
  /** Slideshow music: plays on its own, shuffled, volume 0–100, track ids switched off */
  bgm?: { autoplay?: boolean; shuffle?: boolean; volume?: number; off?: string[] };
  /** Slideshow pacing and photo fit */
  slideshow?: { interval?: number; fit?: 'fit' | 'fill' };
  /** World map style on the map hub (see mapTiles.ts) */
  hubMapStyle?: 'gray' | 'normal' | 'terrain' | 'simple';
  /** The member switched current location off: no screen reads it on its own (see location.ts) */
  locationOff?: boolean;
  /** Which home widgets show (see homeWidgetPrefs.ts) */
  homeWidgets?: import('./homeWidgetPrefs').HomeWidgetPrefs;
  /** The welcome notice version this member closed (see notice.ts) */
  welcomeSeen?: number;
  /** Tapping the logo plays the splash (see logoSplash.ts) */
  logoSplash?: boolean;
}

// Writes made before this account's prefs have been read wait in `pending`: once the read is in, they are laid over what
// the cloud had (the newer choice wins) and saved, so a change made in the first seconds after opening is never lost and
// the cache never overwrites the cloud with anything older.
let loadedFor: string | null = null;
let pending: { uid: string; patch: UserPrefs } | null = null;
// Only what a member chooses by hand waits; settings an effect writes on start (the screen mode) would otherwise win
// over the account's own choice
const WAITS: (keyof UserPrefs)[] = ['weatherCity', 'favoriteCities', 'myCities', 'homeWidgets'];

export async function loadUserPrefs(uid: string): Promise<UserPrefs> {
  let prefs: UserPrefs = {};
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'prefs'));
    prefs = (snap.exists() ? snap.data() : {}) as UserPrefs;
  } catch {
    prefs = {};
  }
  loadedFor = uid;
  if (pending && pending.uid === uid) {
    const patch = pending.patch;
    pending = null;
    prefs = { ...prefs, ...patch };
    setDoc(doc(db, 'users', uid, 'settings', 'prefs'), { ...patch, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  }
  return prefs;
}

export function saveUserPref(patch: UserPrefs) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  if (loadedFor !== uid) {
    const waiting = Object.fromEntries(Object.entries(patch).filter(([k]) => WAITS.includes(k as keyof UserPrefs))) as UserPrefs;
    if (Object.keys(waiting).length) pending = { uid, patch: { ...(pending?.uid === uid ? pending.patch : {}), ...waiting } };
    return;
  }
  setDoc(doc(db, 'users', uid, 'settings', 'prefs'), { ...patch, updatedAt: Date.now() }, { merge: true }).catch(() => {});
}

/** The last resolved current location on this device, if any */
export function cachedCurrentLocation(): CityWeatherConfig | null {
  try {
    const raw = localStorage.getItem('cached_current_location');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isCurrentLocation(city?: { nameEn?: string } | null) {
  return !!city && city.nameEn === CURRENT_LOCATION_EN;
}

/**
 * Ask the device where it is (utils/location: the OS in the app, the browser on the web). `ask` comes from a tap and may
 * show the permission prompt; without it the call is refused unless location is already allowed.
 */
export async function locateMe(ask = true): Promise<CityWeatherConfig> {
  const pos = await getPosition({ ask });
  return {
    name: '현재 위치',
    nameEn: CURRENT_LOCATION_EN,
    country: '',
    lat: Math.round(pos.lat * 100) / 100,
    lng: Math.round(pos.lng * 100) / 100,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

/** True when location is allowed and not switched off, so it can be read without a prompt */
export async function locationGranted(): Promise<boolean> {
  return canReadLocationQuietly();
}

/** Switch this user's weather location everywhere (header, background, terminal) and remember it */
export function selectWeatherCity(city: CityWeatherConfig) {
  try {
    localStorage.setItem('selected_weather_city_en', city.nameEn);
    if (isCurrentLocation(city)) localStorage.setItem('cached_current_location', JSON.stringify(city));
  } catch { /* cache only */ }
  window.dispatchEvent(new CustomEvent('selectedWeatherCityChanged', { detail: city }));
  saveUserPref({ weatherCity: city.nameEn });
}
