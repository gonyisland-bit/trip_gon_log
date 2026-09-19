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
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95) return 'storm';
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

  // 1. 비: 근거리 굵은 빗줄기 (35개)
  const foregroundRaindrops = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: `fg-${i}`,
      left: `${(i * 2.85 + (i % 7) * 1.7) % 100}%`,
      delay: `${(i * 0.08) % 1.2}s`,
      duration: `${0.45 + ((i % 5) * 0.08)}s`,
      height: `${45 + (i % 5) * 8}px`,
      width: '1.8px',
      opacity: 0.55 + ((i % 4) * 0.1),
    }));
  }, []);

  // 2. 비: 원거리 미세 빗줄기 (35개)
  const backgroundRaindrops = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: `bg-${i}`,
      left: `${(i * 2.9 + 1.2 + (i % 6) * 1.9) % 100}%`,
      delay: `${(i * 0.07 + 0.3) % 1.4}s`,
      duration: `${0.65 + ((i % 4) * 0.1)}s`,
      height: `${28 + (i % 4) * 6}px`,
      width: '1.2px',
      opacity: 0.3 + ((i % 4) * 0.08),
    }));
  }, []);

  // 3. 비: 바닥 수면 빗방울 튀김 (Splash 링 + Rebound 물방울)
  const splashes = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: `sp-${i}`,
      left: `${(i * 7.1 + 2.5) % 96}%`,
      bottom: `${3 + (i % 5) * 2.8}%`,
      delay: `${(i * 0.21) % 1.5}s`,
      duration: `${0.65 + (i % 3) * 0.15}s`,
    }));
  }, []);

  // 4. 눈: 가볍게 흩날리는 윈드 스웨이 눈송이 (42개)
  const snowflakes = useMemo(() => {
    const sways = ['Gentle', 'Left', 'Right'];
    return Array.from({ length: 42 }, (_, i) => {
      const sizePx = 2.5 + ((i % 5) * 0.9); // 2.5px ~ 6.1px
      return {
        id: `snow-${i}`,
        left: `${(i * 2.38 + (i % 7) * 2.1) % 100}%`,
        delay: `${(i * 0.22) % 4.5}s`,
        duration: `${3.8 + ((i % 6) * 0.7)}s`, // 3.8s ~ 7.3s 포근한 속도
        size: `${sizePx}px`,
        swayType: sways[i % 3],
        opacity: 0.65 + ((i % 4) * 0.1), // 0.65 ~ 0.95
      };
    });
  }, []);

  // 5. 밤하늘 별 (32개 - 나이트모드 맑음/구름조금 시 반짝임)
  const stars = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: `star-${i}`,
      left: `${(i * 3.1 + (i % 5) * 7.3) % 98}%`,
      top: `${2 + (i % 8) * 5.2 + ((i % 3) * 2.1)}%`, // 상단 2% ~ 48%에 고르게 분포
      size: `${1.2 + ((i % 3) * 0.6)}px`, // 1.2px ~ 2.4px
      delay: `${(i * 0.35) % 4}s`,
      duration: `${2.8 + ((i % 4) * 0.8)}s`,
    }));
  }, []);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden transition-all duration-700 select-none z-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <style>{`
        /* ── Rain Animations ── */
        @keyframes tglRainDropFg {
          0% { transform: translate3d(0, -90px, 0); }
          100% { transform: translate3d(-32px, 108vh, 0); }
        }
        @keyframes tglRainDropBg {
          0% { transform: translate3d(0, -60px, 0); }
          100% { transform: translate3d(-24px, 105vh, 0); }
        }
        @keyframes tglRainSplashRing {
          0% {
            opacity: 0;
            transform: scale(0.2) translate3d(0, 0, 0);
          }
          35% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: scale(1.6) translate3d(0, 0, 0);
          }
        }
        @keyframes tglReboundDropLeft {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.6);
          }
          30% {
            opacity: 0.9;
            transform: translate3d(-5px, -14px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-8px, -2px, 0) scale(0.3);
          }
        }
        @keyframes tglReboundDropRight {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.6);
          }
          30% {
            opacity: 0.9;
            transform: translate3d(5px, -13px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(7px, -1px, 0) scale(0.3);
          }
        }
        @keyframes tglWetGroundShimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.75; }
        }

        /* ── Snow Animations ── */
        @keyframes tglSnowSwayGentle {
          0% {
            transform: translate3d(0, -20px, 0);
          }
          25% {
            transform: translate3d(12px, 26vh, 0);
          }
          50% {
            transform: translate3d(-8px, 52vh, 0);
          }
          75% {
            transform: translate3d(14px, 78vh, 0);
          }
          100% {
            transform: translate3d(0px, 106vh, 0);
          }
        }
        @keyframes tglSnowSwayLeft {
          0% {
            transform: translate3d(0, -20px, 0);
          }
          35% {
            transform: translate3d(-18px, 38vh, 0);
          }
          70% {
            transform: translate3d(-6px, 72vh, 0);
          }
          100% {
            transform: translate3d(-22px, 106vh, 0);
          }
        }
        @keyframes tglSnowSwayRight {
          0% {
            transform: translate3d(0, -20px, 0);
          }
          35% {
            transform: translate3d(18px, 38vh, 0);
          }
          70% {
            transform: translate3d(6px, 72vh, 0);
          }
          100% {
            transform: translate3d(22px, 106vh, 0);
          }
        }

        /* ── Sun / Sky Animations ── */
        @keyframes tglSunRaysBreathe {
          0%, 100% {
            opacity: 0.22;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.42;
            transform: scale(1.06) rotate(1.5deg);
          }
        }
        @keyframes tglSunCoreGlow {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.58;
            transform: scale(1.12);
          }
        }
        @keyframes tglStarTwinkle {
          0%, 100% {
            opacity: 0.15;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.35);
          }
        }

        /* ── Cloud Drift Animations (Seamless Parallax Flow) ── */
        @keyframes tglCloudFlowFg {
          0% {
            transform: translate3d(-60vw, 0, 0);
          }
          100% {
            transform: translate3d(110vw, 0, 0);
          }
        }
        @keyframes tglCloudFlowBg {
          0% {
            transform: translate3d(-70vw, 0, 0);
          }
          100% {
            transform: translate3d(110vw, 0, 0);
          }
        }

        /* ── Storm Flash ── */
        @keyframes tglStormFlash {
          0%, 90%, 100% { opacity: 0; }
          91% { opacity: 0.45; }
          92% { opacity: 0.1; }
          94% { opacity: 0.6; }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. RAIN / STORM EFFECT                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'rain' || effectType === 'storm') && (
        <div className="absolute inset-0">
          {/* 촉촉하고 차분한 대기 틴트 */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-blue-950/35 via-zinc-950/20 to-transparent'
                : 'bg-gradient-to-b from-blue-100/40 via-slate-100/25 to-transparent'
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
                    ? 'linear-gradient(to bottom, rgba(191, 219, 254, 0.1), rgba(96, 165, 250, 0.95))'
                    : 'linear-gradient(to bottom, rgba(30, 64, 175, 0.1), rgba(29, 78, 216, 0.85))',
                  opacity: drop.opacity,
                  animation: `tglRainDropFg ${drop.duration} linear infinite`,
                  animationDelay: drop.delay,
                  willChange: 'transform',
                }}
              />
            ))}
          </div>

          {/* 바닥 수면 빗방울 튀김 (Splash 링 + Rebound 미세 물방울 튀김) */}
          <div className="absolute inset-x-0 bottom-0 h-44">
            {splashes.map((sp) => (
              <div
                key={sp.id}
                className="absolute"
                style={{
                  left: sp.left,
                  bottom: sp.bottom,
                }}
              >
                {/* 빗방울 착지 리플 링 */}
                <span
                  className="block rounded-full border border-blue-400/65 dark:border-blue-300/75"
                  style={{
                    width: '15px',
                    height: '6px',
                    animation: `tglRainSplashRing ${sp.duration} ease-out infinite`,
                    animationDelay: sp.delay,
                    willChange: 'transform, opacity',
                  }}
                />
                {/* 좌측 튀는 물방울 도트 */}
                <span
                  className="absolute top-0 left-1 w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-300"
                  style={{
                    animation: `tglReboundDropLeft ${sp.duration} ease-out infinite`,
                    animationDelay: sp.delay,
                    willChange: 'transform, opacity',
                  }}
                />
                {/* 우측 튀는 물방울 도트 */}
                <span
                  className="absolute top-0 right-1 w-0.5 h-0.5 rounded-full bg-blue-300 dark:bg-blue-200"
                  style={{
                    animation: `tglReboundDropRight ${sp.duration} ease-out infinite`,
                    animationDelay: sp.delay,
                    willChange: 'transform, opacity',
                  }}
                />
              </div>
            ))}
          </div>

          {/* 하단 빗물에 촉촉하게 젖은 지면(Wet Ground) 반사광 레이어 */}
          <div 
            className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
            style={{
              animation: 'tglWetGroundShimmer 4s ease-in-out infinite',
              willChange: 'opacity',
            }}
          >
            <div 
              className={`w-full h-full ${
                isDarkMode
                  ? 'bg-gradient-to-t from-blue-950/40 via-blue-900/15 to-transparent'
                  : 'bg-gradient-to-t from-blue-500/20 via-blue-400/10 to-transparent'
              }`}
            />
            {/* 수면 웻 하이라이트 림 라인 */}
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 dark:via-blue-300/40 to-transparent" />
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
      {/* 2. SNOW EFFECT (화사하고 맑은 순백색 + 윈드 스웨이 + 하단 스노우뱅크) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'snow' && (
        <div className="absolute inset-0">
          {/* 차분하고 포근한 겨울 대기 틴트 */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-sky-950/30 via-zinc-950/15 to-transparent'
                : 'bg-gradient-to-b from-sky-100/35 via-slate-100/20 to-transparent'
            }`}
          />

          {/* 흩날리는 순백색 눈송이 레이어 */}
          {snowflakes.map((flake) => (
            <span
              key={flake.id}
              className="absolute top-0 rounded-full"
              style={{
                left: flake.left,
                width: flake.size,
                height: flake.size,
                backgroundColor: '#ffffff',
                opacity: flake.opacity,
                boxShadow: isDarkMode
                  ? '0 0 4px rgba(224, 242, 254, 0.9), 0 0 8px rgba(186, 230, 254, 0.4)'
                  : '0 0 3px rgba(255, 255, 255, 0.95), 0 1px 3px rgba(71, 85, 105, 0.28)',
                animation: `tglSnowSway${flake.swayType} ${flake.duration} ease-in-out infinite`,
                animationDelay: flake.delay,
                willChange: 'transform',
              }}
            />
          ))}

          {/* 하단 살포시 소복이 쌓인 불규칙 스노우 뱅크(Snow Bank Drift) 레이어 */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none">
            {/* 원경 스노우 림 (소프트 블러) */}
            <svg 
              className="w-full h-10 sm:h-14 block" 
              viewBox="0 0 1440 60" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0,35 Q 240,15 480,30 T 960,18 T 1440,32 L 1440,60 L 0,60 Z" 
                className={isDarkMode ? 'fill-blue-100/10' : 'fill-white/70'}
              />
            </svg>
            {/* 근경 스노우 림 (살짝 겹치는 불규칙 곡면 능선) */}
            <svg 
              className="w-full h-8 sm:h-11 block -mt-5 sm:-mt-7" 
              viewBox="0 0 1440 50" 
              preserveAspectRatio="none"
            >
              <path 
                d="M0,25 Q 360,8 720,22 T 1200,12 T 1440,24 L 1440,50 L 0,50 Z" 
                className={isDarkMode ? 'fill-white/15' : 'fill-white/85'}
              />
            </svg>
            {/* 스노우 상단 은은한 화이트 서리 림 라인 */}
            <div className="absolute inset-x-0 bottom-8 sm:bottom-11 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-blue-200/30 to-transparent" />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CLEAR / FAIR EFFECT (주간 따스한 햇살 빔 & 야간 인디고 밤하늘 별) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'clear' || effectType === 'fair') && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            /* [다크 모드] 상단 딥 인디고 스카이 + 반짝이는 별자리(Twinkling Stars) */
            <div className="absolute inset-0">
              {/* 상단 딥 인디고 / 사파이어 밤하늘 앰비언트 그라데이션 */}
              <div 
                className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-[#0f172a]/75 via-[#1e1b4b]/35 to-transparent transition-opacity duration-1000" 
              />
              <div 
                className="absolute -top-16 -right-16 w-96 h-96 rounded-full blur-3xl bg-indigo-500/10" 
              />

              {/* 밤하늘을 수놓은 반짝이는 별들 */}
              {stars.map((star) => (
                <span
                  key={star.id}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    boxShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(199, 210, 254, 0.5)',
                    animation: `tglStarTwinkle ${star.duration} ease-in-out infinite`,
                    animationDelay: star.delay,
                    willChange: 'transform, opacity',
                  }}
                />
              ))}
            </div>
          ) : (
            /* [라이트 모드] 우상단에서 사선으로 내리쬐는 따스한 햇살 빔 & 썬 글로우 */
            <div className="absolute inset-0">
              {/* 우상단 썬 코어 글로우 */}
              <div
                className="absolute -top-28 -right-28 w-[420px] h-[420px] rounded-full blur-3xl bg-gradient-to-br from-amber-300/35 via-orange-300/20 to-transparent"
                style={{
                  animation: 'tglSunCoreGlow 7s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}
              />

              {/* 우상단 사선 햇살 빛줄기 (Sun Rays Shafts) */}
              <div
                className="absolute top-0 right-0 w-[85vw] h-[85vh] origin-top-right pointer-events-none opacity-80"
                style={{
                  background: 'conic-gradient(from 195deg at 100% 0%, transparent 0deg, rgba(251, 191, 36, 0.08) 15deg, transparent 30deg, rgba(245, 158, 11, 0.09) 45deg, transparent 65deg, rgba(251, 191, 36, 0.06) 80deg, transparent 95deg)',
                  animation: 'tglSunRaysBreathe 9s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}
              />

              {/* 전체 온화한 골든 앰비언트 틴트 */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-50/25 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. CLOUDS / FOG EFFECT (유유히 천천히 흘러가는 2중 시차 구름 흐름) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'clouds' || effectType === 'fog') && (
        <div className="absolute inset-0">
          {/* 차분한 흐린 날 대기 틴트 */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-zinc-900/35 via-zinc-950/15 to-transparent'
                : 'bg-gradient-to-b from-slate-200/30 via-slate-100/15 to-transparent'
            }`}
          />

          {/* 원경 구름 (105초 느린 유유자적 흐름) */}
          <div
            className="absolute top-[-5vh] left-0 w-[80vw] h-[35vh] pointer-events-none"
            style={{
              animation: 'tglCloudFlowBg 105s linear infinite',
              willChange: 'transform',
            }}
          >
            <div 
              className={`w-full h-full rounded-[100%] blur-3xl ${
                isDarkMode ? 'bg-zinc-700/20' : 'bg-slate-400/25'
              }`}
            />
          </div>

          {/* 근경 구름 (65초 부드러운 흐름) */}
          <div
            className="absolute top-[8vh] left-0 w-[65vw] h-[30vh] pointer-events-none"
            style={{
              animation: 'tglCloudFlowFg 65s linear infinite',
              willChange: 'transform',
            }}
          >
            <div 
              className={`w-full h-full rounded-[100%] blur-3xl ${
                isDarkMode ? 'bg-zinc-600/25' : 'bg-slate-300/30'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
