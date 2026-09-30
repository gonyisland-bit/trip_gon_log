import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { openIntro, prefetchIntro } from '../intro/openIntro';
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
      className="relative w-full h-screen supports-[height:100dvh]:h-dvh min-h-[600px] overflow-hidden bg-black text-white select-none flex flex-col justify-between"
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

      {/* 2. Top line: the mark of the journal */}
      <header className="relative z-20 w-full max-w-[1920px] mx-auto px-5 sm:px-12 md:px-16 pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pt-10 flex items-center justify-between gap-4">
        <span className="font-mono text-micro sm:text-meta font-bold tracking-[0.24em] uppercase text-white/75">Travel journal</span>
        {effectiveMedia.length > 1 && (
          <span className="font-mono text-micro sm:text-meta font-bold tracking-[0.2em] uppercase text-white/60 truncate">
            {effectiveMedia[currentIndex]?.title || `Frame ${String(currentIndex + 1).padStart(2, '0')}`}
          </span>
        )}
      </header>

      {/* 3. Hero: the logotype, one line, and the three ways in */}
      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-5 sm:px-12 md:px-16 pb-8 sm:pb-10 flex-1 flex flex-col justify-end gap-5 sm:gap-7">
        <h1 className="m-0">
          <img
            src="/tripgon-logotype.svg"
            alt="Tripgon log"
            data-brand-logo
            draggable={false}
            className="w-[min(84vw,680px)] h-auto max-h-[18dvh] object-contain object-left brightness-0 invert drop-shadow-[0_8px_32px_rgba(0,0,0,0.35)] select-none"
          />
        </h1>
        <p className="text-sm sm:text-base md:text-lg font-medium text-white/85 leading-relaxed break-keep max-w-xl">
          발걸음이 머문 도시와 순간의 기록.
          <span className="hidden sm:inline"> 포켓에 담고, 타임라인으로 남겨 보세요.</span>
        </p>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button type="button" onClick={() => onOpenAuthModal('login')} className="btn btn-lg bg-white text-black hover:bg-white/90">
            로그인
          </button>
          <button type="button" onClick={() => onOpenAuthModal('signup')} className="btn btn-lg bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm">
            가입하기
          </button>
          <button
            type="button"
            onClick={openIntro}
            onPointerEnter={prefetchIntro}
            onTouchStart={prefetchIntro}
            onFocus={prefetchIntro}
            className="btn btn-lg bg-transparent text-white/90 hover:text-white hover:bg-white/10"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden />
            애니메이션 보기
          </button>
        </div>
      </div>

      {/* 4. Bottom: copyright and slide controls */}
      <footer className="relative z-20 w-full max-w-[1920px] mx-auto px-5 sm:px-12 md:px-16 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-6 flex items-center justify-between gap-4 text-white/60">
        <span className="font-mono text-micro sm:text-meta">© Tripgon log</span>
        {effectiveMedia.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-meta tabular-nums mr-1">
              <span className="text-white font-bold">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="opacity-50"> / {String(effectiveMedia.length).padStart(2, '0')}</span>
            </span>
            <button type="button" onClick={handlePrev} className="tap-target w-9 h-9 rounded-full inline-grid place-items-center bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="이전 사진">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleNext} className="tap-target w-9 h-9 rounded-full inline-grid place-items-center bg-white/10 hover:bg-white/20 text-white transition-colors" aria-label="다음 사진">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

export default LandingGuestView;
