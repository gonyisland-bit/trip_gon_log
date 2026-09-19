import React, { useMemo } from 'react';

export type WeatherEffectType = 'clear' | 'fair' | 'clouds' | 'fog' | 'rain' | 'snow' | 'storm';

interface WeatherEffectLayerProps {
  weatherCode?: number;
  precipitationProb?: number;
  isDarkMode?: boolean;
  opacity?: number;
  className?: string;
}

export function resolveWeatherEffectType(code?: number, pop?: number): WeatherEffectType {
  if (code === undefined) return 'clear';
  if (pop !== undefined && pop >= 55) {
    if (code === 0 || code === 1 || code === 2 || code === 3) {
      return 'rain';
    }
  }
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'fair';
  if (code === 3) return 'clouds';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95) return 'storm';
  return 'clear';
}

export const WeatherEffectLayer: React.FC<WeatherEffectLayerProps> = ({
  weatherCode = 0,
  precipitationProb = 0,
  isDarkMode = false,
  opacity = 1,
  className = '',
}) => {
  const effectType = useMemo(
    () => resolveWeatherEffectType(weatherCode, precipitationProb),
    [weatherCode, precipitationProb]
  );

  const raindrops = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i * 3.3 + (i % 7) * 2.1) % 100}%`,
      delay: `${(i * 0.12) % 1.5}s`,
      duration: `${0.65 + ((i % 5) * 0.1)}s`,
      height: `${18 + (i % 4) * 6}px`,
      opacity: 0.25 + ((i % 6) * 0.1),
    }));
  }, []);

  const snowflakes = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i * 4.2 + (i % 5) * 3) % 100}%`,
      delay: `${(i * 0.2) % 3}s`,
      duration: `${2.8 + ((i % 4) * 0.5)}s`,
      size: `${3 + (i % 4) * 2}px`,
      opacity: 0.3 + ((i % 5) * 0.12),
    }));
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes tglRainDrop {
          0% {
            transform: translate3d(0, -60px, 0);
          }
          100% {
            transform: translate3d(-18px, 100vh, 0);
          }
        }
        @keyframes tglSnowFlake {
          0% {
            transform: translate3d(0, -20px, 0);
          }
          50% {
            transform: translate3d(12px, 50vh, 0);
          }
          100% {
            transform: translate3d(-10px, 105vh, 0);
          }
        }
        @keyframes tglSunPulse {
          0%, 100% {
            opacity: 0.18;
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            opacity: 0.32;
            transform: scale(1.08) translate3d(10px, -5px, 0);
          }
        }
        @keyframes tglCloudDrift {
          0% {
            transform: translate3d(-10%, 0, 0);
          }
          50% {
            transform: translate3d(10%, 0, 0);
          }
          100% {
            transform: translate3d(-10%, 0, 0);
          }
        }
        @keyframes tglStormFlash {
          0%, 92%, 100% {
            opacity: 0;
          }
          93% {
            opacity: 0.25;
          }
          94% {
            opacity: 0.05;
          }
          96% {
            opacity: 0.35;
          }
        }
      `}</style>

      {(effectType === 'rain' || effectType === 'storm') && (
        <div className="absolute inset-0">
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-blue-950/20 via-zinc-950/15 to-transparent'
                : 'bg-gradient-to-b from-blue-100/25 via-slate-100/20 to-transparent'
            }`}
          />
          <div className="absolute inset-0">
            {raindrops.map((drop) => (
              <span
                key={drop.id}
                className="absolute top-0 rounded-full"
                style={{
                  left: drop.left,
                  width: '1.2px',
                  height: drop.height,
                  background: isDarkMode
                    ? 'linear-gradient(to bottom, rgba(147, 197, 253, 0), rgba(147, 197, 253, 0.6))'
                    : 'linear-gradient(to bottom, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.45))',
                  opacity: drop.opacity,
                  animation: `tglRainDrop ${drop.duration} linear infinite`,
                  animationDelay: drop.delay,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>
          {effectType === 'storm' && (
            <div 
              className="absolute inset-0 bg-blue-100/40 dark:bg-indigo-300/30"
              style={{
                animation: 'tglStormFlash 7s infinite',
                willChange: 'opacity',
              }}
            />
          )}
        </div>
      )}

      {effectType === 'snow' && (
        <div className="absolute inset-0">
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-cyan-950/20 via-zinc-950/10 to-transparent'
                : 'bg-gradient-to-b from-sky-50/30 via-slate-50/20 to-transparent'
            }`}
          />
          {snowflakes.map((flake) => (
            <span
              key={flake.id}
              className="absolute top-0 rounded-full blur-[0.3px]"
              style={{
                left: flake.left,
                width: flake.size,
                height: flake.size,
                backgroundColor: isDarkMode ? '#e0f2fe' : '#94a3b8',
                opacity: flake.opacity,
                animation: `tglSnowFlake ${flake.duration} ease-in-out infinite`,
                animationDelay: flake.delay,
                willChange: 'transform',
              }}
            />
          ))}
        </div>
      )}

      {(effectType === 'clear' || effectType === 'fair') && (
        <div className="absolute inset-0">
          <div
            className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-amber-400/10'
                : 'bg-amber-200/25'
            }`}
            style={{
              animation: 'tglSunPulse 6s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          />
        </div>
      )}

      {(effectType === 'clouds' || effectType === 'fog') && (
        <div className="absolute inset-0">
          <div
            className={`absolute -top-10 -left-20 w-[120%] h-64 rounded-full blur-3xl transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-zinc-800/15'
                : 'bg-zinc-300/20'
            }`}
            style={{
              animation: 'tglCloudDrift 14s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>
      )}
    </div>
  );
};
