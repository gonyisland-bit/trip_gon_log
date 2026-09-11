import React from 'react';

/**
 * EditorialSkeleton for Journey Detail Page
 * Matches the exact proportions of Detail.tsx (Header, Tab Bar, 3:4 Hero Frame, Timeline list)
 * Eliminates blank white screen and layout shifts, providing an instant 0ms perceived transition.
 */
export function DetailSkeleton() {
  return (
    <div className="w-full h-full flex flex-col bg-[#F9F8F6] dark:bg-[#111111] text-black dark:text-white transition-colors overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Detail Header Bar */}
      <header className="w-full border-b border-black/10 dark:border-white/10 px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-[#141414]/50 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="w-32 sm:w-44 h-5 rounded-xs bg-black/15 dark:bg-white/15 animate-pulse" />
            <div className="w-20 sm:w-28 h-3 rounded-xs bg-black/10 dark:bg-white/10 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-16 h-7 rounded-sm bg-black/10 dark:bg-white/10 animate-pulse hidden sm:block" />
          <div className="w-20 h-7 rounded-sm bg-black/15 dark:bg-white/15 animate-pulse" />
        </div>
      </header>

      {/* 2. Editorial Tab Bar */}
      <div className="w-full border-b border-black/10 dark:border-white/10 px-4 sm:px-8 py-2 flex items-center gap-6 overflow-x-hidden shrink-0 bg-white/30 dark:bg-[#161616]/30">
        {['SUMMARY', 'TIMELINE', 'FLIGHT', 'STAY', 'TRANSIT', 'SETTLEMENT'].map((tab, idx) => (
          <div
            key={tab}
            className={`h-4 rounded-xs animate-pulse ${
              idx === 0
                ? 'w-16 bg-black/30 dark:bg-white/30'
                : 'w-14 bg-black/10 dark:bg-white/10 opacity-60'
            }`}
          />
        ))}
      </div>

      {/* 3. Main Content Split View Skeleton */}
      <div className="flex-1 min-h-0 w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Column: 3:4 Editorial Cover & Meta */}
        <div className="md:col-span-5 lg:col-span-4 p-4 sm:p-6 md:p-8 flex flex-col gap-4 border-r border-black/10 dark:border-white/10 overflow-hidden">
          <div className="w-full aspect-[3/4] max-h-[55vh] rounded-sm bg-black/10 dark:bg-white/10 animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <div className="w-3/4 h-6 rounded-xs bg-black/15 dark:bg-white/15 animate-pulse" />
            <div className="w-1/2 h-4 rounded-xs bg-black/10 dark:bg-white/10 animate-pulse" />
            <div className="w-full h-12 rounded-xs bg-black/5 dark:bg-white/5 animate-pulse mt-2" />
          </div>
        </div>

        {/* Right Column: Timeline Cards Skeleton */}
        <div className="md:col-span-7 lg:col-span-8 p-4 sm:p-6 md:p-8 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
            <div className="w-28 h-5 rounded-xs bg-black/15 dark:bg-white/15 animate-pulse" />
            <div className="w-20 h-4 rounded-xs bg-black/10 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="flex flex-col gap-3.5">
            {[1, 2, 3, 4].map(key => (
              <div
                key={key}
                className="w-full p-4 border border-black/10 dark:border-white/10 rounded-sm bg-white/40 dark:bg-[#181818]/40 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-sm bg-black/10 dark:bg-white/10 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="w-36 sm:w-56 h-4 rounded-xs bg-black/15 dark:bg-white/15 animate-pulse" />
                    <div className="w-24 sm:w-32 h-3 rounded-xs bg-black/10 dark:bg-white/10 animate-pulse" />
                  </div>
                </div>
                <div className="w-12 h-4 rounded-xs bg-black/10 dark:bg-white/10 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Top Progress Indicator
 * Appears seamlessly at the top edge of viewport during page transition
 */
export function TopProgressBar({ isNavigating }: { isNavigating: boolean }) {
  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 animate-[progress_1s_ease-in-out_infinite] origin-left" 
        style={{
          animation: 'indeterminateProgress 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
        }}
      />
      <style>{`
        @keyframes indeterminateProgress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(20%) scaleX(0.7); }
          100% { transform: translateX(110%) scaleX(0.3); }
        }
      `}</style>
    </div>
  );
}
