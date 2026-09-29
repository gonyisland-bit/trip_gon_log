// Offline mp4 exporter for Intro 2.0 (dev only, loaded by promo/index.html; not part of the app bundle).
// Renders the same stage frame by frame, encodes with WebCodecs and muxes with the vendored mp4/webm muxers.
import { IntroStage } from './stage';
import { renderSoundtrack } from './soundtrack';
import { BEAT, DURATION } from './timeline';

declare const Mp4Muxer: any;
declare const WebMMuxer: any;

export const FORMATS = { vertical: [1080, 1920], wide: [1920, 1080], square: [1080, 1080] } as const;
export type Format = keyof typeof FORMATS;
const FPS = 30;

export interface ExportState { status: string; progress: number; result: { name: string; bytes: number } | null }
export const state: ExportState = { status: 'idle', progress: 0, result: null };

async function pickCodecs(W: number, H: number) {
  const combos = [
    { v: 'avc1.640028', a: 'mp4a.40.2', mux: 'mp4' },
    { v: 'vp09.00.40.08', a: 'opus', mux: 'webm' },
  ];
  for (const c of combos) {
    try {
      const vs = await VideoEncoder.isConfigSupported({ codec: c.v, width: W, height: H, bitrate: 10e6, framerate: FPS });
      const as = await AudioEncoder.isConfigSupported({ codec: c.a, numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 });
      if (vs.supported && as.supported) return c;
    } catch { /* try the next pair */ }
  }
  return null;
}

/** A stage at a fixed size, plus a canvas that holds both layers for encoding */
export async function createFrameRenderer(fmt: Format) {
  const [W, H] = FORMATS[fmt];
  const gl = document.createElement('canvas');
  const type = document.createElement('canvas');
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d')!;
  const stage = new IntroStage({ glCanvas: gl, typeCanvas: type, preserve: true, cta: true });
  stage.resize(W, H, 1);
  await stage.load();
  return {
    canvas: out,
    draw(t: number) {
      stage.render(t);
      ctx.drawImage(gl, 0, 0, W, H);
      ctx.drawImage(type, 0, 0, W, H);
    },
    dispose() { stage.dispose(); },
  };
}

export async function exportVideo(fmt: Format, save = true) {
  const [W, H] = FORMATS[fmt];
  state.status = 'audio'; state.progress = 0; state.result = null;
  const audio = await renderSoundtrack();
  const codec = await pickCodecs(W, H);
  if (!codec) { state.status = 'error: no supported codec'; return; }
  const isMp4 = codec.mux === 'mp4';
  const M = isMp4 ? Mp4Muxer : WebMMuxer;
  const target = new M.ArrayBufferTarget();
  const muxer = new M.Muxer(isMp4
    ? { target, video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory' }
    : { target, video: { codec: 'V_VP9', width: W, height: H, frameRate: FPS }, audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: 48000 } });
  let failure: Error | null = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { failure = e; } });
  venc.configure({ codec: codec.v, width: W, height: H, bitrate: 10e6, framerate: FPS, ...(isMp4 ? { avc: { format: 'avc' as const } } : {}) });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { failure = e; } });
  aenc.configure({ codec: codec.a, numberOfChannels: 2, sampleRate: 48000, bitrate: 192000 });

  const total = Math.round(DURATION * 48000), block = 4800;
  const l = audio.getChannelData(0), r = audio.getChannelData(1);
  for (let off = 0; off < total; off += block) {
    const n = Math.min(block, total - off);
    const data = new Float32Array(n * 2);
    data.set(l.subarray(off, off + n), 0); data.set(r.subarray(off, off + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off / 48000) * 1e6), data });
    aenc.encode(ad); ad.close();
  }

  state.status = 'video';
  const fr = await createFrameRenderer(fmt);
  const frames = Math.round(DURATION * FPS);
  for (let n = 0; n < frames; n++) {
    if (failure) { state.status = 'error: ' + (failure as Error).message; fr.dispose(); return; }
    fr.draw(n / FPS);
    const vf = new VideoFrame(fr.canvas, { timestamp: Math.round((n * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: n % 60 === 0 });
    vf.close();
    while (venc.encodeQueueSize > 4) await new Promise(res => venc.addEventListener('dequeue', res, { once: true }));
    if (n % 15 === 0) { state.progress = n / frames; await new Promise(res => setTimeout(res, 0)); }
  }
  fr.dispose();
  await venc.flush(); await aenc.flush();
  muxer.finalize();
  const blob = new Blob([target.buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' });
  const name = `tripgon-intro-${fmt}.${isMp4 ? 'mp4' : 'webm'}`;
  state.result = { name, bytes: blob.size };
  if (save) {
    state.status = 'saving';
    const res = await fetch('/__promo/save?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
    if (!res.ok) { state.status = 'error: save failed'; return; }
  }
  state.progress = 1; state.status = 'done';
}

// ---------- preview page ----------
async function init() {
  const stageEl = document.getElementById('stage')!;
  const scrub = document.getElementById('scrub') as HTMLInputElement;
  const fmtSel = document.getElementById('fmt') as HTMLSelectElement;
  const info = document.getElementById('info')!;
  let fmt: Format = 'vertical';
  let fr = await createFrameRenderer(fmt);
  stageEl.appendChild(fr.canvas);
  let t = 0, playing = false, last = 0;
  const draw = () => {
    fr.draw(t);
    scrub.value = String((t / DURATION) * 1000);
    info.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(2)}s  beat ${(t / BEAT).toFixed(1)}`;
  };
  const setFmt = async (f: Format) => {
    fmt = f;
    fr.canvas.remove(); fr.dispose();
    fr = await createFrameRenderer(f);
    fr.canvas.style.maxHeight = '78vh';
    stageEl.appendChild(fr.canvas);
    draw();
  };
  fmtSel.onchange = () => setFmt(fmtSel.value as Format);
  scrub.oninput = () => { t = (Number(scrub.value) / 1000) * DURATION; draw(); };
  document.getElementById('play')!.onclick = () => {
    playing = !playing; last = performance.now();
    if (playing) requestAnimationFrame(function tick(now) {
      if (!playing) return;
      t = (t + (now - last) / 1000) % DURATION; last = now; draw(); requestAnimationFrame(tick);
    });
  };
  let actx: AudioContext | null = null;
  document.getElementById('sound')!.onclick = async () => {
    const buf = await renderSoundtrack();
    actx = actx || new AudioContext();
    const src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination); src.start(0, t);
  };
  document.getElementById('export')!.onclick = async () => {
    await exportVideo(fmt);
    info.textContent = state.result ? `${state.result.name} ${(state.result.bytes / 1e6).toFixed(1)} MB → promo/out` : state.status;
  };
  Object.assign(window, { PROMO: state, exportVideo, seek: (s: number) => { t = s; draw(); }, setFormat: (f: Format) => { fmtSel.value = f; return setFmt(f); } });
  fr.canvas.style.maxHeight = '78vh';
  draw();
  (state as ExportState & { ready?: boolean }).ready = true;
}

if (document.getElementById('stage')) init();
