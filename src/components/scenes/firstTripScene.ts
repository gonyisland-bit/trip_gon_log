import { decodeWorldDots } from '../../data/worldDots';
import { Traveler, poseTraveler, drawTraveler, TRAVELER_LIGHT, TRAVELER_DARK } from '../splash/travelerRig';
import { type SceneDraw, sceneInk, seg, smooth, inOut, out, settle, clamp, roundRect, drawPlane } from './useCanvasScene';

// First-run hero (v1.3.6): a light dotted map where a red route leaves Seoul for one city or
// beach after another, while the traveler walks on below past skylines and palms. Six seconds a
// destination; every move eases in and out, nothing snaps.

export interface Destination { name: string; code: string; lng: number; lat: number; resort?: boolean }

export const FIRST_TRIP_DESTINATIONS: Destination[] = [
  { name: '다낭', code: 'DAD', lng: 108.2, lat: 16.05, resort: true },
  { name: '파리', code: 'PAR', lng: 2.35, lat: 48.86 },
  { name: '발리', code: 'DPS', lng: 115.2, lat: -8.65, resort: true },
  { name: '도쿄', code: 'TYO', lng: 139.7, lat: 35.7 },
  { name: '시드니', code: 'SYD', lng: 151.2, lat: -33.87 },
  { name: '방콕', code: 'BKK', lng: 100.5, lat: 13.75 },
];

const SEOUL = { lng: 127, lat: 37.55 };
const VIEW = { lng0: -8, lng1: 160, lat0: 60, lat1: -40 };
export const FIRST_TRIP_PERIOD = 6;

type Mark = { kind: 'tower' | 'block' | 'palm' | 'hut'; x: number; h: number };
// One stretch of skyline and shore, repeated as the ground rolls by
const MARKS: Mark[] = [
  { kind: 'block', x: 0, h: 46 }, { kind: 'tower', x: 34, h: 84 }, { kind: 'block', x: 58, h: 62 },
  { kind: 'block', x: 84, h: 38 }, { kind: 'palm', x: 150, h: 70 }, { kind: 'palm', x: 182, h: 54 },
  { kind: 'hut', x: 214, h: 30 }, { kind: 'block', x: 300, h: 54 }, { kind: 'block', x: 326, h: 76 },
  { kind: 'tower', x: 356, h: 66 }, { kind: 'palm', x: 430, h: 62 },
];
const MARK_SPAN = 500;

