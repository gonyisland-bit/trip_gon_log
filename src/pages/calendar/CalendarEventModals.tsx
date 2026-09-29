// Calendar hub section (moved from CalendarHub.tsx, unchanged). Reads everything from the state hook.
import { Calendar as CalendarIcon, Trash2, Edit3, X, Check, Share2 } from 'lucide-react';
import { EVENT_CATEGORIES, getDaysDifference } from './calendarData';
import type { CalendarHubState } from './useCalendarHubState';

export function CalendarEventModals({ s }: { s: CalendarHubState }) {
  const {
    viewingEvent,
    setViewingEvent,
    shareCopied,
    isEventModalOpen,
    editingEvent,
    eventFormTitle,
    setEventFormTitle,
    eventFormStartDate,
    setEventFormStartDate,
    eventFormEndDate,
    setEventFormEndDate,
    eventFormCategory,
    setEventFormCategory,
    eventFormMemo,
    setEventFormMemo,
    isConfirmingDelete,
    setIsConfirmingDelete,
    handleShareEvent,
    openEditEventModal,
    closeEventModal,
    handleSaveEvent,
    handleDeleteEvent,
  } = s;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Event Add / Edit Modal                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-surface dark:bg-surface-dark rounded-card shadow-2xl p-5 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                <h3 className="text-base sm:text-lg font-extrabold font-satoshi tracking-tight uppercase text-black dark:text-white">
                  {editingEvent ? 'EDIT SCHEDULE' : 'NEW SCHEDULE'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEventModal}
                className="tap-target p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="mt-5 space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 도쿄 출장, 가족 모임, 프로젝트 마감"
                  value={eventFormTitle}
                  onChange={(e) => setEventFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-thumb border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-base sm:text-sm font-bold text-black dark:text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
                />
              </div>

              {/* Unified Date & Period Inputs (No overlapping or overflow) */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  DATE & PERIOD *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 min-w-0 w-full max-w-full">
                  <div className="min-w-0 w-full max-w-full relative overflow-hidden box-border">
                    <span className="text-meta font-mono text-black/60 dark:text-white/60 block mb-1">시작일</span>
                    <input
                      type="date"
                      required
                      value={eventFormStartDate}
                      onChange={(e) => {
                        setEventFormStartDate(e.target.value);
                        if (eventFormEndDate < e.target.value) {
                          setEventFormEndDate(e.target.value);
                        }
                      }}
                      className="block w-full max-w-full box-border min-w-0 pl-2.5 pr-1 py-2 rounded-thumb border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="min-w-0 w-full max-w-full relative overflow-hidden box-border">
                    <span className="text-meta font-mono text-black/60 dark:text-white/60 block mb-1">종료일</span>
                    <input
                      type="date"
                      required
                      min={eventFormStartDate}
                      value={eventFormEndDate}
                      onChange={(e) => setEventFormEndDate(e.target.value)}
                      className="block w-full max-w-full box-border min-w-0 pl-2.5 pr-1 py-2 rounded-thumb border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-sm font-mono font-bold text-black dark:text-white outline-none focus:border-red-600 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Category Radio Chips */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  CATEGORY
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EVENT_CATEGORIES.map(cat => {
                    const isSelected = eventFormCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEventFormCategory(cat.id)}
                        className={`h-9 px-3 rounded-full border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400 shadow-2xs'
                            : 'border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 mb-1.5">
                  MEMO (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  placeholder="참고 사항, 항공편, 숙소 예약 번호 등 간단한 메모"
                  value={eventFormMemo}
                  onChange={(e) => setEventFormMemo(e.target.value)}
                  className="w-full px-3 py-2 rounded-thumb border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-base sm:text-sm text-black dark:text-white outline-none focus:border-red-600 resize-none"
                />
              </div>

              {/* Action Buttons with Safe Delete Confirmation */}
              <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
                {editingEvent ? (
                  <div className="flex items-center">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingDelete(false);
                            handleDeleteEvent(editingEvent.id);
                          }}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="h-9 px-3 rounded-full border border-red-600/30 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        title="일정 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono font-bold">DELETE</span>
                      </button>
                    )}
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      closeEventModal();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* View-Only Event Modal (Swiss Minimal Card & Top Edit Icon)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingEvent && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setViewingEvent(null)}
        >
          <div 
            className="w-full max-w-md bg-surface dark:bg-surface-dark rounded-card shadow-2xl p-6 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Category, Edit Icon, Share, Close */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              {(() => {
                const cat = EVENT_CATEGORIES.find(c => c.id === viewingEvent.category) || EVENT_CATEGORIES[0];
                const CatIcon = cat.icon;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-meta font-mono font-bold px-2 py-0.5 rounded-2xs flex items-center gap-1.5 ${cat.badgeClass}`}>
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-meta font-mono text-black/60 dark:text-white/60 uppercase">
                      EVENT DETAIL
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-1">
                {/* Minimal Edit Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    const evt = viewingEvent;
                    setViewingEvent(null);
                    openEditEventModal(evt);
                  }}
                  className="tap-target p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="일정 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => handleShareEvent(viewingEvent)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer relative"
                  title="일정 공유 (링크 / 텍스트 복사)"
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setViewingEvent(null)}
                  className="tap-target p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Share Copied Toast */}
            {shareCopied && (
              <div className="py-1 px-3 mt-3 bg-emerald-600 text-white font-mono text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
                Copied to clipboard
              </div>
            )}

            {/* Card Content: Swiss Minimal Typography */}
            <div className="mt-5 space-y-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block mb-1">
                  SCHEDULE TITLE
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-black dark:text-white font-satoshi tracking-tight">
                  {viewingEvent.title}
                </h2>
              </div>

              {/* Date & Duration */}
              <div className="py-3 border-y border-black/10 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block">
                    DATE & PERIOD
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-black dark:text-white mt-0.5 block">
                    {viewingEvent.startDate === (viewingEvent.endDate || viewingEvent.startDate)
                      ? viewingEvent.startDate
                      : `${viewingEvent.startDate} — ${viewingEvent.endDate}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block">
                    TOTAL
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-red-600 dark:text-red-400 mt-0.5 block">
                    {getDaysDifference(viewingEvent.startDate, viewingEvent.endDate || viewingEvent.startDate)} DAYS
                  </span>
                </div>
              </div>

              {/* Memo */}
              {viewingEvent.memo ? (
                <div>
                  <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block mb-1">
                    MEMO / NOTE
                  </span>
                  <p className="text-sm font-sans text-black/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed bg-black/[0.02] dark:bg-white/[0.03] p-3 border-l-2 border-black/20 dark:border-white/20">
                    {viewingEvent.memo}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
