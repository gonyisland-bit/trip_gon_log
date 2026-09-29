// Small copies of photos for cards and grids (v1.3.5 P5-b1). The original is downloaded,
// shrunk in the browser and stored in R2; callers record the copy's address with the item.
import { compressImage } from './imageHelper';
import { R2_PUBLIC_URL, uploadFileToR2 } from './storageHelper';

/** Downloads a photo, shrinks it to maxWidth and stores the copy in R2 under folder/ */
export async function buildImageThumb(photoUrl: string, maxWidth: number, folder: string): Promise<string> {
  // no-store: the <img> already cached this file without CORS headers, which a CORS fetch can't reuse
  const res = await fetch(photoUrl, { mode: 'cors', cache: 'no-store' });
  if (!res.ok) throw new Error(`thumb fetch ${res.status}`);
  const blob = await res.blob();
  const small = await compressImage(new File([blob], 'thumb.jpg', { type: blob.type || 'image/jpeg' }), { maxWidth, maxHeight: 4000, quality: 0.78 });
  return uploadFileToR2(small, `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`);
}

/** Only our own uploads get copies; outside images (Unsplash etc.) are already served at a sensible size */
export function isOwnPhoto(url: string | undefined | null): url is string {
  return !!url && url.startsWith(`${R2_PUBLIC_URL}/`) && !/_thumbs\//.test(url);
}
