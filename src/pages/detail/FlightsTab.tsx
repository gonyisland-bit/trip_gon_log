import { Plane, Plus, Sparkles } from 'lucide-react';
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
            {/* Smart booking: compare fares for this journey */}
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5">
              <span className="text-meta font-bold text-black/55 dark:text-white/55">항공권 비교</span>
              <button type="button" onClick={() => setIsQuickBookingOpen(true)} className="btn btn-secondary btn-sm">
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                스마트 부킹
              </button>
            </div>

            {(() => {
              const flightsToUse = isEditing ? draftFlights : flights;
              if (flightsToUse.length === 0) {
                return (
                  <div className="mx-3 sm:mx-4 my-2 flex flex-col items-center gap-3 py-12 rounded-card bg-surface dark:bg-surface-dark tgl-card-edge text-center">
                    <Plane className="w-6 h-6 text-black/40 dark:text-white/40" aria-hidden />
                    <span className="text-sm text-black/60 dark:text-white/60">등록된 항공편이 없습니다.</span>
                    {!isEditing && (
                      <button type="button" onClick={() => setIsQuickBookingOpen(true)} className="btn btn-primary btn-sm">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden />
                        항공권 찾기
                      </button>
                    )}
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
                    <div className="flex items-center justify-between py-2.5 px-4 md:px-6 mt-2">
                      <span className="text-sm font-extrabold">{groupLabel}</span>
                      <span className="text-micro font-mono font-bold text-black/50 dark:text-white/50 tabular-nums">{groupFlights.length}</span>
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
                            <div className="py-1 flex items-center justify-center w-full" onClick={(e) => e.stopPropagation()}>
                              <span className="h-7 px-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-micro sm:text-meta font-mono font-bold tracking-wider text-amber-700 dark:text-amber-400">
                                <Plane className="w-3 h-3" aria-hidden />
                                <span>{prevFlight.toCode} 경유 · {layoverTimeStr}</span>
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
                  {renderGroup(outbound, '가는 편')}
                  {renderGroup(inbound, '오는 편')}
                </div>
              );
            })()}

            {/* Add Flight controls */}
            {isEditing && (
              <div className="flex flex-wrap gap-2 justify-center py-6 px-4">
                <button 
                  onClick={() => handleAddFlight('OUTBOUND FLIGHT')} 
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />가는 편
                </button>
                <button 
                  onClick={() => handleAddFlight('LAYOVER FLIGHT')} 
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />경유 편
                </button>
                <button 
                  onClick={() => handleAddFlight('INBOUND FLIGHT')} 
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />오는 편
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
