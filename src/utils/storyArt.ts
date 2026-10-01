// Story art (v1.3.8): one hand-drawn traveler and the scenes she is in, replacing the canvas
// character and the old flat plan icons. Black monoline of one weight, cream fills, a black
// long-haired round-faced girl with dot eyes, one warm accent per scene.
//
// Scenes are plain SVG strings on a 200 x 200 board that use only a few classes (below), so the
// same drawing serves both places:
//   - inline (components/art/Art): colours come from CSS variables, so dark mode just works
//   - data URL (artDataUrl): colours are written into the file, for thumbnails and covers
//
//   k   outline            tl / tp  a tube's outer line and its paper core (arms, legs)
//   fp  paper fill         fh  hair / ink fill       fa  accent fill      fs  soft fill      fl  line fill
//   k2  thin outline (face lines, steam, rays)

export type StoryArtId =
  | 'itinerary-empty' | 'pocket-empty' | 'no-results' | 'search-location'
  | 'backpacking' | 'luggage-travel' | 'photo-memory' | 'train-journey' | 'waiting-gate'
  | 'coffee-break' | 'beer-break' | 'landmark-paris' | 'landmark-japan' | 'landmark-london' | 'landmark-egypt'
  | 'beach-relaxation' | 'cat-petting-cafe';

export interface ArtColors { line: string; paper: string; hair: string; accent: string; soft: string }

export const ART_LIGHT: ArtColors = { line: '#141412', paper: '#FFFDF9', hair: '#141412', accent: '#F2B33D', soft: '#ECE7DC' };
// In the dark the lines turn light and the hair stays black, so she keeps her face
export const ART_DARK: ArtColors = { line: '#EDEAE2', paper: '#2A2A25', hair: '#0A0A09', accent: '#E3A94B', soft: '#34342E' };

/** The stylesheet the scenes need; `scope` is a selector prefix such as '.art' (empty inside a standalone SVG) */
export function artCss(c: ArtColors | 'vars', scope = ''): string {
  const v = c === 'vars'
    ? { line: 'var(--art-line)', paper: 'var(--art-paper)', hair: 'var(--art-hair)', accent: 'var(--art-accent)', soft: 'var(--art-soft)' }
    : c;
  const s = scope ? `${scope} ` : '';
  return [
    `${s}.k{stroke:${v.line};stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}`,
    `${s}.k2{fill:none;stroke:${v.line};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}`,
    `${s}.tl{fill:none;stroke:${v.line};stroke-linecap:round;stroke-linejoin:round}`,
    `${s}.tp{fill:none;stroke:${v.paper};stroke-linecap:round;stroke-linejoin:round}`,
    `${s}.fp{fill:${v.paper}}`, `${s}.fh{fill:${v.hair}}`, `${s}.fa{fill:${v.accent}}`, `${s}.fs{fill:${v.soft}}`, `${s}.fl{fill:${v.line}}`,
    `${s}.nf{fill:none}`,
  ].join('');
}

