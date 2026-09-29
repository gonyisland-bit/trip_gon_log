// Opens the Intro player from anywhere (menu, footer, landing, command palette) without loading it.
export const OPEN_INTRO_EVENT = 'tgl:open-intro';

export function openIntro() {
  window.dispatchEvent(new Event(OPEN_INTRO_EVENT));
}

/** A shared link to /intro opens the player on boot */
export function isIntroPath() {
  return typeof window !== 'undefined' && /^\/intro\/?$/.test(window.location.pathname);
}
