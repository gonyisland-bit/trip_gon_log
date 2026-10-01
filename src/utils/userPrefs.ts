// Per-account display preferences: weather location, weather background and screen mode.
// Each signed-in user keeps their own copy in Firestore (users/{uid}/settings/prefs), so one
// person's choice never changes another person's screen; localStorage is only the instant cache.
// Coordinates are never stored: "current location" is saved as a mode and resolved on the device.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { CityWeatherConfig } from '../types';

export const CURRENT_LOCATION_EN = 'CURRENT LOCATION';

export interface UserPrefs {
  weatherCity?: string;           // nameEn, or CURRENT_LOCATION_EN
  weatherBg?: boolean;
  nightMode?: 'auto' | 'light' | 'dark';
  /** Journey map tiles (see mapTiles.ts) */
  mapStyle?: 'normal' | 'terrain' | 'simple';
  /** How a published journey opens from its card (v1.3.6): its magazine first, or always the record */
  journeyOpen?: JourneyOpen;
  /** Up to four more cities next to weatherCity (see myCities.ts), by English name */
  favoriteCities?: string[];
  /** Page backdrop template id (see backdrop.ts) */
  backdrop?: string;
  /** Slideshow music: plays on its own, shuffled, volume 0–100, track ids switched off */
  bgm?: { autoplay?: boolean; shuffle?: boolean; volume?: number; off?: string[] };
  /** Slideshow pacing and photo fit */
  slideshow?: { interval?: number; fit?: 'fit' | 'fill' };
  /** World map style on the map hub (see mapTiles.ts) */
  hubMapStyle?: 'gray' | 'normal' | 'terrain' | 'simple';
  /** Which home widgets show (see homeWidgetPrefs.ts) */
  homeWidgets?: import('./homeWidgetPrefs').HomeWidgetPrefs;
}

export type JourneyOpen = 'magazine' | 'record';
const JOURNEY_OPEN_KEY = 'tgl_journey_open';

export function readJourneyOpen(): JourneyOpen {
  try { return localStorage.getItem(JOURNEY_OPEN_KEY) === 'record' ? 'record' : 'magazine'; } catch { return 'magazine'; }
}

/** Applies on this device and, with `save`, on the account */
export function applyJourneyOpen(v: JourneyOpen, save = true) {
  try { localStorage.setItem(JOURNEY_OPEN_KEY, v); } catch { /* cache only */ }
  if (save) saveUserPref({ journeyOpen: v });
}

// Writes wait until this account's prefs have been read, so the cache never overwrites the cloud
let loadedFor: string | null = null;

export async function loadUserPrefs(uid: string): Promise<UserPrefs> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'prefs'));
    return (snap.exists() ? snap.data() : {}) as UserPrefs;
  } catch {
    return {};
  } finally {
    loadedFor = uid;
  }
}

export function saveUserPref(patch: UserPrefs) {
  const uid = auth.currentUser?.uid;
  if (!uid || loadedFor !== uid) return;
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

/** Ask the device where it is. Only call from a user action, or when permission is already granted. */
export function locateMe(): Promise<CityWeatherConfig> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        name: '현재 위치',
        nameEn: CURRENT_LOCATION_EN,
        country: '',
        lat: Math.round(pos.coords.latitude * 100) / 100,
        lng: Math.round(pos.coords.longitude * 100) / 100,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
      err => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** True when the browser already allows location, so it can be resolved without a prompt */
export async function locationGranted(): Promise<boolean> {
  try {
    const st = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return st?.state === 'granted';
  } catch {
    return false;
  }
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
