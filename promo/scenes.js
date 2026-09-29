// Scenes of the Tripgon intro. Each scene draws itself from its local beat `lb`.
// Layout is derived from L = { W, H, u, portrait, mx, subY } so one script serves 9:16 and 16:9.

const SCENES = [
  { id: 'hook', start: 0, end: 8 },
  { id: 'logo', start: 8, end: 16 },
  { id: 'map', start: 16, end: 32 },
  { id: 'timeline', start: 32, end: 48 },
  { id: 'calendar', start: 48, end: 64 },
  { id: 'reel', start: 64, end: 80 },
  { id: 'howto', start: 80, end: 92 },
  { id: 'outro', start: 92, end: 100 },
];

const SUBS = [
  [1, 7.5, '여행은 계획하고, 기록하고, 다시 꺼내보는 것'],
  [8.5, 15.5, '트립곤, 여행의 처음부터 끝까지 한 곳에'],
  [16.5, 23.5, '지도에서 가고 싶은 곳을 콕 집으면'],
  [24, 31.5, '템플릿과 큐레이터가 일정을 바로 짜줘요'],
  [32.5, 39.5, '하루의 동선을 시간순으로 기록하고'],
  [40, 45.5, '포켓에 담아둔 장소는 원클릭으로 추가'],
  [46, 47.8, '여행 중엔 오늘 일정이 먼저 보여요'],
  [48.5, 53.5, '캘린더에서 여행과 일정을 한눈에'],
  [54, 58.5, '날씨 모드로 날짜별 기온을 확인하고'],
  [59, 63.8, '날짜를 바로바로 눌러도 화면은 그대로'],
  [64.5, 71.5, '사진과 기록은 매거진으로 엮이고'],
  [72, 79.5, '릴로 한 편의 영상처럼 다시 돌려봐요'],
  [80.5, 85.5, '담고, 만들고, 남기면 끝'],
  [86, 91.5, '어렵지 않아요, 딱 세 단계'],
  [92.5, 99, '트립곤과 함께 여행을 기록하세요'],
];

// Sound effects placed on the same beat grid as the visuals: [beat, kind]
const SFX = (() => {
  const a = [];
  [0, 2, 4, 6].forEach(b => a.push([b, 'hit']));
  for (let i = 0; i < 7; i++) a.push([8 + 0.25 * i, 'tick']);
  a.push([10.5, 'pop']);
  [3, 5, 7, 9].forEach(b => a.push([16 + b, 'pop']));
  a.push([26, 'whoosh']);
  [26.5, 27, 27.5, 28].forEach(b => a.push([b, 'tick']));
  a.push([29.5, 'chime']);
  for (let i = 0; i < 5; i++) a.push([33 + 0.75 * i, 'tick']);
  a.push([40.5, 'whoosh'], [41.5, 'pop'], [44, 'blip'], [45, 'blip']);
  for (let i = 0; i < 8; i++) a.push([48 + 0.3 * i, 'tick']);
  a.push([51, 'swipe'], [53.5, 'toggle'], [56, 'tap'], [56.3, 'whoosh'], [59.5, 'tap'], [62, 'tap']);
  [0, 3, 6, 9].forEach(b => a.push([64 + b, 'hit']));
  a.push([76, 'chime'], [78, 'tick']);
  [80.5, 83.5, 86.5].forEach(b => a.push([b, 'pop']));
  [89.5, 90, 90.5].forEach(b => a.push([b, 'chime']));
  a.push([92, 'hit'], [93, 'hit'], [94.5, 'whoosh'], [95.5, 'chime']);
  [8, 16, 32, 48, 64, 80, 92].forEach(b => a.push([b, 'boom']));
  return a;
})();

// ---------- shared pieces ----------
function eyebrow(ctx, L, s, x, y, c, alpha = 0.7) {
  txt(ctx, s, x, y, { s: 26 * L.u, w: 500, f: MONO, c, alpha, ls: 4 * L.u });
}

function headline(ctx, L, lb, start, s, x, y, c, size) {
  maskText(ctx, s, x, y, { s: size || 92 * L.u, c, ls: -2 * L.u }, eExp(seg(lb, start, 0.6)));
}

function bg(ctx, L, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, L.W, L.H); }

// ---------- 1. hook ----------
function sHook(ctx, L, lb) {
  const { W, H, u, mx } = L;
  const inv = lb >= 6;
  bg(ctx, L, inv ? COL.ink : COL.paper);
  const fg = inv ? COL.paper : COL.ink;
  const words = ['PLAN.', 'LOG.', 'REPLAY.'];
  const labels = ['01  계획', '02  기록', '03  회고'];
  const size = Math.min(fitSize(ctx, 'REPLAY.', W - 2 * mx, 800, SANS, -4), H * 0.22);
  const lh = size * 1.1;
  const y0 = (H - lh * 3) / 2 + size * 0.95;
  words.forEach((w, i) => {
    const hit = i * 2;
    const p = eExp(seg(lb, hit, 0.5));
    const y = y0 + i * lh;
    const sc = 1 + 0.025 * punch(lb, hit, 0.4);
    ctx.save();
    ctx.translate(mx, y); ctx.scale(sc, sc); ctx.translate(-mx, -y);
    maskText(ctx, w, mx, y, { s: size, c: i === 2 && inv ? COL.red : fg, ls: -4 }, p);
    ctx.restore();
    if (lb > hit + 0.2) txt(ctx, labels[i], mx, y - size * 0.86, { s: 26 * u, w: 500, f: MONO, c: i === 2 ? COL.red : fg, alpha: 0.75 * eOut(seg(lb, hit + 0.2, 0.5)), ls: 4 * u });
  });
  if (inv) {
    ctx.fillStyle = COL.red;
    ctx.fillRect(mx, y0 + 2 * lh + size * 0.14, (W - 2 * mx) * eExp(seg(lb, 6, 0.6)), 10 * u);
  }
}

