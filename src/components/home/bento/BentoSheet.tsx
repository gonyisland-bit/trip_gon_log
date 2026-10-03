import React, { useEffect, useState } from 'react';
import { ArrowRight, LocateFixed, Star, X } from 'lucide-react';
import type { Plan, SpotPocketItem, Trip } from '../../../types';
import { SheetCloseButton, useSheetClose } from '../../Sheet';
import { UserProfileAvatar } from '../../UserProfileAvatar';
import { cleanCityDisplayName, fetchCityWeather, getWeatherMeta, type CityWeatherData } from '../../../utils/weatherApi';
import { openSettings } from '../../../utils/myCities';
import { useExchangeRates } from '../../../utils/exchangeRates';
import { openJourneyFromCard } from '../../../utils/journeyOpen';
import { openDepartureBoard } from '../../../app/quickActions';
import { friendLabel, type Friend } from '../../../utils/friends';
import { CATEGORY_FORM_ORDER, CATEGORY_META } from '../../pocket/categoryMeta';
import { spotCity } from './placeNames';
import { useWeatherPlaces } from './weatherPlaces';
import { CLOCK_STYLES, ClockFace, useClockSetup, useNow } from './WorldClock';
import { setHomeWidgets, type BentoTileId } from '../../../utils/homeWidgetPrefs';
import type { DepartureTicket } from '../../departure/departureData';
import { daysUntil, ticketRange, ticketStatus } from '../../departure/departureData';
import {
  journeyCities, journeyDays, journeyMonth, nightsLabel, rangeLabel,
  type BentoStats, type CalMonth, type FocusTrip, type Journey, type Memory,
} from './bentoData';

// The detail sheet a bento tile opens (v1.3.8): the tile's numbers laid out in full, and, for a tile that has a hub,
// the button that goes there (the same places the phone's tab bar reaches).

