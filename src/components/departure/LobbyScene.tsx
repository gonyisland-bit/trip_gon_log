import React, { useEffect, useRef } from 'react';
import { Traveler, poseTraveler, drawTraveler, TRAVELER_DARK, TravelerPalette, STRIDE_PER_RAD } from '../splash/travelerRig';

// Airport lobby (v1.3) under the Departure Board: a flat four-colour scene.
// Behind a wall of glass, planes roll, rotate and climb away while others glide
// in to land; in front, travelers cross the concourse pulling their carry-ons.
// One canvas, paused while the tab is hidden, still under reduced motion.

const INK = '#0B0B0C';
const NAVY = '#1C2A4A';
const NAVY_DEEP = '#131D35';
const RED = '#E5412D';
const MUSTARD = '#F2B33D';
const CREAM = '#F3EBDD';

// Travelers wear the same four colours
const PALETTES: TravelerPalette[] = [
  TRAVELER_DARK,
  { ...TRAVELER_DARK, top: MUSTARD, topShade: '#D69A2A', bottom: NAVY, bottomFar: NAVY_DEEP, shoe: NAVY, bag: CREAM, bagShade: '#D8CDBB', hair: '#3A2418' },
  { ...TRAVELER_DARK, top: RED, topShade: '#C23522', bottom: CREAM, bottomFar: '#D8CDBB', shoe: CREAM, bag: MUSTARD, bagShade: '#D69A2A' },
  { ...TRAVELER_DARK, top: CREAM, topShade: '#D8CDBB', bottom: RED, bottomFar: '#C23522', shoe: INK, bag: NAVY, bagShade: NAVY_DEEP, hair: '#5A3A22' },
];

interface Walker {
  rig: Traveler;
  x: number;          // px
  dir: 1 | -1;
  depth: number;      // 0 far .. 1 near
  palette: TravelerPalette;
  tempo: number;
}

interface Plane {
  t: number;          // 0..1 along its path
  speed: number;      // path per second
  kind: 'takeoff' | 'landing';
  delay: number;      // seconds before it starts
  scale: number;
}

