import React, { useMemo } from 'react';
import { StormLightningCanvas } from './StormLightningCanvas';

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

  // 4. 눈: 크기 확대(4.2px~9.0px) + 하늘색 오라 글로우 + 연속 등속 낙하(끊김 없음)
  const snowflakes = useMemo(() => {
    return Array.from({ length: 44 }, (_, i) => {
      const sizePx = 4.2 + ((i % 6) * 0.95);
      const fallDuration = 3.6 + ((i % 5) * 0.65);
      const swayDuration = 2.2 + ((i % 4) * 0.5);
      const swayAmp = 25 + ((i % 5) * 8);
      return {
        id: `snow-${i}`,
        left: `${(i * 2.27 + (i % 7) * 2.1) % 100}%`,
        fallDelay: `${(i * 0.16) % 4.5}s`,
        fallDuration: `${fallDuration}s`,
        swayDelay: `${(i * 0.23) % 3.0}s`,
        swayDuration: `${swayDuration}s`,
        swayAmp: `${swayAmp}px`,
        size: `${sizePx}px`,
        opacity: 0.75 + ((i % 4) * 0.08),
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

        /* ── Snow Animations (등속 연속 하강 + 부드러운 사인파 스웨이) ── */
        @keyframes tglSnowLinearFall {
          0% { transform: translate3d(0, -35px, 0); }
          100% { transform: translate3d(0, 106vh, 0); }
        }
        @keyframes tglSnowSwaySine {
          0% { transform: translate3d(var(--sway-amp, 30px), 0, 0); }
          100% { transform: translate3d(calc(-1 * var(--sway-amp, 30px)), 0, 0); }
        }

        /* ── Sun & Rays Animations ── */
        @keyframes tglSunRadiantBloom {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.12); }
        }
        @keyframes tglSunRaysSoftSweep {
          0%, 100% { opacity: 0.35; transform: rotate(0deg) scale(1); }
          50% { opacity: 0.65; transform: rotate(2deg) scale(1.06); }
        }

        /* ── Overcast Atmosphere Gentle Breathing ── */
        @keyframes tglOvercastMassBreathe {
          0%, 100% {
            opacity: 0.85;
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            opacity: 1;
            transform: scale(1.04) translate3d(0, 8px, 0);
          }
        }
        @keyframes tglFairGlowBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }

        /* ── Night Star Twinkle ── */
        @keyframes tglStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.4); }
        }

        /* ── Storm Background Atmosphere Flash (대기 배경 섬광 — Canvas 번개와 동기화) ── */
        @keyframes tglStormFlash {
          0%, 90%, 100% { opacity: 0; }
          91% { opacity: 0.38; }
          92% { opacity: 0.06; }
          94% { opacity: 0.48; }
          95% { opacity: 0; }
        }
      `}</style>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. RAIN / STORM EFFECT                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'rain' || effectType === 'storm') && (
        <div className="absolute inset-0">
          {/* 뇌우/비 공통 — 상단 어두운 하늘 대기 그라데이션 */}
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
                style={{ left: sp.left, bottom: sp.bottom }}
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
            style={{ animation: 'tglWetGroundShimmer 4s ease-in-out infinite', willChange: 'opacity' }}
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

          {/* ── 뇌우 전용: Canvas 기반 프로시저럴 번개 ── */}
          {effectType === 'storm' && (
            <>
              {/* 대기 배경 섬광 (CSS 주기적 오버레이 — Canvas 번개와 독립적으로 분위기 조성) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isDarkMode
                    ? 'rgba(180, 210, 255, 0.16)'
                    : 'rgba(255, 255, 225, 0.20)',
                  animation: 'tglStormFlash 8.5s infinite',
                  willChange: 'opacity',
                }}
              />
              {/* Canvas: 재귀 분기 번개 — rAF 루프, 전류 떨림, 3단 글로우 */}
              <StormLightningCanvas isDarkMode={isDarkMode} />
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SNOW EFFECT (크기 확대 + 하늘색 오라 글로우 + 연속 등속 낙하) */}
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

          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute top-0 pointer-events-none"
              style={{
                left: flake.left,
                animation: `tglSnowLinearFall ${flake.fallDuration} linear infinite`,
                animationDelay: flake.fallDelay,
                willChange: 'transform',
              }}
            >
              <span
                className="block rounded-full bg-white"
                style={{
                  width: flake.size,
                  height: flake.size,
                  opacity: flake.opacity,
                  boxShadow: isDarkMode
                    ? '0 0 6px rgba(255, 255, 255, 0.95), 0 0 12px rgba(186, 230, 254, 0.75)'
                    : '0 0 7px rgba(56, 189, 248, 0.85), 0 0 14px rgba(14, 165, 233, 0.45), 0 1px 3px rgba(15, 23, 42, 0.35)',
                  animation: `tglSnowSwaySine ${flake.swayDuration} ease-in-out infinite alternate`,
                  animationDelay: flake.swayDelay,
                  ['--sway-amp' as any]: flake.swayAmp,
                  willChange: 'transform',
                }}
              />
            </div>
          ))}

          {/* 하단 스노우 뱅크 */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none">
            <svg className="w-full h-10 sm:h-14 block" viewBox="0 0 1440 60" preserveAspectRatio="none">
              <path d="M0,35 Q 240,15 480,30 T 960,18 T 1440,32 L 1440,60 L 0,60 Z" className={isDarkMode ? 'fill-blue-100/10' : 'fill-white/70'} />
            </svg>
            <svg className="w-full h-8 sm:h-11 block -mt-5 sm:-mt-7" viewBox="0 0 1440 50" preserveAspectRatio="none">
              <path d="M0,25 Q 360,8 720,22 T 1200,12 T 1440,24 L 1440,50 L 0,50 Z" className={isDarkMode ? 'fill-white/15' : 'fill-white/85'} />
            </svg>
            <div className="absolute inset-x-0 bottom-8 sm:bottom-11 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-blue-200/30 to-transparent" />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CLEAR EFFECT (완전 맑음 — 경계선 없는 눈부신 빛의 자연스러운 확산) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'clear' && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            <div className="absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[70vh] bg-gradient-to-b from-[#1e295d]/90 via-[#131b3e]/55 to-transparent transition-opacity duration-1000" />
              <div className="absolute -top-16 -right-16 w-[480px] h-[480px] rounded-full blur-3xl bg-indigo-400/20" />
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
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute -top-24 -right-24 w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full blur-3xl bg-radial from-amber-100/90 via-amber-300/45 to-transparent"
                style={{ animation: 'tglSunRadiantBloom 7s ease-in-out infinite', willChange: 'transform, opacity' }}
              />
              <div className="absolute -top-10 -right-10 w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] rounded-full blur-[90px] bg-gradient-to-br from-amber-200/40 via-orange-200/20 to-transparent opacity-80" />
              <div
                className="absolute top-0 right-0 w-[95vw] h-[95vh] origin-top-right pointer-events-none opacity-70"
                style={{
                  background: 'conic-gradient(from 190deg at 100% 0%, transparent 0deg, rgba(251, 191, 36, 0.15) 16deg, transparent 32deg, rgba(245, 158, 11, 0.16) 46deg, transparent 62deg, rgba(251, 191, 36, 0.12) 76deg, transparent 92deg)',
                  animation: 'tglSunRaysSoftSweep 10s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100/25 via-transparent to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. FAIR EFFECT (조금 흐림 — 구름 모양 없이, 흐림보다 밝고 은은한 대기 톤) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'fair' && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            <div className="absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-[#0f172a]/75 via-[#181d3d]/30 to-transparent transition-opacity duration-1000" />
              {stars.slice(0, 16).map((star) => (
                <span
                  key={`fair-star-${star.id}`}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    opacity: 0.45,
                    animation: `tglStarTwinkle ${star.duration} ease-in-out infinite`,
                    animationDelay: star.delay,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-x-0 top-0 h-[45vh] bg-gradient-to-b from-slate-300/25 via-sky-100/15 to-transparent transition-opacity duration-1000"
                style={{ animation: 'tglFairGlowBreathe 8s ease-in-out infinite', willChange: 'opacity, transform' }}
              />
              <div className="absolute -top-16 left-1/4 w-[60vw] h-[35vh] rounded-full blur-[80px] bg-slate-200/40 dark:bg-zinc-700/20" />
              <div className="absolute top-0 right-0 w-[45vw] h-[38vh] rounded-full blur-3xl bg-amber-200/20" />
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CLOUDS / FOG EFFECT (흐림 — 어둡게 흐린 덩어리감의 그라데이션) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'clouds' || effectType === 'fog') && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute inset-x-0 top-0 h-[65vh] transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-zinc-900/85 via-zinc-950/45 to-transparent'
                : 'bg-gradient-to-b from-slate-500/40 via-slate-400/20 to-transparent'
            }`}
          />
          <div
            className="absolute -top-20 -left-10 w-[75vw] h-[45vh] rounded-full blur-[90px]"
            style={{
              backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.65)' : 'rgba(100, 116, 139, 0.35)',
              animation: 'tglOvercastMassBreathe 12s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          />
          <div
            className="absolute -top-28 right-0 w-[65vw] h-[42vh] rounded-full blur-[85px]"
            style={{
              backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.75)' : 'rgba(71, 85, 105, 0.3)',
              animation: 'tglOvercastMassBreathe 10s ease-in-out infinite reverse',
              willChange: 'transform, opacity',
            }}
          />
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode ? 'bg-zinc-950/30' : 'bg-slate-300/25'
            }`}
          />
        </div>
      )}
    </div>
  );
};