// ---------- 2. logo ----------
function sLogo(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.ink);
  const lw = portrait ? W - 2 * mx : Math.min(W * 0.62, 1180);
  const lh = lw / (489.16 / 87.57);
  const x = (W - lw) / 2;
  const y = H * (portrait ? 0.4 : 0.36) - lh / 2;
  const img = logoTinted(COL.paper, Math.ceil(lh));
  const p = eExp(seg(lb, 0, 2.6));
  const sc = 1 + 0.02 * punch(lb, 4, 0.4) + 0.02 * punch(lb, 6, 0.4);
  ctx.save();
  ctx.translate(W / 2, y + lh / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(y + lh / 2));
  ctx.beginPath(); ctx.rect(x, y - 4, lw * p, lh + 8); ctx.clip();
  ctx.drawImage(img, x, y, lw, lh);
  ctx.restore();
  ctx.fillStyle = COL.red;
  ctx.fillRect(x, y + lh + 34 * u, lw * eExp(seg(lb, 2.4, 0.9)), 8 * u);
  txt(ctx, 'SWISS MINIMAL TRAVEL ARCHIVE', x, y + lh + 110 * u, { s: 28 * u, w: 500, f: MONO, c: COL.paper, alpha: 0.7 * eOut(seg(lb, 3, 0.6)), ls: 5 * u });
  maskText(ctx, '여행의 계획, 기록, 회고를 한 곳에', x, y + lh + 200 * u, { s: 52 * u, w: 700, c: COL.paper }, eExp(seg(lb, 4, 0.7)));
  if (lb >= 5) marquee(ctx, L, lb - 5, COL.paper, L.subY - 150 * u);
}

function marquee(ctx, L, t, c, y) {
  const { W, u } = L;
  const s = 'MAP   /   TIMELINE   /   POCKET   /   CALENDAR   /   WEATHER   /   MAGAZINE   /   MEMORY REEL   /   WALLET   /   TICKET   /   ';
  const size = 28 * u;
  const wd = measure(ctx, s, size, 500, MONO, 3 * u);
  const off = (t * 170 * u) % wd;
  const a = eOut(seg(t, 0, 0.5));
  line(ctx, 0, y - 44 * u, W, y - 44 * u, c === COL.paper ? 'rgba(242,241,238,.25)' : 'rgba(11,11,12,.2)', 1.5 * u);
  line(ctx, 0, y + 30 * u, W, y + 30 * u, c === COL.paper ? 'rgba(242,241,238,.25)' : 'rgba(11,11,12,.2)', 1.5 * u);
  for (let k = -1; k < 3; k++) txt(ctx, s, -off + k * wd, y, { s: size, w: 500, f: MONO, c, alpha: 0.6 * a, ls: 3 * u });
}

// ---------- 3. map ----------
let DOTS = null;
function worldDots() {
  if (DOTS) return DOTS;
  const { cols, rows, step, top, bits } = window.WORLD;
  const bin = atob(bits);
  DOTS = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    if (!((bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1)) continue;
    const lat = top - step / 2 - r * step;
    const h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    if (h < Math.cos((lat * Math.PI) / 180) * 1.05) DOTS.push([lat, -180 + step / 2 + c * step, h]);
  }
  return DOTS;
}

const CITIES = [
  { ko: '서울', lat: 37.57, lng: 126.98 },
  { ko: '도쿄', lat: 35.68, lng: 139.69 },
  { ko: '방콕', lat: 13.75, lng: 100.5 },
  { ko: '파리', lat: 48.86, lng: 2.35 },
];

