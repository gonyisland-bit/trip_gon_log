import React, { useEffect, useState } from 'react';

interface FlightTransitionOverlayProps {
  isActive: boolean;
  onHalfway: () => void;
  onComplete: () => void;
  isDarkMode: boolean;
  destinationTitle?: string;
}

export const FlightTransitionOverlay: React.FC<FlightTransitionOverlayProps> = ({
  isActive,
  onHalfway,
  onComplete,
  isDarkMode,
  destinationTitle,
}) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isActive) {
      setAnimating(true);

      // Halfway callback: When airplane covers center of the screen
      const halfwayTimer = setTimeout(() => {
        onHalfway();
      }, 260);

      // Completion callback: When airplane exits to the left
      const completeTimer = setTimeout(() => {
        setAnimating(false);
        onComplete();
      }, 580);

      return () => {
        clearTimeout(halfwayTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setAnimating(false);
    }
  }, [isActive, onHalfway, onComplete]);

  if (!isActive && !animating) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes flightSweep {
          0% {
            transform: translate3d(120vw, 0, 0) scale(0.95);
            opacity: 0.9;
          }
          45% {
            transform: translate3d(0vw, 0, 0) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translate3d(-130vw, 0, 0) scale(1.08);
            opacity: 0.95;
          }
        }
        @keyframes contrailExpand {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          50% {
            transform: scaleX(1);
            opacity: 0.7;
          }
          100% {
            transform: scaleX(1.4);
            opacity: 0;
          }
        }
        .animate-flight-sweep {
          animation: flightSweep 0.58s cubic-bezier(0.35, 0, 0.15, 1) forwards;
          will-change: transform;
        }
        .animate-contrail {
          animation: contrailExpand 0.58s ease-out forwards;
          transform-origin: right center;
        }
      `}</style>

      {/* Flight Container moving from Right to Left */}
      <div className="relative w-[130vw] h-[130vh] max-w-none flex items-center justify-center animate-flight-sweep shrink-0">
        
        {/* Trailing Jet Contrails */}
        <div className="absolute right-[30%] top-1/2 -translate-y-1/2 flex flex-col gap-10 w-[80vw] pointer-events-none animate-contrail">
          {/* Top Engine Contrail */}
          <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-red-600/30 to-red-600/60 dark:via-red-500/30 dark:to-red-500/60" />
          {/* Center Fuselage Slipstream */}
          <div className="flex items-center gap-3 justify-end pr-8">
            <span className="font-mono text-[9px] sm:text-[10px] font-black tracking-[0.25em] uppercase text-black/40 dark:text-white/40">
              TRIPGON LOG AIRWAYS · EN ROUTE
            </span>
            {destinationTitle && (
              <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-red-600 dark:text-red-400">
                → {destinationTitle}
              </span>
            )}
          </div>
          {/* Bottom Engine Contrail */}
          <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-red-600/30 to-red-600/60 dark:via-red-500/30 dark:to-red-500/60" />
        </div>

        {/* Minimal Fullscreen Airplane Vector (Top-down view, nose pointing Left) */}
        <svg 
          viewBox="0 0 1000 800" 
          className={`w-full h-full drop-shadow-2xl ${
            isDarkMode 
              ? 'fill-white text-white' 
              : 'fill-black text-black'
          }`}
          style={{
            filter: isDarkMode 
              ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))' 
              : 'drop-shadow(0 25px 50px rgba(0,0,0,0.35))'
          }}
        >
          {/* Airplane Silhouette (Pointing Leftwards) */}
          <g transform="translate(500, 400) rotate(180) translate(-500, -400)">
            {/* Main Wings (Wide swept-back high-aspect ratio wings that span top to bottom) */}
            <path
              d="
                M 500, 360
                L 150, 480
                C 120, 490 100, 475 110, 455
                L 440, 260
                L 480, 240
                Z
              "
              className={isDarkMode ? 'fill-neutral-100' : 'fill-neutral-900'}
            />
            <path
              d="
                M 500, 360
                L 850, 480
                C 880, 490 900, 475 890, 455
                L 560, 260
                L 520, 240
                Z
              "
              className={isDarkMode ? 'fill-neutral-100' : 'fill-neutral-900'}
            />

            {/* Jet Engines beneath wings */}
            <rect x="310" y="380" width="22" height="70" rx="11" className={isDarkMode ? 'fill-neutral-300' : 'fill-neutral-800'} />
            <rect x="668" y="380" width="22" height="70" rx="11" className={isDarkMode ? 'fill-neutral-300' : 'fill-neutral-800'} />

            {/* Horizontal Stabilizers / Tail Wings */}
            <path
              d="
                M 500, 710
                L 360, 770
                C 345, 777 340, 768 348, 755
                L 475, 680
                Z
              "
              className={isDarkMode ? 'fill-neutral-200' : 'fill-neutral-800'}
            />
            <path
              d="
                M 500, 710
                L 640, 770
                C 655, 777 660, 768 652, 755
                L 525, 680
                Z
              "
              className={isDarkMode ? 'fill-neutral-200' : 'fill-neutral-800'}
            />

            {/* Sleek Aerodynamic Fuselage (Body) */}
            <path
              d="
                M 500, 80
                C 475, 120 468, 220 468, 400
                C 468, 560 472, 690 488, 760
                C 494, 785 506, 785 512, 760
                C 528, 690 532, 560 532, 400
                C 532, 220 525, 120 500, 80
                Z
              "
              className={isDarkMode ? 'fill-white' : 'fill-black'}
            />

            {/* Nose Cockpit Glass Accent */}
            <path
              d="
                M 490, 160
                C 495, 155 505, 155 510, 160
                L 512, 172
                C 505, 169 495, 169 488, 172
                Z
              "
              className={isDarkMode ? 'fill-black/60' : 'fill-white/70'}
            />

            {/* Fuselage Minimal Center Spine Line */}
            <line 
              x1="500" y1="190" x2="500" y2="720" 
              stroke={isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'} 
              strokeWidth="2" 
            />

            {/* Red Accent Marker on Left Wingtip */}
            <circle cx="110" cy="458" r="7" className="fill-red-600" />
            {/* Green Accent Marker on Right Wingtip */}
            <circle cx="890" cy="458" r="7" className="fill-emerald-500" />
          </g>
        </svg>
      </div>
    </div>
  );
};
