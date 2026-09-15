import React, { useState, useMemo } from 'react';
import { 
  Bookmark, Plus, X, ChevronDown, ChevronUp, MapPin, ExternalLink,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Check
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip } from '../types';
import { getSavedPockets } from '../utils/pocketStorage';

interface FloatingPocketWidgetProps {
  trip: Trip;
  selectedDate: string;
  allTripDates: string[];
  onAddSpotToTimeline: (spot: SpotPocketItem) => void;
  isOpen: boolean;
  onToggle: () => void;
  isEditing: boolean;
}

const CATEGORY_ICONS: Record<PocketCategory, React.ElementType> = {
  food: Utensils,
  cafe: Coffee,
  spot: Camera,
  shopping: ShoppingBag,
  tip: Lightbulb,
};

export function FloatingPocketWidget({
  trip,
  selectedDate,
  allTripDates,
  onAddSpotToTimeline,
  isOpen,
  onToggle,
  isEditing,
}: FloatingPocketWidgetProps) {
  const [spots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Filter spots matching this trip's country or city
  const tripCountry = (trip.country || '').trim().toLowerCase();
  const tripLocation = (trip.locationStr || '').trim().toLowerCase();
  const tripTitle = (trip.title || '').trim().toLowerCase();

  const relevantSpots = useMemo(() => {
    return spots.filter(s => {
      if (s.tripId === trip.id) return true;
      const c = (s.country || '').trim().toLowerCase();
      const city = (s.city || '').trim().toLowerCase();
      if (tripCountry && c && (tripCountry.includes(c) || c.includes(tripCountry))) return true;
      if (tripLocation && city && (tripLocation.includes(city) || city.includes(tripLocation))) return true;
      if (tripLocation && c && (tripLocation.includes(c) || c.includes(tripLocation))) return true;
      if (tripTitle && city && tripTitle.includes(city)) return true;
      return false;
    });
  }, [spots, trip, tripCountry, tripLocation, tripTitle]);

  // Fallback to all spots if none matched destination
  const displayList = relevantSpots.length > 0 ? relevantSpots : spots;

  const filteredList = useMemo(() => {
    if (selectedCategory === 'ALL') return displayList;
    return displayList.filter(s => s.category === selectedCategory);
  }, [displayList, selectedCategory]);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end font-sans select-none pointer-events-auto">
      {/* Expanded Widget Panel */}
      {isOpen && (
        <div className="mb-2.5 w-[300px] sm:w-[330px] max-h-[440px] bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden">
          {/* Widget Header */}
          <div className="px-3.5 py-2.5 bg-black text-white dark:bg-white dark:text-black flex items-center justify-between border-b border-black/10">
            <div className="flex items-center gap-1.5 text-xs font-mono font-black tracking-widest uppercase">
              <Bookmark className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>POCKET WIDGET</span>
              <span className="text-[10px] opacity-60">({displayList.length})</span>
            </div>
            <button
              onClick={onToggle}
              className="hover:opacity-70 transition-opacity p-0.5 cursor-pointer"
              title="위젯 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Context & Category filter */}
          <div className="p-2.5 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between text-[10px] font-mono text-black/50 dark:text-white/50 mb-1.5">
              <span className="truncate">
                {relevantSpots.length > 0 ? `📍 ${trip.locationStr || trip.title}` : '📍 전체 킵 스팟'}
              </span>
              <span className="font-bold text-red-500">
                타깃: {selectedDate === 'ALL' ? (allTripDates[0] || 'DAY 1') : selectedDate}
              </span>
            </div>

            {/* Mini Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {['ALL', 'food', 'cafe', 'spot'].map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                        : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:text-black'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spots Scrollable List */}
          <div className="flex-grow overflow-y-auto p-2.5 space-y-2 max-h-[300px]">
            {filteredList.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40">
                일치하는 스팟이 없습니다
              </div>
            ) : (
              filteredList.map(spot => {
                return (
                  <div
                    key={spot.id}
                    className="p-2 border border-black/10 dark:border-white/10 bg-white dark:bg-[#181818] hover:border-black/30 dark:hover:border-white/30 transition-colors flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[8.5px] font-mono uppercase font-bold text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10 px-1 py-0.2">
                            {spot.category}
                          </span>
                          <span className="text-xs font-bold text-black dark:text-white truncate">
                            {spot.title}
                          </span>
                        </div>
                        {spot.memo && (
                          <p className="text-[10px] font-mono text-black/70 dark:text-white/70 line-clamp-2 leading-tight bg-black/[0.02] dark:bg-white/[0.02] p-1 border-l border-red-500">
                            {spot.memo}
                          </p>
                        )}
                      </div>

                      {/* + Icon Button (Minimal, disabled when !isEditing) */}
                      <button
                        type="button"
                        onClick={() => onAddSpotToTimeline(spot)}
                        disabled={!isEditing}
                        className={`w-7 h-7 flex items-center justify-center transition-colors shrink-0 ${
                          isEditing
                            ? 'bg-black text-white dark:bg-white dark:text-black hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white cursor-pointer'
                            : 'bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed'
                        }`}
                        title={isEditing ? "타임라인에 추가" : "수정 모드에서만 타임라인에 추가할 수 있습니다"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button (Swiss Minimal Circular Icon Button) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black border border-black/20 dark:border-white/20 shadow-xl hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 relative"
        title="포켓 위젯 열기"
        aria-label="Toggle pocket widget"
      >
        <Bookmark className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
        {displayList.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
            {displayList.length > 99 ? '99+' : displayList.length}
          </span>
        )}
      </button>
    </div>
  );
}
