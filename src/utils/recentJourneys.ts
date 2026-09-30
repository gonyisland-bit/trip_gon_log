// Journeys opened lately on this device, newest first (a convenience for the quick finder, not journey data)
const KEY = 'tgl_recent_journeys';
const MAX = 8;

export function readRecentJourneys(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function noteRecentJourney(id: number) {
  try {
    const next = [id, ...readRecentJourneys().filter(n => n !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* cache only */ }
}
