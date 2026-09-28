import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../motion';

// Issue opener (v1.3). One scroll sequence replaces the old separate hero:
//  1. the magazine title, huge, with the cover photo showing through the letters
//  2. scrolling pushes into the letters until the photo fills the screen
//  3. the hero details (title, meta, actions) settle onto the photo
//  4. the bottom of the photo melts into the page background, so the issue
//     content that follows continues without a hard edge or a gap

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

// Size the letters so the longest word fits the width and the block fits the height
function letterSize(word: string): string {
  const words = word.split(/\s+/).filter(Boolean);
  const longest = Math.max(4, ...words.map(w => Array.from(w).reduce((n, ch) => n + (/[ㄱ-힝]/.test(ch) ? 1.6 : 1), 0)));
  const byWidth = Math.round(165 / longest);
  const byHeight = words.length > 1 ? 30 : 58;
  return `min(21vw, ${byWidth}vw, ${byHeight}svh, 320px)`;
}

export function IssueTextWindow({ word, img, eyebrow, overlay, onTouchStart, onTouchEnd }: IssueTextWindowProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      setProgress(travel > 0 ? Math.max(0, Math.min(1, -rect.top / travel)) : 0);
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

  const p = reduced ? 1 : progress;
  const scale = 1 + Math.pow(smooth(0, 0.62, p), 2.2) * 16;
  const textOpacity = 1 - smooth(0.4, 0.62, p);
  const photoOpacity = smooth(0.18, 0.6, p);
  const eyebrowOpacity = 1 - smooth(0, 0.2, p);
  const overlayIn = smooth(0.62, 0.86, p);
  const melt = smooth(0.7, 1, p);
  const bg = `url("${img}")`;

  return (
    <section
      ref={sectionRef}
      aria-label={word}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative w-full"
      style={{ height: reduced ? '100svh' : '210svh' }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex items-center justify-center">
        {/* Black stage that the page background takes over at the end */}
        <div aria-hidden className="absolute inset-0 bg-black" />

        {/* Cover photo */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: bg, opacity: photoOpacity, transform: `scale(${1.1 - photoOpacity * 0.1})` }}
        />
        {/* Shade for the hero text */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30" style={{ opacity: overlayIn }} />

        {/* Letters as a window onto the photo. Line height 1 plus padding keeps the
            painted background under every glyph, so nothing is clipped. */}
        <h2
          className="tgl-opener-letters relative font-sans font-extrabold uppercase text-center break-keep"
          style={{
            fontSize: letterSize(word),
            lineHeight: 1,
            letterSpacing: '-0.055em',
            padding: '0.08em 0.12em',
            backgroundImage: bg,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            transform: `scale(${scale})`,
            opacity: textOpacity,
            visibility: textOpacity < 0.01 ? 'hidden' : 'visible',
          }}
        >
          {word}
        </h2>

        <div className="absolute top-20 sm:top-24 inset-x-4 sm:inset-x-10 flex justify-between font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/80 pointer-events-none" style={{ opacity: eyebrowOpacity }}>
          <span>{eyebrow}</span>
          <span>Tripgon Magazine</span>
        </div>
        {!reduced && (
          <span className="absolute bottom-8 right-4 sm:right-10 flex flex-col items-center gap-2 font-mono text-micro tracking-[0.2em] uppercase text-white/70 pointer-events-none" style={{ opacity: eyebrowOpacity }}>
            Scroll
            <span className="block w-px h-8 bg-white/60 origin-top tgl-scroll-cue" />
          </span>
        )}

        {/* Hero details settle onto the photo */}
        {overlay && (
          <div
            className="absolute inset-0"
            style={{
              opacity: overlayIn,
              transform: `translateY(${(1 - overlayIn) * 24}px)`,
              pointerEvents: overlayIn > 0.5 ? 'auto' : 'none',
            }}
          >
            {overlay}
          </div>
        )}

        {/* The photo's lower edge melts into the page background */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[28%] pointer-events-none bg-gradient-to-t from-white via-white/70 to-transparent dark:from-[#141414] dark:via-[#141414]/70"
          style={{ opacity: melt }}
        />
      </div>
    </section>
  );
}
