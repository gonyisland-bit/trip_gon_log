// Intro 3.0 stage ("한 줄의 여정"): a 2D canvas film on paper. One red line is the logo's underline,
// then a flight route on the map, the ground the traveler walks (terminal, city, beach), a line
// that photos hang from, and the underline again. render(t) is pure in t (the traveler's hair is
// the one bit of carried state), so the player can seek and the exporter can render frame by frame.
// Every change eases over one or two beats: no shake, no punch, no bounce.
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from '../components/brandLogoData';
import { decodeWorldDots, type WorldDot } from '../data/worldDots';
import type { ArtId } from '../art/catalog';
import { BEAT, LINES, TOTAL_BEATS, clamp, ease, lerp, seg, span } from './timeline';

const PAPER = '#F6F4EF', SURFACE = '#FFFDF9', INK = '#141412', RED = '#DC2626', AMBER = '#E9A23B';
const MUTED = '#6B6960', SKY = '#EFEBE2';
const SOFT = 'rgba(20,20,18,0.14)', FAINT = 'rgba(20,20,18,0.07)';
const SANS = '"Satoshi", "Noto Sans KR", -apple-system, sans-serif';
const MONO = '"SF Mono", Consolas, "Noto Sans KR", monospace';
const TAU = Math.PI * 2;
const N = 120; // points along the line
/** How far the scenery rolls per radian of the film's step clock (the old walker's stride) */
const STRIDE_PER_RAD = 18.85;
/** The traveler's scene on each stretch of the journey: gate, city, beach */
const TRAVEL_ART: { id: ArtId; from: number; to: number }[] = [
  { id: 'luggage-travel', from: 20.2, to: 28.8 },
  { id: 'backpacking', from: 28.2, to: 36.8 },
  { id: 'beach-drink', from: 36.2, to: 44.8 },
];

export interface StageOptions {
  /** The canvas the film is drawn on (the name is kept from the 3D stage) */
  glCanvas: HTMLCanvasElement;
  /** Kept for the player and exporter, which layer it on top; left empty */
  typeCanvas: HTMLCanvasElement;
  preserve?: boolean;
  /** Reduced motion: photos hang still */
  calm?: boolean;
  /** Draw the closing New trip pill (the in-app player shows a real button instead) */
  cta?: boolean;
}

interface Pt { x: number; y: number }

interface Layout {
  w: number; h: number; u: number; portrait: boolean; cx: number;
  barY: number; barHalf: number; gy: number; capX: number; capY: number; s: number;
  logoW: number; walkX: number;
  map: { x: number; y: number; k: number };
}

// Region of the map scene: Seoul and the places the film visits
const VIEW = { lng0: 95, lng1: 150, lat0: 47, lat1: -12 };
const SEOUL = { lng: 127, lat: 37.55 };
const PINS = [
  { lng: 139.7, lat: 35.7, code: 'TYO' }, { lng: 135.5, lat: 34.7, code: 'OSA' }, { lng: 108.2, lat: 16.05, code: 'DAD' },
  { lng: 100.5, lat: 13.75, code: 'BKK' }, { lng: 115.2, lat: -8.65, code: 'DPS' },
];

export class IntroStage {
  private ctx: CanvasRenderingContext2D;
  private opts: StageOptions;
  private L!: Layout;
  private dpr = 1;
  private dots: WorldDot[] = [];
  private logo: Path2D[] = [];
  private logoBox = { w: 489.16, h: 87.57 };
  private art = new Map<ArtId, HTMLImageElement>();

  constructor(opts: StageOptions) {
    this.opts = opts;
    const ctx = opts.glCanvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas unavailable');
    this.ctx = ctx;
    const vb = BRAND_LOGO_VIEWBOX.split(/\s+/).map(Number);
    this.logoBox = { w: vb[2], h: vb[3] };
    this.logo = BRAND_LOGO_PATHS.map(d => new Path2D(d));
    this.dots = decodeWorldDots().filter(d => d.lng >= VIEW.lng0 - 2 && d.lng <= VIEW.lng1 + 2 && d.lat <= VIEW.lat0 + 2 && d.lat >= VIEW.lat1 - 2);
    this.resize(opts.glCanvas.clientWidth || 640, opts.glCanvas.clientHeight || 360, 1);
  }

