import React, { useEffect, useRef } from 'react';
import { Traveler, poseTraveler, drawTraveler, TRAVELER_DARK, TravelerPalette, STRIDE_PER_RAD } from '../splash/travelerRig';
import type { WeatherEffectType } from '../WeatherEffectLayer';

// Terminal concourse (v1.3) under the departures board: a flat four-colour scene.
// A trussed ceiling with downlights, pillars, a hanging gate sign and a row of seats frame
// a wall of glass; behind it planes roll, rotate and climb away while others glide in to
// land, and travelers cross the polished floor pulling their carry-ons. Rain dims the sky,
// splashes on the apron and runs down the glass; snow settles into a bank that stops growing.
// The sky follows the app's day/night mode and the live weather, blending
// between states instead of cutting. Every plane leaves the frame before it
// is reused. One canvas, paused while the tab is hidden, still under reduced motion.

const INK = '#0B0B0C';
const NAVY = '#1C2A4A';
const NAVY_DEEP = '#131D35';
const RED = '#E5412D';
const MUSTARD = '#F2B33D';
const CREAM = '#F3EBDD';

// Travelers wear the same four colours
const PALETTES: TravelerPalette[] = [
  TRAVELER_DARK,
  { ...TRAVELER_DARK, top: MUSTARD, topShade: '#D69A2A', bottom: NAVY, bottomFar: NAVY_DEEP, shoe: NAVY, bag: CREAM, bagShade: '#D8CDBB', hair: '#3A2418' },
  { ...TRAVELER_DARK, top: RED, topShade: '#C23522', bottom: CREAM, bottomFar: '#D8CDBB', shoe: CREAM, bag: MUSTARD, bagShade: '#D69A2A' },
  { ...TRAVELER_DARK, top: CREAM, topShade: '#D8CDBB', bottom: RED, bottomFar: '#C23522', shoe: INK, bag: NAVY, bagShade: NAVY_DEEP, hair: '#5A3A22' },
];

// ── Colour: every scene colour is blended from four skies (day/night × clear/overcast) ──
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, alpha = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

interface Sky { top: RGB; bottom: RGB; runway: RGB; floor: RGB; cloud: RGB }
const SKY_DAY: Sky = { top: hex('#8FBEDF'), bottom: hex('#E7EFF1'), runway: hex('#59606B'), floor: hex('#DCD2C0'), cloud: hex('#FFFFFF') };
const SKY_DAY_GREY: Sky = { top: hex('#9EA7B0'), bottom: hex('#D2D6D8'), runway: hex('#50565E'), floor: hex('#D2CABC'), cloud: hex('#E6E8EA') };
const SKY_NIGHT: Sky = { top: hex(NAVY_DEEP), bottom: hex(NAVY), runway: hex('#0E1526'), floor: hex(INK), cloud: hex('#2E3A5A') };
const SKY_NIGHT_GREY: Sky = { top: hex('#171C27'), bottom: hex('#262C3A'), runway: hex('#10141D'), floor: hex(INK), cloud: hex('#3A4252') };
const blendSky = (night: number, grey: number) => {
  const day = (k: keyof Sky) => mix(SKY_DAY[k], SKY_DAY_GREY[k], grey);
  const nite = (k: keyof Sky) => mix(SKY_NIGHT[k], SKY_NIGHT_GREY[k], grey);
  const pick = (k: keyof Sky) => mix(day(k), nite(k), night);
  return { top: pick('top'), bottom: pick('bottom'), runway: pick('runway'), floor: pick('floor'), cloud: pick('cloud') };
};

