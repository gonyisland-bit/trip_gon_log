/**
 * Intelligent Zero-Overhead Prefetching Engine
 * 
 * Safely preloads secondary routes in browser idle time or on user intent (hover/touch)
 * without consuming bandwidth on slow networks or interrupting current animations.
 */

let detailPromise: Promise<any> | null = null;
let mapPromise: Promise<any> | null = null;
let managePromise: Promise<any> | null = null;

// Check if user is on low-end connection or data saver mode
export function shouldSkipBackgroundPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // 1. Data Saver mode enabled
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn?.saveData === true) return true;
  
  // 2. Slow network (2g or slow-2g)
  if (conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return true;
  
  return false;
}

/**
 * Preloads the JourneyDetailPage chunk (Detail.tsx).
 * Idempotent: Subsequent calls return the cached promise instantly.
 */
export function preloadDetailPage(): Promise<any> {
  if (!detailPromise) {
    detailPromise = import('../pages/Detail');
  }
  return detailPromise;
}

/**
 * Preloads the MapHubPage chunk (MapHub.tsx).
 */
export function preloadMapPage(): Promise<any> {
  if (!mapPromise) {
    mapPromise = import('../pages/MapHub');
  }
  return mapPromise;
}

/**
 * Preloads the ManageHubPage chunk (ManageHub.tsx).
 */
export function preloadManagePage(): Promise<any> {
  if (!managePromise) {
    managePromise = import('../pages/ManageHub');
  }
  return managePromise;
}

/**
 * Schedules background prefetching strictly during browser idle time (requestIdleCallback)
 * after a generous safety delay (2.5 seconds) to ensure current page animations, hero videos,
 * and critical UI rendering are 100% completed without competition.
 */
export function scheduleIdlePrefetch(delayMs: number = 2500): () => void {
  if (typeof window === 'undefined') return () => {};

  const timer = setTimeout(() => {
    if (shouldSkipBackgroundPrefetch()) {
      return;
    }

    const runIdle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));

    runIdle(() => {
      // Preload the most visited page: Detail.tsx
      preloadDetailPage().catch(() => {});
    });
  }, delayMs);

  return () => clearTimeout(timer);
}
