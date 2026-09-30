import { googleAccessToken } from './_google.js';
import { verifyFirebaseToken } from './_r2core.js';

/**
 * Server-only: the operator removes a member's Firebase sign-in account (v1.3.6), so a deleted
 * member can neither get a password reset mail nor sign in, and the address can sign up again.
 * Needs a Firebase service account in FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY; without it
 * the endpoint answers 501 and the app falls back to the account removing itself at sign-in.
 */

export interface AccountEnv {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  R2_OWNER_EMAILS?: string;
}

export interface AccountResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleAccountRequest(body: unknown, authHeader: string | undefined, env: AccountEnv): Promise<AccountResult> {
  const projectId = env.FIREBASE_PROJECT_ID || 'trip-gon-log';
  const caller = await verifyFirebaseToken(authHeader, projectId);
  if (!caller) return { status: 401, body: { error: 'Unauthorized' } };
  const ownerEmails = (env.R2_OWNER_EMAILS || 'gonyisland@naver.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!caller.email || !ownerEmails.includes(caller.email)) return { status: 403, body: { error: 'Operator only' } };

  const req = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const uid = typeof req.uid === 'string' ? req.uid : '';
  if (req.action !== 'delete' || !/^[A-Za-z0-9]{10,128}$/.test(uid)) return { status: 400, body: { error: 'Bad request' } };
  if (uid === caller.uid) return { status: 400, body: { error: 'Cannot delete the operator account' } };
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return { status: 501, body: { error: 'Service account is not configured' } };

  const token = await googleAccessToken(env, ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform']);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ localId: uid }),
  });
  if (res.ok) return { status: 200, body: { deleted: true } };
  const text = await res.text();
  // Already gone counts as done
  if (text.includes('USER_NOT_FOUND')) return { status: 200, body: { deleted: true } };
  console.error('Account delete failed:', res.status, text);
  return { status: 502, body: { error: 'Account delete failed' } };
}
