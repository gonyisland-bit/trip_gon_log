// Frame renderer, preview controls and the offline exporter (WebCodecs + mp4/webm muxer).

const FORMATS = { vertical: [1080, 1920], wide: [1920, 1080] };

function makeL(W, H) {
  const u = Math.min(W, H) / 1080;
  const portrait = H > W;
  return { W, H, u, portrait, mx: (portrait ? 72 : 110) * u, subY: portrait ? H - 190 * u : H - 96 * u };
}

function drawSubtitle(ctx, L, b) {
  const s = SUBS.find(([a, z]) => b >= a && b < z);
  if (!s) return;
  const a = clamp((b - s[0]) / 0.25) * clamp((s[1] - b) / 0.25);
  const size = (L.portrait ? 46 : 40) * L.u;
  const wd = measure(ctx, s[2], size, 700, SANS, 0);
  const padX = 30 * L.u, padY = 18 * L.u;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - a) * 12 * L.u);
  ctx.fillStyle = 'rgba(11,11,12,.88)';
  ctx.fillRect(L.W / 2 - wd / 2 - padX, L.subY - size / 2 - padY - size * 0.1, wd + padX * 2, size + padY * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5 * L.u;
  ctx.strokeRect(L.W / 2 - wd / 2 - padX, L.subY - size / 2 - padY - size * 0.1, wd + padX * 2, size + padY * 2);
  ctx.restore();
  txt(ctx, s[2], L.W / 2, L.subY + size * 0.34, { s: size, w: 700, c: COL.white, a: 'center', alpha: a });
}

function renderFrame(ctx, L, t) {
  const b = t / BEAT;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, L.W, L.H);
  const sc = SCENES.find(s => b >= s.start && b < s.end) || SCENES[SCENES.length - 1];
  SCENE_FN[sc.id](ctx, L, b - sc.start);
  drawSubtitle(ctx, L, b);
  for (const s of SCENES) {
    if (!s.start) continue;
    const db = b - s.start;
    if (Math.abs(db) < 0.3) {
      const p = (db + 0.3) / 0.6;
      ctx.fillStyle = COL.red;
      ctx.fillRect(-L.W + 2 * L.W * p, 0, L.W, L.H);
    }
  }
}

async function loadAssets() {
  Logo.img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'tripgon-logotype.svg'; });
  try {
    await Promise.all([
      document.fonts.load('800 100px "Inter"', 'PLAN LOG'),
      document.fonts.load('500 30px "JetBrains Mono"', 'MAP TIMELINE'),
      document.fonts.load('800 100px "Noto Sans KR"', '여행은 로그가 된다 지도에서 시작'),
      document.fonts.load('500 30px "Noto Sans KR"', '여행은 로그가 된다'),
      document.fonts.load('700 30px "Noto Sans KR"', '여행은 로그가 된다'),
    ]);
  } catch (e) { /* fall back to system fonts */ }
}

const PROMO = { status: 'idle', progress: 0, log: [], result: null };

async function pickCodecs(W, H) {
  const combos = [
    { v: 'avc1.640028', a: 'mp4a.40.2', mux: 'mp4' },
    { v: 'vp09.00.40.08', a: 'opus', mux: 'webm' },
    { v: 'vp8', a: 'opus', mux: 'webm' },
  ];
  for (const c of combos) {
    try {
      const vs = await VideoEncoder.isConfigSupported({ codec: c.v, width: W, height: H, bitrate: 8e6, framerate: FPS });
      const as = await AudioEncoder.isConfigSupported({ codec: c.a, numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 });
      if (vs.supported && as.supported) return c;
    } catch (e) { /* try next */ }
  }
  return null;
}

