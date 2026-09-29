import { Trash2, MapPin, Plus, Maximize2, ArrowRight, Columns2, LayoutGrid } from 'lucide-react';
import { Footer } from '../../components/Footer';
import type { JourneyDetailState } from './useJourneyDetailState';

export function GalleryTab({ s }: { s: JourneyDetailState }) {
  const {
    isLoggedIn, timelineData, activeTab, visitedTabs, expandedItemId, setExpandedItemId, isEditing,
    setIsLightboxOpen, setLightboxIndex, isGalleryDragActive, galleryViewMode, setGalleryViewMode,
    galleryColumns, setGalleryColumns, collapsedGalleryDays, setCollapsedGalleryDays, fileInputRef,
    itemRefs, allTripDates, allGalleryImages, galleryUrlIndexMap, galleryGroups,
    handleJumpToTimelineItem, handleGalleryUpload, handleGalleryDragOver, handleGalleryDragLeave,
    handleGalleryDrop, handleUpdateGalleryImageNote, handleRemoveGalleryImage,
    handleToggleGalleryImagePin
  } = s;

  return (
    <>
        <div className={`h-auto flex flex-col w-full relative pb-16 ${activeTab === 'gallery' ? 'block' : 'hidden'}`}>
          {visitedTabs.has('gallery') && (() => {
            // Helper function to render a single gallery item
          const renderGalleryItem = (imgItem: typeof allGalleryImages[0], idx: number) => {
            const isPhotoActive = expandedItemId === imgItem.id;

            return (
              <div 
                ref={el => { itemRefs.current[imgItem.id] = el; }}
                key={`${imgItem.type}-${imgItem.url}-${idx}`} 
                onClick={() => {
                  setExpandedItemId(prev => prev === imgItem.id ? null : imgItem.id);
                }}
                onDoubleClick={() => {
                  const globalIdx = galleryUrlIndexMap.get(imgItem.url) ?? 0;
                  setLightboxIndex(globalIdx);
                  setExpandedItemId(imgItem.id);
                  setIsLightboxOpen(true);
                }}
                className={`h-full flex flex-col group/gallery transition-all duration-200 relative cursor-pointer select-none opacity-100 ${
                  isPhotoActive 
                    ? 'bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-inset ring-black/40 dark:ring-white/40 z-10' 
                    : 'bg-white dark:bg-[#0E0E0E] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Film-photo styled image container */}
                <div className="relative overflow-hidden border-b border-black/10 dark:border-white/10 transition-all duration-300 aspect-[4/3] group shrink-0">
                  <img
                    src={imgItem.url}
                    alt={imgItem.place || 'Gallery Photo'}
                    loading="lazy"
                    decoding="async"
                    data-pin-nopin="true"
                    data-pin-no-hover="true"
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/gallery:scale-105"
                  />

                  {/* Delete image button (only for gallery type) */}
                  {isLoggedIn && imgItem.type === 'gallery' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGalleryImage(imgItem.url, e);
                      }}
                      className={`tap-target absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-red-600 text-white transition-colors z-10 rounded-none ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100'}`}
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Map Pin Toggle Button (only for gallery type if coords exist) */}
                  {imgItem.type === 'gallery' && imgItem.lat !== undefined && imgItem.lng !== undefined && imgItem.lat !== null && imgItem.lng !== null && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newExclude = !imgItem.excludeFromMap;
                        await handleToggleGalleryImagePin(imgItem.url, newExclude);
                        if (!newExclude) {
                          setExpandedItemId(imgItem.id);
                        }
                      }}
                      className={`tap-target absolute top-2 ${isLoggedIn ? 'right-9' : 'right-2'} p-1.5 transition-colors z-10 rounded-none ${!imgItem.excludeFromMap ? 'bg-red-500 hover:bg-red-600 text-white opacity-100' : (isPhotoActive ? 'bg-black/75 hover:bg-black text-white/60 hover:text-white opacity-100' : 'bg-black/75 hover:bg-black text-white/60 hover:text-white opacity-0 group-hover/gallery:opacity-100 focus:opacity-100')}`}
                      title={imgItem.excludeFromMap ? "지도에 핀 표시하기" : "지도에서 핀 숨기기"}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Maximize / Expand button to trigger lightbox (bottom-right) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const globalIdx = galleryUrlIndexMap.get(imgItem.url) ?? 0;
                      setLightboxIndex(globalIdx);
                      setIsLightboxOpen(true);
                    }}
                    className={`tap-target absolute bottom-2 right-2 p-1.5 bg-black/75 hover:bg-black text-white transition-colors z-10 rounded-none ${isPhotoActive ? 'opacity-100' : 'opacity-0 group-hover/gallery:opacity-100 focus:opacity-100'}`}
                    title="전체화면"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="absolute inset-0 bg-black/0 group-hover/gallery:bg-black/10 transition-colors pointer-events-none" />
                </div>

                {/* Note / description area below image (Takes full remaining card height with flex-1) */}
                <div className="px-3 py-2.5 flex-1 flex flex-col justify-between gap-1 transition-colors duration-200 bg-transparent text-black dark:text-white">
                  {/* Top Meta: Date and Time */}
                  {imgItem.date && (
                    <div 
                      className="flex items-center gap-1 text-meta sm:text-meta font-mono font-medium text-black/60 dark:text-white/60 whitespace-nowrap truncate min-w-0"
                      title={`${imgItem.date}${imgItem.time ? ' · ' + imgItem.time : ''}`}
                    >
                      <span className="truncate">{imgItem.date}</span>
                      {imgItem.time && (
                        <>
                          <span className="text-black/60 dark:text-white/60 shrink-0">·</span>
                          <span className="shrink-0">{imgItem.time}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Title / Description */}
                  <div className="flex items-start justify-between gap-2 w-full mt-0.5">
                    <div className="flex-1 min-w-0">
                      {/* 1. Main Title: 일정 제목 (place) */}
                      {imgItem.place ? (
                        <h4 className="text-xs sm:text-[13px] font-sans font-bold leading-snug break-keep line-clamp-2 not-italic text-black dark:text-white">
                          {imgItem.place}
                        </h4>
                      ) : imgItem.type === 'gallery' && isEditing ? (
                        <input
                          type="text"
                          value={imgItem.imgNote || ''}
                          onChange={(e) => handleUpdateGalleryImageNote(imgItem.url, e.target.value)}
                          placeholder="사진 설명 추가..."
                          className="w-full bg-transparent outline-none text-xs sm:text-[13px] font-sans font-bold not-italic border-b pb-0.5 text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 border-black/20 dark:border-white/20"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : imgItem.imgNote ? (
                        <h4 className="text-xs sm:text-[13px] font-sans font-bold leading-snug break-keep line-clamp-2 not-italic text-black dark:text-white">
                          {imgItem.imgNote}
                        </h4>
                      ) : (
                        <p className="text-meta font-sans font-medium not-italic text-black/60 dark:text-white/60">기록된 제목 없음</p>
                      )}

                      {/* 2. Specified Location Name: 구글 자동완성 위치명 (location) */}
                      {((imgItem as any).location || (imgItem.type === 'gallery' && imgItem.place && imgItem.imgNote)) && (
                        <div className="text-meta sm:text-xs font-sans font-semibold tracking-tight flex items-center gap-1 mt-1 not-italic truncate text-black/70 dark:text-white/70">
                          <MapPin className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" />
                          <span className="truncate">{(imgItem as any).location || imgItem.place}</span>
                        </div>
                      )}
                    </div>

                    {/* Right action icons */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {(() => {
                        let targetItemId = imgItem.type === 'timeline' ? (imgItem as any).itemId : undefined;
                        const targetDate = imgItem.date || '';

                        if (imgItem.type === 'gallery' && targetDate) {
                          const itemsForDate = timelineData[targetDate] || [];
                          if (itemsForDate.length > 0) {
                            targetItemId = itemsForDate[0].id;
                          }
                        }

                        if (targetItemId !== undefined) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJumpToTimelineItem(targetItemId, targetDate);
                              }}
                              className="tap-target p-1 transition-colors cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black hover:text-white dark:hover:bg-black dark:hover:text-white text-black/60 dark:text-white/60"
                              title="일정으로 이동"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div 
              className="w-full flex flex-col relative min-h-[400px] animate-in fade-in duration-300"
              onDragOver={handleGalleryDragOver}
              onDragLeave={handleGalleryDragLeave}
              onDrop={handleGalleryDrop}
            >
              {/* Drag & Drop Visual Overlay */}
              {isGalleryDragActive && isLoggedIn && (
                <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center border-4 border-dashed border-red-600 m-2 transition-all">
                  <div className="text-white flex flex-col items-center gap-3">
                    <Plus className="w-12 h-12 animate-bounce text-red-500" />
                    <p className="text-sm md:text-base font-extrabold tracking-widest uppercase text-center">
                      Drop images here to add to gallery
                    </p>
                    <p className="text-xs text-white/60">
                      이미지를 여기에 놓으면 갤러리에 즉시 추가됩니다
                    </p>
                  </div>
                </div>
              )}

              {/* Add Gallery Image Area */}
              {isLoggedIn && (
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
              )}

              {/* Gallery View Mode & Column Toggle */}
              {allGalleryImages.length > 0 && (
                <div className="w-full flex items-center justify-between gap-2 py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/15 dark:border-white/15 flex-wrap">
                  <span className="text-meta font-mono font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                    {allGalleryImages.length} Photos
                  </span>
                  <div className="flex items-center gap-2">
                    {/* GRID / WIDE Toggle */}
                    <div className="flex border border-black/15 dark:border-white/15 p-0.5 bg-black/5 dark:bg-white/5 rounded-none">
                      <button
                        onClick={() => setGalleryColumns(4)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-micro md:text-meta font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                          galleryColumns === 4
                            ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                        title="Grid view (4 columns)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>GRID</span>
                      </button>
                      <button
                        onClick={() => setGalleryColumns(2)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-micro md:text-meta font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                          galleryColumns === 2
                            ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark shadow-xs'
                            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                        title="Wide view (2 columns)"
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                        <span>WIDE</span>
                      </button>
                    </div>

                    {/* DATE / TIME Toggle */}
                    <div className="flex border border-black/10 dark:border-white/10 p-0.5 bg-black/5 dark:bg-white/5">
                      <button
                        onClick={() => setGalleryViewMode('accordion')}
                        className={`px-2.5 py-1 text-micro md:text-meta font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          galleryViewMode === 'accordion'
                            ? 'bg-surface dark:bg-surface-dark text-black dark:text-white shadow-sm'
                            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        DATE
                      </button>
                      <button
                        onClick={() => setGalleryViewMode('grid')}
                        className={`px-2.5 py-1 text-micro md:text-meta font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          galleryViewMode === 'grid'
                            ? 'bg-surface dark:bg-surface-dark text-black dark:text-white shadow-sm'
                            : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        TIME
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {allGalleryImages.length === 0 ? (
                <div className="text-center py-16 text-black/60 dark:text-white/60 text-xs md:text-sm font-bold tracking-widest uppercase">
                  등록된 갤러리 사진이 없습니다.
                </div>
              ) : galleryViewMode === 'accordion' ? (
                <div className="flex flex-col w-full">
                  {/* Date Accordions */}
                  {allTripDates.map((date, idx) => {
                    const items = galleryGroups[date] || [];
                    const isCollapsed = collapsedGalleryDays.includes(date);
                    if (items.length === 0) return null;

                    return (
                      <div key={date} className="w-full border-b border-black/10 dark:border-white/10">
                        <button
                          onClick={() => {
                            if (isCollapsed) {
                              setCollapsedGalleryDays(prev => prev.filter(d => d !== date));
                            } else {
                              setCollapsedGalleryDays(prev => [...prev, date]);
                            }
                          }}
                          className="w-full flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] text-meta sm:text-xs font-extrabold uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold">DAY {idx + 1}</span>
                            <span className="text-black/60 dark:text-white/60">·</span>
                            <span className="font-mono text-black/70 dark:text-white/70">{date}</span>
                          </div>
                          <span className="text-meta font-mono font-bold text-black/60 dark:text-white/60 tracking-wider">
                            {items.length} PHOTOS {isCollapsed ? '▼' : '▲'}
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-px' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px'} bg-black/10 dark:bg-white/10 border-b border-black/10 dark:border-white/10`}>
                            {items.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* No Date Accordion */}
                  {galleryGroups['NO_DATE'] && galleryGroups['NO_DATE'].length > 0 && (() => {
                    const items = galleryGroups['NO_DATE'];
                    const isCollapsed = collapsedGalleryDays.includes('NO_DATE');
                    return (
                      <div className="w-full border-b border-black/10 dark:border-white/10">
                        <button
                          onClick={() => {
                            if (isCollapsed) {
                              setCollapsedGalleryDays(prev => prev.filter(d => d !== 'NO_DATE'));
                            } else {
                              setCollapsedGalleryDays(prev => [...prev, 'NO_DATE']);
                            }
                          }}
                          className="w-full flex items-center justify-between py-2.5 px-4 md:px-6 bg-black/[0.02] dark:bg-white/[0.02] text-meta sm:text-xs font-extrabold uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                        >
                          <span className="font-extrabold">NO DATE</span>
                          <span className="text-meta font-mono font-bold text-black/60 dark:text-white/60 tracking-wider">
                            {items.length} PHOTOS {isCollapsed ? '▼' : '▲'}
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-px' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px'} bg-black/10 dark:bg-white/10 border-b border-black/10 dark:border-white/10`}>
                            {items.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Timeline Grid View */
                <div className={`grid ${galleryColumns === 2 ? 'grid-cols-1 md:grid-cols-2 gap-px' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px'} bg-black/10 dark:bg-white/10 border-b border-black/10 dark:border-white/10`}>
                  {allGalleryImages.map((imgMeta, index) => renderGalleryItem(imgMeta, index))}
                </div>
              )}
              {/* Gallery footer */}
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
