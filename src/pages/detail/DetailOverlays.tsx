import {
  Image as ImageIcon, MapPin, Loader2, Search, ArrowRight, Check, ArrowRightLeft, X, Upload
} from 'lucide-react';
import { QuickBookingModal } from '../../components/QuickBookingModal';
import { Lightbox } from '../../components/Lightbox';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import type { JourneyDetailState } from './useJourneyDetailState';

export function DetailOverlays({ s }: { s: JourneyDetailState }) {
  const {
    trip, flights, onDelete, onNavigate, showTripDeleteConfirm, setShowTripDeleteConfirm, costModalItem,
    setCostModalItem, isQuickBookingOpen, setIsQuickBookingOpen,
    showSaveSuccessModal, setShowSaveSuccessModal, mapConfirm, setMapConfirm, isLightboxOpen,
    setIsLightboxOpen, lightboxIndex, setLightboxIndex, showAutosaveModal, tripToUse, minDate,
    maxDate, isCoverModalOpen, setIsCoverModalOpen, coverInputUrl, setCoverInputUrl,
    isCoverUploading, coverFileInputRef, handleUpdateTripCover, handleUploadCoverFile,
    handlePasteCoverFromClipboard, galleryAllMeta
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

      {/* Google Maps Confirmation Modal */}
      {mapConfirm && (
        <div 
          onClick={() => setMapConfirm(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F9F8F6] dark:bg-[#181818] border border-black/15 dark:border-white/15 p-5 md:p-6 w-full max-w-xs text-center shadow-2xl rounded-2xl text-black dark:text-white"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 mb-1.5">구글 지도 이동</h3>
            <p className="text-xs font-bold tracking-tight mb-5 leading-relaxed break-keep" style={{ wordBreak: 'keep-all' }}>
              '<span className="text-red-600 dark:text-red-400">{mapConfirm.placeName}</span>' 위치를 구글 지도에서 확인하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMapConfirm(null)}
                className="btn btn-secondary flex-1"
              >
                취소 (N)
              </button>
              <a
                href={mapConfirm.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMapConfirm(null)}
                className="flex-1 py-2 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark hover:opacity-85 text-meta font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm"
              >
                이동 (Y)
              </a>
            </div>
          </div>
        </div>
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

      {/* Swiss Minimal Timeline Cost Detail Modal */}
      {costModalItem && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setCostModalItem(null)}
        >
          <div 
            className="bg-surface dark:bg-surface-dark border-2 border-black dark:border-white p-6 sm:p-8 max-w-sm w-full shadow-2xl flex flex-col gap-5 text-black dark:text-white rounded-none select-none relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-black dark:border-white pb-3">
              <div className="flex flex-col">
                <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60">
                  EXPENSE DETAIL · 비용 상세
                </span>
                <h3 className="text-base sm:text-lg font-extrabold font-sans tracking-tight break-keep mt-0.5">
                  {costModalItem.place}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCostModalItem(null)}
                className="tap-target p-1 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white hover:rotate-90 transition cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cost Display: Large Swiss Minimal Typography */}
            <div className="flex flex-col gap-1 py-1">
              <span className="text-meta font-mono font-bold text-black/60 dark:text-white/60 uppercase tracking-wider">
                AMOUNT (금액)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-red-600 dark:text-red-400">
                  {costModalItem.currency || 'KRW'} {costModalItem.cost}
                </span>
              </div>
            </div>

            {/* Meta Rows: Date, Time, Paid By */}
            <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/10 font-sans text-xs">
              {costModalItem.date && (
                <div className="flex justify-between items-center text-black/70 dark:text-white/70">
                  <span className="font-mono text-black/60 dark:text-white/60 uppercase font-bold">DATE / TIME</span>
                  <span className="font-mono font-bold">{costModalItem.date} {costModalItem.time && `· ${costModalItem.time}`}</span>
                </div>
              )}
              {costModalItem.paidBy && (
                <div className="flex justify-between items-center text-black/70 dark:text-white/70">
                  <span className="font-mono text-black/60 dark:text-white/60 uppercase font-bold">PAID BY (결제자)</span>
                  <span className="font-bold px-2 py-0.5 bg-black/5 dark:bg-white/10">{costModalItem.paidBy}</span>
                </div>
              )}
              {costModalItem.location && (
                <div className="flex justify-between items-start text-black/70 dark:text-white/70 gap-2">
                  <span className="font-mono text-black/60 dark:text-white/60 uppercase font-bold shrink-0">LOCATION</span>
                  <span className="font-medium text-right break-words line-clamp-2">{costModalItem.location}</span>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCostModalItem(null)}
              className="btn btn-primary mt-2 w-full"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>
      )}

      {/* ── Swiss Minimal Cover Image Change Modal ── */}
      {isCoverModalOpen && (
        <div 
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCoverModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#FAF9F6] dark:bg-[#161616] border border-black/20 dark:border-white/20 p-5 shadow-2xl flex flex-col gap-4 font-sans select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-extrabold uppercase tracking-wider text-black dark:text-white font-mono">
                  CHANGE CARD COVER
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/60 dark:text-white/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current / New Preview */}
            <div className="aspect-[16/9] w-full bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 overflow-hidden relative flex items-center justify-center">
              {coverInputUrl ? (
                <img 
                  src={getEffectiveImageUrl(coverInputUrl)} 
                  alt="Cover Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="text-center text-xs font-mono text-black/60 dark:text-white/60">
                  미리보기 이미지가 없습니다.
                </div>
              )}
              {isCoverUploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white text-xs font-mono">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>업로드 중...</span>
                </div>
              )}
            </div>

            {/* URL Input & Action Buttons */}
            <div className="flex flex-col gap-2">
              <label className="text-meta font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                IMAGE URL / UPLOAD / PASTE
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coverInputUrl}
                  onChange={e => setCoverInputUrl(e.target.value)}
                  placeholder="이미지 URL 직접 입력..."
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-[#202020] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white focus:border-black dark:focus:border-white"
                />
                <input
                  type="file"
                  ref={coverFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) await handleUploadCoverFile(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isCoverUploading}
                  className="btn btn-primary flex"
                  title="사진 파일 업로드"
                >
                  <Upload className="w-3 h-3" />
                  <span>UPLOAD</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteCoverFromClipboard}
                  disabled={isCoverUploading}
                  className="px-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white border border-black/15 dark:border-white/15 text-meta font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="클립보드 이미지 또는 URL 붙여넣기"
                >
                  <span>PASTE</span>
                </button>
              </div>
            </div>

            {/* Modal Bottom Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTripCover(coverInputUrl)}
                disabled={!coverInputUrl.trim() || isCoverUploading}
                className="btn btn-primary flex"
              >
                <Check className="w-3.5 h-3.5" />
                <span>APPLY COVER</span>
              </button>
            </div>
          </div>
        </div>
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
      />
    </>
  );
}
