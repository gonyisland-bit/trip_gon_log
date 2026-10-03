// The bear kit (v1.3.9 pilot): the teal bear of the illustrations redrawn as vector parts, so it can be any size, take
// its colours from the theme and move. Everything here returns SVG markup as a string, so the same drawing serves React
// (Bear.tsx) and the Leaflet markers of the journey map (a divIcon takes HTML). Shapes follow the bitmap scenes in
// assets/illust: flat fills, no outlines, round ears, dot eyes, a small nose and a smile.
//
// Motion is CSS only, named tgb-*, and every animation stops under prefers-reduced-motion. A drawing made with
// `moving: false` is the same picture standing still.

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
@keyframes tgbLeg{0%,100%{transform:rotate(24deg)}50%{transform:rotate(-24deg)}}
@keyframes tgbArm{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(18deg)}}
@keyframes tgbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.3px)}}
@keyframes tgbSpin{to{transform:rotate(360deg)}}
@keyframes tgbSway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes tgbWave{0%{transform:translateX(0)}100%{transform:translateX(-8px)}}
@keyframes tgbWaveHand{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(-55deg)}}
.tgb .tgb-leg-a{transform-box:fill-box;transform-origin:50% 8%;animation:tgbLeg .56s ease-in-out infinite}
.tgb .tgb-leg-b{transform-box:fill-box;transform-origin:50% 8%;animation:tgbLeg .56s ease-in-out infinite reverse}
.tgb .tgb-arm-a{transform-box:fill-box;transform-origin:50% 10%;animation:tgbArm .56s ease-in-out infinite}
.tgb .tgb-arm-b{transform-box:fill-box;transform-origin:50% 10%;animation:tgbArm .56s ease-in-out infinite reverse}
.tgb .tgb-bob{animation:tgbBob .28s ease-in-out infinite}
.tgb .tgb-spin{transform-box:fill-box;transform-origin:50% 50%;animation:tgbSpin .5s linear infinite}
.tgb .tgb-sway{transform-box:fill-box;transform-origin:50% 100%;animation:tgbSway 1.6s ease-in-out infinite}
.tgb .tgb-waves{animation:tgbWave .9s linear infinite}
.tgb .tgb-hand{transform-box:fill-box;transform-origin:50% 90%;animation:tgbWaveHand 1.1s ease-in-out infinite}
.tgb.tgb-still *{animation:none!important}
@media (prefers-reduced-motion:reduce){.tgb *{animation:none!important}}
</style>`;

/** The bear's head, facing the viewer: ears, a round face, two dot eyes, a nose and a smile */
export function bearHead(cx: number, cy: number, r: number): string {
  const f = (n: number) => +n.toFixed(2);
  return `<g>
<circle cx="${f(cx - r * 0.74)}" cy="${f(cy - r * 0.72)}" r="${f(r * 0.38)}" fill="${BEAR.fur}"/>
<circle cx="${f(cx + r * 0.74)}" cy="${f(cy - r * 0.72)}" r="${f(r * 0.38)}" fill="${BEAR.fur}"/>
<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * 0.9)}" fill="${BEAR.fur}"/>
<circle cx="${f(cx - r * 0.34)}" cy="${f(cy - r * 0.08)}" r="${f(r * 0.11)}" fill="${BEAR.ink}"/>
<circle cx="${f(cx + r * 0.34)}" cy="${f(cy - r * 0.08)}" r="${f(r * 0.11)}" fill="${BEAR.ink}"/>
<ellipse cx="${cx}" cy="${f(cy + r * 0.17)}" rx="${f(r * 0.15)}" ry="${f(r * 0.1)}" fill="${BEAR.ink}"/>
<path d="M${f(cx - r * 0.24)} ${f(cy + r * 0.33)} Q${cx} ${f(cy + r * 0.5)} ${f(cx + r * 0.24)} ${f(cy + r * 0.33)}" fill="none" stroke="${BEAR.ink}" stroke-width="${f(r * 0.075)}" stroke-linecap="round"/>
</g>`;
}

const shadow = (cx: number, cy: number, rx: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${(rx * 0.2).toFixed(2)}" fill="${BEAR.shadow}"/>`;

const svg = (w: number, h: number, body: string, moving: boolean, extra = '') =>
  `<svg class="tgb${moving ? '' : ' tgb-still'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible${extra}" aria-hidden="true">${STYLE}${body}</svg>`;

export type BearPose = 'walk' | 'stand' | 'wave' | 'suitcase';

/**
 * The whole bear, standing or walking to the right, in a 40 x 46 box (its feet on the bottom edge).
 * `walk` swings arms and legs, `wave` raises a paw, `suitcase` walks pulling a yellow case behind it.
 */
