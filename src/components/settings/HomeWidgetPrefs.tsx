import React from 'react';
import { Segment } from '../ui/Segment';
import { setHomeWidgets, useHomeWidgets, type HomeWidgetPrefs as Prefs } from '../../utils/homeWidgetPrefs';

// Settings → 화면 → 홈 위젯: which widgets this member's home shows, and in what order.

const ROWS: { key: keyof Prefs; label: string }[] = [
  { key: 'showLiveWeather', label: '내 도시 날씨' },
  { key: 'showCalendarArchive', label: '이달의 달력' },
  { key: 'showUpcomingDDay', label: '다가오는 여정 D-day' },
  { key: 'showExchangeRates', label: '환율' },
];

export function HomeWidgetPrefs({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const w = useHomeWidgets();
  return (
    <section className={cardClass}>
      <span className={labelClass}>Home widgets</span>
      {ROWS.map(({ key, label }) => {
        const on = Boolean(w[key]);
        return (
          <div key={key} className="flex items-center justify-between gap-3 min-h-8">
            <span className="text-[14px] font-bold">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={label}
              onClick={() => setHomeWidgets({ [key]: !on } as Partial<Prefs>)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${on ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        );
      })}
      {w.showLiveWeather && w.showCalendarArchive && (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold">순서</span>
          <Segment<Prefs['widgetOrder']>
            block
            ariaLabel="홈 위젯 순서"
            value={w.widgetOrder}
            onChange={(v) => setHomeWidgets({ widgetOrder: v })}
            options={[{ value: 'calendar-first', label: '달력 먼저' }, { value: 'weather-first', label: '날씨 먼저' }]}
          />
        </div>
      )}
    </section>
  );
}
