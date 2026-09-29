import React, { useEffect, useRef } from 'react';
import type { WeatherEffectType } from '../WeatherEffectLayer';

// One canvas for every weather particle (v1.3): rain streaks and splashes, snow,
// night stars and sun motes. Replaces ~170 CSS-animated DOM nodes.
//  - Each particle family has a target strength; strengths ease toward it, so a
//    weather change cross-fades instead of swapping.
//  - Rain slant follows wind and scroll speed; particles step aside from the pointer.
//  - Pauses while the tab is hidden, sheds particles when frames run long, and
//    draws nothing under prefers-reduced-motion.

interface WeatherParticleCanvasProps {
  type: WeatherEffectType;
  intensity: number;     // 0..1 (precipitation strength)
  isDarkMode: boolean;
}

type Family = 'rain' | 'snow' | 'stars' | 'motes';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; depth: number; phase: number; life: number;
}

const BASE_COUNT: Record<Family, number> = { rain: 140, snow: 90, stars: 70, motes: 18 };

function targetStrengths(type: WeatherEffectType, isDark: boolean): Record<Family, number> {
  return {
    rain: type === 'rain' || type === 'storm' ? 1 : 0,
    snow: type === 'snow' ? 1 : 0,
    stars: type === 'clear' && isDark ? 1 : type === 'fair' && isDark ? 0.4 : 0,
    motes: type === 'clear' && !isDark ? 1 : type === 'fair' && !isDark ? 0.5 : 0,
  };
}

