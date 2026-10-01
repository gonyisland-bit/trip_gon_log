// Intro 3.0 timeline ("한 줄의 여정"): one red line carries the film. Everything is a pure function
// of time, so the in-app player can seek and the exporter can render any frame.
// 90 BPM lo-fi, 60 beats (40 s), fifteen four-beat bars.

export const BPM = 90;
export const BEAT = 60 / BPM;
export const TOTAL_BEATS = 60;
export const DURATION = TOTAL_BEATS * BEAT;

export type SceneId = 'open' | 'map' | 'gate' | 'city' | 'sea' | 'log' | 'outro';

export interface SceneDef {
  id: SceneId;
  label: string;
  start: number; // beats
  end: number;
}

export const SCENES: SceneDef[] = [
  { id: 'open', label: 'Tripgon log', start: 0, end: 8 },
  { id: 'map', label: 'Plan', start: 8, end: 20 },
  { id: 'gate', label: 'Terminal', start: 20, end: 28 },
  { id: 'city', label: 'City', start: 28, end: 36 },
  { id: 'sea', label: 'Beach', start: 36, end: 44 },
  { id: 'log', label: 'Magazine', start: 44, end: 52 },
  { id: 'outro', label: 'Start', start: 52, end: 60 },
];

export function sceneAt(b: number): SceneDef {
  return SCENES.find(s => b >= s.start && b < s.end) || SCENES[SCENES.length - 1];
}

/** Kinetic captions: [startBeat, endBeat, text, size]; 'xl' is a headline, 'md' a follow-up */
export const LINES: [number, number, string, 'xl' | 'md'][] = [
  [2, 7.2, '계획부터 기록까지, 한 줄로', 'md'],
  [9.5, 15, '지도에서 콕', 'xl'],
  [15, 19.4, '일정은 자동으로 채워져요', 'md'],
  [21.5, 27.4, '공항 터미널에서 출발', 'xl'],
  [29, 35.4, '도시로', 'xl'],
  [37, 43.4, '바다로', 'xl'],
  [45.5, 51.4, '사진은 한 권이 되고', 'xl'],
  [55, 60, '첫 여행을 계획해 보세요', 'md'],
];

/** Soft effects on the beat grid: [beat, kind]. Lo-fi: nothing sharp, every hit has a slow tail. */
export type SfxKind = 'chime' | 'swell' | 'pluck' | 'shutter' | 'page' | 'tape';

export const SFX: [number, SfxKind][] = (() => {
  const a: [number, SfxKind][] = [];
  a.push([0.5, 'tape']);
  SCENES.forEach(s => { if (s.start) a.push([s.start, 'chime']); });
  [11, 11.5, 12, 12.5].forEach(b => a.push([b, 'pluck']));      // pins settle on the map
  a.push([13, 'swell']);                                         // take-off
  [23, 23.5, 24].forEach(b => a.push([b, 'pluck']));            // the board turns to ICN → TYO
  [31, 32].forEach(b => a.push([b, 'pluck']));                  // today's plan cards
  a.push([37, 'swell']);                                         // sunrise
  [45, 45.5, 46, 46.5, 47].forEach(b => a.push([b, 'shutter'])); // photos on the line
  a.push([48.5, 'page'], [49.5, 'page']);
  a.push([52, 'swell']);
  return a;
})();

// ---------- math ----------
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 progress of x across [a, b] */
export const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const ease = {
  out3: (t: number) => 1 - Math.pow(1 - clamp(t), 3),
  io3: (t: number) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  smooth: (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); },
  /** A soft landing with about 4% overshoot, for things that settle into place */
  settle: (t: number) => { const x = clamp(t); return 1 + 1.4 * Math.pow(x - 1, 3) + 0.4 * Math.pow(x - 1, 2); },
};
/** 0 → 1 → 0 across [a, b] with eased edges `e` beats long */
export const span = (x: number, a: number, b: number, e = 1) => ease.smooth(seg(x, a, a + e)) * (1 - ease.smooth(seg(x, b - e, b)));
/** Stable pseudo-random from an integer */
export const hash = (i: number) => Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
