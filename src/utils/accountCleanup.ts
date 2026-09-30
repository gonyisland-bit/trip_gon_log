import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, type User, type UserCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Deleted members (v1.3.6). Removing a member in the manage hub deletes their profile; the sign-in
// account itself can only be removed on the server (api/account, needs a service account) or by
// the member. So an account without a profile is never brought back as an empty "ghost" member:
// the next time it signs in, it removes itself and the address is free to sign up again.

/** True when neither profile copy exists (a read error is not taken as missing) */
export async function hasNoProfile(uid: string): Promise<boolean> {
  const [root, pub] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'users', 'public', 'users', uid)),
  ]);
  return !root.exists() && !pub.exists();
}

/** Removes the signed-in account that has no profile any more (falls back to signing out) */
export async function clearOrphanAccount(user: User | null = auth.currentUser): Promise<void> {
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (err) {
    console.warn('Orphan account removal failed, signing out:', err);
    await auth.signOut().catch(() => {});
  }
}

/** Accounts made in the last few minutes may still be writing their profile */
export function isSettledAccount(user: User, minutes = 10): boolean {
  const created = Date.parse(user.metadata.creationTime || '');
  return Number.isFinite(created) && Date.now() - created > minutes * 60 * 1000;
}

/**
 * Sign-up with an address whose old account was deleted: when the entered password still opens
 * that account and it has no profile, the old account is removed and a new one made.
 * Throws the original "already in use" error otherwise.
 */
export async function createAccountReclaiming(email: string, password: string): Promise<UserCredential> {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (err?.code !== 'auth/email-already-in-use') throw err;
    const old = await signInWithEmailAndPassword(auth, email, password).catch(() => null);
    if (!old) throw err;
    if (!(await hasNoProfile(old.user.uid).catch(() => false))) {
      await auth.signOut().catch(() => {});
      throw err;
    }
    await deleteUser(old.user);
    return createUserWithEmailAndPassword(auth, email, password);
  }
}

/**
 * Operator: removes a member's sign-in account on the server. 'unavailable' when the server has
 * no service account configured (the profile is still removed and the account clears itself).
 */
export async function deleteAuthAccount(uid: string): Promise<'deleted' | 'unavailable' | 'failed'> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return 'failed';
    const res = await fetch('/api/account', {
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
