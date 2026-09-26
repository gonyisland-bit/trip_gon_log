import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [planeFlown, setPlaneFlown] = useState(false);

  // Kinetic typography letters
  const letters = ['T', 'R', 'I', 'P', 'G', 'O', 'N'];

  useEffect(() => {
    // Plane flight trigger
    const planeTimer = setTimeout(() => {
      setPlaneFlown(true);
    }, 450);

    // Fadeout trigger
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, minDurationMs);

    // Complete transition
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, minDurationMs + 400);

    return () => {
      clearTimeout(planeTimer);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [minDurationMs, onFinish]);

  // Click/Touch to skip immediately
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, 200);
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none bg-[#FAF9F6] dark:bg-[#111111] text-black dark:text-white transition-all duration-400 ease-out cursor-pointer ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      aria-label="Tripgon splash screen"
    >
      {/* Background subtle Swiss Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.06] bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Main Kinetic Typography Container */}
      <div className="relative flex flex-col items-center justify-center px-6">
        {/* Top Minimal Editorial Tag */}
        <div className="overflow-hidden mb-3 sm:mb-4">
          <span className="inline-block text-[10px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-black/40 dark:text-white/40 animate-in slide-in-from-bottom-2 duration-500 delay-100">
            PERSONAL TRAVEL ARCHIVE
          </span>
        </div>

        {/* TRIPGON Kinetic Staggered Letters */}
        <div className="relative flex items-center justify-center tracking-tight">
          {letters.map((char, index) => (
            <span
              key={index}
              className="inline-block font-['Inter',sans-serif] text-4xl sm:text-6xl md:text-7xl font-extrabold transition-all duration-500"
              style={{
                animation: `tglLetterPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                animationDelay: `${index * 55 + 100}ms`,
                opacity: 0,
                transform: 'translateY(28px) scale(0.85)',
              }}
            >
              {char}
            </span>
          ))}

          {/* LOG in Red Swiss accent */}
          <span
            className="inline-block ml-2 sm:ml-3 font-['Inter',sans-serif] text-4xl sm:text-6xl md:text-7xl font-extrabold text-red-600 dark:text-red-500"
            style={{
              animation: `tglLetterPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
              animationDelay: `580ms`,
              opacity: 0,
              transform: 'translateY(28px) scale(0.85)',
            }}
          >
            log
          </span>

          {/* Paper Plane Flying Arc Motion */}
          <div
            className={`absolute -top-3 left-0 transition-transform duration-1000 ease-out pointer-events-none ${
              planeFlown ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: planeFlown
                ? 'translate(280px, -24px) rotate(15deg) scale(1)'
                : 'translate(-40px, 20px) rotate(-25deg) scale(0.7)',
              transitionProperty: 'transform, opacity',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 fill-red-600" />
          </div>
        </div>

        {/* Minimal Flight Path Arc Indicator */}
        <div className="w-36 sm:w-48 h-[1px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent mt-4 sm:mt-5 transition-all duration-700 ease-out animate-pulse" />

        {/* Bottom Coordinates & Tag */}
        <div className="mt-4 flex items-center gap-2 text-[9.5px] sm:text-[10.5px] font-mono tracking-widest text-black/35 dark:text-white/35 uppercase">
          <span>LAT 37.5665° N</span>
          <span>·</span>
          <span>LNG 126.9780° E</span>
        </div>
      </div>

      {/* Embedded Animation Keyframes */}
      <style>{`
        @keyframes tglLetterPop {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.85);
          }
          60% {
            opacity: 1;
            transform: translateY(-4px) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
