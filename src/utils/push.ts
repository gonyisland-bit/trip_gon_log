import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { app, auth, db } from '../firebase';
import type { NotificationKind } from './notifications';

// Web push (v1.3.6 6-b). This device's FCM token lives in users/{uid}/devices/{token}; api/push
// sends a friend's notification to every device listed there. Kinds a member mutes are kept in
// users/{uid}/settings/notify and skipped by the server (the in-app list still shows them).

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;
const TOKEN_KEY = 'tgl_push_token';

export type PushState = 'unsupported' | 'unconfigured' | 'needs-install' | 'blocked' | 'off' | 'on';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

function savedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function pushState(): Promise<PushState> {
  // iOS gives web push only to a site added to the home screen
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported().catch(() => false))) return 'unsupported';
  if (!VAPID_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && savedToken() ? 'on' : 'off';
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

/** Asks for permission, then registers this device's token for the signed-in member */
export async function enablePush(): Promise<PushState> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 'off';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: await registration() });
  if (!token) return 'off';
  await setDoc(doc(db, 'users', uid, 'devices', token), {
    createdAt: Date.now(),
    platform: isIOS() ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'web',
    agent: navigator.userAgent.slice(0, 200),
  });
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const uid = auth.currentUser?.uid;
  const token = savedToken();
  if (uid && token) await deleteDoc(doc(db, 'users', uid, 'devices', token)).catch(() => {});
  await deleteToken(getMessaging(app)).catch(() => {});
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  return 'off';
}

/** Signing out stops pushes to this device for that account */
export async function forgetDevice(): Promise<void> {
  if (savedToken()) await disablePush().catch(() => {});
}

// ── Muted kinds ──
export function subscribeMuted(onChange: (kinds: NotificationKind[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) { onChange([]); return () => {}; }
  return onSnapshot(doc(db, 'users', uid, 'settings', 'notify'), snap => {
    const m = snap.exists() ? snap.data().muted : null;
    onChange(Array.isArray(m) ? m : []);
  }, () => onChange([]));
}

export async function setMuted(kinds: NotificationKind[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(db, 'users', uid, 'settings', 'notify'), { muted: kinds }, { merge: true });
}

/** Asks the server to push a notification just written for a friend (never throws) */
export async function pushNotification(to: string, id: string): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, id }),
    });
  } catch { /* the in-app notification is already there */ }
}
