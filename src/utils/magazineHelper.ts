import { TimelineItem, Trip, Plan, MagazineSection, MagazineItem } from '../types';

// Convert "10:30 AM" or "15:30" or "07:00 PM" into total minutes from midnight (0..1440) for accurate sorting
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim();
  if (!clean) return -1;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    const simpleMatch = clean.match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (simpleMatch) {
      let h = parseInt(simpleMatch[1], 10);
      const ampm = simpleMatch[2].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60;
    }
    return -1;
  }
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

// Normalize any date format ("2025.04.12", "2025-04-12", "2025/04/12", "2025.04.12 - 2025.04.15") to standard YYYY-MM-DD
export function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (!clean) return '';
  const dateMatch = clean.match(/(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return clean.split(/\s*[-~]\s*/)[0].trim().replace(/[./]/g, '-');
}

// Sorts trip timeline items in strict canonical chronological order (date -> time in minutes -> displayOrder -> id)
export function getSortedTripTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const dateA = normalizeDateStr(a.date);
    const dateB = normalizeDateStr(b.date);
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const minA = parseTimeToMinutes(a.time || (a as any).startTime);
    const minB = parseTimeToMinutes(b.time || (b as any).startTime);
    if (minA !== -1 && minB !== -1 && minA !== minB) {
      return minA - minB;
    }
    if (minA !== -1 && minB === -1) return -1;
    if (minA === -1 && minB !== -1) return 1;

    const orderA = typeof (a as any).displayOrder === 'number' ? (a as any).displayOrder : -1;
    const orderB = typeof (b as any).displayOrder === 'number' ? (b as any).displayOrder : -1;
    if (orderA !== -1 && orderB !== -1 && orderA !== orderB) {
      return orderA - orderB;
    }

    return (a.id || 0) - (b.id || 0);
  });
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
  const tA = a.timelineItemId !== undefined 
    ? (timelineMap.get(a.timelineItemId) || timelineMap.get(Number(a.timelineItemId)) || timelineMap.get(String(a.timelineItemId))) 
    : (a.img ? timelineMap.get(a.img.trim().split('?')[0]) : undefined);
  const tB = b.timelineItemId !== undefined 
    ? (timelineMap.get(b.timelineItemId) || timelineMap.get(Number(b.timelineItemId)) || timelineMap.get(String(b.timelineItemId))) 
    : (b.img ? timelineMap.get(b.img.trim().split('?')[0]) : undefined);

  const dateA = normalizeDateStr(tA?.date || a.date);
  const dateB = normalizeDateStr(tB?.date || b.date);
  if (dateA && dateB && dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  if (dateA && !dateB) return -1;
  if (!dateA && dateB) return 1;

  const minA = parseTimeToMinutes(tA?.time || (tA as any)?.startTime);
  const minB = parseTimeToMinutes(tB?.time || (tB as any)?.startTime);
  if (minA !== -1 && minB !== -1 && minA !== minB) {
    return minA - minB;
  }
  if (minA !== -1 && minB === -1) return -1;
  if (minA === -1 && minB !== -1) return 1;

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

/**
 * Synchronizes magazine section items with a trip's timeline items:
 * 1. Matches existing cards (by timelineItemId, image URL, or date+place) and updates placeName, title, date, img
 * 2. Detects newly added timeline items with images
 * 3. Integrates new items and sorts all items according to the timeline's strict chronological sequence
 * 4. Balances layout types (computeEditorialLayoutTypes) if items were added
 */
export function syncSectionItemsWithTimeline(
  existingItems: MagazineItem[],
  tripTimelineItems: TimelineItem[],
  parentTrip?: Trip | Plan
): {
  syncedItems: MagazineItem[];
  changesCount: number;
  addedCount: number;
} {
  const sortedTimeline = getSortedTripTimeline(tripTimelineItems);

  // Map timeline items by ID, string ID, and clean image URL
  const timelineItemMap = new Map<string | number, TimelineItem>();
  const timelineIndexMap = new Map<string | number, number>();

  sortedTimeline.forEach((t, idx) => {
    timelineItemMap.set(t.id, t);
    timelineItemMap.set(String(t.id), t);
    timelineIndexMap.set(t.id, idx);
    timelineIndexMap.set(String(t.id), idx);

    if (t.img) {
      const cleanImg = t.img.trim().split('?')[0];
      timelineItemMap.set(cleanImg, t);
      timelineIndexMap.set(cleanImg, idx);
    }
  });

  let changesCount = 0;

  // 1. Update and enrich existing items
  const updatedExistingItems = existingItems.map(item => {
    if (item.isTextOnly || !item.img) return item;

    // Resolve matching timeline item
    let matched: TimelineItem | undefined;
    if (item.timelineItemId !== undefined) {
      matched = timelineItemMap.get(item.timelineItemId) || timelineItemMap.get(String(item.timelineItemId));
    }
    if (!matched && item.img) {
      const cleanImg = item.img.trim().split('?')[0];
      matched = timelineItemMap.get(cleanImg);
    }
    if (!matched && item.date && item.title) {
      const normDate = normalizeDateStr(item.date);
      const cleanTitle = item.title.trim().toLowerCase();
      matched = sortedTimeline.find(t => 
        normalizeDateStr(t.date) === normDate &&
        t.place && t.place.trim().toLowerCase() === cleanTitle
      );
    }

    if (matched) {
      const resolvedLoc = resolveTimelinePlaceName(matched, sortedTimeline, parentTrip);
      const newTitle = matched.place?.trim() || item.title;
      const newDate = matched.date || item.date;
      const newImg = matched.img || item.img;

      if (
        item.title !== newTitle ||
        item.placeName !== resolvedLoc ||
        item.date !== newDate ||
        item.img !== newImg ||
        item.timelineItemId !== matched.id
      ) {
        changesCount++;
        return {
          ...item,
          timelineItemId: matched.id,
          title: newTitle,
          placeName: resolvedLoc,
          date: newDate,
          img: newImg,
        };
      }
    } else {
      // Fix duplicate title/placeName if present
      const pName = (item.placeName || '').trim().toLowerCase();
      const mTitle = (item.title || '').trim().toLowerCase();
      if (pName && mTitle && pName === mTitle) {
        const fallbackLoc = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || parentTrip?.country || 'VISITED PLACE';
        changesCount++;
        return {
          ...item,
          placeName: fallbackLoc,
        };
      }
    }

    return item;
  });

  // Track existing image URLs and timeline IDs
  const existingImages = new Set<string>();
  const existingTimelineIds = new Set<string | number>();

  updatedExistingItems.forEach(item => {
    if (item.img) {
      const clean = item.img.trim();
      existingImages.add(clean);
      existingImages.add(clean.split('?')[0]);
    }
    if (item.timelineItemId !== undefined) {
      existingTimelineIds.add(item.timelineItemId);
      existingTimelineIds.add(String(item.timelineItemId));
      existingTimelineIds.add(Number(item.timelineItemId));
    }
  });

  // 2. Identify newly added timeline items with images
  let addedCount = 0;
  const newCandidateItems: MagazineItem[] = [];
  const tripIdNum = parentTrip ? Number(parentTrip.id) : undefined;

  sortedTimeline.forEach(tItem => {
    const cleanUrl = (tItem.img || '').trim();
    if (!cleanUrl) return;

    const baseCleanUrl = cleanUrl.split('?')[0];
    const isImageSeen = existingImages.has(cleanUrl) || existingImages.has(baseCleanUrl);
    const isIdSeen = tItem.id !== undefined && (
      existingTimelineIds.has(tItem.id) || 
      existingTimelineIds.has(String(tItem.id)) || 
      existingTimelineIds.has(Number(tItem.id))
    );

    if (!isImageSeen && !isIdSeen) {
      existingImages.add(cleanUrl);
      existingImages.add(baseCleanUrl);
      if (tItem.id !== undefined) {
        existingTimelineIds.add(tItem.id);
        existingTimelineIds.add(String(tItem.id));
        existingTimelineIds.add(Number(tItem.id));
      }

      const pName = (tItem.place || '').trim();
      const jTitle = parentTrip ? parentTrip.title.replace(/\s*\(Plan\)$/i, '') : '';
      const displayTitle = pName || jTitle || 'MOMENT';
      const itemDate = (tItem.date || parentTrip?.date || '').trim();
      const resolvedLoc = resolveTimelinePlaceName(tItem, sortedTimeline, parentTrip);

      newCandidateItems.push({
        id: `auto-${tripIdNum || tItem.tripId || 'item'}-${tItem.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tripId: tripIdNum || tItem.tripId,
        timelineItemId: tItem.id,
        title: displayTitle,
        date: itemDate,
        placeName: resolvedLoc || pName || parentTrip?.locationStr || '',
        location: parentTrip?.locationStr || parentTrip?.country || '',
        caption: (tItem.memo || '').trim(),
        img: cleanUrl,
        layoutType: 'portrait',
        order: 0,
      });
      addedCount++;
    }
  });

  // 3. Merge existing and newly added items
  let finalItems = [...updatedExistingItems, ...newCandidateItems];

  // Helper to determine exact sorting index
  const getSortKey = (card: MagazineItem) => {
    let matchedT: TimelineItem | undefined;
    if (card.timelineItemId !== undefined) {
      matchedT = timelineItemMap.get(card.timelineItemId) || timelineItemMap.get(String(card.timelineItemId));
    }
    if (!matchedT && card.img) {
      matchedT = timelineItemMap.get(card.img.trim().split('?')[0]);
    }

    const tIdx = matchedT ? timelineIndexMap.get(matchedT.id) : undefined;
    const dateStr = normalizeDateStr(matchedT?.date || card.date || '');
    const minutes = parseTimeToMinutes(matchedT?.time || (matchedT as any)?.startTime);
    const displayOrder = typeof (matchedT as any)?.displayOrder === 'number' ? (matchedT as any).displayOrder : 999999;
    const id = matchedT ? Number(matchedT.id) : 999999;
    const fallbackOrder = typeof card.order === 'number' ? card.order : 999999;

    return { tIdx, dateStr, minutes, displayOrder, id, fallbackOrder };
  };

  // 4. Sort all items in strict timeline sequence
  finalItems.sort((a, b) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);

    // If both items correspond to timeline items in the sorted timeline, follow that exact order!
    if (keyA.tIdx !== undefined && keyB.tIdx !== undefined) {
      return keyA.tIdx - keyB.tIdx;
    }

    // Otherwise, chronological comparison
    if (keyA.dateStr && keyB.dateStr && keyA.dateStr !== keyB.dateStr) {
      return keyA.dateStr.localeCompare(keyB.dateStr);
    }
    if (keyA.dateStr && !keyB.dateStr) return -1;
    if (!keyA.dateStr && keyB.dateStr) return 1;

    if (keyA.minutes !== -1 && keyB.minutes !== -1 && keyA.minutes !== keyB.minutes) {
      return keyA.minutes - keyB.minutes;
    }
    if (keyA.minutes !== -1 && keyB.minutes === -1) return -1;
    if (keyA.minutes === -1 && keyB.minutes !== -1) return 1;

    if (keyA.displayOrder !== keyB.displayOrder) {
      return keyA.displayOrder - keyB.displayOrder;
    }

    if (keyA.id !== keyB.id) {
      return keyA.id - keyB.id;
    }

    return keyA.fallbackOrder - keyB.fallbackOrder;
  });

  // 5. If new items were added, recalculate balanced editorial row layouts
  if (addedCount > 0) {
    const balancedLayouts = computeEditorialLayoutTypes(finalItems.length);
    finalItems = finalItems.map((item, idx) => ({
      ...item,
      order: idx,
      layoutType: item.isTextOnly ? item.layoutType : (balancedLayouts[idx] || item.layoutType || 'portrait'),
    }));
  } else {
    finalItems = finalItems.map((item, idx) => ({
      ...item,
      order: idx,
    }));
  }

  return {
    syncedItems: finalItems,
    changesCount,
    addedCount,
  };
}

