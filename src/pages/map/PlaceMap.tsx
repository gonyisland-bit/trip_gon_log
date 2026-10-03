import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LocateFixed, Loader2, Search, X } from 'lucide-react';
import type { Plan, StayItem, Trip } from '../../types';
import { IconButton } from '../../components/ui/IconButton';
import { Segment } from '../../components/ui/Segment';
import { useQuickSpots } from '../../components/map/useQuickSpots';
import { QuickSpotCard, QuickSpotLauncher, QuickSpotList, QuickSpotSearchHere } from '../../components/map/QuickSpots';
import { PlaceAutocompleteInput } from '../../components/PlaceAutocompleteInput';
import { mapTileFor } from '../../utils/mapTiles';
import { readPlaceMapPrefs, savePlaceMapPrefs, type PlaceMapStyle } from '../../utils/placeMapPrefs';
import { parseTripDateRange } from '../../utils/tripPlanHelper';
import { canReadLocationQuietly, getPosition, locationProblem } from '../../utils/location';
import { calculateDistanceInMeters, getSavedPockets } from '../../utils/pocketStorage';
import { notify } from '../../utils/feedback';

// The place map (v1.3.8): the map hub's second tab, for being there. It opens on the journey being travelled (or the
// next one), shows its stays and the pocket's saved spots, and finds quick spots around where the map is — so a
// traveller needs no other map app for the walk to the shop, the station or dinner. Tiles normal or simple, and the
// member's own position on a tap.

interface PlaceMapProps {
  trips: Trip[];
  plans: Plan[];
  staysByTrip?: Record<number, StayItem[]>;
  isDarkMode: boolean;
}

interface Focus { trip: Trip; lat: number; lng: number; when: 'now' | 'next' | 'past' }

const SEOUL = { lat: 37.5665, lng: 126.978 };
const PLACE_ZOOM = 15;
const NEAR_TRIP_M = 150000;

const PIN_PATHS = {
  found: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  stay: ['M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8', 'M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4', 'M12 4v6', 'M2 18h20'],
  pocket: ['M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z'],
};

