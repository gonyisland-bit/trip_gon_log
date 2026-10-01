import { Traveler, poseTraveler, drawTraveler, TRAVELER_LIGHT, TRAVELER_DARK } from '../splash/travelerRig';
import { type SceneDraw, sceneInk, seg, smooth, inOut, out, settle, clamp, lerp, roundRect } from './useCanvasScene';

// Empty hubs (v1.3.6): the same traveler as the first-run hero, one small story per hub.
//   trip      walks in, stops and imagines a route to a pin, walks on
//   magazine  takes three photos that fly into a magazine spread
//   pocket    pins lift off a phone feed and drop into her red carry-on
// Every move eases in and out; under reduced motion each draws its resting composition.

export type EmptySceneKind = 'trip' | 'magazine' | 'pocket';

export function createEmptyScene(kind: EmptySceneKind): SceneDraw {
  if (kind === 'magazine') return magazineScene();
  if (kind === 'pocket') return pocketScene();
  return tripScene();
}

const scaleFor = (h: number) => clamp(h / 300, 0.42, 0.72);
const groundOf = (h: number) => h - Math.max(10, h * 0.06);

function ground(ctx: CanvasRenderingContext2D, w: number, gy: number, color: string) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w * 0.06, gy + 0.5); ctx.lineTo(w * 0.94, gy + 0.5); ctx.stroke();
}

function pinGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, hole: string) {
  // (x, y) is the tip
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - r * 0.4, y - r * 0.9, x - r, y - r * 1.25, x - r, y - r * 1.9);
  ctx.arc(x, y - r * 1.9, r, Math.PI, 0);
  ctx.bezierCurveTo(x + r, y - r * 1.25, x + r * 0.4, y - r * 0.9, x, y);
  ctx.fill();
  ctx.fillStyle = hole;
  ctx.beginPath(); ctx.arc(x, y - r * 1.9, r * 0.38, 0, Math.PI * 2); ctx.fill();
}