  async load() {
    if (typeof Image !== 'undefined') {
      await Promise.all(TRAVEL_ART.map(({ id }) => new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => { this.art.set(id, img); resolve(); };
        img.onerror = () => resolve();
        img.src = `/art/${id}.webp`;
      })));
    }
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    await Promise.all([
      document.fonts.load(`800 40px ${SANS}`, '도시로바다로 Tripgon'),
      document.fonts.load(`600 12px ${MONO}`, 'ICN TYO 0123'),
    ]).catch(() => {});
  }

  resize(w: number, h: number, dpr = 1) {
    this.dpr = dpr;
    const c = this.opts.glCanvas;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    const t = this.opts.typeCanvas;
    if (t.width !== 1) { t.width = 1; t.height = 1; }
    const portrait = h > w * 1.05;
    const u = portrait ? w / 360 : Math.min(w / 640, h / 360);
    const gy = portrait ? h * 0.72 : h * 0.8;
    // Map box: right of the captions when wide, in the middle band when tall
    const box = portrait
      ? { x0: 16 * u, x1: w - 16 * u, y0: h * 0.27, y1: h * 0.62 }
      : { x0: w * 0.36, x1: w - 28 * u, y0: 28 * u, y1: h - 28 * u };
    const k = Math.min((box.x1 - box.x0) / (VIEW.lng1 - VIEW.lng0), (box.y1 - box.y0) / (VIEW.lat0 - VIEW.lat1));
    const map = {
      x: box.x0 + ((box.x1 - box.x0) - k * (VIEW.lng1 - VIEW.lng0)) / 2,
      y: box.y0 + ((box.y1 - box.y0) - k * (VIEW.lat0 - VIEW.lat1)) / 2,
      k,
    };
    this.L = {
      w, h, u, portrait, cx: w / 2,
      barY: portrait ? h * 0.5 : h * 0.56,
      barHalf: 130 * u,
      gy,
      capX: portrait ? 28 * u : 40 * u,
      capY: portrait ? h * 0.15 : h * 0.22,
      s: (portrait ? 0.78 : 0.62) * u,
      logoW: (portrait ? 250 : 280) * u,
      walkX: portrait ? w * 0.3 : w * 0.28,
      map,
    };
  }

  dispose() { /* nothing held */ }

  render(t: number) {
    const ctx = this.ctx, L = this.L;
    const b = clamp(t / BEAT, 0, TOTAL_BEATS - 0.001);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, L.w, L.h);

    // The scenery rolls on the clock: one step a beat
    const phase = t * TAU * 0.75;
    const ground = phase * STRIDE_PER_RAD * L.s;

    this.mapScene(b);
    this.gateScene(b, t);
    this.cityScene(b, ground);
    this.seaScene(b, t, ground);
    this.groundDashes(b, ground);
    this.line(b);
    this.logScene(b, t);
    this.traveler(b, phase);
    this.logoAndTagline(b);
    this.captions(b);
  }

  // ── geometry ──────────────────────────────────────────────────────────
  private P(lng: number, lat: number): Pt {
    const m = this.L.map;
    return { x: m.x + (lng - VIEW.lng0) * m.k, y: m.y + (VIEW.lat0 - lat) * m.k };
  }

  private routeAt(q: number): Pt {
    const A = this.P(SEOUL.lng, SEOUL.lat), B = this.P(PINS[0].lng, PINS[0].lat);
    const c = { x: (A.x + B.x) / 2, y: Math.min(A.y, B.y) - Math.max(40 * this.L.u, Math.abs(B.x - A.x) * 0.5) };
    return { x: (1 - q) ** 2 * A.x + 2 * (1 - q) * q * c.x + q * q * B.x, y: (1 - q) ** 2 * A.y + 2 * (1 - q) * q * c.y + q * q * B.y };
  }

  private clothAt(q: number): Pt {
    const L = this.L;
    const y = L.portrait ? L.h * 0.3 : L.h * 0.31;
    return { x: lerp(-30 * L.u, L.w + 30 * L.u, q), y: y + Math.sin(Math.PI * q) * 26 * L.u };
  }

  /** The red line at beat b: bar → route → ground → photo line → bar */
  private lineAt(q: number, b: number): Pt {
    const L = this.L;
    const S = { x: L.cx - L.barHalf + 2 * L.barHalf * q, y: L.barY };
    const G = { x: lerp(-30 * L.u, L.w + 30 * L.u, q), y: L.gy };
    let p: Pt = S;
    const m1 = ease.io3(seg(b, 8, 10)), m2 = ease.io3(seg(b, 19.4, 21.4)), m3 = ease.io3(seg(b, 44, 46)), m4 = ease.io3(seg(b, 52, 54));
    if (m1 > 0) { const R = this.routeAt(q); p = { x: lerp(p.x, R.x, m1), y: lerp(p.y, R.y, m1) }; }
    if (m2 > 0) p = { x: lerp(p.x, G.x, m2), y: lerp(p.y, G.y, m2) };
    if (m3 > 0) { const C = this.clothAt(q); p = { x: lerp(p.x, C.x, m3), y: lerp(p.y, C.y, m3) }; }
    if (m4 > 0) p = { x: lerp(p.x, S.x, m4), y: lerp(p.y, S.y, m4) };
    return p;
  }

  private line(b: number) {
    const ctx = this.ctx, L = this.L;
    const draw = ease.io3(seg(b, 0.2, 2.2));
    if (draw <= 0) return;
    ctx.strokeStyle = RED; ctx.lineWidth = 3 * L.u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    // The opening draws it left to right; afterwards it is always whole
    for (let i = 0; i <= N; i++) {
      const p = this.lineAt((i / N) * draw, b);
      if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // ── open + outro ─────────────────────────────────────────────────────
  private drawLogo(alpha: number, reveal: number, rise: number) {
    if (alpha <= 0 || reveal <= 0) return;
    const ctx = this.ctx, L = this.L;
    const sc = L.logoW / this.logoBox.w;
    const lh = this.logoBox.h * sc;
    const x = L.cx - L.logoW / 2, y = L.barY - 18 * L.u - lh + rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.rect(x - 4, y - 8, (L.logoW + 8) * reveal, lh + 16); ctx.clip();
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.fillStyle = INK;
    this.logo.forEach(p => ctx.fill(p));
    ctx.restore();
  }

  private logoAndTagline(b: number) {
    const L = this.L;
    // Open: the logo wipes in over the drawn bar and leaves as the bar bends into a route
    const openA = 1 - ease.smooth(seg(b, 7, 8.4));
    this.drawLogo(openA, ease.io3(seg(b, 0.8, 2.6)), (1 - ease.out3(seg(b, 0.8, 2.6))) * 8 * L.u);
    // Outro: back on the bar
    this.drawLogo(1, ease.io3(seg(b, 53.4, 55.2)), (1 - ease.out3(seg(b, 53.4, 55.2))) * 8 * L.u);
    if (this.opts.cta) {
      const a = ease.smooth(seg(b, 56.5, 57.5));
      if (a > 0) {
        const ctx = this.ctx;
        ctx.font = `800 ${16 * L.u}px ${SANS}`;
        const tw = ctx.measureText('New trip').width + 36 * L.u, th = 40 * L.u;
        const x = L.cx - tw / 2, y = L.barY + 70 * L.u + (1 - ease.out3(seg(b, 56.5, 57.5))) * 8 * L.u;
        ctx.globalAlpha = a;
        ctx.fillStyle = RED; this.rr(x, y, tw, th, th / 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('New trip', L.cx, y + th / 2 + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
      }
    }
  }

  // ── map ──────────────────────────────────────────────────────────────
  /** The traveler in the scene of each stretch, rocking a little with the step */
  private traveler(b: number, phase: number) {
    const ctx = this.ctx, L = this.L;
    const size = (L.portrait ? 230 : 200) * L.u;
    const bob = Math.sin(phase) * 2.5 * L.u;
    for (const s of TRAVEL_ART) {
      const a = span(b, s.from, s.to, 1.2);
      const img = this.art.get(s.id);
      if (a <= 0 || !img || !img.naturalWidth) continue;
      ctx.globalAlpha = a;
      // The scenes are not square: fit the longer side to the box, feet on the ground line
      const k = size / Math.max(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      ctx.drawImage(img, L.walkX - w / 2, L.gy - h * 0.97 + bob, w, h);
    }
    ctx.globalAlpha = 1;
  }

  private mapScene(b: number) {
    if (b < 8 || b > 21) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    const r = Math.max(1, L.map.k * 0.55);
    ctx.fillStyle = SOFT;
    for (const d of this.dots) {
      const a = ease.smooth(seg(b, 8.4 + d.h * 1.6, 9.2 + d.h * 1.6)) * (1 - ease.smooth(seg(b, 18.8 + d.h * 0.9, 19.8 + d.h * 0.9)));
      if (a <= 0) continue;
      const p = this.P(d.lng, d.lat);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const out = 1 - ease.smooth(seg(b, 18.8, 19.8));
    // Seoul
    const A = this.P(SEOUL.lng, SEOUL.lat);
    const sa = ease.smooth(seg(b, 9.5, 10.3)) * out;
    if (sa > 0) {
      ctx.globalAlpha = sa; ctx.fillStyle = RED;
      ctx.beginPath(); ctx.arc(A.x, A.y, 5 * u, 0, TAU); ctx.fill();
      this.chip('ICN', A.x - 18 * u, A.y + 10 * u, 9 * u, sa, INK, SURFACE);
    }
    // Pins settle one a half-beat apart
    PINS.forEach((p, i) => {
      const k = seg(b, 11 + i * 0.5, 12 + i * 0.5);
      if (k <= 0) return;
      const P = this.P(p.lng, p.lat);
      ctx.globalAlpha = ease.smooth(k * 2) * out;
      this.pin(P.x, P.y - (1 - ease.settle(k)) * 22 * u, 6 * u * (i === 0 ? 1.15 : 1), i === 0 ? RED : AMBER);
      if (i === 0) this.chip('TYO', P.x + 10 * u, P.y - 28 * u, 9 * u, ease.smooth(seg(b, 12.5, 13.3)) * out, AMBER, INK);
    });
    ctx.globalAlpha = 1;
    // The plane rides the route
    const q = ease.io3(seg(b, 13.4, 17.6));
    const pa = span(b, 13.2, 18.4, 0.6) * out;
    if (pa > 0) {
      const p = this.routeAt(q), p2 = this.routeAt(Math.min(1, q + 0.01)), p1 = this.routeAt(Math.max(0, q - 0.01));
      ctx.globalAlpha = pa;
      this.plane(p.x, p.y, Math.atan2(p2.y - p1.y, p2.x - p1.x), 11 * u, INK);
      ctx.globalAlpha = 1;
    }
    // A three-day plan fills in under the caption
    const days = [['DAY 1', '시부야 · 하라주쿠'], ['DAY 2', '츠키지 · 긴자'], ['DAY 3', '오다이바 · 온천']];
    const cw = L.portrait ? L.w - 56 * u : 210 * u, ch = 34 * u;
    const x0 = L.capX, y0 = L.portrait ? L.h * 0.66 : L.capY + 52 * u;
    days.forEach(([d, place], i) => {
      const k = ease.out3(seg(b, 15.4 + i * 0.5, 16.4 + i * 0.5));
      const a = k * (1 - ease.smooth(seg(b, 18.8 + i * 0.15, 19.8 + i * 0.15)));
      if (a <= 0) return;
      const y = y0 + i * (ch + 8 * u) + (1 - k) * 12 * u;
      ctx.globalAlpha = a;
      ctx.fillStyle = SURFACE; this.rr(x0, y, cw, ch, 12 * u); ctx.fill();
      ctx.fillStyle = i === 0 ? RED : SOFT;
      ctx.beginPath(); ctx.arc(x0 + 16 * u, y + ch / 2, 4 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = MUTED; ctx.font = `600 ${9 * u}px ${MONO}`; ctx.textBaseline = 'middle';
      ctx.fillText(d, x0 + 28 * u, y + ch / 2 + 0.5);
      ctx.fillStyle = INK; ctx.font = `700 ${12.5 * u}px ${SANS}`;
      ctx.fillText(place, x0 + 74 * u, y + ch / 2 + 0.5);
      ctx.textBaseline = 'alphabetic';
    });
    ctx.globalAlpha = 1;
  }

  // ── terminal ─────────────────────────────────────────────────────────
  private gateScene(b: number, t: number) {
    const a = span(b, 20.4, 28.8, 1.2);
    if (a <= 0) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    // A wall of glass with a plane taxiing past
    const gx = L.portrait ? 18 * u : L.w * 0.42, gw = L.portrait ? L.w - 36 * u : L.w * 0.58 - 30 * u;
    const gh = L.portrait ? L.h * 0.3 : L.gy - 70 * u;
    const gyTop = L.gy - gh;
    ctx.globalAlpha = a;
    ctx.fillStyle = SKY; this.rr(gx, gyTop, gw, gh, 22 * u); ctx.fill();
    ctx.save(); this.rr(gx, gyTop, gw, gh, 22 * u); ctx.clip();
    ctx.strokeStyle = SURFACE; ctx.lineWidth = 3 * u;
    for (let i = 1; i < 4; i++) { const x = gx + (gw / 4) * i; ctx.beginPath(); ctx.moveTo(x, gyTop); ctx.lineTo(x, L.gy); ctx.stroke(); }
    const px = lerp(gx + gw + 120 * u, gx - 160 * u, seg(b, 20.4, 28.8));
    this.sidePlane(px, L.gy - 18 * u, 150 * u);
    ctx.restore();
    // Departures board: the destination turns over letter by letter, softly
    const bw = L.portrait ? L.w - 56 * u : 236 * u, bh = 70 * u;
    const bx = L.portrait ? 28 * u : gx + gw - bw - 18 * u, by = L.portrait ? L.capY + 40 * u : gyTop + 18 * u;
    ctx.fillStyle = SURFACE; this.rr(bx, by, bw, bh, 14 * u); ctx.fill();
    ctx.fillStyle = MUTED; ctx.font = `600 ${8.5 * u}px ${MONO}`; ctx.textBaseline = 'top';
    ctx.fillText('DEPARTURES', bx + 14 * u, by + 12 * u);
    ctx.font = `700 ${20 * u}px ${MONO}`;
    const from = 'ICN  →  ---', to = 'ICN  →  TYO';
    let cx = bx + 14 * u;
    [...to].forEach((ch, i) => {
      const k = ease.smooth(seg(b, 23 + i * 0.08, 23.6 + i * 0.08));
      const before = from[i] || ' ';
      ctx.fillStyle = i >= 8 ? AMBER : INK;
      if (before !== ch && k < 1) { ctx.globalAlpha = a * (1 - k); ctx.fillText(before, cx, by + 27 * u - k * 6 * u); }
      ctx.globalAlpha = a * (before === ch ? 1 : k);
      ctx.fillText(ch, cx, by + 27 * u + (1 - k) * 6 * u);
      cx += ctx.measureText(ch).width;
    });
    ctx.globalAlpha = a;
    ctx.fillStyle = MUTED; ctx.font = `600 ${9 * u}px ${MONO}`;
    ctx.fillText('10:30   GATE 24', bx + 14 * u, by + 52 * u);
    // Boarding: a slow breathing amber, not a blink
    ctx.globalAlpha = a * (0.65 + 0.35 * Math.sin(t * 2.2));
    ctx.fillStyle = AMBER; ctx.textAlign = 'right';
    ctx.fillText('BOARDING', bx + bw - 14 * u, by + 52 * u);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  }

  // ── city ─────────────────────────────────────────────────────────────
  private cityScene(b: number, ground: number) {
    if (b < 28 || b > 37) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    const scroll = ground * 0.35;
    const spanX = 560 * u;
    const blocks: [number, number, number][] = [
      [0, 92, 30], [34, 150, 26], [64, 118, 34], [104, 70, 28], [140, 186, 22], [166, 128, 30], [204, 96, 36],
      [250, 160, 28], [282, 110, 32], [320, 210, 18], [346, 140, 30], [384, 84, 34], [430, 170, 28], [462, 120, 32], [500, 76, 30],
    ];
    for (let rep = -1; rep < Math.ceil(L.w / spanX) + 1; rep++) {
      blocks.forEach(([bx, bh, bw], i) => {
        const grow = ease.io3(seg(b, 28.4 + (i % 8) * 0.14, 29.8 + (i % 8) * 0.14)) * (1 - ease.io3(seg(b, 35 + (i % 8) * 0.06, 36.4 + (i % 8) * 0.06)));
        if (grow <= 0) return;
        const x = rep * spanX + bx * u - (scroll % spanX);
        if (x > L.w + 40 * u || x + bw * u < -40 * u) return;
        const hh = bh * u * grow;
        ctx.fillStyle = i % 4 === 1 ? 'rgba(20,20,18,0.17)' : 'rgba(20,20,18,0.1)';
        this.rr(x, L.gy - hh, bw * u, hh + 1, 4 * u); ctx.fill();
        // Lit windows, steady
        if (grow > 0.6 && i % 3 !== 2) {
          ctx.fillStyle = AMBER;
          for (let r = 0; r < Math.floor(bh / 34); r++) if ((i + r) % 2 === 0) ctx.fillRect(x + bw * u * 0.35, L.gy - hh + 14 * u + r * 30 * u, 4 * u, 5 * u);
        }
      });
    }
    // Today on the trip: now and next
    const cards: [string, string, string][] = [['NOW', '시부야 스카이', '14:00'], ['NEXT', '츠키지 시장', '17:30']];
    const cw = 190 * u, ch = 44 * u;
    const x0 = L.portrait ? L.w - cw - 22 * u : L.w - cw - 40 * u, y0 = L.portrait ? L.h * 0.3 : L.h * 0.16;
    cards.forEach(([tag, place, time], i) => {
      const k = ease.out3(seg(b, 31 + i, 32 + i));
      const a = k * (1 - ease.smooth(seg(b, 34.8, 35.8)));
      if (a <= 0) return;
      const y = y0 + i * (ch + 10 * u) + (1 - k) * 14 * u;
      ctx.globalAlpha = a;
      ctx.fillStyle = SURFACE; this.rr(x0, y, cw, ch, 14 * u); ctx.fill();
      ctx.fillStyle = i === 0 ? RED : AMBER;
      this.rr(x0 + 12 * u, y + 13 * u, 40 * u, 18 * u, 9 * u); ctx.fill();
      ctx.fillStyle = i === 0 ? '#FFFFFF' : INK; ctx.font = `700 ${8.5 * u}px ${MONO}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(tag, x0 + 32 * u, y + 22.5 * u); ctx.textAlign = 'left';
      ctx.fillStyle = INK; ctx.font = `700 ${13 * u}px ${SANS}`; ctx.fillText(place, x0 + 60 * u, y + 22.5 * u);
      ctx.fillStyle = MUTED; ctx.font = `600 ${9.5 * u}px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(time, x0 + cw - 14 * u, y + 22.5 * u);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    ctx.globalAlpha = 1;
  }

  // ── sea ──────────────────────────────────────────────────────────────
  private seaScene(b: number, t: number, ground: number) {
    if (b < 36 || b > 45.5) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    const rise = ease.io3(seg(b, 36.4, 39)) * (1 - ease.io3(seg(b, 43, 45.2)));
    if (rise <= 0) return;
    // Sun rises behind the horizon
    const sx = L.portrait ? L.w * 0.66 : L.w * 0.7;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, L.w, L.gy); ctx.clip();
    ctx.fillStyle = AMBER;
    ctx.beginPath(); ctx.arc(sx, L.gy + 30 * u - rise * 120 * u, 42 * u, 0, TAU); ctx.fill();
    ctx.restore();
    // Sea below the line, waves drifting slowly
    ctx.globalAlpha = rise;
    ctx.fillStyle = FAINT; ctx.fillRect(0, L.gy, L.w, L.h - L.gy);
    ctx.strokeStyle = SURFACE; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      for (let x = 0; x <= L.w; x += 6) {
        const yy = L.gy + (16 + r * 18) * u + Math.sin(x / (46 * u) - t * 0.9 + r * 1.3) * 2.6 * u;
        if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Palms grow along the shore and drift by
    const spanX = 520 * u, scroll = ground * 0.35;
    const palms: [number, number][] = [[60, 120], [104, 92], [250, 134], [300, 100], [420, 116], [470, 86]];
    for (let rep = -1; rep < Math.ceil(L.w / spanX) + 1; rep++) {
      palms.forEach(([px, ph], i) => {
        const g = ease.io3(seg(b, 37 + i * 0.2, 38.6 + i * 0.2)) * (1 - ease.io3(seg(b, 42.8 + i * 0.08, 44.4 + i * 0.08)));
        if (g <= 0) return;
        const x = rep * spanX + px * u - (scroll % spanX);
        if (x < -60 * u || x > L.w + 60 * u) return;
        this.palm(x, L.gy, ph * u * g, u * 1.2, i % 2 ? 'rgba(20,20,18,0.26)' : 'rgba(20,20,18,0.36)');
      });
    }
  }

  private groundDashes(b: number, ground: number) {
    const a = span(b, 20.2, 44.8, 1.2);
    if (a <= 0) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    const gap = 30 * u;
    // The sea takes over below the line on the beach
    ctx.globalAlpha = a * (1 - ease.smooth(seg(b, 36.4, 38)));
    ctx.fillStyle = SOFT;
    for (let x = -(ground % gap); x < L.w; x += gap) ctx.fillRect(x, L.gy + 8 * u, 12 * u, 1.6 * u);
    ctx.globalAlpha = 1;
  }

  // ── photos into a magazine ───────────────────────────────────────────
  private logScene(b: number, t: number) {
    if (b < 44.5 || b > 53.5) return;
    const ctx = this.ctx, L = this.L, u = L.u;
    const kinds: ('sea' | 'city' | 'peak' | 'sea2' | 'city2')[] = ['sea', 'city', 'peak', 'sea2', 'city2'];
    const qs = L.portrait ? [0.16, 0.33, 0.5, 0.67, 0.84] : [0.14, 0.32, 0.5, 0.68, 0.86];
    const pw = (L.portrait ? 54 : 74) * u, ph = pw * 0.78;
    // Spread: left page one big photo, right page four small
    const sw = L.portrait ? L.w - 48 * u : 320 * u, sh = L.portrait ? sw * 0.62 : 170 * u;
    const sx = L.cx - sw / 2, sy = L.portrait ? L.h * 0.5 : L.h * 0.44;
    const pageA = ease.smooth(seg(b, 48.2, 49)) * (1 - ease.smooth(seg(b, 51.6, 52.8)));
    if (pageA > 0) {
      ctx.globalAlpha = pageA;
      ctx.fillStyle = SURFACE; this.rr(sx, sy, sw, sh, 16 * u); ctx.fill();
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx + sw / 2, sy + 10 * u); ctx.lineTo(sx + sw / 2, sy + sh - 10 * u); ctx.stroke();
      const ta = ease.smooth(seg(b, 50, 51)) * pageA;
      ctx.globalAlpha = ta;
      ctx.fillStyle = INK; ctx.font = `800 ${16 * u}px ${SANS}`;
      ctx.fillText('여름, 다낭', sx + 14 * u, sy + sh - 16 * u);
      ctx.fillStyle = MUTED; ctx.font = `600 ${8.5 * u}px ${MONO}`;
      ctx.fillText('ISSUE 01', sx + 14 * u, sy + sh - 36 * u);
      ctx.globalAlpha = 1;
    }
    const pad = 12 * u, half = sw / 2;
    const slots = [
      { x: sx + pad, y: sy + pad, w: half - pad * 2, h: sh - pad * 2 - 46 * u },
      { x: sx + half + pad, y: sy + pad, w: (half - pad * 3) / 2, h: (sh - pad * 3) / 2 },
      { x: sx + half + pad * 2 + (half - pad * 3) / 2, y: sy + pad, w: (half - pad * 3) / 2, h: (sh - pad * 3) / 2 },
      { x: sx + half + pad, y: sy + pad * 2 + (sh - pad * 3) / 2, w: (half - pad * 3) / 2, h: (sh - pad * 3) / 2 },
      { x: sx + half + pad * 2 + (half - pad * 3) / 2, y: sy + pad * 2 + (sh - pad * 3) / 2, w: (half - pad * 3) / 2, h: (sh - pad * 3) / 2 },
    ];
    const fadeAll = 1 - ease.smooth(seg(b, 51.6, 52.8));
    kinds.forEach((kind, i) => {
      const drop = seg(b, 45 + i * 0.5, 46 + i * 0.5);
      if (drop <= 0 || fadeAll <= 0) return;
      const peg = this.clothAt(qs[i]);
      const swingT = Math.max(0, b - 46 - i * 0.5);
      const swing = this.opts.calm ? 0 : 0.07 * Math.sin(swingT * 2.4) * Math.exp(-swingT * 1.1);
      const hang = { x: peg.x, y: peg.y + 4 * u - (1 - ease.settle(drop)) * 70 * u };
      const fly = ease.io3(seg(b, 48.6 + i * 0.16, 50 + i * 0.16));
      const sl = slots[i];
      const cx = lerp(hang.x, sl.x + sl.w / 2, fly), cy = lerp(hang.y + ph / 2, sl.y + sl.h / 2, fly);
      const ww = lerp(pw, sl.w, fly), hh = lerp(ph, sl.h, fly);
      const rot = lerp(swing + (i % 2 ? 0.04 : -0.04), 0, fly);
      ctx.save();
      ctx.globalAlpha = ease.smooth(drop * 2) * fadeAll;
      ctx.translate(cx, cy - hh / 2); ctx.rotate(rot); ctx.translate(-cx, -(cy - hh / 2));
      // Frame, then the picture
      ctx.fillStyle = SURFACE; this.rr(cx - ww / 2, cy - hh / 2, ww, hh, lerp(6 * u, 10 * u, fly)); ctx.fill();
      const inset = lerp(4 * u, 0, fly);
      this.photo(kind, cx - ww / 2 + inset, cy - hh / 2 + inset, ww - inset * 2, hh - inset * 2, lerp(4 * u, 10 * u, fly));
      // Peg while it hangs
      if (fly < 0.5) {
        ctx.globalAlpha *= 1 - fly * 2;
        ctx.fillStyle = INK; this.rr(cx - 3 * u, cy - hh / 2 - 6 * u, 6 * u, 12 * u, 2 * u); ctx.fill();
      }
      ctx.restore();
    });
  }

  // ── words ────────────────────────────────────────────────────────────
  private captions(b: number) {
    const L = this.L, u = L.u;
    LINES.forEach(([a, z, text, size]) => {
      if (b < a - 0.1 || b > z + 0.6) return;
      const centered = a < 8 || a >= 52;
      const px = size === 'xl' ? (L.portrait ? 40 : 46) * u : (L.portrait ? 19 : 21) * u;
      // Follow-ups sit under the headline before them when both share a scene
      const x = centered ? L.cx : L.capX;
      const y = centered ? L.barY + 40 * u : (size === 'md' && a === 15 ? L.capY + 34 * u : L.capY);
      this.kinetic(text, x, y, px, b, a, z, centered ? 'center' : 'left', size === 'xl' ? 800 : 600, size === 'xl' ? INK : centered ? MUTED : INK);
    });
    // Destination chips under the headlines
    this.chip('TYO · 도쿄', L.capX, L.capY + 16 * u, 10 * u, span(b, 29.6, 35.4, 0.8), INK, SURFACE);
    this.chip('DAD · 다낭', L.capX, L.capY + 16 * u, 10 * u, span(b, 37.6, 43.4, 0.8), AMBER, INK);
    this.chip('31°  맑음', L.capX + 104 * u, L.capY + 16 * u, 10 * u, span(b, 38.4, 43.4, 0.8), SURFACE, INK);
  }

  /** Each character rises and fades in on a short stagger and leaves the same way */
  private kinetic(text: string, x: number, y: number, size: number, b: number, a: number, z: number, align: 'left' | 'center', weight: number, color: string) {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px ${SANS}`;
    // Long lines shrink to fit the frame (portrait)
    const maxW = this.L.w - this.L.capX * 2;
    const full = ctx.measureText(text).width;
    if (full > maxW) { size *= maxW / full; ctx.font = `${weight} ${size}px ${SANS}`; }
    const chars = [...text];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((s, v) => s + v, 0);
    let cx = align === 'center' ? x - total / 2 : x;
    ctx.fillStyle = color;
    chars.forEach((c, i) => {
      const inK = ease.out3(seg(b, a + i * 0.05, a + i * 0.05 + 0.7));
      const outK = ease.smooth(seg(b, z - 0.6 + i * 0.02, z + i * 0.02));
      const k = inK * (1 - outK);
      if (k > 0.002) {
        ctx.globalAlpha = k;
        ctx.fillText(c, cx, y + (1 - inK) * size * 0.3 - outK * size * 0.15);
      }
      cx += widths[i];
    });
    ctx.globalAlpha = 1;
  }

  // ── drawing helpers ──────────────────────────────────────────────────
  private rr(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx, q = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + q, y); ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q); ctx.closePath();
  }

  private chip(text: string, x: number, y: number, size: number, alpha: number, fill: string, color: string) {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.font = `600 ${size}px ${MONO}`;
    const tw = ctx.measureText(text).width + size * 1.6;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill; this.rr(x, y, tw, size * 2.1, size * 1.05); ctx.fill();
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x + size * 0.8, y + size * 1.1);
    ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  }

  private pin(x: number, y: number, r: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - r * 0.4, y - r * 0.9, x - r, y - r * 1.25, x - r, y - r * 1.9);
    ctx.arc(x, y - r * 1.9, r, Math.PI, 0);
    ctx.bezierCurveTo(x + r, y - r * 1.25, x + r * 0.4, y - r * 0.9, x, y);
    ctx.fill();
    ctx.fillStyle = SURFACE;
    ctx.beginPath(); ctx.arc(x, y - r * 1.9, r * 0.38, 0, TAU); ctx.fill();
  }

  private plane(x: number, y: number, ang: number, size: number, color: string) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(size / 10, size / 10); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.bezierCurveTo(10, -1.3, 8, -1.6, 6, -1.6); ctx.lineTo(1.5, -1.6); ctx.lineTo(-3, -8.5); ctx.lineTo(-5, -8.5);
    ctx.lineTo(-2.2, -1.6); ctx.lineTo(-7, -1.6); ctx.lineTo(-9, -4.2); ctx.lineTo(-10.4, -4.2); ctx.lineTo(-9.2, 0); ctx.lineTo(-10.4, 4.2);
    ctx.lineTo(-9, 4.2); ctx.lineTo(-7, 1.6); ctx.lineTo(-2.2, 1.6); ctx.lineTo(-5, 8.5); ctx.lineTo(-3, 8.5); ctx.lineTo(1.5, 1.6);
    ctx.lineTo(6, 1.6); ctx.bezierCurveTo(8, 1.6, 10, 1.3, 10, 0);
    ctx.fill(); ctx.restore();
  }

  /** An airliner from the side, nose to the left, `len` long, wheels on y */
  private sidePlane(x: number, y: number, len: number) {
    const ctx = this.ctx, h = len * 0.13;
    ctx.fillStyle = SURFACE;
    // fuselage
    this.rr(x, y - h * 1.6, len, h, h / 2); ctx.fill();
    // tail
    ctx.beginPath(); ctx.moveTo(x + len * 0.84, y - h * 1.5); ctx.lineTo(x + len * 0.94, y - h * 3.4); ctx.lineTo(x + len * 1.0, y - h * 3.4); ctx.lineTo(x + len * 0.98, y - h * 1.3); ctx.fill();
    // wing
    ctx.fillStyle = 'rgba(20,20,18,0.12)';
    ctx.beginPath(); ctx.moveTo(x + len * 0.38, y - h * 0.95); ctx.lineTo(x + len * 0.62, y - h * 0.95); ctx.lineTo(x + len * 0.5, y - h * 0.2); ctx.lineTo(x + len * 0.42, y - h * 0.2); ctx.fill();
    // windows and a red cheat line
    ctx.fillStyle = 'rgba(20,20,18,0.25)';
    for (let i = 0; i < 12; i++) ctx.fillRect(x + len * (0.16 + i * 0.055), y - h * 1.32, len * 0.018, h * 0.22);
    ctx.fillStyle = RED; ctx.fillRect(x + len * 0.08, y - h * 0.95, len * 0.8, h * 0.08);
    // gear
    ctx.fillStyle = INK;
    [0.2, 0.55, 0.6].forEach(f => { ctx.beginPath(); ctx.arc(x + len * f, y - h * 0.3, h * 0.28, 0, TAU); ctx.fill(); });
  }

  private palm(x: number, gy: number, hh: number, s: number, color: string) {
    const ctx = this.ctx, top = { x: x + 10 * s, y: gy - hh };
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.lineWidth = 3.6 * s;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + 2 * s, gy - hh * 0.6, top.x, top.y); ctx.stroke();
    ctx.lineWidth = 3 * s;
    for (const a of [-2.7, -2.1, -1.3, -0.55, 0.15]) {
      const len = 24 * s;
      ctx.beginPath(); ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x + Math.cos(a) * len * 0.6, top.y + Math.sin(a) * len * 0.6 - 6 * s, top.x + Math.cos(a) * len, top.y + Math.sin(a) * len + 6 * s);
      ctx.stroke();
    }
  }

  private photo(kind: 'sea' | 'city' | 'peak' | 'sea2' | 'city2', x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.save(); this.rr(x, y, w, h, r); ctx.clip();
    ctx.fillStyle = SKY; ctx.fillRect(x, y, w, h);
    const sunX = kind === 'sea2' ? 0.3 : 0.7;
    ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(x + w * sunX, y + h * 0.32, Math.min(w, h) * 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,18,0.16)';
    if (kind === 'sea' || kind === 'sea2') {
      ctx.fillRect(x, y + h * 0.66, w, h);
      ctx.fillStyle = SURFACE; ctx.fillRect(x + w * 0.1, y + h * 0.76, w * 0.3, Math.max(1, h * 0.02)); ctx.fillRect(x + w * 0.5, y + h * 0.86, w * 0.34, Math.max(1, h * 0.02));
    } else if (kind === 'city' || kind === 'city2') {
      const set = kind === 'city' ? [[0.06, 0.45], [0.22, 0.3], [0.38, 0.55], [0.56, 0.38], [0.74, 0.5]] : [[0.04, 0.3], [0.2, 0.6], [0.4, 0.42], [0.6, 0.66], [0.8, 0.36]];
      set.forEach(([bx, bh]) => ctx.fillRect(x + w * bx, y + h * (1 - bh), w * 0.14, h * bh));
    } else {
      ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.35, y + h * 0.42); ctx.lineTo(x + w * 0.55, y + h * 0.66); ctx.lineTo(x + w * 0.75, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.fill();
    }
    ctx.restore();
  }
}

