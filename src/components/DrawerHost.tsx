import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lockBodyScroll } from '../utils/scrollLock';
import { HubVisibleContext } from '../app/hubVisible';

// Hub drawers (v1.3.8): the tab bar's hubs and the airport terminal rise from the bottom as one family.
//  - phones: every drawer is one sheet that fills the screen to a small gap under the status bar, its top corners
//    rounded. A grip drags the sheet down; the tab bar stays up in front, so the next drawer is one tap away
//  - tablet and web: the same panel as a centred dialog (only the terminal uses it there; hubs are pages)
// A hub drawer is kept once opened (hidden) and can be drawn ahead of time (`warm`), so its first visit is only the
// slide. Switching drawers slides the new one in from the side it sits on in the tab bar and the old one out to the
// other. A panel that is not kept (the terminal) is rebuilt on every open.

export interface DrawerPanel {
  label: string;
  node: React.ReactNode;
  /** Keep the opened panel mounted while another is showing */
  keepAlive?: boolean;
  /** The drawer scrolls its content (hub pages); otherwise the panel lays itself out to the drawer's size */
  scroll?: boolean;
  /** The panel runs under the tab bar to the screen's edge (the map) instead of ending above it */
  flush?: boolean;
  /** A phone-width dialog on tablet and web (the terminal) instead of the wide one */
  narrow?: boolean;
  /** Dragging the grip down closes the drawer; off where the content pans (the map) */
  dragClose?: boolean;
}

export interface DrawerOverlay {
  id: string;
  label: string;
  node: React.ReactNode;
  /** Shown while the sheet slides in; the real node replaces it once the motion is over */
  placeholder?: React.ReactNode;
}

interface DrawerHostProps {
  active: string | null;
  /** A sheet over the drawers (the phone's journey) */
  overlay?: DrawerOverlay | null;
  onCloseOverlay?: () => void;
  panels: Record<string, DrawerPanel>;
  /** Panel ids in tab bar order, so a switch knows which way to slide */
  order: string[];
  /** Hub drawers drawn hidden ahead of their first visit */
  warm?: string[];
  onClose: () => void;
}

const EXIT_MS = 300;
/** How long the overlay waits before its heavy page replaces the placeholder (the slide-in is 420ms) */
const OVERLAY_DEFER_MS = 440;

/** What a hub shows for the moment before its page exists: a tinted head and a few cards, never a spinner */
export function HubSkeleton({ tint }: { tint: 'peach' | 'mist' | 'sage' | 'butter' }) {
  const bg = { peach: 'bg-peach/60 dark:bg-peach-dark', mist: 'bg-mist/70 dark:bg-mist-dark', sage: 'bg-sage/60 dark:bg-sage-dark', butter: 'bg-butter/50 dark:bg-butter-dark' }[tint];
  return (
    <div className="px-4 pt-3 flex flex-col gap-3 select-none" aria-busy="true" aria-label="Loading">
      <div className={`h-32 rounded-card ${bg} animate-pulse`} />
      <div className="h-11 rounded-full bg-black/[0.05] dark:bg-white/[0.07] animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className="aspect-[4/5] rounded-card bg-black/[0.05] dark:bg-white/[0.07] animate-pulse" />)}
      </div>
    </div>
  );
}

