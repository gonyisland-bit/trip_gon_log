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

const cache = new Map<string, { token: string; until: number }>();

export async function googleAccessToken(env: GoogleEnv, scopes: string[]): Promise<string> {
  const key = scopes.join(' ');
  const hit = cache.get(key);
  if (hit && hit.until > Date.now() + 60_000) return hit.token;
  // Keys pasted into Vercel often keep "\n" as two characters, sometimes inside quotes
  const pem = String(env.FIREBASE_PRIVATE_KEY).trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  const pk = await importPKCS8(pem, 'RS256');
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
