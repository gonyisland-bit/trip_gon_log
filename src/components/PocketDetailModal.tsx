import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Heart, MapPin, MessageSquare, Navigation, Pencil, Plus, Send, Trash2, Users, ZoomIn } from 'lucide-react';
import { SpotPocketItem, PocketComment, UserProfile } from '../types';
import { confirmDialog } from '../utils/feedback';
import { Sheet, useSheetClose } from './Sheet';
import { IconButton } from './ui/IconButton';
import { ImageViewer } from './ui/ImageViewer';
import { Art } from '../art/Art';
import { CATEGORY_META } from './pocket/categoryMeta';
import { fieldClass, labelClass } from './ui/formStyles';

// A kept spot (v1.3.8): the same rounded sheet as every other panel. The picture on top, the place and its map, the
// address and note, comments, and one bar at the bottom: like, share, the original post, and 여정에 담기.

interface PocketDetailModalProps {
  isOpen: boolean;
  spot: SpotPocketItem | null;
  onClose: () => void;
  onToggleLike: (spotId: string) => void;
  onUseInTrip: (spot: SpotPocketItem) => void;
  onEdit?: (spot: SpotPocketItem) => void;
  onDelete?: (spot: SpotPocketItem) => void;
  /** Share this one spot with friends */
  onShare?: (spot: SpotPocketItem) => void;
  isLiked: boolean;
  isAdmin?: boolean;
  onSaveComments?: (spotId: string, comments: PocketComment[]) => void;
  isLoggedIn?: boolean;
  currentUser?: { uid?: string; displayName?: string | null; email?: string | null } | null;
  currentUserProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export function PocketDetailModal(props: PocketDetailModalProps) {
  const { isOpen, spot, onClose } = props;
  const [viewing, setViewing] = useState(false);
  if (!isOpen || !spot) return null;
  // Keyed by spot: opening another one starts the sheet over
  return (
    <Sheet key={spot.id} label={spot.title} onClose={onClose} tone="paper" locked={viewing} panelClassName="sm:max-w-lg max-h-[92dvh]">
      <Detail {...props} spot={spot} viewing={viewing} setViewing={setViewing} />
    </Sheet>
  );
}

function Detail({
  spot, onToggleLike, onUseInTrip, onEdit, onDelete, onShare, isLiked, isAdmin = false, onSaveComments,
  isLoggedIn = false, currentUser, currentUserProfile, onOpenAuthModal, viewing, setViewing,
}: PocketDetailModalProps & { spot: SpotPocketItem; viewing: boolean; setViewing: (v: boolean) => void }) {
  const close = useSheetClose();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(true);

  const hasCoordinates = typeof spot.lat === 'number' && typeof spot.lng === 'number' && !isNaN(spot.lat) && !isNaN(spot.lng);

  // A small map of the place (Google tiles through Leaflet, as on the journey page)
  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
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
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
        maxNativeZoom: 20,
        maxZoom: 21,
        className: isDark ? 'map-tile-dark' : 'map-tile-light',
      }).addTo(map);
      const icon = L.divIcon({
        className: 'custom-trip-point-pin',
        html: '<div style="display:flex;align-items:center;justify-content:center"><div style="width:22px;height:22px;border-radius:50%;background:#dc2626;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;border-radius:50%;background:#fff"></div></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([spot.lat!, spot.lng!], { icon }).addTo(map);
      leafletMapRef.current = map;
      // The sheet is still sliding in: measure once it has settled
      const timer = window.setTimeout(() => { try { map.invalidateSize(); } catch (_) { /* gone */ } }, 350);
      return () => {
        window.clearTimeout(timer);
        try { map.remove(); } catch (_) { /* gone */ }
        leafletMapRef.current = null;
      };
    } catch (err) {
      console.warn('[PocketDetailModal] Leaflet map init error:', err);
    }
  }, [spot.id, spot.lat, spot.lng, hasCoordinates]);

  const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
  const CategoryIcon = meta.icon;

  // Google Maps search by place name and address
  const mapSearchTarget = (spot.address && spot.title)
    ? `${spot.title} ${spot.address}`
    : (spot.address || spot.title || [spot.city, spot.country].filter(Boolean).join(' '));
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchTarget)}`;
  const locationLabel = [spot.country, spot.city].filter(Boolean).join(' · ');
  const comments = spot.comments || [];
  const hasLink = Boolean(spot.sourceUrl && /^https?:\/\//i.test(spot.sourceUrl));

  const submitComment = () => {
    const text = comment.trim();
    if (!text || !onSaveComments) return;
    onSaveComments(spot.id, [...comments, {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      createdAt: Date.now(),
      authorId: currentUser?.uid || 'anonymous',
      authorName: currentUserProfile?.username || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'USER',
      authorEmail: currentUser?.email || undefined,
    }]);
    setComment('');
  };

  // Another panel opens over this one: this one goes away first
  const act = (fn: () => void) => { close(); fn(); };

  const pill = 'h-10 px-3.5 inline-flex items-center gap-1.5 rounded-full border text-[13px] font-bold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 shrink-0';
  const pillOff = 'bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 flex flex-col gap-4">
        {/* The picture; tap to see it at full size */}
        <div className="relative w-full aspect-[16/10] rounded-card overflow-hidden bg-black/[0.05] dark:bg-white/[0.07] shrink-0">
          {spot.thumbnailUrl ? (
            <button type="button" onClick={() => setViewing(true)} aria-label="사진 크게 보기" className="block w-full h-full cursor-zoom-in">
              <img src={spot.thumbnailUrl} alt={spot.title} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-black/55 dark:text-white/55">
              <Art id="photo-add" className="h-24 w-auto" />
              <span className="text-meta font-bold">등록된 사진이 없어요</span>
            </div>
          )}
          <span className="absolute left-3 top-3 h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface/95 dark:bg-surface-dark/95 text-ink dark:text-ink-dark font-mono text-micro font-bold tracking-wider uppercase pointer-events-none">
            <CategoryIcon className="w-3 h-3" aria-hidden />{meta.label}
          </span>
          {spot.thumbnailUrl && (
            <span className="absolute right-3 top-3 w-8 h-8 rounded-full bg-black/45 text-white grid place-items-center pointer-events-none"><ZoomIn className="w-4 h-4" aria-hidden /></span>
          )}
          {spot.platform && (
            <span className="absolute left-3 bottom-3 h-6 px-2.5 inline-flex items-center rounded-full bg-black/45 text-white font-mono text-micro font-bold tracking-wider uppercase pointer-events-none">@{spot.platform}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {locationLabel && (
            <span className="flex items-center gap-1.5 font-mono text-meta text-black/55 dark:text-white/55">
              <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" aria-hidden />{locationLabel}
            </span>
          )}
          <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-words">{spot.title}</h2>
        </div>

        {hasCoordinates && (
          <div className="relative rounded-card overflow-hidden shrink-0">
            <div ref={mapContainerRef} className="w-full h-44 sm:h-52 bg-black/[0.05] dark:bg-white/[0.07]" />
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2.5 right-2.5 z-[1000] btn btn-sm btn-primary"
              title="Google 지도에서 열기"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden />지도
            </a>
          </div>
        )}

        <div className="rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-1.5">
          <span className={labelClass}>주소</span>
          <p className="text-[14px] leading-relaxed break-words select-all">{spot.address || '주소가 등록되지 않았어요.'}</p>
        </div>

        {spot.memo && (
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>메모</span>
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-black/80 dark:text-white/80">{spot.memo}</p>
          </div>
        )}

        {/* Comments */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCommentsOpen(v => !v)}
            aria-expanded={commentsOpen}
            className="flex items-center justify-between gap-2 min-h-9 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-full"
          >
            <span className={`${labelClass} inline-flex items-center gap-1.5`}><MessageSquare className="w-3.5 h-3.5" aria-hidden />댓글 · {comments.length}</span>
            <ChevronDown className={`w-4 h-4 text-black/55 dark:text-white/55 transition-transform duration-base ${commentsOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {commentsOpen && (
            <>
              {comments.length > 0 && (
                <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto overscroll-contain">
                  {comments.map((c) => {
                    const mine = Boolean(currentUser?.uid && c.authorId === currentUser.uid);
                    const canManage = isAdmin || (isLoggedIn && currentUser && (
                      mine || (c.authorEmail && currentUser.email && c.authorEmail.toLowerCase() === currentUser.email.toLowerCase())
                    ));
                    return (
                      <li key={c.id} className="rounded-card bg-surface dark:bg-surface-dark px-4 py-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 min-h-6">
                          <span className="flex items-center gap-2 min-w-0 text-meta">
                            <b className="truncate">{c.authorName}</b>
                            {mine && <span className="h-4 px-1.5 inline-flex items-center rounded-full bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark font-mono text-micro font-bold">YOU</span>}
                            <span className="font-mono text-black/55 dark:text-white/55 shrink-0">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </span>
                          {canManage && onSaveComments && (
                            <IconButton
                              icon={Trash2}
                              label="댓글 삭제"
                              size="sm"
                              className="-mr-2 border-0 bg-transparent dark:bg-transparent text-black/45 dark:text-white/45 hover:text-red-600"
                              onClick={async () => {
                                if (await confirmDialog('댓글을 삭제할까요?')) onSaveComments(spot.id, comments.filter(item => item.id !== c.id));
                              }}
                            />
                          )}
                        </div>
                        <p className="text-[14px] break-words whitespace-pre-wrap text-black/80 dark:text-white/80">{c.text}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {isLoggedIn && onSaveComments ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="pocket-comment"
                    aria-label="댓글"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submitComment(); } }}
                    placeholder="댓글을 남겨 보세요"
                    className={fieldClass}
                  />
                  <IconButton icon={Send} label="댓글 올리기" tone="ink" onClick={submitComment} disabled={!comment.trim()} />
                </div>
              ) : !isLoggedIn && onOpenAuthModal ? (
                <button type="button" onClick={() => act(onOpenAuthModal)} className="btn btn-secondary w-full">댓글을 쓰려면 로그인하세요</button>
              ) : null}
            </>
          )}
        </div>

        {isAdmin && (onEdit || onDelete) && (
          <div className="flex items-center justify-end gap-2">
            {onEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => act(() => onEdit(spot))}><Pencil className="w-3.5 h-3.5" aria-hidden />수정</button>}
            {onDelete && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => act(() => onDelete(spot))}><Trash2 className="w-3.5 h-3.5" aria-hidden />삭제</button>}
          </div>
        )}
      </div>

      {/* One bar: like, share, the original post, and putting the spot in a journey */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => onToggleLike(spot.id)}
          aria-pressed={isLiked}
          aria-label="좋아요"
          className={`${pill} ${isLiked ? 'bg-red-600/10 border-red-600/30 text-red-600 dark:text-red-400' : pillOff}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} aria-hidden />
          <span className="font-mono tabular-nums">{spot.likes || 0}</span>
        </button>
        {onShare && (
          <button
            type="button"
            onClick={() => onShare(spot)}
            aria-label="친구에게 이 장소 공유"
            title="친구에게 이 장소 공유"
            className={`${pill} ${spot.sharedWith?.length ? 'bg-lilac text-lilac-ink border-transparent dark:bg-lilac-dark dark:text-lilac' : pillOff}`}
          >
            <Users className="w-4 h-4" aria-hidden />
            {!!spot.sharedWith?.length && <span className="font-mono tabular-nums">{spot.sharedWith.length}</span>}
          </button>
        )}
        {hasLink && (
          <a href={spot.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="원문 보기" title="원문 보기" className={`${pill} ${pillOff}`}>
            <ExternalLink className="w-4 h-4" aria-hidden />
          </a>
        )}
        <button type="button" onClick={() => act(() => onUseInTrip(spot))} className="btn btn-primary flex-1 min-w-0">
          <Plus className="w-4 h-4 shrink-0" aria-hidden /><span className="truncate">여정에 담기</span>
        </button>
      </div>

      {viewing && spot.thumbnailUrl && <ImageViewer src={spot.thumbnailUrl} alt={spot.title} onClose={() => setViewing(false)} />}
    </>
  );
}
