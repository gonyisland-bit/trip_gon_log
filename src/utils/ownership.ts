import {
  arrayRemove, collection, doc, getDoc, getDocs, query, where,
  setDoc as fsSetDoc, updateDoc as fsUpdateDoc, deleteDoc as fsDeleteDoc, writeBatch as fsWriteBatch,
  type DocumentReference, type Firestore, type Query, type SetOptions, type WriteBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { notifyJourneyEdited, notifyJourneyShared } from './notifications';

// Own content (v1.3.6 phase 3). Journey content stays in the shared users/public/{col} collections,
// but every document carries who owns it and who may see or edit it:
//   ownerId     the member who made it
//   access      uids who may read it (the owner, family, later friends)
//   editors     uids who may edit it besides the owner
//   publicShare true when the owner has shared the journey by link
// Timeline, flight, stay and transit documents copy these from their journey, so the rules and
// queries never have to join. Writers import setDoc / writeBatch from here instead of Firestore;
// the fields are filled in automatically on every write to a content path.

export const CONTENT_COLLECTIONS = ['trips', 'plans', 'timeline', 'flights', 'stays', 'transits'] as const;
type ContentCollection = typeof CONTENT_COLLECTIONS[number];
const JOURNEY_COLLECTIONS = new Set<string>(['trips', 'plans']);
const CONTENT = new Set<string>(CONTENT_COLLECTIONS);

export interface Ownership {
  ownerId: string;
  access: string[];
  editors: string[];
  publicShare: boolean;
}

// Journey id → ownership, filled from the journeys this member can see
const registry = new Map<string, Ownership>();
const titles = new Map<string, string>();

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

function pick(data: Record<string, any> | undefined | null): Ownership | null {
  if (!data || typeof data.ownerId !== 'string' || !data.ownerId) return null;
  return {
    ownerId: data.ownerId,
    access: Array.isArray(data.access) ? data.access : [data.ownerId],
    editors: Array.isArray(data.editors) ? data.editors : [],
    publicShare: data.publicShare === true,
  };
}

/** Remember the ownership of the journeys this member can see (called by the journey listeners) */
export function registerJourneys(list: Array<Record<string, any>>) {
  list.forEach(j => {
    const o = pick(j);
    if (o && j.id !== undefined) registry.set(String(j.id), o);
    if (j.id !== undefined && typeof j.title === 'string') titles.set(String(j.id), j.title);
  });
}

export function ownershipOf(journeyId: unknown): Ownership | null {
  return journeyId === undefined || journeyId === null ? null : registry.get(String(journeyId)) ?? null;
}

function freshOwnership(): Ownership | null {
  const uid = currentUid();
  return uid ? { ownerId: uid, access: [uid], editors: [], publicShare: false } : null;
}

/** The fields a write to users/public/{col}/{id} must carry, or null for any other path */
function stampFor(ref: DocumentReference, data: Record<string, any>): Ownership | null {
  const parts = ref.path.split('/');
  if (parts.length !== 4 || parts[0] !== 'users' || parts[1] !== 'public') return null;
  const col = parts[2];
  const id = parts[3];
  if (col === 'trash') return pick(data) ?? ownershipOf(id) ?? ownershipOf(data?.tripId) ?? freshOwnership();
  if (!CONTENT.has(col)) return null;
  if (JOURNEY_COLLECTIONS.has(col)) {
    // A known journey keeps its fields; a new one (also a copy of another) belongs to whoever makes it
    const o = ownershipOf(id) ?? freshOwnership();
    if (o) registry.set(id, o);
    return o;
  }
  // Timeline, flights, stays, transits follow their journey
  return ownershipOf(data?.tripId) ?? pick(data) ?? freshOwnership();
}

function stamped<T extends Record<string, any>>(ref: DocumentReference, data: T): T {
  const o = stampFor(ref, data);
  if (o) noteEdit(ref, data, o);
  return o ? { ...data, ...o } : data;
}

/** A write to a journey edited together tells the owner and the other editors (6-a, hourly) */
function noteEdit(ref: DocumentReference, data: Record<string, any>, o: Ownership) {
  const uid = currentUid();
  if (!uid || !o.editors.length) return;
  const people = [o.ownerId, ...o.editors];
  if (!people.includes(uid)) return;
  const parts = ref.path.split('/');
  const journeyId = JOURNEY_COLLECTIONS.has(parts[2]) ? parts[3] : data?.tripId;
  if (journeyId === undefined || journeyId === null) return;
  notifyJourneyEdited(people, journeyId, titles.get(String(journeyId)) || data?.title || '');
}

export function setDoc(ref: DocumentReference<any>, data: any, options?: SetOptions): Promise<void> {
  if (isSharedHomeDoc(ref)) return setHomeSettings(data ?? {}, options);
  const next = stamped(ref, data ?? {});
  return options ? fsSetDoc(ref, next, options) : fsSetDoc(ref, next);
}

export const updateDoc = fsUpdateDoc;
export const deleteDoc = fsDeleteDoc;

/** A batch whose set() fills in the ownership fields like setDoc above */
export function writeBatch(firestore: Firestore): WriteBatch {
  const batch = fsWriteBatch(firestore);
  const rawSet = batch.set.bind(batch) as (ref: DocumentReference<any>, data: any, options?: SetOptions) => WriteBatch;
  (batch as any).set = (ref: DocumentReference<any>, data: any, options?: SetOptions) =>
    options ? rawSet(ref, stamped(ref, data ?? {}), options) : rawSet(ref, stamped(ref, data ?? {}));
  return batch;
}

/** The content this member may read: their own, their family's and (later) friends' */
export function visibleContent(col: ContentCollection): Query | null {
  const uid = currentUid();
  return uid ? query(collection(db, 'users', 'public', col), where('access', 'array-contains', uid)) : null;
}

/** One shared journey's items, readable by anyone holding the link */
export function sharedContent(col: ContentCollection, journeyId: number | string): Query {
  return query(
    collection(db, 'users', 'public', col),
    where('tripId', '==', Number(journeyId)),
    where('publicShare', '==', true),
  );
}

/** This member's own trash */
export function ownTrash(): Query | null {
  const uid = currentUid();
  return uid ? query(collection(db, 'users', 'public', 'trash'), where('ownerId', '==', uid)) : null;
}

/** A per-member document or collection that used to be shared (pockets, wishlist, calendar, home) */
export function personalDoc(name: string): DocumentReference | null {
  const uid = currentUid();
  return uid ? doc(db, 'users', uid, 'settings', name) : null;
}

export function personalCollection(name: string) {
  const uid = currentUid();
  return uid ? collection(db, 'users', uid, name) : null;
}

// ── Home settings split (v1.3.6) ──
// users/public/settings/home keeps what every visitor sees (landing, ticker, music, home copy);
// a member's hero journeys and magazine live in users/{uid}/settings/home.
const SHARED_HOME_KEYS = new Set([
  'title', 'subtitle', 'marqueeShow', 'marqueeMessage', 'marqueeSpeed', 'landingHeroImage', 'landingHeroMedia',
  'homeGradientEnabled', 'homeGradientFrom', 'homeGradientTo', 'bgmPlaylist', 'bgmAutoplay', 'bgmDefaultVolume',
  'bgmShuffle', 'slideshowInterval', 'homeWidgets', 'updatedAt',
]);

export function pickHomeKeys(data: Record<string, any>, part: 'shared' | 'personal'): Record<string, any> {
  return Object.fromEntries(Object.entries(data || {}).filter(([k]) => SHARED_HOME_KEYS.has(k) === (part === 'shared')));
}

function isSharedHomeDoc(ref: DocumentReference): boolean {
  return ref.path === 'users/public/settings/home';
}

/**
 * Writes meant for the old shared home doc: personal keys go to the member's own doc (merged),
 * shared keys to the public doc (only the operator account may change those; others are skipped).
 */
async function setHomeSettings(data: Record<string, any>, options?: SetOptions): Promise<void> {
  const personal = pickHomeKeys(data, 'personal');
  const shared = pickHomeKeys(data, 'shared');
  const uid = currentUid();
  const jobs: Promise<void>[] = [];
  if (uid && Object.keys(personal).length) {
    jobs.push(fsSetDoc(doc(db, 'users', uid, 'settings', 'home'), personal, { merge: true }));
  }
  const sharedKeys = Object.keys(shared).filter(k => k !== 'updatedAt');
  if (sharedKeys.length) {
    const ref = doc(db, 'users', 'public', 'settings', 'home');
    jobs.push(options ? fsSetDoc(ref, shared, options) : fsSetDoc(ref, shared, { merge: true }));
  }
  const results = await Promise.allSettled(jobs);
  const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
  // A member saving their magazine may carry shared keys along; only fail when nothing was saved
  if (failed && results.every(r => r.status === 'rejected')) throw failed.reason;
}

/** One journey's items this member may read (the access filter lets the rules allow the query) */
export function journeyItems(col: Exclude<ContentCollection, 'trips' | 'plans'>, journeyId: number | string): Query {
  const uid = currentUid() || '-';
  return query(
    collection(db, 'users', 'public', col),
    where('tripId', '==', Number(journeyId)),
    where('access', 'array-contains', uid),
  );
}

/**
 * Turns link sharing of one journey on or off: the journey and all its items carry publicShare,
 * so a visitor with the link can read exactly this journey and nothing else.
 */
export async function setLinkShare(journeyId: number | string, on: boolean): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('not signed in');
  const id = String(journeyId);
  const owner = ownershipOf(id);
  if (owner && owner.ownerId !== uid) throw new Error('only the owner can change link sharing');
  const tripRef = doc(db, 'users', 'public', 'trips', id);
  const planRef = doc(db, 'users', 'public', 'plans', id);
  const isTrip = (await getDoc(tripRef).catch(() => null))?.exists();
  const batch = fsWriteBatch(db);
  batch.update(isTrip ? tripRef : planRef, { publicShare: on });
  for (const c of ['timeline', 'flights', 'stays', 'transits'] as const) {
    const snap = await getDocs(journeyItems(c, journeyId));
    snap.forEach(d => batch.update(d.ref, { publicShare: on }));
  }
  await batch.commit();
  if (owner) registry.set(id, { ...owner, publicShare: on });
}

