import { runViewTransition } from '../app/appUtils';

// Small motion helpers built on the Web Animations API and View Transitions.
// Every helper checks prefers-reduced-motion and falls back to an instant change.

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Shared-element transition: tag the source element (e.g. a card photo) with a
// view-transition-name so the browser morphs it into the element that carries the
// same name after `update` runs (e.g. the detail hero). The name is removed afterwards.
export function runSharedTransition(source: HTMLElement | null, name: string, update: () => void) {
  if (!source) {
    runViewTransition(update);
    return;
  }
  source.style.viewTransitionName = name;
  // The update callback runs after the old snapshot is taken, so the name can be released there
  runViewTransition(() => {
    source.style.viewTransitionName = '';
    update();
  });
}

// Fly a ghost copy of `source` into `target` (e.g. a pocket photo landing on the timeline).
export function flyTo(source: HTMLElement, target: HTMLElement, duration = 620): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return Promise.resolve();

  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
    width: `${from.width}px`, height: `${from.height}px`, margin: '0',
    zIndex: '9999', pointerEvents: 'none', transformOrigin: 'top left',
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(0.12, Math.min(to.width / from.width, to.height / from.height));
  const anim = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2 },
    ],
    { duration, easing: 'cubic-bezier(.2, 0, 0, 1)', fill: 'forwards' }
  );
  return anim.finished.then(() => { ghost.remove(); }, () => { ghost.remove(); });
}

// Small overshoot bump on an element, used to confirm a landing or a toggle.
export function bump(el: HTMLElement | null, scale = 1.06) {
  if (!el || prefersReducedMotion()) return;
  el.animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }],
    { duration: 360, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }
  );
}
