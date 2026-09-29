// Marks <html data-overlay> while something covers the screen (menu drawer, modal or sheet backdrop,
// terminal, viewers), so floating chrome like the quick action dock can step aside (see index.css).
// One watcher for the whole app instead of every modal reporting itself.

const CANDIDATES = '.fixed.inset-0, [role="dialog"], [aria-modal="true"]';
const FLOATING = '.tgl-dock, .tgl-totop, .tgl-introtip';

// Opacity the element is heading to: a fade in progress counts as already finished
function targetOpacity(el: HTMLElement, current: string): number {
  for (const a of el.getAnimations?.() ?? []) {
    const frames = (a.effect as KeyframeEffect | null)?.getKeyframes?.();
    const last = frames?.[frames.length - 1];
    if (last && last.opacity !== undefined && a.playState === 'running') return parseFloat(String(last.opacity));
  }
  return parseFloat(current);
}

function covers(el: HTMLElement): boolean {
  if (el.closest(FLOATING)) return false;
  const cs = getComputedStyle(el);
  if (cs.position !== 'fixed' || cs.display === 'none') return false;
  if (cs.pointerEvents === 'none' || targetOpacity(el, cs.opacity) < 0.05) return false;
  if (cs.visibility === 'hidden' && !el.getAnimations?.().some(a => a.playState === 'running')) return false;
  const r = el.getBoundingClientRect();
  return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.5;
}

export function watchFullScreenOverlays(): () => void {
  if (typeof document === 'undefined') return () => {};
  let timer = 0;
  let settleTimer = 0;
  const check = () => {
    timer = 0;
    const open = Array.from(document.querySelectorAll<HTMLElement>(CANDIDATES)).some(covers);
    document.documentElement.toggleAttribute('data-overlay', open);
  };
  // Timers rather than frames: a later check must still run while a fade-in finishes.
  // The second, later check catches overlays whose fade had barely started at the first one.
  const schedule = () => {
    if (!timer) timer = window.setTimeout(check, 30);
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(check, 450);
  };

  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-hidden', 'open', 'data-state'] });
  // Overlays that fade in are still transparent when their class changes: check again once they settle
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);
  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    mo.disconnect();
    document.removeEventListener('transitionend', schedule, true);
    document.removeEventListener('animationend', schedule, true);
    window.removeEventListener('resize', schedule);
    window.clearTimeout(timer);
    window.clearTimeout(settleTimer);
    document.documentElement.removeAttribute('data-overlay');
  };
}
