import React from 'react';
import { ArrowRight } from 'lucide-react';
import { kindArtUrl, placeKind } from '../../utils/placeArt';
import { inferAirportCode } from '../../utils/bookingDeepLinks';
import { DepartureTicket, ticketRange, ticketStatus, ticketStops } from './departureData';

// The ticket as a boarding pass (v1.3.7): the trip on the left, a dotted stub with its state on the
// right. One face is used by the counter card, the kept tickets and the ticket sheet.

const label = 'font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55';

export function TicketFace({ ticket, className = '' }: { ticket: DepartureTicket; className?: string }) {
  const st = ticketStatus(ticket);
  const stops = ticketStops(ticket);
  const code = inferAirportCode(ticket.cityEn);
  const art = kindArtUrl(placeKind(ticket.plan?.tags || [], ticket.cityEn), ticket.id);
  const tone = st.tone === 'red' ? 'text-red-600 dark:text-red-400' : st.tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-ink dark:text-ink-dark';
  const pax = ticket.members?.length || 0;
  return (
    <div className={`relative flex rounded-card bg-surface dark:bg-surface-dark overflow-hidden text-left text-ink dark:text-ink-dark ${className}`}>
      <div className="flex-1 min-w-0 p-4 flex items-center gap-3">
        <img src={art} alt="" aria-hidden loading="lazy" className="w-14 h-14 rounded-thumb object-cover shrink-0" />
        <div className="min-w-0 flex flex-col gap-1">
          <span className={`${label} truncate`}>{ticket.flightNo} · Gate {ticket.gate}</span>
          <span className="flex items-baseline gap-1.5 text-[22px] font-extrabold tracking-tight leading-none tabular-nums">
            ICN<ArrowRight className="w-4 h-4 self-center shrink-0 text-black/40 dark:text-white/40" aria-hidden />{code}
            {stops.length > 1 && <span className="font-mono text-meta font-bold text-black/55 dark:text-white/55">+{stops.length - 1}</span>}
          </span>
          <span className="text-[13px] font-bold truncate">{ticket.plan?.title || `${ticket.cityKo} 여행`}</span>
          <span className="font-mono text-meta text-black/60 dark:text-white/60 truncate tabular-nums">
            {ticketRange(ticket)}{ticket.nights ? ` · ${ticket.nights}N` : ''}
          </span>
        </div>
      </div>
      <div className="relative shrink-0 w-[88px] sm:w-[104px] px-2 flex flex-col items-center justify-center gap-1 text-center border-l-2 border-dotted border-black/15 dark:border-white/15 before:absolute before:-left-2 before:-top-2 before:w-4 before:h-4 before:rounded-full before:bg-paper dark:before:bg-paper-dark after:absolute after:-left-2 after:-bottom-2 after:w-4 after:h-4 after:rounded-full after:bg-paper dark:after:bg-paper-dark">
        <span className={`font-mono text-[15px] font-extrabold tracking-tight tabular-nums ${tone}`}>{st.text}</span>
        {pax > 0 && <span className={label}>{pax} PAX</span>}
      </div>
    </div>
  );
}

/** The counter's ticket: a card of one ticket's width that opens the ticket sheet */
export function TicketCard({ ticket, onOpen }: { ticket: DepartureTicket; onOpen: () => void }) {
  return (
    <button
      key={ticket.id}
      type="button"
      onClick={onOpen}
      aria-label={`${ticket.cityKo} 티켓 열기`}
      className="tgl-rise tgl-press block w-full max-w-[400px] rounded-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
    >
      <TicketFace ticket={ticket} />
    </button>
  );
}
