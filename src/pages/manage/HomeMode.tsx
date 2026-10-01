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
            LANDING
          </h2>
          <p className="text-xs text-black/60 dark:text-white/60 font-mono">
            [로그인 전 첫 화면과 홈 제목. 회원 홈의 히어로 · 매거진 · 위젯은 각자 콘텐츠와 설정으로 자동 구성됩니다]
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
                GUEST LANDING
              </h3>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-black/10 dark:border-white/10">
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
                      Reset all
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
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-surface dark:bg-surface-dark border border-black/20 dark:border-white/20 outline-none rounded-none focus:border-black dark:focus:border-white"
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
                        className={`border bg-surface dark:bg-surface-dark flex flex-col overflow-hidden group shadow-2xs transition-all ${
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
                                {item.type === 'video' ? <Film className="w-2.5 h-2.5 text-red-400" /> : <ImageIcon className="w-2.5 h-2.5 text-white/80" />}
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
      </div>
    </div>
  );
}
