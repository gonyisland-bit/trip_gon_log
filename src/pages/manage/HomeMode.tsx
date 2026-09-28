import {
  ChevronUp, ChevronDown, Trash2, Upload, Calendar, Check, Globe, X, Film, Image as ImageIcon,
  Search, Loader2, Plus, BookOpen, Layout, RefreshCw
} from 'lucide-react';
import { LandingHeroMediaItem } from '../../types';
import { PlaceAutocompleteInput } from '../../components/PlaceAutocompleteInput';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import type { ManageHubState } from './useManageHubState';

export function HomeMode({ s }: { s: ManageHubState }) {
  const {
    setActiveMode, setLocalLandingHeroImage, localLandingHeroMedia, setLocalLandingHeroMedia,
    isUploadingLandingHero, isDraggingLandingHero, setIsDraggingLandingHero,
    replacingLandingHeroIndex, dragOverLandingHeroIndex, setDragOverLandingHeroIndex,
    isHeroJourneysAccordionOpen, setIsHeroJourneysAccordionOpen, handleLandingHeroUpload,
    handleReplaceLandingHeroMedia, handleRemoveLandingHeroMedia, handleMoveLandingHeroMedia,
    handleMoveHeroOrder, handleToggleHero, localJourneys, sectionsList, setActiveMagSectionId, title,
    setTitle, selectedHeroIds, autoSlide, setAutoSlide, slideDuration, setSlideDuration,
    playVideoOnActivate, setPlayVideoOnActivate, heroSearchQuery, setHeroSearchQuery,
    homeMagSectionId, setHomeMagSectionId, homeJourneyLimit, setHomeJourneyLimit,
    handleContainerScroll, widgetShowCalendar, setWidgetShowCalendar, widgetShowWeather,
    setWidgetShowWeather, widgetOrder, setWidgetOrder, widgetShowExchange, setWidgetShowExchange,
    widgetShowDDay, setWidgetShowDDay, widgetCities, isAddingWeatherCity, setIsAddingWeatherCity,
    newCitySearchQuery, setNewCitySearchQuery, handleAddHomeWeatherCity, handleRemoveHomeWeatherCity,
    handleMoveHomeWeatherCity, filteredHeroCandidates
  } = s;

  return (
    <div
      onScroll={handleContainerScroll}
      className="w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100dvh-60px)] animate-in fade-in duration-200"
    >
      <div className="flex flex-col gap-8">
        {/* Header Title */}
        <div className="flex flex-col gap-1 border-b-2 border-black dark:border-white pb-4">
          <span className="text-micro font-mono font-extrabold uppercase tracking-widest text-red-600 dark:text-red-500 block mb-0.5">
            APP & HOMEPAGE CONFIGURATION
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
            HOME SETTING
          </h2>
          <p className="text-xs text-black/60 dark:text-white/60 font-mono">
            [홈페이지 메인 타이틀, 마퀴 배너, 히어로 슬라이드 및 큐레이션 매거진 설정]
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION: MAIN (메인 & 마퀴 설정)                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="flex flex-col gap-6 pt-2">
            <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-2">
              <h3 className="text-lg font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                MAIN
              </h3>
            </div>

            {/* Home Title */}
            <div className="flex flex-col gap-1.5 max-w-md">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                HOME TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="TRIP GON LOG"
                className="px-3 py-2 text-xs font-bold bg-transparent border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white text-black dark:text-white"
              />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECTION: HERO (히어로 설정)                                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                HERO
              </h3>
            </div>

            {/* Hero Auto Slide & Slide Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Hero Auto Slide Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                  HERO AUTO SLIDE
                </label>
                <button
                  type="button"
                  onClick={() => setAutoSlide(!autoSlide)}
                  className={`w-full py-2 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer rounded-none flex items-center justify-center ${
                    autoSlide
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                  }`}
                >
                  {autoSlide ? 'AUTO SLIDE: ON' : 'AUTO SLIDE: OFF'}
                </button>
              </div>

              {/* Hero Slide Limit (3s ~ 9s) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                    SLIDE LIMIT
                  </label>
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-500">
                    {slideDuration}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={3}
                    max={9}
                    step={1}
                    value={slideDuration}
                    onChange={e => setSlideDuration(parseInt(e.target.value, 10))}
                    className="flex-1 accent-black dark:accent-white cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    {[3, 5, 7, 9].map(sec => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSlideDuration(sec)}
                        className={`px-2 py-1 text-meta font-mono font-bold border transition-colors cursor-pointer ${
                          slideDuration === sec
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Autoplay On Hover Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-black/10 dark:border-white/10">
              <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                VIDEO AUTOPLAY ON HOVER
              </span>
              <button
                type="button"
                onClick={() => setPlayVideoOnActivate(!playVideoOnActivate)}
                className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer rounded-none ${
                  playVideoOnActivate
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                    : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
                }`}
              >
                {playVideoOnActivate ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Hero Journeys Selection */}
            <div className="flex flex-col gap-3 pt-2 border-t border-black/10 dark:border-white/10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                    HERO JOURNEYS
                  </label>
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-500">
                    {selectedHeroIds.length} ITEMS
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHeroJourneysAccordionOpen(prev => !prev)}
                  className="px-2.5 py-1 text-meta font-mono font-bold uppercase tracking-wider border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white transition-colors cursor-pointer flex items-center gap-1.5 text-black dark:text-white"
                >
                  <span>{isHeroJourneysAccordionOpen ? 'COLLAPSE' : 'SELECT JOURNEYS'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isHeroJourneysAccordionOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Selected Hero Slides Reorder List */}
              {selectedHeroIds.length > 0 && (
                <div className="flex flex-col gap-1.5 p-2 border border-black/15 dark:border-white/15">
                  <span className="text-meta font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60 px-1">
                    SLIDE ORDER
                  </span>
                  <div className="flex flex-col gap-1">
                    {selectedHeroIds.map((id, idx) => {
                      const journey = localJourneys.find(j => j.id === id);
                      if (!journey) return null;
                      return (
                        <div
                          key={id}
                          className="p-1.5 bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-500 w-5 shrink-0 text-center">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="w-8 h-8 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                              <img
                                src={getEffectiveImageUrl(journey.img)}
                                alt={journey.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate text-black dark:text-white font-sans">
                                {journey.title}
                              </div>
                              <div className="text-meta font-mono text-black/60 dark:text-white/60">
                                {journey.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveHeroOrder(idx, 'up')}
                              disabled={idx === 0}
                              className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="위로 이동"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveHeroOrder(idx, 'down')}
                              disabled={idx === selectedHeroIds.length - 1}
                              className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="아래로 이동"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleHero(id)}
                              className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-red-600 transition-colors cursor-pointer"
                              title="제거"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Journeys Checklist Search & Selection (Accordion-controlled) */}
              {isHeroJourneysAccordionOpen && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/60 dark:text-white/60" />
                    <input
                      type="text"
                      value={heroSearchQuery}
                      onChange={e => setHeroSearchQuery(e.target.value)}
                      placeholder="여정 검색 (제목, 장소)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#161616] border border-black/15 dark:border-white/15 outline-none rounded-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-black/15 dark:border-white/15 divide-y divide-black/10 dark:divide-white/10 bg-white dark:bg-[#161616]">
                    {filteredHeroCandidates.length === 0 ? (
                      <div className="p-4 text-center text-xs font-mono text-black/60 dark:text-white/60">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredHeroCandidates.map(journey => {
                        const isSelected = selectedHeroIds.includes(journey.id);
                        return (
                          <div
                            key={journey.id}
                            onClick={() => handleToggleHero(journey.id)}
                            className={`p-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-black/5 dark:bg-white/10'
                                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded-none border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                                  : 'border-black/30 dark:border-white/30'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="w-7 h-7 aspect-square border border-black/10 dark:border-white/10 shrink-0 overflow-hidden bg-black/10">
                                <img
                                  src={getEffectiveImageUrl(journey.img)}
                                  alt={journey.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-black dark:text-white font-sans">
                                  {journey.title}
                                </div>
                                <div className="text-meta font-mono text-black/60 dark:text-white/60">
                                  {journey.locationStr} · {journey.date}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-micro font-mono font-bold px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black shrink-0">
                                SLIDE #{selectedHeroIds.indexOf(journey.id) + 1}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Guest Landing Hero Media Configuration (Compact Swiss Minimal Layout) */}
              <div className="flex flex-col gap-3 pt-5 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
                      <span>GUEST LANDING HERO</span>
                      <span className="text-micro px-1.5 py-0.2 bg-red-600 text-white font-mono uppercase font-bold">SLIDESHOW</span>
                    </label>
                    <p className="text-meta font-mono text-black/60 dark:text-white/60 mt-0.5">
                      비로그인 방문자에게 풀스크린으로 재생되는 미디어입니다. (이미지/동영상 복수 등록 및 순서 변경 가능)
                    </p>
                  </div>
                  {localLandingHeroMedia.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalLandingHeroMedia([]);
                        setLocalLandingHeroImage('');
                      }}
                      className="text-meta font-mono text-red-600 hover:underline cursor-pointer"
                    >
                      전체 초기화 (RESET ALL)
                    </button>
                  )}
                </div>

                {/* URL Direct Add Input - Compact 1-line */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="미디어 URL 직접 추가 (https://... 이미지 또는 MP4 영상)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const inputEl = e.currentTarget;
                        const url = inputEl.value.trim();
                        if (!url) return;
                        const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
                        const newItem: LandingHeroMediaItem = {
                          id: `media_${Date.now()}`,
                          url,
                          type: isVideo ? 'video' : 'image',
                          title: isVideo ? 'WEB VIDEO SCENE' : 'WEB IMAGE SCENE'
                        };
                        setLocalLandingHeroMedia(prev => [...prev, newItem]);
                        inputEl.value = '';
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#161616] border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
                  />
                  <span className="text-meta font-mono text-black/60 dark:text-white/60 shrink-0">
                    [ENTER로 추가]
                  </span>
                </div>

                {/* Rolling Slot Grid: Registered media cards first, followed by a trailing + ADD MEDIA slot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* Registered Media Cards (Each card supports drag/drop and upload replacement) */}
                  {localLandingHeroMedia.map((item, idx) => {
                    const isBeingReplaced = replacingLandingHeroIndex === idx;
                    const isCardDragOver = dragOverLandingHeroIndex === idx;

                    return (
                      <div
                        key={item.id || `guest-item-${idx}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverLandingHeroIndex(idx);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverLandingHeroIndex(null);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverLandingHeroIndex(null);
                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            await handleReplaceLandingHeroMedia(idx, files[0]);
                          }
                        }}
                        className={`border bg-white dark:bg-[#161616] flex flex-col overflow-hidden group shadow-2xs transition-all ${
                          isCardDragOver
                            ? 'border-red-500 ring-2 ring-red-500'
                            : 'border-black/15 dark:border-white/15'
                        }`}
                      >
                        <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
                          {isBeingReplaced ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-black/80 text-white">
                              <Loader2 className="w-5 h-5 animate-spin text-white" />
                              <span className="text-micro font-mono font-bold tracking-wider">REPLACING...</span>
                            </div>
                          ) : (
                            <>
                              {item.type === 'video' ? (
                                <video
                                  src={item.url}
                                  muted
                                  playsInline
                                  className="w-full h-full object-cover brightness-90"
                                />
                              ) : (
                                <img
                                  src={getEffectiveImageUrl(item.url)}
                                  alt={item.title || `Slide ${idx + 1}`}
                                  className="w-full h-full object-cover brightness-90"
                                />
                              )}

                              {/* Drag-over drop overlay indicator */}
                              {isCardDragOver && (
                                <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center text-white font-mono text-meta font-bold">
                                  [드롭하여 교체]
                                </div>
                              )}

                              {/* Slot Number & Type Badge */}
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 text-white font-mono text-micro font-bold uppercase tracking-wider flex items-center gap-1">
                                {item.type === 'video' ? <Film className="w-2.5 h-2.5 text-red-400" /> : <ImageIcon className="w-2.5 h-2.5 text-blue-400" />}
                                <span>#{idx + 1}</span>
                              </div>

                              {/* Action Buttons Overlay: Replace & Delete */}
                              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                                <label
                                  className="p-1 bg-black/80 hover:bg-black text-white hover:text-red-400 transition-colors cursor-pointer flex items-center"
                                  title="이 슬롯의 미디어 교체"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    disabled={isBeingReplaced}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        await handleReplaceLandingHeroMedia(idx, file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLandingHeroMedia(item.id)}
                                  className="tap-target p-1 bg-black/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                  title="미디어 삭제"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="p-2 flex items-center justify-between gap-1 border-t border-black/10 dark:border-white/10">
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setLocalLandingHeroMedia(prev => prev.map((m, i) => i === idx ? { ...m, title: val } : m));
                            }}
                            placeholder="제목"
                            className="flex-1 text-meta font-mono font-bold bg-transparent outline-none border-b border-transparent focus:border-black dark:focus:border-white text-black dark:text-white truncate"
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveLandingHeroMedia(idx, 'up')}
                              className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                              title="앞으로 이동"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === localLandingHeroMedia.length - 1}
                              onClick={() => handleMoveLandingHeroMedia(idx, 'down')}
                              className="tap-target p-1 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                              title="뒤로 이동"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Trailing Slot: + ADD MEDIA (Expands automatically to the right) */}
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingLandingHero(true);
                    }}
                    onDragLeave={() => setIsDraggingLandingHero(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingLandingHero(false);
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        for (let i = 0; i < files.length; i++) {
                          await handleLandingHeroUpload(files[i]);
                        }
                      }
                    }}
                    className={`relative aspect-[16/9] border border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all bg-black/[0.01] dark:bg-white/[0.01] ${
                      isDraggingLandingHero
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {isUploadingLandingHero ? (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Loader2 className="w-5 h-5 animate-spin text-black dark:text-white" />
                        <span className="text-meta font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                          UPLOADING...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Upload className="w-4 h-4 text-black/60 dark:text-white/60" />
                        <span className="text-meta font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                          + ADD MEDIA
                        </span>
                        <span className="text-micro font-mono text-black/60 dark:text-white/60">
                          클릭 / 파일 드롭
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={isUploadingLandingHero}
                      onChange={async e => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          for (let i = 0; i < files.length; i++) {
                            await handleLandingHeroUpload(files[i]);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>


          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECTION: TRIP (여정 표시 설정 - 구 ARCHIVE)                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                TRIP
              </h3>
            </div>

            {/* Journeys Display Limit */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-mono font-bold uppercase text-black/80 dark:text-white/80">
                JOURNEYS DISPLAY LIMIT
              </span>
              <div className="flex items-center gap-1">
                {[4, 6, 8, 999].map(limit => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setHomeJourneyLimit(limit)}
                    className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      homeJourneyLimit === limit
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:border-black'
                    }`}
                  >
                    {limit === 999 ? 'ALL' : limit}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECTION: MAGAZINE (홈 매거진 연동 설정)                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
              <div className="flex items-baseline gap-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                  MAGAZINE
                </h3>
                <span className="text-xs font-mono font-bold text-black/60 dark:text-white/60 uppercase">
                  HOME CURATION
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMode('MAGAZINE')}
                className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>매거진 허브 편집기 바로가기 →</span>
              </button>
            </div>

            {/* 1. Feature Section Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                FEATURED MAGAZINE SECTION (홈에 노출할 매거진 섹션)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {sectionsList.map(sec => {
                  const isSelected = homeMagSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => setHomeMagSectionId(sec.id)}
                      className={`p-3 border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                          : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black dark:text-white hover:border-black/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs font-sans uppercase truncate">
                          {sec.title}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-meta font-mono opacity-70">
                        <span>{sec.items?.length || 0} ITEMS</span>
                        <span>{sec.isDefault ? 'DEFAULT' : 'CUSTOM'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Preview of Featured Section Cards (이미지 보유 카드 최대 3개 중심 미리보기) */}
            {(() => {
              const activeSec = sectionsList.find(s => s.id === homeMagSectionId) || sectionsList[0];
              // 이미지가 있는 카드만 필터링하여 최대 3개 미리보기 노출 (에디토리얼 텍스트 노트 등 섬네일 깨짐 배제)
              const imageItems = (activeSec?.items || []).filter(item => Boolean(item.img && item.img.trim() !== ''));
              const itemsToPreview = imageItems.slice(0, 3);

              return (
                <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      HOME PREVIEW ({itemsToPreview.length} / {imageItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMagSectionId(homeMagSectionId);
                        setActiveMode('MAGAZINE');
                      }}
                      className="text-meta font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      이 섹션 편집하기 →
                    </button>
                  </div>

                  {itemsToPreview.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-black/60 dark:text-white/60 border border-dashed border-black/20 dark:border-white/20">
                      선택된 매거진 섹션에 등록된 사진이 없습니다. 매거진 허브 편집기에서 사진을 추가해주세요.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 max-w-xl gap-2.5 p-2.5 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                      {itemsToPreview.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => {
                            setActiveMagSectionId(homeMagSectionId);
                            setActiveMode('MAGAZINE');
                          }}
                          className="group relative aspect-[3/4] overflow-hidden bg-black/10 border border-black/10 dark:border-white/10 cursor-pointer"
                          title={`${item.title} (클릭 시 매거진 편집기로 이동)`}
                        >
                          <img
                            src={getEffectiveImageUrl(item.img || '')}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                            <span className="text-micro font-mono text-white/70">#{idx + 1}</span>
                            <span className="text-meta font-bold text-white truncate">{item.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECTION: BOTTOM WIDGETS (홈 하단 달력 및 날씨 위젯 설정)        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <section className="flex flex-col gap-6 pt-6 border-t border-black/20 dark:border-white/20">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2">
              <div className="flex items-baseline gap-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white font-sans">
                  BOTTOM WIDGETS
                </h3>
                <span className="text-xs font-mono font-bold text-black/60 dark:text-white/60 uppercase">
                  CALENDAR & WEATHER SETTINGS
                </span>
              </div>
            </div>

            {/* 1. Widget Display Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Calendar Archive Toggle */}
              <div className="flex flex-col gap-1.5 p-3.5 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600 dark:text-red-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      달력 아카이브 위젯
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWidgetShowCalendar(!widgetShowCalendar)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      widgetShowCalendar ? 'bg-black dark:bg-white justify-end' : 'bg-black/20 dark:bg-white/20 justify-start'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full transition-transform ${
                      widgetShowCalendar ? 'bg-white dark:bg-black' : 'bg-white dark:bg-zinc-400'
                    }`} />
                  </button>
                </div>
                <p className="text-meta font-mono text-black/60 dark:text-white/60 mt-1">
                  홈 하단에 여행 일정 및 연간 캘린더 대시보드를 표시합니다.
                </p>
              </div>

              {/* Live Weather Widget Toggle */}
              <div className="flex flex-col gap-1.5 p-3.5 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                      실시간 세계 날씨 위젯
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWidgetShowWeather(!widgetShowWeather)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      widgetShowWeather ? 'bg-black dark:bg-white justify-end' : 'bg-black/20 dark:bg-white/20 justify-start'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full transition-transform ${
                      widgetShowWeather ? 'bg-white dark:bg-black' : 'bg-white dark:bg-zinc-400'
                    }`} />
                  </button>
                </div>
                <p className="text-meta font-mono text-black/60 dark:text-white/60 mt-1">
                  홈 하단에 여행지 및 주요 도시의 실시간 일기예보를 표시합니다.
                </p>
              </div>
            </div>

            {/* 2. Widget Priority Order */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                WIDGET DISPLAY ORDER (위젯 배치 우선순위)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWidgetOrder('calendar-first')}
                  className={`p-3 border text-left flex items-center justify-between cursor-pointer transition-all ${
                    widgetOrder === 'calendar-first'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black dark:text-white hover:border-black/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold font-mono uppercase">1. 달력 ➔ 2. 날씨</span>
                    <span className="text-meta opacity-70 font-mono">CALENDAR ARCHIVE FIRST</span>
                  </div>
                  {widgetOrder === 'calendar-first' && <Check className="w-4 h-4 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setWidgetOrder('weather-first')}
                  className={`p-3 border text-left flex items-center justify-between cursor-pointer transition-all ${
                    widgetOrder === 'weather-first'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'bg-white dark:bg-[#161616] border-black/15 dark:border-white/15 text-black dark:text-white hover:border-black/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold font-mono uppercase">1. 날씨 ➔ 2. 달력</span>
                    <span className="text-meta opacity-70 font-mono">LIVE WEATHER FIRST</span>
                  </div>
                  {widgetOrder === 'weather-first' && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </div>
            </div>

            {/* 3. Extended Modules (D-Day & Exchange Rates) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* D-Day Banner Toggle */}
              <div className="flex items-center justify-between p-3 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold uppercase text-black dark:text-white">
                    다가오는 여정 D-DAY 배너
                  </span>
                  <span className="text-meta font-mono text-black/60 dark:text-white/60">
                    UPCOMING TRIP D-DAY
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWidgetShowDDay(!widgetShowDDay)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    widgetShowDDay ? 'bg-black dark:bg-white justify-end' : 'bg-black/20 dark:bg-white/20 justify-start'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full transition-transform ${
                    widgetShowDDay ? 'bg-white dark:bg-black' : 'bg-white dark:bg-zinc-400'
                  }`} />
                </button>
              </div>

              {/* Live Exchange Rates Toggle */}
              <div className="flex items-center justify-between p-3 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold uppercase text-black dark:text-white">
                    실시간 주요 환율 정보 바
                  </span>
                  <span className="text-meta font-mono text-black/60 dark:text-white/60">
                    LIVE EXCHANGE RATES
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWidgetShowExchange(!widgetShowExchange)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    widgetShowExchange ? 'bg-black dark:bg-white justify-end' : 'bg-black/20 dark:bg-white/20 justify-start'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full transition-transform ${
                    widgetShowExchange ? 'bg-white dark:bg-black' : 'bg-white dark:bg-zinc-400'
                  }`} />
                </button>
              </div>
            </div>

            {/* 4. Weather Target Cities Management */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                    홈 날씨 대상 도시 목록 ({widgetCities.length}개 설정됨)
                  </label>
                  <span className="text-meta font-mono text-black/60 dark:text-white/60">
                    * 미설정 시 최근 등록된 여정의 여행지 및 세계 주요 도시가 자동 노출됩니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingWeatherCity(prev => !prev)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isAddingWeatherCity
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white text-black dark:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isAddingWeatherCity ? '닫기' : 'ADD CITY'}</span>
                </button>
              </div>

              {/* Autocomplete Input for Adding City */}
              {isAddingWeatherCity && (
                <div className="p-3 border border-black/20 dark:border-white/20 bg-white dark:bg-[#161616] flex flex-col gap-2 animate-in fade-in duration-150">
                  <span className="text-xs font-mono font-bold uppercase text-black/70 dark:text-white/70">
                    추가할 도시 또는 여행지 검색
                  </span>
                  <div className="relative">
                    <PlaceAutocompleteInput
                      value={newCitySearchQuery}
                      onChange={(val) => setNewCitySearchQuery(val)}
                      onSelectPlace={(placeName, coords, address, countryName, cityName) => {
                        handleAddHomeWeatherCity(placeName, coords, address, countryName, cityName);
                      }}
                      placeholder="도시명 검색 (예: 런던, 바르셀로나, 교토, 로마...)"
                      className="w-full h-8 px-3 text-xs bg-transparent border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white text-black dark:text-white outline-none rounded-none font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Cities List with Ordering & Deleting */}
              <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10 border border-black/15 dark:border-white/15 bg-white dark:bg-[#161616]">
                {widgetCities.length === 0 ? (
                  <div className="p-4 text-center text-xs font-mono text-black/60 dark:text-white/60">
                    등록된 맞춤 도시가 없습니다. (자동 감지 모드로 동작)
                  </div>
                ) : (
                  widgetCities.map((city, idx) => (
                    <div
                      key={`${city.nameEn}_${idx}`}
                      className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 truncate">
                        <span className="text-meta text-black/60 dark:text-white/60 font-bold w-4">
                          {idx + 1}
                        </span>
                        <div className="flex items-baseline gap-1.5 truncate">
                          <span className="font-bold text-black dark:text-white uppercase truncate">
                            {city.nameEn}
                          </span>
                          <span className="text-meta text-black/60 dark:text-white/60">
                            ({city.name}, {city.country})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveHomeWeatherCity(idx, 'up')}
                          disabled={idx === 0}
                          className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="위로 이동"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHomeWeatherCity(idx, 'down')}
                          disabled={idx === widgetCities.length - 1}
                          className="tap-target p-1 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer"
                          title="아래로 이동"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveHomeWeatherCity(idx)}
                          className="tap-target p-1 text-red-600/70 hover:text-red-600 dark:text-red-400/70 dark:hover:text-red-400 cursor-pointer ml-1"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
      </div>
    </div>
  );
}
