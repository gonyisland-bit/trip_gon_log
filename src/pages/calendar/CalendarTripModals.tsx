// Calendar hub section (moved from CalendarHub.tsx, unchanged). Reads everything from the state hook.
import { ChevronRight, MapPin, ArrowRight, Plane, X } from 'lucide-react';
import { parseTripDateRange, getDaysDifference } from './calendarData';
import type { CalendarHubState } from './useCalendarHubState';

export function CalendarTripPreview({ s }: { s: CalendarHubState }) {
  const {
    viewingTrip,
    setViewingTrip,
    executeNavigateToTrip,
  } = s;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Journey Preview Modal (Swiss Minimal Editorial Card)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingTrip && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setViewingTrip(null)}
        >
          <div 
            className="w-full max-w-sm bg-surface dark:bg-surface-dark rounded-card shadow-2xl p-5 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Journey Type Badge & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                <span className="text-meta font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-500">
                  {viewingTrip.isPlan ? 'TRAVEL PLAN' : 'JOURNEY LOG'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingTrip(null)}
                className="tap-target p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="닫기 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3">
              <div>
                <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block mb-0.5">
                  TITLE
                </span>
                <h3 className="text-xl font-extrabold text-black dark:text-white font-satoshi tracking-tight leading-tight">
                  {viewingTrip.trip.title}
                </h3>
              </div>

              <div className="flex items-baseline justify-between py-2 border-y border-black/10 dark:border-white/10">
                <div>
                  <span className="text-meta font-mono font-bold uppercase tracking-widest text-black/60 dark:text-white/60 block">
                    PERIOD
                  </span>
                  <span className="font-mono text-sm font-bold text-black dark:text-white">
                    {viewingTrip.trip.date}
                  </span>
                </div>
                {(() => {
                  const range = parseTripDateRange(viewingTrip.trip.date);
                  if (range) {
                    const days = getDaysDifference(range.start, range.end);
                    return (
                      <span className="font-mono text-xs font-extrabold text-red-600 dark:text-red-400">
                        {days} DAYS
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {(viewingTrip.trip.locationStr || (viewingTrip.trip.tags && viewingTrip.trip.tags.length > 0)) && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-black/60 dark:text-white/60">
                  <MapPin className="w-3 h-3 text-black/60 dark:text-white/60" />
                  <span>{viewingTrip.trip.locationStr || viewingTrip.trip.tags.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Action: Enter Journey Arrow Button (비행기 전환 모션과 함께 상세 페이지 진입) */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  const t = viewingTrip.trip;
                  const d = viewingTrip.dateStr;
                  setViewingTrip(null);
                  executeNavigateToTrip(t, d);
                }}
                className="btn btn-primary w-full flex"
              >
                <span>OPEN JOURNEY</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export function CalendarYearTrips({ s }: { s: CalendarHubState }) {
  const {
    currentYear,
    setCurrentYear,
    setCurrentMonth,
    toggleViewMode,
    isYearTripsModalOpen,
    setIsYearTripsModalOpen,
    currentYearJourneys,
  } = s;

  return (
    <>
      {/* ──────────────── YEAR TRIPS LIST MODAL (Swiss Minimal) ──────────────── */}
      {isYearTripsModalOpen && (
        <div 
          onClick={() => setIsYearTripsModalOpen(false)}
          className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-surface dark:bg-surface-dark rounded-card shadow-2xl p-6 sm:p-7 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-baseline gap-2.5">
                <span className="text-xl sm:text-2xl font-extrabold font-satoshi tracking-tight text-black dark:text-white uppercase">
                  {currentYear} JOURNEYS
                </span>
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                  {currentYearJourneys.length === 1 ? '1 TRIP' : `${currentYearJourneys.length} TRIPS`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsYearTripsModalOpen(false)}
                className="tap-target w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Journeys List */}
            <div className="py-4 overflow-y-auto divide-y divide-black/10 dark:divide-white/10 flex-1">
              {currentYearJourneys.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-black/60 dark:text-white/60 uppercase">
                  NO JOURNEYS RECORDED IN {currentYear}
                </div>
              ) : (
                currentYearJourneys.map((item, idx) => {
                  const sParts = item.range.start.split('-');
                  const eParts = item.range.end.split('-');
                  const sFormatted = `${sParts[0]}.${sParts[1]}.${sParts[2]}`;
                  const eFormatted = `${eParts[0]}.${eParts[1]}.${eParts[2]}`;
                  const dateRangeStr = sFormatted === eFormatted ? sFormatted : `${sFormatted} - ${eFormatted}`;
                  const daysCount = Math.max(1, Math.round((new Date(item.range.end).getTime() - new Date(item.range.start).getTime()) / (1000 * 60 * 60 * 24)) + 1);

                  const targetYear = parseInt(sParts[0], 10);
                  const targetMonth = parseInt(sParts[1], 10) - 1;

                  return (
                    <div
                      key={`year-modal-trip-${item.journey.id || idx}`}
                      onClick={() => {
                        setCurrentYear(targetYear);
                        setCurrentMonth(targetMonth);
                        toggleViewMode('month');
                        setIsYearTripsModalOpen(false);
                      }}
                      className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4 cursor-pointer group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      title="클릭하여 해당 월 달력으로 이동"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold font-satoshi text-black dark:text-white group-hover:text-red-600 transition-colors truncate">
                            {item.journey.title}
                          </span>
                          {item.isPlan && (
                            <span className="text-micro font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              PLAN
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-black/60 dark:text-white/60">
                          {dateRangeStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-meta font-mono font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                          {daysCount === 1 ? '1 DAY' : `${daysCount} DAYS`}
                        </span>
                        <ChevronRight className="w-4 h-4 text-black/60 dark:text-white/60 group-hover:text-red-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-mono text-black/60 dark:text-white/60 shrink-0">
              <span>클릭 시 해당 월 달력으로 이동합니다</span>
              <button
                type="button"
                onClick={() => setIsYearTripsModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
