// Place art (v1.3.8): the thumbnail and cover of a place, a template or a plan item is one scene
// from the traveler sheet (public/art, drawn from assets/art-sheet.webp), on its hub tint.
// Each kind has a few scenes and `seed` picks one, so cities of one kind still differ.
import { KIND_ART, KIND_TINT } from '../art/catalog';

export type ArtKind =
  | 'beach' | 'mountain' | 'city' | 'temple'          // places
  | 'meal' | 'cafe' | 'landmark' | 'stay' | 'transit' // plan items
  | 'shopping' | 'night' | 'art' | 'market' | 'activity';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A tile (scene on its tint) for a kind; a plain path, so it also works stored as a cover */
export function kindArtUrl(kind: ArtKind, seed = ''): string {
  const ids = KIND_ART[kind] || KIND_ART.landmark;
  const id = ids[hash(seed + kind) % ids.length];
  return `/art/tile/${id}-${KIND_TINT[kind] || 'mist'}.svg`;
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
  return kindArtUrl(placeKind(city.tags, city.nameEn), city.nameEn);
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
