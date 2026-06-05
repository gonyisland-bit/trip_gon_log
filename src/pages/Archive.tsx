import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Trip } from '../types';

interface ArchiveHubPageProps {
  trips: Trip[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onAddArchive: () => void;
  isLoggedIn: boolean;
  onDeleteTrip: (id: number) => Promise<void>;
}

export function ArchiveHubPage({
  trips,
  onNavigate,
  onAddArchive,
  isLoggedIn,
  onDeleteTrip,
}: ArchiveHubPageProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', '2026', '2025', '2024', 'Kyoto', 'Paris', 'Personal', 'Business'];
  const filteredTrips = activeFilter === 'All' ? trips : trips.filter(t => t.tags.includes(activeFilter));

  return (
    <main className="animate-in fade-in duration-500 min-h-screen w-full">
      <div className="p-6 md:px-12 md:py-16 border-b border-black/20 dark:border-white/20 bg-[#EAE8E3]/30 dark:bg-[#1a1a1a]/30 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 break-keep" style={{ wordBreak: 'keep-all' }}>Journeys Archive</h1>
          <p className="max-w-xl text-xs sm:text-sm leading-relaxed opacity-70 break-keep">모든 여행의 감각적인 기록들입니다. 다녀온 곳을 회고하고 기록을 엑셀로 추출할 수 있습니다.</p>
          
          {/* Active Filter Display */}
          <div className="flex flex-wrap gap-2 mt-6">
            {filters.map(f => (
              <button 
                key={f} 
                onClick={() => setActiveFilter(f)}
                className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest border transition-colors shrink-0 ${
                  activeFilter === f 
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' 
                  : 'border-black/20 text-black/50 hover:border-black/50 dark:border-white/20 dark:text-white/50 dark:hover:border-white/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {isLoggedIn && (
          <button onClick={onAddArchive} className="flex items-center justify-center gap-2 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors shrink-0 w-auto">
            <Plus className="w-3 h-3 md:w-4 md:h-4" /> Add Archive
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/20 dark:divide-white/20 transition-colors border-b border-black/20 dark:border-white/20 w-full">
        {filteredTrips.map((trip) => (
          <div key={trip.id} className="group cursor-pointer p-6 flex flex-col h-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b sm:border-b-0 border-black/20 dark:border-white/20 w-full relative" onClick={() => onNavigate('detail', trip.id)}>
            <div className="aspect-[3/4] w-full overflow-hidden mb-4 border border-black/10 dark:border-white/10 relative bg-black/5">
              <img src={trip.img} alt={trip.title} className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              {isLoggedIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrip(trip.id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="Delete Journey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-auto">
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