async function exportVideo(fmt, save = true) {
  const [W, H] = FORMATS[fmt];
  PROMO.status = 'audio'; PROMO.progress = 0;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const L = makeL(W, H);
  const audio = await renderAudio();
  const codec = await pickCodecs(W, H);
  if (!codec) { PROMO.status = 'error: no supported codec'; return; }
  PROMO.log.push(`codec ${codec.v} + ${codec.a} -> ${codec.mux}`);

  const isMp4 = codec.mux === 'mp4';
  const target = new (isMp4 ? Mp4Muxer : WebMMuxer).ArrayBufferTarget();
  const muxer = new (isMp4 ? Mp4Muxer : WebMMuxer).Muxer(isMp4 ? {
    target, video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory',
  } : {
    target, video: { codec: codec.v.startsWith('vp09') ? 'V_VP9' : 'V_VP8', width: W, height: H, frameRate: FPS }, audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: 48000 },
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { failure = e; } });
  venc.configure({ codec: codec.v, width: W, height: H, bitrate: 8e6, framerate: FPS, ...(isMp4 ? { avc: { format: 'avc' } } : {}) });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { failure = e; } });
  aenc.configure({ codec: codec.a, numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 });

  // audio first (cheap), in 0.1 s blocks
  const total = Math.round(DURATION * 48000);
  const block = 4800;
  const l = audio.getChannelData(0), r = audio.getChannelData(1);
  for (let off = 0; off < total; off += block) {
    const n = Math.min(block, total - off);
    const data = new Float32Array(n * 2);
    data.set(l.subarray(off, off + n), 0); data.set(r.subarray(off, off + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off / 48000) * 1e6), data });
    aenc.encode(ad); ad.close();
  }

  PROMO.status = 'video';
  const frames = Math.round(DURATION * FPS);
  for (let n = 0; n < frames; n++) {
    if (failure) { PROMO.status = 'error: ' + failure.message; return; }
    renderFrame(ctx, L, n / FPS);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((n * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: n % 60 === 0 });
    vf.close();
    while (venc.encodeQueueSize > 4) await new Promise(res => venc.addEventListener('dequeue', res, { once: true }));
    if (n % 15 === 0) { PROMO.progress = n / frames; await new Promise(res => setTimeout(res, 0)); }
  }
  await venc.flush(); await aenc.flush();
  muxer.finalize();
  const blob = new Blob([target.buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' });
  const name = `tripgon-intro-${fmt}.${isMp4 ? 'mp4' : 'webm'}`;
  PROMO.result = { name, bytes: blob.size };
  if (save) {
    PROMO.status = 'saving';
    const res = await fetch('/save?name=' + name, { method: 'POST', body: blob });
    if (!res.ok) { PROMO.status = 'error: save failed'; return; }
  }
  PROMO.progress = 1; PROMO.status = 'done';
}

// ---------- preview UI ----------
(async function init() {
  const stage = document.getElementById('stage');
  const scrub = document.getElementById('scrub');
  const fmtSel = document.getElementById('fmt');
  const info = document.getElementById('info');
  await loadAssets();
  let fmt = 'vertical';
  let t = 0, playing = false, last = 0;
  const cv = document.createElement('canvas');
  stage.appendChild(cv);
  const ctx = cv.getContext('2d');
  const setFmt = f => {
    fmt = f; const [W, H] = FORMATS[f]; cv.width = W; cv.height = H;
    cv.style.aspectRatio = `${W} / ${H}`;
    cv.style.maxHeight = f === 'vertical' ? '78vh' : 'auto';
    draw();
  };
  const draw = () => {
    const [W, H] = FORMATS[fmt];
    renderFrame(ctx, makeL(W, H), t);
    scrub.value = String(t / DURATION * 1000);
    info.textContent = `${t.toFixed(2)}s / ${DURATION}s  beat ${(t / BEAT).toFixed(1)}`;
  };
  fmtSel.onchange = () => setFmt(fmtSel.value);
  scrub.oninput = () => { t = (scrub.value / 1000) * DURATION; draw(); };
  document.getElementById('play').onclick = () => {
    playing = !playing; last = performance.now();
    if (playing) requestAnimationFrame(function tick(now) {
      if (!playing) return;
      t = (t + (now - last) / 1000) % DURATION; last = now; draw(); requestAnimationFrame(tick);
    });
  };
  let audioCtx = null;
  document.getElementById('sound').onclick = async () => {
    const buf = await renderAudio();
    audioCtx = audioCtx || new AudioContext();
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.connect(audioCtx.destination); src.start(0, t);
  };
  document.getElementById('export').onclick = async () => { await exportVideo(fmt, false); const p = PROMO.result; info.textContent = p ? `${p.name} ${(p.bytes / 1e6).toFixed(1)} MB` : PROMO.status; };
  window.PROMO = PROMO; window.exportVideo = exportVideo;
  window.seek = s => { t = s; draw(); };
  window.setFormat = f => { fmtSel.value = f; setFmt(f); };
  setFmt('vertical');
  PROMO.ready = true;
})();
