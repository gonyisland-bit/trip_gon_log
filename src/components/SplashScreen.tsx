import React, { useEffect, useRef, useCallback } from 'react';
import { BrandLogo } from './BrandLogo';
import { BRAND_LOGO_ASPECT } from './brandLogoData';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

// Number of stacked logo copies that form the extruded 3D depth
const DEPTH_LAYERS = 16;
const LAYER_GAP_PX = 0.9;
const EMPHASIZED = 'cubic-bezier(.16,1,.3,1)';

// Official-logo 3D splash: the extruded logotype flies in from depth, settles face-on,
// catches a light sweep, then shrinks into the header logo slot ([data-brand-logo]).
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1700,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const hairlineRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
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
    const root = rootRef.current;
    const logo = logoRef.current;
    if (!root || !logo) return finish();

    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-brand-logo]'))
      .find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

    run(hairlineRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    run(coordsRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });

    if (target && !reduced) {
      const from = logo.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      run(root, [{ backgroundColor: getComputedStyle(root).backgroundColor }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 480, delay: 120 });
      run(root.querySelector('.tgl-splash-grid'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
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

    if (reduced) {
      run(logoRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      run(coordsRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      run(hairlineRef.current, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(1)' }], { duration: 1 });
      timers.push(setTimeout(() => handoff(true), Math.min(minDurationMs, 1000)));
    } else {
      run(logoRef.current, [
        { opacity: 0, transform: 'translateZ(-700px) rotateX(62deg) rotateZ(-9deg)' },
        { opacity: 1, offset: 0.35 },
        { transform: 'translateZ(40px) rotateX(-10deg) rotateY(-24deg) rotateZ(0deg)', offset: 0.55 },
        { transform: 'translateZ(0) rotateX(5deg) rotateY(11deg)', offset: 0.78 },
        { transform: 'translateZ(0) rotateX(0deg) rotateY(-3deg)', offset: 0.9 },
        { opacity: 1, transform: 'translateZ(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)' },
      ], { duration: 1300, easing: EMPHASIZED });
      run(sheenRef.current, [{ backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0' }], { duration: 650, delay: 1100, easing: 'ease-in-out' });
      run(hairlineRef.current, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 500, delay: 1250, easing: EMPHASIZED });
      run(coordsRef.current, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, delay: 1350, easing: EMPHASIZED });
      timers.push(setTimeout(() => handoff(false), Math.max(minDurationMs, 1900)));
    }

    return () => {
      timers.forEach(clearTimeout);
      animations.forEach(a => { try { a.cancel(); } catch { /* already finished */ } });
    };
  }, [handoff, minDurationMs]);

  // Click / tap skips straight to the app
  const handleSkip = () => {
    timersRef.current.forEach(clearTimeout);
    const fade = run(rootRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
    if (fade) fade.onfinish = () => finish();
    else finish();
  };

  const layers = Array.from({ length: DEPTH_LAYERS }, (_, i) => DEPTH_LAYERS - 1 - i);

  return (
    <div
      ref={rootRef}
      onClick={handleSkip}
      className="tgl-splash fixed inset-0 z-[999999] flex items-center justify-center select-none cursor-pointer bg-[#FAF9F6] dark:bg-[#111111]"
      style={{ perspective: '1100px' }}
      aria-label="Tripgon log"
      role="presentation"
    >
      {/* Swiss dot grid */}
      <div className="tgl-splash-grid absolute inset-0 pointer-events-none opacity-100 bg-[radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative flex flex-col items-center">
        {/* Extruded official logotype */}
        <div
          ref={logoRef}
          className="relative opacity-0"
          style={{ width: 'clamp(220px, 46vw, 520px)', aspectRatio: String(BRAND_LOGO_ASPECT), transformStyle: 'preserve-3d', willChange: 'transform' }}
        >
          {layers.map(depth => (
            <div
              key={depth}
              className="absolute inset-0"
              style={{
                transform: `translateZ(${-depth * LAYER_GAP_PX}px)`,
                color: depth === 0
                  ? 'var(--tgl-ink)'
                  : `color-mix(in srgb, var(--tgl-depth-a) ${Math.round(100 - (depth / DEPTH_LAYERS) * 100)}%, var(--tgl-depth-b))`,
                backfaceVisibility: 'hidden',
              }}
            >
              <BrandLogo className="w-full h-full block" title={depth === 0 ? 'Tripgon log' : ''} />
            </div>
          ))}
          {/* Light sweep clipped to the letterforms */}
          <div ref={sheenRef} className="tgl-splash-sheen absolute inset-0 pointer-events-none" aria-hidden="true" />
        </div>

        {/* Red flight-path hairline */}
        <div
          ref={hairlineRef}
          className="mt-5 sm:mt-6 h-[2px] bg-red-600 dark:bg-red-500 origin-left"
          style={{ width: 'clamp(220px, 46vw, 520px)', transform: 'scaleX(0)' }}
        />

        <div
          ref={coordsRef}
          className="mt-4 text-[11px] sm:text-xs font-mono tracking-[0.2em] uppercase text-black/60 dark:text-white/60 opacity-0"
        >
          LAT 37.5665° N · LNG 126.9780° E
        </div>
      </div>

      <style>{`
        .tgl-splash { --tgl-ink: #0d0d0d; --tgl-depth-a: #5c5c58; --tgl-depth-b: #c4c4be; }
        .dark .tgl-splash { --tgl-ink: #f2f2f0; --tgl-depth-a: #a3a39d; --tgl-depth-b: #3a3a37; }
        .tgl-splash-sheen {
          -webkit-mask: url(/tripgon-logotype.svg) center / contain no-repeat;
          mask: url(/tripgon-logotype.svg) center / contain no-repeat;
          background: linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.75) 50%, transparent 58%) 160% 0 / 260% 100% no-repeat;
          transform: translateZ(0.5px);
        }
        .dark .tgl-splash-sheen {
          /* white letterforms: a soft graphite band reads as the sweep */
          background: linear-gradient(105deg, transparent 42%, rgba(0,0,0,0.28) 50%, transparent 58%) 160% 0 / 260% 100% no-repeat;
        }
      `}</style>
    </div>
  );
};
