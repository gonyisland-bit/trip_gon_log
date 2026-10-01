import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { SpotPocketItem } from '../types';
import { notifyPocketShared } from './notifications';

// Sharing single pockets. Each spot in my own list keeps `sharedWith` (friend uids), and
//   users/{me}/pocket_shares/{friendUid}   items: copies of only the spots shared with that friend
// is the one pocket document a friend can read. The copies follow every save of my pockets.
// Before this, a member showed the whole list (users/{uid}/settings/pockets.sharedWith); that
// list is moved onto every spot once, then cleared.

let owner: string | null = null;
let known: Set<string> | null = null;           // friends who have a share document now
const written = new Map<string, string>();       // friend → last written copy, to skip repeats
let timer: number | undefined;
let pending: SpotPocketItem[] | null = null;

function reset(uid: string) {
  if (owner === uid) return;
  owner = uid;
  known = null;
  written.clear();
}

/** What a friend receives: the place itself, without my likes, comments, order or sharing */
function shareCopy(s: SpotPocketItem): SpotPocketItem {
  const { sharedWith: _s, likes: _l, likedBy: _b, comments: _c, order: _o, tripId: _t, isFavorite: _f, ...rest } = s;
  return JSON.parse(JSON.stringify(rest));
}

async function flush() {
  const items = pending;
  pending = null;
  const uid = auth.currentUser?.uid;
  if (!items || !uid) return;
  reset(uid);
  const col = collection(db, 'users', uid, 'pocket_shares');
  if (!known) known = new Set((await getDocs(col)).docs.map(d => d.id));
  // Nothing shared before or now: no writes, no friend lookup
  if (!known.size && !items.some(s => s.sharedWith?.length)) return;
  // Only current friends: a spot may still name someone I am no longer friends with
  const friends = new Set((await getDocs(collection(db, 'users', uid, 'friends'))).docs.map(d => d.id));

  const byFriend = new Map<string, SpotPocketItem[]>();
  for (const s of items) {
    for (const f of s.sharedWith || []) {
      if (!friends.has(f)) continue;
      if (!byFriend.has(f)) byFriend.set(f, []);
      byFriend.get(f)!.push(shareCopy(s));
    }
  }
  for (const [f, list] of byFriend) {
    const json = JSON.stringify(list);
    if (written.get(f) === json && known.has(f)) continue;
    await setDoc(doc(col, f), { items: list, updatedAt: Date.now() });
    written.set(f, json);
    if (!known.has(f)) notifyPocketShared(f);
    known.add(f);
  }
  for (const f of [...known]) {
    if (byFriend.has(f)) continue;
    await deleteDoc(doc(col, f));
    known.delete(f);
    written.delete(f);
  }
}

/** Brings the friends' copies in line with my pockets (coalesces quick saves) */
export function syncPocketShares(items: SpotPocketItem[]) {
  if (!auth.currentUser) return;
  pending = items;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { flush().catch(err => console.warn('[pocketShares] sync failed:', err)); }, 600);
}

/** The old whole-list sharing moved onto each spot */
export function withLegacyShares(items: SpotPocketItem[], legacy: string[]): SpotPocketItem[] {
  return items.map(s => ({ ...s, sharedWith: Array.from(new Set([...(s.sharedWith || []), ...legacy])) }));
}

/** The spots a friend shares with me, or null when they share none */
export async function friendSharedSpots(friendUid: string): Promise<SpotPocketItem[] | null> {
  const me = auth.currentUser?.uid;
  if (!me) return null;
  try {
    const snap = await getDoc(doc(db, 'users', friendUid, 'pocket_shares', me));
    if (snap.exists()) {
      const items = snap.data().items;
      if (Array.isArray(items) && items.length) return items;
    }
  } catch { /* not shared with me */ }
  // A friend who has not opened the new version yet still shows the whole list the old way
  try {
    const snap = await getDoc(doc(db, 'users', friendUid, 'settings', 'pockets'));
    const items = snap.exists() ? snap.data().items : null;
    return Array.isArray(items) && items.length ? items : null;
  } catch {
    return null;
  }
}
