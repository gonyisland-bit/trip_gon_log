import { useSyncExternalStore } from 'react';

// Exchange rates (v1.3.8): Korean won per one unit of a currency, refreshed once a day.
// The server function /api/rates shares one daily fetch of a free feed across all devices (edge cache); the browser
// keeps the last answer as a render cache and asks again when its copy is from an earlier day. Until the first answer,
// and whenever the feed cannot be reached, the table below is used, so a screen never waits on the network.
// The cache also keeps the previous day's rates, which is what the home widget's up/down arrows compare against.

export interface RateSnapshot {
  /** Day the feed published these rates (YYYY-MM-DD, UTC) */
  date: string;
  /** When this browser got them */
  fetchedAt: number;
  rates: Record<string, number>;
}

interface RateCache {
  cur: RateSnapshot | null;
  prev: RateSnapshot | null;
}

/** Rough rates for before the first answer or with no network (won per unit) */
export const FALLBACK_RATES: Record<string, number> = {
  KRW: 1, USD: 1380, JPY: 9.3, EUR: 1480, CNY: 190, GBP: 1750, TWD: 43.2,
};

const KEY = 'tgl_rates_v1';
const DIRECT_FEED = 'https://open.er-api.com/v6/latest/KRW';
const MAX_AGE_MS = 20 * 60 * 60 * 1000;

function readCache(): RateCache {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { cur: raw.cur ?? null, prev: raw.prev ?? null };
  } catch { /* render cache only */ }
  return { cur: null, prev: null };
}

let cache: RateCache = typeof window === 'undefined' ? { cur: null, prev: null } : readCache();
// A snapshot object that only changes when rates change, so useSyncExternalStore does not loop
let view = makeView();
const listeners = new Set<() => void>();

function makeView() {
  const rates = { ...FALLBACK_RATES, ...(cache.cur?.rates ?? {}) };
  return { rates, date: cache.cur?.date ?? null, prevRates: cache.prev?.rates ?? null, live: !!cache.cur };
}

function emit() {
  view = makeView();
  listeners.forEach(l => l());
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* cache only */ }
}

function isRatesBody(j: any): j is { date: string; updatedAt?: number; rates: Record<string, number> } {
  return !!j && typeof j === 'object' && j.rates && typeof j.rates === 'object' && typeof j.date === 'string' && j.rates.USD > 0;
}

/** Our server function first; if it is not there (local development) or fails, the feed itself */
async function fetchRates(): Promise<{ date: string; rates: Record<string, number> }> {
  try {
    const r = await fetch('/api/rates', { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const j = await r.json();
      if (isRatesBody(j)) return { date: j.date, rates: j.rates };
    }
  } catch { /* try the feed directly */ }
  const r = await fetch(DIRECT_FEED);
  const j = await r.json();
  if (j?.result !== 'success' || !j.rates) throw new Error('rates unavailable');
  const rates: Record<string, number> = { KRW: 1 };
  for (const [code, perWon] of Object.entries(j.rates as Record<string, number>)) {
    if (typeof perWon === 'number' && perWon > 0) rates[code] = Math.round((1 / perWon) * 10000) / 10000;
  }
  return { date: new Date((j.time_last_update_unix || Date.now() / 1000) * 1000).toISOString().slice(0, 10), rates };
}

let inflight: Promise<void> | null = null;

/** Gets today's rates unless this browser already has them (at most about one request a day) */
export function refreshRates(force = false): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const cur = cache.cur;
  if (!force && cur && Date.now() - cur.fetchedAt < MAX_AGE_MS) return Promise.resolve();
  if (inflight) return inflight;
  inflight = fetchRates()
    .then(({ date, rates }) => {
      const snap: RateSnapshot = { date, fetchedAt: Date.now(), rates };
      // A new publishing day pushes the old rates back as "yesterday"
      const prev = cache.cur && cache.cur.date !== date ? cache.cur : cache.prev;
      cache = { cur: snap, prev };
      save();
      emit();
    })
    .catch(() => { /* keep what we have */ })
    .finally(() => { inflight = null; });
  return inflight;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Rates for a component: updates when a newer day arrives; asks for it on first use and when the app comes back */
export function useExchangeRates() {
  const v = useSyncExternalStore(subscribe, () => view, () => view);
  return v;
}

/** Won per one unit of `code`, from the latest rates the app has */
export function rateOf(code: string, fallback?: number): number {
  const c = code.toUpperCase();
  return view.rates[c] ?? fallback ?? 1;
}

/** Percent change from the previous published day, or null when there is no earlier day yet */
export function changeOf(code: string): number | null {
  const prev = view.prevRates?.[code];
  const now = view.rates[code];
  if (!prev || !now) return null;
  return ((now - prev) / prev) * 100;
}

// Fetch once the module is used, and again when the app returns to the foreground on a new day (an installed
// home-screen app can stay open for days)
if (typeof window !== 'undefined') {
  void refreshRates();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refreshRates(); });
}
