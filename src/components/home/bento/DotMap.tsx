import React, { useEffect, useRef } from 'react';
import { decodeWorldDots, WORLD_DOTS, type WorldDot } from '../../../data/worldDots';
import type { MapPoint } from './bentoData';

// The home map tile (v1.3.8): the app's own world of dots, with the places the member has been in red and the place
// the next journey goes to in amber. Drawn on a canvas that fills the tile and redrawn when the tile or the theme resizes.

let DOTS: WorldDot[] | null = null;
const dots = () => (DOTS ??= decodeWorldDots());

/** Dots within this many degrees of a point light up with it */
const REACH = 4.2;

function near(d: WorldDot, pts: MapPoint[]): boolean {
  const k = Math.cos((d.lat * Math.PI) / 180);
  return pts.some(p => {
    let dl = Math.abs(d.lng - p.lng);
    if (dl > 180) dl = 360 - dl;
    const dy = d.lat - p.lat;
    const dx = dl * Math.max(0.35, k);
    return dx * dx + dy * dy <= REACH * REACH;
  });
}

export function DotMap({ visited, next, dark }: { visited: MapPoint[]; next: MapPoint[]; dark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { step, top } = WORLD_DOTS;
      const cell = w / 360;
      const r = cell * step * 0.36;
      const base = dark ? 'rgba(235,238,242,0.26)' : 'rgba(40,52,64,0.26)';
      const seen = dark ? '#F87171' : '#DC2626';
      const ahead = dark ? '#FBBF24' : '#D97706';
      // The world is 140 degrees tall in the dot data; centre it a little above the middle so the numbers below have room
      const y0 = Math.max(0, (h - 140 * cell) * 0.35);
      dots().forEach(d => {
        const isNext = next.length > 0 && near(d, next);
        const isSeen = !isNext && visited.length > 0 && near(d, visited);
        ctx.fillStyle = isNext ? ahead : isSeen ? seen : base;
        ctx.beginPath();
        ctx.arc((d.lng + 180) * cell, y0 + (top - d.lat) * cell, isNext || isSeen ? r * 1.35 : r, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [visited, next, dark]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}
