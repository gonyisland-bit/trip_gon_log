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
}

export const EMPTY_NOTICE: SiteNotice = { on: false, level: 'info', message: '' };
const ref = () => doc(db, 'users', 'public', 'settings', 'notice');

export function subscribeNotice(onChange: (n: SiteNotice) => void): () => void {
  return onSnapshot(ref(), snap => {
    onChange(snap.exists() ? { ...EMPTY_NOTICE, ...(snap.data() as SiteNotice) } : EMPTY_NOTICE);
  }, () => onChange(EMPTY_NOTICE));
}

export async function saveNotice(n: SiteNotice): Promise<void> {
  await setDoc(ref(), { ...n, message: n.message.trim().slice(0, 200), updatedAt: Date.now() });
}

/** Whether a notice should show right now */
export function noticeLive(n: SiteNotice): boolean {
  return n.on && Boolean(n.message.trim()) && (!n.until || n.until > Date.now());
}
