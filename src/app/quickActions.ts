// App-wide shortcuts that any screen can fire: the airport terminal, the booking wallet
// and "keep a place" (pocket scrap). App.tsx listens for these events.

export const OPEN_DEPARTURE_EVENT = 'tgl:open-departure';
export const POCKET_OPEN_SCRAP_EVENT = 'tgl:pocket-open-scrap';
export const POCKET_OPEN_SCRAP_FLAG = 'pocket_open_scrap';

export const OPEN_WALLET_EVENT = 'tgl:open-wallet';

export function openDepartureBoard() {
  window.dispatchEvent(new Event(OPEN_DEPARTURE_EVENT));
}

export function openBookingWallet() {
  window.dispatchEvent(new Event(OPEN_WALLET_EVENT));
}
