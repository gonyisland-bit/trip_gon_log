import { TimelineItem } from '../types';
import { SpotPocketItem } from '../types';
import { calculateDistanceInMeters } from './pocketStorage';

export type RadarTargetType = 'trip_spot' | 'pocket';

export interface RadarItem {
  id: string | number;
  type: RadarTargetType;
  title: string;
  distance: number; // in meters (1 ~ 1000)
  lat: number;
  lng: number;
  category?: string;
  memo?: string;
  time?: string;      // trip_spot인 경우 타임라인 시간 (예: '11:30 AM')
  date?: string;      // trip_spot인 경우 날짜
  rawItem: TimelineItem | SpotPocketItem;
}

/**
 * Finds all nearby spots (both from current trip timeline and saved pockets) within radiusMeters (default 1km).
 * Filters out invalid/0m coordinates, duplicate place names, and sorts by closest distance.
 */
export function findUnifiedNearbyTargets(
  userLat: number,
  userLng: number,
  timelineItems: TimelineItem[] = [],
  savedPockets: SpotPocketItem[] = [],
  radiusMeters: number = 1000
): RadarItem[] {
  if (typeof userLat !== 'number' || typeof userLng !== 'number' || isNaN(userLat) || isNaN(userLng)) {
    return [];
  }

  const results: RadarItem[] = [];
  const seenPlaceNames = new Set<string>();

  // 1. Scan Trip Timeline items
  for (const item of timelineItems) {
    if (typeof item.lat === 'number' && typeof item.lng === 'number' && !isNaN(item.lat) && !isNaN(item.lng)) {
      const dist = calculateDistanceInMeters(userLat, userLng, item.lat, item.lng);
      // Valid distance between 1m and radiusMeters (avoiding 0m virtual overlap bugs)
      if (dist > 0 && dist <= radiusMeters) {
        const normTitle = (item.place || '').trim().toLowerCase();
        if (normTitle && !seenPlaceNames.has(normTitle)) {
          seenPlaceNames.add(normTitle);
          results.push({
            id: `timeline-${item.id}`,
            type: 'trip_spot',
            title: item.place || '여정 일정 장소',
            distance: dist,
            lat: item.lat,
            lng: item.lng,
            category: item.type,
            memo: item.memo,
            time: item.time,
            date: item.date,
            rawItem: item
          });
        }
      }
    }
  }

  // 2. Scan Saved Pockets
  for (const pocket of savedPockets) {
    if (typeof pocket.lat === 'number' && typeof pocket.lng === 'number' && !isNaN(pocket.lat) && !isNaN(pocket.lng)) {
      const dist = calculateDistanceInMeters(userLat, userLng, pocket.lat, pocket.lng);
      if (dist > 0 && dist <= radiusMeters) {
        const normTitle = (pocket.title || '').trim().toLowerCase();
        // If already in timeline results, don't duplicate
        if (normTitle && !seenPlaceNames.has(normTitle)) {
          seenPlaceNames.add(normTitle);
          results.push({
            id: `pocket-${pocket.id}`,
            type: 'pocket',
            title: pocket.title || '보관함 포켓',
            distance: dist,
            lat: pocket.lat,
            lng: pocket.lng,
            category: pocket.category,
            memo: pocket.memo,
            rawItem: pocket
          });
        }
      }
    }
  }

  // Sort by closest distance
  return results.sort((a, b) => a.distance - b.distance);
}
