import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { prefersReducedMotion } from '../motion';
import { useBackToClose } from '../utils/overlayHistory';

// Sheet (v1.3): one container for app sheets and dialogs so they open and close with the same motion.
//  - phones: a bottom sheet that slides up, with a grip that drags it down to dismiss
//  - desktop: a centred dialog ('center') or a dialog near the top ('top', used by the palette)
//  - closes with an exit animation from its own controls, Escape, the backdrop or the back gesture
// Children close it through useSheetClose() so their buttons get the exit motion too.

const EXIT_MS = 220;
const SheetCloseContext = createContext<() => void>(() => {});
export const useSheetClose = () => useContext(SheetCloseContext);

interface SheetProps {
  onClose: () => void;
  label: string;
  placement?: 'center' | 'top';
  /** Tailwind classes for the panel's width and height limits */
  panelClassName?: string;
  /** Block closing while something is saving */
  locked?: boolean;
  /** Add a history entry so the back gesture closes the sheet (skip when the caller already does) */
  backToClose?: boolean;
  zIndex?: number;
  children: React.ReactNode;
}

export function Sheet({ onClose, label, placement = 'center', panelClassName = '', locked = false, backToClose = true, zIndex = 195, children }: SheetProps) {
  const [closing, setClosing] = useState(false);
  // The enter animation holds its end transform while applied, which would pin the panel during a drag
  const [entered, setEntered] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragRef = useRef<{ y: number; t: number; id: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const requestClose = useCallback(() => {
    if (locked || closing) return;
    if (prefersReducedMotion()) { closeRef.current(); return; }
    setClosing(true);
    window.setTimeout(() => closeRef.current(), EXIT_MS);
  }, [locked, closing]);

  // The back gesture closes at once: the browser has already moved, so no exit animation is waited for
  useBackToClose(backToClose, () => { if (!locked) closeRef.current(); });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [requestClose]);

  // Drag the grip down; let go past a quarter of the way (or with a quick flick) to dismiss
  const onGripDown = (e: React.PointerEvent) => {
    if (locked) return;
    dragRef.current = { y: e.clientY, t: performance.now(), id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onGripMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setDrag(Math.max(0, e.clientY - dragRef.current.y));
  };
  const onGripUp = (e: React.PointerEvent) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const speed = dy / Math.max(1, performance.now() - start.t);
    const panel = (e.currentTarget as HTMLElement).closest('[data-sheet-panel]') as HTMLElement | null;
    const h = panel?.getBoundingClientRect().height || 400;
    if (dy > h * 0.25 || speed > 0.6) {
      setDrag(0);
      requestClose();
    } else {
      setDrag(0);
    }
  };

  const dragging = drag > 0;

  // Portalled to body: a fixed sheet inside a transformed/clipped ancestor (map panel) would be cut off
  return createPortal(
    <SheetCloseContext.Provider value={requestClose}>
      <div
        className={`fixed inset-0 flex justify-center ${placement === 'top' ? 'items-start pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:pt-[12vh] px-2 sm:px-4' : 'items-end sm:items-center sm:p-4'} ${closing ? 'tgl-sheet-backdrop-out' : 'tgl-sheet-backdrop-in'} bg-black/45 backdrop-blur-[2px]`}
        style={{ zIndex }}
        onMouseDown={requestClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          data-sheet-panel
          onMouseDown={e => e.stopPropagation()}
          className={`relative w-full flex flex-col bg-white dark:bg-[#161616] text-black dark:text-white border border-black/20 dark:border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.3)] ${closing ? (placement === 'top' ? 'tgl-dialog-out' : 'tgl-sheet-out') : entered ? '' : (placement === 'top' ? 'tgl-dialog-in' : 'tgl-sheet-in')} ${panelClassName}`}
          onAnimationEnd={e => { if (e.target === e.currentTarget && !closing) setEntered(true); }}
          style={{
            paddingBottom: placement === 'top' ? undefined : 'env(safe-area-inset-bottom, 0px)',
            transform: dragging ? `translateY(${drag}px)` : undefined,
            transition: dragging ? 'none' : undefined,
          }}
        >
          {/* Grip: phones only, for sheets that rise from the bottom */}
          {placement !== 'top' && <div
            className="sm:hidden shrink-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
            onPointerCancel={onGripUp}
            aria-hidden
          >
            <span className="w-10 h-1 bg-black/20 dark:bg-white/25" />
          </div>}
          {children}
        </div>
      </div>
    </SheetCloseContext.Provider>,
    document.body
  );
}

// A close control for a sheet's own header: goes through the sheet so the exit motion plays
export function SheetCloseButton({ className, children, label = '닫기', disabled }: { className?: string; children: React.ReactNode; label?: string; disabled?: boolean }) {
  const close = useSheetClose();
  return (
    <button type="button" onClick={close} disabled={disabled} className={className} aria-label={label}>
      {children}
    </button>
  );
}
