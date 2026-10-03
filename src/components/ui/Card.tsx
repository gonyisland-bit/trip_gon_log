import React from 'react';

// Surface card (spec 4.9): surface fill on paper, rounded-card, no border.
// CardRow is the list form: thumbnail · title · meta · trailing slot.

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
}

const PADS = { none: '', sm: 'p-2.5', md: 'p-4 sm:p-5' };

export function Card({ padding = 'md', className = '', children, ...rest }: CardProps) {
  return (
    <div className={`bg-surface dark:bg-surface-dark rounded-card ${PADS[padding]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

interface CardRowProps {
  /** Image URL for the thumbnail; omit for no thumbnail */
  thumb?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  /** Highlights the row as current (LIVE / NOW) with a red ring */
  current?: boolean;
  className?: string;
}

export function CardRow({ thumb, title, meta, trailing, onClick, current, className = '' }: CardRowProps) {
  const body = (
    <>
      {thumb !== undefined && (
        <span className="w-14 h-14 rounded-thumb overflow-hidden bg-black/[0.06] dark:bg-white/10 shrink-0">
          {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
        </span>
      )}
      <span className="flex-1 min-w-0 flex flex-col text-left">
        <span className="text-[15px] font-bold truncate">{title}</span>
        {meta && <span className="text-micro font-mono uppercase tracking-wider text-black/60 dark:text-white/60 truncate">{meta}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = `w-full flex items-center gap-3 p-2.5 rounded-card bg-surface dark:bg-surface-dark ${current ? 'ring-[1.5px] ring-inset ring-red-600 dark:ring-red-500' : ''} ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} tgl-press hover:bg-black/[0.02] dark:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
