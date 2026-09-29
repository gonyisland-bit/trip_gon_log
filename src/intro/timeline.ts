// Intro 2.0 timeline: everything is a pure function of time, so the in-app player can seek
// and the exporter can render any frame. 128 BPM, 104 beats (about 48.8 s).

export const BPM = 128;
export const BEAT = 60 / BPM;
export const TOTAL_BEATS = 104;
export const DURATION = TOTAL_BEATS * BEAT;

export type SceneId = 'hook' | 'logo' | 'plan' | 'pick' | 'go' | 'log' | 'relive' | 'outro';

export interface SceneDef {
  id: SceneId;
  label: string;
  start: number; // beats
  end: number;
  dark: boolean; // background
}

export const SCENES: SceneDef[] = [
  { id: 'hook', label: 'Opening', start: 0, end: 8, dark: false },
  { id: 'logo', label: 'Tripgon log', start: 8, end: 20, dark: false },
  { id: 'plan', label: 'Plan', start: 20, end: 36, dark: true },
  { id: 'pick', label: 'Pick', start: 36, end: 48, dark: false },
  { id: 'go', label: 'Go', start: 48, end: 64, dark: true },
  { id: 'log', label: 'Log', start: 64, end: 78, dark: false },
  { id: 'relive', label: 'Relive', start: 78, end: 92, dark: true },
  { id: 'outro', label: 'Start', start: 92, end: 104, dark: false },
];

export function sceneAt(b: number): SceneDef {
  return SCENES.find(s => b >= s.start && b < s.end) || SCENES[SCENES.length - 1];
}

/** Kinetic type lines: [startBeat, endBeat, text, size] where size 'xl' is a headline and 'md' a follow-up */
export const LINES: [number, number, string, 'xl' | 'md'][] = [
  [1.5, 7.5, '여행은 흩어지기 쉽다', 'xl'],
  [14, 19.5, '계획부터 기록까지, 한 곳에', 'md'],
  [21.5, 27.5, '지도에서 콕', 'xl'],
  [28.5, 35.5, '일정은 템플릿이 짜 준다', 'md'],
  [37, 41.5, '어디로 갈지 모르겠다면', 'md'],
  [42, 47.5, '여행지 뽑기', 'xl'],
  [49.5, 56, '여행 중엔 오늘만', 'xl'],
  [57, 63.5, '지금 · 다음 · 남은 시간', 'md'],
  [65.5, 71.5, '사진은 매거진이 되고', 'xl'],
  [72, 77.5, '페이지를 넘기듯 다시 읽는다', 'md'],
  [79.5, 85.5, '날씨와 날짜로 꺼내 보고', 'md'],
  [86, 91.5, '한 편의 릴로 재생', 'xl'],
];

/** Sound effects on the beat grid: [beat, kind] */
export type SfxKind = 'hit' | 'tick' | 'pop' | 'whoosh' | 'chime' | 'flap' | 'stamp' | 'shutter' | 'page' | 'boom' | 'blip';

export const SFX: [number, SfxKind][] = (() => {
  const a: [number, SfxKind][] = [];
  [0, 1, 2, 3, 4, 5].forEach(b => a.push([b, 'pop']));
  a.push([6, 'whoosh'], [7.5, 'tick']);
  for (let i = 0; i < 8; i++) a.push([10 + i * 0.25, 'tick']);
  a.push([12.5, 'chime']);
  a.push([19, 'whoosh']);
  [22, 23, 24, 25, 26].forEach(b => a.push([b, 'pop']));
  [27, 28, 29, 30].forEach(b => a.push([b, 'whoosh']));
  [31, 32, 33, 34].forEach(b => a.push([b, 'blip']));
  for (let i = 0; i < 20; i++) a.push([38 + i * 0.2, 'flap']);
  a.push([43, 'chime'], [44.5, 'stamp']);
  [50, 52, 54, 56, 58, 60].forEach(b => a.push([b, 'blip']));
  a.push([57, 'chime']);
  for (let i = 0; i < 12; i++) a.push([64.5 + i * 0.5, 'shutter']);
  a.push([72, 'page'], [74, 'page'], [76, 'page']);
  for (let i = 0; i < 10; i++) a.push([80 + i * 0.25, 'tick']);
  a.push([86, 'whoosh'], [88, 'pop']);
  [93, 94.5, 96].forEach(b => a.push([b, 'hit']));
  a.push([98, 'chime'], [100, 'pop']);
  SCENES.forEach(s => { if (s.start) a.push([s.start, 'boom']); });
  return a;
})();

// ---------- math ----------
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 progress of x across [a, b] */
export const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const ease = {
  out3: (t: number) => 1 - Math.pow(1 - t, 3),
  out5: (t: number) => 1 - Math.pow(1 - t, 5),
  io3: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  back: (t: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  snap: (t: number) => { const x = clamp(t); return x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2; },
};
/** A decaying pulse right after each beat (0..1), for kick punches */
export const kickPulse = (b: number) => Math.exp(-(b - Math.floor(b)) * 7);
/** Stable pseudo-random from an integer */
export const hash = (i: number) => Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
