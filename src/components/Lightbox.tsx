import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackToClose } from '../utils/overlayHistory';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { bgmPlayer, BgmTrack } from '../utils/audioHelper';
import { lockBodyScroll } from '../utils/scrollLock';


export interface LightboxImageMeta {
  url: string;
  date?: string;
  place?: string;
  location?: string;
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

export function Lightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  // The back gesture closes the lightbox instead of leaving the page
  useBackToClose(isOpen, onClose);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showLog, setShowLog] = useState<boolean>(true);
  const [prevLoaded, setPrevLoaded] = useState<boolean>(false);
  const [nextLoaded, setNextLoaded] = useState<boolean>(false);

  // Background music button. The slideshow is the magazine's Memory Reel; this viewer has none.
  const [isBgmPlaying, setIsBgmPlaying] = useState(() => bgmPlayer.isPlaying());
  const [currentBgmTrack, setCurrentBgmTrack] = useState<BgmTrack | null>(() => bgmPlayer.getCurrentTrack());

  useEffect(() => {
    const unsub = bgmPlayer.subscribe(() => {
      setIsBgmPlaying(bgmPlayer.isPlaying());
      setCurrentBgmTrack(bgmPlayer.getCurrentTrack());
    });
    return () => unsub();
  }, []);

  // Ambient Blur Background crossfade state
  const [ambientCurrUrl, setAmbientCurrUrl] = useState<string>(images[currentIndex]?.url || '');
  const [ambientPrevUrl, setAmbientPrevUrl] = useState<string | null>(null);
  const [isAmbientFading, setIsAmbientFading] = useState<boolean>(false);

  useEffect(() => {
    const nextUrl = images[currentIndex]?.url || '';
    if (nextUrl && nextUrl !== ambientCurrUrl) {
      setAmbientPrevUrl(ambientCurrUrl);
      setAmbientCurrUrl(nextUrl);
      setIsAmbientFading(true);
      const timer = setTimeout(() => {
        setAmbientPrevUrl(null);
        setIsAmbientFading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, images, ambientCurrUrl]);

  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);
  const thumbnailsContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsInnerRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const isTouchingThumbsRef = useRef(false);
  const isUserScrollingThumbsRef = useRef(false);
  const thumbScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetUserScrollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWheelTimeRef = useRef<number>(0);
  const wheelVelocityRef = useRef<number>(1);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const scaleRef = useRef(scale);
  const positionRef = useRef(position);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Preload adjacent images for instantaneous navigation
  useEffect(() => {
    if (!isOpen || !images || images.length === 0) return;
    const prevIdx = (currentIndex - 1 + images.length) % images.length;
    const nextIdx = (currentIndex + 1) % images.length;
    [images[prevIdx]?.url, images[nextIdx]?.url].forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [currentIndex, isOpen, images]);

  // Reset first-scroll flag when lightbox opens
  useEffect(() => {
    if (isOpen) {
      isFirstScrollRef.current = true;
      isUserScrollingThumbsRef.current = false;
    }
  }, [isOpen]);

  // Auto-scroll active thumbnail to center immediately on index change (only when not directly scrolled by user)
  useEffect(() => {
    if (!isOpen) return;

    if (isUserScrollingThumbsRef.current) {
      // User is scrolling thumbnail bar; do NOT fight momentum with scrollTo!
      return;
    }

    const container = thumbnailsContainerRef.current;
    const activeBtn = activeThumbnailRef.current;
    if (container && activeBtn) {
      isProgrammaticScrollRef.current = true;
      const targetScrollLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
      container.scrollTo({
        left: targetScrollLeft,
        behavior: isFirstScrollRef.current ? 'auto' : 'smooth',
      });
      isFirstScrollRef.current = false;
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 350);
    }
  }, [currentIndex, isOpen]);

  // Settle helper to compute nearest thumbnail at exact final stop position
  const settleThumbnailImmediate = useCallback(() => {
    const container = thumbnailsContainerRef.current;
    const inner = thumbnailsInnerRef.current;
    if (!container || !inner) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = currentIndex;
    let minDistance = Infinity;

    const buttons = inner.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
      const btnCenter = btn.offsetLeft + btn.clientWidth / 2;
      const dist = Math.abs(btnCenter - containerCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    if (closestIndex !== currentIndex && closestIndex >= 0 && closestIndex < images.length) {
      isUserScrollingThumbsRef.current = true;
      onNavigate(closestIndex);
      if (resetUserScrollingTimeoutRef.current) clearTimeout(resetUserScrollingTimeoutRef.current);
      resetUserScrollingTimeoutRef.current = setTimeout(() => {
        isUserScrollingThumbsRef.current = false;
      }, 300);
    } else {
      if (resetUserScrollingTimeoutRef.current) clearTimeout(resetUserScrollingTimeoutRef.current);
      resetUserScrollingTimeoutRef.current = setTimeout(() => {
        isUserScrollingThumbsRef.current = false;
      }, 200);
    }
  }, [currentIndex, images.length, onNavigate]);

  // Schedule settle calculation when momentum scroll ends
  const scheduleThumbnailSettle = useCallback(() => {
    if (thumbScrollTimeoutRef.current) clearTimeout(thumbScrollTimeoutRef.current);

    thumbScrollTimeoutRef.current = setTimeout(() => {
      if (isTouchingThumbsRef.current) return;
      settleThumbnailImmediate();
    }, 180);
  }, [settleThumbnailImmediate]);

  // Handle user drag/scroll on thumbnail bar
  const handleThumbnailsScroll = () => {
    if (!isOpen || isProgrammaticScrollRef.current) return;
    isUserScrollingThumbsRef.current = true;
    scheduleThumbnailSettle();
  };

  // Convert mouse wheel up/down to horizontal scroll with 1-by-1 step and acceleration
  const handleThumbnailsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = thumbnailsContainerRef.current;
    if (!container || !isOpen) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation();
      isUserScrollingThumbsRef.current = true;
      if (thumbScrollTimeoutRef.current) clearTimeout(thumbScrollTimeoutRef.current);

      const now = performance.now();
      const timeSinceLast = now - lastWheelTimeRef.current;
      lastWheelTimeRef.current = now;

      // Detect rapid successive wheel events for smooth acceleration
      if (timeSinceLast < 110) {
        wheelVelocityRef.current = Math.min(wheelVelocityRef.current + 0.3, 3.5);
      } else {
        wheelVelocityRef.current = 1.0;
      }

      const sign = Math.sign(e.deltaY);
      // Single notch moves exactly 1 thumbnail (56px), accelerating only on continuous spin
      const moveDistance = 56 * wheelVelocityRef.current;
      const finalDelta = sign * moveDistance;

      container.scrollLeft += finalDelta;
      scheduleThumbnailSettle();
    }
  };

  // Native scrollend listener for instantaneous and perfect settle on mobile
  useEffect(() => {
    const container = thumbnailsContainerRef.current;
    if (!container || !isOpen) return;

    const onScrollEnd = () => {
      if (isTouchingThumbsRef.current) return;
      if (thumbScrollTimeoutRef.current) clearTimeout(thumbScrollTimeoutRef.current);
      settleThumbnailImmediate();
    };

    container.addEventListener('scrollend', onScrollEnd);
    return () => {
      container.removeEventListener('scrollend', onScrollEnd);
    };
  }, [isOpen, settleThumbnailImmediate]);

  // ── Native Non-Passive Pinch-to-Zoom Listener on Mobile ──
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el || !isOpen) return;

    let startPinchDist = 0;
    let startScaleVal = 1;
    let isPinching = false;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let posStart = { x: 0, y: 0 };

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        isPanning = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        startPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        startScaleVal = scaleRef.current;
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        isPanning = true;
        isPinching = false;
        panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        posStart = { ...positionRef.current };
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching && startPinchDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const ratio = curDist / startPinchDist;
        const targetScale = Math.max(0.7, Math.min(5.0, startScaleVal * ratio));
        setScale(targetScale);
      } else if (e.touches.length === 1 && isPanning && scaleRef.current > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.x;
        const dy = e.touches[0].clientY - panStart.y;
        const newX = posStart.x + dx;
        const newY = posStart.y + dy;
        setPosition(limitPosition(newX, newY, scaleRef.current));
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (isPinching) {
        isPinching = false;
        startPinchDist = 0;
        if (scaleRef.current < 1.05) {
          resetZoom();
        } else {
          setPosition(prev => limitPosition(prev.x, prev.y, scaleRef.current));
        }
      }
      if (isPanning) {
        isPanning = false;
      }
    };

    el.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    el.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleNativeTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleNativeTouchStart);
      el.removeEventListener('touchmove', handleNativeTouchMove);
      el.removeEventListener('touchend', handleNativeTouchEnd);
      el.removeEventListener('touchcancel', handleNativeTouchEnd);
    };
  }, [isOpen]);

  // Music stops and fullscreen (the F key) ends when the lightbox closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      bgmPlayer.stop();
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
      } catch (_) {}
    }
    return () => {
      bgmPlayer.stop();
    };
  }, [isOpen]);

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
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.current.x;
      const newY = touch.clientY - dragStart.current.y;
      setPosition(limitPosition(newX, newY, scale));
    }
  };

  const lastTouchTimeRef = useRef<number>(0);
  const lastTouchZoomTimeRef = useRef<number>(0);

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      const touch = e.changedTouches[0];
      const distanceX = touch.clientX - touchStartX.current;
      const distanceY = touch.clientY - touchStartY.current;

      // Double-tap detection on mobile (stationary tap within 18px and 350ms)
      if (Math.abs(distanceX) < 18 && Math.abs(distanceY) < 18) {
        const now = Date.now();
        if (now - lastTouchTimeRef.current < 350) {
          // Double-tap detected on mobile: toggle between 2.5x and 1x
          if (scale > 1.1) {
            resetZoom();
          } else {
            setScale(2.5);
          }
          lastTouchZoomTimeRef.current = Date.now();
          lastTouchTimeRef.current = 0;
          setIsDragging(false);
          touchStartX.current = null;
          touchStartY.current = null;
          return;
        }
        lastTouchTimeRef.current = now;
      } else if (scale <= 1) {
        // Swipe gesture (only when not zoomed in)
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

  // ESC & Arrow & zoom key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F key: toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        try {
          if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
          } else {
            const docEl = document.documentElement as any;
            if (docEl.requestFullscreen) {
              docEl.requestFullscreen();
            } else if (docEl.webkitRequestFullscreen) {
              docEl.webkitRequestFullscreen();
            }
          }
        } catch (_) {}
      }

      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleZoomIn();
      }
      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleZoomOut();
      }
      if (e.key === '*' || e.code === 'NumpadMultiply') {
        e.preventDefault();
        resetZoom();
      }
    };

    let unlock = () => {};
    if (isOpen) {
      unlock = lockBodyScroll();
      // Clear any remaining focus on clicked thumbnail buttons
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.focus();
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      unlock();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    handlePrev,
    handleNext,
    onClose,
  ]);

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
    // If a touch double-tap was recently handled within 600ms, ignore this synthetic mouse double-click
    if (Date.now() - lastTouchZoomTimeRef.current < 600) {
      return;
    }
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
    // Guard against synthetic mousedown right after touch double-tap zoom
    if (Date.now() - lastTouchZoomTimeRef.current < 600) return;
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
      data-bg-cover
      className="fixed inset-0 z-player bg-black flex flex-col select-none animate-in fade-in duration-75 will-change-transform overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Ambient Blur Background (사진 고유 색감 퍼짐 효과) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
        {/* Current ambient blurred image */}
        {ambientCurrUrl && (
          <div
            className="absolute inset-0 scale-125 bg-cover bg-center blur-3xl opacity-80 brightness-115 saturate-150 transition duration-500 will-change-transform"
            style={{ backgroundImage: `url("${ambientCurrUrl}")` }}
          />
        )}

        {/* Previous ambient blurred image for smooth 500ms crossfade transition */}
        {ambientPrevUrl && (
          <div
            className={`absolute inset-0 scale-125 bg-cover bg-center blur-3xl brightness-115 saturate-150 transition-all duration-500 will-change-transform ${
              isAmbientFading ? 'opacity-0' : 'opacity-80'
            }`}
            style={{ backgroundImage: `url("${ambientPrevUrl}")` }}
          />
        )}

        {/* 20% Black Dim Overlay on top of ambient blur */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Top header controls ── */}
      <div className="flex justify-between items-center px-4 py-3 md:px-6 md:py-4 text-white z-20 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 pointer-events-none">
        <span className="text-meta md:text-xs uppercase tracking-widest font-bold opacity-50 pointer-events-auto">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {/* Log toggle */}
          <button
            onClick={() => setShowLog(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-micro font-extrabold uppercase tracking-widest border transition-all ${
              showLog
                ? 'bg-white/10 border-white/20 text-white font-extrabold'
                : 'border-white/10 text-white/60 hover:text-white/70 hover:border-white/20'
            }`}
            title="Toggle log info"
          >
            <MessageSquare className="w-3 h-3" />
            Log {showLog ? 'ON' : 'OFF'}
          </button>

          <div className="h-4 w-[1px] bg-white/20 mx-1" />

          {/* BGM Toggle in Normal Mode */}
          <button
            onClick={() => bgmPlayer.toggle()}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-micro font-extrabold uppercase tracking-widest border transition-all ${
              isBgmPlaying
                ? 'border-red-500/80 bg-red-500/10 text-red-400 font-extrabold'
                : 'border-white/20 hover:bg-white/10 text-white/60 hover:text-white'
            }`}
            title={isBgmPlaying ? `배경음악 끄기 (${currentBgmTrack?.title || 'BGM'})` : '배경음악 켜기'}
          >
            {isBgmPlaying ? <Volume2 className="w-3 h-3 text-red-400 animate-pulse" /> : <VolumeX className="w-3 h-3 opacity-60" />}
            BGM
          </button>

          {/* Desktop Zoom controls */}
          <div className="hidden sm:flex items-center gap-1">
            <div className="h-4 w-[1px] bg-white/20 mx-1" />

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="tap-target p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <span className="text-meta md:text-xs font-mono font-bold w-10 text-center opacity-70">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="tap-target p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={resetZoom}
              disabled={scale === 1 && position.x === 0 && position.y === 0}
              className="tap-target p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer"
              title="Reset Zoom (*)"
            >
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/20 mx-1" />

          {/* Exit/Close Button (Always visible & prominent on mobile) */}
          <button
            onClick={() => {
              bgmPlayer.stop();
              onClose();
            }}
            className="tap-target p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-white/20 active:scale-95 text-white transition shadow-md cursor-pointer border border-white/20 flex items-center justify-center shrink-0"
            title="나가기 / 닫기 (ESC)"
            aria-label="Close Lightbox"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
      {/* Main image area */}
      <div
        className="flex-grow flex items-center justify-center relative overflow-hidden w-full"
        onWheel={handleWheel}
      >
        {/* Left Arrow */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="tap-target absolute left-3 md:left-8 z-40 p-2 md:p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-xs border border-white/20 hover:border-white/40 text-white rounded-full transition-all duration-300 focus:outline-none flex items-center justify-center cursor-pointer shadow-lg active:scale-95 opacity-100"
            title="이전 사진 (←)"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* Center: Main Image with crossfade */}
        <div
          ref={imageContainerRef}
          className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <div
            className="relative inline-block"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            {/* ── New (current) image: always fully visible underneath ── */}
            <img
              ref={imgRef}
              src={currentMeta.url}
              alt="Fullscreen Gallery"
              decoding="async"
              onDoubleClick={handleDoubleClick}
              data-pin-nopin="true"
              style={{
                maxHeight: isMobile ? 'calc(100dvh - 85px)' : 'calc(100dvh - 145px)',
                maxWidth: isMobile ? 'calc(100vw - 8px)' : 'min(96vw, calc(100vw - 100px))',
                objectFit: 'contain',
                userSelect: 'none',
                display: 'block',
              }}
              className="shadow-2xl select-none"
              draggable={false}
            />

            {/* ── Film Date Stamp: bottom-right of image ── */}
            {hasDate && showLog && (
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

          {scale <= 1 && (
            <div
              className="absolute inset-0 z-10 w-full h-full cursor-pointer"
              onDoubleClick={handleDoubleClick}
            />
          )}
        </div>

        {/* Right Arrow */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="tap-target absolute right-3 md:right-8 z-40 p-2 md:p-3 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-xs border border-white/20 hover:border-white/40 text-white rounded-full transition-all duration-300 focus:outline-none flex items-center justify-center cursor-pointer shadow-lg active:scale-95 opacity-100"
            title="다음 사진 (→)"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {images.length > 1 && (
        <div 
          ref={thumbnailsContainerRef}
          onScroll={handleThumbnailsScroll}
          onWheel={handleThumbnailsWheel}
          onTouchStart={() => {
            isTouchingThumbsRef.current = true;
            isUserScrollingThumbsRef.current = true;
            if (thumbScrollTimeoutRef.current) clearTimeout(thumbScrollTimeoutRef.current);
          }}
          onTouchEnd={() => {
            isTouchingThumbsRef.current = false;
            scheduleThumbnailSettle();
          }}
          onMouseDown={() => {
            isTouchingThumbsRef.current = true;
            isUserScrollingThumbsRef.current = true;
            if (thumbScrollTimeoutRef.current) clearTimeout(thumbScrollTimeoutRef.current);
          }}
          onMouseUp={() => {
            isTouchingThumbsRef.current = false;
            scheduleThumbnailSettle();
          }}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x',
          }}
          className="w-full bg-black/60 py-2.5 border-t border-white/10 overflow-x-auto hide-scrollbar z-20 shrink-0 select-none"
        >
          <div 
            ref={thumbnailsInnerRef} 
            className="flex gap-2 w-max items-center mx-auto"
            style={{
              paddingLeft: 'calc(50vw - 28px)',
              paddingRight: 'calc(50vw - 28px)',
            }}
          >
            {images.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  ref={isActive ? activeThumbnailRef : null}
                  onClick={() => {
                    isUserScrollingThumbsRef.current = false;
                    onNavigate(idx);
                  }}
                  className={`relative overflow-hidden transition-all duration-150 focus:outline-none shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-[2px] cursor-pointer ${
                    isActive 
                      ? 'border-2 border-red-500 ring-2 ring-red-500/50 opacity-100 scale-105 z-10 shadow-xl' 
                      : 'border border-white/20 opacity-45 hover:opacity-85 scale-95 hover:scale-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumb ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    data-pin-nopin="true"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom captions panel */}
      {showLog && (
        <div className="relative z-20 bg-black/90 border-t border-white/10 px-4 py-2.5 md:px-8 md:py-3 flex flex-col items-center justify-center shrink-0 min-h-16 md:min-h-20 text-center w-full">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center gap-1">
            {(() => {
              const primaryTitle = (currentMeta.place || currentMeta.imgNote || '').trim();
              const secondaryLoc = (currentMeta.location && currentMeta.location.trim() !== primaryTitle) ? currentMeta.location.trim() : '';

              return (
                <>
                  {/* Main Photo Title: 일정 제목 (place) */}
                  {primaryTitle ? (
                    <h4 className="text-white font-bold text-xs md:text-sm tracking-wide text-center w-full font-sans">
                      {primaryTitle}
                    </h4>
                  ) : null}

                  {/* Place Info: 구글 자동완성으로 입력된 위치명 (location) */}
                  {secondaryLoc ? (
                    <div className="text-red-400 dark:text-red-300 font-semibold text-[11px] md:text-xs tracking-tight flex items-center justify-center gap-1 text-center w-full">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span className="text-center">{secondaryLoc}</span>
                    </div>
                  ) : !primaryTitle ? (
                    <div className="text-white/60 font-bold text-meta md:text-xs tracking-widest uppercase text-center w-full">
                      No Location Tagged
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Hint when no log or date */}
      {(!showLog || !hasLog) && !hasDate && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-3 pt-6 text-center bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <p className="text-white/60 text-micro uppercase tracking-widest font-bold">
            +/- to Zoom · * to Reset · Swipe/Click Thumbnails to Navigate
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}
