import React, { useState, useEffect, useMemo } from 'react';
import { Plus, GripVertical, ChevronDown } from 'lucide-react';
import { Trip } from '../types';
import { JourneyCardMenu } from './Home';

interface ArchiveHubPageProps {
  trips: Trip[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddArchive: () => void;
  isLoggedIn: boolean;
  onDeleteTrip: (id: number) => Promise<void>;
  onEditTrip?: (id: number) => void;
  onCloneTrip?: (id: number) => void;
  onMoveToPlans?: (trip: Trip) => void;
  onReorderTrips?: (orderedIds: number[]) => void;
  initialTagFilter?: string | null;
}

function getTripStartDate(dateRangeStr: string): Date {
  if (!dateRangeStr) return new Date(0);
  const parts = dateRangeStr.split(' - ');
  const startStr = parts[0].trim().replace(/\./g, '-');
  const d = new Date(startStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export function ArchiveHubPage({
  trips,
  onNavigate,
  onAddArchive,
  isLoggedIn,
  onDeleteTrip,
  onEditTrip,
  onCloneTrip,
  onMoveToPlans,
  onReorderTrips,
  initialTagFilter,
}: ArchiveHubPageProps) {
  const [activeFilter, setActiveFilter] = useState(initialTagFilter || 'All');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'user' | 'date' | 'place'>('user');
  const [draggedTripId, setDraggedTripId] = useState<number | null>(null);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);

  useEffect(() => {
    setLocalTrips(trips);
  }, [trips]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

  const baseFilters = ['All', '2026', '2025', '2024', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filters = baseFilters.includes(activeFilter) ? baseFilters : [...baseFilters, activeFilter];

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

  const filteredTrips = activeFilter === 'All' ? sortedTrips : sortedTrips.filter(t => t.tags.includes(activeFilter));

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

  return (
    <main className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-12 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2 sm:mb-3 break-keep" style={{ wordBreak: 'keep-all' }}>Journeys Archive</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">모든 여행의 감각적인 기록들입니다. 다녀온 곳을 회고하고 기록을 엑셀로 추출할 수 있습니다.</p>
          
          {/* Active Filter and Sorting Layout */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            {/* Tag Filter Dropdown */}
            <div className="relative inline-block text-left z-20">
              <button 
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-transparent text-black dark:text-white transition-colors flex items-center gap-1.5 rounded-sm"
              >
                <span>Tag Filter: {activeFilter}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 shadow-xl z-20 max-h-60 overflow-y-auto rounded-sm py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {filters.map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setActiveFilter(f);
                          setIsTagDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                          activeFilter === f 
                            ? 'bg-black text-white dark:bg-white dark:text-black' 
                            : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40">정렬 기준:</span>
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
        {isLoggedIn && (
          <button onClick={onAddArchive} className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3.5 h-3.5" /> Add Archive
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/20 dark:divide-white/20 transition-colors border-b border-black/20 dark:border-white/20 w-full">
        {filteredTrips.map((trip) => (
          <div 
            key={trip.id} 
            className={`group cursor-pointer p-6 flex flex-col h-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b sm:border-b-0 border-black/20 dark:border-white/20 w-full relative ${draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'}`} 
            onClick={() => onNavigate('detail', trip.id)}
            draggable={isLoggedIn && sortBy === 'user'}
            onDragStart={(e) => handleTripDragStart(e, trip.id)}
            onDragOver={(e) => handleTripDragOver(e, trip.id)}
            onDrop={handleTripDrop}
            onDragEnd={() => setDraggedTripId(null)}
          >
            {/* Drag Handle Indicator */}
            {isLoggedIn && sortBy === 'user' && (
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                <GripVertical className="w-4 h-4 text-black dark:text-white" />
              </div>
            )}

            <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
              <img src={trip.img} alt={trip.title} className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 pointer-events-none" />
              <JourneyCardMenu
                isLoggedIn={isLoggedIn}
                onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                onDelete={() => onDeleteTrip(trip.id)}
                onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                onMove={onMoveToPlans ? () => onMoveToPlans(trip) : undefined}
                moveLabel="계획으로 이동"
              />
            </div>
            <div className="mt-auto flex flex-col gap-1">
              <div className="flex flex-wrap gap-1 mb-1">
                {trip.tags?.filter(t => t !== 'Plan' && t !== 'Archived').map(tag => (
                  <span key={tag} className="text-[9px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40">#{tag}</span>
                ))}
              </div>
              <div className="text-[10px] tracking-widest text-black/55 dark:text-white/55 mb-1 transition-colors break-words">{trip.date}</div>
              <div className="font-bold tracking-tight uppercase text-sm break-words">
                {trip.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
