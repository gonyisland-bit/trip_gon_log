import { useRef } from 'react';

// A long press on touch (and right click with a mouse) opens a card's menu. The click that
// follows a long press is swallowed so the card does not open as well.
export function useLongPress(onLong?: () => void, ms = 480) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  if (!onLong) return { handlers: {}, consumeClick: () => false };

  return {
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        fired.current = false;
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
        cancel();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          try { navigator.vibrate?.(12); } catch { /* optional */ }
          onLong();
        }, ms);
      },
      onTouchMove: (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (start.current && Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) > 10) cancel();
      },
      onTouchEnd: cancel,
      onTouchCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        cancel();
        if (!fired.current) onLong();
        fired.current = true;
      },
    },
    /** True (once) when the current click belongs to a long press */
    consumeClick: () => {
      if (!fired.current) return false;
      fired.current = false;
      return true;
    },
  };
}
