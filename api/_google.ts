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
  const pk = await importPKCS8(String(env.FIREBASE_PRIVATE_KEY).replace(/\n/g, '\n'), 'RS256');
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
