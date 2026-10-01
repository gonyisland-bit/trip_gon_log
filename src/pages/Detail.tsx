import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Map as MapIcon, LayoutGrid, Clock, Plane, BedDouble, TrainFront, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { SettlementView } from '../components/SettlementView';
import { BoardView } from '../components/board/JourneyBoard';
import { Lightbox } from '../components/Lightbox';
import { Footer } from '../components/Footer';
import { FloatingPocketWidget } from '../components/FloatingPocketWidget';
import { TabType } from '../types';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
// Journey content writes carry owner / access fields (v1.3.6)
import { currentUid, setDoc } from '../utils/ownership';
import { JourneyMagazine, type MagazinePhoto } from '../components/magazine/JourneyMagazine';
import { OPEN_JOURNEY_MAGAZINE, takeDetailIntent } from '../utils/detailIntent';
import { getLiveTripStatus, getUpcomingPlanInfo } from '../utils/tripPlanHelper';
import { notify } from '../utils/feedback';
import { resolveTimelinePlaceName } from '../utils/magazineHelper';
import { useJourneyDetailState, type JourneyDetailPageProps } from './detail/useJourneyDetailState';
import { DetailMapPanel } from './detail/DetailMapPanel';
import { TimelineTab } from './detail/TimelineTab';
import { FlightsTab } from './detail/FlightsTab';
import { StaysTab } from './detail/StaysTab';
import { TransitTab } from './detail/TransitTab';
import { GalleryTab } from './detail/GalleryTab';
import { DetailOverlays } from './detail/DetailOverlays';
import { DetailSkeleton } from '../components/EditorialSkeleton';

