import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Plus, Minus, Store, ShoppingBag, Train, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Menu, Lock, Unlock, Bookmark } from 'lucide-react';
import { Trip, TimelineItem, TransitItem, SpotPocketItem } from '../types';
import { getSavedPockets } from '../utils/pocketStorage';

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
  cinematicSpeed?: number;
  cinematicVehicleType?: 'car' | 'train' | 'ship' | 'flight' | null;
  hoveredItemId?: number | null;
  onItemHover?: (id: number | null) => void;
  onAddSpotToTimeline?: (spot: SpotPocketItem) => void;
}

const getVehicleDimensions = (type: 'car' | 'train' | 'ship' | 'flight' | null | undefined): { iconSize: [number, number]; iconAnchor: [number, number] } => {
  if (type === 'train') return { iconSize: [52, 32], iconAnchor: [26, 32] };
  if (type === 'car') return { iconSize: [48, 32], iconAnchor: [24, 32] };
  if (type === 'ship') return { iconSize: [50, 32], iconAnchor: [25, 32] };
  if (type === 'flight') return { iconSize: [48, 30], iconAnchor: [24, 30] };
  return { iconSize: [40, 46], iconAnchor: [20, 46] }; // walker
};

const getTravelerHtml = (vehicleType: 'car' | 'train' | 'ship' | 'flight' | null | undefined, isWest: boolean, isMoving: boolean) => {
  const flipStyle = isWest ? 'scaleX(-1)' : 'scaleX(1)';
  // 자동차 SVG는 기본 상태에서 차 앞머리(보닛)가 왼쪽(x=5)을 향하므로 플립 반전 적용
  const carFlipStyle = isWest ? 'scaleX(1)' : 'scaleX(-1)';
  
  if (vehicleType === 'car') {
    return `
      <div style="width: 48px; height: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; pointer-events: none; contain: layout paint; isolation: isolate;">
        <style>
          @keyframes carSuspension {
            0%, 100% { transform: translateY(0px) ${carFlipStyle}; }
            50% { transform: translateY(-1.5px) ${carFlipStyle}; }
          }
        </style>
        <div style="${isMoving ? 'animation: carSuspension 0.22s ease-in-out infinite;' : `transform: ${carFlipStyle};`} transform-origin: center center; will-change: transform;">
          <svg viewBox="0 0 48 28" width="44" height="26" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">
            <path d="M5 19C5 18 6 15 8 13.5C10 12 14 11 16 7.5C17.5 5 21 4.5 28 4.5C35 4.5 37 7.5 40 10.5C43 13 45 15.5 45 18C45 20 44 20.5 42 20.5C41 18 39 16 36.5 16C34 16 32 18 31 20.5H19C18 18 16 16 13.5 16C11 16 9 18 8 20.5C6 20.5 5 20 5 19Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M17.5 8C19 6 22 5.5 27 5.5V11H13.5C14.8 9.5 16.2 8.5 17.5 8Z" fill="#FFFFFF" fill-opacity="0.9" />
            <path d="M29 5.5C34 5.5 35.5 7.5 38 10.5C38.5 11 36 11 30.5 11V5.5H29Z" fill="#FFFFFF" fill-opacity="0.9" />
            <circle cx="13.5" cy="20.5" r="4.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" />
            <circle cx="13.5" cy="20.5" r="1.8" fill="#FFFFFF" />
            <circle cx="36.5" cy="20.5" r="4.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" />
            <circle cx="36.5" cy="20.5" r="1.8" fill="#FFFFFF" />
            <path d="M44 14.5L46 16.5H44V14.5Z" fill="#FACC15" />
          </svg>
        </div>
        <div style="width: 36px; height: 5px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 75%); border-radius: 50%; margin-top: -2px;"></div>
      </div>
    `;
  }
  
  if (vehicleType === 'train') {
    return `
      <div style="width: 52px; height: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; pointer-events: none; contain: layout paint; isolation: isolate;">
        <style>
          @keyframes trainSuspension {
            0%, 100% { transform: translateY(0px) ${flipStyle}; }
            50% { transform: translateY(-1.2px) ${flipStyle}; }
          }
        </style>
        <div style="${isMoving ? 'animation: trainSuspension 0.2s ease-in-out infinite;' : `transform: ${flipStyle};`} transform-origin: center center; will-change: transform;">
          <svg viewBox="0 0 52 28" width="48" height="26" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">
            <path d="M4 8C4 6 5.5 5 8 5H41C46 5 49 9 51 15C52 18 51 19.5 48 20H7C5 20 4 19 4 17V8Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M42.5 7.5C45.5 8 47.5 11 49 14.5H40V7.5H42.5Z" fill="#FFFFFF" fill-opacity="0.9" />
            <rect x="8" y="8" width="5.5" height="4" rx="0.8" fill="#FFFFFF" fill-opacity="0.85" />
            <rect x="16" y="8" width="5.5" height="4" rx="0.8" fill="#FFFFFF" fill-opacity="0.85" />
            <rect x="24" y="8" width="5.5" height="4" rx="0.8" fill="#FFFFFF" fill-opacity="0.85" />
            <rect x="32" y="8" width="5.5" height="4" rx="0.8" fill="#FFFFFF" fill-opacity="0.85" />
            <rect x="4" y="14" width="46" height="1.8" fill="#E11D48" />
            <circle cx="12" cy="21" r="3.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
            <circle cx="20" cy="21" r="3.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
            <circle cx="34" cy="21" r="3.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
            <circle cx="42" cy="21" r="3.2" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
          </svg>
        </div>
        <div style="width: 42px; height: 5px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 75%); border-radius: 50%; margin-top: -2px;"></div>
      </div>
    `;
  }

  if (vehicleType === 'ship') {
    return `
      <div style="width: 50px; height: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; pointer-events: none; contain: layout paint; isolation: isolate;">
        <style>
          @keyframes shipRolling {
            0%, 100% { transform: translateY(0px) ${flipStyle} rotate(0deg); }
            50% { transform: translateY(-1.5px) ${flipStyle} rotate(1.5deg); }
          }
        </style>
        <div style="${isMoving ? 'animation: shipRolling 0.28s ease-in-out infinite;' : `transform: ${flipStyle};`} transform-origin: center center; will-change: transform;">
          <svg viewBox="0 0 50 28" width="46" height="26" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">
            <path d="M19 6V2.5H23V6H19Z" fill="#18181B" stroke="#FFFFFF" stroke-width="0.8" />
            <rect x="19" y="3.5" width="4" height="1" fill="#E11D48" />
            <path d="M13 13V7.5C13 6.8 13.8 6.2 14.5 6.2H32.5C33.2 6.2 34 6.8 34.5 7.5L37.5 13H13Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round" />
            <rect x="16" y="8" width="3.2" height="2.2" rx="0.5" fill="#FFFFFF" fill-opacity="0.9" />
            <rect x="21" y="8" width="3.2" height="2.2" rx="0.5" fill="#FFFFFF" fill-opacity="0.9" />
            <rect x="26" y="8" width="3.2" height="2.2" rx="0.5" fill="#FFFFFF" fill-opacity="0.9" />
            <path d="M31 8H33.5L35.5 11H31V8Z" fill="#FFFFFF" fill-opacity="0.9" />
            <path d="M3.5 13.5C4 16.5 6.8 19.8 11.5 19.8H36.5C41.8 19.8 45.2 16.8 47 13H4C3.8 13.2 3.6 13.3 3.5 13.5Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" />
            <line x1="7" y1="15.5" x2="43" y2="15.5" stroke="#FFFFFF" stroke-width="0.8" stroke-dasharray="2 1.5" stroke-opacity="0.75" />
          </svg>
        </div>
        <div style="width: 44px; height: 5px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 75%); border-radius: 50%; margin-top: -2px;"></div>
      </div>
    `;
  }

  if (vehicleType === 'flight') {
    return `
      <div style="width: 48px; height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; pointer-events: none; contain: layout paint; isolation: isolate;">
        <style>
          @keyframes planeGliding {
            0%, 100% { transform: translateY(0px) ${flipStyle}; }
            50% { transform: translateY(-1.5px) ${flipStyle}; }
          }
        </style>
        <div style="${isMoving ? 'animation: planeGliding 0.35s ease-in-out infinite;' : `transform: ${flipStyle};`} transform-origin: center center; will-change: transform;">
          <svg viewBox="0 0 48 26" width="44" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">
            <path d="M4 7.5L8.5 13H13L7.5 5.5C7 4.8 6 4.8 5.5 5.5L4 7.5Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
            <path d="M10 12.5H35C40.5 12.5 44.5 13.5 45.8 14.5C44.5 15.5 40.5 16.5 35 16.5H11C8.5 16.5 5.5 15.8 4.5 14.5C5.5 13.2 8.5 12.5 10 12.5Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" />
            <path d="M21 14.5L16.5 20.5C16 21 15 21 14.5 20.5L14 20L18.5 14.5H21Z" fill="#18181B" stroke="#FFFFFF" stroke-width="1" />
            <rect x="20.5" y="17.5" width="6.5" height="2.2" rx="1" fill="#18181B" stroke="#FFFFFF" stroke-width="0.8" />
            <path d="M39 13.2C41.5 13.2 43.2 13.8 43.8 14.2H38V13.2H39Z" fill="#FFFFFF" fill-opacity="0.95" />
            <line x1="16" y1="13.8" x2="36" y2="13.8" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="2 1" stroke-opacity="0.85" />
          </svg>
        </div>
        <div style="width: 38px; height: 5px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 75%); border-radius: 50%; margin-top: -1px;"></div>
      </div>
    `;
  }

  // Default: Walker (사람 걷기)
  return `
    <div style="width: 40px; height: 46px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; pointer-events: none; contain: layout paint; isolation: isolate;">
      <style>
        @keyframes walkerBobbing {
          0%, 100% { transform: translateY(0px) ${flipStyle} rotate(0deg); }
          25% { transform: translateY(-4px) ${flipStyle} rotate(2.5deg); }
          50% { transform: translateY(0px) ${flipStyle} rotate(0deg); }
          75% { transform: translateY(-4px) ${flipStyle} rotate(-2.5deg); }
        }
        @keyframes walkerShadowPulse {
          0%, 50%, 100% { transform: scale(1); opacity: 0.5; }
          25%, 75% { transform: scale(0.75); opacity: 0.25; }
        }
      </style>
      <div style="${isMoving ? 'animation: walkerBobbing 0.44s ease-in-out infinite;' : `transform: ${flipStyle};`} transform-origin: bottom center; will-change: transform;">
        <img 
          src="/walker.png" 
          alt="Walker" 
          style="width: 38px; height: 38px; object-fit: contain; display: block; filter: drop-shadow(1.5px 0 0 #FFFFFF) drop-shadow(-1.5px 0 0 #FFFFFF) drop-shadow(0 1.5px 0 #FFFFFF) drop-shadow(0 -1.5px 0 #FFFFFF) drop-shadow(0 2px 4px rgba(0,0,0,0.65));" 
        />
      </div>
      <div style="width: 24px; height: 5px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 75%); border-radius: 50%; ${isMoving ? 'animation: walkerShadowPulse 0.44s ease-in-out infinite;' : ''} margin-top: -2px;"></div>
    </div>
  `;
};

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
  cinematicSpeed = 3600,
  cinematicVehicleType = null,
  hoveredItemId = null,
  onItemHover,
  onAddSpotToTimeline,
}: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string | number]: any }>({});
  const polylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hasFitRef = useRef(false);
  const summaryCircleRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isInteractive, setIsInteractive] = useState(true);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [showPocketPins, setShowPocketPins] = useState<boolean>(true);
  const pocketMarkersRef = useRef<{ [id: string]: any }>({});

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

  // ─── Close open popup on Escape key ───
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mapRef.current) {
        mapRef.current.closePopup();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ─── Pocket Ghost Pins Layer Effect ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clean up previous ghost pins
    Object.values(pocketMarkersRef.current).forEach((m: any) => {
      try { map.removeLayer(m); } catch (_) {}
    });
    pocketMarkersRef.current = {};

    if (!showPocketPins) return;

    const L = (window as any).L;
    if (!L) return;

    const allPockets = getSavedPockets();
    const spotsWithCoords = allPockets.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');

    spotsWithCoords.forEach(spot => {
      const lat = spot.lat!;
      const lng = spot.lng!;

      const htmlContent = `
        <div class="pocket-pin-wrapper" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
          <style>
            @keyframes pocketPulseAnim {
              0% { transform: scale(0.85); opacity: 0.8; }
              50% { transform: scale(1.65); opacity: 0; }
              100% { transform: scale(0.85); opacity: 0; }
            }
            .pocket-pin-wrapper:hover .pocket-pin-core {
              transform: translateY(-2px) scale(1.12);
              box-shadow: 0 6px 18px rgba(82,82,91,0.5);
            }
            .pocket-pulse-wave {
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.2s ease-out;
            }
            .pocket-pin-wrapper:hover .pocket-pulse-wave,
            .pocket-pin-wrapper.active-pocket-pin .pocket-pulse-wave {
              opacity: 1;
              animation: pocketPulseAnim 2.0s infinite ease-out;
            }
            .pocket-pin-label {
              opacity: 0;
              visibility: hidden;
              transform: translate(-50%, 4px);
              pointer-events: none;
              transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
            }
            .pocket-pin-wrapper:hover .pocket-pin-label,
            .pocket-pin-wrapper.active-pocket-pin .pocket-pin-label {
              opacity: 1;
              visibility: visible;
              transform: translate(-50%, 0);
              pointer-events: auto;
            }
          </style>

          <!-- Pulse Wave (Only on hover / click) -->
          <div class="pocket-pulse-wave" style="position: absolute; top: 0; left: 50%; margin-left: -14px; width: 28px; height: 28px; border-radius: 50%; background: rgba(82,82,91,0.35); pointer-events: none;"></div>

          <!-- Solid Refined Gray Bookmark Pin -->
          <div class="pocket-pin-core" style="position: relative; z-index: 2; width: 22px; height: 22px; border-radius: 50%; background: #52525B; border: 1.5px solid #ffffff; box-shadow: 0 3px 10px rgba(82,82,91,0.45), 0 1px 3px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
            <svg viewBox="0 0 24 24" width="10" height="10" stroke="white" stroke-width="2.5" fill="white">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          <!-- Clean Swiss Minimal Gray Label (Hidden by default, shown on hover/click) -->
          <div class="pocket-pin-label" style="position: absolute; top: 25px; left: 50%; z-index: 10; background: rgba(244, 244, 246, 0.96); backdrop-filter: blur(8px); border: 1px solid rgba(212, 212, 216, 0.95); border-radius: 4px; color: #18181b; font-size: 10px; font-weight: 700; padding: 2.5px 7px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06); display: flex; align-items: center;">
            <span style="background: #e4e4e7; color: #52525b; font-size: 7.5px; font-weight: 900; padding: 1px 4px; border-radius: 2px; margin-right: 4px; font-family: monospace; letter-spacing: 0.05em; border: 0.5px solid rgba(82,82,91,0.25);">POCKET</span>
            <span style="color: #18181b; font-weight: 700;">${spot.title}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-ghost-pocket-pin',
        html: htmlContent,
        iconSize: [140, 52],
        iconAnchor: [70, 11],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 500 }).addTo(map);

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 190px; padding: 4px;">
          <div style="font-size: 9px; font-weight: 900; color: #52525b; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
            ${(spot.category || 'SPOT').toUpperCase()} · POCKET SPOT
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 4px; line-height: 1.2;">
            ${spot.title}
          </div>
          ${spot.memo ? `<div style="font-size: 11px; color: #555; margin-bottom: 8px; line-height: 1.35; max-height: 60px; overflow-y: auto;">${spot.memo}</div>` : ''}
          <button id="ghost-pin-add-${spot.id}" style="width: 100%; padding: 6px 8px; background: #52525b; color: #fff; font-size: 10px; font-weight: 800; border: none; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace; border-radius: 2px; transition: background 0.15s;">
            + ADD TO TIMELINE
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: true, closeOnEscapeKey: true, offset: [0, -6] });

      marker.on('popupopen', () => {
        const el = marker.getElement();
        if (el) el.querySelector('.pocket-pin-wrapper')?.classList.add('active-pocket-pin');
        const btn = document.getElementById(`ghost-pin-add-${spot.id}`);
        if (btn) {
          btn.onclick = () => {
            onAddSpotToTimeline?.(spot);
            marker.closePopup();
          };
        }
      });

      marker.on('popupclose', () => {
        const el = marker.getElement();
        if (el) el.querySelector('.pocket-pin-wrapper')?.classList.remove('active-pocket-pin');
      });

      pocketMarkersRef.current[spot.id] = marker;
    });
  }, [mapReady, showPocketPins, onAddSpotToTimeline]);

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
      scrollWheelZoom: true,    // enabled by default (unlocked)
      dragging: true,           // enabled by default (unlocked)
      touchZoom: true,          // enabled by default (unlocked)
      doubleClickZoom: true,    // enabled by default (unlocked)
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
      if (activeTab === 'flights') {
        const flightPolylines: any[] = [];
        const flightDepartPoints = mapPoints.filter(p => typeof p.id === 'number' && p.id % 10 === 0);

        flightDepartPoints.forEach(pDepart => {
          const flightId = Math.floor(pDepart.id / 10);
          const pArrive = mapPoints.find(item => item.id === pDepart.id + 1);

          if (pDepart.lat && pDepart.lng && pArrive && pArrive.lat && pArrive.lng) {
            const startLat = Number(pDepart.lat);
            const startLng = Number(pDepart.lng);
            const endLat = Number(pArrive.lat);
            const endLng = Number(pArrive.lng);

            // Great-circle Arc control point calculation identical to flight motion
            const midLat = (startLat + endLat) / 2;
            const midLng = (startLng + endLng) / 2;
            const perpLat = -(endLng - startLng) * 0.18;
            const perpLng = (endLat - startLat) * 0.18;
            const ctrlLat = midLat + perpLat;
            const ctrlLng = midLng + perpLng;

            // Generate Arc curve points
            const arcPoints: [number, number][] = [];
            const steps = 36;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const inv = 1 - t;
              const curLat = inv * inv * startLat + 2 * inv * t * ctrlLat + t * t * endLat;
              const curLng = inv * inv * startLng + 2 * inv * t * ctrlLng + t * t * endLng;
              arcPoints.push([curLat, curLng]);
            }

            const isActiveFlight = expandedItemId !== null && flightId === expandedItemId;
            const poly = L.polyline(arcPoints, {
              color: '#ef4444',
              weight: isActiveFlight ? 4.5 : 2.5,
              dashArray: '5, 6',
              opacity: isActiveFlight ? 0.95 : 0.65
            });
            flightPolylines.push(poly);
          }
        });

        if (flightPolylines.length > 0) {
          const fGroup = L.featureGroup(flightPolylines).addTo(map);
          polylineRef.current = fGroup;
        }
      } else if (activeTab === 'transit') {
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
      if (tabChanged) {
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
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
      } else {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 12, { animate: true });
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
      const isTransitHovered = activeTab === 'transit' ? (item.transitId === hoveredItemId) : (hoveredItemId === item.id);
      const isHovered = !!isTransitHovered;
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
        const showPulse = isActive || isHovered;
        htmlContent = `
          <div class="pin-wrapper" style="opacity: ${isTransitFaded ? '0.25' : '1'}; transition: opacity 0.3s;">
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              ${showPulse ? `
                <div class="pin-radar-ring" style="background-color: ${pinColor}25; border: 1.5px solid ${pinColor}80;"></div>
                <div class="pin-radar-ring-2" style="background-color: ${pinColor}15; border: 1.5px solid ${pinColor}60;"></div>
              ` : ''}
              <div class="leaflet-pin${isActive ? ' active-pin' : ''}${isHovered && !isActive ? ' hovered-pin' : ''}" style="background-color: ${pinColor}; ${isActive ? `box-shadow: 0 0 0 5px ${pinColor}40, 0 3px 10px rgba(0,0,0,0.4);` : ''}">${isActive ? '<div class="pin-inner-dot"></div>' : ''}</div>
            </div>
            <div class="pin-label${isActive ? ' pin-label-active' : ''}${isHovered && !isActive ? ' pin-label-hovered' : ''}">${pinTextPrefix}${item.place}</div>
          </div>
        `;
      }

      const icon = L.divIcon({
        className: 'custom-leaflet-pin-icon',
        html: htmlContent,
        iconSize: isSummaryMode ? [120, 35] : [140, 60],
        iconAnchor: isSummaryMode ? [60, 17] : [70, isActive ? 12 : 9],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: (isActive || isHovered) ? 100000 : 1000 }).addTo(map);
      marker.on('click', (e: any) => { 
        L.DomEvent.stopPropagation(e); 
        handleItemToggle(activeTab === 'transit' ? item.transitId : item.id); 
      });
      marker.on('mouseover', () => {
        onItemHover?.(activeTab === 'transit' ? item.transitId : item.id);
      });
      marker.on('mouseout', () => {
        onItemHover?.(null);
      });
      markersRef.current[item.id] = marker;
    });

    // Jitter prevention check
    const tabChanged = lastTabRef.current !== activeTab;
    if (tabChanged) {
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
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
        } else {
          const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
          const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
          map.setView([lat, lng], 12, { animate: true });
        }
        
        if (summaryCircleRef.current) {
          map.removeLayer(summaryCircleRef.current);
          summaryCircleRef.current = null;
        }
      }

      const shouldFitAll = tabChanged || !isInteractive || !hasFitRef.current || isGalleryTab || (itemIdChanged && expandedItemId === null);
      if (activeTab !== 'summary' && expandedItemId === null && coords.length > 0 && shouldFitAll) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: isMobile ? [15, 15] : [48, 48], maxZoom: isMobile ? 15 : 15, animate: true });
        hasFitRef.current = true;
      } else if (activeTab !== 'summary' && expandedItemId === null && coords.length === 0 && tabChanged) {
        const lat = typeof trip.lat === 'number' && !isNaN(trip.lat) ? trip.lat : 35.0116;
        const lng = typeof trip.lng === 'number' && !isNaN(trip.lng) ? trip.lng : 135.7681;
        map.setView([lat, lng], 12, { animate: true });
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
              const isHeadingWest = nextCoords.lng < prevCoords.lng;
              const { iconSize, iconAnchor } = getVehicleDimensions(cinematicVehicleType);

              const travelerIcon = L.divIcon({
                className: 'traveler-icon-container',
                html: getTravelerHtml(cinematicVehicleType, isHeadingWest, true),
                iconSize,
                iconAnchor
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
              const animDuration = 1600 * ((cinematicSpeed || 3600) / 3600); // Equal baseline 1X speed for both walker and vehicles

              // 예전 방식으로 완벽 복원: 지도의 줌 레벨을 일정하게 유지하며 카메라가 이동객체를 부드럽게 연속 추적
              const step = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / animDuration);
                // Smooth Swiss EaseInOutCubic (비단결 같은 가감속 곡선)
                const ease = progress < 0.5 
                  ? 4 * progress * progress * progress 
                  : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                const curLat = prevCoords.lat + (nextCoords.lat - prevCoords.lat) * ease;
                const curLng = prevCoords.lng + (nextCoords.lng - prevCoords.lng) * ease;

                if (travelerMarkerRef.current) {
                  travelerMarkerRef.current.setLatLng([curLat, curLng]);
                }

                // 줌 레벨 변동 없이 부드러운 연속 카메라 중심 트래킹 (60~120fps 완벽 동기화)
                map.panTo([curLat, curLng], { animate: false });

                if (progress < 1) {
                  travelerAnimRef.current = requestAnimationFrame(step);
                } else {
                  // 목적지 도착 완료: 제자리 정지 실루엣으로 전환 및 최종 위치 보정
                  if (travelerMarkerRef.current) {
                    const standingIcon = L.divIcon({
                      className: 'traveler-icon-container',
                      html: getTravelerHtml(cinematicVehicleType, isHeadingWest, false),
                      iconSize,
                      iconAnchor
                    });
                    travelerMarkerRef.current.setIcon(standingIcon);
                    travelerMarkerRef.current.setLatLng([nextCoords.lat, nextCoords.lng]);
                  }
                  map.panTo([nextCoords.lat, nextCoords.lng], { animate: false });
                  travelerAnimRef.current = null;
                }
              };

              travelerAnimRef.current = requestAnimationFrame(step);
            } else {
              map.setView(latLng, Math.max(map.getZoom(), targetZoom), { animate: true });
            }
          } else {
            map.setView(latLng, Math.max(map.getZoom(), targetZoom), { animate: true });

            // 플레이로그 모드 활성화 시 이동 중이 아니더라도 지정된 현재 위치에 마커 등장
            if (isCinematicMode) {
              const L = (window as any).L;
              if (L) {
                const { iconSize, iconAnchor } = getVehicleDimensions(cinematicVehicleType);
                const standingIcon = L.divIcon({
                  className: 'traveler-icon-container',
                  html: getTravelerHtml(cinematicVehicleType, false, false),
                  iconSize,
                  iconAnchor
                });

                if (!travelerMarkerRef.current) {
                  travelerMarkerRef.current = L.marker([latLng.lat, latLng.lng], {
                    icon: standingIcon,
                    zIndexOffset: 250000,
                  }).addTo(map);
                } else {
                  travelerMarkerRef.current.setIcon(standingIcon);
                  travelerMarkerRef.current.setLatLng([latLng.lat, latLng.lng]);
                  travelerMarkerRef.current.setZIndexOffset(250000);
                }
              }
            }
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
            map.setView([Number(fromPoint.lat), Number(fromPoint.lng)], 15, { animate: true });
          } else if (hasTo) {
            map.setView([Number(toPoint.lat), Number(toPoint.lng)], 15, { animate: true });
          }
        }
      }
    }

  }, [mapPoints, expandedItemId, isDarkMode, mapReady, isInteractive, activeTab, transitFocusType, transits, selectedDate, isCinematicMode, hoveredItemId, cinematicSpeed, cinematicVehicleType]); // eslint-disable-line react-hooks/exhaustive-deps

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

      let accentColor = '#DC2626'; // station (Swiss Red)
      let typeLabel = 'METRO';
      let svgIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/></svg>';

      if (poi.type === 'convenience') {
        accentColor = '#2563EB'; // convenience (Royal Blue)
        typeLabel = 'CONV';
        svgIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>';
      } else if (poi.type === 'supermarket') {
        accentColor = '#059669'; // supermarket (Emerald Green)
        typeLabel = 'MART';
        svgIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
      }

      const htmlContent = `
        <div class="poi-pin-wrapper">
          <div class="poi-card" style="border-left: 3.5px solid ${accentColor};">
            <div class="poi-header">
              <span class="poi-type-badge" style="background-color: ${accentColor}; color: #ffffff;">
                ${svgIcon}
                <span>${typeLabel}</span>
              </span>
            </div>
            <div class="poi-name" title="${poi.name || ''}">${poi.name || ''}</div>
          </div>
          <div class="poi-anchor-dot" style="background-color: ${accentColor};"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-poi-pin-icon',
        html: htmlContent,
        iconSize: [140, 52],
        iconAnchor: [70, 52],
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

        // EaseInOutQuad helper for smooth gradual takeoff and landing
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // Calculate arc control point for flights (curved great-circle like route)
        const isFlight = activeTab === 'flights';
        const midLat = (startLat + endLat) / 2;
        const midLng = (startLng + endLng) / 2;
        const perpLat = -(endLng - startLng) * 0.18;
        const perpLng = (endLat - startLat) * 0.18;
        const ctrlLat = midLat + perpLat;
        const ctrlLng = midLng + perpLng;

        const updateVehicleIcon = (rot: number, scaleVal: number = 1) => {
          if (isFlight) {
            return L.divIcon({
              className: 'sleek-flight-plane-marker',
              html: `
                <div class="animated-vehicle-wrapper" style="transform: rotate(${rot}deg) scale(${scaleVal}); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 500000; pointer-events: none; transition: transform 0.04s linear;">
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 44px; height: 44px; filter: drop-shadow(0px 6px 12px rgba(0,0,0,0.55));">
                    <!-- Fuselage & Wings (Clean White with sleek border) -->
                    <path d="M24 2C22.6 2 21.5 3.5 21.5 5.5V17L6 26.5V30.5L21.5 25.5V37.5L16 41.5V44.5L24 42.5L32 44.5V41.5L26.5 37.5V25.5L42 30.5V26.5L26.5 17V5.5C26.5 3.5 25.4 2 24 2Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.3" stroke-linejoin="round" />
                    <!-- Cockpit Windows -->
                    <ellipse cx="24" cy="7.5" rx="1.5" ry="2.6" fill="#1E293B" />
                    <!-- Jet Engines -->
                    <rect x="13.5" y="21.5" width="2.4" height="6.5" rx="1.2" fill="#E2E8F0" stroke="#475569" stroke-width="0.8" />
                    <rect x="32.1" y="21.5" width="2.4" height="6.5" rx="1.2" fill="#E2E8F0" stroke="#475569" stroke-width="0.8" />
                    <!-- Tail Accent Line -->
                    <line x1="24" y1="35" x2="24" y2="42" stroke="#CBD5E1" stroke-width="1" />
                  </svg>
                </div>
              `,
              iconSize: [44, 44],
              iconAnchor: [22, 22]
            });
          }

          return L.divIcon({
            className: 'custom-animated-vehicle-icon',
            html: `
              <div class="animated-vehicle-wrapper" style="transform: rotate(${rot}deg) scale(${scaleVal}); width: ${width}px; height: ${height}px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 500000; pointer-events: none; transition: transform 0.05s linear;">
                <img src="${src}" style="width: ${width}px; height: ${height}px; object-fit: contain; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.45));" />
              </div>
            `,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2]
          });
        };

        const initialIcon = updateVehicleIcon(angle, isFlight ? 0.9 : 1);
        const animMarker = L.marker([startLat, startLng], { 
          icon: initialIcon, 
          zIndexOffset: 500000 // 활성 스팟 마커(100,000) 위로 확실하게 올라오도록 최상위 z-index 부여
        }).addTo(map);
        if (animMarker.bringToFront) animMarker.bringToFront();
        animMarkerRef.current = animMarker;

        const duration = isFlight ? 3200 : 2500; // 3.2s for flight, 2.5s for transit
        let startTime: number | null = null;

        const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const rawProgress = Math.min(1, elapsed / duration);
          const ease = easeInOutQuad(rawProgress);

          let curLat: number;
          let curLng: number;
          let curAngle = angle;
          let curScale = 1;

          if (isFlight) {
            // Quadratic Bezier interpolation for Arc route
            const inv = 1 - ease;
            curLat = inv * inv * startLat + 2 * inv * ease * ctrlLat + ease * ease * endLat;
            curLng = inv * inv * startLng + 2 * inv * ease * ctrlLng + ease * ease * endLng;

            // Instantaneous tangent bearing
            const dLat = 2 * inv * (ctrlLat - startLat) + 2 * ease * (endLat - ctrlLat);
            const dLng = 2 * inv * (ctrlLng - startLng) + 2 * ease * (endLng - ctrlLng);
            curAngle = Math.atan2(dLng, dLat) * 180 / Math.PI;

            // Elevation scale: Takeoff (0.9) -> Cruise (1.15) -> Landing (1.0)
            curScale = 0.9 + Math.sin(ease * Math.PI) * 0.25;
          } else {
            curLat = startLat + (endLat - startLat) * ease;
            curLng = startLng + (endLng - startLng) * ease;
          }

          animMarker.setLatLng([curLat, curLng]);
          animMarker.setIcon(updateVehicleIcon(curAngle, curScale));
          animMarker.setZIndexOffset(500000);

          if (rawProgress < 1) {
            animFrameIdRef.current = requestAnimationFrame(animate);
          } else {
            // 1회 완결: 목적지 착륙/정차 후 종료 (무한 루프 방지)
            animMarker.setLatLng([endLat, endLng]);
            animMarker.setIcon(updateVehicleIcon(curAngle, 1.0));
            animMarker.setZIndexOffset(500000);
            animFrameIdRef.current = null;
          }
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

      {/* ── Nearby POI Toggles Overlay (Stays tab only: Minimal Icon Bar) ── */}
      {isStayTab && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1 bg-[#F9F8F6]/95 dark:bg-[#111111]/95 backdrop-blur-md border border-black/15 dark:border-white/15 p-1 rounded-md shadow-sm transition-all duration-300">
          {isPoiExpanded ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-200">
              {/* 편의점 */}
              <button
                type="button"
                onClick={() => setShowConvenience(!showConvenience)}
                title={`편의점 (${poiItems.filter(p => p.type === 'convenience').length})`}
                className={`relative flex items-center justify-center px-1.5 py-1 rounded transition-all cursor-pointer ${
                  showConvenience
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span className="ml-1 text-[9px] font-mono">
                  {poiItems.filter(p => p.type === 'convenience').length}
                </span>
              </button>

              {/* 슈퍼마켓 */}
              <button
                type="button"
                onClick={() => setShowSupermarket(!showSupermarket)}
                title={`슈퍼마켓 (${poiItems.filter(p => p.type === 'supermarket').length})`}
                className={`relative flex items-center justify-center px-1.5 py-1 rounded transition-all cursor-pointer ${
                  showSupermarket
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="ml-1 text-[9px] font-mono">
                  {poiItems.filter(p => p.type === 'supermarket').length}
                </span>
              </button>

              {/* 역 */}
              <button
                type="button"
                onClick={() => setShowStation(!showStation)}
                title={`지하철/기차역 (${poiItems.filter(p => p.type === 'station').length})`}
                className={`relative flex items-center justify-center px-1.5 py-1 rounded transition-all cursor-pointer ${
                  showStation
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Train className="w-3.5 h-3.5" />
                <span className="ml-1 text-[9px] font-mono">
                  {poiItems.filter(p => p.type === 'station').length}
                </span>
              </button>
            </div>
          ) : null}

          {/* 접기/펼치기 토글 버튼 */}
          <button
            type="button"
            onClick={() => setIsPoiExpanded(!isPoiExpanded)}
            title={isPoiExpanded ? "아이콘 바 접기" : "주변 편의시설 (편의점/슈퍼/역) 보기"}
            className="p-1 rounded text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            {poiLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-red-600 animate-spin" />
            ) : isPoiExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <div className="flex items-center gap-1 px-0.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <Train className="w-3.5 h-3.5 text-purple-600" />
                <ChevronRight className="w-3 h-3 text-black/40 dark:text-white/40 ml-0.5" />
              </div>
            )}
          </button>
        </div>
      )}

      {/* ── Compact Map Tools Controls (Pocket Pins + Hamburger) ── */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1.5 pointer-events-auto select-none">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPocketPins(prev => !prev)}
            className={`h-7 px-2 sm:px-2.5 rounded shadow-sm border transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
              showPocketPins
                ? 'bg-black text-white dark:bg-white dark:text-black border-black/20 dark:border-white/20 shadow-xs'
                : 'bg-[#F9F8F6]/90 dark:bg-[#111111]/90 backdrop-blur-md text-black/50 dark:text-white/50 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white'
            }`}
            title="포켓 스팟 고스트 핀 지도 표시 On/Off"
          >
            <Bookmark className={`w-3 h-3 ${showPocketPins ? 'text-red-500 fill-red-500' : 'text-black/40 dark:text-white/40'}`} />
            <span className="hidden sm:inline">POCKET</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMapMenuOpen(prev => !prev)}
            className={`w-7 h-7 rounded shadow-sm border transition-all cursor-pointer flex items-center justify-center ${
              isMapMenuOpen 
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                : 'bg-[#F9F8F6]/90 dark:bg-[#111111]/90 backdrop-blur-md text-black/70 dark:text-white/70 border-black/15 dark:border-white/15 hover:text-black dark:hover:text-white hover:bg-[#F9F8F6] dark:hover:bg-[#111111]'
            }`}
            title="지도 도구 메뉴"
            aria-label="Toggle map tools menu"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        </div>

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
