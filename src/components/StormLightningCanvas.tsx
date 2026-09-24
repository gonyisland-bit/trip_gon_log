import React, { useRef, useEffect, useCallback } from 'react';

// ─── Data Types ──────────────────────────────────────────────────────────────
interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  alpha: number; // opacity multiplier: 1.0 for main bolt, < 1.0 for branches
}

interface Strike {
  id: number;
  startTime: number;
  segments: Segment[];
  originX: number;
}

// ─── Fractal Lightning Generator (Recursive Midpoint Displacement) ────────────
// Creates a realistic branching bolt from (x1,y1) to (x2,y2).
// displacement: initial perpendicular jitter amplitude (halves each recursion)
// alpha: segment opacity (branches inherit reduced alpha)
// depth: recursion limit (7 → ~128 fine segments for the main bolt)
function generateBolt(
  x1: number, y1: number,
  x2: number, y2: number,
  displacement: number,
  alpha: number,
  depth: number,
  out: Segment[]
): void {
  // Base case: segment is short enough to be a leaf
  if (depth <= 0 || (Math.abs(y2 - y1) + Math.abs(x2 - x1)) < 6) {
    out.push({ x1, y1, x2, y2, alpha });
    return;
  }

  // Midpoint with perpendicular jitter (mostly horizontal, slight vertical)
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displacement;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.45) * displacement * 0.12;

  // Recurse into both halves
  generateBolt(x1, y1, midX, midY, displacement * 0.52, alpha, depth - 1, out);
  generateBolt(midX, midY, x2, y2, displacement * 0.52, alpha, depth - 1, out);

  // Probabilistic branch: spawns a sub-bolt angled off the main path
  if (depth > 3 && Math.random() < 0.38) {
    const mainAngle = Math.atan2(y2 - y1, x2 - x1);
    const side = Math.random() < 0.5 ? 1 : -1;
    // Branch angle: 17°–55° off main axis for natural spread
    const branchAngle = mainAngle + side * (0.3 + Math.random() * 0.65);
    const parentLen = Math.hypot(x2 - x1, y2 - y1);
    const branchLen = parentLen * (0.35 + Math.random() * 0.45);
    generateBolt(
      midX, midY,
      midX + Math.cos(branchAngle) * branchLen,
      midY + Math.sin(branchAngle) * branchLen,
      displacement * 0.40,
      alpha * 0.48, // branches are dimmer
      Math.max(depth - 3, 1),
      out
    );
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
interface StormLightningCanvasProps {
  isDarkMode: boolean;
}

export const StormLightningCanvas: React.FC<StormLightningCanvasProps> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // refs to avoid stale closures in rAF loop
  const activeStrikesRef = useRef<Strike[]>([]);
  const rafRef = useRef<number | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDarkRef = useRef(isDarkMode);

  useEffect(() => {
    isDarkRef.current = isDarkMode;
  }, [isDarkMode]);

  // ── Draw a single strike onto the canvas ──────────────────────────────────
  const drawStrike = useCallback((
    ctx: CanvasRenderingContext2D,
    strike: Strike,
    flashAlpha: number,
    jitter: number,
    canvasW: number,
    canvasH: number
  ) => {
    const isDark = isDarkRef.current;

    // Sky illumination: radial gradient near bolt origin (only during bright flash)
    if (flashAlpha > 0.45) {
      const skyAlpha = ((flashAlpha - 0.45) / 0.55) * 0.24;
      const grad = ctx.createRadialGradient(
        strike.originX, 0, 0,
        strike.originX, 0, canvasH * 0.5
      );
      grad.addColorStop(0, isDark
        ? `rgba(170, 210, 255, ${skyAlpha})`
        : `rgba(255, 255, 210, ${skyAlpha})`
      );
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.restore();
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ── Build complete lightning vector path in a single pass (Ultra-low CPU overhead) ──
    ctx.beginPath();
    for (const seg of strike.segments) {
      const jx1 = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
      const jy1 = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.28 : 0;
      const jx2 = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
      const jy2 = jitter > 0 ? (Math.random() - 0.5) * jitter * 0.28 : 0;

      ctx.moveTo(seg.x1 + jx1, seg.y1 + jy1);
      ctx.lineTo(seg.x2 + jx2, seg.y2 + jy2);
    }

    // ── Layer 1: Outer glow aura (Single combined stroke, blurred aura) ──
    ctx.globalAlpha = flashAlpha * 0.18;
    ctx.strokeStyle = isDark ? 'rgba(140, 180, 255, 0.85)' : 'rgba(255, 235, 100, 0.85)';
    ctx.lineWidth = 14;
    ctx.shadowColor = isDark ? 'rgba(130, 170, 255, 0.85)' : 'rgba(255, 220, 80, 0.85)';
    ctx.shadowBlur = 18;
    ctx.stroke();

    // ── Layer 2: Mid glow (Single combined stroke, medium emission) ──
    ctx.globalAlpha = flashAlpha * 0.45;
    ctx.strokeStyle = isDark ? 'rgba(200, 225, 255, 1)' : 'rgba(255, 248, 185, 1)';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // ── Layer 3: Bright white core (Single combined stroke, sharp center) ──
    ctx.globalAlpha = flashAlpha;
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 4;
    ctx.stroke();

    ctx.restore();
  }, []);

  // ── Main rAF animation loop ───────────────────────────────────────────────
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(animate); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(animate); return; }

    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update each active strike's phase based on elapsed time
    activeStrikesRef.current = activeStrikesRef.current.filter(strike => {
      const elapsed = now - strike.startTime;

      let flashAlpha: number;
      let jitter: number;

      if (elapsed < 70) {
        // ① Ramp up to full brightness (Flash 1)
        flashAlpha = elapsed / 70;
        jitter = 2.8;
      } else if (elapsed < 130) {
        // ② Brief gap/dim (inter-flash darkness, characteristic of real lightning)
        flashAlpha = 0.06;
        jitter = 0;
      } else if (elapsed < 240) {
        // ③ Second brighter flash
        flashAlpha = 0.9;
        jitter = 2.3;
      } else if (elapsed < 540) {
        // ④ Power-law fade out (visually faster than linear fade)
        const t = (elapsed - 240) / 300;
        flashAlpha = 0.9 * Math.pow(1 - t, 2.2);
        jitter = 0;
      } else {
        return false; // Strike is done, remove from array
      }

      if (flashAlpha > 0.005) {
        drawStrike(ctx, strike, flashAlpha, jitter, canvas.width, canvas.height);
      }
      return true;
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [drawStrike]);

  // Start/stop rAF loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // ── Spawn strikes on random timer ────────────────────────────────────────
  useEffect(() => {
    const spawnStrike = () => {
      const canvas = canvasRef.current;
      const w = (canvas?.width) || window.innerWidth;
      const h = (canvas?.height) || window.innerHeight;

      // Random origin along top of screen, target somewhere in lower 50–98%
      const originX = w * (0.04 + Math.random() * 0.92);
      const targetX = originX + (Math.random() - 0.5) * w * 0.38;
      const targetY = h * (0.52 + Math.random() * 0.45);

      const segs: Segment[] = [];
      generateBolt(originX, -10, targetX, targetY, 95, 1.0, 7, segs);

      activeStrikesRef.current.push({
        id: performance.now() + Math.random(),
        startTime: performance.now(),
        segments: segs,
        originX,
      });
    };

    const schedule = () => {
      // Random interval between strikes: 1.0–6.5 seconds
      const delay = 1000 + Math.random() * 5500;
      nextTimerRef.current = setTimeout(() => {
        spawnStrike();
        // 28% chance: cluster strike (second bolt follows within 200–600ms)
        if (Math.random() < 0.28) {
          setTimeout(spawnStrike, 200 + Math.random() * 400);
        }
        schedule();
      }, delay);
    };

    // First strike: short initial delay so it doesn't feel dead on load
    nextTimerRef.current = setTimeout(() => {
      spawnStrike();
      schedule();
    }, 500 + Math.random() * 1800);

    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, []);

  // ── Resize canvas to match container ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};
