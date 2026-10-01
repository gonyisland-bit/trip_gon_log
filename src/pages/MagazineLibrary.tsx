import React, { useMemo, useState } from 'react';
import type { Trip } from '../types';
import { Segment } from '../components/ui/Segment';
import { cardCoverUrl } from '../utils/journeyThumbs';
import { getLiveTripStatus, getUpcomingPlanInfo } from '../utils/tripPlanHelper';
import { setDetailIntent } from '../utils/detailIntent';
import { Footer } from '../components/Footer';
import { EmptyScene } from '../components/scenes/EmptyScene';

// Magazine (v1.3.6 4-b): every published journey is an issue, gathered here on its own by year,
// country or season. Nothing is curated by hand: publishing a journey adds it, unpublishing removes it.

type GroupBy = 'year' | 'country' | 'season';
const SEASONS = ['겨울', '봄', '여름', '가을'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function startOf(trip: Trip): { y: number; m: number } {
  const match = (trip.date || '').match(/(\d{4})[.-](\d{1,2})/);
  return match ? { y: Number(match[1]), m: Number(match[2]) } : { y: 0, m: 0 };
}

function countryOf(trip: Trip): string {
  if (trip.country) return trip.country;
  const parts = (trip.locationStr || '').split(',').map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || '기타';
}

function seasonOf(m: number): string {
  return m ? SEASONS[Math.floor((m % 12) / 3)] : '기타';
}

interface Props {
  trips: Trip[];
  onNavigate: (view: string, tripId?: number | null) => void;
}

export function MagazineLibrary({ trips, onNavigate }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>('year');

  const { issues, waiting } = useMemo(() => {
    const past = trips.filter(t => !getUpcomingPlanInfo(t).isPlanOrFuture && !getLiveTripStatus(t.date).isLive);
    const byNewest = (a: Trip, b: Trip) => (startOf(b).y * 100 + startOf(b).m) - (startOf(a).y * 100 + startOf(a).m);
    return {
      issues: past.filter(t => t.publishedAt).sort(byNewest),
      waiting: past.filter(t => !t.publishedAt).sort(byNewest),
    };
  }, [trips]);

  const groups = useMemo(() => {
    const map = new Map<string, Trip[]>();
    issues.forEach(t => {
      const { y, m } = startOf(t);
      const key = groupBy === 'year' ? String(y || '기타') : groupBy === 'country' ? countryOf(t) : seasonOf(m);
      map.set(key, [...(map.get(key) || []), t]);
    });
    const entries = [...map.entries()];
    if (groupBy === 'season') entries.sort((a, b) => SEASONS.indexOf(a[0]) - SEASONS.indexOf(b[0]));
    else if (groupBy === 'country') entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    return entries;
  }, [issues, groupBy]);

  const open = (t: Trip, view: 'magazine' | 'record') => {
    setDetailIntent(view);
    onNavigate('detail', t.id);
  };

  return (
    <div className="w-full min-h-full flex flex-col">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 pt-4 sm:pt-6 pb-16 flex flex-col gap-8 sm:gap-10">
        {/* Masthead in the magazine's coral face colour (v1.3.7) */}
        <header className="tgl-rise rounded-card bg-coral text-coral-ink dark:bg-coral-dark dark:text-coral px-5 sm:px-8 py-6 sm:py-9 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-micro sm:text-meta font-bold uppercase tracking-[0.16em] opacity-75">
              Magazine · {issues.length} issues
            </span>
            <h1 className="text-[34px] sm:text-6xl font-extrabold tracking-[-0.04em] leading-[0.98]">다녀온 여행<br /><span className="opacity-60">다시 꺼내 보기</span></h1>
          </div>
          {issues.length > 0 && (
            <Segment<GroupBy>
              ariaLabel="묶는 기준"
              value={groupBy}
              onChange={setGroupBy}
              options={[{ value: 'year', label: '연도' }, { value: 'country', label: '나라' }, { value: 'season', label: '계절' }]}
            />
          )}
        </header>

        {issues.length === 0 && (
          <EmptyScene
            kind="magazine"
            title="아직 발행한 매거진이 없어요"
            copy="다녀온 여정의 일정과 사진을 정리해 여정 안에서 매거진으로 발행하면 여기에 모입니다."
            action={trips.length > 0 ? { label: '여정 보기', onClick: () => onNavigate('archive') } : undefined}
          />
        )}

        {groups.map(([label, list]) => (
          <section key={label} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3 border-b border-black/10 dark:border-white/10 pb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{label}</h2>
              <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">{list.length}</span>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {list.map(t => {
                const { y, m } = startOf(t);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => open(t, 'magazine')}
                      className="group relative w-full aspect-[3/4] rounded-card overflow-hidden bg-black text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <img src={cardCoverUrl(t)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <span className="absolute left-3 right-3 bottom-3 flex flex-col gap-1 text-white">
                        <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-white/75">{y} · {m ? MON[m - 1] : ''}</span>
                        <span className="text-[15px] sm:text-lg font-extrabold tracking-tight leading-snug line-clamp-2 break-keep">{t.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {waiting.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-extrabold">발행을 기다리는 여정</h2>
              <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">{waiting.length}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {waiting.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => open(t, 'record')}
                    className="w-full flex items-center gap-3 p-2.5 rounded-card bg-surface dark:bg-surface-dark text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                  >
                    <img src={cardCoverUrl(t)} alt="" loading="lazy" className="w-14 h-14 rounded-thumb object-cover shrink-0" />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="font-extrabold truncate">{t.title}</span>
                      <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{t.date}</span>
                    </span>
                    <span className="btn btn-secondary btn-sm shrink-0">정리하기</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
