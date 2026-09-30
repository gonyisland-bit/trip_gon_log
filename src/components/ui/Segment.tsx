import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Pill segmented control (spec 4.4): a soft track, the selected option is a surface pill.
// Use for mutually exclusive views or values (stay length, tabs, month / year).

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
}

interface SegmentProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  /** Stretch to the container width, options share it equally */
  block?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function Segment<T extends string>({
  options, value, onChange, size = 'md', block, ariaLabel, className = '',
}: SegmentProps<T>) {
  const h = size === 'sm' ? 'h-8 text-meta px-3' : 'h-9 text-[13px] px-4';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${block ? 'flex w-full' : 'inline-flex'} items-center gap-0.5 p-1 rounded-full bg-black/[0.06] dark:bg-white/10 ${className}`}
    >
      {options.map(({ value: v, label, icon: Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`${block ? 'flex-1' : ''} ${h} inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
              on
                ? 'bg-raised dark:bg-raised-dark text-ink dark:text-ink-dark font-bold shadow-sm'
                : 'text-black/60 dark:text-white/60 font-medium hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
