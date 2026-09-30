import { verifyFirebaseToken } from './_r2core.js';
import { googleAccessToken, hasServiceAccount, projectIdOf, type GoogleEnv } from './_google.js';

/**
 * Server-only (v1.3.6 6-b): after a member leaves a notification for a friend, this sends it as
 * a web push to the friend's devices. The notification is read back from Firestore and must be
 * signed by the caller, so nobody can push arbitrary text. Kinds the friend muted are skipped,
 * and device tokens FCM no longer knows are removed.
 */

export interface PushResult {
  status: number;
  body: Record<string, unknown>;
}

const SCOPES = ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/firebase.messaging'];
const ID = /^[A-Za-z0-9_-]{1,160}$/;

type FsValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; arrayValue?: { values?: FsValue[] } };

function plain(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(plain);
  return undefined;
}

function fields(raw: unknown): Record<string, unknown> {
  const doc = raw as { fields?: Record<string, FsValue> } | null;
  return Object.fromEntries(Object.entries(doc?.fields || {}).map(([k, v]) => [k, plain(v)]));
}

function text(n: Record<string, unknown>): string {
  const who = String(n.fromName || '친구');
  const title = String(n.title || '여정');
  switch (n.kind) {
    case 'friend_joined': return `${who}님과 친구가 되었습니다.`;
    case 'journey_shared': return `${who}님이 '${title}'을(를) ${n.role === 'edit' ? '함께 편집하도록' : '볼 수 있게'} 공유했습니다.`;
    case 'journey_edited': return `${who}님이 '${title}'을(를) 고쳤습니다.`;
    case 'pocket_shared': return `${who}님이 포켓을 보여 줍니다.`;
    default: return `${who}님의 소식`;
  }
}

function linkFor(n: Record<string, unknown>, origin: string): string {
  if ((n.kind === 'journey_shared' || n.kind === 'journey_edited') && n.tripId) return `${origin}/?id=${n.tripId}&open=1`;
  if (n.kind === 'pocket_shared') return `${origin}/pocket`;
  return `${origin}/`;
}

export async function handlePushRequest(body: unknown, authHeader: string | undefined, env: GoogleEnv, origin: string): Promise<PushResult> {
  const projectId = projectIdOf(env);
  const caller = await verifyFirebaseToken(authHeader, projectId);
  if (!caller) return { status: 401, body: { error: 'Unauthorized' } };
  if (!hasServiceAccount(env)) return { status: 501, body: { error: 'Service account is not configured' } };

  const req = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const to = typeof req.to === 'string' ? req.to : '';
  const id = typeof req.id === 'string' ? req.id : '';
  if (!ID.test(to) || !ID.test(id) || to === caller.uid) return { status: 400, body: { error: 'Bad request' } };

  const token = await googleAccessToken(env, SCOPES);
  const auth = { Authorization: `Bearer ${token}` };
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${to}`;

  const noteRes = await fetch(`${base}/notifications/${id}`, { headers: auth });
  if (!noteRes.ok) return { status: 404, body: { error: 'No such notification' } };
  const note = fields(await noteRes.json());
  if (note.from !== caller.uid || note.read === true) return { status: 403, body: { error: 'Not yours' } };

  const prefRes = await fetch(`${base}/settings/notify`, { headers: auth });
  const prefs = prefRes.ok ? fields(await prefRes.json()) : {};
  const muted = Array.isArray(prefs.muted) ? prefs.muted : [];
  if (muted.includes(note.kind)) return { status: 200, body: { sent: 0, muted: true } };

  const devRes = await fetch(`${base}/devices?pageSize=50`, { headers: auth });
  const devices = devRes.ok ? ((await devRes.json()) as { documents?: Array<{ name: string }> }).documents || [] : [];
  let sent = 0;
  for (const d of devices) {
    const deviceToken = decodeURIComponent(d.name.split('/').pop() || '');
    if (!deviceToken) continue;
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          webpush: {
            notification: { title: 'Tripgon', body: text(note), icon: `${origin}/favicon.png`, badge: `${origin}/favicon-32x32.png`, tag: id },
            fcm_options: { link: linkFor(note, origin) },
          },
          data: { kind: String(note.kind || ''), id },
        },
      }),
    });
    if (res.ok) { sent++; continue; }
    const err = await res.text();
    // The device dropped the subscription: forget its token
    if (res.status === 404 || err.includes('UNREGISTERED') || err.includes('INVALID_ARGUMENT')) {
      await fetch(`https://firestore.googleapis.com/v1/${d.name}`, { method: 'DELETE', headers: auth }).catch(() => {});
    } else {
      console.error('FCM send failed:', res.status, err);
    }
  }
  return { status: 200, body: { sent } };
}
