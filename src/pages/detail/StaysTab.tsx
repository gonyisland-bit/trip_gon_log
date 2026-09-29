import { Bed, Plus, Search, Sparkles } from 'lucide-react';
import { StayCard } from '../../components/StayCard';
import type { JourneyDetailState } from './useJourneyDetailState';

export function StaysTab({ s }: { s: JourneyDetailState }) {
  const {
    stays, onDelete, activeTab, visitedTabs, expandedItemId, setExpandedItemId,
    setIsQuickBookingOpen, isEditing, draftStays, setMapConfirm, tripToUse, defaultCurrency, minDate,
    maxDate, itemRefs, updateStay, updateStayPlace, deleteStay, handleAddStay
  } = s;

  return (
    <>
      <div className={`w-full flex flex-col ${activeTab === 'stays' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('stays') && (
          <>
            {/* 1-Click Stay Search Banner */}
            <div className="flex items-center justify-between px-4 py-2.5  text-xs">
              <div className="flex items-center gap-2 font-mono">
                <Bed className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                <span className="font-bold tracking-wider text-[11px] uppercase text-black/70 dark:text-white/70">
                  실시간 숙소 특가 비교
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickBookingOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 font-mono text-meta font-bold tracking-widest uppercase transition active:scale-[0.98] shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>SMART BOOKING</span>
              </button>
            </div>
            {(isEditing ? draftStays : stays).length === 0 ? (
              <div className="text-center py-16 text-black/60 dark:text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase">
                등록된 숙소 정보가 없습니다.
              </div>
            ) : (
              (isEditing ? draftStays : stays).map(stay => (
                <div ref={el => { itemRefs.current[stay.id] = el; }} key={stay.id} className="w-full">
                  <StayCard 
                    stay={stay} 
                    isEditMode={isEditing} 
                    onUpdate={updateStay} 
                    onSelectPlace={updateStayPlace}
                    onDelete={deleteStay} 
                    isActive={expandedItemId === stay.id}
                    minDate={minDate}
                    maxDate={maxDate}
                    onOpenMapConfirm={(placeName, url) => setMapConfirm({ placeName, url })}
                    onClick={() => {
                      setExpandedItemId(prev => prev === stay.id ? null : stay.id);
                    }}
                    members={tripToUse?.members || []}
                    defaultCurrency={defaultCurrency}
                  />
                </div>
              ))
            )}

            {/* Add Stay control */}
            {isEditing && (
              <div className="flex justify-center py-6">
                <button 
                  onClick={handleAddStay} 
                  className="btn btn-secondary flex"
                >
                  <Plus className="w-4 h-4" /> Add Accommodation
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
