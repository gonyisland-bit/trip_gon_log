// Quick spots (v1.3.8): what a traveller looks for around where they stand or stay — a convenience store, a supermarket,
// a station, a pharmacy, somewhere to eat, a café, a sight. Shared by the place map (map hub) and the stay map (journey).
//
// Places searches cost money and time, so they are kept few:
//  - a search runs only when a kind is switched on or the member asks to search the area again, never as the map moves
//  - results are kept per kind and per ~150 m square for 30 minutes (memory, then sessionStorage for this tab)
//  - at most three kinds are on at once, and a session makes at most 40 searches in ten minutes
//  - nothing is ever made up: no result is shown as "nothing found"
import { calculateDistanceInMeters } from './pocketStorage';
import type { PocketCategory } from '../types';

export type QuickSpotKind = 'convenience' | 'supermarket' | 'station' | 'pharmacy' | 'restaurant' | 'cafe' | 'attraction';

export interface QuickSpotMeta {
  kind: QuickSpotKind;
  label: string;
  /** Google Places types, tried in order until one gives enough results */
  types: string[];
  radius: number;
  /** Lucide icon paths (24 × 24, stroke) for the map pin, which is plain HTML */
  paths: string[];
  pocket: PocketCategory;
}

export const QUICK_SPOTS: QuickSpotMeta[] = [
  { kind: 'convenience', label: '편의점', types: ['convenience_store'], radius: 800, pocket: 'shopping',
    paths: ['M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5', 'M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244', 'M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05'] },
  { kind: 'supermarket', label: '슈퍼', types: ['supermarket'], radius: 1500, pocket: 'shopping',
    paths: ['m15 11-1 9', 'm19 11-4-7', 'M2 11h20', 'm3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4', 'M4.5 15.5h15', 'm5 11 4-7', 'm9 11 1 9'] },
  { kind: 'station', label: '역', types: ['subway_station', 'train_station'], radius: 1500, pocket: 'tip',
    paths: ['M8 3.1V7a4 4 0 0 0 8 0V3.1', 'm9 15-1-1', 'm15 15 1-1', 'M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z', 'm8 19-2 3', 'm16 19 2 3'] },
  { kind: 'pharmacy', label: '약국', types: ['pharmacy'], radius: 1200, pocket: 'tip',
    paths: ['m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z', 'm8.5 8.5 7 7'] },
  { kind: 'restaurant', label: '식당', types: ['restaurant'], radius: 800, pocket: 'food',
    paths: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'] },
  { kind: 'cafe', label: '카페', types: ['cafe'], radius: 800, pocket: 'cafe',
    paths: ['M10 2v2', 'M14 2v2', 'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1', 'M6 2v2'] },
  { kind: 'attraction', label: '명소', types: ['tourist_attraction'], radius: 2500, pocket: 'spot',
    paths: ['M10 18v-7', 'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z', 'M14 18v-7', 'M18 18v-7', 'M3 22h18', 'M6 18v-7'] },
];

export const QUICK_SPOT_META = Object.fromEntries(QUICK_SPOTS.map(m => [m.kind, m])) as Record<QuickSpotKind, QuickSpotMeta>;

export const isQuickSpotKind = (v: unknown): v is QuickSpotKind => typeof v === 'string' && v in QUICK_SPOT_META;

/** How many kinds may be on at once */
export const MAX_ACTIVE_KINDS = 3;
/** Below this zoom the view is too wide for a walk-around search */
export const MIN_SEARCH_ZOOM = 13;

export interface QuickSpot {
  id: string;
  kind: QuickSpotKind;
  name: string;
  lat: number;
  lng: number;
  /** Metres from where the search was made */
  distance: number;
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
  address?: string;
}

export interface LatLng { lat: number; lng: number }

const TTL_MS = 30 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_LIMIT = 40;
const KEEP = 15;
const STORE_KEY = 'tgl_quick_spots';

type Entry = { at: number; spots: QuickSpot[] };
const memory = new Map<string, Entry>();
const inFlight = new Map<string, Promise<QuickSpot[]>>();
const calls: number[] = [];

/** The cell a search belongs to: about 150 m on a side */
const cellKey = (kind: QuickSpotKind, at: LatLng) => `${kind}:${(Math.round(at.lat / 0.0014) * 0.0014).toFixed(4)}:${(Math.round(at.lng / 0.0014) * 0.0014).toFixed(4)}`;

function readStore(): Record<string, Entry> {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

function writeStore(key: string, entry: Entry) {
  try {
    const all = readStore();
    all[key] = entry;
    const now = Date.now();
    // Keep the store small: drop the stale, then the oldest past 60 cells
    const live = Object.entries(all).filter(([, e]) => now - e.at < TTL_MS).sort((a, b) => b[1].at - a[1].at).slice(0, 60);
    sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(live)));
  } catch { /* the memory copy still serves */ }
}

