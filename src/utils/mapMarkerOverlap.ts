// Screen-space overlap resolution for Leaflet markers (v1.3).
// Tiers are listed from highest to lowest priority. A marker in a yielding tier is
// hidden (and made non-clickable) when it sits within `radius` px of a marker that
// is already shown from a higher tier, so stacked pins stay easy to tap.

export interface MarkerTier {
  markers: any[];
  // false: this tier never hides (e.g. the selected-country city dots)
  yields: boolean;
}

const YIELD_CLASS = 'tgl-marker-yield';

export function resolveMarkerOverlaps(map: any, tiers: MarkerTier[], radius = 20) {
  if (!map) return;
  const shown: { x: number; y: number }[] = [];
  const r2 = radius * radius;

  for (const tier of tiers) {
    for (const marker of tier.markers) {
      const el: HTMLElement | undefined = marker?.getElement?.();
      if (!el) continue;
      let pt: { x: number; y: number };
      try {
        pt = map.latLngToContainerPoint(marker.getLatLng());
      } catch {
        continue;
      }
      const covered = tier.yields && shown.some(s => (s.x - pt.x) ** 2 + (s.y - pt.y) ** 2 < r2);
      el.classList.toggle(YIELD_CLASS, covered);
      if (!covered) shown.push({ x: pt.x, y: pt.y });
    }
  }
}

// Greedy pixel clustering: groups whose projected points are closer than `radius`
// at `zoom` are merged. Returns clusters of the original items.
export function clusterByPixel<T extends { lat: number; lng: number }>(
  map: any,
  items: T[],
  zoom: number,
  radius = 40
): T[][] {
  const clusters: { x: number; y: number; items: T[] }[] = [];
  const r2 = radius * radius;
  for (const item of items) {
    const p = map.project([item.lat, item.lng], zoom);
    const hit = clusters.find(c => (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < r2);
    if (hit) hit.items.push(item);
    else clusters.push({ x: p.x, y: p.y, items: [item] });
  }
  return clusters.map(c => c.items);
}
