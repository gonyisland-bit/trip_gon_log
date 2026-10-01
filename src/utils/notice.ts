// Site notice (v1.3.7): one line the operator puts above every page, for everyone (signed in or
// not). "maintenance" is the loud one for planned downtime and cannot be dismissed; "info" can be
// closed for the session. Stored in users/public/settings/notice (anyone reads, the operator writes).
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SiteNotice {
  on: boolean;
  level: 'info' | 'maintenance';
  message: string;
  /** Hide on its own after this time (ms); 0 or missing keeps it up */
  until?: number;
  updatedAt?: number;
  /** Welcome line for members who signed up within `days` (saved with saveWelcome) */
  welcome?: WelcomeNotice;
}

// Welcome notice: shown on its own to members whose account is younger than `days`, until they
// close it (remembered per account in prefs.welcomeSeen). {name} becomes the member's name.
export interface WelcomeNotice {
  on: boolean;
  message: string;
  days: number;
  updatedAt?: number;
}

export const WELCOME_DAYS = [1, 3, 7, 14, 30];
export const DEFAULT_WELCOME: WelcomeNotice = {
  on: false,
  message: '{name}님, Tripgon에 오신 걸 환영해요. 아래 + 버튼으로 첫 여행을 만들어 보세요.',
  days: 7,
};

export const EMPTY_NOTICE: SiteNotice = { on: false, level: 'info', message: '' };
const ref = () => doc(db, 'users', 'public', 'settings', 'notice');

export function subscribeNotice(onChange: (n: SiteNotice) => void): () => void {
  return onSnapshot(ref(), snap => {
    onChange(snap.exists() ? { ...EMPTY_NOTICE, ...(snap.data() as SiteNotice) } : EMPTY_NOTICE);
  }, () => onChange(EMPTY_NOTICE));
}

export async function saveNotice(n: SiteNotice): Promise<void> {
  const { welcome: _w, ...rest } = n;
  // Merge, so the welcome notice saved beside it stays
  await setDoc(ref(), { ...rest, until: rest.until || 0, message: rest.message.trim().slice(0, 200), updatedAt: Date.now() }, { merge: true });
}

export async function saveWelcome(w: WelcomeNotice): Promise<void> {
  await setDoc(ref(), { welcome: { on: w.on, days: w.days, message: w.message.trim().slice(0, 200), updatedAt: Date.now() } }, { merge: true });
}

/** Whether a notice should show right now */
export function noticeLive(n: SiteNotice): boolean {
  return n.on && Boolean(n.message.trim()) && (!n.until || n.until > Date.now());
}
