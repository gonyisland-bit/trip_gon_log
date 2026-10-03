// The place map's choices (v1.3.8): its tiles (normal or simple) and the quick spot kinds left on.
// Saved per account (users/{uid}/settings/prefs.placeMap); localStorage is only the instant cache.
import { saveUserPref } from './userPrefs';
import { isQuickSpotKind, MAX_ACTIVE_KINDS, type QuickSpotKind } from './quickSpots';

export type PlaceMapStyle = 'normal' | 'simple';
export interface PlaceMapPrefs { style?: PlaceMapStyle; spots?: QuickSpotKind[] }

const KEY = 'tgl_place_map';

export function normalizePlaceMapPrefs(v: unknown): PlaceMapPrefs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    style: o.style === 'simple' ? 'simple' : 'normal',
    spots: Array.isArray(o.spots) ? o.spots.filter(isQuickSpotKind).slice(0, MAX_ACTIVE_KINDS) : [],
  };
}

export function readPlaceMapPrefs(): PlaceMapPrefs {
  try { return normalizePlaceMapPrefs(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return normalizePlaceMapPrefs({}); }
}

/** Mirrors the account's copy into this device's cache (on sign-in) */
export function cachePlaceMapPrefs(prefs: unknown) {
  try { localStorage.setItem(KEY, JSON.stringify(normalizePlaceMapPrefs(prefs))); } catch { /* cache only */ }
}

export function savePlaceMapPrefs(patch: PlaceMapPrefs) {
  const next = { ...readPlaceMapPrefs(), ...patch };
  cachePlaceMapPrefs(next);
  saveUserPref({ placeMap: next });
}
