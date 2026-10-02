import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lockBodyScroll } from '../utils/scrollLock';

// Hub drawers (v1.3.8): the tab bar's hubs and the airport terminal rise from the bottom as one family.
//  - phones: a sheet nearly as tall as the screen over the page, with a grip that drags it down; the tab bar
//    stays up in front, so the next drawer is one tap away
//  - web: the same panel as a centred dialog (only the terminal uses it there; hubs are pages)
// A hub drawer that has been opened is kept (hidden) and only fades back in on the next visit, so switching
// is instant and each hub keeps its scroll. A panel that is not kept (the terminal) is rebuilt on every open.

export interface DrawerPanel {
  label: string;
  node: React.ReactNode;
  /** Keep the opened panel mounted while another is showing */
  keepAlive?: boolean;
  /** The drawer scrolls its content (hub pages); otherwise the panel lays itself out to the drawer's size */
  scroll?: boolean;
  /** The panel runs under the tab bar to the screen's edge (the map) instead of ending above it */
  flush?: boolean;
  /** Dragging the grip down closes the drawer; off where the content pans (the map) */
  dragClose?: boolean;
}

interface DrawerHostProps {
  active: string | null;
  panels: Record<string, DrawerPanel>;
  onClose: () => void;
}

const EXIT_MS = 300;

export function DrawerHost({ active, panels, onClose }: DrawerHostProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  // The panel that is leaving, kept on screen until the sheet has slid away
  const [leaving, setLeaving] = useState<string | null>(null);
  const cache = useRef<Record<string, React.ReactNode>>({});
  const lastActive = useRef<string | null>(null);
  const [drag, setDrag] = useState(0);
  const dragRef = useRef<{ y: number; t: number } | null>(null);

  useEffect(() => {
    if (active) {
      lastActive.current = active;
      setLeaving(null);
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
      // A panel that is not kept starts fresh next time
      setVisited(v => v.filter(id => panels[id]?.keepAlive));
    }, EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => (active ? lockBodyScroll() : undefined), [active]);

  const shown = active ?? leaving;
  const current = shown ? panels[shown] : undefined;

  const onGripDown = useCallback((e: React.PointerEvent) => {
    if (!current?.dragClose) return;
    dragRef.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [current?.dragClose]);
  const onGripMove = (e: React.PointerEvent) => {
    if (dragRef.current) setDrag(Math.max(0, e.clientY - dragRef.current.y));
  };
  const onGripUp = (e: React.PointerEvent) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const speed = dy / Math.max(1, performance.now() - start.t);
    const h = (e.currentTarget as HTMLElement).closest('[data-drawer-sheet]')?.getBoundingClientRect().height || 500;
    if (dy > h * 0.22 || speed > 0.6) onClose(); else setDrag(0);
  };

  if (!mounted) return null;

  // Kept hubs, plus the one on screen
  const ids = Object.keys(panels).filter(id => id === shown || (panels[id].keepAlive && visited.includes(id)));

  return (
    <div data-drawer className="fixed inset-0 z-[35] pointer-events-none">
      <div
        className="tgl-hubdrawer-backdrop absolute inset-0 bg-black/30 pointer-events-auto"
        data-open={open}
        onClick={onClose}
        aria-hidden
      />
      <section
        data-drawer-sheet
        data-open={open}
        aria-label={current?.label}
        className="tgl-hubdrawer pointer-events-auto bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark rounded-t-sheet md:rounded-card shadow-[0_-12px_48px_rgba(0,0,0,0.22)] overflow-hidden"
        style={drag > 0 ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className={`md:hidden absolute inset-x-0 top-0 z-10 h-7 flex items-center justify-center touch-none ${current?.dragClose ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
          aria-hidden
        >
          <span className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25" />
        </div>
        <div className="absolute inset-x-0 bottom-0 top-0 md:top-0">
          {ids.map(id => {
            const p = panels[id];
            const on = id === shown;
            const node = p.node ?? cache.current[id] ?? null;
            if (p.node) cache.current[id] = p.node;
            return (
              <div
                key={id}
                data-drawer-panel
                data-on={on}
                inert={!on}
                aria-hidden={!on}
                className="tgl-hubdrawer-panel absolute inset-0"
              >
                {p.scroll ? (
                  <div className="absolute inset-0 overflow-y-auto overscroll-contain" style={{ paddingTop: 'var(--drawer-grip, 24px)', paddingBottom: 'calc(var(--tabbar-lift, 0px) + 16px)' }}>
                    {node}
                  </div>
                ) : (
                  <div className="absolute inset-0 md:pt-0" style={{ paddingTop: 'var(--drawer-grip, 24px)', paddingBottom: p.flush ? 0 : 'var(--tabbar-lift, 0px)', ['--hub-h' as any]: '100%' }}>
                    {node}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
