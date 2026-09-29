// Flat, curve-drawn traveler (long black hair, white sleeveless top, A-line midi skirt)
// pulling a carry-on. Joints come from the gait; every outline is a smooth spline through them. Drawn on a 2D canvas in "units": the figure is ~170 units tall,
// origin at the hip, y pointing down. Scale `s` converts units to pixels.

export interface Pt { x: number; y: number }

export interface TravelerPalette {
  skin: string;
  skinShade: string;
  hair: string;
  eye: string;
  top: string;
  topShade: string;
  bottom: string;
  bottomFar: string;
  shoe: string;
  bag: string;
  bagShade: string;
  handle: string;
  shadow: string;
}

export const TRAVELER_LIGHT: TravelerPalette = {
  skin: '#F4D3BA',
  skinShade: '#E6BC9E',
  hair: '#111111',
  eye: '#000000',
  top: '#FFFFFF',
  topShade: '#E4E1DA',
  bottom: '#111111',
  bottomFar: '#2A2A2A',
  shoe: '#111111',
  bag: '#DC2626',
  bagShade: '#B31E1E',
  handle: '#111111',
  shadow: 'rgba(0,0,0,0.12)',
};

// Dark stage: hair and trousers lift to charcoal so the silhouette survives on #111; the eye stays black
export const TRAVELER_DARK: TravelerPalette = {
  ...TRAVELER_LIGHT,
  hair: '#4A4A50',
  top: '#F5F5F3',
  topShade: '#D9D7D2',
  bottom: '#46464C',
  bottomFar: '#34343A',
  shoe: '#46464C',
  bag: '#EF4444',
  bagShade: '#C22D2D',
  handle: '#D4D4D0',
  shadow: 'rgba(0,0,0,0.35)',
};

type Shape =
  | { k: 'smooth'; p: Pt[]; c: string }
  | { k: 'stroke'; p: Pt[]; w: number; c: string }
  | { k: 'circ'; o: Pt; r: number; c: string }
  | { k: 'line'; a: Pt; b: Pt; w: number; c: string };

export interface TravelerPose {
  shapes: Shape[];
  s: number;
  hip: Pt;
  ground: number;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Circular gaussian bump used to shape joint curves over the gait phase
function bump(x: number, c: number, w: number) {
  const d = ((((x - c) % TAU) + TAU * 1.5) % TAU) - Math.PI;
  return Math.exp((-d * d) / (2 * w * w));
}

// One leg, relative to the hip. psi = 0 is heel strike with the leg forward.
function legAt(psi: number, amp: number) {
  const a = (amp * 21 * Math.cos(psi) + 2) * DEG;
  const knee = (4 + amp * (12 * bump(psi, 0.45, 0.35) + 60 * bump(psi, Math.PI + 1.25, 0.6))) * DEG;
  const pitch = amp * (12 * bump(psi, 0, 0.3) - 26 * bump(psi, Math.PI - 0.1, 0.35) - 8 * bump(psi, Math.PI + 1.2, 0.6)) * DEG;
  const k = { x: Math.sin(a) * 42, y: Math.cos(a) * 42 };
  const shin = a - knee;
  const ank = { x: k.x + Math.sin(shin) * 40, y: k.y + Math.cos(shin) * 40 };
  const c = Math.cos(-pitch), s = Math.sin(-pitch);
  const foot = (vx: number, vy: number): Pt => ({ x: ank.x + vx * c - vy * s, y: ank.y + vx * s + vy * c });
  const heel = foot(-4, 4.5), toe = foot(13, 4.5);
  return { a, shin, knee: k, ank, heel, toe, low: Math.max(heel.y, toe.y) + 3.2 };
}

/** Ground units covered per radian of gait phase at full stride */
export const STRIDE_PER_RAD = (legAt(0, 1).ank.x - legAt(Math.PI, 1).ank.x) / Math.PI;

const HAIR_POINTS = 7;
const HAIR_SEG = 9;
const HAIR_WIDTH = [22, 22, 21, 20, 19, 17.5, 16];

export class Traveler {
  phase = 0;
  amp = 1;
  distance = 0;
  private dt = 16;
  private hair: { x: number; y: number; px: number; py: number }[] | null = null;

