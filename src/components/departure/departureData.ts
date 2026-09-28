import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { WORLD_CITIES, DestinationCity } from '../../data/worldDestinations';

// Departure Board data (v1.3): candidate destinations, flight estimates from
// Seoul, and the kept-ticket collection (Firestore, per user; localStorage is a
// render cache only).

export type StayFilter = 'short' | 'mid' | 'long';       // 2–3 / 4–5 / 6+ nights
export type FlightFilter = '3' | '6' | '10+' | 'any';      // up to 3h / up to 6h / 10h and more / anywhere

export interface DepartureFilters {
  stay: StayFilter;
  flight: FlightFilter;
  year: number;
  month: number;                                             // 1–12
}

export const FLIGHT_OPTIONS: { value: FlightFilter; label: string }[] = [
  { value: '3', label: '3H' },
  { value: '6', label: '6H' },
  { value: '10+', label: '10H+' },
  { value: 'any', label: 'ANY' },
];

function fitsFlight(hours: number, f: FlightFilter): boolean {
  if (f === '3') return hours <= 3;
  if (f === '6') return hours <= 6;
  if (f === '10+') return hours >= 10;
  return true;
}

// Next month by default (this month once it is past the 20th is too close to plan)
export function defaultFilters(): DepartureFilters {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return { stay: 'mid', flight: '6', year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Months that can still be picked for a year: this year only from the current month on
export function selectableMonths(year: number): number[] {
  const now = new Date();
  const from = year === now.getFullYear() ? now.getMonth() + 1 : 1;
  return Array.from({ length: 12 - from + 1 }, (_, i) => from + i);
}

export interface DepartureTicket {
  id: string;
  cityEn: string;
  cityKo: string;
  countryEn: string;
  countryKo: string;
  year: number;
  month: number;       // 1–12
  flightNo: string;
  gate: string;
  hours: number;
  daily?: boolean;     // the once-a-day ticket
  keptAt: number;
}

const ICN = { lat: 37.46, lng: 126.44 };

export function flightHours(city: DestinationCity): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(city.lat - ICN.lat);
  const dLng = toRad(city.lng - ICN.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(ICN.lat)) * Math.cos(toRad(city.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(a));
  return Math.round((km / 790 + 0.6) * 4) / 4;
}

export function formatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}H ${String(mm).padStart(2, '0')}M`;
}

export function targetMonth(filters: DepartureFilters): { year: number; month: number } {
  return { year: filters.year, month: filters.month };
}

// Stable pseudo-random numbers from a string (flight numbers, gates, the daily pick)
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function flightNumber(city: DestinationCity): string {
  return `TG ${String(100 + (hashString(city.nameEn) % 900))}`;
}

export function gateFor(city: DestinationCity): string {
  const h = hashString(city.nameEn + 'gate');
  return `${'ABCDEF'[h % 6]}${String(1 + (h % 42)).padStart(2, '0')}`;
}

// Destinations that fit the filters, best-season cities first
export function candidates(filters: DepartureFilters): DestinationCity[] {
  const { month } = targetMonth(filters);
  const pool = WORLD_CITIES.filter(c =>
    c.countryEn !== 'SOUTH KOREA' &&
    // Some cities have no coordinates yet (0, 0); they cannot be placed or timed
    Number.isFinite(c.lat) && Number.isFinite(c.lng) && (Math.abs(c.lat) > 0.1 || Math.abs(c.lng) > 0.1) &&
    fitsFlight(flightHours(c), filters.flight) &&
    // A short stay keeps the flight short; a long stay goes a little further
    (filters.stay !== 'short' || filters.flight === '10+' || flightHours(c) <= 5) &&
    (filters.stay !== 'long' || flightHours(c) >= 3 || filters.flight === '3') &&
    !c.avoidMonths?.some(a => a.months.includes(month))
  );
  const best = pool.filter(c => c.bestMonths?.includes(month));
  return best.length >= 3 ? best : pool;
}

export function isBestSeason(city: DestinationCity, month: number): boolean {
  return !!city.bestMonths?.includes(month);
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The daily ticket: the same city all day for a given user
export function dailyPick(filters: DepartureFilters): DestinationCity | null {
  const pool = candidates(filters);
  if (!pool.length) return null;
  const seed = `${todayKey()}:${auth.currentUser?.uid || 'guest'}`;
  return pool[hashString(seed) % pool.length];
}

export function makeTicket(city: DestinationCity, filters: DepartureFilters, daily = false): DepartureTicket {
  const { year, month } = targetMonth(filters);
  return {
    id: `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    cityEn: city.nameEn,
    cityKo: city.nameKo,
    countryEn: city.countryEn,
    countryKo: city.countryKo,
    year,
    month,
    flightNo: flightNumber(city),
    gate: gateFor(city),
    hours: flightHours(city),
    daily,
    keptAt: Date.now(),
  };
}

// ── Ticket collection: Firestore users/{uid}/departure/tickets ──
const CACHE_KEY = 'tgl_departure_tickets';

interface TicketStore {
  items: DepartureTicket[];
  lastDaily?: string;
}

export function readCachedTickets(): TicketStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { items: [] };
}

function ticketDoc() {
  const uid = auth.currentUser?.uid;
  return uid ? doc(db, 'users', uid, 'departure', 'tickets') : null;
}

export async function loadTickets(): Promise<TicketStore> {
  const ref = ticketDoc();
  if (!ref) return readCachedTickets();
  try {
    const snap = await getDoc(ref);
    const data = (snap.exists() ? snap.data() : { items: [] }) as TicketStore;
    const store = { items: Array.isArray(data.items) ? data.items : [], lastDaily: data.lastDaily };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch {}
    return store;
  } catch {
    return readCachedTickets();
  }
}

export async function saveTickets(store: TicketStore): Promise<void> {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch {}
  const ref = ticketDoc();
  if (!ref) return;
  await setDoc(ref, { items: store.items, lastDaily: store.lastDaily ?? null, updatedAt: Date.now() });
}
