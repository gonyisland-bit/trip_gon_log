import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Plane } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const EMPHASIZED = 'cubic-bezier(.16,1,.3,1)';
// When the logo, the red flight line and the plane have all arrived (see .tgl-splash-* in index.html)
const PLAY_MS = 1250;

// Short splash: the logotype rises, a red flight line draws under it with a plane crossing,
// then the logo shrinks into the header logo slot ([data-brand-logo]).
// The first one is painted by index.html (#boot-splash) before any JS runs; this component takes it
// over at the same point of its CSS timeline, so the animation never restarts or stalls while the app boots.
// Everything moves with CSS/WAAPI transforms and opacity, which run off the main thread.
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const finishedRef = useRef(false);
  const handedOffRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationsRef = useRef<Animation[]>([]);

  // Time already played by the boot splash (0 when replayed from the logo)
  const [elapsed] = useState(() => {
    const boot = document.getElementById('boot-splash');
    if (!boot || getComputedStyle(boot).display === 'none') return 0;
    return Math.min(PLAY_MS, Math.round(performance.now()));
  });

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  }, [onFinish]);

  const run = (el: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    if (!el || typeof (el as HTMLElement).animate !== 'function') return null;
    const a = (el as HTMLElement).animate(frames, { fill: 'forwards', ...options });
    animationsRef.current.push(a);
    return a;
  };

  // Shrink the logo into the visible header logo; fall back to a fade when there is no header (landing view)
  const handoff = useCallback((reduced: boolean) => {
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    const root = rootRef.current;
    const logo = logoRef.current;
    if (!root || !logo) return finish();

    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-brand-logo]'))
      .find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

    run(root.querySelector('.tgl-splash-track'), [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });

    if (target && !reduced) {
      const from = logo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      run(root, [{ backgroundColor: getComputedStyle(root).backgroundColor }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 420, delay: 100 });
      const move = run(logo, [
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ], { duration: 560, easing: EMPHASIZED });
      if (move) move.onfinish = () => finish();
      else finish();
      return;
    }

    const fade = run(root, [{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 220 : 360, easing: 'ease-out' });
    if (fade) fade.onfinish = () => finish();
    else finish();
  }, [finish]);

  useEffect(() => {
    // This copy is now on screen at the same frame: the boot one can go
    document.getElementById('boot-splash')?.remove();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers = timersRef.current;
    const animations = animationsRef.current;
    const wait = reduced ? 600 : Math.max(120, PLAY_MS + 100 - elapsed);
    timers.push(setTimeout(() => handoff(!!reduced), wait));
    return () => {
      timers.forEach(clearTimeout);
      animations.forEach(a => { try { a.cancel(); } catch { /* already finished */ } });
    };
  }, [handoff, elapsed]);

  // Click / tap skips straight to the app
  const handleSkip = () => {
    timersRef.current.forEach(clearTimeout);
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    const fade = run(rootRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
    if (fade) fade.onfinish = () => finish();
    else finish();
  };

  return (
    <div
      ref={rootRef}
      onClick={handleSkip}
      data-bg-cover
      className="tgl-splash"
      style={{ ['--t' as string]: `-${elapsed}ms` }}
      aria-label="Tripgon log"
      role="presentation"
    >
      <div className="tgl-splash-stack">
        <img ref={logoRef} className="tgl-splash-logo" src="/tripgon-logotype.svg" alt="Tripgon log" draggable={false} />
        <div className="tgl-splash-track" aria-hidden="true">
          <div className="tgl-splash-line" />
          <div className="tgl-splash-plane"><Plane className="rotate-45" fill="currentColor" strokeWidth={0} /></div>
        </div>
      </div>
    </div>
  );
};