  /** Advance the gait. One cycle (two steps) per second at tempo 1. */
  step(dtMs: number, ampTarget: number, tempo = 1) {
    this.dt = dtMs;
    this.amp += (ampTarget - this.amp) * Math.min(1, dtMs / 200);
    const d = (dtMs / 1000) * TAU * tempo * (0.4 + 0.6 * this.amp);
    this.phase += d;
    this.distance += this.amp * STRIDE_PER_RAD * d;
  }

  // Verlet chain in ground-relative units: gravity, air drag from walking, a soft pull
  // toward the rest shape, and the back of the body as a wall the hair drapes over.
  simulateHair(anchor: Pt, back: (y: number) => number) {
    const n = HAIR_POINTS;
    if (!this.hair) {
      this.hair = Array.from({ length: n }, (_, i) => {
        const x = anchor.x - i * 1.8, y = anchor.y + i * HAIR_SEG;
        return { x, y, px: x, py: y };
      });
    }
    const P = this.hair;
    const dt = Math.min(0.034, Math.max(0.004, this.dt / 1000));
    const ax = -230 * this.amp + Math.sin(2 * this.phase - 0.7) * 120 * this.amp;
    const ay = 980;
    P[0].x = anchor.x; P[0].y = anchor.y; P[0].px = anchor.x; P[0].py = anchor.y;
    for (let i = 1; i < n; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.88, vy = (p.y - p.py) * 0.88;
      p.px = p.x; p.py = p.y;
      p.x += vx + ax * dt * dt;
      p.y += vy + ay * dt * dt;
      const rx = anchor.x - i * 1.8, ry = anchor.y + i * HAIR_SEG;
      p.x += (rx - p.x) * 0.05;
      p.y += (ry - p.y) * 0.05;
    }
    for (let it = 0; it < 6; it++) {
      for (let i = 1; i < n; i++) {
        const a = P[i - 1], b = P[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, k = (d - HAIR_SEG) / d;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; }
        else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
        const wall = back(b.y) - HAIR_WIDTH[i] * 0.3;
        if (b.x > wall) b.x = wall;
      }
    }
    return P;
  }
}

/** Build the figure for the current gait state; (x, groundY) is the hip's ground point in pixels. */
export function poseTraveler(w: Traveler, x: number, groundY: number, s: number, P: TravelerPalette): TravelerPose {
  const amp = w.amp, ph = w.phase;
  const N = legAt(ph, amp), F = legAt(ph + Math.PI, amp);
  const G = Math.max(N.low, F.low); // hip height: the lower foot always touches the ground
  const T = (p: Pt): Pt => ({ x: x + p.x * s, y: groundY + (p.y - G) * s });
  // A springier walk: more lean on the push-off, and the chest settles a beat after the hips
  const lean = (6 + amp * 2.2 * Math.sin(2 * ph + 0.4)) * DEG;
  const up = { x: Math.sin(lean), y: -Math.cos(lean) }, fw = { x: Math.cos(lean), y: Math.sin(lean) };
  const at = (o: Pt, f: number, u: number): Pt => ({ x: o.x + fw.x * f + up.x * u, y: o.y + fw.y * f + up.y * u });
  const settle = amp * 1.1 * Math.sin(2 * ph - 1.1);
  const hip = { x: 0, y: 0 }, sh = at(hip, 0, 50 + settle * 0.4);
  const S: Shape[] = [];
  const smooth = (p: Pt[], c: string) => S.push({ k: 'smooth', p: p.map(T), c });
  const circ = (o: Pt, r: number, c: string) => S.push({ k: 'circ', o: T(o), r: r * s, c });
  const line = (a: Pt, b: Pt, wd: number, c: string) => S.push({ k: 'line', a: T(a), b: T(b), w: wd * s, c });
  const dir = (o: Pt, ang: number, len: number): Pt => ({ x: o.x + Math.sin(ang) * len, y: o.y + Math.cos(ang) * len });

  // Pulling arm first, so the carry-on can be solved backwards from the hand
  const shN = at(sh, 0.5, -5);
  const ua = (-30 + amp * 2.5 * Math.sin(2 * ph)) * DEG + lean * 0.3;
  const elN = dir(shN, ua, 27), fa = ua + 9 * DEG;
  const wrN = dir(elN, fa, 23), hand = dir(elN, fa, 26);
  const cw = 30, ch = 46, rod = 56, wr = 3.8;
  const reach = Math.hypot(ch + rod, cw * 0.35), gw = G - wr, dy = gw - hand.y;
  const pivot = { x: hand.x - Math.sqrt(Math.max(0, reach * reach - dy * dy)), y: gw };
  const th = Math.atan2(hand.x - pivot.x, pivot.y - hand.y) + Math.atan2(cw * 0.35, ch + rod);
  const av = { x: Math.sin(th), y: -Math.cos(th) }, pv = { x: Math.cos(th), y: Math.sin(th) };
  const bagPt = (a: number, p: number): Pt => ({ x: pivot.x + av.x * a + pv.x * p, y: pivot.y + av.y * a + pv.y * p });

  // Carry-on: a soft rounded shell with a lid band
  smooth(roundRect(bagPt, 0, -cw, ch, 0, 6), P.bag);
  smooth(roundRect(bagPt, ch - 7, -cw + 1.5, ch - 1.5, -1.5, 3), P.bagShade);
  line(bagPt(6, -cw * 0.5), bagPt(ch - 10, -cw * 0.5), 1.4, P.bagShade);
  circ(pivot, wr, P.handle);
  circ(bagPt(0, -cw + 4), wr * 0.9, P.handle);

  // Far arm (swings opposite the near leg), tapering to the hand
  const shF = at(sh, -2, -5);
  const ua2 = (amp * 24 * Math.cos(ph) - 3) * DEG + lean * 0.5;
  const el2 = dir(shF, ua2, 26), fa2 = ua2 + (16 + amp * 20 * Math.max(0, Math.cos(ph))) * DEG;
  const wr2 = dir(el2, fa2, 22);
  smooth(limb([shF, el2, wr2], [4.3, 3.1, 2.5]), P.skinShade);
  circ(dir(el2, fa2, 25), 3.1, P.skinShade);

  // Legs: shaped calves below the skirt, small rounded flats
  const leg = (L: ReturnType<typeof legAt>, off: number, skin: string) => {
    const o = (v: Pt): Pt => ({ x: v.x + off, y: v.y });
    const calf = o(lerpPt(L.knee, L.ank, 0.35));
    const calfPush = { x: calf.x - Math.cos(L.shin) * 1.2, y: calf.y + Math.sin(L.shin) * 1.2 };
    smooth(limb([{ x: off, y: 0 }, o(L.knee), calfPush, o(L.ank)], [8.5, 4.6, 4.4, 2.6]), skin);
    const heel = o(L.heel), toe = o(L.toe);
    const n = { x: -(toe.y - heel.y), y: toe.x - heel.x }, nl = Math.hypot(n.x, n.y) || 1;
    const nx = n.x / nl, ny = n.y / nl;
    smooth([
      { x: heel.x - nx * 2.6, y: heel.y - ny * 2.6 }, lerpPt(heel, toe, 0.45), { x: toe.x - nx * 1.8, y: toe.y - ny * 1.8 },
      { x: toe.x + nx * 0.2, y: toe.y + ny * 0.2 }, lerpPt({ x: heel.x + nx * 1.3, y: heel.y + ny * 1.3 }, toe, 0.5), { x: heel.x + nx * 1.3, y: heel.y + ny * 1.3 },
    ], P.shoe);
  };
  leg(F, -1.2, P.skinShade);
  leg(N, 1.2, P.skin);

  // A-line midi skirt: the hem opens with the stride and trails half a beat behind
  const waistB = at(hip, -9.5, 11), waistF = at(hip, 8.5, 11);
  const shinPt = (L: ReturnType<typeof legAt>, off: number) => ({ x: lerp(L.knee.x, L.ank.x, 0.26) + off, y: lerp(L.knee.y, L.ank.y, 0.26) });
  const pn = shinPt(N, 1.2), pf = shinPt(F, -1.2);
  const front = pn.x > pf.x ? pn : pf, back = pn.x > pf.x ? pf : pn;
  const trail = -amp * 3.2 * Math.sin(2 * ph - 1.5);
  const hemY = Math.max(front.y, back.y) + 1.5;
  const hemF = { x: front.x + 8 + trail * 0.5, y: hemY - 1.5 }, hemB = { x: back.x - 9 + trail, y: hemY + 0.5 };
  const hipF = at(hip, 11, 0), hipB = at(hip, -12.5, 1);
  const midHem = { x: lerp(hemB.x, hemF.x, 0.5), y: hemY + 2 + Math.abs(trail) * 0.3 };
  smooth([waistB, waistF, hipF, { x: lerp(hipF.x, hemF.x, 0.55) + 1.5, y: lerp(hipF.y, hemF.y, 0.55) }, hemF, midHem, hemB, { x: lerp(hipB.x, hemB.x, 0.5) - 2, y: lerp(hipB.y, hemB.y, 0.5) }, hipB], P.bottom);
  // One soft fold over the forward thigh
  const kF = pn.x > pf.x ? N.knee : F.knee;
  S.push({ k: 'stroke', p: [T(at(hip, 1, 8)), T({ x: kF.x * 0.6 + 1, y: kF.y * 0.55 }), T({ x: lerp(midHem.x, hemF.x, 0.35), y: hemY - 0.5 })], w: 1.3 * s, c: P.bottomFar });

  // Long hair down the back (physics chain, drawn behind the torso)
  const hc0 = at(sh, 3.5, 17.5);
  const hc = { x: hc0.x, y: hc0.y + amp * 1.1 * Math.sin(2 * ph - 1.3) };
  const shB = at(sh, -9, -5), wB = at(hip, -8.6, 13);
  const toGround = (p: Pt): Pt => ({ x: p.x, y: p.y - G });
  const backLine = (yg: number) => {
    const a = toGround(shB), b = toGround(wB);
    if (yg <= a.y) return hc.x - 6;
    return lerp(a.x, b.x, clamp((yg - a.y) / (b.y - a.y)));
  };
  const chain = w.simulateHair(toGround({ x: hc.x - 4.5, y: hc.y - 6.5 }), backLine)
    .map(q => ({ x: x + q.x * s, y: groundY + q.y * s }));
  S.push({ k: 'smooth', p: hairOutline(chain, HAIR_WIDTH.map(v => v * s)), c: P.hair });

  // Sleeveless top with a waist: shoulder, bust, nipped waist, into the skirt band
  const wF = at(hip, 7.4, 12.5), shFr = at(sh, 7, -4.5);
  const neckB = at(sh, -3, 1.5), neckF = at(sh, 4.5, 0.5);
  const top = [
    wB, at(hip, -9.4, 24), at(sh, -9.6, -12), shB, at(sh, -7.5, -1), neckB, neckF, shFr,
    at(sh, 9.2, -12), at(sh, 7.4, -19), at(hip, 6.6, 22), wF,
  ];
  smooth(top, P.top);
  smooth([wB, at(hip, -9.4, 24), at(sh, -9.6, -12), shB, lerpPt(shB, shFr, 0.22), at(sh, -4.4, -13), at(hip, -5, 23), lerpPt(wB, wF, 0.24)], P.topShade);

  // Neck, head, face
  smooth(limb([at(sh, 1.2, -1), at(sh, 2.4, 8)], [3.4, 3.1]), P.skin);
  circ(hc, 10.5, P.skin);
  smooth([{ x: hc.x + 9.4, y: hc.y - 2 }, { x: hc.x + 12.4, y: hc.y + 2.4 }, { x: hc.x + 9.4, y: hc.y + 3.6 }], P.skin);
  const capPts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (-40 - i * (220 / 12)) * DEG;
    capPts.push({ x: hc.x - 0.5 + Math.cos(a) * 11.4, y: hc.y - 0.9 + Math.sin(a) * 11.4 });
  }
  capPts.push({ x: hc.x - 4.5, y: hc.y + 2 }, { x: hc.x + 1, y: hc.y - 4.4 }, { x: hc.x + 7, y: hc.y - 5.6 });
  smooth(capPts, P.hair);
  circ({ x: hc.x - 0.8, y: hc.y + 1.8 }, 2.3, P.skinShade);
  circ({ x: hc.x + 6, y: hc.y - 1 }, 1.15, P.eye);

