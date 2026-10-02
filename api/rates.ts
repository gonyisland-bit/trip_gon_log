import { handleCors } from './_cors.js';

/**
 * Exchange rates for the whole app (v1.3.8): Korean won per one unit of each currency, from a free daily feed.
 * The feed updates once a day, so the edge keeps one copy for an hour and serves a stale one for a day while it
 * refreshes: every device shares the same fetch, and a slow or failing feed never blocks the page.
 */

interface NodeReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface NodeRes {
  status(code: number): NodeRes;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  end?: () => void;
}

const FEED = 'https://open.er-api.com/v6/latest/KRW';

export default async function handler(req: NodeReq, res: NodeRes) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(FEED, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`feed ${r.status}`);
    const j = (await r.json()) as { result?: string; time_last_update_unix?: number; rates?: Record<string, number> };
    if (j.result !== 'success' || !j.rates) throw new Error('feed result');
    // The feed quotes how much of each currency one won buys; the app wants won per one unit
    const rates: Record<string, number> = {};
    for (const [code, perWon] of Object.entries(j.rates)) {
      if (typeof perWon === 'number' && perWon > 0) rates[code] = Math.round((1 / perWon) * 10000) / 10000;
    }
    rates.KRW = 1;
    const updatedAt = (j.time_last_update_unix || Math.floor(Date.now() / 1000)) * 1000;
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ date: new Date(updatedAt).toISOString().slice(0, 10), updatedAt, rates });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Rates unavailable' });
  }
}