const DETAIL_TABS: { id: TabType; label: string; icon: LucideIcon }[] = [
  // The board replaces the old summary (it keeps the 'summary' id, so links and the map overlay still work)
  { id: 'summary', label: 'BOARD', icon: LayoutGrid },
  { id: 'timeline', label: 'TIME', icon: Clock },
  { id: 'flights', label: 'FLIGHT', icon: Plane },
  { id: 'stays', label: 'STAY', icon: BedDouble },
  { id: 'transit', label: 'TRANS', icon: TrainFront },
  // The tabs are the record; the magazine has its own button in the journey header
  { id: 'gallery', label: 'PHOTO', icon: ImageIcon },
];

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
    handleScrollToTop, updateExpenseItem, allGalleryImages
  } = s;

  // ── Magazine (v1.3.6 4-b) ──
  const [magazineOpen, setMagazineOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const uid = currentUid();
  const canEdit = Boolean(isLoggedIn && trip && (!trip.ownerId || trip.ownerId === uid || trip.editors?.includes(uid || '')));
  const isPast = Boolean(trip && !getUpcomingPlanInfo(trip).isPlanOrFuture && !getLiveTripStatus(trip.date).isLive);
  const published = Boolean(trip?.publishedAt);
  const canPublish = canEdit && isPast;

  // Journey cards open the record; the magazine opens when asked for (the magazine hub, the home
  // magazine, a card menu preview). Opened that way it is a reader of its own: closing it goes back
  // to where the member came from instead of revealing the record underneath (v1.3.7).
  const [magazineOnly, setMagazineOnly] = useState(false);
  useEffect(() => {
    if (!trip) return;
    if (takeDetailIntent() === 'magazine') { setMagazineOpen(true); setMagazineOnly(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  // The magazine button in the journey header
  useEffect(() => {
    const open = () => setMagazineOpen(true);
    window.addEventListener(OPEN_JOURNEY_MAGAZINE, open);
    return () => window.removeEventListener(OPEN_JOURNEY_MAGAZINE, open);
  }, []);

  // Captions follow the old magazine: the timeline entry's title, and its place name or the
  // nearest earlier entry's place name (resolveTimelinePlaceName)
  const magazinePhotos: MagazinePhoto[] = useMemo(() => {
    const items = Object.values(groupedTimelineData).flat();
    const byId = new Map(items.map(i => [i.id, i]));
    return (allGalleryImages as any[]).map(p => {
      const item = p.itemId !== undefined ? byId.get(p.itemId) : undefined;
      return {
        url: p.url,
        date: p.date,
        time: p.time,
        title: (item?.place || p.place || '').trim() || undefined,
        place: item ? resolveTimelinePlaceName(item, items, trip || undefined) || undefined : undefined,
      };
    });
  }, [allGalleryImages, groupedTimelineData, trip]);

  const setPublished = async (on: boolean) => {
    if (!trip || publishing) return;
    setPublishing(true);
    try {
      const id = String(trip.id);
      const col = (await getDoc(doc(db, 'users', 'public', 'plans', id)).catch(() => null))?.exists() ? 'plans' : 'trips';
      await setDoc(doc(db, 'users', 'public', col, id), { publishedAt: on ? Date.now() : null }, { merge: true });
      notify(on ? '매거진으로 발행했습니다. 매거진 허브와 홈 매거진에서 볼 수 있습니다.' : '발행을 취소했습니다.', 'success');
    } catch (err) {
      console.error('Publish failed:', err);
      notify('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Early Return (conditional render)
  if (!trip) return <DetailSkeleton />;

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
        className={`w-full md:w-1/2 flex flex-col bg-paper dark:bg-paper-dark max-md:z-10 transition-[height] duration-300 ease-standard flex-grow md:h-full overflow-hidden overflow-x-hidden max-w-full relative ${
          // Open over the map, the sheet starts at the page top: no overlap upward, or its handle would be clipped
          mobileSheetSnap === 'expanded' ? 'max-md:h-full max-md:flex-1' : 'max-md:h-[62dvh] max-md:flex-1 min-h-0 max-md:rounded-t-sheet max-md:-mt-5 max-md:shadow-[0_-8px_24px_rgba(0,0,0,0.12)]'
        }`}
      >
        {/* Mobile Bottom Sheet Grab Handle */}
        <div 
          className="md:hidden flex flex-col items-center justify-center pt-2.5 pb-1 px-4 cursor-pointer select-none touch-none shrink-0 group/grab"
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
          onClick={() => {
            setMobileSheetSnap(prev => prev === 'half' ? 'expanded' : 'half');
          }}
          title="지도/일정 분할 토글"
        >
          {mobileSheetSnap === 'expanded' ? (
            <span className="h-8 px-3.5 inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-meta font-bold text-black/75 dark:text-white/75">
              <MapIcon className="w-3.5 h-3.5" aria-hidden />
              지도 보기
              <ChevronDown className="w-3.5 h-3.5" aria-hidden />
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-10 h-1 bg-black/25 dark:bg-white/25 group-hover/grab:bg-black/40 rounded-full transition-colors" />
              <ChevronUp className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
            </div>
          )}
        </div>
        
        {/* Tab Headers - Unified Single-line Sleek Design (BOARD, TIME, FLIGHT, STAY, TRANS, PHOTO) */}
        <div role="tablist" className="relative flex overflow-x-hidden flex-nowrap shrink-0 mx-3 sm:mx-4 mt-1 md:mt-3 mb-2 p-1 rounded-full bg-black/[0.06] dark:bg-white/10 h-12 sm:h-11 md:h-12 xl:h-11">
          {/* Active tab block slides between tabs */}
          {DETAIL_TABS.some(t => t.id === activeTab) && (
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-1 rounded-full bg-raised dark:bg-raised-dark shadow-sm pointer-events-none transition-transform duration-base ease-standard motion-reduce:transition-none"
              style={{
                width: `calc((100% - 8px) / ${DETAIL_TABS.length})`,
                transform: `translateX(${DETAIL_TABS.findIndex(t => t.id === activeTab) * 100}%)`,
              }}
            />
          )}
          {DETAIL_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setExpandedItemId(null);
              }}
              // From md the list is half the window: icon over label until xl, so all six tabs fit
              title={tab.label}
              className={`relative z-[1] flex-1 min-w-0 h-full px-0.5 sm:px-2 flex flex-col sm:flex-row md:flex-col xl:flex-row items-center justify-center gap-0.5 sm:gap-1.5 md:gap-0.5 xl:gap-1.5 text-micro sm:text-meta md:text-micro xl:text-xs font-bold uppercase tracking-wider rounded-full transition-colors duration-base active:scale-[0.98] whitespace-nowrap cursor-pointer font-sans select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                tab.id === 'summary'
                  ? 'text-red-600 dark:text-red-400'
                  : activeTab === tab.id
                  ? 'text-ink dark:text-ink-dark'
                  : 'text-black/60 dark:text-white/60 hover:text-ink dark:hover:text-ink-dark'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="leading-none max-w-full truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div 
          ref={tabContentRef}
          className="flex-grow flex flex-col relative overflow-y-auto overflow-x-hidden w-full h-full bg-transparent"
        >
          {/* A journey that is over: tidy the record, then publish it as a magazine */}
          {canPublish && !published && activeTab === 'summary' && (
            <div className="mx-3 sm:mx-4 mb-2 p-3.5 rounded-card bg-amber-500/10 flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-[13px] leading-snug text-black/75 dark:text-white/80 min-w-0 flex-1 basis-56 break-keep">
                다녀온 여행이에요. 실제 시간에 맞춰 일정과 사진을 정리했다면 매거진으로 발행하세요.
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMagazineOpen(true)}>미리보기</button>
                <button type="button" className="btn btn-accent btn-sm" onClick={() => setPublished(true)} disabled={publishing}>발행</button>
              </div>
            </div>
          )}

          {/* BOARD TAB: the first thing a journey shows */}
          {activeTab === 'summary' && tripToUse && (
            <div className="px-3 sm:px-4 pb-24">
              <BoardView
                embedded
                trip={tripToUse}
                timelineData={timelineData}
                flights={isEditing ? draftFlights : flights}
                stays={isEditing ? draftStays : stays}
                transits={isEditing ? draftTransits : transits}
                onOpenItem={(tab, itemId) => {
                  setActiveTab(tab as TabType);
                  setExpandedItemId(itemId);
                }}
              />
            </div>
          )}
          
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
                className="w-10 h-10 rounded-full bg-ink/95 text-white shadow-xl flex items-center justify-center cursor-pointer hover:bg-black active:scale-95 transition text-xs font-mono font-extrabold"
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
                className="bg-ink/95 text-white shadow-2xl rounded-full p-1 sm:p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200"
              >
                {/* Scroll to Top Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleScrollToTop();
                    resetQuickJumpCollapseTimer();
                  }}
                  className="tap-target w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-95 transition text-white/80 hover:text-white cursor-pointer shrink-0"
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

      {magazineOpen && tripToUse && (
        <JourneyMagazine
          trip={tripToUse}
          photos={magazinePhotos}
          days={allTripDates}
          canPublish={canPublish}
          published={published}
          onPublish={() => setPublished(true)}
          onUnpublish={() => setPublished(false)}
          onClose={() => {
            setMagazineOpen(false);
            if (magazineOnly) { setMagazineOnly(false); window.history.back(); }
          }}
          onShowRecord={() => { setMagazineOnly(false); setMagazineOpen(false); setActiveTab('timeline' as TabType); }}
        />
      )}
    </main>
  );
}
