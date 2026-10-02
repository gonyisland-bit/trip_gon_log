// Page scroll lock shared by every full-screen layer (sheets, drawers, magazine, reel, viewers).
// Each layer used to save and restore body.style.overflow on its own, so layers that opened and closed
// in an overlapping order could leave the page locked (or unlocked under an open layer). Counting the
// holders restores the page exactly when the last one lets go.

let holders = 0;
let saved = '';

/** Locks page scroll; call the returned function once to release this holder (extra calls do nothing). */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (holders === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = saved;
  };
}
