// Which image a journey card or gallery tile should load (v1.3.5 P5-b1, spec 5.1).
// A copy is used only while it still belongs to the current original; otherwise the original.
import type { Trip } from '../types';
import { getEffectiveImageUrl } from './storageHelper';
import { isOwnPhoto } from './imageThumbs';
import { artDataUrl, GENERIC_COVER } from './placeArt';

/** Cover for cards and list rows: the 960px copy when it matches the cover, else the cover */
export function cardCoverUrl(trip: Pick<Trip, 'img' | 'imgSmall' | 'imgSmallSrc'>): string {
  const cover = getEffectiveImageUrl(trip.img);
  // Journeys made from a template before v1.3.7 got a shared stock photo that no longer loads
  if (cover.includes(GENERIC_COVER)) return artDataUrl('landmark', cover);
  if (trip.imgSmall && trip.imgSmallSrc && getEffectiveImageUrl(trip.imgSmallSrc) === cover) return trip.imgSmall;
  return cover;
}

/** True when the cover is one of our uploads without an up-to-date copy */
export function needsCoverThumb(trip: Pick<Trip, 'img' | 'imgSmall' | 'imgSmallSrc'>): boolean {
  const cover = getEffectiveImageUrl(trip.img);
  return isOwnPhoto(cover) && cardCoverUrl(trip) === cover;
}

/** Lookup of gallery copies by original (effective) URL */
export function galleryThumbMap(trip: Pick<Trip, 'galleryThumbs'> | null | undefined): Map<string, string> {
  return new Map((trip?.galleryThumbs || []).map(t => [getEffectiveImageUrl(t.src), t.url]));
}
