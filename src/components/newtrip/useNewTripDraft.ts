import { useEffect, useMemo, useState } from 'react';
import {
  DestinationCity, DestinationCountry, WORLD_CITIES, findCityByNameOrAlias, findCountryByNameOrAlias,
} from '../../data/worldDestinations';
import { CuratedTripProposal, generateCuratedTripProposals } from '../../utils/tripRecommender';
import { getSavedPockets } from '../../utils/pocketStorage';
import { SpotPocketItem } from '../../types';
import { SavedNewTripDraft, saveNewTripDraft } from './newTripDraftStore';

// State for the new trip sheet (v1.3.5 P3): where → when → who → preview.
// Proposals come from the same engine as the map's Trip Guide; this hook only collects the answers.

export type NewTripStep = 0 | 1 | 2 | 3;

export interface NewTripPrefill {
  /** Re-planning a kept ticket: issuing replaces that ticket */
  replaceTicketId?: string;
  country?: string;
  city?: string;
  /** Several stops picked on the map (the first is `city`) */
  cities?: string[];
  /** YYYY-MM-DD */
  date?: string;
  /** Pocket spots picked in Pocket, placed on day 1 */
  pocketIds?: string[];
}

export type StayLength = 'short' | 'mid' | 'long';
/** Nights the engine plans for each stay length */
export const STAY_NIGHTS: Record<StayLength, number> = { short: 3, mid: 4, long: 6 };

export const THEMES = [
  { id: 'all', label: '추천' },
  { id: 'food', label: '미식' },
  { id: 'shopping', label: '쇼핑' },
  { id: 'nature', label: '자연' },
  { id: 'activity', label: '액티비티' },
  { id: 'art', label: '예술' },
] as const;

export interface NewTripCreatePayload {
  title: string;
  dateRange: string;
  location: string;
  tags: string[];
  lat?: number;
  lng?: number;
  members: string[];
  locations: { name: string; lat?: number; lng?: number; country?: string }[];
  country: string;
  coverImg?: string;
  timeline: { date: string; items: any[] }[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dotted = (s: string) => s.replace(/-/g, '.');

/** Second Friday of a month, the engine's default departure */
function secondFriday(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 7);
  return iso(d);
}

/** Next 12 months starting with this one */
export function upcomingMonths(): { year: number; month: number }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}

/** Spreads `total` nights over `n` stops, at least one each; earlier stops get the remainder */
function splitNights(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => base + (i < total % n ? 1 : 0));
}

/** One proposal across several cities: each city's plan in turn, the travel day shared */
function combineProposals(parts: CuratedTripProposal[], cities: DestinationCity[]): CuratedTripProposal {
  const first = parts[0];
  let start = first.startDate;
  const byDate = new Map<string, CuratedTripProposal['timeline'][number]['items']>();
  parts.forEach(part => {
    const offset = daysBetween(part.startDate, start);
    part.timeline.forEach(day => {
      const date = shiftDays(day.date, offset);
      byDate.set(date, [...(byDate.get(date) || []), ...day.items]);
    });
    start = shiftDays(start, part.durationDays);
  });
  const nights = parts.reduce((n, p) => n + p.durationDays, 0);
  const seen = new Set<string>();
  return {
    ...first,
    id: `multi-${parts.map(p => p.id).join('+')}`,
    // "교토 골목 미식 여정" → "교토 · 오사카 골목 미식 여정"
    title: first.title.includes(cities[0].nameKo)
      ? first.title.replace(cities[0].nameKo, cities.map(c => c.nameKo).join(' · '))
      : `${cities.map(c => c.nameKo).join(' · ')} 여정`,
    cityName: cities.map(c => c.nameEn).join(', '),
    endDate: shiftDays(first.startDate, nights),
    durationDays: nights,
    nightsDays: `${nights}박 ${nights + 1}일`,
    locations: parts.flatMap(p => p.locations).filter(l => {
      if (seen.has(l.name)) return false;
      seen.add(l.name);
      return true;
    }),
    timeline: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items })),
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

