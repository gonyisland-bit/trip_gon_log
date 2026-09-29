import React, { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { openIntro } from '../../intro/openIntro';

// One hint after the first sign-in: watch the intro. Seen or dismissed is kept in
// Firestore (users/{uid}/settings/intro) so it does not come back on another device.

export function IntroTip() {
  const uid = auth.currentUser?.uid;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, 'users', uid, 'settings', 'intro'))
      .then(snap => { if (alive && !snap.exists()) setShow(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, [uid]);

  if (!show || !uid) return null;

  const done = (watched: boolean) => {
    setShow(false);
    setDoc(doc(db, 'users', uid, 'settings', 'intro'), { seenAt: Date.now(), watched }, { merge: true }).catch(() => {});
    if (watched) openIntro();
  };

  return (
    <div
      role="status"
      className="fixed z-float right-4 sm:right-6 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-[#181818] text-black dark:text-white border border-black/20 dark:border-white/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-micro uppercase tracking-widest text-red-600 dark:text-red-400">Intro</span>
          <p className="mt-1 text-sm font-bold leading-snug break-keep">트립곤을 48초 영상으로 둘러보세요</p>
        </div>
        <button type="button" onClick={() => done(false)} className="tap-target -mr-1 -mt-1 p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white" aria-label="닫기">
          <X className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => done(true)}
        className="tgl-press mt-3 h-9 px-3 inline-flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors text-xs font-bold"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        소개 영상 보기
      </button>
    </div>
  );
}