function sMap(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.paper);
  eyebrow(ctx, L, 'MAP', mx, (portrait ? 190 : 130) * u, COL.ink);
  headline(ctx, L, lb, 0.5, '지도에서 여정 시작', mx, (portrait ? 300 : 240) * u, COL.ink, (portrait ? 96 : 100) * u);

  // zoom so that lng -20..160 fills the view
  const viewW = portrait ? W - 2 * mx : W * 0.46;
  const rw = viewW * 2;
  const rect = { x: mx - (160 / 360) * rw, y: portrait ? H * 0.25 : H * 0.2, w: rw, h: rw * (140 / 360) };
  const proj = (lat, lng) => [rect.x + ((lng + 180) / 360) * rect.w, rect.y + ((window.WORLD.top - lat) / 140) * rect.h];
  const reveal = 0.44 + eOut(seg(lb, 0, 3)) * 0.6;
  const dr = (rect.w / 360) * window.WORLD.step * 0.4;
  ctx.fillStyle = COL.ink;
  for (const [lat, lng, h] of worldDots()) {
    const nx = (lng + 180) / 360;
    const k = clamp((reveal - nx - h * 0.12) * 7);
    if (k <= 0) continue;
    const [px, py] = proj(lat, lng);
    if (px < mx - 10 * u || px > mx + viewW + 10 * u) continue;
    ctx.globalAlpha = 0.85 * k;
    ctx.beginPath(); ctx.arc(px, py, dr * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const pts = CITIES.map(c => proj(c.lat, c.lng));
  const pinBeats = [3, 5, 7, 9];
  for (let i = 1; i < pts.length; i++) {
    const p = eIO(seg(lb, pinBeats[i - 1] + 0.2, 1.6));
    if (p <= 0) continue;
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.28;
    ctx.save();
    ctx.strokeStyle = COL.red; ctx.lineWidth = 3 * u; ctx.setLineDash([14 * u, 10 * u]); ctx.lineCap = 'round';
    ctx.beginPath();
    const n = 40;
    for (let s = 0; s <= n * p; s++) {
      const t = s / n;
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  CITIES.forEach((c, i) => {
    const b = pinBeats[i];
    const p = eBack(seg(lb, b, 0.5));
    if (p <= 0) return;
    const [x, y] = pts[i];
    const ring = seg(lb, b, 1.2);
    if (ring > 0 && ring < 1) circle(ctx, x, y, (10 + ring * 46) * u, null, `rgba(225,29,46,${0.6 * (1 - ring)})`, 3 * u);
    circle(ctx, x, y, 11 * u * p, COL.red, COL.paper, 3 * u);
    const off = [[-24, -22, 'right'], [26, -6, 'left'], [-24, 44, 'right'], [26, -22, 'left']][i];
    txt(ctx, c.ko, x + off[0] * u, y + off[1] * u, { s: 38 * u, w: 800, c: COL.ink, a: off[2], alpha: eOut(seg(lb, b + 0.1, 0.4)) });
  });

  // template drawer
  const cw = portrait ? W - 2 * mx : W - mx - (W * 0.56 + mx + 80 * u);
  const cx0 = portrait ? mx : W - mx - cw;
  const cy0 = portrait ? H * 0.585 : H * 0.2;
  const rowH = (portrait ? 112 : 118) * u;
  const cp = eExp(seg(lb, 10, 0.9));
  if (cp > 0) {
    const slide = (1 - cp) * 240 * u;
    ctx.save();
    ctx.globalAlpha = cp;
    ctx.translate(0, slide);
    const ch = 96 * u + rowH * 4;
    ctx.fillStyle = COL.white; ctx.fillRect(cx0, cy0, cw, ch);
    ctx.strokeStyle = 'rgba(11,11,12,.25)'; ctx.lineWidth = 2 * u; ctx.strokeRect(cx0, cy0, cw, ch);
    txt(ctx, 'TEMPLATES LIBRARY', cx0 + 28 * u, cy0 + 58 * u, { s: 26 * u, w: 700, f: MONO, c: COL.ink, ls: 3 * u });
    txt(ctx, '4 PRESETS', cx0 + cw - 28 * u, cy0 + 58 * u, { s: 22 * u, w: 500, f: MONO, c: COL.ink, alpha: 0.5, a: 'right', ls: 2 * u });
    const rows = [['도쿄 3박 4일', 'JAPAN · CITY', 'POPULAR'], ['방콕 4박 5일', 'THAILAND · FOOD', 'NEW'], ['파리 5박 6일', 'FRANCE · ART', 'CLASSIC'], ['제주 2박 3일', 'KOREA · NATURE', 'LOCAL']];
    rows.forEach((r, i) => {
      const rp = eOut(seg(lb, 10.5 + 0.5 * i, 0.5));
      if (rp <= 0) return;
      const ry = cy0 + 96 * u + i * rowH;
      const sel = i === 1 && lb >= 13.5;
      ctx.save();
      ctx.globalAlpha = rp;
      if (sel) { ctx.fillStyle = COL.ink; ctx.fillRect(cx0, ry, cw, rowH); }
      else line(ctx, cx0, ry, cx0 + cw, ry, 'rgba(11,11,12,.15)', 1.5 * u);
      const fg = sel ? COL.paper : COL.ink;
      txt(ctx, r[0], cx0 + 28 * u, ry + rowH * 0.48, { s: 40 * u, w: 800, c: fg });
      txt(ctx, r[1], cx0 + 28 * u, ry + rowH * 0.78, { s: 22 * u, w: 500, f: MONO, c: fg, alpha: 0.6, ls: 2 * u });
      const chip = sel ? '적용됨' : r[2];
      const cwid = measure(ctx, chip, 22 * u, 700, sel ? SANS : MONO, 2 * u) + 32 * u;
      ctx.fillStyle = sel ? COL.red : COL.ink;
      ctx.fillRect(cx0 + cw - 28 * u - cwid, ry + rowH * 0.5 - 22 * u, cwid, 44 * u);
      txt(ctx, chip, cx0 + cw - 28 * u - cwid / 2, ry + rowH * 0.5 + 8 * u, { s: 22 * u, w: 700, f: sel ? SANS : MONO, c: COL.white, a: 'center', ls: 2 * u });
      ctx.restore();
    });
    ctx.restore();
  }
}

// ---------- 4. timeline ----------
function sTimeline(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.ink);
  eyebrow(ctx, L, 'TIMELINE', mx, (portrait ? 190 : 130) * u, COL.paper);
  if (portrait) headline(ctx, L, lb, 0.5, '하루를 시간순으로', mx, 300 * u, COL.paper, 96 * u);
  else {
    headline(ctx, L, lb, 0.5, '하루를', mx, H * 0.46, COL.paper, 130 * u);
    headline(ctx, L, lb, 0.8, '시간순으로', mx, H * 0.46 + 140 * u, COL.paper, 130 * u);
  }
  const col = portrait ? { x: mx, w: W - 2 * mx, y: 400 * u } : { x: W * 0.47, w: W * 0.53 - mx, y: 120 * u };
  const rowH = (portrait ? 176 : 112) * u;
  const rows = [
    ['09:10', '인천공항 출발', 'FLIGHT'],
    ['11:40', '나리타 도착', 'TRANSIT'],
    ['14:00', '센소지', 'SPOT'],
    ['16:30', '오모테산도 카페', 'CAFE'],
    ['19:00', '신주쿠 이자카야', 'FOOD'],
    ['21:00', '시부야 스카이', 'SPOT'],
  ];
  const lineX = col.x + 150 * u;
  const total = rows.length * rowH;
  line(ctx, lineX, col.y, lineX, col.y + total * eOut(seg(lb, 0.8, 5)), 'rgba(242,241,238,.25)', 2 * u);

  const nowP = seg(lb, 12, 3.5);
  const nowY = col.y + rowH * (1.5 + 2 * nowP);
  rows.forEach((r, i) => {
    const pocket = i === 5;
    const appear = pocket ? 9.5 : 1 + i * 0.75;
    const p = eExp(seg(lb, appear, 0.55));
    if (p <= 0) return;
    const y = col.y + i * rowH;
    const past = lb >= 12 && !pocket && nowY > y + rowH * 0.6;
    ctx.save();
    ctx.globalAlpha = p * (past ? 0.35 : 1);
    ctx.translate((1 - p) * 90 * u, 0);
    txt(ctx, r[0], col.x, y + rowH * 0.56, { s: 30 * u, w: 500, f: MONO, c: COL.paper, alpha: 0.7 });
    circle(ctx, lineX, y + rowH * 0.5, 9 * u, pocket ? COL.red : COL.ink, pocket ? COL.red : COL.paper, 3 * u);
    const cx0 = lineX + 44 * u, cw = col.x + col.w - cx0, ch = rowH - 22 * u;
    ctx.strokeStyle = pocket ? COL.red : 'rgba(242,241,238,.28)'; ctx.lineWidth = (pocket ? 3 : 1.5) * u;
    ctx.strokeRect(cx0, y + 11 * u, cw, ch);
    txt(ctx, r[1], cx0 + 26 * u, y + rowH * 0.6, { s: (portrait ? 48 : 38) * u, w: 800, c: COL.paper });
    txt(ctx, pocket ? 'POCKET' : r[2], cx0 + cw - 24 * u, y + rowH * 0.56, { s: 22 * u, w: 500, f: MONO, c: pocket ? COL.red : COL.paper, alpha: pocket ? 1 : 0.55, a: 'right', ls: 2 * u });
    ctx.restore();
  });

  // pocket chip flying into the last row
  const fp = seg(lb, 8.4, 1.1);
  if (fp > 0 && lb < 9.7) {
    const toX = lineX + 44 * u + 26 * u, toY = col.y + 5 * rowH + rowH * 0.5;
    const fromX = col.x + col.w * 0.55, fromY = portrait ? col.y - 130 * u : H * 0.8;
    const e = eIO(fp);
    const x = lerp(fromX, toX, e), y = lerp(fromY, toY, e) - Math.sin(e * Math.PI) * 60 * u;
    ctx.save();
    ctx.globalAlpha = 1 - clamp((fp - 0.85) * 6.6);
    ctx.fillStyle = COL.red; rr(ctx, x, y - 30 * u, 330 * u, 60 * u, 30 * u); ctx.fill();
    txt(ctx, '+  시부야 스카이', x + 165 * u, y + 9 * u, { s: 28 * u, w: 800, c: COL.white, a: 'center' });
    ctx.restore();
  }
  if (lb >= 9.5 && lb < 11) {
    const y = col.y + 5 * rowH;
    ctx.fillStyle = `rgba(225,29,46,${0.22 * (1 - seg(lb, 9.5, 1.5))})`;
    ctx.fillRect(col.x, y, col.w, rowH);
  }

  // NOW line
  if (lb >= 12) {
    const a = eOut(seg(lb, 12, 0.4));
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = COL.red; ctx.fillRect(col.x, nowY - 2 * u, col.w, 4 * u);
    ctx.fillRect(col.x, nowY - 30 * u, 104 * u, 30 * u);
    txt(ctx, 'NOW', col.x + 52 * u, nowY - 8 * u, { s: 22 * u, w: 800, f: MONO, c: COL.white, a: 'center', ls: 3 * u });
    const cw2 = measure(ctx, '다음 장소까지 42분', 26 * u, 700) + 36 * u;
    ctx.fillRect(col.x + col.w - cw2, nowY - 24 * u, cw2, 48 * u);
    txt(ctx, '다음 장소까지 42분', col.x + col.w - cw2 / 2, nowY + 9 * u, { s: 26 * u, w: 700, c: COL.white, a: 'center' });
    ctx.restore();
  }
}

// ---------- 5. calendar ----------
function weatherGlyph(ctx, kind, cx, cy, r) {
  ctx.save();
  ctx.lineCap = 'round';
  if (kind === 0) {
    circle(ctx, cx, cy, r * 0.5, '#F59E0B');
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = r * 0.12;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72); ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); ctx.stroke();
    }
  } else {
    const c = kind === 1 ? '#8A8F98' : '#3B82F6';
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(cx - r * 0.28, cy, r * 0.36, 0, Math.PI * 2); ctx.arc(cx + r * 0.12, cy - r * 0.16, r * 0.44, 0, Math.PI * 2); ctx.arc(cx + r * 0.45, cy + r * 0.05, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - r * 0.28, cy, r * 0.73, r * 0.36);
    if (kind === 2) {
      ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = r * 0.11;
      [-0.3, 0.05, 0.4].forEach(dx => { ctx.beginPath(); ctx.moveTo(cx + r * dx, cy + r * 0.5); ctx.lineTo(cx + r * (dx - 0.1), cy + r * 0.8); ctx.stroke(); });
    }
  }
  ctx.restore();
}

