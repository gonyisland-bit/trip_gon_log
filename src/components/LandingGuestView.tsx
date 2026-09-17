import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LandingHeroMediaItem } from '../types';
import { getEffectiveImageUrl } from '../utils/storageHelper';

interface LandingGuestViewProps {
  mediaList?: LandingHeroMediaItem[];
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  slideIntervalSeconds?: number;
}

// 고화질 기본 대체 미디어 프리셋
const DEFAULT_FALLBACK_MEDIA: LandingHeroMediaItem[] = [
  {
    id: 'default-1',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2560&auto=format&fit=crop',
    type: 'image',
    title: 'PACIFIC COASTLINE',
  },
  {
    id: 'default-2',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2560&auto=format&fit=crop',
    type: 'image',
    title: 'KYOTO BAMBOO FOREST',
  },
  {
    id: 'default-3',
    url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=2560&auto=format&fit=crop',
    type: 'image',
    title: 'TROPICAL BLUE OCEAN',
  },
  {
    id: 'default-4',
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2560&auto=format&fit=crop',
    type: 'image',
    title: 'OPEN HIGHWAY VOYAGE',
  },
];

export function LandingGuestView({
  mediaList = [],
  onOpenAuthModal,
  slideIntervalSeconds = 6,
}: LandingGuestViewProps) {
  // 미디어 목록이 비어있으면 기본 프리셋 사용
  const effectiveMedia = mediaList.length > 0 ? mediaList : DEFAULT_FALLBACK_MEDIA;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // 다음/이전 슬라이드 전환
  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % effectiveMedia.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + effectiveMedia.length) % effectiveMedia.length);
  };

  // 자동 슬라이드쇼 타이머
  useEffect(() => {
    if (effectiveMedia.length <= 1 || isPaused) return;

    const duration = (slideIntervalSeconds || 6) * 1000;
    const timer = setTimeout(() => {
      handleNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, effectiveMedia, isPaused, slideIntervalSeconds]);

  // 슬라이드 변경 시 해당 비디오 재생 및 이전 비디오 정지
  useEffect(() => {
    videoRefs.current.forEach((videoEl, idx) => {
      if (!videoEl) return;
      if (idx === currentIndex) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    });
  }, [currentIndex]);

  return (
    <div 
      className="relative w-full h-screen min-h-[600px] overflow-hidden bg-black text-white select-none flex flex-col justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. 풀스크린 배경 미디어 슬라이드 (이미지 / 비디오 크로스페이드) */}
      <div className="absolute inset-0 z-0">
        {effectiveMedia.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={item.id || `guest-media-${idx}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {item.type === 'video' ? (
                <video
                  ref={el => { videoRefs.current[idx] = el; }}
                  src={item.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover brightness-[0.72]"
                />
              ) : (
                <img
                  src={getEffectiveImageUrl(item.url)}
                  alt={item.title || `Landing Slide ${idx + 1}`}
                  className="w-full h-full object-cover brightness-[0.72] transform scale-100 transition-transform duration-7000 ease-out"
                />
              )}
            </div>
          );
        })}

        {/* Swiss Cinematic Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50 z-10" />
      </div>

      {/* 2. Top Minimal Editorial Header */}
      <header className="relative z-20 w-full max-w-[1920px] mx-auto px-6 sm:px-12 md:px-16 pt-8 sm:pt-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-red-600 rounded-none inline-block shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.3em] uppercase text-white/80">
            TRAVEL LOG & VISUAL JOURNAL
          </span>
        </div>
      </header>

      {/* 3. Center/Lower Hero: 과감한 스케일의 Inter Black TRIPGON 타이포그래피 */}
      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-6 sm:px-12 md:px-16 py-8 flex-1 flex flex-col justify-end">
        <div className="flex flex-col gap-3 md:gap-5 pb-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.25em] text-white/60 uppercase">
              EDITORIAL ARCHIVE
            </span>
            <span className="text-white/30 font-mono">/</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-red-500 uppercase">
              {effectiveMedia[currentIndex]?.title || `FRAME ${String(currentIndex + 1).padStart(2, '0')}`}
            </span>
          </div>

          <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[140px] xl:text-[160px] font-black uppercase tracking-tighter leading-none font-sans drop-shadow-2xl text-white">
            TRIPGON
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pt-2">
            <p className="md:col-span-7 lg:col-span-6 text-xs sm:text-sm md:text-base font-sans font-medium text-white/80 leading-relaxed break-keep max-w-xl">
              발걸음이 머물렀던 세계 곳곳의 도시와 찬란했던 순간의 감성 아카이브.
              나만의 스마트 포켓과 시네마틱 타임라인을 기록해 보세요.
            </p>

            {/* Main Action Buttons: Swiss Minimal Monochrome SIGN IN & JOIN */}
            <div className="md:col-span-5 lg:col-span-6 flex flex-wrap items-center md:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="px-7 sm:px-8 py-3.5 sm:py-4 bg-white text-black hover:bg-black hover:text-white border border-white text-xs sm:text-sm font-mono font-black uppercase tracking-widest transition-all cursor-pointer shadow-xl rounded-none"
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('signup')}
                className="px-7 sm:px-8 py-3.5 sm:py-4 border border-white/60 text-white hover:border-white hover:bg-white hover:text-black text-xs sm:text-sm font-mono font-black uppercase tracking-widest transition-all cursor-pointer backdrop-blur-xs rounded-none"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Editorial Footer & Slide Controls */}
      <footer className="relative z-20 w-full max-w-[1920px] mx-auto px-6 sm:px-12 md:px-16 py-6 border-t border-white/15 flex items-center justify-between text-white/60">
        <div className="flex items-center gap-4 text-[10px] sm:text-xs font-mono">
          <span>© TRIPGON ARCHIVE</span>
          <span className="opacity-40">/</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>

        {/* Slide Counter & Controls */}
        {effectiveMedia.length > 1 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono text-xs tracking-wider">
              <span className="text-white font-bold">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="opacity-40">/</span>
              <span className="opacity-60">{String(effectiveMedia.length).padStart(2, '0')}</span>
            </div>

            <div className="flex items-center border border-white/20">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="이전 슬라이드"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-white/20" />
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="다음 슬라이드"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

export default LandingGuestView;
