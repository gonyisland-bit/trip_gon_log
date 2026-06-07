import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Plus, Minus, Store, ShoppingBag, Train, Loader2 } from 'lucide-react';
import { Trip, TimelineItem } from '../types';

const dayColors = [
  '#dc2626', // Day 1: Red
  '#2563eb', // Day 2: Blue
  '#16a34a', // Day 3: Green
  '#d97706', // Day 4: Orange/Amber
  '#7c3aed', // Day 5: Purple
  '#db2777', // Day 6: Pink
  '#0891b2', // Day 7: Cyan
  '#4b5563', // Day 8: Gray
];

interface MapAreaProps {
  trip: Trip;
  isEditMode: boolean;
  mapPoints: TimelineItem[];
  expandedItemId: number | null;
  handleItemToggle: (id: number) => void;
  selectedDate: string;
  isDarkMode: boolean;
  activeTab?: string;
  transitFocusType?: 'depart' | 'arrive' | 'boarding' | null;
}

export function MapArea({
  trip,
  isEditMode,
  mapPoints,
  expandedItemId,
  handleItemToggle,
  selectedDate,
  isDarkMode,
  activeTab,
  transitFocusType,
}: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [id: number]: any }>({});
  const polylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hasFitRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  // Animation references for flight travel visualization
  const animMarkerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // POI Features
  const [poiItems, setPoiItems] = useState<any[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [showConvenience, setShowConvenience] = useState(false);
  const [showSupermarket, setShowSupermarket] = useState(false);
  const [showStation, setShowStation] = useState(false);
  const poiMarkersRef = useRef<any[]>([]);

  // ─── Effect 1: Initialize Leaflet map (once per trip.id) ───────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const L = (window as any).L;
    if (!L) { console.warn("Leaflet not loaded."); return; }
    // Tear down any existing map first (trip changed)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersRef.current = {};
      polylineRef.current = null;
      hasFitRef.current = false;
      setMapReady(false);
    }

    const defaultLat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
    const defaultLng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;

    const map = L.map(containerRef.current, {
      zoomControl: false,       // we render custom controls
      attributionControl: false,
      scrollWheelZoom: false,   // disabled by default to prevent page scroll interference
      dragging: false,          // disabled by default
      touchZoom: false,         // disabled by default
      doubleClickZoom: false,   // disabled by default
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20, zIndex: 1 }).addTo(map);

    // Fix blank tile edge after layout settles
    setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 200);

    const ro = new ResizeObserver(() => { if (mapRef.current) mapRef.current.invalidateSize(); });
    ro.observe(containerRef.current);

    setMapReady(true);

    return () => {
      ro.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        markersRef.current = {};
        polylineRef.current = null;
        hasFitRef.current = false;
        setMapReady(false);
      }
    };
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 1b: Toggle map dragging/zooming based on isInteractive state ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (isInteractive) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    } else {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    }
  }, [isInteractive, mapReady]);

  // ─── Effect 2: Leaflet redraw helper on dark-mode toggle ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20, zIndex: 1 }).addTo(map);

    // Redraw polyline to bring to front and align layers
    if (polylineRef.current?.bringToFront) polylineRef.current.bringToFront();
    Object.values(markersRef.current).forEach((m: any) => { if (m?.bringToFront) m.bringToFront(); });
  }, [isDarkMode, mapReady]);

  // ─── Effect 3: Render markers & polyline ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear previous overlays
    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }

    const valid = mapPoints.filter(p =>
      p.lat !== undefined && p.lng !== undefined &&
      !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
    );

    if (valid.length === 0) {
      if (!hasFitRef.current) {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 13);
      }
      return;
    }

    const coords: [number, number][] = valid.map(p => [Number(p.lat), Number(p.lng)]);

    if (activeTab === 'transit') {
      const transitGroups: { [transitId: number]: { depart?: [number, number]; arrive?: [number, number] } } = {};
      valid.forEach((p: any) => {
        if (p.transitId) {
          if (!transitGroups[p.transitId]) {
            transitGroups[p.transitId] = {};
          }
          if (p.type === 'transit_depart') {
            transitGroups[p.transitId].depart = [Number(p.lat), Number(p.lng)];
          } else if (p.type === 'transit_arrive') {
            transitGroups[p.transitId].arrive = [Number(p.lat), Number(p.lng)];
          }
        }
      });

      const transPolylines: any[] = [];
      Object.entries(transitGroups).forEach(([tIdStr, group]) => {
        const tId = Number(tIdStr);
        const isActiveTrans = expandedItemId !== null && tId === expandedItemId;
        if (group.depart && group.arrive) {
          const poly = L.polyline([group.depart, group.arrive], {
            color: isActiveTrans
              ? (isDarkMode ? '#f59e0b' : '#d97706')
              : (isDarkMode ? '#9ca3af' : '#6b7280'),
            weight: isActiveTrans ? 4.5 : 2,
            dashArray: '4, 6',
            opacity: isActiveTrans ? 0.95 : 0.2
          });
          transPolylines.push(poly);
        }
      });

      if (transPolylines.length > 0) {
        const fGroup = L.featureGroup(transPolylines).addTo(map);
        polylineRef.current = fGroup;
      }
    } else {
      if (coords.length > 1) {
        polylineRef.current = L.polyline(coords, {
          color: isDarkMode ? '#f87171' : '#dc2626',
          weight: 2.5,
          dashArray: '6, 5',
          opacity: 0.75,
        }).addTo(map);
      }
    }

    // Draw markers ON TOP of polyline
    valid.forEach(p => {
      const item = p as any;
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      
      const isTransitActive = activeTab === 'transit' ? (item.transitId === expandedItemId) : (expandedItemId === item.id);
      const isActive = !!isTransitActive;
      const isTransitFaded = activeTab === 'transit' && expandedItemId !== null && !isTransitActive;
      
      let pinColor = '#dc2626';
      let pinTextPrefix = '';
      if (activeTab === 'transit') {
        if (item.type === 'transit_depart') {
          pinColor = '#3b82f6';
          pinTextPrefix = '🛫 ';
        } else if (item.type === 'transit_arrive') {
          pinColor = '#10b981';
          pinTextPrefix = '🛬 ';
        } else if (item.type === 'transit_boarding') {
          pinColor = '#f59e0b';
          pinTextPrefix = '🎫 ';
        }
      } else if (item.isPhoto) {
        pinColor = '#f97316';
        pinTextPrefix = '📷 ';
      } else if (selectedDate === 'ALL') {
        const dayIndex = item.dayIndex || 0;
        const colorIndex = (dayIndex ? dayIndex - 1 : 0) % dayColors.length;
        pinColor = dayColors[colorIndex];
        if (dayIndex) {
          pinTextPrefix = `[D${dayIndex}] `;
        }
      }

      const htmlContent = `
        <div class="pin-wrapper" style="opacity: ${isTransitFaded ? '0.25' : '1'}; transition: opacity 0.3s;">
          <div class="leaflet-pin${isActive ? ' active-pin' : ''}" style="background-color: ${pinColor}; ${isActive ? `box-shadow: 0 0 0 5px ${pinColor}40, 0 3px 10px rgba(0,0,0,0.4);` : ''}">${isActive ? '<div class="pin-inner-dot"></div>' : ''}</div>
          <div class="pin-label${isActive ? ' pin-label-active' : ''}">${pinTextPrefix}${item.place}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: [140, 60],
        iconAnchor: [70, isActive ? 12 : 9],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
      marker.on('click', (e: any) => { 
        L.DomEvent.stopPropagation(e); 
        handleItemToggle(activeTab === 'transit' ? item.transitId : item.id); 
      });
      markersRef.current[item.id] = marker;
    });

    if (coords.length > 0 && (!isInteractive || !hasFitRef.current)) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      hasFitRef.current = true;
    }

    if (expandedItemId !== null) {
      let activeMarker: any = null;
      if (activeTab === 'transit') {
        if (transitFocusType === 'depart') {
          activeMarker = markersRef.current[expandedItemId * 10];
        } else if (transitFocusType === 'arrive') {
          activeMarker = markersRef.current[expandedItemId * 10 + 1];
        } else if (transitFocusType === 'boarding') {
          activeMarker = markersRef.current[expandedItemId * 10 + 2];
        } else {
          activeMarker = markersRef.current[expandedItemId * 10 + 2] 
                      || markersRef.current[expandedItemId * 10] 
                      || markersRef.current[expandedItemId * 10 + 1];
        }
      } else {
        activeMarker = markersRef.current[expandedItemId];
      }

      if (activeMarker) {
        const latLng = activeMarker.getLatLng();
        map.setView(latLng, Math.max(map.getZoom(), 14), { animate: true });
      }
    }

  }, [mapPoints, expandedItemId, isDarkMode, mapReady, isInteractive, activeTab, transitFocusType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 3b: OSM Overpass API POIs Fetcher ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'stays' || expandedItemId === null) {
      setPoiItems([]);
      return;
    }

    const activePoint = mapPoints.find(p => p.id === expandedItemId);
    if (!activePoint || !activePoint.lat || !activePoint.lng) {
      setPoiItems([]);
      return;
    }

    const lat = Number(activePoint.lat);
    const lng = Number(activePoint.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setPoiItems([]);
      return;
    }

    let isMounted = true;
    setPoiLoading(true);

    const query = `
      [out:json][timeout:15];
      (
        node["shop"="convenience"](around:1000, ${lat}, ${lng});
        node["shop"="supermarket"](around:1000, ${lat}, ${lng});
        node["railway"="station"](around:1000, ${lat}, ${lng});
        node["public_transport"="station"](around:1000, ${lat}, ${lng});
      );
      out body 30;
    `;

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && data.elements) {
          const items = data.elements.map((el: any) => {
            let type = 'convenience';
            if (el.tags?.shop === 'supermarket') type = 'supermarket';
            else if (el.tags?.railway === 'station' || el.tags?.public_transport === 'station') type = 'station';

            return {
              id: el.id,
              lat: el.lat,
              lng: el.lon,
              name: el.tags?.name || el.tags?.['name:ko'] || el.tags?.['name:en'] || (type === 'convenience' ? '편의점' : type === 'supermarket' ? '마켓' : '역'),
              type
            };
          });
          setPoiItems(items);
        }
      })
      .catch(err => {
        console.error("Overpass API failed:", err);
      })
      .finally(() => {
        if (isMounted) setPoiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [expandedItemId, activeTab, mapPoints]);

  // ─── Effect 3c: Render POI markers on map ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear previous POIs
    poiMarkersRef.current.forEach(m => map.removeLayer(m));
    poiMarkersRef.current = [];

    if (activeTab !== 'stays' || expandedItemId === null) return;

    poiItems.forEach(poi => {
      const isVisible = 
        (poi.type === 'convenience' && showConvenience) ||
        (poi.type === 'supermarket' && showSupermarket) ||
        (poi.type === 'station' && showStation);

      if (!isVisible) return;

      let color = '#a855f7'; // station (purple)
      let emoji = '🚉';
      if (poi.type === 'convenience') {
        color = '#3b82f6'; // convenience (blue)
        emoji = '🏪';
      } else if (poi.type === 'supermarket') {
        color = '#10b981'; // supermarket (green)
        emoji = '🛒';
      }

      const htmlContent = `
        <div class="poi-pin-wrapper">
          <div class="poi-pin" style="background-color: ${color};">${emoji}</div>
          <div class="poi-label">${poi.name}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-poi-pin-icon',
        html: htmlContent,
        iconSize: [100, 45],
        iconAnchor: [50, 10],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon, zIndexOffset: 500 }).addTo(map);
      poiMarkersRef.current.push(marker);
    });
  }, [poiItems, showConvenience, showSupermarket, showStation, mapReady, activeTab, expandedItemId]);

  // ─── Effect 3d: Flight route plane animation ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    // stop existing animation
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (animMarkerRef.current) {
      try {
        map.removeLayer(animMarkerRef.current);
      } catch (_) {}
      animMarkerRef.current = null;
    }

    if (activeTab === 'flights' && expandedItemId !== null) {
      // Find depart and arrive points (f.id * 10 & f.id * 10 + 1)
      const fromPoint = mapPoints.find(p => p.id === expandedItemId * 10);
      const toPoint = mapPoints.find(p => p.id === expandedItemId * 10 + 1);

      if (fromPoint && toPoint && fromPoint.lat && fromPoint.lng && toPoint.lat && toPoint.lng) {
        const startLat = Number(fromPoint.lat);
        const startLng = Number(fromPoint.lng);
        const endLat = Number(toPoint.lat);
        const endLng = Number(toPoint.lng);

        if (!isNaN(startLat) && !isNaN(startLng) && !isNaN(endLat) && !isNaN(endLng)) {
          // Calculate heading angle
          const dy = endLat - startLat;
          const dx = endLng - startLng;
          const angle = Math.atan2(dx, dy) * 180 / Math.PI;

          // Rotated plane emoji icon
          const planeIconHtml = `
            <div class="animated-plane-wrapper" style="transform: rotate(${angle}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 26px; line-height: 1; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.45)); display: inline-block;">✈️</span>
            </div>
          `;

          const planeIcon = L.divIcon({
            className: 'custom-animated-plane-icon',
            html: planeIconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const animMarker = L.marker([startLat, startLng], { icon: planeIcon, zIndexOffset: 3000 }).addTo(map);
          animMarkerRef.current = animMarker;

          const duration = 3000; // 3 seconds flight cycle
          let startTime: number | null = null;

          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            let elapsed = timestamp - startTime;
            let progress = elapsed / duration;

            if (progress >= 1) {
              startTime = timestamp; // Loop back
              progress = 0;
            }

            // Interpolated position
            const currentLat = startLat + (endLat - startLat) * progress;
            const currentLng = startLng + (endLng - startLng) * progress;

            animMarker.setLatLng([currentLat, currentLng]);
            animFrameIdRef.current = requestAnimationFrame(animate);
          };

          animFrameIdRef.current = requestAnimationFrame(animate);
        }
      }
    }

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (animMarkerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(animMarkerRef.current);
        } catch (_) {}
        animMarkerRef.current = null;
      }
    };
  }, [activeTab, expandedItemId, mapPoints, mapReady]);

  // ─── Effect 4: Map click → open Google Maps ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onMapClick = () => {
      if (isEditMode) return;
      const valid = mapPoints.filter(p =>
        p.lat !== undefined && p.lng !== undefined &&
        !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
      );
      const q = valid.length > 0
        ? valid.map(c => c.place).join(' to ')
        : (trip.locationStr || trip.title || '');
      if (!q) return;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
    };
    map.off('click');
    map.on('click', onMapClick);
    return () => { map.off('click', onMapClick); };
  }, [mapPoints, trip, isEditMode]);

  // Zoom helpers
  const zoomIn = () => { if (mapRef.current) mapRef.current.zoomIn(); };
  const zoomOut = () => { if (mapRef.current) mapRef.current.zoomOut(); };

  if (!(window as any).L) {
    return (
      <div className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden flex flex-col items-center justify-center text-black/40 dark:text-white/40 p-6">
        <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Loading Map Engine...</span>
      </div>
    );
  }

  const isStayTabWithSelection = activeTab === 'stays' && expandedItemId !== null;

  return (
    <div className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden transition-colors duration-300">
      {/* Leaflet map container */}
      <div
        ref={containerRef}
        id="leaflet-map"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* ── Custom Zoom Controls ── */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-1 z-20">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 shadow flex items-center justify-center hover:bg-white dark:hover:bg-[#222] transition-colors"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4 text-black dark:text-white" />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 shadow flex items-center justify-center hover:bg-white dark:hover:bg-[#222] transition-colors"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4 text-black dark:text-white" />
        </button>
      </div>

      {/* ── Nearby POI Toggles Overlay (Stays tab only) ── */}
      {isStayTabWithSelection && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2 z-20 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 p-2.5 shadow-md">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-black/50 dark:text-white/50">Nearby Amenities</span>
            {poiLoading && <Loader2 className="w-3 h-3 text-red-600 animate-spin" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowConvenience(!showConvenience)}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                showConvenience 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                  : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Convenience ({poiItems.filter(p => p.type === 'convenience').length})</span>
            </button>
            <button
              onClick={() => setShowSupermarket(!showSupermarket)}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                showSupermarket 
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                  : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Supermarket ({poiItems.filter(p => p.type === 'supermarket').length})</span>
            </button>
            <button
              onClick={() => setShowStation(!showStation)}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                showStation 
                  ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                  : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Stations ({poiItems.filter(p => p.type === 'station').length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Status Bar & Interaction Toggles ── */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 flex justify-between items-end z-20 pointer-events-none">
        <div className="bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors pointer-events-auto">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-red-600 dark:text-red-400" />
          <span className="hidden sm:inline">{trip.locationStr} : </span>
          {selectedDate === 'ALL' ? 'Overall Routes' : 'Daily Route'}
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={() => setIsInteractive(!isInteractive)}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] uppercase font-black tracking-widest border transition-all rounded-sm flex items-center gap-1.5 shadow-md ${
              isInteractive
                ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                : 'bg-[#F9F8F6]/95 dark:bg-[#111111]/95 text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-white dark:hover:bg-[#222]'
            }`}
          >
            {isInteractive ? '🔒 LOCK MAP' : '🔓 UNLOCK MAP (ZOOM/DRAG)'}
          </button>
        </div>
      </div>
    </div>
  );
}
