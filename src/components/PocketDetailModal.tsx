import React, { useEffect, useRef } from 'react';
import { 
  X, MapPin, Heart, Plus, ExternalLink, Edit3, Trash2, 
  Navigation, Utensils, Coffee, Camera, ShoppingBag, Lightbulb
} from 'lucide-react';
import { SpotPocketItem, PocketCategory } from '../types';

interface PocketDetailModalProps {
  isOpen: boolean;
  spot: SpotPocketItem | null;
  onClose: () => void;
  onToggleLike: (spotId: string) => void;
  onUseInTrip: (spot: SpotPocketItem) => void;
  onEdit?: (spot: SpotPocketItem) => void;
  onDelete?: (spot: SpotPocketItem) => void;
  isLiked: boolean;
  isAdmin?: boolean;
}

const CATEGORY_META: Record<PocketCategory, { label: string; icon: React.ElementType; color: string }> = {
  food: { label: 'FOOD', icon: Utensils, color: '#dc2626' },
  cafe: { label: 'CAFE', icon: Coffee, color: '#d97706' },
  spot: { label: 'SPOT', icon: Camera, color: '#2563eb' },
  shopping: { label: 'SHOPPING', icon: ShoppingBag, color: '#7c3aed' },
  tip: { label: 'TIP', icon: Lightbulb, color: '#059669' },
};

