import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bookmark, MapPin, Plus, ExternalLink, Trash2, Edit3, Compass, 
  Search, Check, X, ArrowUpRight, ChevronRight, Layers, Sparkles,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Map
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip, Plan, TimelineItem } from '../types';
import { getSavedPockets, savePockets, detectPlatform } from '../utils/pocketStorage';
import { PlaceAutocompleteInput } from '../components/PlaceAutocompleteInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { PocketScheduleModal } from '../components/PocketScheduleModal';

interface PocketHubPageProps {
  trips: Trip[];
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddTimelineItemToTrip?: (tripId: number, item: TimelineItem) => void;
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

export function PocketHubPage({
  trips,
  plans,
  onNavigate,
  onAddTimelineItemToTrip,
  isLoggedIn,
  isAdmin,
  isDarkMode
}: PocketHubPageProps) {
  const [spots, setSpots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // New Spot Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PocketCategory>('spot');
  const [newMemo, setNewMemo] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string>('');
  const [newCountry, setNewCountry] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newLat, setNewLat] = useState<number | undefined>();
  const [newLng, setNewLng] = useState<number | undefined>();
  const [newAddress, setNewAddress] = useState<string>('');

  // Delete Confirm Modal
  const [spotToDelete, setSpotToDelete] = useState<SpotPocketItem | null>(null);

  // Use in Trip Popover & Schedule Modal
  const [spotToUseInTrip, setSpotToUseInTrip] = useState<SpotPocketItem | null>(null);
  const [scheduleTargetTrip, setScheduleTargetTrip] = useState<Trip | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Load from local/cloud on mount
  useEffect(() => {
    setSpots(getSavedPockets());
  }, []);

  const allAvailableTrips = useMemo(() => {
    return [...trips, ...plans];
  }, [trips, plans]);

  // Unique Region Chips (Country · City)
  const regionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    spots.forEach(s => {
      const country = (s.country || '').trim();
      const city = (s.city || '').trim();
      const key = country && city ? `${country} · ${city}` : (country || city || '기타');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([region, count]) => ({ region, count }));
  }, [spots]);

  // Filtered spots
  const filteredSpots = useMemo(() => {
    return spots.filter(s => {
      // Region filter
      if (selectedRegion !== 'ALL') {
        const country = (s.country || '').trim();
        const city = (s.city || '').trim();
        const key = country && city ? `${country} · ${city}` : (country || city || '기타');
        if (key !== selectedRegion) return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchMemo = (s.memo || '').toLowerCase().includes(q);
        const matchLoc = (s.country || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMemo && !matchLoc) return false;
      }
      return true;
    });
  }, [spots, selectedRegion, selectedCategory, searchQuery]);

  // Create new spot
  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const platform = detectPlatform(newSourceUrl);
    const item: SpotPocketItem = {
      id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: newTitle.trim(),
      category: newCategory,
      memo: newMemo.trim(),
      sourceUrl: newSourceUrl.trim() || undefined,
      platform,
      thumbnailUrl: newThumbnailUrl.trim() || undefined,
      country: newCountry.trim() || undefined,
      city: newCity.trim() || undefined,
      lat: newLat,
      lng: newLng,
      address: newAddress.trim() || undefined,
      createdAt: Date.now()
    };

    const updated = [item, ...spots];
    setSpots(updated);
    await savePockets(updated);

    // Reset form
    setNewTitle('');
    setNewCategory('spot');
    setNewMemo('');
    setNewSourceUrl('');
    setNewThumbnailUrl('');
    setNewCountry('');
    setNewCity('');
    setNewLat(undefined);
    setNewLng(undefined);
    setNewAddress('');
    setIsAddModalOpen(false);

    setActionSuccessToast(`'${item.title}' 포켓에 보관 완료`);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  // Delete spot
  const handleDeleteSpot = async () => {
    if (!spotToDelete) return;
    const updated = spots.filter(s => s.id !== spotToDelete.id);
    setSpots(updated);
    await savePockets(updated);
    setSpotToDelete(null);
  };

