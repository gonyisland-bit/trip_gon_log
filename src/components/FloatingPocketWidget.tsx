import React, { useState, useMemo } from 'react';
import { 
  Bookmark, Plus, X, ChevronDown, ChevronUp, MapPin, ExternalLink,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Check
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip } from '../types';
import { getSavedPockets } from '../utils/pocketStorage';
import { findCityByNameOrAlias, findCountryByNameOrAlias } from '../data/worldDestinations';

interface FloatingPocketWidgetProps {
  trip: Trip;
  selectedDate: string;
  allTripDates: string[];
  onAddSpotToTimeline: (spot: SpotPocketItem) => void;
  isOpen: boolean;
  onToggle: () => void;
  isEditing: boolean;
  className?: string;
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
  className,
}: FloatingPocketWidgetProps) {
  const [spots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 여정의 대상 도시 및 국가 토큰 정밀 추출
  const { cityTokens, countryTokens } = useMemo(() => {
    const cTokens = new Set<string>();
    const coTokens = new Set<string>();

    const rawLoc = (trip.locationStr || '').trim();
    const rawCountry = (trip.country || '').trim();

    if (rawLoc) {
      rawLoc.split(',').forEach(part => {
        const p = part.trim().toLowerCase();
        if (p) {
          cTokens.add(p);
          const matched = findCityByNameOrAlias(p);
          if (matched) {
            cTokens.add(matched.nameKo.toLowerCase());
            cTokens.add(matched.nameEn.toLowerCase());
          }
        }
      });
    }

    if (trip.locations && trip.locations.length > 0) {
      trip.locations.forEach(loc => {
        if (loc.name) {
          const p = loc.name.trim().toLowerCase();
          cTokens.add(p);
          const matched = findCityByNameOrAlias(p);
          if (matched) {
            cTokens.add(matched.nameKo.toLowerCase());
            cTokens.add(matched.nameEn.toLowerCase());
          }
        }
      });
    }

    if (rawCountry) {
      const co = rawCountry.toLowerCase();
      coTokens.add(co);
      const matched = findCountryByNameOrAlias(co);
      if (matched) {
        coTokens.add(matched.nameKo.toLowerCase());
        coTokens.add(matched.nameEn.toLowerCase());
        coTokens.add(matched.code.toLowerCase());
      }
    }

    return { cityTokens: cTokens, countryTokens: coTokens };
  }, [trip]);

  // 엄격 매칭: 도시가 지정된 경우, 반드시 해당 도시와 일치하는 포켓만 선별 (타 도시 포켓 원천 차단)
  const relevantSpots = useMemo(() => {
    return spots.filter(s => {
      if (s.tripId === trip.id) return true;

      const sCity = (s.city || '').trim().toLowerCase();
      const sCountry = (s.country || '').trim().toLowerCase();
      const sAddr = (s.address || '').trim().toLowerCase();
      const sTitle = (s.title || '').trim().toLowerCase();

      const spotCityObj = findCityByNameOrAlias(s.city || '');
      const spotCountryObj = findCountryByNameOrAlias(s.country || '');

      // 1. 여정에 도시가 지정된 경우: 해당 도시와 일치하는 포켓만 통과
      if (cityTokens.size > 0) {
        if (sCity && cityTokens.has(sCity)) return true;
        if (spotCityObj && (cityTokens.has(spotCityObj.nameEn.toLowerCase()) || cityTokens.has(spotCityObj.nameKo.toLowerCase()))) return true;
        for (const tok of cityTokens) {
          if (tok && (sCity.includes(tok) || sAddr.includes(tok) || sTitle.includes(tok))) return true;
        }
        // 도시가 있는 경우 국가 일치만으로는 타 도시 포켓(예: 도쿄)을 통과시키지 않음!
        return false;
      }

      // 2. 도시 없이 국가만 지정된 경우
      if (countryTokens.size > 0) {
        if (sCountry && countryTokens.has(sCountry)) return true;
        if (spotCountryObj && (countryTokens.has(spotCountryObj.nameEn.toLowerCase()) || countryTokens.has(spotCountryObj.nameKo.toLowerCase()))) return true;
        for (const tok of countryTokens) {
          if (tok && (sCountry.includes(tok) || sAddr.includes(tok) || sTitle.includes(tok))) return true;
        }
      }

      return false;
    });
  }, [spots, trip.id, cityTokens, countryTokens]);

  // 해당 여행지에 매칭된 스팟만 정밀 표시 (타 지역 포켓 억지 노출 배제)
  const displayList = relevantSpots;

  const filteredList = useMemo(() => {
    if (selectedCategory === 'ALL') return displayList;
    return displayList.filter(s => s.category === selectedCategory);
  }, [displayList, selectedCategory]);

  return (
    <div className={className || "fixed bottom-6 left-6 z-40 flex flex-col items-start font-sans select-none pointer-events-auto"}>
      {/* Expanded Widget Panel (Drop-up: positioned right above toggle button, expands rightward) */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 mb-1 w-[290px] sm:w-[330px] max-h-[420px] bg-white dark:bg-[#111111] border border-black/20 dark:border-white/20 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden rounded-xl z-50">
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
              <span className="truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{relevantSpots.length > 0 ? (trip.locationStr || trip.title) : '전체 킵 스팟'}</span>
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
              <div className="py-8 px-4 text-center text-[11px] font-mono text-black/40 dark:text-white/40 leading-relaxed">
                현재 여행지({trip.locationStr || trip.title})에<br />저장된 포켓 스팟이 없습니다
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

      {/* Floating Toggle Button (Swiss Minimal Circular Icon Button in Timeline Bottom-Right) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-10 h-10 rounded-full bg-white/95 text-black dark:bg-[#18181B]/95 dark:text-white border border-black/20 dark:border-white/20 shadow-xl hover:border-black dark:hover:border-white transition-all flex items-center justify-center cursor-pointer active:scale-95 relative backdrop-blur-md"
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
