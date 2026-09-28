import React, { memo, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MagazineSection } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { swipeStart, swipeDirection, SwipeStart } from '../../utils/swipe';

// Magazine spread (v1.3 P5-7): the three-card preview of a magazine issue with
// issue tabs, prev/next and swipe. Shared by the home page and the magazine hub
// so both read and behave the same.

export interface SpreadCard {
  key: string;
  img: string;
  title: string;
  place: string;
  date: string;
}

interface MagazineSpreadProps {
  sections: MagazineSection[];
  activeId: string | undefined;
  onSelect: (sectionId: string) => void;
  cardsFor: (section: MagazineSection) => SpreadCard[];
  onOpen: (sectionId: string) => void;
  heading: React.ReactNode;
  ctaLabel: string;
  tabIdPrefix: string;
}

const navBtn = 'tap-target w-9 h-9 border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center bg-transparent text-black dark:text-white';

export const MagazineSpread = memo(function MagazineSpread({ sections, activeId, onSelect, cardsFor, onOpen, heading, ctaLabel, tabIdPrefix }: MagazineSpreadProps) {
  const touch = useRef<SwipeStart | null>(null);
  const index = Math.max(0, sections.findIndex(s => s.id === activeId));
  const active = sections[index];

  const select = (i: number) => {
    const sec = sections[i];
    if (!sec) return;
    onSelect(sec.id);
    document.getElementById(`${tabIdPrefix}-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-black/15 dark:border-white/15">
        <div className="min-w-0">{heading}</div>
        {sections.length > 1 && (
          <div className="flex items-center gap-3 max-w-full lg:max-w-2xl shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1 scroll-smooth">
              {sections.map((sec, i) => {
                const on = i === index;
                return (
                  <button
                    key={sec.id}
                    id={`${tabIdPrefix}-${sec.id}`}
                    type="button"
                    onClick={() => select(i)}
                    aria-pressed={on}
                    className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
                      on
                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                        : 'bg-transparent border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    {sec.title}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => select(index - 1)} disabled={index <= 0} className={navBtn} aria-label="이전 이슈">
                <ChevronLeft className="w-4 h-4 stroke-[2]" />
              </button>
              <button type="button" onClick={() => select(index + 1)} disabled={index >= sections.length - 1} className={navBtn} aria-label="다음 이슈">
                <ChevronRight className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* One page per issue, slid sideways; swipe on touch screens */}
      <div
        className="w-full overflow-hidden touch-pan-y"
        onTouchStart={e => { touch.current = swipeStart(e); }}
        onTouchEnd={e => {
          const dir = swipeDirection(touch.current, e, 50);
          touch.current = null;
          if (dir !== 0) select(dir === -1 ? index + 1 : index - 1);
        }}
      >
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {sections.map((sec, si) => {
            // Only the open page and its neighbours carry cards; the rest stay empty until reached
            const near = Math.abs(si - index) <= 1;
            const cards = near ? cardsFor(sec).slice(0, 3) : [];
            return (
              <div key={sec.id || si} className="w-full shrink-0" aria-hidden={si !== index}>
                {!near ? null : cards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                    {cards.map((c, ci) => (
                      <article key={c.key} onClick={() => onOpen(sec.id)} className="group flex flex-col justify-between cursor-pointer">
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                          <img src={getEffectiveImageUrl(c.img)} alt={c.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none" />
                          <div className="absolute top-2.5 left-2.5 bg-black/60 dark:bg-white/70 backdrop-blur-xs text-white dark:text-black font-mono text-micro font-bold px-1.5 py-0.5 uppercase tracking-widest">
                            {String(ci + 1).padStart(2, '0')}
                          </div>
                        </div>
                        <div className="pt-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-meta font-mono font-bold uppercase tracking-[0.15em] text-red-600 dark:text-red-400 truncate">{c.place}</div>
                            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight line-clamp-1 leading-snug group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors mt-0.5">{c.title}</h3>
                          </div>
                          <div className="pt-2 mt-2 flex items-center justify-between text-meta font-mono text-black/60 dark:text-white/60 border-t border-black/10 dark:border-white/10 tracking-wider">
                            <span>{c.date}</span>
                            <span className="font-bold text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform">VIEW →</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60 border border-dashed border-black/20 dark:border-white/20 p-6">
                    이 이슈에는 미리 볼 사진이 없습니다.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {active && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => onOpen(active.id)}
            className="tgl-press px-8 py-3.5 bg-black text-white dark:bg-white dark:text-black text-xs sm:text-sm font-mono font-bold uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 hover:text-white dark:hover:text-white transition-colors cursor-pointer flex items-center gap-2 group"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
});
