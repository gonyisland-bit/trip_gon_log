// The bear kit (v1.3.9): the teal bear of the illustrations as vector art, so it can be any size, take its colours from
// the theme and move. The bear is traced from the drawings (scripts/art/bear_trace.py → shapes.ts): each pose is one
// continuous silhouette, the head running into the body with no neck, with no lines drawn inside the body, and one face
// (the standing bear's) set on every pose. Everything returns SVG markup as a string, so the same drawing serves React
// (Bear.tsx) and the Leaflet markers of the journey map (a divIcon takes HTML).
//
// Motion is CSS only, named tgb-*, and moves the whole silhouette the way the drawings would: a waddle when walking, a
// sway when waving, a breath when standing. Every animation stops under prefers-reduced-motion; a drawing made with
// `moving: false` is the same picture standing still.
import { BEAR_SHAPES, FACE, FACE_ORIGIN, type BearShape, type TracedPath } from './shapes';

export const BEAR = {
  fur: '#3F8A80',
  furShade: '#33746B',
  ink: '#1E2624',
  red: '#EE5A2F',
  yellow: '#F6C343',
  blue: '#3B62C8',
  sky: '#8CC7EE',
  white: '#FFFFFF',
  steel: '#B9C0C6',
  tyre: '#2A2D30',
  shadow: 'rgba(0,0,0,0.22)',
} as const;

const STYLE = `<style>
@keyframes tgbWaddle{0%,100%{transform:rotate(-3.2deg) translateY(0)}25%{transform:rotate(0deg) translateY(-1.5%)}50%{transform:rotate(3.2deg) translateY(0)}75%{transform:rotate(0deg) translateY(-1.5%)}}
@keyframes tgbSway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes tgbBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,.985)}}
@keyframes tgbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.3px)}}
@keyframes tgbSpin{to{transform:rotate(360deg)}}
@keyframes tgbWave{0%{transform:translateX(0)}100%{transform:translateX(-8px)}}
.tgb .tgb-waddle{transform-box:fill-box;transform-origin:50% 100%;animation:tgbWaddle .9s ease-in-out infinite}
.tgb .tgb-sway{transform-box:fill-box;transform-origin:50% 100%;animation:tgbSway 1.8s ease-in-out infinite}
.tgb .tgb-breathe{transform-box:fill-box;transform-origin:50% 100%;animation:tgbBreathe 3.2s ease-in-out infinite}
.tgb .tgb-bob{animation:tgbBob .28s ease-in-out infinite}
.tgb .tgb-spin{transform-box:fill-box;transform-origin:50% 50%;animation:tgbSpin .5s linear infinite}
.tgb .tgb-waves{animation:tgbWave .9s linear infinite}
.tgb.tgb-still *{animation:none!important}
@media (prefers-reduced-motion:reduce){.tgb *{animation:none!important}}
</style>`;

const r1 = (n: number) => Math.round(n * 100) / 100;
const drawPaths = (list: readonly TracedPath[], fill: string) => list.map(p => `<path d="${p.d}" transform="translate(${p.x} ${p.y})" fill="${fill}"/>`).join('');
const faceAt = (f: { x: number; y: number; s: number }) =>
  `<g transform="translate(${f.x} ${f.y}) scale(${f.s}) translate(${-FACE_ORIGIN.x} ${-FACE_ORIGIN.y})">${drawPaths(FACE, BEAR.ink)}</g>`;

/** One traced pose in its own coordinates: the silhouette, the case it pulls (if any) and the face */
function poseArt(shape: BearShape): string {
  return `${shape.case ? drawPaths(shape.case, BEAR.yellow) : ''}${drawPaths(shape.body, BEAR.fur)}${faceAt(shape.face)}`;
}

const shadow = (cx: number, cy: number, rx: number) => `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(rx * 0.16)}" fill="${BEAR.shadow}"/>`;

let uid = 0;
const svg = (w: number, h: number, body: string, moving: boolean, size?: [number, number]) =>
  `<svg class="tgb${moving ? '' : ' tgb-still'}" viewBox="0 0 ${r1(w)} ${r1(h)}" width="${r1(size?.[0] ?? w)}" height="${r1(size?.[1] ?? h)}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible" aria-hidden="true">${STYLE}${body}</svg>`;

export type BearPose = 'stand' | 'wave' | 'walk' | 'suitcase';
const MOTION: Record<BearPose, string> = { stand: 'tgb-breathe', wave: 'tgb-sway', walk: 'tgb-waddle', suitcase: 'tgb-waddle' };

/** The aspect (width / height) of a pose with its ground shadow, for sizing a box around it */
export const bearAspect = (pose: BearPose) => BEAR_SHAPES[pose].w / (BEAR_SHAPES[pose].h * 1.04);

