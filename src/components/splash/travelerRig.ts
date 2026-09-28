// Flat, mass-shaded traveler (long black hair, white sleeveless top, wide black trousers)
// pulling a carry-on. Drawn on a 2D canvas in "units": the figure is ~170 units tall,
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
  | { k: 'cap'; a: Pt; b: Pt; ra: number; rb: number; c: string }
  | { k: 'poly'; p: Pt[]; c: string; round?: number }
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
  const lean = (5 + amp * 1.3 * Math.sin(2 * ph + 0.4)) * DEG;
  const up = { x: Math.sin(lean), y: -Math.cos(lean) }, fw = { x: Math.cos(lean), y: Math.sin(lean) };
  const at = (o: Pt, f: number, u: number): Pt => ({ x: o.x + fw.x * f + up.x * u, y: o.y + fw.y * f + up.y * u });
  const hip = { x: 0, y: 0 }, sh = at(hip, 0, 50);
  const S: Shape[] = [];
  const cap = (a: Pt, b: Pt, ra: number, rb: number, c: string) => S.push({ k: 'cap', a: T(a), b: T(b), ra: ra * s, rb: rb * s, c });
  const poly = (p: Pt[], c: string, round = 1.6) => S.push({ k: 'poly', p: p.map(T), c, round: round * s });
  const circ = (o: Pt, r: number, c: string) => S.push({ k: 'circ', o: T(o), r: r * s, c });
  const line = (a: Pt, b: Pt, wd: number, c: string) => S.push({ k: 'line', a: T(a), b: T(b), w: wd * s, c });
  const dir = (o: Pt, ang: number, len: number): Pt => ({ x: o.x + Math.sin(ang) * len, y: o.y + Math.cos(ang) * len });

  // Pulling arm first, so the carry-on can be solved backwards from the hand
  const shN = at(sh, 0.5, -5);
  const ua = (-30 + amp * 2.5 * Math.sin(2 * ph)) * DEG + lean * 0.3;
  const elN = dir(shN, ua, 27), fa = ua + 7 * DEG;
  const wrN = dir(elN, fa, 23), hand = dir(elN, fa, 26);
  const cw = 30, ch = 46, rod = 56, wr = 3.8;
  const reach = Math.hypot(ch + rod, cw * 0.35), gw = G - wr, dy = gw - hand.y;
  const pivot = { x: hand.x - Math.sqrt(Math.max(0, reach * reach - dy * dy)), y: gw };
  const th = Math.atan2(hand.x - pivot.x, pivot.y - hand.y) + Math.atan2(cw * 0.35, ch + rod);
  const av = { x: Math.sin(th), y: -Math.cos(th) }, pv = { x: Math.cos(th), y: Math.sin(th) };
  const bagPt = (a: number, p: number): Pt => ({ x: pivot.x + av.x * a + pv.x * p, y: pivot.y + av.y * a + pv.y * p });

  // Carry-on
  poly([pivot, bagPt(0, -cw), bagPt(ch, -cw), bagPt(ch, 0)], P.bag, 2.4);
  poly([bagPt(1, -cw), bagPt(1, -cw + 6), bagPt(ch - 1, -cw + 6), bagPt(ch - 1, -cw)], P.bagShade, 1);
  line(bagPt(5, -cw * 0.42), bagPt(ch - 5, -cw * 0.42), 1.6, P.bagShade);
  line(bagPt(5, -cw * 0.72), bagPt(ch - 5, -cw * 0.72), 1.6, P.bagShade);
  circ(pivot, wr, P.handle);
  circ(bagPt(0, -cw + 4), wr * 0.9, P.handle);

  // Far arm (swings opposite the near leg)
  const shF = at(sh, -2, -5);
  const ua2 = (amp * 22 * Math.cos(ph) - 3) * DEG + lean * 0.5;
  const el2 = dir(shF, ua2, 27), fa2 = ua2 + (14 + amp * 18 * Math.max(0, Math.cos(ph))) * DEG;
  cap(shF, el2, 4.4, 3.7, P.skinShade);
  cap(el2, dir(el2, fa2, 23), 3.6, 2.9, P.skinShade);
  circ(dir(el2, fa2, 26), 3.2, P.skinShade);

  // Wide-leg trousers: tapered thigh, flared shin panel, small shoe
  const leg = (L: ReturnType<typeof legAt>, off: number, cloth: string) => {
    const o = (v: Pt): Pt => ({ x: v.x + off, y: v.y });
    const k = o(L.knee), an = o(L.ank);
    cap({ x: off, y: 0 }, k, 9, 7.8, cloth);
    const n = { x: Math.cos(L.shin), y: -Math.sin(L.shin) };
    const hem = { x: an.x + Math.sin(L.shin) * 1.5, y: an.y + Math.cos(L.shin) * 1.5 };
    poly([
      { x: k.x - n.x * 7.8, y: k.y - n.y * 7.8 }, { x: k.x + n.x * 7.8, y: k.y + n.y * 7.8 },
      { x: hem.x + n.x * 9.8, y: hem.y + n.y * 9.8 }, { x: hem.x - n.x * 9.8, y: hem.y - n.y * 9.8 },
    ], cloth, 1.2);
    cap(o(L.heel), o(L.toe), 3.2, 2.5, P.shoe);
  };
  leg(F, -1.2, P.bottomFar);
  leg(N, 1.2, P.bottom);
  poly([at(hip, -10, 15), at(hip, 9, 15), { x: 10.5, y: 7 }, { x: -11, y: 7 }], P.bottom, 2);

  // Long hair hanging down the back (physics chain, drawn behind the torso)
  const hc0 = at(sh, 3.5, 17.5);
  const hc = { x: hc0.x, y: hc0.y + amp * 0.8 * Math.sin(2 * ph - 0.9) };
  const shB = at(sh, -9, -5), wB = at(hip, -8.8, 13);
  const toGround = (p: Pt): Pt => ({ x: p.x, y: p.y - G });
  const backLine = (yg: number) => {
    const a = toGround(shB), b = toGround(wB);
    if (yg <= a.y) return hc.x - 6;
    return lerp(a.x, b.x, clamp((yg - a.y) / (b.y - a.y)));
  };
  const chain = w.simulateHair(toGround({ x: hc.x - 4.5, y: hc.y - 6.5 }), backLine)
    .map(q => ({ x: x + q.x * s, y: groundY + q.y * s }));
  S.push({ k: 'poly', p: hairOutline(chain, HAIR_WIDTH.map(v => v * s)), c: P.hair, round: 0 });

  // White sleeveless top
  const wF = at(hip, 7.6, 13), shFr = at(sh, 7.2, -5);
  poly([wB, wF, shFr, shB], P.top, 2);
  circ(at(sh, -2.5, -6), 7.8, P.top);
  circ(at(sh, 4.6, -14), 4.6, P.top);
  poly([wB, lerpPt(wB, wF, 0.26), lerpPt(shB, shFr, 0.26), shB], P.topShade, 0.6);

  // Neck, head, face
  cap(at(sh, 1.5, -2), at(sh, 2.5, 7), 3.4, 3.2, P.skin);
  circ(hc, 10.5, P.skin);
  poly([{ x: hc.x + 9.6, y: hc.y - 1.5 }, { x: hc.x + 12.6, y: hc.y + 2.6 }, { x: hc.x + 9.4, y: hc.y + 3.8 }], P.skin, 0.8);
  const capPts: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (-46 - i * (214 / 18)) * DEG;
    capPts.push({ x: hc.x - 0.5 + Math.cos(a) * 11.3, y: hc.y - 0.9 + Math.sin(a) * 11.3 });
  }
  capPts.push({ x: hc.x - 4, y: hc.y + 1.5 }, { x: hc.x + 2.8, y: hc.y - 5 });
  poly(capPts, P.hair, 0.6);
  circ({ x: hc.x - 0.8, y: hc.y + 1.8 }, 2.3, P.skinShade);
  circ({ x: hc.x + 6, y: hc.y - 1 }, 1.15, P.eye);

  // Telescopic handle, then the near (pulling) arm on top
  const rb = bagPt(ch, -cw * 0.35);
  line({ x: rb.x - 1.2, y: rb.y }, { x: hand.x - 1.2, y: hand.y }, 1.7, P.handle);
  line({ x: rb.x + 1.4, y: rb.y + 0.6 }, { x: hand.x + 0.6, y: hand.y + 0.4 }, 1.7, P.handle);
  cap(shN, elN, 4.6, 3.8, P.skin);
  cap(elN, wrN, 3.7, 3, P.skin);
  circ(hand, 3.3, P.skin);

  return { shapes: S, s, hip: T(hip), ground: groundY };
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
  // sweep from the front edge, through the tangent (down), to the back edge
  const tip = pts[n - 1], r = widths[n - 1] / 2, a0 = Math.atan2(-tx, ty);
  const round: Pt[] = [];
  for (let i = 1; i < 10; i++) {
    const a = a0 + (Math.PI * i) / 10;
    round.push({ x: tip.x + Math.cos(a) * r, y: tip.y + Math.sin(a) * r });
  }
  return [...front, ...round, ...back.reverse()];
}

