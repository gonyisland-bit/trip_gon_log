import { useEffect, useState } from 'react';
import { skyPhase } from '../../../utils/skyPhase';
import { readMainCity } from '../../../utils/myCities';

// The home's top takes on the hour outside at the member's weather city (v1.3.8 (4)): a faint glow behind the first
// row of cubes, apricot at dawn, pale blue by day, coral at dusk, navy at night. The page stays paper; only this glow
// changes, so it reads as light rather than colour. Checked every five minutes.

export function HomeSky() {
  const [phase, setPhase] = useState(() => { const c = readMainCity(); return skyPhase(c.lat, c.lng); });
  useEffect(() => {
    let city: { lat?: number; lng?: number } = readMainCity();
    const update = () => setPhase(skyPhase(city.lat, city.lng));
    const onCity = (e: Event) => { const c = (e as CustomEvent).detail; if (c) { city = c; update(); } };
    const id = window.setInterval(update, 5 * 60 * 1000);
    window.addEventListener('selectedWeatherCityChanged', onCity);
    return () => { window.clearInterval(id); window.removeEventListener('selectedWeatherCityChanged', onCity); };
  }, []);
  return <div className="tgl-home-sky" data-phase={phase} aria-hidden />;
}
