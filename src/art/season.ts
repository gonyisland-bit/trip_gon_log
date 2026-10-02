import type { ArtId } from './catalog';

/** The bear of the season, for a month (0 = January): spring March to May, summer June to August, autumn September to November */
export function seasonArt(monthIndex: number): ArtId {
  const m = ((monthIndex % 12) + 12) % 12;
  if (m >= 2 && m <= 4) return 'season-spring';
  if (m >= 5 && m <= 7) return 'season-summer';
  if (m >= 8 && m <= 10) return 'season-autumn';
  return 'season-winter';
}
