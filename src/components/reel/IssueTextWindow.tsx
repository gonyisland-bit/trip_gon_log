import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../motion';

// Issue opener (v1.3): the place name is set huge and the cover photo shows
// through the letters. Scrolling pushes into the letters until the photo fills
// the screen, then the regular issue hero follows.

interface IssueTextWindowProps {
  word: string;
  img: string;
  eyebrow: string;
  caption?: string;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function IssueTextWindow({ word, img, eyebrow, caption }: IssueTextWindowProps) {
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

  const scale = 1 + Math.pow(progress, 2.2) * 16;
  const textOpacity = 1 - smooth(0.55, 0.85, progress);
  const photoOpacity = smooth(0.3, 0.8, progress);
  const chromeOpacity = 1 - smooth(0, 0.25, progress);
  const bg = `url("${img}")`;

  return (
    <section
      ref={sectionRef}
      aria-label={word}
      className="relative w-full bg-black text-white"
      style={{ height: reduced ? '70vh' : '185vh' }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex items-center justify-center">
        {/* Photo that takes over at the end */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: bg, opacity: reduced ? 0.25 : photoOpacity, transform: `scale(${1.12 - photoOpacity * 0.12})` }}
        />

        {/* Letters as a window onto the photo */}
        <h2
          className="relative font-sans font-extrabold uppercase leading-[0.82] tracking-[-0.06em] text-center px-4 break-keep will-change-transform"
          style={{
            fontSize: 'clamp(72px, 21vw, 340px)',
            backgroundImage: bg,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            transform: `scale(${scale})`,
            opacity: textOpacity,
          }}
        >
          {word}
        </h2>

        {/* Eyebrow, caption and scroll cue */}
        <div className="absolute top-20 sm:top-24 inset-x-4 sm:inset-x-10 flex justify-between font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/80" style={{ opacity: chromeOpacity }}>
          <span>{eyebrow}</span>
          <span>Tripgon Magazine</span>
        </div>
        <div className="absolute bottom-8 inset-x-4 sm:inset-x-10 flex items-end justify-between gap-6" style={{ opacity: chromeOpacity }}>
          {caption ? <p className="max-w-md text-sm sm:text-base text-white/80 leading-relaxed break-keep">{caption}</p> : <span />}
          {!reduced && (
            <span className="flex flex-col items-center gap-2 font-mono text-micro tracking-[0.2em] uppercase text-white/70 shrink-0">
              Scroll
              <span className="block w-px h-8 bg-white/60 origin-top tgl-scroll-cue" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