/** The journey document (trip or plan) and every item that belongs to it and that I can read */
async function journeyRefs(journeyId: number | string): Promise<DocumentReference[]> {
  const id = String(journeyId);
  const tripRef = doc(db, 'users', 'public', 'trips', id);
  const tripSnap = await getDoc(tripRef).catch(() => null);
  const isTrip = tripSnap?.exists();
  if (isTrip && typeof tripSnap?.data()?.title === 'string') titles.set(id, tripSnap!.data()!.title);
  if (!isTrip && !titles.has(id)) {
    const planSnap = await getDoc(doc(db, 'users', 'public', 'plans', id)).catch(() => null);
    if (typeof planSnap?.data()?.title === 'string') titles.set(id, planSnap!.data()!.title);
  }
  const refs: DocumentReference[] = [isTrip ? tripRef : doc(db, 'users', 'public', 'plans', id)];
  for (const c of ['timeline', 'flights', 'stays', 'transits'] as const) {
    const snap = await getDocs(journeyItems(c, journeyId));
    snap.forEach(d => refs.push(d.ref));
  }
  return refs;
}

async function updateAll(refs: DocumentReference[], data: Record<string, any>, first?: Record<string, any>) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = fsWriteBatch(db);
    refs.slice(i, i + 400).forEach((r, k) => batch.update(r, i + k === 0 && first ? { ...data, ...first } : data));
    await batch.commit();
  }
}

