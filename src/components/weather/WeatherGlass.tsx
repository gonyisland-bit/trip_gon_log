import React, { useEffect, useRef } from 'react';
import type { WeatherEffectType } from '../WeatherEffectLayer';

// "Weather Glass" (v1.3): the weather card behaves like a small window.
//  - rain / storm: beads sit on the glass and a few drops run down, leaving a trail
//  - snow: frost gathers in the corners
//  - clear: a slow sheen of light passes across
// Canvas work runs only while the card is on screen; reduced motion shows still beads.

interface WeatherGlassProps {
  type: WeatherEffectType;
  isDarkMode: boolean;
}

export function WeatherGlass({ type, isDarkMode }: WeatherGlassProps) {
  if (type === 'rain' || type === 'storm') return <RainGlass heavy={type === 'storm'} isDarkMode={isDarkMode} />;
  if (type === 'snow') {
    return (
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        background: isDarkMode
          ? 'radial-gradient(120% 70% at 0% 100%, rgba(226,240,255,.16), transparent 55%), radial-gradient(90% 60% at 100% 0%, rgba(226,240,255,.12), transparent 50%)'
          : 'radial-gradient(120% 70% at 0% 100%, rgba(186,210,235,.55), transparent 55%), radial-gradient(90% 60% at 100% 0%, rgba(186,210,235,.4), transparent 50%)',
      }} />
    );
  }
  if (type === 'clear') {
    return <div aria-hidden className="tgl-glass-sheen absolute inset-0 pointer-events-none" />;
  }
  return null;
}

interface Bead { x: number; y: number; r: number }
interface Runner { x: number; y: number; r: number; v: number; trail: { x: number; y: number }[] }

function RainGlass({ heavy, isDarkMode }: { heavy: boolean; isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const beadCount = Math.round((w * h) / (heavy ? 900 : 1400));
    const beads: Bead[] = Array.from({ length: beadCount }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.8, 2.8) }));
    const runners: Runner[] = [];
    const rim = isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(15,23,42,0.38)';

    const drawDrop = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.35, isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.35)');
      g.addColorStop(1, rim);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // New runner now and then (more often in a storm)
      if (!reduced && runners.length < (heavy ? 4 : 2) && Math.random() < dt * (heavy ? 1.6 : 0.8)) {
        runners.push({ x: rand(8, w - 8), y: rand(-6, h * 0.3), r: rand(2.4, 3.6), v: rand(18, 30), trail: [] });
      }

      beads.forEach(b => drawDrop(b.x, b.y, b.r));

      for (let i = runners.length - 1; i >= 0; i--) {
        const d = runners[i];
        // Runs in short surges, wandering slightly sideways
        d.v = Math.min(140, d.v + dt * rand(20, 160));
        d.y += d.v * dt;
        d.x += Math.sin(d.y * 0.08) * 0.25;
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 40) d.trail.shift();
        // A runner collects the beads it passes
        for (let j = beads.length - 1; j >= 0; j--) {
          const b = beads[j];
          if (Math.abs(b.x - d.x) < d.r && Math.abs(b.y - d.y) < d.r) {
            beads.splice(j, 1);
            d.r = Math.min(4.6, d.r + 0.08);
          }
        }
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)';
        ctx.lineWidth = d.r * 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        d.trail.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        drawDrop(d.x, d.y, d.r);
        if (d.y - d.r > h) runners.splice(i, 1);
      }

      // Keep the glass beaded
      while (beads.length < beadCount) beads.push({ x: rand(0, w), y: rand(0, h), r: rand(0.8, 2.8) });

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
    io.observe(host);
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [heavy, isDarkMode]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />;
}
