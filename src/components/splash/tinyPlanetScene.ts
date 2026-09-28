// "Tiny Planet" splash: a close-up walk on a red horizon pulls back to reveal a dotted
// planet turning under her feet, a plane orbits, the planet's dots re-form as the logo
// and she hops onto the hairline beside it.
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from '../brandLogoData';
import { decodeWorldDots, type WorldDot } from '../../data/worldDots';
import { Traveler, poseTraveler, drawTraveler, TRAVELER_DARK, TRAVELER_LIGHT } from './travelerRig';

export const TINY_PLANET_DURATION = 5800;
/** When the vector logo and hairline take over from the dots */
export const TINY_PLANET_LOGO_IN: [number, number] = [4800, 5200];
export const TINY_PLANET_HAIRLINE_IN: [number, number] = [4700, 5200];

interface Rect { x: number; y: number; w: number; h: number }

export interface TinyPlanetOptions {
  width: number;
  height: number;
  logo: Rect;
  hairlineY: number;
  dark: boolean;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = {
  out3: (t: number) => 1 - Math.pow(1 - t, 3),
  io3: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  emph: (t: number) => 1 - Math.pow(1 - t, 4.2),
};

let dotsCache: WorldDot[] | null = null;

function ortho(lat: number, lng: number, lon0: number, lat0: number) {
  const p = lat * DEG, l = (lng - lon0) * DEG, p0 = lat0 * DEG;
  return {
    x: Math.cos(p) * Math.sin(l),
    y: Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l),
    z: Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l),
  };
}

