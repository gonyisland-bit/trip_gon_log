import { useCallback, useEffect, useState } from 'react';
import type { CityWeatherConfig } from '../types';
import { cachedCurrentLocation, locateMe, locationGranted } from './userPrefs';
import { notify } from './feedback';

// The member's current location (v1.3.8) for the home weather and world-time cubes. It is known from the last time it
// was found on this device (the same copy the header weather uses); when the browser already allows location it is
// refreshed quietly, and otherwise it is asked for only when the member taps it.

const KEY = 'cached_current_location';
const EVENT = 'currentPlaceChanged';
let refreshed = false;

function remember(place: CityWeatherConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(place)); } catch { /* the page keeps it for now */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useCurrentPlace() {
  const [place, setPlace] = useState<CityWeatherConfig | null>(cachedCurrentLocation);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setPlace(cachedCurrentLocation());
    window.addEventListener(EVENT, on);
    if (!refreshed) {
      refreshed = true;
      locationGranted().then(ok => { if (ok) locateMe().then(remember).catch(() => {}); });
    }
    return () => window.removeEventListener(EVENT, on);
  }, []);

  /** Asks the device where it is (from a tap); resolves with the place, or null when it could not be found */
  const locate = useCallback(async (): Promise<CityWeatherConfig | null> => {
    setBusy(true);
    try {
      const found = await locateMe();
      remember(found);
      return found;
    } catch (err) {
      const denied = !!err && typeof err === 'object' && 'code' in err && (err as GeolocationPositionError).code === 1;
      notify(denied ? '위치 권한이 꺼져 있어 현재 위치를 찾을 수 없어요. 브라우저 설정에서 위치를 허용해 주세요.' : '현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { place, busy, locate };
}
