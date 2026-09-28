import React, { useEffect, useMemo, useState } from 'react';
import { StormLightningCanvas } from './StormLightningCanvas';
import { WeatherParticleCanvas, precipitationIntensity } from './weather/WeatherParticleCanvas';

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

  const intensity = useMemo(
    () => precipitationIntensity(weatherCode, precipitationProb),
    [weatherCode, precipitationProb]
  );

  // Cross-fade between weather atmospheres: the previous one fades out while the new one fades in
  const [layers, setLayers] = useState<{ type: WeatherEffectType; leaving: boolean }[]>(() => [{ type: effectType, leaving: false }]);
  useEffect(() => {
    setLayers(prev => {
      if (prev.length && prev[prev.length - 1].type === effectType && !prev[prev.length - 1].leaving) return prev;
      return [...prev.filter(l => l.type !== effectType).map(l => ({ ...l, leaving: true })), { type: effectType, leaving: false }];
    });
    const timer = setTimeout(() => setLayers(prev => prev.filter(l => !l.leaving)), 1300);
    return () => clearTimeout(timer);
  }, [effectType]);

  const renderAtmosphere = (t: WeatherEffectType) => (
    <>
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. RAIN / STORM EFFECT                                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(t === 'rain' || t === 'storm') && (
          <div className="absolute inset-0">
            {/* 뇌우/비 공통 — 상단 어두운 하늘 대기 그라데이션 */}
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-blue-950/35 via-zinc-950/20 to-transparent'
                  : 'bg-gradient-to-b from-blue-100/40 via-slate-100/25 to-transparent'
              }`}
            />
  
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
            {t === 'storm' && (
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
        {t === 'snow' && (
          <div className="absolute inset-0">
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-sky-950/30 via-zinc-950/15 to-transparent'
                  : 'bg-gradient-to-b from-sky-100/40 via-slate-100/25 to-transparent'
              }`}
            />
  
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
        {t === 'clear' && (
          <div className="absolute inset-0">
            {isDarkMode ? (
              /* 맑은 밤하늘: 깊은 인디고 네이비 + 별 32개 + 미니멀 초승달 + 간헐적 별똥별 */
              <div className="absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[70vh] bg-gradient-to-b from-[#1b2554]/90 via-[#111738]/55 to-transparent transition-opacity duration-1000" />
                <div className="absolute -top-16 -right-16 w-[480px] h-[480px] rounded-full blur-3xl bg-indigo-400/20" />
  
                {/* 스위스 미니멀 초승달 (Crescent Moon: 헤더 아래 여유 배치) */}
                <div className="absolute top-20 right-8 sm:top-24 sm:right-16 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-16 h-16 rounded-full bg-amber-100/20 blur-xl pointer-events-none" />
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8 text-amber-100/90 drop-shadow-[0_0_8px_rgba(254,240,138,0.45)]"
                    viewBox="0 0 32 32"
                    fill="currentColor"
                  >
                    <path d="M21 4 C13 7 11 21 21 28 C9 26 5 13 21 4 Z" />
                  </svg>
                </div>
  
                {/* 간헐적 별똥별 (Shooting Stars: 초기 정지 잔상 방지용 opacity-0 및 animation-fill-mode both) */}
                <div
                  className="absolute top-24 right-28 sm:top-28 sm:right-48 pointer-events-none opacity-0"
                  style={{
                    opacity: 0,
                    animation: 'tglShootingStar1 16s ease-out infinite',
                    animationFillMode: 'both',
                  }}
                >
                  <div className="w-28 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-200 to-white rounded-full shadow-[0_0_6px_#fff]" />
                </div>
                <div
                  className="absolute top-36 right-48 sm:top-44 sm:right-80 pointer-events-none opacity-0"
                  style={{
                    opacity: 0,
                    animation: 'tglShootingStar2 22s ease-out infinite',
                    animationDelay: '9s',
                    animationFillMode: 'both',
                  }}
                >
                  <div className="w-24 sm:w-32 h-[1.2px] bg-gradient-to-r from-transparent via-cyan-200 to-white rounded-full shadow-[0_0_6px_#fff]" />
                </div>
  
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
  
                {/* 하늘을 유유히 가로지르는 새 편대 (26초 주기 비행) */}
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  style={{ animation: 'tglBirdFlockFly 26s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                >
                  <div className="relative">
                    {/* 새 1 (선두) */}
                    <svg
                      className="absolute w-5 h-3 text-black/60"
                      style={{ animation: 'tglBirdWingFlap 0.65s ease-in-out infinite alternate', transformOrigin: 'center' }}
                      viewBox="0 0 24 14"
                      fill="currentColor"
                    >
                      <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q18,4 12,9 Q6,4 0,7 Z" />
                    </svg>
                    {/* 새 2 (좌후방) */}
                    <svg
                      className="absolute -left-6 top-3 w-4 h-2.5 text-black/60"
                      style={{ animation: 'tglBirdWingFlap 0.6s ease-in-out infinite alternate', animationDelay: '0.12s', transformOrigin: 'center' }}
                      viewBox="0 0 24 14"
                      fill="currentColor"
                    >
                      <path d="M0,7 Q6,0 12,5 Q18,0 24,7 Q18,4 12,9 Q6,4 0,7 Z" />
                    </svg>
                    {/* 새 3 (우후방) */}
                    <svg
                      className="absolute left-6 top-5 w-3.5 h-2 text-black/60"
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
        {t === 'fair' && (
          <div className="absolute inset-0">
            {isDarkMode ? (
              /* 약간 흐린 밤: 미드나이트 슬레이트 블루 (별은 파티클 캔버스가 약하게 표시) */
              <div className="absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-[#131a34]/85 via-[#0e1428]/45 to-transparent transition-opacity duration-1000" />
                <div className="absolute -top-12 left-1/4 w-[65vw] h-[35vh] rounded-full blur-[80px] bg-slate-800/30" />
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
        {/* 5. CLOUDS / FOG EFFECT (흐림 — 저채도 짙은 먹구름 그라데이션)   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(t === 'clouds' || t === 'fog') && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 상단 먹구름 낀 차콜-딥슬레이트 대기 그라데이션 */}
            <div
              className={`absolute inset-x-0 top-0 h-[65vh] transition-opacity duration-1000 ${
                isDarkMode
                  ? 'bg-gradient-to-b from-[#1c222e]/85 via-[#141822]/55 to-transparent'
                  : 'bg-gradient-to-b from-slate-500/40 via-slate-400/20 to-transparent'
              }`}
            />
            {/* 어둡고 묵직한 구름 덩어리 레이어 (완전 블랙 대신 실제 먹구름 차콜 톤 적용) */}
            <div
              className="absolute -top-20 -left-10 w-[75vw] h-[45vh] rounded-full blur-[90px]"
              style={{
                backgroundColor: isDarkMode ? 'rgba(32, 40, 54, 0.65)' : 'rgba(100, 116, 139, 0.35)',
                animation: 'tglOvercastMassBreathe 12s ease-in-out infinite',
                willChange: 'transform, opacity',
              }}
            />
            <div
              className="absolute -top-28 right-0 w-[65vw] h-[42vh] rounded-full blur-[85px]"
              style={{
                backgroundColor: isDarkMode ? 'rgba(24, 30, 42, 0.70)' : 'rgba(71, 85, 105, 0.3)',
                animation: 'tglOvercastMassBreathe 10s ease-in-out infinite reverse',
                willChange: 'transform, opacity',
              }}
            />
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isDarkMode ? 'bg-slate-950/20' : 'bg-slate-300/25'
              }`}
            />
          </div>
        )}
    </>
  );

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden transition-all duration-700 select-none z-0 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <style>{`
        /* ── Rain Animations ── */
        @keyframes tglWetGroundShimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.75; }
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
          0%, 82% {
            opacity: 0;
            transform: translate3d(50px, -35px, 0) rotate(-35deg) scaleX(0.1);
          }
          84% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(-35deg) scaleX(1);
          }
          87% {
            opacity: 0;
            transform: translate3d(-240px, 168px, 0) rotate(-35deg) scaleX(1.3);
          }
          100% {
            opacity: 0;
            transform: translate3d(-240px, 168px, 0) rotate(-35deg) scaleX(0.1);
          }
        }
        @keyframes tglShootingStar2 {
          0%, 86% {
            opacity: 0;
            transform: translate3d(50px, -32px, 0) rotate(-32deg) scaleX(0.1);
          }
          88% {
            opacity: 0.95;
            transform: translate3d(0, 0, 0) rotate(-32deg) scaleX(1);
          }
          91% {
            opacity: 0;
            transform: translate3d(-280px, 175px, 0) rotate(-32deg) scaleX(1.4);
          }
          100% {
            opacity: 0;
            transform: translate3d(-280px, 175px, 0) rotate(-32deg) scaleX(0.1);
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

        /* ── Atmosphere cross-fade ── */
        @keyframes tglWxFadeIn { from { opacity: 0; } }

        /* ── Night Star Twinkle ── */
        /* ── Storm Background Atmosphere Flash ── */
        @keyframes tglStormFlash {
          0%, 90%, 100% { opacity: 0; }
          91% { opacity: 0.38; }
          92% { opacity: 0.06; }
          94% { opacity: 0.48; }
          95% { opacity: 0; }
        }
      `}</style>

      {layers.map(layer => (
        <div
          key={layer.type}
          className="absolute inset-0"
          style={{
            opacity: layer.leaving ? 0 : 1,
            transition: 'opacity 1200ms cubic-bezier(.2, 0, 0, 1)',
            animation: layer.leaving ? undefined : 'tglWxFadeIn 1200ms cubic-bezier(.2, 0, 0, 1) both',
          }}
        >
          {renderAtmosphere(layer.type)}
        </div>
      ))}

      {/* Particles: one canvas for rain, snow, stars and sun motes */}
      <WeatherParticleCanvas type={effectType} intensity={intensity} isDarkMode={isDarkMode} />
    </div>
  );
};