const DAY_W = d => ((d * 7) % 3);           // weather kind per day, stable
const DAY_T = d => 17 + ((d * 5) % 9);      // max temperature

function sCalendar(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.paper);
  eyebrow(ctx, L, 'CALENDAR', mx, (portrait ? 190 : 130) * u, COL.ink);
  if (portrait) headline(ctx, L, lb, 0.4, '여행과 날씨를 한눈에', mx, 300 * u, COL.ink, 92 * u);
  else {
    headline(ctx, L, lb, 0.4, '여행과 날씨를', mx, H * 0.46, COL.ink, 120 * u);
    headline(ctx, L, lb, 0.7, '한눈에', mx, H * 0.46 + 130 * u, COL.ink, 120 * u);
  }
  const g = portrait ? { x: mx, y: 560 * u, w: W - 2 * mx } : { x: W * 0.5, y: 190 * u, w: W * 0.5 - mx };
  const cw = g.w / 7, ch = (portrait ? 150 : 118) * u;
  txt(ctx, 'OCT 2026', g.x, g.y - 120 * u, { s: 44 * u, w: 800, c: COL.ink });

  // mode toggle
  const tw = 250 * u, th = 54 * u, tx = g.x + g.w - tw, ty = g.y - 158 * u;
  ctx.strokeStyle = 'rgba(11,11,12,.3)'; ctx.lineWidth = 2 * u; ctx.strokeRect(tx, ty, tw, th);
  const tp = eIO(seg(lb, 5.5, 0.5));
  ctx.fillStyle = COL.ink; ctx.fillRect(tx + tp * tw / 2, ty, tw / 2, th);
  txt(ctx, '일정', tx + tw / 4, ty + th * 0.66, { s: 24 * u, w: 800, c: tp > 0.5 ? COL.ink : COL.paper, a: 'center' });
  txt(ctx, '날씨', tx + tw * 0.75, ty + th * 0.66, { s: 24 * u, w: 800, c: tp > 0.5 ? COL.paper : COL.ink, a: 'center' });

  ['일', '월', '화', '수', '목', '금', '토'].forEach((d, i) => txt(ctx, d, g.x + cw * (i + 0.5), g.y - 24 * u, { s: 24 * u, w: 700, c: i === 0 ? COL.red : COL.ink, alpha: 0.6, a: 'center' }));
  const first = 4;
  const cellPos = d => { const idx = first + d - 1; return [g.x + (idx % 7) * cw, g.y + Math.floor(idx / 7) * ch]; };
  const wp = eOut(seg(lb, 6, 0.9));

  // trip ribbon 8..13
  for (let d = 8; d <= 13; d++) {
    const p = eExp(seg(lb, 3 + (d - 8) * 0.2, 0.5));
    if (p <= 0) continue;
    const [x, y] = cellPos(d);
    const bh = ch * (portrait ? 0.7 : 0.72);
    const startsRow = d === 8 || d === 11;
    const endsRow = d === 10 || d === 13;
    ctx.fillStyle = COL.red;
    const x0 = x + (startsRow ? cw * 0.1 : 0), x1 = x + cw - (endsRow ? cw * 0.1 : 0);
    rr(ctx, x0, y + (ch - bh) / 2, (x1 - x0) * p, bh, startsRow || endsRow ? bh * 0.3 : 0);
    ctx.fill();
  }

  for (let d = 1; d <= 31; d++) {
    const [x, y] = cellPos(d);
    const idx = first + d - 1;
    const p = eOut(seg(lb, (Math.floor(idx / 7) + (idx % 7)) * 0.16, 0.5));
    if (p <= 0) continue;
    const trip = d >= 8 && d <= 13 && seg(lb, 3 + (d - 8) * 0.2, 0.5) > 0.5;
    const fg = trip ? COL.white : (idx % 7 === 0 ? COL.red : COL.ink);
    ctx.save(); ctx.globalAlpha = p;
    const cx = x + cw / 2;
    if (wp < 1) txt(ctx, String(d), cx, y + ch * 0.6, { s: 34 * u, w: 800, c: fg, a: 'center', alpha: 1 - wp });
    if (wp > 0) {
      txt(ctx, String(d), cx, y + ch * 0.3, { s: 22 * u, w: 800, f: MONO, c: fg, a: 'center', alpha: wp });
      ctx.globalAlpha = p * wp;
      if (trip) { ctx.fillStyle = 'rgba(255,255,255,.0)'; }
      weatherGlyph(ctx, DAY_W(d), cx, y + ch * 0.55, Math.min(cw, ch) * 0.24);
      ctx.globalAlpha = p;
      const t = DAY_T(d);
      txt(ctx, portrait ? `${t}°` : `${t - 8}°/${t}°`, cx, y + ch * 0.9, { s: 20 * u, w: 700, f: MONO, c: fg, a: 'center', alpha: wp });
    }
    ctx.restore();
  }

  // taps
  const taps = [[8, 10, 3], [11.5, 11, 3], [14, 12, 3]];
  let sel = null;
  taps.forEach(([b, d]) => { if (lb >= b) sel = d; });
  taps.forEach(([b, d]) => {
    const tp2 = seg(lb, b, 0.9);
    if (tp2 > 0 && tp2 < 1) { const [x, y] = cellPos(d); circle(ctx, x + cw / 2, y + ch / 2, (20 + tp2 * 60) * u, null, `rgba(11,11,12,${0.5 * (1 - tp2)})`, 3 * u); }
  });
  if (sel) {
    const [x, y] = cellPos(sel);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 5 * u;
    ctx.strokeRect(x + cw * 0.08, y + ch * 0.12, cw * 0.84, ch * 0.76);
  }

  // bottom: quick dock, then the peek bar takes its place
  const barW = portrait ? W - 2 * mx : g.w;
  const barX = portrait ? mx : g.x;
  const barH = 128 * u;
  const barY = portrait ? H - 470 * u : g.y + 5 * ch + 30 * u;
  const dockA = eOut(seg(lb, 1, 0.6)) * (1 - eOut(seg(lb, 8, 0.4)));
  if (dockA > 0) {
    const dw = 280 * u, dh = 68 * u;
    ctx.save(); ctx.globalAlpha = dockA;
    ctx.translate(0, (1 - dockA) * 30 * u + eOut(seg(lb, 8, 0.4)) * 40 * u);
    ctx.fillStyle = 'rgba(11,11,12,.92)'; rr(ctx, barX + barW / 2 - dw / 2, barY + barH / 2 - dh / 2, dw, dh, dh / 2); ctx.fill();
    for (let i = 0; i < 4; i++) circle(ctx, barX + barW / 2 - dw / 2 + dh / 2 + 4 * u + i * 66 * u, barY + barH / 2, 22 * u, i === 3 ? COL.red : 'rgba(255,255,255,.14)');
    ctx.restore();
  }
  const pp = eExp(seg(lb, 8.3, 0.6));
  if (pp > 0) {
    ctx.save();
    ctx.translate(0, (1 - pp) * 200 * u); ctx.globalAlpha = pp;
    ctx.fillStyle = COL.white; ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = 'rgba(11,11,12,.3)'; ctx.lineWidth = 2 * u; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = 'rgba(11,11,12,.25)'; ctx.fillRect(barX + barW / 2 - 32 * u, barY + 14 * u, 64 * u, 5 * u);
    const info = { 10: ['10.10', '일정 3', 0, '22°', '14°'], 11: ['10.11', '일정 1', 2, '18°', '12°'], 12: ['10.12', '일정 2', 1, '20°', '13°'] }[sel || 10];
    const flash = punch(lb, sel === 12 ? 14 : sel === 11 ? 11.5 : 8.3, 0.4);
    const tx0 = barX + 32 * u, midY = barY + barH * 0.62;
    txt(ctx, info[0], tx0, midY + 4 * u, { s: 40 * u, w: 800, f: MONO, c: COL.ink });
    txt(ctx, info[1], tx0 + 168 * u, midY + 4 * u, { s: 26 * u, w: 500, f: MONO, c: COL.ink, alpha: 0.55 });
    weatherGlyph(ctx, info[2], barX + barW - 390 * u, midY - 6 * u, 26 * u);
    txt(ctx, info[3], barX + barW - 350 * u, midY + 4 * u, { s: 30 * u, w: 800, f: MONO, c: COL.red });
    txt(ctx, '/', barX + barW - 290 * u, midY + 4 * u, { s: 30 * u, w: 500, f: MONO, c: COL.ink, alpha: 0.4 });
    txt(ctx, info[4], barX + barW - 268 * u, midY + 4 * u, { s: 30 * u, w: 800, f: MONO, c: '#3B82F6' });
    ctx.fillStyle = COL.ink; ctx.fillRect(barX + barW - 190 * u, barY + barH * 0.62 - 30 * u, 60 * u, 60 * u);
    txt(ctx, '+', barX + barW - 160 * u, midY + 14 * u, { s: 48 * u, w: 500, c: COL.white, a: 'center' });
    txt(ctx, '×', barX + barW - 66 * u, midY + 12 * u, { s: 48 * u, w: 400, c: COL.ink, alpha: 0.55, a: 'center' });
    if (flash > 0) { ctx.fillStyle = `rgba(225,29,46,${0.14 * flash})`; ctx.fillRect(barX, barY, barW, barH); }
    ctx.restore();
  }
}

