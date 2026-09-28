import { useEffect, useRef } from 'react';

// Back closes the top layer (v1.3). A full-screen layer (wallet, Remix, departure board, lightbox,
// palette, reel) adds a history entry while it is open, so the phone's back gesture or the browser's
// back button closes the layer instead of leaving the page underneath.
//
// One capture-phase popstate listener runs before the app's own navigation listener and stops it when
// the pop only closes a layer. Closing a layer from its own button steps history back once; a
// navigation started in the same moment waits for that step so it is not undone.

interface Layer { id: number; close: () => void }

const stack: Layer[] = [];
let nextId = 1;
let ignoredPops = 0;
const afterPop: (() => void)[] = [];
let listening = false;

function onPopState(e: PopStateEvent) {
  if (ignoredPops > 0) {
    // Our own history.back() from a layer closed by its button
    ignoredPops--;
    e.stopImmediatePropagation();
    if (ignoredPops === 0) afterPop.splice(0).forEach(fn => fn());
    return;
  }
  const top = stack[stack.length - 1];
  if (!top) return;
  const stateLayer = (e.state && e.state.tglLayer) as number | undefined;
  // Still on (or above) the top layer's entry: a forward move or another layer's entry, not ours to close
  if (stateLayer !== undefined && stateLayer >= top.id) return;
  stack.pop();
  e.stopImmediatePropagation();
  top.close();
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPopState, { capture: true });
  listening = true;
}

/** True while a layer's closing step back is still on its way; navigation should wait for it. */
export function isLayerBackPending(): boolean {
  return ignoredPops > 0;
}

/** Run fn once the pending layer step back has landed (or now, when none is pending). */
export function afterLayerBack(fn: () => void): void {
  if (ignoredPops > 0) afterPop.push(fn);
  else fn();
}

/**
 * A navigation started from inside a layer (a wallet row opening a journey) takes over the layer's
 * history entry instead of stacking on it, so back from the new page does not land on the closed layer.
 * Returns true when the caller should replaceState rather than pushState.
 */
export function takeOverLayerEntry(): boolean {
  const id = typeof window !== 'undefined' ? window.history.state?.tglLayer : undefined;
  if (id === undefined) return false;
  const i = stack.findIndex(l => l.id === id);
  if (i === -1) return false;
  stack.splice(i); // this layer and anything opened above it are closing with the navigation
  return true;
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    ensureListener();
    const layer: Layer = { id: nextId++, close: () => closeRef.current() };
    stack.push(layer);
    // Pushed a tick later, so a mount that is undone at once (React StrictMode) leaves history alone
    let pushed = false;
    const timer = window.setTimeout(() => {
      pushed = true;
      try {
        window.history.pushState({ ...(window.history.state || {}), tglLayer: layer.id }, '', window.location.href);
      } catch (_) {}
    }, 0);

    return () => {
      window.clearTimeout(timer);
      const i = stack.indexOf(layer);
      if (i === -1) return; // already closed by the back gesture
      stack.splice(i, 1);
      if (!pushed) return;
      // Step back over our entry only if it is still the current one (nothing navigated on top of it)
      if (window.history.state?.tglLayer === layer.id) {
        ignoredPops++;
        window.history.back();
      }
    };
  }, [open]);
}
