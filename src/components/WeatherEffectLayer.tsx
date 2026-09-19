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

  // 1. 근거리 굵은 빗줄기 (35개 - 시원하고 선명한 빗줄기)
  const foregroundRaindrops = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: `fg-${i}`,
      left: `${(i * 2.85 + (i % 7) * 1.7) % 100}%`,
      delay: `${(i * 0.08) % 1.2}s`,
      duration: `${0.45 + ((i % 5) * 0.08)}s`,
      height: `${45 + (i % 5) * 8}px`, // 45px ~ 77px
      width: '1.8px',
      opacity: 0.55 + ((i % 4) * 0.1), // 0.55 ~ 0.85 선명도
    }));
  }, []);

  // 2. 원거리 미세 빗줄기 (35개 - 깊이감 형성)
  const backgroundRaindrops = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: `bg-${i}`,
      left: `${(i * 2.9 + 1.2 + (i % 6) * 1.9) % 100}%`,
      delay: `${(i * 0.07 + 0.3) % 1.4}s`,
      duration: `${0.65 + ((i % 4) * 0.1)}s`,
      height: `${28 + (i % 4) * 6}px`, // 28px ~ 46px
      width: '1.2px',
      opacity: 0.3 + ((i % 4) * 0.08), // 0.3 ~ 0.54 은은함
    }));
  }, []);

  // 3. 바닥 수면 빗방울 튀김 링 파티클 (12개 Splash)
  const splashes = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: `sp-${i}`,
      left: `${(i * 8.3 + 3.5) % 96}%`,
      bottom: `${4 + (i % 5) * 3}%`,
      delay: `${(i * 0.22) % 1.5}s`,
      duration: `${0.7 + (i % 3) * 0.15}s`,
    }));
  }, []);

  // 눈송이 파티클
  const snowflakes = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${(i * 3.3 + (i % 5) * 2.5) % 100}%`,
      delay: `${(i * 0.18) % 3.2}s`,
      duration: `${2.6 + ((i % 5) * 0.4)}s`,
      size: `${3 + (i % 4) * 2}px`,
      opacity: 0.35 + ((i % 4) * 0.15),
    }));
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden transition-all duration-700 select-none z-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes tglRainDropFg {
          0% {
            transform: translate3d(0, -90px, 0);
          }
          100% {
            transform: translate3d(-32px, 108vh, 0);
          }
        }
        @keyframes tglRainDropBg {
          0% {
            transform: translate3d(0, -60px, 0);
          }
          100% {
            transform: translate3d(-24px, 105vh, 0);
          }
        }
        @keyframes tglRainSplash {
          0% {
            opacity: 0;
            transform: scale(0.2) translate3d(0, 0, 0);
          }
          50% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
            transform: scale(1.4) translate3d(0, 0, 0);
          }
        }
        @keyframes tglSnowFlake {
          0% {
            transform: translate3d(0, -25px, 0);
          }
          50% {
            transform: translate3d(14px, 50vh, 0);
          }
          100% {
            transform: translate3d(-12px, 105vh, 0);
          }
        }
        @keyframes tglSunPulse {
          0%, 100% {
            opacity: 0.18;
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            opacity: 0.35;
            transform: scale(1.08) translate3d(12px, -6px, 0);
          }
        }
        @keyframes tglCloudDrift {
          0% {
            transform: translate3d(-8%, 0, 0);
          }
          50% {
            transform: translate3d(8%, 0, 0);
          }
          100% {
            transform: translate3d(-8%, 0, 0);
          }
        }
        @keyframes tglStormFlash {
          0%, 90%, 100% {
            opacity: 0;
          }
          91% {
            opacity: 0.35;
          }
          92% {
            opacity: 0.08;
          }
          94% {
            opacity: 0.45;
          }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. RAIN / STORM EFFECT (총 70개 빗줄기 + Splash 링 + 앰비언트 틴트) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'rain' || effectType === 'storm') && (
        <div className="absolute inset-0">
          {/* 촉촉하고 차분한 비 대기 틴트 (라이트: 은은한 쿨 그레이/블루, 다크: 딥 네이비 차콜) */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-blue-950/30 via-zinc-950/20 to-transparent'
                : 'bg-gradient-to-b from-blue-100/35 via-slate-100/25 to-transparent'
            }`}
          />

          {/* 원거리 미세 빗줄기 레이어 */}
          <div className="absolute inset-0 opacity-85">
            {backgroundRaindrops.map((drop) => (
              <span
                key={drop.id}
                className="absolute top-0 rounded-full"
                style={{
                  left: drop.left,
                  width: drop.width,
                  height: drop.height,
                  background: isDarkMode
                    ? 'linear-gradient(to bottom, rgba(147, 197, 253, 0.05), rgba(147, 197, 253, 0.65))'
                    : 'linear-gradient(to bottom, rgba(37, 99, 235, 0.05), rgba(37, 99, 235, 0.5))',
                  opacity: drop.opacity,
                  animation: `tglRainDropBg ${drop.duration} linear infinite`,
                  animationDelay: drop.delay,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>

          {/* 근거리 선명한 굵은 빗줄기 레이어 */}
          <div className="absolute inset-0">
            {foregroundRaindrops.map((drop) => (
              <span
                key={drop.id}
                className="absolute top-0 rounded-full shadow-2xs"
                style={{
                  left: drop.left,
                  width: drop.width,
                  height: drop.height,
                  background: isDarkMode
                    ? 'linear-gradient(to bottom, rgba(191, 219, 254, 0.1), rgba(96, 165, 250, 0.9))'
                    : 'linear-gradient(to bottom, rgba(30, 64, 175, 0.1), rgba(29, 78, 216, 0.75))',
                  opacity: drop.opacity,
                  animation: `tglRainDropFg ${drop.duration} linear infinite`,
                  animationDelay: drop.delay,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>

          {/* 바닥 수면 빗방울 튀김 (Splash 링 효과) */}
          <div className="absolute inset-x-0 bottom-0 h-40">
            {splashes.map((sp) => (
              <span
                key={sp.id}
                className="absolute rounded-full border border-blue-400/50 dark:border-blue-300/60"
                style={{
                  left: sp.left,
                  bottom: sp.bottom,
                  width: '14px',
                  height: '6px',
                  animation: `tglRainSplash ${sp.duration} ease-out infinite`,
                  animationDelay: sp.delay,
                  willChange: 'transform, opacity',
                }}
              />
            ))}
          </div>

          {/* 뇌우 플래시 효과 */}
          {effectType === 'storm' && (
            <div 
              className="absolute inset-0 bg-blue-100/40 dark:bg-indigo-300/30"
              style={{
                animation: 'tglStormFlash 6.5s infinite',
                willChange: 'opacity',
              }}
            />
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SNOW EFFECT                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'snow' && (
        <div className="absolute inset-0">
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-cyan-950/25 via-zinc-950/15 to-transparent'
                : 'bg-gradient-to-b from-sky-50/35 via-slate-50/20 to-transparent'
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
                backgroundColor: isDarkMode ? '#e0f2fe' : '#64748b',
                opacity: flake.opacity,
                animation: `tglSnowFlake ${flake.duration} ease-in-out infinite`,
                animationDelay: flake.delay,
                willChange: 'transform',
              }}
            />
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CLEAR / SUNSHINE EFFECT                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. CLOUDS / FOG EFFECT                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
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
