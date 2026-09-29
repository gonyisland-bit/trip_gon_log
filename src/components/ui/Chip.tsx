import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Pill chip (spec 4.4): icon + label filter or pick. Selected = ink fill.
// `tone="season"` marks a recommended value (best season) with an emerald outline.

interface ChipProps {
  selected?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: LucideIcon;
  /** Trailing count, e.g. items in a category */
  count?: number;
  tone?: 'default' | 'season';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Chip({
  selected, onClick, icon: Icon, count, tone = 'default', size = 'md', disabled, title, className = '', children,
}: ChipProps) {
  const h = size === 'sm' ? 'h-8 px-3 text-meta' : 'h-9 px-3.5 text-[13px]';
  const look = selected
    ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark border-transparent font-bold'
    : tone === 'season'
      ? 'border-emerald-600/70 dark:border-emerald-400/70 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-600/5'
      : 'border-black/15 dark:border-white/15 text-ink dark:text-ink-dark font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={`${h} inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap shrink-0 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-40 disabled:cursor-not-allowed ${look} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {children}
      {count !== undefined && <span className={selected ? 'opacity-70' : 'text-black/60 dark:text-white/60'}>{count}</span>}
    </button>
  );
}
