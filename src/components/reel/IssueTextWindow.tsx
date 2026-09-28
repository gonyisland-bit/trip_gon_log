import React, { useEffect, useId, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../motion';

// Issue opener (v1.3). The hero photo sits underneath at full quality. A black
// sheet on top has the magazine title cut out of it, so the photo shows through
// the letters. Scrolling:
//   0.00–0.50  the cut-out grows until the sheet is gone
//   0.45–0.62  the hero details settle onto the photo
//   0.62–1.00  the photo holds
//   then       the hero slides up with the stories directly below it, the photo
//              drifting slightly slower and fading into the page as it leaves
// The frame is pinned with position: sticky; if an ancestor's overflow would
// defeat sticky, the frame is pinned with a transform instead.

interface IssueTextWindowProps {
  word: string;
  img: string;
  eyebrow: string;
  overlay?: React.ReactNode;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const charWidth = (w: string) => Array.from(w).reduce((n, ch) => n + (/[ㄱ-힝]/.test(ch) ? 1.6 : 1), 0);

// Break the title into at most two balanced lines
function toLines(word: string): string[] {
  const words = word.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words;
  let best = [words.join(' ')];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(charWidth(a) - charWidth(b));
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}

// True when an ancestor clips or scrolls, which stops position: sticky from pinning to the viewport
function stickyIsTrapped(el: HTMLElement): boolean {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const s = getComputedStyle(node);
    if (/(hidden|auto|scroll)/.test(s.overflowX + s.overflowY)) return true;
  }
  return false;
}

export function IssueTextWindow({ word, img, eyebrow, overlay, onTouchStart, onTouchEnd }: IssueTextWindowProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const maskId = `tgl-mask-${useId().replace(/:/g, '')}`;
  const [state, setState] = useState({ progress: 0, exit: 0, pin: 0 });
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [reduced] = useState(() => prefersReducedMotion());
  const [manualPin, setManualPin] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    const trapped = !!el && stickyIsTrapped(el);
    setManualPin(trapped);
    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      setSize({ w: window.innerWidth, h: vh });
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - vh;
      const progress = reduced || travel <= 0 ? (reduced ? 1 : 0) : Math.max(0, Math.min(1, -rect.top / travel));
      // How far the released frame has left the screen (0 = still full, 1 = gone)
      const exit = Math.max(0, Math.min(1, 1 - rect.bottom / vh));
      const pin = trapped ? Math.max(0, Math.min(travel, -rect.top)) : 0;
      setState({ progress, exit, pin });
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  const { progress: p, exit, pin } = state;
  const grow = smooth(0, 0.5, p);
  const scale = 1 + Math.pow(grow, 2.4) * 28;
  const sheetOpacity = reduced ? 0 : 1 - smooth(0.36, 0.5, p);
  const chromeOpacity = 1 - smooth(0, 0.18, p);
  const overlayIn = reduced ? 1 : smooth(0.45, 0.62, p);
  const leave = smooth(0, 1, exit);

  const lines = toLines(word);
  const longest = Math.max(4, ...lines.map(charWidth));
  const fontPx = Math.min(size.w * 0.21, (size.w * 1.6) / longest, size.h * (lines.length > 1 ? 0.3 : 0.56), 320);
  const lineGap = fontPx * 0.96;
  const cx = size.w / 2;
  const cy = size.h / 2;
  const firstBaseline = cy - ((lines.length - 1) * lineGap) / 2 + fontPx * 0.36;

  return (
    <section
      ref={sectionRef}
      aria-label={word}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative w-full"
      style={{ height: reduced ? '100svh' : '220svh' }}
    >
      <div
        className={`${manualPin ? 'absolute left-0 right-0' : 'sticky'} top-0 h-[100svh] w-full overflow-hidden`}
        style={manualPin ? { transform: `translate3d(0, ${pin}px, 0)` } : undefined}
      >
        {/* The hero photo, full quality; it drifts a little slower and fades into the page as it leaves */}
        <img
          src={img}
          alt={word}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{ opacity: 1 - leave * 0.85, transform: `translate3d(0, ${leave * size.h * 0.22}px, 0)` }}
        />

        {/* Shade under the hero details */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" style={{ opacity: overlayIn * (1 - leave) }} />

        {/* Black sheet with the title cut out */}
        {sheetOpacity > 0.01 && (
          <svg
            aria-hidden
            className="tgl-opener-letters absolute inset-0 w-full h-full"
            viewBox={`0 0 ${size.w} ${size.h}`}
            preserveAspectRatio="none"
            style={{ opacity: sheetOpacity }}
          >
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
                <rect x="0" y="0" width={size.w} height={size.h} fill="#fff" />
                <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={cx}
                      y={firstBaseline + i * lineGap}
                      textAnchor="middle"
                      fill="#000"
                      fontSize={fontPx}
                      fontWeight={800}
                      style={{ fontFamily: 'Satoshi, Inter, "Noto Sans KR", sans-serif', letterSpacing: '-0.05em' }}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </mask>
            </defs>
            <rect x="0" y="0" width={size.w} height={size.h} fill="#000" mask={`url(#${maskId})`} />
          </svg>
        )}

        <div className="absolute top-20 sm:top-24 inset-x-4 sm:inset-x-10 flex justify-between font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/80 pointer-events-none" style={{ opacity: chromeOpacity }}>
          <span>{eyebrow}</span>
          <span>Tripgon Magazine</span>
        </div>
        {!reduced && (
          <span className="absolute bottom-8 right-4 sm:right-10 flex flex-col items-center gap-2 font-mono text-micro tracking-[0.2em] uppercase text-white/70 pointer-events-none" style={{ opacity: chromeOpacity }}>
            Scroll
            <span className="block w-px h-8 bg-white/60 origin-top tgl-scroll-cue" />
          </span>
        )}

        {/* Hero details settle onto the photo */}
        {overlay && (
          <div
            className="absolute inset-0"
            style={{
              opacity: overlayIn * (1 - leave * 1.4),
              transform: `translateY(${(1 - overlayIn) * 24}px)`,
              pointerEvents: overlayIn > 0.5 && leave < 0.5 ? 'auto' : 'none',
            }}
          >
            {overlay}
          </div>
        )}
      </div>
    </section>
  );
}
