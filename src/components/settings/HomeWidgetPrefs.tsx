import React from 'react';
import { BENTO_TILES, isTileOn, setTileOn, useHomeWidgets } from '../../utils/homeWidgetPrefs';

// Settings → 화면 → 홈 타일: which tiles the home bento shows. The hero is always there.

export function HomeWidgetPrefs({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const w = useHomeWidgets();
  return (
    <section className={cardClass}>
      <span className={labelClass}>Home tiles</span>
      {BENTO_TILES.map(({ id, label }) => {
        const on = isTileOn(w, id);
        return (
          <div key={id} className="flex items-center justify-between gap-3 min-h-8">
            <span className="text-[14px] font-bold">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={label}
              onClick={() => setTileOn(id, !on)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${on ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        );
      })}
    </section>
  );
}
