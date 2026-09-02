import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Plus, Minus, Store, ShoppingBag, Train, Loader2, ChevronDown, ChevronUp, Menu, Lock, Unlock } from 'lucide-react';
import { Trip, TimelineItem, TransitItem } from '../types';

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
  transits?: TransitItem[];
  isCinematicMode?: boolean;
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
  transits = [],
  isCinematicMode = false,
}: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string | number]: any }>({});
  const polylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hasFitRef = useRef(false);
  const summaryCircleRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);

  const lastTabRef = useRef<string | undefined>(undefined);
  const lastExpandedItemIdRef = useRef<number | null>(null);
  const lastTransitFocusTypeRef = useRef<'depart' | 'arrive' | 'boarding' | null | undefined>(null);
  const lastActiveCoordsRef = useRef<string>('');
  const lastSelectedDateRef = useRef<string>('');

  // Animation references for flight travel visualization
  const animMarkerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Traveler animation references for Cinematic Tour Mode
  const travelerMarkerRef = useRef<any>(null);
  const travelerAnimRef = useRef<number | null>(null);
  const lastActiveSpotCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isCinematicMode) {
      if (travelerAnimRef.current) {
        cancelAnimationFrame(travelerAnimRef.current);
        travelerAnimRef.current = null;
      }
      if (travelerMarkerRef.current && mapRef.current) {
        try { mapRef.current.removeLayer(travelerMarkerRef.current); } catch (_) {}
        travelerMarkerRef.current = null;
      }
      lastActiveSpotCoordsRef.current = null;
    }
  }, [isCinematicMode]);

  // Calculate animation key to prevent re-running animation effect on keystrokes
  const animKey = (() => {
    if (!mapReady || (activeTab !== 'flights' && activeTab !== 'transit') || expandedItemId === null) {
      return '';
    }
    const fromPoint = mapPoints.find(p => p.id === expandedItemId * 10);
    const toPoint = mapPoints.find(p => p.id === expandedItemId * 10 + 1);
    if (!fromPoint || !toPoint || fromPoint.lat === undefined || fromPoint.lng === undefined || toPoint.lat === undefined || toPoint.lng === undefined) {
      return '';
    }
    const startLat = Number(fromPoint.lat);
    const startLng = Number(fromPoint.lng);
    const endLat = Number(toPoint.lat);
    const endLng = Number(toPoint.lng);
    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      return '';
    }
    let src = '/airplane.png';
    if (activeTab === 'transit') {
      const transit = transits.find(t => t.id === expandedItemId);
      const ticketType = (transit?.ticketType || '').toUpperCase();
      if (ticketType.includes('BUS')) {
        src = '/bus.png';
      } else if (ticketType.includes('TAXI') || ticketType.includes('CAR')) {
        src = '/car.png';
      } else {
        src = '/train.png';
      }
    }
    return `${activeTab}|${expandedItemId}|${startLat}|${startLng}|${endLat}|${endLng}|${src}`;
  })();

  // POI Features
  const [poiItems, setPoiItems] = useState<any[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [showConvenience, setShowConvenience] = useState(false);
  const [showSupermarket, setShowSupermarket] = useState(false);
  const [showStation, setShowStation] = useState(false);
  const [isPoiExpanded, setIsPoiExpanded] = useState(true);
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

    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/${isDarkMode ? 'dark_all' : 'light_all'}/{z}/{x}/{y}.png?key=${cartoKey}`
      : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxNativeZoom: 20,
      maxZoom: 21,
      zIndex: 1,
      className: !cartoKey && isDarkMode ? 'map-tile-dark' : (!cartoKey ? 'map-tile-light' : ''),
    }).addTo(map);

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
  // ─── Effect 2: Leaflet redraw helper on dark-mode toggle ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/${isDarkMode ? 'dark_all' : 'light_all'}/{z}/{x}/{y}.png?key=${cartoKey}`
      : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxNativeZoom: 20,
      maxZoom: 21,
      zIndex: 1,
      className: !cartoKey && isDarkMode ? 'map-tile-dark' : (!cartoKey ? 'map-tile-light' : ''),
    }).addTo(map);

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
    if (summaryCircleRef.current) { map.removeLayer(summaryCircleRef.current); summaryCircleRef.current = null; }

    const valid = mapPoints.filter(p =>
      p.lat !== undefined && p.lng !== undefined &&
      !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
    );

    const isGalleryTab = activeTab === 'gallery';
    const isSummaryMode = activeTab === 'summary';
    if (valid.length === 0) {
      if (!hasFitRef.current || isGalleryTab) {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 13);
      }
      return;
    }

    const coords: [number, number][] = valid.map(p => [Number(p.lat), Number(p.lng)]);

    if (!isSummaryMode) {
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
          
          // Find the transit type for this group
          const transit = transits.find(t => t.id === tId);
          const tType = transit?.transitType || 'train';
          let pathColor = '#4f46e5'; // Train: Indigo
          if (tType === 'bus') {
            pathColor = '#10b981'; // Bus: Green
          } else if (tType === 'taxi') {
            pathColor = '#f59e0b'; // Taxi: Yellow
          }

          if (group.depart && group.arrive) {
            const poly = L.polyline([group.depart, group.arrive], {
              color: pathColor,
              weight: isActiveTrans ? 5 : 3,
              dashArray: '4, 6',
              opacity: isActiveTrans ? 0.95 : 0.65
            });
            transPolylines.push(poly);
          }
        });

        if (transPolylines.length > 0) {
          const fGroup = L.featureGroup(transPolylines).addTo(map);
          polylineRef.current = fGroup;
        }
      } else {
        // Group points by dayIndex to color daily paths differently
        const dayGroups: { [day: number]: [number, number][] } = {};
        valid.forEach((p: any) => {
          const day = p.dayIndex || 1;
          if (!dayGroups[day]) {
            dayGroups[day] = [];
          }
          dayGroups[day].push([Number(p.lat), Number(p.lng)]);
        });

        const polys: any[] = [];
        Object.entries(dayGroups).forEach(([dayStr, points]) => {
          const day = Number(dayStr);
          if (points.length > 1) {
            const colorIndex = (day - 1) % dayColors.length;
            const color = dayColors[colorIndex];
            const poly = L.polyline(points, {
              color: color,
              weight: 2.5,
              dashArray: '6, 5',
              opacity: 0.75,
            });
            polys.push(poly);
          }
        });

        if (polys.length > 0) {
          polylineRef.current = L.featureGroup(polys).addTo(map);
        }
      }
    }

    // If in Summary mode, render only city pulse ring markers (no pins, no labels)
    if (isSummaryMode) {
      // Group coordinates by rounding to 1 decimal place (~11km) to represent "cities"
      const cityMap = new Map<string, { lat: number; lng: number }>();
      valid.forEach(p => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, { lat, lng });
        }
      });

      cityMap.forEach(({ lat, lng }, key) => {
        const htmlContent = `
          <div class="summary-city-pulse" style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; pointer-events: none; position: relative;">
            <div class="city-core" style="width: 12px; height: 12px; background-color: #d97706; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(217,119,6,0.6); position: relative; z-index: 2;"></div>
            <div class="city-ring" style="position: absolute; width: 70px; height: 70px; border: 2px solid #d97706; border-radius: 50%; background-color: rgba(217, 119, 6, 0.12); animation: cityPulse 2.5s infinite ease-out; z-index: 1;"></div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-leaflet-summary-city-icon',
          html: htmlContent,
          iconSize: [70, 70],
          iconAnchor: [35, 35],
        });

        const marker = L.marker([lat, lng], { icon, zIndexOffset: 800 }).addTo(map);
        markersRef.current[`city-${key}`] = marker;
      });
      
      // Jitter prevention check for tab change metadata
      const tabChanged = lastTabRef.current !== activeTab;
      if (tabChanged && lastTabRef.current === 'summary') {
        hasFitRef.current = false;
      }
      lastTabRef.current = activeTab;
      lastExpandedItemIdRef.current = expandedItemId;
      lastTransitFocusTypeRef.current = transitFocusType;
      lastActiveCoordsRef.current = '';
      lastSelectedDateRef.current = selectedDate;

      // Ensure view is fitted
      const coords: [number, number][] = valid.map(p => [Number(p.lat), Number(p.lng)]);
      
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
      } else {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 10, { animate: true });
      }
      return;
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

      if (isSummaryMode) {
        pinColor = '#d97706'; // Gold/Amber highlight for summary mode
        pinTextPrefix = '📍 ';
      } else if (activeTab === 'transit') {
        const tType = item.transitType || 'train';
        if (tType === 'bus') {
          pinColor = '#10b981'; // Green
        } else if (tType === 'taxi') {
          pinColor = '#f59e0b'; // Amber/Yellow
        } else {
          pinColor = '#4f46e5'; // Indigo/Blue
        }
        
        if (item.type === 'transit_depart') {
          pinTextPrefix = '🛫 ';
        } else if (item.type === 'transit_arrive') {
          pinTextPrefix = '🛬 ';
        }
      } else if (item.isPhoto) {
        pinColor = '#f97316';
        pinTextPrefix = '📷 ';
      } else {
        const dayIndex = item.dayIndex || 0;
        const colorIndex = (dayIndex ? dayIndex - 1 : 0) % dayColors.length;
        pinColor = dayColors[colorIndex];
        pinTextPrefix = '';
      }

      let htmlContent = '';
      if (isSummaryMode) {
        htmlContent = `
          <div class="pin-wrapper" style="transition: opacity 0.3s;">
            <div class="pin-label pin-label-active font-black tracking-tight" style="background-color: rgba(217, 119, 6, 0.15); border: 1.5px solid #d97706; color: #d97706; padding: 4px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2); font-size: 11px;">
              ✨ ${item.place}
            </div>
          </div>
        `;
      } else {
        htmlContent = `
          <div class="pin-wrapper" style="opacity: ${isTransitFaded ? '0.25' : '1'}; transition: opacity 0.3s;">
            <div class="leaflet-pin${isActive ? ' active-pin' : ''}" style="background-color: ${pinColor}; ${isActive ? `box-shadow: 0 0 0 5px ${pinColor}40, 0 3px 10px rgba(0,0,0,0.4);` : ''}">${isActive ? '<div class="pin-inner-dot"></div>' : ''}</div>
            <div class="pin-label${isActive ? ' pin-label-active' : ''}">${pinTextPrefix}${item.place}</div>
          </div>
        `;
      }

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: isSummaryMode ? [120, 35] : [140, 60],
        iconAnchor: isSummaryMode ? [60, 17] : [70, isActive ? 12 : 9],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isActive ? 100000 : 1000 }).addTo(map);
      marker.on('click', (e: any) => { 
        L.DomEvent.stopPropagation(e); 
        handleItemToggle(activeTab === 'transit' ? item.transitId : item.id); 
      });
      markersRef.current[item.id] = marker;
    });

    // Jitter prevention check
    const tabChanged = lastTabRef.current !== activeTab;
    if (tabChanged && lastTabRef.current === 'summary') {
      hasFitRef.current = false;
    }
    const itemIdChanged = lastExpandedItemIdRef.current !== expandedItemId;
    const focusTypeChanged = lastTransitFocusTypeRef.current !== transitFocusType;
    
    let currentCoordsStr = '';
    const activePointsList: { lat: number; lng: number }[] = [];
    
    if (expandedItemId !== null) {
      if (activeTab === 'transit') {
        if (transitFocusType === 'depart') {
          const p = mapPoints.find(item => item.id === expandedItemId * 10);
          if (p && p.lat && p.lng) activePointsList.push({ lat: Number(p.lat), lng: Number(p.lng) });
        } else if (transitFocusType === 'arrive') {
          const p = mapPoints.find(item => item.id === expandedItemId * 10 + 1);
          if (p && p.lat && p.lng) activePointsList.push({ lat: Number(p.lat), lng: Number(p.lng) });
        } else {
          // If transitFocusType is null, include both depart and arrive points for the transit route
          const pDepart = mapPoints.find(item => item.id === expandedItemId * 10);
          const pArrive = mapPoints.find(item => item.id === expandedItemId * 10 + 1);
          if (pDepart && pDepart.lat && pDepart.lng) activePointsList.push({ lat: Number(pDepart.lat), lng: Number(pDepart.lng) });
          if (pArrive && pArrive.lat && pArrive.lng) activePointsList.push({ lat: Number(pArrive.lat), lng: Number(pArrive.lng) });
        }
      } else if (activeTab === 'flights') {
        const fromPoint = mapPoints.find(p => p.id === expandedItemId * 10);
        const toPoint = mapPoints.find(p => p.id === expandedItemId * 10 + 1);
        if (fromPoint && fromPoint.lat && fromPoint.lng) activePointsList.push({ lat: Number(fromPoint.lat), lng: Number(fromPoint.lng) });
        if (toPoint && toPoint.lat && toPoint.lng) activePointsList.push({ lat: Number(toPoint.lat), lng: Number(toPoint.lng) });
      } else {
        const p = mapPoints.find(item => item.id === expandedItemId);
        if (p && p.lat && p.lng) activePointsList.push({ lat: Number(p.lat), lng: Number(p.lng) });
      }
    }
    
    currentCoordsStr = activePointsList.map(c => `${c.lat},${c.lng}`).join('|');
    const coordsChanged = lastActiveCoordsRef.current !== currentCoordsStr;
    const dateChanged = lastSelectedDateRef.current !== selectedDate;

    const shouldPanZoom = tabChanged || itemIdChanged || focusTypeChanged || coordsChanged || dateChanged;

    // Update refs
    lastTabRef.current = activeTab;
    lastExpandedItemIdRef.current = expandedItemId;
    lastTransitFocusTypeRef.current = transitFocusType;
    lastActiveCoordsRef.current = currentCoordsStr;
    lastSelectedDateRef.current = selectedDate;

    if (shouldPanZoom) {
      const isMobile = window.innerWidth < 768;

      if (activeTab === 'summary') {
        if (coords.length > 0) {
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
        } else {
          const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
          const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
          map.setView([lat, lng], 10, { animate: true });
        }
        
        if (summaryCircleRef.current) {
          map.removeLayer(summaryCircleRef.current);
          summaryCircleRef.current = null;
        }
      }

      if (activeTab !== 'summary' && expandedItemId === null && coords.length > 0 && (!isInteractive || !hasFitRef.current || isGalleryTab)) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: isMobile ? [15, 15] : [48, 48], maxZoom: isMobile ? 15 : 15 });
        hasFitRef.current = true;
      }

      if (expandedItemId !== null) {
        let activeMarker: any = null;
        if (activeTab === 'transit') {
          if (transitFocusType === 'depart') {
            activeMarker = markersRef.current[expandedItemId * 10];
          } else if (transitFocusType === 'arrive') {
            activeMarker = markersRef.current[expandedItemId * 10 + 1];
          }
        } else {
          activeMarker = markersRef.current[expandedItemId];
        }

        if (activeMarker) {
          const latLng = activeMarker.getLatLng();
          const targetZoom = (activeTab === 'timeline' || activeTab === 'stays') ? 15 : 14;

          if (isCinematicMode && lastActiveSpotCoordsRef.current && 
              (lastActiveSpotCoordsRef.current.lat !== latLng.lat || lastActiveSpotCoordsRef.current.lng !== latLng.lng)) {
            const prevCoords = { ...lastActiveSpotCoordsRef.current };
            const nextCoords = { lat: latLng.lat, lng: latLng.lng };

            if (travelerAnimRef.current) {
              cancelAnimationFrame(travelerAnimRef.current);
            }

            const L = (window as any).L;
            if (L) {
              const travelerIcon = L.divIcon({
                className: 'traveler-icon-container',
                html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); transform: translate(-50%, -100%) translateY(-8px);" class="animate-bounce select-none pointer-events-none">🚶‍♂️</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 36]
              });
              if (!travelerMarkerRef.current) {
                travelerMarkerRef.current = L.marker([prevCoords.lat, prevCoords.lng], {
                  icon: travelerIcon,
                  zIndexOffset: 250000,
                }).addTo(map);
              } else {
                travelerMarkerRef.current.setIcon(travelerIcon);
                travelerMarkerRef.current.setZIndexOffset(250000);
                travelerMarkerRef.current.setLatLng([prevCoords.lat, prevCoords.lng]);
              }

              const startTime = performance.now();
              const animDuration = 1600; // 1.6s smooth walk

              const step = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / animDuration);
                // EaseInOutQuad
                const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

                const curLat = prevCoords.lat + (nextCoords.lat - prevCoords.lat) * ease;
                const curLng = prevCoords.lng + (nextCoords.lng - prevCoords.lng) * ease;

                if (travelerMarkerRef.current) {
                  travelerMarkerRef.current.setLatLng([curLat, curLng]);
                }
                map.panTo([curLat, curLng], { animate: false });

                if (progress < 1) {
                  travelerAnimRef.current = requestAnimationFrame(step);
                } else {
                  map.setView([nextCoords.lat, nextCoords.lng], Math.max(map.getZoom(), targetZoom), { animate: true });
                }
              };

              travelerAnimRef.current = requestAnimationFrame(step);
            } else {
              map.setView(latLng, Math.max(map.getZoom(), targetZoom), { animate: true });
            }
          } else {
            map.setView(latLng, Math.max(map.getZoom(), targetZoom), { animate: true });
          }

          lastActiveSpotCoordsRef.current = { lat: latLng.lat, lng: latLng.lng };
        } else if (activeTab === 'flights' || (activeTab === 'transit' && !transitFocusType)) {
          const fromPoint = mapPoints.find(p => p.id === expandedItemId * 10);
          const toPoint = mapPoints.find(p => p.id === expandedItemId * 10 + 1);
          const hasFrom = fromPoint && fromPoint.lat !== undefined && fromPoint.lng !== undefined && !isNaN(Number(fromPoint.lat)) && !isNaN(Number(fromPoint.lng));
          const hasTo = toPoint && toPoint.lat !== undefined && toPoint.lng !== undefined && !isNaN(Number(toPoint.lat)) && !isNaN(Number(toPoint.lng));
          
          if (hasFrom && hasTo) {
            const startLat = Number(fromPoint.lat);
            const startLng = Number(fromPoint.lng);
            const endLat = Number(toPoint.lat);
            const endLng = Number(toPoint.lng);
            const bounds = L.latLngBounds([[startLat, startLng], [endLat, endLng]]);
            
            const padTopLeft: [number, number] = isMobile ? [15, 15] : [60, 60];
            const padBotRight: [number, number] = isMobile ? [15, 30] : [60, 130];
            map.fitBounds(bounds, { 
              paddingTopLeft: padTopLeft, 
              paddingBottomRight: padBotRight, 
              maxZoom: isMobile ? 15 : 15, 
              animate: true 
            });
          } else if (hasFrom) {
            map.setView([Number(fromPoint.lat), Number(fromPoint.lng)], 14, { animate: true });
          } else if (hasTo) {
            map.setView([Number(toPoint.lat), Number(toPoint.lng)], 14, { animate: true });
          }
        }
      }
    }

  }, [mapPoints, expandedItemId, isDarkMode, mapReady, isInteractive, activeTab, transitFocusType, transits, selectedDate, isCinematicMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 3b: Google Places POIs Fetcher ──────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'stays') {
      setPoiItems([]);
      return;
    }

    // Determine reference lat/lng
    let lat = Number(trip.lat);
    let lng = Number(trip.lng);

    if (expandedItemId !== null) {
      // Prioritize actively selected stay item coordinates
      const activePoint = mapPoints.find(p => p.id === expandedItemId);
      if (activePoint && activePoint.lat && activePoint.lng) {
        lat = Number(activePoint.lat);
        lng = Number(activePoint.lng);
      }
    } else if (mapPoints.length > 0) {
      // If no stay card is selected, use the first stay in the mapPoints list
      const firstStay = mapPoints.find(p => p.lat !== undefined && p.lng !== undefined && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)));
      if (firstStay) {
        lat = Number(firstStay.lat);
        lng = Number(firstStay.lng);
      }
    }

    if (isNaN(lat) || isNaN(lng)) {
      setPoiItems([]);
      return;
    }

    // Define localized fallback POIs representing typical amenities depending on country
    const isJapan = (lat > 30 && lat < 46 && lng > 128 && lng < 146) || (trip.locationStr || '').toLowerCase().includes('japan') || (trip.locationStr || '').toLowerCase().includes('일본') || (trip.locationStr || '').toLowerCase().includes('kyoto') || (trip.locationStr || '').toLowerCase().includes('tokyo') || (trip.locationStr || '').toLowerCase().includes('osaka');
    const isKorea = (lat > 33 && lat < 39 && lng > 124 && lng < 131) || (trip.locationStr || '').toLowerCase().includes('korea') || (trip.locationStr || '').toLowerCase().includes('한국') || (trip.locationStr || '').toLowerCase().includes('seoul');

    const fallbackPois = isJapan
      ? [
          { id: 900001, lat: lat + 0.0018, lng: lng + 0.0015, name: 'Lawson (ローソン)', type: 'convenience' },
          { id: 900002, lat: lat - 0.0012, lng: lng - 0.0018, name: '7-Eleven (セブン-イレブン)', type: 'convenience' },
          { id: 900003, lat: lat + 0.0009, lng: lng - 0.0022, name: 'FamilyMart (ファミリー마ート)', type: 'convenience' },
          { id: 900004, lat: lat + 0.0025, lng: lng - 0.0011, name: 'Fresco Supermarket (フ레스コ)', type: 'supermarket' },
          { id: 900005, lat: lat - 0.0019, lng: lng + 0.0010, name: 'Life Supermarket (ライフ)', type: 'supermarket' },
          { id: 900006, lat: lat - 0.0028, lng: lng + 0.0022, name: 'Subway Station (지하철역)', type: 'station' },
          { id: 900007, lat: lat + 0.0022, lng: lng - 0.0020, name: 'JR Station (JR역)', type: 'station' }
        ]
      : isKorea
      ? [
          { id: 900001, lat: lat + 0.0018, lng: lng + 0.0015, name: 'GS25 편의점', type: 'convenience' },
          { id: 900002, lat: lat - 0.0012, lng: lng - 0.0018, name: 'CU 편의점', type: 'convenience' },
          { id: 900003, lat: lat + 0.0009, lng: lng - 0.0022, name: '세븐일레븐 편의점', type: 'convenience' },
          { id: 900004, lat: lat + 0.0025, lng: lng - 0.0011, name: '이마트 에브리데이', type: 'supermarket' },
          { id: 900005, lat: lat - 0.0019, lng: lng + 0.0010, name: '홈플러스 익스프레스', type: 'supermarket' },
          { id: 900006, lat: lat - 0.0028, lng: lng + 0.0022, name: '지하철역', type: 'station' },
          { id: 900007, lat: lat + 0.0022, lng: lng - 0.0020, name: '버스 정류장', type: 'station' }
        ]
      : [
          { id: 900001, lat: lat + 0.0018, lng: lng + 0.0015, name: 'Convenience Store', type: 'convenience' },
          { id: 900002, lat: lat - 0.0012, lng: lng - 0.0018, name: 'Convenience Store', type: 'convenience' },
          { id: 900003, lat: lat + 0.0009, lng: lng - 0.0022, name: 'Convenience Store', type: 'convenience' },
          { id: 900004, lat: lat + 0.0025, lng: lng - 0.0011, name: 'Supermarket', type: 'supermarket' },
          { id: 900005, lat: lat - 0.0019, lng: lng + 0.0010, name: 'Grocery Store', type: 'supermarket' },
          { id: 900006, lat: lat - 0.0028, lng: lng + 0.0022, name: 'Subway Station', type: 'station' },
          { id: 900007, lat: lat + 0.0022, lng: lng - 0.0020, name: 'Bus Station', type: 'station' }
        ];

    // Synchronously preload fallback POIs so toggling shows pins immediately
    setPoiItems(fallbackPois);

    let isMounted = true;
    setPoiLoading(true);

    const google = (window as any).google;
    if (google && google.maps && google.maps.places && containerRef.current) {
      try {
        const dummyDiv = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyDiv);
        
        const searchType = (googleType: string, poiType: string): Promise<any[]> => {
          return new Promise((resolve) => {
            service.nearbySearch(
              {
                location: new google.maps.LatLng(lat, lng),
                radius: 1500,
                type: googleType
              },
              (results: any, status: any) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                  const mapped = results.slice(0, 15).map((place: any) => {
                    if (!place.geometry || !place.geometry.location) return null;
                    return {
                      id: place.place_id || `${poiType}-${Math.random()}`,
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                      name: place.name || '',
                      type: poiType
                    };
                  }).filter(Boolean);
                  resolve(mapped);
                } else {
                  resolve([]);
                }
              }
            );
          });
        };

        Promise.all([
          searchType('convenience_store', 'convenience'),
          searchType('supermarket', 'supermarket'),
          searchType('subway_station', 'station'),
          searchType('train_station', 'station')
        ]).then((resultsArray) => {
          if (!isMounted) return;
          const allPois = resultsArray.flat();
          // Filter duplicates by id
          const uniquePoisMap: { [id: string]: any } = {};
          allPois.forEach((p: any) => {
            uniquePoisMap[p.id] = p;
          });
          const uniquePois = Object.values(uniquePoisMap);

          if (uniquePois.length > 0) {
            setPoiItems(uniquePois);
          } else {
            setPoiItems(fallbackPois);
          }
          setPoiLoading(false);
        }).catch((err) => {
          console.error("Google PlacesService failed, keeping fallback POIs:", err);
          if (isMounted) {
            setPoiItems(fallbackPois);
            setPoiLoading(false);
          }
        });
      } catch (err) {
        console.error("Failed to initialize PlacesService:", err);
        setPoiItems(fallbackPois);
        setPoiLoading(false);
      }
    } else {
      setPoiItems(fallbackPois);
      setPoiLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [expandedItemId, activeTab, mapPoints, trip.lat, trip.lng, trip.locationStr]);

  // ─── Effect 3c: Render POI markers on map ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear previous POIs
    poiMarkersRef.current.forEach(m => map.removeLayer(m));
    poiMarkersRef.current = [];

    if (activeTab !== 'stays') return;

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
      
      const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}`;
      
      const popupContainer = document.createElement('div');
      popupContainer.style.fontFamily = 'sans-serif';
      popupContainer.style.fontSize = '11px';
      popupContainer.style.padding = '4px';
      popupContainer.style.color = '#111';
      popupContainer.style.minWidth = '140px';

      const title = document.createElement('strong');
      title.style.fontSize = '12px';
      title.style.display = 'block';
      title.style.marginBottom = '2px';
      title.textContent = poi.name || '';
      popupContainer.appendChild(title);

      const subText = document.createElement('span');
      subText.style.color = '#666';
      subText.style.fontSize = '9px';
      subText.style.display = 'block';
      subText.style.marginBottom = '6px';
      subText.textContent = '📍 Double click to view on Google Maps';
      popupContainer.appendChild(subText);

      const button = document.createElement('button');
      button.style.background = '#e11d48';
      button.style.color = '#fff';
      button.style.border = 'none';
      button.style.padding = '5px 8px';
      button.style.fontSize = '10px';
      button.style.fontWeight = 'bold';
      button.style.cursor = 'pointer';
      button.style.borderRadius = '2px';
      button.style.width = '100%';
      button.style.transition = 'background 0.2s';
      button.textContent = 'Google Maps 이동';

      button.onmouseover = () => { button.style.background = '#be123c'; };
      button.onmouseout = () => { button.style.background = '#e11d48'; };
      
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(googleSearchUrl, '_blank');
      });
      popupContainer.appendChild(button);

      marker.bindPopup(popupContainer, { closeButton: false });

      // Double click listener to navigate to Google Maps
      marker.on('dblclick', (e: any) => {
        L.DomEvent.stopPropagation(e);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}`, '_blank');
      });

      poiMarkersRef.current.push(marker);
    });
  }, [poiItems, showConvenience, showSupermarket, showStation, mapReady, activeTab, expandedItemId]);

  // ─── Effect 3d: Flight route plane animation ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !animKey) return;
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

    // Since animKey is verified, we know all points are valid and expandedItemId !== null
    const fromPoint = mapPoints.find(p => p.id === expandedItemId! * 10);
    const toPoint = mapPoints.find(p => p.id === expandedItemId! * 10 + 1);

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

        // Resolve vehicle icon src and size
        let src = '/airplane.png';
        let width = 38;
        let height = 38;

        if (activeTab === 'transit') {
          const transit = transits.find(t => t.id === expandedItemId);
          const ticketType = (transit?.ticketType || '').toUpperCase();
          if (ticketType.includes('BUS')) {
            src = '/bus.png';
            width = 24;
            height = 48;
          } else if (ticketType.includes('TAXI') || ticketType.includes('CAR')) {
            src = '/car.png';
            width = 28;
            height = 40;
          } else {
            src = '/train.png';
            width = 40;
            height = 100;
          }
        }

        const vehicleIconHtml = `
          <div class="animated-vehicle-wrapper" style="transform: rotate(${angle}deg); width: ${width}px; height: ${height}px; display: flex; align-items: center; justify-content: center;">
            <img src="${src}" style="width: ${width}px; height: ${height}px; object-fit: contain; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));" />
          </div>
        `;

        const vehicleIcon = L.divIcon({
          className: 'custom-animated-vehicle-icon',
          html: vehicleIconHtml,
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2]
        });

        const animMarker = L.marker([startLat, startLng], { icon: vehicleIcon, zIndexOffset: 3000 }).addTo(map);
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
  }, [mapReady, animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effect 4: Map click → open Google Maps ────────────────────────────────
  // Zoom helpers
  const zoomIn = () => { if (mapRef.current) mapRef.current.zoomIn(); };
  const zoomOut = () => { if (mapRef.current) mapRef.current.zoomOut(); };

  if (!(window as any).L) {
    return (
      <div className="flex-grow relative bg-neutral-100 dark:bg-[#111111] overflow-hidden flex flex-col items-center justify-center text-black/40 dark:text-white/40 p-6">
        <span className="text-[10px] uppercase tracking-widest font-bold z-10 mb-2">Loading Map Engine...</span>
      </div>
    );
  }

  const isStayTab = activeTab === 'stays';

  // Get active location string (city, country or place name)
  const activeLocationName = (() => {
    if (expandedItemId !== null) {
      let activeItem: any = null;
      if (activeTab === 'transit') {
        const departItem = mapPoints.find(item => (item as any).transitId === expandedItemId && item.type === 'transit_depart');
        const arriveItem = mapPoints.find(item => (item as any).transitId === expandedItemId && item.type === 'transit_arrive');
        if (transitFocusType === 'arrive') {
          activeItem = arriveItem;
        } else {
          activeItem = departItem || arriveItem;
        }
      } else if (activeTab === 'flights') {
        const departItem = mapPoints.find(item => item.id === expandedItemId * 10);
        const arriveItem = mapPoints.find(item => item.id === expandedItemId * 10 + 1);
        activeItem = departItem || arriveItem;
      } else {
        activeItem = mapPoints.find(item => item.id === expandedItemId);
      }
      
      if (activeItem) {
        const nameSource = activeItem.place || activeItem.location || '';
        const parts = nameSource.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return parts.slice(-2).join(', ');
        }
        return nameSource || trip.locationStr;
      }
    }
    return trip.locationStr;
  })();

  return (
    <div className="flex-grow relative bg-neutral-100 dark:bg-[#111111] overflow-hidden transition-colors duration-300">
      {/* Leaflet map container */}
      <div
        ref={containerRef}
        id="leaflet-map"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* ── Nearby POI Toggles Overlay (Stays tab only) ── */}
      {isStayTab && (
        <div className="absolute top-2 left-2 md:top-6 md:left-6 flex flex-col gap-1 md:gap-2 z-20 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur border border-black/20 dark:border-white/20 p-1.5 md:p-2.5 shadow-md transition-all duration-300">
          <div 
            onClick={() => setIsPoiExpanded(!isPoiExpanded)}
            className="flex items-center justify-between gap-2 md:gap-3 cursor-pointer select-none"
          >
            <div className="flex items-center gap-1 md:gap-1.5">
              <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-black/50 dark:text-white/50">Nearby Amenities</span>
              {poiLoading && <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-600 animate-spin" />}
            </div>
            {isPoiExpanded ? (
              <ChevronUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-black/50 dark:text-white/50" />
            ) : (
              <ChevronDown className="w-3 md:w-3.5 h-3 md:h-3.5 text-black/50 dark:text-white/50" />
            )}
          </div>
          
          {isPoiExpanded && (
            <div className="flex flex-col gap-1 mt-1 md:gap-1.5 md:mt-1.5 animate-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => setShowConvenience(!showConvenience)}
                className={`flex items-center gap-1 md:gap-2 px-1.5 py-1 md:px-2.5 md:py-1.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  showConvenience 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                    : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Store className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>Convenience ({poiItems.filter(p => p.type === 'convenience').length})</span>
              </button>
              <button
                onClick={() => setShowSupermarket(!showSupermarket)}
                className={`flex items-center gap-1 md:gap-2 px-1.5 py-1 md:px-2.5 md:py-1.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  showSupermarket 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                    : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <ShoppingBag className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>Supermarket ({poiItems.filter(p => p.type === 'supermarket').length})</span>
              </button>
              <button
                onClick={() => setShowStation(!showStation)}
                className={`flex items-center gap-1 md:gap-2 px-1.5 py-1 md:px-2.5 md:py-1.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  showStation 
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                    : 'bg-transparent border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Train className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>Stations ({poiItems.filter(p => p.type === 'station').length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Compact Map Tools Mini Menu (Hamburger) ── */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-auto select-none">
        <button
          type="button"
          onClick={() => setIsMapMenuOpen(prev => !prev)}
          className={`p-1.5 rounded shadow-sm border transition-all cursor-pointer flex items-center justify-center ${
            isMapMenuOpen 
              ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
              : 'bg-[#F9F8F6]/90 dark:bg-[#111111]/90 backdrop-blur-md text-black/70 dark:text-white/70 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white hover:bg-[#F9F8F6] dark:hover:bg-[#111111]'
          }`}
          title="지도 도구 메뉴"
          aria-label="Toggle map tools menu"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {isMapMenuOpen && (
          <div className="flex flex-col gap-1 p-1 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/15 dark:border-white/15 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => { if (mapRef.current) mapRef.current.zoomIn(); }}
              className="w-7 h-7 flex items-center justify-center rounded text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="지도 확대"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { if (mapRef.current) mapRef.current.zoomOut(); }}
              className="w-7 h-7 flex items-center justify-center rounded text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="지도 축소"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-full h-px bg-black/10 dark:bg-white/10 my-0.5" />
            <button
              type="button"
              onClick={() => setIsInteractive(prev => !prev)}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
                isInteractive
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
              title={isInteractive ? "지도 상호작용 잠금 (Lock)" : "지도 상호작용 활성화 (Unlock)"}
            >
              {isInteractive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