// ── Drawing helpers ──────────────────────────────────────────────
const path = (d: string, cls = 'k fp', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
const circ = (x: number, y: number, r: number, cls = 'k fp') => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
const rect = (x: number, y: number, w: number, h: number, r = 0, cls = 'k fp', extra = '') =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
const line = (x1: number, y1: number, x2: number, y2: number, cls = 'k2') => `<path class="${cls}" d="M${x1},${y1} L${x2},${y2}"/>`;
const ell = (cx: number, cy: number, rx: number, ry: number, cls = 'k fp') => `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
/** An arm or a leg: a line of one width with a paper core, so it reads as an outlined tube */
const tube = (d: string, w = 9) => `<path class="tl" style="stroke-width:${w + 6.4}" d="${d}"/><path class="tp" style="stroke-width:${w}" d="${d}"/>`;
const ground = (y = 182, x1 = 24, x2 = 176) => line(x1, y, x2, y, 'k2');

interface HeadOpts { down?: boolean; back?: boolean; r?: number; flip?: number }

/** The traveler's head: long black hair, bangs, dot eyes and a small smile; `back` shows only the hair */
function head(cx: number, cy: number, o: HeadOpts = {}): string {
  const r = o.r ?? 20;
  const hair = path(
    `M${cx - r - 3},${cy + 2} C${cx - r - 6},${cy - r - 12} ${cx + r + 6},${cy - r - 12} ${cx + r + 3},${cy + 2}`
    + ` L${cx + r + 5},${cy + r * 1.7} Q${cx + r + 5},${cy + r * 2.1} ${cx + r - 5},${cy + r * 2.1}`
    + ` L${cx - r + 5},${cy + r * 2.1} Q${cx - r - 5},${cy + r * 2.1} ${cx - r - 5},${cy + r * 1.7} Z`, 'k fh');
  if (o.back) return hair;
  const dy = o.down ? 3 : 0;
  const face = ell(cx, cy + 2, r * 0.84, r * 0.92);
  const bangs = path(
    `M${cx - r * 0.84},${cy + 1} Q${cx - r * 0.3},${cy - r * 0.62} ${cx + r * 0.05},${cy - r * 0.12}`
    + ` Q${cx + r * 0.45},${cy - r * 0.5} ${cx + r * 0.84},${cy + 1} L${cx + r * 0.9},${cy - r * 0.95}`
    + ` Q${cx},${cy - r * 1.35} ${cx - r * 0.9},${cy - r * 0.95} Z`, 'fh');
  const eyes = circ(cx - r * 0.36, cy + r * 0.24 + dy, 1.8, 'fl') + circ(cx + r * 0.36, cy + r * 0.24 + dy, 1.8, 'fl');
  const mouth = path(`M${cx - 3},${cy + r * 0.6 + dy} Q${cx},${cy + r * 0.6 + dy + 3} ${cx + 3},${cy + r * 0.6 + dy}`, 'k2');
  return hair + face + bangs + eyes + mouth;
}

/** A body of one rounded block, optionally striped or dotted */
function body(x: number, y: number, w: number, h: number, r = 14, pattern: 'plain' | 'stripes' | 'dots' = 'plain'): string {
  let out = rect(x, y, w, h, r, 'k fp');
  if (pattern === 'stripes') {
    for (let yy = y + 16; yy < y + h - 8; yy += 11) out += line(x + 3, yy, x + w - 3, yy);
  } else if (pattern === 'dots') {
    for (let yy = y + 14; yy < y + h - 6; yy += 14) {
      const off = ((yy - y) / 14) % 2 ? 7 : 0;
      for (let xx = x + 10 + off; xx < x + w - 6; xx += 14) out += circ(xx, yy, 1.8, 'fl');
    }
  }
  return out;
}

const hand = (x: number, y: number, r = 6) => circ(x, y, r);
const steam = (x: number, y: number) => path(`M${x},${y} q-5,-7 0,-13 q5,-6 0,-13`, 'k2');
const star = (x: number, y: number, r: number, cls = 'k fa') =>
  path(`M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z`, cls);

// ── Scenes ───────────────────────────────────────────────────────
type Scene = () => string;

const SCENES: Record<StoryArtId, Scene> = {
  // Empty trips: she hugs a packed suitcase and thinks of a pin
  'itinerary-empty': () =>
    head(100, 68, { r: 20 })
    + body(74, 94, 52, 34, 14)
    + tube('M80,104 Q62,118 78,126', 9) + tube('M120,104 Q138,118 122,126', 9)
    + path('M84,130 v-10 q0,-8 8,-8 h16 q8,0 8,8 v10', 'k nf')
    + rect(54, 128, 92, 54, 10) + line(80, 128, 80, 182, 'k2') + line(120, 128, 120, 182, 'k2')
    + rect(94, 142, 12, 14, 3, 'k fa') + hand(80, 126) + hand(120, 126)
    + circ(134, 52, 3, 'k fp') + circ(142, 42, 4.5, 'k fp')
    + path('M146,10 h34 a12,12 0 0 1 12,12 v6 a12,12 0 0 1 -12,12 h-34 a12,12 0 0 1 -12,-12 v-6 a12,12 0 0 1 12,-12 Z', 'k fp')
    + path('M163,28 c-6,-6 -6,-12 0,-12 c6,0 6,6 0,12 Z', 'k fa') + ground(),

  // Empty pocket: a flat wallet with a worried face
  'pocket-empty': () =>
    rect(62, 46, 58, 34, 5, 'k fp', 'transform="rotate(-9 90 63)"')
    + rect(34, 70, 132, 92, 16) + rect(116, 100, 52, 34, 17)
    + circ(138, 117, 5, 'k fa')
    + circ(76, 108, 2.4, 'fl') + circ(100, 108, 2.4, 'fl')
    + path('M72,98 l8,-3 M104,95 l8,3', 'k2') + path('M74,128 q14,-10 28,0', 'k2')
    + path('M112,118 q-6,8 0,12 q6,-4 0,-12 Z', 'k fp', 'transform="translate(-6 2) scale(.9)"') + ground(170),

  // Nothing found: she looks over a map and a question mark
  'no-results': () =>
    head(100, 46, { r: 16, down: true })
    + path('M36,74 L80,62 L80,156 L36,168 Z') + path('M80,62 L120,74 L120,168 L80,156 Z') + path('M120,74 L164,62 L164,156 L120,168 Z')
    + path('M48,134 Q66,100 94,118 T150,92', 'k2', 'stroke-dasharray="1 7"')
    + circ(150, 146, 18, 'k fl') + `<text x="150" y="155" text-anchor="middle" font-family="Inter,'Noto Sans KR',sans-serif" font-size="26" font-weight="800" class="fp">?</text>`
    + tube('M60,70 Q44,92 54,104', 8) + tube('M140,70 Q156,92 146,104', 8) + hand(54,106,5) + hand(146,106,5),

  // A place on the map: the same map with a pin
  'search-location': () =>
    head(100, 44, { r: 16 })
    + path('M36,72 L80,60 L80,154 L36,166 Z') + path('M80,60 L120,72 L120,166 L80,154 Z') + path('M120,72 L164,60 L164,154 L120,166 Z')
    + path('M104,150 c-16,-18 -16,-40 0,-40 c16,0 16,22 0,40 Z', 'k fa') + circ(104, 128, 5, 'k fp')
    + tube('M60,68 Q44,90 54,102', 8) + tube('M140,68 Q156,90 146,102', 8) + hand(54,104,5) + hand(146,104,5),

  // Walking with a backpack
  'backpacking': () =>
    rect(58, 70, 36, 60, 11) + rect(63, 104, 26, 18, 5, 'k fa') + path('M66,70 q10,-12 20,0', 'k nf')
    + head(112, 46, { r: 18 })
    + body(92, 74, 40, 52, 14, 'stripes')
    + tube('M104,126 Q100,152 84,176', 11) + tube('M120,126 Q128,152 134,176', 11)
    + ell(80, 180, 11, 6) + ell(136, 180, 11, 6)
    + tube('M96,86 Q82,106 90,120', 9) + tube('M128,86 Q142,100 138,114', 9)
    + ground(188, 36, 164),

  // Pulling a suitcase
  'luggage-travel': () =>
    head(80, 46, { r: 18 })
    + body(62, 72, 38, 34, 12, 'dots')
    + path('M60,104 L102,104 L114,142 L50,142 Z') + line(60,116,104,116) + line(57,128,108,128)
    + tube('M72,142 L72,172', 8) + tube('M92,142 L92,172', 8) + ell(72,176,9,5) + ell(92,176,9,5)
    + rect(126, 112, 46, 62, 9) + rect(126, 138, 46, 10, 0, 'k fa') + path('M149,112 v-14', 'k nf')
    + circ(137, 178, 4.5, 'k fl') + circ(161, 178, 4.5, 'k fl')
    + tube('M98,80 Q128,82 148,98', 8) + hand(149, 98, 5.5) + ground(186, 30, 178),

  // Taking a photo
  'photo-memory': () =>
    head(100, 56, { r: 22 })
    + body(66, 112, 68, 70, 18, 'stripes')
    + rect(58, 70, 84, 52, 11) + rect(108, 62, 24, 12, 4) + rect(66, 78, 14, 9, 3, 'k fa')
    + circ(100, 98, 19) + circ(100, 98, 11, 'k fl') + circ(95, 93, 3, 'k fp')
    + tube('M70,126 Q48,134 56,108', 9) + tube('M130,126 Q152,134 144,108', 9)
    + hand(58,106,7) + hand(142,106,7),

  // On a train
  'train-journey': () =>
    rect(52, 36, 96, 118, 20) + rect(62, 48, 76, 48, 10) + line(100, 48, 100, 96)
    + head(80, 70, { r: 8 })
    + rect(52, 106, 96, 12, 0, 'k fa') + circ(72, 132, 8, 'k fa') + circ(128, 132, 8, 'k fa')
    + line(66, 154, 66, 168, 'k') + line(134, 154, 134, 168, 'k')
    + path('M28,192 L72,168 M172,192 L128,168 M44,182 H156 M60,174 H140', 'k2'),

  // Waiting at the gate, seen from behind, under the board
  'waiting-gate': () =>
    rect(30, 24, 140, 78, 10, 'k fl')
    + path('M44,40 l10,-4 l-3,6 l8,2 l-3,3 l-8,-2 Z', 'fa', 'transform="translate(0 -2)"')
    + ['M64,44 H120', 'M64,60 H146', 'M44,76 H130', 'M44,90 H100'].map(d => `<path class="tp" style="stroke-width:3" d="${d}"/>`).join('')
    + head(100, 128, { r: 22, back: true })
    + path('M58,196 Q58,160 100,160 Q142,160 142,196 Z') + ground(196, 20, 180),

  // A warm drink
  'coffee-break': () =>
    head(100, 56, { r: 22 })
    + body(68, 104, 64, 78, 18, 'plain')
    + path('M80,118 h40 v34 q0,14 -14,14 h-12 q-14,0 -14,-14 Z') + path('M120,126 h8 a9,9 0 0 1 0,20 h-8', 'k nf')
    + steam(94, 112) + steam(106, 112)
    + tube('M72,126 Q62,152 82,150', 9) + tube('M128,126 Q138,152 118,150', 9) + ground(),

  // A cold one (the accent is the beer)
  'beer-break': () =>
    head(100, 56, { r: 22 })
    + body(68, 104, 64, 78, 18, 'dots')
    + path('M78,126 h44 v36 q0,10 -10,10 h-24 q-10,0 -10,-10 Z', 'k fa')
    + path('M76,126 q4,-12 12,-4 q6,-10 14,-2 q8,-6 12,4 Z', 'k fp') + path('M122,134 h8 a9,9 0 0 1 0,20 h-8', 'k nf')
    + tube('M72,126 Q60,150 80,152', 9) + tube('M128,126 Q140,150 122,152', 9) + ground(),

  // Paris
  'landmark-paris': () =>
    path('M100,22 L90,84 L72,176 L94,176 L100,150 L106,176 L128,176 L110,84 Z')
    + path('M90,84 H110 M84,122 H116', 'k2') + path('M92,98 L108,122 M108,98 L92,122 M86,138 L114,160 M114,138 L86,160', 'k2')
    + path('M78,176 Q100,134 122,176', 'k nf')
    + head(152, 140, { r: 8 }) + rect(146, 156, 12, 18, 5) + tube('M158,160 Q168,150 164,140', 4) + ground(),

  // Japan: a torii gate
  'landmark-japan': () =>
    path('M28,52 Q100,66 172,52 L166,66 Q100,78 34,66 Z', 'k fl')
    + rect(46, 80, 108, 9, 3) + rect(58, 66, 14, 112, 3) + rect(128, 66, 14, 112, 3) + rect(92, 70, 16, 12, 2)
    + head(166, 150, { r: 8 }) + rect(160, 166, 12, 14, 5) + ground(),

  // London: Big Ben
  'landmark-london': () =>
    path('M100,16 L88,46 H112 Z') + rect(80, 46, 40, 26, 2) + rect(74, 72, 52, 106, 3)
    + circ(100, 98, 15) + path('M100,98 V88 M100,98 H108', 'k2')
    + path('M82,126 v34 M100,126 v34 M118,126 v34', 'k2') + path('M82,52 v14 M100,52 v14 M118,52 v14', 'k2') + ground(),

  // Egypt: pyramids
  'landmark-egypt': () =>
    path('M24,170 L96,70 L168,170 Z') + path('M96,70 L114,170', 'k2')
    + path('M104,170 L148,108 L186,170 Z', 'k fs')
    + path('M44,150 H138 M60,132 H122 M76,112 H110', 'k2')
    + circ(40, 50, 14, 'k fa') + ground(),

  // A towel, a nap and the sun
  'beach-relaxation': () =>
    circ(150, 46, 16, 'k fa') + path('M150,18 v-8 M176,46 h8 M124,46 h-8 M168,28 l6,-6 M132,28 l-6,-6', 'k2')
    + path('M26,156 L174,156 L164,182 L16,182 Z', 'k fs') + path('M40,168 H158', 'k2')
    + head(58, 130, { r: 16 })
    + rect(70, 120, 78, 32, 16, 'k fp') + circ(88, 132, 1.8, 'fl') + circ(104, 132, 1.8, 'fl') + circ(120, 132, 1.8, 'fl') + circ(96, 142, 1.8, 'fl') + circ(112, 142, 1.8, 'fl')
    + tube('M146,138 L176,142', 9),

  // Sitting on the floor, a cat comes to be petted
  'cat-petting-cafe': () =>
    head(66, 58, { r: 20 })
    + body(42, 82, 48, 56, 16, 'dots')
    + tube('M60,140 Q74,164 118,164', 14) + ell(124, 165, 8, 5)
    + path('M160,166 q26,2 22,-30', 'k nf')
    + ell(148, 148, 17, 24) + circ(148, 116, 14)
    + path('M137,106 L139,92 L149,102 M147,102 L157,92 L159,106', 'k')
    + circ(143, 117, 1.7, 'fl') + circ(153, 117, 1.7, 'fl') + path('M145,123 q3,3 6,0', 'k2')
    + tube('M84,94 Q116,98 140,106', 9) + hand(142, 106, 5) + ground(186),
};

export const STORY_ART_IDS = Object.keys(SCENES) as StoryArtId[];

/** One scene's drawing, without the svg wrapper */
export function artInner(id: StoryArtId): string {
  return (SCENES[id] ?? SCENES['itinerary-empty'])();
}

/** A standalone SVG file's text (colours written in), for `<img>` and data URLs */
export function artSvgText(id: StoryArtId, colors: ArtColors = ART_LIGHT, background?: string): string {
  const bg = background ? `<rect width="200" height="200" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><style>${artCss(colors)}</style>${bg}${artInner(id)}</svg>`;
}

export function artDataUrl(id: StoryArtId, colors: ArtColors = ART_LIGHT, background?: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artSvgText(id, colors, background))}`;
}
