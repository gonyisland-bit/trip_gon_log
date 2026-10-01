// Generated soundtrack for Intro 3.0: 90 BPM lo-fi in C major (Fmaj7 – Em7 – Dm7 – Cmaj7), rendered
// offline so the player and the exporter hear the same mix. Warm electric-piano chords with a slow tape
// wobble, a round bass, soft swung drums with brushed snares, vinyl crackle, and quiet effects tied to
// what is on screen. Nothing is sharp: every hit has a soft attack and a slow tail.
import { BEAT, DURATION, SFX, TOTAL_BEATS, type SfxKind } from './timeline';

const CHORDS = [
  { root: 87.31, tones: [174.61, 220, 261.63, 329.63] },   // Fmaj7
  { root: 82.41, tones: [164.81, 196, 246.94, 293.66] },   // Em7
  { root: 73.42, tones: [146.83, 174.61, 220, 261.63] },   // Dm7
  { root: 65.41, tones: [130.81, 164.81, 196, 246.94] },   // Cmaj7
];
// A few notes of melody on a soft bell, C major pentatonic
const MELODY: [number, number][] = [
  [20, 659.25], [21.5, 587.33], [22, 523.25], [24, 440], [26, 523.25],
  [28, 659.25], [29, 783.99], [30.5, 659.25], [32, 587.33], [34, 523.25],
  [36, 783.99], [37.5, 880], [38, 783.99], [40, 659.25], [42, 587.33],
  [44, 523.25], [45.5, 587.33], [46, 659.25], [48, 523.25], [50, 440],
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
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * (DURATION + 2)), sr);
  const T = (b: number) => b * BEAT;
  // Swing: the off-beat eighth lands a little late
  const S = (b: number) => (b % 1 >= 0.5 ? b + 0.06 : b);

  // Warm master: a gentle low-pass and soft compression, fading out over the last bar
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 7000; warm.Q.value = 0.5;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.6);
  master.gain.setValueAtTime(0.9, T(TOTAL_BEATS - 4));
  master.gain.linearRampToValueAtTime(0.0001, DURATION + 1.5);
  comp.connect(warm); warm.connect(master); master.connect(ctx.destination);

  // Room: a soft stereo echo
  const send = ctx.createGain(); send.gain.value = 0.28;
  const dl = ctx.createDelay(2), dr = ctx.createDelay(2);
  dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 1.5;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 2200;
  const merger = ctx.createChannelMerger(2);
  send.connect(dl); dl.connect(elp); elp.connect(dr); dr.connect(fb); fb.connect(dl);
  elp.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(comp);

  // Tape wobble: one slow LFO bends every key a few cents
  const wob = ctx.createOscillator(); wob.frequency.value = 0.55;
  const wobDepth = ctx.createGain(); wobDepth.gain.value = 9;
  wob.connect(wobDepth); wob.start(0); wob.stop(DURATION + 2);

  const nbuf = ctx.createBuffer(1, sr * 2, sr);
  { const d = nbuf.getChannelData(0); const r = rng(11); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  const noise = (t: number, dur: number) => { const s = ctx.createBufferSource(); s.buffer = nbuf; s.loop = true; s.start(t); s.stop(t + dur + 0.05); return s; };
  const env = (g: GainNode, t: number, peak: number, dur: number, a = 0.005) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const osc = (type: OscillatorType, f: number, t: number, dur: number) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); return o;
  };
  const panned = (pan: number, dest: AudioNode) => { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p; };

  // Electric piano: sine with a little bell on top, slow release, wobbling with the tape
  const key = (t: number, f: number, v: number, dur: number, pan: number) => {
    const o = osc('sine', f, t, dur), o2 = osc('triangle', f * 2, t, dur * 0.4), g = ctx.createGain(), g2 = ctx.createGain();
    wobDepth.connect(o.detune); wobDepth.connect(o2.detune);
    env(g, t, v, dur, 0.012); env(g2, t, v * 0.18, dur * 0.4, 0.006);
    o.connect(g); o2.connect(g2);
    const p = panned(pan, comp); g.connect(p); g2.connect(p); g.connect(send);
  };
  const chord = (t: number, tones: number[], v: number, dur: number) => {
    tones.forEach((f, i) => key(t + i * 0.018, f, v * (i === 0 ? 0.9 : 0.7), dur, (i - 1.5) * 0.25));
  };
  const bass = (t: number, f: number, dur: number) => {
    const o = osc('sine', f, t, dur), o2 = osc('triangle', f, t, dur), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
    lpf.type = 'lowpass'; lpf.frequency.value = 420;
    env(g, t, 0.34, dur, 0.02); o.connect(g); o2.connect(lpf); lpf.connect(g); g.connect(comp);
  };
  const kick = (t: number, v = 0.7) => {
    const o = osc('sine', 110, t, 0.5), g = ctx.createGain(), lpf = ctx.createBiquadFilter();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    lpf.type = 'lowpass'; lpf.frequency.value = 900;
    env(g, t, v, 0.45, 0.004); o.connect(lpf); lpf.connect(g); g.connect(comp);
  };
  // Brushed snare: filtered noise with a soft swell and a long tail
  const brush = (t: number, v = 0.16) => {
    const n = noise(t, 0.4), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6;
    env(g, t, v, 0.36, 0.012); n.connect(f); f.connect(g); g.connect(panned(-0.1, comp)); g.connect(send);
    const o = osc('triangle', 190, t, 0.12), og = ctx.createGain(); env(og, t, v * 0.5, 0.1, 0.004); o.connect(og); og.connect(comp);
  };
  const hat = (t: number, v: number, pan: number) => {
    const n = noise(t, 0.06), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 7000; env(g, t, v, 0.05, 0.003); n.connect(f); f.connect(g); g.connect(panned(pan, comp));
  };
  const bell = (t: number, f: number, v = 0.07) => {
    const o = osc('sine', f, t, 1.6), o2 = osc('sine', f * 3.01, t, 0.6), g = ctx.createGain(), g2 = ctx.createGain();
    env(g, t, v, 1.5, 0.008); env(g2, t, v * 0.25, 0.5, 0.004);
    wobDepth.connect(o.detune);
    o.connect(g); o2.connect(g2); const p = panned(0.25, comp); g.connect(p); g2.connect(p); g.connect(send); g2.connect(send);
  };

  // Vinyl: low hiss and sparse crackle the whole way
  {
    const hiss = noise(0, DURATION + 1.5), hf = ctx.createBiquadFilter(), hg = ctx.createGain();
    hf.type = 'bandpass'; hf.frequency.value = 3500; hf.Q.value = 0.4; hg.gain.value = 0.012;
    hiss.connect(hf); hf.connect(hg); hg.connect(comp);
    const r = rng(5);
    for (let t = 0.2; t < DURATION + 1; t += 0.05 + r() * 0.35) {
      const n = noise(t, 0.004), g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 2500;
      env(g, t, 0.02 + r() * 0.05, 0.004, 0.0005); n.connect(f); f.connect(g); g.connect(panned(r() * 1.4 - 0.7, comp));
    }
  }

  // Bed: chords every bar (a ghost stab on the "and" of three), bass from bar 2, drums from bar 3,
  // a breath at bar 14, the last chord rings out
  const bars = TOTAL_BEATS / 4;
  for (let bar = 0; bar < bars; bar++) {
    const ch = CHORDS[bar % 4], b0 = bar * 4;
    chord(T(b0), ch.tones, bar < 2 ? 0.07 : 0.06, T(3.6));
    if (bar >= 2 && bar < bars - 1) chord(T(b0 + 2.5), ch.tones.slice(1), 0.035, T(1.4));
    if (bar >= 2) { bass(T(b0), ch.root, T(2.2)); if (bar < bars - 1) bass(T(b0 + 2.5), ch.root * 1.5, T(1.2)); }
    const drums = bar >= 2 && bar !== 13 && bar < bars - 1;
    if (drums) {
      kick(T(b0)); kick(T(b0 + 2.5), 0.55);
      brush(T(b0 + 1)); brush(T(b0 + 3));
      for (let e = 0; e < 8; e++) hat(T(S(b0 + e * 0.5)), e % 2 ? 0.03 : 0.045, e % 2 ? 0.3 : -0.2);
    }
  }
  chord(T(TOTAL_BEATS - 4), CHORDS[0].tones, 0.07, T(6));
  bass(T(TOTAL_BEATS - 4), CHORDS[0].root, T(4));
  MELODY.forEach(([b, f]) => bell(T(b), f));

  const sfx: Record<SfxKind, (t: number) => void> = {
    // A soft bell triad as each scene opens
    chime: t => { [1046.5, 1318.5, 1568].forEach((f, i) => bell(t + i * 0.05, f, 0.035 / (i + 1))); },
    // Filtered air rising over a beat, for take-off, sunrise and the close
    swell: t => {
      const n = noise(t, T(2)), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3200, t + T(1.6));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + T(1.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + T(2));
      n.connect(f); f.connect(g); g.connect(comp); g.connect(send);
    },
    pluck: t => { const o = osc('sine', 1567.98, t, 0.4), g = ctx.createGain(); env(g, t, 0.045, 0.35, 0.004); o.connect(g); g.connect(panned(0.3, comp)); g.connect(send); },
    shutter: t => { [0, 0.05].forEach((d, i) => { const n = noise(t + d, 0.03), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 1; env(g, t + d, i ? 0.04 : 0.06, 0.03, 0.002); n.connect(f); f.connect(g); g.connect(panned(i ? 0.3 : -0.3, comp)); }); },
    page: t => { const n = noise(t, 0.4), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.35); env(g, t, 0.06, 0.4, 0.06); n.connect(f); f.connect(g); g.connect(comp); },
    // A tape machine coming up to speed under the first chord
    tape: t => { const o = osc('sine', 60, t, 0.8), g = ctx.createGain(); o.frequency.setValueAtTime(30, t); o.frequency.exponentialRampToValueAtTime(65, t + 0.6); env(g, t, 0.08, 0.8, 0.1); o.connect(g); g.connect(comp); },
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
  const gain = peak > 0 ? 0.85 / peak : 1;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  return buf;
}
