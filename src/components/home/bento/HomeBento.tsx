import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Bookmark, CalendarDays, Coins, History, Loader2, LocateFixed, Luggage, Map as MapIcon, Moon, Plus, Sun, Ticket, Users,
} from 'lucide-react';
import { auth } from '../../../firebase';
import type { Plan, SpotPocketItem, Trip } from '../../../types';
import { Sheet } from '../../Sheet';
import { Art } from '../../../art/Art';
import { UserProfileAvatar } from '../../UserProfileAvatar';
import { useFriends } from '../../friends/useFriends';
import { useCitiesWeather } from '../../weather/useCitiesWeather';
import { resolveWeatherEffectType } from '../../WeatherEffectLayer';
import { cleanCityDisplayName, getWeatherMeta } from '../../../utils/weatherApi';
import { useExchangeRates } from '../../../utils/exchangeRates';
import { getSavedPockets, subscribePockets } from '../../../utils/pocketStorage';
import { cardCoverUrl } from '../../../utils/journeyThumbs';
import { parseTripStartDate } from '../../../utils/tripPlanHelper';
import { isTileOn, useHomeWidgets, type BentoTileId } from '../../../utils/homeWidgetPrefs';
import { openJourneyFromCard, warmJourney } from '../../../utils/journeyOpen';
import { TicketPass } from '../../ui/TicketPass';
import { DotMap } from './DotMap';
import { CURRENT_LOCATION_EN } from '../../../utils/userPrefs';
import { ClockFace, useClockSetup, useNow } from './WorldClock';
import { BentoSheet, type BentoCtx } from './BentoSheet';
import { useWeatherPlaces } from './weatherPlaces';
import { HomeSky } from './HomeSky';
import {
  describeJourney, journeyMonth, journeyPoints, journeyStats, monthCells, focusPoints, focusTrip, focusKeyOf, upcomingTrips, pickMemory,
  type FocusTrip, type Journey,
} from './bentoData';
import type { DepartureTicket } from '../../departure/departureData';

// Home bento (v1.3.8): the home page as a grid of square cubes. Four sizes only: cube (1 x 1), wide (2 x 1), vertical
// (1 x 2) and hero (2 x 2). Two columns on a phone, four from tablet up; the grid is dense, so a tile the member
// turns off closes up instead of leaving a hole. The journey tiles come first, the tools (weather, exchange rates,
// world time) sit below their own line. Tapping a tile opens its detail sheet, which also carries the way into its hub.

type Tint = 'peach' | 'butter' | 'coral' | 'sage' | 'mist' | 'lilac' | 'surface' | 'photo' | 'ink' | 'bare';
type Span = 'cube' | 'wide' | 'hero' | 'tall';

const TINT: Record<Tint, string> = {
  peach: 'bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach',
  butter: 'bg-butter text-butter-ink dark:bg-butter-dark dark:text-butter',
  coral: 'bg-coral text-coral-ink dark:bg-coral-dark dark:text-coral',
  sage: 'bg-sage text-sage-ink dark:bg-sage-dark dark:text-sage',
  mist: 'bg-mist text-mist-ink dark:bg-mist-dark dark:text-mist',
  lilac: 'bg-lilac text-lilac-ink dark:bg-lilac-dark dark:text-lilac',
  surface: 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark',
  // A picture fills the tile; white text sits on the shade over it
  photo: 'bg-mist-ink/40 text-white',
  // The boarding pass ground, as on the journey board's flight tile
  ink: 'bg-ink text-paper dark:bg-ink-dark dark:text-paper-dark',
  // The tile brings its own ground (the clocks)
  bare: '',
};
const SPAN: Record<Span, string> = { cube: '', wide: 'col-span-2', hero: 'col-span-2 row-span-2', tall: 'row-span-2' };

const kicker = 'font-mono text-micro font-bold uppercase tracking-[0.13em] opacity-80 flex items-center gap-1.5 min-w-0';
const mono = 'font-mono tabular-nums';

function Tile({ tint, span = 'cube', label, onOpen, children, className = '', noGo, style, attrs }: {
  tint: Tint; span?: Span; label: string; onOpen: () => void; children: React.ReactNode; className?: string; noGo?: boolean; style?: React.CSSProperties; attrs?: Record<string, string | undefined>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onOpen(); } }}
      style={style}
      {...attrs}
      className={`tgl-press relative ${SPAN[span]} ${TINT[tint]} rounded-card p-3.5 flex flex-col gap-0.5 min-w-0 min-h-0 overflow-hidden cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${className}`}
    >
      {children}
    </div>
  );
}

