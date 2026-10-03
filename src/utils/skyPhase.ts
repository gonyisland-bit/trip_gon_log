// The time of day outside at a place (v1.3.8): night, dawn, day or dusk by the sun's height there.
// The terminal's lobby window paints its sky with it; the home tints its top with it.
import { getSolarAltitude } from './solarTerminator';

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';

export function skyPhase(lat: number | undefined, lng: number | undefined, now: Date = new Date()): SkyPhase {
  if (lat === undefined || lng === undefined) {
    const h = now.getHours();
    return h < 5 || h >= 20 ? 'night' : h < 7 ? 'dawn' : h >= 18 ? 'dusk' : 'day';
  }
  const alt = getSolarAltitude(lat, lng, now);
  if (alt < -7) return 'night';
  if (alt > 7) return 'day';
  // Low sun: rising or setting, by where it will be in ten minutes
  return getSolarAltitude(lat, lng, new Date(now.getTime() + 600000)) > alt ? 'dawn' : 'dusk';
}
