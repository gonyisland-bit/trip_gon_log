// A new trip in progress, kept in Firestore (users/{uid}/drafts/newTrip) so it can be finished
// on another device (v1.3.5 P3-b). localStorage is only the instant cache for this device.
// Removed when the trip is created or the person starts over.
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import type { StayLength } from './useNewTripDraft';

export interface SavedNewTripDraft {
  step: 0 | 1 | 2 | 3;
  /** DestinationCity.nameEn */
  city?: string;
  /** DestinationCountry.nameEn */
  country?: string;
  stay: StayLength;
  startDate: string;
  members: string[];
  theme: string;
  includePockets: boolean;
  pocketIds: string[];
  updatedAt: number;
}

const CACHE_KEY = 'new_trip_draft';
/** Older drafts are not offered: the dates in them have usually passed */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const ref = (uid: string) => doc(db, 'users', uid, 'drafts', 'newTrip');

function fresh(d: SavedNewTripDraft | null): SavedNewTripDraft | null {
  if (!d || typeof d.updatedAt !== 'number' || Date.now() - d.updatedAt > MAX_AGE_MS) return null;
  if (!d.city && !d.country) return null;
  return d;
}

function readCache(): SavedNewTripDraft | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** The cached draft right away, then the cloud copy when it is newer */
export async function loadNewTripDraft(onCached?: (d: SavedNewTripDraft) => void): Promise<SavedNewTripDraft | null> {
  const cached = fresh(readCache());
  if (cached) onCached?.(cached);
  const uid = auth.currentUser?.uid;
  if (!uid) return cached;
  try {
    const snap = await getDoc(ref(uid));
    const cloud = fresh(snap.exists() ? (snap.data() as SavedNewTripDraft) : null);
    if (!cloud) return cached;
    return !cached || cloud.updatedAt >= cached.updatedAt ? cloud : cached;
  } catch {
    return cached;
  }
}

let timer = 0;
/** Saved a moment after the last change so typing does not write on every key */
export function saveNewTripDraft(d: Omit<SavedNewTripDraft, 'updatedAt'>) {
  const full: SavedNewTripDraft = { ...d, updatedAt: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(full)); } catch {}
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Firestore rejects undefined fields
    const clean = Object.fromEntries(Object.entries(full).filter(([, v]) => v !== undefined));
    setDoc(ref(uid), clean).catch(() => {});
  }, 800);
}

export function clearNewTripDraft() {
  window.clearTimeout(timer);
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  const uid = auth.currentUser?.uid;
  if (uid) deleteDoc(ref(uid)).catch(() => {});
}
