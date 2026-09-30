import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, type User, type UserCredential } from 'firebase/auth';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { apiUrl } from './apiBase';

// Deleted members (v1.3.6). Removing a member in the manage hub deletes their profile; the sign-in
// account itself can only be removed on the server (api/account, needs a service account) or by
// the member. So an account without a profile is never brought back as an empty "ghost" member:
// the next time it signs in, it removes itself and the address is free to sign up again.

/**
 * A profile document left behind with no identity in it (older builds wrote only lastActiveAt
 * into a deleted member's shared profile). It counts as no profile at all.
 */
export function isGhostProfile(data: Record<string, any> | undefined | null): boolean {
  if (!data) return true;
  return !data.email && !data.username && !data.lastName && !data.firstName;
}

function profileRefs(uid: string) {
  return [doc(db, 'users', uid), doc(db, 'users', 'public', 'users', uid)];
}

/** True when neither profile copy exists or both are ghosts (a read error is not taken as missing) */
export async function hasNoProfile(uid: string): Promise<boolean> {
  const snaps = await Promise.all(profileRefs(uid).map(r => getDoc(r)));
  return snaps.every(s => !s.exists() || isGhostProfile(s.data()));
}

/** Removes the signed-in account that has no profile any more, and its ghost documents */
export async function clearOrphanAccount(user: User | null = auth.currentUser): Promise<void> {
  if (!user) return;
  await Promise.allSettled(profileRefs(user.uid).map(r => deleteDoc(r)));
  try {
    await deleteUser(user);
  } catch (err) {
    console.warn('Orphan account removal failed, signing out:', err);
  }
  // Never stay signed in as an account without a profile
  if (auth.currentUser) await auth.signOut().catch(() => {});
}

/** Accounts made in the last few minutes may still be writing their profile */
export function isSettledAccount(user: User, minutes = 10): boolean {
  const created = Date.parse(user.metadata.creationTime || '');
  return Number.isFinite(created) && Date.now() - created > minutes * 60 * 1000;
}

/** Thrown when the address still has a sign-in account this sign-up cannot clear */
export const LEFTOVER_ACCOUNT = 'tgl/leftover-account';

/**
 * Sign-up with an address whose old account was deleted: when the entered password still opens
 * that account and it has no profile, the old account is removed and a new one made. Whatever
 * fails on the way, the old account is signed out again, so sign-up never ends half signed in.
 */
export async function createAccountReclaiming(email: string, password: string): Promise<UserCredential> {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (err?.code !== 'auth/email-already-in-use') throw err;
  }
  const old = await signInWithEmailAndPassword(auth, email, password).catch(() => null);
  // The password does not open it: either a live account or a deleted one with another password
  if (!old) throw Object.assign(new Error('address in use'), { code: LEFTOVER_ACCOUNT });
  try {
    if (!(await hasNoProfile(old.user.uid))) {
      throw Object.assign(new Error('address in use'), { code: 'auth/email-already-in-use' });
    }
    await Promise.allSettled(profileRefs(old.user.uid).map(r => deleteDoc(r)));
    await deleteUser(old.user);
  } catch (err) {
    if (auth.currentUser) await auth.signOut().catch(() => {});
    throw err;
  }
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Operator: removes a member's sign-in account on the server. 'unavailable' when the server has
 * no service account configured (the profile is still removed and the account clears itself).
 */
export async function deleteAuthAccount(uid: string): Promise<'deleted' | 'unavailable' | 'failed'> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return 'failed';
    const res = await fetch(apiUrl('/api/account'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete', uid }),
    });
    if (res.ok) return 'deleted';
    return res.status === 501 || res.status === 404 ? 'unavailable' : 'failed';
  } catch {
    return 'unavailable';
  }
}

/** Operator: marks a member's address verified on the server (needs the service account) */
export async function verifyAuthAccount(uid: string): Promise<'verified' | 'unavailable' | 'failed'> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return 'failed';
    const res = await fetch(apiUrl('/api/account'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'verify', uid }),
    });
    if (res.ok) return 'verified';
    return res.status === 501 || res.status === 404 ? 'unavailable' : 'failed';
  } catch {
    return 'unavailable';
  }
}