// ---------- 6. memory reel ----------
const SHOTS = [
  { place: '센소지', city: 'TOKYO', date: '10.08', sky: ['#1B1B3A', '#C2410C', '#F59E0B'], sun: 0.62, kind: 'city' },
  { place: '협재 해변', city: 'JEJU', date: '10.10', sky: ['#0E7490', '#67E8F9', '#ECFEFF'], sun: 0.3, kind: 'sea' },
  { place: '닛코 숲길', city: 'NIKKO', date: '10.11', sky: ['#14532D', '#65A30D', '#ECFCCB'], sun: 0.25, kind: 'hills' },
  { place: '몽마르트르', city: 'PARIS', date: '10.13', sky: ['#020617', '#1E3A8A', '#6366F1'], sun: 0.7, kind: 'city' },
];
const PHOTO_CACHE = {};
function shotCanvas(i, W, H) {
  const key = i + ':' + W + ':' + H;
  if (PHOTO_CACHE[key]) return PHOTO_CACHE[key];
  const S = SHOTS[i];
  const w = Math.ceil(W * 1.2), h = Math.ceil(H * 1.2);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, S.sky[0]); gr.addColorStop(0.6, S.sky[1]); gr.addColorStop(1, S.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(i * 77 + 5);
  circle(g, w * (0.3 + r() * 0.4), h * (0.24 + S.sun * 0.32), Math.min(w, h) * 0.09, 'rgba(255,244,214,.92)');
  if (S.kind === 'city') {
    for (let k = 0; k < 2; k++) {
      let x = 0;
      const base = h * (0.78 + k * 0.08);
      g.fillStyle = k === 0 ? 'rgba(10,10,20,.55)' : 'rgba(6,6,12,.95)';
      while (x < w) {
        const bw = (w / 24) * (0.6 + r() * 1.2), bh = h * (0.08 + r() * (k === 0 ? 0.22 : 0.14));
        g.fillRect(x, base - bh, bw, h - base + bh);
        if (k === 1) { g.fillStyle = 'rgba(255,214,120,.8)'; for (let wy = base - bh + 14; wy < base - 8; wy += 22) for (let wx = x + 8; wx < x + bw - 8; wx += 20) if (r() > 0.6) g.fillRect(wx, wy, 6, 9); g.fillStyle = 'rgba(6,6,12,.95)'; }
        x += bw + 3;
      }
    }
  } else if (S.kind === 'sea') {
    for (let k = 0; k < 5; k++) {
      g.fillStyle = `rgba(4,60,80,${0.15 + k * 0.12})`;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.62 + k * 0.07) + Math.sin(x / 90 + k * 2) * 8);
      g.lineTo(w, h); g.fill();
    }
  } else {
    for (let k = 0; k < 4; k++) {
      g.fillStyle = `rgba(6,40,20,${0.25 + k * 0.22})`;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.55 + k * 0.1) + Math.sin(x / (160 - k * 25) + k * 3) * (60 - k * 8));
      g.lineTo(w, h); g.fill();
    }
  }
  PHOTO_CACHE[key] = c;
  return c;
}

