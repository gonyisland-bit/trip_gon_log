import React from 'react';

/**
 * Journey Detail skeleton: the same split as Detail.tsx (map panel with its info header,
 * then the tab sheet), so nothing jumps when the page arrives.
 */
export function DetailSkeleton() {
  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden select-none animate-in fade-in duration-150" aria-busy="true" aria-label="Loading journey">
      {/* Map panel */}
      <div className="w-full md:w-1/2 max-md:h-[38dvh] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-black/20 dark:border-white/20">
        <div className="min-h-[52px] sm:min-h-[58px] px-3 md:px-5 flex items-center gap-3 border-b border-black/15 dark:border-white/15 shrink-0">
          <div className="w-4 h-4 rounded-sm bg-black/10 dark:bg-white/10" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="w-40 sm:w-56 h-3.5 rounded-full bg-black/15 dark:bg-white/15 tgl-shimmer" />
            <div className="w-24 sm:w-40 h-2.5 rounded-full bg-black/10 dark:bg-white/10 tgl-shimmer" />
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-neutral-100 dark:bg-[#111111] tgl-shimmer" />
      </div>

      {/* Tab sheet */}
      <div className="w-full md:w-1/2 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="md:hidden h-6 flex items-center justify-center border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/20" />
        </div>
        <div className="h-11 sm:h-10 flex border-b border-black/15 dark:border-white/15 shrink-0">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`flex-1 border-r last:border-r-0 border-black/15 dark:border-white/15 ${i === 0 ? 'bg-black/80 dark:bg-white/80' : ''}`} />
          ))}
        </div>
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 px-4 md:px-6 py-5 border-b border-black/10 dark:border-white/10">
              <div className="w-12 h-4 rounded-full bg-black/15 dark:bg-white/15 tgl-shimmer shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="w-3/5 h-3.5 rounded-full bg-black/15 dark:bg-white/15 tgl-shimmer" />
                <div className="w-2/5 h-2.5 rounded-full bg-black/10 dark:bg-white/10 tgl-shimmer" />
              </div>
              <div className="w-16 h-16 rounded-thumb bg-black/10 dark:bg-white/10 tgl-shimmer shrink-0" />
            </div>
          ))}
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
    <div className="fixed top-0 left-0 right-0 z-modal h-[2px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-red-500 via-red-400 to-red-600 animate-[progress_1s_ease-in-out_infinite] origin-left" 
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
