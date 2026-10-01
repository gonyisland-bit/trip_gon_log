// Page backdrop (v1.3.7): each member picks one of a few soft gradients for their hubs, or plain
// paper. Templates only (no custom colors), built from the hub tints so every pick stays on brand.
// Saved with the viewer prefs (prefs.backdrop); localStorage keeps the old gradient keys as the cache.
import { useEffect, useState } from 'react';
import { saveUserPref } from './userPrefs';

export interface Backdrop { id: string; label: string; from?: string; to?: string }

export const BACKDROPS: Backdrop[] = [
  { id: 'paper', label: '종이' },
  { id: 'peach', label: '피치', from: '#FBE4D6', to: '#F6F4EF' },
  { id: 'butter', label: '버터', from: '#FBF0C6', to: '#F6F4EF' },
  { id: 'sage', label: '세이지', from: '#E2EBD9', to: '#F6F4EF' },
  { id: 'mist', label: '미스트', from: '#E4EAEF', to: '#F6F4EF' },
  { id: 'lilac', label: '라일락', from: '#F0E6F8', to: '#F6F4EF' },
  { id: 'sunset', label: '노을', from: '#FBE4D6', to: '#EFE3F6' },
];

const KEY = 'tgl_backdrop';
export const BACKDROP_EVENT = 'tgl:backdrop';

export function readBackdrop(): Backdrop {
  try {
    const id = localStorage.getItem(KEY);
    const found = BACKDROPS.find(b => b.id === id);
    if (found) return found;
  } catch { /* cache only */ }
  return BACKDROPS[0];
}

/** Applies on this device (and, with `save`, on the account) */
export function applyBackdrop(id: string, save = true) {
  const b = BACKDROPS.find(x => x.id === id) || BACKDROPS[0];
  try {
    localStorage.setItem(KEY, b.id);
    localStorage.setItem('home_gradient_enabled', String(Boolean(b.from)));
    if (b.from) { localStorage.setItem('home_gradient_from', b.from); localStorage.setItem('home_gradient_to', b.to || b.from); }
  } catch { /* cache only */ }
  window.dispatchEvent(new CustomEvent(BACKDROP_EVENT, { detail: b }));
  if (save) saveUserPref({ backdrop: b.id });
}

export function useBackdrop(): Backdrop {
  const [b, setB] = useState<Backdrop>(readBackdrop);
  useEffect(() => {
    const on = (e: Event) => setB((e as CustomEvent<Backdrop>).detail || readBackdrop());
    window.addEventListener(BACKDROP_EVENT, on);
    return () => window.removeEventListener(BACKDROP_EVENT, on);
  }, []);
  return b;
}
