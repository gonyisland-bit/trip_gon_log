import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, MessageSquare, Play, Pause, SkipBack } from 'lucide-react';

export interface LightboxImageMeta {
  url: string;
  date?: string;
  place?: string;
  memo?: string;
  imgNote?: string;
  type?: 'gallery' | 'timeline';
}

interface LightboxProps {
  isOpen: boolean;
  images: LightboxImageMeta[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Slideshow interval in milliseconds
const SLIDESHOW_INTERVAL = 4000;

export function Lightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showLog, setShowLog] = useState<boolean>(true);
  const [prevLoaded, setPrevLoaded] = useState<boolean>(false);
  const [nextLoaded, setNextLoaded] = useState<boolean>(false);

  // Slideshow state
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0); // 0-100 for progress bar
  const slideshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // True crossfade: old image fades out on top while new is already visible underneath
  const [fadeOutSrc, setFadeOutSrc] = useState<string | null>(null);
  const [fadeOutActive, setFadeOutActive] = useState(false);

  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsInnerRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef(true);

  // Reset first-scroll flag when lightbox opens
  useEffect(() => {
    if (isOpen) {
      isFirstScrollRef.current = true;
    }
  }, [isOpen]);

  // Auto-scroll active thumbnail to center
  useEffect(() => {
    if (!isOpen || isSlideshow) return;

    // Wait for CSS transition (300ms) on thumbnail size to finish
    const timer = setTimeout(() => {
      const container = thumbnailsContainerRef.current;
      const inner = thumbnailsInnerRef.current;
      const activeBtn = activeThumbnailRef.current;
      if (!container || !inner || !activeBtn) return;

      const containerWidth = container.clientWidth;

      // Set side padding on the inner strip so any item can be centered
      const halfContainer = Math.floor(containerWidth / 2);
      inner.style.paddingLeft = `${halfContainer}px`;
      inner.style.paddingRight = `${halfContainer}px`;

      // Compute center of the active button relative to inner strip origin (after padding)
      const innerRect = inner.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const btnCenterInInner = (btnRect.left - innerRect.left) + btnRect.width / 2;

      // scrollLeft such that btnCenter sits at containerWidth/2
      const targetScrollLeft = btnCenterInInner - containerWidth / 2;

      // Jump instantly on first open, smooth on navigation
      if (isFirstScrollRef.current) {
        container.scrollLeft = targetScrollLeft;
        isFirstScrollRef.current = false;
      } else {
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [currentIndex, isOpen, isSlideshow]);

  // ── Slideshow engine ──
  const stopSlideshow = useCallback(() => {
    if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    slideshowTimerRef.current = null;
    progressTimerRef.current = null;
    setSlideProgress(0);
  }, []);

  const startSlideshowCycle = useCallback(() => {
    stopSlideshow();
    setSlideProgress(0);

    // Progress bar ticks every 50ms
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setSlideProgress(Math.min(100, (elapsed / SLIDESHOW_INTERVAL) * 100));
    }, 50);

    slideshowTimerRef.current = setTimeout(() => {
      // Capture old image src BEFORE navigating
      const oldSrc = images[currentIndex]?.url ?? null;

      // 1. Place old image as an opaque absolute overlay
      setFadeOutSrc(oldSrc);
      setFadeOutActive(true);

      // 2. Immediately navigate — new image is now the "current" (fully visible underneath)
      onNavigate((currentIndex + 1) % images.length);

      // 3. On next two frames (ensure React has painted), start fading out the overlay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeOutActive(false); // triggers CSS transition opacity 1 → 0
        });
      });

      // 4. Clean up overlay after transition finishes
      setTimeout(() => {
        setFadeOutSrc(null);
        setFadeOutActive(false);
      }, 900); // slightly longer than CSS transition (700ms)
    }, SLIDESHOW_INTERVAL);
  }, [currentIndex, images, onNavigate, stopSlideshow]);

  // When slideshow is running and not paused, start a cycle on each index change
  useEffect(() => {
    if (isSlideshow && !isPaused) {
      startSlideshowCycle();
    } else {
      stopSlideshow();
    }
    return () => stopSlideshow();
  }, [isSlideshow, isPaused, currentIndex, startSlideshowCycle, stopSlideshow]);

  // Stop slideshow when lightbox closes
  useEffect(() => {
    if (!isOpen) {
      setIsSlideshow(false);
      setIsPaused(false);
      stopSlideshow();
    }
  }, [isOpen, stopSlideshow]);

  const handleStartSlideshow = () => {
    setIsSlideshow(true);
    setIsPaused(false);
    resetZoom();
  };

  const handleStopSlideshow = () => {
    setIsSlideshow(false);
    setIsPaused(false);
    stopSlideshow();
  };

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Touch event refs for mobile swiping & panning
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const limitPosition = (x: number, y: number, currentScale: number) => {
    if (!imgRef.current || !imgRef.current.parentElement) return { x, y };
    const img = imgRef.current;
    const container = img.parentElement as HTMLElement;
    
    const w = img.clientWidth;
    const h = img.clientHeight;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    
    const maxDeltaX = Math.max(0, (w * currentScale - cw) / 2);
    const maxDeltaY = Math.max(0, (h * currentScale - ch) / 2);
    
    return {
      x: Math.max(-maxDeltaX, Math.min(maxDeltaX, x)),
      y: Math.max(-maxDeltaY, Math.min(maxDeltaY, y))
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (scale <= 1) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    } else {
      setIsDragging(true);
      dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.current.x;
    const newY = touch.clientY - dragStart.current.y;
    setPosition(limitPosition(newX, newY, scale));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale <= 1 && touchStartX.current !== null && touchStartY.current !== null) {
      const touch = e.changedTouches[0];
      const distanceX = touch.clientX - touchStartX.current;
      const distanceY = touch.clientY - touchStartY.current;

      if (Math.abs(distanceX) > Math.abs(distanceY)) {
        if (Math.abs(distanceX) > minSwipeDistance) {
          if (distanceX > 0) {
            handlePrev();
          } else {
            handleNext();
          }
        }
      }
    }
    setIsDragging(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handlePrev = useCallback(() => {
    const nextIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  // ESC & Arrow key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isSlideshow) {
          handleStopSlideshow();
        } else {
          onClose();
        }
      }
      if (!isSlideshow) {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
      }
      if (isSlideshow && e.key === ' ') {
        e.preventDefault();
        handleTogglePause();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handlePrev, handleNext, onClose, isSlideshow]);

  // Reset zoom on image change
  useEffect(() => {
    resetZoom();
    setPrevLoaded(false);
    setNextLoaded(false);
  }, [currentIndex]);

  // Limit position on scale change
  useEffect(() => {
    setPosition(prev => limitPosition(prev.x, prev.y, scale));
  }, [scale]);

  if (!isOpen || images.length === 0) return null;

  const currentMeta = images[currentIndex];
  const prevMeta = images.length > 1 ? images[(currentIndex - 1 + images.length) % images.length] : null;
  const nextMeta = images.length > 1 ? images[(currentIndex + 1) % images.length] : null;

  // Always enable log panel for consistent layout container
  const hasLog = true;
  const hasDate = !!currentMeta.date;

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  function handleZoomIn() {
    setScale(prev => Math.min(prev + 0.25, 4));
  }

  function handleZoomOut() {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (scale > 1.1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.max(0.5, Math.min(prev + zoomFactor, 4)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition(limitPosition(newX, newY, scale));
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Format date: YYYY.MM.DD → 'MM / DD / YYYY' film stamp style
  function formatFilmDate(dateStr?: string) {
    if (!dateStr) return '';
    const parts = dateStr.replace(/\./g, '-').split('-');
    if (parts.length === 3) {
      return `${parts[1]} / ${parts[2]} / ${parts[0]}`;
    }
    return dateStr;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black flex flex-col select-none animate-in fade-in duration-300"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── SLIDESHOW MODE OVERLAY ── */}
      {isSlideshow && (
        <div className="absolute inset-0 z-30 flex flex-col pointer-events-none">
          {/* Top gradient + controls */}
          <div className="pointer-events-auto flex justify-between items-center px-5 py-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-2">
              {/* Image counter */}
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                {currentIndex + 1} / {images.length}
              </span>
              {isPaused && (
                <span className="text-orange-400 text-[9px] font-black uppercase tracking-widest animate-pulse ml-2">
                  ● PAUSED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Prev button */}
              <button
                onClick={handlePrev}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="이전 (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Pause / Resume */}
              <button
                onClick={handleTogglePause}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title={isPaused ? '재생 (Space)' : '일시정지 (Space)'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              {/* Next button */}
              <button
                onClick={handleNext}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="다음 (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="h-4 w-[1px] bg-white/20 mx-1" />
              {/* Stop slideshow */}
              <button
                onClick={handleStopSlideshow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest transition-all border border-white/20"
                title="슬라이드쇼 종료 (ESC)"
              >
                <SkipBack className="w-3.5 h-3.5" />
                갤러리로
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-all"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Bottom info + progress bar */}
          <div className="pointer-events-auto bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-10 flex flex-col items-center gap-3">
            {/* Place & memo */}
            <div className="text-center">
              {currentMeta.place && (
                <div className="text-white font-bold text-sm md:text-base tracking-wide uppercase mb-1">
                  {currentMeta.place}
                </div>
              )}
              {currentMeta.date && (
                <div
                  className="font-mono font-bold tracking-widest"
                  style={{ color: '#f97316', fontSize: 'clamp(11px, 1.4vw, 16px)', letterSpacing: '0.12em' }}
                >
                  {formatFilmDate(currentMeta.date)}
                </div>
              )}
              {(currentMeta.memo || currentMeta.imgNote) && (
                <div className="text-white/60 text-xs mt-1 max-w-lg truncate">
                  {currentMeta.memo || currentMeta.imgNote}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs h-[2px] bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-none"
                style={{ width: `${isPaused ? slideProgress : slideProgress}%` }}
              />
            </div>

            {/* Dot indicators */}
            <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { onNavigate(idx); }}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-4 h-1.5 bg-orange-500'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NORMAL MODE: Top Header controls ── */}
      {!isSlideshow && (
        <div className="flex justify-between items-center px-4 py-3 md:px-6 md:py-4 text-white z-20 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 pointer-events-none">
          <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold opacity-50 pointer-events-auto">
            {currentIndex + 1} / {images.length}
          </span>

          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            {/* Log toggle */}
            <button
              onClick={() => setShowLog(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all ${
                showLog
                  ? 'bg-white/10 border-white/20 text-white font-black'
                  : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
              title="Toggle log info"
            >
              <MessageSquare className="w-3 h-3" />
              Log {showLog ? 'ON' : 'OFF'}
            </button>

            <div className="h-4 w-[1px] bg-white/20 mx-1" />

            {/* Slideshow button */}
            {images.length > 1 && (
              <button
                onClick={handleStartSlideshow}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border border-white/20 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                title="슬라이드쇼 시작"
              >
                <Play className="w-3 h-3" />
                Slide
              </button>
            )}

            <div className="h-4 w-[1px] bg-white/20 mx-1" />

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <span className="text-[10px] md:text-xs font-mono font-bold w-10 text-center opacity-70">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={resetZoom}
              disabled={scale === 1 && position.x === 0 && position.y === 0}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="h-4 w-[1px] bg-white/20 mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
              title="Close (ESC)"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main image area */}
      <div
        className="flex-grow flex items-center justify-center relative overflow-hidden w-full"
        onWheel={isSlideshow ? undefined : handleWheel}
      >
        {/* Left Arrow (normal mode only) */}
        {!isSlideshow && images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* Center: Main Image with crossfade */}
        <div
          className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={isSlideshow ? undefined : handleMouseDown}
          onMouseMove={isSlideshow ? undefined : handleMouseMove}
        >
          <div
            className="relative inline-block"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: 'center center',
            }}
          >
            {/* ── New (current) image: always fully visible underneath ── */}
            <img
              ref={imgRef}
              src={currentMeta.url}
              alt="Fullscreen Gallery"
              onDoubleClick={isSlideshow ? undefined : handleDoubleClick}
              data-pin-nopin="true"
              style={{
                maxHeight: isSlideshow ? '100vh' : '72vh',
                maxWidth: isSlideshow ? '100vw' : '90vw',
                objectFit: 'contain',
                userSelect: 'none',
                display: 'block',
              }}
              className="shadow-2xl select-none"
              draggable={false}
            />

            {/* ── Crossfade overlay: old image fades out on top (no black flash) ── */}
            {fadeOutSrc && (
              <img
                src={fadeOutSrc}
                aria-hidden="true"
                data-pin-nopin="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: fadeOutActive ? 1 : 0,
                  transition: 'opacity 700ms ease',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            )}

            {/* ── Film Date Stamp: bottom-right of image ── */}
            {hasDate && showLog && !isSlideshow && (
              <div className="absolute bottom-3 right-3 z-30 pointer-events-none text-right">
                <span
                  className="font-mono font-bold tracking-widest leading-none"
                  style={{
                    fontSize: 'clamp(10px, 1.4vw, 17px)',
                    color: '#f97316',
                    textShadow: '0 0 10px rgba(249,115,22,0.95), 0 0 20px rgba(249,115,22,0.5), 1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)',
                    letterSpacing: '0.15em',
                  }}
                >
                  {formatFilmDate(currentMeta.date)}
                </span>
              </div>
            )}
          </div>

          {scale <= 1 && !isSlideshow && (
            <div
              className="absolute inset-0 z-10 w-full h-full cursor-pointer"
              onDoubleClick={handleDoubleClick}
            />
          )}
        </div>

        {/* Right Arrow (normal mode only) */}
        {!isSlideshow && images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none hidden md:flex"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip (hidden in slideshow mode) */}
      {images.length > 1 && !isSlideshow && (
        <div ref={thumbnailsContainerRef} className="w-full bg-black/40 py-2 border-t border-white/5 overflow-x-auto hide-scrollbar z-20 shrink-0">
          <div ref={thumbnailsInnerRef} className="flex gap-2 w-max">
            {images.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  ref={isActive ? activeThumbnailRef : null}
                  onClick={() => onNavigate(idx)}
                  className={`relative overflow-hidden transition-all duration-300 focus:outline-none shrink-0 ${
                    isActive 
                      ? 'w-10 h-10 md:w-12 md:h-12 border-2 border-orange-500 scale-110 opacity-100 z-10' 
                      : 'w-7 h-7 md:w-9 md:h-9 border border-white/20 opacity-40 hover:opacity-80'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumb ${idx + 1}`}
                    data-pin-nopin="true"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom captions panel (normal mode only) */}
      {showLog && !isSlideshow && (
        <div className="relative z-20 bg-black/90 border-t border-white/10 px-4 py-2.5 md:px-8 md:py-3 flex flex-col items-center justify-center gap-0.5 shrink-0 h-16 md:h-20 text-center w-full">
          {currentMeta.place ? (
            <div className="text-white font-bold text-xs md:text-sm tracking-wide truncate max-w-2xl uppercase">
              {currentMeta.place}
            </div>
          ) : (
            <div className="text-white/25 font-bold text-[10px] md:text-xs tracking-widest uppercase">
              No Location Tagged
            </div>
          )}
          {currentMeta.memo ? (
            <div className="text-white/70 text-[10px] md:text-xs font-medium tracking-wide text-center max-w-xl truncate">
              {currentMeta.memo}
            </div>
          ) : currentMeta.imgNote ? (
            <p className="text-orange-300/90 text-[10px] md:text-[11px] font-mono italic leading-relaxed text-center max-w-xl truncate">
              "{currentMeta.imgNote}"
            </p>
          ) : (
            <p className="text-white/25 text-[10px] md:text-[11px] font-mono italic">
              "No description added"
            </p>
          )}
        </div>
      )}

      {/* Hint when no log or date */}
      {(!showLog || !hasLog) && !hasDate && !isSlideshow && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-3 pt-6 text-center bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <p className="text-white/25 text-[9px] uppercase tracking-widest font-bold">
            Double click to Zoom · Swipe/Click Thumbnails to Navigate
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}
