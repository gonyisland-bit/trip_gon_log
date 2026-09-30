import { Trash2, MapPin, MapPinOff, Plus, Maximize2, ArrowRight, Columns2, LayoutGrid, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { galleryThumbMap } from '../../utils/journeyThumbs';
import { Footer } from '../../components/Footer';
import { Segment } from '../../components/ui/Segment';
import type { JourneyDetailState } from './useJourneyDetailState';

// Round glass button over a photo
const overBtn = 'tap-target w-8 h-8 rounded-full inline-grid place-items-center text-white transition-colors z-10';

export function GalleryTab({ s }: { s: JourneyDetailState }) {
  const {
    isLoggedIn, timelineData, activeTab, visitedTabs, expandedItemId, setExpandedItemId, isEditing,
    setIsLightboxOpen, setLightboxIndex, isGalleryDragActive, galleryViewMode, setGalleryViewMode,
    galleryColumns, setGalleryColumns, collapsedGalleryDays, setCollapsedGalleryDays, fileInputRef,
    itemRefs, allTripDates, allGalleryImages, galleryUrlIndexMap, galleryGroups,
    handleJumpToTimelineItem, handleGalleryUpload, handleGalleryDragOver, handleGalleryDragLeave,
    handleGalleryDrop, handleUpdateGalleryImageNote, handleRemoveGalleryImage,
    handleToggleGalleryImagePin, trip
  } = s;
  // Grid tiles load the 480px copies when they exist (the viewer keeps the originals)
  const thumbs = galleryThumbMap(trip);
  // Columns follow the panel, not the window: from md the list is half the screen wide
  const gridCls = `grid ${galleryColumns === 2 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'} gap-2 sm:gap-3 px-3 sm:px-4`;
  const openViewer = (url: string, id?: number) => {
    setLightboxIndex(galleryUrlIndexMap.get(url) ?? 0);
    if (id !== undefined) setExpandedItemId(id);
    setIsLightboxOpen(true);
  };
  const toggleDay = (key: string) => setCollapsedGalleryDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);

  return (
    <>
        <div className={`h-auto flex flex-col w-full relative pb-16 ${activeTab === 'gallery' ? 'block' : 'hidden'}`}>
          {visitedTabs.has('gallery') && (() => {
          const renderGalleryItem = (imgItem: typeof allGalleryImages[0], idx: number) => {
            const isPhotoActive = expandedItemId === imgItem.id;
            const hasCoords = imgItem.type === 'gallery' && imgItem.lat !== undefined && imgItem.lng !== undefined && imgItem.lat !== null && imgItem.lng !== null;
            const showTools = isPhotoActive ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover/gallery:opacity-100 focus-within:opacity-100';

            // The journey item this photo belongs to (a gallery photo: that day's first item)
            let targetItemId = imgItem.type === 'timeline' ? (imgItem as any).itemId : undefined;
            const targetDate = imgItem.date || '';
            if (imgItem.type === 'gallery' && targetDate) {
              const itemsForDate = timelineData[targetDate] || [];
              if (itemsForDate.length > 0) targetItemId = itemsForDate[0].id;
            }

            return (
              <div
                ref={el => { itemRefs.current[imgItem.id] = el; }}
                key={`${imgItem.type}-${imgItem.url}-${idx}`}
                onClick={() => setExpandedItemId(prev => prev === imgItem.id ? null : imgItem.id)}
                onDoubleClick={() => openViewer(imgItem.url, imgItem.id)}
                className={`tgl-cv-tile tgl-card-edge h-full flex flex-col group/gallery relative cursor-pointer select-none rounded-card overflow-hidden transition-colors ${
                  isPhotoActive ? 'bg-selected dark:bg-selected-dark ring-[1.5px] ring-inset ring-black/40 dark:ring-white/70 shadow-sm' : 'bg-surface dark:bg-surface-dark'
                }`}
              >
                <div className="relative overflow-hidden aspect-[4/3] shrink-0 bg-black/[0.04] dark:bg-white/[0.06]">
                  <img
                    src={thumbs.get(imgItem.url) || imgItem.url}
                    alt={imgItem.place || '여행 사진'}
                    loading="lazy"
                    decoding="async"
                    data-pin-nopin="true"
                    data-pin-no-hover="true"
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    className="w-full h-full object-cover transition-transform duration-500 md:group-hover/gallery:scale-[1.03]"
                  />

                  {/* Top right: map pin (on stays visible), delete */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {hasCoords && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newExclude = !imgItem.excludeFromMap;
                          await handleToggleGalleryImagePin(imgItem.url, newExclude);
                          if (!newExclude) setExpandedItemId(imgItem.id);
                        }}
                        className={`${overBtn} ${!imgItem.excludeFromMap ? 'bg-red-600 hover:bg-red-700 opacity-100' : `bg-black/55 hover:bg-black/75 ${showTools}`}`}
                        aria-pressed={!imgItem.excludeFromMap}
                        aria-label={imgItem.excludeFromMap ? '지도에 표시' : '지도에서 숨기기'}
                        title={imgItem.excludeFromMap ? '지도에 표시' : '지도에서 숨기기'}
                      >
                        {imgItem.excludeFromMap ? <MapPinOff className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isLoggedIn && imgItem.type === 'gallery' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveGalleryImage(imgItem.url, e); }}
                        className={`${overBtn} bg-black/55 hover:bg-red-600 ${showTools}`}
                        aria-label="사진 삭제"
                        title="사진 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openViewer(imgItem.url); }}
                    className={`${overBtn} absolute bottom-2 right-2 bg-black/55 hover:bg-black/75 ${showTools}`}
                    aria-label="크게 보기"
                    title="크게 보기"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Caption: date · time, title, place, and the way back to the journey item */}
                <div className="px-3 py-2.5 flex-1 flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    {imgItem.date && (
                      <span className="font-mono text-micro font-bold tracking-wider text-black/50 dark:text-white/50 truncate tabular-nums">
                        {imgItem.date}{imgItem.time ? ` · ${imgItem.time}` : ''}
                      </span>
                    )}
                    {imgItem.place ? (
                      <h4 className="text-[13px] font-bold leading-snug break-keep line-clamp-2">{imgItem.place}</h4>
                    ) : imgItem.type === 'gallery' && isEditing ? (
                      <input
                        type="text"
                        value={imgItem.imgNote || ''}
                        onChange={(e) => handleUpdateGalleryImageNote(imgItem.url, e.target.value)}
                        placeholder="사진 설명"
                        className="w-full h-8 px-3 mt-0.5 rounded-full bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 outline-none text-[13px] font-bold placeholder-black/35 dark:placeholder-white/35 focus:border-black/40 dark:focus:border-white/40"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : imgItem.imgNote ? (
                      <h4 className="text-[13px] font-bold leading-snug break-keep line-clamp-2">{imgItem.imgNote}</h4>
                    ) : (
                      <span className="text-meta text-black/45 dark:text-white/45">제목 없음</span>
                    )}
                    {((imgItem as any).location || (imgItem.type === 'gallery' && imgItem.place && imgItem.imgNote)) && (
                      <span className="text-meta text-black/60 dark:text-white/60 truncate">{(imgItem as any).location || imgItem.place}</span>
                    )}
                  </div>
                  {targetItemId !== undefined && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleJumpToTimelineItem(targetItemId, targetDate); }}
                      className="tap-target w-8 h-8 -mr-1 rounded-full inline-grid place-items-center shrink-0 text-black/55 dark:text-white/55 hover:bg-black/[0.05] dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                      aria-label="일정으로 이동"
                      title="일정으로 이동"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          };

          // A day of photos: a quiet header that folds its grid
          const renderDay = (key: string, title: string, meta: string | null, items: typeof allGalleryImages) => {
            const isCollapsed = collapsedGalleryDays.includes(key);
            return (
              <section key={key} className="w-full flex flex-col pb-2">
                <button
                  type="button"
                  onClick={() => toggleDay(key)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between gap-3 py-3 px-4 md:px-6 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600"
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-extrabold">{title}</span>
                    {meta && <span className="font-mono text-micro font-bold tracking-wider text-black/50 dark:text-white/50 truncate">{meta}</span>}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 text-black/55 dark:text-white/55">
                    <span className="font-mono text-micro font-bold tabular-nums">{items.length}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-base ${isCollapsed ? '-rotate-90' : ''}`} aria-hidden />
                  </span>
                </button>
                {!isCollapsed && <div className={gridCls}>{items.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}</div>}
              </section>
            );
          };

          return (
            <div
              className="w-full flex flex-col relative min-h-[400px] animate-in fade-in duration-300"
              onDragOver={handleGalleryDragOver}
              onDragLeave={handleGalleryDragLeave}
              onDrop={handleGalleryDrop}
            >
              {/* Drop to add */}
              {isGalleryDragActive && isLoggedIn && (
                <div className="absolute inset-2 z-30 rounded-card bg-black/60 dark:bg-black/75 flex flex-col items-center justify-center gap-3 text-white pointer-events-none">
                  <Plus className="w-10 h-10" aria-hidden />
                  <p className="text-sm font-bold">여기에 놓으면 사진이 추가됩니다</p>
                </div>
              )}

              {isLoggedIn && (
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
              )}

              {/* Count, add, layout and order */}
              {allGalleryImages.length > 0 && (
                <div className="w-full flex items-center justify-between gap-2 py-2.5 px-4 md:px-6 flex-wrap">
                  <span className="font-mono text-micro font-bold tracking-wider text-black/55 dark:text-white/55 tabular-nums">
                    사진 {allGalleryImages.length}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isLoggedIn && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">
                        <Plus className="w-3.5 h-3.5" aria-hidden />사진
                      </button>
                    )}
                    <Segment
                      size="sm"
                      ariaLabel="사진 크기"
                      value={galleryColumns === 2 ? 'wide' : 'grid'}
                      onChange={(v) => setGalleryColumns(v === 'wide' ? 2 : 4)}
                      options={[
                        { value: 'grid', label: <span className="sr-only">격자</span>, icon: LayoutGrid },
                        { value: 'wide', label: <span className="sr-only">크게</span>, icon: Columns2 },
                      ]}
                    />
                    <Segment
                      size="sm"
                      ariaLabel="사진 정렬"
                      value={galleryViewMode === 'accordion' ? 'date' : 'time'}
                      onChange={(v) => setGalleryViewMode(v === 'date' ? 'accordion' : 'grid')}
                      options={[
                        { value: 'date', label: '날짜별' },
                        { value: 'time', label: '시간순' },
                      ]}
                    />
                  </div>
                </div>
              )}

              {allGalleryImages.length === 0 ? (
                <div className="tgl-card-edge mx-3 sm:mx-4 my-2 flex flex-col items-center gap-3 py-12 rounded-card bg-surface dark:bg-surface-dark text-center">
                  <ImageIcon className="w-6 h-6 text-black/40 dark:text-white/40" aria-hidden />
                  <span className="text-sm text-black/60 dark:text-white/60">등록된 사진이 없습니다.</span>
                  {isLoggedIn && (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
                      <Plus className="w-3.5 h-3.5" aria-hidden />사진 추가
                    </button>
                  )}
                </div>
              ) : galleryViewMode === 'accordion' ? (
                <div className="flex flex-col w-full">
                  {allTripDates.map((date, idx) => {
                    const items = galleryGroups[date] || [];
                    if (items.length === 0) return null;
                    return renderDay(date, `DAY ${idx + 1}`, date, items);
                  })}
                  {galleryGroups['NO_DATE'] && galleryGroups['NO_DATE'].length > 0 && renderDay('NO_DATE', '날짜 없음', null, galleryGroups['NO_DATE'])}
                </div>
              ) : (
                <div className={`${gridCls} pt-1`}>
                  {allGalleryImages.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                </div>
              )}
              <div className="w-full shrink-0 mt-12">
                <Footer className="mt-0" />
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
