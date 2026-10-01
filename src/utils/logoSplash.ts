import { saveUserPref } from './userPrefs';

// Whether tapping the logo plays the splash on its way home (the first launch always plays it).
// Saved per account (prefs.logoSplash) and cached on the device for the next tap.
const KEY = 'tgl_logo_splash';

export function logoSplashOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'false'; } catch { return true; }
}

export function setLogoSplash(on: boolean, save = true) {
  try { localStorage.setItem(KEY, String(on)); } catch { /* cache only */ }
  if (save) saveUserPref({ logoSplash: on });
}

/** The logo's way home: the splash when switched on, then home */
export function goHomeFromLogo(navigateTo: (view: string) => void) {
  if (logoSplashOn()) window.dispatchEvent(new CustomEvent('triggerSplashScreen'));
  navigateTo('home');
}
