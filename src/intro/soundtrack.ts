// Generated soundtrack for Intro 2.0: 128 BPM, A minor (Am – F – C – G), rendered offline so the
// player and the exporter hear the same mix. Kick-ducked pads, a sub bass, stereo arps, risers into
// each scene and effects tied to what is on screen.
import { BEAT, DURATION, SCENES, SFX, TOTAL_BEATS, type SfxKind } from './timeline';

const CHORDS = [
  { root: 55, tones: [220, 261.63, 329.63] },
  { root: 43.65, tones: [174.61, 220, 261.63] },
  { root: 65.41, tones: [261.63, 329.63, 392] },
  { root: 49, tones: [196, 246.94, 293.66] },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

let cached: Promise<AudioBuffer> | null = null;

// Rendering takes a few seconds; progress (0–1) is shared by every caller
let progress = 0;
const listeners = new Set<(p: number) => void>();
const report = (p: number) => { progress = p; listeners.forEach(fn => fn(p)); };

/** Subscribe to rendering progress; returns an unsubscribe function */
export function onSoundtrackProgress(fn: (p: number) => void) {
  listeners.add(fn);
  fn(progress);
  return () => { listeners.delete(fn); };
}

export function renderSoundtrack(): Promise<AudioBuffer> {
  if (!cached) cached = render().then(b => { report(1); return b; }).catch(e => { cached = null; report(0); throw e; });
  return cached;
}

async function render(): Promise<AudioBuffer> {
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * (DURATION + 1)), sr);
  const T = (b: number) => b * BEAT;
  // Risers end on each scene change (except the first)
  const risers = SCENES.filter(s => s.start > 0).map(s => [s.start - 2, s.start] as const);
  const inRiser = (b: number) => risers.some(([a, z]) => b >= a + 1 && b < z);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.9, 0);
  master.gain.setValueAtTime(0.9, T(TOTAL_BEATS - 3));
  master.gain.linearRampToValueAtTime(0, DURATION);
  comp.connect(master); master.connect(ctx.destination);

  // Pads and arps go through a bus the kick ducks (sidechain pump)
  const duck = ctx.createGain(); duck.gain.value = 1; duck.connect(comp);
  const pump = (t: number) => { duck.gain.setValueAtTime(0.25, t); duck.gain.linearRampToValueAtTime(1, t + BEAT * 0.8); };

  // Ping-pong echo
  const send = ctx.createGain(); send.gain.value = 0.35;
  const dl = ctx.createDelay(1), dr = ctx.createDelay(1);
  dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.5;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 3000;
  const merger = ctx.createChannelMerger(2);
  send.connect(dl); dl.connect(elp); elp.connect(dr); dr.connect(fb); fb.connect(dl);
  elp.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(duck);

  const nbuf = ctx.createBuffer(1, sr * 2, sr);
  { const d = nbuf.getChannelData(0); const r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  const noise = (t: number, dur: number) => { const s = ctx.createBufferSource(); s.buffer = nbuf; s.start(t, 0, dur + 0.05); s.stop(t + dur + 0.05); return s; };
  const env = (g: GainNode, t: number, peak: number, dur: number, a = 0.002) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const osc = (type: OscillatorType, f: number, t: number, dur: number) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); return o;
  };
  const panned = (pan: number, dest: AudioNode) => { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p; };

  const kick = (t: number, v = 0.95) => {
    const o = osc('sine', 150, t, 0.45), g = ctx.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    env(g, t, v, 0.42, 0.001); o.connect(g); g.connect(comp);
    const n = noise(t, 0.02), ng = ctx.createGain(); env(ng, t, 0.14, 0.02, 0.001); n.connect(ng); ng.connect(comp);
    pump(t);
  };
  const clap = (t: number) => {
    for (let k = 0; k < 3; k++) {
      const n = noise(t + k * 0.012, 0.15), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.9;
      env(g, t + k * 0.012, k === 2 ? 0.3 : 0.15, k === 2 ? 0.17 : 0.03, 0.001);
      n.connect(f); f.connect(g); g.connect(comp); g.connect(send);
    }
  };
  const hat = (t: number, v = 0.08, d = 0.04, pan = 0.2) => {
    const n = noise(t, d), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 8000; env(g, t, v, d, 0.001); n.connect(f); f.connect(g); g.connect(panned(pan, comp));
  };
  const bass = (t: number, f0: number, dur: number) => {
    const o = osc('sawtooth', f0, t, dur), s = osc('sine', f0 / 2, t, dur), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
    lpf.type = 'lowpass'; lpf.Q.value = 6; lpf.frequency.setValueAtTime(1400, t); lpf.frequency.exponentialRampToValueAtTime(160, t + dur);
    env(g, t, 0.3, dur, 0.004); o.connect(lpf); lpf.connect(g); s.connect(g); g.connect(comp);
  };
  const pluck = (t: number, f0: number, pan: number, v = 0.1) => {
    const o = osc('sawtooth', f0, t, 0.25), o2 = osc('square', f0 * 1.005, t, 0.25), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
    lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(4200, t); lpf.frequency.exponentialRampToValueAtTime(650, t + 0.16);
    env(g, t, v, 0.2, 0.002);
    o.connect(lpf); o2.connect(lpf); lpf.connect(g); const p = panned(pan, duck); g.connect(p); g.connect(send);
  };
  const pad = (t: number, tones: number[], dur: number, v = 0.045) => {
    tones.forEach((f, i) => {
      [-7, 7].forEach(det => {
        const o = osc('sawtooth', f, t, dur), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
        o.detune.value = det + i * 2;
        lpf.type = 'lowpass'; lpf.frequency.value = 1200;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(lpf); lpf.connect(g); g.connect(panned(det < 0 ? -0.4 : 0.4, duck));
      });
    });
  };
  const riser = (t0: number, t1: number) => {
    const n = noise(t0, t1 - t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(10000, t1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.28, t1);
    n.connect(f); f.connect(g); g.connect(comp);
    const o = osc('sawtooth', 110, t0, t1 - t0), og = ctx.createGain(), lpf = ctx.createBiquadFilter();
    o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(990, t1);
    og.gain.setValueAtTime(0.0001, t0); og.gain.linearRampToValueAtTime(0.05, t1);
    lpf.type = 'lowpass'; lpf.frequency.value = 2200; o.connect(lpf); lpf.connect(og); og.connect(comp);
  };

  // Music bed: pads throughout, drums from beat 8, arps from 20, a breakdown in the outro
  for (let bar = 0; bar < TOTAL_BEATS / 4; bar++) {
    const ch = CHORDS[bar % 4];
    pad(T(bar * 4), ch.tones, T(4) * 1.1, bar < 2 ? 0.06 : 0.04);
  }
  for (let b = 0; b < TOTAL_BEATS - 4; b++) {
    const ch = CHORDS[Math.floor(b / 4) % 4];
    const mute = inRiser(b);
    const drums = b >= 8 && !(b >= 92 && b < 96);
    if (drums && !mute) kick(T(b));
    if (drums && !mute) {
      hat(T(b + 0.5), 0.08, 0.04, 0.25);
      if (b >= 36) { hat(T(b + 0.25), 0.035, 0.025, -0.3); hat(T(b + 0.75), 0.045, 0.025, 0.3); }
    }
    if (b >= 20 && drums && !mute && b % 2 === 1) clap(T(b));
    if (b >= 8 && !mute) {
      const r = ch.root, pos = b % 4;
      if (pos === 0) bass(T(b), r, T(0.8));
      if (pos === 1) bass(T(b + 0.5), r, T(0.4));
      if (pos === 2) { bass(T(b), r, T(0.4)); bass(T(b + 0.5), r * 2, T(0.4)); }
      if (pos === 3) bass(T(b + 0.5), r * 1.5, T(0.4));
    }
    if (b >= 20 && !mute) {
      const arp = [ch.tones[0], ch.tones[1], ch.tones[2], ch.tones[1] * 2, ch.tones[2] * 2, ch.tones[1] * 2, ch.tones[2], ch.tones[1]];
      const up = b >= 64 && b % 8 >= 4 ? 2 : 1;
      for (let s = 0; s < 4; s++) pluck(T(b + s * 0.25), arp[((b % 2) * 4 + s) % arp.length] * up, s % 2 ? 0.45 : -0.45, b >= 64 ? 0.1 : 0.085);
    }
  }
  kick(T(TOTAL_BEATS - 4), 1);
  risers.forEach(([a, z]) => riser(T(a), T(z)));

  const sfx: Record<SfxKind, (t: number) => void> = {
    hit: t => { kick(t, 1); const n = noise(t, 0.2), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000; env(g, t, 0.18, 0.2, 0.001); n.connect(f); f.connect(g); g.connect(comp); },
    tick: t => { const o = osc('sine', 2200, t, 0.04), g = ctx.createGain(); env(g, t, 0.12, 0.035, 0.001); o.connect(g); g.connect(comp); },
    pop: t => { const o = osc('sine', 400, t, 0.16), g = ctx.createGain(); o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(1040, t + 0.07); env(g, t, 0.26, 0.13, 0.002); o.connect(g); g.connect(comp); g.connect(send); },
    whoosh: t => { const n = noise(t, 0.55), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(6000, t + 0.45); env(g, t, 0.2, 0.55, 0.16); n.connect(f); f.connect(g); g.connect(panned(0, comp)); },
    chime: t => { [1319, 1976, 2637].forEach((f, i) => { const o = osc('sine', f, t, 1.1), g = ctx.createGain(); env(g, t + i * 0.045, 0.08 / (i + 1), 0.9, 0.004); o.connect(g); g.connect(comp); g.connect(send); }); },
    flap: t => { const n = noise(t, 0.03), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 2600 + (t * 997 % 1) * 1400; f.Q.value = 4; env(g, t, 0.16, 0.03, 0.001); n.connect(f); f.connect(g); g.connect(panned(((t * 13) % 1) - 0.5, comp)); },
    stamp: t => { const o = osc('sine', 120, t, 0.3), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(55, t + 0.15); env(g, t, 0.6, 0.25, 0.001); o.connect(g); g.connect(comp); const n = noise(t, 0.08), ng = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; env(ng, t, 0.3, 0.08, 0.001); n.connect(f); f.connect(ng); ng.connect(comp); },
    shutter: t => { [0, 0.045].forEach((d, i) => { const n = noise(t + d, 0.025), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 2500; env(g, t + d, i ? 0.1 : 0.16, 0.025, 0.001); n.connect(f); f.connect(g); g.connect(panned(i ? 0.3 : -0.3, comp)); }); },
    page: t => { const n = noise(t, 0.35), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.3); env(g, t, 0.14, 0.35, 0.05); n.connect(f); f.connect(g); g.connect(comp); },
    boom: t => { const o = osc('sine', 90, t, 1), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(36, t + 0.5); env(g, t, 0.45, 0.9, 0.002); o.connect(g); g.connect(comp); const n = noise(t, 0.5), f = ctx.createBiquadFilter(), ng = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.5); env(ng, t, 0.18, 0.5, 0.002); n.connect(f); f.connect(ng); ng.connect(comp); },
    blip: t => { const o = osc('square', 880, t, 0.08), g = ctx.createGain(); env(g, t, 0.06, 0.06, 0.001); o.connect(g); g.connect(send); g.connect(comp); },
  };
  SFX.forEach(([b, k]) => sfx[k](T(b)));

  // Pause the offline render at checkpoints to learn how far it has got
  const STEPS = 20;
  for (let k = 1; k < STEPS; k++) {
    const at = (Math.round((DURATION * k / STEPS) * sr / 128) * 128) / sr; // render-quantum boundary
    ctx.suspend(at).then(() => { report(k / STEPS * 0.97); ctx.resume(); }).catch(() => {});
  }
  const buf = await ctx.startRendering();
  let peak = 0;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  return buf;
}
