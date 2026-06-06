import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plane, Bed, Train, Clock, Compass } from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  plans: Trip[];
  timelineData: { [date: string]: TimelineItem[] };
  flightsByTrip: { [tripId: number]: FlightItem[] };
  staysByTrip: { [tripId: number]: StayItem[] };
  transitByTrip: { [tripId: number]: TransitItem[] };
  onResultClick: (tripId: number, tabId: string, itemId: number | null) => void;
}

interface SearchResult {
  id: string; // unique result id
  tripId: number;
  tripTitle: string;
  type: 'trip' | 'plan' | 'timeline' | 'flight' | 'stay' | 'transit';
  title: string;
  subtitle?: string;
  tab: string;
  itemId: number | null;
}

export function SearchModal({
  isOpen,
  onClose,
  trips,
  plans,
  timelineData,
  flightsByTrip,
  staysByTrip,
  transitByTrip,
  onResultClick,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    // Helper to find trip title
    const allTrips = [...trips, ...plans];
    const getTripTitle = (id: number) => {
      const found = allTrips.find(t => t.id === id);
      return found ? found.title : `Trip #${id}`;
    };

    // 1. Search Trips & Plans
    allTrips.forEach(t => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchLoc = t.locationStr?.toLowerCase().includes(q);
      const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q));

      if (matchTitle || matchLoc || matchTags) {
        searchResults.push({
          id: `trip-${t.id}`,
          tripId: t.id,
          tripTitle: t.title,
          type: plans.some(p => p.id === t.id) ? 'plan' : 'trip',
          title: t.title,
          subtitle: `${t.locationStr || ''} • ${t.date || ''}`,
          tab: 'timeline',
          itemId: null,
        });
      }
    });

    // 2. Search Timeline Items
    Object.entries(timelineData).forEach(([_, items]) => {
      (items || []).forEach(item => {
        const matchPlace = item.place?.toLowerCase().includes(q);
        const matchMemo = item.memo?.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);

        if (matchPlace || matchMemo || matchLoc) {
          const tripId = item.tripId || 0;
          searchResults.push({
            id: `timeline-${item.id}`,
            tripId,
            tripTitle: getTripTitle(tripId),
            type: 'timeline',
            title: item.place || 'Timeline Event',
            subtitle: `${item.time || ''} • ${item.memo || ''}`,
            tab: 'timeline',
            itemId: item.id,
          });
        }
      });
    });

    // 3. Search Flights
    Object.entries(flightsByTrip).forEach(([tripIdStr, items]) => {
      const tripId = Number(tripIdStr);
      (items || []).forEach(item => {
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchNo = item.flightNo?.toLowerCase().includes(q);
        const matchFrom = item.fromCode?.toLowerCase().includes(q);
        const matchTo = item.toCode?.toLowerCase().includes(q);

        if (matchTitle || matchNo || matchFrom || matchTo) {
          searchResults.push({
            id: `flight-${item.id}`,
            tripId,
            tripTitle: getTripTitle(tripId),
            type: 'flight',
            title: `${item.title || 'Flight'} (${item.flightNo || ''})`,
            subtitle: `${item.fromCode || ''} → ${item.toCode || ''} • Seat ${item.seat || ''}`,
            tab: 'flights',
            itemId: item.id,
          });
        }
      });
    });

    // 4. Search Stays
    Object.entries(staysByTrip).forEach(([tripIdStr, items]) => {
      const tripId = Number(tripIdStr);
      (items || []).forEach(item => {
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchAddr = item.address?.toLowerCase().includes(q);
        const matchMemo = item.memo?.toLowerCase().includes(q);

        if (matchTitle || matchAddr || matchMemo) {
          searchResults.push({
            id: `stay-${item.id}`,
            tripId,
            tripTitle: getTripTitle(tripId),
            type: 'stay',
            title: item.title || 'Hotel Stay',
            subtitle: `${item.address || ''} • Conf: ${item.confNo || ''}`,
            tab: 'stays',
            itemId: item.id,
          });
        }
      });
    });

    // 5. Search Transits
    Object.entries(transitByTrip).forEach(([tripIdStr, items]) => {
      const tripId = Number(tripIdStr);
      (items || []).forEach(item => {
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchRoute = item.route?.toLowerCase().includes(q);
        const matchDepart = item.departPlace?.toLowerCase().includes(q);
        const matchArrive = item.arrivePlace?.toLowerCase().includes(q);
        const matchBoarding = item.boardingPlace?.toLowerCase().includes(q);

        if (matchTitle || matchRoute || matchDepart || matchArrive || matchBoarding) {
          searchResults.push({
            id: `transit-${item.id}`,
            tripId,
            tripTitle: getTripTitle(tripId),
            type: 'transit',
            title: item.title || 'Transit',
            subtitle: `${item.route || ''} • Seat ${item.seat || ''} • Conf ${item.bookingRef || ''}`,
            tab: 'transit',
            itemId: item.id,
          });
        }
      });
    });

    setResults(searchResults.slice(0, 30)); // limit to 30 items
  }, [query, trips, plans, timelineData, flightsByTrip, staysByTrip, transitByTrip]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'trip':
      case 'plan':
        return <Compass className="w-4 h-4 text-emerald-500" />;
      case 'timeline':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-500 animate-pulse" />;
      case 'stay':
        return <Bed className="w-4 h-4 text-indigo-500" />;
      case 'transit':
        return <Train className="w-4 h-4 text-amber-500" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getBadge = (type: string) => {
    switch (type) {
      case 'trip':
        return <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Journey</span>;
      case 'plan':
        return <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Plan</span>;
      case 'timeline':
        return <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Timeline</span>;
      case 'flight':
        return <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Flight</span>;
      case 'stay':
        return <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Hotel</span>;
      case 'transit':
        return <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Transit</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#151515] border border-black/10 dark:border-white/10 shadow-2xl rounded-none mt-16 md:mt-24 flex flex-col max-h-[75vh] overflow-hidden text-black dark:text-white">
        
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/15 dark:border-white/15">
          <Search className="w-5 h-5 opacity-40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search journeys, places, flights, stays, transit routes..."
            className="flex-grow bg-transparent border-none outline-none text-sm md:text-base placeholder-black/40 dark:placeholder-white/40 font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            title="Close Search"
          >
            <X className="w-5 h-5 opacity-55" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-grow overflow-y-auto divide-y divide-black/5 dark:divide-white/5 p-2 max-h-[500px]">
          {query.trim() === '' ? (
            <div className="text-center py-12 text-black/45 dark:text-white/45 text-xs md:text-sm font-bold tracking-widest uppercase">
              Type keywords to start search...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-black/45 dark:text-white/45 text-xs md:text-sm font-bold tracking-widest uppercase">
              No results found for "{query}"
            </div>
          ) : (
            results.map((res) => (
              <div
                key={res.id}
                onClick={() => {
                  onResultClick(res.tripId, res.tab, res.itemId);
                  onClose();
                }}
                className="w-full flex items-start gap-3.5 p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer group"
              >
                <div className="p-2 bg-black/5 dark:bg-white/5 shrink-0 group-hover:scale-110 transition-transform">
                  {getIcon(res.type)}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm md:text-base tracking-tight leading-snug group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors truncate">
                      {res.title}
                    </span>
                    {getBadge(res.type)}
                  </div>
                  {res.subtitle && (
                    <p className="text-xs text-black/50 dark:text-white/50 truncate mt-0.5">
                      {res.subtitle}
                    </p>
                  )}
                  {res.type !== 'trip' && res.type !== 'plan' && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-black/35 dark:text-white/35 mt-1 block">
                      Journey: {res.tripTitle}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
