import React, { useLayoutEffect, useRef, useState } from 'react';

// The counter (board, buttons, ticket, lobby window) is one stage drawn at a fixed design width and scaled as a whole
// to the room the drawer leaves. The four parts so keep the same proportions on a phone, a tablet and the web, and
// none of them gives way before the others. The stage stops shrinking at MIN_SCALE so its text stays readable; on a
// screen shorter than that the body scrolls instead of cutting anything.

export const STAGE_W = 400;
const MIN_SCALE = 0.72;
const MAX_SCALE = 1.25;

export function CounterStage({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, h: 0 });

  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const measure = () => {
      const h = inner.offsetHeight;
      if (!h) return;
      const cs = getComputedStyle(box);
      const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const room = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // Width is a hard limit; height can push the stage down to MIN_SCALE, below which the body scrolls
      const scale = Math.min(w / STAGE_W, MAX_SCALE, Math.max(MIN_SCALE, room / h));
      setFit(prev => (Math.abs(prev.scale - scale) < 0.001 && prev.h === h ? prev : { scale, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-y-auto overscroll-contain hide-scrollbar px-4 pb-3">
      <div className="relative mx-auto" style={{ width: STAGE_W * fit.scale, height: fit.h * fit.scale }}>
        <div ref={innerRef} className="absolute left-0 top-0" style={{ width: STAGE_W, transform: `scale(${fit.scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
