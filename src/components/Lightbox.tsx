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

          {(scale !== 1 || position.x !== 0 || position.y !== 0) && (
            <button
              onClick={resetZoom}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}

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
        {/* Prev image ghost (blurred preview) */}
        {prevMeta && images.length > 1 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-24 md:w-36 flex items-center justify-start pl-2 md:pl-3 z-10 cursor-pointer group"
            onClick={handlePrev}
          >
            <div className="relative w-16 md:w-24 h-24 md:h-32 opacity-25 group-hover:opacity-45 transition-opacity duration-300 overflow-hidden rounded-sm border border-white/10 shadow-2xl">
              <img
                src={prevMeta.url}
                alt="Previous"
                className="w-full h-full object-cover blur-[1px] scale-105"
                onLoad={() => setPrevLoaded(true)}
              />
            </div>
          </div>
        )}

        {/* Left Arrow */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-20 md:left-32 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none"
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
          <div className="relative inline-block">
            <img
              ref={imgRef}
              src={currentMeta.url}
              alt="Fullscreen Gallery"
              onDoubleClick={handleDoubleClick}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                maxHeight: '80vh',
                maxWidth: '80vw',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: scale > 1 ? 'auto' : 'none',
                display: 'block',
              }}
              className="shadow-2xl select-none"
              draggable={false}
            />

            {/* ── Film Date Stamp: bottom-right of image ── */}
            {hasDate && (
              <div
                className="absolute bottom-3 right-3 z-30 pointer-events-none text-right"
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: 'bottom right', transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
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

            {/* ── Bottom info bar: place + memo (centered, overlapping photo bottom) ── */}
            {(hasLog && showLog) && (
              <div
                className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: 'bottom center', transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <div className="bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pt-8 pb-3 text-center">
                  {currentMeta.place && (
                    <div className="text-white font-bold text-xs md:text-sm tracking-wide drop-shadow-lg">
                      {currentMeta.place}
                    </div>
                  )}
                  {currentMeta.memo && (
                    <div className="text-white/70 text-[10px] md:text-xs mt-0.5 font-medium tracking-wide drop-shadow-md">
                      {currentMeta.memo}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {scale <= 1 && (
            <div
              className="absolute inset-0 z-10 w-full h-full"
              onDoubleClick={handleDoubleClick}
            />
          )}
        </div>

        {/* Right Arrow */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-20 md:right-32 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/30 text-white rounded-full transition-all focus:outline-none"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* Next image ghost (blurred preview) */}
        {nextMeta && images.length > 1 && (
          <div
            className="absolute right-0 top-0 bottom-0 w-24 md:w-36 flex items-center justify-end pr-2 md:pr-3 z-10 cursor-pointer group"
            onClick={handleNext}
          >
            <div className="relative w-16 md:w-24 h-24 md:h-32 opacity-25 group-hover:opacity-45 transition-opacity duration-300 overflow-hidden rounded-sm border border-white/10 shadow-2xl">
              <img
                src={nextMeta.url}
                alt="Next"
                className="w-full h-full object-cover blur-[1px] scale-105"
                onLoad={() => setNextLoaded(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom imgNote panel (hide/unhide) */}
      <div
        className={`relative z-20 bg-gradient-to-t from-black/90 to-transparent px-6 py-3 md:px-10 md:py-4 transition-all duration-500 overflow-hidden ${
          showLog && currentMeta.imgNote ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0 py-0'
        }`}
      >
        {currentMeta.imgNote && (
          <p className="text-orange-300/90 text-[11px] font-mono italic leading-relaxed text-center max-w-xl mx-auto">
            "{currentMeta.imgNote}"
          </p>
        )}
      </div>

      {/* Hint when no log */}
      {(!showLog || !hasLog) && !hasDate && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-3 pt-6 text-center bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <p className="text-white/25 text-[9px] uppercase tracking-widest font-bold">
            Double click to Zoom · Arrow keys to Navigate
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}
