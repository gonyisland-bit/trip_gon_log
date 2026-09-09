import { TimelineItem, Trip, MagazineSection, MagazineItem } from '../types';

// Convert "10:30 AM" or "15:30" into total minutes from midnight for accurate chronological sorting
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 720; // default 12:00 PM
  const clean = timeStr.trim();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
  if (!match) return 720;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

// Convert YYYY.MM.DD or YYYY-MM-DD or Day X to comparable number
function parseDateScore(dateStr?: string): number {
  if (!dateStr) return 99999999;
  const clean = dateStr.trim();
  const dateMatch = clean.match(/(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (dateMatch) {
    const y = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const d = parseInt(dateMatch[3], 10);
    return y * 10000 + m * 100 + d;
  }
  const dayMatch = clean.match(/day\s*(\d+)/i);
  if (dayMatch) {
    return 20000100 + parseInt(dayMatch[1], 10);
  }
  return 99999999;
}

/**
 * Resolves the display location string for a timeline item in magazine context:
 * 1. If the item has a valid location distinct from empty and from place name, use it.
 * 2. If the item has no location or it is identical to item.place:
 *    Search chronologically backwards for the closest prior timeline item that has a valid location!
 *    (e.g., if items 1, 2 have locations and items 3, 4 don't, item 4 inherits item 2's location).
 * 3. Fallback to parentTrip.locationStr or country.
 * 4. NEVER return item.place when item.place is already the title.
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

  // 2. Sort all timeline items chronologically: Date -> Time (in minutes) -> ID
  const sorted = [...allTimelineItemsForTrip].sort((a, b) => {
    const dScoreA = parseDateScore(a.date);
    const dScoreB = parseDateScore(b.date);
    if (dScoreA !== dScoreB) return dScoreA - dScoreB;

    const tMinutesA = parseTimeToMinutes(a.time);
    const tMinutesB = parseTimeToMinutes(b.time);
    if (tMinutesA !== tMinutesB) return tMinutesA - tMinutesB;

    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  const currentIndex = sorted.findIndex(t => Number(t.id) === Number(item.id));
  
  if (currentIndex > 0) {
    // Search backwards from the immediate prior item
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevLoc = sorted[i]?.location?.trim();
      if (prevLoc && prevLoc.toLowerCase() !== pName) {
        return prevLoc;
      }
    }
  } else if (currentIndex === -1) {
    // If not found by ID (e.g. newly created before ID match), find by target date/time
    const targetDateScore = parseDateScore(item.date);
    const targetTimeMinutes = parseTimeToMinutes(item.time);
    const earlierItems = sorted.filter(t => {
      const d = parseDateScore(t.date);
      if (d < targetDateScore) return true;
      if (d === targetDateScore) return parseTimeToMinutes(t.time) <= targetTimeMinutes;
      return false;
    });

    for (let i = earlierItems.length - 1; i >= 0; i--) {
      const prevLoc = earlierItems[i]?.location?.trim();
      if (prevLoc && prevLoc.toLowerCase() !== pName) {
        return prevLoc;
      }
    }
  }

  // 3. Search any item on the same date with a valid location
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

/**
 * Builds standard starter/fallback magazine sections (Main + up to 2 featured journeys)
 */
export function buildDefaultMagazineSections(
  trips: Trip[],
  magazineMoments?: MagazineItem[]
): MagazineSection[] {
  const mainTrip = trips[0];
  const secondTrip = trips[1];
  const thirdTrip = trips[2];

  const makeStarterItems = (trip?: Trip): MagazineItem[] => {
    if (!trip) return [];
    const items: MagazineItem[] = [];
    if (trip.img) {
      items.push({
        id: `starter-${trip.id}-cover`,
        tripId: trip.id,
        title: trip.title.replace(/\s*\(Plan\)$/i, ''),
        date: trip.date,
        location: trip.locationStr || trip.country,
        placeName: (trip.locations && trip.locations[0]?.name) || trip.locationStr,
        caption: '',
        img: trip.img,
        layoutType: 'tall',
        order: 0,
      });
    }
    if (trip.gallery && Array.isArray(trip.gallery)) {
      trip.gallery.slice(0, 5).forEach((g: any, gIdx) => {
        const url = typeof g === 'string' ? g : g?.url;
        if (url) {
          items.push({
            id: `starter-${trip.id}-g-${gIdx}`,
            tripId: trip.id,
            title: (typeof g === 'object' && g?.place) ? g.place : trip.title.replace(/\s*\(Plan\)$/i, ''),
            date: (typeof g === 'object' && g?.date) ? g.date : trip.date,
            location: trip.locationStr || trip.country,
            placeName: (typeof g === 'object' && g?.place) ? g.place : trip.locationStr,
            caption: typeof g === 'object' ? g?.imgNote || '' : '',
            img: url,
            layoutType: gIdx % 2 === 0 ? 'normal' : 'tall',
            order: items.length,
          });
        }
      });
    }
    return items;
  };

  const starterSections: MagazineSection[] = [
    {
      id: 'main',
      title: 'MAGAZINE HOME',
      subtitle: 'Curated Moments & Editorial Stories',
      heroImg: mainTrip?.heroImg || mainTrip?.img || '',
      heroTitle: 'The Other Side of Paradise',
      heroDate: mainTrip?.date || '2024 — 2026',
      heroLocation: mainTrip?.locationStr || 'GLOBAL ARCHIVE',
      heroTripId: undefined,
      items: (magazineMoments && magazineMoments.length > 0) ? magazineMoments : makeStarterItems(mainTrip),
      order: 0,
      isDefault: true,
    }
  ];

  if (secondTrip) {
    starterSections.push({
      id: `section-${secondTrip.id}`,
      title: secondTrip.title.replace(/\s*\(Plan\)$/i, '').toUpperCase(),
      subtitle: `${secondTrip.date} · ${secondTrip.locationStr || secondTrip.country || 'JOURNEY'}`,
      heroImg: secondTrip.heroImg || secondTrip.img || '',
      heroTitle: secondTrip.title.replace(/\s*\(Plan\)$/i, ''),
      heroDate: secondTrip.date,
      heroLocation: secondTrip.locationStr || secondTrip.country,
      heroTripId: secondTrip.id,
      items: makeStarterItems(secondTrip),
      order: 1,
    });
  }

  if (thirdTrip) {
    starterSections.push({
      id: `section-${thirdTrip.id}`,
      title: thirdTrip.title.replace(/\s*\(Plan\)$/i, '').toUpperCase(),
      subtitle: `${thirdTrip.date} · ${thirdTrip.locationStr || thirdTrip.country || 'JOURNEY'}`,
      heroImg: thirdTrip.heroImg || thirdTrip.img || '',
      heroTitle: thirdTrip.title.replace(/\s*\(Plan\)$/i, ''),
      heroDate: thirdTrip.date,
      heroLocation: thirdTrip.locationStr || thirdTrip.country,
      heroTripId: thirdTrip.id,
      items: makeStarterItems(thirdTrip),
      order: 2,
    });
  }

  return starterSections;
}

/**
 * Calculates optimal 2-col and 3-col editorial row layout pattern ('PL', 'PPP', 'LP', 'LL')
 * so that magazine cards display in visually balanced magazine editorial layouts without hanging single cards.
 */
export function computeEditorialLayoutTypes(count: number): ('portrait' | 'landscape')[] {
  if (count <= 0) return [];
  if (count === 1) return ['landscape'];

  const plannedRowTypes: ('PL' | 'PPP' | 'LP' | 'LL')[] = [];
  const rowCycle: ('PL' | 'PPP' | 'LP' | 'LL')[] = ['PL', 'PPP', 'LP', 'LL', 'PL', 'LL', 'LP', 'PPP'];
  let rem = count;
  let cycleIdx = 0;

  while (rem > 0) {
    if (rem === 1) {
      break;
    }
    if (rem === 5) {
      plannedRowTypes.push(cycleIdx % 2 === 0 ? 'PL' : 'LP');
      plannedRowTypes.push('PPP');
      rem -= 5;
      break;
    }
    if (rem === 4) {
      plannedRowTypes.push('PL');
      plannedRowTypes.push('LP');
      rem -= 4;
      break;
    }
    if (rem === 3) {
      plannedRowTypes.push('PPP');
      rem -= 3;
      break;
    }
    if (rem === 2) {
      const pref = rowCycle[cycleIdx % rowCycle.length];
      plannedRowTypes.push(pref === 'PPP' ? 'LL' : pref);
      rem -= 2;
      break;
    }

    const preferred = rowCycle[cycleIdx % rowCycle.length];
    cycleIdx++;
    const rowLen = preferred === 'PPP' ? 3 : 2;

    if (rem - rowLen === 1) {
      if (rowLen === 2) {
        plannedRowTypes.push('PPP');
        rem -= 3;
      } else {
        plannedRowTypes.push('PL');
        rem -= 2;
      }
    } else {
      plannedRowTypes.push(preferred);
      rem -= rowLen;
    }
  }

  const assignedLayoutTypes: ('portrait' | 'landscape')[] = [];
  plannedRowTypes.forEach(r => {
    if (r === 'PL') {
      assignedLayoutTypes.push('portrait', 'landscape');
    } else if (r === 'LP') {
      assignedLayoutTypes.push('landscape', 'portrait');
    } else if (r === 'PPP') {
      assignedLayoutTypes.push('portrait', 'portrait', 'portrait');
    } else if (r === 'LL') {
      assignedLayoutTypes.push('landscape', 'landscape');
    }
  });

  while (assignedLayoutTypes.length < count) {
    assignedLayoutTypes.push('landscape');
  }

  return assignedLayoutTypes;
}

/**
 * Compares two MagazineItems chronologically based on their linked timeline item's
 * date -> time -> displayOrder -> id, preserving custom text cards in appropriate order.
 */
export function compareMagazineItemsChronologically(
  a: MagazineItem,
  b: MagazineItem,
  timelineMap: Map<string | number, TimelineItem>
): number {
  const tA = a.timelineItemId !== undefined ? timelineMap.get(a.timelineItemId) || timelineMap.get(Number(a.timelineItemId)) : undefined;
  const tB = b.timelineItemId !== undefined ? timelineMap.get(b.timelineItemId) || timelineMap.get(Number(b.timelineItemId)) : undefined;

  const dateA = (tA?.date || a.date || '').trim();
  const dateB = (tB?.date || b.date || '').trim();
  if (dateA && dateB && dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  const timeA = (tA?.time || (tA as any)?.startTime || '').trim();
  const timeB = (tB?.time || (tB as any)?.startTime || '').trim();
  if (timeA && timeB && timeA !== timeB) {
    return timeA.localeCompare(timeB);
  }
  if (timeA && !timeB) return -1;
  if (!timeA && timeB) return 1;

  const orderA = typeof (tA as any)?.displayOrder === 'number' ? (tA as any).displayOrder : -1;
  const orderB = typeof (tB as any)?.displayOrder === 'number' ? (tB as any).displayOrder : -1;
  if (orderA !== -1 && orderB !== -1 && orderA !== orderB) {
    return orderA - orderB;
  }

  const idA = tA ? Number(tA.id) : 999999;
  const idB = tB ? Number(tB.id) : 999999;
  if (idA !== idB) {
    return idA - idB;
  }

  return (a.order ?? 0) - (b.order ?? 0);
}

