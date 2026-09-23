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

  // 5. 밤하늘 별 (32개 - 나이트모드 맑음 시 반짝임)
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

  // 6. 맑은 날 햇살 빛가루 (Sun Shimmer Motes)
  const sunMotes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: `mote-${i}`,
      right: `${6 + (i * 4.2 + (i % 3) * 5.5)}%`,
      top: `${5 + (i * 3.6 + (i % 4) * 4.8)}%`,
      size: `${1.6 + ((i % 3) * 0.7)}px`,
      duration: `${4.5 + ((i % 3) * 1.5)}s`,
      delay: `${(i * 0.6) % 3.5}s`,
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

        /* ── Snow Animations ── */
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
        @keyframes tglSunMoteFloat {
          0%, 100% { opacity: 0.2; transform: translate3d(0, 0, 0) scale(0.8); }
          50% { opacity: 0.75; transform: translate3d(12px, -16px, 0) scale(1.2); }
        }

        /* ── Birds Flying Across (Clear Sky Light Mode) ── */
        @keyframes tglBirdFlockFly {
          0% {
            transform: translate3d(-8vw, 38vh, 0) scale(0.7);
            opacity: 0;
          }
          4% {
            opacity: 0.55;
          }
          88% {
            opacity: 0.55;
          }
          100% {
            transform: translate3d(112vw, -12vh, 0) scale(0.9);
            opacity: 0;
          }
        }
        @keyframes tglBirdWingFlap {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(-0.65);
          }
        }

        /* ── Shooting Stars (Night Sky Clear) ── */
        @keyframes tglShootingStar1 {
          0%, 82%, 100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-35deg) scaleX(0.1);
          }
          84% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(-35deg) scaleX(1);
          }
          88% {
            opacity: 0;
            transform: translate3d(-260px, 180px, 0) rotate(-35deg) scaleX(1.4);
          }
        }
        @keyframes tglShootingStar2 {
          0%, 86%, 100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-32deg) scaleX(0.1);
          }
          88% {
            opacity: 0.95;
            transform: translate3d(0, 0, 0) rotate(-32deg) scaleX(1);
          }
          92% {
            opacity: 0;
            transform: translate3d(-310px, 195px, 0) rotate(-32deg) scaleX(1.5);
          }
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

        /* ── Storm Background Atmosphere Flash ── */
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
              {/* 대기 배경 섬광 */}
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
              <StormLightningCanvas isDarkMode={isDarkMode} />
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SNOW EFFECT                                                 */}
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
      {/* 3. CLEAR EFFECT (완전 맑음)                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'clear' && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            /* 맑은 밤하늘: 깊은 인디고 네이비 + 별 32개 + 미니멀 초승달 + 간헐적 별똥별 */
            <div className="absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[70vh] bg-gradient-to-b from-[#1b2554]/90 via-[#111738]/55 to-transparent transition-opacity duration-1000" />
              <div className="absolute -top-16 -right-16 w-[480px] h-[480px] rounded-full blur-3xl bg-indigo-400/20" />

              {/* 스위스 미니멀 초승달 (Crescent Moon) */}
              <div className="absolute top-6 right-10 sm:top-10 sm:right-16 pointer-events-none flex items-center justify-center">
                <div className="absolute w-16 h-16 rounded-full bg-amber-100/20 blur-xl pointer-events-none" />
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-amber-100/90 drop-shadow-[0_0_8px_rgba(254,240,138,0.45)]"
                  viewBox="0 0 32 32"
                  fill="currentColor"
                >
                  <path d="M21 4 C13 7 11 21 21 28 C9 26 5 13 21 4 Z" />
                </svg>
              </div>

              {/* 간헐적 별똥별 (Shooting Stars) */}
              <div
                className="absolute top-10 right-28 sm:top-14 sm:right-48 pointer-events-none"
                style={{ animation: 'tglShootingStar1 16s ease-out infinite' }}
              >
                <div className="w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-200 to-white rounded-full shadow-[0_0_6px_#fff]" />
              </div>
              <div
                className="absolute top-24 right-52 sm:top-32 sm:right-96 pointer-events-none"
                style={{ animation: 'tglShootingStar2 22s ease-out infinite', animationDelay: '9s' }}
              >
                <div className="w-24 sm:w-32 h-[1.2px] bg-gradient-to-r from-transparent via-cyan-200 to-white rounded-full shadow-[0_0_6px_#fff]" />
              </div>

              {/* 밤하늘 별무리 */}
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
            /* 맑은 낮: 찬란한 햇살 + 날아가는 새 편대 + 햇살 빛가루 */
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

              {/* 햇살 속 미세 빛가루 (Sun Shimmer Motes) */}
              {sunMotes.map((mote) => (
                <span
                  key={mote.id}
                  className="absolute rounded-full bg-amber-300 shadow-[0_0_5px_rgba(251,191,36,0.6)]"
                  style={{
                    right: mote.right,
                    top: mote.top,
                    width: mote.size,
                    height: mote.size,
                    animation: `tglSunMoteFloat ${mote.duration} ease-in-out infinite`,
                    animationDelay: mote.delay,
                    willChange: 'transform, opacity',
                  }}
                />
              ))}

              {/* 하늘을 유유히 가로지르는 새 편대 (26초 주기 비행) */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ animation: 'tglBirdFlockFly 26s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
              >
                <div className="relative">
                  {/* 새 1 (선두) */}
                  <svg
                    className="absolute w-5 h-3 text-black/35"
                    style={{ animation: 'tglBirdWingFlap 0.65s ease-in-out infinite alternate', transformOrigin: 'center' }}
                    viewBox="0 0 24 14"
                    fill="currentColor"
                  >
                    <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q18,4 12,9 Q6,4 0,7 Z" />
                  </svg>
                  {/* 새 2 (좌후방) */}
                  <svg
                    className="absolute -left-6 top-3 w-4 h-2.5 text-black/30"
                    style={{ animation: 'tglBirdWingFlap 0.6s ease-in-out infinite alternate', animationDelay: '0.12s', transformOrigin: 'center' }}
                    viewBox="0 0 24 14"
                    fill="currentColor"
                  >
                    <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q18,4 12,9 Q6,4 0,7 Z" />
                  </svg>
                  {/* 새 3 (우후방) */}
                  <svg
                    className="absolute left-6 top-5 w-3.5 h-2 text-black/25"
                    style={{ animation: 'tglBirdWingFlap 0.7s ease-in-out infinite alternate', animationDelay: '0.22s', transformOrigin: 'center' }}
                    viewBox="0 0 24 14"
                    fill="currentColor"
                  >
                    <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q18,4 12,9 Q6,4 0,7 Z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. FAIR EFFECT (약간 흐림 — 맑음과 흐림 사이 밸런스)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {effectType === 'fair' && (
        <div className="absolute inset-0">
          {isDarkMode ? (
            /* 약간 흐린 밤: 맑은날과 흐린날 사이의 미드나이트 슬레이트 블루 + 별 소수만(8개) 노출 */
            <div className="absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-[#131a34]/85 via-[#0e1428]/45 to-transparent transition-opacity duration-1000" />
              <div className="absolute -top-12 left-1/4 w-[65vw] h-[35vh] rounded-full blur-[80px] bg-slate-800/30" />
              {stars.slice(0, 8).map((star) => (
                <span
                  key={`fair-star-${star.id}`}
                  className="absolute rounded-full bg-white/70"
                  style={{
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    opacity: 0.35,
                    animation: `tglStarTwinkle ${star.duration} ease-in-out infinite`,
                    animationDelay: star.delay,
                  }}
                />
              ))}
            </div>
          ) : (
            /* 약간 흐린 낮 */
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
      {/* 5. CLOUDS / FOG EFFECT (흐림 — 저채도 짙은 구름기, 별 0개)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(effectType === 'clouds' || effectType === 'fog') && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute inset-x-0 top-0 h-[65vh] transition-opacity duration-1000 ${
              isDarkMode
                ? 'bg-gradient-to-b from-[#0b0c0f]/95 via-[#121316]/65 to-transparent'
                : 'bg-gradient-to-b from-slate-500/40 via-slate-400/20 to-transparent'
            }`}
          />
          {/* 어둡고 묵직한 구름 덩어리 레이어 */}
          <div
            className="absolute -top-20 -left-10 w-[75vw] h-[45vh] rounded-full blur-[90px]"
            style={{
              backgroundColor: isDarkMode ? 'rgba(18, 19, 23, 0.85)' : 'rgba(100, 116, 139, 0.35)',
              animation: 'tglOvercastMassBreathe 12s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          />
          <div
            className="absolute -top-28 right-0 w-[65vw] h-[42vh] rounded-full blur-[85px]"
            style={{
              backgroundColor: isDarkMode ? 'rgba(12, 13, 16, 0.90)' : 'rgba(71, 85, 105, 0.3)',
              animation: 'tglOvercastMassBreathe 10s ease-in-out infinite reverse',
              willChange: 'transform, opacity',
            }}
          />
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isDarkMode ? 'bg-[#090a0c]/45' : 'bg-slate-300/25'
            }`}
          />
        </div>
      )}
    </div>
  );
};