  // Helper to reliably extract valid YYYY.MM.DD dates from a trip's date string
  const getTripValidDates = (dateStr?: string): string[] => {
    if (!dateStr) return ['2025.04.12'];
    const cleaned = dateStr.replace(/~/g, '-');
    const parts = cleaned.split('-').map(s => s.trim().replace(/\//g, '.'));
    if (parts.length >= 2) {
      const sMatch = parts[0].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
      const eMatch = parts[1].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
      if (sMatch && eMatch) {
        const sDate = new Date(parseInt(sMatch[1]), parseInt(sMatch[2]) - 1, parseInt(sMatch[3]));
        const eDate = new Date(parseInt(eMatch[1]), parseInt(eMatch[2]) - 1, parseInt(eMatch[3]));
        const list: string[] = [];
        const cur = new Date(sDate);
        while (cur <= eDate && list.length < 30) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          list.push(`${y}.${m}.${d}`);
          cur.setDate(cur.getDate() + 1);
        }
        if (list.length > 0) return list;
      }
    }
    if (parts[0] && parts[0].match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/)) {
      return [parts[0]];
    }
    return ['2025.04.12'];
  };

  // Step 1: When user clicks trip in "USE IN TRIP" list, open the Schedule Picker modal
  const handleSelectTripForSpot = (targetTrip: Trip) => {
    setScheduleTargetTrip(targetTrip);
  };