export function WeatherParticleCanvas({ type, intensity, isDarkMode }: WeatherParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ type, intensity, isDarkMode });
  propsRef.current = { type, intensity, isDarkMode };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const spawn = (f: Family, initial: boolean): Particle => {
      const depth = rand(0.35, 1);
      switch (f) {
        case 'rain':
          return { x: rand(-60, width + 60), y: initial ? rand(-height, height) : rand(-120, -20), vx: 0, vy: 900 + 700 * depth, size: 1 + depth * 1.1, depth, phase: 0, life: 0 };
        case 'snow':
          return { x: rand(0, width), y: initial ? rand(-height, height) : rand(-30, -8), vx: 0, vy: 28 + 55 * depth, size: 1.8 + depth * 3.4, depth, phase: rand(0, Math.PI * 2), life: 0 };
        case 'stars':
          return { x: rand(0, width), y: rand(0, height * 0.55), vx: 0, vy: 0, size: rand(0.6, 1.6), depth, phase: rand(0, Math.PI * 2), life: 0 };
        default:
          return { x: rand(width * 0.45, width), y: rand(0, height * 0.5), vx: rand(-6, 6), vy: rand(-8, -2), size: rand(1.2, 2.6), depth, phase: rand(0, Math.PI * 2), life: rand(0, 1) };
      }
    };

    const families: Family[] = ['rain', 'snow', 'stars', 'motes'];
    const pools: Record<Family, Particle[]> = { rain: [], snow: [], stars: [], motes: [] };
    const strength: Record<Family, number> = { rain: 0, snow: 0, stars: 0, motes: 0 };
    const splashes: { x: number; y: number; t: number }[] = [];
    let budget = 1; // shrinks when frames run long, grows back when they recover
    let fastFrames = 0;
    let lastType: WeatherEffectType | null = null;
    let covered = false;
    // Page load and closing a full-screen layer are always slow for a moment: don't judge speed then
    let settle = 3;
    let coverCheck = 0;

    const pointer = { x: -9999, y: -9999 };
    const onPointer = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
    let lastScrollY = window.scrollY;
    let scrollVel = 0;
    const onScroll = () => {
      const y = window.scrollY;
      scrollVel = Math.max(-1600, Math.min(1600, scrollVel + (y - lastScrollY) * 12));
      lastScrollY = y;
    };

    let raf = 0;
    let last = performance.now();
    let slowFrames = 0;
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      // A full-screen layer (intro, terminal, slideshow, splash) hides the background: idle, and don't judge speed
      if (--coverCheck <= 0) {
        const was = covered;
        covered = !!document.querySelector('[data-bg-cover]');
        if (was && !covered) { settle = 1.5; budget = 1; }
        coverCheck = 20;
      }
      if (covered) { ctx.clearRect(0, 0, width, height); slowFrames = 0; fastFrames = 0; raf = requestAnimationFrame(frame); return; }

      const { type: t, intensity: k, isDarkMode: dark } = propsRef.current;
      // The first frame opens on the current weather, already spread over the screen (no fade-in after a reload)
      const firstFrame = lastType === null;
      // A new weather always starts at full density
      if (t !== lastType) { lastType = t; budget = 1; slowFrames = 0; }

      // Shed particles if the device is struggling (>24ms frames for ~1s), restore them after ~2s of smooth frames
      if (settle > 0) { settle -= dt; slowFrames = 0; }
      else if (dt > 0.024) { slowFrames++; fastFrames = 0; } else { slowFrames = Math.max(0, slowFrames - 1); fastFrames++; }
      if (slowFrames > 45 && budget > 0.35) { budget -= 0.15; slowFrames = 0; }
      if (fastFrames > 60 && budget < 1) { budget = Math.min(1, budget + 0.2); fastFrames = 0; }

      const target = targetStrengths(t, dark);
      const precip = 0.45 + 0.55 * Math.max(0, Math.min(1, k));
      families.forEach(f => {
        const goal = target[f] * (f === 'rain' || f === 'snow' ? precip : 1);
        // ~1.2s ease toward the goal
        if (firstFrame) strength[f] = goal;
        else strength[f] += (goal - strength[f]) * Math.min(1, dt * 3);
        const want = Math.round(BASE_COUNT[f] * strength[f] * budget);
        const pool = pools[f];
        while (pool.length < want) pool.push(spawn(f, firstFrame || (pool.length < want * 0.6 && strength[f] > 0.9)));
        if (pool.length > want) pool.length = want;
      });

      scrollVel *= Math.pow(0.02, dt);
      const wind = (t === 'storm' ? -260 : -140) - scrollVel * 0.25;

      ctx.clearRect(0, 0, width, height);

      // Stars
      if (pools.stars.length) {
        ctx.fillStyle = '#FFFFFF';
        pools.stars.forEach(p => {
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * (1.2 + p.depth) + p.phase));
          ctx.globalAlpha = tw * Math.min(1, strength.stars);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Sun motes
      if (pools.motes.length) {
        ctx.fillStyle = '#FBBF24';
        pools.motes.forEach(p => {
          p.life += dt * 0.12;
          if (p.life > 1) Object.assign(p, spawn('motes', false), { life: 0 });
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = Math.sin(p.life * Math.PI) * 0.7 * Math.min(1, strength.motes);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Snow
      if (pools.snow.length) {
        ctx.fillStyle = dark ? '#FFFFFF' : '#F8FAFC';
        ctx.shadowColor = dark ? 'rgba(186,230,254,0.8)' : 'rgba(14,165,233,0.55)';
        ctx.shadowBlur = 6;
        pools.snow.forEach(p => {
          p.phase += dt * (0.8 + p.depth * 0.6);
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 70 * 70) p.vx += (dx / Math.sqrt(d2 + 1)) * 60 * dt;
          p.vx *= Math.pow(0.3, dt);
          p.x += (Math.sin(p.phase) * 22 * p.depth + wind * 0.08 + p.vx) * dt;
          p.y += p.vy * dt;
          if (p.y > height + 10 || p.x < -20 || p.x > width + 20) Object.assign(p, spawn('snow', false));
          ctx.globalAlpha = (0.55 + 0.4 * p.depth) * Math.min(1, strength.snow);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }

      // Rain
      if (pools.rain.length) {
        ctx.lineCap = 'round';
        const color = dark ? '147,197,253' : '37,99,235';
        pools.rain.forEach(p => {
          const vx = wind * (0.6 + p.depth * 0.4);
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 56 * 56) p.vx += Math.sign(dx || 1) * 600 * dt;
          p.vx *= Math.pow(0.05, dt);
          p.x += (vx + p.vx) * dt;
          p.y += p.vy * dt;
          if (p.y > height * (0.86 + p.depth * 0.14)) {
            if (p.depth > 0.7 && splashes.length < 40) splashes.push({ x: p.x, y: p.y, t: 0 });
            Object.assign(p, spawn('rain', false));
          }
          const len = 14 + p.depth * 26;
          const nx = (vx + p.vx) / p.vy;
          ctx.strokeStyle = `rgba(${color},${(0.18 + 0.5 * p.depth) * Math.min(1, strength.rain)})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - nx * len, p.y - len);
          ctx.stroke();
        });
        // Splash rings
        ctx.lineWidth = 1;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.t += dt * 2.4;
          if (s.t >= 1) { splashes.splice(i, 1); continue; }
          ctx.strokeStyle = `rgba(${color},${(1 - s.t) * 0.55 * Math.min(1, strength.rain)})`;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, 2 + s.t * 9, 0.8 + s.t * 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    };

    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    const onVisibility = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };

    start();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}

// Precipitation strength from a WMO weather code and the chance of precipitation.
export function precipitationIntensity(code?: number, pop = 0): number {
  if (code === undefined) return 0;
  const byCode: Record<number, number> = {
    51: 0.2, 53: 0.35, 55: 0.5, 56: 0.3, 57: 0.5,
    61: 0.45, 63: 0.7, 65: 1, 66: 0.5, 67: 0.9,
    71: 0.35, 73: 0.65, 75: 1, 77: 0.4,
    80: 0.5, 81: 0.75, 82: 1, 85: 0.55, 86: 0.9,
    95: 0.9, 96: 1, 99: 1,
  };
  const base = byCode[code] ?? 0.5;
  return Math.max(0, Math.min(1, base * 0.8 + (pop / 100) * 0.2));
}
