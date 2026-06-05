import React, { useRef, useState, useEffect } from 'react';
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

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current) return;
    if (!(window as any).L) {
      console.warn("Leaflet (L) global is not loaded yet.");
      return;
    }

    const L = (window as any).L;

    // Default center
    const defaultLat = trip.lat !== undefined && trip.lat !== null && !isNaN(Number(trip.lat)) ? Number(trip.lat) : 35.0116;
    const defaultLng = trip.lng !== undefined && trip.lng !== null && !isNaN(Number(trip.lng)) ? Number(trip.lng) : 135.7681;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false, // Prevent zoom on scroll to keep scrolling premium
      dragging: true,
      touchZoom: true
    }).setView([defaultLat, defaultLng], 13);

    mapRef.current = map;

    // Trigger invalidateSize to align tile boundaries
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trip.id]); // Recreate map only when trip changes to avoid state leaks

  // 2. Handle map clicks (Open in external Google Maps)
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

    return () => {
      map.off('click', onMapClick);
    };
  }, [mapPoints, trip, isEditMode]);

  // 3. Sync Dark Mode Tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;

    const L = (window as any).L;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // CartoDB Minimal Tile Styles
    const tileUrl = isDarkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 20
    }).addTo(map);
  }, [isDarkMode]);

  // 4. Render Markers and Paths
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;

    const L = (window as any).L;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker: any) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Clear old polyline
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

    validPoints.forEach((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      latlngs.push([lat, lng]);

      const isActive = expandedItemId === p.id;

      // Active vs Normal styling for red pins
      const pinClass = isActive 
        ? 'w-4 h-4 md:w-5 md:h-5 bg-red-600 border-2 border-white rounded-full ring-4 ring-red-500/30 shadow-lg scale-125 flex items-center justify-center transition-all duration-300' 
        : 'w-3 h-3 md:w-3.5 md:h-3.5 bg-red-500 border-2 border-white rounded-full shadow-md hover:bg-red-600 hover:scale-110 flex items-center justify-center transition-all duration-300';
      
      const labelClass = isActive
        ? 'mt-1 text-[9px] md:text-[10px] uppercase font-bold bg-[#F9F8F6] dark:bg-[#111111] text-red-600 dark:text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded shadow-sm opacity-100 transition-all pointer-events-none whitespace-nowrap'
        : 'mt-1 text-[9px] md:text-[10px] uppercase font-bold bg-[#F9F8F6] dark:bg-[#111111] text-black dark:text-white border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap';

      const htmlContent = `
        <div class="flex flex-col items-center group cursor-pointer" style="transform: translate(0, 0);">
          <div class="${pinClass}">
            ${isActive ? '<div class="w-1.5 h-1.5 bg-white rounded-full"></div>' : ''}
          </div>
          <div class="${labelClass}">${p.place}</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: [120, 50],
        iconAnchor: [60, isActive ? 10 : 7] // Align anchor correctly based on size
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        handleItemToggle(p.id);
      });

      markersRef.current[p.id] = marker;
    });

    // Draw Dotted Polyline Route
    if (latlngs.length > 1) {
      polylineRef.current = L.polyline(latlngs, {
        color: isDarkMode ? '#f87171' : '#dc2626', // Red dotted path
        weight: 2,
        dashArray: '4, 4',
        className: 'route-polyline'
      }).addTo(map);
    }

    // Fit Bounds dynamically to show all pins
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15
    });

  }, [mapPoints, expandedItemId, isDarkMode]);

  // If Leaflet library is not yet loaded, render custom premium loading fallback
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
