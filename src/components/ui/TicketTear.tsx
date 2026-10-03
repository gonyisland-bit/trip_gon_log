import React from 'react';

// The tear line of a ticket (v1.3.8): a dashed line across the card with a half-round punch on the left and
// right edge, like the perforation of a boarding pass. Put it as a direct child of a card that clips
// (overflow-hidden) and has no side padding, so the punches sit on the card's own edges. The punches are the page
// colour, so the card reads as cut through. Used by the flight card and the board's flight tile.

export function TicketTear({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-4 w-full shrink-0 ${className}`} aria-hidden>
      <span className="ticket-punch -left-2" />
      <span className="ticket-punch -right-2" />
      <span className="absolute inset-x-5 top-1/2 border-t-[1.5px] border-dashed border-current opacity-25" />
    </div>
  );
}