/** A number with its unit set small and raised beside it (12회, 5곳), so the eye lands on the number */
const Unit = ({ children }: { children: React.ReactNode }) => <span className="text-[0.42em] font-bold tracking-normal ml-[0.12em] align-[0.95em] opacity-80">{children}</span>;

const Kicker = ({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <span className={kicker}><Icon className="w-3 h-3 shrink-0" /><span className="truncate">{children}</span></span>
);

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export interface HomeBentoProps {
  trips: Trip[];
  plans: Plan[];
  heroJourneys: Journey[];
  heroSlide: number;
  onHeroSlide: (i: number) => void;
  renderHeroMedia: (j: Journey, active: boolean) => React.ReactNode;
  dataReady: boolean;
  isDarkMode: boolean;
  onNavigate: (view: string, tripId?: number | null) => void;
  onNewTrip: () => void;
}

export function HomeBento({ trips, plans, heroJourneys, heroSlide, onHeroSlide, renderHeroMedia, dataReady, isDarkMode, onNavigate, onNewTrip }: HomeBentoProps) {
  const widgets = useHomeWidgets();
  const on = (id: BentoTileId) => isTileOn(widgets, id);
  const [sheet, setSheet] = useState<BentoTileId | null>(null);
  const open = (id: BentoTileId) => () => setSheet(id);

  const liveTrips = useMemo(() => trips.filter(t => !t.deletedAt), [trips]);
  const stats = useMemo(() => journeyStats(liveTrips), [liveTrips]);
  const memory = useMemo(() => pickMemory(liveTrips), [liveTrips]);
  const month = useMemo(() => monthCells(liveTrips, plans), [liveTrips, plans]);
  const recent = useMemo(() => {
    const t = (j: Journey) => parseTripStartDate(j.date || '')?.getTime() ?? 0;
    return [...liveTrips, ...plans].sort((a, b) => t(b) - t(a)).slice(0, 5);
  }, [liveTrips, plans]);
  const published = useMemo(() => liveTrips.filter(t => t.publishedAt).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)), [liveTrips]);

  // Terminal tickets, live (the module loads after the page, so it stays out of the first bundle)
  const [tickets, setTickets] = useState<DepartureTicket[] | null>(null);
  useEffect(() => {
    let alive = true;
    let stop: (() => void) | undefined;
    import('../../departure/departureData').then(({ readCachedTickets, subscribeTickets }) => {
      if (!alive) return;
      setTickets(readCachedTickets().items);
      const unsub = subscribeTickets(store => { if (alive) setTickets(store.items); });
      if (alive) stop = unsub; else unsub();
    }).catch(() => {});
    return () => { alive = false; stop?.(); };
  }, []);

  // Pocket
  const [pockets, setPockets] = useState<SpotPocketItem[]>(() => getSavedPockets());
  useEffect(() => subscribePockets(setPockets), []);

  const { friends } = useFriends(auth.currentUser?.uid);

  const visited = useMemo(() => stats.past.flatMap(journeyPoints), [stats.past]);
  // One trip for the "next" tile and the terminal tile: the one the member picked, else the nearest of journeys, plans
  // and tickets
  const pinnedKey = focusKeyOf(widgets);
  const upcoming = useMemo(() => upcomingTrips(liveTrips, plans, tickets ?? [], pinnedKey), [liveTrips, plans, tickets, pinnedKey]);
  const focus = useMemo(() => focusTrip(upcoming, pinnedKey), [upcoming, pinnedKey]);
  const ahead = useMemo(() => focusPoints(focus), [focus]);

  const ctx: BentoCtx = {
    trips: liveTrips, plans, focus, upcoming, pinnedKey: pinnedKey || undefined, stats, memory, month, recent, published, tickets: tickets ?? [], pockets, friends,
    onNavigate, onNewTrip, close: () => setSheet(null),
  };

  if (!dataReady) return <BentoSkeleton />;

  const hero = heroJourneys[heroSlide] ?? heroJourneys[0];
  const about = hero ? describeJourney(hero) : { chip: '', meta: '' };

  return (
    <section aria-label="홈" className="relative isolate w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 pb-4">
      <HomeSky />
      <div className="tgl-bento">
        <div className="tgl-bento-grid">
          {/* ── Hero: the journey in the picture, a square so tall and wide covers both stay whole ── */}
          {hero ? (
            <Tile tint="photo" span="hero" label={`${hero.title} 열기`} noGo onOpen={() => openJourneyFromCard(hero as Trip, onNavigate)} className="!p-0">
              <div className="absolute inset-0" onMouseEnter={() => warmJourney(hero)} onTouchStart={() => warmJourney(hero)}>
                {heroJourneys.map((j, i) => <React.Fragment key={j.id}>{renderHeroMedia(j, i === heroSlide)}</React.Fragment>)}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/25 pointer-events-none" />
              <div className="relative z-[2] flex flex-col justify-between h-full p-4 pointer-events-none">
                <span className="self-start font-mono text-[10.5px] font-semibold tracking-[0.1em] px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-sm">{about.chip}</span>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 key={hero.id} className="tgl-swap-in text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-[1.1] break-keep line-clamp-2">{(hero.title || '').replace(' (Plan)', '')}</h2>
                    <p className="font-mono text-[12px] opacity-90 mt-1.5 truncate">{about.meta}</p>
                    {heroJourneys.length > 1 && (
                      <span className="flex gap-1 mt-3 pointer-events-auto" role="group" aria-label="히어로 선택">
                        {heroJourneys.map((j, i) => (
                          <button
                            key={j.id}
                            type="button"
                            aria-label={`${i + 1}번째 여정`}
                            aria-current={i === heroSlide}
                            onClick={(e) => { e.stopPropagation(); onHeroSlide(i); }}
                            className="h-5 grid place-items-center cursor-pointer"
                          >
                            <i className={`block h-1.5 rounded-full transition-all duration-base ${i === heroSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                  <span className="w-11 h-11 rounded-full bg-white text-black grid place-items-center shrink-0"><ArrowRight className="w-5 h-5" aria-hidden /></span>
                </div>
              </div>
            </Tile>
          ) : (
            <Tile tint="peach" span="hero" label="새 여행 만들기" noGo onOpen={onNewTrip}>
              <Kicker icon={Luggage}>첫 여정</Kicker>
              <Art id="itinerary-empty" className="h-[46%] w-auto self-center mt-1" />
              <span className="mt-auto text-[22px] font-extrabold tracking-tight leading-tight">첫 여행을 계획해 보세요</span>
              <span className="text-[12.5px] opacity-80">도시와 날짜를 고르면 티켓이 발권돼요</span>
              <span className="mt-2 self-start h-10 px-4 rounded-full bg-red-600 text-white text-[13px] font-bold inline-flex items-center gap-1.5"><Plus className="w-4 h-4" aria-hidden />새 여행</span>
            </Tile>
          )}

          {/* ── Next journey: the nearest plan, the same trip the terminal tile shows ── */}
          {on('dday') && (
            <Tile tint="butter" label="예정 여정" onOpen={open('dday')} className="justify-between">
              <div className="flex flex-col gap-1.5">
                <Kicker icon={CalendarDays}>{focus?.live ? '여행 중' : '예정'}</Kicker>
                {focus ? (
                  <span className={`${mono} text-[40px] font-extrabold tracking-[-0.04em] leading-[0.95]`}>{focus.live ? `Day ${focus.day}` : !focus.start ? 'PLAN' : focus.daysLeft === 0 ? 'D-DAY' : `D-${focus.daysLeft}`}</span>
                ) : (
                  <span className="text-[17px] font-extrabold tracking-tight leading-snug">예정된 여정이 없어요</span>
                )}
              </div>
              {focus ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-extrabold tracking-tight leading-snug line-clamp-2 break-keep">{focus.title}</span>
                  <span className={`${mono} text-[11.5px] font-semibold opacity-80 truncate`}>{focus.range}{focus.nights ? ` · ${focus.nights}` : ''}</span>
                  {!focus.live && !!focus.start && focus.total > 0 && (
                    <span className="h-1.5 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden mt-0.5" aria-hidden>
                      <i className="block h-full rounded-full bg-amber-700 dark:bg-amber-400" style={{ width: `${Math.max(6, Math.min(100, 100 - (focus.daysLeft / 120) * 100))}%` }} />
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[12px] opacity-80">다음 여행을 정해 보세요</span>
              )}
            </Tile>
          )}

          {/* ── Terminal ── */}
          {on('term') && <TerminalTile focus={focus} tickets={tickets} onOpen={open('term')} />}

          {/* ── Map ── */}
          {on('map') && (
            <Tile tint="mist" span="wide" label="지도" onOpen={open('map')} className="!p-0">
              <DotMap visited={visited} next={ahead} dark={isDarkMode} />
              <div className="relative z-[1] p-3.5 flex flex-col h-full pointer-events-none">
                <Kicker icon={MapIcon}>지도</Kicker>
                <div className="mt-auto flex items-baseline gap-3 flex-wrap">
                  <span className={`${mono} text-[32px] font-extrabold tracking-[-0.03em] leading-none`}>{stats.countries}<Unit>개국</Unit></span>
                  <span className="text-[12px] opacity-80">도시 {stats.cities}</span>
                  {focus?.cities[0] && <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400">다음 · {focus.cities[0]}</span>}
                </div>
              </div>
            </Tile>
          )}

          {/* ── Calendar: this month, small ── */}
          {on('cal') && (
            <Tile tint="mist" label="이번 달 달력" onOpen={open('cal')}>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-extrabold tracking-tight leading-none">{month.month + 1}월</span>
                <span className={`${mono} text-[11px] font-bold opacity-60`}>{month.year}</span>
              </span>
              <div className="flex-1 min-h-0 mt-2 grid grid-cols-7 grid-rows-[13px_repeat(6,1fr)] text-center font-mono text-[10.5px] font-semibold">
                {WEEK.map((w, i) => <span key={w} className={`text-[10px] leading-none opacity-60 ${i === 0 ? 'text-red-600 dark:text-red-400 opacity-100' : i === 6 ? 'text-blue-600 dark:text-blue-400 opacity-100' : ''}`}>{w}</span>)}
                {Array.from({ length: month.lead }).map((_, i) => <span key={`l${i}`} />)}
                {month.cells.map(c => (
                  <span key={c.day} className="relative flex flex-col items-center justify-start">
                    <span className={`w-[17px] h-[17px] grid place-items-center rounded-full leading-none ${c.today ? 'bg-red-600 text-white' : c.dow === 0 || c.holiday ? 'text-red-600 dark:text-red-400' : c.dow === 6 ? 'text-blue-600 dark:text-blue-400' : ''}`}>{c.day}</span>
                    {c.trip && <i className={`mt-[1px] w-[4px] h-[4px] rounded-full ${c.ahead ? 'bg-amber-600 dark:bg-amber-400' : 'bg-current opacity-70'}`} />}
                  </span>
                ))}
              </div>
            </Tile>
          )}

          {/* ── What has been done ── */}
          {on('sum') && (
            <Tile tint="peach" label="다녀온 여정" onOpen={open('sum')}>
              <Kicker icon={Luggage}>다녀온 여정</Kicker>
              <span className={`${mono} mt-1 text-[32px] font-extrabold tracking-[-0.03em] leading-none`}>{stats.count}<Unit>회</Unit></span>
              <span className="text-[11.5px] opacity-80 leading-snug">{stats.days}일 · 도시 {stats.cities} · {stats.countries}개국</span>
              {stats.byYear.length > 0 && stats.byYear.length < 3 && (
                <span className={`${mono} mt-auto text-[11.5px] font-bold opacity-80 leading-snug`}>{stats.byYear.map(y => `${y.year} · ${y.count}회`).join('  ')}</span>
              )}
              {stats.byYear.length >= 3 && (
                <div className="mt-auto flex items-end gap-1.5 h-[34%] min-h-[28px]" aria-hidden>
                  {stats.byYear.map(y => {
                    const max = Math.max(...stats.byYear.map(v => v.count));
                    return (
                      <span key={y.year} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full">
                        <i className="w-full rounded-[4px] bg-current opacity-40" style={{ height: `${Math.max(14, (y.count / max) * 100)}%` }} />
                        <span className="font-mono text-[10px] opacity-80 leading-none">{String(y.year).slice(2)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </Tile>
          )}

          {/* ── Recent journeys ── */}
          {on('trips') && (
            <Tile tint="peach" span="wide" label="최근 여정" onOpen={open('trips')}>
              <Kicker icon={Luggage}>최근 여정</Kicker>
              {recent.length === 0 ? (
                <span className="mt-auto text-[14px] font-bold opacity-80">여정이 여기에 모여요</span>
              ) : (
                <div className="mt-2 flex-1 min-h-0 grid grid-cols-3 gap-2">
                  {recent.slice(0, 3).map(j => (
                    <span key={j.id} className="relative rounded-thumb overflow-hidden bg-black/10 min-h-0">
                      {cardCoverUrl(j as Trip) && <img src={cardCoverUrl(j as Trip)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-cover" />}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-2 text-white">
                        <span className="block text-[11.5px] font-extrabold leading-tight line-clamp-2 break-keep">{j.title.replace(' (Plan)', '')}</span>
                        <span className="block font-mono text-[10.5px] opacity-90 mt-0.5">{journeyMonth(j)}</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </Tile>
          )}

          {/* ── A memory ── */}
          {on('mem') && (
            <Tile tint="photo" label="추억" onOpen={open('mem')} className="!p-0">
              {memory?.journey.img && <img src={cardCoverUrl(memory.journey)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-cover" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
              <div className="relative z-[1] p-3.5 flex flex-col h-full pointer-events-none">
                <span className={kicker}><History className="w-3 h-3 shrink-0" /><span className="truncate">{memory ? (memory.sameWeek && memory.yearsAgo > 0 ? `${memory.yearsAgo}년 전 이맘때` : '다시 보기') : '추억'}</span></span>
                {memory ? (
                  <>
                    <span className="mt-auto text-[16px] font-extrabold tracking-tight leading-snug line-clamp-2 break-keep">{memory.journey.title}</span>
                    <span className={`${mono} text-[11px] opacity-90`}>{journeyMonth(memory.journey)}</span>
                  </>
                ) : (
                  <span className="mt-auto text-[13px] font-bold opacity-90">다녀온 여정의 사진이 여기에 떠올라요</span>
                )}
              </div>
            </Tile>
          )}

          {/* ── Friends ── */}
          {on('fri') && (
            <Tile tint="lilac" label="친구" onOpen={open('fri')} className="justify-between">
              <div className="flex flex-col gap-1.5">
                <Kicker icon={Users}>친구</Kicker>
                <span className={`${mono} text-[32px] font-extrabold tracking-[-0.03em] leading-none`}>{friends.length}<Unit>명</Unit></span>
                <span className="text-[12px] opacity-80 leading-snug break-keep">{friends.length ? '함께 보는 여정과 포켓' : '초대하면 여정을 같이 봐요'}</span>
              </div>
              <span className="flex -space-x-2.5 h-9">
                {friends.slice(0, 4).map(f => <UserProfileAvatar key={f.uid} profile={f} size="md" fallbackName={f.name} className="ring-2 ring-lilac dark:ring-lilac-dark" />)}
                {friends.length > 4 && <span className="w-9 h-9 rounded-full grid place-items-center bg-black/10 dark:bg-white/15 text-[11px] font-bold ring-2 ring-lilac dark:ring-lilac-dark">+{friends.length - 4}</span>}
                {friends.length === 0 && <span className="w-9 h-9 rounded-full grid place-items-center bg-black/10 dark:bg-white/15"><Plus className="w-4 h-4" aria-hidden /></span>}
              </span>
            </Tile>
          )}

          {/* ── Magazine: the words on the left, the latest cover standing on the right ── */}
          {on('mag') && (
            <Tile tint="coral" label="매거진" onOpen={open('mag')} className="justify-between">
              <Kicker icon={BookOpen}>매거진</Kicker>
              {published.length > 0 ? (
                <>
                  {published[0].img && (
                    <img src={cardCoverUrl(published[0])} alt="" loading="lazy" decoding="async" draggable={false} className="absolute right-3.5 bottom-3.5 w-[38%] aspect-[3/4] object-cover rounded-[8px] shadow-[0_6px_14px_rgba(0,0,0,0.25)] rotate-[4deg]" />
                  )}
                  <div className={`flex flex-col gap-1 ${published[0].img ? 'w-[52%]' : ''}`}>
                    <span className={`${mono} text-[32px] font-extrabold tracking-[-0.03em] leading-none`}>{published.length}<Unit>권</Unit></span>
                    <span className="text-[11.5px] font-semibold opacity-80 leading-snug line-clamp-3 break-keep">{published[0].title}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-[16px] font-extrabold tracking-tight leading-snug break-keep">아직 발행한 매거진이 없어요</span>
                  <span className="text-[11.5px] opacity-80 leading-snug break-keep">다녀온 여정을 발행해 보세요</span>
                </div>
              )}
            </Tile>
          )}

          {/* ── Pocket ── */}
          {on('pocket') && (
            <Tile tint="sage" label="포켓" onOpen={open('pocket')} className="justify-between">
              <div className="flex flex-col gap-1.5">
                <Kicker icon={Bookmark}>포켓</Kicker>
                <span className={`${mono} text-[32px] font-extrabold tracking-[-0.03em] leading-none`}>{pockets.length}<Unit>곳</Unit></span>
              </div>
              {pockets.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {[...pockets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 2).map(p => (
                    <span key={p.id} className="h-6 px-2.5 rounded-full bg-black/[0.08] dark:bg-white/10 text-[11.5px] font-bold inline-flex items-center gap-1 min-w-0">
                      <span className="truncate">{p.title}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[12px] opacity-80 leading-snug break-keep">가고 싶은 곳을 모아 둬요</span>
              )}
            </Tile>
          )}
        </div>

        {/* ── Tools ── */}
        {(on('wx') || on('fx') || on('time')) && (
          <>
            <div className="flex items-center gap-3 my-3 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50" role="separator" aria-label="도구">
              도구<span className="flex-1 h-px bg-black/10 dark:bg-white/10" />
            </div>
            <div className="tgl-bento-grid">
              {on('wx') && <WeatherTile onOpen={open('wx')} />}
              {on('fx') && <ExchangeTile onOpen={open('fx')} />}
              {on('time') && <ClockTile nextCity={focus?.cities[0]} onOpen={open('time')} />}
            </div>
          </>
        )}
      </div>

      {sheet && (
        <Sheet label="상세" onClose={() => setSheet(null)} panelClassName="sm:max-w-md max-h-[86dvh]">
          <BentoSheet id={sheet} ctx={ctx} />
        </Sheet>
      )}
    </section>
  );
}

function BentoSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading" className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-3 pb-4">
      <div className="tgl-bento"><div className="tgl-bento-grid">
        <div className="col-span-2 row-span-2 rounded-card bg-black/[0.05] dark:bg-white/[0.07] animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`rounded-card bg-black/[0.05] dark:bg-white/[0.07] animate-pulse ${i === 2 ? 'col-span-2' : ''}`} />)}
      </div></div>
    </section>
  );
}

// The terminal's ticket on the journey board's boarding pass (ui/TicketPass): ICN to the first stop, the gate and the
// flying time on the two ends, the dates and the days left under the tear line.
function TerminalTile({ focus, tickets, onOpen }: { focus: FocusTrip | null; tickets: DepartureTicket[] | null; onOpen: () => void }) {
  // The ticket of the trip the "next" tile shows; a trip without a ticket says so instead of showing another trip's
  const t = focus ? focus.ticket : tickets?.[0];
  const [loaded, setLoaded] = useState<{ id: string; to: string; status: string; range: string; hours: string } | null>(null);
  useEffect(() => {
    if (!t) return;
    let alive = true;
    Promise.all([import('../../../utils/bookingDeepLinks'), import('../../departure/departureData')]).then(([links, data]) => {
      if (alive) setLoaded({ id: t.id, to: links.inferAirportCode(t.cityEn), status: data.ticketStatus(t).text, range: data.ticketRange(t), hours: data.formatHours(t.hours) });
    }).catch(() => {});
    return () => { alive = false; };
  }, [t]);
  const d = t && loaded?.id === t.id ? loaded : null;
  return (
    <Tile tint="ink" label="공항 터미널" onOpen={onOpen} className="gap-2">
      {t ? (
        <TicketPass
          kicker={`${t.flightNo}${tickets && tickets.length > 1 ? ` · ${tickets.length}장` : ''}`}
          from={{ code: 'ICN', time: d?.range.split(' ')[0] ?? '', note: `GATE ${t.gate}` }}
          to={{ code: d?.to ?? '···', time: d?.hours ?? '', note: t.cityKo }}
          foot={d?.range ?? ''}
          footEnd={d?.status}
          bleed="-mx-3.5"
        />
      ) : focus ? (
        <>
          <Kicker icon={Ticket}>터미널</Kicker>
          <span className="mt-auto text-[17px] font-extrabold tracking-tight leading-snug">발권 전</span>
          <span className="text-[11.5px] opacity-70 leading-snug line-clamp-2 break-keep">{focus.title}</span>
          <span className="mt-1 self-start h-7 px-3 rounded-full bg-white/15 dark:bg-black/10 text-[12px] font-bold inline-flex items-center">티켓 만들기</span>
        </>
      ) : (
        <>
          <Kicker icon={Ticket}>터미널</Kicker>
          <span className="mt-auto text-[15px] font-extrabold tracking-tight leading-snug break-keep">{tickets ? '발권한 티켓이 없어요' : ' '}</span>
          {tickets && <span className="text-[11.5px] opacity-70">터미널에서 티켓을 발권해요</span>}
        </>
      )}
    </Tile>
  );
}

// Weather: the tile follows the weather of the place it shows. Sun, cloud, fog, rain, snow and storm each have their
// own sky (css, index.css .tgl-wx), and night turns any of them dark. Tapping another place in the list switches the tile.
function WeatherTile({ onOpen }: { onOpen: () => void }) {
  const { cities: mine, place, busy, cur, isHere: here, choose, chooseHere } = useWeatherPlaces();
  // The member's cities (four fit beside the reading) and "here": the current location is a place of its own
  const key = `${place ? `${place.lat},${place.lng}` : ''}|${mine.map(c => c.nameEn).join('|')}`;
  const cities = useMemo(() => [...(place ? [place] : []), ...mine], [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const { now, prefetch } = useCitiesWeather(cities);
  useEffect(() => { prefetch(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = cur ? now[cur.nameEn] : undefined;
  const pop = w?.forecast?.[0]?.precipitationProb;
  const mood = w ? resolveWeatherEffectType(w.weatherCode, pop) : 'clear';
  const hour = w?.localTime ? parseInt(w.localTime.slice(0, 2), 10) : 12;
  const night = !Number.isNaN(hour) && (hour >= 19 || hour < 6);
  const meta = w ? getWeatherMeta(w.weatherCode, pop, w.temp) : null;
  const Icon = meta?.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="날씨"
      onClick={onOpen}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onOpen(); } }}
      data-mood={mood}
      data-night={night ? '' : undefined}
      className="tgl-wx tgl-press relative col-span-2 rounded-card p-3.5 flex gap-3 min-w-0 min-h-0 overflow-hidden cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
    >
      <div className="relative z-[1] flex-1 min-w-0 flex flex-col">
        <Kicker icon={here ? LocateFixed : night ? Moon : Sun}>날씨 · {cur ? cleanCityDisplayName(cur.name) : ''}</Kicker>
        {w && meta && Icon ? (
          <>
            <span className="mt-1 flex items-center gap-2">
              <Icon className={`w-9 h-9 shrink-0 ${meta.colorClass}`} strokeWidth={1.8} aria-hidden />
              <span className={`${mono} text-[40px] font-extrabold tracking-[-0.04em] leading-none`}>{w.temp}°</span>
            </span>
            <span className="mt-1 text-[12.5px] font-bold flex items-center gap-1.5 flex-wrap">
              {meta.labelKo}
              <span className={`${mono} text-[11.5px] font-semibold`}><span className="text-red-600 dark:text-red-400">{w.tempMax}°</span> / <span className="text-blue-600 dark:text-blue-400">{w.tempMin}°</span></span>
              {typeof pop === 'number' && pop > 0 && <span className={`${mono} text-[11px] opacity-80`}>강수 {pop}%</span>}
            </span>
            <span className="mt-auto flex items-end justify-between gap-1" aria-label="앞으로의 날씨">
              {w.forecast.slice(1, 5).map(d => {
                const m = getWeatherMeta(d.weatherCode, d.precipitationProb);
                const DIcon = m.icon;
                const dow = WEEK[new Date(d.date).getDay()];
                return (
                  <span key={d.date} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <span className="text-[10.5px] font-semibold opacity-70">{dow}</span>
                    <DIcon className={`w-4 h-4 ${m.colorClass}`} aria-hidden />
                    <span className={`${mono} text-[10.5px] font-bold`}>{d.tempMax}°</span>
                  </span>
                );
              })}
            </span>
          </>
        ) : (
          <span className="mt-auto mb-auto text-[13px] opacity-70">날씨를 불러오는 중</span>
        )}
      </div>
      {/* The places: "here" first (the first tap asks for location), then the member's cities; tap one and the tile
          becomes its weather */}
      <div className="relative z-[1] w-[36%] max-w-[156px] shrink-0 flex flex-col justify-end gap-1" role="radiogroup" aria-label="날씨 도시">
        {[place ?? null, ...mine.slice(0, 3)].map(c => {
          const isPlace = !c || c.nameEn === CURRENT_LOCATION_EN;
          const d = c ? now[c.nameEn] : undefined;
          const m = d ? getWeatherMeta(d.weatherCode, d.forecast?.[0]?.precipitationProb, d.temp) : null;
          const CIcon = m?.icon;
          const active = isPlace ? here : !here && cur?.nameEn === c!.nameEn;
          return (
            <button
              key={c?.nameEn ?? 'here'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={(e) => { e.stopPropagation(); if (isPlace) chooseHere(); else choose(c!.nameEn); }}
              className={`h-[29px] px-2.5 rounded-full flex items-center gap-1.5 text-left cursor-pointer transition-colors duration-fast ${active ? 'bg-white/80 dark:bg-white/20 shadow-sm' : 'bg-white/35 dark:bg-white/[0.08] hover:bg-white/55 dark:hover:bg-white/[0.14]'}`}
            >
              {isPlace && (busy ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" aria-hidden /> : <LocateFixed className="w-3 h-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden />)}
              <span className={`flex-1 min-w-0 truncate text-[11.5px] ${active ? 'font-extrabold' : 'font-bold'}`}>{isPlace ? '현재 위치' : cleanCityDisplayName(c!.name)}</span>
              {CIcon && <CIcon className={`w-3.5 h-3.5 shrink-0 ${m!.colorClass}`} aria-hidden />}
              {c && <span className={`${mono} text-[11.5px] font-bold shrink-0`}>{d ? `${d.temp}°` : '—'}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RATE_LINES: { code: string; per: number; label: string }[] = [
  { code: 'USD', per: 1, label: 'USD' },
  { code: 'JPY', per: 100, label: 'JPY 100' },
  { code: 'EUR', per: 1, label: 'EUR' },
];

function ExchangeTile({ onOpen }: { onOpen: () => void }) {
  const { rates, prevRates, date } = useExchangeRates();
  return (
    <Tile tint="surface" label="환율" onOpen={onOpen}>
      <Kicker icon={Coins}>환율</Kicker>
      <div className="mt-auto flex flex-col gap-1.5">
        {RATE_LINES.map(r => {
          const nowV = (rates[r.code] ?? 0) * r.per;
          const before = prevRates?.[r.code] ? prevRates[r.code] * r.per : null;
          const diff = before ? nowV - before : null;
          return (
            <span key={r.code} className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[10.5px] font-bold opacity-60">{r.label}</span>
              <span className="flex items-baseline gap-1">
                {diff !== null && Math.abs(diff) >= 0.005 && <span className={`text-[10px] font-bold ${diff > 0 ? 'text-red-500' : 'text-blue-500'}`} aria-label={diff > 0 ? '상승' : '하락'}>{diff > 0 ? '▲' : '▼'}</span>}
                <span className={`${mono} text-[15px] font-extrabold tracking-tight`}>{nowV.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: nowV < 100 ? 2 : 0 })}</span>
              </span>
            </span>
          );
        })}
      </div>
      <span className={`${mono} text-[10.5px] opacity-70 mt-1.5`}>{date ? `${date.slice(5).replace('-', '.')} 기준 · KRW` : 'KRW'}</span>
    </Tile>
  );
}

// The world-time cube: one city's watch fills it, or two to four cities share it as cells (components/home/bento/
// WorldClock); the detail sheet picks the cities, one or all together, and the face
function ClockTile({ nextCity, onOpen }: { nextCity?: string; onOpen: () => void }) {
  const setup = useClockSetup(nextCity);
  const now = useNow(1000);
  return (
    <Tile tint="bare" label="세계시간" onOpen={onOpen} noGo className="!p-0">
      <ClockFace className="absolute inset-0" cities={setup.selected} base={setup.base} style={setup.style} now={now} together={setup.multi} />
    </Tile>
  );
}