export function createFirstTripScene(onDestination?: (d: Destination) => void): SceneDraw {
  const dots = decodeWorldDots().filter(d => d.lng >= VIEW.lng0 && d.lng <= VIEW.lng1 && d.lat <= VIEW.lat0 && d.lat >= VIEW.lat1);
  const walker = new Traveler();
  let lastIdx = -1;

  return ({ ctx, t, dt, w, h, dark }) => {
    const C = sceneInk(dark);
    const s = clamp(Math.min(h / 400, w / 760), 0.3, 0.58);
    const groundY = h - Math.max(12, h * 0.05);
    // Map box above the walker, one scale on both axes
    // The map sits in the space above the skyline, centred; the walker passes in front of its lower edge
    const mapH = Math.max(80, groundY - 24);
    const k = Math.min((w - 24) / (VIEW.lng1 - VIEW.lng0), mapH / (VIEW.lat0 - VIEW.lat1));
    const ox = (w - k * (VIEW.lng1 - VIEW.lng0)) / 2;
    const oy = Math.max(6, (mapH - k * (VIEW.lat0 - VIEW.lat1)) / 2 - 10);
    const P = (lng: number, lat: number) => ({ x: ox + (lng - VIEW.lng0) * k, y: oy + (VIEW.lat0 - lat) * k });

    // World
    ctx.fillStyle = C.soft;
    const r = Math.max(0.9, k * 0.5);
    for (const d of dots) {
      const p = P(d.lng, d.lat);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Route of this cycle
    const idx = Math.floor(t / FIRST_TRIP_PERIOD) % FIRST_TRIP_DESTINATIONS.length;
    const u = (t % FIRST_TRIP_PERIOD) / FIRST_TRIP_PERIOD;
    const dest = FIRST_TRIP_DESTINATIONS[idx];
    if (idx !== lastIdx) { lastIdx = idx; onDestination?.(dest); }
    const A = P(SEOUL.lng, SEOUL.lat), B = P(dest.lng, dest.lat);
    const dist = Math.hypot(B.x - A.x, B.y - A.y);
    const lift = Math.min(dist * 0.42, mapH * 0.42) + 10;
    const Cp = { x: (A.x + B.x) / 2, y: Math.min(A.y, B.y) - lift };
    const at = (q: number) => ({
      x: (1 - q) * (1 - q) * A.x + 2 * (1 - q) * q * Cp.x + q * q * B.x,
      y: (1 - q) * (1 - q) * A.y + 2 * (1 - q) * q * Cp.y + q * q * B.y,
    });
    const draw = inOut(seg(u, 0.06, 0.6));
    const fade = 1 - smooth(seg(u, 0.86, 1));

    // Seoul: a steady red point and one soft ripple as each route begins
    const rip = out(seg(u, 0, 0.35));
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.45 * (1 - rip);
    ctx.beginPath(); ctx.arc(A.x, A.y, 4 + 16 * rip, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(A.x, A.y, 4, 0, Math.PI * 2); ctx.fill();

    if (draw > 0) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -t * 10;
      ctx.beginPath();
      const n = 64;
      for (let i = 0; i <= n; i++) {
        const p = at((i / n) * draw);
        if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // The plane rides the head of the line and settles onto the destination
    const planeIn = smooth(seg(u, 0.06, 0.12));
    const planeOut = smooth(seg(u, 0.56, 0.66));
    if (planeIn > 0 && planeOut < 1) {
      const q = Math.max(0.001, draw);
      const p = at(q), p2 = at(Math.min(1, q + 0.01)), p1 = at(Math.max(0, q - 0.01));
      ctx.globalAlpha = planeIn * (1 - planeOut);
      drawPlane(ctx, p.x, p.y, Math.atan2(p2.y - p1.y, p2.x - p1.x), 8 * (1 - 0.5 * planeOut), C.ink);
      ctx.globalAlpha = 1;
    }

    // Arrival: a pin settles, an amber ring spreads, the stamp rises
    const pin = settle(seg(u, 0.58, 0.7));
    if (pin > 0) {
      const ring = out(seg(u, 0.6, 0.92));
      ctx.globalAlpha = fade;
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5;
      ctx.globalAlpha = fade * (1 - ring);
      ctx.beginPath(); ctx.arc(B.x, B.y, 5 + 20 * ring, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.fillStyle = C.amber;
      ctx.beginPath(); ctx.arc(B.x, B.y, 5 * pin, 0, Math.PI * 2); ctx.fill();

      const lab = smooth(seg(u, 0.62, 0.74));
      if (lab > 0) {
        ctx.font = '700 11px "SF Mono", Consolas, "Noto Sans KR", monospace';
        const text = `${dest.code}  ${dest.name}`;
        const tw = ctx.measureText(text).width + 18;
        const lx = clamp(B.x - tw / 2, 4, w - tw - 4);
        const ly = Math.max(4, B.y - 34) + (1 - lab) * 6;
        ctx.globalAlpha = fade * lab;
        ctx.fillStyle = C.ink;
        roundRect(ctx, lx, ly, tw, 22, 11); ctx.fill();
        ctx.fillStyle = C.surface;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, lx + 9, ly + 11.5);
      }
      ctx.globalAlpha = 1;
    }

    // Ground: skyline and shore drift slowly behind, the path rolls under the traveler
    walker.step(dt * 1000, 1, 0.85);
    const ground = walker.distance * s;
    const back = ground * 0.45;
    ctx.fillStyle = C.faint;
    ctx.strokeStyle = C.faint;
    const ms = s * 1.15;
    for (let rep = -1; rep <= Math.ceil(w / (MARK_SPAN * ms)) + 1; rep++) {
      for (const m of MARKS) {
        const x = rep * MARK_SPAN * ms + m.x * ms - (back % (MARK_SPAN * ms));
        if (x < -60 || x > w + 60) continue;
        drawMark(ctx, m, x, groundY, ms);
      }
    }
    ctx.strokeStyle = C.soft; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, groundY + 0.5); ctx.lineTo(w, groundY + 0.5); ctx.stroke();
    ctx.fillStyle = C.soft;
    const gap = 26;
    for (let x = -(ground % gap); x < w; x += gap) { ctx.fillRect(x, groundY + 6, 10, 1.5); }

    const pose = poseTraveler(walker, Math.max(70 * s + 10, w * 0.2), groundY, s, dark ? TRAVELER_DARK : TRAVELER_LIGHT);
    drawTraveler(ctx, pose, dark ? TRAVELER_DARK : TRAVELER_LIGHT);
  };
}

function drawMark(ctx: CanvasRenderingContext2D, m: Mark, x: number, gy: number, s: number) {
  const hh = m.h * s;
  if (m.kind === 'block') {
    roundRect(ctx, x, gy - hh, 22 * s, hh, 3 * s); ctx.fill();
  } else if (m.kind === 'tower') {
    ctx.fillRect(x + 9 * s, gy - hh, 4 * s, hh);
    roundRect(ctx, x + 4 * s, gy - hh * 0.78, 14 * s, 9 * s, 4.5 * s); ctx.fill();
    roundRect(ctx, x, gy - hh * 0.3, 22 * s, hh * 0.3, 3 * s); ctx.fill();
  } else if (m.kind === 'hut') {
    ctx.beginPath();
    ctx.moveTo(x, gy - hh * 0.55); ctx.lineTo(x + 15 * s, gy - hh); ctx.lineTo(x + 30 * s, gy - hh * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillRect(x + 5 * s, gy - hh * 0.55, 20 * s, hh * 0.55);
  } else {
    // Palm: a leaning trunk and five fronds
    const top = { x: x + 10 * s, y: gy - hh };
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + 2 * s, gy - hh * 0.6, top.x, top.y); ctx.stroke();
    ctx.lineWidth = 2.6 * s;
    for (const a of [-2.6, -2.0, -1.2, -0.5, 0.15]) {
      const len = 20 * s;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x + Math.cos(a) * len * 0.6, top.y + Math.sin(a) * len * 0.6 - 6 * s, top.x + Math.cos(a) * len, top.y + Math.sin(a) * len + 6 * s);
      ctx.stroke();
    }
  }
}

