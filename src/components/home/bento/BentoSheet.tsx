import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Plan, SpotPocketItem, Trip } from '../../../types';
import { SheetCloseButton, useSheetClose } from '../../Sheet';
import { UserProfileAvatar } from '../../UserProfileAvatar';
import { cleanCityDisplayName, fetchCityWeather, getWeatherMeta, type CityWeatherData } from '../../../utils/weatherApi';
import { openSettings, useMyCities } from '../../../utils/myCities';
import { useExchangeRates } from '../../../utils/exchangeRates';
import { openJourneyFromCard } from '../../../utils/journeyOpen';
import { openDepartureBoard } from '../../../app/quickActions';
import { friendLabel, type Friend } from '../../../utils/friends';
import type { BentoTileId } from '../../../utils/homeWidgetPrefs';
import type { DepartureTicket } from '../../departure/departureData';
import { ticketRange, ticketStatus } from '../../departure/departureData';
import {
  journeyCities, journeyDays, journeyMonth, nightsLabel, rangeLabel,
  type BentoStats, type CalMonth, type Journey, type Memory, type NextJourney,
} from './bentoData';

// The detail sheet a bento tile opens (v1.3.8): the tile's numbers laid out in full, and, for a tile that has a hub,
// the button that goes there (the same places the phone's tab bar reaches).

export interface BentoCtx {
  trips: Trip[];
  plans: Plan[];
  next: NextJourney | null;
  stats: BentoStats;
  memory: Memory | null;
  month: CalMonth;
  recent: Journey[];
  published: Trip[];
  tickets: DepartureTicket[];
  pockets: SpotPocketItem[];
  friends: Friend[];
  onNavigate: (view: string, tripId?: number | null) => void;
  onNewTrip: () => void;
  close: () => void;
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-4 py-1">{children}</div>;
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'red' | 'amber' | 'blue' }) {
  const color = tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : tone === 'blue' ? 'text-blue-600 dark:text-blue-400' : '';
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-t border-black/[0.07] dark:border-white/10 first:border-t-0 text-[14px]">
      <span className="text-black/55 dark:text-white/55 shrink-0">{label}</span>
      <span className={`font-bold text-right min-w-0 break-keep [overflow-wrap:anywhere] ${color}`}>{value}</span>
    </div>
  );
}

function JourneyLine({ j, ctx }: { j: Journey; ctx: BentoCtx }) {
  const close = useSheetClose();
  return (
    <button
      type="button"
      onClick={() => { openJourneyFromCard(j as Trip, ctx.onNavigate); close(); }}
      className="w-full min-h-[48px] py-2 flex items-center gap-3 text-left cursor-pointer border-t border-black/[0.07] dark:border-white/10 first:border-t-0"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold truncate">{j.title.replace(' (Plan)', '')}</span>
        <span className="block font-mono text-[11.5px] text-black/55 dark:text-white/55 truncate">{[rangeLabel(j), nightsLabel(j), journeyCities(j).slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</span>
      </span>
      <ArrowRight className="w-4 h-4 opacity-40 shrink-0" aria-hidden />
    </button>
  );
}

function Forecast({ cityEn, lat, lng, tz, country }: { cityEn: string; lat: number; lng: number; tz?: string; country?: string }) {
  const [w, setW] = useState<CityWeatherData | null>(null);
  useEffect(() => {
    let alive = true;
    fetchCityWeather(lat, lng, tz, cityEn, country).then(d => { if (alive) setW(d); }).catch(() => {});
    return () => { alive = false; };
  }, [cityEn, lat, lng, tz, country]);
  if (!w) return <div className="h-24 rounded-card bg-black/[0.05] dark:bg-white/[0.07] animate-pulse" />;
  return (
    <div className="grid grid-cols-7 gap-1 rounded-card bg-paper dark:bg-paper-dark p-2.5 text-center">
      {w.forecast.slice(0, 7).map(d => {
        const m = getWeatherMeta(d.weatherCode, d.precipitationProb);
        const Icon = m.icon;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 min-w-0">
            <span className="text-[11px] font-semibold opacity-60">{WEEK[new Date(d.date).getDay()]}</span>
            <Icon className={`w-5 h-5 ${m.colorClass}`} aria-hidden />
            <span className="font-mono text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums">{d.tempMax}°</span>
            <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">{d.tempMin}°</span>
          </div>
        );
      })}
    </div>
  );
}

function WeatherBody() {
  const { list } = useMyCities();
  const [i, setI] = useState(0);
  const city = list[Math.min(i, list.length - 1)];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {list.slice(0, 4).map((c, n) => (
          <button key={c.nameEn} type="button" aria-pressed={n === i} onClick={() => setI(n)} className={`h-8 px-3.5 rounded-full text-[13px] font-bold cursor-pointer ${n === i ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'bg-black/[0.06] dark:bg-white/10'}`}>{cleanCityDisplayName(c.name)}</button>
        ))}
      </div>
      {city && <Forecast cityEn={city.nameEn} lat={city.lat} lng={city.lng} tz={city.timezone} country={city.country} />}
    </div>
  );
}

