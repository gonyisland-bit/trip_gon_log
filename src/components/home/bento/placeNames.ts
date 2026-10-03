import { findCityByNameOrAlias, findCountryByNameOrAlias } from '../../../data/worldDestinations';

// One city, one country (v1.3.8). A journey's places are typed freely ("제주", "제주 로컬 카페거리", "Jeju, Korea") and
// a country may be written as 한국, 대한민국 or KR. The home counts need each to be told once, so a name is matched to the
// app's own city list by its beginning (a street or a market after the city name does not make a new city), and a
// country is matched to the country list by code, name or alias.

export interface PlaceRef {
  /** Same key = same city */
  cityKey: string;
  city: string;
  /** Empty when the country could not be told */
  countryKey: string;
  country: string;
  /** The city is in the app's list (otherwise it is the first word of what was typed) */
  known: boolean;
  /** What was typed names a country, not a city: it counts for the country only */
  countryOnly?: boolean;
}

const cache = new Map<string, PlaceRef | null>();

export function normalizeCountry(raw?: string): { key: string; label: string } | null {
  const t = (raw || '').trim();
  if (!t) return null;
  const found = findCountryByNameOrAlias(t);
  if (found) return { key: `k:${found.code.toLowerCase()}`, label: found.nameKo };
  return { key: `r:${t.toLowerCase()}`, label: t };
}

/** The city a free-typed place name belongs to; `countryHint` is whatever the journey says its country is */
export function canonicalPlace(rawName: string, countryHint?: string): PlaceRef | null {
  const name = (rawName || '').split(',')[0].trim();
  if (!name) return null;
  const cacheKey = `${name}|${countryHint || ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  let ref: PlaceRef | null = null;
  const city = findCityByNameOrAlias(name);
  if (city) {
    const c = normalizeCountry(city.countryEn) ?? normalizeCountry(city.countryKo);
    ref = { cityKey: `c:${city.nameEn.toLowerCase()}`, city: city.nameKo, countryKey: c?.key ?? '', country: c?.label ?? city.countryKo, known: true };
  } else {
    const asCountry = findCountryByNameOrAlias(name);
    const lower = name.toLowerCase();
    if (asCountry && [asCountry.code, asCountry.nameEn, asCountry.nameKo].some(n => n.toLowerCase() === lower)) {
      ref = { cityKey: `k:${asCountry.code.toLowerCase()}`, city: '', countryKey: `k:${asCountry.code.toLowerCase()}`, country: asCountry.nameKo, known: false, countryOnly: true };
    } else {
      const first = name.split(/\s+/)[0];
      const c = normalizeCountry(countryHint);
      ref = { cityKey: `n:${first.toLowerCase()}`, city: first, countryKey: c?.key ?? '', country: c?.label ?? '', known: false };
    }
  }
  cache.set(cacheKey, ref);
  return ref;
}

/**
 * Places of something that has a list of places and a country (a journey), without repeats. A free-text place line
 * such as "Osaka, Japan" is a city followed by its country, not two cities.
 */
export function placesOf(input: { locations?: { name: string; country?: string }[]; locationStr?: string; country?: string }): PlaceRef[] {
  const out: PlaceRef[] = [];
  const seen = new Set<string>();
  const add = (p: PlaceRef | null) => { if (p && !seen.has(p.cityKey)) { seen.add(p.cityKey); out.push(p); } };
  if (input.locations?.length) {
    input.locations.forEach(l => add(canonicalPlace(l.name, l.country || input.country)));
  } else {
    const parts = (input.locationStr || '').split(',').map(s => s.trim()).filter(Boolean);
    // "city, country" or a list of cities: a last part that is only a country (and not a city) is the country
    let hint = input.country;
    let cities = parts;
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      if (!findCityByNameOrAlias(last) && findCountryByNameOrAlias(last)) { hint = hint || last; cities = parts.slice(0, -1); }
    }
    cities.forEach(c => add(canonicalPlace(c, hint)));
  }
  return out;
}

/**
 * The city a saved spot belongs to. Spots often carry only a district ("중랑구"), so the address is read as well: its first
 * word that is a city of the app's list ("서울특별시 중랑구 …") decides, which turns many districts into one city.
 */
export function spotCity(spot: { city?: string; address?: string; country?: string }): { key: string; label: string } | null {
  const named = spot.city ? canonicalPlace(spot.city, spot.country) : null;
  if (named?.known) return { key: named.cityKey, label: named.city };
  for (const word of (spot.address || '').split(/[\s,]+/)) {
    if (word.length < 2) continue;
    const fromAddress = canonicalPlace(word, spot.country);
    if (fromAddress?.known) return { key: fromAddress.cityKey, label: fromAddress.city };
  }
  return named && !named.countryOnly ? { key: named.cityKey, label: named.city } : null;
}
