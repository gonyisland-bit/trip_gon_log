import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plane, Bed, Train, Clock, Compass } from 'lucide-react';
import { Trip, TimelineItem, FlightItem, StayItem, TransitItem } from '../types';
import { matchesCountryOrQuery } from '../utils/countryHelper';
import { Sheet, SheetCloseButton } from './Sheet';
import { Segment } from './ui/Segment';

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
  initialQuery?: string;
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
  initialQuery = '',
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'journeys' | 'timeline'>('journeys');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSearchCategory('journeys');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

    if (searchCategory === 'journeys') {
      // 1. Search Trips & Plans
      allTrips.forEach(t => {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchLoc = t.locationStr?.toLowerCase().includes(q);
        const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
        const matchCountry = matchesCountryOrQuery(t, q);

        if (matchTitle || matchLoc || matchTags || matchCountry) {
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
    } else {
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
    }

    setResults(searchResults.slice(0, 40)); // limit to 40 items
  }, [query, searchCategory, trips, plans, timelineData, flightsByTrip, staysByTrip, transitByTrip]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'trip':
      case 'plan':
        return <Compass className="w-4 h-4 text-black/70 dark:text-white/70" />;
      case 'timeline':
        return <Clock className="w-4 h-4 text-black/70 dark:text-white/70" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-black/70 dark:text-white/70" />;
      case 'stay':
        return <Bed className="w-4 h-4 text-black/70 dark:text-white/70" />;
      case 'transit':
        return <Train className="w-4 h-4 text-amber-500" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getBadge = (type: string) => {
    switch (type) {
      case 'trip':
        return <span className="bg-black/[0.05] text-black/65 dark:bg-white/10 dark:text-white/65 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Journey</span>;
      case 'plan':
        return <span className="bg-black/[0.05] text-black/65 dark:bg-white/10 dark:text-white/65 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Plan</span>;
      case 'timeline':
        return <span className="bg-black/[0.05] text-black/65 dark:bg-white/10 dark:text-white/65 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Log</span>;
      case 'flight':
        return <span className="bg-black/[0.05] text-black/65 dark:bg-white/10 dark:text-white/65 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Flight</span>;
      case 'stay':
        return <span className="bg-black/[0.05] text-black/65 dark:bg-white/10 dark:text-white/65 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Hotel</span>;
      case 'transit':
        return <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-micro font-bold h-5 px-2 inline-flex items-center rounded-full tracking-wider uppercase shrink-0">Transit</span>;
      default:
        return null;
    }
  };

  return (
    <Sheet onClose={onClose} label="통합 검색" placement="top" zIndex={200} panelClassName="max-w-2xl max-h-[70dvh] sm:max-h-[75vh]">
      <div className="flex flex-col min-h-0 text-black dark:text-white">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-black/[0.08] dark:border-white/10 shrink-0">
          <Search className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchCategory === 'journeys' ? '여정 · 나라 · 태그' : '일정 · 메모 · 항공 · 숙소 · 교통'}
            className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-black/45 dark:placeholder:text-white/45"
          />
          <SheetCloseButton className="w-9 h-9 rounded-full inline-grid place-items-center shrink-0 text-black/60 dark:text-white/60 hover:bg-black/[0.06] dark:hover:bg-white/10" label="닫기">
            <X className="w-4 h-4" />
          </SheetCloseButton>
        </div>

        <div className="px-4 py-2.5 shrink-0">
          <Segment
            size="sm"
            ariaLabel="검색 범위"
            value={searchCategory}
            onChange={setSearchCategory}
            options={[
              { value: 'journeys', label: '여정', icon: Compass },
              { value: 'timeline', label: '일정 · 예약', icon: Clock },
            ]}
          />
        </div>

        {/* Search Results List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
          {query.trim() === '' ? (
            <p className="text-center py-12 text-sm text-black/55 dark:text-white/55">검색어를 입력하세요.</p>
          ) : results.length === 0 ? (
            <p className="text-center py-12 text-sm text-black/55 dark:text-white/55">'{query}'에 맞는 결과가 없습니다.</p>
          ) : (
            results.map((res) => (
              <div
                key={res.id}
                onClick={() => {
                  onResultClick(res.tripId, res.tab, res.itemId);
                  onClose();
                }}
                className="w-full flex items-start gap-3 px-3 py-3 rounded-card hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full inline-grid place-items-center bg-black/[0.05] dark:bg-white/10 shrink-0">
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
                    <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5">
                      {res.subtitle}
                    </p>
                  )}
                  {res.type !== 'trip' && res.type !== 'plan' && (
                    <span className="text-meta text-black/55 dark:text-white/55 mt-0.5 block truncate">
                      {res.tripTitle}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Sheet>
  );
}
