import { Loader2, MapPin } from 'lucide-react';
import { Sheet, SheetCloseButton } from '../../components/Sheet';
import { QuickBookingModal } from '../../components/QuickBookingModal';
import { Lightbox } from '../../components/Lightbox';
import { ConfirmModal } from '../../components/ConfirmModal';
import { findPastStays } from '../../utils/pastStays';
import type { JourneyDetailState } from './useJourneyDetailState';

export function DetailOverlays({ s }: { s: JourneyDetailState }) {
  const {
    trip, flights, onDelete, showTripDeleteConfirm, setShowTripDeleteConfirm, costModalItem,
    setCostModalItem, isQuickBookingOpen, setIsQuickBookingOpen,
    showSaveSuccessModal, setShowSaveSuccessModal, mapConfirm, setMapConfirm, isLightboxOpen,
    setIsLightboxOpen, lightboxIndex, setLightboxIndex, showAutosaveModal, tripToUse, minDate,
    maxDate, galleryAllMeta
  } = s;

  return (
    <>
      <Lightbox 
        isOpen={isLightboxOpen}
        images={galleryAllMeta}
        currentIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />

      {/* Autosave Feedback Toast Modal */}
      {showAutosaveModal && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 shadow-2xl border border-emerald-500/20 rounded-sm font-bold text-xs uppercase tracking-wider flex items-center gap-2 animate-bounce animate-in slide-in-from-bottom-5 duration-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Autosaved</span>
        </div>
      )}

      {/* Google Maps Confirmation */}
      {mapConfirm && (
        <Sheet label="구글 지도 이동" onClose={() => setMapConfirm(null)} tone="paper" panelClassName="sm:max-w-xs">
          <div className="p-5 pt-2 flex flex-col items-center gap-3 text-center">
            <span className="w-11 h-11 rounded-full bg-red-600/10 text-red-600 dark:text-red-400 grid place-items-center"><MapPin className="w-5 h-5" aria-hidden /></span>
            <h2 className="text-[17px] font-extrabold tracking-tight">구글 지도로 이동할까요?</h2>
            <p className="text-[14px] text-black/60 dark:text-white/60 break-keep">
              <b className="text-ink dark:text-ink-dark">{mapConfirm.placeName}</b> 위치를 구글 지도에서 확인합니다.
            </p>
            <div className="w-full grid grid-cols-2 gap-2 pt-1">
              <SheetCloseButton className="btn btn-secondary">취소</SheetCloseButton>
              <a href={mapConfirm.url} target="_blank" rel="noopener noreferrer" onClick={() => setMapConfirm(null)} className="btn btn-primary">이동</a>
            </div>
          </div>
        </Sheet>
      )}
      {/* Save Success Auto-Dismiss Modal */}
      <ConfirmModal
        isOpen={showSaveSuccessModal}
        title="SAVED"
        message="All changes have been successfully saved."
        confirmLabel="OK"
        iconType="check"
        singleButton
        autoDismiss
        autoDismissDuration={2000}
        onConfirm={() => setShowSaveSuccessModal(false)}
        onCancel={() => setShowSaveSuccessModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showTripDeleteConfirm}
        title="DELETE JOURNEY"
        message="Are you sure you want to permanently delete this journey?"
        confirmLabel="Yes (Y)"
        cancelLabel="Cancel (Esc)"
        confirmVariant="danger"
        onConfirm={async () => {
          setShowTripDeleteConfirm(false);
          if (trip && onDelete) {
            await onDelete(trip.id);
          }
        }}
        onCancel={() => setShowTripDeleteConfirm(false)}
      />

      {/* One timeline item's cost */}
      {costModalItem && (
        <Sheet label="비용 상세" onClose={() => setCostModalItem(null)} tone="paper" panelClassName="sm:max-w-sm">
          <div className="p-5 pt-2 flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">비용 상세</span>
              <h2 className="text-[20px] font-extrabold tracking-tight break-keep">{costModalItem.place}</h2>
            </div>
            <div className="rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-1">
              <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">금액</span>
              <span className="text-[28px] font-extrabold font-mono tracking-tight tabular-nums text-red-600 dark:text-red-400">
                {costModalItem.currency || 'KRW'} {costModalItem.cost}
              </span>
            </div>
            {(costModalItem.date || costModalItem.paidBy || costModalItem.location) && (
              <dl className="flex flex-col gap-2.5 text-[14px]">
                {costModalItem.date && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-black/55 dark:text-white/55">날짜 · 시간</dt>
                    <dd className="font-mono font-bold tabular-nums">{costModalItem.date}{costModalItem.time ? ` · ${costModalItem.time}` : ''}</dd>
                  </div>
                )}
                {costModalItem.paidBy && (
                  <div className="flex justify-between items-center gap-3">
                    <dt className="text-black/55 dark:text-white/55">결제자</dt>
                    <dd className="h-7 px-3 inline-flex items-center rounded-full bg-black/[0.06] dark:bg-white/10 font-bold">{costModalItem.paidBy}</dd>
                  </div>
                )}
                {costModalItem.location && (
                  <div className="flex justify-between items-start gap-3">
                    <dt className="text-black/55 dark:text-white/55 shrink-0">장소</dt>
                    <dd className="font-medium text-right break-words line-clamp-2">{costModalItem.location}</dd>
                  </div>
                )}
              </dl>
            )}
            <SheetCloseButton className="btn btn-primary w-full">닫기</SheetCloseButton>
          </div>
        </Sheet>
      )}

      {/* ── 1-CLICK SMART BOOKING SHORTCUT MODAL ── */}
      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
        destination={tripToUse?.locationStr || tripToUse?.title || ''}
        startDate={minDate}
        endDate={maxDate}
        memberCount={tripToUse?.members?.length || 1}
        initialFromCode={flights[0]?.fromCode || 'ICN'}
        initialToCode={flights[0]?.toCode || ''}
        initialKind={s.activeTab === 'stays' ? 'stay' : 'flight'}
        pastStays={s.isQuickBookingOpen ? findPastStays(tripToUse || undefined, [...s.allTrips, ...s.allPlans], s.staysByTrip) : []}
      />
    </>
  );
}