/** The whole bear in one of its poses, its feet on the bottom edge (with a soft shadow under them); 46 px tall by default */
export function bearSvg(pose: BearPose = 'stand', moving = true, height = 46): string {
  const sh = BEAR_SHAPES[pose];
  const H = sh.h * 1.04;
  const body = `${shadow(sh.w / 2, sh.h - sh.h * 0.012, sh.w * 0.3)}<g class="${MOTION[pose]}">${poseArt(sh)}</g>`;
  return svg(sh.w, H, body, moving, [height * sh.w / H, height]);
}

/**
 * The bear from the chest up behind a window: the standing pose, scaled so its eyes are `gap` apart and centred on
 * (cx, cy), seen only through `window` (a path), which is filled with sky behind it.
 */
function inWindow(window: string, cx: number, cy: number, gap: number): string {
  const id = `tgbw${++uid}`;
  const k = gap / FACE_ORIGIN.gap;
  const st = BEAR_SHAPES.stand;
  return `<clipPath id="${id}"><path d="${window}"/></clipPath><path d="${window}" fill="${BEAR.sky}"/>`
    + `<g clip-path="url(#${id})"><g transform="translate(${cx} ${cy}) scale(${r1(k * 1000) / 1000}) translate(${-st.face.x} ${-st.face.y})">${poseArt(st)}</g></g>`;
}

export type Vehicle = 'car' | 'train' | 'ship' | 'flight';

/** The box each traveller is drawn in (the journey map anchors it at the middle of its bottom edge) */
export const TRAVELLER_SIZE: Record<Vehicle | 'walk', [number, number]> = {
  walk: [35, 46], car: [56, 38], train: [62, 38], ship: [58, 42], flight: [60, 38],
};

/** A car with the bear at the wheel, nose to the right; the wheels turn and the body rides its springs */
function carSvg(moving: boolean): string {
  const wheel = (x: number) => `<g><circle cx="${x}" cy="31" r="5.2" fill="${BEAR.tyre}"/><g class="tgb-spin"><circle cx="${x}" cy="31" r="2.3" fill="${BEAR.steel}"/><rect x="${x - 0.5}" y="27" width="1" height="8" fill="${BEAR.tyre}"/></g></g>`;
  const body = `${shadow(28, 36.6, 23)}<g class="tgb-bob">
${inWindow('M20 14.6H35.4L40 21.6H15.6Z', 27.4, 18.8, 3.3)}
<path fill-rule="evenodd" fill="${BEAR.red}" d="M4 28.6C4 24.4 6.4 22.4 11 21.6L16.8 13.4C17.8 12 19.4 11.4 21.4 11.4H35.8C37.6 11.4 39 12.1 40 13.5L44.8 21.4C49.6 22 52.6 24 52.6 28V30.4C52.6 31.6 51.8 32.4 50.6 32.4H6C4.8 32.4 4 31.6 4 30.4Z M20 14.6H35.4L40 21.6H15.6Z"/>
<rect x="27.4" y="14.6" width="1.4" height="7" fill="${BEAR.red}"/>
<rect x="48.6" y="23.6" width="3.6" height="2.6" rx="1.2" fill="${BEAR.yellow}"/>
<rect x="4.4" y="24.6" width="2.4" height="2.6" rx="1" fill="#FFD2C2"/>
</g>${wheel(15)}${wheel(42)}`;
  return svg(56, 38, body, moving);
}

/** A blue train with the bear in the cab window, nose to the right */
function trainSvg(moving: boolean): string {
  const wheel = (x: number) => `<g><circle cx="${x}" cy="31.4" r="3.4" fill="${BEAR.tyre}"/><g class="tgb-spin"><circle cx="${x}" cy="31.4" r="1.4" fill="${BEAR.steel}"/><rect x="${x - 0.4}" y="28.6" width=".8" height="5.6" fill="${BEAR.tyre}"/></g></g>`;
  const body = `${shadow(31, 37, 28)}<rect x="2" y="34.4" width="58" height="1.6" rx=".8" fill="${BEAR.steel}"/><g class="tgb-bob">
${inWindow('M40 12.6H50A2 2 0 0 1 52 14.6V20A2 2 0 0 1 50 22H40A2 2 0 0 1 38 20V14.6A2 2 0 0 1 40 12.6Z', 45, 17.4, 3.6)}
<path fill-rule="evenodd" fill="${BEAR.blue}" d="M4 10.8C4 9.2 5.2 8 6.8 8H44C51 8 57.6 15 58.6 22.6L59.2 27.4C59.4 29 58.2 30.4 56.6 30.4H6.8C5.2 30.4 4 29.2 4 27.6Z M38 12.6H52V22H38Z"/>
<rect x="8" y="12.6" width="7.4" height="7" rx="1.6" fill="${BEAR.sky}"/><rect x="18.4" y="12.6" width="7.4" height="7" rx="1.6" fill="${BEAR.sky}"/><rect x="28.8" y="12.6" width="6.4" height="7" rx="1.6" fill="${BEAR.sky}"/>
<rect x="4" y="23.4" width="55" height="2.4" fill="${BEAR.yellow}"/>
<circle cx="56.4" cy="27.2" r="1.3" fill="${BEAR.yellow}"/>
</g>${wheel(12)}${wheel(22)}${wheel(42)}${wheel(52)}`;
  return svg(62, 38, body, moving);
}

