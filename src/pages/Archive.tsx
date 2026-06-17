import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, GripVertical, ChevronDown } from 'lucide-react';
import { Trip } from '../types';
import { JourneyCardMenu } from './Home';

interface CardMediaProps {
  img: string;
  title: string;
  videoUrl?: string;
  isActive: boolean;
}

function CardMedia({ img, title, videoUrl, isActive }: CardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
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
  }, [isActive, videoUrl]);

  return (
    <>
      <img
        src={img}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none group-hover:scale-105 ${
          isActive ? 'scale-105 opacity-100' : 'opacity-85 group-hover:opacity-100'
        }`}
      />
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          muted
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none scale-105 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  );
}

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

// Helper to extract year and English short month for magazine styling
function getYearAndMonth(dateRangeStr: string): { year: string; month: string } {
  if (!dateRangeStr) return { year: '', month: '' };
  const parts = dateRangeStr.split(/\s*[-—–]\s*/);
  const cleanFirst = parts[0]?.trim();
  if (cleanFirst) {
    const dots = cleanFirst.split('.');
    if (dots.length >= 2) {
      const year = dots[0];
      const monthNum = parseInt(dots[1], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[monthNum - 1] || dots[1];
      return { year, month };
    }
  }
  return { year: '', month: '' };
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
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  useEffect(() => {
    setLocalTrips(trips);
  }, [trips]);

  useEffect(() => {
    if (initialTagFilter) {
      setActiveFilter(initialTagFilter);
    }
  }, [initialTagFilter]);

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
    <main onClick={() => setActiveCardId(null)} className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-12 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2 sm:mb-3 break-keep" style={{ wordBreak: 'keep-all' }}>Journeys Archive</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">모든 여행의 감각적인 기록들입니다. 다녀온 곳을 회고하고 기록을 엑셀로 추출할 수 있습니다.</p>
          
          {/* Active Filter and Sorting Layout */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            {/* Tag Filter horizontal scrollable buttons */}
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border transition-colors shrink-0 rounded-sm ${
                    activeFilter === f
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black/20 text-black/50 hover:border-black/50 dark:border-white/20 dark:text-white/50 dark:hover:border-white/50 bg-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-12 w-full">
        {filteredTrips.map((trip) => {
          const { year, month } = getYearAndMonth(trip.date);
          const days = calculateDays(trip.date);
          return (
            <div
              key={trip.id}
              style={{ containerType: 'inline-size' }}
              className={`group cursor-pointer aspect-[3/4] w-full overflow-hidden transition-all border relative shadow-[0_0_15px_rgba(0,0,0,0.08)] dark:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
                draggedTripId === trip.id ? 'opacity-40' : 'opacity-100'
              } ${
                activeCardId === trip.id
                  ? 'border-red-600 dark:border-red-400 ring-2 ring-red-600/20 dark:ring-red-400/20 scale-[1.01] shadow-lg'
                  : 'border-black/10 dark:border-white/10 bg-[#111]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeCardId === trip.id) {
                  onNavigate('detail', trip.id);
                } else {
                  setActiveCardId(trip.id);
                }
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
                isActive={activeCardId === trip.id}
              />

              {/* Magazine Overlay Gradient */}
              <div className="absolute inset-0 magazine-card-gradient pointer-events-none" />

              {/* Magazine Cover Text Layout */}
              <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between z-10 text-white pointer-events-none">
                {/* Top Header Row: Title & Issue Date */}
                <div className="flex justify-between items-start gap-3 w-full">
                  <h3
                    className="text-[5.5cqw] font-black uppercase tracking-tight leading-none font-serif text-white drop-shadow-md max-w-[70%] line-clamp-2"
                    style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                  >
                    {trip.title}
                  </h3>
                  {month && year && (
                    <div className="flex flex-col items-end shrink-0 text-right leading-none font-mono">
                      <span className="text-[3.8cqw] font-black tracking-widest text-amber-500 uppercase">{month}</span>
                      <span className="text-[2.8cqw] font-bold tracking-widest text-white/60 mt-0.5">{year}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Row: Date, Tags & Status */}
                <div className="mt-auto flex flex-col gap-1.5">
                  {trip.tags && trip.tags.filter(t => t !== 'Plan' && t !== 'Archived').length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trip.tags.filter(t => t !== 'Plan' && t !== 'Archived').slice(0, 2).map(tag => (
                        <span key={tag} className="text-[2.6cqw] uppercase font-bold tracking-widest bg-white/10 px-1.5 py-0.5 rounded-sm text-white/95">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[3cqw] tracking-widest text-white/70 font-mono truncate uppercase">
                      {trip.date}
                      {days > 0 && ` · ${days} DAYS`}
                    </div>
                    <div className="text-[2.6cqw] tracking-[0.2em] font-black text-amber-500/95 uppercase">ARCHIVED JOURNEY</div>
                  </div>
                </div>
              </div>

              {/* Hamburger menu */}
              <JourneyCardMenu
                isLoggedIn={isLoggedIn}
                onEdit={onEditTrip ? () => onEditTrip(trip.id) : undefined}
                onDelete={() => onDeleteTrip(trip.id)}
                onClone={onCloneTrip ? () => onCloneTrip(trip.id) : undefined}
                onMove={onMoveToPlans ? () => onMoveToPlans(trip) : undefined}
                moveLabel="계획으로 이동"
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
