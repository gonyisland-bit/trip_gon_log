import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { auth } from '../firebase';
import { subscribeNotice, type WelcomeNotice } from '../utils/notice';
import { loadUserPrefs, saveUserPref } from '../utils/userPrefs';

// Welcome line for new members: shown under the site notice to accounts younger than the
// operator's day count, until the member closes it. Closing is saved in the account's prefs, so
// it stays closed on every device; a new message from the operator shows once more. It is also kept on
// this device, so a slow or failed read of the prefs (offline, a new session) never brings it back.

const DAY = 86400000;
const localKey = (uid: string) => `tgl_welcome_seen_${uid}`;
const readLocal = (uid: string): number | null => {
  try { const v = localStorage.getItem(localKey(uid)); return v === null ? null : Number(v); } catch { return null; }
};

export function WelcomeBanner({ name }: { name: string }) {
  const [w, setW] = useState<WelcomeNotice | null>(null);
  const [seen, setSeen] = useState<number | null | undefined>(undefined); // undefined while loading
  const uid = auth.currentUser?.uid;

  useEffect(() => subscribeNotice(n => setW(n.welcome || null)), []);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    setSeen(undefined);
    loadUserPrefs(uid).then(p => {
      if (!alive) return;
      // Either place saying "closed" is enough; the larger version is the later close
      const cloud = p.welcomeSeen ?? null;
      const local = readLocal(uid);
      setSeen(cloud === null ? local : local === null ? cloud : Math.max(cloud, local));
    });
    return () => { alive = false; };
  }, [uid]);

  if (!uid || !w?.on || !w.message.trim() || seen === undefined) return null;
  const version = w.updatedAt || 0;
  if (seen === version) return null;
  const created = Date.parse(auth.currentUser?.metadata.creationTime || '');
  if (!created || Date.now() - created > (w.days || 7) * DAY) return null;

  const close = () => {
    setSeen(version);
    try { localStorage.setItem(localKey(uid), String(version)); } catch { /* the account copy still holds */ }
    saveUserPref({ welcomeSeen: version });
  };
  const text = w.message.replace(/\{name\}/g, name || '여행자');

  return (
    <div role="status" className="w-full px-4 py-2 flex items-center justify-center gap-2.5 text-[13px] font-bold bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach">
      <span className="font-mono text-micro font-bold tracking-[0.14em] opacity-80 shrink-0">WELCOME</span>
      <span className="min-w-0 break-keep text-center">{text}</span>
      <button type="button" onClick={close} aria-label="환영 공지 닫기" className="w-7 h-7 rounded-full grid place-items-center shrink-0 hover:bg-black/10">
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}
