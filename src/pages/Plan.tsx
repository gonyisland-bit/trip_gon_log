import React, { useState, useEffect, useMemo } from 'react';
import { Plus, GripVertical, ChevronDown, ChevronUp, Tag, Search, X, LayoutGrid, StretchHorizontal, List, ArrowRight } from 'lucide-react';
import { Plan } from '../types';
import { JourneyCardMenu } from './Home';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

interface PlanHubPageProps {
  plans: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddPlan: () => void;
  handleMoveToArchive: (plan: Plan) => void;
  isLoggedIn: boolean;
  onDeletePlan: (id: number) => Promise<void>;
  onEditPlan?: (id: number) => void;
  onClonePlan?: (id: number) => void;
  onReorderPlans?: (orderedIds: number[]) => void;
  initialTagFilter?: string | null;
}

function getTripStartDate(dateRangeStr: string): Date {
  if (!dateRangeStr) return new Date(0);
  const parts = dateRangeStr.split(' - ');
  const startStr = parts[0].trim().replace(/\./g, '-');
  const d = new Date(startStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// Helper to extract year, English short month, and compact date for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string; compactDate: string } {
  if (!dateRangeStr) return { year: '', month: '', compactDate: '' };
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());
  const parsePart = (str: string) => {
    const match = str.match(/(\d{4})?[.-]?(\d{1,2})[.-](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return { y, m, d, dateObj: new Date(parseInt(y || '2026', 10), parseInt(m, 10) - 1, parseInt(d, 10)) };
    }
    return null;
  };

  const p1 = parsePart(parts[0]);
  const p2 = parts[1] ? parsePart(parts[1]) : null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const year = p1?.y || (p2?.y ?? '');
  const monthNum = p1 ? p1.dateObj.getMonth() : (p2 ? p2.dateObj.getMonth() : -1);
  const month = monthNum >= 0 ? months[monthNum] : '';

  let compactDate = '';
  if (p1 && p2) {
    const diffDays = Math.max(1, Math.round((p2.dateObj.getTime() - p1.dateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    compactDate = `${p1.m}.${p1.d}-${p2.m}.${p2.d} / ${diffDays}d`;
  } else if (p1) {
    compactDate = `${p1.m}.${p1.d} / 1d`;
  } else {
    compactDate = dateRangeStr;
  }

  return { year, month, compactDate };
}

export function PlanHubPage({
  plans,
  onNavigate,
  onAddPlan,
  handleMoveToArchive,
  isLoggedIn,
  onDeletePlan,
  onEditPlan,
  onClonePlan,
  onReorderPlans,
  initialTagFilter,
}: PlanHubPageProps) {
  const [activeFilter, setActiveFilter] = useState(initialTagFilter || 'All');
  const [activeYearFilter, setActiveYearFilter] = useState('All');
  const [activeLocationFilter, setActiveLocationFilter] = useState('All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedPlanId, setDraggedPlanId] = useState<number | null>(null);
  const [localPlans, setLocalPlans] = useState<Plan[]>(plans);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  const handleSetCardViewMode = (mode: 'grid' | 'wide' | 'list') => {
    setCardViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    localPlans.forEach(p => {
      const { year } = getYearAndMonth(p.date);
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [localPlans]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    localPlans.forEach(p => {
      if (p.country?.trim()) {
        locs.add(p.country.trim().toUpperCase());
      } else if (p.locationStr) {
        const parts = p.locationStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) locs.add(last);
      }
    });
    return Array.from(locs).sort();
  }, [localPlans]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    localPlans.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [localPlans]);

  const visibleTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return filters;
    const q = tagSearchQuery.trim().toLowerCase();
    return filters.filter(f => f.toLowerCase().includes(q) || f === 'All');
  }, [filters, tagSearchQuery]);

  const sortedPlans = useMemo(() => {
    if (sortBy === 'date') {
      return [...localPlans].sort((a, b) => {
        // Chronological: earliest (closest) first for upcoming plans
        return getTripStartDate(a.date).getTime() - getTripStartDate(b.date).getTime();
      });
    }
    if (sortBy === 'place') {
      return [...localPlans].sort((a, b) => {
        const locA = a.locationStr || '';
        const locB = b.locationStr || '';
        return locA.localeCompare(locB);
      });
    }
    return localPlans;
  }, [localPlans, sortBy]);

  const filteredPlans = useMemo(() => {
    return sortedPlans.filter(p => {
      if (activeFilter !== 'All' && (!p.tags || !p.tags.includes(activeFilter))) return false;
      if (activeYearFilter !== 'All') {
        const { year } = getYearAndMonth(p.date);
        if (year !== activeYearFilter) return false;
      }
      if (activeLocationFilter !== 'All') {
        const matchCountry = p.country && p.country.trim().toUpperCase() === activeLocationFilter;
        const matchLoc = p.locationStr && p.locationStr.toUpperCase().includes(activeLocationFilter);
        if (!matchCountry && !matchLoc) return false;
      }
      return true;
    });
  }, [sortedPlans, activeFilter, activeYearFilter, activeLocationFilter]);

  const handlePlanDragStart = (e: React.DragEvent, id: number) => {
    if (sortBy !== 'user') return;
    setDraggedPlanId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePlanDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (sortBy !== 'user' || draggedPlanId === null || draggedPlanId === id) return;
    setLocalPlans(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(p => p.id === draggedPlanId);
      const toIdx = arr.findIndex(p => p.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const handlePlanDrop = () => {
    setDraggedPlanId(null);
    if (sortBy === 'user' && onReorderPlans) {
      onReorderPlans(localPlans.map(p => p.id));
    }
  };

  return (
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-4 sm:p-6 md:px-12 md:py-8 border-b border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1 sm:mb-1.5 break-keep" style={{ wordBreak: 'keep-all' }}>Upcoming Plans</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">비행기 티켓, 숙소 예약, 동선 계획. 다음 여행을 완벽하게 준비하기 위한 캔버스입니다.</p>
          
          {/* Active Filter and Sorting Layout */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            {/* Tag Filter Minimal Icon Button & Multi-Filter Dropdown */}
            <div className="relative inline-block text-left z-20">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className={`p-2 border transition-colors flex items-center justify-center rounded-none cursor-pointer relative ${
                    activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white'
                  }`}
                  title="필터 열기 (태그, 연도, 장소)"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All') && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600" />
                  )}
                </button>

                {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All') && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeFilter !== 'All' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        #{activeFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveFilter('All')} />
                      </span>
                    )}
                    {activeYearFilter !== 'All' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        {activeYearFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveYearFilter('All')} />
                      </span>
                    )}
                    {activeLocationFilter !== 'All' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        {activeLocationFilter}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setActiveLocationFilter('All')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFilter('All');
                        setActiveYearFilter('All');
                        setActiveLocationFilter('All');
                      }}
                      className="text-[9px] px-1.5 py-0.5 uppercase font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>
                )}
              </div>
              
              {isTagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-72 bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 shadow-2xl z-20 rounded-none p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150 text-black dark:text-white">
                    {/* Search Input */}
                    <div className="relative flex items-center">
                      <Search className="w-3 h-3 text-black/40 dark:text-white/40 absolute left-2 pointer-events-none" />
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="태그 검색..."
                        className="w-full pl-7 pr-7 py-1 text-[10px] bg-white dark:bg-[#222222] border border-black/10 dark:border-white/10 rounded-none font-bold outline-none text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                      />
                      {tagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTagSearchQuery('')}
                          className="absolute right-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 1. Year Filter Section */}
                    {availableYears.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">
                          YEAR (연도)
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setActiveYearFilter('All'); }}
                            className={`text-[9px] px-2 py-0.5 uppercase font-bold border transition-colors cursor-pointer ${
                              activeYearFilter === 'All' ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                            }`}
                          >
                            All
                          </button>
                          {availableYears.map(yr => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => { setActiveYearFilter(yr === activeYearFilter ? 'All' : yr); }}
                              className={`text-[9px] px-2 py-0.5 uppercase font-bold border transition-colors cursor-pointer ${
                                activeYearFilter === yr ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                              }`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Location Section */}
                    {availableLocations.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">
                          LOCATION (장소 / 국가)
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setActiveLocationFilter('All'); }}
                            className={`text-[9px] px-2 py-0.5 uppercase font-bold border transition-colors cursor-pointer ${
                              activeLocationFilter === 'All' ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                            }`}
                          >
                            All
                          </button>
                          {availableLocations.map(loc => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => { setActiveLocationFilter(loc === activeLocationFilter ? 'All' : loc); }}
                              className={`text-[9px] px-2 py-0.5 uppercase font-bold border transition-colors cursor-pointer ${
                                activeLocationFilter === loc ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                              }`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Tags Section */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">
                        TAGS (태그)
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-0.5">
                        {visibleTags.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setActiveFilter(f === activeFilter ? 'All' : f);
                            }}
                            className={`text-[9px] px-2 py-0.5 uppercase font-bold border transition-colors cursor-pointer ${
                              activeFilter === f 
                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' 
                                : 'border-black/15 dark:border-white/15 hover:bg-black/5'
                            }`}
                          >
                            {f === 'All' ? '전체 (All)' : `#${f}`}
                          </button>
                        ))}
                        {visibleTags.length === 0 && (
                          <span className="text-[10px] text-black/40 dark:text-white/40 py-1 italic">
                            검색 결과가 없습니다.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* View Mode Switcher: Grid (모바일 2열) / Wide (모바일 1열) / List */}
              <div className="flex items-center border border-black/15 dark:border-white/15 rounded-sm p-0.5 bg-black/5 dark:bg-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('grid')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'grid' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="그리드 보기 (모바일 2열)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('wide')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'wide' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="와이드 보기 (모바일 1열)"
                >
                  <StretchHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCardViewMode('list')}
                  className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
                    cardViewMode === 'list' 
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                      : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
                  }`}
                  title="리스트 보기"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] font-bold uppercase tracking-widest border border-black/20 dark:border-white/20 px-3 py-1.5 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                >
                  <option value="user" className="bg-[#F9F8F6] dark:bg-[#111111]">사용자 순서</option>
                  <option value="date" className="bg-[#F9F8F6] dark:bg-[#111111]">시간별 순서</option>
                  <option value="place" className="bg-[#F9F8F6] dark:bg-[#111111]">장소별 순서</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        {isLoggedIn && (
          <button onClick={onAddPlan} className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3.5 h-3.5" /> New Plan
          </button>
        )}
      </div>
      
      {cardViewMode === 'list' ? (
        <div className="flex flex-col w-full border-t border-black/15 dark:border-white/15">
          {filteredPlans.map((plan, index) => {
            const isCardActive = activeCardId === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => onNavigate('detail', plan.id)}
                className={`group flex flex-row items-stretch border-b border-black/15 dark:border-white/15 transition-colors cursor-pointer w-full select-none ${
                  isCardActive 
                    ? 'bg-neutral-100 dark:bg-white/[0.08] border-l-[4px] border-l-red-600 dark:border-l-red-500' 
                    : 'border-l-[4px] border-l-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Thumbnail: 1:1 full-height square edge-to-edge */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 aspect-square self-stretch shrink-0 border-r border-black/15 dark:border-white/15 overflow-hidden rounded-none relative bg-black/10">
                  <img src={getEffectiveImageUrl(plan.img)} alt={plan.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 py-2.5 px-3 sm:px-4 md:px-6 flex flex-col justify-center gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base md:text-lg text-black dark:text-white uppercase font-satoshi truncate">
                      {plan.title.replace(' (Plan)', '')}
                    </h3>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-600 text-white font-mono uppercase">
                      PLAN
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] sm:text-xs text-black/60 dark:text-white/60 font-mono flex-wrap mt-0.5">
                    <span className="font-bold text-black/80 dark:text-white/80">{plan.date}</span>
                    {plan.locationStr && (
                      <>
                        <span>·</span>
                        <span className="text-black/70 dark:text-white/70">{plan.locationStr.replace(/,/g, ' · ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Menu (Unboxed, NO right arrow button) */}
                <div className="flex items-center pr-2 sm:pr-4 md:pr-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <JourneyCardMenu
                    isLoggedIn={isLoggedIn}
                    onEdit={onEditPlan ? () => onEditPlan(plan.id) : undefined}
                    onDelete={() => onDeletePlan(plan.id)}
                    onClone={onClonePlan ? () => onClonePlan(plan.id) : undefined}
                    onMove={() => handleMoveToArchive(plan)}
                    moveLabel="아카이브로 이동"
                    variant="minimal"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={cardViewMode === 'wide'
          ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-12 w-full"
          : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-6 md:p-12 w-full"
        }>
          {filteredPlans.map((plan) => {
            const { year, month, compactDate } = getYearAndMonth(plan.date);
            return (
              <div
                key={plan.id}
                style={{ containerType: 'inline-size' }}
                className={`group cursor-pointer ${cardViewMode === 'wide' ? 'aspect-[16/10]' : 'aspect-[3/4]'} w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(239,68,68,0.08)] ${
                  draggedPlanId === plan.id ? 'opacity-40' : 'opacity-100'
                } ${
                  activeCardId === plan.id
                    ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                    : 'border-red-600/50 dark:border-red-400/50 bg-[#111]'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeCardId === plan.id) {
                    onNavigate('detail', plan.id);
                  } else {
                    setActiveCardId(plan.id);
                  }
                }}
                draggable={isLoggedIn && sortBy === 'user'}
                onDragStart={(e) => handlePlanDragStart(e, plan.id)}
                onDragOver={(e) => handlePlanDragOver(e, plan.id)}
                onDrop={handlePlanDrop}
                onDragEnd={() => setDraggedPlanId(null)}
              >
                {/* Background cover image */}
                <img
                  src={plan.img}
                  alt={plan.title}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
                    activeCardId === plan.id ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
                  }`}
                />

                {/* Magazine Overlay Gradient */}
                <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                {/* Swiss Editorial Poster Text Layout */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                  {/* Top Header Row: Giant Bold Year & Month / PLAN Badge */}
                  <div className="flex justify-between items-start w-full">
                    {year ? (
                      <div className="flex flex-col leading-none">
                        <span className="text-[10cqw] font-black font-sans tracking-tighter leading-none text-white drop-shadow-md">
                          {year}
                        </span>
                        {month && (
                          <span className="text-[7cqw] font-sans font-black tracking-tight text-white/95 uppercase mt-0.5 leading-none">
                            {month}
                          </span>
                        )}
                      </div>
                    ) : <div />}

                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[2.6cqw] font-black uppercase tracking-widest font-mono shadow-sm">
                      PLAN
                    </span>
                  </div>

                  {/* Bottom Footer Row: Title, Location, Date (3-tier clean stack) */}
                  <div className="mt-auto flex flex-col gap-1 w-full max-w-[88%]">
                    <h3 className="text-[5.8cqw] sm:text-[6.2cqw] font-black uppercase tracking-tight leading-tight font-sans text-white drop-shadow-md line-clamp-2">
                      {plan.title.replace(' (Plan)', '')}
                    </h3>
                    {plan.locationStr && (
                      <div className={cardViewMode === 'wide'
                        ? "text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                        : "text-[11px] sm:text-xs md:text-[3.8cqw] font-sans font-black uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                      }>
                        {cleanAdministrativeDistricts(plan.locationStr).replace(/,/g, ' · ')}
                      </div>
                    )}
                    {plan.date && (
                      <div className={cardViewMode === 'wide'
                        ? "text-[11px] sm:text-xs font-sans font-semibold text-white/80 tracking-wider truncate"
                        : "text-[10px] sm:text-[11px] md:text-[3.4cqw] font-sans font-bold text-white/85 tracking-wider truncate"
                      }>
                        {compactDate || plan.date}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hamburger menu */}
                <JourneyCardMenu
                  className="absolute bottom-3 right-3 z-30"
                  isLoggedIn={isLoggedIn}
                  onEdit={onEditPlan ? () => onEditPlan(plan.id) : undefined}
                  onDelete={() => onDeletePlan(plan.id)}
                  onClone={onClonePlan ? () => onClonePlan(plan.id) : undefined}
                  onMove={() => handleMoveToArchive(plan)}
                  moveLabel="아카이브로 이동"
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
