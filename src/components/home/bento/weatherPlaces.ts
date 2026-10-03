import type { CityWeatherConfig } from '../../../types';
import { useCurrentPlace } from '../../../utils/currentPlace';
import { setHomeWidgets, useHomeWidgets } from '../../../utils/homeWidgetPrefs';
import { canonicalCityEn, cityKey, useMyCities } from '../../../utils/myCities';
import { CURRENT_LOCATION_EN } from '../../../utils/userPrefs';

/**
 * The places the home weather cube and its sheet choose from: the member's cities (Settings → 도시, the list the world
 * clock shows too) and the device's current place. The choice is saved with the home tiles (homeWidgets.wxCity), so the
 * cube and the sheet show the same place and it is still there the next time, on any device.
 */
export function useWeatherPlaces() {
  const { cities } = useMyCities();
  const { place, busy, locate } = useCurrentPlace();
  const picked = useHomeWidgets().wxCity;
  const here = picked === CURRENT_LOCATION_EN;
  const cur: CityWeatherConfig | undefined = (here ? place : cities.find(c => !!picked && cityKey(c.nameEn) === canonicalCityEn(picked))) ?? cities[0] ?? place ?? undefined;
  const isHere = !!cur && cur.nameEn === CURRENT_LOCATION_EN;
  const choose = (nameEn: string) => setHomeWidgets({ wxCity: nameEn });
  /** The current place: chosen at once when it is known, otherwise asked for first */
  const chooseHere = async () => {
    if (place) { choose(CURRENT_LOCATION_EN); return; }
    const found = await locate();
    if (found) choose(CURRENT_LOCATION_EN);
  };
  return { cities, place, busy, cur, isHere, choose, chooseHere };
}