function sReel(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.ink);
  if (lb < 12) {
    const idx = Math.min(3, Math.floor(lb / 3));
    const drawShot = (i, alpha, local) => {
      const c = shotCanvas(i, W, H);
      const k = 1 + 0.12 * clamp(local / 3);
      const dir = i % 2 ? -1 : 1;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(W / 2 + dir * local * 8 * u, H / 2);
      ctx.scale(k, k);
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
    };
    if (idx > 0 && lb - idx * 3 < 0.25) drawShot(idx - 1, 1, 3);
    drawShot(idx, idx > 0 ? clamp((lb - idx * 3) / 0.25) : 1, lb - idx * 3);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(0.35, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

    const top = 64 * u;
    for (let i = 0; i < 4; i++) {
      const x0 = mx + i * ((W - 2 * mx) / 4), sw = (W - 2 * mx) / 4 - 8 * u;
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x0, top, sw, 4 * u);
      ctx.fillStyle = COL.white; ctx.fillRect(x0, top, sw * (i < idx ? 1 : i === idx ? ((lb - idx * 3) / 3) : 0), 4 * u);
    }
    txt(ctx, 'MEMORY REEL  /  TOKYO 2026', mx, top + 60 * u, { s: 24 * u, w: 500, f: MONO, c: COL.white, alpha: 0.85, ls: 4 * u });
    txt(ctx, `${String(idx + 1).padStart(2, '0')} / 04`, W - mx, top + 60 * u, { s: 24 * u, w: 500, f: MONO, c: COL.white, alpha: 0.85, a: 'right' });
    const S = SHOTS[idx], ll = lb - idx * 3;
    const ly = portrait ? H * 0.6 : H * 0.62;
    ctx.fillStyle = COL.red; ctx.fillRect(mx, ly - 90 * u, 70 * u * eExp(seg(ll, 0.1, 0.5)), 4 * u);
    txt(ctx, `${S.city}  ·  ${S.date}`, mx + 90 * u, ly - 80 * u, { s: 26 * u, w: 500, f: MONO, c: COL.white, alpha: 0.9 * eOut(seg(ll, 0.2, 0.4)), ls: 4 * u });
    maskText(ctx, S.place, mx, ly + 60 * u, { s: (portrait ? 150 : 140) * u, c: COL.white, ls: -4 * u }, eExp(seg(ll, 0.15, 0.6)));

    // transport pill, same shape as the app
    const pw = 220 * u, ph = 68 * u, py = L.subY - 170 * u;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, W / 2 - pw / 2, py, pw, ph, ph / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2 * u; rr(ctx, W / 2 - pw / 2, py, pw, ph, ph / 2); ctx.stroke();
    circle(ctx, W / 2 - pw / 2 + ph / 2, py + ph / 2, 26 * u, COL.white);
    ctx.fillStyle = COL.ink; ctx.fillRect(W / 2 - pw / 2 + ph / 2 - 8 * u, py + ph / 2 - 10 * u, 5 * u, 20 * u); ctx.fillRect(W / 2 - pw / 2 + ph / 2 + 3 * u, py + ph / 2 - 10 * u, 5 * u, 20 * u);
    circle(ctx, W / 2 + 8 * u, py + ph / 2, 5 * u, 'rgba(255,255,255,.85)');
    circle(ctx, W / 2 + 62 * u, py + ph / 2, 5 * u, 'rgba(255,255,255,.85)');
  } else {
    const cl = lb - 12;
    bg(ctx, L, COL.ink);
    txt(ctx, 'TRIPGON MAGAZINE', W / 2, H * (portrait ? 0.34 : 0.22), { s: 26 * u, w: 500, f: MONO, c: COL.paper, alpha: 0.6 * eOut(seg(cl, 0, 0.5)), a: 'center', ls: 6 * u });
    const s1 = fitSize(ctx, 'TOKYO', W - 2 * mx, 800, SANS, -4);
    maskText(ctx, 'TOKYO', W / 2, H * (portrait ? 0.34 : 0.22) + Math.min(s1, 260 * u) * 1.05, { s: Math.min(s1, 260 * u), c: COL.paper, a: 'center', ls: -4 }, eExp(seg(cl, 0.3, 0.7)));
    txt(ctx, '10.08 — 10.13', W / 2, H * (portrait ? 0.34 : 0.22) + Math.min(s1, 260 * u) * 1.05 + 90 * u, { s: 36 * u, w: 500, f: MONO, c: COL.red, a: 'center', alpha: eOut(seg(cl, 1.2, 0.5)) });
    txt(ctx, '12 SHOTS   ·   7 PLACES   ·   6 DAYS', W / 2, H * (portrait ? 0.34 : 0.22) + Math.min(s1, 260 * u) * 1.05 + 170 * u, { s: 26 * u, w: 500, f: MONO, c: COL.paper, alpha: 0.7 * eOut(seg(cl, 1.6, 0.5)), a: 'center', ls: 3 * u });
    const bp = eOut(seg(cl, 2.2, 0.5));
    if (bp > 0) {
      const by = H * (portrait ? 0.34 : 0.22) + Math.min(s1, 260 * u) * 1.05 + 250 * u, bw = 200 * u, bh = 64 * u;
      ctx.save(); ctx.globalAlpha = bp;
      ctx.strokeStyle = 'rgba(242,241,238,.7)'; ctx.lineWidth = 2 * u; ctx.strokeRect(W / 2 - bw - 14 * u, by, bw, bh);
      ctx.fillStyle = COL.paper; ctx.fillRect(W / 2 + 14 * u, by, bw, bh);
      txt(ctx, 'REPLAY', W / 2 - bw / 2 - 14 * u, by + bh * 0.62, { s: 24 * u, w: 500, f: MONO, c: COL.paper, a: 'center', ls: 4 * u });
      txt(ctx, 'CLOSE', W / 2 + bw / 2 + 14 * u, by + bh * 0.62, { s: 24 * u, w: 500, f: MONO, c: COL.ink, a: 'center', ls: 4 * u });
      ctx.restore();
    }
  }
}

