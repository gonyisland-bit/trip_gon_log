import React, { memo, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../motion';
import { BookOpen } from 'lucide-react';

// Magazine issue card (v1.3): the cover is the whole card. Two sheets behind it
// mark it as a publication; on hover the cover opens slightly on its spine.

interface IssueCardProps {
  coverImg: string;       // already resolved URL
  issueNumber: string;    // "01"
  dateLabel: string;      // "2025 AUTUMN"
  title: string;
  subtitle?: string;
  location: string;
  storyCount: number;
  index?: number;
  onOpen: () => void;
}

export const IssueCard = memo(function IssueCard({ coverImg, issueNumber, dateLabel, title, subtitle, location, storyCount, index = 0, onOpen }: IssueCardProps) {
  // Opening: the cover grows from its place in the grid to fill the screen and
  // dims to black, which is exactly where the issue opener starts.
  const coverRef = useRef<HTMLDivElement>(null);
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    const cover = coverRef.current;
    if (prefersReducedMotion() || !cover) { onOpen(); return; }
    setOpening(true);
    const r = cover.getBoundingClientRect();
    const stage = document.createElement('div');
    Object.assign(stage.style, {
      position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '150',
      background: '#000', pointerEvents: 'none', overflow: 'hidden',
      clipPath: `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px)`,
    });
    const photo = document.createElement('img');
    photo.src = coverImg;
    Object.assign(photo.style, { position: 'absolute', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', objectFit: 'cover' });
    if (coverImg) stage.appendChild(photo);
    document.body.appendChild(stage);

    const ease = 'cubic-bezier(.7, 0, .2, 1)';
    const grow = stage.animate([{}, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 560, easing: ease, fill: 'forwards' });
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.max(vw / r.width, vh / r.height);
    const toCenter = `translate(${vw / 2 - (r.left + r.width / 2)}px, ${vh / 2 - (r.top + r.height / 2)}px) scale(${s})`;
    photo.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: toCenter, opacity: 0.25, offset: 0.8 },
        { transform: toCenter, opacity: 0 },
      ],
      { duration: 560, easing: ease, fill: 'forwards' }
    );
    grow.finished.then(() => {
      onOpen();
      // Let the issue paint under the black stage, then lift the stage
      requestAnimationFrame(() => requestAnimationFrame(() => {
        stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2, 0, 0, 1)', fill: 'forwards' })
          .finished.finally(() => stage.remove());
      }));
    }).catch(() => { stage.remove(); onOpen(); });
  };

  return (
    <article
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(); }}
      tabIndex={0}
      aria-label={`NO. ${issueNumber} ${title}`}
      className={`tgl-issue-card tgl-rise group ${opening ? 'pointer-events-none' : ''} relative pr-2.5 pb-2.5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-[#141414]`}
      style={{ '--i': index } as React.CSSProperties}
    >
      {/* Sheets behind the cover */}
      <div aria-hidden className="absolute left-2.5 top-2.5 right-0 bottom-0 border border-black/15 dark:border-white/20 bg-white dark:bg-[#1A1A1A]" />
      <div aria-hidden className="absolute left-1.5 top-1.5 right-1 bottom-1 border border-black/15 dark:border-white/20 bg-white dark:bg-[#1A1A1A]" />

      <div ref={coverRef} className="tgl-issue-cover relative aspect-[3/4] w-full overflow-hidden bg-zinc-900 text-white">
        {coverImg ? (
          <img src={coverImg} alt={title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <BookOpen className="w-8 h-8 stroke-1" />
          </div>
        )}
        {/* Legibility for masthead and coverline */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/65 pointer-events-none" />
        {/* Spine shade */}
        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 to-transparent pointer-events-none" />

        <div className="absolute inset-x-3 top-2.5 sm:inset-x-4 sm:top-3.5 flex items-center justify-between font-mono text-micro font-semibold tracking-[0.14em] uppercase">
          <span>NO. {issueNumber}</span>
          <span className="truncate pl-2">{dateLabel}</span>
        </div>

        <h3 className="absolute inset-x-3 top-8 sm:inset-x-4 sm:top-10 font-sans font-extrabold leading-[0.95] tracking-[-0.04em] break-keep line-clamp-3 text-2xl sm:text-3xl md:text-[34px]">
          {title}
        </h3>

        <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 flex flex-col gap-1">
          {subtitle && <p className="text-meta sm:text-[13px] leading-snug line-clamp-2 break-keep text-white/90">{subtitle}</p>}
          <p className="font-mono text-micro font-semibold tracking-wider uppercase text-white/85 truncate">
            {location} · {storyCount} {storyCount === 1 ? 'STORY' : 'STORIES'}
          </p>
        </div>
      </div>
    </article>
  );
});
