// Where the device is, in one place (2026.10.03). The store app asks the OS through the Capacitor Geolocation plugin, so
// one "allow" stays allowed; the web asks the browser, which remembers the site. Nothing here shows a permission prompt
// on its own: a screen that opens (a journey, the map, the home) reads the place only when location is already allowed
// and the member has not switched it off, and the prompt comes only from a tap (`ask`).
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface Position { lat: number; lng: number; accuracy?: number }

const OK_KEY = 'tgl_location_ok';
const OFF_KEY = 'tgl_location_off';
export const LOCATION_EVENT = 'locationPrefChanged';

const native = () => Capacitor.isNativePlatform();

/** The member switched current location off on this account (Settings); then no screen reads it on its own */
export function locationSwitchedOff(): boolean {
  try { return localStorage.getItem(OFF_KEY) === '1'; } catch { return false; }
}

export function setLocationSwitchedOff(off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1'); else localStorage.removeItem(OFF_KEY);
  } catch { /* cache only */ }
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

function rememberAllowed(ok: boolean) {
  try { if (ok) localStorage.setItem(OK_KEY, '1'); else localStorage.removeItem(OK_KEY); } catch { /* cache only */ }
}

/** What the OS or browser says about location for this app or site */
export async function locationPermission(): Promise<LocationPermission> {
  if (native()) {
    try {
      const st = await Geolocation.checkPermissions();
      const s = st.location === 'granted' || st.coarseLocation === 'granted' ? 'granted' : st.location === 'denied' ? 'denied' : 'prompt';
      return s;
    } catch {
      return 'unsupported';
    }
  }
  if (!('geolocation' in navigator)) return 'unsupported';
  try {
    const st = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (st?.state === 'granted' || st?.state === 'denied') return st.state;
    // Safari forgets a site's "allow" after a while and reports `prompt` again; a member who allowed it here before is
    // treated as allowed, so their screens keep their place (the browser may ask once more, as it decides)
    return localStorage.getItem(OK_KEY) === '1' ? 'granted' : 'prompt';
  } catch {
    return localStorage.getItem(OK_KEY) === '1' ? 'granted' : 'prompt';
  }
}

/** Location can be read without the member tapping anything: allowed, and not switched off */
export async function canReadLocationQuietly(): Promise<boolean> {
  if (locationSwitchedOff()) return false;
  return (await locationPermission()) === 'granted';
}

/**
 * The device's position. `ask` (from a tap) may show the permission prompt; without it the call is refused unless
 * location is already allowed, so opening a screen never prompts.
 */
export async function getPosition({ ask = false, precise = false, maxAgeMs = 10 * 60 * 1000 }: { ask?: boolean; precise?: boolean; maxAgeMs?: number } = {}): Promise<Position> {
  if (!ask && !(await canReadLocationQuietly())) throw Object.assign(new Error('not-allowed'), { code: 1 });
  if (ask && locationSwitchedOff()) setLocationSwitchedOff(false);
  if (native()) {
    try {
      if (ask) {
        const st = await Geolocation.checkPermissions();
        if (st.location !== 'granted' && st.coarseLocation !== 'granted') {
          const asked = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
          if (asked.location !== 'granted' && asked.coarseLocation !== 'granted') throw Object.assign(new Error('denied'), { code: 1 });
        }
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: precise, timeout: 10000, maximumAge: maxAgeMs });
      rememberAllowed(true);
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch (err) {
      const msg = String((err as Error)?.message || '');
      if ((err as { code?: number })?.code === 1 || /denied|permission/i.test(msg)) throw Object.assign(new Error('denied'), { code: 1 });
      throw err;
    }
  }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(Object.assign(new Error('unsupported'), { code: 2 })); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { rememberAllowed(true); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
      err => { if (err.code === 1) rememberAllowed(false); reject(err); },
      { enableHighAccuracy: precise, timeout: 10000, maximumAge: maxAgeMs },
    );
  });
}

/** A line for the member when location could not be found */
export function locationProblem(err: unknown): string {
  const denied = !!err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 1;
  if (!denied) return '현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요.';
  return native()
    ? '위치 권한이 꺼져 있어요. 휴대폰 설정 → Tripgon log → 위치에서 허용해 주세요.'
    : '위치 권한이 꺼져 있어요. 브라우저 주소창의 사이트 설정에서 위치를 허용해 주세요.';
}
