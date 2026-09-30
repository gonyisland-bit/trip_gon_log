/**
 * The store app (Capacitor) calls the server functions from its own origin (v1.3.6 6-d). Only
 * those app origins get CORS headers; the website calls on the same origin and needs none.
 */

const APP_ORIGINS = new Set(['capacitor://localhost', 'https://localhost', 'http://localhost', 'ionic://localhost']);

interface Req { method?: string; headers: Record<string, string | string[] | undefined> }
interface Res { status(code: number): Res; json(body: unknown): void; setHeader(name: string, value: string): void; end?: () => void }

/** Sets CORS headers for app origins; returns true when the request was a preflight already answered */
export function handleCors(req: Req, res: Res): boolean {
  const origin = req.headers.origin;
  const o = Array.isArray(origin) ? origin[0] : origin;
  if (o && APP_ORIGINS.has(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    res.status(204);
    if (res.end) res.end(); else res.json({});
    return true;
  }
  return false;
}
