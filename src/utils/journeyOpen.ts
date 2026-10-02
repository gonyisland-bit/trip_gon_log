// How a journey opens from its card: on its board, or on its magazine. Each journey keeps its own choice
// (the board | magazine toggle in the card menu) in the member's prefs, so every device opens it the same way;
// localStorage is only the instant cache. A journey that was never set opens on its magazine when it is
// published and on its board otherwise.
import { saveUserPref, type UserPrefs } from './userPrefs';
import { setDetailIntent } from './detailIntent';
import { preloadDetailPage } from './prefetchHelper';
import { getEffectiveImageUrl } from './storageHelper';

export type JourneyOpenMode = 'board' | 'magazine';

const KEY = 'tgl_journey_open_by';
const CHANGED = 'tgl:journey-open-changed';

const isMode = (v: unknown): v is JourneyOpenMode => v === 'board' || v === 'magazine';

function readMap(): Record<string, JourneyOpenMode> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, JourneyOpenMode>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* cache only */ }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/** What this journey opens on right now */
export function getJourneyOpenMode(trip: { id: number; publishedAt?: number | null }): JourneyOpenMode {
  const own = readMap()[String(trip.id)];
  return isMode(own) ? own : trip.publishedAt ? 'magazine' : 'board';
}

/** The toggle: remembers the choice on this device and the account (it does not open anything) */
export function setJourneyOpenMode(tripId: number, mode: JourneyOpenMode) {
  writeMap({ ...readMap(), [String(tripId)]: mode });
  saveUserPref({ journeyOpenBy: { [String(tripId)]: mode } });
}

/** The account's choices arriving from the cloud: merged into the cache, never written back */
export function applyJourneyOpenBy(map: UserPrefs['journeyOpenBy']) {
  if (!map || typeof map !== 'object') return;
  const next = { ...readMap() };
  for (const [id, mode] of Object.entries(map)) if (isMode(mode)) next[id] = mode;
  writeMap(next);
}

/** A card was tapped: open the journey the way its toggle says */
export function openJourneyFromCard(
  trip: { id: number; publishedAt?: number | null },
  onNavigate: (view: 'detail', id: number) => void,
) {
  if (getJourneyOpenMode(trip) === 'magazine') setDetailIntent('magazine');
  // No travel animation: the journey opens at once, its page chunk already on the way
  preloadDetailPage().catch(() => {});
  onNavigate('detail', trip.id);
}

export const JOURNEY_OPEN_CHANGED = CHANGED;

const warmed = new Set<number>();

/**
 * Touch or hover on a journey card: start everything its opening needs, so the press itself is the loading time.
 * The page chunk, the reel's chunk (a magazine photo opens it) and the cover photo; each at most once per journey.
 */
export function warmJourney(trip: { id: number; img?: string }) {
  preloadDetailPage().catch(() => {});
  import('../components/reel/MemoryReel').catch(() => {});
  if (warmed.has(trip.id)) return;
  warmed.add(trip.id);
  if (trip.img) {
    const img = new Image();
    img.decoding = 'async';
    img.src = getEffectiveImageUrl(trip.img);
  }
}