export interface BentoCtx {
  trips: Trip[];
  plans: Plan[];
  focus: FocusTrip | null;
  pinnedTicketId?: string;
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
  const { cities, place, busy, cur, isHere, choose, chooseHere } = useWeatherPlaces();
  const pill = (on: boolean) => `h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition-colors duration-fast ${on ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'bg-black/[0.06] dark:bg-white/10 hover:bg-black/[0.1] dark:hover:bg-white/15'}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="날씨 도시">
        <button type="button" role="radio" aria-checked={isHere} onClick={chooseHere} className={pill(isHere)}>
          <LocateFixed className={`w-3.5 h-3.5 ${busy ? 'animate-pulse' : isHere ? '' : 'text-red-600 dark:text-red-400'}`} aria-hidden />현재 위치
        </button>
        {cities.map(c => {
          const on = !isHere && cur?.nameEn === c.nameEn;
          return <button key={c.nameEn} type="button" role="radio" aria-checked={on} onClick={() => choose(c.nameEn)} className={pill(on)}>{cleanCityDisplayName(c.name)}</button>;
        })}
        <button type="button" onClick={() => openSettings('cities')} className="h-9 px-3.5 rounded-full inline-flex items-center text-[13px] font-bold border border-black/15 dark:border-white/20 text-black/60 dark:text-white/60 cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">도시 편집</button>
      </div>
      {isHere && !place && <span className="text-[12.5px] text-black/55 dark:text-white/55">위치를 찾는 중이거나 허용이 필요해요</span>}
      {cur && <Forecast cityEn={cur.nameEn} lat={cur.lat} lng={cur.lng} tz={cur.timezone} country={cur.country} />}
    </div>
  );
}

/** The tickets, nearest first. The one shown on the home is marked; tapping another one makes it the trip both tiles show */
function TicketPicker({ ctx }: { ctx: BentoCtx }) {
  const items = [...ctx.tickets].sort((a, b) => {
    const da = a.startDate ? daysUntil(a.startDate) : 9999;
    const db = b.startDate ? daysUntil(b.startDate) : 9999;
    return da - db;
  });
  const shownId = ctx.focus?.ticket?.id;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-2 py-1" role="radiogroup" aria-label="홈에 보일 일정">
        {items.map(t => {
          const st = ticketStatus(t);
          const on = shownId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setHomeWidgets({ focusTicketId: t.id })}
              className="min-h-[56px] px-2 py-2 flex items-center gap-3 text-left cursor-pointer border-t border-black/[0.07] dark:border-white/10 first:border-t-0"
            >
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 grid place-items-center ${on ? 'border-red-600 dark:border-red-400' : 'border-black/25 dark:border-white/30'}`}>
                {on && <i className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-400" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold truncate">{t.plan?.title || `${t.cityKo} 여행`}</span>
                <span className="block font-mono text-[11.5px] text-black/55 dark:text-white/55 truncate">{ticketRange(t)} · {t.flightNo}</span>
              </span>
              <span className={`font-mono text-[12px] font-bold shrink-0 ${st.tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : st.tone === 'red' ? 'text-red-600 dark:text-red-400' : ''}`}>{st.text}</span>
            </button>
          );
        })}
      </div>
      {ctx.pinnedTicketId && (
        <button type="button" onClick={() => setHomeWidgets({ focusTicketId: '' })} className="self-start h-8 px-3.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-[12.5px] font-bold cursor-pointer">가장 가까운 일정으로</button>
      )}
      {!ctx.focus?.ticket && ctx.focus && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">가장 가까운 일정 "{ctx.focus.title}"은 아직 발권 전이에요.</p>}
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
  const { focus, stats, memory, month, recent, published, tickets, pockets, friends } = ctx;
  const go = (view: string) => () => ctx.onNavigate(view);

  let kicker = '';
  let title = '';
  let body: React.ReactNode = null;
  let action: React.ReactNode = null;

  switch (id) {
    case 'dday': {
      kicker = focus?.live ? '여행 중' : '예정 여정';
      if (focus) {
        const j = focus.journey;
        title = focus.title;
        body = (
          <Rows>
            <Row label={focus.live ? '오늘' : '남은 날'} value={focus.live ? `${focus.day}일째 / ${focus.total}일` : !focus.start ? '날짜 미정' : focus.daysLeft === 0 ? '오늘 출발' : `${focus.daysLeft}일`} tone="amber" />
            <Row label="기간" value={`${focus.range}${focus.nights ? ` · ${focus.nights}` : ''}`} />
            <Row label="도시" value={focus.cities.join(', ') || '—'} />
            <Row label="티켓" value={focus.ticket ? `${focus.ticket.flightNo} · GATE ${focus.ticket.gate}` : '발권 전'} tone={focus.ticket ? undefined : 'amber'} />
          </Rows>
        );
        action = j
          ? <Action label="여정 열기" onRun={() => openJourneyFromCard(j as Trip, ctx.onNavigate)} />
          : <Action label="터미널 열기" onRun={openDepartureBoard} />;
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
      body = tickets.length ? <TicketPicker ctx={ctx} /> : <p className="text-[14px] text-black/60 dark:text-white/60">터미널에서 도시와 날짜를 고르면 티켓이 발권돼요.</p>;
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
            <Row label="다음 여정" value={focus ? focus.cities.slice(0, 2).join(', ') || focus.title : '—'} tone="amber" />
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
      body = <PocketBody pockets={pockets} />;
      action = <Action label="포켓으로 이동" onRun={go('pocket')} />;
      break;
    }
    case 'wx': {
      kicker = '날씨';
      title = '내 도시';
      body = <WeatherBody />;
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
      title = '시계 고르기';
      body = <ClockBody nextCity={focus?.cities[0]} />;
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

const dateOf = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * The pocket, read as a whole (v1.3.8): how much and in how many cities, what kind of places, the cities saved most,
 * the latest saves as pictures and the favourites. The district a spot is in is folded into its city, so a run of
 * the same ward name never fills the list.
 */
function PocketBody({ pockets }: { pockets: SpotPocketItem[] }) {
  if (pockets.length === 0) return <p className="text-[14px] text-black/60 dark:text-white/60">링크나 사진으로 가고 싶은 곳을 저장하면 여기에 모여요.</p>;
  const cities = new Map<string, { label: string; n: number }>();
  const kinds = new Map<string, number>();
  pockets.forEach(p => {
    const c = spotCity(p);
    if (c) cities.set(c.key, { label: c.label, n: (cities.get(c.key)?.n ?? 0) + 1 });
    kinds.set(p.category, (kinds.get(p.category) ?? 0) + 1);
  });
  const topCities = [...cities.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  const favorites = pockets.filter(p => p.isFavorite);
  const latest = [...pockets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const maxKind = Math.max(...kinds.values());
  const stat = 'rounded-card bg-paper dark:bg-paper-dark px-3 py-2.5 flex flex-col gap-0.5';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className={stat}><span className="font-mono text-[22px] font-extrabold leading-none tabular-nums">{pockets.length}</span><span className="text-[11.5px] text-black/55 dark:text-white/55">저장</span></div>
        <div className={stat}><span className="font-mono text-[22px] font-extrabold leading-none tabular-nums">{cities.size}</span><span className="text-[11.5px] text-black/55 dark:text-white/55">도시</span></div>
        <div className={stat}><span className="font-mono text-[22px] font-extrabold leading-none tabular-nums">{favorites.length}</span><span className="text-[11.5px] text-black/55 dark:text-white/55">즐겨찾기</span></div>
      </div>

      <div className="flex flex-col gap-1.5">
        {CATEGORY_FORM_ORDER.filter(k => kinds.has(k)).map(k => {
          const meta = CATEGORY_META[k];
          const Icon = meta.icon;
          const n = kinds.get(k) ?? 0;
          return (
            <div key={k} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
              <span className="w-12 font-mono text-[11px] font-bold tracking-wider opacity-70">{meta.label}</span>
              <span className="flex-1 h-2 rounded-full bg-black/[0.07] dark:bg-white/10 overflow-hidden"><i className="block h-full rounded-full bg-ink dark:bg-ink-dark opacity-70" style={{ width: `${Math.max(8, (n / maxKind) * 100)}%` }} /></span>
              <span className="w-6 text-right font-mono text-[12px] font-bold tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>

      {topCities.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">자주 저장한 도시</span>
          <div className="flex flex-wrap gap-1.5">
            {topCities.map(c => <span key={c.label} className="h-8 px-3 rounded-full bg-black/[0.06] dark:bg-white/10 text-[13px] font-bold inline-flex items-center gap-1.5">{c.label}<b className="font-mono text-[11.5px] opacity-60 tabular-nums">{c.n}</b></span>)}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">최근 저장</span>
        <div className="flex flex-col rounded-card bg-paper dark:bg-paper-dark px-3">
          {latest.map(p => {
            const meta = CATEGORY_META[p.category];
            const Icon = meta.icon;
            return (
              <div key={p.id} className="min-h-[44px] py-2 flex items-center gap-3 border-t border-black/[0.07] dark:border-white/10 first:border-t-0">
                <Icon className="w-4 h-4 shrink-0 opacity-60" aria-hidden />
                <span className="min-w-0 flex-1 text-[14px] font-bold truncate">{p.title}</span>
                {p.isFavorite && <Star className="w-3.5 h-3.5 shrink-0 fill-current text-amber-600 dark:text-amber-400" aria-label="즐겨찾기" />}
                <span className="font-mono text-[11.5px] text-black/50 dark:text-white/50 tabular-nums shrink-0">{dateOf(p.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Which cities the world-time cube shows, one or all together, and the face of the clock. The cities are pills (the
 * member's own list and the current place, in the list's order); the faces are pills too, and one preview under them is
 * the cube exactly as it will be.
 */
function ClockBody({ nextCity }: { nextCity?: string }) {
  const setup = useClockSetup(nextCity);
  const now = useNow(1000);
  const picked = setup.selected.map(c => c.nameEn);

  const setMulti = (multi: boolean) => {
    if (multi === setup.multi) return;
    if (!multi) { setHomeWidgets({ clockMulti: false, clockCities: picked.slice(0, 1) }); return; }
    const extra = setup.all.find(c => !picked.includes(c.nameEn));
    setHomeWidgets({ clockMulti: true, clockCities: extra && picked.length < 2 ? [...picked, extra.nameEn] : picked });
  };
  const pick = (name: string) => {
    if (!setup.multi) { setHomeWidgets({ clockCities: [name] }); return; }
    const on = picked.includes(name);
    if (on && picked.length <= 2) return; // all together needs at least two
    if (!on && picked.length >= 4) return;
    setHomeWidgets({ clockCities: on ? picked.filter(n => n !== name) : [...picked, name] });
  };
  const heading = 'font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50';
  const pill = (on: boolean) => `h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${on ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' : 'bg-black/[0.06] dark:bg-white/10 hover:bg-black/[0.1] dark:hover:bg-white/15'}`;
  const seg = (on: boolean) => `h-8 px-4 rounded-full text-[13px] font-bold cursor-pointer transition-colors duration-fast ${on ? 'bg-surface dark:bg-surface-dark shadow-sm' : 'text-black/55 dark:text-white/55'}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className={heading}>표시 방식</span>
        <div className="self-start inline-flex p-[3px] rounded-full bg-black/[0.06] dark:bg-white/10" role="radiogroup" aria-label="표시 방식">
          <button type="button" role="radio" aria-checked={!setup.multi} onClick={() => setMulti(false)} className={seg(!setup.multi)}>한 도시</button>
          <button type="button" role="radio" aria-checked={setup.multi} onClick={() => setMulti(true)} className={seg(setup.multi)}>함께 보기</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={heading}>도시{setup.multi ? ` · ${picked.length}/4` : ''}</span>
        <div className="flex flex-wrap gap-1.5" role={setup.multi ? 'group' : 'radiogroup'} aria-label="큐브에 보일 도시">
          {setup.all.map(c => {
            const on = picked.includes(c.nameEn);
            const here = c.nameEn === setup.current.nameEn;
            const order = picked.indexOf(c.nameEn) + 1;
            return (
              <button key={c.nameEn} type="button" role={setup.multi ? undefined : 'radio'} aria-checked={setup.multi ? undefined : on} aria-pressed={setup.multi ? on : undefined} onClick={() => pick(c.nameEn)} className={pill(on)}>
                {setup.multi && on && <span className="w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold grid place-items-center">{order}</span>}
                {here && <LocateFixed className={`w-3.5 h-3.5 ${on ? '' : 'text-red-600 dark:text-red-400'}`} aria-hidden />}
                {here ? '현재 위치' : cleanCityDisplayName(c.name)}
                {c.nameEn === setup.nextCityEn && <span className={`font-mono text-[10px] font-bold ${on ? 'opacity-70' : 'text-amber-700 dark:text-amber-400'}`}>다음</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => openSettings('cities')} className="h-9 px-3.5 rounded-full inline-flex items-center text-[13px] font-bold border border-black/15 dark:border-white/20 text-black/60 dark:text-white/60 cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">도시 편집</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={heading}>시계 모양</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="시계 모양">
          {CLOCK_STYLES.map(st => (
            <button key={st.id} type="button" role="radio" aria-checked={setup.style === st.id} onClick={() => setHomeWidgets({ clockStyle: st.id })} className={pill(setup.style === st.id)}>{st.label}</button>
          ))}
        </div>
      </div>

      <ClockFace className="w-full max-w-[260px] aspect-square self-center rounded-card" cities={setup.selected} base={setup.base} style={setup.style} now={now} together={setup.multi} />
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
