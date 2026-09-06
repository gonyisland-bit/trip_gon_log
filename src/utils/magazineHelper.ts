import { TimelineItem, Trip } from '../types';

/**
 * Resolves the display location string for a timeline item in magazine context:
 * 1. If the item has a valid location distinct from empty and from place name, use it.
 * 2. If the item has no location or it is identical to item.place:
 *    Search chronologically backwards for the closest prior timeline item that has a valid location!
 * 3. If no prior item has a location, check items on the same date.
 * 4. Fallback to parentTrip.locationStr or country.
 * 5. NEVER return item.place when item.place is already the title.
 */
export function resolveTimelinePlaceName(
  item: TimelineItem,
  allTimelineItemsForTrip: TimelineItem[],
  parentTrip?: Trip
): string {
  const pName = (item.place || '').trim().toLowerCase();

  // 1. If item has its own valid location distinct from place name
  if (item.location && item.location.trim() !== '' && item.location.trim().toLowerCase() !== pName) {
    return item.location.trim();
  }

  // 2. Search chronologically backwards for the closest prior item with a valid location
  const sorted = [...allTimelineItemsForTrip].sort((a, b) => {
    const keyA = `${a.date || ''} ${a.time || ''}`;
    const keyB = `${b.date || ''} ${b.time || ''}`;
    return keyA.localeCompare(keyB);
  });

  const currentIndex = sorted.findIndex(t => Number(t.id) === Number(item.id));
  if (currentIndex > 0) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevLoc = sorted[i]?.location?.trim();
      if (prevLoc && prevLoc.toLowerCase() !== pName) {
        return prevLoc;
      }
    }
  }

  // 3. Search same date items with a valid location
  const sameDateItem = sorted.find(t => 
    t.date === item.date && 
    t.location && 
    t.location.trim() !== '' && 
    t.location.trim().toLowerCase() !== pName
  );
  if (sameDateItem?.location?.trim()) {
    return sameDateItem.location.trim();
  }

  // 4. Fallback to parentTrip locationStr / locations / country
  if (parentTrip?.locationStr?.trim()) {
    return parentTrip.locationStr.trim();
  }
  if (parentTrip?.locations && parentTrip.locations[0]?.name?.trim()) {
    return parentTrip.locations[0].name.trim();
  }
  if (parentTrip?.country?.trim()) {
    return parentTrip.country.trim();
  }

  return 'VISITED PLACE';
}
