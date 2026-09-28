import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { openDepartureBoard } from '../QuickActionBar';
import { candidates, defaultFilters, flightHours, formatHours } from '../departure/departureData';

// Home entry to the Departure Board: a one-line board that rolls through
// destinations that are in season next month.

export function DepartureTeaser() {
  const pool = useMemo(() => candidates(defaultFilters()).slice(0, 12), []);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (pool.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(n => (n + 1) % pool.length), 2600);
    return () => clearInterval(t);
  }, [pool.length]);

  const city = pool[i];
  if (!city) return null;

  return (
    <aside aria-label="여행지 뽑기" className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-3">
      <button
        type="button"
        onClick={openDepartureBoard}
        className="tgl-press group w-full flex items-center gap-3 sm:gap-5 bg-[#0B0B0C] text-[#F2F2EE] px-4 sm:px-5 py-3 cursor-pointer text-left"
      >
        <span className="font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/55 shrink-0">Departures</span>
        <span key={city.nameEn} className="tgl-swap-in font-mono font-semibold text-base sm:text-xl uppercase tracking-[0.12em] truncate">
          {city.nameEn}
        </span>
        <span className="hidden sm:inline font-mono text-meta text-white/55 shrink-0">{formatHours(flightHours(city))}</span>
        <span className="ml-auto inline-flex items-center gap-2 text-sm font-bold shrink-0 group-hover:text-red-400 transition-colors">
          여행지 뽑기
          <ArrowRight className="w-4 h-4 transition-transform duration-base group-hover:translate-x-1" />
        </span>
      </button>
    </aside>
  );
}
