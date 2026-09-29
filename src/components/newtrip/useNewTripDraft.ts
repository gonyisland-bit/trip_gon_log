import { useMemo, useState } from 'react';
import {
  DestinationCity, DestinationCountry, WORLD_CITIES, findCityByNameOrAlias, findCountryByNameOrAlias,
} from '../../data/worldDestinations';
import { CuratedTripProposal, generateCuratedTripProposals } from '../../utils/tripRecommender';
import { getSavedPockets } from '../../utils/pocketStorage';
import { SpotPocketItem } from '../../types';

// State for the new trip sheet (v1.3.5 P3): where → when → who → preview.
// Proposals come from the same engine as the map's Trip Guide; this hook only collects the answers.

export type NewTripStep = 0 | 1 | 2 | 3;

export interface NewTripPrefill {
  country?: string;
  city?: string;
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

export function useNewTripDraft(prefill: NewTripPrefill, defaultMember: string) {
  const initialCity = prefill.city ? findCityByNameOrAlias(prefill.city) ?? null : null;
  const initialCountry = initialCity
    ? findCountryByNameOrAlias(initialCity.countryEn) ?? null
    : prefill.country ? findCountryByNameOrAlias(prefill.country) ?? null : null;

  const [step, setStep] = useState<NewTripStep>(initialCity || initialCountry ? 1 : 0);
  const [city, setCity] = useState<DestinationCity | null>(initialCity);
  const [country, setCountry] = useState<DestinationCountry | null>(initialCountry);
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
    setCity(c);
    setCountry(c ? findCountryByNameOrAlias(c.countryEn) ?? co : co);
    setProposalId(null);
  };

  // Pocket spots for the chosen city (or country): prefilled picks plus the rest, all on by default
  const placePockets = useMemo(() => {
    const cityNames = city ? [city.nameKo, city.nameEn].map(s => s.toLowerCase()) : [];
    const countryNames = country ? [country.nameKo, country.nameEn].map(s => s.toLowerCase()) : [];
    return allPockets.filter(p => {
      if (pocketIds.has(p.id)) return true;
      const pc = (p.city || '').trim().toLowerCase();
      if (cityNames.length) return !!pc && cityNames.includes(pc);
      const pk = (p.country || '').trim().toLowerCase();
      return !!pk && countryNames.includes(pk);
    });
  }, [allPockets, city, country, pocketIds]);

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

  const nights = STAY_NIGHTS[stay];
  const endDate = startDate ? shiftDays(startDate, nights) : '';

  const proposals: CuratedTripProposal[] = useMemo(() => {
    if (step !== 3) return [];
    const list = generateCuratedTripProposals({
      theme, country, city, targetYear: year, targetMonth: month, durationDays: nights, seedOffset: seed,
    });
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
  }, [step, theme, country, city, year, month, nights, seed, startDate]);

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

  const canNext = step === 0 ? !!(city || country) : step === 3 ? !!selected : true;
  const dirty = !!(city || country) || !!startDate;

  return {
    step, setStep, canNext, dirty,
    city, country, selectPlace,
    stay, setStay, nights, startDate, setStartDate, endDate, month, year, pickMonth,
    members, setMembers, theme, setTheme,
    placePockets, pocketCount: pocketsToAdd.length, pocketCityNames, pocketIds, setPocketIds, includePockets, setIncludePockets,
    proposals, selected, setProposalId, shuffle: () => { setSeed(s => s + 1); setProposalId(null); },
    buildPayload,
    cities: WORLD_CITIES,
  };
}

export type NewTripDraft = ReturnType<typeof useNewTripDraft>;
