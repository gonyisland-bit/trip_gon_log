import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, MessageSquare } from 'lucide-react';

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
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

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
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Reset zoom on image change
  useEffect(() => {
    resetZoom();
    setPrevLoaded(false);
    setNextLoaded(false);
  }, [currentIndex]);

  if (!isOpen || images.length === 0) return null;

  const currentMeta = images[currentIndex];
  const prevMeta = images.length > 1 ? images[(currentIndex - 1 + images.length) % images.length] : null;
  const nextMeta = images.length > 1 ? images[(currentIndex + 1) % images.length] : null;

  // Only timeline images have real log info
  const hasLog = !!(currentMeta.place || currentMeta.memo || currentMeta.imgNote);
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
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
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
    >
      {/* Top Header controls */}
      <div className="flex justify-between items-center px-4 py-3 md:px-6 md:py-4 text-white z-20 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 pointer-events-none">
        <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold opacity-50 pointer-events-auto">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {/* Log toggle */}
          {hasLog && (
            <button
              onClick={() => setShowLog(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-all ${
                showLog
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
              title="Toggle log info"
            >
              <MessageSquare className="w-3 h-3" />
              Log {showLog ? 'ON' : 'OFF'}
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

      {/* Main image area */}
      <div
        className="flex-grow flex items-center justify-center relative overflow-hidden w-full"
        onWheel={handleWheel}
      >
        {/* Left Arrow */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* Center: Main Image */}
        <div
          className="relative flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <div 
            className="relative inline-block"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: 'center center',
            }}
          >
            <img
              ref={imgRef}
              src={currentMeta.url}
              alt="Fullscreen Gallery"
              onDoubleClick={handleDoubleClick}
              data-pin-nopin="true"
              style={{
                maxHeight: '78vh',
                maxWidth: '90vw',
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
            className="absolute right-4 md:right-8 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none hidden md:flex"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {images.length > 1 && (
        <div className="w-full bg-black/40 py-2 border-t border-white/5 flex justify-center items-center overflow-x-auto hide-scrollbar z-20 shrink-0">
          <div className="flex gap-2 px-4">
            {images.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
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

      {/* Bottom captions panel (place, memo, imgNote) */}
      {(hasLog && showLog) && (
        <div className="relative z-20 bg-black/90 border-t border-white/10 px-6 py-4 md:px-10 flex flex-col items-center gap-1 shrink-0">
          {currentMeta.place && (
            <div className="text-white font-bold text-xs md:text-sm tracking-wide">
              {currentMeta.place}
            </div>
          )}
          {currentMeta.memo && (
            <div className="text-white/70 text-[10px] md:text-xs font-medium tracking-wide text-center max-w-xl">
              {currentMeta.memo}
            </div>
          )}
          {currentMeta.imgNote && (
            <p className="text-orange-300/90 text-[10px] md:text-[11px] font-mono italic leading-relaxed text-center max-w-xl mt-1">
              "{currentMeta.imgNote}"
            </p>
          )}
        </div>
      )}

      {/* Hint when no log or date */}
      {(!showLog || !hasLog) && !hasDate && (
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
