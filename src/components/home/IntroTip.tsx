import React, { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { openIntro, prefetchIntro } from '../../intro/openIntro';

// One hint after the first sign-in: watch the intro. It springs in as a pill whose red ring
// counts down, then folds into a round play button that breathes above the TOP button.
// Seen or dismissed is kept in Firestore (users/{uid}/settings/intro) for every device.

const APPEAR_MS = 1200;
const OPEN_MS = 8000;

export function IntroTip() {
  const uid = auth.currentUser?.uid;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    let appear: ReturnType<typeof setTimeout> | null = null;
    getDoc(doc(db, 'users', uid, 'settings', 'intro'))
      .then(snap => {
        if (!alive || snap.exists()) return;
        appear = setTimeout(() => { if (alive) { setShow(true); prefetchIntro(); } }, APPEAR_MS);
      })
      .catch(() => {});
    return () => { alive = false; if (appear) clearTimeout(appear); };
  }, [uid]);

  if (!show || !uid) return null;

  const done = (watched: boolean) => {
    setShow(false);
    setDoc(doc(db, 'users', uid, 'settings', 'intro'), { seenAt: Date.now(), watched }, { merge: true }).catch(() => {});
    if (watched) openIntro();
  };
  return <IntroTipView onWatch={() => done(true)} onDismiss={() => done(false)} />;
}

/** The pill itself, separate from the Firestore check so it can be previewed */
export function IntroTipView({ onWatch, onDismiss }: { onWatch: () => void; onDismiss: () => void }) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), OPEN_MS);
    return () => clearTimeout(id);
  }, []);
  const expanded = open || hover;

  return (
    <div
      className="tgl-introtip fixed z-float right-4 sm:right-6 flex items-center"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }}
      onPointerLeave={() => setHover(false)}
    >
      <div
        className={`tgl-introtip-pill flex items-center h-12 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-[padding] duration-emph ease-emphasized ${expanded ? 'pl-2' : 'pl-0'}`}
      >
        {/* Label and dismiss: folds away after the countdown */}
        <div
          className={`flex items-center overflow-hidden transition-[max-width,opacity] duration-emph ease-emphasized ${expanded ? 'max-w-[15rem] opacity-100' : 'max-w-0 opacity-0'}`}
          aria-hidden={!expanded}
        >
          <button
            type="button"
            onClick={onDismiss}
            tabIndex={expanded ? 0 : -1}
            className="tap-target w-8 h-8 shrink-0 grid place-items-center rounded-full text-white/60 hover:text-white dark:text-black/60 dark:hover:text-black"
            aria-label="안내 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onWatch}
            tabIndex={expanded ? 0 : -1}
            className="flex flex-col items-start pl-1 pr-3 whitespace-nowrap text-left"
          >
            <span className="text-sm font-bold leading-tight tgl-introtip-line">트립곤 둘러보기</span>
            <span className="font-mono text-micro uppercase tracking-widest text-white/60 dark:text-black/60 leading-tight tgl-introtip-line" style={{ animationDelay: '330ms' }}>Intro · 0:49</span>
          </button>
        </div>

        {/* Badge: the film's three shapes take turns inside a red countdown ring */}
        <button
          type="button"
          onClick={onWatch}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          className={`relative w-12 h-12 shrink-0 rounded-full grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${expanded ? '' : 'tgl-introtip-breathe'}`}
          aria-label="소개 영상 보기"
        >
          <svg className="absolute inset-1 w-10 h-10 -rotate-90" viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
            <circle
              cx="20" cy="20" r="18" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"
              strokeDasharray="113.1" className="tgl-introtip-ring" style={{ animationDuration: `${OPEN_MS}ms` }}
            />
          </svg>
          <span className="tgl-introtip-shapes relative w-4 h-4" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-red-500" />
            <span className="absolute inset-y-0 left-[5px] w-1.5 rounded-full bg-blue-500" />
            <span className="absolute inset-[1px] bg-emerald-500" />
            <Play className="absolute inset-0 w-4 h-4 fill-current translate-x-[1px]" />
          </span>
        </button>
      </div>
    </div>
  );
}
