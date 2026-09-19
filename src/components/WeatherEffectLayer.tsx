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
  if (code === 1 || code === 2) return 'fair'; // 조금 흐림 (구름 + 해)
  if (code === 3) return 'clouds'; // 흐림 (구름)
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

  // 4. 눈: 광폭 윈드 스웨이 & 사뿐사뿐 흩날리는 눈송이 (46개)
  const snowflakes = useMemo(() => {
    const sways = ['Gentle', 'Left', 'Right'];
    return Array.from({ length: 46 }, (_, i) => {
      const sizePx = 2.8 + ((i % 6) * 0.95); // 2.8px ~ 7.5px
      return {
        id: `snow-${i}`,
        left: `${(i * 2.17 + (i % 7) * 2.3) % 100}%`,
        delay: `${(i * 0.19) % 4.8}s`,
        duration: `${3.2 + ((i % 5) * 0.7)}s`, // 3.2s ~ 6.0s 사뿐사뿐한 속도
        size: `${sizePx}px`,
        swayType: sways[i % 3],
        opacity: 0.7 + ((i % 4) * 0.09), // 0.7 ~ 0.97
      };
    });
  }, []);

  // 5. 밤하늘 별 (32개 - 나이트모드 맑음/조금흐림 시 반짝임)
  const stars = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: `star-${i}`,
      left: `${(i * 3.1 + (i % 5) * 7.3) % 98}%`,
      top: `${2 + (i % 8) * 5.2 + ((i % 3) * 2.1)}%`,
      size: `${1.2 + ((i % 3) * 0.6)}px`,
      delay: `${(i * 0.35) % 4}s`,
      duration: `${2.8 + ((i % 4) * 0.8)}s`,
    }));
  }, []);

  // 6. 구름 무리 클러스터 (흐림 및 조금흐림 시 화면 내 끊김 없이 흐르는 구름)
  const clouds = useMemo(() => {
    return [
      { id: 'c1', top: '4%', scale: 1.15, duration: '48s', delay: '-6s', opacity: 0.85 },
      { id: 'c2', top: '16%', scale: 0.9, duration: '62s', delay: '-28s', opacity: 0.7 },
      { id: 'c3', top: '28%', scale: 1.25, duration: '55s', delay: '-45s', opacity: 0.8 },
      { id: 'c4', top: '42%', scale: 0.85, duration: '68s', delay: '-18s', opacity: 0.6 },
    ];
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
          0% { opacity: 0; transform: scale(0.2) translate3d(0, 0, 0); }
          35% { opacity: 0.8; }
          100% { opacity: 0; transform: scale(1.6) translate3d(0, 0, 0); }
        }
        @keyframes tglReboundDropLeft {
          0% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
          30% { opacity: 0.9; transform: translate3d(-5px, -14px, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(-8px, -2px, 0) scale(0.3); }
        }
        @keyframes tglReboundDropRight {
          0% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
          30% { opacity: 0.9; transform: translate3d(5px, -13px, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(7px, -1px, 0) scale(0.3); }
        }
        @keyframes tglWetGroundShimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.75; }
        }

        /* ── Snow Animations (사뿐사뿐 광폭 윈드 스웨이) ── */
        @keyframes tglSnowSwayGentle {
          0% { transform: translate3d(0, -25px, 0); }
          25% { transform: translate3d(38px, 26vh, 0); }
          50% { transform: translate3d(-32px, 52vh, 0); }
          75% { transform: translate3d(40px, 78vh, 0); }
          100% { transform: translate3d(-6px, 106vh, 0); }
        }
        @keyframes tglSnowSwayLeft {
          0% { transform: translate3d(0, -25px, 0); }
          25% { transform: translate3d(-46px, 26vh, 0); }
          50% { transform: translate3d(-14px, 52vh, 0); }
          75% { transform: translate3d(-56px, 78vh, 0); }
          100% { transform: translate3d(-36px, 106vh, 0); }
        }
        @keyframes tglSnowSwayRight {
          0% { transform: translate3d(0, -25px, 0); }
          25% { transform: translate3d(46px, 26vh, 0); }
          50% { transform: translate3d(14px, 52vh, 0); }
          75% { transform: translate3d(56px, 78vh, 0); }
          100% { transform: translate3d(36px, 106vh, 0); }
        }

        /* ── Sun & Rays Animations (맑음 태양 & 햇살) ── */
        @keyframes tglSunCorePulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 25px rgba(251, 191, 36, 0.85));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 45px rgba(245, 158, 11, 1));
          }
        }
        @keyframes tglSunCoronaSpin {
          0% { transform: rotate(0deg) scale(1); opacity: 0.65; }
          50% { transform: rotate(180deg) scale(1.08); opacity: 0.9; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.65; }
        }
        @keyframes tglSunRaysBreathe {
          0%, 100% {
            opacity: 0.45;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08) rotate(2deg);
          }
        }
        @keyframes tglFairSunBehindCloud {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.06);
          }
        }

        /* ── Night Star Twinkle ── */
        @keyframes tglStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.4); }
        }

        /* ── Clouds Continuous Drift Flow ── */
        @keyframes tglContinuousCloudFlow {
          0% {
            transform: translate3d(-50vw, 0, 0);
          }
          100% {
            transform: translate3d(120vw, 0, 0);
          }
        }

        /* ── Storm Flash ── */
        @keyframes tglStormFlash {
          0%, 90%, 100% { opacity: 0; }
          91% { opacity: 0.55; }
          92% { opacity: 0.15; }
          94% { opacity: 0.7; }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. RAIN / STORM EFFECT                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'rain' || effectType === 'storm') && (
        <div className="absolute inset-0">
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-blue-950/35 via-zinc-950/20 to-transparent'
                : 'bg-gradient-to-b from-blue-100/40 via-slate-100/25 to-transparent'
            }`}
          />

          {/* 원거리 미세 빗줄기 */}
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

          {/* 근거리 굵은 빗줄기 */}
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

          {/* 바닥 수면 빗방울 튀김 */}
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
                <span
                  className="absolute top-0 left-1 w-1 h-1 rounded-full bg-blue-400 dark:bg-blue-300"
                  style={{
                    animation: `tglReboundDropLeft ${sp.duration} ease-out infinite`,
                    animationDelay: sp.delay,
                    willChange: 'transform, opacity',
                  }}
                />
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

          {/* 하단 젖은 지면 반사광 */}
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
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 dark:via-blue-300/40 to-transparent" />
          </div>

          {/* 뇌우 플래시 */}
          {effectType === 'storm' && (
            <div 
              className="absolute inset-0 bg-blue-100/45 dark:bg-indigo-300/35"
              style={{
                animation: 'tglStormFlash 6.5s infinite',
                willChange: 'opacity',
              }}
            />
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SNOW EFFECT (라이트모드 선명한 얼음결정 음영 & 사뿐사뿐 윈드스웨이) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'snow' && (
        <div className="absolute inset-0">
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-sky-950/30 via-zinc-950/15 to-transparent'
                : 'bg-gradient-to-b from-sky-100/40 via-slate-100/25 to-transparent'
            }`}
          />

          {/* 사뿐사뿐 흩날리는 눈송이 (라이트모드 쿨블루 섀도우로 선명 식별) */}
          {snowflakes.map((flake) => (
            <span
              key={flake.id}
              className="absolute top-0 rounded-full"
              style={{
                left: flake.left,
                width: flake.size,
                height: flake.size,
                backgroundColor: isDarkMode ? '#ffffff' : '#f0f9ff',
                opacity: flake.opacity,
                boxShadow: isDarkMode
                  ? '0 0 5px rgba(255, 255, 255, 0.95), 0 0 10px rgba(186, 230, 254, 0.6)'
                  : '0 0 3px rgba(59, 130, 246, 0.55), 0 1px 3px rgba(15, 23, 42, 0.4)',
                animation: `tglSnowSway${flake.swayType} ${flake.duration} ease-in-out infinite`,
                animationDelay: flake.delay,
                willChange: 'transform',
              }}
            />
          ))}

          {/* 하단 스노우 뱅크 */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none">
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
            <div className="absolute inset-x-0 bottom-8 sm:bottom-11 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-blue-200/30 to-transparent" />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CLEAR EFFECT (완전 맑음 — 하늘 속 태양 구체 & 따스한 햇살 빔)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'clear' && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            /* [다크 모드] 딥 인디고 스카이 + 반짝이는 별자리 */
            <div className="absolute inset-0">
              <div 
                className="absolute inset-x-0 top-0 h-[65vh] bg-gradient-to-b from-[#0d172e]/85 via-[#181d3d]/40 to-transparent transition-opacity duration-1000" 
              />
              <div 
                className="absolute -top-16 -right-16 w-96 h-96 rounded-full blur-3xl bg-indigo-500/15" 
              />

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
            /* [라이트 모드] 하늘 속 눈부신 태양 구체 + 다층 코로나 링 + 대각선 햇살 빔 */
            <div className="absolute inset-0">
              {/* 1. 우상단 태양 구체 (Sun Disc Core) */}
              <div className="absolute top-4 right-4 sm:top-8 sm:right-8 w-24 h-24 sm:w-32 sm:h-32 pointer-events-none">
                {/* 태양 발광 중심체 */}
                <div 
                  className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 via-amber-300 to-amber-500 shadow-[0_0_60px_rgba(251,191,36,0.9)]"
                  style={{
                    animation: 'tglSunCorePulse 6s ease-in-out infinite',
                    willChange: 'transform, filter',
                  }}
                />
                {/* 회전하는 썬 코로나 링 */}
                <div 
                  className="absolute -inset-4 sm:-inset-6 rounded-full border border-amber-300/40"
                  style={{
                    animation: 'tglSunCoronaSpin 18s linear infinite',
                    willChange: 'transform',
                  }}
                />
                {/* 광범위한 앰비언트 글로우 */}
                <div className="absolute -inset-16 sm:-inset-24 rounded-full bg-amber-300/25 blur-3xl" />
              </div>

              {/* 2. 화면을 대각선으로 관통하는 따스한 햇살 빛줄기 (God Rays) */}
              <div
                className="absolute top-0 right-0 w-[95vw] h-[95vh] origin-top-right pointer-events-none"
                style={{
                  background: 'conic-gradient(from 190deg at 100% 0%, transparent 0deg, rgba(251, 191, 36, 0.16) 14deg, transparent 28deg, rgba(245, 158, 11, 0.18) 42deg, transparent 58deg, rgba(251, 191, 36, 0.14) 72deg, transparent 88deg)',
                  animation: 'tglSunRaysBreathe 8s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}
              />

              {/* 전체 온화한 대기 틴트 */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100/20 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. FAIR EFFECT (조금 흐림 — 구름에 반쯤 가려진 해 & 흐르는 구름)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'fair' && (
        <div className="absolute inset-0">
          {/* 부드러운 대기 틴트 */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-zinc-900/40 via-transparent to-transparent'
                : 'bg-gradient-to-b from-sky-50/50 via-slate-50/20 to-transparent'
            }`}
          />

          {/* 1. 구름 뒤편의 태양 (우상단에서 구름에 반쯤 가려져 은은하게 발광) */}
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 w-20 h-20 sm:w-28 sm:h-28 pointer-events-none">
            <div 
              className={`w-full h-full rounded-full ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-amber-200/40 via-amber-400/25 to-transparent blur-md' 
                  : 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)] blur-xs'
              }`}
              style={{
                animation: 'tglFairSunBehindCloud 7s ease-in-out infinite',
                willChange: 'transform, opacity',
              }}
            />
            {/* 구름 테두리로 번지는 은은한 백라이트 림 */}
            <div className="absolute -inset-10 rounded-full bg-amber-300/20 blur-2xl" />
          </div>

          {/* 2. 태양 앞을 천천히 유유히 흘러가는 뭉게구름 무리 */}
          {clouds.slice(0, 3).map((c) => (
            <div
              key={`fair-${c.id}`}
              className="absolute left-0 w-[45vw] sm:w-[35vw] h-24 sm:h-36 pointer-events-none"
              style={{
                top: c.top,
                animation: `tglContinuousCloudFlow ${c.duration} linear infinite`,
                animationDelay: c.delay,
                willChange: 'transform',
                opacity: c.opacity * 0.75,
              }}
            >
              <div 
                className={`w-full h-full rounded-[100px] blur-xl transform ${
                  isDarkMode 
                    ? 'bg-zinc-700/35 border border-white/5' 
                    : 'bg-slate-300/45 border border-white/40'
                }`}
                style={{ transform: `scale(${c.scale})` }}
              />
            </div>
          ))}

          {/* 야간 모드일 시 상단 은은한 별 몇 개 노출 */}
          {isDarkMode && stars.slice(0, 14).map((star) => (
            <span
              key={`fair-star-${star.id}`}
              className="absolute rounded-full bg-white"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: 0.5,
                animation: `tglStarTwinkle ${star.duration} ease-in-out infinite`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CLOUDS / FOG EFFECT (흐림 — 차분하게 어두워진 하늘 & 뚜렷한 구름 흐름) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'clouds' || effectType === 'fog') && (
        <div className="absolute inset-0">
          {/* 흐린 날의 차분하고 약간 어두운 오버캐스트 대기감 */}
          <div 
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-zinc-950/35'
                : 'bg-slate-300/35'
            }`}
          />

          {/* 화면 내에서 끊김 없이 둥실둥실 흘러가는 4중 뭉게구름 무리 */}
          {clouds.map((c) => (
            <div
              key={`cloud-${c.id}`}
              className="absolute left-0 w-[60vw] sm:w-[45vw] h-28 sm:h-44 pointer-events-none"
              style={{
                top: c.top,
                animation: `tglContinuousCloudFlow ${c.duration} linear infinite`,
                animationDelay: c.delay,
                willChange: 'transform',
                opacity: c.opacity,
              }}
            >
              {/* 유기적인 뭉게구름 클러스터 덩어리 */}
              <div 
                className={`w-full h-full rounded-[120px] blur-2xl transform ${
                  isDarkMode 
                    ? 'bg-zinc-600/40 shadow-inner' 
                    : 'bg-slate-400/45 shadow-sm'
                }`}
                style={{ transform: `scale(${c.scale})` }}
              />
              {/* 구름 중심부 밀도 레이어 */}
              <div 
                className={`absolute inset-4 rounded-[80px] blur-xl ${
                  isDarkMode ? 'bg-zinc-500/25' : 'bg-slate-300/40'
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