  // Step 2: Confirm selected date and time slot from modal
  const handleConfirmSchedule = (chosenDate: string, chosenTime: string) => {
    if (!spotToUseInTrip || !scheduleTargetTrip) return;

    const newItem: TimelineItem = {
      id: Date.now(),
      time: chosenTime,
      type: spotToUseInTrip.category === 'food' || spotToUseInTrip.category === 'cafe' ? 'restaurant' : 'activity',
      place: spotToUseInTrip.title,
      cost: '-',
      memo: spotToUseInTrip.memo || '',
      lat: spotToUseInTrip.lat,
      lng: spotToUseInTrip.lng,
      date: chosenDate,
      tripId: scheduleTargetTrip.id,
      link: spotToUseInTrip.sourceUrl || ''
    };

    if (onAddTimelineItemToTrip) {
      onAddTimelineItemToTrip(scheduleTargetTrip.id, newItem);
    } else {
      try {
        const raw = localStorage.getItem('timeline_data') || '{}';
        const parsed = JSON.parse(raw);
        if (!parsed[chosenDate]) parsed[chosenDate] = [];
        parsed[chosenDate].push(newItem);
        localStorage.setItem('timeline_data', JSON.stringify(parsed));
      } catch (_) {}
    }

    setActionSuccessToast(`'${scheduleTargetTrip.title}' 타임라인(${chosenDate} ${chosenTime})에 추가 완료`);
    setTimeout(() => setActionSuccessToast(null), 3500);

    setScheduleTargetTrip(null);
    setSpotToUseInTrip(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-black dark:text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-mono tracking-widest uppercase shadow-2xl flex items-center gap-2 border border-black/20 dark:border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-3.5 h-3.5 text-red-500" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-16 flex-grow flex flex-col">
        {/* Header - Swiss Minimal Typographic Hierarchy */}
        <div className="border-b border-black/15 dark:border-white/15 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-widest uppercase text-black/50 dark:text-white/50 mb-1.5">
              <Bookmark className="w-3.5 h-3.5 text-red-500" />
              <span>SPOT POCKET ARCHIVE · {spots.length} SAVED GEMS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase">
              SPOT POCKET
            </h1>
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 font-mono mt-1">
              SNS 스크랩 & 숨은 핫플 꿀팁을 지역별 갤러리로 보관하고, 여정 작성 시 즉시 꺼내어 활용하세요.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold tracking-widest uppercase flex items-center gap-2 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>KEEP SPOT</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="space-y-4 mb-8">
          {/* 1. Region Chips (Country · City) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            <span className="text-[10px] font-mono tracking-widest text-black/40 dark:text-white/40 uppercase whitespace-nowrap mr-1">
              REGION:
            </span>
            <button
              onClick={() => setSelectedRegion('ALL')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors whitespace-nowrap cursor-pointer ${
                selectedRegion === 'ALL'
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                  : 'border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 text-black/70 dark:text-white/70'
              }`}
            >
              ALL ({spots.length})
            </button>
            {regionOptions.map(({ region, count }) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedRegion === region
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40 text-black/70 dark:text-white/70'
                }`}
              >
                {region} ({count})
              </button>
            ))}
          </div>

          {/* 2. Category Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-black/10 dark:border-white/10">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
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
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                        : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" style={{ color: isSelected ? undefined : meta.color }} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="장소명, 꿀팁, 지역 검색..."
                className="w-full h-8 pl-9 pr-3 bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 text-xs font-mono placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredSpots.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-24 border border-dashed border-black/20 dark:border-white/20 text-center">
            <Bookmark className="w-8 h-8 text-black/20 dark:text-white/20 mb-3" />
            <p className="text-sm font-mono text-black/50 dark:text-white/50 uppercase tracking-widest">
              보관된 스팟이 없습니다
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 mt-1">
              상단의 \'KEEP SPOT\' 버튼을 눌러 인스타, 유튜브 등의 핫플과 꿀팁을 킵해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredSpots.map(spot => {
              const meta = CATEGORY_META[spot.category] || CATEGORY_META.spot;
              const Icon = meta.icon;
              const locationLabel = [spot.country, spot.city].filter(Boolean).join(' · ') || 'LOCATION';

              return (
                <div
                  key={spot.id}
                  className="group flex flex-col border border-black/15 dark:border-white/15 bg-white dark:bg-[#111111] hover:border-black/50 dark:hover:border-white/50 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
                >
                  {/* Card Visual / Thumbnail */}
                  <div className="relative aspect-[16/10] bg-black/5 dark:bg-white/5 overflow-hidden">
                    {spot.thumbnailUrl ? (
                      <img
                        src={spot.thumbnailUrl}
                        alt={spot.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          // fallback on image error
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-black/20 dark:text-white/20">
                        <Icon className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">{meta.label}</span>
                      </div>
                    )}

                    {/* Platform Badge Overlay */}
                    {spot.platform && spot.platform !== 'web' && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/80 backdrop-blur-sm text-white text-[9px] font-mono tracking-widest uppercase border border-white/20">
                        {spot.platform}
                      </div>
                    )}

                    {/* Category Chip Overlay */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-black dark:text-white text-[9px] font-mono tracking-wider uppercase border border-black/10 dark:border-white/10 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span>{meta.label}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      {/* Region Tag */}
                      <div className="flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase text-black/50 dark:text-white/50 mb-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span className="truncate">{locationLabel}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold tracking-tight text-black dark:text-white group-hover:text-red-500 transition-colors line-clamp-1">
                        {spot.title}
                      </h3>

                      {/* Memo / Tip Highlight */}
                      {spot.memo && (
                        <div className="mt-2.5 p-2.5 bg-black/[0.03] dark:bg-white/[0.03] border-l-2 border-red-500 text-xs text-black/80 dark:text-white/80 font-mono leading-relaxed line-clamp-3">
                          {spot.memo}
                        </div>
                      )}

                      {/* Address preview */}
                      {spot.address && (
                        <p className="mt-2 text-[11px] text-black/40 dark:text-white/40 font-mono truncate">
                          {spot.address}
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSpotToUseInTrip(spot)}
                        className="flex-1 h-7 px-2.5 bg-black text-white dark:bg-white dark:text-black text-[10px] font-mono tracking-wider uppercase font-bold flex items-center justify-center gap-1 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors cursor-pointer"
                        title="트립 타임라인에 바로 복사 추가"
                      >
                        <Plus className="w-3 h-3" />
                        <span>USE IN TRIP</span>
                      </button>

                      {spot.sourceUrl && (
                        <a
                          href={spot.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 w-7 flex items-center justify-center border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-colors cursor-pointer"
                          title="원본 SNS 링크 열기"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() => setSpotToDelete(spot)}
                        className="h-7 w-7 flex items-center justify-center border border-black/15 dark:border-white/15 text-black/40 dark:text-white/40 hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                        title="스팟 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── USE IN TRIP SELECTOR POPOVER MODAL ── */}
      {spotToUseInTrip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-black dark:border-white w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">ADD TO TIMELINE</span>
                <h3 className="text-lg font-black uppercase tracking-tight truncate max-w-[280px]">
                  {spotToUseInTrip.title}
                </h3>
              </div>
              <button
                onClick={() => setSpotToUseInTrip(null)}
                className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-black/60 dark:text-white/60 mb-4">
              어느 여정의 타임라인에 이 장소를 추가하시겠습니까?
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border-t border-b border-black/10 dark:border-white/10 py-3">
              {allAvailableTrips.length === 0 ? (
                <p className="text-xs font-mono text-center text-black/40 dark:text-white/40 py-4">
                  등록된 여정이 없습니다.
                </p>
              ) : (
                allAvailableTrips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTripForSpot(trip)}
                    className="w-full text-left p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-black dark:text-white group-hover:text-red-500 transition-colors">
                        {trip.title}
                      </div>
                      <div className="text-[10px] font-mono text-black/40 dark:text-white/40">
                        {trip.date || '일정 미지정'} · {trip.locationStr || '위치 미지정'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSpotToUseInTrip(null)}
                className="h-8 px-4 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE SLOT PICKER MODAL ── */}
      {scheduleTargetTrip && spotToUseInTrip && (
        <PocketScheduleModal
          isOpen={Boolean(scheduleTargetTrip)}
          spot={spotToUseInTrip}
          trip={scheduleTargetTrip}
          availableDates={getTripValidDates(scheduleTargetTrip.date)}
          onClose={() => setScheduleTargetTrip(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}

      {/* ── CREATE NEW SPOT MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-black dark:border-white w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-3 mb-5">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">CURATE SPOT</span>
                <h3 className="text-xl font-black uppercase tracking-tight">KEEP NEW SPOT</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSpot} className="space-y-4">
              {/* Place Name (with Google Autocomplete) */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                  장소명 / 스팟 이름 *
                </label>
                <PlaceAutocompleteInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onSelectPlace={(placeName, coords, address, countryName) => {
                    setNewTitle(placeName || '');
                    if (coords?.lat) setNewLat(coords.lat);
                    if (coords?.lng) setNewLng(coords.lng);
                    if (address) setNewAddress(address);
                    if (countryName) setNewCountry(countryName);
                  }}
                  placeholder="예: 푸글렌 도쿄 시부야점 (구글 장소 자동완성)"
                  className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
                />
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                  카테고리
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(CATEGORY_META) as PocketCategory[]).map(cat => {
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNewCategory(cat)}
                        className={`h-8 text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                            : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Country & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                    국가 (Country)
                  </label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={e => setNewCountry(e.target.value)}
                    placeholder="예: Japan, France"
                    className="w-full h-8 px-3 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                    도시/지역 (City)
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    placeholder="예: Tokyo, Paris"
                    className="w-full h-8 px-3 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Memo & Tips */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                  핵심 꿀팁 / 할인 / 웨이팅 정보
                </label>
                <textarea
                  value={newMemo}
                  onChange={e => setNewMemo(e.target.value)}
                  rows={3}
                  placeholder="예: 3시 이후 웨이팅 없음. 바닐라 라떼 & 크루아상 추천. 인스타 예약 필수."
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Source SNS URL */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                  SNS 원본 링크 (인스타, 유튜브, 블로그, 구글맵)
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full h-8 px-3 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
                />
              </div>

              {/* Thumbnail URL (Optional) */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                  썸네일 이미지 URL (선택)
                </label>
                <input
                  type="url"
                  value={newThumbnailUrl}
                  onChange={e => setNewThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-8 px-3 bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 text-xs font-mono focus:border-black dark:focus:border-white focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-black/15 dark:border-white/15 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-9 px-4 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="h-9 px-5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                >
                  SAVE SPOT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(spotToDelete)}
        title="DELETE SPOT"
        message={`'${spotToDelete?.title || ''}' 스팟을 포켓에서 삭제하시겠습니까?`}
        confirmLabel="DELETE"
        cancelLabel="CANCEL"
        onConfirm={handleDeleteSpot}
        onCancel={() => setSpotToDelete(null)}
        confirmVariant="danger"
      />
    </div>
  );
}
