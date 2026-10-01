import { useEffect, useRef } from 'react';

// One small animated canvas (first-run hero, empty hubs). The scene keeps its own state and is
// drawn from elapsed seconds: it pauses off screen and while the tab is hidden, picks up where it
// left off, and under reduced motion draws one still frame at `stillAt`.

export interface SceneFrame {
  ctx: CanvasRenderingContext2D;
  /** Seconds the scene has been playing */
  t: number;
  /** Seconds since the last frame (capped so a resumed tab never jumps) */
  dt: number;
  w: number;
  h: number;
  dark: boolean;
  /** Reduced motion: draw the resting composition */
  still: boolean;
}

export type SceneDraw = (f: SceneFrame) => void;

export function useCanvasScene(make: () => SceneDraw, stillAt = 2) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = make();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let w = 0, h = 0, t = reduced ? stillAt : 0, last = 0, raf = 0, visible = true;

    const paint = (dt: number) => {
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw({ ctx, t, dt, w, h, dark: document.documentElement.classList.contains('dark'), still: reduced });
    };

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      paint(0);
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      paint(dt);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    // Theme switches repaint the still frame too
    const mo = new MutationObserver(() => paint(0));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    size();
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
    // The scene is made once per mount
  }, []);

  return ref;
}

// ── Shared motion helpers: smooth curves only, nothing that snaps ──
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 progress of x across [a, b] */
export const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const inOut = (t: number) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const out = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
/** Gentle overshoot (about 4%), for things that settle into place */
export const settle = (t: number) => { const x = clamp(t); return 1 + 1.4 * Math.pow(x - 1, 3) + 0.4 * Math.pow(x - 1, 2); };

/** Scene colours by theme: paper grounds, ink lines, red action, amber plan */
export function sceneInk(dark: boolean) {
  return dark
    ? { ink: '#EFECE6', soft: 'rgba(239,236,230,0.16)', faint: 'rgba(239,236,230,0.08)', surface: '#1A1A17', paper: '#11110F', red: '#EF4444', amber: '#F2B33D', sky: '#2A2A26' }
    : { ink: '#141412', soft: 'rgba(20,20,18,0.14)', faint: 'rgba(20,20,18,0.06)', surface: '#FFFDF9', paper: '#F6F4EF', red: '#DC2626', amber: '#E9A23B', sky: '#EFEBE2' };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A small airliner seen from above, nose along +x, about 2·size long */
export function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 10, size / 10);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.bezierCurveTo(10, -1.3, 8, -1.6, 6, -1.6);
  ctx.lineTo(1.5, -1.6); ctx.lineTo(-3, -8.5); ctx.lineTo(-5, -8.5); ctx.lineTo(-2.2, -1.6);
  ctx.lineTo(-7, -1.6); ctx.lineTo(-9, -4.2); ctx.lineTo(-10.4, -4.2); ctx.lineTo(-9.2, 0);
  ctx.lineTo(-10.4, 4.2); ctx.lineTo(-9, 4.2); ctx.lineTo(-7, 1.6); ctx.lineTo(-2.2, 1.6);
  ctx.lineTo(-5, 8.5); ctx.lineTo(-3, 8.5); ctx.lineTo(1.5, 1.6); ctx.lineTo(6, 1.6);
  ctx.bezierCurveTo(8, 1.6, 10, 1.3, 10, 0);
  ctx.fill();
  ctx.restore();
}
