import React from 'react';

// Profile doodles (v1.3.6): hand-drawn faces on coloured circles, after the reference sheet the
// owner chose — thin dark-brown lines, simple expressions, a few details per character.
// 50 in five groups (man, woman, kid, animal, object). The ids of the earlier presets
// (user, smile, cat …) resolve to a doodle here, so saved profiles need no migration.

const INK = '#3B1E17';
const C = {
  lime: '#CFE57A',
  pink: '#F59AC0',
  sky: '#74ABE2',
  orange: '#F4933E',
  white: '#FBFAF4',
  green: '#4DB84E',
};
const BLUSH = '#F07E88';

export type AvatarCategory = 'man' | 'woman' | 'kid' | 'animal' | 'object';

type Eyes = 'dot' | 'closed' | 'happy' | 'star' | 'wide' | 'wink' | 'side' | 'sleepy' | 'big' | 'none';
type Brows = 'none' | 'angry' | 'worried' | 'raised';
type Mouth = 'smile' | 'grin' | 'flat' | 'o' | 'frown' | 'wave' | 'smirk' | 'open' | 'tongue' | 'tooth' | 'none';

interface Spec {
  id: string;
  label: string;
  category: AvatarCategory;
  bg: string;
  eyes: Eyes;
  mouth: Mouth;
  brows?: Brows;
  nose?: boolean;
  /** Drawn under the face (hair behind, animal ears, object shapes) */
  under?: React.ReactNode;
  /** Drawn over the face (glasses, hats, whiskers) */
  over?: React.ReactNode;
}

