import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  images: string[];
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
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // 1. 초기화 및 ESC 키 바인딩
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
  }, [isOpen, currentIndex]);

  // 이미지 전환 시 상태 리셋
  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    const nextIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(nextIndex);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  // 더블 클릭 줌 토글
  const handleDoubleClicks = (e: React.MouseEvent) => {
    e.preventDefault();
    if (scale > 1.1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  // 마우스 휠 줌
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.max(0.5, Math.min(prev + zoomFactor, 4)));
  };

  // 마우스 드래그 이동 (Pan) 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // 줌이 1 이하일 때는 드래그 금지
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  // 마우스 드래그 이동 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  // 마우스 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-300"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header controls */}
      <div className="flex justify-between items-center p-4 md:p-6 text-white z-10 bg-gradient-to-b from-black/55 to-transparent w-full">
        <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold opacity-60">
          IMAGE {currentIndex + 1} OF {images.length}
        </span>
        
        {/* Zoom & Control Bar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleZoomOut} 
            disabled={scale <= 0.5}
            className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-40"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          
          <span className="text-[10px] md:text-xs font-mono font-bold w-12 text-center opacity-85">
            {Math.round(scale * 100)}%
          </span>

          <button 
            onClick={handleZoomIn} 
            disabled={scale >= 4}
            className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-40"
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

          <div className="h-4 w-[1px] bg-white/20 mx-1"></div>

          <button 
            onClick={onClose} 
            className="p-1.5 md:p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            title="Close (ESC)"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Main viewport for image */}
      <div 
        className="flex-grow flex items-center justify-center relative overflow-hidden w-full h-full"
        onWheel={handleWheel}
      >
        {/* Navigation Left Arrow */}
        {images.length > 1 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 md:left-6 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/20 text-white rounded-full transition-all focus:outline-none"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}

        {/* Image Display Wrapper */}
        <div 
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <img
            ref={imgRef}
            src={currentImage}
            alt="Fullscreen Journey Gallery"
            onDoubleClick={handleDoubleClicks}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              maxHeight: '82%',
              maxWidth: '90%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: scale > 1 ? 'auto' : 'none' // scale 1 이하일 땐 더블클릭 이벤트만 통과시킴
            }}
            className="shadow-2xl select-none"
            draggable={false}
          />
          {/* scale 1 이하일 땐 상위 div의 드래그나 더블클릭만 먹히도록 투명 쉴드 레이어 추가 */}
          {scale <= 1 && (
            <div 
              className="absolute inset-0 z-10 w-full h-full"
              onDoubleClick={handleDoubleClicks}
            />
          )}
        </div>

        {/* Navigation Right Arrow */}
        {images.length > 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-4 md:right-6 z-20 p-2 md:p-3 bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 hover:border-white/20 text-white rounded-full transition-all focus:outline-none"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Footer Description */}
      <div className="p-4 md:p-6 text-center text-white/50 text-[10px] md:text-xs uppercase tracking-widest bg-gradient-to-t from-black/55 to-transparent z-10 w-full">
        Double click to Zoom In/Out | Drag image to pan when zoomed
      </div>
    </div>,
    document.body
  );
}
