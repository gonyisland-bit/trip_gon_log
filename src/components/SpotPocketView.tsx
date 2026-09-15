import React, { useState, useMemo } from 'react';
import { 
  Bookmark, Plus, ExternalLink, Trash2, MapPin, Search, 
  Check, Sparkles, Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Map
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip, TimelineItem } from '../types';
import { getSavedPockets, savePockets, detectPlatform } from '../utils/pocketStorage';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { ConfirmModal } from './ConfirmModal';

interface SpotPocketViewProps {
  trip: Trip;
  selectedDate: string;
  allTripDates: string[];
  onAddTimelineItem: (item: TimelineItem) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDarkMode: boolean;
}

const CATEGORY_META: Record<PocketCategory, { label: string; icon: React.ElementType; color: string }> = {
  food: { label: 'FOOD', icon: Utensils, color: '#dc2626' },
  cafe: { label: 'CAFE', icon: Coffee, color: '#d97706' },
  spot: { label: 'SPOT', icon: Camera, color: '#2563eb' },
  shopping: { label: 'SHOPPING', icon: ShoppingBag, color: '#7c3aed' },
  tip: { label: 'TIP', icon: Lightbulb, color: '#059669' },
};

export function SpotPocketView({
  trip,
  selectedDate,
  allTripDates,
  onAddTimelineItem,
  isLoggedIn,
  isAdmin,
  isDarkMode
}: SpotPocketViewProps) {
  const [spots, setSpots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'DESTINATION' | 'ALL'>('DESTINATION');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Quick Add Bar State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<PocketCategory>('spot');
  const [quickMemo, setQuickMemo] = useState<string>('');
  const [quickUrl, setQuickUrl] = useState<string>('');
  const [quickLat, setQuickLat] = useState<number | undefined>();
  const [quickLng, setQuickLng] = useState<number | undefined>();
  const [quickAddress, setQuickAddress] = useState<string>('');

  const [spotToDelete, setSpotToDelete] = useState<SpotPocketItem | null>(null);

  // Destination keywords
  const tripCountry = (trip.country || '').trim().toLowerCase();
  const tripLocation = (trip.locationStr || '').trim().toLowerCase();
  const tripTitle = (trip.title || '').trim().toLowerCase();

  // Filter spots relevant to this trip
  const destinationSpots = useMemo(() => {
    return spots.filter(s => {
      // If directly attached to this trip
      if (s.tripId === trip.id) return true;

      // Or match country/city keywords
      const c = (s.country || '').trim().toLowerCase();
      const city = (s.city || '').trim().toLowerCase();
      const title = (s.title || '').trim().toLowerCase();

      if (tripCountry && c && (tripCountry.includes(c) || c.includes(tripCountry))) return true;
      if (tripLocation && city && (tripLocation.includes(city) || city.includes(tripLocation))) return true;
      if (tripLocation && c && (tripLocation.includes(c) || c.includes(tripLocation))) return true;
      if (tripTitle && city && tripTitle.includes(city)) return true;

      return false;
    });
  }, [spots, trip, tripCountry, tripLocation, tripTitle]);

  const displayedSpots = useMemo(() => {
    const baseList = filterMode === 'DESTINATION' ? destinationSpots : spots;
    return baseList.filter(s => {
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m1 = s.title.toLowerCase().includes(q);
        const m2 = (s.memo || '').toLowerCase().includes(q);
        const m3 = (s.city || '').toLowerCase().includes(q) || (s.country || '').toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      return true;
    });
  }, [filterMode, destinationSpots, spots, selectedCategory, searchQuery]);

  // Handle direct timeline addition
  const handleAddToTimeline = (spot: SpotPocketItem) => {
    const targetDate = selectedDate === 'ALL' ? (allTripDates[0] || trip.date?.split('-')[0]?.trim() || '2025.04.12') : selectedDate;
    
    const newItem: TimelineItem = {
      id: Date.now(),
      time: '12:00 PM',
      type: spot.category === 'food' || spot.category === 'cafe' ? 'restaurant' : 'activity',
      place: spot.title,
      cost: '-',
      memo: spot.memo || '',
      lat: spot.lat,
      lng: spot.lng,
      date: targetDate,
      tripId: trip.id,
      link: spot.sourceUrl || ''
    };

    onAddTimelineItem(newItem);
    setActionSuccessToast(`'${spot.title}' 일정이 타임라인(${targetDate})에 추가되었습니다`);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  // Quick create spot
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const platform = detectPlatform(quickUrl);
    const item: SpotPocketItem = {
      id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tripId: trip.id,
      title: quickTitle.trim(),
      category: quickCategory,
      memo: quickMemo.trim(),
      sourceUrl: quickUrl.trim() || undefined,
      platform,
      country: trip.country || undefined,
      city: trip.locationStr || undefined,
      lat: quickLat,
      lng: quickLng,
      address: quickAddress.trim() || undefined,
      createdAt: Date.now()
    };

    const updated = [item, ...spots];
    setSpots(updated);
    await savePockets(updated);

    setQuickTitle('');
    setQuickMemo('');
    setQuickUrl('');
    setQuickLat(undefined);
    setQuickLng(undefined);
    setQuickAddress('');
    setIsQuickAddOpen(false);

    setActionSuccessToast(`'${item.title}' 포켓에 보관 완료`);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  const handleDeleteSpot = async () => {
    if (!spotToDelete) return;
    const updated = spots.filter(s => s.id !== spotToDelete.id);
    setSpots(updated);
    await savePockets(updated);
    setSpotToDelete(null);
  };

  return (
    <div className="w-full flex flex-col p-4 sm:p-6 max-w-6xl mx-auto font-sans">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono tracking-widest uppercase shadow-2xl flex items-center gap-2 border border-black/20 dark:border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/15 dark:border-white/15 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-black/50 dark:text-white/50 mb-1">
            <Bookmark className="w-3 h-3 text-red-500" />
            <span>TRIP POCKET · {trip.locationStr || trip.title}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            SPOT POCKET
          </h2>
          <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-0.5">
            킵해둔 핫플 꿀팁을 클릭 한 번으로 타임라인에 바로 편입하세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Destination vs All Switcher */}
          <div className="flex border border-black/20 dark:border-white/20 p-0.5 bg-black/5 dark:bg-white/5">
            <button
              onClick={() => setFilterMode('DESTINATION')}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                filterMode === 'DESTINATION'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              이 여행지 ({destinationSpots.length})
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              전체 포켓 ({spots.length})
            </button>
          </div>

          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="h-8 px-3.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>KEEP</span>
          </button>
        </div>
      </div>

      {/* Quick Add Inline Drawer */}
      {isQuickAddOpen && (
        <form onSubmit={handleQuickAdd} className="p-4 border border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.02] mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-bold">
              QUICK KEEP SPOT TO THIS TRIP
            </span>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="text-[10px] font-mono text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
            >
              CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <PlaceAutocompleteInput
                value={quickTitle}
                onChange={setQuickTitle}
                onSelectPlace={(placeName, coords, address) => {
                  setQuickTitle(placeName || '');
                  if (coords?.lat) setQuickLat(coords.lat);
                  if (coords?.lng) setQuickLng(coords.lng);
                  if (address) setQuickAddress(address);
                }}
                placeholder="장소명 입력 (구글 자동완성)"
                className="w-full h-8 px-2.5 bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={quickCategory}
                onChange={e => setQuickCategory(e.target.value as PocketCategory)}
                className="w-full h-8 px-2 bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
              >
                <option value="food">FOOD (맛집)</option>
                <option value="cafe">CAFE (카페)</option>
                <option value="spot">SPOT (명소)</option>
                <option value="shopping">SHOPPING (쇼핑)</option>
                <option value="tip">TIP (꿀팁)</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <input
                type="url"
                value={quickUrl}
                onChange={e => setQuickUrl(e.target.value)}
                placeholder="인스타/유튜브 링크 (선택)"
                className="w-full h-8 px-2.5 bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={quickMemo}
              onChange={e => setQuickMemo(e.target.value)}
              placeholder="핵심 꿀팁 / 할인 정보 / 웨이팅 팁 (예: 오후 3시 웨이팅 없음, 크루아상 추천)"
              className="flex-grow h-8 px-2.5 bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="h-8 px-4 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              SAVE
            </button>
          </div>
        </form>
      )}

      {/* Filter Row: Categories & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60'
            }`}
          >
            ALL
          </button>
          {(Object.keys(CATEGORY_META) as PocketCategory[]).map(cat => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60'
                }`}
              >
                <Icon className="w-2.5 h-2.5" style={{ color: isSelected ? undefined : meta.color }} />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="스팟 검색..."
            className="w-full h-7 pl-8 pr-2.5 bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 text-xs font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* Spot Cards Grid */}
      {displayedSpots.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-black/20 dark:border-white/20">
          <Bookmark className="w-7 h-7 text-black/20 dark:text-white/20 mx-auto mb-2" />
          <p className="text-xs font-mono text-black/40 dark:text-white/40 uppercase tracking-widest">
            {filterMode === 'DESTINATION' ? '이 여행지에 일치하는 킵 스팟이 없습니다' : '보관된 스팟이 없습니다'}
          </p>
          {filterMode === 'DESTINATION' && spots.length > 0 && (
            <button
              onClick={() => setFilterMode('ALL')}
              className="mt-2 text-xs font-mono text-red-500 hover:underline uppercase tracking-wider"
            >
              전체 포켓({spots.length}개) 보기 →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSpots.map(spot => {
            const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
            const Icon = meta.icon;
            const locationLabel = [spot.country, spot.city].filter(Boolean).join(' · ');

            return (
              <div
                key={spot.id}
                className="border border-black/15 dark:border-white/15 bg-white dark:bg-[#111111] p-4 flex flex-col justify-between hover:border-black/40 dark:hover:border-white/40 transition-colors shadow-sm"
              >
                <div>
                  {/* Category & Region Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 border border-black/10 dark:border-white/10">
                      <Icon className="w-2.5 h-2.5" style={{ color: meta.color }} />
                      <span>{meta.label}</span>
                    </span>
                    {locationLabel && (
                      <span className="text-[10px] font-mono text-black/40 dark:text-white/40 uppercase truncate max-w-[140px]">
                        {locationLabel}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-black dark:text-white tracking-tight line-clamp-1 mb-1.5">
                    {spot.title}
                  </h3>

                  {/* Memo */}
                  {spot.memo && (
                    <div className="p-2 bg-black/[0.03] dark:bg-white/[0.03] border-l-2 border-red-500 text-[11px] font-mono text-black/80 dark:text-white/80 leading-relaxed line-clamp-3 mb-2">
                      {spot.memo}
                    </div>
                  )}

                  {spot.address && (
                    <p className="text-[10px] text-black/40 dark:text-white/40 font-mono truncate">
                      {spot.address}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAddToTimeline(spot)}
                    className="flex-1 h-7 px-2.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-1 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
                    title={`현재 타임라인(${selectedDate})에 추가`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>ADD TO TIMELINE</span>
                  </button>

                  {spot.sourceUrl && (
                    <a
                      href={spot.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 w-7 flex items-center justify-center border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
                      title="원본 링크"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    onClick={() => setSpotToDelete(spot)}
                    className="h-7 w-7 flex items-center justify-center border border-black/15 dark:border-white/15 text-black/30 dark:text-white/30 hover:text-red-500 hover:border-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(spotToDelete)}
        title="DELETE SPOT"
        message={`'${spotToDelete?.title || ''}' 스팟을 삭제하시겠습니까?`}
        confirmLabel="DELETE"
        cancelLabel="CANCEL"
        onConfirm={handleDeleteSpot}
        onCancel={() => setSpotToDelete(null)}
        confirmVariant="danger"
      />
    </div>
  );
}
