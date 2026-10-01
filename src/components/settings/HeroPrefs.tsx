import React from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { Trip } from '../../types';
import { Segment } from '../ui/Segment';
import { cardCoverUrl } from '../../utils/journeyThumbs';

// Home hero (settings → 화면): which journeys the home hero shows and how it moves. Saved per
// account like every other display setting; the operator uses the same control as any member.
// With no journey chosen, home picks published or finished journeys on its own.

export interface HeroSettings {
  ids: number[];
  autoSlide: boolean;
  duration: number;
  mediaType: 'image' | 'video';
}

export type HeroPatch = { heroJourneyIds?: number[]; heroAutoSlide?: boolean; heroSlideDuration?: number; heroMediaType?: 'image' | 'video' };

interface Props {
  cardClass: string;
  labelClass: string;
  journeys: Trip[];
  hero: HeroSettings;
  onChange: (patch: HeroPatch) => void;
}

const SECONDS = [4, 6, 8, 12];

export function HeroPrefs({ cardClass, labelClass, journeys, hero, onChange }: Props) {
  const chosen = hero.ids.map(id => journeys.find(j => j.id === id)).filter(Boolean) as Trip[];
  const rest = journeys.filter(j => !hero.ids.includes(j.id) && !j.deletedAt);
  const setIds = (ids: number[]) => onChange({ heroJourneyIds: ids });
  const move = (i: number, d: -1 | 1) => {
    const ids = [...hero.ids];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setIds(ids);
  };
  const rowLabel = 'text-[14px] font-bold';

  return (
    <section className={cardClass}>
      <span className={labelClass}>Home hero</span>

      <div className="flex flex-col gap-2">
        <span className={rowLabel}>히어로에 띄울 여정</span>
        {chosen.length === 0 ? (
          <span className="text-meta text-black/55 dark:text-white/55 break-keep">고른 여정이 없으면 발행했거나 다녀온 여정을 최신순으로 보여 줍니다.</span>
        ) : (
          <ul className="flex flex-col">
            {chosen.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 min-h-[52px]">
                <span className="font-mono text-meta font-bold tabular-nums w-5 text-black/45 dark:text-white/45">{i + 1}</span>
                <img src={cardCoverUrl(t)} alt="" className="w-11 h-11 rounded-thumb object-cover bg-black/5 dark:bg-white/10 shrink-0" />
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-[14px] font-bold truncate">{t.title}</span>
                  <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{t.heroVideoUrl || t.videoUrl ? '영상 있음 · ' : ''}{t.date}</span>
                </span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${t.title} 위로`} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"><ArrowUp className="w-4 h-4" aria-hidden /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} aria-label={`${t.title} 아래로`} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"><ArrowDown className="w-4 h-4" aria-hidden /></button>
                <button type="button" onClick={() => setIds(hero.ids.filter(id => id !== t.id))} aria-label={`${t.title} 빼기`} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 dark:hover:bg-white/10"><X className="w-4 h-4" aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        {rest.length > 0 && (
          <select
            id="hero-add"
            value=""
            onChange={(e) => { const id = Number(e.target.value); if (id) setIds([...hero.ids, id]); }}
            className="h-11 px-4 rounded-full border border-black/15 dark:border-white/15 bg-transparent text-[14px] cursor-pointer"
            aria-label="히어로에 여정 추가"
          >
            <option value="">+ 여정 추가</option>
            {rest.map(j => <option key={j.id} value={j.id}>{j.title} · {j.date}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={rowLabel}>자동으로 넘기기</span>
        <Segment<'on' | 'off'>
          size="sm"
          ariaLabel="자동으로 넘기기"
          value={hero.autoSlide ? 'on' : 'off'}
          onChange={(v) => onChange({ heroAutoSlide: v === 'on' })}
          options={[{ value: 'on', label: '켜기' }, { value: 'off', label: '끄기' }]}
        />
      </div>
      {hero.autoSlide && (
        <div className="flex items-center justify-between gap-3">
          <span className={rowLabel}>넘김 간격</span>
          <Segment<string>
            size="sm"
            ariaLabel="넘김 간격"
            value={String(SECONDS.includes(hero.duration) ? hero.duration : 6)}
            onChange={(v) => onChange({ heroSlideDuration: Number(v) })}
            options={SECONDS.map(s => ({ value: String(s), label: `${s}초` }))}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className={rowLabel}>영상이 있으면</span>
        <Segment<'video' | 'image'>
          size="sm"
          ariaLabel="영상이 있으면"
          value={hero.mediaType}
          onChange={(v) => onChange({ heroMediaType: v })}
          options={[{ value: 'video', label: '영상' }, { value: 'image', label: '사진' }]}
        />
      </div>
      <span className="text-meta text-black/55 dark:text-white/55 break-keep">여정마다 히어로 사진 · 영상은 카드 메뉴 → 홈 히어로 이미지 · 영상에서 넣습니다.</span>
    </section>
  );
}
