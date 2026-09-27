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

    if (path === '/archive' || window.location.hash === '#archive' || path === '/plan' || window.location.hash === '#plan') {
      return { view: 'archive', tripId: null, isShare: false };
    }
    if (path === '/map' || window.location.hash === '#map') {
      return { view: 'map', tripId: null, isShare: false };
    }
    if (path === '/manage' || window.location.hash === '#manage') {
      return { view: 'manage', tripId: null, isShare: false };
    }
    if (path === '/magazine' || window.location.hash === '#magazine') {
      return { view: 'magazine', tripId: null, isShare: false };
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
        view: lastView,
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
  const doc = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (typeof doc.startViewTransition !== 'function' || reduced) {
    fallback(update);
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}
