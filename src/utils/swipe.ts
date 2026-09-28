import type React from 'react';

// Horizontal swipe detection that ignores scrolling (v1.3). A real finger scrolling up and down also
// drifts sideways, so a swipe counts only when it is clearly horizontal, quick, and the page did not
// scroll in the meantime. Desktop touch simulation drags in straight lines and never showed the drift.

export interface SwipeStart {
  x: number;
  y: number;
  t: number;
  scrollY: number;
}

const pageScrollY = () => (typeof window !== 'undefined' ? window.scrollY || document.scrollingElement?.scrollTop || 0 : 0);

export function swipeStart(e: React.TouchEvent | TouchEvent): SwipeStart | null {
  if (e.touches.length !== 1) return null; // pinch and multi-finger gestures are not swipes
  const t = e.touches[0];
  return { x: t.clientX, y: t.clientY, t: performance.now(), scrollY: pageScrollY() };
}

/**
 * -1 for a swipe to the left (next), 1 for a swipe to the right (previous), 0 for anything else.
 */
export function swipeDirection(start: SwipeStart | null, e: React.TouchEvent | TouchEvent, minDistance = 60): -1 | 0 | 1 {
  if (!start) return 0;
  const t = e.changedTouches[0];
  if (!t) return 0;
  const dx = t.clientX - start.x;
  const dy = t.clientY - start.y;
  if (Math.abs(dx) < minDistance) return 0;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  if (performance.now() - start.t > 600) return 0;
  if (Math.abs(pageScrollY() - start.scrollY) > 8) return 0;
  return dx < 0 ? -1 : 1;
}
