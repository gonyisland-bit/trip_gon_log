import { Train, Bus, Car, Plus } from 'lucide-react';
import { TransitCard } from '../../components/TransitCard';
import { TransitItem } from '../../types';
import { parseTimeToMinutes } from './detailUtils';
import type { JourneyDetailState } from './useJourneyDetailState';

export function TransitTab({ s }: { s: JourneyDetailState }) {
  const {
    transits, onDelete, activeTab, visitedTabs, expandedItemId, setExpandedItemId, isEditing,
    draftTransits, transitSortType, setTransitSortType, setMapConfirm, setTransitFocusType,
    tripToUse, defaultCurrency, minDate, maxDate, itemRefs, updateTransit, deleteTransit,
    handleAddTransit
  } = s;

  return (
    <>
      <div className={`w-full flex flex-col ${activeTab === 'transit' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('transit') && (
          <>
            {/* Sort Type Control */}
            <div className="w-full flex justify-end items-center gap-2 py-2 px-4 md:px-6 mt-2 text-micro md:text-meta font-bold uppercase tracking-widest select-none">
            <button 
              onClick={() => setTransitSortType('time')} 
              className={`h-8 px-3 rounded-full border transition-colors cursor-pointer ${transitSortType === 'time' ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
              title="탑승 시간순"
            >
              By time
            </button>
            <button 
              onClick={() => setTransitSortType('type')} 
              className={`h-8 px-3 rounded-full border transition-colors cursor-pointer ${transitSortType === 'type' ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-transparent' : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60'}`}
              title="탑승 종류순"
            >
              By type
            </button>
          </div>

          {(() => {
            const rawTransitList = isEditing ? draftTransits : transits;
            if (rawTransitList.length === 0) {
              return (
                <div className="text-center py-16 text-black/60 dark:text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 교통편이 없습니다.
                </div>
              );
            }

            // YYYY.MM.DD 기본값인 티켓은 정렬 시 맨 하단으로 미는 정렬 헬퍼
            const sortTransits = (list: TransitItem[]) => {
              return [...list].sort((a, b) => {
                const isBasicA = !a.date || a.date === 'YYYY.MM.DD';
                const isBasicB = !b.date || b.date === 'YYYY.MM.DD';
                if (isBasicA && !isBasicB) return 1;
                if (!isBasicA && isBasicB) return -1;
                if (isBasicA && isBasicB) return a.id - b.id; // 생성순 (ID)

                const dateA = a.date || '';
                const dateB = b.date || '';
                if (dateA !== dateB) {
                  return dateA.localeCompare(dateB);
                }
                return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
              });
            };

            const transitList = sortTransits(rawTransitList);

            const renderGroup = (items: TransitItem[], label: string, IconComponent: any) => {
              if (items.length === 0) return null;
              return (
                <div className="w-full flex flex-col">
                  <div className="flex items-center justify-between py-2.5 px-4 md:px-6 mt-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <span className="text-meta md:text-xs uppercase font-extrabold tracking-widest text-red-600 dark:text-red-400 font-mono">
                        {label}
                      </span>
                    </div>
                    <span className="text-micro md:text-meta font-mono font-bold text-black/60 dark:text-white/60 tracking-wider">
                      {items.length} ITEM{items.length > 1 ? 'S' : ''}
                    </span>
                  </div>
                  <div className="flex flex-col w-full">
                    {items.map(transit => (
                      <div ref={el => { itemRefs.current[transit.id] = el; }} key={transit.id} className="w-full">
                        <TransitCard 
                          transit={transit} 
                          isEditMode={isEditing} 
                          onUpdate={updateTransit} 
                          onDelete={deleteTransit} 
                          isActive={expandedItemId === transit.id}
                          minDate={minDate}
                          maxDate={maxDate}
                          onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                          onClick={() => {
                            setExpandedItemId(prev => prev === transit.id ? null : transit.id);
                            setTransitFocusType(null);
                          }}
                          onFocusPlace={(type) => {
                            setExpandedItemId(transit.id);
                            setTransitFocusType(type);
                          }}
                          members={tripToUse?.members || []}
                          defaultCurrency={defaultCurrency}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            if (transitSortType === 'time') {
              // 탑승시간순 정렬: Train/Bus/Taxi 묶지 않고 시간순으로 정렬된 전체 리스트를 하나의 그룹으로 렌더링
              return (
                <div className="flex flex-col text-left w-full">
                  {renderGroup(transitList, 'Transit Schedule', Train)}
                </div>
              );
            } else {
              // Helper to determine transit type reliably
              const getEffectiveTransitType = (t: TransitItem): 'train' | 'bus' | 'taxi' | 'car' => {
                if (t.transitType === 'car' || t.transitType === 'taxi' || t.transitType === 'bus' || t.transitType === 'train') {
                  return t.transitType;
                }
                const typeUpper = ((t.ticketType || '') + ' ' + (t.title || '')).toUpperCase();
                if (typeUpper.includes('CAR') || typeUpper.includes('RENT') || typeUpper.includes('렌트') || typeUpper.includes('렌터카')) return 'car';
                if (typeUpper.includes('TAXI') || typeUpper.includes('택시')) return 'taxi';
                if (typeUpper.includes('BUS') || typeUpper.includes('버스')) return 'bus';
                return 'train';
              };

              // 탑승종류순 정렬: Train / Bus / Taxi / Car 분류
              const trains = transitList.filter(t => getEffectiveTransitType(t) === 'train');
              const buses = transitList.filter(t => getEffectiveTransitType(t) === 'bus');
              const taxis = transitList.filter(t => getEffectiveTransitType(t) === 'taxi');
              const cars = transitList.filter(t => getEffectiveTransitType(t) === 'car');
              return (
                <div className="flex flex-col text-left w-full">
                  {renderGroup(trains, 'Train Tickets', Train)}
                  {renderGroup(buses, 'Bus Tickets', Bus)}
                  {renderGroup(taxis, 'Taxi Tickets', Car)}
                  {renderGroup(cars, 'Rentals', Car)}
                </div>
              );
            }
          })()}

          {/* Add Transit control */}
          {isEditing && (
            <div className="flex flex-col items-center py-6 gap-2">
              <span className="text-meta text-black/60 dark:text-white/60 uppercase font-extrabold tracking-widest font-sans break-keep">Add Transit Ticket (교통 티켓 추가)</span>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => handleAddTransit('train')} 
                  className="btn btn-secondary btn-sm flex"
                >
                  <Plus className="w-3.5 h-3.5" /> Train
                </button>
                <button 
                  onClick={() => handleAddTransit('bus')} 
                  className="btn btn-secondary btn-sm flex"
                >
                  <Plus className="w-3.5 h-3.5" /> Bus
                </button>
                <button 
                  onClick={() => handleAddTransit('taxi')} 
                  className="btn btn-secondary btn-sm flex"
                >
                  <Plus className="w-3.5 h-3.5" /> Taxi
                </button>
                <button 
                  onClick={() => handleAddTransit('car')} 
                  className="btn btn-secondary btn-sm flex"
                >
                  <Plus className="w-3.5 h-3.5" /> Rental
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </>
  );
}