// ── trip ──────────────────────────────────────────────────────────────
function tripScene(): SceneDraw {
  const walker = new Traveler();
  let x = -1e9, mode: 'in' | 'pause' | 'out' = 'in', pauseT = 0, lastDist = 0;
  return ({ ctx, dt, w, h, dark, still }) => {
    const C = sceneInk(dark), P = dark ? TRAVELER_DARK : TRAVELER_LIGHT;
    const s = scaleFor(h), gy = groundOf(h), cx = w * 0.36;
    if (still) { x = cx; mode = 'pause'; pauseT = 2.6; walker.amp = 0; }
    else if (x < -1e8) { x = -80 * s; lastDist = walker.distance; }

    walker.step(dt * 1000, mode === 'pause' ? 0 : 1, 0.9);
    if (!still) { x += (walker.distance - lastDist) * s; }
    lastDist = walker.distance;
    if (mode === 'in' && x >= cx) { mode = 'pause'; pauseT = 0; }
    if (mode === 'pause') { if (!still) pauseT += dt; if (pauseT > 3.8 && !still) mode = 'out'; }
    if (mode === 'out' && x > w + 90 * s) { mode = 'in'; x = -90 * s; }

    ground(ctx, w, gy, C.soft);
    drawTraveler(ctx, poseTraveler(walker, x, gy, s, P), P);

    // The thought: two small dots, then a card with a route drawing to a pin
    const show = mode === 'pause' || mode === 'out' ? smooth(seg(pauseT, 0.2, 0.7)) * (1 - smooth(seg(pauseT, 3.3, 3.8))) : 0;
    if (show <= 0) return;
    const head = { x: x + 8 * s, y: gy - 170 * s };
    const bw = Math.min(w * 0.42, 150), bh = bw * 0.5;
    const bx = Math.min(w - bw - 8, head.x + 26 * s), by = Math.max(6, head.y - bh - 14 * s);
    ctx.globalAlpha = show;
    ctx.fillStyle = C.soft;
    ctx.beginPath(); ctx.arc(head.x + 12 * s, head.y - 4 * s, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(head.x + 20 * s, head.y - 14 * s, 4.5, 0, Math.PI * 2); ctx.fill();
    const pop = settle(seg(pauseT, 0.3, 0.9));
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(lerp(0.85, 1, pop), lerp(0.85, 1, pop));
    ctx.translate(-bw / 2, -bh / 2);
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.soft; ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, bw, bh, 14); ctx.fill(); ctx.stroke();
    const a = { x: bw * 0.18, y: bh * 0.66 }, b = { x: bw * 0.8, y: bh * 0.62 }, c = { x: bw * 0.5, y: bh * 0.05 };
    const q = inOut(seg(pauseT, 0.8, 2.0));
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.6; ctx.setLineDash([3.5, 4]); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const k = (i / 40) * q;
      const px = (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * c.x + k * k * b.x;
      const py = (1 - k) * (1 - k) * a.y + 2 * (1 - k) * k * c.y + k * k * b.y;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.fill();
    const pin = settle(seg(pauseT, 1.9, 2.4));
    if (pin > 0) pinGlyph(ctx, b.x, b.y + 4, 5.5 * pin, C.amber, C.paper);
    ctx.restore();
    ctx.globalAlpha = 1;
  };
}

// ── magazine ──────────────────────────────────────────────────────────
type Art = 'sea' | 'city' | 'peak';
function photoArt(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number, w: number, h: number, C: ReturnType<typeof sceneInk>) {
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.min(8, w * 0.08)); ctx.clip();
  ctx.fillStyle = C.sky; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.amber;
  ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.32, Math.min(w, h) * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.soft;
  if (art === 'sea') {
    ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
    ctx.fillStyle = C.surface; ctx.fillRect(x + w * 0.1, y + h * 0.74, w * 0.3, 1.5); ctx.fillRect(x + w * 0.5, y + h * 0.84, w * 0.34, 1.5);
  } else if (art === 'city') {
    [[0.06, 0.45], [0.22, 0.3], [0.38, 0.55], [0.56, 0.38], [0.74, 0.5]].forEach(([bx, bh]) => ctx.fillRect(x + w * bx, y + h * (1 - bh), w * 0.14, h * bh));
  } else {
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.35, y + h * 0.42); ctx.lineTo(x + w * 0.55, y + h * 0.66);
    ctx.lineTo(x + w * 0.75, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function magazineScene(): SceneDraw {
  const walker = new Traveler();
  walker.amp = 0;
  const PERIOD = 7.2, SHOTS = [0.6, 1.8, 3.0], FLY = 1.15;
  const ARTS: Art[] = ['sea', 'city', 'peak'];
  return ({ ctx, t, dt, w, h, dark, still }) => {
    const C = sceneInk(dark), P = dark ? TRAVELER_DARK : TRAVELER_LIGHT;
    const s = scaleFor(h), gy = groundOf(h);
    const u = still ? 5 : t % PERIOD;
    walker.step(dt * 1000, 0, 1);
    const hx = Math.max(70 * s + 16, w * 0.2);
    ground(ctx, w, gy, C.soft);
    drawTraveler(ctx, poseTraveler(walker, hx, gy, s, P), P);

    // Camera held at the face
    const cam = { x: hx + 20 * s, y: gy - 150 * s };
    ctx.fillStyle = C.ink;
    roundRect(ctx, cam.x - 13 * s, cam.y - 9 * s, 26 * s, 18 * s, 4 * s); ctx.fill();
    ctx.fillStyle = C.surface;
    ctx.beginPath(); ctx.arc(cam.x + 2 * s, cam.y, 5.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(cam.x + 2 * s, cam.y, 3.2 * s, 0, Math.PI * 2); ctx.fill();

    // Spread: two pages to the right
    const ph = Math.min(h * 0.68, (w * 0.5) / 1.4), pw = ph * 0.7;
    const sx = Math.min(w - pw * 2 - 10, Math.max(hx + 70 * s, w * 0.48)), sy = gy - ph - 4;
    const fadeAll = 1 - smooth(seg(u, PERIOD - 0.9, PERIOD - 0.2));
    ctx.globalAlpha = fadeAll;
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.soft; ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, pw, ph, 6); ctx.fill(); ctx.stroke();
    roundRect(ctx, sx + pw, sy, pw, ph, 6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.soft;
    ctx.beginPath(); ctx.moveTo(sx + pw, sy + 4); ctx.lineTo(sx + pw, sy + ph - 4); ctx.stroke();
    const pad = pw * 0.1;
    const slots = [
      { x: sx + pad, y: sy + pad, w: pw - pad * 2, h: ph * 0.56, r: -0.02 },
      { x: sx + pw + pad, y: sy + pad, w: pw - pad * 2, h: ph * 0.38, r: 0.025 },
      { x: sx + pw + pad, y: sy + pad * 1.6 + ph * 0.38, w: pw - pad * 2, h: ph * 0.38, r: -0.015 },
    ];
    // Title lines under the big photo once the last picture lands
    const title = smooth(seg(u, SHOTS[2] + FLY, SHOTS[2] + FLY + 0.6));
    if (title > 0) {
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = fadeAll * title;
      roundRect(ctx, sx + pad, sy + ph * 0.56 + pad * 1.6, (pw - pad * 2) * 0.8 * title, Math.max(4, ph * 0.05), 3); ctx.fill();
      ctx.fillStyle = C.soft;
      roundRect(ctx, sx + pad, sy + ph * 0.56 + pad * 1.6 + ph * 0.09, (pw - pad * 2) * 0.55 * title, Math.max(3, ph * 0.035), 2); ctx.fill();
      ctx.fillStyle = C.red;
      ctx.beginPath(); ctx.arc(sx + pw - pad - 3, sy + ph - pad, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    SHOTS.forEach((at, i) => {
      // Flash: one soft amber bloom at the lens
      const fl = seg(u, at - 0.05, at + 0.35);
      if (fl > 0 && fl < 1) {
        ctx.globalAlpha = 0.5 * (1 - fl);
        ctx.fillStyle = C.amber;
        ctx.beginPath(); ctx.arc(cam.x + 2 * s, cam.y, (6 + 26 * out(fl)) * s, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const k = inOut(seg(u, at, at + FLY));
      if (k <= 0) return;
      const sl = slots[i];
      const from = { x: cam.x + 10 * s, y: cam.y };
      const to = { x: sl.x + sl.w / 2, y: sl.y + sl.h / 2 };
      const lift = Math.min(h * 0.3, 60);
      const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - lift;
      const px = (1 - k) * (1 - k) * from.x + 2 * (1 - k) * k * mx + k * k * to.x;
      const py = (1 - k) * (1 - k) * from.y + 2 * (1 - k) * k * my + k * k * to.y;
      const sc = lerp(0.25, 1, out(seg(u, at, at + FLY * 0.9)));
      ctx.save();
      ctx.globalAlpha = fadeAll;
      ctx.translate(px, py);
      ctx.rotate(lerp(-0.25, sl.r, k));
      ctx.scale(sc, sc);
      photoArt(ctx, ARTS[i], -sl.w / 2, -sl.h / 2, sl.w, sl.h, C);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  };
}

// ── pocket ────────────────────────────────────────────────────────────
function pocketScene(): SceneDraw {
  const walker = new Traveler();
  walker.amp = 0;
  const STEP = 3.2;
  return ({ ctx, t, dt, w, h, dark, still }) => {
    const C = sceneInk(dark), P = dark ? TRAVELER_DARK : TRAVELER_LIGHT;
    const s = scaleFor(h), gy = groundOf(h);
    const tt = still ? STEP * 2 + 2.6 : t;
    const i = Math.floor(tt / STEP), u = (tt % STEP) / STEP;
    walker.step(dt * 1000, 0, 1);
    const hx = Math.max(90 * s, w * 0.3);
    ground(ctx, w, gy, C.soft);
    drawTraveler(ctx, poseTraveler(walker, hx, gy, s, P), P);
    const bag = { x: hx - 40 * s, y: gy - 68 * s };

    // Phone with a feed that scrolls one post per pin
    const fh = Math.min(h * 0.74, 190), fw = fh * 0.52;
    const fx = Math.min(w - fw - 12, Math.max(hx + 60 * s, w * 0.62)), fy = gy - fh;
    ctx.fillStyle = C.ink;
    roundRect(ctx, fx, fy, fw, fh, fw * 0.16); ctx.fill();
    const ix = fx + 4, iy = fy + 4, iw = fw - 8, ih = fh - 8;
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, fw * 0.13); ctx.clip();
    ctx.fillStyle = C.surface; ctx.fillRect(ix, iy, iw, ih);
    const postH = ih * 0.62;
    const scroll = inOut(seg(u, 0.72, 0.98)) * postH;
    for (let k = 0; k < 3; k++) {
      const py = iy + 10 + k * postH - scroll;
      const art: Art = (['sea', 'city', 'peak'] as Art[])[(i + k) % 3];
      photoArt(ctx, art, ix + 6, py, iw - 12, postH * 0.66, C);
      ctx.fillStyle = C.soft;
      roundRect(ctx, ix + 6, py + postH * 0.72, (iw - 12) * 0.8, 4, 2); ctx.fill();
      roundRect(ctx, ix + 6, py + postH * 0.72 + 8, (iw - 12) * 0.5, 4, 2); ctx.fill();
      // The pin waiting on the post (the first one leaves this round)
      const leaving = k === 0;
      if (!leaving || u < 0.06) pinGlyph(ctx, ix + iw - 16, py + 20, 5, C.red, C.surface);
    }
    ctx.restore();

    // The pin lifts off, arcs over and drops into the carry-on
    const lift = out(seg(u, 0.06, 0.22));
    const fly = inOut(seg(u, 0.22, 0.62));
    if (u >= 0.06 && u < 0.66) {
      const from = { x: ix + iw - 16, y: iy + 10 + 20 - lift * 14 };
      const to = { x: bag.x, y: bag.y };
      const mx = (from.x + to.x) / 2, my = Math.min(from.y, to.y) - Math.min(h * 0.35, 70);
      const px = (1 - fly) * (1 - fly) * from.x + 2 * (1 - fly) * fly * mx + fly * fly * to.x;
      const py = (1 - fly) * (1 - fly) * from.y + 2 * (1 - fly) * fly * my + fly * fly * to.y;
      ctx.globalAlpha = 1 - smooth(seg(u, 0.58, 0.66));
      pinGlyph(ctx, px, py, lerp(5, 6.5, Math.sin(fly * Math.PI)), C.red, C.surface);
      ctx.globalAlpha = 1;
    }
    // The bag answers with one soft ring and its count
    const landed = u >= 0.62;
    const ring = seg(u, 0.62, 0.9);
    if (ring > 0 && ring < 1) {
      ctx.strokeStyle = C.red; ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.6 * (1 - ring);
      ctx.beginPath(); ctx.arc(bag.x, bag.y + 14 * s, (10 + 26 * out(ring)) * s, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const count = (i % 3) + (landed ? 1 : 0);
    if (count > 0) {
      const pop = landed && count === (i % 3) + 1 ? settle(seg(u, 0.62, 0.78)) : 1;
      const r = 9 * Math.max(0.6, s / 0.6) * pop;
      const bxp = bag.x + 14 * s, byp = bag.y - 8 * s;
      // After the third pin the count clears for the next round
      ctx.globalAlpha = i % 3 === 2 && landed ? 1 - smooth(seg(u, 0.88, 1)) : 1;
      ctx.fillStyle = C.amber;
      ctx.beginPath(); ctx.arc(bxp, byp, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141412';
      ctx.font = `700 ${Math.round(r * 1.1)}px "SF Mono", Consolas, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(count), bxp, byp + 0.5);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  };
}
