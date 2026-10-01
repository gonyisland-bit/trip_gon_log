import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
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
// Every device reads the same cloud document once sign-in is known, and follows it live.
// The per-account localStorage copy only paints the first frame. A device that could not
// read the cloud copy never writes, so a stale cache cannot overwrite another device's tickets.
const LEGACY_CACHE_KEY = 'tgl_departure_tickets';
const cacheKey = (uid?: string | null) => `${LEGACY_CACHE_KEY}:${uid || 'guest'}`;
const ticketsRef = (uid: string) => doc(db, 'users', uid, 'departure', 'tickets');

export interface TicketStore {
  items: DepartureTicket[];
  /** The one ticket at the counter; the rest are kept in storage. Without it the newest ticket is at the counter. */
  activeId?: string;
}

/** The ticket at the counter: the chosen one, else the newest */
export function activeTicketOf(store: TicketStore): DepartureTicket | null {
  return store.items.find(t => t.id === store.activeId) ?? store.items[0] ?? null;
}

const idOf = (data: { activeId?: unknown }) => (typeof data.activeId === 'string' && data.activeId ? data.activeId : undefined);

function parseStore(raw: string | null): TicketStore | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return { items: Array.isArray(data.items) ? data.items : [], activeId: idOf(data) };
  } catch {
    return null;
  }
}

export function readCachedTickets(): TicketStore {
  try {
    return parseStore(localStorage.getItem(cacheKey(auth.currentUser?.uid))) ?? { items: [] };
  } catch {
    return { items: [] };
  }
}

function writeCache(uid: string, store: TicketStore) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(store)); } catch {}
}

/** Resolves once Firebase knows whether someone is signed in */
function signedInUser() {
  return auth.authStateReady().then(() => auth.currentUser);
}

/** Tickets kept only on this device (the old shared cache), merged into the cloud once */
async function mergeLegacyCache(uid: string, cloud: TicketStore): Promise<TicketStore> {
  let legacy: TicketStore | null = null;
  try { legacy = parseStore(localStorage.getItem(LEGACY_CACHE_KEY)); } catch {}
  if (!legacy) return cloud;
  const known = new Set(cloud.items.map(t => t.id));
  const extra = legacy.items.filter(t => t && t.id && !known.has(t.id));
  if (extra.length) {
    const merged: TicketStore = { items: [...cloud.items, ...extra].sort((a, b) => (b.keptAt || 0) - (a.keptAt || 0)), activeId: cloud.activeId };
    await setDoc(ticketsRef(uid), { items: cleanForFirestore(merged.items), ...(merged.activeId ? { activeId: merged.activeId } : {}), updatedAt: Date.now() });
    cloud = merged;
  }
  try { localStorage.removeItem(LEGACY_CACHE_KEY); } catch {}
  return cloud;
}

/** The cloud copy; throws when it cannot be read, so nothing is saved over it blindly */
async function readCloud(uid: string): Promise<TicketStore> {
  const snap = await getDoc(ticketsRef(uid));
  const data = (snap.exists() ? snap.data() : { items: [] }) as TicketStore;
  const store = await mergeLegacyCache(uid, { items: Array.isArray(data.items) ? data.items : [], activeId: idOf(data) });
  writeCache(uid, store);
  return store;
}

export async function loadTickets(): Promise<TicketStore> {
  const user = await signedInUser();
  if (!user) return { items: [] };
  try {
    return await readCloud(user.uid);
  } catch {
    return readCachedTickets();
  }
}

/** Follows the tickets live, so every device shows the same list; returns the unsubscribe */
export function subscribeTickets(onChange: (store: TicketStore) => void): () => void {
  let stop: (() => void) | null = null;
  let alive = true;
  signedInUser().then(async user => {
    if (!alive) return;
    if (!user) { onChange({ items: [] }); return; }
    try { await readCloud(user.uid); } catch {}
    if (!alive) return;
    stop = onSnapshot(ticketsRef(user.uid), snap => {
      const data = (snap.exists() ? snap.data() : { items: [] }) as TicketStore;
      const store: TicketStore = { items: Array.isArray(data.items) ? data.items : [], activeId: idOf(data) };
      writeCache(user.uid, store);
      onChange(store);
    }, () => {});
  });
  return () => { alive = false; stop?.(); };
}

/** Read-modify-write against the cloud copy only */
async function updateTickets(change: (store: TicketStore) => TicketStore): Promise<TicketStore> {
  const user = await signedInUser();
  if (!user) throw new Error('not signed in');
  const current = await readCloud(user.uid);
  const next = change(current);
  writeCache(user.uid, next);
  await setDoc(ticketsRef(user.uid), { items: cleanForFirestore(next.items), ...(next.activeId ? { activeId: next.activeId } : {}), updatedAt: Date.now() });
  return next;
}

/** Adds a ticket at the front, or replaces the one with `replaceId` (a ticket being re-planned). It goes to the counter; the one that was there goes to storage. */
export async function putTicket(ticket: DepartureTicket, replaceId?: string): Promise<void> {
  await updateTickets(store => ({
    items: [ticket, ...store.items.filter(t => t.id !== replaceId && t.id !== ticket.id)],
    activeId: ticket.id,
  }));
}

export async function removeTicket(id: string): Promise<TicketStore> {
  return updateTickets(store => ({
    items: store.items.filter(t => t.id !== id),
    activeId: store.activeId === id ? undefined : store.activeId,
  }));
}

/** Moves a ticket from storage to the counter */
export async function setActiveTicket(id: string): Promise<TicketStore> {
  return updateTickets(store => ({ items: store.items, activeId: store.items.some(t => t.id === id) ? id : store.activeId }));
}
