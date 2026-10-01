import React, { useCallback, useState } from 'react';
import { BookOpen, CalendarRange, Plane } from 'lucide-react';
import { useCanvasScene } from '../scenes/useCanvasScene';
import { createFirstTripScene, FIRST_TRIP_DESTINATIONS, type Destination } from '../scenes/firstTripScene';
import { openDepartureBoard } from '../../app/quickActions';
import { openIntro, prefetchIntro } from '../../intro/openIntro';

export interface FirstTripPick { city?: string }

const STEPS = [
  { icon: CalendarRange, label: '계획', copy: '도시와 날짜를 고르면 일정 초안이 생겨요' },
  { icon: Plane, label: '여행', copy: '여행 중엔 오늘 일정과 다음 이동만' },
  { icon: BookOpen, label: '매거진', copy: '다녀온 뒤 사진이 모여 한 권이 돼요' },
] as const;

// Home hero before the first journey (v1.3.6): a light stage where a route leaves Seoul for one
// city or beach after another and the traveler walks on below. The city on the map lights up in
// the picks, and a pick opens New trip with that city filled in. The first journey's cover replaces it.
export function FirstTripHero({ onNewTrip }: { onNewTrip?: (pick?: FirstTripPick) => void }) {
  const [current, setCurrent] = useState<string>(FIRST_TRIP_DESTINATIONS[0].name);
  const make = useCallback(() => createFirstTripScene((d: Destination) => setCurrent(d.name)), []);
  const canvasRef = useCanvasScene(make, 4.2);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-card bg-surface dark:bg-surface-dark grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="relative h-[220px] sm:h-[300px] md:h-auto md:min-h-[440px] md:order-2 bg-paper/70 dark:bg-paper-dark/50">
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full" />
        </div>
        <div className="md:order-1 flex flex-col justify-center gap-5 p-6 sm:p-10 md:p-12 min-w-0">
          <span className="font-mono text-micro sm:text-meta font-bold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">First journey · From Seoul</span>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] break-keep text-ink dark:text-ink-dark">첫 여행을 계획해 보세요</h1>
            <p className="text-[14px] sm:text-base text-black/60 dark:text-white/60 leading-relaxed break-keep max-w-md">도시와 날짜만 고르면 일정이 채워지고, 다녀온 뒤에는 사진과 함께 매거진이 됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="추천 도시">
            {FIRST_TRIP_DESTINATIONS.map(d => {
              const on = d.name === current;
              return (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => onNewTrip?.({ city: d.name })}
                  className={`h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full border text-[13px] whitespace-nowrap transition-colors duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                    on
                      ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-bold bg-amber-500/[0.06]'
                      : 'border-black/15 dark:border-white/15 text-ink dark:text-ink-dark font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="font-mono text-micro tracking-wider opacity-60">{d.code}</span>
                  {d.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onNewTrip && (
              <button type="button" onClick={() => onNewTrip()} className="btn btn-accent btn-lg">New trip</button>
            )}
            <button type="button" onClick={openDepartureBoard} className="btn btn-secondary btn-lg">공항 터미널</button>
            <button
              type="button"
              onClick={openIntro}
              onPointerEnter={prefetchIntro}
              onFocus={prefetchIntro}
              className="ml-1 text-[13px] font-semibold text-black/50 dark:text-white/50 hover:text-ink dark:hover:text-ink-dark underline-offset-4 hover:underline"
            >
              인트로 보기
            </button>
          </div>
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {STEPS.map((st, i) => {
          const Icon = st.icon;
          return (
            <li key={st.label} className="rounded-card bg-surface dark:bg-surface-dark px-3 py-3 sm:px-5 sm:py-4 flex flex-col gap-1 min-w-0">
              <span className="flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${i === 0 ? 'text-red-600 dark:text-red-500' : ''}`} aria-hidden />
                0{i + 1}
                {i === 0 && <span className="ml-auto rounded-full bg-red-600 dark:bg-red-500 text-white px-2 py-0.5 text-[10px] tracking-wider normal-case">지금</span>}
              </span>
              <span className="text-[15px] sm:text-lg font-extrabold tracking-tight text-ink dark:text-ink-dark">{st.label}</span>
              <span className="hidden sm:block text-meta text-black/55 dark:text-white/55 break-keep">{st.copy}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
