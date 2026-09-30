import { collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { currentUid, journeyItems, ownershipOf, setDoc, setJourneyPeople, writeBatch } from './ownership';
import type { PersonCard } from './friends';

// Journey members ↔ friends (v1.3.6 5-c). A journey's members stay a list of names (settlement
// and "paid by" use them); memberLinks adds which friend account a name stands for. Linking a
// friend shares the journey with them to view (the owner can raise it to edit in the share sheet).

export interface MemberLink { name: string; uid: string }

/** Saves the links and gives every linked friend at least view access */
export async function shareWithMembers(journeyId: number | string, isPlan: boolean, links: MemberLink[], me: PersonCard): Promise<void> {
  const id = String(journeyId);
  await setDoc(doc(db, 'users', 'public', isPlan ? 'plans' : 'trips', id), { memberLinks: links }, { merge: true });
  const own = ownershipOf(id);
  const access = own?.access || [me.uid];
  const fresh = links.map(l => l.uid).filter(u => u && !access.includes(u));
  if (!fresh.length) return;
  await setJourneyPeople(id, [...access, ...fresh], own?.editors || [], me);
}

/** New trips: members added from the friend list are linked by their exact (unique) name */
export async function linkFriendMembersByName(journeyId: number | string, isPlan: boolean, members: string[], me: PersonCard): Promise<void> {
  const uid = currentUid();
  if (!uid || !members.length) return;
  const snap = await getDocs(collection(db, 'users', uid, 'friends'));
  const byName = new Map<string, string[]>();
  snap.forEach(d => {
    const name = String(d.data().name || '');
    if (name) byName.set(name, [...(byName.get(name) || []), d.id]);
  });
  const links = members
    .map(name => ({ name, uids: byName.get(name) || [] }))
    .filter(m => m.uids.length === 1)
    .map(m => ({ name: m.name, uid: m.uids[0] }));
  if (links.length) await shareWithMembers(journeyId, isPlan, links, me);
}

/** A renamed member keeps what they paid: "paid by" on the journey's items follows the new name */
export async function renameMembersInItems(journeyId: number | string, renames: Record<string, string>): Promise<void> {
  const olds = Object.keys(renames).filter(o => renames[o] && renames[o] !== o);
  if (!olds.length) return;
  const batch = writeBatch(db);
  let n = 0;
  for (const col of ['timeline', 'flights', 'stays', 'transits'] as const) {
    const snap = await getDocs(journeyItems(col, journeyId));
    snap.forEach(d => {
      const paidBy = d.data().paidBy;
      if (typeof paidBy === 'string' && olds.includes(paidBy)) {
        batch.update(d.ref, { paidBy: renames[paidBy] });
        n++;
      }
    });
  }
  if (n) await batch.commit();
}
