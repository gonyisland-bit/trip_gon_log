// Calendar hub section (moved from CalendarHub.tsx, unchanged). Reads everything from the state hook.
import React from 'react';
import { Plus, X } from 'lucide-react';
import { getWeatherMeta } from '../../utils/weatherApi';
import type { CalendarHubState } from './useCalendarHubState';

export function CalendarDayPeek({ s }: { s: CalendarHubState }) {
  const {
    setCurrentMonth,
    tooltipRef,
    setSelectedYearDate,
    hoveredTooltip,
    setHoveredTooltip,
    quickViewDate,
    isQuickViewAnimOpen,
    quickViewRef,
    isPeekExpanded,
    setIsPeekExpanded,
    peekTouchYRef,
    closeQuickView,
    viewMode,
    toggleViewMode,
    setSelectedRange,
    setDragAnchorDate,
    openNewEventModal,
  } = s;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Date Hover / Tap Information Modal Tooltip (Swiss Minimal)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {hoveredTooltip && (() => {
        const isHolidayOnly = hoveredTooltip.items.length === 0 && Boolean(hoveredTooltip.holidayName);

        const handleNavigateFromTooltip = (e: React.MouseEvent) => {
          if (viewMode === 'year') {
            e.stopPropagation();
            const parts = hoveredTooltip.dateStr.split('-');
            const mIdx = parseInt(parts[1], 10) - 1;
            setHoveredTooltip(null);
            setSelectedYearDate(null);
            if (!isNaN(mIdx)) setCurrentMonth(mIdx);
            setSelectedRange({ start: hoveredTooltip.dateStr, end: hoveredTooltip.dateStr });
            setDragAnchorDate(hoveredTooltip.dateStr);
            toggleViewMode('month');
          }
        };

        if (isHolidayOnly) {
          return (
            <div
              ref={tooltipRef}
              onClick={handleNavigateFromTooltip}
              className={`fixed z-50 pointer-events-auto -translate-x-1/2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/95 dark:bg-zinc-900/95 text-white border border-white/20 shadow-xl flex items-center gap-2 text-xs font-mono select-none animate-in fade-in zoom-in-95 duration-150 ${
                viewMode === 'year' ? 'cursor-pointer hover:border-red-500 hover:scale-[1.02] active:scale-95 transition' : ''
              } ${hoveredTooltip.placement === 'bottom' ? 'translate-y-0 mt-2' : '-translate-y-full mb-2'}`}
              style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
              title={viewMode === 'year' ? "클릭하여 월달력으로 이동" : undefined}
            >
              <span className="font-extrabold text-red-500 tracking-wider">
                {hoveredTooltip.dateStr.replace(/-/g, '.')}
              </span>
              <span className="text-white/60">|</span>
              <span className="text-red-400 font-bold whitespace-nowrap">
                {hoveredTooltip.holidayName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredTooltip(null);
                  setSelectedYearDate(null);
                }}
                className="tap-target text-white/60 hover:text-white transition-colors ml-0.5 p-0.5 cursor-pointer"
                title="닫기"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        }

        return (
          <div
            ref={tooltipRef}
            onClick={handleNavigateFromTooltip}
            className={`fixed z-50 pointer-events-auto -translate-x-1/2 px-3.5 py-2.5 rounded-lg bg-black/95 dark:bg-zinc-900/95 text-white border border-white/20 shadow-2xl min-w-[180px] max-w-xs animate-in fade-in zoom-in-95 duration-150 select-none ${
              viewMode === 'year' ? 'cursor-pointer hover:border-red-500 transition-colors' : ''
            } ${hoveredTooltip.placement === 'bottom' ? 'translate-y-0 mt-2' : '-translate-y-full mb-2'}`}
            style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
            title={viewMode === 'year' ? "클릭하여 월달력으로 이동" : undefined}
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/15 text-meta font-mono">
              <span className="font-extrabold text-red-500 tracking-wider">
                {hoveredTooltip.dateStr.replace(/-/g, '.')}
              </span>
              <div className="flex items-center gap-1.5">
                {hoveredTooltip.holidayName && (
                  <span className="text-red-400 font-bold truncate max-w-[100px]">
                    {hoveredTooltip.holidayName}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredTooltip(null);
                    setSelectedYearDate(null);
                  }}
                  className="tap-target text-white/60 hover:text-white transition-colors p-0.5 cursor-pointer"
                  title="닫기"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              {hoveredTooltip.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: it.categoryColor || (it.isPlan ? '#F59E0B' : '#FF4500') }}
                    />
                    <span className="font-sans font-bold truncate text-white">
                      {it.title}
                    </span>
                  </div>
                  {it.days && (
                    <span className="text-meta font-mono text-white/60 shrink-0 font-bold">
                      {it.days === 1 ? '1 DAY' : `${it.days} DAYS`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Swiss Minimal Quick View Bottom Sheet / Popover (Smooth Slide) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {quickViewDate && (
        <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center px-2 sm:px-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
          <div
            ref={quickViewRef}
            role="region"
            aria-label="선택한 날짜"
            className={`pointer-events-auto w-full max-w-md rounded-card bg-surface/95 dark:bg-surface-dark/95 shadow-[0_8px_32px_rgba(0,0,0,0.25)] text-black dark:text-white select-none transition-[transform,opacity] duration-300 ease-out ${
              isQuickViewAnimOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {/* Grip: 탭하면 펼침/접힘, 아래로 스와이프하면 접힘 후 닫힘, 위로 스와이프하면 펼침 */}
            <div
              className="flex items-center justify-center h-5 cursor-pointer touch-none"
              onClick={() => setIsPeekExpanded(v => !v)}
              onTouchStart={(e) => { peekTouchYRef.current = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const y0 = peekTouchYRef.current;
                peekTouchYRef.current = null;
                if (y0 === null) return;
                const dy = e.changedTouches[0].clientY - y0;
                if (dy > 30) { if (isPeekExpanded) setIsPeekExpanded(false); else closeQuickView(); }
                else if (dy < -30) setIsPeekExpanded(true);
              }}
              aria-label={isPeekExpanded ? '접기' : '펼치기'}
            >
              <span className="w-8 h-0.5 bg-black/25 dark:bg-white/25" />
            </div>

            {/* 요약 한 줄: 날짜 / 날씨 / 일정 수 / 추가 / 닫기 */}
            <div className="flex items-center gap-2 px-3 pb-3">
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="text-sm font-extrabold font-mono tabular-nums shrink-0">
                  {quickViewDate.dateStr.slice(5).replace('-', '.')}
                </span>
                {quickViewDate.holidayName ? (
                  <span className="text-meta font-bold text-red-600 dark:text-red-400 truncate">{quickViewDate.holidayName}</span>
                ) : (
                  <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate">
                    {quickViewDate.items.length > 0 ? `일정 ${quickViewDate.items.length}` : '일정 없음'}
                  </span>
                )}
              </div>
              {quickViewDate.weather && (() => {
                const meta = getWeatherMeta(quickViewDate.weather.weatherCode, quickViewDate.weather.precipitationProb);
                const IconComp = meta.icon;
                return (
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold shrink-0">
                    <IconComp className={`w-4 h-4 ${meta.colorClass}`} />
                    <span className="tabular-nums">
                      <span className="text-red-600 dark:text-red-400">{quickViewDate.weather.tempMax}°</span>
                      <span className="text-black/40 dark:text-white/40">/</span>
                      <span className="text-blue-600 dark:text-blue-400">{quickViewDate.weather.tempMin}°</span>
                    </span>
                  </div>
                );
              })()}
              <button
                type="button"
                onClick={() => { const d = quickViewDate.dateStr; openNewEventModal(d, d); }}
                className="tap-target w-8 h-8 flex items-center justify-center bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark hover:opacity-85 transition-opacity cursor-pointer shrink-0"
                aria-label="일정 추가"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={closeQuickView}
                className="tap-target w-8 h-8 flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 펼침: 그날의 일정 */}
            {isPeekExpanded && (
              <div className="px-3 pb-3 border-t border-black/10 dark:border-white/10 pt-3 max-h-[40dvh] overflow-y-auto overscroll-contain">
                {quickViewDate.items.length === 0 ? (
                  <p className="text-xs font-mono text-black/60 dark:text-white/60">이 날짜에는 일정이 없습니다.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {quickViewDate.items.map((it, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-thumb bg-black/[0.03] dark:bg-white/[0.06]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: it.categoryColor || (it.isPlan ? '#3b82f6' : '#ef4444') }} />
                          <span className="text-sm font-bold truncate">{it.title}</span>
                        </div>
                        {it.days && <span className="text-meta font-mono font-bold text-black/60 dark:text-white/60 shrink-0">{it.days}D</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