/** A small ferry with the bear on deck, bow to the right, riding the waves */
function shipSvg(moving: boolean): string {
  const waves = `<g class="tgb-waves"><path d="M-4 37.6q2 -1.6 4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0t4 0" fill="none" stroke="${BEAR.sky}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  const body = `<g class="tgb-sway">
<rect x="13" y="10" width="5" height="9" rx="1" fill="${BEAR.yellow}"/><rect x="13" y="10" width="5" height="2.2" fill="${BEAR.ink}"/>
<rect x="9" y="17" width="20" height="11" rx="2" fill="${BEAR.white}"/>
<rect x="12" y="20" width="4" height="3.6" rx="1" fill="${BEAR.sky}"/><rect x="19.5" y="20" width="4" height="3.6" rx="1" fill="${BEAR.sky}"/>
<g transform="translate(37.4 12.6) scale(${r1(3.6 / FACE_ORIGIN.gap * 1000) / 1000}) translate(${-BEAR_SHAPES.stand.face.x} ${-BEAR_SHAPES.stand.face.y})">${poseArt(BEAR_SHAPES.stand)}</g>
<path d="M3 26H55L50.4 35.4C49.8 36.6 48.6 37.2 47.4 37.2H10.4C9.2 37.2 8 36.6 7.4 35.4Z" fill="${BEAR.white}"/>
<path d="M5.4 31H52.6L50.4 35.4C49.8 36.6 48.6 37.2 47.4 37.2H10.4C9.2 37.2 8 36.6 7.4 35.4Z" fill="${BEAR.red}"/>
</g>${waves}`;
  return svg(58, 42, body, moving);
}

/** A white plane with the bear at the front window, nose to the right, floating gently */
function flightSvg(moving: boolean): string {
  const body = `${shadow(30, 37, 18)}<g class="tgb-bob">
<path d="M8 8L14 8L21 18H8Z" fill="${BEAR.blue}"/>
<path d="M24 22L35 22L27 33H21Z" fill="${BEAR.steel}"/>
${inWindow('M41.6 11.6C41.6 9.8 43 8.4 44.8 8.4H48.6C51.6 8.4 54 10.6 54.6 13.6L55.4 17.4H41.6Z', 47.6, 13.4, 3.1)}
<path fill-rule="evenodd" fill="${BEAR.white}" d="M6 18.6C6 16.6 7.6 15 9.6 15H40C40.4 12 42.4 7 47.4 7C52.8 7 56.4 11.4 57 16.2C58 17.6 58.6 19.4 58.6 21.4C57.6 24.8 52.4 27.8 46 27.8H11.4C8.4 27.8 6 25.4 6 22.4Z M41.6 11.6C41.6 9.8 43 8.4 44.8 8.4H48.6C51.6 8.4 54 10.6 54.6 13.6L55.4 17.4H41.6Z"/>
<rect x="6" y="23.4" width="44" height="1.6" fill="${BEAR.red}"/>
${[18, 23, 28, 33, 38].map(x => `<circle cx="${x}" cy="19.8" r="1.3" fill="${BEAR.sky}"/>`).join('')}
<path d="M28 23L39 23L33 30.6H27Z" fill="#D6DBDF"/>
</g>`;
  return svg(60, 38, body, moving);
}

/** Which way each drawing faces as drawn. The walking bear is traced from city-walk, which steps to the left */
const FACES_WEST: Record<Vehicle | 'walk', boolean> = { walk: true, car: false, train: false, ship: false, flight: false };

/**
 * The traveller on the journey map: the bear walking, or the bear in a car, a train, a ferry or a plane. `west` is the
 * way it is going; the drawing is mirrored when it faces the other way, so it never walks backwards.
 */
export function travellerHtml(kind: Vehicle | null | undefined, west: boolean, moving: boolean): string {
  const art = kind === 'car' ? carSvg(moving) : kind === 'train' ? trainSvg(moving) : kind === 'ship' ? shipSvg(moving) : kind === 'flight' ? flightSvg(moving) : bearSvg('walk', moving, 46);
  const [w, h] = TRAVELLER_SIZE[kind ?? 'walk'];
  const flip = west !== FACES_WEST[kind ?? 'walk'];
  return `<div style="width:${w}px;height:${h}px;pointer-events:none;contain:layout paint;transform:${flip ? 'scaleX(-1)' : 'none'};filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))">${art}</div>`;
}
