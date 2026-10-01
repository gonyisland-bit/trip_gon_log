import type { FlightItem, StayItem, TransitItem } from '../../types';
import { boardPlaces, boardStatus, md, placesPerDay, transitEnds, type BoardEntry, type BoardModel } from './boardData';

// The board as one PNG (share image). It is drawn straight onto a canvas from the board's data instead
// of photographing the screen: the screen shot copied the whole page at three times its size, which froze
// the phone, and laid its text out again, which overlapped and cut lines. Here every line is measured with
// the font it is drawn in, and a tile is as tall as its lines, so nothing can overlap or run out of its tile.
// Sizes are the screen's own (CSS px) on a 540 wide board, drawn at twice that.

const W = 540;
const SCALE = 2;
const PAD = 16;
const GAP = 10;
const FULL = W - PAD * 2;
const COL = (FULL - GAP) / 2;
const TILE_PAD = 16;
const ROW_GAP = 8;
const RADIUS = 20;

const SANS = '"Inter", "Noto Sans KR", -apple-system, "Segoe UI", sans-serif';
const MONO = '"SF Mono", Consolas, "Noto Sans KR", monospace';
const font = (weight: number, px: number, mono = false) => `${weight} ${px}px ${mono ? MONO : SANS}`;

interface Tone { bg: string; fg: string }
interface Palette { paper: string; surface: string; text: string; red: string; ink: Tone; peach: Tone; sage: Tone; butter: Tone; mist: Tone }

const palette = (dark: boolean): Palette => dark ? {
  paper: '#11110F', surface: '#1A1A17', text: '#EFECE6', red: '#EF4444',
  ink: { bg: '#EFECE6', fg: '#11110F' }, peach: { bg: '#3B2A22', fg: '#F6CDB6' }, sage: { bg: '#26301F', fg: '#9DB58A' },
  butter: { bg: '#3A3318', fg: '#F7DB6A' }, mist: { bg: '#22282D', fg: '#DCE3E8' },
} : {
  paper: '#F6F4EF', surface: '#FFFDF9', text: '#141412', red: '#DC2626',
  ink: { bg: '#141412', fg: '#F6F4EF' }, peach: { bg: '#F6CDB6', fg: '#9A4A2C' }, sage: { bg: '#9DB58A', fg: '#3E5631' },
  butter: { bg: '#F7DB6A', fg: '#6F5600' }, mist: { bg: '#DCE3E8', fg: '#3B4A57' },
};

type Ctx = CanvasRenderingContext2D;
/** One block inside a tile: its height is known before anything is drawn */
interface Row { h: number; draw: (c: Ctx, x: number, y: number) => void; bottom?: boolean }
interface Tile {
  w: number;
  rows: Row[];
  bg: string;
  pad?: number;
  ring?: string;
  dim?: boolean;
  /** Journey picture in the bottom right corner */
  art?: HTMLImageElement;
  minH?: number;
}