// Flat airliner, nose to the right, ~120 units long, origin at the centre
function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number, blink = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  // far wing
  ctx.fillStyle = '#C9BFAE';
  ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(-18, -26); ctx.lineTo(-8, -26); ctx.lineTo(18, -2); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(-58, -5); ctx.lineTo(44, -6);
  ctx.quadraticCurveTo(62, -5, 62, 0); ctx.quadraticCurveTo(62, 5, 44, 6);
  ctx.lineTo(-54, 6); ctx.quadraticCurveTo(-60, 4, -58, -5); ctx.closePath(); ctx.fill();
  // tail
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.moveTo(-58, -5); ctx.lineTo(-66, -26); ctx.lineTo(-56, -26); ctx.lineTo(-40, -5); ctx.closePath(); ctx.fill();
  // cheatline and windows
  ctx.fillStyle = RED; ctx.fillRect(-50, 1.5, 96, 1.6);
  ctx.fillStyle = NAVY;
  for (let i = -40; i < 40; i += 7) ctx.fillRect(i, -2.6, 3, 2.2);
  ctx.fillRect(48, -3, 6, 2.4);
  // near wing and engine
  ctx.fillStyle = '#E2D8C6';
  ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(-20, 28); ctx.lineTo(-8, 28); ctx.lineTo(22, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = MUSTARD;
  ctx.beginPath(); ctx.ellipse(0, 12, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  // Navigation lights: a steady white tail light and a red beacon that blinks
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(-66, -25, 1.8, 0, Math.PI * 2); ctx.fill();
  if (blink) {
    ctx.fillStyle = 'rgba(229,65,45,0.35)';
    ctx.beginPath(); ctx.arc(-2, -7, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(-2, -7, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const ease = (t: number) => t * t * (3 - 2 * t);

export function LobbyScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const walkers: Walker[] = Array.from({ length: 5 }, (_, i) => {
      const rig = new Traveler();
      rig.phase = i * 1.7;
      return {
        rig,
        x: (w / 5) * i + Math.random() * 60,
        dir: i % 2 === 0 ? 1 : -1,
        depth: [0.2, 0.9, 0.55, 0.35, 1][i],
        palette: PALETTES[i % PALETTES.length],
        tempo: 0.85 + (i % 3) * 0.12,
      };
    });
    walkers.sort((a, b) => a.depth - b.depth);

    const planes: Plane[] = [
      { t: 0, speed: 0.075, kind: 'takeoff', delay: 0.6, scale: 1 },
      { t: 0, speed: 0.07, kind: 'landing', delay: 5.5, scale: 0.8 },
      { t: 0, speed: 0.08, kind: 'takeoff', delay: 10, scale: 0.62 },
    ];

    // Night sky dots behind the glass
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.5, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));

    let raf = 0;
    let last = performance.now();
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      const floorY = h * 0.78;          // where the glass meets the floor
      const runwayY = floorY - h * 0.1; // runway seen through the glass

      ctx.clearRect(0, 0, w, h);

      // Sky through the glass
      const sky = ctx.createLinearGradient(0, 0, 0, floorY);
      sky.addColorStop(0, NAVY_DEEP);
      sky.addColorStop(1, NAVY);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, floorY);
      ctx.fillStyle = CREAM;
      stars.forEach(s => {
        ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.3 + s.p));
        ctx.beginPath(); ctx.arc(s.x * w, s.y * floorY, s.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Horizon: a low mustard band of dusk and the runway with its lights
      ctx.fillStyle = 'rgba(242,179,61,0.18)';
      ctx.fillRect(0, runwayY - h * 0.08, w, h * 0.08);
      ctx.fillStyle = '#0E1526';
      ctx.fillRect(0, runwayY, w, floorY - runwayY);
      ctx.fillStyle = MUSTARD;
      for (let x = ((time * 40) % 26) - 26; x < w; x += 26) ctx.fillRect(x, runwayY + 3, 8, 1.6);

      // Planes
      planes.forEach(p => {
        if (p.delay > 0) { p.delay -= dt; return; }
        p.t += dt * p.speed;
        if (p.t >= 1) { p.t = 0; p.delay = 4 + Math.random() * 5; p.scale = 0.55 + Math.random() * 0.5; }
        const s = p.scale * Math.max(0.5, h / 260);
        if (p.kind === 'takeoff') {
          // roll along the runway, rotate, then climb out and shrink
          const roll = Math.min(1, p.t / 0.45);
          const climb = Math.max(0, (p.t - 0.35) / 0.65);
          const x = -140 + ease(roll) * w * 0.55 + climb * w * 0.6;
          const y = runwayY - 6 * s - ease(climb) * (runwayY - h * 0.08);
          const ang = -Math.min(0.32, climb * 1.4);
          drawPlane(ctx, x, y, s * (1 - climb * 0.55), ang, (time * 1.4) % 1 < 0.12);
        } else {
          // glide in from the right, flare, touch down and roll out
          const glide = Math.min(1, p.t / 0.7);
          const x = w + 140 - ease(glide) * w * 0.75 - Math.max(0, p.t - 0.7) * w * 0.4;
          const y = h * 0.12 + ease(glide) * (runwayY - 6 * s - h * 0.12);
          // Mirrored so the nose points left; nose down on the approach, level at the flare
          const pitch = glide < 0.85 ? 0.1 : Math.max(-0.02, 0.1 * (1 - (glide - 0.85) / 0.15));
          ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); drawPlane(ctx, 0, 0, s * (0.55 + glide * 0.45), pitch, (time * 1.4 + 0.5) % 1 < 0.12); ctx.restore();
        }
      });

      // Glass wall: mullions and a soft reflection band
      ctx.fillStyle = INK;
      const pane = Math.max(120, w / 7);
      for (let x = 0; x <= w + pane; x += pane) ctx.fillRect(x - 3, 0, 6, floorY);
      ctx.fillRect(0, h * 0.3, w, 4);
      ctx.fillStyle = 'rgba(243,235,221,0.05)';
      ctx.beginPath(); ctx.moveTo(w * 0.1, 0); ctx.lineTo(w * 0.22, 0); ctx.lineTo(w * 0.02, floorY); ctx.lineTo(-w * 0.1, floorY); ctx.closePath(); ctx.fill();

      // Concourse floor
      ctx.fillStyle = INK;
      ctx.fillRect(0, floorY, w, h - floorY);
      ctx.fillStyle = 'rgba(243,235,221,0.12)';
      ctx.fillRect(0, floorY, w, 1.5);

      // Travelers (far to near), each on its own lane
      walkers.forEach(t => {
        if (!reduced) t.rig.step(dt * 1000, 1, t.tempo);
        const s = (0.26 + t.depth * 0.22) * Math.max(0.55, h / 260);
        // Ground speed matches the stride, so feet never slide
        const speed = STRIDE_PER_RAD * Math.PI * 2 * t.tempo * s;
        if (!reduced) t.x += t.dir * speed * dt;
        const margin = 140 * s;
        if (t.dir === 1 && t.x > w + margin) t.x = -margin;
        if (t.dir === -1 && t.x < -margin) t.x = w + margin;
        const ground = floorY + 6 + t.depth * (h - floorY - 12);
        ctx.save();
        if (t.dir === -1) { ctx.translate(t.x * 2, 0); ctx.scale(-1, 1); }
        drawTraveler(ctx, poseTraveler(t.rig, t.x, ground, s, t.palette), t.palette);
        ctx.restore();
      });

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    const onVisibility = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full" />;
}
