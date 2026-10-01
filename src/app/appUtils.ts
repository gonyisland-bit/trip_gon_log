import { flushSync } from 'react-dom';
import { lazy } from 'react';
import { sortJourneysByOrder } from '../utils/journeyOrderHelper';

// Resilient lazy import with automatic retry on chunk loading failure (e.g. browser reconnect or new deploy)
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn("Chunk load failed, retrying once in 800ms...", error);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        return await factory();
      } catch (retryError) {
        console.error("Chunk load retry failed, performing auto reload:", retryError);
        const lastReloadKey = 'chunk_reload_ts';
        const lastReload = parseInt(sessionStorage.getItem(lastReloadKey) || '0', 10);
        if (Date.now() - lastReload > 10000) {
          sessionStorage.setItem(lastReloadKey, Date.now().toString());
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}
export function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

export function applyJourneyOrder<T extends { id: number; displayOrder?: number }>(items: T[]): T[] {
  return sortJourneysByOrder(items);
}

export const SUPER_ADMIN_EMAIL = 'gonyisland@naver.com';
export const ADMIN_EMAILS = ['gonyisland@naver.com'];

export function getInitialNavigationState(): { view: string; tripId: number | null; isShare: boolean } {
  try {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const shareParam = params.get('share');
    const isShare = shareParam === 'true';

    if (isShare && idParam) {
      return { view: 'detail', tripId: Number(idParam), isShare: true };
    }
    // A push notification opens the journey it is about (v1.3.6 6-b): /?id=…&open=1
    if (idParam && params.get('open') === '1' && /^\d+$/.test(idParam)) {
      return { view: 'detail', tripId: Number(idParam), isShare: false };
    }

    if (path === '/archive' || window.location.hash === '#archive' || path === '/plan' || window.location.hash === '#plan') {
      return { view: 'archive', tripId: null, isShare: false };
    }
    if (path === '/map' || window.location.hash === '#map') {
      return { view: 'map', tripId: null, isShare: false };
    }
    if (path === '/manage' || window.location.hash === '#manage') {
      return { view: 'manage', tripId: null, isShare: false };
    }
    // The magazine hub is gone; its old address opens the trips, published ones a tap away
    if (path === '/magazine' || window.location.hash === '#magazine') {
      return { view: 'archive', tripId: null, isShare: false };
    }
    if (path === '/calendar' || window.location.hash === '#calendar') {
      return { view: 'calendar', tripId: null, isShare: false };
    }
    if (path === '/pocket' || window.location.hash === '#pocket') {
      return { view: 'pocket', tripId: null, isShare: false };
    }
    if (path === '/detail' || idParam) {
      return { view: 'detail', tripId: idParam ? Number(idParam) : null, isShare: false };
    }

    const lastView = sessionStorage.getItem('lastView') || localStorage.getItem('lastView');
    if (lastView && ['home', 'archive', 'map', 'manage', 'magazine', 'calendar', 'detail', 'pocket'].includes(lastView)) {
      const lastTripId = sessionStorage.getItem('lastTripId') || localStorage.getItem('lastTripId');
      return {
        view: lastView === 'magazine' ? 'archive' : lastView,
        tripId: lastTripId ? Number(lastTripId) : null,
        isShare: false,
      };
    }
  } catch (_) {}

  return { view: 'home', tripId: null, isShare: false };
}

export type NightModeSetting = 'auto' | 'light' | 'dark';

export const isNightTimeNow = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

// Run a view change inside a View Transition (hub-to-hub cross-fade) when the browser supports it
// and the user has not asked for reduced motion; otherwise apply it through `fallback`.
export function runViewTransition(update: () => void, fallback: (update: () => void) => void = (fn) => fn()) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> };
  };
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    fallback(update);
    return;
  }
  const transition = doc.startViewTransition(() => flushSync(update));
  // A transition skipped by a quick second navigation or a hidden tab rejects these; the update itself still runs
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
}

/** True for the errors a browser gives when a deploy has removed the chunk this page asked for */
export function isStaleChunkError(error: unknown): boolean {
  const msg = String((error as Error)?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg);
}

/** Reloads to pick up the new build, at most once every 10 seconds (no reload loops) */
export function reloadForNewBuild(): boolean {
  const key = 'chunk_reload_ts';
  const last = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (Date.now() - last < 10000) return false;
  sessionStorage.setItem(key, Date.now().toString());
  window.location.reload();
  return true;
}
