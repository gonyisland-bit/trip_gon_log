import React, { useEffect, useRef, useCallback } from 'react';
import { BrandLogo } from './BrandLogo';
import { BRAND_LOGO_ASPECT } from './brandLogoData';
import {
  createTinyPlanetScene,
  ease,
  seg,
  TINY_PLANET_DURATION,
  TINY_PLANET_HAIRLINE_IN,
  TINY_PLANET_LOGO_IN,
} from './splash/tinyPlanetScene';

interface SplashScreenProps {
  onFinish?: () => void;
}

const EMPHASIZED = 'cubic-bezier(.16,1,.3,1)';
const LOGO_WIDTH = 'clamp(220px, 46vw, 520px)';

// "Tiny Planet" motion splash: a traveler walks a red horizon that turns out to be a dotted
// planet, a plane orbits, the dots re-form as the official logotype, then the logo shrinks
// into the header logo slot ([data-brand-logo]).
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const hairlineRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const handedOffRef = useRef(false);
  const rafRef = useRef(0);
  const animationsRef = useRef<Animation[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    cancelAnimationFrame(rafRef.current);
    const root = rootRef.current;
    const logo = logoRef.current;
    if (!root || !logo) return finish();

    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-brand-logo]'))
      .find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

    run(hairlineRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    run(canvasRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 });

    if (target && !reduced) {
      const from = logo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      run(root, [{ backgroundColor: getComputedStyle(root).backgroundColor }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 480, delay: 120 });
      const move = run(logo, [
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ], { duration: 600, easing: EMPHASIZED });
      if (move) move.onfinish = () => finish();
      else finish();
      return;
    }

    const fade = run(root, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.03)' }], { duration: reduced ? 250 : 400, easing: 'ease-out' });
    if (fade) fade.onfinish = () => finish();
    else finish();
  }, [finish]);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers = timersRef.current;
    const animations = animationsRef.current;
    const root = rootRef.current, canvas = canvasRef.current, logo = logoRef.current, hairline = hairlineRef.current;
    const ctx = canvas?.getContext('2d');

    if (reduced || !root || !canvas || !logo || !hairline || !ctx) {
      if (logo) logo.style.opacity = '1';
      if (hairline) hairline.style.transform = 'scaleX(1)';
      timers.push(setTimeout(() => handoff(true), 1000));
      return () => { timers.forEach(clearTimeout); };
    }

    const W = root.clientWidth, H = root.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const lr = logo.getBoundingClientRect();
    const frame = createTinyPlanetScene(ctx, {
      width: W,
      height: H,
      logo: { x: lr.left, y: lr.top, w: lr.width, h: lr.height },
      hairlineY: hairline.getBoundingClientRect().top,
      dark: document.documentElement.classList.contains('dark'),
    });

    let start = 0, last = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(TINY_PLANET_DURATION, now - start);
      const dt = Math.min(50, Math.max(0, t - last));
      last = t;
      frame(t, dt);
      logo.style.opacity = String(ease.out3(seg(t, ...TINY_PLANET_LOGO_IN)));
      hairline.style.transform = `scaleX(${ease.emph(seg(t, ...TINY_PLANET_HAIRLINE_IN))})`;
      if (t >= TINY_PLANET_DURATION) handoff(false);
      else rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      timers.forEach(clearTimeout);
      animations.forEach(a => { try { a.cancel(); } catch { /* already finished */ } });
    };
  }, [handoff]);

  // Click / tap skips straight to the app
  const handleSkip = () => {
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
    handedOffRef.current = true;
    const fade = run(rootRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
    if (fade) fade.onfinish = () => finish();
    else finish();
  };

  return (
    <div
      ref={rootRef}
      onClick={handleSkip}
      className="fixed inset-0 z-system flex items-center justify-center select-none cursor-pointer bg-[#FAF9F6] dark:bg-[#111111]"
      aria-label="Tripgon log"
      role="presentation"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="relative flex flex-col items-center">
        <div
          ref={logoRef}
          className="relative text-[#0d0d0d] dark:text-[#f2f2f0]"
          style={{ width: LOGO_WIDTH, aspectRatio: String(BRAND_LOGO_ASPECT), opacity: 0, willChange: 'transform, opacity' }}
        >
          <BrandLogo className="w-full h-full block" />
        </div>

        {/* Red flight-path hairline; the traveler lands on it */}
        <div
          ref={hairlineRef}
          className="mt-5 sm:mt-6 h-[2px] bg-red-600 dark:bg-red-500 origin-left"
          style={{ width: LOGO_WIDTH, transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  );
};
