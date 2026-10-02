// Page scroll lock shared by every full-screen layer (sheets, drawers, magazine, reel, viewers).
// Each layer used to save and restore body.style.overflow on its own, so layers that opened and closed
// in an overlapping order could leave the page locked (or unlocked under an open layer). Counting the
// holders restores the page exactly when the last one lets go.

let holders = 0;
let saved = '';
let savedY = 0;
let savedHref = '';
let lockedAt = 0;
let appScrolledAt = 0;

/** The app moved the page on purpose (a navigation scrolls to the top): the lock will not put it back afterwards */
export function noteAppScroll() {
  appScrolledAt = performance.now();
}

/** Locks page scroll; call the returned function once to release this holder (extra calls do nothing). */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (holders === 0) {
    saved = document.body.style.overflow;
    savedY = window.scrollY;
    savedHref = window.location.pathname + window.location.search;
    lockedAt = performance.now();
    document.body.style.overflow = 'hidden';
  }
  holders++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) {
      document.body.style.overflow = saved;
      // Some browsers send a window scroll back to the top when the body's overflow is given back; the page returns to
      // where it was, unless the app has moved on to another page in the meantime
      const y = savedY;
      const href = savedHref;
      if (y > 0 && appScrolledAt < lockedAt) {
        const back = () => {
          if (holders === 0 && window.scrollY === 0 && window.location.pathname + window.location.search === href) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
        };
        window.requestAnimationFrame(() => { back(); window.requestAnimationFrame(back); });
      }
    }
  };
}