export function DrawerHost({ active, overlay = null, onCloseOverlay, panels, order, warm = [], onClose }: DrawerHostProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  // The panel that is leaving, kept on screen until the sheet has slid away
  const [leaving, setLeaving] = useState<string | null>(null);
  const cache = useRef<Record<string, React.ReactNode>>({});
  const lastActive = useRef<string | null>(null);
  const [drag, setDrag] = useState(0);
  const dragRef = useRef<{ y: number; t: number; lastY: number; lastT: number } | null>(null);
  // How long the sheet takes to leave after a flick: the rest of the way at the speed of the hand
  const [exitMs, setExitMs] = useState<number | null>(null);

  // ── The overlay sheet ──
  const hasOverlay = !!overlay;
  const [ovMounted, setOvMounted] = useState(false);
  const [ovOpen, setOvOpen] = useState(false);
  const [ovReady, setOvReady] = useState(false);
  const [ovDrag, setOvDrag] = useState(0);
  const [ovExitMs, setOvExitMs] = useState<number | null>(null);
  const ovExitRef = useRef<number | null>(null);
  const ovDragRef = useRef<{ y: number; t: number } | null>(null);
  const ovCache = useRef<DrawerOverlay | null>(null);
  if (overlay) ovCache.current = overlay;

  useEffect(() => {
    if (hasOverlay) {
      ovExitRef.current = null;
      setOvExitMs(null);
      setOvMounted(true);
      setOvReady(false);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setOvOpen(true)); });
      const defer = window.setTimeout(() => setOvReady(true), OVERLAY_DEFER_MS);
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.clearTimeout(defer); };
    }
    setOvOpen(false);
    setOvDrag(0);
    const t = window.setTimeout(() => { setOvMounted(false); setOvReady(false); ovCache.current = null; }, ovExitRef.current ?? EXIT_MS);
    return () => window.clearTimeout(t);
  }, [hasOverlay]);

  const onOvDown = (e: React.PointerEvent) => {
    ovDragRef.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onOvMove = (e: React.PointerEvent) => {
    if (ovDragRef.current) setOvDrag(Math.max(0, e.clientY - ovDragRef.current.y));
  };
  const onOvUp = (e: React.PointerEvent) => {
    const start = ovDragRef.current;
    ovDragRef.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const speed = dy / Math.max(1, performance.now() - start.t);
    const h = (e.currentTarget as HTMLElement).closest('[data-drawer-sheet]')?.getBoundingClientRect().height || 500;
    if (dy > h * 0.22 || speed > 0.6) {
      const v = Math.max(0.9, speed);
      const ms = Math.round(Math.min(EXIT_MS, Math.max(140, (h - dy) / v)));
      ovExitRef.current = ms;
      setOvExitMs(ms);
      onCloseOverlay?.();
    } else {
      setOvDrag(0);
    }
  };

  useEffect(() => {
    if (active) {
      lastActive.current = active;
      setLeaving(null);
      setExitMs(null);
      setVisited(v => (v.includes(active) ? v : [...v, active]));
      setMounted(true);
      // Two frames, so the closed state is painted before the slide starts
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setOpen(true)); });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    setOpen(false);
    setDrag(0);
    if (!lastActive.current) return;
    setLeaving(lastActive.current);
    const t = window.setTimeout(() => {
      setMounted(false);
      setLeaving(null);
      setExitMs(null);
      // A panel that is not kept starts fresh next time
      setVisited(v => v.filter(id => panels[id]?.keepAlive));
    }, exitMs ?? EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // The page behind stops scrolling once the slide is under way: locking it costs the page a layout pass, and
  // doing that in the frame of the tap is what stalled the first frames of the slide
  const hasActive = !!active || hasOverlay;
  useEffect(() => {
    if (!hasActive) return;
    let unlock: (() => void) | undefined;
    const t = window.setTimeout(() => { unlock = lockBodyScroll(); }, 460);
    return () => { window.clearTimeout(t); unlock?.(); };
  }, [hasActive]);

  const shown = active ?? leaving;
  const current = shown ? panels[shown] : undefined;

  const onGripDown = useCallback((e: React.PointerEvent) => {
    if (!current?.dragClose) return;
    const now = performance.now();
    dragRef.current = { y: e.clientY, t: now, lastY: e.clientY, lastT: now };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [current?.dragClose]);
  const onGripMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    d.lastY = e.clientY;
    d.lastT = performance.now();
    setDrag(Math.max(0, e.clientY - d.y));
  };
  const onGripUp = (e: React.PointerEvent) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const speed = dy / Math.max(1, performance.now() - start.t);
    const h = (e.currentTarget as HTMLElement).closest('[data-drawer-sheet]')?.getBoundingClientRect().height || 500;
    if (dy > h * 0.22 || speed > 0.6) {
      // Leave at the speed the hand had, never slower than the normal exit allows or faster than it reads
      const v = Math.max(0.9, speed);
      setExitMs(Math.round(Math.min(EXIT_MS, Math.max(140, (h - dy) / v))));
      onClose();
    } else {
      setDrag(0); // the CSS transition carries it back up
    }
  };

  // Hubs keep their place in the DOM once visited or warmed; the terminal exists only while it is on screen
  const ids = Object.keys(panels).filter(id => id === shown || (panels[id].keepAlive && (visited.includes(id) || warm.includes(id))));
  if (!mounted && !ovMounted && ids.length === 0) return null;

  const shownIdx = shown ? order.indexOf(shown) : -1;

  return (
    <div data-drawer className="fixed inset-0 z-[35] pointer-events-none" style={mounted || ovMounted ? undefined : { visibility: 'hidden' }}>
      <div
        className="tgl-hubdrawer-backdrop absolute inset-0 bg-black/30 pointer-events-auto"
        data-open={open}
        onClick={onClose}
        aria-hidden
      />
      <section
        data-drawer-sheet
        data-open={open}
        data-size={current?.narrow ? 'narrow' : 'wide'}
        aria-label={current?.label}
        className="tgl-hubdrawer pointer-events-auto bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark rounded-t-sheet md:rounded-card shadow-[0_-12px_48px_rgba(0,0,0,0.22)] overflow-clip"
        style={{
          ...(drag > 0 ? { transform: `translateY(${drag}px)`, transition: 'none' } : null),
          ...(exitMs !== null ? { ['--motion-sheet-out' as any]: `${exitMs}ms` } : null),
        }}
      >
        <div
          className={`md:hidden absolute inset-x-0 top-0 z-10 flex items-end justify-center touch-none ${current?.dragClose ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ height: 'var(--drawer-grip)', paddingBottom: 8 }}
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
          aria-hidden
        >
          <span className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25" />
        </div>
        <div className="absolute inset-0">
          {ids.map(id => {
            const p = panels[id];
            const on = id === shown;
            const idx = order.indexOf(id);
            // Where this panel waits when it is not the one on show: the side it sits on in the tab bar
            const pos = on ? 'on' : shownIdx < 0 || idx < 0 ? 'after' : idx < shownIdx ? 'before' : 'after';
            // A hub that is not on show keeps the element it last had, so React skips its subtree while the app
            // re-renders around it; the one on show (or arriving) always gets the current element
            let node: React.ReactNode;
            if (on) {
              node = p.node ?? cache.current[id] ?? null;
              if (p.node) cache.current[id] = p.node;
            } else {
              if (cache.current[id] === undefined) cache.current[id] = p.node;
              node = cache.current[id] ?? null;
            }
            return (
              <div
                key={id}
                data-drawer-panel
                data-on={on}
                data-pos={pos}
                inert={!on}
                aria-hidden={!on}
                className="tgl-hubdrawer-panel absolute inset-0"
              >
                <HubVisibleContext.Provider value={on}>
                {p.scroll ? (
                  <div className="absolute inset-0 overflow-y-auto overscroll-contain" style={{ paddingTop: 'var(--drawer-grip)', paddingBottom: 'calc(var(--tabbar-lift, 0px) + 16px)' }}>
                    {node}
                  </div>
                ) : (
                  <div className="absolute inset-0" style={{ paddingTop: 'var(--drawer-grip)', paddingBottom: p.flush ? 0 : 'var(--tabbar-lift, 0px)', ['--hub-h' as any]: '100%' }}>
                    {node}
                  </div>
                )}
                </HubVisibleContext.Provider>
              </div>
            );
          })}
        </div>
      </section>

      {/* The journey: a second sheet over the drawer below it */}
      {ovMounted && ovCache.current && (
        <>
          <div className="tgl-hubdrawer-backdrop absolute inset-0 bg-black/30 pointer-events-auto" data-open={ovOpen} onClick={onCloseOverlay} aria-hidden />
          <section
            data-drawer-sheet
            data-open={ovOpen}
            aria-label={ovCache.current.label}
            className="tgl-hubdrawer tgl-hubdrawer-over pointer-events-auto bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark rounded-t-sheet shadow-[0_-12px_48px_rgba(0,0,0,0.28)] overflow-clip"
            style={{
              ...(ovDrag > 0 ? { transform: `translateY(${ovDrag}px)`, transition: 'none' } : null),
              ...(ovExitMs !== null ? { ['--motion-sheet-out' as any]: `${ovExitMs}ms` } : null),
            }}
          >
            <div
              className="absolute inset-x-0 top-0 z-10 flex items-end justify-center touch-none cursor-grab active:cursor-grabbing"
              style={{ height: 'var(--drawer-grip)', paddingBottom: 8 }}
              onPointerDown={onOvDown}
              onPointerMove={onOvMove}
              onPointerUp={onOvUp}
              onPointerCancel={onOvUp}
              aria-hidden
            >
              <span className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25" />
            </div>
            <div className="absolute inset-0" style={{ paddingTop: 'var(--drawer-grip)' }}>
              {ovReady ? (ovCache.current.node ?? ovCache.current.placeholder) : ovCache.current.placeholder}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
