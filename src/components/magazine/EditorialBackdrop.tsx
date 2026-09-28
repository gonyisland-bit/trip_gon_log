import React, { useEffect, useMemo, useRef } from 'react';
import { prefersReducedMotion } from '../../motion';

// Magazine backdrop (v1.3): flat-colour editorial objects that drift across the
// page as you scroll, each in its own direction, wrapping around the edges.
// Chosen in the magazine settings: off, random, or a single object.

export type BackdropObject = 'tomato' | 'penguin' | 'cat' | 'lemon' | 'plane' | 'fish';
export type BackdropSetting = 'off' | 'random' | BackdropObject;

export const BACKDROP_OPTIONS: { value: BackdropSetting; label: string }[] = [
  { value: 'off', label: '끄기' },
  { value: 'random', label: '무작위' },
  { value: 'tomato', label: '토마토' },
  { value: 'penguin', label: '펭귄' },
  { value: 'cat', label: '고양이' },
  { value: 'lemon', label: '레몬' },
  { value: 'plane', label: '비행기' },
  { value: 'fish', label: '물고기' },
];

const OBJECTS: BackdropObject[] = ['tomato', 'penguin', 'cat', 'lemon', 'plane', 'fish'];

function Art({ kind }: { kind: BackdropObject }) {
  switch (kind) {
    case 'tomato':
      return (
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="56" r="38" fill="#E8412C" />
          <ellipse cx="36" cy="44" rx="8" ry="5" fill="#F7806F" transform="rotate(-30 36 44)" />
          <path d="M50 22 L55 30 L66 27 L59 35 L66 42 L55 38 L50 46 L45 38 L34 42 L41 35 L34 27 L45 30 Z" fill="#2F8F4E" />
          <rect x="48" y="12" width="4" height="12" rx="2" fill="#2F8F4E" />
        </svg>
      );
    case 'penguin':
      return (
        <svg viewBox="0 0 100 100">
          <ellipse cx="50" cy="56" rx="28" ry="36" fill="#15161A" />
          <ellipse cx="50" cy="62" rx="18" ry="27" fill="#FFFFFF" />
          <circle cx="42" cy="38" r="3.2" fill="#FFFFFF" /><circle cx="42" cy="38" r="1.6" fill="#15161A" />
          <circle cx="58" cy="38" r="3.2" fill="#FFFFFF" /><circle cx="58" cy="38" r="1.6" fill="#15161A" />
          <path d="M44 45 L56 45 L50 52 Z" fill="#F29A1F" />
          <ellipse cx="40" cy="92" rx="8" ry="3.5" fill="#F29A1F" /><ellipse cx="60" cy="92" rx="8" ry="3.5" fill="#F29A1F" />
        </svg>
      );
    case 'cat':
      return (
        <svg viewBox="0 0 100 100">
          <path d="M22 40 L28 14 L42 30 L58 30 L72 14 L78 40 Q84 76 50 82 Q16 76 22 40 Z" fill="#F0A04B" />
          <path d="M50 30 L50 42 M38 32 L41 42 M62 32 L59 42" stroke="#D17A2A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="39" cy="52" r="3.5" fill="#15161A" /><circle cx="61" cy="52" r="3.5" fill="#15161A" />
          <path d="M47 60 L53 60 L50 64 Z" fill="#E8595C" />
          <path d="M50 64 Q46 69 42 67 M50 64 Q54 69 58 67" stroke="#15161A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M28 62 L14 60 M28 66 L15 69 M72 62 L86 60 M72 66 L85 69" stroke="#15161A" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'lemon':
      return (
        <svg viewBox="0 0 100 100">
          <path d="M14 56 Q16 28 50 26 Q84 28 86 56 Q84 82 50 84 Q16 82 14 56 Z" fill="#F6CE3A" transform="rotate(-18 50 55)" />
          <ellipse cx="38" cy="46" rx="9" ry="4" fill="#FBE68A" transform="rotate(-38 38 46)" />
          <path d="M60 22 Q74 8 86 16 Q74 30 60 22 Z" fill="#3E9B57" />
        </svg>
      );
    case 'plane':
      return (
        <svg viewBox="0 0 100 100">
          <path d="M10 52 Q10 46 22 46 L80 46 Q92 48 94 52 Q92 56 80 58 L22 58 Q10 58 10 52 Z" fill="#E8412C" />
          <path d="M44 47 L60 18 L68 18 L60 47 Z" fill="#B8301F" />
          <path d="M44 57 L60 86 L68 86 L60 57 Z" fill="#B8301F" />
          <path d="M14 47 L10 34 L18 34 L24 47 Z" fill="#B8301F" />
          <rect x="70" y="49" width="4" height="3" rx="1" fill="#FFFFFF" /><rect x="62" y="49" width="4" height="3" rx="1" fill="#FFFFFF" /><rect x="54" y="49" width="4" height="3" rx="1" fill="#FFFFFF" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100">
          <path d="M18 50 Q40 22 70 38 L88 24 L86 50 L88 76 L70 62 Q40 78 18 50 Z" fill="#2E8BD6" />
          <circle cx="32" cy="46" r="3.2" fill="#FFFFFF" /><circle cx="32" cy="46" r="1.6" fill="#15161A" />
          <path d="M48 38 Q52 50 48 62" stroke="#7CC0F0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

// Small seeded random so a given issue keeps the same arrangement
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface Piece {
  kind: BackdropObject;
  x: number;        // 0..1 of viewport width
  y: number;        // 0..1 of viewport height
  size: number;     // px
  angle: number;    // drift direction (radians)
  speed: number;    // px of drift per px scrolled
  spin: number;     // deg per px scrolled
  tilt: number;     // resting rotation
}

interface EditorialBackdropProps {
  setting?: BackdropSetting;
  seed: string;
}

export function EditorialBackdrop({ setting = 'random', seed }: EditorialBackdropProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  const pieces = useMemo<Piece[]>(() => {
    if (setting === 'off') return [];
    const rand = seeded(seed + setting);
    const count = 8;
    return Array.from({ length: count }, (_, i) => ({
      kind: setting === 'random' ? OBJECTS[Math.floor(rand() * OBJECTS.length)] : setting,
      x: (i + 0.5) / count + (rand() - 0.5) * 0.08,
      y: rand(),
      size: 64 + rand() * 84,
      angle: rand() * Math.PI * 2,
      speed: 0.25 + rand() * 0.45,
      spin: (rand() - 0.5) * 0.12,
      tilt: (rand() - 0.5) * 40,
    }));
  }, [setting, seed]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !pieces.length) return;
    const nodes = Array.from(layer.children) as HTMLElement[];
    const reduced = prefersReducedMotion();
    let raf = 0;
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sy = reduced ? 0 : window.scrollY;
      nodes.forEach((node, i) => {
        const p = pieces[i];
        if (!p) return;
        const spanX = vw + p.size * 2;
        const spanY = vh + p.size * 2;
        // Drift along the piece's own direction and wrap around the edges
        const x = ((((p.x * vw + Math.cos(p.angle) * p.speed * sy) % spanX) + spanX) % spanX) - p.size;
        const y = ((((p.y * vh + Math.sin(p.angle) * p.speed * sy) % spanY) + spanY) % spanY) - p.size;
        node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${p.tilt + p.spin * sy}deg)`;
      });
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    place();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pieces]);

  if (!pieces.length) return null;
  return (
    <div ref={layerRef} aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <div key={i} className="absolute left-0 top-0 will-change-transform" style={{ width: p.size, height: p.size }}>
          <Art kind={p.kind} />
        </div>
      ))}
    </div>
  );
}
