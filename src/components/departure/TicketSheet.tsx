import React, { useMemo, useState } from 'react';
import { ArrowUp, BedDouble, PencilLine, Plane, Ticket, Trash2 } from 'lucide-react';
import { Sheet, useSheetClose } from '../Sheet';
import { Chip } from '../ui/Chip';
import { QuickBookingModal } from '../QuickBookingModal';
import { findCityByNameOrAlias } from '../../data/worldDestinations';
import { findPastStays } from '../../utils/pastStays';
import { inferAirportCode } from '../../utils/bookingDeepLinks';
import type { Plan, StayItem, Trip } from '../../types';
import { DepartureTicket, formatHours, ticketRange, ticketStops } from './departureData';
import { TicketFace } from './TicketCard';
import { Art } from '../../art/Art';

// The ticket sheet (v1.3.7): one ticket in full, with smart booking for its flight and its stays, and
// the actions that belong to it. A ticket at the counter boards; a kept one is raised to the counter.

interface TicketSheetProps {
  ticket: DepartureTicket;
  atCounter: boolean;
  trips: Trip[];
  plans: Plan[];
  staysByTrip: Record<number, StayItem[]>;
  boarding: boolean;
  onClose: () => void;
  /** Each handler resolves true when it did its work, so the sheet closes after it */
  onBoard: () => Promise<boolean>;
  onRaise: () => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  onPlan: () => void;
}

export function TicketSheet(props: TicketSheetProps) {
  return (
    <Sheet label={`${props.ticket.cityKo} 티켓`} tone="paper" onClose={props.onClose} panelClassName="sm:max-w-md max-h-[92dvh]">
      <Content {...props} />
    </Sheet>
  );
}

const kicker = 'font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55';

function Row({ name, value }: { name: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 min-h-[44px] py-3 border-b border-black/[0.06] dark:border-white/[0.08] last:border-0">
      <span className={`${kicker} shrink-0 pt-0.5`}>{name}</span>
      <span className="min-w-0 text-[14px] font-semibold text-right break-keep [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

function Content({ ticket, atCounter, trips, plans, staysByTrip, boarding, onBoard, onRaise, onRemove, onPlan }: TicketSheetProps) {
  const close = useSheetClose();
  const stops = ticketStops(ticket);
  const [stopIdx, setStopIdx] = useState(0);
  const [booking, setBooking] = useState<'flight' | 'stay' | null>(null);
  const [busy, setBusy] = useState(false);

  // Flights go to the first stop; stays to the chosen one
  const stop = booking === 'flight' ? stops[0] : stops[Math.min(stopIdx, stops.length - 1)];
  const stopCity = findCityByNameOrAlias(stop.en) ?? findCityByNameOrAlias(stop.ko);
  const pastStays = useMemo(() => booking === 'stay'
    ? findPastStays({ id: -1, locationStr: stop.ko, lat: stopCity?.lat, lng: stopCity?.lng }, [...trips, ...plans], staysByTrip)
    : [], [booking, stop.ko, stopCity, trips, plans, staysByTrip]);

  const days = ticket.plan?.timeline?.length || 0;
  const places = ticket.plan?.timeline?.reduce((n, d) => n + (d.items?.length || 0), 0) || 0;
  const run = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    try { if (await action()) close(); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex flex-col gap-1 px-1">
        <span className={kicker}>Ticket</span>
        <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{ticket.plan?.title || `${ticket.cityKo} 여행`}</h2>
      </div>
      <TicketFace ticket={ticket} className="shrink-0" />

      {/* A ticket kept before its days were planned */}
      {!ticket.plan && (
        <div className="rounded-card bg-butter/60 dark:bg-butter-dark px-3 py-2 flex items-center gap-3">
          <Art id="departure-board" className="h-24 w-auto shrink-0 rounded-thumb" />
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="text-[15px] font-extrabold tracking-tight">일정이 아직 없어요</span>
            <span className="text-meta text-black/60 dark:text-white/60 break-keep">날짜와 일정을 정하면 탑승할 수 있는 티켓이 됩니다.</span>
          </div>
        </div>
      )}

      <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-1">
        <Row name="기간" value={`${ticketRange(ticket)}${ticket.nights ? ` · ${ticket.nights}박 ${ticket.nights + 1}일` : ''}`} />
        <Row name="도시" value={`서울 → ${stops.map(s => s.ko).join(' → ')}`} />
        <Row name="인원" value={ticket.members?.length ? ticket.members.join(', ') : undefined} />
        <Row name="비행" value={`${formatHours(ticket.hours)} · ${ticket.flightNo} · Gate ${ticket.gate}`} />
        <Row name="일정" value={days ? `${days}일 · 일정 ${places}개` : '일정 미정'} />
      </section>

      {/* Smart booking: the ticket's cities, dates and party become search links */}
      <section className="rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3">
        <span className={kicker}>Smart booking</span>
        {stops.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="숙소 도시">
            {stops.map((s, i) => <Chip key={s.en} size="sm" selected={i === stopIdx} onClick={() => setStopIdx(i)}>{s.ko}</Chip>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setBooking('flight')}>
            <Plane className="w-4 h-4 shrink-0" aria-hidden />항공권
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setBooking('stay')}>
            <BedDouble className="w-4 h-4 shrink-0" aria-hidden />숙소{stops.length > 1 ? ` · ${stops[Math.min(stopIdx, stops.length - 1)].ko}` : ''}
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {atCounter ? (
          ticket.plan ? (
            <button type="button" className="btn btn-accent btn-lg w-full" disabled={boarding || busy} onClick={() => run(onBoard)}>
              <Plane className="w-4 h-4 shrink-0 rotate-45" aria-hidden />{boarding ? '탑승 중' : '탑승 · 여정 만들기'}
            </button>
          ) : (
            <button type="button" className="btn btn-accent btn-lg w-full" onClick={() => { close(); onPlan(); }}>
              <Ticket className="w-4 h-4 shrink-0" aria-hidden />일정 정하고 발권
            </button>
          )
        ) : (
          <button type="button" className="btn btn-primary btn-lg w-full" disabled={busy} onClick={() => run(onRaise)}>
            <ArrowUp className="w-4 h-4 shrink-0" aria-hidden />카운터로
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          {ticket.plan ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={boarding || busy} onClick={() => { close(); onPlan(); }}>
              <PencilLine className="w-3.5 h-3.5" aria-hidden />다시 계획하기
            </button>
          ) : <span />}
          <button type="button" className="btn btn-ghost btn-sm text-red-600 dark:text-red-400" disabled={boarding || busy} onClick={() => run(onRemove)}>
            <Trash2 className="w-3.5 h-3.5" aria-hidden />삭제
          </button>
        </div>
      </div>

      <QuickBookingModal
        isOpen={booking !== null}
        onClose={() => setBooking(null)}
        destination={stop.ko}
        startDate={ticket.startDate}
        endDate={ticket.endDate}
        memberCount={ticket.members?.length || 1}
        initialToCode={inferAirportCode(stop.ko)}
        initialKind={booking ?? 'flight'}
        pastStays={pastStays}
      />
    </div>
  );
}