// How much each weather greys the sky, fills it with cloud, and brings rain, snow or fog
const WEATHER: Record<WeatherEffectType, { grey: number; cloud: number; clouds: number; rain: number; snow: number; fog: number; storm: number }> = {
  clear:  { grey: 0,    cloud: 0,    clouds: 0, rain: 0, snow: 0, fog: 0,   storm: 0 },
  fair:   { grey: 0.15, cloud: 0.8,  clouds: 3, rain: 0, snow: 0, fog: 0,   storm: 0 },
  clouds: { grey: 0.7,  cloud: 1,    clouds: 7, rain: 0, snow: 0, fog: 0,   storm: 0 },
  fog:    { grey: 0.6,  cloud: 0.5,  clouds: 4, rain: 0, snow: 0, fog: 1,   storm: 0 },
  rain:   { grey: 0.8,  cloud: 1,    clouds: 7, rain: 1, snow: 0, fog: 0.2, storm: 0 },
  snow:   { grey: 0.6,  cloud: 0.9,  clouds: 6, rain: 0, snow: 1, fog: 0.2, storm: 0 },
  storm:  { grey: 1,    cloud: 1,    clouds: 7, rain: 1, snow: 0, fog: 0.1, storm: 1 },
};

interface Walker {
  rig: Traveler;
  x: number;          // px
  dir: 1 | -1;
  depth: number;      // 0 far .. 1 near
  palette: TravelerPalette;
  tempo: number;
}

interface Plane {
  t: number;          // path time; runs until the plane has left the frame
  speed: number;      // path per second
  kind: 'takeoff' | 'landing';
  delay: number;      // seconds before it starts
  scale: number;
}

