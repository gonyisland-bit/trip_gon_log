import { handleAccountRequest } from './_accountcore.js';
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

export default async function handler(req: NodeReq, res: NodeRes) {
  res.setHeader('Cache-Control', 'no-store');
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth = req.headers.authorization;
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  try {
    const result = await handleAccountRequest(body, Array.isArray(auth) ? auth[0] : auth, process.env);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Account handler error:', error);
    res.status(500).json({ error: 'Account request failed' });
  }
}
