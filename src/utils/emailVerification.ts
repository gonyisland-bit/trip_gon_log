import { sendEmailVerification, type User } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Sign-up without an admin (v1.3.6): a new member confirms their own email through Firebase's
// built-in verification link. Once the address is verified the Firestore rules let them write,
// and the member flips their own profile from 'pending' to 'approved' (the rules allow only that
// one change, and only with a verified token).

const RESEND_KEY = 'tgl_verify_sent_at';
export const RESEND_GAP_MS = 60 * 1000;

/** Milliseconds until another verification mail may be sent from this device */
export function resendWait(): number {
  try {
    const at = Number(localStorage.getItem(RESEND_KEY) || 0);
    return Math.max(0, at + RESEND_GAP_MS - Date.now());
  } catch {
    return 0;
  }
}

/** Sends the verification link; the link returns to the app with ?verified=1 */
export async function sendVerificationMail(user: User | null = auth.currentUser): Promise<void> {
  if (!user) throw new Error('not signed in');
  try {
    await sendEmailVerification(user, { url: `${window.location.origin}/?verified=1` });
  } catch (err: any) {
    console.warn('Verification mail with return link failed:', err?.code, err);
    // Sending too often is not fixed by trying again now
    if (err?.code === 'auth/too-many-requests' || err?.code === 'auth/network-request-failed') throw err;
    // Anything about the return link (domain not in Firebase's authorized list, and so on):
    // send the plain link instead
    try {
      await sendEmailVerification(user);
    } catch (plainErr: any) {
      console.warn('Plain verification mail failed:', plainErr?.code, plainErr);
      throw plainErr;
    }
  }
  try { localStorage.setItem(RESEND_KEY, String(Date.now())); } catch {}
}

/**
 * Re-reads the account; when the email is verified, refreshes the token (so the rules see it)
 * and marks the profile approved. Returns whether the email is verified.
 */
export async function completeVerification(profileStatus?: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  if (!auth.currentUser?.emailVerified) return false;
  await user.getIdToken(true);
  if (profileStatus === 'pending') {
    const patch = { status: 'approved', approvedAt: Date.now(), emailVerifiedAt: Date.now() };
    await Promise.allSettled([
      updateDoc(doc(db, 'users', user.uid), patch),
      setDoc(doc(db, 'users', 'public', 'users', user.uid), patch, { merge: true }),
    ]);
  }
  return true;
}

export function friendlyMailError(err: any): string {
  if (err?.code === 'auth/too-many-requests') return '메일을 짧은 시간에 여러 번 보내 Firebase가 잠시 막았습니다. 30분쯤 뒤에 다시 보내기를 눌러 주세요.';
  if (err?.code === 'auth/network-request-failed') return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  if (err?.code === 'auth/user-token-expired' || err?.code === 'auth/user-not-found') return '로그인이 끝났습니다. 다시 로그인한 뒤 인증 메일을 보내 주세요.';
  // Unknown causes carry their code so they can be looked up
  return `인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.${err?.code ? ` (${err.code})` : ''}`;
}
