import { createHash } from 'node:crypto';
import { verifyFirebaseToken } from './_r2core.js';
import { googleAccessToken, hasServiceAccount, projectIdOf, type GoogleEnv } from './_google.js';

/**
 * Server-only (v1.3.6): account mail from Tripgon log's own address. Firebase only makes the
 * action link (returnOobLink, it sends nothing); Resend delivers the mail from MAIL_FROM on
 * tripgonlog.com. Sending limits are ours, kept in mailLog/{key} (closed to every client by the
 * rules; the service account writes it), so Firebase's own throttle never blocks a member.
 *   verify  signed-in member without a verified address: the email verification link
 *   reset   anyone, by address: the password reset link (the answer never says whether the
 *           address has an account)
 */

export interface MailEnv extends GoogleEnv {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

export interface MailResult {
  status: number;
  body: Record<string, unknown>;
}

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore'];
const GAP_MS = 60 * 1000;
const DAILY = { verify: 10, reset: 5 } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Kind = keyof typeof DAILY;

function today(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST day
}

/** Checks and records one send for key; returns seconds to wait, or 0 when it may send */
async function takeSlot(env: MailEnv, token: string, key: string, kind: Kind): Promise<{ wait: number; daily: boolean }> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectIdOf(env)}/databases/(default)/documents/mailLog/${key}`;
  const auth = { Authorization: `Bearer ${token}` };
  const res = await fetch(url, { headers: auth });
  const f = res.ok ? ((await res.json()) as { fields?: Record<string, { integerValue?: string; stringValue?: string }> }).fields || {} : {};
  const last = Number(f.last?.integerValue || 0);
  const day = f.day?.stringValue || '';
  const count = day === today() ? Number(f.count?.integerValue || 0) : 0;
  const now = Date.now();
  if (now - last < GAP_MS) return { wait: Math.ceil((GAP_MS - (now - last)) / 1000), daily: false };
  if (count >= DAILY[kind]) return { wait: 0, daily: true };
  await fetch(`${url}?updateMask.fieldPaths=last&updateMask.fieldPaths=day&updateMask.fieldPaths=count&updateMask.fieldPaths=kind`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      last: { integerValue: String(now) }, day: { stringValue: today() }, count: { integerValue: String(count + 1) }, kind: { stringValue: kind },
    } }),
  });
  return { wait: 0, daily: false };
}

/** Firebase's action link for the address; null when the address has no account */
async function actionLink(env: MailEnv, token: string, requestType: 'VERIFY_EMAIL' | 'PASSWORD_RESET', email: string, continueUrl: string): Promise<string | null> {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectIdOf(env)}/accounts:sendOobCode`;
  const call = (withContinue: boolean) => fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType, email, returnOobLink: true, ...(withContinue && continueUrl ? { continueUrl } : {}) }),
  });
  let res = await call(true);
  if (!res.ok) {
    const text = await res.text();
    if (text.includes('EMAIL_NOT_FOUND') || text.includes('USER_NOT_FOUND')) return null;
    // A return address outside Firebase's authorized domains: the plain link still works
    if (text.includes('CONTINUE_URI') || text.includes('UNAUTHORIZED_DOMAIN')) res = await call(false);
    else throw new Error(`oob link failed: ${res.status} ${text}`);
    if (!res.ok) throw new Error(`oob link failed: ${res.status}`);
  }
  return String(((await res.json()) as { oobLink?: string }).oobLink || '') || null;
}

async function memberName(env: MailEnv, token: string, uid: string): Promise<string> {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectIdOf(env)}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return '';
  const f = ((await res.json()) as { fields?: Record<string, { stringValue?: string }> }).fields || {};
  const last = (f.lastName?.stringValue || '').trim();
  const first = (f.firstName?.stringValue || '').trim();
  return /[가-힣]/.test(last + first) ? `${last}${first}` : [first, last].filter(Boolean).join(' ');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** The mail: plain Swiss Soft card, one red pill button, the link again as text, a text version */
