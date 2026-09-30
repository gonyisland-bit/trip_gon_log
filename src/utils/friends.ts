import {
  arrayRemove, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where,
  setDoc as fsSetDoc, writeBatch as fsWriteBatch, type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '../types';
import { CONTENT_COLLECTIONS, currentUid } from './ownership';
import { personName } from './personName';
import { confirmDialog, notify } from './feedback';

// Friends (v1.3.6 5-a). Two members become friends through an invite the other one made:
//   invites/{code}                     from · name · picture, expiresAt, usedBy · usedAt
//   users/{uid}/friends/{friendUid}    a copy of the friend's name and picture, since, via
// The member accepting an invite writes both friend documents and claims the invite in one
// batch; the rules let them write into the inviter's list only in that same batch.
// There is no search by email: people connect only with someone who handed them a link or code.

export const INVITE_PARAM = 'invite';
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PENDING_KEY = 'tgl_pending_invite';

export interface PersonCard {
  uid: string;
  name: string;
  profileType?: 'icon' | 'image';
  profileIcon?: string;
  profileImage?: string;
}

export interface Friend extends PersonCard {
  since: number;
  via: string;
}

export interface Invite extends PersonCard {
  code: string;
  expiresAt: number;
  usedBy: string | null;
}

export function personCard(uid: string, profile?: Partial<UserProfile> | null, displayName?: string | null): PersonCard {
  const card: PersonCard = { uid, name: personName(profile, displayName) || '회원' };
  if (profile?.profileType) card.profileType = profile.profileType;
  if (profile?.profileIcon) card.profileIcon = profile.profileIcon;
  if (profile?.profileImage) card.profileImage = profile.profileImage;
  return card;
}

function cardFrom(data: Record<string, any>, uid: string): PersonCard {
  return personCard(uid, {
    profileType: data.profileType, profileIcon: data.profileIcon, profileImage: data.profileImage,
  }, data.name);
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/?${INVITE_PARAM}=${code}`;
}

function randomCode(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// ── Pending invite (opened before signing in) ──
export function rememberInvite(code: string) {
  try { localStorage.setItem(PENDING_KEY, code); } catch {}
}
export function pendingInvite(): string | null {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
export function forgetInvite() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

/** Takes ?invite=CODE off the address and keeps it until the member has signed in */
export function takeInviteFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(INVITE_PARAM);
  if (!raw) return null;
  params.delete(INVITE_PARAM);
  const rest = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);
  const code = normalizeCode(raw);
  if (code.length !== 6) return null;
  rememberInvite(code);
  return code;
}

// ── Friends list ──
export function subscribeFriends(onChange: (list: Friend[]) => void): () => void {
  const uid = currentUid();
  if (!uid) { onChange([]); return () => {}; }
  return onSnapshot(collection(db, 'users', uid, 'friends'), snap => {
    const list: Friend[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({ ...cardFrom(data, d.id), since: Number(data.since) || 0, via: String(data.via || '') });
    });
    onChange(list.sort((a, b) => a.name.localeCompare(b.name, 'ko')));
  }, err => {
    console.warn('Friends subscription notice:', err);
    onChange([]);
  });
}

// ── Invites ──
/** My newest invite that nobody has used and has not expired yet */
export async function activeInvite(): Promise<Invite | null> {
  const uid = currentUid();
  if (!uid) return null;
  const snap = await getDocs(query(collection(db, 'invites'), where('from', '==', uid)));
  const now = Date.now();
  const open = snap.docs
    .map(d => ({ code: d.id, ...d.data() } as any))
    .filter(d => !d.usedBy && Number(d.expiresAt) > now)
    .sort((a, b) => Number(b.expiresAt) - Number(a.expiresAt));
  const top = open[0];
  return top ? { ...cardFrom(top, uid), code: top.code, expiresAt: Number(top.expiresAt), usedBy: null } : null;
}

export async function createInvite(me: PersonCard): Promise<Invite> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = doc(db, 'invites', code);
    if ((await getDoc(ref)).exists()) continue;
    const expiresAt = Date.now() + INVITE_TTL_MS;
    const card = friendDoc(me, 0, '');
    delete card.since;
    delete card.via;
    await fsSetDoc(ref, { ...card, from: me.uid, createdAt: Date.now(), expiresAt, usedBy: null });
    return { ...me, code, expiresAt, usedBy: null };
  }
  throw new Error('could not make an invite code');
}

export type InviteCheck =
  | { ok: true; invite: Invite; from: string }
  | { ok: false; reason: 'missing' | 'expired' | 'used' | 'self' | 'already' };

export async function checkInvite(code: string): Promise<InviteCheck> {
  const uid = currentUid();
  const snap = await getDoc(doc(db, 'invites', code));
  if (!snap.exists()) return { ok: false, reason: 'missing' };
  const data = snap.data();
  const from = String(data.from || '');
  if (from === uid) return { ok: false, reason: 'self' };
  if (uid && (await getDoc(doc(db, 'users', uid, 'friends', from))).exists()) return { ok: false, reason: 'already' };
  if (data.usedBy) return { ok: false, reason: 'used' };
  if (Number(data.expiresAt) <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, from, invite: { ...cardFrom(data, from), code, expiresAt: Number(data.expiresAt), usedBy: null } };
}

export const INVITE_PROBLEM: Record<Exclude<InviteCheck, { ok: true }>['reason'], string> = {
  missing: '초대 코드를 찾지 못했습니다. 코드를 다시 확인해 주세요.',
  expired: '기간이 지난 초대입니다. 새 초대를 받아 주세요.',
  used: '이미 사용한 초대입니다. 새 초대를 받아 주세요.',
  self: '내가 만든 초대입니다. 친구에게 보내 주세요.',
  already: '이미 친구입니다.',
};

/** Claims the invite and adds both friend documents in one batch */
export async function acceptInvite(invite: Invite, me: PersonCard): Promise<void> {
  const since = Date.now();
  const batch = fsWriteBatch(db);
  batch.update(doc(db, 'invites', invite.code), { usedBy: me.uid, usedAt: serverTimestamp() });
  batch.set(doc(db, 'users', me.uid, 'friends', invite.uid), friendDoc(invite, since, invite.code));
  batch.set(doc(db, 'users', invite.uid, 'friends', me.uid), friendDoc(me, since, invite.code));
  await batch.commit();
}

/** What goes into a friend document: the person's name and picture, no uid (it is the doc id) */
function friendDoc(p: PersonCard, since: number, via: string) {
  const data: Record<string, unknown> = { name: p.name, since, via };
  if (p.profileType) data.profileType = p.profileType;
  if (p.profileIcon) data.profileIcon = p.profileIcon;
  if (p.profileImage) data.profileImage = p.profileImage;
  return data;
}

/**
 * Ends a friendship: both friend documents go, the friend is taken off the journeys I own, and I
 * take myself off the journeys they own (the rules let a reader leave a journey on their own).
 */
export async function removeFriend(friendUid: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('not signed in');
  const refs: Array<{ ref: DocumentReference; who: string }> = [];
  for (const col of CONTENT_COLLECTIONS) {
    const [mine, theirs] = await Promise.all([
      getDocs(query(collection(db, 'users', 'public', col), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'users', 'public', col), where('access', 'array-contains', uid))),
    ]);
    mine.forEach(d => {
      const data = d.data();
      if ((data.access || []).includes(friendUid) || (data.editors || []).includes(friendUid)) refs.push({ ref: d.ref, who: friendUid });
    });
    theirs.forEach(d => { if (d.data().ownerId === friendUid) refs.push({ ref: d.ref, who: uid }); });
  }
  const writes = [
    ...refs.map(r => (b: ReturnType<typeof fsWriteBatch>) => b.update(r.ref, { access: arrayRemove(r.who), editors: arrayRemove(r.who) })),
    (b: ReturnType<typeof fsWriteBatch>) => b.delete(doc(db, 'users', uid, 'friends', friendUid)),
    (b: ReturnType<typeof fsWriteBatch>) => b.delete(doc(db, 'users', friendUid, 'friends', uid)),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = fsWriteBatch(db);
    writes.slice(i, i + 400).forEach(w => w(batch));
    await batch.commit();
  }
}

/**
 * Operator tool: the members who already read the operator's journeys (family accounts from
 * before friends existed) become the operator's friends. Returns how many were connected.
 */
export async function connectFamily(me: PersonCard): Promise<number> {
  const readers = new Set<string>();
  for (const col of ['trips', 'plans'] as const) {
    const snap = await getDocs(query(collection(db, 'users', 'public', col), where('ownerId', '==', me.uid)));
    snap.forEach(d => (d.data().access || []).forEach((u: string) => { if (u && u !== me.uid) readers.add(u); }));
  }
  const existing = await getDocs(collection(db, 'users', me.uid, 'friends'));
  const known = new Set(existing.docs.map(d => d.id));
  const fresh = [...readers].filter(u => !known.has(u));
  if (!fresh.length) return 0;
  const since = Date.now();
  const batch = fsWriteBatch(db);
  for (const uid of fresh) {
    const prof = await getDoc(doc(db, 'users', 'public', 'users', uid)).catch(() => null);
    const card = personCard(uid, prof?.exists() ? prof.data() as UserProfile : null);
    batch.set(doc(db, 'users', me.uid, 'friends', uid), friendDoc(card, since, 'family'));
    batch.set(doc(db, 'users', uid, 'friends', me.uid), friendDoc(me, since, 'family'));
  }
  await batch.commit();
  return fresh.length;
}

/**
 * Looks the code up, asks "OO님과 친구가 될까요?" and connects. Returns true once connected.
 * Problems are told to the member; the pending invite is forgotten unless it may still work later.
 */
export async function promptAcceptInvite(code: string, me: PersonCard): Promise<boolean> {
  let check: InviteCheck;
  try {
    check = await checkInvite(code);
  } catch (err) {
    console.warn('Invite lookup failed:', err);
    notify('초대를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    return false;
  }
  forgetInvite();
  if (!check.ok) {
    notify(INVITE_PROBLEM[check.reason], check.reason === 'already' ? 'info' : 'error');
    return false;
  }
  const ok = await confirmDialog(`${check.invite.name}님과 친구가 될까요? 친구가 되면 서로 여정을 공유할 수 있습니다.`, { title: 'FRIEND', confirmLabel: '친구 되기' });
  if (!ok) return false;
  try {
    await acceptInvite(check.invite, me);
    notify(`${check.invite.name}님과 친구가 되었습니다.`, 'success');
    return true;
  } catch (err) {
    console.warn('Invite accept failed:', err);
    notify('친구로 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    return false;
  }
}
