import {
  Trash2, RotateCcw, Sliders, Globe, X, Search,
  Loader2, Plus, Sparkles, Database, Edit
} from 'lucide-react';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import type { ManageHubState } from './useManageHubState';

// v1.3.7: rendered inside SYSTEM one part at a time (`only`): the ticker, trip presets, or the
// database tools and trash. Backdrop, music and map style are each member's own settings now.
export function UtilMode({ s, only }: { s: ManageHubState; only: 'ui' | 'map' | 'system' }) {
  const {
    trashedJourneys, trashedSections, onRestoreJourney, onRestoreMagazineSection,
    presetsList, presetSearchQuery, setPresetSearchQuery, presetThemeFilter,
    setPresetThemeFilter, setShowRestorePresetsConfirm, handleOpenNewPreset, handleOpenEditPreset,
    handleDeletePresetClick, showMarquee, setShowMarquee, homeMarquee, setHomeMarquee,
    homeSpeed, setHomeSpeed, handleContainerScroll, selectedTrashJourneyIds,
    selectedTrashSectionIds, handleToggleSelectAllTrash, handleToggleTrashJourney,
    handleToggleTrashSection, requestPermanentDeleteSingleJourney,
    requestPermanentDeleteSingleSection, handleBatchRestoreSelectedTrash,
    requestBatchDeleteSelected, diagReport, isScanning, isCleaning, cleanLog, setCleanLog,
    handleOneTouchOptimize, isPresetsDirty
  } = s;

  return (
    <div
      onScroll={handleContainerScroll}
      className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-32 flex flex-col gap-8 overflow-y-auto h-full flex-1 animate-in fade-in duration-200"
    >

      {/* 1. UI (홈 화면 비주얼 & 마퀴 설정) */}
      {only === 'ui' && (
        <section className="flex flex-col gap-6 pt-2 pb-6 border-b border-black/15 dark:border-white/15">
          <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-black dark:text-white font-sans">
                TICKER (상단에 흐르는 문구)
              </h3>
            </div>
          </div>

          {/* Marquee Banner */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-black/10 dark:border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                  MARQUEE BANNER
                </span>
                <span className="text-meta text-black/60 dark:text-white/60 font-mono">
                  홈 상단 흐르는 텍스트 배너 설정
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMarquee(!showMarquee)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                  showMarquee
                    ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-black dark:border-white'
                    : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                }`}
              >
                {showMarquee ? 'ON' : 'OFF'}
              </button>
            </div>

            {showMarquee && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-meta font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                    MARQUEE TEXT (한글/영문 흐르는 문구)
                  </label>
                  <input
                    type="text"
                    value={homeMarquee}
                    onChange={e => setHomeMarquee(e.target.value)}
                    placeholder="예: 2026 TRIP LOG · ALL RIGHTS RESERVED"
                    className="px-3 py-2 text-xs font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-meta font-mono">
                    <span className="font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                      MARQUEE SPEED (흐르는 속도)
                    </span>
                    <span className="font-extrabold text-black dark:text-white">
                      {homeSpeed}s
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-meta font-mono text-black/60 dark:text-white/60">FAST (10s)</span>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={homeSpeed}
                      onChange={e => setHomeSpeed(Number(e.target.value))}
                      className="flex-1 accent-black dark:accent-white cursor-pointer"
                    />
                    <span className="text-meta font-mono text-black/60 dark:text-white/60">SLOW (60s)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. TRIP PRESETS (여정 추천 템플릿 관리 - MAP 탭에 통합) */}
      {only === 'map' && (
        <section className="flex flex-col gap-6 pt-2 pb-6 border-b border-black/15 dark:border-white/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/15 dark:border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-black dark:text-white font-sans">
                TRIP PRESETS (여정 추천 템플릿 관리)
              </h3>
              <span className="text-micro px-1.5 py-0.2 bg-red-600 text-white font-mono font-bold">
                {presetsList.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRestorePresetsConfirm(true)}
                className="btn btn-secondary btn-sm flex"
              >
                <RotateCcw className="w-3 h-3" />
                <span>기본 복구</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNewPreset}
                className="btn btn-primary btn-sm flex"
              >
                <Plus className="w-3 h-3" />
                <span>NEW PRESET</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Search & Theme Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/10 dark:border-white/10">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/60 dark:text-white/60" />
              <input
                type="text"
                value={presetSearchQuery}
                onChange={e => setPresetSearchQuery(e.target.value)}
                placeholder="프리셋 검색 (도시, 국가, 제목)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/20 dark:border-white/20 outline-none font-mono"
              />
              {presetSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPresetSearchQuery('')}
                  className="tap-target absolute right-2 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 font-mono">
              {(['all', 'shopping', 'food', 'nature', 'activity', 'art', 'culture'] as const).map(theme => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setPresetThemeFilter(theme)}
                  className={`px-2 py-1 text-meta font-bold uppercase border transition-colors cursor-pointer ${
                    presetThemeFilter === theme
                      ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark border-black dark:border-white'
                      : 'border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-black/40 dark:hover:border-white/40'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Presets Count Badge */}
          <div className="flex items-center justify-between text-[11px] font-mono text-black/60 dark:text-white/60">
            <span>
              TOTAL {presetsList.filter(p => {
                if (presetThemeFilter !== 'all' && p.theme !== presetThemeFilter) return false;
                if (presetSearchQuery.trim()) {
                  const q = presetSearchQuery.trim().toLowerCase();
                  return p.title.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || (p.subtitle && p.subtitle.toLowerCase().includes(q));
                }
                return true;
              }).length} PRESETS
            </span>
            {isPresetsDirty && (
              <span className="text-red-600 dark:text-red-400 font-bold">
                * 변경사항 있음 (저장 필요)
              </span>
            )}
          </div>

          {/* Presets List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presetsList
              .filter(p => {
                if (presetThemeFilter !== 'all' && p.theme !== presetThemeFilter) return false;
                if (presetSearchQuery.trim()) {
                  const q = presetSearchQuery.trim().toLowerCase();
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.country.toLowerCase().includes(q) ||
                    p.city.toLowerCase().includes(q) ||
                    (p.subtitle && p.subtitle.toLowerCase().includes(q))
                  );
                }
                return true;
              })
              .map(preset => (
                <div
                  key={preset.id}
                  className="flex gap-3 p-3 border border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.01] hover:border-black/40 dark:hover:border-white/40 transition-colors group"
                >
                  <img
                    src={getEffectiveImageUrl(preset.coverImg)}
                    alt={preset.title}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover grayscale group-hover:grayscale-0 transition shrink-0 border border-black/10 dark:border-white/10"
                  />
                  <div className="flex flex-col justify-between min-w-0 flex-1">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-micro font-mono font-extrabold bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark px-1.5 py-0.5 uppercase tracking-wider">
                            {preset.country}
                          </span>
                          <span className="text-meta font-mono font-bold text-black/60 dark:text-white/60">
                            {preset.city}
                          </span>
                          <span className="text-micro font-mono px-1 border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60">
                            {preset.durationDays}D
                          </span>
                          <span className="text-micro font-mono font-bold uppercase text-red-600 dark:text-red-400">
                            {preset.theme}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPreset(preset)}
                            className="tap-target p-1 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                            title="수정"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePresetClick(preset)}
                            className="tap-target p-1 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold truncate text-black dark:text-white font-sans">
                        {preset.title}
                      </h4>
                      {preset.subtitle && (
                        <p className="text-meta text-black/60 dark:text-white/60 truncate font-sans mt-0.5">
                          {preset.subtitle}
                        </p>
                      )}
                    </div>

                    {preset.highlights && preset.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {preset.highlights.slice(0, 3).map((h, i) => (
                          <span key={i} className="text-micro font-mono text-black/60 dark:text-white/60 border-l border-black/20 dark:border-white/20 pl-1">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 5. SYSTEM (DB 최적화 및 휴지통) */}
      {only === 'system' && (
        <section className="flex flex-col gap-6 pt-2 pb-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 border-b border-black/15 dark:border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-black dark:text-white font-sans truncate">
                SYSTEM (데이터베이스 진단 & 휴지통) ({trashedJourneys.length + trashedSections.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-black/60 dark:text-white/60 truncate">
              삭제 여정 보관 및 DB 무결성 진단
            </span>
          </div>

          {/* Swiss Minimal One-Touch Optimizer Bar */}
          <div className="border border-black/15 dark:border-white/15 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface dark:bg-surface-dark">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-black dark:text-white" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                  DATABASE OPTIMIZER
                </span>
                {diagReport?.isClean && (
                  <span className="text-micro font-mono font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    100% HEALTHY
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-black/60 dark:text-white/60 truncate">
                {diagReport 
                  ? `ACTIVE: ${diagReport.activeTripsCount} trips (${diagReport.activeTimelineCount} timelines) | ORPHANED: ${diagReport.orphanedTimelineDocs.length + diagReport.orphanedStaysDocs.length + diagReport.orphanedFlightsDocs.length + diagReport.orphanedTransitsDocs.length + diagReport.orphanedMagazineMoments.length} items`
                  : '고아 문서, 폐기 필드 및 로컬 캐시를 안전하게 자동 스캔 및 정리합니다.'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOneTouchOptimize}
              disabled={isScanning || isCleaning}
              className="btn btn-primary btn-sm flex shrink-0"
              title="데이터베이스 무결성을 진단하고 불필요한 고아 문서를 원터치로 정리합니다."
            >
              {isScanning || isCleaning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isScanning ? 'SCANNING...' : 'OPTIMIZING...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ONE-TOUCH OPTIMIZE</span>
                </>
              )}
            </button>
          </div>

          {/* Clean Log Output (if any) */}
          {cleanLog.length > 0 && (
            <div className="border border-black/10 dark:border-white/10 p-3 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-mono space-y-1">
              <div className="flex items-center justify-between text-meta text-black/60 dark:text-white/60 font-bold uppercase mb-1">
                <span>OPTIMIZATION REPORT</span>
                <button type="button" onClick={() => setCleanLog([])} className="hover:text-black dark:hover:text-white cursor-pointer">CLEAR</button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5 text-black/80 dark:text-white/80">
                {cleanLog.map((log, idx) => (
                  <div key={idx} className="truncate">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar: Multi-select & Batch Actions */}
          {(trashedJourneys.length > 0 || trashedSections.length > 0) && (
            <div className="flex items-center justify-between gap-3 p-3 border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex-wrap">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      selectedTrashJourneyIds.length + selectedTrashSectionIds.length === trashedJourneys.length + trashedSections.length &&
                      trashedJourneys.length + trashedSections.length > 0
                    }
                    onChange={handleToggleSelectAllTrash}
                    className="w-4 h-4 rounded border-black/30 dark:border-white/30 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                  />
                  <span>
                    전체 선택 ({selectedTrashJourneyIds.length + selectedTrashSectionIds.length} / {trashedJourneys.length + trashedSections.length})
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedTrashJourneyIds.length === 0 && selectedTrashSectionIds.length === 0}
                  onClick={handleBatchRestoreSelectedTrash}
                  className="btn btn-secondary btn-sm flex"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>선택 복구</span>
                </button>

                <button
                  type="button"
                  disabled={selectedTrashJourneyIds.length === 0 && selectedTrashSectionIds.length === 0}
                  onClick={requestBatchDeleteSelected}
                  className="btn btn-outline-danger btn-sm flex"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 영구 삭제</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty Trash State */}
          {trashedJourneys.length === 0 && trashedSections.length === 0 && (
            <div className="p-12 text-center border border-dashed border-black/15 dark:border-white/15 bg-surface dark:bg-surface-dark flex flex-col items-center justify-center gap-2">
              <Trash2 className="w-8 h-8 text-black/60 dark:text-white/60 stroke-[1.5]" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                휴지통이 비어 있습니다
              </span>
              <span className="text-[11px] font-mono text-black/60 dark:text-white/60">
                삭제된 여정이나 매거진 섹션이 여기에 안전하게 보관됩니다.
              </span>
            </div>
          )}

          {/* Trashed Sections List */}
          {trashedSections.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black/70 dark:text-white/70">
                삭제된 매거진 섹션 ({trashedSections.length})
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {trashedSections.map((sec) => {
                  const isSelected = selectedTrashSectionIds.includes(sec.id);
                  return (
                    <div
                      key={sec.id}
                      onClick={() => handleToggleTrashSection(sec.id)}
                      className={`p-3.5 border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-500/10 shadow-xs'
                          : 'border-black/15 dark:border-white/15 bg-surface dark:bg-surface-dark hover:border-black/30 dark:hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTrashSection(sec.id);
                          }}
                          className="w-4 h-4 rounded border-black/30 dark:border-white/30 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold font-sans uppercase tracking-tight text-black dark:text-white truncate line-through opacity-75">
                            {sec.title}
                          </h4>
                          <span className="text-[11px] font-mono text-black/60 dark:text-white/60 block mt-0.5">
                            {sec.subtitle || '부제목 없음'} · 아이템 {sec.items?.length || 0}개
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onRestoreMagazineSection && onRestoreMagazineSection(sec.id)}
                          className="btn btn-secondary btn-sm flex"
                          title="섹션 복구"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>RESTORE</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => requestPermanentDeleteSingleSection(sec)}
                          className="btn btn-outline-danger btn-sm flex"
                          title="영구 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>DELETE</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trashed Journeys List */}
          {trashedJourneys.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-black/70 dark:text-white/70">
                삭제된 여정 ({trashedJourneys.length})
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {trashedJourneys.map((journey) => {
                  const isSelected = selectedTrashJourneyIds.includes(journey.id);
                  return (
                    <div
                      key={journey.id}
                      onClick={() => handleToggleTrashJourney(journey.id)}
                      className={`p-3.5 border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-500/10 shadow-xs'
                          : 'border-black/15 dark:border-white/15 bg-surface dark:bg-surface-dark hover:border-black/30 dark:hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTrashJourney(journey.id);
                          }}
                          className="w-4 h-4 rounded border-black/30 dark:border-white/30 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600 shrink-0"
                        />
                        <div className="w-14 h-14 aspect-square border border-black/15 dark:border-white/15 shrink-0 overflow-hidden bg-black/10">
                          <img
                            src={getEffectiveImageUrl(journey.img)}
                            alt={journey.title}
                            className="w-full h-full object-cover grayscale opacity-75"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold font-sans uppercase tracking-tight text-black dark:text-white truncate line-through opacity-75">
                            {journey.title}
                          </h4>
                          <span className="text-[11px] font-mono text-black/60 dark:text-white/60 block mt-0.5">
                            {journey.date} · {journey.locationStr}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onRestoreJourney(journey.id)}
                          className="btn btn-secondary btn-sm flex"
                          title="여정 복구"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>RESTORE</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => requestPermanentDeleteSingleJourney(journey)}
                          className="btn btn-outline-danger btn-sm flex"
                          title="영구 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>DELETE</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
