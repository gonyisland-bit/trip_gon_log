import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, GripVertical, ChevronDown, ChevronUp, Tag, Search, X, LayoutGrid, StretchHorizontal, List, ArrowRight, ArrowUpDown } from 'lucide-react';
import { Trip, Plan } from '../types';
import { JourneyCardMenu, getEnglishCityName } from './Home';
import { getEffectiveImageUrl } from '../utils/storageHelper';
import { cleanAdministrativeDistricts } from '../components/SummaryView';

interface CardMediaProps {
  img: string;
  title: string;
  videoUrl?: string;
  isActive: boolean;
}

function CardMedia({ img, title, videoUrl, isActive }: CardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => localStorage.getItem('playVideoOnActivate') !== 'false');

  useEffect(() => {
    const handleConfigChange = () => {
      setAutoplayEnabled(localStorage.getItem('playVideoOnActivate') !== 'false');
    };
    window.addEventListener('playVideoConfigChanged', handleConfigChange);
    return () => window.removeEventListener('playVideoConfigChanged', handleConfigChange);
  }, []);

  useEffect(() => {
    if (autoplayEnabled && videoUrl && videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card video playback prevented or error:", error);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, videoUrl, autoplayEnabled]);

  return (
    <>
      <img
        src={getEffectiveImageUrl(img)}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
          isActive ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      />
      {videoUrl && autoplayEnabled && isActive && (
        <video
          ref={videoRef}
          src={getEffectiveImageUrl(videoUrl)}
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none scale-105 opacity-100 animate-in fade-in duration-300"
        />
      )}
    </>
  );
}

interface ArchiveHubPageProps {
  trips: Trip[];
  plans?: Plan[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddArchive: () => void;
  isLoggedIn: boolean;
  onDeleteTrip: (id: number) => Promise<void>;
  onEditTrip?: (id: number) => void;
  onCloneTrip?: (id: number) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onMoveToArchive?: (plan: Plan) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  initialTagFilter?: string | null;
}

function parseDateParts(dateStr: string, defaultYear?: number): Date | null {
  if (!dateStr) return null;
  
  const clean = dateStr.trim();
  
  // Match YYYY.MM.DD or YYYY-MM-DD or YYYY/MM/DD
  const match = clean.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  
  // Match YY.MM.DD or YY-MM-DD or YY/MM/DD (2-digit year)
  const match2 = clean.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match2) {
    let year = parseInt(match2[1], 10);
    year += year < 50 ? 2000 : 1900;
    const month = parseInt(match2[2], 10) - 1;
    const day = parseInt(match2[3], 10);
    return new Date(year, month, day);
  }

  // Match MM.DD (no year, e.g. "06.04")
  const matchMD = clean.match(/^(\d{1,2})[-./](\d{1,2})/);
  if (matchMD) {
    const year = defaultYear || new Date().getFullYear();
    const month = parseInt(matchMD[1], 10) - 1;
    const day = parseInt(matchMD[2], 10);
    return new Date(year, month, day);
  }
  
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

function getTripStartDate(dateRangeStr: string): Date {
  if (!dateRangeStr) return new Date(0);
  const parts = dateRangeStr.split(' - ');
  const d = parseDateParts(parts[0].trim());
  return d || new Date(0);
}

function calculateDays(dateRangeStr: string): number {
  if (!dateRangeStr) return 0;
  const parts = dateRangeStr.split(/\s*[-—–]\s*/);
  if (parts.length < 2) return 1;
  const startDate = parseDateParts(parts[0].trim());
  const defaultYear = startDate ? startDate.getFullYear() : undefined;
  const endDate = parseDateParts(parts[1].trim(), defaultYear);
  if (!startDate || !endDate) return 1;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

export function ArchiveHubPage({
  trips,
  plans = [],
  onNavigate,
  onAddArchive,
  isLoggedIn,
  onDeleteTrip,
  onEditTrip,
  onCloneTrip,
  onMoveToPlans,
  onMoveToArchive,
  onReorderTrips,
  initialTagFilter,
}: ArchiveHubPageProps) {
  const [activeFilter, setActiveFilter] = useState(initialTagFilter || 'All');
  const [activeYearFilter, setActiveYearFilter] = useState('All');
  const [activeLocationFilter, setActiveLocationFilter] = useState('All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);

  const combinedTrips = useMemo(() => {
    const list: Trip[] = [...trips];
    if (plans && plans.length > 0) {
      plans.forEach(p => {
        const hasPlanTag = p.tags?.includes('Plan');
        list.push({
          ...p,
          isPlan: true,
          tags: hasPlanTag ? p.tags : [...(p.tags || []), 'Plan'],
        });
      });
    }

    try {
      const saved = localStorage.getItem('journey_order');
      if (saved) {
        const order: number[] = JSON.parse(saved);
        const idMap = new Map(order.map((id, idx) => [id, idx]));
        return list.sort((a, b) => {
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : (a.displayOrder ?? 999999);
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : (b.displayOrder ?? 999999);
          return orderA - orderB;
        });
      }
    } catch (_) {}

    return list.sort((a, b) => (a.displayOrder ?? 999999) - (b.displayOrder ?? 999999));
  }, [trips, plans]);

  const [localTrips, setLocalTrips] = useState<Trip[]>(combinedTrips);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'wide' | 'list'>(() => (localStorage.getItem('cardViewMode') as any) || 'grid');

  const handleSetCardViewMode = (mode: 'grid' | 'wide' | 'list') => {
    setCardViewMode(mode);
    localStorage.setItem('cardViewMode', mode);
  };

  useEffect(() => {
    setLocalTrips(combinedTrips);
  }, [combinedTrips]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    localTrips.forEach(t => {
      const { year } = getYearAndMonth(t.date);
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [localTrips]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    localTrips.forEach(t => {
      if (t.country?.trim()) {
        locs.add(t.country.trim().toUpperCase());
      } else if (t.locationStr) {
        const parts = t.locationStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) locs.add(last);
      }
    });
    return Array.from(locs).sort();
  }, [localTrips]);

  const filters = useMemo(() => {
    const uniqueTags = new Set<string>();
    localTrips.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag) uniqueTags.add(tag);
        });
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [localTrips]);

  const visibleTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return filters;
    const q = tagSearchQuery.trim().toLowerCase();
    return filters.filter(f => f.toLowerCase().includes(q) || f === 'All');
  }, [filters, tagSearchQuery]);

  const sortedTrips = useMemo(() => {
    if (sortBy === 'date') {
      return [...localTrips].sort((a, b) => {
        // Most recent first for archive
        return getTripStartDate(b.date).getTime() - getTripStartDate(a.date).getTime();
      });
    }
    if (sortBy === 'place') {
      return [...localTrips].sort((a, b) => {
        const locA = a.locationStr || '';
        const locB = b.locationStr || '';
        return locA.localeCompare(locB);
      });
    }
    return localTrips;
  }, [localTrips, sortBy]);

  const filteredTrips = useMemo(() => {
    return sortedTrips.filter(t => {
      if (hubSearchQuery.trim()) {
        const q = hubSearchQuery.trim().toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchLoc = (t.locationStr || '').toLowerCase().includes(q);
        const matchCountry = (t.country || '').toLowerCase().includes(q);
        const matchDate = (t.date || '').toLowerCase().includes(q);
        const matchTag = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchLoc && !matchCountry && !matchDate && !matchTag) return false;
      }
      if (activeFilter !== 'All' && (!t.tags || !t.tags.includes(activeFilter))) return false;
      if (activeYearFilter !== 'All') {
        const { year } = getYearAndMonth(t.date);
        if (year !== activeYearFilter) return false;
      }
      if (activeLocationFilter !== 'All') {
        const matchCountry = t.country && t.country.trim().toUpperCase() === activeLocationFilter;
        const matchLoc = t.locationStr && t.locationStr.toUpperCase().includes(activeLocationFilter);
        if (!matchCountry && !matchLoc) return false;
      }
      return true;
    });
  }, [sortedTrips, activeFilter, activeYearFilter, activeLocationFilter, hubSearchQuery]);

  // Collapsed sections for Time (Year) / Place (City) accordion
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  // Grouped trips by Year or City when sortBy is 'date' or 'place'
  const groupedTrips = useMemo(() => {
    if (sortBy === 'user') {
      return [{ key: 'ALL', title: 'ALL JOURNEYS', items: filteredTrips }];
    }

    const groupsMap = new Map<string, Trip[]>();

    filteredTrips.forEach(trip => {
      let groupKey = '';
      if (sortBy === 'date') {
        const { year } = getYearAndMonth(trip.date);
        groupKey = year || 'OTHER';
      } else if (sortBy === 'place') {
        const engCity = getEnglishCityName(trip.locationStr);
        if (engCity) {
          groupKey = engCity;
        } else if (trip.country?.trim()) {
          groupKey = trip.country.trim().toUpperCase();
        } else if (trip.locationStr?.trim()) {
          const parts = trip.locationStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          groupKey = parts[parts.length - 1] || 'OTHER';
        } else {
          groupKey = 'OTHER';
        }
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      groupsMap.get(groupKey)!.push(trip);
    });

    const entries = Array.from(groupsMap.entries()).map(([key, items]) => ({
      key,
      title: key,
      items
    }));

    if (sortBy === 'date') {
      // Sort descending by year
      entries.sort((a, b) => b.key.localeCompare(a.key));
    } else if (sortBy === 'place') {
      // Sort alphabetically by city name
      entries.sort((a, b) => a.key.localeCompare(b.key));
    }

    return entries;
  }, [filteredTrips, sortBy]);

  const handleTripDragStart = (e: React.DragEvent, id: number) => {
    if (sortBy !== 'user') return;
    setDraggedTripId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTripDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (sortBy !== 'user' || draggedTripId === null || draggedTripId === id) return;
    setLocalTrips(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === draggedTripId);
      const toIdx = arr.findIndex(t => t.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const handleTripDrop = () => {
    setDraggedTripId(null);
    if (sortBy === 'user' && onReorderTrips) {
      onReorderTrips(localTrips.map(t => t.id));
    }
  };

  // Compute comprehensive trip summary statistics
  const tripStats = useMemo(() => {
    const list = localTrips;
    const totalTrips = list.length;
    
    // Unique countries
    const countrySet = new Set<string>();
    list.forEach(t => {
      if (t.country) {
        countrySet.add(t.country.trim().toUpperCase());
      }
      if (t.locations && t.locations.length > 0) {
        t.locations.forEach(loc => {
          if (loc.country) countrySet.add(loc.country.trim().toUpperCase());
        });
      }
    });

    // Unique cities / places
    const citySet = new Set<string>();
    list.forEach(t => {
      if (t.locationStr) {
        t.locationStr.split(/[,/·-]/).map(s => s.trim()).filter(Boolean).forEach(c => citySet.add(c.toUpperCase()));
      }
      if (t.locations && t.locations.length > 0) {
        t.locations.forEach(loc => {
          if (loc.name) citySet.add(loc.name.trim().toUpperCase());
        });
      }
    });

    // Total days traveled
    const totalDays = list.reduce((acc, t) => acc + calculateDays(t.date), 0);

    return {
      totalTrips,
      totalCountries: countrySet.size,
      totalCities: citySet.size,
      totalDays
    };
  }, [localTrips]);

  return (
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-500 min-h-screen w-full flex flex-col justify-between">
      <div>
        {/* Minimal Swiss Header (Matching Home's 01 / TRIP style) */}
        <div className="p-6 md:px-12 border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col md:flex-row md:items-end justify-between gap-4 transition-colors">
          {/* Left: Pure Minimal Title */}
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-black text-black/40 dark:text-white/40 tracking-widest uppercase">
              01 / TRIP
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
              TRIP
            </h1>
          </div>
          
          {/* Right: Active Filter, Search, and Controls Layout */}
          <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
              {/* Tag / Multi-Filter Dropdown Button */}
              <div className="relative inline-block text-left">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider border rounded-none transition-all flex items-center gap-1.5 cursor-pointer relative ${
                      activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5 text-black dark:text-white'
                    }`}
                    title="FILTER (TAG, YEAR, LOCATION)"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>FILTER</span>
                    {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    )}
                  </button>

                {/* Separated Search Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchInputOpen(v => !v);
                    if (isSearchInputOpen) setHubSearchQuery('');
                  }}
                  className={`p-2 border transition-colors flex items-center justify-center rounded-none cursor-pointer relative ${
                    isSearchInputOpen || hubSearchQuery
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white'
                  }`}
                  title="여정 검색"
                >
                  <Search className="w-3.5 h-3.5" />
                  {hubSearchQuery && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600" />
                  )}
                </button>

                {/* Inline Search Input */}
                {isSearchInputOpen && (
                  <div className="relative flex items-center animate-in fade-in slide-in-from-left-2 duration-150">
                    <input
                      type="text"
                      autoFocus
                      value={hubSearchQuery}
                      onChange={(e) => setHubSearchQuery(e.target.value)}
                      placeholder="여정 검색..."
                      className="w-28 sm:w-44 pl-2.5 pr-6 py-1.5 text-xs bg-white dark:bg-[#181818] border border-black/20 dark:border-white/20 font-sans font-medium outline-none text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-white/35 rounded-none"
                    />
                    {hubSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setHubSearchQuery('')}
                        className="absolute right-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
                        title="검색어 지우기"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {(activeFilter !== 'All' || activeYearFilter !== 'All' || activeLocationFilter !== 'All' || hubSearchQuery) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hubSearchQuery && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center gap-1">
                        "{hubSearchQuery}"
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setHubSearchQuery('')} />
                      </span>
                    )}
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
                        setHubSearchQuery('');
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

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-black/60 dark:text-white/60 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[10px] sm:text-xs font-black uppercase tracking-widest border border-black/20 dark:border-white/20 px-2.5 py-1.5 focus:outline-none focus:border-black dark:focus:border-white transition-colors cursor-pointer rounded-none font-sans"
                >
                  <option value="user" className="bg-[#F9F8F6] dark:bg-[#111111]">USER</option>
                  <option value="date" className="bg-[#F9F8F6] dark:bg-[#111111]">TIME</option>
                  <option value="place" className="bg-[#F9F8F6] dark:bg-[#111111]">PLACE</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        {isLoggedIn && (
          <button onClick={onAddArchive} className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3.5 h-3.5" /> Add Archive
          </button>
        )}
      </div>
      
      {/* Journeys Container: Flat list/grid for USER, or Accordion Sections for TIME / PLACE */}
      <div className="flex flex-col w-full">
        {groupedTrips.map(group => {
          const isCollapsed = collapsedSections.has(group.key);
          const showGroupHeader = sortBy !== 'user';

          return (
            <div key={group.key} className="flex flex-col w-full">
              {/* Section Header for Time (Year) and Place (City) */}
              {showGroupHeader && (
                <div 
                  onClick={() => toggleSection(group.key)}
                  className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-3.5 sm:py-4 border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors select-none group"
                >
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase font-sans tracking-tight text-black dark:text-white">
                      {group.title}
                    </h2>
                    <span className="font-mono text-xs font-bold text-black/40 dark:text-white/40 tracking-wider">
                      {group.items.length} {group.items.length === 1 ? 'JOURNEY' : 'JOURNEYS'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="p-1 text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}

              {/* Group Body: List or Grid */}
              {!isCollapsed && (
                cardViewMode === 'list' ? (
                  <div className="flex flex-col w-full border-b border-black/15 dark:border-white/15">
                    {group.items.map((trip, index) => {
                      const isCardActive = activeCardId === trip.id;

                      return (
                        <div
                          key={trip.id}
                          onClick={() => onNavigate('detail', trip.id)}
                          className={`group flex flex-row items-stretch border-b border-black/15 dark:border-white/15 last:border-b-0 transition-colors cursor-pointer w-full select-none ${
                            isCardActive 
                              ? 'bg-neutral-100 dark:bg-white/[0.08] border-l-[4px] border-l-red-600 dark:border-l-red-500' 
                              : 'border-l-[4px] border-l-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Thumbnail: 1:1 full-height square edge-to-edge */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 aspect-square self-stretch shrink-0 border-r border-black/15 dark:border-white/15 overflow-hidden rounded-none relative bg-black/10">
                            <img src={getEffectiveImageUrl(trip.img)} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>

                          {/* Meta */}
                          <div className="flex-1 min-w-0 py-2.5 px-3 sm:px-4 md:px-6 flex flex-col justify-center gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-sm sm:text-base md:text-lg text-black dark:text-white uppercase font-satoshi truncate">
                                {trip.title}
                              </h3>
                              {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) ? (
                                <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 font-mono uppercase bg-black text-white dark:bg-white dark:text-black border border-white/40 dark:border-black/40 tracking-wider shadow-xs">
                                  PLAN
                                </span>
                              ) : trip.statusBadge ? (
                                <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-none font-mono uppercase tracking-wider shadow-xs ${
                                  trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                }`}>
                                  {trip.statusBadge}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] sm:text-xs text-black/60 dark:text-white/60 font-mono flex-wrap mt-0.5">
                              <span className="font-bold text-black/80 dark:text-white/80">{trip.date}</span>
                              {trip.locationStr && (
                                <>
                                  <span>·</span>
                                  <span className="text-black/70 dark:text-white/70">{trip.locationStr.replace(/,/g, ' · ')}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right Menu (Unboxed, NO right arrow button) */}
                          <div className="flex items-center pr-2 sm:pr-4 md:pr-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const isPlan = trip.tags?.includes('Plan') || trip.title.includes('(Plan)');
                              return (
                                <JourneyCardMenu
                                  isLoggedIn={isLoggedIn}
                                  onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                                  onDelete={() => onDeleteTrip(trip.id)}
                                  onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                                  onMove={
                                    isPlan
                                      ? (onMoveToArchive ? () => onMoveToArchive(trip as Plan) : undefined)
                                      : (onMoveToPlans ? () => onMoveToPlans(trip) : undefined)
                                  }
                                  moveLabel={isPlan ? "LOG" : "PLAN"}
                                  variant="minimal"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={cardViewMode === 'wide' 
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-4 pt-4 pb-8 md:px-12 md:pt-6 md:pb-12 w-full"
                    : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 px-3 pt-3 pb-8 sm:px-6 sm:pt-4 sm:pb-10 md:px-12 md:pt-6 md:pb-12 w-full"
                  }>
                    {group.items.map((trip, index) => {
                      const { year, month, compactDate } = getYearAndMonth(trip.date);
                      const isCardActive = activeCardId === trip.id;

                      return (
                        <div key={trip.id} className="relative group">
                          {/* Ambient Glow Aura */}
                          <div
                            className={`absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-red-600/30 via-orange-500/20 to-amber-400/25 blur-xl transition-all duration-500 pointer-events-none -z-10 ${
                              isCardActive ? 'opacity-80 scale-105' : 'opacity-0 group-hover:opacity-50 scale-100'
                            }`}
                          />

                          <div
                            style={{ containerType: 'inline-size' }}
                            className={`cursor-pointer ${cardViewMode === 'wide' ? 'aspect-[16/10]' : 'aspect-[3/4]'} w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
                              draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'
                            } ${
                              isCardActive
                                ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                                : 'border-black/10 dark:border-white/10 bg-[#111]'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('detail', trip.id);
                            }}
                            draggable={isLoggedIn && sortBy === 'user'}
                            onDragStart={(e) => handleTripDragStart(e, trip.id)}
                            onDragOver={(e) => handleTripDragOver(e, trip.id)}
                            onDrop={handleTripDrop}
                            onDragEnd={() => setDraggedTripId(null)}
                          >
                            {/* Background cover image/video */}
                            <CardMedia
                              img={trip.img}
                              title={trip.title}
                              videoUrl={trip.videoUrl}
                              isActive={isCardActive}
                            />

                            {/* Magazine Overlay Gradient */}
                            <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

                            {/* Swiss Editorial Poster Text Layout */}
                            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                              {/* Top Header Row: Giant Bold Year & Month / Status Badge */}
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

                                {((trip as any).isPlan || trip.tags?.includes('Plan') || trip.title.includes('(Plan)')) ? (
                                  <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[5.5cqw] sm:text-[6.5cqw] font-black uppercase tracking-wider font-mono shadow-md bg-black text-white dark:bg-white dark:text-black border border-white/40 dark:border-black/40 leading-none">
                                    PLAN
                                  </span>
                                ) : trip.statusBadge ? (
                                  <span className={`px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[5.5cqw] sm:text-[6.5cqw] font-black uppercase tracking-wider font-mono shadow-md leading-none ${
                                    trip.statusBadge === 'NEW' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                  }`}>
                                    {trip.statusBadge}
                                  </span>
                                ) : null}
                              </div>

                              {/* Bottom Footer Row: Title, Location, Date (3-tier clean stack) */}
                              <div className="mt-auto flex flex-col gap-1 w-full max-w-[88%]">
                                <h3 className="text-[5.8cqw] sm:text-[6.2cqw] font-black uppercase tracking-tight leading-tight font-sans text-white drop-shadow-md line-clamp-2">
                                  {trip.title}
                                </h3>
                                {trip.locationStr && (
                                  <div className={cardViewMode === 'wide'
                                    ? "text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                                    : "text-[11px] sm:text-xs md:text-[3.8cqw] font-sans font-black uppercase tracking-wider text-white/95 truncate drop-shadow-sm mt-0.5"
                                  }>
                                    {cleanAdministrativeDistricts(trip.locationStr).replace(/,/g, ' · ')}
                                  </div>
                                )}
                                {trip.date && (
                                  <div className={cardViewMode === 'wide'
                                    ? "text-[11px] sm:text-xs font-sans font-semibold text-white/80 tracking-wider truncate"
                                    : "text-[10px] sm:text-[11px] md:text-[3.4cqw] font-sans font-bold text-white/85 tracking-wider truncate"
                                  }>
                                    {compactDate || trip.date}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Hamburger menu */}
                            {(() => {
                              const isPlan = trip.tags?.includes('Plan') || trip.title.includes('(Plan)');
                              return (
                                <JourneyCardMenu
                                  className="absolute bottom-3 right-3 z-30"
                                  isLoggedIn={isLoggedIn}
                                  onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                                  onDelete={() => onDeleteTrip(trip.id)}
                                  onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                                  onMove={
                                    isPlan
                                      ? (onMoveToArchive ? () => onMoveToArchive(trip as Plan) : undefined)
                                      : (onMoveToPlans ? () => onMoveToPlans(trip) : undefined)
                                  }
                                  moveLabel={isPlan ? "LOG" : "PLAN"}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* ===== Bottom Bold Typography Statistics Banner (Seamlessly attached without white gap) ===== */}
      <footer className="w-full border-t border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03] py-10 sm:py-16 px-6 sm:px-12 md:px-16 mt-0 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 font-['Inter',sans-serif]">
          <span className="text-xs font-black text-black/40 dark:text-white/40 tracking-[0.25em] uppercase">
            TOTAL TRAVEL RECORD
          </span>
          <div 
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[1.05] text-black dark:text-white"
            style={{ wordBreak: 'keep-all' }}
          >
            <span>{tripStats.totalTrips} {tripStats.totalTrips === 1 ? 'TRIP' : 'TRIPS'}</span>
            <span className="text-black/30 dark:text-white/30 mx-2 sm:mx-3">·</span>
            <span>{tripStats.totalCountries} {tripStats.totalCountries === 1 ? 'COUNTRY' : 'COUNTRIES'}</span>
            <span className="text-black/30 dark:text-white/30 mx-2 sm:mx-3">·</span>
            <span>{tripStats.totalCities} {tripStats.totalCities === 1 ? 'CITY' : 'CITIES'}</span>
            <span className="text-black/30 dark:text-white/30 mx-2 sm:mx-3">·</span>
            <span>{tripStats.totalDays} {tripStats.totalDays === 1 ? 'DAY' : 'DAYS'}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
