import {
  ChevronUp, ChevronDown, Save, Trash2, RotateCcw, RotateCw, Check, Sliders, X, Image as ImageIcon,
  Search, Loader2, Plus, BookOpen, Sparkles, Layout, RefreshCw
} from 'lucide-react';
import { Trip, Plan, MagazineItem, TimelineItem } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { resolveTimelinePlaceName } from '../../utils/magazineHelper';
import type { ManageHubState } from './useManageHubState';

export function MagazineMode({ s }: { s: ManageHubState }) {
  const {
    trips, timelineData, hubMainTitle, setHubMainTitle, hubSubtitle, setHubSubtitle, hubBadgeText,
    setHubBadgeText, hubVolumeText, setHubVolumeText, isHubHeaderOpen, setIsHubHeaderOpen,
    isSavingHubHeader, hubHeaderSaveSuccess, handleSaveHubHeader, selectedMagCardId,
    setSelectedMagCardId, localJourneys, sectionsList, activeMagSectionId, setActiveMagSectionId,
    setMomentsList, selectedTripForMoments, setSelectedTripForMoments, momentSearchQuery,
    setMomentSearchQuery, isSavingMagazine, magazineSaveSuccess, showAddSectionModal,
    setShowAddSectionModal, newSectionTitle, setNewSectionTitle, newSectionSubtitle,
    setNewSectionSubtitle, showAutoGenerateModal, setShowAutoGenerateModal,
    selectedTripForAutoGenerate, setSelectedTripForAutoGenerate, existingTripIds, magUndoStack,
    magRedoStack, handleOpenRestoreModal, currentMagSection, title, setShowQuickPhotoPicker,
    inlineAddMenuCardId, setInlineAddMenuCardId, handleContainerScroll, handleMagazineUndo,
    handleMagazineRedo, safeStr, candidateTimelineItems, handleAddSection,
    handleAutoGenerateSectionFromTrip, handleDeleteSection, handleMoveSection,
    handleUpdateSectionField, handleAddItemToCurrentSection, handleAddTextCardToCurrentSection,
    handleRemoveItemFromCurrentSection, handleMoveItemInCurrentSection,
    handleUpdateItemInCurrentSection, handleSetAsHeroFromItem, isSyncingMagazine,
    handleRefreshAndSyncMagazine, handleSaveMagazine
  } = s;

  return (
    <div
      onScroll={handleContainerScroll}
      className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-60px)] animate-in fade-in duration-200"
    >

      {/* Top Bar with Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black dark:border-white pb-4">
        <div>
          <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
            EDITORIAL MAGAZINE CURATION
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
            MAGAZINE SETTING
          </h2>
          <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
            [매거진 허브 메인 소개글 및 이슈 섹션별 에디토리얼 화보와 스토리 모먼트 관리]
          </p>
        </div>
      </div>

      {/* 0. Magazine Hub Main Header & Intro Configuration Accordion (허브 메인 내용 편집 기능) */}
      <div className="flex flex-col border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setIsHubHeaderOpen(prev => !prev)}
          className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white font-['Noto_Sans_KR',sans-serif]">
              매거진 허브 메인 헤더 & 소개글 설정 (MAGAZINE HUB MAIN HEADER)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black uppercase">
              HUB CONFIG
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
              {isHubHeaderOpen ? '접기 ▲' : '펼치기 ▼'}
            </span>
          </div>
        </button>

        {isHubHeaderOpen && (
          <div className="p-4 sm:p-6 flex flex-col gap-4 border-t border-black/10 dark:border-white/10 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Badge Text */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                  HUB BADGE TEXT (상단 태그 텍스트)
                </label>
                <input
                  type="text"
                  value={hubBadgeText}
                  onChange={e => setHubBadgeText(e.target.value)}
                  placeholder="e.g. CURATED ARCHIVE"
                  className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                />
              </div>

              {/* Volume Text */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                  HUB VOLUME TEXT (발행 연도 / 볼륨)
                </label>
                <input
                  type="text"
                  value={hubVolumeText}
                  onChange={e => setHubVolumeText(e.target.value)}
                  placeholder="e.g. VOL. 2026"
                  className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                />
              </div>
            </div>

            {/* Main Title */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                MAIN HEADLINE TITLE (허브 메인 대형 헤드라인 타이틀)
              </label>
              <input
                type="text"
                value={hubMainTitle}
                onChange={e => setHubMainTitle(e.target.value)}
                placeholder="e.g. A VISUAL ARCHIVE OF JOURNEYS, CURATED STORIES & MOMENTS"
                className="px-3 py-2 text-xs font-satoshi font-bold uppercase bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              />
            </div>

            {/* Subtitle */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                INTRO SUBTITLE / DESCRIPTION (허브 소개 및 설명 문구)
              </label>
              <textarea
                rows={2}
                value={hubSubtitle}
                onChange={e => setHubSubtitle(e.target.value)}
                placeholder="e.g. 여행의 찬란한 순간과 에피소드를 엄선하여 잡지 형식으로 기록한 매거진 컬렉션입니다."
                className="px-3 py-2 text-xs font-['Noto_Sans_KR',sans-serif] bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white resize-none"
              />
            </div>

            {/* Save Button for Hub Header */}
            <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-[11px] font-mono text-black/50 dark:text-white/50 font-['Noto_Sans_KR',sans-serif]">
                * 수정 후 [SAVE MAGAZINE HUB HEADER]를 누르면 매거진 허브 메인에 즉시 반영됩니다.
              </span>
              <button
                type="button"
                onClick={handleSaveHubHeader}
                disabled={isSavingHubHeader}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-red-600 dark:hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer font-['Noto_Sans_KR',sans-serif]"
              >
                {isSavingHubHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{hubHeaderSaveSuccess ? 'SAVED!' : 'SAVE MAGAZINE HUB HEADER'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Section Selector & Action Bar (컴팩트 드롭다운 + 순서이동/삭제 + NEW 액션 바) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-black/15 dark:border-white/15">
        {/* Left: Compact Section Select & Reorder/Delete */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 shrink-0">
            SECTION:
          </span>
          <select
            value={activeMagSectionId}
            onChange={e => {
              const nextId = e.target.value;
              const sec = sectionsList.find(s => s.id === nextId);
              if (sec) {
                setActiveMagSectionId(sec.id);
                setMomentsList(sec.items || []);
                setSelectedMagCardId(null);
                sessionStorage.setItem('lastMagazineSectionId', sec.id);
              }
            }}
            className="px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white rounded-none cursor-pointer focus:border-black dark:focus:border-white min-w-[200px] max-w-full sm:max-w-[340px]"
          >
            {sectionsList.map((sec, idx) => (
              <option key={sec.id} value={sec.id}>
                {String(idx + 1).padStart(2, '0')}. {sec.title} ({sec.items?.length || 0} stories)
              </option>
            ))}
          </select>

          {/* Current Section Quick Actions (Reorder & Delete) */}
          {(() => {
            const activeIdx = sectionsList.findIndex(s => s.id === activeMagSectionId);
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => activeIdx > 0 && handleMoveSection(activeIdx, 'up')}
                  disabled={activeIdx <= 0}
                  className="p-1.5 border border-black/20 dark:border-white/20 bg-white dark:bg-[#161616] text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer transition-colors"
                  title="섹션 앞으로 이동"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => activeIdx < sectionsList.length - 1 && handleMoveSection(activeIdx, 'down')}
                  disabled={activeIdx >= sectionsList.length - 1}
                  className="p-1.5 border border-black/20 dark:border-white/20 bg-white dark:bg-[#161616] text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer transition-colors"
                  title="섹션 뒤로 이동"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(activeMagSectionId)}
                  disabled={sectionsList.length <= 1}
                  className="p-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-20 cursor-pointer transition-colors"
                  title={sectionsList.length <= 1 ? "최소 1개의 섹션은 유지되어야 합니다" : "현재 섹션 삭제"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}
        </div>

        {/* Right: Undo/Redo & Simplified NEW Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 border-r border-black/15 dark:border-white/15 pr-2 mr-1">
            <button
              type="button"
              onClick={handleMagazineUndo}
              disabled={magUndoStack.length === 0}
              className="p-1.5 border border-black/20 dark:border-white/20 text-black dark:text-white disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="실행 취소 (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleMagazineRedo}
              disabled={magRedoStack.length === 0}
              className="p-1.5 border border-black/20 dark:border-white/20 text-black dark:text-white disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleOpenRestoreModal}
            className="px-3 py-1.5 border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer text-black dark:text-white transition-colors"
            title="유실된 매거진 섹션 복구 (기본 섹션 복구 또는 로컬 백업 스냅샷에서 불러오기)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>RESTORE</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddSectionModal(true)}
            className="px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:opacity-85 shadow-xs transition-opacity"
            title="새 섹션 생성 (직접 생성 또는 여정에서 자동완성 선택 가능)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW</span>
          </button>
        </div>
      </div>

      {/* 2. Active Section Settings & Dual Live Previews (Hero & Hub Card) */}
      {currentMagSection && (
        <div className="flex flex-col gap-6 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                SECTION & HERO SETTINGS: [{currentMagSection.title}]
              </h3>
            </div>
            {currentMagSection.isDefault && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black uppercase">
                DEFAULT MAIN
              </span>
            )}
          </div>

          {/* Dual Live Previews Grid: 1) Hero Banner Preview + 2) Hub Section Card Preview (Matched Heights) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Preview 1: Hero Banner (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap">
                  1. HERO BANNER · 미리보기
                </span>
              </div>

              <div className="w-full flex-1 min-h-[340px] sm:min-h-[360px] relative overflow-hidden bg-black/10 dark:bg-white/5 border border-black/15 dark:border-white/15 group flex flex-col justify-between">
                {currentMagSection.heroImg ? (
                  <>
                    <img
                      src={getEffectiveImageUrl(currentMagSection.heroImg)}
                      alt={currentMagSection.heroTitle || 'Hero'}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20 pointer-events-none" />
                    <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full text-white pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-black/60 backdrop-blur-xs border border-white/20">
                          HERO PREVIEW
                        </span>
                        {currentMagSection.heroLocation && (
                          <span className="text-[10px] font-mono tracking-widest uppercase text-white/80">
                            {currentMagSection.heroLocation}
                          </span>
                        )}
                      </div>
                      <div>
                        {currentMagSection.heroDate && (
                          <span className="text-[10px] font-mono uppercase tracking-widest text-white/70 block mb-1">
                            {currentMagSection.heroDate}
                          </span>
                        )}
                        <h2 className="text-lg sm:text-xl font-satoshi font-light uppercase tracking-tight text-white drop-shadow-md line-clamp-2">
                          {currentMagSection.heroTitle || 'SECTION HERO TITLE'}
                        </h2>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6 text-black/40 dark:text-white/40">
                    <Sparkles className="w-6 h-6 opacity-40" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      히어로 이미지가 지정되지 않았습니다.
                    </span>
                    <span className="text-[10px] font-mono">
                      하단 사진에서 [★ SET AS HERO] 버튼을 눌러 지정해주세요.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview 2: Hub Section Card Live Preview (MOUTHWASH style, 5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col gap-2 h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 whitespace-nowrap">
                  2. HUB CARD · 실시간 카드
                </span>
              </div>

              <div className="w-full flex-1 min-h-[340px] sm:min-h-[360px] p-3.5 bg-white dark:bg-[#141414] border border-black/15 dark:border-white/15 shadow-sm flex flex-col items-center justify-between">
                {/* MOUTHWASH Card Top Bold Title */}
                <div className="min-h-[2.8rem] flex items-center justify-center mb-1 px-1 w-full">
                  <h4 className="text-sm sm:text-base font-satoshi font-extrabold uppercase tracking-tight text-center leading-[1.12] text-black dark:text-white line-clamp-2">
                    {currentMagSection.heroTitle || currentMagSection.title || 'UNTITLED ISSUE'}
                  </h4>
                </div>

                {/* Photo Frame (3:4 ratio) */}
                <div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/15 my-auto">
                  {currentMagSection.heroImg ? (
                    <img
                      src={getEffectiveImageUrl(currentMagSection.heroImg)}
                      alt="Card Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-black/40 dark:text-white/40">
                      NO COVER
                    </div>
                  )}
                </div>

                {/* Bottom Meta */}
                <div className="pt-2.5 flex flex-col items-center justify-center text-center font-['Inter',sans-serif] gap-0.5 w-full">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center justify-center gap-1">
                    <span className="text-red-600 dark:text-red-400 font-extrabold">
                      ISSUE {String(sectionsList.findIndex(s => s.id === currentMagSection.id) + 1).padStart(2, '0')}
                    </span>
                    {currentMagSection.heroDate && (
                      <>
                        <span className="opacity-30">/</span>
                        <span>{currentMagSection.heroDate}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[9px] font-sans font-semibold tracking-wide uppercase text-black/50 dark:text-white/50 flex items-center justify-center gap-1.5">
                    {currentMagSection.heroLocation && (
                      <span className="truncate max-w-[140px]">{currentMagSection.heroLocation}</span>
                    )}
                    {currentMagSection.heroLocation && <span className="opacity-40">·</span>}
                    <span>{currentMagSection.items?.length || 0} STORIES</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Simplified Section Settings Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-black/10 dark:border-white/10">
            {/* Section Title */}
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap truncate" title="SECTION TITLE · 섹션명">
                SECTION TITLE · 섹션명
              </label>
              <input
                type="text"
                value={currentMagSection.title || ''}
                onChange={e => handleUpdateSectionField(currentMagSection.id, 'title', e.target.value)}
                placeholder="e.g. TOKYO VIBES, JEJU ISLAND"
                className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              />
            </div>

            {/* Hero Big Title */}
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap truncate" title="HERO TITLE · 대표 제목">
                HERO TITLE · 대표 제목
              </label>
              <input
                type="text"
                value={currentMagSection.heroTitle || ''}
                onChange={e => handleUpdateSectionField(currentMagSection.id, 'heroTitle', e.target.value)}
                placeholder="e.g. The Other Side of Paradise"
                className="px-3 py-2 text-xs font-serif font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              />
            </div>

            {/* Location or Custom Theme */}
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap truncate" title="LOCATION · 위치 / 테마">
                LOCATION · 위치 / 테마
              </label>
              <input
                type="text"
                value={currentMagSection.heroLocation || ''}
                onChange={e => handleUpdateSectionField(currentMagSection.id, 'heroLocation', e.target.value)}
                placeholder="e.g. TOKYO 또는 여행 음식, 쇼핑거리"
                className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              />
            </div>

            {/* Linked Trip */}
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 whitespace-nowrap truncate" title="LINKED TRIP · 연계 여정">
                LINKED TRIP · 연계 여정
              </label>
              <select
                value={currentMagSection.heroTripId || ''}
                onChange={e => handleUpdateSectionField(currentMagSection.id, 'heroTripId', e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
              >
                <option value="">-- NO LINKED JOURNEY (복합 여정) --</option>
                {localJourneys.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. Current Section Moments & Editorial Cards Manager */}
      {currentMagSection && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-black/70 dark:text-white/70" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                CURATED MOMENTS & EDITORIAL CARDS ({currentMagSection.items?.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshAndSyncMagazine}
                disabled={isSyncingMagazine}
                className="px-3 py-1 bg-white dark:bg-[#1f1f1f] text-black dark:text-white border border-black/20 dark:border-white/20 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                title="타임라인 최신 사진/제목/장소 데이터로 즉시 동기화"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingMagazine ? 'animate-spin text-red-500' : 'text-black/70 dark:text-white/70'}`} />
                <span>{isSyncingMagazine ? '동기화 중...' : '타임라인 동기화 (SYNC)'}</span>
              </button>
              <button
                type="button"
                onClick={handleAddTextCardToCurrentSection}
                className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD TEXT CARD</span>
              </button>
            </div>
          </div>

          {/* Interactive Visual Cards Grid (Synchronized with 3-Column / 2-Column Magazine Rules) */}
          {(() => {
            const rawItems = currentMagSection.items || [];
            if (rawItems.length === 0) {
              return (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-xs font-mono text-black/40 dark:text-white/40 border border-dashed border-black/20 dark:border-white/20 p-8">
                  <Layout className="w-6 h-6 opacity-30" />
                  <span>현재 섹션에 등록된 카드가 없습니다.</span>
                  <span>아래 타임라인 사진에서 '+ ADD'를 누르거나 상단의 'ADD TEXT CARD'를 클릭해주세요.</span>
                </div>
              );
            }

            // Live sync items with timelineData
            const timelineByUrl = new Map<string, TimelineItem>();
            if (timelineData) {
              Object.values(timelineData).forEach(tItems => {
                if (Array.isArray(tItems)) {
                  tItems.forEach(t => {
                    if (t.img) {
                      timelineByUrl.set(t.img, t);
                      const eff = getEffectiveImageUrl(t.img);
                      if (eff) timelineByUrl.set(eff, t);
                    }
                    const gImages = (t as any).galleryImages;
                    if (Array.isArray(gImages)) {
                      gImages.forEach((g: any) => {
                        const gUrl = typeof g === 'string' ? g : g?.url;
                        if (gUrl) {
                          timelineByUrl.set(gUrl, {
                            ...t,
                            place: (typeof g !== 'string' && g?.place) || t.place,
                            location: (typeof g !== 'string' && g?.location) || t.location,
                            imgNote: (typeof g !== 'string' && g?.imgNote) || t.imgNote,
                            date: (typeof g !== 'string' && g?.date) || t.date,
                          });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Gather all timeline items for place resolution
            const allTimelineList: TimelineItem[] = [];
            if (timelineData) {
              Object.values(timelineData).forEach(tItems => {
                if (Array.isArray(tItems)) {
                  allTimelineList.push(...tItems);
                }
              });
            }

            const items = rawItems.map(item => {
              if (item.isTextOnly || !item.img) return item;
              const matched = timelineByUrl.get(item.img) || timelineByUrl.get(getEffectiveImageUrl(item.img));
              const targetTripId = matched?.tripId || item.tripId;
              const parentTrip = trips.find(t => t.id === targetTripId);
              const tripTimeline = allTimelineList.filter(t => t.tripId === targetTripId);

              if (matched) {
                const pName = matched.place?.trim() || '';
                const jTitle = parentTrip?.title?.replace(/\s*\(Plan\)$/i, '') || '';
                // If user explicitly edited item.placeName or item.location, preserve it!
                const customPlace = item.placeName?.trim();
                const resolvedLocation = customPlace || resolveTimelinePlaceName(matched, tripTimeline, parentTrip);
                return {
                  ...item,
                  tripId: targetTripId,
                  title: pName || jTitle || item.title || 'UNTITLED MOMENT',
                  placeName: resolvedLocation,
                  location: resolvedLocation,
                  date: matched.date || item.date,
                  caption: matched.imgNote || matched.memo || item.caption,
                };
              } else {
                let resolvedLocation = item.placeName || '';
                const pName = (item.title || '').trim().toLowerCase();
                if (!resolvedLocation || resolvedLocation.trim().toLowerCase() === pName) {
                  resolvedLocation = parentTrip?.locationStr || (parentTrip?.locations && parentTrip.locations[0]?.name) || parentTrip?.country || currentMagSection.heroLocation || 'VISITED PLACE';
                }
                return {
                  ...item,
                  placeName: resolvedLocation,
                  location: resolvedLocation,
                };
              }
            });

            const isLand = (item: MagazineItem) =>
              item.layoutType === 'landscape' || item.layoutType === 'wide' || item.layoutType === 'large';

            type MagRow = 
              | { type: 'PPP'; items: [MagazineItem, MagazineItem, MagazineItem] }
              | { type: 'PL'; items: [MagazineItem, MagazineItem] }
              | { type: 'LP'; items: [MagazineItem, MagazineItem] }
              | { type: 'LL'; items: [MagazineItem, MagazineItem] }
              | { type: 'SINGLE_LANDSCAPE'; items: [MagazineItem] }
              | { type: 'PP'; items: [MagazineItem, MagazineItem] }
              | { type: 'SINGLE_PORTRAIT'; items: [MagazineItem] };

            const rows: MagRow[] = [];
            let i = 0;
            while (i < items.length) {
              const cur = items[i];
              const next1 = items[i + 1];
              const next2 = items[i + 2];

              if (isLand(cur)) {
                if (next1 && !isLand(next1)) {
                  rows.push({ type: 'LP', items: [cur, next1] });
                  i += 2;
                } else if (next1 && isLand(next1)) {
                  rows.push({ type: 'LL', items: [cur, next1] });
                  i += 2;
                } else {
                  rows.push({ type: 'SINGLE_LANDSCAPE', items: [cur] });
                  i += 1;
                }
              } else {
                if (next1 && isLand(next1)) {
                  rows.push({ type: 'PL', items: [cur, next1] });
                  i += 2;
                } else if (next1 && !isLand(next1) && next2 && !isLand(next2)) {
                  rows.push({ type: 'PPP', items: [cur, next1, next2] });
                  i += 3;
                } else if (next1 && !isLand(next1)) {
                  rows.push({ type: 'PP', items: [cur, next1] });
                  i += 2;
                } else {
                  rows.push({ type: 'SINGLE_PORTRAIT', items: [cur] });
                  i += 1;
                }
              }
            }

              const renderAdminCuratedCard = (
                item: MagazineItem,
                options: { spanClass?: string; isMatchedHeight?: boolean } = {}
              ) => {
                const idx = items.findIndex(x => x.id === item.id);
                const isItemHero = currentMagSection.heroImg === item.img;
                const isLandscape = isLand(item);
                const isTextCard = item.isTextOnly || !item.img;
                const isCardSelected = selectedMagCardId === item.id;

                let aspectClass = 'aspect-[3/4] w-full';
                if (options.isMatchedHeight) {
                  // In a 3-col combined row (PL or LP), aspect-[4/3] on mobile and aspect-[16/10] on desktop aligns horizontal height with portrait (3:4) sibling
                  aspectClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
                } else if (isLandscape) {
                  aspectClass = 'aspect-[4/3] md:aspect-[16/10] w-full';
                }

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => {
                      setSelectedMagCardId(prev => {
                        const next = prev === item.id ? null : item.id;
                        if (!next) setInlineAddMenuCardId(null);
                        return next;
                      });
                    }}
                    className={`flex flex-col gap-3 p-4 bg-white dark:bg-[#161616] border transition-all shadow-xs h-full cursor-pointer select-none ${options.spanClass || ''} ${
                      isCardSelected
                        ? 'border-black dark:border-white ring-2 ring-black dark:ring-white shadow-md bg-black/[0.02] dark:bg-white/[0.04]'
                        : isItemHero 
                          ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' 
                          : 'border-black/15 dark:border-white/15 hover:border-black/60 dark:hover:border-white/60'
                    }`}
                  >
                    {/* Card Controls Top Bar */}
                    <div 
                      className="flex items-center justify-between gap-2 pb-1 border-b border-black/10 dark:border-white/10"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono font-bold uppercase text-black/40 dark:text-white/40 mr-1">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemInCurrentSection(item.id, 'layoutType', isLandscape ? 'portrait' : 'landscape')}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                          title="가로형/세로형 비율 전환"
                        >
                          {isLandscape ? '가로 ⟳' : '세로 ⟳'}
                        </button>
                        {isTextCard && (
                          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
                            TEXT
                          </span>
                        )}
                        {isCardSelected && (
                          <div className="relative flex items-center animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => setInlineAddMenuCardId(prev => prev === item.id ? null : item.id)}
                              className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title="현재 카드 바로 뒤에 추가"
                            >
                              <Plus className="w-3 h-3" />
                              <span>ADD</span>
                            </button>

                            {/* Compact Popover Dropdown */}
                            {inlineAddMenuCardId === item.id && (
                              <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-[#1c1c1c] border border-black/20 dark:border-white/20 shadow-xl py-1 flex flex-col min-w-[90px] animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineAddMenuCardId(null);
                                    handleAddTextCardToCurrentSection();
                                  }}
                                  className="px-2.5 py-1.5 text-left text-[11px] font-mono font-bold hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 text-black dark:text-white cursor-pointer transition-colors"
                                  title="텍스트 카드 추가"
                                >
                                  <Plus className="w-3 h-3 text-red-500" />
                                  <span>text</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineAddMenuCardId(null);
                                    const linkedId = currentMagSection?.heroTripId || (currentMagSection?.items && currentMagSection.items[0]?.tripId);
                                    if (linkedId) {
                                      setSelectedTripForMoments(linkedId);
                                    } else if (selectedTripForMoments === null && localJourneys.length > 0) {
                                      setSelectedTripForMoments(localJourneys[0].id);
                                    }
                                    setShowQuickPhotoPicker(true);
                                  }}
                                  className="px-2.5 py-1.5 text-left text-[11px] font-mono font-bold hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 text-black dark:text-white cursor-pointer transition-colors"
                                  title="사진 카드 추가"
                                >
                                  <ImageIcon className="w-3 h-3 text-red-500" />
                                  <span>photo</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!isTextCard && (
                          <button
                            type="button"
                            onClick={() => handleSetAsHeroFromItem(item)}
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer border ${
                              isItemHero
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                                : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                            }`}
                            title="섹션 히어로로 지정"
                          >
                            {isItemHero ? '★ HERO' : 'SET HERO'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMoveItemInCurrentSection(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                          title="앞으로 이동"
                        >
                          <ChevronUp className="w-3 h-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItemInCurrentSection(idx, 'down')}
                          disabled={idx === items.length - 1}
                          className="p-1 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                          title="뒤로 이동"
                        >
                          <ChevronDown className="w-3 h-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedMagCardId === item.id) {
                              setSelectedMagCardId(null);
                              setInlineAddMenuCardId(null);
                            }
                            handleRemoveItemFromCurrentSection(item.id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-500/10 border border-red-500/30 cursor-pointer"
                          title="카드 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Card Frame: Real-time Aspect Ratio Preview */}
                    {isTextCard ? (
                      <div
                        onClick={e => e.stopPropagation()}
                        className={`w-full ${aspectClass} bg-transparent text-black dark:text-white p-3 sm:p-5 flex items-center justify-center border border-black/15 dark:border-white/15 relative group transition-all my-auto overflow-hidden`}
                      >
                        <textarea
                          value={item.textContent || ''}
                          onChange={e => handleUpdateItemInCurrentSection(item.id, 'textContent', e.target.value)}
                          placeholder="매거진 본문 텍스트를 입력하세요..."
                          className="w-full max-h-full bg-transparent text-black dark:text-white font-['Noto_Sans_KR',sans-serif] font-bold text-base sm:text-lg md:text-xl tracking-tight leading-snug break-keep outline-none resize-none border-0 text-center whitespace-pre-line placeholder:text-black/25 dark:placeholder:text-white/25 overflow-hidden"
                          style={{ height: 'auto' }}
                          ref={el => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          onInput={e => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-full ${aspectClass} overflow-hidden bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 relative group transition-all`}
                      >
                        <img
                          src={getEffectiveImageUrl(item.img)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {isItemHero && (
                          <div className="absolute top-2 left-2 bg-black text-white dark:bg-white dark:text-black text-[9px] font-mono font-bold px-1.5 py-0.5 shadow-sm">
                            HERO SELECTED ★
                          </div>
                        )}
                      </div>
                    )}

                    {/* Synced Read-only Info (Title, Place, Date) - Only for Photo Cards */}
                    {!isTextCard && (
                      <div 
                        className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10 font-['Inter',sans-serif] mt-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                            TITLE · 타임라인 동기화
                          </span>
                          <div className="text-xs sm:text-sm font-bold font-['Inter',sans-serif] text-black dark:text-white truncate" title={item.title}>
                            {item.title || 'UNTITLED MOMENT'}
                          </div>
                        </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                                PLACE / THEME · 직접 입력 가능
                              </span>
                              <input
                                type="text"
                                value={item.placeName || item.location || ''}
                                onChange={e => handleUpdateItemInCurrentSection(item.id, 'placeName', e.target.value)}
                                placeholder="장소명 또는 테마(ex. 여행 음식, 쇼핑거리)..."
                                className="text-xs sm:text-sm font-bold font-['Inter',sans-serif] text-black dark:text-white bg-transparent border-b border-black/15 dark:border-white/15 focus:border-black dark:focus:border-white outline-none w-full py-0.5 placeholder:font-normal placeholder:text-black/30 dark:placeholder:text-white/30"
                              />
                            </div>
                            {item.date && (
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                                  DATE
                                </span>
                                <div className="text-[11px] sm:text-xs font-mono font-bold text-black/60 dark:text-white/60">
                                  {item.date}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                );
              };

            return (
              <div className="flex flex-col gap-6 sm:gap-8">
                {rows.map((row, rowIdx) => {
                  if (row.type === 'PPP') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                        {renderAdminCuratedCard(row.items[2], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'PL') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                      </div>
                    );
                  }
                  if (row.type === 'LP') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-2', isMatchedHeight: true })}
                        {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'LL') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'SINGLE_LANDSCAPE') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'PP') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                        {renderAdminCuratedCard(row.items[1], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  if (row.type === 'SINGLE_PORTRAIT') {
                    return (
                      <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
                        {renderAdminCuratedCard(row.items[0], { spanClass: 'md:col-span-1' })}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. Timeline Photos Selection Tool (여정 사진 탐색 및 즉시 추가) */}
      <div className="flex flex-col gap-3 pt-4 border-t border-black/15 dark:border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
            + ADD PHOTOS FROM TIMELINE TO [{currentMagSection?.title}]
          </span>
          <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
            사진을 클릭하면 현재 선택된 섹션에 자동 추가됩니다.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Filter by Journey */}
          <select
            value={selectedTripForMoments === null ? '' : selectedTripForMoments}
            onChange={e => setSelectedTripForMoments(e.target.value === '' ? null : Number(e.target.value))}
            className="px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
          >
            <option value="">-- SELECT JOURNEY TO LOAD PHOTOS --</option>
            {localJourneys.map(j => (
              <option key={j.id} value={j.id}>
                {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country})
              </option>
            ))}
          </select>

          {/* Search Keyword */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
            <input
              type="text"
              value={momentSearchQuery}
              onChange={e => setMomentSearchQuery(e.target.value)}
              placeholder="Search place, memo, location..."
              className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
            />
          </div>
        </div>

        {/* Photo Candidates Grid */}
        <div className="mt-2">
          {candidateTimelineItems.length === 0 ? (
            selectedTripForMoments === null && !momentSearchQuery.trim() ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-black/20 dark:border-white/20 bg-black/[0.02] dark:bg-white/[0.02]">
                <ImageIcon className="w-6 h-6 text-black/30 dark:text-white/30" />
                <span className="text-xs font-mono font-extrabold text-black/70 dark:text-white/70 tracking-wider uppercase">
                  SELECT A JOURNEY TO VIEW CANDIDATE PHOTOS
                </span>
                <span className="text-[11px] text-black/40 dark:text-white/40 max-w-sm leading-relaxed">
                  위 드롭다운에서 여행을 선택하시거나 검색어를 입력하시면 사진들이 즉시 로드됩니다.
                </span>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-black/40 dark:text-white/40 border border-black/10 dark:border-white/10">
                NO PHOTOS FOUND FOR THIS SELECTION
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[480px] overflow-y-auto p-1 border border-black/15 dark:border-white/15">
              {candidateTimelineItems.map((item, i) => {
                const pName = safeStr(item.place);
                const jTitle = safeStr(item.journeyTitle);
                const displayTitle = pName || jTitle || 'MOMENT';
                const itemDate = safeStr(item.date);

                // Check if already attached to current section
                const isAttached = (currentMagSection?.items || []).some(m =>
                  (m.timelineItemId !== undefined && Number(m.timelineItemId) === Number(item.id)) ||
                  (m.img && item.img && (m.img === item.img || m.img.split('?')[0] === item.img.split('?')[0]))
                );

                return (
                  <div
                    key={`mag-cand-${item.id || i}-${i}`}
                    onClick={() => {
                      if (isAttached) {
                        alert("이미 현재 매거진 섹션에 등록된 사진입니다.");
                        return;
                      }
                      handleAddItemToCurrentSection(item);
                    }}
                    className={`group relative h-32 sm:h-36 bg-white dark:bg-[#121212] border overflow-hidden flex flex-col justify-end transition-all select-none ${
                      isAttached
                        ? 'border-black/30 dark:border-white/30 opacity-40 grayscale cursor-not-allowed'
                        : 'border-black/15 dark:border-white/15 cursor-pointer active:scale-95 hover:border-black dark:hover:border-white shadow-xs'
                    }`}
                    title={isAttached ? `${displayTitle} (이미 등록됨 - ATTACHED)` : `${displayTitle} (${itemDate}) - 클릭하여 추가`}
                  >
                    <img
                      src={getEffectiveImageUrl(item.img || '')}
                      alt={displayTitle}
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                        !isAttached ? 'group-hover:scale-105' : ''
                      }`}
                    />

                    {/* Attached Minimal Badge */}
                    {isAttached ? (
                      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/90 text-white dark:bg-white dark:text-black text-[9px] font-mono font-extrabold tracking-wider uppercase shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>ATTACHED</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-mono text-xs font-extrabold p-2 text-center z-10">
                        + ADD TO {currentMagSection?.title}
                      </div>
                    )}

                    <div className="relative z-10 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 pt-3 flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-white truncate leading-tight">
                        {displayTitle}
                      </span>
                      {itemDate && (
                        <span className="text-[9px] font-mono text-white/70 truncate">
                          {itemDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="pt-6 border-t border-black/20 dark:border-white/20 flex justify-end">
        <button
          type="button"
          onClick={() => handleSaveMagazine()}
          disabled={isSavingMagazine}
          className={`px-8 py-3 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity shadow-md ${
            magazineSaveSuccess ? '!bg-green-600 !text-white' : ''
          }`}
        >
          {magazineSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{magazineSaveSuccess ? 'SAVED' : 'SAVE MAGAZINE SETTINGS'}</span>
        </button>
      </div>

      {/* Modal: Add New Section */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#161616] border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                ADD NEW MAGAZINE SECTION (새 섹션 추가)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                  SECTION TITLE (예: TOKYO, FUKUOKA, JEJU)
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. TOKYO VIBES"
                  autoFocus
                  className="px-3 py-2 text-xs font-bold bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                  SUBTITLE / MEMO (부제목)
                </label>
                <input
                  type="text"
                  value={newSectionSubtitle}
                  onChange={e => setNewSectionSubtitle(e.target.value)}
                  placeholder="e.g. City lights, quiet alleys, coffee"
                  className="px-3 py-2 text-xs bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                />
              </div>
            </div>

            {/* Alternative Action: Auto-generate shortcut */}
            <div className="p-3 bg-red-500/5 border border-red-500/20 flex items-center justify-between gap-3">
              <div className="text-[11px] text-black/70 dark:text-white/70">
                여정의 사진과 스토리로 즉시 생성하시겠습니까?
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSectionModal(false);
                  const firstUncreated = localJourneys.find(j => !existingTripIds.has(Number(j.id)));
                  setSelectedTripForAutoGenerate(firstUncreated ? firstUncreated.id : (localJourneys[0]?.id ?? null));
                  setShowAutoGenerateModal(true);
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                <span>여정 자동 생성 →</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer hover:opacity-85 transition-opacity"
              >
                CREATE SECTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Auto-Generate Section from Journey */}
      {showAutoGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#161616] border border-black dark:border-white p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-600 dark:text-red-500" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                  여정 선택 및 매거진 섹션 자동 생성 (AUTO-GENERATE)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoGenerateModal(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-black/70 dark:text-white/70 leading-relaxed font-sans">
              선택하신 여정의 커버 이미지, 갤러리 및 타임라인 사진을 수집하여 잡지 스타일의 매거진 이슈 섹션을 즉시 구성합니다.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80 flex items-center justify-between">
                <span>SELECT JOURNEY (생성할 여정 선택)</span>
                <span className="text-[10px] text-black/50 dark:text-white/50 lowercase">
                  총 {localJourneys.length}개 중 {existingTripIds.size}개 섹션 생성됨
                </span>
              </label>
              <select
                value={selectedTripForAutoGenerate ?? (localJourneys[0]?.id || '')}
                onChange={e => setSelectedTripForAutoGenerate(Number(e.target.value))}
                className="px-3 py-2.5 text-xs font-mono font-bold bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 outline-none text-black dark:text-white cursor-pointer"
              >
                {(() => {
                  const uncreatedJourneys = localJourneys.filter(j => !existingTripIds.has(Number(j.id)));
                  const createdJourneys = localJourneys.filter(j => existingTripIds.has(Number(j.id)));

                  return (
                    <>
                      {uncreatedJourneys.length > 0 && (
                        <optgroup label="── 미생성 여정 (NEW) ──">
                          {uncreatedJourneys.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country} · {j.date})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {createdJourneys.length > 0 && (
                        <optgroup label="── 이미 섹션으로 생성된 여정 (ALREADY CREATED) ──">
                          {createdJourneys.map(j => (
                            <option key={j.id} value={j.id}>
                              ✓ [생성완료] {j.title.replace(/\s*\(Plan\)$/i, '')} ({j.locationStr || j.country} · {j.date})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
            </div>

            {(() => {
              const effectiveTripId = selectedTripForAutoGenerate ?? localJourneys[0]?.id;
              const selected = localJourneys.find(j => Number(j.id) === Number(effectiveTripId));
              if (!selected) return null;
              const isAlreadyCreated = existingTripIds.has(Number(selected.id));

              return (
                <div className={`p-3 border flex items-center gap-3 ${
                  isAlreadyCreated 
                    ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30' 
                    : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
                }`}>
                  <div className="w-14 h-14 aspect-square bg-black/10 overflow-hidden shrink-0 border border-black/10 relative">
                    <img src={getEffectiveImageUrl(selected.img)} alt={selected.title} className="w-full h-full object-cover" />
                    {isAlreadyCreated && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[8px] font-mono font-bold text-white uppercase px-1 bg-amber-600">CREATED</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-black dark:text-white uppercase truncate">
                        {selected.title}
                      </span>
                      {isAlreadyCreated && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                          이미 생성됨
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-black/60 dark:text-white/60 mt-0.5">
                      {selected.locationStr || selected.country} · {selected.date}
                    </div>
                    <div className={`text-[10px] font-mono mt-1 ${isAlreadyCreated ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-red-600 dark:text-red-400'}`}>
                      {isAlreadyCreated 
                        ? '* 이미 매거진 섹션으로 등록된 여정입니다. 중복 생성이 필요한 경우에만 진행해주세요.'
                        : '* 타임라인 시간 순서(일정 흐름)대로 매거진 섹션이 자동 구성됩니다.'}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAutoGenerateModal(false)}
                className="px-4 py-2 border border-black/20 dark:border-white/20 text-xs font-mono font-bold uppercase cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                CANCEL
              </button>
              {(() => {
                const targetId = selectedTripForAutoGenerate ?? localJourneys[0]?.id;
                const isAlreadyCreated = targetId ? existingTripIds.has(Number(targetId)) : false;

                return (
                  <button
                    type="button"
                    disabled={localJourneys.length === 0}
                    onClick={() => {
                      if (targetId) {
                        handleAutoGenerateSectionFromTrip(targetId);
                      }
                    }}
                    className={`px-5 py-2 text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-30 flex items-center gap-1.5 shadow-sm transition-colors ${
                      isAlreadyCreated ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAlreadyCreated ? 'GENERATE AGAIN (중복 생성)' : 'GENERATE SECTION (자동 생성)'}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