function cached(key: string): QuickSpot[] | null {
  const now = Date.now();
  const m = memory.get(key);
  if (m && now - m.at < TTL_MS) return m.spots;
  const s = readStore()[key];
  if (s && now - s.at < TTL_MS) { memory.set(key, s); return s.spots; }
  return null;
}

/** Thrown when the session has searched too much for now */
export class QuickSpotBusyError extends Error { constructor() { super('busy'); } }

function takeCall() {
  const now = Date.now();
  while (calls.length && now - calls[0] > WINDOW_MS) calls.shift();
  if (calls.length >= WINDOW_LIMIT) throw new QuickSpotBusyError();
  calls.push(now);
}

function nearby(type: string, at: LatLng, radius: number): Promise<any[]> {
  const g = (window as any).google;
  if (!g?.maps?.places) return Promise.resolve([]);
  takeCall();
  return new Promise(resolve => {
    try {
      const service = new g.maps.places.PlacesService(document.createElement('div'));
      service.nearbySearch({ location: new g.maps.LatLng(at.lat, at.lng), radius, type }, (results: any[], status: string) => {
        resolve(status === g.maps.places.PlacesServiceStatus.OK && results ? results : []);
      });
    } catch {
      resolve([]);
    }
  });
}

/** One kind around a point, from the cache when it can be */
export function searchQuickSpots(kind: QuickSpotKind, at: LatLng): Promise<QuickSpot[]> {
  const key = cellKey(kind, at);
  const hit = cached(key);
  if (hit) return Promise.resolve(hit);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const meta = QUICK_SPOT_META[kind];
  const run = (async () => {
    const seen = new Map<string, QuickSpot>();
    for (const type of meta.types) {
      const results = await nearby(type, at, meta.radius);
      results.forEach((p: any) => {
        const loc = p.geometry?.location;
        if (!loc || !p.place_id || seen.has(p.place_id)) return;
        if (p.business_status && p.business_status !== 'OPERATIONAL') return;
        const lat = loc.lat(), lng = loc.lng();
        seen.set(p.place_id, {
          id: p.place_id,
          kind,
          name: p.name || meta.label,
          lat, lng,
          distance: Math.round(calculateDistanceInMeters(at.lat, at.lng, lat, lng)),
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          ratingCount: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
          openNow: p.opening_hours?.open_now ?? undefined,
          address: p.vicinity || undefined,
        });
      });
      // The next type is tried only when the first left the list thin
      if (seen.size >= 6) break;
    }
    const spots = [...seen.values()].sort((a, b) => a.distance - b.distance).slice(0, KEEP);
    const entry = { at: Date.now(), spots };
    memory.set(key, entry);
    writeStore(key, entry);
    return spots;
  })();
  inFlight.set(key, run);
  run.finally(() => inFlight.delete(key));
  return run;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
}

/** Directions in the Google Maps app or site, on foot */
export function directionsUrl(spot: QuickSpot): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&destination_place_id=${encodeURIComponent(spot.id)}&travelmode=walking`;
}

/** The map pin: an ink disc with the kind's icon in white (it reads on light and busy maps alike); the picked one is red */
export function quickSpotPinHtml(kind: QuickSpotKind, selected: boolean): string {
  const meta = QUICK_SPOT_META[kind];
  const size = selected ? 36 : 30;
  const icon = selected ? 18 : 15;
  return `<div class="tgl-qs-pin${selected ? ' is-on' : ''}" style="width:${size}px;height:${size}px">`
    + `<svg viewBox="0 0 24 24" width="${icon}" height="${icon}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
    + meta.paths.map(d => `<path d="${d}"/>`).join('')
    + `</svg></div>`;
}