// ---------- 7. how to ----------
function sHowto(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.paper);
  eyebrow(ctx, L, 'HOW TO', mx, (portrait ? 190 : 130) * u, COL.ink);
  headline(ctx, L, lb, 0.2, '사용법은 간단해요', mx, (portrait ? 300 : 240) * u, COL.ink, (portrait ? 96 : 100) * u);
  const steps = [['1', '담기', '마음에 든 장소를 포켓에'], ['2', '만들기', '지도에서 여정과 일정을 완성'], ['3', '남기기', '여행 중 기록, 여행 후 매거진']];
  const starts = [0.5, 3.5, 6.5];
  steps.forEach((s, i) => {
    const p = eExp(seg(lb, starts[i], 0.7));
    if (p <= 0) return;
    const done = eOut(seg(lb, 9.5 + i * 0.5, 0.4));
    if (portrait) {
      const bh = 380 * u, y = 440 * u + i * bh;
      line(ctx, mx, y, mx + (W - 2 * mx) * p, y, 'rgba(11,11,12,.3)', 2 * u);
      const cur = lb < starts[i] + 3 && lb < 9.5;
      txt(ctx, s[0], mx, y + 290 * u, { s: 320 * u, c: cur || done > 0 ? COL.red : COL.ink, alpha: p });
      ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * 60 * u, 0);
      txt(ctx, s[1], mx + 270 * u, y + 190 * u, { s: 100 * u, c: COL.ink });
      txt(ctx, s[2], mx + 270 * u, y + 262 * u, { s: 40 * u, w: 500, c: COL.ink, alpha: 0.65 });
      ctx.restore();
      if (done > 0) { ctx.fillStyle = COL.red; ctx.fillRect(W - mx - 70 * u, y + 120 * u, 70 * u * done, 70 * u); ctx.strokeStyle = COL.white; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.moveTo(W - mx - 54 * u, y + 156 * u); ctx.lineTo(W - mx - 38 * u, y + 172 * u); ctx.lineTo(W - mx - 14 * u, y + 138 * u); ctx.globalAlpha = done; ctx.stroke(); ctx.globalAlpha = 1; }
    } else {
      const cw = (W - 2 * mx) / 3, x = mx + i * cw, y = H * 0.36;
      line(ctx, x, y, x + (cw - 40 * u) * p, y, 'rgba(11,11,12,.3)', 2 * u);
      const cur = lb < starts[i] + 3 && lb < 9.5;
      txt(ctx, s[0], x, y + 280 * u, { s: 300 * u, c: cur || done > 0 ? COL.red : COL.ink, alpha: p });
      ctx.save(); ctx.globalAlpha = p; ctx.translate(0, (1 - p) * 40 * u);
      txt(ctx, s[1], x, y + 370 * u, { s: 76 * u, c: COL.ink });
      txt(ctx, s[2], x, y + 425 * u, { s: 32 * u, w: 500, c: COL.ink, alpha: 0.65 });
      ctx.restore();
      if (done > 0) { ctx.fillStyle = COL.red; ctx.fillRect(x + cw - 110 * u, y + 30 * u, 60 * u * done, 60 * u); }
    }
  });
}