/** The owner's name and picture, kept on a shared journey so friends' cards can show whose it is */
export interface OwnerCard {
  name: string;
  profileType?: string;
  profileIcon?: string;
  profileImage?: string;
}

/**
 * Sharing with friends (v1.3.6 5-b): sets who may read and who may edit one journey. The journey
 * and all its items get the same lists in one go; the owner always stays in access.
 */
export async function setJourneyPeople(
  journeyId: number | string, readers: string[], editors: string[], ownerCard: OwnerCard,
): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('not signed in');
  const id = String(journeyId);
  const owner = ownershipOf(id);
  if (owner && owner.ownerId !== uid) throw new Error('only the owner can change sharing');
  const edit = Array.from(new Set(editors.filter(u => u && u !== uid)));
  const access = Array.from(new Set([uid, ...readers, ...edit].filter(Boolean)));
  const card: Record<string, string> = { name: ownerCard.name };
  (['profileType', 'profileIcon', 'profileImage'] as const).forEach(k => { if (ownerCard[k]) card[k] = ownerCard[k] as string; });
  await updateAll(await journeyRefs(id), { access, editors: edit }, { ownerCard: card });
  registry.set(id, { ownerId: uid, access, editors: edit, publicShare: owner?.publicShare ?? false });
  // Friends who now see it, or may now edit it, hear about it (6-a)
  const before = owner || { access: [uid], editors: [] as string[] };
  access.filter(u => u !== uid).forEach(u => {
    const nowEdit = edit.includes(u);
    const wasIn = before.access.includes(u);
    const wasEdit = before.editors.includes(u);
    if (!wasIn || (nowEdit && !wasEdit)) notifyJourneyShared(u, id, titles.get(id) || '', nowEdit ? 'edit' : 'view');
  });
}

/** A friend takes themselves off a journey someone shared with them */
export async function leaveJourney(journeyId: number | string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('not signed in');
  await updateAll(await journeyRefs(journeyId), { access: arrayRemove(uid), editors: arrayRemove(uid) });
  registry.delete(String(journeyId));
}

/**
 * Account deletion: removes the journeys this member owns (with their items and trash) and
 * their personal documents. Journeys owned by others that were shared with them stay.
 */
export async function deleteOwnContent(): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  const refs: DocumentReference[] = [];
  for (const col of [...CONTENT_COLLECTIONS, 'trash'] as const) {
    const snap = await getDocs(query(collection(db, 'users', 'public', col), where('ownerId', '==', uid)));
    snap.forEach(d => refs.push(d.ref));
  }
  for (const name of ['home', 'pockets', 'map_wishlist', 'prefs', 'intro', 'notify']) refs.push(doc(db, 'users', uid, 'settings', name));
  refs.push(doc(db, 'users', uid, 'drafts', 'newTrip'), doc(db, 'users', uid, 'departure', 'tickets'));
  // Calendar, notifications, push devices and friends (v1.3.6)
  for (const sub of ['calendar_events', 'notifications', 'devices', 'friends']) {
    const snap = await getDocs(collection(db, 'users', uid, sub)).catch(() => null);
    snap?.forEach(d => refs.push(d.ref));
  }
  const invites = await getDocs(query(collection(db, 'invites'), where('from', '==', uid))).catch(() => null);
  invites?.forEach(d => refs.push(d.ref));
  for (let i = 0; i < refs.length; i += 400) {
    const batch = fsWriteBatch(db);
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}
