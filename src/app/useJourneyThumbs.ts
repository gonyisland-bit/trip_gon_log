import { useEffect, useRef } from 'react';
import { doc } from 'firebase/firestore';
// Journey content writes carry owner / access fields (v1.3.6)
import { setDoc } from '../utils/ownership';
import { db } from '../firebase';
import type { Trip, TimelineItem } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { buildImageThumb, isOwnPhoto } from '../utils/imageThumbs';
import { galleryThumbMap, needsCoverThumb } from '../utils/journeyThumbs';

// Makes the small copies journeys load in lists and grids (v1.3.5 P5-b1, spec 5.1).
// Members who may write shared journeys make the missing ones in the background, a few per visit,
// and save them with the journey so every device uses them. Nothing waits on this.

const COVERS_PER_VISIT = 8;
const GALLERY_PER_VISIT = 12;
const START_DELAY_MS = 2500;

interface Options {
  trips: Trip[];
  plans: Trip[];
  activeTrip: Trip | null | undefined;
  timelineData: Record<string, TimelineItem[]> | undefined;
  canWrite: boolean;
  currentView: string;
}

export function useJourneyThumbs({ trips, plans, activeTrip, timelineData, canWrite, currentView }: Options) {
  const failed = useRef(new Set<string>());
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const collectionOf = (id: number) => (plans.some(p => p.id === id) ? 'plans' : 'trips');

  // Covers for cards and list rows (960px)
  useEffect(() => {
    if (!canWrite || busy.current) return;
    const todo = [...plans, ...trips]
      .filter(t => needsCoverThumb(t) && !failed.current.has(getEffectiveImageUrl(t.img)))
      .slice(0, COVERS_PER_VISIT);
    if (todo.length === 0) return;
    const timer = window.setTimeout(async () => {
      busy.current = true;
      for (const t of todo) {
        if (!alive.current) break;
        const src = getEffectiveImageUrl(t.img);
        try {
          const small = await buildImageThumb(src, 960, 'journey_thumbs');
          await setDoc(doc(db, 'users', 'public', collectionOf(t.id), String(t.id)), { imgSmall: small, imgSmallSrc: t.img }, { merge: true });
        } catch (err) {
          failed.current.add(src);
          console.warn('[journeyThumbs] cover copy failed:', err);
        }
      }
      busy.current = false;
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, trips, plans]);

  // Gallery tiles of the journey being viewed (480px)
  useEffect(() => {
    if (!canWrite || currentView !== 'detail' || !activeTrip || busy.current) return;
    const trip = activeTrip;
    const urls = new Set<string>();
    for (const g of trip.gallery || []) urls.add(getEffectiveImageUrl(typeof g === 'string' ? g : g.url));
    for (const items of Object.values(timelineData || {})) {
      for (const it of items || []) if (it.tripId === trip.id && it.img) urls.add(getEffectiveImageUrl(it.img));
    }
    const have = galleryThumbMap(trip);
    const todo = [...urls].filter(u => isOwnPhoto(u) && !have.has(u) && !failed.current.has(u)).slice(0, GALLERY_PER_VISIT);
    if (todo.length === 0) return;
    const timer = window.setTimeout(async () => {
      busy.current = true;
      const made: { src: string; url: string }[] = [];
      for (const src of todo) {
        if (!alive.current) break;
        try {
          made.push({ src, url: await buildImageThumb(src, 480, 'journey_thumbs') });
        } catch (err) {
          failed.current.add(src);
          console.warn('[journeyThumbs] gallery copy failed:', err);
        }
      }
      if (made.length) {
        // Keep copies of photos still in the journey, add the new ones
        const kept = (trip.galleryThumbs || []).filter(t => urls.has(getEffectiveImageUrl(t.src)));
        try {
          await setDoc(doc(db, 'users', 'public', collectionOf(trip.id), String(trip.id)), { galleryThumbs: [...kept, ...made] }, { merge: true });
        } catch (err) {
          console.warn('[journeyThumbs] saving gallery copies failed:', err);
        }
      }
      busy.current = false;
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, currentView, activeTrip?.id, activeTrip?.gallery, activeTrip?.galleryThumbs, timelineData]);
}
