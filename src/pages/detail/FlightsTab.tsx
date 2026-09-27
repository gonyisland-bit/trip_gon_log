import { Plane, Plus, Search, Sparkles } from 'lucide-react';
import { FlightCard } from '../../components/FlightCard';
import { FlightItem } from '../../types';
import { calculateLayoverTime } from './detailUtils';
import type { JourneyDetailState } from './useJourneyDetailState';

export function FlightsTab({ s }: { s: JourneyDetailState }) {
  const {
    flights, onDelete, activeTab, visitedTabs, expandedItemId, setExpandedItemId,
    setIsQuickBookingOpen, isEditing, draftFlights, setMapConfirm, tripToUse, defaultCurrency,
    minDate, maxDate, itemRefs, updateFlight, deleteFlight, handleAddFlight
  } = s;

  return (
    <>
      <div className={`w-full flex flex-col ${activeTab === 'flights' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('flights') && (
          <>
            {/* 1-Click Flight Search Banner */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/10 dark:border-white/10 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <Plane className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                <span className="font-bold tracking-wider text-[11px] uppercase text-black/70 dark:text-white/70">
                  실시간 최저가 항공권 비교
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickBookingOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 font-mono text-meta font-bold tracking-widest uppercase transition-all active:scale-[0.98] shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>SMART BOOKING</span>
              </button>
            </div>

            {(() => {
              const flightsToUse = isEditing ? draftFlights : flights;
              if (flightsToUse.length === 0) {
                return (
                  <div className="text-center py-16 text-black/60 dark:text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase">
                    등록된 항공편이 없습니다.
                  </div>
                );
              }

              const sorted = [...flightsToUse].sort((a, b) => {
                const dateCompare = (a.date || '').localeCompare(b.date || '');
                if (dateCompare !== 0) return dateCompare;
                return (a.fromTime || '').localeCompare(b.fromTime || '');
              });

              const getFlightGroup = (f: FlightItem): 'outbound' | 'inbound' => {
                const fTitle = f.title.toUpperCase();
                if (fTitle.includes('OUTBOUND')) return 'outbound';
                if (fTitle.includes('INBOUND')) return 'inbound';

                if (minDate && maxDate && f.date && f.date !== 'YYYY.MM.DD') {
                  const startMs = new Date(minDate).getTime();
                  const endMs = new Date(maxDate).getTime();
                  const fDateStr = f.date.replace(/\./g, '-');
                  const fMs = new Date(fDateStr).getTime();
                  if (!isNaN(startMs) && !isNaN(endMs) && !isNaN(fMs)) {
                    const midMs = (startMs + endMs) / 2;
                    return fMs <= midMs ? 'outbound' : 'inbound';
                  }
                }
                return 'outbound';
              };

              const outbound = sorted.filter(f => getFlightGroup(f) === 'outbound');
              const inbound = sorted.filter(f => getFlightGroup(f) === 'inbound');

              const renderGroup = (groupFlights: FlightItem[], groupLabel: string) => {
                if (groupFlights.length === 0) return null;
                return (
                  <div className="w-full flex flex-col">
                    <div className="flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15">
                      <span className="text-meta md:text-xs uppercase font-extrabold tracking-widest text-red-600 dark:text-red-400 font-mono">
                        {groupLabel}
                      </span>
                      <span className="text-micro md:text-meta font-mono font-bold text-black/60 dark:text-white/60 tracking-wider">
                        {groupFlights.length} FLIGHT{groupFlights.length > 1 ? 'S' : ''}
                      </span>
                    </div>
                    {groupFlights.map((flight, idx) => {
                      const prevFlight = idx > 0 ? groupFlights[idx - 1] : null;
                      const layoverTimeStr = prevFlight 
                        ? calculateLayoverTime(prevFlight.date, prevFlight.toTime, flight.date, flight.fromTime)
                        : '';

                      return (
                        <div 
                          ref={el => { itemRefs.current[flight.id] = el; }} 
                          key={flight.id}
                          className="w-full flex flex-col"
                        >
                          {prevFlight && layoverTimeStr && (
                            <div className="py-2 px-4 md:px-6 flex items-center justify-center bg-red-50/60 dark:bg-red-950/20 border-b border-red-500/20 w-full" onClick={(e) => e.stopPropagation()}>
                              <span className="flex items-center gap-1.5 text-micro sm:text-meta font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400">
                                <Plane className="w-3 h-3" />
                                <span>LAYOVER AT {prevFlight.toCode} · {layoverTimeStr}</span>
                              </span>
                            </div>
                          )}
                          <FlightCard 
                            flight={flight} 
                            isEditMode={isEditing} 
                            onUpdate={updateFlight} 
                            onDelete={deleteFlight} 
                            isActive={expandedItemId === flight.id}
                            minDate={minDate}
                            maxDate={maxDate}
                            onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                            onClick={() => {
                              setExpandedItemId(prev => prev === flight.id ? null : flight.id);
                            }}
                            members={tripToUse?.members || []}
                            defaultCurrency={defaultCurrency}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              };

              return (
                <div className="flex flex-col w-full">
                  {renderGroup(outbound, 'Outbound Flights')}
                  {renderGroup(inbound, 'Inbound Flights')}
                </div>
              );
            })()}

            {/* Add Flight controls */}
            {isEditing && (
              <div className="flex gap-4 justify-center py-6">
                <button 
                  onClick={() => handleAddFlight('OUTBOUND FLIGHT')} 
                  className="text-meta md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Outbound Flight
                </button>
                <button 
                  onClick={() => handleAddFlight('LAYOVER FLIGHT')} 
                  className="text-meta md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Layover Flight
                </button>
                <button 
                  onClick={() => handleAddFlight('INBOUND FLIGHT')} 
                  className="text-meta md:text-xs font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Inbound Flight
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
