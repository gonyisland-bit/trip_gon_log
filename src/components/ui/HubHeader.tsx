import React from 'react';

// Hub masthead (v1.3.7 design, spec 4.2): the hub's face colour as one soft panel, a mono
// eyebrow and a two-tone title (second line in the tint's ink at half strength).

export type HubTint = 'peach' | 'butter' | 'coral' | 'sage' | 'mist' | 'lilac';

const TINT: Record<HubTint, string> = {
  peach: 'bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach',
  butter: 'bg-butter text-butter-ink dark:bg-butter-dark dark:text-butter',
  coral: 'bg-coral text-coral-ink dark:bg-coral-dark dark:text-coral',
  sage: 'bg-sage text-sage-ink dark:bg-sage-dark dark:text-sage',
  mist: 'bg-mist text-mist-ink dark:bg-mist-dark dark:text-mist',
  lilac: 'bg-lilac text-lilac-ink dark:bg-lilac-dark dark:text-lilac',
};

interface Props {
  tint: HubTint;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  /** Second line, in the lighter tone */
  sub?: React.ReactNode;
  /** Right side on wide screens, below on phones (a segment, a count) */
  aside?: React.ReactNode;
  className?: string;
}

export function HubHeader({ tint, eyebrow, title, sub, aside, className = '' }: Props) {
  return (
    <header className={`w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-4 sm:pt-6 ${className}`}>
      <div className={`tgl-rise rounded-card ${TINT[tint]} px-5 sm:px-8 py-6 sm:py-9 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6`}>
        <div className="min-w-0 flex flex-col gap-2">
          <span className="font-mono text-micro sm:text-meta font-bold uppercase tracking-[0.16em] opacity-75">{eyebrow}</span>
          <h1 className="text-[34px] sm:text-6xl font-extrabold tracking-[-0.04em] leading-[0.98] break-keep">
            {title}
            {sub && <><br /><span className="opacity-60">{sub}</span></>}
          </h1>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
