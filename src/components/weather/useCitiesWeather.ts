import { useCallback, useState } from 'react';
import type { CityWeatherConfig } from '../../types';
import { fetchCityWeather, type CityWeatherData } from '../../utils/weatherApi';

// Weather now for a list of places (the header pill's list, the terminal's window picker).
// `prefetch` is called on hover or open; fetchCityWeather keeps its own day cache, so rows
// usually fill before the list has finished opening.

export function useCitiesWeather(cities: CityWeatherConfig[]) {
  const [now, setNow] = useState<Record<string, CityWeatherData>>({});
  const prefetch = useCallback((extra?: CityWeatherConfig | null) => {
    const list = extra ? [extra, ...cities] : cities;
    list.forEach(c => {
      fetchCityWeather(c.lat, c.lng, c.timezone, c.nameEn, c.country)
        .then(d => setNow(prev => (prev[c.nameEn] === d ? prev : { ...prev, [c.nameEn]: d })))
        .catch(() => {});
    });
  }, [cities]);
  return { now, prefetch };
}
