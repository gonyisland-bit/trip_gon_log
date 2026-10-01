// Flat illustrations instead of stock photos (v1.3.7): a tinted tile with one flat scene drawn in
// the hub tints and an ink monoline, chosen by what a place or a plan item is. Used for city and
// template thumbnails in the New trip sheet and as the cover of a journey made from a template,
// so no card ever shows the same borrowed photo (or a broken one).

export type ArtKind =
  | 'beach' | 'mountain' | 'city' | 'temple'          // places
  | 'meal' | 'cafe' | 'landmark' | 'stay' | 'transit' // plan items
  | 'shopping' | 'night' | 'art' | 'market' | 'activity';

const TINTS = [
  { bg: '#F6CDB6', deep: '#EF8F70' }, // peach / coral
  { bg: '#F7DB6A', deep: '#E9B949' }, // butter
  { bg: '#C9D8BC', deep: '#9DB58A' }, // sage
  { bg: '#DCE3E8', deep: '#B6C4CF' }, // mist
  { bg: '#E7D7F3', deep: '#CDB7E2' }, // lilac
];
const INK = '#141412', RED = '#E5412D', CREAM = '#FFFDF9', SUN = '#F2B33D';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const line = `stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;

function scene(kind: ArtKind, deep: string): string {
  switch (kind) {
    case 'beach': return `
      <circle cx="70" cy="34" r="12" fill="${SUN}" ${line}/>
      <path d="M0 66 Q25 60 50 66 T100 66 V100 H0Z" fill="${deep}" ${line}/>
      <path d="M8 78 q8 -4 16 0 M52 84 q8 -4 16 0" fill="none" ${line}/>
      <path d="M30 66 Q28 46 36 30" fill="none" ${line}/>
      <path d="M36 30 q-14 -2 -20 8 M36 30 q-4 -12 -16 -12 M36 30 q8 -10 20 -6 M36 30 q12 0 16 10" fill="none" ${line}/>`;
    case 'mountain': return `
      <circle cx="74" cy="28" r="9" fill="${SUN}" ${line}/>
      <path d="M0 80 L30 38 L46 58 L62 34 L100 80 V100 H0Z" fill="${deep}" ${line}/>
      <path d="M24 46 l6 -8 l6 8 M56 42 l6 -8 l6 9" fill="${CREAM}" ${line}/>`;
    case 'temple': return `
      <path d="M22 44 H78 L70 36 H30Z" fill="${RED}" ${line}/>
      <path d="M28 44 V80 M72 44 V80 M24 56 H76" fill="none" ${line}/>
      <path d="M14 36 H86" fill="none" ${line}/>
      <path d="M0 80 H100 V100 H0Z" fill="${deep}" ${line}/>`;
    case 'landmark': return `
      <path d="M50 18 L62 80 H38Z" fill="${CREAM}" ${line}/>
      <path d="M43 54 H57 M41 66 H59" fill="none" ${line}/>
      <path d="M0 80 H100 V100 H0Z" fill="${deep}" ${line}/>
      <circle cx="78" cy="28" r="7" fill="${SUN}" ${line}/>`;
    case 'meal': return `
      <path d="M22 54 H78 Q76 78 50 80 Q24 78 22 54Z" fill="${CREAM}" ${line}/>
      <path d="M30 54 Q40 44 50 50 Q60 42 70 54" fill="${deep}" ${line}/>
      <path d="M64 22 L48 50 M74 24 L56 50" fill="none" ${line}/>`;
    case 'cafe': return `
      <path d="M26 44 H66 V68 Q66 80 46 80 Q26 80 26 68Z" fill="${CREAM}" ${line}/>
      <path d="M66 50 Q80 50 78 60 Q76 68 66 66" fill="none" ${line}/>
      <path d="M38 22 q-6 8 0 14 M50 20 q-6 8 0 14" fill="none" ${line}/>
      <path d="M18 84 H76" fill="none" ${line}/>`;
    case 'stay': return `
      <path d="M20 50 L50 26 L80 50 V80 H20Z" fill="${CREAM}" ${line}/>
      <path d="M42 80 V62 H58 V80" fill="${deep}" ${line}/>
      <circle cx="50" cy="46" r="5" fill="${SUN}" ${line}/>`;
    case 'transit': return `
      <path d="M14 58 L86 40 Q92 39 90 45 L78 52 L24 64Z" fill="${CREAM}" ${line}/>
      <path d="M50 49 L40 30 L48 28 L64 46 M38 60 L36 72 L44 71 L50 58" fill="${deep}" ${line}/>
      <path d="M8 84 H40 M58 84 H92" fill="none" ${line}/>`;
    case 'shopping': return `
      <path d="M28 40 H72 L76 82 H24Z" fill="${deep}" ${line}/>
      <path d="M40 40 V34 Q40 24 50 24 Q60 24 60 34 V40" fill="none" ${line}/>
      <circle cx="40" cy="52" r="2" fill="${INK}"/><circle cx="60" cy="52" r="2" fill="${INK}"/>`;
    case 'night': return `
      <path d="M62 20 A20 20 0 1 0 80 48 A16 16 0 1 1 62 20Z" fill="${SUN}" ${line}/>
      <path d="M10 82 V60 H24 V82 M28 82 V50 H42 V82 M46 82 V64 H58 V82" fill="${deep}" ${line}/>
      <path d="M0 82 H100" fill="none" ${line}/>`;
    case 'art': return `
      <rect x="22" y="22" width="56" height="48" rx="3" fill="${CREAM}" ${line}/>
      <path d="M28 64 L44 44 L54 56 L62 48 L72 64Z" fill="${deep}" ${line}/>
      <circle cx="64" cy="34" r="5" fill="${SUN}" ${line}/>
      <path d="M50 70 V84 M40 84 H60" fill="none" ${line}/>`;
    case 'market': return `
      <path d="M16 40 H84 L78 52 H22Z" fill="${RED}" ${line}/>
      <path d="M22 52 V82 M78 52 V82" fill="none" ${line}/>
      <circle cx="40" cy="70" r="7" fill="${SUN}" ${line}/><circle cx="58" cy="70" r="7" fill="${deep}" ${line}/>
      <path d="M12 82 H88" fill="none" ${line}/>`;
    case 'activity': return `
      <circle cx="50" cy="48" r="20" fill="${CREAM}" ${line}/>
      <path d="M50 28 V68 M30 48 H70 M36 34 Q50 48 36 62 M64 34 Q50 48 64 62" fill="none" ${line}/>
      <path d="M10 84 H90" fill="none" ${line}/>`;
    default: return `
      <path d="M10 80 V50 H26 V80 M30 80 V34 H48 V80 M52 80 V44 H66 V80 M70 80 V56 H88 V80" fill="${deep}" ${line}/>
      <path d="M36 42 h6 M36 52 h6 M36 62 h6" fill="none" ${line}/>
      <path d="M0 80 H100 V100 H0Z" fill="${CREAM}" ${line}/>
      <circle cx="80" cy="26" r="8" fill="${SUN}" ${line}/>`;
  }
}

/** One illustration as an SVG string; `seed` picks the tint so neighbours differ */
export function artSvg(kind: ArtKind, seed = ''): string {
  const t = TINTS[hash(seed + kind) % TINTS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${t.bg}"/>${scene(kind, t.deep)}</svg>`;
}

