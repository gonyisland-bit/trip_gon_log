import { handlePushRequest } from './_pushcore.js';
import { handleCors } from './_cors.js';

interface NodeReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface NodeRes {
  status(code: number): NodeRes;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  end?: () => void;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req: NodeReq, res: NodeRes) {
  res.setHeader('Cache-Control', 'no-store');
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  // Links in the push open the site the request came from
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || '';
  const proto = first(req.headers['x-forwarded-proto']) || 'https';
  const origin = host ? `${proto}://${host}` : '';
  try {
    const result = await handlePushRequest(body, first(req.headers.authorization), process.env, origin);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Push handler error:', error);
    res.status(500).json({ error: 'Push request failed' });
  }
}