export function compose(kind: Kind, link: string, name: string, origin: string) {
  const greet = name ? `${name}님, 안녕하세요.` : '안녕하세요.';
  const copy = kind === 'verify'
    ? { subject: 'Tripgon log 이메일 인증', title: '이메일을 인증해 주세요', body: '아래 버튼을 누르면 가입이 끝나고 여정을 만들 수 있습니다.', button: '이메일 인증하기', note: '직접 가입하지 않았다면 이 메일은 무시해 주세요.' }
    : { subject: 'Tripgon log 비밀번호 재설정', title: '새 비밀번호를 정해 주세요', body: '아래 버튼을 눌러 새 비밀번호를 정하면 바로 로그인할 수 있습니다.', button: '비밀번호 재설정하기', note: '요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않습니다.' };
  const logo = origin ? `<img src="${origin}/favicon.png" width="40" height="40" alt="Tripgon log" style="display:block;border-radius:10px">` : '';
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#F6F4EF;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#141412">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EF;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFDF9;border-radius:20px;padding:32px 28px">
<tr><td>${logo}<p style="margin:20px 0 0;font:600 11px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#6B6960">TRIPGON LOG</p>
<h1 style="margin:8px 0 12px;font-size:22px;font-weight:800;letter-spacing:-.02em">${copy.title}</h1>
<p style="margin:0 0 6px;font-size:15px;line-height:1.7">${escapeHtml(greet)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3A3934">${copy.body}</p>
<a href="${link}" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 26px;border-radius:999px">${copy.button}</a>
<p style="margin:24px 0 6px;font-size:12px;color:#6B6960">버튼이 눌리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.</p>
<p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;color:#6B6960">${link}</p>
<p style="margin:0;font-size:12px;color:#6B6960">${copy.note} 링크는 한 번만 쓸 수 있고 일정 시간이 지나면 만료됩니다.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#9C998F">Tripgon log · ${origin ? origin.replace(/^https?:\/\//, '') : 'tripgonlog.com'}</p>
</td></tr></table></body></html>`;
  const text = `${copy.title}\n\n${greet}\n${copy.body}\n\n${copy.button}: ${link}\n\n${copy.note}\n\nTripgon log`;
  return { subject: copy.subject, html, text };
}

async function deliver(env: MailEnv, to: string, mail: { subject: string; html: string; text: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'Tripgon log <no-reply@tripgonlog.com>', to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) throw new Error(`resend failed: ${res.status} ${await res.text()}`);
}

export async function handleMailRequest(body: unknown, authHeader: string | undefined, env: MailEnv, origin: string, clientIp: string): Promise<MailResult> {
  if (!env.RESEND_API_KEY || !hasServiceAccount(env)) return { status: 501, body: { error: 'Mail is not configured' } };
  const req = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const token = await googleAccessToken(env, SCOPES);

  if (req.action === 'verify') {
    const caller = await verifyFirebaseToken(authHeader, projectIdOf(env));
    if (!caller?.email) return { status: 401, body: { error: 'Unauthorized' } };
    const slot = await takeSlot(env, token, `verify_${caller.uid}`, 'verify');
    if (slot.wait) return { status: 429, body: { error: 'wait', wait: slot.wait } };
    if (slot.daily) return { status: 429, body: { error: 'daily' } };
    const link = await actionLink(env, token, 'VERIFY_EMAIL', caller.email, origin ? `${origin}/?verified=1` : '');
    if (!link) return { status: 404, body: { error: 'No account' } };
    await deliver(env, caller.email, compose('verify', link, await memberName(env, token, caller.uid), origin));
    return { status: 200, body: { sent: true } };
  }

  if (req.action === 'reset') {
    const email = typeof req.email === 'string' ? req.email.trim().toLowerCase() : '';
    if (!EMAIL.test(email) || email.length > 254) return { status: 400, body: { error: 'Bad email' } };
    const hash = createHash('sha256').update(email).digest('hex').slice(0, 40);
    const ipHash = createHash('sha256').update(clientIp || 'unknown').digest('hex').slice(0, 40);
    const [byMail, byIp] = [await takeSlot(env, token, `reset_${hash}`, 'reset'), await takeSlot(env, token, `resetip_${ipHash}`, 'verify')];
    if (byMail.wait || byIp.wait) return { status: 429, body: { error: 'wait', wait: Math.max(byMail.wait, byIp.wait) } };
    if (byMail.daily || byIp.daily) return { status: 429, body: { error: 'daily' } };
    const link = await actionLink(env, token, 'PASSWORD_RESET', email, origin || '');
    // The same answer whether or not the address has an account
    if (link) await deliver(env, email, compose('reset', link, '', origin));
    return { status: 200, body: { sent: true } };
  }

  return { status: 400, body: { error: 'Bad request' } };
}