export function artDataUrl(kind: ArtKind, seed = ''): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(artSvg(kind, seed))}`;
}

/** What a city is like, from its tags; several fit most cities, and `seed` picks one so cities differ */
export function placeKind(tags: string[] = [], seed = ''): ArtKind {
  const t = tags.join(' ').toLowerCase();
  const fits: ArtKind[] = [];
  if (/beach|island|resort|해변|바다|휴양|섬/.test(t)) fits.push('beach');
  if (/mountain|nature|hiking|trek|산|자연|트레킹|국립공원/.test(t)) fits.push('mountain');
  if (/temple|history|culture|heritage|역사|문화|사원|유적/.test(t)) fits.push('temple', 'landmark');
  if (/food|미식|맛집|시장|market/.test(t)) fits.push('market', 'meal');
  if (/night|야경|nightlife/.test(t)) fits.push('night');
  if (/art|museum|미술|예술/.test(t)) fits.push('art');
  if (/shopping|쇼핑/.test(t)) fits.push('shopping');
  if (!fits.length) fits.push('city', 'landmark', 'night');
  return fits[hash(seed) % fits.length];
}

/** A city's thumbnail: its own photo when it has one, else a flat scene for what it is */
export const GENERIC_COVER = 'photo-1488646953014-85cb44e25828';
export function cityThumb(city: { nameEn: string; tags?: string[]; coverImage?: string }): string {
  if (city.coverImage && !city.coverImage.includes(GENERIC_COVER)) return city.coverImage;
  return artDataUrl(placeKind(city.tags, city.nameEn), city.nameEn);
}

/** The kind of a plan item, from its type, category and title */
export function itemKind(item: { type?: string; category?: string; title?: string }): ArtKind {
  const s = `${item.category || ''} ${item.title || ''}`;
  if (item.type === 'transit' || /교통|공항|이동/.test(s)) return 'transit';
  if (item.type === 'stay' || /숙소|체크인|체크아웃|호텔/.test(s)) return 'stay';
  if (/카페|커피|디저트|베이커리|브런치/.test(s)) return 'cafe';
  if (/야경|나이트|바 |루프탑/.test(s)) return 'night';
  if (/시장|마켓/.test(s)) return 'market';
  if (/쇼핑|편집숍|백화점/.test(s)) return 'shopping';
  if (/미술관|박물관|갤러리|전시/.test(s)) return 'art';
  if (item.type === 'dining' || /식사|맛집|런치|디너|미식/.test(s)) return 'meal';
  if (/체험|투어|액티비티|트레킹|서핑|스파/.test(s)) return 'activity';
  return 'landmark';
}

/** A template's thumbnail from its theme */
export function themeKind(theme: string): ArtKind {
  return ({ food: 'meal', shopping: 'shopping', nature: 'mountain', art: 'art', activity: 'activity', relax: 'beach' } as Record<string, ArtKind>)[theme] || 'landmark';
}