// Points sampled inside the official logotype, in stage pixels
function logoDotTargets(rect: Rect, step: number) {
  const vbW = parseFloat(BRAND_LOGO_VIEWBOX.split(' ')[2]);
  const scale = rect.w / vbW;
  const oc = document.createElement('canvas');
  oc.width = Math.max(1, Math.ceil(rect.w));
  oc.height = Math.max(1, Math.ceil(rect.h));
  const o = oc.getContext('2d');
  if (!o) return [];
  o.scale(scale, scale);
  BRAND_LOGO_PATHS.forEach(d => o.fill(new Path2D(d)));
  const data = o.getImageData(0, 0, oc.width, oc.height).data;
  const pts: { x: number; y: number }[] = [];
  for (let y = step / 2; y < oc.height; y += step) {
    for (let x = step / 2; x < oc.width; x += step) {
      if (data[(Math.floor(y) * oc.width + Math.floor(x)) * 4 + 3] > 128) pts.push({ x: rect.x + x, y: rect.y + y });
    }
  }
  return pts;
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number, c: string) {
  const P = [[11, 0], [8.5, -1.3], [2.5, -1.3], [-2.5, -9.5], [-5, -9.5], [-2.2, -1.3], [-7, -1.3], [-9.2, -4.4], [-10.8, -4.4], [-9.6, 0]];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  ctx.fillStyle = c;
  ctx.beginPath();
  P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = P.length - 2; i > 0; i--) ctx.lineTo(P[i][0], -P[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createTinyPlanetScene(ctx: CanvasRenderingContext2D, opt: TinyPlanetOptions) {
  const { width: W, height: H, logo, hairlineY, dark } = opt;
  const ink = dark ? '242,242,240' : '13,13,13';
  const red = dark ? '#EF4444' : '#DC2626';
  const inkSolid = dark ? '#F2F2F0' : '#0D0D0D';
  const pal = dark ? TRAVELER_DARK : TRAVELER_LIGHT;

  const K = Math.min(W, H);
  const Rf = K * 0.24;                  // planet radius once fully revealed
  const sPlanet = (Rf * 0.62) / 170;    // traveler scale on the revealed planet
  const sClose = (H * 0.5) / 170;       // traveler scale in the opening close-up
  const zoomStart = Math.max(1.01, sClose / sPlanet);
  const sEnd = (logo.h * 1.08) / 170;   // lockup size beside the logo
  const xEnd = logo.x + logo.w + 34 * sEnd;

  if (!dotsCache) dotsCache = decodeWorldDots();
  const dots = dotsCache.filter(d => d.keep);
  const targets = logoDotTargets(logo, Math.max(3.2, logo.w / 115));
  const order = dots.map((_, i) => i).sort((a, b) => dots[a].h - dots[b].h);
  const dotTarget: ({ x: number; y: number } | undefined)[] = [];
  targets.forEach((q, k) => { if (k < order.length) dotTarget[order[k]] = q; });
  const logoDotR = Math.max(1, (logo.w / 115) * 0.42);

  const traveler = new Traveler();
  const font = "500 11px 'SF Mono', Consolas, monospace";

  return function frame(t: number, dt: number) {
    traveler.step(dt, t < 4900 ? 1 : 0, 1);
    ctx.clearRect(0, 0, W, H);

    // Continuous pull-back: log-space zoom keeps the speed of the reveal even
    const ze = ease.io3(seg(t, 1100, 2900));
    const Z = Math.exp(Math.log(zoomStart) * (1 - ze));
    const R = Rf * Z;
    const top = lerp(H * 0.8, H * 0.56 - Rf, ze);
    const cx = W / 2, cy = top + R;
    // planet spin matches her stride 1:1 so the feet never slide
    const beta = (-traveler.distance * sPlanet) / Rf;
    const cb = Math.cos(beta), sb = Math.sin(beta);
    const lon0 = 95 + t * 0.004, lat0 = 10;
    const conv = seg(t, 4000, 4900), fade = seg(t, 4800, 5150), rimA = 1 - seg(t, 3900, 4250);
    const dr = Math.min(3.6, Math.max(0.9, R / 140));

    if (rimA > 0) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${ink},${0.2 * rimA})`;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      // the path she has walked wraps the planet in red
      ctx.lineWidth = 2;
      ctx.strokeStyle = red;
      ctx.globalAlpha = rimA;
      ctx.beginPath(); ctx.arc(cx, cy, R + 1, -Math.PI / 2 + Math.max(beta, -TAU), -Math.PI / 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < dots.length; i++) {
      const p = dots[i], o = ortho(p.lat, p.lng, lon0, lat0), X = o.x * R, Y = -o.y * R;
      let x = cx + X * cb - Y * sb, y = cy + X * sb + Y * cb;
      let a = o.z > 0 ? 0.2 + 0.6 * o.z : o.z > -0.5 ? 0.06 : 0;
      let r = dr * (o.z > 0 ? 0.6 + 0.4 * o.z : 0.5);
      if (conv > 0) {
        const q = dotTarget[i];
        if (q) {
          const k = ease.io3(clamp(conv * 1.35 - p.h * 0.35)), burst = 0.35 * Math.sin(k * Math.PI);
          x = lerp(x, q.x, k) + (x - cx) * burst;
          y = lerp(y, q.y, k) + (y - cy) * burst;
          a = lerp(a, 0.9, k) * (1 - fade);
          r = lerp(r, logoDotR, k);
        } else a *= 1 - ease.out3(conv);
      }
      if (a < 0.01 || x < -8 || x > W + 8 || y < -8 || y > H + 8) continue;
      ctx.fillStyle = `rgba(${ink},${a})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    // Plane on a tilted orbit; dimmed while it passes behind the planet
    const op = seg(t, 2700, 4200);
    if (op > 0 && op < 1) {
      const Ro = R * 1.5, tilt = -16 * DEG, u0 = Math.PI, u = u0 + ease.io3(op) * TAU * 1.2;
      const pos = (v: number) => {
        const ox = Math.cos(v) * Ro, oy = Math.sin(v) * Ro * 0.3;
        return { x: cx + ox * Math.cos(tilt) - oy * Math.sin(tilt), y: cy + ox * Math.sin(tilt) + oy * Math.cos(tilt), z: Math.sin(v) };
      };
      const hidden = (q: { x: number; y: number; z: number }) => q.z < 0 && Math.hypot(q.x - cx, q.y - cy) < R;
      const len = Math.min(u - u0, TAU * 0.85), steps = 70, ea = 1 - seg(t, 3950, 4200);
      let prev = pos(u - len);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = red;
      for (let i = 1; i <= steps; i++) {
        const q = pos(u - len + (len * i) / steps);
        ctx.globalAlpha = (i / steps) * (hidden(q) ? 0.25 : 1) * ea;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        prev = q;
      }
      const q = pos(u), q2 = pos(u + 0.02);
      ctx.globalAlpha = (hidden(q) ? 0.3 : 1) * ea;
      drawPlane(ctx, q.x, q.y, Math.atan2(q2.y - q.y, q2.x - q.x), ((1 + 0.3 * q.z) * R) / 150, inkSolid);
      ctx.globalAlpha = 1;
    }
    const labelA = seg(t, 2700, 2950) * (1 - seg(t, 3900, 4150));
    if (labelA > 0) {
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${ink},${0.6 * labelA})`;
      const km = Math.round(40075 * clamp(op * 1.2)).toLocaleString('en-US');
      ctx.fillText(`ORBIT  ·  ${km} KM`, W / 2, H * 0.56 + Rf * 1.05 + 24);
    }

    // Traveler: on the planet, then an arcing hop onto the hairline beside the logo
    const lock = ease.io3(seg(t, 4000, 4900));
    const s = lerp(sPlanet * Z, sEnd, lock);
    const fx = lerp(cx, xEnd, lock);
    const fg = lerp(top, hairlineY, lock) - Math.sin(lock * Math.PI) * K * 0.12;
    drawTraveler(ctx, poseTraveler(traveler, fx, fg, s, pal), pal);
  };
}
