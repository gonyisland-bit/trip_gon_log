import type { Trip, Plan, StayItem } from '../types';
import { extractCleanCityName } from './bookingDeepLinks';
import { isJourneyOver, parseTripDateRange } from './tripPlanHelper';

// Stays from journeys already taken, at the same place as a journey being planned, so a hotel
// that was liked can be searched again with the new dates in one tap (smart booking).

export interface PastStayVisit {
  tripId: number;
  tripTitle: string;
  /** Start of the stay (or of its journey) as a sortable time */
  at: number;
  /** "2024.05" */
  month: string;
  nights: number;
}

export interface PastStay {
  key: string;
  title: string;
  address: string;
  img: string;
  visits: PastStayVisit[];
}

type Place = { name: string; lat?: number; lng?: number };

function placesOf(trip: Pick<Trip, 'locations' | 'locationStr' | 'lat' | 'lng'>): Place[] {
  if (trip.locations?.length) return trip.locations.filter(l => l.name);
  const names = (trip.locationStr || '').split(',').map(s => s.trim()).filter(Boolean);
  return names.map((name, i) => ({ name, lat: i === 0 ? trip.lat : undefined, lng: i === 0 ? trip.lng : undefined }));
}

function cityKey(raw: string): string {
  return extractCleanCityName(raw).toLowerCase().replace(/\s+/g, '');
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const NEAR_KM = 40;
const hasXY = (p: { lat?: number; lng?: number }): p is { lat: number; lng: number } => typeof p.lat === 'number' && typeof p.lng === 'number';

function stayVisit(stay: StayItem, trip: Trip): PastStayVisit {
  const stayRange = parseTripDateRange(stay.dateRange);
  const range = stayRange || parseTripDateRange(trip.date);
  const start = range?.start;
  const nights = stayRange ? Math.max(0, Math.round((stayRange.end.getTime() - stayRange.start.getTime()) / 86400000)) : 0;
  return {
    tripId: trip.id,
    tripTitle: trip.title,
    at: start ? start.getTime() : 0,
    month: start ? `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}` : '',
    nights,
  };
}

export function findPastStays(
  current: Pick<Trip, 'id' | 'locations' | 'locationStr' | 'lat' | 'lng'> | undefined,
  journeys: (Trip | Plan)[],
  staysByTrip: Record<number, StayItem[]>,
): PastStay[] {
  if (!current) return [];
  const here = placesOf(current);
  const hereKeys = new Set(here.map(p => cityKey(p.name)));
  const hereXY = here.filter((p): p is Place & { lat: number; lng: number } => hasXY(p));
  if (hereKeys.size === 0 && hereXY.length === 0) return [];

  const groups = new Map<string, PastStay>();
  for (const trip of journeys) {
    if (trip.id === current.id || !isJourneyOver(trip)) continue;
    const stays = staysByTrip[trip.id] || [];
    if (stays.length === 0) continue;
    const tripPlaces = placesOf(trip);
    const sameCityTrip = tripPlaces.length === 1 && hereKeys.has(cityKey(tripPlaces[0].name));

    for (const stay of stays) {
      const title = (stay.title || '').trim();
      if (!title) continue;
      const address = (stay.address || '').toLowerCase();
      const near = hasXY(stay) && hereXY.some(h => km(h, stay as { lat: number; lng: number }) <= NEAR_KM);
      const named = [...hereKeys].some(k => k && address.includes(k));
      // A stay with its own position is judged by it; the journey's single city stands in when it has none
      const match = hasXY(stay) ? near || named : named || sameCityTrip;
      if (!match) continue;

      const key = title.toLowerCase().replace(/\s+/g, '');
      const visit = stayVisit(stay, trip as Trip);
      const found = groups.get(key);
      if (found) {
        found.visits.push(visit);
        if (!found.address && stay.address) found.address = stay.address;
        if (!found.img && stay.img) found.img = stay.img;
      } else {
        groups.set(key, { key, title, address: stay.address || '', img: stay.img || '', visits: [visit] });
      }
    }
  }
  const list = [...groups.values()];
  list.forEach(g => g.visits.sort((a, b) => b.at - a.at));
  return list.sort((a, b) => b.visits.length - a.visits.length || b.visits[0].at - a.visits[0].at);
}