  // Telescopic handle, then the near (pulling) arm on top
  const rb = bagPt(ch, -cw * 0.35);
  line({ x: rb.x - 1.2, y: rb.y }, { x: hand.x - 1.2, y: hand.y }, 1.7, P.handle);
  line({ x: rb.x + 1.4, y: rb.y + 0.6 }, { x: hand.x + 0.6, y: hand.y + 0.4 }, 1.7, P.handle);
  smooth(limb([shN, elN, wrN], [4.5, 3.3, 2.7]), P.skin);
  circ(hand, 3.3, P.skin);

  return { shapes: S, s, hip: T(hip), ground: groundY };
}

// A tapered limb along joints, as a closed outline with rounded ends
function limb(j: Pt[], r: number[]): Pt[] {
  const L: Pt[] = [], R: Pt[] = [];
  for (let i = 0; i < j.length; i++) {
    const a = j[Math.max(0, i - 1)], b = j[Math.min(j.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l;
    L.push({ x: j[i].x + nx * r[i], y: j[i].y + ny * r[i] });
    R.push({ x: j[i].x - nx * r[i], y: j[i].y - ny * r[i] });
  }
  const cap = (c: Pt, from: Pt, rad: number, toward: Pt): Pt => {
    const dx = c.x - toward.x, dy = c.y - toward.y, l = Math.hypot(dx, dy) || 1;
    void from;
    return { x: c.x + (dx / l) * rad * 0.9, y: c.y + (dy / l) * rad * 0.9 };
  };
  const n = j.length;
  const tip = cap(j[n - 1], L[n - 1], r[n - 1], j[n - 2]);
  const base = cap(j[0], R[0], r[0], j[1]);
  return [...L, tip, ...R.reverse(), base];
}

// Rounded rectangle in the carry-on's own axes (a along the height, p across)
function roundRect(pt: (a: number, p: number) => Pt, a0: number, p0: number, a1: number, p1: number, r: number): Pt[] {
  return [
    pt(a0 + r, p0), pt(a0, p0 + r * 0.3), pt(a0, p1 - r * 0.3), pt(a0 + r, p1),
    pt(a1 - r, p1), pt(a1, p1 - r * 0.3), pt(a1, p0 + r * 0.3), pt(a1 - r, p0),
  ];
}

// Ribbon around the hair chain: front edge down, rounded tip, back edge up
function hairOutline(pts: Pt[], widths: number[]): Pt[] {
  const front: Pt[] = [], back: Pt[] = [];
  const n = pts.length;
  let tx = 0, ty = 1;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    tx = (b.x - a.x) / l; ty = (b.y - a.y) / l;
    const nx = -ty, ny = tx, hw = widths[i] / 2;
    back.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw });
    front.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw });
  }
  const tip = pts[n - 1], r = widths[n - 1] / 2, a0 = Math.atan2(-tx, ty);
  const round: Pt[] = [];
  for (let i = 1; i < 4; i++) {
    const a = a0 + (Math.PI * i) / 4;
    round.push({ x: tip.x + Math.cos(a) * r * 0.8, y: tip.y + Math.sin(a) * r * 0.8 });
  }
  return [...front, ...round, ...back.reverse()];
}

