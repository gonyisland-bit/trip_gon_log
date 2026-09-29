import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { openDepartureBoard } from '../../app/quickActions';

// Home entry to the airport terminal: a one-line board that rolls through the tickets
// waiting there (destination and days to departure). The ticket module loads after the
// home page, so it stays out of the first bundle.

interface TeaserTicket { id: string; name: string; when: string }

export function DepartureTeaser() {
  const [tickets, setTickets] = useState<TeaserTicket[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    let alive = true;
    import('../departure/departureData').then(async ({ readCachedTickets, loadTickets, daysUntil }) => {
      const show = (items: Awaited<ReturnType<typeof loadTickets>>['items']) => {
        if (!alive) return;
        setTickets(items.slice(0, 8).map(t => {
          const days = t.startDate ? daysUntil(t.startDate) : null;
          const n = t.cities?.length || 1;
          return {
            id: t.id,
            name: `${t.cityEn}${n > 1 ? ` +${n - 1}` : ''}`,
            when: days === null ? 'PLANNING' : days > 0 ? `D-${days}` : days === 0 ? 'TODAY' : 'DEPARTED',
          };
        }));
      };
      show(readCachedTickets().items);
      show((await loadTickets()).items);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!tickets || tickets.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(n => (n + 1) % tickets.length), 2600);
    return () => clearInterval(t);
  }, [tickets]);

  const ticket = tickets?.[i % Math.max(1, tickets.length)];

  return (
    <aside aria-label="공항 터미널" className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-3">
      <button
        type="button"
        onClick={openDepartureBoard}
        className="tgl-press group w-full flex items-center gap-3 sm:gap-5 rounded-card bg-[#101012] text-[#F2F2EE] px-4 sm:px-5 py-3 cursor-pointer text-left"
      >
        <span className="font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/55 shrink-0">Departures</span>
        {/* Same line height before the tickets arrive, so the page does not jump */}
        <span key={ticket?.id || 'none'} className={`${ticket ? 'tgl-swap-in' : ''} font-mono font-semibold text-base sm:text-xl uppercase tracking-[0.12em] truncate min-h-[1.5em] sm:min-h-[1.75rem]`}>
          {ticket ? ticket.name : tickets ? 'No tickets' : ''}
        </span>
        {ticket && <span className="font-mono text-meta text-amber-400 shrink-0">{ticket.when}</span>}
        <span className="ml-auto inline-flex items-center gap-2 text-sm font-bold shrink-0 group-hover:text-red-400 transition-colors">
          공항 터미널
          <ArrowRight className="w-4 h-4 transition-transform duration-base group-hover:translate-x-1" />
        </span>
      </button>
    </aside>
  );
}
