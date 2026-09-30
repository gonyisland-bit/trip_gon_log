import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// In-app notifications (v1.3.6 6-a). A friend's action writes a notification into the other
// member's users/{uid}/notifications; the rules let only friends create them. The receiver reads,
// marks and removes their own. Push delivery to devices (6-b) follows the same documents.

export type NotificationKind = 'friend_joined' | 'journey_shared' | 'journey_edited' | 'pocket_shared';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  from: string;
  fromName: string;
  profileType?: 'icon' | 'image';
  profileIcon?: string;
  profileImage?: string;
  tripId?: number;
  title?: string;
  role?: 'view' | 'edit';
  createdAt: number;
  read: boolean;
}

/** Who I am in a notification: name and picture, set once the profile is known */
export interface Sender {
  uid: string;
  name: string;
  profileType?: 'icon' | 'image';
  profileIcon?: string;
  profileImage?: string;
}

let sender: Sender | null = null;
export function setNotificationSender(me: Sender | null) { sender = me; }

const KEEP_DAYS = 90;
const EDIT_GAP_MS = 60 * 60 * 1000;

function senderFields(me: Sender) {
  const f: Record<string, unknown> = { from: me.uid, fromName: me.name };
  if (me.profileType) f.profileType = me.profileType;
  if (me.profileIcon) f.profileIcon = me.profileIcon;
  if (me.profileImage) f.profileImage = me.profileImage;
  return f;
}

/** Writes one notification; never throws (a missing friendship just means nothing is sent) */
async function send(to: string, id: string, data: Record<string, unknown>): Promise<void> {
  const me = sender;
  if (!me || !to || to === me.uid || to === 'public') return;
  try {
    await setDoc(doc(db, 'users', to, 'notifications', id), { ...senderFields(me), ...data, createdAt: Date.now(), read: false });
    // Then the friend's devices (6-b); loaded on demand so messaging stays out of the first bundle
    import('./push').then(m => m.pushNotification(to, id)).catch(() => {});
  } catch (err) {
    console.warn('Notification not sent:', err);
  }
}

export function notifyFriendJoined(to: string) {
  return send(to, `friend_${sender?.uid}`, { kind: 'friend_joined' });
}

export function notifyJourneyShared(to: string, tripId: number | string, title: string, role: 'view' | 'edit') {
  return send(to, `share_${tripId}_${sender?.uid}`, { kind: 'journey_shared', tripId: Number(tripId), title, role });
}

export function notifyPocketShared(to: string) {
  return send(to, `pocket_${sender?.uid}`, { kind: 'pocket_shared' });
}

// Edits to a journey edited together: one notification per journey and person, at most hourly
const lastEdit = new Map<string, number>();
export function notifyJourneyEdited(people: string[], tripId: number | string, title: string) {
  const me = sender;
  if (!me) return;
  const key = String(tripId);
  const now = Date.now();
  if (now - (lastEdit.get(key) || 0) < EDIT_GAP_MS) return;
  lastEdit.set(key, now);
  people.filter(u => u && u !== me.uid).forEach(u => {
    send(u, `edit_${tripId}_${me.uid}`, { kind: 'journey_edited', tripId: Number(tripId), title });
  });
}

// ── Receiving ──
export function subscribeNotifications(onChange: (list: AppNotification[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) { onChange([]); return () => {}; }
  const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(60));
  return onSnapshot(q, snap => {
    const list: AppNotification[] = [];
    snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
    onChange(list);
  }, err => {
    console.warn('Notifications subscription notice:', err);
    onChange([]);
  });
}

export async function markRead(ids: string[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !ids.length) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, 'users', uid, 'notifications', id), { read: true }));
  await batch.commit();
}

/** Removes notifications older than 90 days */
export async function pruneOld(list: AppNotification[]): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  await Promise.allSettled(list.filter(n => n.createdAt < cutoff).map(n => deleteDoc(doc(db, 'users', uid, 'notifications', n.id))));
}

export function notificationText(n: AppNotification): string {
  switch (n.kind) {
    case 'friend_joined': return `${n.fromName}님과 친구가 되었습니다.`;
    case 'journey_shared': return `${n.fromName}님이 '${n.title || '여정'}'을(를) ${n.role === 'edit' ? '함께 편집하도록' : '볼 수 있게'} 공유했습니다.`;
    case 'journey_edited': return `${n.fromName}님이 '${n.title || '여정'}'을(를) 고쳤습니다.`;
    case 'pocket_shared': return `${n.fromName}님이 포켓을 보여 줍니다.`;
    default: return `${n.fromName}님의 소식`;
  }
}
