import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Plus, Minus } from 'lucide-react';
import { Trip, TimelineItem } from '../types';

interface MapAreaProps {
  trip: Trip;
  isEditMode: boolean;
  mapPoints: TimelineItem[];
  expandedItemId: number | null;
  handleItemToggle: (id: number) => void;
  selectedDate: string;
  isDarkMode: boolean;
}

export function MapArea({
  trip,
  isEditMode,
  mapPoints,
  expandedItemId,
  handleItemToggle,
  selectedDate,
  isDarkMode,
}: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [id: number]: any }>({});
  const polylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  // Track whether we have already fit bounds at least once.
  // After first fit, we don't snap back on empty mapPoints.
  const hasFitRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

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
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;

    // Add tile layer FIRST so it sits at z-index 1 (below markers)
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

  // ─── Effect 2: Swap tiles on dark-mode toggle ───────────────────────────────
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

    // Bring markers/polyline back to front after tile swap
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
      // Only snap to trip center if we have NEVER fit bounds before.
      // Once the user has seen the map with pins, keep the current view.
      if (!hasFitRef.current) {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 13);
      }
      return;
    }

    const coords: [number, number][] = valid.map(p => [Number(p.lat), Number(p.lng)]);

    // Draw polyline UNDER markers (rendered first)
    if (coords.length > 1) {
      polylineRef.current = L.polyline(coords, {
        color: isDarkMode ? '#f87171' : '#dc2626',
        weight: 2.5,
        dashArray: '6, 5',
        opacity: 0.75,
      }).addTo(map);
    }

    // Draw markers ON TOP of polyline
    valid.forEach(p => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      const isActive = expandedItemId === p.id;

      const htmlContent = `
        <div class="pin-wrapper">
          <div class="leaflet-pin${isActive ? ' active-pin' : ''}">${isActive ? '<div class="pin-inner-dot"></div>' : ''}</div>
          <div class="pin-label${isActive ? ' pin-label-active' : ''}">${p.place}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: [140, 60],
        iconAnchor: [70, isActive ? 12 : 9],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
      marker.on('click', (e: any) => { L.DomEvent.stopPropagation(e); handleItemToggle(p.id); });
      markersRef.current[p.id] = marker;
    });

    // Fit bounds only the FIRST time we have real pins
    if (!hasFitRef.current) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      hasFitRef.current = true;
    }

  }, [mapPoints, expandedItemId, isDarkMode, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Leaflet not yet loaded fallback
  if (!(window as any).L) {
    return (
      <div className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden flex flex-col items-center justify-center text-black/40 dark:text-white/40 p-6">
        <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Loading Map Engine...</span>
      </div>
    );
  }

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

      {/* ── Status Bar ── */}
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 flex justify-between z-20 pointer-events-none">
        <div className="bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 transition-colors pointer-events-auto">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-red-600 dark:text-red-400" />
          <span className="hidden sm:inline">{trip.locationStr} : </span>
          {selectedDate === 'ALL' ? 'Overall Routes' : 'Daily Route'}
        </div>
      </div>
    </div>
  );
}
