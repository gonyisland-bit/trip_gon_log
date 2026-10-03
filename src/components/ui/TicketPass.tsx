import React from 'react';
import { Plane } from 'lucide-react';
import { TicketTear } from './TicketTear';

// The boarding pass face (v1.3.8), shared by the journey board's flight tile and the home bento's terminal tile:
// a kicker, the two ends of the flight (code, time, terminal) joined by a dashed line with a plane, a tear line with a
// half-round punch on each edge, and a foot row. It is the inside of a tile: the tile supplies the ink ground,
// the rounded corners and `overflow-hidden`, and says how much padding it has (`bleed`) so the tear reaches its edges.

export interface PassEnd { code: string; time?: string; note?: string }

export function TicketPass({ kicker, from, to, foot, footEnd, wide, bleed = '-mx-4' }: {
  kicker: string;
  from: PassEnd;
  to: PassEnd;
  foot?: React.ReactNode;
  footEnd?: React.ReactNode;
  wide?: boolean;
  /** Negative side margin that cancels the tile's padding for the tear line */
  bleed?: string;
}) {
  const code = `${wide ? 'text-[34px] sm:text-[40px]' : 'text-[26px]'} font-extrabold tracking-[-0.02em] leading-none`;
  return (
    <>
      <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] opacity-70 flex items-center gap-1.5 min-w-0 pr-8">
        <Plane className="w-3.5 h-3.5 shrink-0" aria-hidden /><span className="truncate">{kicker || '항공권'}</span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="flex flex-col min-w-0">
          <span className={code}>{from.code || '—'}</span>
          <span className="mt-1.5 font-mono text-[13px] font-semibold tabular-nums leading-none">{from.time || '—'}</span>
          {from.note && <span className="mt-1 font-mono text-micro font-bold tracking-wider opacity-60 leading-none">{from.note}</span>}
        </span>
        <span className="flex-1 min-w-3 flex items-center self-start mt-[0.9em] opacity-45" aria-hidden>
          <span className="flex-1 h-0 border-t-[1.5px] border-dashed border-current" />
          <Plane className="w-4 h-4 mx-1 shrink-0" />
          <span className="flex-1 h-0 border-t-[1.5px] border-dashed border-current" />
        </span>
        <span className="flex flex-col items-end min-w-0">
          <span className={code}>{to.code || '—'}</span>
          <span className="mt-1.5 font-mono text-[13px] font-semibold tabular-nums leading-none">{to.time || '—'}</span>
          {to.note && <span className="mt-1 font-mono text-micro font-bold tracking-wider opacity-60 leading-none">{to.note}</span>}
        </span>
      </span>
      <TicketTear className={`${bleed} !w-auto mt-auto`} />
      <span className="flex items-center justify-between gap-2 font-mono text-meta font-semibold tabular-nums opacity-90">
        <span className="truncate">{foot}</span>
        {footEnd && <span className="shrink-0">{footEnd}</span>}
      </span>
    </>
  );
}
