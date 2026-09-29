// Opens the Intro player from anywhere (menu, footer, landing, command palette) without loading it.
export const OPEN_INTRO_EVENT = 'tgl:open-intro';

let warmed = false;
/** Start fetching the player and rendering the soundtrack before the intro opens (hover, tip on screen) */
export function prefetchIntro() {
  if (warmed || typeof window === 'undefined') return;
  warmed = true;
  import('./IntroView').catch(() => { warmed = false; });
  import('./soundtrack').then(m => m.renderSoundtrack()).catch(() => {});
}

export function openIntro() {
  window.dispatchEvent(new Event(OPEN_INTRO_EVENT));
}

/** A shared link to /intro opens the player on boot */
export function isIntroPath() {
  return typeof window !== 'undefined' && /^\/intro\/?$/.test(window.location.pathname);
}
