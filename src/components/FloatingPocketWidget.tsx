import React, { useState, useMemo } from 'react';
import { 
  Bookmark, Plus, X, ChevronDown, ChevronUp, MapPin, ExternalLink,
  Utensils, Coffee, Camera, ShoppingBag, Lightbulb, Check
} from 'lucide-react';
import { SpotPocketItem, PocketCategory, Trip } from '../types';
import { getSavedPockets, getCardThumbUrl } from '../utils/pocketStorage';
import { findCityByNameOrAlias, findCountryByNameOrAlias } from '../data/worldDestinations';

interface FloatingPocketWidgetProps {
  trip: Trip;
  selectedDate: string;
  allTripDates: string[];
  onAddSpotToTimeline: (spot: SpotPocketItem) => void;
  onSelectSpot?: (spot: SpotPocketItem) => void;
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
  onSelectSpot,
  isOpen,
  onToggle,
  isEditing,
  className,
}: FloatingPocketWidgetProps) {
  const [spots] = useState<SpotPocketItem[]>(() => getSavedPockets());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);

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
        <div className="absolute bottom-12 left-0 mb-1 w-[290px] sm:w-[330px] max-h-[420px] bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-hidden rounded-xl z-50">
          {/* Widget Header */}
          <div className="px-3.5 py-2.5 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark flex items-center justify-between border-b border-black/10">
            <div className="flex items-center gap-1.5 text-xs font-mono font-extrabold tracking-widest uppercase">
              <Bookmark className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>POCKET WIDGET</span>
              <span className="text-meta opacity-60">({displayList.length})</span>
            </div>
            <button
              onClick={onToggle}
              className="tap-target hover:opacity-70 transition-opacity p-0.5 cursor-pointer"
              title="위젯 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Context & Category filter */}
          <div className="p-2.5 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between text-meta font-mono text-black/60 dark:text-white/60 mb-1.5">
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
                    className={`px-2 py-0.5 text-micro font-mono uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-black dark:border-white font-bold'
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
              <div className="py-8 px-4 text-center text-[11px] font-mono text-black/60 dark:text-white/60 leading-relaxed">
                현재 여행지({trip.locationStr || trip.title})에<br />저장된 포켓 스팟이 없습니다
              </div>
            ) : (
              filteredList.map(spot => {
                const IconComponent = CATEGORY_ICONS[spot.category] || Camera;
                const locationText = spot.city || spot.country || spot.address || '';
                const isExpanded = expandedSpotId === spot.id;
                const externalLink = spot.sourceUrl || spot.linkUrl || (spot as any).url;

                return (
                  <div
                    key={spot.id}
                    className={`border transition-all duration-200 overflow-hidden shadow-2xs ${
                      isExpanded
                        ? 'border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.04]'
                        : 'border-black/10 dark:border-white/10 bg-surface dark:bg-surface-dark hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    {/* Header Row: click to toggle accordion & focus map */}
                    <div
                      onClick={() => {
                        onSelectSpot?.(spot);
                        setExpandedSpotId(prev => (prev === spot.id ? null : spot.id));
                      }}
                      className="p-1.5 flex items-center justify-between gap-2 cursor-pointer group"
                      title={isExpanded ? "상세 접기" : "클릭하여 상세 정보 및 지도 보기"}
                    >
                      {/* Thumbnail or Category Icon */}
                      <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center">
                        {spot.thumbnailUrl ? (
                          <img
                            src={getCardThumbUrl(spot)}
                            alt={spot.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconComponent className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                        )}
                      </div>

                      {/* Title + Location + Category in clean Swiss Minimal layout */}
                      <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                        <span className={`text-xs font-bold truncate max-w-[120px] sm:max-w-[140px] transition-colors ${
                          isExpanded ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400'
                        }`}>
                          {spot.title}
                        </span>
                        {locationText && !isExpanded && (
                          <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate hidden sm:inline">
                            · {locationText}
                          </span>
                        )}
                        <span className="text-micro font-mono uppercase font-bold text-black/60 dark:text-white/60 border border-black/15 dark:border-white/15 px-1 py-0.2 shrink-0 ml-auto">
                          {spot.category}
                        </span>
                      </div>

                      {/* Expand indicator & Quick Add button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors p-0.5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddSpotToTimeline(spot);
                          }}
                          disabled={!isEditing}
                          className={`tap-target w-6 h-6 flex items-center justify-center transition-colors shrink-0 ${
                            isEditing
                              ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white cursor-pointer'
                              : 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60 cursor-not-allowed'
                          }`}
                          title={isEditing ? "타임라인에 추가" : "수정 모드에서만 타임라인에 추가할 수 있습니다"}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Accordion Detail Body */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2.5 pt-1 border-t border-black/10 dark:border-white/10 flex flex-col gap-2 animate-in fade-in duration-150">
                        {/* Big preview image if available */}
                        {spot.thumbnailUrl && (
                          <div className="w-full h-24 rounded overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                            <img
                              src={getCardThumbUrl(spot)}
                              alt={spot.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Full Address */}
                        {(spot.address || spot.city) && (
                          <div className="flex items-start gap-1.5 text-[11px] font-mono text-black/70 dark:text-white/70">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <span className="break-all">{spot.address || spot.city}</span>
                          </div>
                        )}

                        {/* Detailed Memo */}
                        {spot.memo && (
                          <div className="p-2 bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-sm">
                            <div className="text-micro font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">
                              MEMO
                            </div>
                            <p className="text-[11px] leading-relaxed text-black/80 dark:text-white/80 whitespace-pre-wrap">
                              {spot.memo}
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        {spot.tags && spot.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {spot.tags.map((t: string, tidx: number) => (
                              <span
                                key={tidx}
                                className="text-micro font-mono font-bold px-1.5 py-0.5 rounded-xs bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer Action Row: External link & Timeline add button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/5 mt-0.5">
                          {externalLink ? (
                            <a
                              href={externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-meta font-mono font-bold text-black/60 dark:text-white/60 hover:text-red-500 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>VIEW SOURCE</span>
                            </a>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddSpotToTimeline(spot);
                            }}
                            disabled={!isEditing}
                            className={`px-2.5 py-1 text-meta font-mono font-bold tracking-wider uppercase flex items-center gap-1 transition-all ${
                              isEditing
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white cursor-pointer shadow-xs'
                                : 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>ADD TO TIMELINE</span>
                          </button>
                        </div>
                      </div>
                    )}
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
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-micro font-mono font-bold flex items-center justify-center shadow-xs">
            {displayList.length > 99 ? '99+' : displayList.length}
          </span>
        )}
      </button>
    </div>
  );
}
