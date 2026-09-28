// Window events that open app-level layers. Kept apart from the (lazy-loaded) layer components so
// importing an event name does not pull the component into the main bundle.

export const TOGGLE_PALETTE_EVENT = 'tgl:toggle-palette';
export const OPEN_REMIX_EVENT = 'tgl:open-remix';

export function openRemix(tripId: number) {
  window.dispatchEvent(new CustomEvent(OPEN_REMIX_EVENT, { detail: tripId }));
}