export function bearSvg(pose: BearPose = 'stand', moving = true): string {
  const walking = pose === 'walk' || pose === 'suitcase';
  const legA = walking ? ' class="tgb-leg-a"' : '';
  const legB = walking ? ' class="tgb-leg-b"' : '';
  const armA = walking ? ' class="tgb-arm-a"' : '';
  const case_ = pose === 'suitcase'
    ? `<g><line x1="7.5" y1="25" x2="3.2" y2="31" stroke="${BEAR.ink}" stroke-width="1.3" stroke-linecap="round"/>
<rect x="0" y="30" width="9" height="11.5" rx="2" fill="${BEAR.yellow}"/><rect x="2.2" y="32.4" width="4.6" height="1.3" rx=".6" fill="#D9A21E"/>
<circle cx="2" cy="42.6" r="1.1" fill="${BEAR.tyre}"/><circle cx="7" cy="42.6" r="1.1" fill="${BEAR.tyre}"/></g>`
    : '';
  const backArm = pose === 'wave'
    ? `<g class="tgb-hand"><rect x="26.5" y="11" width="6" height="12" rx="3" fill="${BEAR.fur}"/></g>`
    : `<rect${walking ? ' class="tgb-arm-b"' : ''} x="25.5" y="21" width="6" height="11" rx="3" fill="${BEAR.furShade}"/>`;
  const body = `${shadow(20, 44.6, 11)}${case_}<g class="${walking ? 'tgb-bob' : ''}">
<rect${legB} x="21" y="32" width="7" height="12" rx="3.5" fill="${BEAR.furShade}"/>
${backArm}
<rect${legA} x="13" y="32" width="7.4" height="12" rx="3.7" fill="${BEAR.fur}"/>
<path d="M10.5 33.5C9 25.5 12.5 18.5 20.2 18.5C27.8 18.5 31.2 25.5 29.6 33.5C28.2 37.6 12 37.6 10.5 33.5Z" fill="${BEAR.fur}"/>
<path d="M14.5 30.5Q20 34 25.5 30.5" fill="none" stroke="${BEAR.ink}" stroke-opacity=".45" stroke-width=".9" stroke-linecap="round"/>
${bearHead(20.2, 12, 8.6)}
<rect${armA} x="8.5" y="21" width="6" height="11" rx="3" fill="${BEAR.fur}"/>
</g>`;
  return svg(40, 46, body, moving);
}

export type Vehicle = 'car' | 'train' | 'ship' | 'flight';

/** The box each traveller is drawn in (the journey map anchors it at the middle of its bottom edge) */
export const TRAVELLER_SIZE: Record<Vehicle | 'walk', [number, number]> = {
  walk: [40, 46], car: [56, 38], train: [62, 38], ship: [58, 42], flight: [60, 38],
};

/** A car with the bear at the wheel, nose to the right; the wheels turn and the body rides its springs */
function carSvg(moving: boolean): string {
  const wheel = (x: number) => `<g><circle cx="${x}" cy="31" r="5.2" fill="${BEAR.tyre}"/><g class="tgb-spin"><circle cx="${x}" cy="31" r="2.3" fill="${BEAR.steel}"/><rect x="${x - 0.5}" y="27" width="1" height="8" fill="${BEAR.tyre}"/></g></g>`;
  const body = `${shadow(28, 36.6, 23)}<g class="tgb-bob">
<path d="M20 14.6H35.4L40 21.6H15.6Z" fill="${BEAR.sky}"/>
${bearHead(27.4, 18.4, 4.9)}
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
<rect x="38" y="12.6" width="14" height="9.4" rx="2" fill="${BEAR.sky}"/>
${bearHead(45, 17.6, 4.6)}
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
<rect x="33" y="10" width="5" height="9" rx="1" fill="${BEAR.yellow}"/><rect x="33" y="10" width="5" height="2.2" fill="${BEAR.ink}"/>
<rect x="11" y="17" width="27" height="11" rx="2" fill="${BEAR.white}"/>
<rect x="14" y="20" width="4" height="3.6" rx="1" fill="${BEAR.sky}"/><rect x="20.5" y="20" width="4" height="3.6" rx="1" fill="${BEAR.sky}"/>
<path d="M27 26.4C26.2 21.6 28 18.4 31.8 18.4C35.6 18.4 37.4 21.6 36.6 26.4Z" fill="${BEAR.fur}"/>
${bearHead(31.8, 13.4, 5)}
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
<path d="M41.6 11.6C41.6 9.8 43 8.4 44.8 8.4H48.6C51.6 8.4 54 10.6 54.6 13.6L55.4 17.4H41.6Z" fill="${BEAR.sky}"/>
${bearHead(47.4, 13.6, 4.6)}
<path fill-rule="evenodd" fill="${BEAR.white}" d="M6 18.6C6 16.6 7.6 15 9.6 15H40C40.4 12 42.4 7 47.4 7C52.8 7 56.4 11.4 57 16.2C58 17.6 58.6 19.4 58.6 21.4C57.6 24.8 52.4 27.8 46 27.8H11.4C8.4 27.8 6 25.4 6 22.4Z M41.6 11.6C41.6 9.8 43 8.4 44.8 8.4H48.6C51.6 8.4 54 10.6 54.6 13.6L55.4 17.4H41.6Z"/>
<rect x="6" y="23.4" width="44" height="1.6" fill="${BEAR.red}"/>
${[18, 23, 28, 33, 38].map(x => `<circle cx="${x}" cy="19.8" r="1.3" fill="${BEAR.sky}"/>`).join('')}
<path d="M28 23L39 23L33 30.6H27Z" fill="#D6DBDF"/>
</g>`;
  return svg(60, 38, body, moving);
}

/**
 * The traveller on the journey map: the bear walking, or the bear in a car, a train, a ferry or a plane. Drawn facing
 * east; `west` mirrors it so it always faces where it is going.
 */
export function travellerHtml(kind: Vehicle | null | undefined, west: boolean, moving: boolean): string {
  const art = kind === 'car' ? carSvg(moving) : kind === 'train' ? trainSvg(moving) : kind === 'ship' ? shipSvg(moving) : kind === 'flight' ? flightSvg(moving) : bearSvg('walk', moving);
  const [w, h] = TRAVELLER_SIZE[kind ?? 'walk'];
  return `<div style="width:${w}px;height:${h}px;pointer-events:none;contain:layout paint;transform:${west ? 'scaleX(-1)' : 'none'};filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))">${art}</div>`;
}
