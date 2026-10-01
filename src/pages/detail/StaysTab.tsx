import { Bed, Plus, Search } from 'lucide-react';
import { StayCard } from '../../components/StayCard';
import type { JourneyDetailState } from './useJourneyDetailState';

export function StaysTab({ s }: { s: JourneyDetailState }) {
  const {
    stays, onDelete, bookingOpen, activeTab, visitedTabs, expandedItemId, setExpandedItemId,
    setIsQuickBookingOpen, isEditing, draftStays, setMapConfirm, tripToUse, defaultCurrency, minDate,
    maxDate, itemRefs, updateStay, updateStayPlace, deleteStay, handleAddStay
  } = s;

  return (
    <>
      <div className={`w-full flex flex-col ${activeTab === 'stays' ? 'block' : 'hidden'}`}>
        {visitedTabs.has('stays') && (
          <>
            {/* Smart booking: compare fares for a journey still ahead */}
            {bookingOpen && (
              <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5">
                <span className="text-meta font-bold text-black/55 dark:text-white/55">숙소 비교</span>
                <button type="button" onClick={() => setIsQuickBookingOpen(true)} className="btn btn-secondary btn-sm">
                  <Search className="w-3.5 h-3.5" aria-hidden />
                  스마트 부킹
                </button>
              </div>
            )}
            {(isEditing ? draftStays : stays).length === 0 ? (
              <div className="mx-3 sm:mx-4 my-2 flex flex-col items-center gap-3 py-12 rounded-card bg-surface dark:bg-surface-dark tgl-card-edge text-center">
                    <Bed className="w-6 h-6 text-black/40 dark:text-white/40" aria-hidden />
                    <span className="text-sm text-black/60 dark:text-white/60">등록된 숙소가 없습니다.</span>
                    {!isEditing && bookingOpen && (
                      <button type="button" onClick={() => setIsQuickBookingOpen(true)} className="btn btn-primary btn-sm">
                        <Search className="w-3.5 h-3.5" aria-hidden />
                        숙소 찾기
                      </button>
                    )}
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
                  <Plus className="w-4 h-4" aria-hidden />숙소 추가
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
