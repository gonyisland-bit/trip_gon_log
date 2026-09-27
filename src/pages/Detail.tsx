import { ChevronUp, ChevronDown } from 'lucide-react';
import { getDefaultCurrencyForLocation } from '../components/SettlementExpenseInput';
import { SettlementView } from '../components/SettlementView';
import { SummaryView } from '../components/SummaryView';
import { Lightbox } from '../components/Lightbox';
import { Footer } from '../components/Footer';
import { FloatingPocketWidget } from '../components/FloatingPocketWidget';
import { TabType } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useJourneyDetailState, type JourneyDetailPageProps } from './detail/useJourneyDetailState';
import { DetailMapPanel } from './detail/DetailMapPanel';
import { TimelineTab } from './detail/TimelineTab';
import { FlightsTab } from './detail/FlightsTab';
import { StaysTab } from './detail/StaysTab';
import { TransitTab } from './detail/TransitTab';
import { GalleryTab } from './detail/GalleryTab';
import { DetailOverlays } from './detail/DetailOverlays';

export function JourneyDetailPage(props: JourneyDetailPageProps) {
  const s = useJourneyDetailState(props);
  const {
    isLoggedIn, trip, timelineData, flights, stays, transits, activeTab, setActiveTab, visitedTabs,
    selectedDate, setSelectedDate, setExpandedItemId, showQuickJump, isQuickJumpExpanded,
    setIsQuickJumpExpanded, activeSpyDate, quickJumpChipsRef, resetQuickJumpCollapseTimer,
    setRadarFocusedSpot, setActiveGhostSpotId, isPocketWidgetOpen, setIsPocketWidgetOpen, isEditing,
    draftTrip, setDraftTrip, draftFlights, draftStays, draftTransits, tripToUse, defaultCurrency,
    tabContentRef, mobileSheetSnap, setMobileSheetSnap, handleSheetTouchStart, handleSheetTouchEnd,
    itemRefs, allTripDates, groupedTimelineData, handleDirectAddFromPocket, handleQuickJumpToDate,
    handleScrollToTop, updateExpenseItem
  } = s;

  // Early Return (conditional render)
  if (!trip) {
    return (
      <div className="flex-grow flex items-center justify-center bg-transparent h-[80vh] text-xs font-bold uppercase tracking-widest text-black/60 dark:text-white/60">
        Loading Journey Details...
      </div>
    );
  }

  return (
    <main 
      onScroll={(e) => {
        if (e.currentTarget.scrollLeft !== 0) {
          e.currentTarget.scrollLeft = 0;
        }
      }}
      className="flex flex-col md:flex-row h-full w-full max-w-full overflow-hidden overflow-x-hidden overscroll-none relative bg-transparent"
    >
      
      {/* Left: Map & Info Section (Responsive Height driven by mobileSheetSnap) */}
      <DetailMapPanel s={s} />
      
      {/* Right: Record / Tabs Section (Responsive Bottom Sheet on Mobile) */}
      <section 
        className={`w-full md:w-1/2 flex flex-col bg-white/80 dark:bg-[#0A0A0A]/85 backdrop-blur-md transition-all duration-300 flex-grow md:h-full overflow-hidden overflow-x-hidden max-w-full relative ${
          mobileSheetSnap === 'expanded' ? 'max-md:h-full max-md:flex-1' : 'max-md:h-[64dvh]'
        }`}
      >
        {/* Mobile Bottom Sheet Grab Handle */}
        <div 
          className="md:hidden flex flex-col items-center justify-center py-2 px-4 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md border-b border-black/10 dark:border-white/10 cursor-pointer select-none touch-none shrink-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/grab"
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
          onClick={() => {
            setMobileSheetSnap(prev => prev === 'half' ? 'expanded' : 'half');
          }}
          title="지도/일정 분할 토글"
        >
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-black/25 dark:bg-white/25 group-hover/grab:bg-black/40 rounded-full transition-colors" />
            {mobileSheetSnap === 'expanded' ? (
              <ChevronDown className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
            )}
          </div>
        </div>
        
        {/* Tab Headers - Unified Single-line Sleek Design (SUM, TIME, FLIGHT, STAY, TRANS, PHOTO) */}
        <div className="flex overflow-x-hidden flex-nowrap border-b border-black/15 dark:border-white/15 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md transition-colors shrink-0 w-full h-9 sm:h-10">
          {[ 
            { id: 'summary', label: 'SUM' },
            { id: 'timeline', label: 'TIME' }, 
            { id: 'flights', label: 'FLIGHT' }, 
            { id: 'stays', label: 'STAY' }, 
            { id: 'transit', label: 'TRANS' }, 
            { id: 'gallery', label: 'PHOTO' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setExpandedItemId(null);
              }} 
              className={`flex-1 h-full px-0.5 sm:px-2 flex items-center justify-center text-meta sm:text-[11px] md:text-xs font-extrabold uppercase tracking-wider border-r border-black/15 dark:border-white/15 last:border-r-0 transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer font-sans select-none ${
                activeTab === tab.id 
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div 
          ref={tabContentRef}
          className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full h-full bg-transparent"
        >
          {/* SUMMARY TAB */}
          <div className={activeTab === 'summary' ? 'contents' : 'hidden'}>
            <SummaryView 
              trip={tripToUse!}
              timelineData={timelineData}
              flights={isEditing ? draftFlights : flights}
              stays={isEditing ? draftStays : stays}
              transits={isEditing ? draftTransits : transits}
              defaultCurrency={getDefaultCurrencyForLocation(tripToUse?.locationStr || '')}
              onSelectTab={(tab) => {
                setActiveTab(tab as TabType);
                setExpandedItemId(null);
              }}
            />
          </div>
          
          {/* LOG TAB */}
          <TimelineTab s={s} />

          {/* FLIGHTS TAB */}
          <FlightsTab s={s} />

          {/* STAYS TAB */}
          <StaysTab s={s} />

          {/* TRANSIT TAB */}
          <TransitTab s={s} />

          {/* GALLERY TAB */}
          <GalleryTab s={s} />

        {/* SETTLEMENT TAB */}
        <div className={activeTab === 'settlement' ? 'contents' : 'hidden'}>
          {visitedTabs.has('settlement') && (
            <SettlementView
              isLoggedIn={isLoggedIn}
              trip={tripToUse!}
              timelineData={groupedTimelineData}
              flights={isEditing ? draftFlights : flights}
              stays={isEditing ? draftStays : stays}
              transits={isEditing ? draftTransits : transits}
              isEditing={isEditing}
              onUpdateMembers={(newMembers) => {
                if (isEditing && draftTrip) {
                  setDraftTrip({ ...draftTrip, members: newMembers });
                }
              }}
              onJumpToItem={(itemType, id, date) => {
                setActiveTab(itemType);
                setExpandedItemId(id);
                if (date) {
                  setSelectedDate(date);
                }
                setTimeout(() => {
                  const el = itemRefs.current[id];
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
              defaultCurrency={defaultCurrency}
              onUpdateExpense={updateExpenseItem}
              onUpdateCustomExpenses={(items) => {
                if (isEditing && draftTrip) {
                  setDraftTrip({ ...draftTrip, customExpenses: items });
                } else if (trip) {
                  // Save immediately even outside editing mode
                  const updated = { ...tripToUse!, customExpenses: items };
                  const uid = auth.currentUser?.uid || 'public';
                  setDoc(doc(db, 'users', uid, 'trips', String(trip.id)), { customExpenses: items }, { merge: true })
                    .catch(e => console.error('Failed to save custom expenses:', e));
                }
              }}
            />
          )}
        </div>

          {/* Footer inside Detail scroll container */}
          {activeTab !== 'settlement' && activeTab !== 'gallery' && (
            <div className="w-full shrink-0">
              <Footer className="mt-12" />
            </div>
          )}
        </div>

        {/* Floating Pocket Widget (Positioned at Bottom-Left, perfectly aligned across from Quick Day Jump) */}
        {activeTab === 'timeline' && tripToUse && (
          <FloatingPocketWidget
            trip={tripToUse}
            selectedDate={selectedDate}
            allTripDates={allTripDates}
            isOpen={isPocketWidgetOpen}
            onToggle={() => setIsPocketWidgetOpen(!isPocketWidgetOpen)}
            onAddSpotToTimeline={(spot) => handleDirectAddFromPocket(spot)}
            onSelectSpot={(spot) => {
              if (typeof spot.lat === 'number' && typeof spot.lng === 'number') {
                setRadarFocusedSpot({ lat: spot.lat, lng: spot.lng, title: spot.title });
                setActiveGhostSpotId(spot.id);
              }
            }}
            isEditing={isEditing}
          />
        )}

        {/* Floating Smart Day Quick Jump Indicator & Bar (Swiss Minimal, positioned at bottom-6 right-6) */}
        {activeTab === 'timeline' && allTripDates.length >= 2 && (
          <div 
            className={`fixed bottom-6 right-6 z-40 transition-all duration-300 pointer-events-auto select-none ${
              showQuickJump ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {!isQuickJumpExpanded ? (
              /* Minimized Initial Circular State */
              <button
                type="button"
                onClick={() => {
                  setIsQuickJumpExpanded(true);
                  resetQuickJumpCollapseTimer();
                }}
                className="w-10 h-10 rounded-full bg-[#18181B]/95 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center cursor-pointer hover:bg-black active:scale-95 transition-all text-xs font-mono font-extrabold"
                title="날짜 빠른 이동 (클릭하여 일차 펼치기)"
                aria-label="Expand day quick jump bar"
              >
                {activeSpyDate === 'ALL' ? 'ALL' : `D${Math.max(1, allTripDates.indexOf(activeSpyDate) + 1)}`}
              </button>
            ) : (
              /* Expanded State (Auto-collapses after 3.5s of inactivity) */
              <div 
                onMouseEnter={resetQuickJumpCollapseTimer}
                onTouchStart={resetQuickJumpCollapseTimer}
                className="bg-[#18181B]/95 text-white backdrop-blur-md border border-white/20 shadow-2xl rounded-full p-1 sm:p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200"
              >
                {/* Scroll to Top Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleScrollToTop();
                    resetQuickJumpCollapseTimer();
                  }}
                  className="tap-target w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer shrink-0"
                  title="맨 위로 스크롤 (Scroll to top)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <div className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" />

                {/* Scrollable Day Chips Container */}
                <div 
                  ref={quickJumpChipsRef}
                  className="flex items-center gap-1 max-w-[190px] sm:max-w-[320px] overflow-x-auto hide-scrollbar px-0.5"
                >
                  {/* ALL Chip */}
                  <button
                    type="button"
                    data-quick-date="ALL"
                    onClick={() => {
                      handleQuickJumpToDate('ALL');
                      setTimeout(() => setIsQuickJumpExpanded(false), 500);
                    }}
                    className={`px-2 py-1 rounded-full text-meta sm:text-meta font-extrabold tracking-wider transition-all cursor-pointer shrink-0 ${
                      activeSpyDate === 'ALL'
                        ? 'bg-red-600 text-white shadow-sm scale-105'
                        : 'text-white/70 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    ALL
                  </button>

                  {allTripDates.map((d, idx) => {
                    const dayNum = idx + 1;
                    const isActive = activeSpyDate === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        data-quick-date={d}
                        onClick={() => {
                          handleQuickJumpToDate(d);
                          setTimeout(() => setIsQuickJumpExpanded(false), 500);
                        }}
                        className={`min-w-[26px] h-6 sm:min-w-[28px] sm:h-7 px-1.5 rounded-full flex items-center justify-center text-meta font-mono font-extrabold transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md scale-105'
                            : 'text-white/70 hover:text-white hover:bg-white/15'
                        }`}
                        title={`Day ${dayNum} (${d})`}
                      >
                        D{dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox component */}
      <DetailOverlays s={s} />
    </main>
  );
}