// Flat airliner, nose to the right, ~130 units long (-66..62), origin at the centre
const PLANE_HALF = 70;
function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number, blink = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  // far wing
  ctx.fillStyle = '#C9BFAE';
  ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(-18, -26); ctx.lineTo(-8, -26); ctx.lineTo(18, -2); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(-58, -5); ctx.lineTo(44, -6);
  ctx.quadraticCurveTo(62, -5, 62, 0); ctx.quadraticCurveTo(62, 5, 44, 6);
  ctx.lineTo(-54, 6); ctx.quadraticCurveTo(-60, 4, -58, -5); ctx.closePath(); ctx.fill();
  // tail
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.moveTo(-58, -5); ctx.lineTo(-66, -26); ctx.lineTo(-56, -26); ctx.lineTo(-40, -5); ctx.closePath(); ctx.fill();
  // cheatline and windows
  ctx.fillStyle = RED; ctx.fillRect(-50, 1.5, 96, 1.6);
  ctx.fillStyle = NAVY;
  for (let i = -40; i < 40; i += 7) ctx.fillRect(i, -2.6, 3, 2.2);
  ctx.fillRect(48, -3, 6, 2.4);
  // near wing and engine
  ctx.fillStyle = '#E2D8C6';
  ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(-20, 28); ctx.lineTo(-8, 28); ctx.lineTo(22, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = MUSTARD;
  ctx.beginPath(); ctx.ellipse(0, 12, 8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  // Navigation lights: a steady white tail light and a red beacon that blinks
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(-66, -25, 1.8, 0, Math.PI * 2); ctx.fill();
  if (blink) {
    ctx.fillStyle = 'rgba(229,65,45,0.35)';
    ctx.beginPath(); ctx.arc(-2, -7, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(-2, -7, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Flat cloud: a rounded base with three puffs, ~100 units wide
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.roundRect(x - 50 * s, y - 8 * s, 100 * s, 16 * s, 8 * s);
  ctx.arc(x - 22 * s, y - 8 * s, 15 * s, 0, Math.PI * 2);
  ctx.arc(x + 4 * s, y - 14 * s, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 28 * s, y - 6 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
}

// A row of linked terminal seats, ~26 units per seat, origin at the floor under the first seat
function drawSeats(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, n: number, seat: string, frame: string) {
  ctx.fillStyle = frame;
  ctx.fillRect(x - 2 * s, y - 13 * s, n * 26 * s, 2.2 * s);
  for (let i = 0; i <= n; i += Math.max(1, Math.floor(n / 2))) ctx.fillRect(x + i * 26 * s - 3 * s, y - 13 * s, 2 * s, 13 * s);
  ctx.fillStyle = seat;
  for (let i = 0; i < n; i++) {
    const sx = x + i * 26 * s;
    ctx.beginPath(); ctx.roundRect(sx, y - 34 * s, 22 * s, 20 * s, 4 * s); ctx.fill();
    ctx.beginPath(); ctx.roundRect(sx - 1 * s, y - 17 * s, 24 * s, 5 * s, 2.5 * s); ctx.fill();
  }
}

const ease = (t: number) => t * t * (3 - 2 * t);
// Move `v` toward `target` at `rate` per second
const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * Math.min(1, rate * dt);

interface LobbySceneProps {
  isDarkMode?: boolean;
  weatherType?: WeatherEffectType;
  intensity?: number;   // 0..1 precipitation strength
}

export function LobbyScene({ isDarkMode = true, weatherType = 'clear', intensity = 0.5 }: LobbySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read by the frame loop, so a mode or weather change blends in without restarting the scene
  const targetRef = useRef({ isDarkMode, weatherType, intensity });
  targetRef.current = { isDarkMode, weatherType, intensity };
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => { redrawRef.current?.(); }, [isDarkMode, weatherType, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) redrawRef.current?.();
    };
    resize();

    const walkers: Walker[] = Array.from({ length: 5 }, (_, i) => {
      const rig = new Traveler();
      rig.phase = i * 1.7;
      return {
        rig,
        x: (w / 5) * i + Math.random() * 60,
        dir: i % 2 === 0 ? 1 : -1,
        depth: [0.2, 0.9, 0.55, 0.35, 1][i],
        palette: PALETTES[i % PALETTES.length],
        tempo: 0.85 + (i % 3) * 0.12,
      };
    });
    walkers.sort((a, b) => a.depth - b.depth);

    const planes: Plane[] = [
      { t: 0, speed: 0.075, kind: 'takeoff', delay: 0.6, scale: 1 },
      { t: 0, speed: 0.07, kind: 'landing', delay: 5.5, scale: 0.8 },
      { t: 0, speed: 0.08, kind: 'takeoff', delay: 10, scale: 0.62 },
    ];

    // Sky dressing, laid out in unit space and scaled to the glass each frame
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.5, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: (i * 0.37 + 0.1) % 1.2, y: 0.08 + (i % 4) * 0.09, s: 0.7 + (i % 3) * 0.25, v: 0.006 + (i % 3) * 0.004, a: 0 }));
    const drops = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.5, l: 0.6 + Math.random() * 0.6 }));
    const flakes = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), v: 0.05 + Math.random() * 0.06, r: 0.8 + Math.random() * 1.6, p: Math.random() * 6 }));

    // Blended state; starts at the target so the page never opens mid-transition
    const first = targetRef.current;
    const fw = WEATHER[first.weatherType] || WEATHER.clear;
    const cur = { night: first.isDarkMode ? 1 : 0, grey: fw.grey, cloud: fw.cloud, rain: fw.rain * first.intensity, snow: fw.snow * first.intensity, fog: fw.fog, storm: fw.storm };
    clouds.forEach((c, i) => { c.a = i < fw.clouds ? fw.cloud : 0; });
    let flash = 0;
    let nextFlash = 3 + Math.random() * 5;
    const splashes: { x: number; y: number; t: number }[] = [];
    // Drops on the glass hold still, then run down leaving a short trail
    const beads = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 1.8, hold: Math.random() * 4, v: 0 }));
    // Snow bank depth (0..1 of its cap); starts settled if it is already snowing
    let bank = fw.snow > 0 ? 1 : 0;

    let raf = 0;
    let last = performance.now();
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      const target = targetRef.current;
      const wx = WEATHER[target.weatherType] || WEATHER.clear;
      const k = reduced ? 1e3 : 1.4;
      cur.night = approach(cur.night, target.isDarkMode ? 1 : 0, k, reduced ? 1 : dt);
      cur.grey = approach(cur.grey, wx.grey, k, reduced ? 1 : dt);
      cur.cloud = approach(cur.cloud, wx.cloud, k, reduced ? 1 : dt);
      cur.rain = approach(cur.rain, wx.rain * (0.35 + 0.65 * target.intensity), k, reduced ? 1 : dt);
      cur.snow = approach(cur.snow, wx.snow * (0.35 + 0.65 * target.intensity), k, reduced ? 1 : dt);
      cur.fog = approach(cur.fog, wx.fog, k, reduced ? 1 : dt);
      cur.storm = approach(cur.storm, wx.storm, k, reduced ? 1 : dt);

      const floorY = h * 0.78;          // where the glass meets the floor
      const ceilH = Math.max(18, h * 0.1); // trussed ceiling above the glass
      const wet = Math.min(1, cur.rain * 2.2);
      const runwayY = floorY - h * 0.1; // runway seen through the glass
      const sky = blendSky(cur.night, cur.grey);
      const clearSky = 1 - cur.grey;

      ctx.clearRect(0, 0, w, h);

      // Sky through the glass
      const grad = ctx.createLinearGradient(0, 0, 0, floorY);
      grad.addColorStop(0, css(sky.top));
      grad.addColorStop(1, css(sky.bottom));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, floorY);

      // Stars and moon at night, the sun by day; both fade behind cloud
      const starA = cur.night * clearSky;
      if (starA > 0.01) {
        ctx.fillStyle = CREAM;
        stars.forEach(s => {
          ctx.globalAlpha = starA * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.3 + s.p)));
          ctx.beginPath(); ctx.arc(s.x * w, s.y * floorY, s.r, 0, Math.PI * 2); ctx.fill();
        });
      }
      const bodyX = w * 0.82, bodyY = ceilH + (floorY - ceilH) * 0.2, bodyR = Math.max(10, Math.min(26, h * 0.06));
      // No sun through rain or snow
      const sunA = (1 - cur.night) * (1 - cur.grey * 0.85) * (1 - wet) * (1 - Math.min(1, cur.snow * 2));
      if (sunA > 0.01) {
        ctx.globalAlpha = sunA * 0.25;
        ctx.fillStyle = MUSTARD;
        ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = sunA;
        ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR, 0, Math.PI * 2); ctx.fill();
      }
      const moonA = cur.night * (1 - cur.grey * 0.9);
      if (moonA > 0.01) {
        ctx.globalAlpha = moonA;
        ctx.fillStyle = CREAM;
        ctx.beginPath(); ctx.arc(bodyX, bodyY, bodyR * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = css(sky.top);
        ctx.beginPath(); ctx.arc(bodyX + bodyR * 0.38, bodyY - bodyR * 0.2, bodyR * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Clouds drift left; each fades in or out as the weather asks for more or fewer
      ctx.fillStyle = css(sky.cloud);
      clouds.forEach((c, i) => {
        c.a = approach(c.a, i < wx.clouds ? wx.cloud : 0, reduced ? 1e3 : 0.8, reduced ? 1 : dt);
        if (!reduced) c.x -= c.v * dt;
        if (c.x < -0.2) c.x = 1.2;
        if (c.a < 0.01) return;
        ctx.globalAlpha = c.a * (0.55 + 0.35 * cur.grey);
        drawCloud(ctx, c.x * w, c.y * floorY, c.s * Math.max(0.6, h / 300));
      });
      ctx.globalAlpha = 1;
      if (wet > 0.01) {
        ctx.fillStyle = css(hex('#1C2330'), 0.24 * wet);
        ctx.fillRect(0, 0, w, floorY);
      }

      // Horizon: dusk glow at night, a pale haze by day, then the runway with its lights
      ctx.fillStyle = css(mix(hex('#FFFFFF'), hex(MUSTARD), cur.night), (0.28 - cur.night * 0.1) * clearSky);
      ctx.fillRect(0, runwayY - h * 0.08, w, h * 0.08);
      ctx.fillStyle = css(mix(sky.runway, hex('#E8ECEF'), cur.snow * 0.45));
      ctx.fillRect(0, runwayY, w, floorY - runwayY);
      ctx.fillStyle = css(mix(hex(CREAM), hex(MUSTARD), cur.night), 0.55 + cur.night * 0.45);
      for (let x = ((time * 40) % 26) - 26; x < w; x += 26) ctx.fillRect(x, runwayY + 3, 8, 1.6);

      // Planes: each path runs until the whole airframe is out of frame
      planes.forEach(p => {
        if (p.delay > 0) { p.delay -= dt; return; }
        p.t += dt * p.speed;
        const s = p.scale * Math.max(0.5, h / 260);
        const blink = (time * 1.4 + (p.kind === 'landing' ? 0.5 : 0)) % 1 < 0.12;
        let gone = false;
        if (p.kind === 'takeoff') {
          // Roll along the runway, rotate, then climb out; the climb keeps going past the edge
          const roll = Math.min(1, p.t / 0.45);
          const climb = Math.max(0, (p.t - 0.35) / 0.65);
          const size = s * (1 - Math.min(1, climb) * 0.55);
          const x = -PLANE_HALF * s + ease(roll) * w * 0.55 + climb * w * 0.6;
          const y = runwayY - 6 * s - Math.pow(climb, 1.6) * (runwayY - h * 0.08);
          const ang = -Math.min(0.32, climb * 1.4);
          drawPlane(ctx, x, y, size, ang, blink);
          gone = x - PLANE_HALF * size > w || y + PLANE_HALF * size < 0;
        } else {
          // Glide in from the right, flare and touch down, then roll out along the runway and off the left edge
          const glide = Math.min(1, p.t / 0.7);
          const size = s * (0.55 + glide * 0.45);
          const approachV = (w * 0.75) / 0.7;
          const u = Math.max(0, p.t - 0.7);
          const taxiV = approachV * 0.3;
          const rollOut = taxiV * u + ((approachV - taxiV) * (1 - Math.exp(-5 * u))) / 5;
          const x = w + PLANE_HALF * size - Math.min(p.t, 0.7) * approachV - rollOut;
          const y = h * 0.12 + ease(glide) * (runwayY - 6 * s - h * 0.12);
          // Mirrored so the nose points left; nose down on the approach, level at the flare
          const pitch = glide < 0.85 ? 0.1 : Math.max(-0.02, 0.1 * (1 - (glide - 0.85) / 0.15));
          ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); drawPlane(ctx, 0, 0, size, pitch, blink); ctx.restore();
          gone = x + PLANE_HALF * size < 0;
        }
        if (gone) { p.t = 0; p.delay = 4 + Math.random() * 5; p.scale = 0.55 + Math.random() * 0.5; }
      });

      // Weather outside the glass: fog bands, rain, snow and the odd lightning flash
      if (cur.fog > 0.01) {
        const fog = ctx.createLinearGradient(0, runwayY - h * 0.35, 0, floorY);
        const fogC = mix(hex('#E9ECEE'), hex('#5A6272'), cur.night);
        fog.addColorStop(0, css(fogC, 0));
        fog.addColorStop(0.6, css(fogC, 0.55 * cur.fog));
        fog.addColorStop(1, css(fogC, 0.75 * cur.fog));
        ctx.fillStyle = fog;
        ctx.fillRect(0, runwayY - h * 0.35, w, floorY - runwayY + h * 0.35);
      }
      const rainN = Math.round(drops.length * cur.rain);
      if (rainN > 0) {
        ctx.strokeStyle = css(mix(hex('#4A5568'), hex('#C9D3E4'), cur.night), 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < rainN; i++) {
          const d = drops[i];
          if (!reduced) { d.y += d.v * dt * 1.6; if (d.y > 1) { d.y -= 1.05; d.x = Math.random(); } }
          const x = d.x * (w + 40) - 20, y = d.y * floorY, len = d.l * 14;
          ctx.moveTo(x, y); ctx.lineTo(x - len * 0.25, y + len);
        }
        ctx.stroke();
      }
      // Splashes: small rings on the runway and apron, more in heavier rain
      if (!reduced && cur.rain > 0.02) {
        let spawn = cur.rain * dt * 90;
        while (spawn > 0 && splashes.length < 70) {
          if (spawn < 1 && Math.random() > spawn) break;
          splashes.push({ x: Math.random() * w, y: runwayY + 2 + Math.random() * (floorY - runwayY - 4), t: 0 });
          spawn -= 1;
        }
      }
      if (splashes.length) {
        ctx.lineWidth = 1;
        const sc = css(mix(hex('#DDE4EE'), hex('#9FB0CC'), cur.night), 1);
        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i];
          sp.t += dt * 2.6;
          if (sp.t >= 1) { splashes.splice(i, 1); continue; }
          ctx.globalAlpha = (1 - sp.t) * 0.7 * Math.max(0.3, wet);
          ctx.strokeStyle = sc;
          ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 1.5 + sp.t * 7, 0.5 + sp.t * 2, 0, 0, Math.PI * 2); ctx.stroke();
          if (sp.t < 0.35) { ctx.fillStyle = sc; ctx.fillRect(sp.x - 0.5, sp.y - 4 * (0.35 - sp.t) * 6, 1, 2); }
        }
        ctx.globalAlpha = 1;
      }
      const bankCap = Math.max(6, h * 0.035);
      bank = reduced ? (cur.snow > 0.05 ? 1 : 0) : Math.max(0, Math.min(1, bank + (cur.snow > 0.05 ? cur.snow * dt / 14 : -dt / 10)));
      const bankPx = bank * bankCap;
      const snowN = Math.round(flakes.length * cur.snow);
      if (snowN > 0) {
        ctx.fillStyle = css(mix(hex('#FFFFFF'), hex(CREAM), cur.night), 0.9);
        for (let i = 0; i < snowN; i++) {
          const f = flakes[i];
          if (!reduced) { f.y += f.v * dt; if (f.y * floorY > floorY - bankPx * 0.6) { f.y = -0.02; f.x = Math.random(); } }
          const x = f.x * w + Math.sin(time * 0.8 + f.p) * 8, y = f.y * floorY;
          ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (bankPx > 0.3) {
        // Settled snow on the apron: a soft bank along the foot of the glass
        ctx.fillStyle = css(mix(hex('#FFFFFF'), hex('#C9D2E2'), cur.night), 0.95);
        ctx.beginPath(); ctx.moveTo(0, floorY);
        for (let x = 0; x <= w + 12; x += 12) ctx.lineTo(x, floorY - bankPx * (0.75 + 0.25 * Math.sin(x * 0.021) * Math.cos(x * 0.007)));
        ctx.lineTo(w, floorY); ctx.closePath(); ctx.fill();
      }
      if (!reduced && cur.storm > 0.5) {
        nextFlash -= dt;
        if (nextFlash <= 0) { flash = 1; nextFlash = 5 + Math.random() * 7; }
      }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 * flash})`;
        ctx.fillRect(0, 0, w, floorY);
        flash = approach(flash, 0, 4, dt);
      }

      // Rain on the glass: beads hold, then run down
      if (wet > 0.02) {
        const bc = mix(hex('#EEF3FA'), hex('#AFC0DA'), cur.night);
        beads.forEach((b, i) => {
          if (i > beads.length * wet) return;
          if (!reduced) {
            if (b.hold > 0) b.hold -= dt;
            else { b.v = Math.min(0.5, b.v + dt * 0.8); b.y += b.v * dt; }
            if (b.y > 1) { b.y = Math.random() * 0.3; b.x = Math.random(); b.hold = 1 + Math.random() * 4; b.v = 0; }
          }
          const bx = b.x * w, by = ceilH + b.y * (floorY - ceilH);
          if (b.v > 0.05) {
            ctx.strokeStyle = css(bc, 0.18 * wet); ctx.lineWidth = b.r * 0.9;
            ctx.beginPath(); ctx.moveTo(bx, by - Math.min(30, b.v * 70)); ctx.lineTo(bx, by); ctx.stroke();
          }
          ctx.fillStyle = css(bc, 0.45 * wet);
          ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = css(hex('#FFFFFF'), 0.5 * wet);
          ctx.beginPath(); ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2); ctx.fill();
        });
      }

      // Glass wall: mullions and a soft reflection band
      ctx.fillStyle = INK;
      const pane = Math.max(120, w / 7);
      for (let x = 0; x <= w + pane; x += pane) ctx.fillRect(x - 3, 0, 6, floorY);
      const transomY = ceilH + (floorY - ceilH) * 0.28;
      ctx.fillRect(0, transomY, w, 4);
      if (bankPx > 0.3) {
        ctx.fillStyle = css(mix(hex('#FFFFFF'), hex('#C9D2E2'), cur.night), 0.9);
        ctx.fillRect(0, transomY - Math.min(3, bankPx * 0.4), w, Math.min(3, bankPx * 0.4));
      }
      ctx.fillStyle = `rgba(255,255,255,${0.05 + (1 - cur.night) * 0.07})`;
      ctx.beginPath(); ctx.moveTo(w * 0.1, 0); ctx.lineTo(w * 0.22, 0); ctx.lineTo(w * 0.02, floorY); ctx.lineTo(-w * 0.1, floorY); ctx.closePath(); ctx.fill();

      // Ceiling: a band that continues the board area above, a zigzag truss and downlights
      const ceilC = mix(hex('#E9E4D8'), hex('#0E131D'), cur.night);
      ctx.fillStyle = css(ceilC);
      ctx.fillRect(0, 0, w, ceilH);
      ctx.strokeStyle = css(mix(hex(INK), hex(CREAM), cur.night), 0.28);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const tTop = ceilH * 0.3, tBot = ceilH * 0.82, bay = Math.max(26, ceilH * 1.2);
      ctx.moveTo(0, tTop); ctx.lineTo(w, tTop); ctx.moveTo(0, tBot); ctx.lineTo(w, tBot);
      for (let x = 0; x < w + bay; x += bay) { ctx.moveTo(x, tBot); ctx.lineTo(x + bay / 2, tTop); ctx.lineTo(x + bay, tBot); }
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(0, ceilH - 3, w, 3);
      const lightGap = Math.max(70, w / 9);
      for (let x = lightGap / 2; x < w; x += lightGap) {
        const glow = ctx.createRadialGradient(x, ceilH, 0, x, ceilH, ceilH * 1.6);
        glow.addColorStop(0, css(hex('#FFE7B0'), 0.16 + cur.night * 0.22));
        glow.addColorStop(1, css(hex('#FFE7B0'), 0));
        ctx.fillStyle = glow;
        ctx.fillRect(x - ceilH * 1.6, ceilH, ceilH * 3.2, ceilH * 1.6);
        ctx.fillStyle = css(mix(hex('#FFF4D6'), hex(MUSTARD), cur.night));
        ctx.beginPath(); ctx.ellipse(x, ceilH - 1, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Pillars in front of the glass
      const pw = Math.max(9, w * 0.016);
      const pillarC = mix(hex(CREAM), hex('#1A2336'), cur.night);
      for (let x = pane * 1.5; x < w; x += pane * 3) {
        ctx.fillStyle = css(pillarC);
        ctx.fillRect(x - pw / 2, ceilH, pw, floorY - ceilH + 4);
        ctx.fillStyle = css(hex(INK), 0.12);
        ctx.fillRect(x + pw / 2 - pw * 0.3, ceilH, pw * 0.3, floorY - ceilH + 4);
      }

      // Hanging gate sign
      const signH = Math.max(16, h * 0.065), signW = Math.min(230, Math.max(120, w * 0.26));
      const signX = Math.max(14, w * 0.08), signY = ceilH + Math.max(8, h * 0.045);
      ctx.strokeStyle = css(hex(INK), 0.6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(signX + signW * 0.2, ceilH); ctx.lineTo(signX + signW * 0.2, signY); ctx.moveTo(signX + signW * 0.8, ceilH); ctx.lineTo(signX + signW * 0.8, signY); ctx.stroke();
      ctx.fillStyle = NAVY;
      ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 2); ctx.fill();
      ctx.fillStyle = MUSTARD;
      ctx.fillRect(signX, signY, signH * 0.9, signH);
      // Plane glyph, drawn (a font glyph may render as an emoji)
      {
        const cx = signX + signH * 0.45, cy = signY + signH * 0.5, u = signH * 0.034;
        ctx.fillStyle = NAVY;
        ctx.beginPath();
        ctx.moveTo(cx + 9 * u, cy); ctx.lineTo(cx - 7 * u, cy - 1.4 * u); ctx.lineTo(cx - 9 * u, cy - 5 * u); ctx.lineTo(cx - 10 * u, cy - 5 * u);
        ctx.lineTo(cx - 9 * u, cy - 1.2 * u); ctx.lineTo(cx - 2 * u, cy - 1.2 * u); ctx.lineTo(cx - 5 * u, cy - 9 * u); ctx.lineTo(cx - 3 * u, cy - 9 * u);
        ctx.lineTo(cx + 3 * u, cy - 1.2 * u); ctx.lineTo(cx + 3 * u, cy + 1.2 * u); ctx.lineTo(cx - 3 * u, cy + 9 * u); ctx.lineTo(cx - 5 * u, cy + 9 * u);
        ctx.lineTo(cx - 2 * u, cy + 1.2 * u); ctx.lineTo(cx - 9 * u, cy + 1.2 * u); ctx.lineTo(cx - 10 * u, cy + 5 * u); ctx.lineTo(cx - 9 * u, cy + 5 * u);
        ctx.lineTo(cx - 7 * u, cy + 1.4 * u); ctx.closePath(); ctx.fill();
      }
      ctx.textBaseline = 'middle';
      ctx.fillStyle = CREAM;
      ctx.font = `700 ${Math.round(signH * 0.46)}px "SF Mono", Consolas, monospace`;
      ctx.fillText('GATES 1–24', signX + signH * 1.25, signY + signH * 0.54);
      ctx.fillStyle = MUSTARD;
      ctx.textAlign = 'right';
      ctx.fillText('→', signX + signW - signH * 0.3, signY + signH * 0.54);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Concourse floor: polished, so the glass and pillars reflect in it
      ctx.fillStyle = css(sky.floor);
      ctx.fillRect(0, floorY, w, h - floorY);
      const refl = ctx.createLinearGradient(0, floorY, 0, floorY + (h - floorY) * 0.7);
      refl.addColorStop(0, css(sky.bottom, 0.28 + wet * 0.1));
      refl.addColorStop(1, css(sky.bottom, 0));
      ctx.fillStyle = refl;
      ctx.fillRect(0, floorY, w, h - floorY);
      ctx.fillStyle = css(hex(INK), 0.06);
      for (let x = 0; x <= w + pane; x += pane) ctx.fillRect(x - 3, floorY, 6, (h - floorY) * 0.45);
      ctx.fillStyle = css(pillarC, 0.35);
      for (let x = pane * 1.5; x < w; x += pane * 3) ctx.fillRect(x - pw / 2, floorY + 4, pw, (h - floorY) * 0.5);
      ctx.fillStyle = css(mix(hex(INK), hex(CREAM), cur.night), 0.12 + (1 - cur.night) * 0.1);
      ctx.fillRect(0, floorY, w, 1.5);

      // Seats along the glass, behind the walking lanes
      const seatS = Math.max(0.45, h / 260) * 0.5;
      const seatY = floorY + 4 + (h - floorY) * 0.06;
      const seatC = css(mix(hex(NAVY), hex('#2A3A60'), cur.night));
      const frameC = css(mix(hex(INK), hex('#5A6680'), cur.night));
      drawSeats(ctx, w * 0.3, seatY, seatS, 4, seatC, frameC);
      if (w > 520) drawSeats(ctx, w * 0.66, seatY, seatS, 5, seatC, frameC);

      // Travelers (far to near), each on its own lane
      const shadow = `rgba(0,0,0,${0.14 + cur.night * 0.2})`;
      walkers.forEach(t => {
        if (!reduced) t.rig.step(dt * 1000, 1, t.tempo);
        const s = (0.26 + t.depth * 0.22) * Math.max(0.55, h / 260);
        // Ground speed matches the stride, so feet never slide
        const speed = STRIDE_PER_RAD * Math.PI * 2 * t.tempo * s;
        if (!reduced) t.x += t.dir * speed * dt;
        const margin = 140 * s;
        if (t.dir === 1 && t.x > w + margin) t.x = -margin;
        if (t.dir === -1 && t.x < -margin) t.x = w + margin;
        const ground = floorY + 6 + t.depth * (h - floorY - 12);
        const palette = { ...t.palette, shadow };
        ctx.save();
        if (t.dir === -1) { ctx.translate(t.x * 2, 0); ctx.scale(-1, 1); }
        drawTraveler(ctx, poseTraveler(t.rig, t.x, ground, s, palette), palette);
        ctx.restore();
      });

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    // Under reduced motion the scene is a still frame, redrawn when the mode, weather or size changes
    redrawRef.current = reduced ? () => frame(performance.now()) : null;

    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    const onVisibility = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      redrawRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full" />;
}