const line = { fill: 'none', stroke: INK, strokeWidth: 2.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const thin = { ...line, strokeWidth: 1.8 };

function EyesPart({ kind }: { kind: Eyes }) {
  switch (kind) {
    case 'dot': return <><circle cx="25" cy="28" r="2.2" fill={INK} /><circle cx="39.5" cy="27.5" r="2.2" fill={INK} /></>;
    case 'closed': return <><path d="M20.5 28 q4.5 3.4 9 0.2" {...line} /><path d="M35 27.6 q4.5 3.4 9 0.2" {...line} /></>;
    case 'happy': return <><path d="M20.5 29.5 q4.5 -4.4 9 -0.2" {...line} /><path d="M35 29.2 q4.5 -4.4 9 -0.2" {...line} /></>;
    case 'star': return <>{[[25, 27.5], [39.5, 27]].map(([x, y]) => <path key={x} d={`M${x - 3.4} ${y} h6.8 M${x} ${y - 3.4} v6.8 M${x - 2.4} ${y - 2.4} l4.8 4.8 M${x + 2.4} ${y - 2.4} l-4.8 4.8`} {...thin} />)}</>;
    case 'wide': return <><circle cx="25" cy="28" r="4.4" {...thin} /><circle cx="26" cy="28.6" r="1.8" fill={INK} /><circle cx="39.5" cy="27.5" r="4.4" {...thin} /><circle cx="40.5" cy="28.1" r="1.8" fill={INK} /></>;
    case 'wink': return <><circle cx="25" cy="28" r="2.2" fill={INK} /><path d="M35 28.6 q4.5 -4.2 9 -0.4" {...line} /></>;
    case 'side': return <><circle cx="27.5" cy="28" r="2.1" fill={INK} /><circle cx="41.5" cy="27.4" r="2.1" fill={INK} /></>;
    case 'sleepy': return <><path d="M20.5 28.6 h8.6" {...line} /><path d="M35 28.2 h8.6" {...line} /></>;
    case 'big': return <><circle cx="25" cy="28.5" r="3.4" fill={INK} /><circle cx="26.2" cy="27.3" r="1.1" fill={C.white} /><circle cx="39.5" cy="28" r="3.4" fill={INK} /><circle cx="40.7" cy="26.8" r="1.1" fill={C.white} /></>;
    default: return null;
  }
}

function BrowsPart({ kind }: { kind?: Brows }) {
  switch (kind) {
    case 'angry': return <><path d="M20 20.5 l9 3.6" {...line} /><path d="M44.5 20 l-9 3.8" {...line} /></>;
    case 'worried': return <><path d="M20.5 23.5 l8.4 -3" {...line} /><path d="M35.2 20.4 l8.6 3" {...line} /></>;
    case 'raised': return <><path d="M20.5 21.5 q4.3 -3 8.6 0" {...line} /><path d="M35.2 21 q4.3 -3 8.6 0" {...line} /></>;
    default: return null;
  }
}

function MouthPart({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'smile': return <path d="M24.5 39.5 q7.6 7.4 15.4 -0.6" {...line} />;
    case 'grin': return <path d="M22 37 q2 11 10.4 10.6 q8.2 -0.4 10 -11" {...line} />;
    case 'flat': return <path d="M26 42 h12.4" {...line} />;
    case 'o': return <ellipse cx="32.4" cy="42" rx="3.2" ry="3.8" fill={INK} />;
    case 'frown': return <path d="M24.6 45 q7.6 -7 15.2 0.4" {...line} />;
    case 'wave': return <path d="M22.5 42.5 q2.4 -3 4.8 0 t4.8 0 t4.8 0 t4.8 0" {...line} />;
    case 'smirk': return <path d="M26 42 q7 3 13 -2.6" {...line} />;
    case 'open': return <path d="M24 38.6 q8.4 13 16.6 0 Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />;
    case 'tongue': return <><path d="M24.5 39.5 q7.6 7.4 15.4 -0.6" {...line} /><path d="M29.8 43.2 q2.6 6 5.4 -0.2" fill={BLUSH} stroke={INK} strokeWidth="1.6" /></>;
    case 'tooth': return <><path d="M23.5 39 q8.6 9 17.2 0 Z" fill={C.white} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M32 39.4 v3.4" {...thin} /></>;
    default: return null;
  }
}

const Nose = () => <path d="M32.6 30.5 q-2.6 5 0.6 6.2" {...thin} />;
const Blush = ({ opacity = 0.75 }: { opacity?: number }) => <><ellipse cx="18.5" cy="36" rx="3.6" ry="2.4" fill={BLUSH} opacity={opacity} /><ellipse cx="46" cy="35.5" rx="3.6" ry="2.4" fill={BLUSH} opacity={opacity} /></>;

// ── The fifty ──
const SPECS: Spec[] = [
  // 남성
  { id: 'm-crew', label: '짧은 머리', category: 'man', bg: C.lime, eyes: 'dot', mouth: 'smile', nose: true,
    under: <path d="M16 17 l3 4.6 M22 12.6 l2.2 5.2 M29.4 10.6 l0.8 5.4 M36.6 10.8 l-0.6 5.4 M43.6 13 l-2 5 M49 17.6 l-3 4.2" {...line} /> },
  { id: 'm-glasses', label: '안경', category: 'man', bg: C.sky, eyes: 'dot', mouth: 'flat', nose: true,
    over: <><circle cx="25" cy="28" r="6" {...thin} /><circle cx="39.5" cy="27.5" r="6" {...thin} /><path d="M31 27.8 h2.5 M19 27 l-4.6 -1.6 M45.5 26.6 l4.4 -1.8" {...thin} /></> },
  { id: 'm-mustache', label: '콧수염', category: 'man', bg: C.orange, eyes: 'side', mouth: 'none', nose: true,
    over: <path d="M22.5 41.5 q4.6 -5 9.6 -1.4 q5 -3.6 9.8 1.2 q-5 1.6 -9.8 -0.4 q-4.8 2 -9.6 0.6 Z" fill={INK} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" /> },
  { id: 'm-beard', label: '턱수염', category: 'man', bg: C.white, eyes: 'closed', mouth: 'smile',
    over: <>{[[18, 42], [20, 48], [25, 52], [32, 54], [39, 52], [44, 48], [46, 42]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" fill={INK} />)}</> },
  { id: 'm-cap', label: '모자', category: 'man', bg: C.pink, eyes: 'dot', mouth: 'grin',
    under: <><path d="M9 22 q2 -16 23 -17 q21 1 23 17 Z" fill={INK} /><path d="M31 21.6 h26" {...line} strokeWidth={3} /></> },
  { id: 'm-part', label: '가르마', category: 'man', bg: C.green, eyes: 'happy', mouth: 'smirk', nose: true,
    under: <path d="M9.6 25 q4 -15 20 -15.4 q16 -0.6 24.6 12.4 M28 10 q-3 5 -3.4 10" {...line} /> },
  { id: 'm-bald', label: '빛나는 머리', category: 'man', bg: C.orange, eyes: 'sleepy', mouth: 'smile', nose: true,
    over: <path d="M40.5 9.5 q7 2.4 9.6 9" fill="none" stroke={C.white} strokeWidth="2.6" strokeLinecap="round" /> },
  { id: 'm-band', label: '헤드밴드', category: 'man', bg: C.lime, eyes: 'dot', brows: 'angry', mouth: 'flat',
    under: <path d="M3.4 20 q28.6 -8 57.2 0 l-0.8 5 q-27.8 -7.6 -55.6 0 Z" fill={C.orange} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /> },
  { id: 'm-shades', label: '선글라스', category: 'man', bg: C.sky, eyes: 'none', mouth: 'smirk',
    over: <><path d="M17.6 24.4 h14 q0 8 -7 8 q-7 0 -7 -8 Z M33.4 24.4 h14 q0 8 -7 8 q-7 0 -7 -8 Z" fill={INK} /><path d="M31.6 25.4 h1.8" {...thin} /></> },
  { id: 'm-mop', label: '더벅머리', category: 'man', bg: C.white, eyes: 'wink', mouth: 'grin',
    under: <path d="M8.6 23 l4 -7.4 l4 5 l3.8 -8 l4.2 6.2 l3.6 -8.6 l4.4 7.2 l3.8 -8 l4 7.4 l4 -6.4 l3.4 8 l4.4 -3.2 l1 7.8" {...line} /> },

  // 여성
  { id: 'w-long', label: '긴 머리', category: 'woman', bg: C.pink, eyes: 'dot', mouth: 'smile', nose: true,
    under: <path d="M12.4 44 q-6 -14 -0.8 -26 q6 -12 20.4 -12.6 q14.4 0.6 20.4 12.6 q5.2 12 -0.8 26" {...line} /> },
  { id: 'w-bangs', label: '앞머리', category: 'woman', bg: C.lime, eyes: 'closed', mouth: 'smile',
    under: <path d="M8.4 22 q23.6 -18 47.2 0 M15 20 q2 4.6 6.4 5.4 M24.6 17.4 q2 5 6.2 6 M34.6 17.4 q2 5 6.2 5.6 M43.4 18.6 q2 4.6 5.6 5" {...line} /> },
  { id: 'w-bun', label: '올림머리', category: 'woman', bg: C.sky, eyes: 'happy', mouth: 'smile', nose: true,
    under: <><circle cx="32" cy="10" r="6.2" fill={INK} /><path d="M11 22 q21 -14 42 0" {...line} /></> },
  { id: 'w-bow', label: '리본', category: 'woman', bg: C.white, eyes: 'wink', mouth: 'smile',
    over: <path d="M40 13 l-7.4 -4.6 v9.4 Z M40 13 l7.4 -4.6 v9.4 Z" fill={C.pink} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /> },
  { id: 'w-flowers', label: '꽃관', category: 'woman', bg: C.lime, eyes: 'closed', mouth: 'smile', nose: true,
    over: <>{[[16, 17], [24.4, 12.4], [32.4, 11], [40.4, 12.4], [48.4, 17]].map(([x, y]) => <path key={x} d={`M${x - 3} ${y} h6 M${x} ${y - 3} v6 M${x - 2.2} ${y - 2.2} l4.4 4.4 M${x + 2.2} ${y - 2.2} l-4.4 4.4`} {...thin} />)}</> },
  { id: 'w-lashes', label: '속눈썹', category: 'woman', bg: C.orange, eyes: 'closed', mouth: 'smile',
    over: <path d="M21 29.6 l-1.6 2.6 M25 31 v3 M29 29.8 l1.6 2.6 M35.6 29.4 l-1.6 2.6 M39.6 30.8 v3 M43.6 29.4 l1.6 2.6" {...thin} /> },
  { id: 'w-earrings', label: '귀걸이', category: 'woman', bg: C.green, eyes: 'dot', mouth: 'smirk', nose: true,
    over: <><circle cx="6.6" cy="40" r="3" fill={C.white} stroke={INK} strokeWidth="1.6" /><circle cx="57.4" cy="40" r="3" fill={C.white} stroke={INK} strokeWidth="1.6" /></> },
  { id: 'w-pony', label: '포니테일', category: 'woman', bg: C.pink, eyes: 'side', mouth: 'smile',
    under: <path d="M10.6 24 q10 -17 30 -14 q14 2 16 12 M50 11 q7 1 8 9" {...line} /> },
  { id: 'w-braids', label: '땋은 머리', category: 'woman', bg: C.sky, eyes: 'happy', mouth: 'grin',
    under: <path d="M11 20 l-3.4 5 l4 4 l-4 5 l4 4 l-3.4 5 M53 20 l3.4 5 l-4 4 l4 5 l-4 4 l3.4 5 M11 20 q21 -14 42 0" {...line} /> },
  { id: 'w-pin', label: '머리핀', category: 'woman', bg: C.white, eyes: 'dot', mouth: 'o',
    over: <path d="M16 15.4 l9.4 -3.6 M17.4 19.4 l9.4 -3.6" stroke={C.orange} strokeWidth="2.6" strokeLinecap="round" /> },

  // 아이
  { id: 'k-baby', label: '아기', category: 'kid', bg: C.orange, eyes: 'big', mouth: 'smile',
    under: <path d="M31 8.6 q6.4 -1.6 5 4.6 q-1.6 3.4 -4.8 1.2" {...line} />, over: <Blush /> },
  { id: 'k-blush', label: '볼빨간', category: 'kid', bg: C.white, eyes: 'happy', mouth: 'grin', over: <Blush opacity={0.9} /> },
  { id: 'k-pacifier', label: '공갈젖꼭지', category: 'kid', bg: C.sky, eyes: 'closed', mouth: 'none',
    over: <><ellipse cx="32.4" cy="42.4" rx="7" ry="4.6" fill={C.pink} stroke={INK} strokeWidth="1.8" /><circle cx="32.4" cy="48.6" r="3.2" {...thin} /></> },
  { id: 'k-tooth', label: '앞니', category: 'kid', bg: C.lime, eyes: 'dot', mouth: 'tooth', over: <Blush opacity={0.6} /> },
  { id: 'k-bigeyes', label: '큰 눈', category: 'kid', bg: C.pink, eyes: 'wide', mouth: 'o' },
  { id: 'k-beanie', label: '털모자', category: 'kid', bg: C.green, eyes: 'dot', mouth: 'smile',
    under: <><path d="M8.6 22 q3 -15 23.4 -15.6 q20.4 0.6 23.4 15.6 Z" fill={C.orange} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /><circle cx="32" cy="6.2" r="4" fill={C.white} stroke={INK} strokeWidth="1.8" /></> },
  { id: 'k-lolly', label: '막대사탕', category: 'kid', bg: C.white, eyes: 'wink', mouth: 'smile',
    over: <><path d="M50 44 l6 11" {...line} /><circle cx="48" cy="40" r="6" fill={C.pink} stroke={INK} strokeWidth="1.8" /><path d="M48 40 q2 -2.4 3 0.4 q-0.8 3 -4 2.2" {...thin} /></> },
  { id: 'k-pigtails', label: '양갈래', category: 'kid', bg: C.orange, eyes: 'happy', mouth: 'grin',
    under: <><circle cx="11.6" cy="14" r="5" fill={INK} /><circle cx="52.4" cy="14" r="5" fill={INK} /></>, over: <Blush opacity={0.6} /> },
  { id: 'k-bandage', label: '반창고', category: 'kid', bg: C.lime, eyes: 'dot', brows: 'worried', mouth: 'wave',
    over: <path d="M41.6 33.6 l8.4 5.4 M44 31 l3.6 10.4" stroke={C.white} strokeWidth="4.2" strokeLinecap="round" /> },
  { id: 'k-tongue', label: '메롱', category: 'kid', bg: C.sky, eyes: 'wink', mouth: 'tongue' },

  // 동물 (ears and noses drawn inside the circle)
  { id: 'a-cat', label: '고양이', category: 'animal', bg: C.orange, eyes: 'happy', mouth: 'none',
    under: <path d="M11 22 l2.6 -13 l10 7.6 M53 22 l-2.6 -13 l-10 7.6" {...line} />,
    over: <><path d="M29.6 36.4 h5.6 l-2.8 3 Z" fill={INK} /><path d="M32.4 39.4 q-2 4 -5 2.4 M32.4 39.4 q2 4 5 2.4 M14 36 h8 M14.6 40.6 l7.4 -2 M50.8 36 h-8 M50.2 40.6 l-7.4 -2" {...thin} /></> },
  { id: 'a-dog', label: '강아지', category: 'animal', bg: C.white, eyes: 'dot', mouth: 'smile',
    under: <><path d="M6 18 q2 -8 10 -6 q2 12 -2 20 q-7 -2 -8 -14 Z M58 18 q-2 -8 -10 -6 q-2 12 2 20 q7 -2 8 -14 Z" fill={C.orange} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /></>,
    over: <ellipse cx="32.4" cy="35" rx="3.6" ry="2.6" fill={INK} /> },
  { id: 'a-rabbit', label: '토끼', category: 'animal', bg: C.pink, eyes: 'dot', mouth: 'none',
    under: <path d="M24 17 q-4 -12 -1 -14 q4 -1 5 13 M40 17 q4 -12 1 -14 q-4 -1 -5 13" {...line} />,
    over: <><path d="M30.2 36.2 h4.4 l-2.2 2.4 Z" fill={INK} /><path d="M32.4 38.6 v2.4 M32.4 41 q-2.6 2.4 -4.6 0.6 M32.4 41 q2.6 2.4 4.6 0.6" {...thin} /><Blush opacity={0.6} /></> },
  { id: 'a-bear', label: '곰', category: 'animal', bg: C.orange, eyes: 'dot', mouth: 'smile',
    under: <><circle cx="13.4" cy="13.4" r="6" fill={C.white} stroke={INK} strokeWidth="1.8" /><circle cx="50.6" cy="13.4" r="6" fill={C.white} stroke={INK} strokeWidth="1.8" /></>,
    over: <><ellipse cx="32.4" cy="38.6" rx="7.4" ry="5.4" fill={C.white} stroke={INK} strokeWidth="1.8" /><ellipse cx="32.4" cy="36.4" rx="2.6" ry="1.8" fill={INK} /></> },
  { id: 'a-pig', label: '돼지', category: 'animal', bg: C.pink, eyes: 'dot', mouth: 'none',
    under: <path d="M12 18 l1 -10 l9 5 M52 18 l-1 -10 l-9 5" {...line} />,
    over: <><ellipse cx="32.4" cy="38" rx="7.6" ry="5.4" fill={C.white} stroke={INK} strokeWidth="1.8" /><circle cx="29.6" cy="38" r="1.4" fill={INK} /><circle cx="35.2" cy="38" r="1.4" fill={INK} /></> },
  { id: 'a-frog', label: '개구리', category: 'animal', bg: C.green, eyes: 'none', mouth: 'grin',
    under: <><circle cx="22" cy="17" r="7" fill={C.white} stroke={INK} strokeWidth="1.8" /><circle cx="42" cy="17" r="7" fill={C.white} stroke={INK} strokeWidth="1.8" /></>,
    over: <><circle cx="23" cy="17.6" r="2.6" fill={INK} /><circle cx="43" cy="17.6" r="2.6" fill={INK} /></> },
  { id: 'a-fox', label: '여우', category: 'animal', bg: C.orange, eyes: 'closed', mouth: 'smirk',
    under: <path d="M9 24 l3 -16 l12 8 Z M55 24 l-3 -16 l-12 8 Z" fill={C.white} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />,
    over: <circle cx="32.4" cy="36" r="2" fill={INK} /> },
  { id: 'a-mouse', label: '생쥐', category: 'animal', bg: C.white, eyes: 'dot', mouth: 'smile',
    under: <><circle cx="11.6" cy="15" r="7.6" fill={C.pink} stroke={INK} strokeWidth="1.8" /><circle cx="52.4" cy="15" r="7.6" fill={C.pink} stroke={INK} strokeWidth="1.8" /></>,
    over: <><circle cx="32.4" cy="35.4" r="2" fill={INK} /><path d="M16 36 h8 M40.8 36 h8" {...thin} /></> },
  { id: 'a-chick', label: '병아리', category: 'animal', bg: C.lime, eyes: 'dot', mouth: 'none',
    under: <path d="M29.6 9.4 q2.4 -5 3.4 1.4 q2.4 -5 3.4 1" {...line} />,
    over: <path d="M27.2 35.6 l5.2 -1.4 l5.2 1.4 l-5.2 4.6 Z" fill={C.orange} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" /> },
  { id: 'a-fish', label: '물고기', category: 'animal', bg: C.sky, eyes: 'wide', mouth: 'o',
    under: <path d="M30 8 q6 4 10 0 M50 32 l8 -5 v10 Z" {...line} />,
    over: <><circle cx="13" cy="44" r="2" {...thin} /><circle cx="9.6" cy="37.6" r="1.4" {...thin} /></> },

  // 사물
  { id: 'o-sun', label: '해', category: 'object', bg: C.orange, eyes: 'happy', mouth: 'smile',
    under: <>{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <path key={i} d={`M${32 + Math.cos(a) * 25} ${32 + Math.sin(a) * 25} L${32 + Math.cos(a) * 29.4} ${32 + Math.sin(a) * 29.4}`} {...line} />; })}</> },
  { id: 'o-moon', label: '달', category: 'object', bg: C.lime, eyes: 'closed', mouth: 'smile',
    under: <><circle cx="14" cy="21" r="4" {...thin} /><circle cx="48" cy="46" r="5" {...thin} /><circle cx="19" cy="49" r="2.6" {...thin} /><circle cx="50" cy="16" r="2.2" {...thin} /></> },
  { id: 'o-cloud', label: '구름', category: 'object', bg: C.sky, eyes: 'sleepy', mouth: 'smile',
    under: <path d="M12 44 q-6 -2 -4.6 -8.4 q1.6 -5 7 -4.4 q0 -9 9.4 -10 q7 -0.4 9.4 5.2 q2.4 -4.4 8 -3 q6.4 2 5.4 8.6 q6 1 5 7 q-1 5 -6 5 Z" transform="translate(-5 -9) scale(1.16)" fill={C.white} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /> },
  { id: 'o-globe', label: '지구', category: 'object', bg: C.green, eyes: 'dot', mouth: 'grin',
    under: <path d="M32 3 q-14 14 0 58 M32 3 q14 14 0 58 M4 32 h56 M8 18 h48 M8 46 h48" {...thin} opacity={0.35} /> },
  { id: 'o-planet', label: '행성', category: 'object', bg: C.pink, eyes: 'star', mouth: 'o',
    over: <ellipse cx="32" cy="52" rx="30" ry="5.4" transform="rotate(-8 32 52)" fill="none" stroke={C.white} strokeWidth="2.6" /> },
  { id: 'o-donut', label: '도넛', category: 'object', bg: C.pink, eyes: 'dot', mouth: 'smile',
    under: <>{[[14, 16, 30], [22, 11, -20], [44, 12, 40], [51, 22, -10], [12, 26, 60], [50, 44, 20], [16, 48, -40]].map(([x, y, r]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="1.8" rx="0.9" transform={`rotate(${r} ${x} ${y})`} fill={[C.sky, C.lime, C.white][x % 3]} />)}</> },
  { id: 'o-apple', label: '사과', category: 'object', bg: C.orange, eyes: 'dot', mouth: 'smirk',
    under: <><path d="M32 12 q1 -5 -1 -8" {...line} /><path d="M33 9 q7 -6 12 -2 q-6 6 -12 2 Z" fill={C.green} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /></> },
  { id: 'o-onigiri', label: '주먹밥', category: 'object', bg: C.white, eyes: 'closed', mouth: 'smile',
    under: <rect x="18" y="47" width="28" height="13" rx="2" fill={INK} /> },
  { id: 'o-cookie', label: '쿠키', category: 'object', bg: C.lime, eyes: 'happy', mouth: 'grin',
    under: <>{[[14, 18], [48, 16], [12, 42], [50, 44], [30, 55], [40, 8]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={INK} opacity={0.8} />)}</> },
  { id: 'o-balloon', label: '풍선', category: 'object', bg: C.sky, eyes: 'dot', mouth: 'smile',
    under: <path d="M14 14 q4 -6 10 -7" stroke={C.white} strokeWidth="2.6" strokeLinecap="round" fill="none" />,
    over: <path d="M30 60 l2.4 -3.6 l2.4 3.6 Z" fill={INK} /> },
];

function Avatar({ spec, className }: { spec: Spec; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="32" fill={spec.bg} />
      {spec.under}
      <BrowsPart kind={spec.brows} />
      <EyesPart kind={spec.eyes} />
      {spec.nose && <Nose />}
      <MouthPart kind={spec.mouth} />
      {spec.over}
    </svg>
  );
}

type AvatarArt = React.FC<{ className?: string }>;

export interface FlatAvatarPreset {
  id: string;
  label: string;
  category: AvatarCategory;
  art: AvatarArt;
}

export const AVATAR_CATEGORIES: { id: AvatarCategory; label: string }[] = [
  { id: 'man', label: '남성' },
  { id: 'woman', label: '여성' },
  { id: 'kid', label: '아이' },
  { id: 'animal', label: '동물' },
  { id: 'object', label: '사물' },
];

export const FLAT_AVATARS: FlatAvatarPreset[] = SPECS.map(spec => ({
  id: spec.id,
  label: spec.label,
  category: spec.category,
  art: ({ className }) => <Avatar spec={spec} className={className} />,
}));

// Earlier preset ids → the doodle that replaces them
const LEGACY: Record<string, string> = {
  user: 'm-crew', smile: 'w-long', 'smile-plus': 'w-bun', laugh: 'm-cap', meh: 'm-glasses',
  frown: 'k-beanie', heart: 'w-braids', baby: 'k-baby', bird: 'a-chick', cat: 'a-cat',
  dog: 'a-dog', rabbit: 'a-rabbit', fish: 'a-fish',
};

export function flatAvatarById(id?: string): FlatAvatarPreset | undefined {
  if (!id) return undefined;
  const key = LEGACY[id] || id;
  return FLAT_AVATARS.find(a => a.id === key);
}

/** A stable doodle for someone who has not picked one, from their id or name */
export function flatAvatarFor(seed: string): FlatAvatarPreset {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FLAT_AVATARS[h % FLAT_AVATARS.length];
}
