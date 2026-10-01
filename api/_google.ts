import { SignJWT, importPKCS8 } from 'jose';

/**
 * Server-only: a Google OAuth access token from the Firebase service account
 * (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY), for the Auth, Firestore and FCM REST APIs.
 */

export interface GoogleEnv {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

export function hasServiceAccount(env: GoogleEnv): boolean {
  return Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

export function projectIdOf(env: GoogleEnv): string {
  return env.FIREBASE_PROJECT_ID || 'trip-gon-log';
}

/**
 * The service account key however it was pasted into Vercel: the whole JSON file, quoted,
 * with "\n" as two characters, with stray spaces or CRs. jose wants a clean PKCS#8 PEM.
 */
export function normalizePem(raw: string): string {
  let v = raw.trim().replace(/^﻿/, '');
  if (v.startsWith('{')) {
    try { v = String(JSON.parse(v).private_key || v); } catch {}
  }
  v = v.replace(/^['"]+|['"]+$/g, '').replace(/\\r/g, '').replace(/\\n/g, '\n');
  // The markers themselves may be cut short or have odd dashes; only the base64 between them counts
  const begin = v.match(/-*\s*BEGIN [A-Z ]*KEY\s*-*/);
  let rest = begin ? v.slice((begin.index || 0) + begin[0].length) : v;
  const end = rest.search(/-*\s*END [A-Z ]*KEY|-{3,}/);
  if (end >= 0) rest = rest.slice(0, end);
  const body = rest.replace(/[^A-Za-z0-9+/=]/g, '');
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

const cache = new Map<string, { token: string; until: number }>();

export async function googleAccessToken(env: GoogleEnv, scopes: string[]): Promise<string> {
  const key = scopes.join(' ');
  const hit = cache.get(key);
  if (hit && hit.until > Date.now() + 60_000) return hit.token;
  const raw = String(env.FIREBASE_PRIVATE_KEY);
  const pem = normalizePem(raw);
  const pk = await importPKCS8(pem, 'RS256').catch((err: Error) => {
    // The shape of the key (never its content) so a bad paste can be told apart
    const body = pem.replace(/-----[A-Z ]+-----|\n/g, '');
    const shape = [
      `len ${raw.length}`, `body ${body.length}`, `mod4 ${body.length % 4}`,
      `begin ${(raw.match(/BEGIN [A-Z ]*KEY/) || ['none'])[0]}`, `json ${raw.trim().startsWith('{')}`,
      `nl ${(raw.match(/\n/g) || []).length}`, `bsn ${(raw.match(/\\n/g) || []).length}`, `eq ${(body.match(/=/g) || []).length}`,
    ].join(', ');
    throw new Error(`key import failed (${shape}) ${err.message}`);
  });
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: key })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(String(env.FIREBASE_CLIENT_EMAIL))
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const body = await res.json() as { access_token?: string; expires_in?: number };
  const token = String(body.access_token || '');
  cache.set(key, { token, until: Date.now() + (Number(body.expires_in) || 3600) * 1000 });
  return token;
}

/**
 * The same operator test as the app and the Firestore rules: an owner email (R2_OWNER_EMAILS),
 * the super admin or an allowed admin in users/public/settings/admin, or role 'admin' on the
 * member's own profile.
 */
export async function isOperator(env: GoogleEnv & { R2_OWNER_EMAILS?: string }, caller: { uid: string; email: string }): Promise<boolean> {
  const email = (caller.email || '').toLowerCase();
  const owners = (env.R2_OWNER_EMAILS || 'gonyisland@naver.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (email && owners.includes(email)) return true;
  if (!hasServiceAccount(env)) return false;
  const token = await googleAccessToken(env, ['https://www.googleapis.com/auth/datastore']);
  const base = `https://firestore.googleapis.com/v1/projects/${projectIdOf(env)}/databases/(default)/documents`;
  const read = async (path: string) => {
    const res = await fetch(`${base}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? ((await res.json()) as { fields?: Record<string, any> }).fields || {} : {};
  };
  const cfg = await read('users/public/settings/admin');
  const superAdmin = String(cfg.superAdminEmail?.stringValue || '').toLowerCase();
  const allowed = (cfg.allowedAdmins?.arrayValue?.values || []).map((v: any) => String(v.stringValue || '').toLowerCase());
  if (email && (email === superAdmin || allowed.includes(email))) return true;
  const me = await read(`users/${caller.uid}`);
  return me.role?.stringValue === 'admin';
}