function capsulePath(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, ra: number, rb: number) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  ctx.beginPath();
  if (L < 1e-3) { ctx.arc(a.x, a.y, Math.max(ra, rb), 0, TAU); return; }
  const ang = Math.atan2(dy, dx), d = Math.asin(clamp((ra - rb) / L, -1, 1));
  ctx.arc(a.x, a.y, ra, ang + Math.PI / 2 + d, ang + Math.PI * 1.5 - d, false);
  ctx.arc(b.x, b.y, rb, ang - Math.PI / 2 - d, ang + Math.PI / 2 + d, false);
  ctx.closePath();
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
    if (sh.k === 'cap') { capsulePath(ctx, sh.a, sh.b, sh.ra, sh.rb); ctx.fill(); }
    else if (sh.k === 'circ') { ctx.beginPath(); ctx.arc(sh.o.x, sh.o.y, sh.r, 0, TAU); ctx.fill(); }
    else if (sh.k === 'line') { ctx.lineWidth = sh.w; ctx.beginPath(); ctx.moveTo(sh.a.x, sh.a.y); ctx.lineTo(sh.b.x, sh.b.y); ctx.stroke(); }
    else {
      ctx.beginPath();
      sh.p.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      if (sh.round) { ctx.lineWidth = sh.round; ctx.stroke(); }
    }
  }
  ctx.restore();
}
