import {
  ChevronUp, ChevronDown, Save, Trash2, Copy, ClipboardPaste, ArrowRightLeft, Upload, Calendar,
  MapPin, Check, Sliders, Globe, X, ExternalLink, GripVertical, Loader2, Edit, Shuffle
} from 'lucide-react';
import { Trip, Plan } from '../../types';
import { PlaceAutocompleteInput } from '../../components/PlaceAutocompleteInput';
import { getEffectiveImageUrl, uploadFileToR2 } from '../../utils/storageHelper';
import { compressImage } from '../../utils/imageHelper';
import { inspectAndPrepareVideo } from '../../utils/videoHelper';
import type { ManageHubState } from './useManageHubState';
import { notify } from '../../utils/feedback';

export function ArchiveMode({ s }: { s: ManageHubState }) {
  const {
    onNavigate, onDeleteTrip, onCloneTrip, onMoveToPlans, onMoveToArchive, isLoggedIn,
    archiveHubMainTitle, setArchiveHubMainTitle, archiveHubSubtitle, setArchiveHubSubtitle,
    archiveHubBadgeText, setArchiveHubBadgeText, archiveHubVolumeText, setArchiveHubVolumeText,
    isArchiveHubHeaderOpen, setIsArchiveHubHeaderOpen, isSavingArchiveHubHeader,
    archiveHubHeaderSaveSuccess, handleSaveArchiveHubHeader, mobileArchiveTab, setMobileArchiveTab,
    localJourneys, selectedJourneyId, setSelectedJourneyId, title, editTitle, setEditTitle, editDate,
    editLocation, setEditLocation, editCountry, setEditCountry, editTags, setEditTags, newTagInput,
    setNewTagInput, editImg, setEditImg, editVideoUrl, setEditVideoUrl, editHeroImg, setEditHeroImg,
    editHeroVideoUrl, setEditHeroVideoUrl, editStatusBadge, setEditStatusBadge, archiveMediaTab,
    setArchiveMediaTab, isCountryDropdownOpen, setIsCountryDropdownOpen, countryDropdownRef,
    matchedCountries, parsedDateInputs, handleStartDateChange, handleEndDateChange, isSavingTrip,
    tripSaveSuccess, isUploading, setIsUploading, isMainDragActive, setIsMainDragActive,
    isHeroDragActive, setIsHeroDragActive, handleContainerScroll, selectedJourney, navigateSafely,
    executeWithGuard, handleMoveOrder, handleDragStart, handleDragOver, handleDrop,
    handleSaveJourney, handleFileUpload, handleAddTag, handleRemoveTag, isSelectedPlan
  } = s;

  return (
      <div
        onScroll={handleContainerScroll}
        className="flex-1 flex flex-col w-full overflow-y-auto max-h-[calc(100dvh-60px)]"
      >

        {/* Top Bar with Header */}
        <div className="w-full px-4 sm:px-8 pt-6 pb-4 border-b border-black/15 dark:border-white/15 shrink-0">
          <span className="text-micro font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
            JOURNEY LOGS & PLANNER MANAGEMENT
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
            TRIP SETTING
          </h2>
          <p className="text-xs text-black/60 dark:text-white/60 font-mono mt-1">
            [여정 허브 헤더 소개글 설정 및 개별 여정 정보·사진·태그·순서 통합 관리]
          </p>
        </div>

        {/* 0. Journey Hub Main Header Configuration Accordion (Trip Hub Editorial Masthead) */}
        <div className="w-full border-b border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="w-full p-4 sm:px-8">
            <button
              type="button"
              onClick={() => setIsArchiveHubHeaderOpen(!isArchiveHubHeaderOpen)}
              className="w-full flex items-center justify-between py-2 text-left cursor-pointer group select-none"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white font-['Noto_Sans_KR',sans-serif]">
                  Journey Archive header
                </span>
                <span className="text-meta font-mono px-2 py-0.5 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark uppercase">
                  HUB CONFIG
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-black/60 dark:text-white/60 font-['Noto_Sans_KR',sans-serif]">
                  {isArchiveHubHeaderOpen ? '접기 ▲' : '펼치기 ▼'}
                </span>
              </div>
            </button>

            {isArchiveHubHeaderOpen && (
              <div className="pt-4 pb-2 flex flex-col gap-4 border-t border-black/10 dark:border-white/10 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Badge Text */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                      HUB BADGE TEXT (상단 태그 텍스트)
                    </label>
                    <input
                      type="text"
                      value={archiveHubBadgeText}
                      onChange={e => setArchiveHubBadgeText(e.target.value)}
                      placeholder="e.g. JOURNEY ARCHIVE"
                      className="px-3 py-2 text-xs font-mono bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
                    />
                  </div>

                  {/* Volume Text */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                      HUB VOLUME TEXT (발행 연도 / 볼륨)
                    </label>
                    <input
                      type="text"
                      value={archiveHubVolumeText}
                      onChange={e => setArchiveHubVolumeText(e.target.value)}
                      placeholder="e.g. VOL. 2026"
                      className="px-3 py-2 text-xs font-mono bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white font-['Noto_Sans_KR',sans-serif]"
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
                    value={archiveHubMainTitle}
                    onChange={e => setArchiveHubMainTitle(e.target.value)}
                    placeholder="e.g. A VISUAL CHRONICLE OF JOURNEYS & TRAVEL ARCHIVES"
                    className="px-3 py-2 text-xs font-satoshi font-bold uppercase bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white"
                  />
                </div>

                {/* Subtitle */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 font-['Noto_Sans_KR',sans-serif]">
                    INTRO SUBTITLE / DESCRIPTION (허브 소개 및 설명 문구)
                  </label>
                  <textarea
                    rows={2}
                    value={archiveHubSubtitle}
                    onChange={e => setArchiveHubSubtitle(e.target.value)}
                    placeholder="e.g. 발걸음이 닿았던 모든 도시와 찬란했던 시간의 기록. 엄선된 사진과 함께 지난 여정들을 다시 마주합니다."
                    className="px-3 py-2 text-xs font-['Noto_Sans_KR',sans-serif] bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none text-black dark:text-white resize-none"
                  />
                </div>

                {/* Save Button for Hub Header */}
                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                  <span className="text-[11px] font-mono text-black/60 dark:text-white/60 font-['Noto_Sans_KR',sans-serif]">
                    * 수정 후 [SAVE TRIP HUB HEADER]를 누르면 여정 허브 메인에 즉시 반영됩니다.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveArchiveHubHeader}
                    disabled={isSavingArchiveHubHeader}
                    className="btn btn-primary flex"
                  >
                    {isSavingArchiveHubHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{archiveHubHeaderSaveSuccess ? 'SAVED!' : 'SAVE TRIP HUB HEADER'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
          {/* Mobile Tab Switcher: LIST vs EDIT */}
          <div className="lg:hidden flex border-b border-black/15 dark:border-white/15 bg-white dark:bg-[#111] shrink-0">
            <button
              type="button"
              onClick={() => setMobileArchiveTab('LIST')}
              className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider font-sans border-r border-black/15 dark:border-white/15 cursor-pointer ${
                mobileArchiveTab === 'LIST'
                  ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark'
                  : 'text-black/60 dark:text-white/60'
              }`}
            >
              여정 목록 (LIST: {localJourneys.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileArchiveTab('EDIT')}
              className={`flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider font-sans cursor-pointer ${
                mobileArchiveTab === 'EDIT'
                  ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark'
                  : 'text-black/60 dark:text-white/60'
              }`}
            >
              Edit
            </button>
          </div>

        {/* Left: Journey Edit Form */}
        <div
          onScroll={handleContainerScroll}
          className={`w-full lg:w-3/5 border-b lg:border-b-0 lg:border-r border-black/15 dark:border-white/15 p-4 sm:p-8 overflow-y-auto max-h-[calc(100dvh-110px)] lg:max-h-[calc(100dvh-60px)] ${
            mobileArchiveTab === 'EDIT' ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedJourney ? (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto">

              {/* Top Bar for Selected Journey with Direct View Link */}
              <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-4">
                <div className="min-w-0 pr-2">
                  <span className="text-micro font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
                    EDITING ID #{selectedJourney.id}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white truncate">
                    {editTitle || 'Untitled Journey'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View Journey Direct Link Button */}
                  <button
                    type="button"
                    onClick={() => onNavigate('detail', selectedJourney.id)}
                    className="btn btn-secondary flex"
                    title="이 여정의 상세 페이지로 바로 이동"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">VIEW JOURNEY →</span>
                    <span className="sm:hidden">VIEW →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveJourney()}
                    disabled={isSavingTrip}
                    className={`px-4 py-2 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark text-xs font-extrabold uppercase tracking-widest font-sans flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity ${
                      tripSaveSuccess ? '!bg-emerald-600 !text-white' : ''
                    }`}
                  >
                    {tripSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{tripSaveSuccess ? 'SAVED' : 'SAVE'}</span>
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Row 1: Title (여정 제목 - 전체 폭) */}
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                    Title (여정 제목)
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="px-3 py-2 text-xs font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white h-[35px]"
                  />
                </div>

                {/* Row 2 - Left: Date Range with Calendar Pickers */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-black/60 dark:text-white/60" />
                      <span>Date Range (일정 기간 - 달력)</span>
                    </label>
                    <span className="text-micro font-mono text-black/60 dark:text-white/60">
                      {editDate || '날짜 미지정'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 h-[35px] bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 px-2.5">
                    <input
                      type="date"
                      value={parsedDateInputs.start}
                      onChange={e => handleStartDateChange(e.target.value)}
                      className="w-full text-[11px] font-mono font-bold bg-transparent outline-none cursor-pointer text-black dark:text-white border-0 p-0"
                      title="시작 날짜 선택"
                    />
                    <span className="text-black/60 dark:text-white/60 font-mono text-xs select-none">~</span>
                    <input
                      type="date"
                      value={parsedDateInputs.end}
                      onChange={e => handleEndDateChange(e.target.value)}
                      className="w-full text-[11px] font-mono font-bold bg-transparent outline-none cursor-pointer text-black dark:text-white border-0 p-0"
                      title="종료 날짜 선택"
                    />
                  </div>
                </div>

                {/* Row 2 - Right: Status Badge (NEW, EDITING, PLAN 3-toggle) */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                      Status Badge (상태 뱃지)
                    </label>
                    <span className="text-micro font-mono text-black/60 dark:text-white/60">
                      {editStatusBadge ? '클릭 시 해제(일반)' : '미지정 (일반)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 h-[35px]">
                    {([
                      { id: 'NEW', label: 'NEW', activeBg: 'bg-red-600 text-white border-red-600' },
                      { id: 'EDITING', label: 'EDITING', activeBg: 'bg-amber-600 text-white border-amber-600' },
                      { id: 'PLAN', label: 'PLAN', activeBg: 'bg-amber-600 text-white border-amber-600' },
                    ] as const).map(opt => {
                      const isCurrentPlan = opt.id === 'PLAN' && (editStatusBadge === 'PLAN' || isSelectedPlan);
                      const isActive = opt.id === 'PLAN' ? isCurrentPlan : editStatusBadge === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={async () => {
                            if (isActive) {
                              setEditStatusBadge('');
                              if (opt.id === 'PLAN' && isSelectedPlan && selectedJourney) {
                                await onMoveToArchive(selectedJourney as Plan);
                                setEditTags(prev => prev.filter(t => t !== 'Plan' && t !== 'Archived'));
                                setEditTitle(prev => prev.replace(/\s*\(Plan\)$/i, '').trim());
                              }
                            } else {
                              setEditStatusBadge(opt.id as any);
                              if (opt.id === 'PLAN') {
                                if (!isSelectedPlan && selectedJourney) {
                                  await onMoveToPlans(selectedJourney);
                                  setEditTags(prev => {
                                    const next = prev.filter(t => t !== 'Archived');
                                    return next.includes('Plan') ? next : [...next, 'Plan'];
                                  });
                                  setEditTitle(prev => prev.endsWith(' (Plan)') ? prev : `${prev} (Plan)`);
                                }
                              } else {
                                if (isSelectedPlan && selectedJourney) {
                                  await onMoveToArchive(selectedJourney as Plan);
                                  setEditTags(prev => prev.filter(t => t !== 'Plan' && t !== 'Archived'));
                                  setEditTitle(prev => prev.replace(/\s*\(Plan\)$/i, '').trim());
                                }
                              }
                            }
                          }}
                          className={`h-full text-meta sm:text-xs font-extrabold uppercase tracking-wider transition-all border flex items-center justify-center cursor-pointer ${
                            isActive
                              ? `${opt.activeBg} shadow-xs font-extrabold`
                              : 'bg-transparent text-black/60 dark:text-white/60 border-black/20 dark:border-white/20 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3 - Left: Country (국가명 자동검색) */}
                <div ref={countryDropdownRef} className="relative flex flex-col gap-1">
                  <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-black/60 dark:text-white/60" />
                    <span>Country (국가명 - 자동검색)</span>
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={e => {
                      setEditCountry(e.target.value.toUpperCase());
                      setIsCountryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    placeholder="e.g. JAPAN, USA, FRANCE"
                    className="px-3 py-2 text-xs font-bold uppercase bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white h-[35px]"
                  />

                  {/* Country Autocomplete Dropdown */}
                  {isCountryDropdownOpen && matchedCountries.length > 0 && (
                    <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-40 bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 shadow-xl max-h-48 overflow-y-auto">
                      {matchedCountries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setEditCountry(c.nameEn.toUpperCase());
                            setIsCountryDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs font-bold border-b border-black/5 dark:border-white/5 last:border-b-0 cursor-pointer"
                        >
                          <span className="text-black dark:text-white font-sans">{c.nameKo} ({c.nameEn})</span>
                          <span className="text-micro font-mono font-bold text-black/60 dark:text-white/60">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 3 - Right: Location / Cities (Google Places 자동검색) */}
                <div className="relative flex flex-col gap-1">
                  <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-black/60 dark:text-white/60" />
                    <span>Location / Cities (장소 / 도시 - 자동검색)</span>
                  </label>
                  <PlaceAutocompleteInput
                    value={editLocation}
                    onChange={val => setEditLocation(val)}
                    onSelectPlace={(placeName, _coords, _address, countryName) => {
                      setEditLocation(placeName);
                      if (countryName && !editCountry) {
                        setEditCountry(countryName.toUpperCase());
                      }
                    }}
                    placeholder="e.g. Tokyo, Osaka, Kyoto"
                    className="px-3 py-2 text-xs font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white h-[35px] w-full"
                  />
                </div>

                {/* Tags */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                    Tags (태그 관리)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      placeholder="새 태그 입력 후 Enter..."
                      className="flex-1 px-3 py-1.5 text-xs font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 bg-black/10 dark:bg-white/10 text-black dark:text-white text-xs font-bold uppercase rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                    >
                      ADD
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editTags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-black/5 dark:bg-white/10 text-xs font-mono font-bold flex items-center gap-1 border border-black/10 dark:border-white/10"
                      >
                        #{tag}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-red-500"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Media Tabs: MAIN / HERO (Unified Single Dropzone per Section) */}
                <div className="sm:col-span-2 flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <div className="flex border-b border-black/15 dark:border-white/15 mb-2">
                    <button
                      type="button"
                      onClick={() => setArchiveMediaTab('main')}
                      className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
                        archiveMediaTab === 'main'
                          ? 'border-black dark:border-white text-black dark:text-white'
                          : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span>MAIN</span>
                      {(editImg || editVideoUrl) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchiveMediaTab('hero')}
                      className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
                        archiveMediaTab === 'hero'
                          ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                          : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span>HERO</span>
                      {(editHeroImg || editHeroVideoUrl) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                      )}
                    </button>
                  </div>

                  {archiveMediaTab === 'main' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                          MAIN MEDIA (이미지 또는 비디오)
                        </label>
                        {isUploading && (
                          <span className="text-micro font-mono font-bold text-red-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> 업로드 중...
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editVideoUrl || editImg}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) {
                              setEditVideoUrl('');
                              setEditImg('');
                            } else if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                              setEditVideoUrl(val);
                              setEditImg('');
                            } else {
                              setEditImg(val);
                              setEditVideoUrl('');
                            }
                          }}
                          placeholder="이미지 또는 영상 URL 입력 / 파일 드롭"
                          className="px-3 py-2 text-xs font-mono font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none flex-1"
                        />
                        <label className="px-3 bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark text-meta font-extrabold uppercase tracking-widest hover:opacity-85 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>UPLOAD</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.type.startsWith('video/')) {
                                setIsUploading(true);
                                try {
                                  const url = await uploadFileToR2(file, `covers/${Date.now()}_${file.name}`);
                                  setEditVideoUrl(url);
                                  setEditImg('');
                                } catch (err) {
                                  notify('비디오 업로드 실패');
                                } finally {
                                  setIsUploading(false);
                                }
                              } else {
                                handleFileUpload(e, 'img');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            const currentUrl = editVideoUrl || editImg;
                            if (!currentUrl) return notify('복사할 미디어가 없습니다.');
                            try {
                              await navigator.clipboard.writeText(currentUrl);
                              notify('MAIN 미디어 URL이 클립보드에 복사되었습니다.');
                            } catch (err) {
                              console.error(err);
                              notify('클립보드 복사 실패');
                            }
                          }}
                          className="px-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white border border-black/15 dark:border-white/15 text-meta font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title="현재 MAIN 미디어 URL 복사"
                        >
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (navigator.clipboard && navigator.clipboard.read) {
                                const items = await navigator.clipboard.read();
                                for (const item of items) {
                                  const imageType = item.types.find(t => t.startsWith('image/'));
                                  if (imageType) {
                                    const blob = await item.getType(imageType);
                                    const ext = imageType.split('/')[1] || 'png';
                                    const file = new File([blob], `pasted_${Date.now()}.${ext}`, { type: imageType });
                                    setIsUploading(true);
                                    try {
                                      const compressedBlob = await compressImage(file, 1920, 1080, 0.85);
                                      const url = await uploadFileToR2(compressedBlob, `covers/${Date.now()}_${file.name}`);
                                      setEditImg(url);
                                      setEditVideoUrl('');
                                    } finally {
                                      setIsUploading(false);
                                    }
                                    return;
                                  }
                                }
                              }
                              if (navigator.clipboard && navigator.clipboard.readText) {
                                const text = await navigator.clipboard.readText();
                                if (text && text.trim()) {
                                  const val = text.trim();
                                  if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                    setEditVideoUrl(val);
                                    setEditImg('');
                                  } else {
                                    setEditImg(val);
                                    setEditVideoUrl('');
                                  }
                                  return;
                                }
                              }
                              notify('클립보드에 이미지 또는 URL이 없습니다.');
                            } catch (err) {
                              console.warn(err);
                              notify('클립보드 붙여넣기에 실패했습니다. URL 입력창에서 Ctrl+V를 사용해주세요.');
                            }
                          }}
                          className="px-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white border border-black/15 dark:border-white/15 text-meta font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title="클립보드 미디어 붙여넣기"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          <span>PASTE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentUrl = editVideoUrl || editImg;
                            if (!currentUrl) return notify('복사할 MAIN 미디어가 없습니다.');
                            if (editVideoUrl) {
                              setEditHeroVideoUrl(editVideoUrl);
                              setEditHeroImg('');
                            } else {
                              setEditHeroImg(editImg);
                              setEditHeroVideoUrl('');
                            }
                            notify('MAIN 미디어가 HERO로 복사되었습니다.');
                          }}
                          className="btn btn-primary flex shrink-0"
                          title="MAIN 미디어를 HERO로 복사"
                        >
                          <span>TO HERO</span>
                        </button>
                      </div>

                      {/* MAIN Drag & Drop Box */}
                      <div
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsMainDragActive(false); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsMainDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            if (file.type.startsWith('video/')) {
                              setIsUploading(true);
                              try {
                                const url = await uploadFileToR2(file, `covers/${Date.now()}_${file.name}`);
                                setEditVideoUrl(url);
                                setEditImg('');
                              } catch (err) {
                                notify('비디오 업로드 실패');
                              } finally {
                                setIsUploading(false);
                              }
                            } else if (file.type.startsWith('image/')) {
                              setIsUploading(true);
                              try {
                                const compressedBlob = await compressImage(file, 1920, 1080, 0.85);
                                const url = await uploadFileToR2(compressedBlob, `covers/${Date.now()}_${file.name}`);
                                setEditImg(url);
                                setEditVideoUrl('');
                              } catch (err) {
                                notify('이미지 업로드 실패');
                              } finally {
                                setIsUploading(false);
                              }
                            }
                          }
                        }}
                        className={`border border-black/15 dark:border-white/15 aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5 relative group flex items-center justify-center transition-all ${
                          isMainDragActive ? 'border-dashed border-red-600 bg-red-500/10 scale-[1.01]' : ''
                        }`}
                      >
                        {editVideoUrl ? (
                          <div className="relative w-full h-full">
                            <video src={getEffectiveImageUrl(editVideoUrl)} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditVideoUrl('');
                                setEditImg('');
                              }}
                              className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-micro font-extrabold uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                            >
                              Delete Video
                            </button>
                          </div>
                        ) : editImg ? (
                          <div className="relative w-full h-full">
                            <img src={getEffectiveImageUrl(editImg)} alt="Cover preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditImg('');
                                setEditVideoUrl('');
                              }}
                              className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-micro font-extrabold uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                            >
                              Delete Image
                            </button>
                          </div>
                        ) : (
                          <div className="text-black/60 dark:text-white/60 text-meta font-bold uppercase tracking-wider text-center flex flex-col items-center justify-center p-4">
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>미디어를 업로드 중입니다...</span>
                              </div>
                            ) : (
                              <span>이미지 또는 동영상을 드래그 앤 드롭하거나<br />위의 UPLOAD 버튼을 눌러주세요</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-meta text-black/60 dark:text-white/60 font-medium leading-relaxed bg-black/[0.03] dark:bg-white/[0.03] p-2 border border-black/10 dark:border-white/10">
                        홈 상단 히어로 슬라이더에 우선 노출할 미디어입니다. (미등록 시 MAIN 미디어 사용)
                      </p>
                      <div className="flex justify-between items-center">
                        <label className="text-meta font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                          HERO MEDIA (이미지 또는 비디오)
                        </label>
                        {isUploading && (
                          <span className="text-micro font-mono font-bold text-red-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> 업로드 중...
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editHeroVideoUrl || editHeroImg}
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) {
                              setEditHeroVideoUrl('');
                              setEditHeroImg('');
                            } else if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                              setEditHeroVideoUrl(val);
                              setEditHeroImg('');
                            } else {
                              setEditHeroImg(val);
                              setEditHeroVideoUrl('');
                            }
                          }}
                          placeholder="히어로 이미지 또는 영상 URL 입력 / 파일 드롭"
                          className="px-3 py-2 text-xs font-mono font-bold bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none flex-1"
                        />
                        <label className="px-3 bg-red-600 hover:bg-red-700 text-white text-meta font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>UPLOAD</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.type.startsWith('video/')) {
                                setIsUploading(true);
                                try {
                                  const inspection = await inspectAndPrepareVideo(file);
                                  if (!inspection.isCompatible) {
                                    notify("경고: 선택하신 동영상은 모바일(아이폰)에서 지원되지 않는 비표준 코덱(VP9/AV1/ProRes 등)을 포함하고 있습니다. 모바일 정상 재생을 위해 표준 H.264 MP4 형식의 영상을 권장합니다.");
                                  }
                                  const url = await uploadFileToR2(file, `covers/hero_${Date.now()}_${file.name}`);
                                  setEditHeroVideoUrl(url);
                                  setEditHeroImg('');
                                } catch (err) {
                                  notify('비디오 업로드 실패');
                                } finally {
                                  setIsUploading(false);
                                }
                              } else {
                                handleFileUpload(e, 'heroImg');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            const currentUrl = editHeroVideoUrl || editHeroImg;
                            if (!currentUrl) return notify('복사할 HERO 미디어가 없습니다.');
                            try {
                              await navigator.clipboard.writeText(currentUrl);
                              notify('HERO 미디어 URL이 클립보드에 복사되었습니다.');
                            } catch (err) {
                              console.error(err);
                              notify('클립보드 복사 실패');
                            }
                          }}
                          className="px-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white border border-black/15 dark:border-white/15 text-meta font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title="현재 HERO 미디어 URL 복사"
                        >
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (navigator.clipboard && navigator.clipboard.read) {
                                const items = await navigator.clipboard.read();
                                for (const item of items) {
                                  const imageType = item.types.find(t => t.startsWith('image/'));
                                  if (imageType) {
                                    const blob = await item.getType(imageType);
                                    const ext = imageType.split('/')[1] || 'png';
                                    const file = new File([blob], `hero_pasted_${Date.now()}.${ext}`, { type: imageType });
                                    setIsUploading(true);
                                    try {
                                      const compressedBlob = await compressImage(file, 2048, 2048, 0.85);
                                      const url = await uploadFileToR2(compressedBlob, `covers/hero_${Date.now()}_${file.name}`);
                                      setEditHeroImg(url);
                                      setEditHeroVideoUrl('');
                                    } finally {
                                      setIsUploading(false);
                                    }
                                    return;
                                  }
                                }
                              }
                              if (navigator.clipboard && navigator.clipboard.readText) {
                                const text = await navigator.clipboard.readText();
                                if (text && text.trim()) {
                                  const val = text.trim();
                                  if (val.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                    setEditHeroVideoUrl(val);
                                    setEditHeroImg('');
                                  } else {
                                    setEditHeroImg(val);
                                    setEditHeroVideoUrl('');
                                  }
                                  return;
                                }
                              }
                              notify('클립보드에 이미지 또는 URL이 없습니다.');
                            } catch (err) {
                              console.warn(err);
                              notify('클립보드 붙여넣기에 실패했습니다. URL 입력창에서 Ctrl+V를 사용해주세요.');
                            }
                          }}
                          className="px-2.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white border border-black/15 dark:border-white/15 text-meta font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title="클립보드 미디어 붙여넣기"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          <span>PASTE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentUrl = editHeroVideoUrl || editHeroImg;
                            if (!currentUrl) return notify('복사할 HERO 미디어가 없습니다.');
                            if (editHeroVideoUrl) {
                              setEditVideoUrl(editHeroVideoUrl);
                              setEditImg('');
                            } else {
                              setEditImg(editHeroImg);
                              setEditVideoUrl('');
                            }
                            notify('HERO 미디어가 MAIN으로 복사되었습니다.');
                          }}
                          className="btn btn-primary flex shrink-0"
                          title="HERO 미디어를 MAIN으로 복사"
                        >
                          <span>TO MAIN</span>
                        </button>
                      </div>

                      {/* HERO Drag & Drop Box */}
                      <div
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsHeroDragActive(false); }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsHeroDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const file = e.dataTransfer.files[0];
                            if (file.type.startsWith('video/')) {
                              setIsUploading(true);
                              try {
                                const inspection = await inspectAndPrepareVideo(file);
                                if (!inspection.isCompatible) {
                                  notify("경고: 선택하신 동영상은 모바일(아이폰)에서 지원되지 않는 비표준 코덱(VP9/AV1/ProRes 등)을 포함하고 있습니다. 모바일 정상 재생을 위해 표준 H.264 MP4 형식의 영상을 권장합니다.");
                                }
                                const url = await uploadFileToR2(file, `covers/hero_${Date.now()}_${file.name}`);
                                setEditHeroVideoUrl(url);
                                setEditHeroImg('');
                              } catch (err) {
                                notify('비디오 업로드 실패');
                              } finally {
                                setIsUploading(false);
                              }
                            } else if (file.type.startsWith('image/')) {
                              setIsUploading(true);
                              try {
                                const compressedBlob = await compressImage(file, 2048, 2048, 0.85);
                                const url = await uploadFileToR2(compressedBlob, `covers/hero_${Date.now()}_${file.name}`);
                                setEditHeroImg(url);
                                setEditHeroVideoUrl('');
                              } catch (err) {
                                notify('이미지 업로드 실패');
                              } finally {
                                setIsUploading(false);
                              }
                            }
                          }
                        }}
                        className={`border border-black/15 dark:border-white/15 aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5 relative group flex items-center justify-center transition-all ${
                          isHeroDragActive ? 'border-dashed border-red-600 bg-red-500/10 scale-[1.01]' : ''
                        }`}
                      >
                        {editHeroVideoUrl ? (
                          <div className="relative w-full h-full">
                            <video src={getEffectiveImageUrl(editHeroVideoUrl)} controls muted playsInline preload="metadata" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditHeroVideoUrl('');
                                setEditHeroImg('');
                              }}
                              className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-micro font-extrabold uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                            >
                              Delete Video
                            </button>
                          </div>
                        ) : editHeroImg ? (
                          <div className="relative w-full h-full">
                            <img src={getEffectiveImageUrl(editHeroImg)} alt="Hero preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setEditHeroImg('');
                                setEditHeroVideoUrl('');
                              }}
                              className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white text-micro font-extrabold uppercase tracking-widest px-2 py-1 transition-colors z-20 cursor-pointer"
                            >
                              Delete Image
                            </button>
                          </div>
                        ) : (
                          <div className="text-black/60 dark:text-white/60 text-meta font-bold uppercase tracking-wider text-center flex flex-col items-center justify-center p-4">
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>히어로 미디어를 업로드 중입니다...</span>
                              </div>
                            ) : (
                              <span>히어로 이미지 또는 동영상을 드래그 앤 드롭하거나<br />위의 UPLOAD 버튼을 눌러주세요</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions: Clone, Move to Plan/Archive, Delete */}
              <div className="pt-6 border-t border-black/15 dark:border-white/15 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onCloneTrip(selectedJourney.id)}
                    className="btn btn-secondary flex"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Remix</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (isSelectedPlan) {
                        await onMoveToArchive(selectedJourney as Plan);
                        setEditTags(prev => prev.filter(t => t !== 'Plan' && t !== 'Archived'));
                        setEditTitle(prev => prev.replace(/\s*\(Plan\)$/i, '').trim());
                      } else {
                        await onMoveToPlans(selectedJourney);
                        setEditTags(prev => {
                          const next = prev.filter(t => t !== 'Archived');
                          return next.includes('Plan') ? next : [...next, 'Plan'];
                        });
                        setEditTitle(prev => prev.endsWith(' (Plan)') ? prev : `${prev} (Plan)`);
                      }
                    }}
                    className="btn btn-secondary flex"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isSelectedPlan ? 'LOG(여정)로 전환' : 'PLAN(계획)으로 전환'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTrip(selectedJourney.id)}
                  className="btn btn-outline-danger flex"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>휴지통으로 이동</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-black/60 dark:text-white/60 font-mono">
              우측 목록에서 편집할 여정을 선택해 주세요.
            </div>
          )}
        </div>

        {/* Right: Reorderable Journey List with Drag & Drop + [▲] / [▼] buttons */}
        <div
          onScroll={handleContainerScroll}
          className={`w-full lg:w-2/5 p-4 sm:p-6 overflow-y-auto max-h-[calc(100dvh-110px)] lg:max-h-[calc(100dvh-60px)] bg-black/[0.01] dark:bg-white/[0.01] ${
            mobileArchiveTab === 'LIST' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/15 dark:border-white/15">
            <span className="text-xs font-extrabold uppercase tracking-wider font-sans">
              JOURNEYS ORDER & SELECTION ({localJourneys.length})
            </span>
            <span className="text-meta font-mono text-black/60 dark:text-white/60">
              드래그 또는 ▲ ▼ 클릭
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {localJourneys.map((journey, idx) => {
              const isSelected = journey.id === selectedJourneyId;
              const isPlan = journey.tags?.includes('Plan') || journey.title.includes('(Plan)');

              return (
                <div
                  key={journey.id}
                  draggable={isLoggedIn}
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, idx)}
                  onClick={() => {
                    if (selectedJourneyId === journey.id) return;
                    executeWithGuard(() => {
                      setSelectedJourneyId(journey.id);
                      setMobileArchiveTab('EDIT');
                    });
                  }}
                  className={`p-2.5 border transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                    isSelected
                      ? 'bg-surface dark:bg-surface-dark border-red-600 dark:border-red-500 shadow-md ring-1 ring-red-600/30'
                      : 'bg-white/60 dark:bg-[#11110F]/60 border-black/15 dark:border-white/15 hover:border-black/40 dark:hover:border-white/40'
                  }`}
                >
                  {/* Drag Grip handle */}
                  <div className="cursor-grab active:cursor-grabbing text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Reorder [▲] / [▼] Minimal Stepper */}
                  <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(idx, 'up')}
                      disabled={idx === 0}
                      className="tap-target p-0.5 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(idx, 'down')}
                      disabled={idx === localJourneys.length - 1}
                      className="tap-target p-0.5 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Number Badge */}
                  <span className="font-mono text-xs font-extrabold text-black/60 dark:text-white/60 w-5 text-center shrink-0">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                    <img
                      src={getEffectiveImageUrl(journey.img)}
                      alt={journey.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-xs font-extrabold font-sans uppercase tracking-tight text-black dark:text-white truncate">
                        {journey.title.replace(' (Plan)', '')}
                      </h4>
                      {journey.statusBadge === 'NEW' ? (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-micro font-extrabold uppercase shrink-0">
                          NEW
                        </span>
                      ) : journey.statusBadge === 'EDITING' ? (
                        <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-micro font-extrabold uppercase shrink-0">
                          EDITING
                        </span>
                      ) : (journey.statusBadge === 'PLAN' || isPlan) ? (
                        <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-micro font-extrabold uppercase shrink-0">
                          PLAN
                        </span>
                      ) : null}
                    </div>
                    <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate">
                      {journey.date} · {journey.locationStr}
                    </span>
                  </div>

                  {/* Quick Direct Link to Journey */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      executeWithGuard(() => navigateSafely('detail', journey.id));
                    }}
                    className="tap-target p-1.5 text-black/60 dark:text-white/60 hover:text-red-600 dark:hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="여정 상세 페이지 바로 보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
