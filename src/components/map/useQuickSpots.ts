import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_ACTIVE_KINDS, MIN_SEARCH_ZOOM, QUICK_SPOT_META, QuickSpotBusyError, quickSpotPinHtml, searchQuickSpots,
  type LatLng, type QuickSpot, type QuickSpotKind,
} from '../../utils/quickSpots';
import { calculateDistanceInMeters } from '../../utils/pocketStorage';
import { notify } from '../../utils/feedback';

// Quick spots on a Leaflet map (v1.3.8): which kinds are on, what was found, the pins, the picked spot.
//  - `anchor` given (the stay map): searches follow it, e.g. when another stay is picked
//  - no anchor (the place map): searches are made where the map is; after the map moves far enough the member is
//    offered "search here" instead of searching on every move

interface Options {
  /** The Leaflet map, once made */
  map: any;
  /** Search around this point instead of the map's centre */
  anchor?: LatLng | null;
  /** Kinds on at the start */
  initial?: QuickSpotKind[];
  /** Called when the member changes which kinds are on (to save the choice) */
  onKindsChange?: (kinds: QuickSpotKind[]) => void;
}

const MOVE_FAR_M = 500;

export function useQuickSpots({ map, anchor = null, initial = [], onKindsChange }: Options) {
  const [kinds, setKinds] = useState<QuickSpotKind[]>(initial);
  const [spots, setSpots] = useState<Partial<Record<QuickSpotKind, QuickSpot[]>>>({});
  const [loading, setLoading] = useState<QuickSpotKind[]>([]);
  const [selected, setSelected] = useState<QuickSpot | null>(null);
  const [searchedAt, setSearchedAt] = useState<LatLng | null>(null);
  /** The map has moved away from the last search (place map only) */
  const [movedAway, setMovedAway] = useState(false);
  const [tooWide, setTooWide] = useState(false);
  const layerRef = useRef<any>(null);
  const tokenRef = useRef(0);

  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  const here = useCallback((): LatLng | null => {
    if (anchor) return anchor;
    if (!map) return null;
    const c = map.getCenter();
    return { lat: c.lat, lng: c.lng };
  }, [anchor, map]);

  const run = useCallback(async (list: QuickSpotKind[], at: LatLng) => {
    if (!list.length) return;
    const token = ++tokenRef.current;
    setLoading(prev => [...new Set([...prev, ...list])]);
    let busy = false;
    const found = await Promise.all(list.map(k => searchQuickSpots(k, at).catch(err => {
      if (err instanceof QuickSpotBusyError) busy = true;
      return [] as QuickSpot[];
    })));
    if (token !== tokenRef.current) return;
    setSpots(prev => {
      const next = { ...prev };
      list.forEach((k, i) => { next[k] = found[i]; });
      return next;
    });
    setLoading(prev => prev.filter(k => !list.includes(k)));
    setSearchedAt(at);
    setMovedAway(false);
    if (busy) notify('검색이 잦아 잠시 쉬고 있어요. 조금 뒤 다시 찾아 주세요.');
  }, []);

  /** Switch a kind on (searching for it) or off; switching on a fourth turns the oldest off */
  const toggle = useCallback((kind: QuickSpotKind) => {
    const on = kindsRef.current.includes(kind);
    if (on) {
      const next = kindsRef.current.filter(k => k !== kind);
      setKinds(next);
      onKindsChange?.(next);
      setSelected(s => (s?.kind === kind ? null : s));
      return;
    }
    let next = [...kindsRef.current, kind];
    if (next.length > MAX_ACTIVE_KINDS) {
      const dropped = next[0];
      next = next.slice(1);
      setSelected(s => (s?.kind === dropped ? null : s));
      notify(`퀵스팟은 세 가지까지 켤 수 있어요. ${QUICK_SPOT_META[dropped].label}을(를) 껐어요.`);
    }
    setKinds(next);
    onKindsChange?.(next);
    if (!anchor && map && map.getZoom() < MIN_SEARCH_ZOOM) { setTooWide(true); return; }
    // A kind switched on searches where the others were searched, so the pins on the map belong together
    const at = (!anchor && searchedAt && !movedAway) ? searchedAt : here();
    if (at) run(at === searchedAt ? [kind] : next, at);
  }, [anchor, map, searchedAt, movedAway, here, run, onKindsChange]);

  /** Search every kind that is on, where the map is now */
  const searchHere = useCallback(() => {
    if (!map) return;
    if (map.getZoom() < MIN_SEARCH_ZOOM) { setTooWide(true); return; }
    const at = here();
    if (at) run(kindsRef.current, at);
  }, [map, here, run]);

  /** Switch every kind off */
  const clearAll = useCallback(() => {
    setKinds([]);
    onKindsChange?.([]);
    setSelected(null);
    setMovedAway(false);
    setTooWide(false);
  }, [onKindsChange]);

  /** Search the kinds that are on around a point the member picked (a searched place) */
  const searchAt = useCallback((at: LatLng) => {
    if (kindsRef.current.length) run(kindsRef.current, at);
  }, [run]);

  // The stay map: search again when the anchor moves to another stay
  const anchorKey = anchor ? `${anchor.lat.toFixed(5)},${anchor.lng.toFixed(5)}` : '';
  useEffect(() => {
    if (!anchor || !kindsRef.current.length) return;
    run(kindsRef.current, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey, run]);

  // The place map: the first search for kinds that start on, once the map is there and close enough
  const started = useRef(false);
  useEffect(() => {
    if (anchor || !map || started.current || !kindsRef.current.length) return;
    if (map.getZoom() < MIN_SEARCH_ZOOM) return;
    started.current = true;
    const at = here();
    if (at) run(kindsRef.current, at);
  }, [anchor, map, here, run]);

  // The place map: notice when the view has gone far from the last search, or is zoomed too far out
  useEffect(() => {
    if (anchor || !map) return;
    const onMove = () => {
      const zoomOk = map.getZoom() >= MIN_SEARCH_ZOOM;
      setTooWide(!zoomOk && kindsRef.current.length > 0);
      if (!searchedAt || !kindsRef.current.length) { setMovedAway(zoomOk && kindsRef.current.length > 0 && !searchedAt); return; }
      const c = map.getCenter();
      setMovedAway(zoomOk && calculateDistanceInMeters(searchedAt.lat, searchedAt.lng, c.lat, c.lng) > MOVE_FAR_M);
    };
    map.on('moveend', onMove);
    return () => { map.off('moveend', onMove); };
  }, [anchor, map, searchedAt, kinds.length]);

  // Pins for the kinds that are on
  useEffect(() => {
    const L = (window as any).L;
    if (!map || !L) return;
    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);
    const layer = layerRef.current;
    layer.clearLayers();
    kinds.forEach(k => {
      (spots[k] || []).forEach(spot => {
        const on = selected?.id === spot.id;
        const size = on ? 36 : 30;
        const marker = L.marker([spot.lat, spot.lng], {
          icon: L.divIcon({ className: 'tgl-qs-icon', html: quickSpotPinHtml(k, on), iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          zIndexOffset: on ? 3000 : 1000,
          keyboard: false,
          title: spot.name,
        });
        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          setSelected(spot);
        });
        layer.addLayer(marker);
      });
    });
  }, [map, kinds, spots, selected]);

  useEffect(() => () => {
    if (layerRef.current && map) {
      try { map.removeLayer(layerRef.current); } catch (_) {}
    }
    layerRef.current = null;
  }, [map]);

  // A tap on the map itself puts the picked spot down
  useEffect(() => {
    if (!map) return;
    const off = () => setSelected(null);
    map.on('click', off);
    return () => { map.off('click', off); };
  }, [map]);

  const counts = Object.fromEntries(kinds.map(k => [k, spots[k]?.length ?? 0])) as Partial<Record<QuickSpotKind, number>>;
  const list = kinds.flatMap(k => spots[k] || []).sort((a, b) => a.distance - b.distance);

  return { kinds, toggle, clearAll, counts, loading, selected, setSelected, list, searchHere, searchAt, movedAway, tooWide, searchedAt };
}

export type QuickSpotsState = ReturnType<typeof useQuickSpots>;
