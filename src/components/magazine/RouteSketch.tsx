import React, { useEffect, useMemo, useRef, useState } from 'react';

// Route sketch (v1.3 P5-7): the journey's places, in visiting order, joined by
// a line that draws itself as the reader scrolls past. A flat projection of
// the points' own bounding box; no map tiles. Complete at once under reduced
// motion.

export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
  day: number;
}

const W = 1000;
const H = 360;
const PAD = 40;

export function RouteSketch({ points, title }: { points: RoutePoint[]; title?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPolylineElement>(null);
  const [len, setLen] = useState(0);
  const [progress, setProgress] = useState(0);

  // Fit the points into the box, keeping the aspect of the ground (longitude shrinks with latitude)
  const projected = useMemo(() => {
    if (points.length < 2) return [];
    const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const kx = Math.cos((midLat * Math.PI) / 180);
    const xs = points.map(p => p.lng * kx);
    const ys = points.map(p => -p.lat);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
    const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
    const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
    return points.map((p, i) => ({ ...p, x: offX + (xs[i] - minX) * scale, y: offY + (ys[i] - minY) * scale }));
  }, [points]);

  useEffect(() => { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, [projected]);

  // Draw with scroll: 0 when the sketch enters the lower edge, 1 by the time it reaches the upper third
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setProgress(1); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = (vh - r.top) / (vh * 0.66 + r.height * 0.5);
      setProgress(Math.max(0, Math.min(1, t)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  if (projected.length < 2) return null;
  const shownStops = Math.round(progress * (projected.length - 1));
  const first = projected[0], last = projected[projected.length - 1];
  // Keep end labels inside the frame near the side edges
  const anchor = (x: number) => (x < W * 0.2 ? 'start' : x > W * 0.8 ? 'end' : 'middle');

  return (
    <section ref={wrapRef} className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-10 sm:py-14" aria-label={`${title || '여정'} 동선`}>
      <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-black/15 dark:border-white/15">
        <span className="font-mono text-micro sm:text-meta font-bold uppercase tracking-widest text-black/60 dark:text-white/60">Route</span>
        <span className="font-mono text-micro sm:text-meta tabular-nums text-black/60 dark:text-white/60">{projected.length} stops</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-4 text-black dark:text-white" role="img" aria-label={`${first.label}에서 ${last.label}까지 ${projected.length}곳`}>
        {/* Faint full route, then the drawn part on top */}
        <polyline points={projected.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="3 6" />
        <polyline
          ref={pathRef}
          points={projected.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#DC2626"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={len ? { strokeDasharray: len, strokeDashoffset: len * (1 - progress), transition: 'stroke-dashoffset 120ms linear' } : undefined}
        />
        {projected.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === 0 || i === projected.length - 1 ? 6 : 4}
            fill={i <= shownStops ? '#DC2626' : 'currentColor'} fillOpacity={i <= shownStops ? 1 : 0.2}
            stroke="var(--route-ring, #fff)" strokeWidth="2" className="[--route-ring:#fff] dark:[--route-ring:#141414]" />
        ))}
        <text x={first.x} y={first.y - 14} textAnchor={anchor(first.x)} className="fill-current" style={{ font: '700 20px ui-monospace, monospace' }}>{first.label}</text>
        <text x={last.x} y={last.y + 30} textAnchor={anchor(last.x)} className="fill-current" style={{ font: '700 20px ui-monospace, monospace', opacity: progress > 0.95 ? 1 : 0.25, transition: 'opacity 300ms' }}>{last.label}</text>
      </svg>
    </section>
  );
}