// ---------- 8. outro ----------
function sOutro(ctx, L, lb) {
  const { W, H, u, mx, portrait } = L;
  bg(ctx, L, COL.ink);
  const size = Math.min(fitSize(ctx, '로그가 된다.', W - 2 * mx, 800, SANS, -4), H * 0.2);
  const p1 = eExp(seg(lb, 0, 0.6)), p2 = eExp(seg(lb, 1, 0.6));
  const out = eIO(seg(lb, 3.5, 0.6));
  const y1 = H * 0.36;
  ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(0, -out * 60 * u);
  maskText(ctx, '여행은,', mx, y1, { s: size, c: COL.paper, ls: -4 }, p1);
  maskText(ctx, '로그가 된다.', mx, y1 + size * 1.15, { s: size, c: COL.red, ls: -4 }, p2);
  ctx.restore();
  if (lb >= 3.6) {
    const lw = portrait ? W - 2 * mx : Math.min(W * 0.5, 980);
    const lh = lw / (489.16 / 87.57);
    const img = logoTinted(COL.paper, Math.ceil(lh));
    const x = (W - lw) / 2, y = H * 0.42;
    const p = eExp(seg(lb, 3.6, 1.2));
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - 4, lw * p, lh + 8); ctx.clip(); ctx.drawImage(img, x, y, lw, lh); ctx.restore();
    ctx.fillStyle = COL.red; ctx.fillRect(x, y + lh + 34 * u, lw * eExp(seg(lb, 4.4, 0.8)), 8 * u);
    maskText(ctx, '지금 첫 여정을 만들어 보세요', W / 2, y + lh + 150 * u, { s: 46 * u, w: 700, c: COL.paper, a: 'center' }, eExp(seg(lb, 5, 0.7)));
  }
  const fade = eIO(seg(lb, 7.2, 0.8));
  if (fade > 0) { ctx.fillStyle = `rgba(11,11,12,${fade})`; ctx.fillRect(0, 0, W, H); }
}

const SCENE_FN = { hook: sHook, logo: sLogo, map: sMap, timeline: sTimeline, calendar: sCalendar, reel: sReel, howto: sHowto, outro: sOutro };
