import { collection, doc, getDoc, getDocs, writeBatch, type DocumentReference } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { CONTENT_COLLECTIONS, pickHomeKeys } from './ownership';

// One-time move to own content (v1.3.6 phase 3), run by the operator account before the new
// Firestore rules are published. Safe to run again: it recomputes the same fields and only
// merges the shared personal data into the operator's own documents. Nothing is deleted.
//
//  - Journeys without an owner become the operator's; every journey is readable by the members
//    approved today (they are the operator's family accounts) and stays open to its share links.
//  - Timeline, flight, stay and transit items copy their journey's fields.
//  - The shared pockets, map wishlist, calendar and the operator's magazine / hero settings are
//    copied into the operator's own documents.

/** Birthday and phone are no longer collected (v1.3.6): clears them from every profile (operator only) */
export async function clearContactDetails(): Promise<number> {
  const snap = await getDocs(collection(db, 'users', 'public', 'users'));
  const writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  snap.forEach(d => {
    const data = d.data();
    if (!data.birthdate && !data.phone) return;
    writes.push({ ref: d.ref, data: { birthdate: '', phone: '' } });
    const uid = data.uid || d.id;
    writes.push({ ref: doc(db, 'users', uid), data: { birthdate: '', phone: '' } });
  });
  await commitInChunks(writes);
  return writes.length / 2;
}

export interface MigrationReport {
  journeys: number;
  items: number;
  trash: number;
  members: number;
  copied: string[];
}

type Fields = { ownerId: string; access: string[]; editors: string[]; publicShare: boolean };

async function commitInChunks(writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }>) {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach(w => batch.set(w.ref, w.data, { merge: true }));
    await batch.commit();
  }
}

export async function migrateToOwnContent(onProgress?: (line: string) => void): Promise<MigrationReport> {
  const operator = auth.currentUser?.uid;
  if (!operator) throw new Error('not signed in');
  const log = (line: string) => onProgress?.(line);

  // Members approved today (legacy profiles without a status count as approved)
  const usersSnap = await getDocs(collection(db, 'users', 'public', 'users'));
  const members = usersSnap.docs
    .map(d => d.data() as { uid?: string; status?: string })
    .filter(u => u.uid && (u.status === undefined || u.status === 'approved'))
    .map(u => u.uid as string);
  const readers = Array.from(new Set([operator, ...members]));
  log(`회원 ${readers.length}명을 기존 여정의 열람자로 넣습니다.`);

  const writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  const journeyFields = new Map<string, Fields>();
  let journeys = 0;
  for (const col of ['trips', 'plans'] as const) {
    const snap = await getDocs(collection(db, 'users', 'public', col));
    snap.forEach(d => {
      const data = d.data();
      const ownerId = typeof data.ownerId === 'string' && data.ownerId ? data.ownerId : operator;
      const fields: Fields = {
        ownerId,
        access: Array.from(new Set([ownerId, ...readers, ...(Array.isArray(data.access) ? data.access : [])])),
        editors: Array.isArray(data.editors) ? data.editors : [],
        publicShare: data.publicShare === false ? false : true,
      };
      journeyFields.set(d.id, fields);
      writes.push({ ref: d.ref, data: fields });
      journeys++;
    });
  }
  log(`여정 · 플랜 ${journeys}개`);

  let items = 0;
  const fallback: Fields = { ownerId: operator, access: [operator], editors: [], publicShare: false };
  for (const col of CONTENT_COLLECTIONS.filter(c => c !== 'trips' && c !== 'plans')) {
    const snap = await getDocs(collection(db, 'users', 'public', col));
    snap.forEach(d => {
      const tripId = d.data().tripId;
      const fields = journeyFields.get(String(tripId)) ?? fallback;
      writes.push({ ref: d.ref, data: { ...fields } });
      items++;
    });
  }
  log(`일정 · 항공 · 숙소 · 교통 ${items}개`);

  let trash = 0;
  const trashSnap = await getDocs(collection(db, 'users', 'public', 'trash'));
  trashSnap.forEach(d => {
    const data = d.data();
    const ownerId = typeof data.ownerId === 'string' && data.ownerId ? data.ownerId : operator;
    writes.push({ ref: d.ref, data: { ownerId, access: [ownerId], editors: [], publicShare: false } });
    trash++;
  });
  log(`휴지통 ${trash}개`);

  await commitInChunks(writes);
  log('주인 · 열람자 정보를 저장했습니다.');

  // Personal copies for the operator. The app may already have made an (empty or sample) personal
  // document before this ran, so the shared data is merged in rather than skipped.
  const copied: string[] = [];
  const read = async (ref: DocumentReference) => {
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Record<string, any>) : null;
  };
  const put = (ref: DocumentReference, data: Record<string, unknown>) => writeBatch(db).set(ref, data, { merge: true }).commit();

  const sharedPockets = await read(doc(db, 'users', 'public', 'settings', 'pockets'));
  if (Array.isArray(sharedPockets?.items) && sharedPockets!.items.length) {
    const mineRef = doc(db, 'users', operator, 'settings', 'pockets');
    const mine = await read(mineRef);
    const ids = new Set(sharedPockets!.items.map((p: any) => p?.id));
    const extra = (Array.isArray(mine?.items) ? mine!.items : [])
      .filter((p: any) => p?.id && !ids.has(p.id) && !String(p.id).startsWith('sample-spot-'));
    await put(mineRef, { items: [...sharedPockets!.items, ...extra], updatedAt: Date.now() });
    copied.push(`포켓 ${sharedPockets!.items.length + extra.length}개`);
  }

  const sharedWish = await read(doc(db, 'users', 'public', 'settings', 'map_wishlist'));
  if (sharedWish) {
    const mineRef = doc(db, 'users', operator, 'settings', 'map_wishlist');
    const mine = await read(mineRef);
    const union = (k: string) => Array.from(new Set([...(sharedWish[k] || []), ...((mine && mine[k]) || [])]));
    await put(mineRef, { countries: union('countries'), cities: union('cities'), updatedAt: new Date().toISOString() });
    copied.push('지도 위시리스트');
  }

  const sharedHome = await read(doc(db, 'users', 'public', 'settings', 'home'));
  const personalHome = sharedHome ? pickHomeKeys(sharedHome, 'personal') : {};
  if (Object.keys(personalHome).length) {
    await put(doc(db, 'users', operator, 'settings', 'home'), personalHome);
    copied.push('매거진 · 홈 히어로');
  }

  const events = await getDocs(collection(db, 'users', 'public', 'calendar_events'));
  if (!events.empty) {
    const mine = await getDocs(collection(db, 'users', operator, 'calendar_events'));
    const have = new Set(mine.docs.map(d => d.id));
    const add = events.docs.filter(e => !have.has(e.id));
    if (add.length) await commitInChunks(add.map(e => ({ ref: doc(db, 'users', operator, 'calendar_events', e.id), data: e.data() })));
    copied.push(`캘린더 일정 ${events.size}개`);
  }
  if (copied.length) log(`내 문서로 복사: ${copied.join(', ')}`);

  await writeBatch(db).set(doc(db, 'users', 'public', 'settings', 'migration'), { ownContentAt: Date.now(), by: operator }, { merge: true }).commit();
  log('이전을 마쳤습니다. 이제 새 Firestore 규칙을 게시해 주세요.');
  return { journeys, items, trash, members: readers.length, copied };
}
