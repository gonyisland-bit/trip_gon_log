import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Round icon-only button (spec 4.4): 44px touch target.
// tone: surface (on paper), ink (primary), accent (red, new trip), glass (over photos).

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name */
  label: string;
  tone?: 'surface' | 'ink' | 'accent' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

const TONES = {
  surface: 'bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-ink-dark hover:bg-black/[0.04] dark:hover:bg-white/[0.08]',
  ink: 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark hover:bg-ink/85 dark:hover:bg-ink-dark/85',
  accent: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600',
  glass: 'bg-white/30 text-white hover:bg-white/40',
};

const SIZES = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-14 h-14' };
const ICONS = { sm: 'w-4 h-4', md: 'w-[18px] h-[18px]', lg: 'w-6 h-6' };

export function IconButton({
  icon: Icon, label, tone = 'surface', size = 'md', type = 'button', className = '', ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={rest.title ?? label}
      className={`${SIZES[size]} ${TONES[tone]} tgl-press tap-target inline-grid place-items-center rounded-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      <Icon className={ICONS[size]} aria-hidden />
    </button>
  );
}