// Closed Catmull-Rom spline through the points, as cubic Béziers
function smoothPath(ctx: CanvasRenderingContext2D, p: Pt[], closed = true) {
  const n = p.length;
  ctx.beginPath();
  if (n < 3) { p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); return; }
  const get = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(p[0].x, p[0].y);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
      p2.x, p2.y,
    );
  }
  if (closed) ctx.closePath();
}

export function drawTraveler(ctx: CanvasRenderingContext2D, pose: TravelerPose, P: TravelerPalette, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // contact shadow under the feet and the carry-on
  ctx.fillStyle = P.shadow;
  ctx.beginPath();
  ctx.ellipse(pose.hip.x - 18 * pose.s, pose.ground + 1, 40 * pose.s, 2.6 * pose.s, 0, 0, TAU);
  ctx.fill();
  for (const sh of pose.shapes) {
    ctx.fillStyle = sh.c;
    ctx.strokeStyle = sh.c;
    if (sh.k === 'circ') { ctx.beginPath(); ctx.arc(sh.o.x, sh.o.y, sh.r, 0, TAU); ctx.fill(); }
    else if (sh.k === 'line') { ctx.lineWidth = sh.w; ctx.beginPath(); ctx.moveTo(sh.a.x, sh.a.y); ctx.lineTo(sh.b.x, sh.b.y); ctx.stroke(); }
    else if (sh.k === 'stroke') { ctx.lineWidth = sh.w; smoothPath(ctx, sh.p, false); ctx.stroke(); }
    else { smoothPath(ctx, sh.p); ctx.fill(); }
  }
  ctx.restore();
}
