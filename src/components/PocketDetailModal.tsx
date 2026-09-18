import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, MapPin, Heart, Plus, ExternalLink, Edit3, Trash2, 
  Navigation, Utensils, Coffee, Camera, ShoppingBag, Lightbulb,
  MessageSquare, Send, Check
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, PocketComment, UserProfile } from '../types';

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
  onSaveComments?: (spotId: string, comments: PocketComment[]) => void;
  isLoggedIn?: boolean;
  currentUser?: { uid?: string; displayName?: string | null; email?: string | null } | null;
  currentUserProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
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
  onSaveComments,
  isLoggedIn = false,
  currentUser,
  currentUserProfile,
  onOpenAuthModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [quickCommentText, setQuickCommentText] = useState('');
  const [isCommentsExpanded, setIsCommentsExpanded] = useState<boolean>(true);

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

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
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
            <div className="w-full h-full flex flex-col items-center justify-center text-black/30 dark:text-white/30">
              <Camera className="w-12 h-12 mb-2" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">NO PREVIEW IMAGE</span>
            </div>
          )}

          {/* Top-Left Category Badge */}
          <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/95 dark:bg-black/90 backdrop-blur-md border border-black/10 dark:border-white/15 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm text-black dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
              <span>{meta.label}</span>
            </span>
          </div>

          {/* Platform Tag Overlay (if exists) */}
          {spot.platform && (
            <div className="absolute bottom-3 left-3.5 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-mono tracking-wider uppercase rounded-sm">
              @{spot.platform}
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Title & Region */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-black/50 dark:text-white/50 mb-1">
              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{locationLabel}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-black dark:text-white leading-tight break-words font-sans">
              {spot.title}
            </h2>
          </div>

          {/* Mini Interactive Map with Google Maps Tiles (Leaflet) */}
          {hasCoordinates ? (
            <div className="rounded-2xl overflow-hidden border border-black/15 dark:border-white/15 relative">
              <div 
                ref={mapContainerRef} 
                className="w-full h-44 sm:h-52 bg-black/5 dark:bg-white/5" 
              />
              
              {/* Overlay with Google Maps Navigation Trigger */}
              <div className="absolute bottom-2.5 right-2.5 z-[1000]">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white dark:bg-white/90 dark:hover:bg-white dark:text-black backdrop-blur-md text-[10px] font-mono font-bold tracking-wider uppercase shadow-sm border border-white/20 dark:border-black/20 transition-all cursor-pointer select-none"
                  title="Google Maps 열기"
                >
                  <Navigation className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                  <span>MAPS</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </div>
            </div>
          ) : null}

          {/* Detailed Address Block */}
          <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/10 dark:border-white/10 flex items-start gap-2.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-black/40 dark:text-white/40 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-black/40 dark:text-white/40 block font-bold mb-0.5">
                LOCATION & ADDRESS
              </span>
              <p className="text-black/80 dark:text-white/80 font-mono text-[11.5px] leading-relaxed break-words select-all">
                {spot.address || '주소 정보가 등록되지 않았습니다.'}
              </p>
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

          {/* Comments Section (Accordion Toggle) */}
          <div className="pt-3 border-t border-black/10 dark:border-white/10">
            <div 
              onClick={() => setIsCommentsExpanded(prev => !prev)}
              className="flex items-center justify-between py-1 cursor-pointer select-none group"
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className={`w-3.5 h-3.5 transition-colors ${isCommentsExpanded ? 'text-red-600 dark:text-red-400' : 'text-black/60 dark:text-white/60'}`} />
                <span className="text-[10px] font-mono tracking-widest uppercase text-black/70 dark:text-white/70 font-bold group-hover:text-black dark:group-hover:text-white transition-colors">
                  COMMENTS ({spot.comments?.length || 0})
                </span>
              </div>
              <span className="text-[10px] font-mono text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70">
                {isCommentsExpanded ? '접기 ▲' : '펼치기 ▼'}
              </span>
            </div>

            {isCommentsExpanded && (
              <div className="mt-2 space-y-2.5 animate-in fade-in duration-150">
                {/* Comments List (Only rendered when comments exist) */}
                {spot.comments && spot.comments.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {spot.comments.map((c) => {
                      const canManage = isAdmin || (isLoggedIn && currentUser && (
                        (c.authorId && c.authorId === currentUser.uid) ||
                        (c.authorEmail && currentUser.email && c.authorEmail.toLowerCase() === currentUser.email.toLowerCase())
                      ));

                      return (
                        <div key={c.id} className="p-2 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded group">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-black dark:text-white">{c.authorName}</span>
                              {currentUser?.uid && c.authorId === currentUser.uid && (
                                <span className="px-1 py-0.2 text-[8px] bg-black text-white dark:bg-white dark:text-black font-bold">YOU</span>
                              )}
                              <span className="text-black/40 dark:text-white/40">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {canManage && onSaveComments && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('댓글을 삭제하시겠습니까?')) {
                                    const updated = (spot.comments || []).filter(item => item.id !== c.id);
                                    onSaveComments(spot.id, updated);
                                  }
                                }}
                                className="text-red-500/70 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                                title="댓글 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-black/80 dark:text-white/80 font-sans break-words whitespace-pre-wrap">
                            {c.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Comment Input */}
                {isLoggedIn && onSaveComments ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={quickCommentText}
                      onChange={(e) => setQuickCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!quickCommentText.trim()) return;
                          const authorDisplayName = currentUserProfile?.username || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'USER';
                          const newComment: PocketComment = {
                            id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                            text: quickCommentText.trim(),
                            createdAt: Date.now(),
                            authorId: currentUser?.uid || 'anonymous',
                            authorName: authorDisplayName,
                            authorEmail: currentUser?.email || undefined,
                          };
                          onSaveComments(spot.id, [...(spot.comments || []), newComment]);
                          setQuickCommentText('');
                        }
                      }}
                      placeholder="댓글 입력 후 Enter..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#1a1a1a] border border-black/20 dark:border-white/20 text-black dark:text-white font-sans outline-none rounded focus:border-black dark:focus:border-white"
                    />
                    <button
                      type="button"
                      disabled={!quickCommentText.trim()}
                      onClick={() => {
                        if (!quickCommentText.trim()) return;
                        const authorDisplayName = currentUserProfile?.username || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'USER';
                        const newComment: PocketComment = {
                          id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                          text: quickCommentText.trim(),
                          createdAt: Date.now(),
                          authorId: currentUser?.uid || 'anonymous',
                          authorName: authorDisplayName,
                          authorEmail: currentUser?.email || undefined,
                        };
                        onSaveComments(spot.id, [...(spot.comments || []), newComment]);
                        setQuickCommentText('');
                      }}
                      className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-mono font-bold uppercase rounded cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                ) : !isLoggedIn && onOpenAuthModal ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="w-full py-2 text-center text-xs font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white border border-dashed border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                  >
                    댓글을 작성하려면 로그인하세요 →
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Admin Edit / Delete Actions (Icon only) */}
          {isAdmin && (
            <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-2 text-xs font-mono">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(spot);
                  }}
                  className="p-1.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors cursor-pointer"
                  title="스팟 수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(spot);
                  }}
                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                  title="스팟 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Fixed Action Bar (Guaranteed 1-Row Layout on Mobile) */}
        <div className="p-2.5 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Heart / Likes Button */}
            <button
              type="button"
              onClick={() => onToggleLike(spot.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isLiked
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                  : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:border-black/30 dark:hover:border-white/30'
              }`}
              title="좋아요 관심사 체크"
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} />
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-tight">
                {spot.likes || 0}
              </span>
            </button>

            {/* Comments Accordion Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCommentsExpanded(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isCommentsExpanded
                  ? 'bg-black/10 dark:bg-white/15 border-black/30 dark:border-white/30 text-black dark:text-white shadow-xs'
                  : 'bg-white dark:bg-[#1a1a1a] border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:border-black/30 dark:hover:border-white/30'
              }`}
              title={isCommentsExpanded ? "댓글 접기" : "댓글 펼치기"}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-tight">
                {spot.comments?.length || 0}
              </span>
            </button>
          </div>

          {/* Right Main CTA Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Original Source Link */}
            {spot.sourceUrl && (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white bg-white dark:bg-[#1a1a1a] text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white text-[10.5px] sm:text-[11px] font-mono font-bold tracking-wider uppercase transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                title="출처 원본 게시물 보기"
              >
                <span className="hidden sm:inline">ORIGINAL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* ADD TRIP Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onUseInTrip(spot);
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-mono font-bold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD TRIP</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