function pocketItem(p: SpotPocketItem, idx: number, date: string) {
  const slots = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '09:00 PM'];
  const rawTitle = (p.title || '').trim();
  const address = (p.address || '').trim();
  const food = p.category === 'food' || p.category === 'cafe';
  return {
    id: Date.now() + 5000 + idx,
    time: slots[idx % slots.length],
    place: rawTitle,
    title: rawTitle,
    location: address || [p.city, p.country].filter(Boolean).join(' · ') || rawTitle,
    lat: typeof p.lat === 'number' ? p.lat : undefined,
    lng: typeof p.lng === 'number' ? p.lng : undefined,
    memo: p.memo ? p.memo.trim() : (address ? `주소: ${address}` : '보관된 포켓 장소'),
    category: food ? '식사' : p.category === 'shopping' ? '쇼핑' : '관광',
    type: food ? 'dining' : p.category === 'shopping' ? 'shopping' : 'activity',
    cost: '-',
    img: p.thumbnailUrl || '',
    link: p.sourceUrl || '',
    date,
  };
}

/** `accountIds`: this user's id and email name; a restored draft that listed them gets the real name */
export function useNewTripDraft(prefill: NewTripPrefill, defaultMember: string, accountIds: string[] = []) {
  const prefillCities = (prefill.cities?.length ? prefill.cities : prefill.city ? [prefill.city] : [])
    .map(n => findCityByNameOrAlias(n))
    .filter((c): c is DestinationCity => !!c)
    .filter((c, i, arr) => arr.findIndex(x => x.nameEn === c.nameEn) === i);
  const initialCity = prefillCities[0] ?? null;
  const initialCountry = initialCity
    ? findCountryByNameOrAlias(initialCity.countryEn) ?? null
    : prefill.country ? findCountryByNameOrAlias(prefill.country) ?? null : null;

  const [step, setStep] = useState<NewTripStep>(initialCity || initialCountry ? 1 : 0);
  const [city, setCity] = useState<DestinationCity | null>(initialCity);
  const [country, setCountry] = useState<DestinationCountry | null>(initialCountry);
  // Further stops of a multi-city trip, after `city`; picking more than one city needs `multi` on
  const [extraCities, setExtraCities] = useState<DestinationCity[]>(prefillCities.slice(1));
  const [multi, setMultiState] = useState(prefillCities.length > 1);
  const [stay, setStay] = useState<StayLength>('mid');
  const [startDate, setStartDate] = useState<string>(prefill.date || '');
  const [members, setMembers] = useState<string[]>([defaultMember || '나']);
  const [theme, setTheme] = useState<string>('all');
  const [seed, setSeed] = useState(0);
  const [proposalId, setProposalId] = useState<string | null>(null);

  const allPockets = useMemo(() => getSavedPockets(), []);
  const [pocketIds, setPocketIds] = useState<Set<string>>(() => new Set(prefill.pocketIds || []));
  const [includePockets, setIncludePockets] = useState(true);

  const selectPlace = (c: DestinationCity | null, co: DestinationCountry | null) => {
    setProposalId(null);
    // Multi-city: another city is added as the next stop (tapping a picked one removes it)
    if (multi && c && city) {
      if (c.nameEn === city.nameEn) return;
      setExtraCities(prev => prev.some(x => x.nameEn === c.nameEn) ? prev.filter(x => x.nameEn !== c.nameEn) : [...prev, c]);
      return;
    }
    setCity(c);
    setExtraCities([]);
    setCountry(c ? findCountryByNameOrAlias(c.countryEn) ?? co : co);
  };

  const removeCity = (c: DestinationCity) => {
    setProposalId(null);
    if (city?.nameEn === c.nameEn) {
      const [next, ...rest] = extraCities;
      setCity(next ?? null);
      setExtraCities(rest);
      setCountry(next ? findCountryByNameOrAlias(next.countryEn) ?? null : null);
      return;
    }
    setExtraCities(prev => prev.filter(x => x.nameEn !== c.nameEn));
  };

  // Turning multi-city off keeps only the first stop
  const setMulti = (on: boolean) => {
    setMultiState(on);
    if (!on) setExtraCities([]);
    setProposalId(null);
  };

  const allCities = useMemo(() => (city ? [city, ...extraCities] : []), [city, extraCities]);

  // Pocket spots for the chosen city (or country): prefilled picks plus the rest, all on by default
  const placePockets = useMemo(() => {
    const cityNames = allCities.flatMap(c => [c.nameKo, c.nameEn]).map(s => s.toLowerCase());
    const countryNames = country ? [country.nameKo, country.nameEn].map(s => s.toLowerCase()) : [];
    return allPockets.filter(p => {
      if (pocketIds.has(p.id)) return true;
      const pc = (p.city || '').trim().toLowerCase();
      if (cityNames.length) return !!pc && cityNames.includes(pc);
      const pk = (p.country || '').trim().toLowerCase();
      return !!pk && countryNames.includes(pk);
    });
  }, [allPockets, allCities, country, pocketIds]);

  // Spots that go on day 1: the ones picked in Pocket, or every spot saved for this place
  const pocketsToAdd = useMemo(
    () => (pocketIds.size ? placePockets.filter(p => pocketIds.has(p.id)) : placePockets),
    [placePockets, pocketIds],
  );
  const pocketCityNames = useMemo(
    () => new Set(allPockets.map(p => (p.city || '').trim().toLowerCase()).filter(Boolean)),
    [allPockets],
  );

  // Month chip for the chosen date; the engine's pick when none is set
  const month = startDate ? Number(startDate.slice(5, 7)) : 0;
  const year = startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear();

  const pickMonth = (y: number, m: number) => {
    const now = new Date();
    const thisMonth = y === now.getFullYear() && m === now.getMonth() + 1;
    setStartDate(thisMonth ? shiftDays(iso(now), 7) : secondFriday(y, m));
  };

  // Every stop gets at least one night
  const nights = Math.max(STAY_NIGHTS[stay], allCities.length);
  const endDate = startDate ? shiftDays(startDate, nights) : '';

  const proposals: CuratedTripProposal[] = useMemo(() => {
    if (step !== 3) return [];
    let list: CuratedTripProposal[];
    if (allCities.length > 1) {
      const shares = splitNights(nights, allCities.length);
      const perCity = allCities.map((c, i) => generateCuratedTripProposals({
        theme, country: findCountryByNameOrAlias(c.countryEn) ?? null, city: c, targetYear: year, targetMonth: month,
        durationDays: shares[i], seedOffset: seed,
      }));
      if (perCity.some(l => !l.length)) return [];
      list = [0, 1, 2].map(k => combineProposals(perCity.map(l => l[k % l.length]), allCities));
    } else {
      list = generateCuratedTripProposals({
        theme, country, city, targetYear: year, targetMonth: month, durationDays: nights, seedOffset: seed,
      });
    }
    // Move each plan onto the chosen departure date, keeping its day order
    if (!startDate) return list.slice(0, 3);
    return list.slice(0, 3).map(p => {
      const offset = daysBetween(p.startDate, startDate);
      if (offset === 0) return p;
      return {
        ...p,
        startDate: shiftDays(p.startDate, offset),
        endDate: shiftDays(p.endDate, offset),
        timeline: p.timeline.map(d => ({ ...d, date: shiftDays(d.date, offset) })),
      };
    });
  }, [step, theme, country, city, allCities, year, month, nights, seed, startDate]);

  const selected = proposals.find(p => p.id === proposalId) ?? proposals[0] ?? null;

  const buildPayload = (): NewTripCreatePayload | null => {
    if (!selected) return null;
    let timeline: { date: string; items: any[] }[] = selected.timeline.map((day, dIdx) => ({
      date: dotted(day.date),
      items: day.items.map((item, iIdx) => ({
        id: Date.now() + dIdx * 100 + iIdx,
        time: item.time,
        place: item.title,
        title: item.title,
        location: item.title,
        memo: item.memo,
        category: item.category,
        type: item.type,
        date: dotted(day.date),
      })),
    }));
    const picked = includePockets ? pocketsToAdd : [];
    if (picked.length && timeline.length) {
      const first = timeline[0];
      const pocketItems = picked.map((p, i) => pocketItem(p, i, first.date));
      timeline = [{ ...first, items: [...pocketItems, ...first.items.filter(it => !pocketItems.some(pi => pi.place === it.place))] }, ...timeline.slice(1)];
    }
    return {
      title: selected.title,
      dateRange: `${dotted(selected.startDate)} - ${dotted(selected.endDate)}`,
      location: selected.cityName,
      tags: [selected.countryEn, selected.theme.toUpperCase(), `${selected.durationDays}박${selected.durationDays + 1}일`],
      lat: selected.cityObj.lat,
      lng: selected.cityObj.lng,
      members: members.length ? members : [defaultMember || '나'],
      locations: selected.locations,
      country: selected.countryEn,
      coverImg: selected.coverImg,
      timeline,
    };
  };

  // Keep the draft in the cloud while it has a destination (see newTripDraftStore)
  const pocketKey = [...pocketIds].join(',');
  const memberKey = members.join('|');
  useEffect(() => {
    if (!city && !country) return;
    saveNewTripDraft({
      step, city: city?.nameEn, cities: allCities.map(c => c.nameEn), country: country?.nameEn, stay, startDate, members, theme, includePockets,
      pocketIds: [...pocketIds],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, city, allCities, country, stay, startDate, memberKey, theme, includePockets, pocketKey]);

  const resume = (saved: SavedNewTripDraft) => {
    const c = saved.city ? findCityByNameOrAlias(saved.city) ?? null : null;
    const co = c ? findCountryByNameOrAlias(c.countryEn) ?? null : saved.country ? findCountryByNameOrAlias(saved.country) ?? null : null;
    setCity(c);
    setCountry(co);
    const extra = (saved.cities || []).slice(1).map(n => findCityByNameOrAlias(n)).filter((x): x is DestinationCity => !!x);
    setExtraCities(extra);
    setMultiState(extra.length > 0);
    setStay(saved.stay || 'mid');
    // A departure that has passed is dropped; the month picker suggests a new one
    setStartDate(saved.startDate && saved.startDate >= iso(new Date()) ? saved.startDate : '');
    if (saved.members?.length) setMembers(saved.members.map(m => (defaultMember && accountIds.includes(m) ? defaultMember : m)));
    setTheme(saved.theme || 'all');
    setIncludePockets(saved.includePockets !== false);
    setPocketIds(new Set(saved.pocketIds || []));
    setStep((saved.step ?? 1) as NewTripStep);
  };

  const canNext = step === 0 ? !!(city || country) : step === 3 ? !!selected : true;
  const dirty = !!(city || country) || !!startDate;

  return {
    step, setStep, canNext, dirty,
    city, country, selectPlace, allCities, multi, setMulti, removeCity,
    stay, setStay, nights, startDate, setStartDate, endDate, month, year, pickMonth,
    members, setMembers, theme, setTheme,
    placePockets, pocketCount: pocketsToAdd.length, pocketCityNames, pocketIds, setPocketIds, includePockets, setIncludePockets,
    proposals, selected, setProposalId, shuffle: () => { setSeed(s => s + 1); setProposalId(null); },
    buildPayload, resume,
    cities: WORLD_CITIES,
  };
}

export type NewTripDraft = ReturnType<typeof useNewTripDraft>;
