// Generated soundtrack: 120 BPM, A minor (Am - F - C - G), rendered offline so it is identical on every run.
const CHORDS = [
  { root: 55, tones: [220, 261.63, 329.63] },
  { root: 43.65, tones: [174.61, 220, 261.63] },
  { root: 65.41, tones: [261.63, 329.63, 392] },
  { root: 49, tones: [196, 246.94, 293.66] },
];
const RISERS = [[12, 16], [28, 32], [44, 48], [60, 64], [76, 80], [88, 92]];
const inRiser = b => RISERS.some(([a, z]) => b >= a + 2 && b < z);

async function renderAudio() {
  const sr = 48000;
  const len = Math.ceil(sr * (DURATION + 1));
  const ctx = new OfflineAudioContext(2, len, sr);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.14;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, 0);
  master.gain.setValueAtTime(0.85, (TOTAL_BEATS - 2) * BEAT);
  master.gain.linearRampToValueAtTime(0, DURATION);
  comp.connect(master); master.connect(ctx.destination);

  // echo bus
  const echo = ctx.createDelay(1); echo.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const send = ctx.createGain(); send.gain.value = 0.4;
  send.connect(echo); echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(comp);

  const nbuf = ctx.createBuffer(1, sr * 2, sr);
  { const d = nbuf.getChannelData(0); const r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  const noise = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = nbuf; s.start(t, 0, dur + 0.05); s.stop(t + dur + 0.05); return s; };
  const env = (g, t, peak, dur, a = 0.002) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const T = b => b * BEAT;

  const kick = (t, v = 0.9) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    env(g, t, v, 0.4, 0.001); o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.45);
    const n = noise(t, 0.02), ng = ctx.createGain(); env(ng, t, 0.12, 0.02, 0.001); n.connect(ng); ng.connect(comp);
  };
  const clap = t => {
    for (let k = 0; k < 3; k++) {
      const n = noise(t + k * 0.011, 0.14), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.9;
      env(g, t + k * 0.011, k === 2 ? 0.3 : 0.16, k === 2 ? 0.16 : 0.03, 0.001);
      n.connect(f); f.connect(g); g.connect(comp); g.connect(send);
    }
  };
  const hat = (t, v = 0.09, d = 0.045) => {
    const n = noise(t, d), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 7500; env(g, t, v, d, 0.001); n.connect(f); f.connect(g); g.connect(comp);
  };
  const bass = (t, f0, dur) => {
    const o = ctx.createOscillator(), s = ctx.createOscillator(), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; s.type = 'sine'; o.frequency.value = f0; s.frequency.value = f0;
    lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(900, t); lpf.frequency.exponentialRampToValueAtTime(180, t + dur);
    env(g, t, 0.34, dur, 0.005); o.connect(lpf); s.connect(g); lpf.connect(g); g.connect(comp);
    o.start(t); s.start(t); o.stop(t + dur + 0.05); s.stop(t + dur + 0.05);
  };
  const pluck = (t, f0, pan, v = 0.13) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lpf = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f0; o2.frequency.value = f0 * 1.004;
    lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(3400, t); lpf.frequency.exponentialRampToValueAtTime(700, t + 0.16);
    env(g, t, v, 0.2, 0.002); p.pan.value = pan;
    o.connect(lpf); o2.connect(lpf); lpf.connect(g); g.connect(p); p.connect(comp); p.connect(send);
    o.start(t); o2.start(t); o.stop(t + 0.25); o2.stop(t + 0.25);
  };
  const pad = (t, tones, dur, v = 0.05) => {
    tones.forEach((f, i) => {
      [-6, 6].forEach(det => {
        const o = ctx.createOscillator(), lpf = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + i * 2;
        lpf.type = 'lowpass'; lpf.frequency.value = 1100;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(lpf); lpf.connect(g); g.connect(comp); o.start(t); o.stop(t + dur + 0.05);
      });
    });
  };
  const riser = (t0, t1) => {
    const n = noise(t0, t1 - t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(9000, t1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.32, t1);
    n.connect(f); f.connect(g); g.connect(comp);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
    og.gain.setValueAtTime(0.0001, t0); og.gain.linearRampToValueAtTime(0.06, t1);
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 1800;
    o.connect(lpf); lpf.connect(og); og.connect(comp); o.start(t0); o.stop(t1 + 0.05);
  };

  // music bed
  for (let bar = 0; bar < TOTAL_BEATS / 4; bar++) {
    const ch = CHORDS[bar % 4];
    if (bar * 4 < 96) pad(T(bar * 4), ch.tones, T(4) * 1.15, bar * 4 < 8 ? 0.06 : 0.045);
  }
  for (let b = 0; b < 96; b += 1) {
    const ch = CHORDS[Math.floor(b / 4) % 4];
    const mute = inRiser(b);
    if (b >= 8 && !mute) kick(T(b), 0.85);
    if (b >= 8 && !mute) { hat(T(b + 0.5), 0.09); if (b >= 32) { hat(T(b + 0.25), 0.04, 0.03); hat(T(b + 0.75), 0.05, 0.03); } }
    if (b >= 16 && !mute && (b % 4 === 1 || b % 4 === 3)) clap(T(b));
    if (b >= 8 && !mute) {
      const r = ch.root, pos = b % 4;
      if (pos === 0) bass(T(b), r, T(0.9));
      if (pos === 1) bass(T(b + 0.5), r, T(0.4));
      if (pos === 2) { bass(T(b), r, T(0.45)); bass(T(b + 0.5), r * 2, T(0.4)); }
      if (pos === 3) bass(T(b + 0.5), r * 1.5, T(0.45));
    }
    if (b >= 16 && !mute) {
      const arp = [ch.tones[0], ch.tones[1], ch.tones[2], ch.tones[1] * 2, ch.tones[2] * 2, ch.tones[1] * 2, ch.tones[2], ch.tones[1]];
      for (let s = 0; s < 4; s++) pluck(T(b + s * 0.25), arp[((b % 2) * 4 + s) % arp.length] * (b >= 48 && b % 8 >= 4 ? 2 : 1), (s % 2 ? 0.35 : -0.35), b >= 64 ? 0.12 : 0.1);
    }
  }
  RISERS.forEach(([a, z]) => riser(T(a + 2), T(z)));

  // sound effects tied to what is on screen
  const sfx = {
    hit: t => { kick(t, 1); const n = noise(t, 0.2), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000; env(g, t, 0.18, 0.18, 0.001); n.connect(f); f.connect(g); g.connect(comp); },
    tick: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 2100; env(g, t, 0.13, 0.035, 0.001); o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.05); },
    pop: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(980, t + 0.08); env(g, t, 0.28, 0.14, 0.002); o.connect(g); g.connect(comp); g.connect(send); o.start(t); o.stop(t + 0.18); },
    whoosh: t => { const n = noise(t, 0.6), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.5); env(g, t, 0.22, 0.6, 0.18); n.connect(f); f.connect(g); g.connect(comp); },
    chime: t => { [1319, 1976, 2637].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; env(g, t + i * 0.04, 0.09 / (i + 1), 0.9, 0.004); o.connect(g); g.connect(comp); g.connect(send); o.start(t); o.stop(t + 1.1); }); },
    blip: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 880; env(g, t, 0.07, 0.06, 0.001); o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.08); },
    tap: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.08); env(g, t, 0.3, 0.12, 0.001); o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.15); sfx.tick(t); },
    toggle: t => { sfx.tick(t); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1500; env(g, t + 0.06, 0.12, 0.04, 0.001); o.connect(g); g.connect(comp); o.start(t + 0.06); o.stop(t + 0.12); },
    swipe: t => { const n = noise(t, 0.25), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(7000, t + 0.22); env(g, t, 0.14, 0.24, 0.05); n.connect(f); f.connect(g); g.connect(comp); },
    boom: t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5); env(g, t, 0.5, 0.9, 0.002); o.connect(g); g.connect(comp); o.start(t); o.stop(t + 1); const n = noise(t, 0.5), f = ctx.createBiquadFilter(), ng = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.5); env(ng, t, 0.2, 0.5, 0.002); n.connect(f); f.connect(ng); ng.connect(comp); },
  };
  SFX.forEach(([b, k]) => sfx[k](T(b)));

  const buf = await ctx.startRendering();
  // normalise to -1 dBFS peak
  let peak = 0;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  return buf;
}
