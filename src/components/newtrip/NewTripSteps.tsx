import React, { useMemo, useState } from 'react';
import { Bookmark, Map as MapIcon, Plane, Plus, Search, Shuffle, Ticket, X } from 'lucide-react';
import { Segment } from '../ui/Segment';
import { Chip } from '../ui/Chip';
import { Card, CardRow } from '../ui/Card';
import { flightHours, formatHours } from '../departure/departureData';
import { DestinationCity } from '../../data/worldDestinations';
import { NewTripDraft, StayLength, THEMES, upcomingMonths } from './useNewTripDraft';

// The four screens of the new trip sheet. Each takes the draft from useNewTripDraft.

const label = 'font-mono text-micro font-bold uppercase tracking-wider';
const muted = 'text-black/60 dark:text-white/60';

function Heading({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow && <span className={`${label} ${muted}`}>{eyebrow}</span>}
      <h2 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-tight">{children}</h2>
    </div>
  );
}

// 1 · Where
export function StepWhere({ d, recentCities, onSurprise }: { d: NewTripDraft; recentCities: string[]; onSurprise: () => void }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return d.cities
      .filter(c => [c.nameKo, c.nameEn, c.countryKo, c.countryEn].some(n => n.toLowerCase().includes(t)))
      .slice(0, 8);
  }, [q, d.cities]);

  // Quick picks: cities already in Pocket, then cities of past trips
  const quick = useMemo(() => {
    const names = new Set<string>();
    const pocketCities = new Set<string>();
    for (const c of d.cities) {
      if (pocketCities.size >= 6) break;
      if (d.pocketCityNames.has(c.nameKo.toLowerCase()) || d.pocketCityNames.has(c.nameEn.toLowerCase())) pocketCities.add(c.nameEn);
    }
    const out: { city: DestinationCity; from: 'pocket' | 'recent' }[] = [];
    for (const c of d.cities) {
      if (pocketCities.has(c.nameEn) && !names.has(c.nameEn)) { out.push({ city: c, from: 'pocket' }); names.add(c.nameEn); }
    }
    for (const r of recentCities) {
      const c = d.cities.find(x => [x.nameKo, x.nameEn].some(n => n.toLowerCase() === r.toLowerCase()));
      if (c && !names.has(c.nameEn) && out.length < 10) { out.push({ city: c, from: 'recent' }); names.add(c.nameEn); }
    }
    return out;
  }, [d.cities, d.pocketCityNames, recentCities]);

  const pick = (c: DestinationCity) => { d.selectPlace(c, null); setQ(''); };

  return (
    <div className="flex flex-col gap-5">
      <Heading eyebrow="Where">어디로 떠나요?</Heading>

      <label className="relative block">
        <span className="sr-only">도시 검색</span>
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} aria-hidden />
        <input
          type="text"
          inputMode="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="도시나 나라 이름"
          autoComplete="off"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[15px] placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        />
      </label>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="검색 결과">
          {results.map(c => (
            <li key={`${c.countryEn}-${c.nameEn}`}>
              <CardRow thumb={c.coverImage} title={c.nameKo} meta={`${c.countryKo} · ${formatHours(flightHours(c))}`} onClick={() => pick(c)} />
            </li>
          ))}
        </ul>
      )}

      {(d.city || d.country) && results.length === 0 && (
        <Card padding="sm" className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-thumb overflow-hidden bg-black/[0.06] dark:bg-white/10 shrink-0">
            {d.city?.coverImage && <img src={d.city.coverImage} alt="" className="w-full h-full object-cover" />}
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[17px] font-extrabold truncate">{d.city ? d.city.nameKo : d.country?.nameKo}</span>
            <span className={`${label} ${muted}`}>{d.city ? d.city.countryKo : '나라 전체에서 추천'}</span>
          </span>
          <button type="button" onClick={() => d.selectPlace(null, null)} aria-label="선택 해제" className="tap-target w-9 h-9 rounded-full grid place-items-center hover:bg-black/5 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </Card>
      )}

      {quick.length > 0 && results.length === 0 && (
        <div className="flex flex-col gap-2">
          <span className={`${label} ${muted}`}>Quick picks</span>
          <div className="flex flex-wrap gap-1.5">
            {quick.map(({ city, from }) => (
              <Chip key={city.nameEn} icon={from === 'pocket' ? Bookmark : Plane} selected={d.city?.nameEn === city.nameEn} onClick={() => pick(city)}>
                {city.nameKo}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSurprise}
        className="mt-1 w-full flex items-center gap-3 p-4 rounded-card bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark text-left hover:bg-ink/90 dark:hover:bg-ink-dark/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
      >
        <span className="w-10 h-10 rounded-full bg-red-600 text-white grid place-items-center shrink-0"><Ticket className="w-4 h-4" /></span>
        <span className="flex-1 flex flex-col">
          <span className="text-[15px] font-bold">Surprise</span>
          <span className="text-meta opacity-70">공항 터미널에서 목적지 뽑기</span>
        </span>
      </button>
    </div>
  );
}

// 2 · When
export function StepWhen({ d }: { d: NewTripDraft }) {
  const months = useMemo(() => upcomingMonths(), []);
  const best = d.city?.bestMonths ?? [];
  return (
    <div className="flex flex-col gap-5">
      <Heading eyebrow={d.city ? `${d.city.nameEn} · ${d.city.countryEn}` : d.country?.nameEn}>언제 떠나요?</Heading>

      {d.city && (
        <Card padding="md" className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[22px] font-extrabold tracking-tight shrink-0">서울</span>
            <span className="flex-1 border-t-[1.5px] border-dashed border-black/25 dark:border-white/25" aria-hidden />
            <Plane className="w-4 h-4 rotate-45 shrink-0" aria-hidden />
            <span className="flex-1 border-t-[1.5px] border-dashed border-black/25 dark:border-white/25" aria-hidden />
            <span className="text-[22px] font-extrabold tracking-tight truncate max-w-[45%]">{d.city.nameKo}</span>
          </div>
          <div className={`flex justify-between gap-2 ${label} ${muted}`}>
            <span>ICN</span><span>{formatHours(flightHours(d.city))}</span><span className="truncate">{d.city.countryEn}</span>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <span className={label}>Stay</span>
        <Segment<StayLength>
          block
          ariaLabel="머무는 기간"
          value={d.stay}
          onChange={d.setStay}
          options={[{ value: 'short', label: '2–3박' }, { value: 'mid', label: '4–5박' }, { value: 'long', label: '6박+' }]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <span className={label}>Month</span>
          {best.length > 0 && <span className={`${label} text-emerald-700 dark:text-emerald-400`}>Best season</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {months.map(({ year, month }, i) => {
            const on = d.month === month && d.year === year;
            const newYear = i > 0 && month === 1;
            return (
              <Chip
                key={`${year}-${month}`}
                selected={on}
                tone={best.includes(month) ? 'season' : 'default'}
                onClick={() => d.pickMonth(year, month)}
              >
                {newYear ? `${year} · ${month}월` : `${month}월`}
              </Chip>
            );
          })}
        </div>
      </div>

      <Card padding="md" className="flex items-center justify-between gap-3">
        <label className="flex flex-col gap-0.5 min-w-0">
          <span className={`${label} ${muted}`}>Depart</span>
          <input
            type="date"
            value={d.startDate}
            onChange={e => d.setStartDate(e.target.value)}
            className="bg-transparent text-[16px] font-bold min-w-[9rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
          />
        </label>
        <span className={`${label} px-2.5 py-1 rounded-full bg-black/[0.06] dark:bg-white/10 shrink-0`}>
          {d.startDate ? `${d.nights}N ${d.nights + 1}D` : '추천 날짜'}
        </span>
      </Card>
      {!d.startDate && <p className={`text-meta ${muted} -mt-3`}>월을 고르지 않으면 가장 가까운 좋은 시기로 잡아 드립니다.</p>}
    </div>
  );
}

// 3 · Who & style
export function StepWho({ d }: { d: NewTripDraft }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim();
    if (!n || d.members.includes(n)) return;
    d.setMembers([...d.members, n]);
    setName('');
  };
  return (
    <div className="flex flex-col gap-5">
      <Heading eyebrow="Who & style">누구와, 어떻게?</Heading>

      <div className="flex flex-col gap-2">
        <span className={label}>Members</span>
        <div className="flex flex-wrap gap-1.5">
          {d.members.map((m, i) => (
            <span key={m} className="h-9 pl-3.5 pr-1.5 inline-flex items-center gap-1 rounded-full bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark text-[13px] font-bold">
              {m}
              {i > 0 && (
                <button type="button" onClick={() => d.setMembers(d.members.filter(x => x !== m))} aria-label={`${m} 빼기`} className="w-6 h-6 rounded-full grid place-items-center hover:bg-white/15">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); add(); }} className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">동행 이름</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="동행 이름"
              className="w-full h-11 px-4 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[15px] placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={!name.trim()}><Plus className="w-4 h-4" />추가</button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Style</span>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map(t => (
            <Chip key={t.id} selected={d.theme === t.id} onClick={() => d.setTheme(t.id)}>{t.label}</Chip>
          ))}
        </div>
      </div>

      {d.placePockets.length > 0 && (
        <Card padding="md" className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-black/[0.06] dark:bg-white/10 grid place-items-center shrink-0"><Bookmark className="w-4 h-4" /></span>
          <span className="flex-1 flex flex-col min-w-0">
            <span className="text-[15px] font-bold">포켓 장소 넣기</span>
            <span className={`text-meta ${muted}`}>{d.pocketCount}곳을 1일차에 넣습니다</span>
          </span>
          <Segment
            size="sm"
            ariaLabel="포켓 장소 넣기"
            value={d.includePockets ? 'on' : 'off'}
            onChange={v => d.setIncludePockets(v === 'on')}
            options={[{ value: 'on', label: '넣기' }, { value: 'off', label: '빼기' }]}
          />
        </Card>
      )}
    </div>
  );
}

// 4 · Preview
export function StepPreview({ d, onOpenMapBuilder }: { d: NewTripDraft; onOpenMapBuilder: () => void }) {
  const p = d.selected;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <Heading eyebrow="Preview">이렇게 다녀올까요?</Heading>
        <button type="button" onClick={d.shuffle} className="btn btn-secondary btn-sm shrink-0"><Shuffle className="w-3.5 h-3.5" />다시 섞기</button>
      </div>

      {d.proposals.length === 0 ? (
        <Card padding="md" className={`text-sm ${muted}`}>이 조건에 맞는 추천을 찾지 못했습니다. 기간이나 스타일을 바꿔 보세요.</Card>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5" aria-label="추천 일정">
            {d.proposals.map(x => (
              <li key={x.id}>
                <CardRow
                  thumb={x.coverImg}
                  title={x.title}
                  meta={`${x.nightsDays} · ${x.themeLabel} · ${x.startDate.slice(5).replace('-', '.')}`}
                  current={p?.id === x.id}
                  onClick={() => d.setProposalId(x.id)}
                />
              </li>
            ))}
          </ul>

          {p && (
            <div className="flex flex-col gap-2">
              <span className={label}>{p.cityName} · {p.startDate.replace(/-/g, '.')} – {p.endDate.slice(5).replace('-', '.')}</span>
              <ol className="flex flex-col gap-1.5">
                {p.timeline.map((day, i) => (
                  <li key={day.date}>
                    <Card padding="sm" className="flex gap-3 items-start">
                      <span className="w-12 h-12 rounded-thumb bg-black/[0.06] dark:bg-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className={`${label} ${muted} leading-none`}>Day</span>
                        <span className="text-[17px] font-extrabold leading-tight">{i + 1}</span>
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col py-0.5">
                        <span className={`${label} ${muted}`}>{day.date.slice(5).replace('-', '.')}</span>
                        <span className="text-[14px] font-bold leading-snug line-clamp-2">
                          {day.items.filter(it => it.type !== 'transit').slice(0, 3).map(it => it.title).join(' · ') || '자유 일정'}
                        </span>
                      </span>
                    </Card>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onOpenMapBuilder} className={`self-start inline-flex items-center gap-1.5 text-[13px] font-bold ${muted} hover:text-black dark:hover:text-white underline-offset-4 hover:underline`}>
        <MapIcon className="w-3.5 h-3.5" />지도에서 자세히 만들기
      </button>
    </div>
  );
}
