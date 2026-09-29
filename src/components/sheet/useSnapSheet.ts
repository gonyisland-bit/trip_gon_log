import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Bottom sheet over a map on phones: rests at `halfTop` (the map above stays visible), opens to the
// top when its content is pushed up, and follows the finger while dragged. From the half position a
// long or fast pull down closes it. Content scrolls normally once the sheet is fully open.
//
//   const sheet = useSnapSheet({ enabled, halfTop, onClose });
//   <div ref={sheet.containerRef} className="absolute inset-0">   ← covers the map area, moved by transform
//     <div data-sheet-handle />                                    ← grab bar (also taps toggle)
//     <div style={{ height: sheet.panelHeight }}> … <div data-sheet-scroll> … </div> </div>
//   </div>

export type SheetSnap = 'half' | 'full';

interface Options {
  enabled: boolean;
  /** Distance from the top of the area to the sheet's top edge when resting half open */
  halfTop: number;
  /** Height of the whole area the sheet moves in */
  areaHeight: number;
  onClose: () => void;
}

const DECIDE_PX = 1;  // decide on the first move: later moves may no longer be cancelable
const OPEN_PULL = 40;     // pull up this far (or flick) from half to open fully
const HALF_PULL = 60;     // pull down this far (or flick) from full to come back to half
const CLOSE_PULL = 140;   // pull down this far past half (or flick hard) to close
const FLICK = 0.6;        // px per ms
const EASE = 'transform 320ms cubic-bezier(.2, .8, .2, 1)';

// The nearest ancestor (inside the sheet) that can scroll vertically
function scrollParent(el: Element | null, stop: Element): HTMLElement | null {
  for (let n = el as HTMLElement | null; n && n !== stop; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return null;
}

export function useSnapSheet({ enabled, halfTop, areaHeight, onClose }: Options) {
  const [snap, setSnap] = useState<SheetSnap>('half');
  const containerRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const baseTop = snap === 'full' ? 0 : halfTop;

  // Place the sheet without animation whenever the resting spot changes size (rotation, first layout)
  const place = useCallback((top: number, animate: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = animate ? EASE : 'none';
    el.style.transform = `translate3d(0, ${Math.max(0, top)}px, 0)`;
  }, []);

  // Opening: start below the area, then rise to rest. Afterwards: glide to the current resting spot.
  const shownRef = useRef(false);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) {
      shownRef.current = false;
      if (el) { el.style.transform = ''; el.style.transition = ''; }
      return;
    }
    if (!shownRef.current) {
      shownRef.current = true;
      place(areaHeight, false);
      el.getBoundingClientRect(); // commit the start position before animating
    }
    place(baseTop, true);
  }, [enabled, baseTop, areaHeight, place]);

  const closeWithSlide = useCallback(() => {
    place(areaHeight, true);
    window.setTimeout(() => {
      onClose();
      // If closing was cancelled (e.g. a confirm), come back to rest
      setSnap('half');
      place(halfTop, true);
    }, 240);
  }, [areaHeight, halfTop, onClose, place]);

  useEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) return;
    let startX = 0, startY = 0, lastY = 0, lastT = 0, velocity = 0;
    let mode: 'idle' | 'undecided' | 'drag' | 'native' = 'idle';
    let scroller: HTMLElement | null = null;
    let fromHandle = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { mode = 'native'; return; }
      const t = e.touches[0];
      startX = t.clientX; startY = lastY = t.clientY; lastT = performance.now(); velocity = 0;
      const target = e.target as Element;
      fromHandle = !!target.closest('[data-sheet-handle]');
      scroller = scrollParent(target, el);
      mode = 'undecided';
    };

    const onMove = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'native') return;
      const t = e.touches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (mode === 'undecided') {
        if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return;
        const atTop = !scroller || scroller.scrollTop <= 0;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const half = snapRef.current === 'half';
        // Half: any vertical pull moves the sheet (up opens, down closes) unless the content is mid-scroll.
        // Full: the content scrolls, except a pull down from its very top, which moves the sheet.
        mode = vertical && (fromHandle || (half && (dy < 0 || atTop)) || (!half && dy > 0 && atTop)) ? 'drag' : 'native';
        if (mode === 'native') return;
      }
      e.preventDefault();
      const now = performance.now();
      velocity = (t.clientY - lastY) / Math.max(1, now - lastT);
      lastY = t.clientY; lastT = now;
      const base = snapRef.current === 'full' ? 0 : halfTop;
      // Resist a little above the top
      const top = base + dy < 0 ? (base + dy) * 0.25 : base + dy;
      place(top, false);
    };

    const onEnd = () => {
      if (mode !== 'drag') { mode = 'idle'; return; }
      mode = 'idle';
      const dy = lastY - startY;
      const half = snapRef.current === 'half';
      if (half) {
        if (dy < -OPEN_PULL || velocity < -FLICK) { setSnap('full'); place(0, true); }
        else if (dy > CLOSE_PULL || velocity > FLICK * 1.5) closeWithSlide();
        else place(halfTop, true);
      } else {
        if (dy > halfTop + CLOSE_PULL || (dy > HALF_PULL && velocity > FLICK * 2.5)) closeWithSlide();
        else if (dy > HALF_PULL || velocity > FLICK) { setSnap('half'); place(halfTop, true); }
        else place(0, true);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, halfTop, place, closeWithSlide]);

  const toggle = useCallback(() => setSnap(s => (s === 'half' ? 'full' : 'half')), []);

  return {
    snap,
    toggle,
    containerRef,
    /** Height the panel inside should take so its own scroll area ends at the screen bottom */
    panelHeight: enabled ? (snap === 'full' ? areaHeight : Math.max(0, areaHeight - halfTop)) : undefined,
  };
}
