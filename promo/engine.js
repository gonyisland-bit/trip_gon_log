// Shared helpers for the Tripgon intro: timing, easing, text and drawing primitives.
const BPM = 120;
const BEAT = 60 / BPM;
const TOTAL_BEATS = 100;
const DURATION = TOTAL_BEATS * BEAT;
const FPS = 30;

const COL = { ink: '#0B0B0C', paper: '#F2F1EE', red: '#E11D2E', white: '#FFFFFF' };
const SANS = '"Inter","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
const MONO = '"JetBrains Mono","Noto Sans KR","Malgun Gothic",monospace';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - t, 3);
const eExp = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const eBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const eIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// progress of an event that starts at beat s and lasts d beats
const seg = (b, s, d) => clamp((b - s) / d);
// a short punch that decays after a beat hit
const punch = (b, hit, d = 0.5) => { const p = (b - hit) / d; return p < 0 || p > 1 ? 0 : Math.pow(1 - p, 2); };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function txt(ctx, s, x, y, o) {
  ctx.save();
  ctx.font = `${o.w || 800} ${o.s}px ${o.f || SANS}`;
  ctx.fillStyle = o.c || COL.ink;
  ctx.textAlign = o.a || 'left';
  ctx.textBaseline = o.bl || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function measure(ctx, s, size, w = 800, f = SANS, ls = 0) {
  ctx.save();
  ctx.font = `${w} ${size}px ${f}`;
  ctx.letterSpacing = ls + 'px';
  const m = ctx.measureText(s).width;
  ctx.restore();
  return m;
}

function fitSize(ctx, s, maxW, w = 800, f = SANS, ls = 0) {
  const base = 100;
  return (maxW / measure(ctx, s, base, w, f, ls)) * base;
}

// text that rises out of a mask; p 0..1
function maskText(ctx, s, x, y, o, p) {
  if (p <= 0) return;
  const wd = measure(ctx, s, o.s, o.w || 800, o.f || SANS, o.ls || 0);
  const x0 = o.a === 'center' ? x - wd / 2 : o.a === 'right' ? x - wd : x;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - o.s * 0.2, y - o.s * 1.02, wd + o.s * 0.4, o.s * 1.3);
  ctx.clip();
  txt(ctx, s, x, y + (1 - p) * o.s * 1.05, o);
  ctx.restore();
}

function line(ctx, x1, y1, x2, y2, c, w = 2) {
  ctx.save();
  ctx.strokeStyle = c; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function circle(ctx, x, y, r, fill, stroke, sw = 2) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
}

// seeded random
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// one logotype image, tinted on demand
const Logo = { img: null, cache: {} };
function logoTinted(color, h) {
  const key = color + h;
  if (Logo.cache[key]) return Logo.cache[key];
  const ratio = 489.16 / 87.57;
  const c = document.createElement('canvas');
  c.width = Math.round(h * ratio); c.height = Math.round(h);
  const g = c.getContext('2d');
  g.drawImage(Logo.img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  Logo.cache[key] = c;
  return c;
}
