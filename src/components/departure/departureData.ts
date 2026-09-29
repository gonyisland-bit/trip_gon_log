import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { DestinationCity, findCityByNameOrAlias } from '../../data/worldDestinations';
import { cleanForFirestore } from '../../app/appUtils';
import type { NewTripCreatePayload } from '../newtrip/useNewTripDraft';

// Airport terminal data: tickets issued from the New trip sheet, flight estimates from Seoul,
// and the ticket collection (Firestore users/{uid}/departure/tickets; localStorage is a render cache only).

export interface DepartureTicket {
  id: string;
  /** First destination; `cities` lists every stop of a multi-city trip */
  cityEn: string;
  cityKo: string;
  countryEn: string;
  countryKo: string;
  cities?: { en: string; ko: string }[];
  year: number;
  month: number;       // 1–12
  /** YYYY-MM-DD; missing on tickets kept before v1.3.5 (destination and month only) */
  startDate?: string;
  endDate?: string;
  nights?: number;
  members?: string[];
  flightNo: string;
  gate: string;
  hours: number;
  /** The planned journey, created as-is on boarding */
  plan?: NewTripCreatePayload;
  keptAt: number;
}

const ICN = { lat: 37.46, lng: 126.44 };

export function flightHours(city: { lat: number; lng: number }): number {
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

// Stable pseudo-random numbers from a string (flight numbers, gates)
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function flightNumber(cityEn: string): string {
  return `TG ${String(100 + (hashString(cityEn) % 900))}`;
}

export function gateFor(cityEn: string): string {
  const h = hashString(cityEn + 'gate');
  return `${'ABCDEF'[h % 6]}${String(1 + (h % 42)).padStart(2, '0')}`;
}

/** Days from today to a YYYY-MM-DD date (negative once it has passed) */
export function daysUntil(isoDate: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((new Date(`${isoDate}T00:00:00`).getTime() - today) / 86400000);
}

/** A ticket for a planned trip, issued from the New trip sheet */
export function issueTicket(opts: {
  cities: DestinationCity[];
  startDate: string;
  endDate: string;
  nights: number;
  members: string[];
  plan: NewTripCreatePayload;
}): DepartureTicket {
  const first = opts.cities[0];
  const [y, m] = opts.startDate.split('-').map(Number);
  return {
    id: `tk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    cityEn: first.nameEn,
    cityKo: first.nameKo,
    countryEn: first.countryEn,
    countryKo: first.countryKo,
    cities: opts.cities.map(c => ({ en: c.nameEn, ko: c.nameKo })),
    year: y,
    month: m,
    startDate: opts.startDate,
    endDate: opts.endDate,
    nights: opts.nights,
    members: opts.members,
    flightNo: flightNumber(first.nameEn),
    gate: gateFor(first.nameEn),
    hours: flightHours(first),
    plan: opts.plan,
    keptAt: Date.now(),
  };
}

export function ticketCity(t: DepartureTicket): DestinationCity | undefined {
  return findCityByNameOrAlias(t.cityEn) ?? findCityByNameOrAlias(t.cityKo);
}

// ── Ticket collection: Firestore users/{uid}/departure/tickets ──
const CACHE_KEY = 'tgl_departure_tickets';

export interface TicketStore {
  items: DepartureTicket[];
}

export function readCachedTickets(): TicketStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { items: Array.isArray(data.items) ? data.items : [] };
    }
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
    const store = { items: Array.isArray(data.items) ? data.items : [] };
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
  await setDoc(ref, { items: cleanForFirestore(store.items), updatedAt: Date.now() });
}

/** Adds a ticket at the front, or replaces the one with `replaceId` (a ticket being re-planned) */
export async function putTicket(ticket: DepartureTicket, replaceId?: string): Promise<void> {
  const store = await loadTickets();
  const rest = store.items.filter(t => t.id !== replaceId && t.id !== ticket.id);
  await saveTickets({ items: [ticket, ...rest] });
}

export async function removeTicket(id: string): Promise<TicketStore> {
  const store = await loadTickets();
  const next = { items: store.items.filter(t => t.id !== id) };
  await saveTickets(next);
  return next;
}
