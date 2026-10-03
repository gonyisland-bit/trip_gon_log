import { useState } from 'react';
import { Coffee, Landmark, List, Loader2, Navigation, Pill, RotateCw, ShoppingBasket, Star, Store, TrainFront, Utensils, X, BookmarkPlus, type LucideIcon } from 'lucide-react';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { QUICK_SPOTS, QUICK_SPOT_META, directionsUrl, formatDistance, type QuickSpot, type QuickSpotKind } from '../../utils/quickSpots';
import { getSavedPockets, savePockets } from '../../utils/pocketStorage';
import { notify } from '../../utils/feedback';
import type { QuickSpotsState } from './useQuickSpots';

// Quick spot controls (v1.3.8), shared by the place map and the stay map: a row of chips, the "search here" pill,
// the card of the picked spot and the list of what was found. Kinds are told apart by icon and name, not colour.

export const QUICK_SPOT_ICON: Record<QuickSpotKind, LucideIcon> = {
  convenience: Store, supermarket: ShoppingBasket, station: TrainFront, pharmacy: Pill,
  restaurant: Utensils, cafe: Coffee, attraction: Landmark,
};

/** The chips: one per kind, the count once searched, a spinner while searching */
export function QuickSpotBar({ s, onOpenList, size = 'sm', className = '' }: { s: QuickSpotsState; onOpenList?: () => void; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto hide-scrollbar ${className}`} role="group" aria-label="퀵스팟">
      {QUICK_SPOTS.map(({ kind, label }) => {
        const on = s.kinds.includes(kind);
        const busy = s.loading.includes(kind);
        return (
          <Chip
            key={kind}
            size={size}
            selected={on}
            icon={busy ? Loader2 : QUICK_SPOT_ICON[kind]}
            count={on && !busy ? s.counts[kind] : undefined}
            onClick={() => s.toggle(kind)}
            className={`${on ? 'shadow-sm' : 'bg-surface/95 dark:bg-surface-dark/95'} ${busy ? '[&>svg]:animate-spin' : ''}`}
          >
            {label}
          </Chip>
        );
      })}
      {onOpenList && s.kinds.length > 0 && (
        <IconButton icon={List} label="찾은 곳 목록" size="sm" onClick={onOpenList} className="shadow-sm" />
      )}
    </div>
  );
}

/** Floating over the map's top: offered after the map moved away from the last search, or when it is zoomed too far out */
export function QuickSpotSearchHere({ s, className = '' }: { s: QuickSpotsState; className?: string }) {
  if (!s.kinds.length || (!s.movedAway && !s.tooWide)) return null;
  if (s.tooWide) {
    return (
      <div className={`tgl-rise h-9 px-4 inline-flex items-center rounded-full bg-surface/95 dark:bg-surface-dark/95 shadow-lg text-meta font-bold text-black/65 dark:text-white/65 ${className}`}>
        더 확대하면 주변을 찾을 수 있어요
      </div>
    );
  }
  return (
    <button type="button" onClick={s.searchHere} className={`tgl-rise btn btn-primary btn-sm shadow-lg ${className}`}>
      <RotateCw className="w-3.5 h-3.5" aria-hidden />
      이 지역에서 다시 찾기
    </button>
  );
}

async function keepInPocket(spot: QuickSpot, tripId?: number | null) {
  const all = getSavedPockets();
  const same = all.find(p => p.title === spot.name && typeof p.lat === 'number' && typeof p.lng === 'number'
    && Math.abs(p.lat - spot.lat) < 0.0005 && Math.abs((p.lng as number) - spot.lng) < 0.0005);
  if (same) { notify('이미 포켓에 있어요.'); return; }
  const item = {
    id: `qs-${spot.id}`,
    tripId: tripId ?? null,
    title: spot.name,
    category: QUICK_SPOT_META[spot.kind].pocket,
    lat: spot.lat,
    lng: spot.lng,
    address: spot.address,
    platform: 'maps' as const,
    linkUrl: `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}&query_place_id=${encodeURIComponent(spot.id)}`,
    tags: [QUICK_SPOT_META[spot.kind].label],
    createdAt: Date.now(),
  };
  await savePockets([item, ...all]);
  notify('포켓에 담았어요.', 'success');
}

/** The picked spot: what it is, how far, whether it is open; directions and keeping it in the pocket */
export function QuickSpotCard({ spot, onClose, tripId, className = '' }: { spot: QuickSpot; onClose: () => void; tripId?: number | null; className?: string }) {
  const Icon = QUICK_SPOT_ICON[spot.kind];
  const [saving, setSaving] = useState(false);
  return (
    <div className={`tgl-rise w-full rounded-card bg-surface dark:bg-surface-dark shadow-[0_10px_30px_rgba(0,0,0,0.18)] p-4 flex flex-col gap-3 ${className}`} role="dialog" aria-label={spot.name}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-black/[0.06] dark:bg-white/10 grid place-items-center shrink-0">
          <Icon className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-micro font-bold uppercase tracking-widest text-black/55 dark:text-white/55 flex items-center gap-1.5 flex-wrap">
            <span>{QUICK_SPOT_META[spot.kind].label}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatDistance(spot.distance)}</span>
            {spot.openNow !== undefined && (
              <>
                <span aria-hidden>·</span>
                <span className={spot.openNow ? 'text-emerald-700 dark:text-emerald-400' : ''}>{spot.openNow ? '영업 중' : '영업 종료'}</span>
              </>
            )}
          </div>
          <h3 className="text-[15px] font-extrabold leading-snug mt-0.5 line-clamp-2">{spot.name}</h3>
          {(spot.rating !== undefined || spot.address) && (
            <p className="text-meta text-black/60 dark:text-white/60 mt-0.5 flex items-center gap-1 min-w-0">
              {spot.rating !== undefined && (
                <span className="inline-flex items-center gap-0.5 shrink-0 font-bold text-ink dark:text-ink-dark tabular-nums">
                  <Star className="w-3 h-3" aria-hidden />{spot.rating.toFixed(1)}
                  {spot.ratingCount ? <span className="font-medium text-black/50 dark:text-white/50">({spot.ratingCount})</span> : null}
                </span>
              )}
              {spot.address && <span className="truncate">{spot.address}</span>}
            </p>
          )}
        </div>
        <IconButton icon={X} label="닫기" size="sm" onClick={onClose} className="!border-0 -mr-1 -mt-1" />
      </div>
      <div className="flex gap-2">
        <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm flex-1">
          <Navigation className="w-3.5 h-3.5" aria-hidden />
          길찾기
        </a>
        <button
          type="button"
          disabled={saving}
          onClick={async () => { setSaving(true); try { await keepInPocket(spot, tripId); } finally { setSaving(false); } }}
          className="btn btn-secondary btn-sm flex-1"
        >
          <BookmarkPlus className="w-3.5 h-3.5" aria-hidden />
          포켓에 담기
        </button>
      </div>
    </div>
  );
}

/** Everything found for the kinds that are on, nearest first */
export function QuickSpotList({ s, onPick, onClose }: { s: QuickSpotsState; onPick: (spot: QuickSpot) => void; onClose: () => void }) {
  return (
    <div className="tgl-rise w-full max-h-[50vh] rounded-card bg-surface dark:bg-surface-dark shadow-[0_10px_30px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden" role="dialog" aria-label="찾은 곳">
      <div className="flex items-center justify-between pl-4 pr-2 h-12 shrink-0">
        <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60">Nearby · {s.list.length}</span>
        <IconButton icon={X} label="닫기" size="sm" onClick={onClose} className="!border-0" />
      </div>
      {s.list.length === 0 ? (
        <p className="px-4 pb-5 text-[13px] text-black/60 dark:text-white/60">{s.loading.length ? '찾는 중이에요.' : '주변에서 찾지 못했어요.'}</p>
      ) : (
        <ul className="overflow-y-auto overscroll-contain pb-2">
          {s.list.map(spot => {
            const Icon = QUICK_SPOT_ICON[spot.kind];
            return (
              <li key={`${spot.kind}-${spot.id}`}>
                <button type="button" onClick={() => onPick(spot)} className="w-full flex items-center gap-3 px-4 h-14 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                  <Icon className="w-4 h-4 shrink-0 text-black/70 dark:text-white/70" aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-bold truncate">{spot.name}</span>
                    <span className="block text-micro font-mono uppercase tracking-wider text-black/55 dark:text-white/55">
                      {QUICK_SPOT_META[spot.kind].label}{spot.openNow === false ? ' · 영업 종료' : ''}
                    </span>
                  </span>
                  <span className="font-mono text-meta font-bold tabular-nums text-black/70 dark:text-white/70">{formatDistance(spot.distance)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