function setSpacing(c: Ctx, px: number) {
  (c as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/** Greedy line breaking: whole words where they fit, letters only for a word wider than the line */
function wrap(c: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const joined = line ? `${line} ${word}` : word;
      if (c.measureText(joined).width <= maxW) { line = joined; continue; }
      if (line) { out.push(line); line = ''; }
      if (c.measureText(word).width <= maxW) { line = word; continue; }
      for (const ch of Array.from(word)) {
        if (line && c.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}

function path(c: Ctx, x: number, y: number, w: number, h: number, r: [number, number, number, number]) {
  const [tl, tr, br, bl] = r;
  c.beginPath();
  c.moveTo(x + tl, y);
  c.lineTo(x + w - tr, y); c.arcTo(x + w, y, x + w, y + tr, tr);
  c.lineTo(x + w, y + h - br); c.arcTo(x + w, y + h, x + w - br, y + h, br);
  c.lineTo(x + bl, y + h); c.arcTo(x, y + h, x, y + h - bl, bl);
  c.lineTo(x, y + tl); c.arcTo(x, y, x + tl, y, tl);
  c.closePath();
}

const PLANE = new Path2D('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z');

interface Look { color: string; alpha?: number }

/** Row builders. `m` measures with the same fonts the real canvas draws with. */
function rows(m: Ctx, cw: number) {
  const text = (str: string, f: string, lh: number, look: Look, opts: { spacing?: number; upper?: boolean; bottom?: boolean } = {}): Row => {
    m.font = f; setSpacing(m, opts.spacing || 0);
    const lines = wrap(m, opts.upper ? str.toUpperCase() : str, cw);
    setSpacing(m, 0);
    return {
      h: lines.length * lh, bottom: opts.bottom,
      draw: (c, x, y) => {
        c.font = f; setSpacing(c, opts.spacing || 0);
        c.fillStyle = look.color; c.globalAlpha *= look.alpha ?? 1; c.textBaseline = 'middle'; c.textAlign = 'left';
        lines.forEach((l, i) => c.fillText(l, x, y + i * lh + lh / 2));
        setSpacing(c, 0);
      },
    };
  };
  const kicker = (str: string, look: Look): Row => text(str, font(700, 10, true), 14, { color: look.color, alpha: (look.alpha ?? 1) * 0.7 }, { spacing: 1.4, upper: true });
  const chip = (value: string | undefined, dark: boolean, onInk = false): Row | null => {
    if (!value) return null;
    const f = font(600, 13, true);
    m.font = f; setSpacing(m, 1.5);
    const w = Math.min(cw, m.measureText(value).width + 28);
    setSpacing(m, 0);
    return {
      h: 32, bottom: true,
      draw: (c, x, y) => {
        c.save();
        c.fillStyle = onInk ? (dark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)') : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)');
        path(c, x, y, w, 32, [16, 16, 16, 16]); c.fill();
        c.font = f; setSpacing(c, 1.5); c.fillStyle = onInk ? (dark ? '#11110F' : '#F6F4EF') : (dark ? '#EFECE6' : '#141412');
        c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(value, x + 14, y + 16.5);
        c.restore();
      },
    };
  };
  return { text, kicker, chip };
}

const keep = <T,>(list: Array<T | null | undefined>): T[] => list.filter((x): x is T => Boolean(x));
const when = (at: BoardEntry, time?: string) => [md(at.date), time].filter(Boolean).join(' ');

function measureTile(t: Tile): number {
  const body = t.rows.reduce((s, r) => s + r.h, 0) + ROW_GAP * Math.max(0, t.rows.length - 1);
  return Math.max(t.minH || 0, body + (t.pad ?? TILE_PAD) * 2);
}

function drawTile(c: Ctx, t: Tile, x: number, y: number, h: number) {
  const pad = t.pad ?? TILE_PAD;
  c.save();
  if (t.dim) c.globalAlpha = 0.55;
  path(c, x, y, t.w, h, [RADIUS, RADIUS, RADIUS, RADIUS]);
  c.fillStyle = t.bg; c.fill();
  if (t.art) {
    c.save();
    path(c, x, y, t.w, h, [RADIUS, RADIUS, RADIUS, RADIUS]); c.clip();
    path(c, x + t.w - 112, y + h - 112, 112, 112, [28, 0, RADIUS, 0]); c.clip();
    c.drawImage(t.art, x + t.w - 112, y + h - 112, 112, 112);
    c.restore();
  }
  if (t.ring) {
    c.lineWidth = 2; c.strokeStyle = t.ring;
    path(c, x + 1, y + 1, t.w - 2, h - 2, [RADIUS - 1, RADIUS - 1, RADIUS - 1, RADIUS - 1]); c.stroke();
  }
  const top = t.rows.filter(r => !r.bottom);
  const bottom = t.rows.filter(r => r.bottom);
  let cy = y + pad;
  top.forEach(r => { c.save(); r.draw(c, x + pad, cy); c.restore(); cy += r.h + ROW_GAP; });
  const bh = bottom.reduce((s, r) => s + r.h, 0) + ROW_GAP * Math.max(0, bottom.length - 1);
  let by = Math.max(cy, y + h - pad - bh);
  bottom.forEach(r => { c.save(); r.draw(c, x + pad, by); c.restore(); by += r.h + ROW_GAP; });
  c.restore();
}

export interface BoardImageOptions {
  dark: boolean;
  /** A journey still ahead or under way dims what is behind */
  dimPast: boolean;
  /** The journey's picture for the head tile (a plain path) */
  art?: string;
  title: string;
  date: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    const done = (v: HTMLImageElement | null) => { window.clearTimeout(timer); resolve(v); };
    const timer = window.setTimeout(() => done(null), 4000);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

async function readyFonts() {
  if (!document.fonts?.load) return;
  const sample = 'Aa가나 0123';
  const load = Promise.all([
    document.fonts.load(font(800, 24), sample), document.fonts.load(font(700, 14), sample),
    document.fonts.load(font(600, 12), sample), document.fonts.load(font(600, 12, true), sample),
  ]).catch(() => undefined);
  await Promise.race([load, new Promise(r => window.setTimeout(r, 2500))]);
}

/** The whole board as a PNG */
export async function renderBoardImage(b: BoardModel, o: BoardImageOptions): Promise<Blob> {
  const p = palette(o.dark);
  const [art] = await Promise.all([o.art ? loadImage(o.art) : Promise.resolve(null), readyFonts()]);
  const m = document.createElement('canvas').getContext('2d');
  if (!m) throw new Error('no canvas');

  const dim = (at: BoardEntry) => o.dimPast && at.past;
  const place = boardPlaces(b.trip);
  const perDay = placesPerDay(b);
  const maxDay = Math.max(1, ...perDay);

  // ── tiles, each built for the width it will get ──
  const head = (): Tile => {
    const cw = FULL - TILE_PAD * 2 - 120;
    const r = rows(m, cw);
    const { fg } = p.peach;
    const status = boardStatus(b) + (b.nights > 0 ? ` · ${b.nights}박 ${b.nights + 1}일` : '');
    return {
      w: FULL, bg: p.peach.bg, art: art || undefined, minH: 144,
      rows: [
        r.kicker(status, { color: fg }),
        r.text(b.start ? `${md(b.start)} – ${md(b.end)}` : o.date, font(800, 28, false), 32, { color: fg }),
        r.text(place.slice(0, 3).join(' · ') || o.title, font(800, 17), 22, { color: fg }),
        r.text(`항공 ${b.flights.length}  숙소 ${b.stays.length}  교통 ${b.transits.length}  장소 ${b.places.length}`, font(600, 12, true), 16, { color: fg }),
      ],
    };
  };

  const next = (): Tile | null => {
    const n = b.next;
    if (!n) return null;
    const r = rows(m, FULL - TILE_PAD * 2);
    return {
      w: FULL, bg: p.surface, ring: p.red,
      rows: keep([
        r.kicker(`${b.phase === 'live' ? '다음 일정' : '첫 일정'} · ${when(n.at, n.time)}`, { color: p.red }),
        r.text(n.place, font(800, 20), 26, { color: p.text }),
        n.memo ? r.text(n.memo, font(400, 12), 17, { color: p.text, alpha: 0.6 }) : null,
      ]),
    };
  };

  const flightCodes = (f: FlightItem, w: number): Row => {
    const f1 = font(800, 40);
    m.font = f1;
    const a = f.fromCode || '—', z = f.toCode || '—';
    const wa = m.measureText(a).width, wz = m.measureText(z).width;
    return {
      h: 44,
      draw: (c, x, y) => {
        c.font = f1; c.fillStyle = p.ink.fg; c.textBaseline = 'middle'; c.textAlign = 'left';
        c.fillText(a, x, y + 23);
        c.textAlign = 'right'; c.fillText(z, x + w, y + 23);
        const cx = x + w / 2;
        c.save();
        c.globalAlpha *= 0.35; c.strokeStyle = p.ink.fg; c.lineWidth = 1.5; c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(x + wa + 12, y + 22); c.lineTo(cx - 20, y + 22); c.moveTo(cx + 20, y + 22); c.lineTo(x + w - wz - 12, y + 22); c.stroke();
        c.restore();
        c.save(); c.globalAlpha *= 0.6; c.translate(cx - 10, y + 12); c.scale(20 / 24, 20 / 24);
        c.fillStyle = p.ink.fg; c.fill(PLANE); c.restore();
      },
    };
  };

  const outbound = (f: FlightItem & { at: BoardEntry }): Tile => {
    const cw = FULL - TILE_PAD * 2;
    const r = rows(m, cw);
    const meta = [md(f.at.date), f.fromTime && f.toTime ? `${f.fromTime} → ${f.toTime}` : f.fromTime, f.seat && `좌석 ${f.seat}`].filter(Boolean).join(' · ');
    return {
      w: FULL, bg: p.ink.bg, dim: dim(f.at),
      rows: keep([
        r.kicker(`${f.title || '항공권'}${f.flightNo ? ` · ${f.flightNo}` : ''}`, { color: p.ink.fg }),
        flightCodes(f, cw),
        r.text(meta, font(600, 12, true), 16, { color: p.ink.fg, alpha: 0.8 }),
        r.chip(f.pnr, o.dark, true),
      ]),
    };
  };

  const smallFlight = (f: FlightItem & { at: BoardEntry }, w: number): Tile => {
    const r = rows(m, w - TILE_PAD * 2);
    return {
      w, bg: p.ink.bg, dim: dim(f.at),
      rows: keep([
        r.kicker(f.flightNo || '항공권', { color: p.ink.fg }),
        r.text(`${f.fromCode || '—'} → ${f.toCode || '—'}`, font(800, 24), 28, { color: p.ink.fg }),
        r.text(when(f.at, f.fromTime), font(500, 12, true), 16, { color: p.ink.fg, alpha: 0.8 }, { bottom: true }),
        r.chip(f.pnr, o.dark, true),
      ]),
    };
  };

  const stay = (s: StayItem & { at: BoardEntry }, w: number): Tile => {
    const r = rows(m, w - TILE_PAD * 2);
    const { fg } = p.sage;
    return {
      w, bg: p.sage.bg, dim: dim(s.at),
      rows: keep([
        r.kicker('숙소', { color: fg }),
        r.text(s.title, font(800, 16), 22, { color: fg }),
        r.text(s.dateRange, font(500, 12, true), 16, { color: fg, alpha: 0.7 }),
        s.address ? r.text(s.address, font(400, 12), 17, { color: fg, alpha: 0.6 }) : null,
        r.chip(s.confNo, o.dark),
      ]),
    };
  };

  const places = (w: number): Tile => {
    const r = rows(m, w - TILE_PAD * 2);
    const { fg } = p.mist;
    const bars: Row | null = perDay.length > 1 ? {
      h: 24,
      draw: (c, x, y) => {
        c.save(); c.fillStyle = fg; c.globalAlpha *= 0.6;
        perDay.forEach((n, i) => {
          const bh = 24 * Math.max(0.18, n / maxDay);
          path(c, x + i * 16, y + 24 - bh, 12, bh, [6, 6, 6, 6]); c.fill();
        });
        c.restore();
      },
    } : null;
    return {
      w, bg: p.mist.bg,
      rows: keep([
        r.kicker('여행지', { color: fg }),
        r.text(String(b.places.length), font(800, 34), 34, { color: fg }),
        bars,
        b.focusDay.length ? r.text(`${b.phase === 'live' ? '오늘' : '첫날'} ${b.focusDay.length}곳`, font(600, 12, true), 16, { color: fg }) : null,
      ]),
    };
  };

  const transit = (t: TransitItem & { at: BoardEntry }, w: number): Tile => {
    const r = rows(m, w - TILE_PAD * 2);
    const { fg } = p.butter;
    const { from, to } = transitEnds(t);
    return {
      w, bg: p.butter.bg, dim: dim(t.at),
      rows: keep([
        r.kicker(t.ticketType || '교통', { color: fg }),
        r.text(t.title || t.route || '', font(800, 16), 22, { color: fg }),
        from ? r.text(from, font(600, 12), 17, { color: fg }) : null,
        to ? r.text(`→ ${to}`, font(600, 12), 17, { color: fg, alpha: 0.65 }) : null,
        r.text(when(t.at, t.time), font(500, 12, true), 16, { color: fg, alpha: 0.7 }, { bottom: true }),
      ]),
    };
  };

  const today = (): Tile | null => {
    if (!b.focusDay.length) return null;
    const pad = 8;
    const textW = FULL - pad * 2 - 16 - 48 - 12;
    const label: Row = {
      h: 26,
      draw: (c, x, y) => {
        c.font = font(700, 10, true); setSpacing(c, 1.4); c.fillStyle = p.text; c.globalAlpha *= 0.55;
        c.textBaseline = 'middle'; c.textAlign = 'left';
        c.fillText(`${b.phase === 'live' ? '오늘' : '첫날'} · ${md(b.focusDay[0].at.date)}`.toUpperCase(), x + 8, y + 15);
        setSpacing(c, 0);
      },
    };
    const list: Row[] = b.focusDay.slice(0, 6).map(it => {
      m.font = font(700, 14);
      const lines = wrap(m, it.place, textW);
      const h = Math.max(44, lines.length * 20 + 16);
      const isNext = b.next?.id === it.id;
      const time = it.time ? it.time.replace(/\s?(AM|PM)$/i, '') : '—';
      return {
        h,
        draw: (c, x, y) => {
          c.save();
          if (dim(it.at)) c.globalAlpha *= 0.55;
          c.textBaseline = 'middle'; c.textAlign = 'left';
          c.font = font(600, 12, true); c.fillStyle = isNext ? p.red : p.text; c.globalAlpha *= isNext ? 1 : 0.55;
          c.fillText(time, x + 8, y + h / 2);
          c.globalAlpha = dim(it.at) ? 0.55 : 1;
          c.font = font(700, 14); c.fillStyle = p.text;
          lines.forEach((l, i) => c.fillText(l, x + 8 + 48 + 12, y + h / 2 + (i - (lines.length - 1) / 2) * 20));
          c.restore();
        },
      };
    });
    return { w: FULL, bg: p.surface, pad, rows: [label, ...list] };
  };

  // ── lay out: head, next stop, outbound flight, then the short tiles in pairs, then the day's list ──
  const placed: Array<{ tiles: Tile[]; h: number }> = [];
  const push = (...tiles: Array<Tile | null>) => {
    const t = keep(tiles);
    if (t.length) placed.push({ tiles: t, h: Math.max(...t.map(measureTile)) });
  };
  push(head());
  push(next());
  const [first, ...otherFlights] = b.flights;
  if (first) push(outbound(first));

  type Short = (w: number) => Tile;
  const shorts: Short[] = [
    ...b.stays.map(s => (w: number) => stay(s, w)),
    (w: number) => places(w),
    ...b.transits.map(t => (w: number) => transit(t, w)),
    ...otherFlights.map(f => (w: number) => smallFlight(f, w)),
  ];
  for (let i = 0; i < shorts.length; i += 2) {
    if (i + 1 < shorts.length) push(shorts[i](COL), shorts[i + 1](COL));
    else push(shorts[i](FULL));
  }
  push(today());

  // ── header and footer, then the canvas ──
  m.font = font(800, 24);
  const titleLines = wrap(m, o.title, FULL - 4);
  const headerH = 14 + 6 + titleLines.length * 29 + 10;
  const footerH = 28;
  const total = PAD + headerH + placed.reduce((s, r) => s + r.h, 0) + GAP * (placed.length - 1) + 12 + footerH + PAD / 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = Math.ceil(total * SCALE);
  const c = canvas.getContext('2d');
  if (!c) throw new Error('no canvas');
  c.scale(SCALE, SCALE);
  c.fillStyle = p.paper; c.fillRect(0, 0, W, total);

  let y = PAD;
  c.textBaseline = 'middle'; c.textAlign = 'left';
  c.save();
  c.font = font(700, 10, true); setSpacing(c, 1.6); c.fillStyle = p.text; c.globalAlpha = 0.55;
  c.fillText(`BOARD · ${o.date}`.toUpperCase(), PAD + 2, y + 7);
  c.restore(); setSpacing(c, 0);
  c.font = font(800, 24); c.fillStyle = p.text;
  titleLines.forEach((l, i) => c.fillText(l, PAD + 2, y + 20 + i * 29 + 14.5));
  y += headerH;

  for (const row of placed) {
    const n = row.tiles.length;
    row.tiles.forEach((t, i) => drawTile(c, t, PAD + (n === 2 ? i * (COL + GAP) : 0), y, row.h));
    y += row.h + GAP;
  }

  c.save();
  c.font = font(500, 10, true); c.fillStyle = p.text; c.globalAlpha = 0.45; c.textAlign = 'right'; c.textBaseline = 'middle';
  c.fillText('Tripgon log · Board', W - PAD, y + 8);
  c.restore();

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png'));
}