function Action({ label, onRun, icon = true }: { label: string; onRun: () => void; icon?: boolean }) {
  const close = useSheetClose();
  return (
    <button type="button" onClick={() => { onRun(); close(); }} className="btn btn-accent flex-1 h-12">
      {label}{icon && <ArrowRight className="w-4 h-4" aria-hidden />}
    </button>
  );
}

export function BentoSheet({ id, ctx }: { id: BentoTileId; ctx: BentoCtx }) {
  const { next, stats, memory, month, recent, published, tickets, pockets, friends } = ctx;
  const go = (view: string) => () => ctx.onNavigate(view);

  let kicker = '';
  let title = '';
  let body: React.ReactNode = null;
  let action: React.ReactNode = null;

  switch (id) {
    case 'dday': {
      kicker = next?.live ? '여행 중' : '예정 여정';
      if (next) {
        const j = next.journey;
        title = j.title.replace(' (Plan)', '');
        body = (
          <Rows>
            <Row label={next.live ? '오늘' : '남은 날'} value={next.live ? `${next.day}일째 / ${next.total}일` : next.daysLeft === 0 ? '오늘 출발' : `${next.daysLeft}일`} tone="amber" />
            <Row label="기간" value={`${rangeLabel(j)}${nightsLabel(j) ? ` · ${nightsLabel(j)}` : ''}`} />
            <Row label="도시" value={journeyCities(j).join(', ') || '—'} />
          </Rows>
        );
        action = <Action label="여정 열기" onRun={() => openJourneyFromCard(j as Trip, ctx.onNavigate)} />;
      } else {
        title = '예정된 여정이 없어요';
        body = <p className="text-[14px] text-black/60 dark:text-white/60">다음 여행을 정하면 남은 날이 여기에 보여요.</p>;
        action = <Action label="새 여행" onRun={ctx.onNewTrip} icon={false} />;
      }
      break;
    }
    case 'term': {
      kicker = '공항 터미널';
      title = tickets.length ? `티켓 ${tickets.length}장` : '발권한 티켓이 없어요';
      body = tickets.length ? (
        <Rows>
          {tickets.slice(0, 5).map(t => {
            const st = ticketStatus(t);
            return <Row key={t.id} label={`${t.cityKo}`} value={`${ticketRange(t)} · ${st.text}`} tone={st.tone === 'amber' ? 'amber' : st.tone === 'red' ? 'red' : undefined} />;
          })}
        </Rows>
      ) : <p className="text-[14px] text-black/60 dark:text-white/60">터미널에서 도시와 날짜를 고르면 티켓이 발권돼요.</p>;
      action = <Action label="터미널 열기" onRun={openDepartureBoard} />;
      break;
    }
    case 'map': {
      kicker = '지도';
      title = `다녀온 나라 ${stats.countries}`;
      const cities = Array.from(new Set(stats.past.flatMap(journeyCities))).slice(0, 12);
      body = (
        <>
          <Rows>
            <Row label="도시" value={`${stats.cities}곳`} />
            <Row label="다음 여정" value={next ? journeyCities(next.journey).slice(0, 2).join(', ') || next.journey.title : '—'} tone="amber" />
          </Rows>
          {cities.length > 0 && <div className="flex flex-wrap gap-1.5">{cities.map(c => <span key={c} className="h-7 px-3 rounded-full bg-black/[0.06] dark:bg-white/10 text-[12.5px] font-bold inline-flex items-center">{c}</span>)}</div>}
        </>
      );
      action = <Action label="지도로 이동" onRun={go('map')} />;
      break;
    }
    case 'cal': {
      kicker = '달력';
      title = `${month.year}년 ${month.month + 1}월`;
      body = (
        <Rows>
          {month.trips.length === 0 && <Row label="여정" value="이번 달에는 없어요" />}
          {month.trips.map(j => <Row key={j.id} label={j.title.replace(' (Plan)', '')} value={rangeLabel(j)} tone={j.isPlan ? 'amber' : undefined} />)}
          {month.cells.filter(c => c.holiday).map(c => <Row key={c.day} label={`${month.month + 1}.${String(c.day).padStart(2, '0')}`} value={c.holiday} tone="red" />)}
        </Rows>
      );
      action = <Action label="달력으로 이동" onRun={go('calendar')} />;
      break;
    }
    case 'sum': {
      kicker = '다녀온 여정';
      title = `지금까지 ${stats.count}번`;
      body = (
        <>
          <Rows>
            <Row label="여행한 날" value={`${stats.days}일`} />
            <Row label="도시" value={`${stats.cities}곳`} />
            <Row label="나라" value={`${stats.countries}개국`} />
            {stats.byYear.map(y => <Row key={y.year} label={`${y.year}년`} value={`${y.count}회`} />)}
          </Rows>
        </>
      );
      action = <Action label="여정 허브" onRun={go('archive')} />;
      break;
    }
    case 'trips': {
      kicker = '최근 여정';
      title = recent.length ? `${recent.length}곳` : '여정이 여기에 모여요';
      body = recent.length ? <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-4 py-1">{recent.map(j => <JourneyLine key={j.id} j={j} ctx={ctx} />)}</div> : null;
      action = <Action label="여정 허브" onRun={go('archive')} />;
      break;
    }
    case 'mem': {
      kicker = memory?.sameWeek && memory.yearsAgo > 0 ? `${memory.yearsAgo}년 전 이맘때` : '다시 보기';
      if (memory) {
        const j = memory.journey;
        title = j.title;
        body = (
          <Rows>
            <Row label="기간" value={`${rangeLabel(j)} (${journeyMonth(j)})`} />
            <Row label="일수" value={`${journeyDays(j)}일`} />
            <Row label="도시" value={journeyCities(j).join(', ') || '—'} />
          </Rows>
        );
        action = <Action label="여정 열기" onRun={() => openJourneyFromCard(j, ctx.onNavigate)} />;
      } else {
        title = '떠올릴 여정이 아직 없어요';
        body = <p className="text-[14px] text-black/60 dark:text-white/60">사진이 있는 여정을 다녀오면 이맘때에 다시 보여 드려요.</p>;
      }
      break;
    }
    case 'fri': {
      kicker = '친구';
      title = friends.length ? `${friends.length}명` : '아직 친구가 없어요';
      body = friends.length ? (
        <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-4 py-1">
          {friends.slice(0, 8).map(f => (
            <div key={f.uid} className="min-h-[48px] py-2 flex items-center gap-3 border-t border-black/[0.07] dark:border-white/10 first:border-t-0">
              <UserProfileAvatar profile={f} size="md" fallbackName={f.name} />
              <span className="text-[14px] font-bold truncate">{friendLabel(f)}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[14px] text-black/60 dark:text-white/60">초대 링크를 보내면 여정과 포켓을 함께 볼 수 있어요.</p>;
      action = <Action label="친구 관리" onRun={() => openSettings('me')} />;
      break;
    }
    case 'mag': {
      kicker = '매거진';
      title = published.length ? `발행 ${published.length}권` : '발행한 매거진이 없어요';
      body = published.length ? <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-4 py-1">{published.slice(0, 6).map(j => <JourneyLine key={j.id} j={j} ctx={ctx} />)}</div>
        : <p className="text-[14px] text-black/60 dark:text-white/60">다녀온 여정에서 일정과 사진을 정리하고 매거진으로 발행해 보세요.</p>;
      action = <Action label="발행한 여정 보기" onRun={() => { try { sessionStorage.setItem('archivePublishedOnly', '1'); } catch { /* the hub opens unfiltered */ } ctx.onNavigate('archive'); }} />;
      break;
    }
    case 'pocket': {
      kicker = '포켓';
      title = `저장한 곳 ${pockets.length}`;
      const latest = [...pockets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      body = (
        <Rows>
          <Row label="즐겨찾기" value={`${pockets.filter(p => p.isFavorite).length}곳`} />
          {latest.map(p => <Row key={p.id} label={p.city || '—'} value={p.title} />)}
        </Rows>
      );
      action = <Action label="포켓으로 이동" onRun={go('pocket')} />;
      break;
    }
    case 'wx': {
      kicker = '날씨';
      title = '내 도시';
      body = <WeatherBody />;
      action = <Action label="내 도시 편집" onRun={() => openSettings('cities')} icon={false} />;
      break;
    }
    case 'fx': {
      kicker = '환율';
      title = '원화 기준';
      body = <RatesBody />;
      break;
    }
    case 'time': {
      kicker = '세계시간';
      title = '내 도시와 다음 여정';
      body = <p className="text-[14px] text-black/60 dark:text-white/60">내 도시와 다음 여정의 도시 시각이 함께 보여요. 도시는 설정의 도시에서 바꿀 수 있어요.</p>;
      action = <Action label="내 도시 편집" onRun={() => openSettings('cities')} icon={false} />;
      break;
    }
  }

  return (
    <div className="flex flex-col gap-3 p-5 pt-2 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">{kicker}</span>
          <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{title}</h2>
        </div>
        <SheetCloseButton className="w-9 h-9 -mr-1 rounded-full grid place-items-center hover:bg-black/[0.06] dark:hover:bg-white/10 shrink-0 cursor-pointer"><X className="w-5 h-5" aria-hidden /></SheetCloseButton>
      </div>
      {body}
      {action && <div className="flex gap-2 pt-1">{action}</div>}
    </div>
  );
}

function RatesBody() {
  const { rates, prevRates, date } = useExchangeRates();
  const lines = [
    { code: 'USD', per: 1, label: 'USD 1' },
    { code: 'JPY', per: 100, label: 'JPY 100' },
    { code: 'EUR', per: 1, label: 'EUR 1' },
    { code: 'CNY', per: 1, label: 'CNY 1' },
    { code: 'GBP', per: 1, label: 'GBP 1' },
    { code: 'TWD', per: 1, label: 'TWD 1' },
  ];
  return (
    <>
      <Rows>
        {lines.map(l => {
          const v = (rates[l.code] ?? 0) * l.per;
          const before = prevRates?.[l.code] ? prevRates[l.code] * l.per : null;
          const diff = before ? v - before : null;
          return <Row key={l.code} label={l.label} tone={diff === null || Math.abs(diff) < 0.005 ? undefined : diff > 0 ? 'red' : 'blue'} value={`${diff !== null && Math.abs(diff) >= 0.005 ? (diff > 0 ? '▲ ' : '▼ ') : ''}${v.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: v < 100 ? 2 : 0 })}원`} />;
        })}
      </Rows>
      <p className="font-mono text-[11px] text-black/50 dark:text-white/50">{date ? `${date} 기준 · 하루에 한 번 갱신` : '대략의 환율 · 하루에 한 번 갱신'}</p>
    </>
  );
}
