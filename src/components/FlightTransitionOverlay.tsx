import React, { useEffect, useState, useRef } from 'react';

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
  const halfwayFiredRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setAnimating(false);
      halfwayFiredRef.current = false;
      return;
    }

    setAnimating(true);
    halfwayFiredRef.current = false;

    // Halfway callback: When airplane covers center of the screen (at ~420ms in 880ms animation)
    const halfwayTimer = setTimeout(() => {
      if (isActive && !halfwayFiredRef.current) {
        halfwayFiredRef.current = true;
        onHalfway();
      }
    }, 420);

    // Completion callback: When airplane smoothly exits to the left (at 880ms)
    const completeTimer = setTimeout(() => {
      setAnimating(false);
      onComplete();
    }, 880);

    return () => {
      clearTimeout(halfwayTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onHalfway, onComplete]);

  // Tap to skip: Immediate entrance to detail page if user taps anywhere during the 0.88s flight
  const handleTapToSkip = () => {
    if (!halfwayFiredRef.current) {
      halfwayFiredRef.current = true;
      onHalfway();
    }
    setAnimating(false);
    onComplete();
  };

  if (!isActive && !animating) return null;

  // Sophisticated Airline Gray Palette (No black, elegant neutral grays)
  const fuselageFill = isDarkMode ? '#94A3B8' : '#64748B'; // Slate 400 / 500
  const wingsFill = isDarkMode ? '#8091A5' : '#52627A';    // Slightly darker slate
  const detailsFill = isDarkMode ? '#CBD5E1' : '#475569';  // Subtle slate detail
  const cockpitFill = isDarkMode ? '#1E293B' : '#334155';  // Dark slate slit
  const contrailColor = isDarkMode ? 'rgba(203, 213, 225, 0.45)' : 'rgba(100, 116, 139, 0.4)';

  return (
    <div 
      onClick={handleTapToSkip}
      className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center select-none cursor-pointer"
      aria-hidden="true"
    >
      <style>{`
        @keyframes flightSweepAccelerate {
          0% {
            transform: translate3d(120vw, 0, 0) scale(0.92) rotate(-1.5deg);
            opacity: 0.88;
          }
          32% {
            transform: translate3d(50vw, 0, 0) scale(0.97) rotate(-1.5deg);
            opacity: 1;
          }
          62% {
            transform: translate3d(-10vw, 0, 0) scale(1.02) rotate(-1.5deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(-140vw, 0, 0) scale(1.06) rotate(-1.5deg);
            opacity: 0.9;
          }
        }
        @keyframes contrailStream {
          0% {
            opacity: 0.3;
            transform: scaleX(0.4);
          }
          45% {
            opacity: 0.8;
            transform: scaleX(1);
          }
          100% {
            opacity: 0.5;
            transform: scaleX(1.3);
          }
        }
        .animate-flight-sweep-accelerate {
          animation: flightSweepAccelerate 0.88s cubic-bezier(0.38, 0, 0.15, 1) forwards;
          will-change: transform;
        }
        .animate-contrail-stream {
          animation: contrailStream 0.88s ease-out forwards;
          transform-origin: right center;
        }
      `}</style>

      {/* Flight Container moving continuously from Right to Left with gradual acceleration */}
      <div className="relative w-[130vw] h-[130vh] max-w-none flex items-center justify-center animate-flight-sweep-accelerate shrink-0 pointer-events-none">
        
        {/* Trailing Jet Contrails behind the right tail */}
        <div className="absolute right-[20%] top-1/2 -translate-y-1/2 flex flex-col gap-12 w-[75vw] pointer-events-none animate-contrail-stream">
          <div className="h-[1.5px] w-full" style={{ background: `linear-gradient(to left, transparent, ${contrailColor})` }} />
          <div className="flex items-center gap-2.5 justify-end pr-12">
            <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: fuselageFill }}>
              TRIPGON AIRWAYS · FLIGHT LOG
            </span>
            {destinationTitle && (
              <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-wider uppercase opacity-85" style={{ color: fuselageFill }}>
                → {destinationTitle}
              </span>
            )}
          </div>
          <div className="h-[1.5px] w-full" style={{ background: `linear-gradient(to left, transparent, ${contrailColor})` }} />
        </div>

        {/* Minimal Fullscreen Airplane Vector (Nose strictly pointing Left, Rotate -90deg) */}
        <svg 
          viewBox="0 0 1000 800" 
          className="w-full h-full pointer-events-none"
          style={{
            filter: isDarkMode 
              ? 'drop-shadow(0 22px 40px rgba(0,0,0,0.65))' 
              : 'drop-shadow(0 22px 40px rgba(0,0,0,0.22))'
          }}
        >
          {/* Rotate -90deg: Moves original 12 o'clock Nose to exact 9 o'clock (Leftward) flight direction */}
          <g transform="translate(500, 400) rotate(-90) translate(-500, -400)">
            {/* Main Wings (Wide swept-back high-aspect ratio wings) */}
            <path
              d="
                M 500, 360
                L 140, 490
                C 110, 500 90, 485 100, 465
                L 440, 260
                L 480, 240
                Z
              "
              fill={wingsFill}
            />
            <path
              d="
                M 500, 360
                L 860, 490
                C 890, 500 910, 485 900, 465
                L 560, 260
                L 520, 240
                Z
              "
              fill={wingsFill}
            />

            {/* Jet Engines beneath wings */}
            <rect x="310" y="380" width="22" height="70" rx="11" fill={detailsFill} />
            <rect x="668" y="380" width="22" height="70" rx="11" fill={detailsFill} />

            {/* Horizontal Stabilizers / Tail Wings */}
            <path
              d="
                M 500, 710
                L 350, 775
                C 335, 782 330, 773 338, 760
                L 475, 680
                Z
              "
              fill={wingsFill}
            />
            <path
              d="
                M 500, 710
                L 650, 775
                C 665, 782 670, 773 662, 760
                L 525, 680
                Z
              "
              fill={wingsFill}
            />

            {/* Sleek Aerodynamic Fuselage (Body in elegant Gray) */}
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
              fill={fuselageFill}
            />

            {/* Minimalist Cockpit Slit */}
            <path
              d="
                M 490, 160
                C 495, 155 505, 155 510, 160
                L 512, 172
                C 505, 169 495, 169 488, 172
                Z
              "
              fill={cockpitFill}
            />

            {/* Fuselage Spine Accent Line */}
            <line 
              x1="500" y1="190" x2="500" y2="720" 
              stroke={detailsFill} 
              strokeWidth="2" 
              opacity="0.4"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