function pinHtml(kind: 'stay' | 'pocket' | 'found'): string {
  const ink = kind !== 'pocket';
  const size = kind === 'found' ? 34 : 30;
  return `<div class="tgl-qs-pin${ink ? ' tgl-qs-pin-ink' : ''}" style="width:${size}px;height:${size}px">`
    + `<svg viewBox="0 0 24 24" width="${kind === 'found' ? 17 : 15}" height="${kind === 'found' ? 17 : 15}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
    + PIN_PATHS[kind].map(d => `<path d="${d}"/>`).join('') + '</svg></div>';
}

function coordsOf(t: Trip): { lat: number; lng: number } | null {
  if (typeof t.lat === 'number' && typeof t.lng === 'number' && (t.lat || t.lng)) return { lat: t.lat, lng: t.lng };
  const loc = t.locations?.find(l => typeof l.lat === 'number' && typeof l.lng === 'number');
  return loc ? { lat: loc.lat as number, lng: loc.lng as number } : null;
}

/** Journeys with a place, being travelled first, then the coming ones by date, then the past from the latest */
function journeysByNearness(trips: Trip[], plans: Plan[]): Focus[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const seen = new Set<number>();
  const list: (Focus & { key: number })[] = [];
  [...trips, ...plans].forEach(t => {
    if (t.deletedAt || seen.has(t.id)) return;
    seen.add(t.id);
    const at = coordsOf(t);
    if (!at) return;
    const range = parseTripDateRange(t.date);
    if (!range) { list.push({ trip: t, ...at, when: 'past', key: -t.id }); return; }
    if (range.start <= today && today <= range.end) list.push({ trip: t, ...at, when: 'now', key: 0 });
    else if (range.start > today) list.push({ trip: t, ...at, when: 'next', key: range.start.getTime() });
    else list.push({ trip: t, ...at, when: 'past', key: -range.end.getTime() });
  });
  const order = { now: 0, next: 1, past: 2 } as const;
  return list.sort((a, b) => order[a.when] - order[b.when] || a.key - b.key);
}

const WHEN_LABEL = { now: 'NOW', next: 'NEXT', past: 'PAST' } as const;

export function PlaceMap({ trips, plans, staysByTrip = {}, isDarkMode }: PlaceMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const tileRef = useRef<any>(null);
  const pinsRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const [prefs] = useState(readPlaceMapPrefs);
  const [style, setStyle] = useState<PlaceMapStyle>(prefs.style || 'normal');
  const journeys = useMemo(() => journeysByNearness(trips, plans), [trips, plans]);
  const [focusId, setFocusId] = useState<number | null>(() => journeys[0]?.trip.id ?? null);
  const focus = journeys.find(j => j.trip.id === focusId) || journeys[0] || null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  // Place search: phones open it from the magnifier, wider screens keep it in the top row
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const foundRef = useRef<any>(null);

  const qs = useQuickSpots({ map, initial: prefs.spots, onKindsChange: spots => savePlaceMapPrefs({ spots }) });

  // The map, made once
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !boxRef.current) return;
    const start = focus ? [focus.lat, focus.lng] : [SEOUL.lat, SEOUL.lng];
    const m = L.map(boxRef.current, { center: start, zoom: focus ? PLACE_ZOOM : 12, zoomControl: false, minZoom: 3, maxZoom: 20, worldCopyJump: true });
    L.control.zoom({ position: 'topright', zoomInTitle: '확대', zoomOutTitle: '축소' }).addTo(m);
    m.getContainer().classList.add('tgl-hub-map', 'tgl-place-map');
    setMap(m);
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { try { m.invalidateSize({ animate: false }); } catch (_) {} });
    });
    ro.observe(boxRef.current);
    return () => { ro.disconnect(); cancelAnimationFrame(frame); m.remove(); setMap(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tiles in the chosen style
  useEffect(() => {
    const L = (window as any).L;
    if (!map || !L) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const t = mapTileFor(style, isDarkMode);
    tileRef.current = L.tileLayer(t.url, { ...t.options, keepBuffer: 4, crossOrigin: true, attribution: '&copy; Google Maps' }).addTo(map);
  }, [map, style, isDarkMode]);

  // Being there: when location is already allowed and the member is near the journey (or there is none), start at them
  useEffect(() => {
    if (!map) return;
    let alive = true;
    canReadLocationQuietly().then(ok => {
      if (!ok || !alive) return;
      getPosition().then(pos => {
        if (!alive) return;
        showMe(pos.lat, pos.lng);
        const near = !focus || calculateDistanceInMeters(pos.lat, pos.lng, focus.lat, focus.lng) < NEAR_TRIP_M;
        if (near) map.setView([pos.lat, pos.lng], PLACE_ZOOM, { animate: false });
      }).catch(() => {});
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // The journey's stays and the pocket's spots near it
  useEffect(() => {
    const L = (window as any).L;
    if (!map || !L) return;
    if (!pinsRef.current) pinsRef.current = L.layerGroup().addTo(map);
    const layer = pinsRef.current;
    layer.clearLayers();
    if (!focus) return;
    const icon = (k: 'stay' | 'pocket') => L.divIcon({ className: 'tgl-qs-icon', html: pinHtml(k), iconSize: [30, 30], iconAnchor: [15, 15] });
    (staysByTrip[focus.trip.id] || []).forEach(st => {
      if (typeof st.lat !== 'number' || typeof st.lng !== 'number') return;
      L.marker([st.lat, st.lng], { icon: icon('stay'), zIndexOffset: 2000, keyboard: false })
        .bindTooltip(st.title || '숙소', { direction: 'top', offset: [0, -16], className: 'tgl-place-tip' })
        .addTo(layer);
    });
    getSavedPockets().forEach(p => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      if (calculateDistanceInMeters(p.lat, p.lng, focus.lat, focus.lng) > NEAR_TRIP_M) return;
      L.marker([p.lat, p.lng], { icon: icon('pocket'), zIndexOffset: 1500, keyboard: false })
        .bindTooltip(p.title, { direction: 'top', offset: [0, -16], className: 'tgl-place-tip' })
        .addTo(layer);
    });
  }, [map, focus, staysByTrip]);

  const showMe = (lat: number, lng: number) => {
    const L = (window as any).L;
    if (!map || !L) return;
    if (meRef.current) map.removeLayer(meRef.current);
    meRef.current = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'tgl-qs-icon', html: '<div class="tgl-place-me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      zIndexOffset: 4000, interactive: false, keyboard: false,
    }).addTo(map);
  };

  const locate = async () => {
    if (!map || locating) return;
    setLocating(true);
    try {
      const pos = await getPosition({ ask: true, precise: true, maxAgeMs: 30000 });
      showMe(pos.lat, pos.lng);
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), PLACE_ZOOM), { duration: 0.6 });
    } catch (err) {
      notify(locationProblem(err));
    } finally {
      setLocating(false);
    }
  };

  const pickJourney = (f: Focus) => {
    setFocusId(f.trip.id);
    setPickerOpen(false);
    qs.setSelected(null);
    map?.flyTo([f.lat, f.lng], PLACE_ZOOM, { duration: 0.8 });
  };

  const clearFound = () => {
    if (foundRef.current && map) map.removeLayer(foundRef.current);
    foundRef.current = null;
  };

  /** A searched place: go there, mark it, and look for the quick spots that are on around it */
  const goToPlace = (name: string, at: { lat: number; lng: number } | null) => {
    const L = (window as any).L;
    if (!at || !map || !L) return;
    clearFound();
    foundRef.current = L.marker([at.lat, at.lng], {
      icon: L.divIcon({ className: 'tgl-qs-icon', html: pinHtml('found'), iconSize: [34, 34], iconAnchor: [17, 17] }),
      zIndexOffset: 3500, keyboard: false,
    }).bindTooltip(name, { direction: 'top', offset: [0, -18], className: 'tgl-place-tip', permanent: true }).addTo(map);
    qs.setSelected(null);
    setListOpen(false);
    map.flyTo([at.lat, at.lng], 16, { duration: 0.8 });
    qs.searchAt(at);
    setSearchOpen(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const changeStyle = (v: PlaceMapStyle) => { setStyle(v); savePlaceMapPrefs({ style: v }); };

  return (
    <div className="absolute inset-0">
      <div ref={boxRef} className="absolute inset-0 z-0" />

      {/* Top: the journey (a picker of the others), the tiles and the member's position */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-6 sm:right-6 z-[500] flex items-start gap-2 pointer-events-none">
        <div className="relative min-w-0 pointer-events-auto">
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            disabled={!journeys.length}
            aria-expanded={pickerOpen}
            className="h-9 max-w-full pl-3 pr-2.5 rounded-full bg-surface/95 dark:bg-surface-dark/95 shadow-lg flex items-center gap-2 text-left disabled:cursor-default"
          >
            {focus && <span className={`font-mono text-micro font-bold tracking-widest shrink-0 ${focus.when === 'now' ? 'text-red-600 dark:text-red-400' : focus.when === 'next' ? 'text-amber-600 dark:text-amber-400' : 'text-black/50 dark:text-white/50'}`}>{WHEN_LABEL[focus.when]}</span>}
            <span className="text-[13px] font-bold truncate">{focus ? focus.trip.title : '여정 없음'}</span>
            {journeys.length > 1 && <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} aria-hidden />}
          </button>
          {pickerOpen && journeys.length > 1 && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setPickerOpen(false)} />
              <ul className="tgl-rise absolute left-0 top-full mt-2 w-[min(20rem,calc(100vw-24px))] max-h-[50vh] overflow-y-auto rounded-card bg-surface dark:bg-surface-dark shadow-xl py-1.5">
                {journeys.slice(0, 20).map(j => (
                  <li key={j.trip.id}>
                    <button type="button" onClick={() => pickJourney(j)} className={`w-full flex items-center gap-3 px-4 h-12 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${j.trip.id === focus?.trip.id ? 'font-bold' : ''}`}>
                      <span className="w-10 shrink-0 font-mono text-micro font-bold tracking-widest text-black/50 dark:text-white/50">{WHEN_LABEL[j.when]}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] truncate">{j.trip.title}</span>
                        <span className="block text-micro font-mono text-black/50 dark:text-white/50 truncate">{j.trip.date}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {/* Place search: inline from sm up; on phones the magnifier opens it over the top row */}
        <div className={`pointer-events-auto sm:relative sm:block sm:w-64 sm:shrink ${searchOpen ? 'max-sm:absolute max-sm:inset-x-0 max-sm:top-0 max-sm:z-10 max-sm:flex max-sm:items-center max-sm:gap-2' : 'max-sm:hidden'}`}>
          <div className="flex-1 min-w-0">
            <PlaceAutocompleteInput
              value={query}
              onChange={v => { setQuery(v); if (!v) clearFound(); }}
              onSelectPlace={(name, at) => goToPlace(name, at)}
              placeholder="장소 검색"
              className="w-full h-9 pl-4 pr-14 rounded-full bg-surface/95 dark:bg-surface-dark/95 text-ink dark:text-ink-dark shadow-lg text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-red-600 placeholder:text-black/45 dark:placeholder:text-white/45"
            />
          </div>
          <IconButton icon={X} label="검색 닫기" size="sm" onClick={() => setSearchOpen(false)} className="sm:hidden shadow-lg !border-0" />
        </div>
        {!searchOpen && <IconButton icon={Search} label="장소 검색" size="sm" onClick={() => setSearchOpen(true)} className="sm:hidden pointer-events-auto shrink-0 shadow-lg !border-0" />}
        <div className="ml-auto flex items-center gap-2 pointer-events-auto shrink-0 max-sm:mt-12">
          <Segment<PlaceMapStyle>
            size="sm"
            ariaLabel="지도 스타일"
            value={style}
            onChange={changeStyle}
            options={[{ value: 'normal', label: '일반' }, { value: 'simple', label: '심플' }]}
            className="!bg-surface/95 dark:!bg-surface-dark/95 shadow-lg"
          />
          <IconButton icon={locating ? Loader2 : LocateFixed} label="현재 위치" size="sm" onClick={locate} className={`shadow-lg !border-0 ${locating ? '[&>svg]:animate-spin' : ''}`} />
        </div>
      </div>

      {/* After the map moved: search again here */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[104px] sm:top-16 z-[500]">
        <QuickSpotSearchHere s={qs} />
      </div>

      {/* Bottom: the picked spot or the list, over the quick spot launcher */}
      <div className="absolute inset-x-3 sm:left-6 sm:right-auto sm:w-[400px] z-[500] flex flex-col gap-2" style={{ bottom: 'calc(var(--tabbar-lift, 0px) + 12px)' }}>
        {qs.selected ? (
          <QuickSpotCard spot={qs.selected} onClose={() => qs.setSelected(null)} tripId={focus?.trip.id} />
        ) : listOpen ? (
          <QuickSpotList
            s={qs}
            onClose={() => setListOpen(false)}
            onPick={spot => { setListOpen(false); qs.setSelected(spot); map?.panTo([spot.lat, spot.lng]); }}
          />
        ) : null}
        <QuickSpotLauncher s={qs} opens="up" className="self-start" onOpenList={() => { qs.setSelected(null); setListOpen(o => !o); }} />
      </div>
    </div>
  );
}
