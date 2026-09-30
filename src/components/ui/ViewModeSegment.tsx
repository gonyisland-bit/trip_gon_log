import { LayoutGrid, List, StretchHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Grid / Wide / List switch for journey lists (Home, Trips). Icon pills on a soft track.

export type CardViewMode = 'grid' | 'wide' | 'list';

const MODES: { value: CardViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'grid', label: '격자 보기', icon: LayoutGrid },
  { value: 'wide', label: '넓게 보기', icon: StretchHorizontal },
  { value: 'list', label: '목록 보기', icon: List },
];

export function ViewModeSegment({ value, onChange, className = '' }: { value: CardViewMode; onChange: (v: CardViewMode) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="보기 방식" className={`inline-flex items-center gap-0.5 p-1 rounded-full bg-black/[0.06] dark:bg-white/10 shrink-0 ${className}`}>
      {MODES.map(({ value: v, label, icon: Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(v)}
            className={`w-9 h-8 grid place-items-center rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
              on ? 'bg-raised dark:bg-raised-dark text-ink dark:text-ink-dark shadow-sm' : 'text-black/60 dark:text-white/60 hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