export const PocketDetailModal: React.FC<PocketDetailModalProps> = ({
  isOpen,
  spot,
  onClose,
  onToggleLike,
  onUseInTrip,
  onEdit,
  onDelete,
  isLiked,
  isAdmin = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const hasCoordinates = typeof spot?.lat === 'number' && typeof spot?.lng === 'number' && !isNaN(spot.lat) && !isNaN(spot.lng);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize Google Maps Tiles via Leaflet (Identical to Trip Detail MapArea)
  useEffect(() => {
    if (!isOpen || !spot || !hasCoordinates || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (leafletMapRef.current) {
      try { leafletMapRef.current.remove(); } catch (_) {}
      leafletMapRef.current = null;
    }

    try {
      const isDark = document.documentElement.classList.contains('dark');
      const map = L.map(mapContainerRef.current, {
        center: [spot.lat!, spot.lng!],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      const tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko';
      L.tileLayer(tileUrl, {
        maxNativeZoom: 20,
        maxZoom: 21,
        className: isDark ? 'map-tile-dark' : 'map-tile-light',
      }).addTo(map);

      // Swiss Minimal Red Point Pin (Same as Trip Detail)
      const pinHtml = `
        <div style="display: flex; align-items: center; justify-content: center;">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'custom-trip-point-pin',
        html: pinHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([spot.lat!, spot.lng!], { icon }).addTo(map);
      leafletMapRef.current = map;

      const timer = setTimeout(() => {
        try { map.invalidateSize(); } catch (_) {}
      }, 250);

      return () => {
        clearTimeout(timer);
        if (leafletMapRef.current) {
          try { leafletMapRef.current.remove(); } catch (_) {}
          leafletMapRef.current = null;
        }
      };
    } catch (err) {
      console.warn('[PocketDetailModal] Leaflet map init error:', err);
    }
  }, [isOpen, spot?.id, spot?.lat, spot?.lng, hasCoordinates]);

  if (!isOpen || !spot) return null;

  const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
  const CategoryIcon = meta.icon;
  
  // Google Maps Search URL (장소명 및 주소 기반 검색으로 통일)
  const mapSearchTarget = (spot.address && spot.title)
    ? `${spot.title} ${spot.address}`
    : (spot.address || spot.title || [spot.city, spot.country].filter(Boolean).join(' '));
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchTarget)}`;

  // Location display
  const locationLabel = [spot.country, spot.city].filter(Boolean).join(' · ');

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#1A1A1C] rounded-3xl overflow-hidden border border-black/15 dark:border-white/20 shadow-2xl animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/60 dark:bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-black dark:hover:bg-white dark:hover:text-black transition-all cursor-pointer shadow-md"
          title="닫기 (ESC)"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Top Media Frame (16:10 aspect ratio) */}
        <div className="relative w-full aspect-[16/10] bg-black/5 dark:bg-white/5 overflow-hidden shrink-0 border-b border-black/10 dark:border-white/10">
          {spot.thumbnailUrl ? (
            <img 
              src={spot.thumbnailUrl} 
              alt={spot.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-black/25 dark:text-white/25">
              <CategoryIcon className="w-12 h-12 mb-2" />
              <span className="text-xs font-mono tracking-widest uppercase font-bold">{meta.label}</span>
            </div>
          )}

          {/* Category Chip Overlay */}
          <div className="absolute top-3.5 left-3.5 px-2.5 py-1 bg-white/95 dark:bg-black/90 backdrop-blur-md text-black dark:text-white text-[9.5px] sm:text-[10px] font-mono font-bold tracking-wider uppercase border border-black/10 dark:border-white/10 rounded-full flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
          </div>

          {/* Platform Tag Overlay (if exists) */}
          {spot.platform && (
            <div className="absolute bottom-3 left-3.5 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-mono tracking-wider uppercase rounded-sm">
              @{spot.platform}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-black dark:text-white">
          {/* Main Title & Region */}
          <div>
            {locationLabel && (
              <div className="flex items-center gap-1.5 text-[10.5px] sm:text-xs font-mono tracking-wider uppercase text-black/50 dark:text-white/50 mb-1.5">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span>{locationLabel}</span>
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-sans text-black dark:text-white leading-snug break-keep">
              {spot.title}
            </h2>
          </div>

          {/* Mini Map Preview Section (Google Maps Tiles via Leaflet) */}
          <div className="rounded-2xl border border-black/10 dark:border-white/15 overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
            {hasCoordinates ? (
              <div className="relative w-full h-44 sm:h-48 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute inset-0 pointer-events-none" />
              </div>
            ) : null}

            {/* Address & Google Maps Navigation Button */}
            <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white dark:bg-[#202022]">
              <div className="flex items-start gap-1.5 min-w-0">
                <Navigation className="w-3.5 h-3.5 text-black/40 dark:text-white/40 shrink-0 mt-0.5" />
                <p className="text-[11px] sm:text-xs font-sans text-black/70 dark:text-white/70 leading-relaxed break-keep line-clamp-2">
                  {spot.address || '주소 정보 없음'}
                </p>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase rounded-lg transition-colors cursor-pointer"
              >
                <span>GOOGLE MAPS</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Full Story / Notes (No truncation) */}
          {spot.memo && (
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-black/40 dark:text-white/40 font-bold block mb-1.5">
                TRAVEL NOTE / MEMO
              </span>
              <p className="text-xs sm:text-[13px] font-sans text-black/85 dark:text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                {spot.memo}
              </p>
            </div>
          )}

          {/* Admin Edit / Delete Actions */}
          {isAdmin && (
            <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2 text-xs font-mono">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(spot);
                  }}
                  className="px-2.5 py-1.5 flex items-center gap-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>수정</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(spot);
                  }}
                  className="px-2.5 py-1.5 flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Fixed Action Bar */}
        <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          {/* Heart / Likes Button */}
          <button
            type="button"
            onClick={() => onToggleLike(spot.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
              isLiked
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:border-black/30 dark:hover:border-white/30'
            }`}
            title="좋아요 관심사 체크"
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
            <span className="text-xs font-mono font-bold tracking-tight">
              {spot.likes || 0}
            </span>
          </button>

          {/* Right Main CTA Buttons */}
          <div className="flex items-center gap-2">
            {/* Original Source Link */}
            {spot.sourceUrl && (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white bg-white dark:bg-[#1a1a1a] text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white text-[11px] font-mono font-bold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                title="출처 원본 게시물 보기"
              >
                <span>ORIGINAL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* USE IN TRIP Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onUseInTrip(spot);
              }}
              className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-mono font-bold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>USE IN TRIP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
