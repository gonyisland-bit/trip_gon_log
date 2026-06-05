import React, { useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
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
  const initializedRef = useRef(false);

  // 1. Initialize Leaflet Map (runs once per trip.id)
  useEffect(() => {
    if (!containerRef.current) return;
    if (!(window as any).L) {
      console.warn("Leaflet (L) global is not loaded yet.");
      return;
    }
    // Prevent double-init (StrictMode)
    if (mapRef.current) return;

    const L = (window as any).L;

    const defaultLat = trip.lat !== undefined && trip.lat !== null && !isNaN(Number(trip.lat)) ? Number(trip.lat) : 35.0116;
    const defaultLng = trip.lng !== undefined && trip.lng !== null && !isNaN(Number(trip.lng)) ? Number(trip.lng) : 135.7681;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;
    initializedRef.current = true;

    // — Add tile layer FIRST so it sits at the bottom —
    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20, zIndex: 1 }).addTo(map);

    // invalidateSize after a short delay to fix blank tile edges
    setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 200);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        markersRef.current = {};
        polylineRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Dark-mode tile swap (does NOT recreate entire map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;
    const L = (window as any).L;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    // Use zIndex 1 so it stays underneath markers (default pane)
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20, zIndex: 1 }).addTo(map);

    // Bring all markers to front after tile swap
    Object.values(markersRef.current).forEach((marker: any) => {
      if (marker && marker.bringToFront) marker.bringToFront();
    });
    if (polylineRef.current && polylineRef.current.bringToFront) {
      polylineRef.current.bringToFront();
    }
  }, [isDarkMode]);

  // 3. Render Markers and Paths (re-runs when mapPoints or expandedItemId changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;
    const L = (window as any).L;

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker: any) => map.removeLayer(marker));
    markersRef.current = {};

    // Clear previous polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const validPoints = mapPoints.filter(p =>
      p.lat !== undefined && p.lng !== undefined &&
      !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
    );

    if (validPoints.length === 0) {
      const defaultLat = trip.lat !== undefined && trip.lat !== null && !isNaN(Number(trip.lat)) ? Number(trip.lat) : 35.0116;
      const defaultLng = trip.lng !== undefined && trip.lng !== null && !isNaN(Number(trip.lng)) ? Number(trip.lng) : 135.7681;
      map.setView([defaultLat, defaultLng], 13);
      return;
    }

    const latlngs: [number, number][] = [];

    // — Add polyline BEFORE markers so markers render on top —
    // We collect coords first, then draw line, then markers
    const coords = validPoints.map(p => [Number(p.lat), Number(p.lng)] as [number, number]);

    if (coords.length > 1) {
      polylineRef.current = L.polyline(coords, {
        color: isDarkMode ? '#f87171' : '#dc2626',
        weight: 2.5,
        dashArray: '5, 5',
        opacity: 0.75,
      }).addTo(map);
    }

    // Add markers on top of polyline
    validPoints.forEach((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      latlngs.push([lat, lng]);

      const isActive = expandedItemId === p.id;

      const pinClass = isActive
        ? 'leaflet-pin active-pin'
        : 'leaflet-pin';

      const innerDot = isActive ? '<div class="pin-inner-dot"></div>' : '';

      const htmlContent = `
        <div class="pin-wrapper">
          <div class="${pinClass}">${innerDot}</div>
          <div class="pin-label${isActive ? ' pin-label-active' : ''}">${p.place}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: [140, 60],
        iconAnchor: [70, isActive ? 12 : 9]
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        handleItemToggle(p.id);
      });

      markersRef.current[p.id] = marker;
    });

    // Fit bounds to show all pins nicely
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });

  }, [mapPoints, expandedItemId, isDarkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Map click → Open Google Maps
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = () => {
      if (isEditMode) return;
      const validCoords = mapPoints.filter(p =>
        p.lat !== undefined && p.lng !== undefined &&
        !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
      );
      const q = validCoords.length > 0
        ? validCoords.map(c => c.place).join(' to ')
        : (trip.locationStr || trip.title || '');
      if (!q) return;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
    };

    map.off('click');
    map.on('click', onMapClick);

    return () => { map.off('click', onMapClick); };
  }, [mapPoints, trip, isEditMode]);

  // Fallback if Leaflet is not yet loaded
  if (!(window as any).L) {
    return (
      <div className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden flex flex-col items-center justify-center text-black/40 dark:text-white/40 p-6">
        <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Loading Map Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex-grow relative bg-[#EAE8E3] dark:bg-[#1A1A1A] overflow-hidden transition-colors duration-300">
      <div
        ref={containerRef}
        id="leaflet-map"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Overlay Status Bar */}
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
