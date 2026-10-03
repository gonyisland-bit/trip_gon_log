import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight, BedDouble, Bus, Car, CarTaxiFront, ChevronDown, ChevronLeft, ChevronRight, Copy, Loader2, MapPin, Maximize2, Navigation, Plane, Plus, Share2, TrainFront, X,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TicketPass } from '../ui/TicketPass';
import type { FlightItem, Plan, StayItem, TimelineData, TimelineItem, TransitItem, Trip } from '../../types';
import { Sheet } from '../Sheet';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { currentUid, setDoc } from '../../utils/ownership';
import { NO_DATE, clockTime, dateText, isPlaceholderDate, stayLabel, timeLabel } from '../../utils/itemDate';
import { useBackToClose } from '../../utils/overlayHistory';
import { notify } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { kindArtUrl, placeKind } from '../../utils/placeArt';
import { mapSearchUrl } from '../../utils/mapLinks';
import { boardPlaces, boardStatus, buildBoard, md, openJourneyBoard, placesPerDay, transitEnds, type BoardEntry, type BoardModel } from './boardData';

// Journey board: a journey's flights, stays, transport and places on one screen, as long and
// short tiles. Made for the airport counter, the hotel desk and the station: the codes people
// ask for are large, a tap copies them, and a tile opens its full details. It is the first tab of
// a journey (embedded) and also opens full screen from home and the card menu.
// Colour follows spec 4.2: the head tile wears the journey tint (peach), flights are ink tickets,
// stays are sage, transport is butter, places are mist, and only the next stop is red. Kinds are
// also told apart by icon and label.

// Every tile opens a drawer (v1.3.8): one booking or place, or a summary of the journey, of its places, or of one kind of booking
type ItemDetail =
  | { kind: 'flight'; item: FlightItem }
  | { kind: 'stay'; item: StayItem }
  | { kind: 'transit'; item: TransitItem }
  | { kind: 'place'; item: TimelineItem & { dayKey: string } };
type SummaryDetail =
  | { kind: 'journey' }
  | { kind: 'places' }
  | { kind: 'list'; of: 'flight' | 'stay' | 'transit' };
type Detail = ItemDetail | SummaryDetail;

const TAB = { flight: 'flights', stay: 'stays', transit: 'transit', place: 'timeline' } as const;

export interface BoardData {
  trip: Trip | Plan;
  timelineData: TimelineData;
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  /** Opens the journey on a tab, at an item */
  onOpenItem: (tab: string, itemId: number | null) => void;
}

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text)
    .then(() => notify(`${what}을(를) 복사했습니다.`, 'success'))
    .catch(() => notify('복사하지 못했습니다.', 'error'));
}

const TRANSIT_ICON = { train: TrainFront, bus: Bus, taxi: CarTaxiFront, car: Car } as const;
const transitIcon = (t: TransitItem) => TRANSIT_ICON[t.transitType || 'train'] || TrainFront;

/** Tap-to-copy code (booking number, PNR) inside a tile */
function CodeChip({ value, what, tone = 'light' }: { value?: string; what: string; tone?: 'light' | 'ink' }) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copy(value, what); }}
      aria-label={`${what} ${value} 복사`}
      className={`self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[13px] font-semibold tracking-[0.12em] tabular-nums transition-colors ${
        tone === 'ink' ? 'bg-white/12 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20' : 'bg-black/[0.06] hover:bg-black/[0.1] dark:bg-white/10 dark:hover:bg-white/15'
      }`}
    >
      {value}
      <Copy className="w-3 h-3 opacity-60" aria-hidden />
    </button>
  );
}

/** "TER 1" / "1" / "T1" → "T1"; anything else is kept as written */
function terminalLabel(term?: string) {
  if (!term) return '';
  const m = String(term).match(/\d+/);
  return m ? `T${m[0]}` : String(term);
}

/** A flight on the board (v1.3.8): where, when and which terminal come first; the seat only when it was written; the booking number lives in the detail */
function FlightFace({ f, wide }: { f: BoardModel['flights'][number]; wide?: boolean }) {
  return (
    <TicketPass
      wide={wide}
      kicker={[f.title, f.flightNo].filter(Boolean).join(' · ')}
      from={{ code: f.fromCode, time: timeLabel(f.fromTime), note: terminalLabel(f.fromTerminal) }}
      to={{ code: f.toCode, time: timeLabel(f.toTime), note: terminalLabel(f.toTerminal) }}
      foot={f.at.date ? md(f.at.date) : NO_DATE}
      footEnd={f.seat ? `좌석 ${f.seat}` : undefined}
    />
  );
}

const tileBase = 'tgl-press relative rounded-card p-4 flex flex-col gap-2 text-left min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600';
const kicker = 'font-mono text-micro font-bold uppercase tracking-[0.14em] opacity-70 flex items-center gap-1.5';

function Tile({ className = '', onOpen, label, children, dim }: { className?: string; onOpen: () => void; label: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`${tileBase} ${dim ? 'opacity-55' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function when(at: BoardEntry, time?: string) {
  return [at.date ? md(at.date) : NO_DATE, timeLabel(time)].filter(Boolean).join(' · ');
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const dayWithWeekday = (d: Date | null) => (d ? `${md(d)} ${WEEKDAY[d.getDay()]}` : '');

/** The journey's own days, for choosing a booking's date */
function journeyDays(start: Date | null, end: Date | null): Date[] {
  if (!start || !end) return [];
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime() && days.length < 60; t += 86400000) days.push(new Date(t));
  return days;
}

/** Width of an element, live: the board picks two or four columns from its own width */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** The board itself: a share row, then the tiles. Embedded in the journey or inside the full-screen layer. */
export function BoardView({ trip, timelineData, flights, stays, transits, onOpenItem, embedded }: BoardData & { embedded?: boolean }) {
  const b = useMemo(() => buildBoard(trip, timelineData, flights, stays, transits), [trip, timelineData, flights, stays, transits]);
  const [detail, setDetailState] = useState<Detail | null>(null);
  // Drawers opened from a summary remember it, so the drawer can step back to it
  const [trail, setTrail] = useState<Detail[]>([]);
  const setDetail = (d: Detail | null) => { setTrail([]); setDetailState(d); };
  const drillDown = (d: Detail) => { if (detail) setTrail(t => [...t, detail]); setDetailState(d); };
  const stepBack = () => {
    const prev = trail[trail.length - 1];
    setTrail(t => t.slice(0, -1));
    setDetailState(prev ?? null);
  };
  const [sharing, setSharing] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const cols = width >= 720 ? 4 : 2;
  // Only a journey still ahead or under way dims what is behind; a finished one shows all alike
  const dimPast = b.phase !== 'past';

  const place = boardPlaces(trip);
  const status = boardStatus(b);
  const range = b.start && b.end ? { start: b.start, end: b.end } : null;
  const year = b.start?.getFullYear() ?? new Date().getFullYear();
  const days = useMemo(() => journeyDays(b.start, b.end), [b.start, b.end]);
  const uid = currentUid();
  const canEdit = !trip.ownerId || trip.ownerId === uid || Boolean(trip.editors?.includes(uid || ''));
  const [outbound, ...otherFlights] = b.flights;
  const art = useMemo(() => kindArtUrl(placeKind(trip.tags || [], trip.locationStr || trip.title), String(trip.id)), [trip.id, trip.tags, trip.locationStr, trip.title]);

  // Places per day, for the little bars on the places tile
  const perDay = useMemo(() => placesPerDay(b), [b]);
  const maxDay = Math.max(1, ...perDay);

  // Short tiles fill the grid in pairs; an odd last one on two columns spans the row
  const singles: React.ReactNode[] = [];
  b.stays.forEach(s => singles.push(
    <Tile key={`s${s.id}`} className="bg-sage text-sage-ink dark:bg-sage-dark dark:text-sage" dim={dimPast && s.at.past} label={`숙소 ${s.title}`} onOpen={() => setDetail({ kind: 'stay', item: s })}>
      <span className={kicker}><BedDouble className="w-3.5 h-3.5" aria-hidden />숙소</span>
      <span className="text-[16px] font-extrabold tracking-tight leading-snug break-keep [overflow-wrap:anywhere]">{s.title}</span>
      <span className="font-mono text-meta text-black/60 dark:text-white/60 tabular-nums break-keep">{stayLabel(s.dateRange, year, range)}</span>
      {s.address && <span className="text-meta text-black/50 dark:text-white/50 break-keep [overflow-wrap:anywhere]">{s.address}</span>}
      {s.confNo && <span className="mt-auto pt-1"><CodeChip value={s.confNo} what="확인번호" /></span>}
    </Tile>,
  ));
  if (b.stays.length === 0) singles.push(
    <Tile key="s-add" className="bg-surface dark:bg-surface-dark" label="숙소 추가" onOpen={() => onOpenItem('stays', null)}>
      <span className={kicker}><BedDouble className="w-3.5 h-3.5" aria-hidden />숙소</span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-bold text-black/55 dark:text-white/55"><Plus className="w-4 h-4" aria-hidden />추가</span>
    </Tile>,
  );
  singles.push(
    <Tile key="places" className="bg-mist text-mist-ink dark:bg-mist-dark dark:text-mist" label="여행지" onOpen={() => setDetail({ kind: 'places' })}>
      <span className={kicker}><Navigation className="w-3.5 h-3.5" aria-hidden />여행지</span>
      <span className="text-[34px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{b.places.length}</span>
      {perDay.length > 1 && (
        <span className="flex items-end gap-1 h-6" aria-hidden>
          {perDay.map((n, i) => <span key={i} className="flex-1 max-w-3 rounded-full bg-current opacity-60" style={{ height: `${Math.max(18, (n / maxDay) * 100)}%` }} />)}
        </span>
      )}
      <span className="font-mono text-meta font-semibold">
        {b.focusDay.length ? `${b.phase === 'live' ? '오늘' : '첫날'} ${b.focusDay.length}곳` : '장소 보기'}
      </span>
    </Tile>,
  );
  b.transits.forEach(t => {
    const Icon = transitIcon(t);
    const { from, to } = transitEnds(t);
    singles.push(
      <Tile key={`t${t.id}`} className="bg-butter text-butter-ink dark:bg-butter-dark dark:text-butter" dim={dimPast && t.at.past} label={`교통 ${t.title}`} onOpen={() => setDetail({ kind: 'transit', item: t })}>
        <span className={kicker}><Icon className="w-3.5 h-3.5" aria-hidden />{t.ticketType || '교통'}</span>
        <span className="text-[16px] font-extrabold tracking-tight leading-snug break-keep [overflow-wrap:anywhere]">{t.title || t.route}</span>
        {(from || to) && (
          <span className="flex flex-col text-meta font-semibold leading-snug">
            {from && <span className="break-keep [overflow-wrap:anywhere]">{from}</span>}
            {to && <span className="break-keep [overflow-wrap:anywhere] text-black/55 dark:text-white/55">→ {to}</span>}
          </span>
        )}
        <span className="mt-auto font-mono text-meta text-black/60 dark:text-white/60 tabular-nums truncate">{when(t.at, t.time)}</span>
      </Tile>,
    );
  });
  otherFlights.forEach(f => singles.push(
    <Tile key={`f${f.id}`} className="bg-ink text-paper dark:bg-ink-dark dark:text-paper-dark overflow-hidden" dim={dimPast && f.at.past} label={`항공권 ${f.fromCode} ${f.toCode}`} onOpen={() => setDetail({ kind: 'flight', item: f })}>
      <FlightFace f={f} />
    </Tile>,
  ));
  const oddLast = cols === 2 && singles.length % 2 === 1;

  // One PNG of the whole board: drawn straight from the board's data (see boardImage), then the phone's
  // share sheet when it can take files, else a download
  const shareImage = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Let the spinner paint before the drawing starts
      await new Promise(r => requestAnimationFrame(() => r(null)));
      const { renderBoardImage } = await import('./boardImage');
      const blob = await renderBoardImage(b, { dark: document.documentElement.classList.contains('dark'), dimPast, art, title: trip.title, date: trip.date });
      const name = `${(trip.title || 'board').replace(/[\\/:*?"<>|]/g, '').slice(0, 40)}-board.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: trip.title }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        notify('보드 이미지를 저장했습니다.', 'success');
      }
    } catch (err) {
      console.warn('Board image failed:', err);
      notify('이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div ref={wrapRef} className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-end gap-2">
        {embedded && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openJourneyBoard(trip.id)}>
            <Maximize2 className="w-3.5 h-3.5" aria-hidden />전체 화면
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={shareImage} disabled={sharing}>
          {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Share2 className="w-3.5 h-3.5" aria-hidden />}
          이미지로 공유
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className={`grid gap-2.5 [grid-auto-flow:dense] ${cols === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {/* Journey: when, where, how much is ready, with the place drawn flat */}
          <Tile className="col-span-2 bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach overflow-hidden" label="여정 요약" onOpen={() => setDetail({ kind: 'journey' })}>
            <img src={art} alt="" aria-hidden className="absolute right-0 bottom-0 w-28 h-28 sm:w-32 sm:h-32 rounded-tl-[28px] object-cover opacity-95" />
            <span className={kicker}><MapPin className="w-3.5 h-3.5" aria-hidden />{status}{b.nights > 0 && ` · ${b.nights}박 ${b.nights + 1}일`}</span>
            <span className="pr-28 sm:pr-32 text-[28px] sm:text-[32px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">
              {b.start ? `${md(b.start)} – ${md(b.end)}` : trip.date}
            </span>
            <span className="pr-28 sm:pr-32 text-[17px] font-extrabold tracking-tight leading-tight break-keep line-clamp-2">{place.slice(0, 3).join(' · ') || trip.title}</span>
            <span className="pr-28 sm:pr-32 font-mono text-meta font-semibold tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
              <span>항공 {b.flights.length}</span><span>숙소 {b.stays.length}</span><span>교통 {b.transits.length}</span><span>장소 {b.places.length}</span>
            </span>
          </Tile>

          {/* The next stop: the one tile in red */}
          {b.next && (
            <Tile className="col-span-2 bg-surface dark:bg-surface-dark ring-2 ring-inset ring-red-600 dark:ring-red-500" label={`다음 일정 ${b.next.place}`} onOpen={() => setDetail({ kind: 'place', item: b.next! })}>
              <span className={`${kicker} !opacity-100 text-red-600 dark:text-red-400`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-live-pulse" />
                {b.phase === 'live' ? '다음 일정' : '첫 일정'} · {when(b.next.at, b.next.time)}
              </span>
              <span className="text-[20px] font-extrabold tracking-tight leading-tight break-keep [overflow-wrap:anywhere]">{b.next.place}</span>
              {b.next.memo && <span className="text-meta text-black/60 dark:text-white/60 break-keep [overflow-wrap:anywhere]">{b.next.memo}</span>}
            </Tile>
          )}

          {/* Outbound flight: a wide ink ticket */}
          {outbound ? (
            <Tile className="col-span-2 bg-ink text-paper dark:bg-ink-dark dark:text-paper-dark gap-3 overflow-hidden" dim={dimPast && outbound.at.past} label={`항공권 ${outbound.fromCode} ${outbound.toCode}`} onOpen={() => setDetail({ kind: 'flight', item: outbound })}>
              <FlightFace f={outbound} wide />
            </Tile>
          ) : (
            <Tile className="bg-surface dark:bg-surface-dark" label="항공권 추가" onOpen={() => onOpenItem('flights', null)}>
              <span className={kicker}><Plane className="w-3.5 h-3.5" aria-hidden />항공권</span>
              <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-bold text-black/55 dark:text-white/55"><Plus className="w-4 h-4" aria-hidden />추가</span>
            </Tile>
          )}

          {singles.map((node, i) => (oddLast && i === singles.length - 1
            ? <div key="odd" className="col-span-2 grid">{node}</div>
            : node))}

          {/* The day's places, one line each */}
          {b.focusDay.length > 0 && (
            <div className="col-span-2 rounded-card bg-surface dark:bg-surface-dark p-2 flex flex-col">
              <span className="px-2 pt-2 pb-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">{b.phase === 'live' ? '오늘' : '첫날'} · {dayWithWeekday(b.focusDay[0].at.date)}</span>
              {b.focusDay.slice(0, 6).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDetail({ kind: 'place', item: p })}
                  className={`flex items-center gap-3 min-h-[44px] px-2 rounded-thumb text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] ${dimPast && p.at.past ? 'opacity-55' : ''}`}
                >
                  <span className={`w-[4.5rem] shrink-0 font-mono text-meta font-semibold tabular-nums ${b.next?.id === p.id ? 'text-red-600 dark:text-red-400' : 'text-black/55 dark:text-white/55'}`}>{timeLabel(p.time) || '—'}</span>
                  <span className="flex-1 min-w-0 py-2 text-[14px] font-bold break-keep [overflow-wrap:anywhere]">{p.place}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-black/40 dark:text-white/40" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && (detail.kind === 'journey' || detail.kind === 'places' || detail.kind === 'list') && (
        <BoardSummary
          summary={detail}
          b={b}
          year={year}
          range={range}
          trip={trip}
          place={place}
          status={status}
          perDay={perDay}
          canBack={trail.length > 0}
          onBack={stepBack}
          onDrill={drillDown}
          onClose={() => setDetail(null)}
          onOpenItem={(tab, id) => { setDetail(null); onOpenItem(tab, id); }}
        />
      )}
      {detail && detail.kind !== 'journey' && detail.kind !== 'places' && detail.kind !== 'list' && (
        <BoardDetail
          detail={detail}
          tripId={trip.id}
          year={year}
          range={range}
          days={days}
          canEdit={canEdit}
          canBack={trail.length > 0}
          onBack={stepBack}
          onClose={() => setDetail(null)}
          onOpenItem={(tab, id) => { setDetail(null); onOpenItem(tab, id); }}
        />
      )}
    </div>
  );
}

interface Props extends BoardData {
  onClose: () => void;
}

/** Full-screen board, from home, the card menu or ?id=…&board=1 */
export function JourneyBoard({ onClose, ...data }: Props) {
  const { trip } = data;
  useBackToClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-sheet-open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-modal bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark overflow-y-auto overscroll-contain animate-in fade-in duration-200" role="dialog" aria-label={`${trip.title} 보드`}>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <header className="flex items-start justify-between gap-3 pb-3">
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">Board</span>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.03em] leading-[1.05] break-keep">{trip.title}</h1>
          </div>
          <IconButton icon={X} label="보드 닫기" onClick={onClose} />
        </header>
        <BoardView {...data} />
      </div>
    </div>,
    document.body,
  );
}

// ── Detail sheet: every field of one tile, with copy and map actions ──

// `long` values (an address) wrap in full; codes (booking numbers) stay on one mono line
function Row({ label, value, copyAs, long }: { label: string; value?: string | null; copyAs?: string; long?: boolean }) {
  if (!value) return null;
  const unset = value.startsWith(NO_DATE);
  return (
    <div className="flex items-start justify-between gap-3 min-h-[44px] py-3 border-b border-black/[0.06] dark:border-white/[0.08] last:border-0">
      <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50 shrink-0">{label}</span>
      {copyAs ? (
        <button type="button" onClick={() => copy(value, copyAs)} className={`inline-flex items-start gap-1.5 min-w-0 text-right hover:text-red-600 dark:hover:text-red-400 ${long ? 'text-[14px] font-semibold break-keep [overflow-wrap:anywhere]' : 'font-mono text-[15px] font-semibold tracking-[0.08em] tabular-nums'}`}>
          <span className={long ? 'min-w-0' : 'truncate'}>{value}</span><Copy className={`w-3.5 h-3.5 shrink-0 opacity-60 ${long ? 'mt-1' : ''}`} aria-hidden />
        </button>
      ) : (
        <span className={`min-w-0 text-[14px] text-right break-keep [overflow-wrap:anywhere] ${unset ? 'font-medium text-black/45 dark:text-white/45' : 'font-semibold'}`}>{value}</span>
      )}
    </div>
  );
}

function mapsUrl(name?: string, address?: string, lat?: number, lng?: number) { return mapSearchUrl(name, address, lat, lng); }

function BoardDetail({ detail, tripId, year, range, days, canEdit, canBack, onBack, onClose, onOpenItem }: {
  detail: ItemDetail;
  tripId: number;
  year: number;
  range: { start: Date; end: Date } | null;
  days: Date[];
  canEdit: boolean;
  canBack?: boolean;
  onBack?: () => void;
  onClose: () => void;
  onOpenItem: (tab: string, id: number | null) => void;
}) {
  const { kind, item } = detail;
  const [savingDay, setSavingDay] = useState<string | null>(null);
  // A flight or a ticket still on the YYYY.MM.DD template can be given one of the journey's days right here
  const undated = (kind === 'flight' || kind === 'transit') && isPlaceholderDate(item.date);
  const pickDay = async (d: Date) => {
    if (savingDay || (kind !== 'flight' && kind !== 'transit')) return;
    const text = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    setSavingDay(text);
    try {
      await setDoc(doc(db, 'users', 'public', kind === 'flight' ? 'flights' : 'transits', String(item.id)), { date: text, tripId: item.tripId ?? tripId }, { merge: true });
      notify(`${md(d)}로 정했습니다.`, 'success');
      onClose();
    } catch (err) {
      console.error('Setting the date failed:', err);
      notify('날짜를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setSavingDay(null);
    }
  };
  let title = '';
  let kickerText = '';
  let rows: React.ReactNode = null;
  let map: string | null = null;

  if (kind === 'flight') {
    title = `${item.fromCode || '—'} → ${item.toCode || '—'}`;
    kickerText = item.title || '항공권';
    rows = <>
      <Row label="예약번호" value={item.pnr} copyAs="예약번호" />
      <Row label="편명" value={item.flightNo} copyAs="편명" />
      <Row label="날짜" value={dateText(item.date)} />
      <Row label="출발" value={[timeLabel(item.fromTime), item.fromTerminal && `터미널 ${item.fromTerminal}`].filter(Boolean).join(' · ')} />
      <Row label="도착" value={[timeLabel(item.toTime), item.toTerminal && `터미널 ${item.toTerminal}`].filter(Boolean).join(' · ')} />
      <Row label="경유" value={[item.layoverCode, timeLabel(item.layoverTime)].filter(Boolean).join(' · ')} />
      <Row label="좌석" value={item.seat} />
    </>;
  } else if (kind === 'stay') {
    title = item.title;
    kickerText = item.status || '숙소';
    rows = <>
      <Row label="확인번호" value={item.confNo} copyAs="확인번호" />
      <Row label="기간" value={stayLabel(item.dateRange, year, range)} />
      <Row label="주소" value={item.address} copyAs="주소" long />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.title, item.address, item.lat, item.lng);
  } else if (kind === 'transit') {
    title = item.title || item.route;
    kickerText = item.ticketType || '교통';
    rows = <>
      <Row label="예약번호" value={item.bookingRef} copyAs="예약번호" />
      <Row label="구간" value={item.route} />
      <Row label="날짜" value={[dateText(item.date), timeLabel(item.time)].filter(Boolean).join(' · ')} />
      <Row label="좌석" value={item.seat} />
      <Row label="차량" value={[item.carModel, item.carNumber].filter(Boolean).join(' · ')} />
      <Row label="탑승" value={item.boardingPlace || item.departPlace} />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.boardingPlace || item.departPlace, undefined, item.boardingLat ?? item.departLat, item.boardingLng ?? item.departLng);
  } else {
    title = item.place;
    kickerText = [item.dayKey, timeLabel(item.time)].filter(Boolean).join(' · ');
    rows = <>
      <Row label="주소" value={item.location} copyAs="주소" long />
      <Row label="영업" value={item.hours} />
      <Row label="비용" value={item.cost && item.cost !== '-' ? item.cost : ''} />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.place, item.location, item.lat, item.lng);
  }

  return (
    <Sheet label={title} onClose={onClose} tone="paper" zIndex={10001} panelClassName="sm:max-w-md max-h-[86dvh]">
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain" data-sheet-open>
        <div className="flex items-start gap-2 px-1">
          {canBack && <IconButton icon={ChevronLeft} label="목록으로" size="sm" onClick={onBack} />}
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">{kickerText}</span>
            <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{title}</h2>
          </div>
        </div>
        <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-1">{rows}</section>
        {undated && canEdit && days.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="날짜 정하기">
            <span className="px-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">날짜 정하기</span>
            <div className="flex flex-wrap gap-1.5">
              {days.map(d => {
                const label = dayWithWeekday(d);
                return (
                  <Chip key={d.getTime()} size="sm" onClick={() => { void pickDay(d); }} disabled={!!savingDay}>{label}</Chip>
                );
              })}
            </div>
          </section>
        )}
        <div className="flex flex-wrap gap-2">
          {map && (
            <a href={map} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <MapPin className="w-3.5 h-3.5" aria-hidden />지도
            </a>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenItem(TAB[kind], item.id)}>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />여정에서 열기
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ── Summary drawers: the journey, its places, or one kind of booking, in short lists that open the full drawer ──

/** One tappable line of a summary: leading label, text, chevron */
function SummaryLine({ lead, text, sub, onClick, accent, dim }: { lead?: React.ReactNode; text: string; sub?: string; onClick: () => void; accent?: boolean; dim?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 min-h-[48px] px-1 py-2 text-left border-b border-black/[0.06] dark:border-white/[0.08] last:border-0 ${dim ? 'opacity-55' : ''}`}
    >
      {lead !== undefined && (
        <span className={`w-12 shrink-0 font-mono text-meta font-semibold tabular-nums ${accent ? 'text-red-600 dark:text-red-400' : 'text-black/55 dark:text-white/55'}`}>{lead}</span>
      )}
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-[14px] font-bold break-keep [overflow-wrap:anywhere]">{text}</span>
        {sub && <span className="text-meta text-black/55 dark:text-white/55 break-keep [overflow-wrap:anywhere]">{sub}</span>}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-black/35 dark:text-white/35" aria-hidden />
    </button>
  );
}

function BoardSummary({ summary, b, year, range, trip, place, status, perDay, canBack, onBack, onDrill, onClose, onOpenItem }: {
  summary: SummaryDetail;
  b: BoardModel;
  year: number;
  range: { start: Date; end: Date } | null;
  trip: Trip | Plan;
  place: string[];
  status: string;
  perDay: number[];
  canBack: boolean;
  onBack: () => void;
  onDrill: (d: Detail) => void;
  onClose: () => void;
  onOpenItem: (tab: string, id: number | null) => void;
}) {
  let kickerText = '';
  let title = '';
  let body: React.ReactNode = null;
  let tab: string = 'timeline';

  if (summary.kind === 'journey') {
    kickerText = [status, b.nights > 0 && `${b.nights}박 ${b.nights + 1}일`].filter(Boolean).join(' · ');
    title = trip.title;
    const counts: { icon: React.ReactNode; label: string; n: number; open: () => void }[] = [
      { icon: <Plane className="w-4 h-4" aria-hidden />, label: '항공', n: b.flights.length, open: () => onDrill({ kind: 'list', of: 'flight' }) },
      { icon: <BedDouble className="w-4 h-4" aria-hidden />, label: '숙소', n: b.stays.length, open: () => onDrill({ kind: 'list', of: 'stay' }) },
      { icon: <TrainFront className="w-4 h-4" aria-hidden />, label: '교통', n: b.transits.length, open: () => onDrill({ kind: 'list', of: 'transit' }) },
      { icon: <Navigation className="w-4 h-4" aria-hidden />, label: '장소', n: b.places.length, open: () => onDrill({ kind: 'places' }) },
    ];
    body = (
      <>
        <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-1">
          <Row label="기간" value={b.start ? `${md(b.start)} – ${md(b.end)}` : trip.date} />
          <Row label="여행지" value={place.slice(0, 3).join(' · ')} />
          <Row label="동행" value={trip.members?.length ? trip.members.join(', ') : ''} />
        </section>
        <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-1">
          {counts.map(c => (
            <button
              key={c.label}
              type="button"
              disabled={c.n === 0}
              onClick={c.open}
              className="w-full flex items-center gap-3 min-h-[48px] text-left border-b border-black/[0.06] dark:border-white/[0.08] last:border-0 disabled:opacity-45"
            >
              <span className="text-black/55 dark:text-white/55">{c.icon}</span>
              <span className="flex-1 text-[14px] font-bold">{c.label}</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums">{c.n}</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-black/35 dark:text-white/35" aria-hidden />
            </button>
          ))}
        </section>
        {perDay.length > 1 && (
          <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-3 flex flex-col gap-2">
            <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">일자별 장소</span>
            <span className="flex items-end gap-1 h-8" aria-hidden>
              {perDay.map((n, i) => <span key={i} className="flex-1 max-w-4 rounded-full bg-mist-dark/60 dark:bg-mist/60" style={{ height: `${Math.max(18, (n / Math.max(1, ...perDay)) * 100)}%` }} />)}
            </span>
          </section>
        )}
      </>
    );
  } else if (summary.kind === 'places') {
    kickerText = `장소 ${b.places.length}곳`;
    title = '여행지';
    body = <PlacesByDay b={b} onDrill={onDrill} />;
  } else {
    const of = summary.of;
    tab = TAB[of];
    if (of === 'flight') {
      kickerText = `항공 ${b.flights.length}`;
      title = '항공권';
      body = <section className="rounded-card bg-surface dark:bg-surface-dark px-3 py-1">{b.flights.map(f => (
        <SummaryLine key={f.id} text={`${f.fromCode || '—'} → ${f.toCode || '—'}`} sub={[when(f.at, f.fromTime), f.flightNo].filter(Boolean).join(' · ')} dim={b.phase !== 'past' && f.at.past} onClick={() => onDrill({ kind: 'flight', item: f })} />
      ))}</section>;
    } else if (of === 'stay') {
      kickerText = `숙소 ${b.stays.length}`;
      title = '숙소';
      body = <section className="rounded-card bg-surface dark:bg-surface-dark px-3 py-1">{b.stays.map(st => (
        <SummaryLine key={st.id} text={st.title} sub={stayLabel(st.dateRange, year, range)} dim={b.phase !== 'past' && st.at.past} onClick={() => onDrill({ kind: 'stay', item: st })} />
      ))}</section>;
    } else {
      kickerText = `교통 ${b.transits.length}`;
      title = '교통';
      body = <section className="rounded-card bg-surface dark:bg-surface-dark px-3 py-1">{b.transits.map(t => (
        <SummaryLine key={t.id} text={t.title || t.route} sub={when(t.at, t.time)} dim={b.phase !== 'past' && t.at.past} onClick={() => onDrill({ kind: 'transit', item: t })} />
      ))}</section>;
    }
  }

  return (
    <Sheet label={title} onClose={onClose} tone="paper" zIndex={10001} panelClassName="sm:max-w-md max-h-[86dvh]">
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain" data-sheet-open>
        <div className="flex items-start gap-2 px-1">
          {canBack && <IconButton icon={ChevronLeft} label="뒤로" size="sm" onClick={onBack} />}
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">{kickerText}</span>
            <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{title}</h2>
          </div>
        </div>
        {body}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenItem(tab, null)}>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />여정에서 열기
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ── The places drawer: day by day, each day folded to one line, an open day split into morning and afternoon ──

type DayGroup = { key: string; date: Date | null; items: BoardModel['places'] };

function PlacesByDay({ b, onDrill }: { b: BoardModel; onDrill: (d: Detail) => void }) {
  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    b.places.forEach(p => {
      const last = out[out.length - 1];
      if (last && last.key === p.dayKey) last.items.push(p);
      else out.push({ key: p.dayKey, date: p.at.date, items: [p] });
    });
    return out;
  }, [b.places]);

  const todayMs = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  // A short list opens whole; a long one opens the day that matters (today on the trip, else the first) and folds the rest
  const [open, setOpen] = useState<Set<string>>(() => {
    if (b.places.length <= 24) return new Set(groups.map(g => g.key));
    const focus = b.focusDay[0]?.at.date?.getTime();
    const g = groups.find(x => x.date && x.date.getTime() === focus) ?? groups[0];
    return new Set(g ? [g.key] : []);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());

  const toggle = (key: string) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  // A day chip opens that day and brings it under the chip row
  const jump = (key: string) => {
    setOpen(prev => new Set(prev).add(key));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const scroller = rootRef.current?.closest('[data-sheet-open]') as HTMLElement | null;
      const section = sections.current.get(key);
      const chips = rootRef.current?.firstElementChild as HTMLElement | null;
      if (!scroller || !section) return;
      // The day's header lands a few pixels under the sticky chip row
      const top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (chips?.offsetHeight ?? 0) + 4;
      scroller.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }));
  };
  const allOpen = groups.length > 0 && open.size === groups.length;

  if (groups.length === 0) {
    return <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-5 text-[14px] text-black/60 dark:text-white/60">아직 정한 장소가 없어요.</section>;
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 flex items-center gap-2 bg-paper dark:bg-paper-dark">
        <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto hide-scrollbar" role="group" aria-label="날짜로 이동">
          {groups.map((g, i) => (
            <Chip key={g.key} size="sm" onClick={() => jump(g.key)} className={b.phase !== 'past' && g.items.every(p => p.at.past) ? 'opacity-60' : ''}>
              Day {i + 1}<span className="font-mono opacity-70 tabular-nums">{g.date ? md(g.date) : ''}</span>
            </Chip>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map(g => g.key)))}>
          {allOpen ? '모두 접기' : '모두 펼치기'}
        </button>
      </div>

      {groups.map((g, i) => {
        const isOpen = open.has(g.key);
        const isToday = g.date?.getTime() === todayMs;
        const past = b.phase !== 'past' && g.items.every(p => p.at.past);
        const am = g.items.filter(p => { const m = clockTime(p.time).minutes; return m >= 0 && m < 720; });
        const pm = g.items.filter(p => clockTime(p.time).minutes >= 720);
        const none = g.items.filter(p => clockTime(p.time).minutes < 0);
        const byClock = (x: typeof am[number], y: typeof am[number]) => clockTime(x.time).minutes - clockTime(y.time).minutes;
        const parts: { label: string; items: typeof am }[] = [
          { label: '오전', items: [...am].sort(byClock) },
          { label: '오후', items: [...pm].sort(byClock) },
          { label: '시간 미정', items: none },
        ].filter(x => x.items.length > 0);
        return (
          <section key={g.key} ref={el => { if (el) sections.current.set(g.key, el); else sections.current.delete(g.key); }} className={`rounded-card bg-surface dark:bg-surface-dark ${past ? 'opacity-70' : ''}`}>
            <button
              type="button"
              onClick={() => toggle(g.key)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 min-h-[52px] px-4 py-2 text-left rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55 flex items-center gap-2">
                  Day {i + 1} · {g.date ? dayWithWeekday(g.date) : g.key}
                  {isToday && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-500" aria-hidden />오늘</span>}
                </span>
                {!isOpen && (
                  <span className="text-meta text-black/60 dark:text-white/60 truncate">
                    {[`${g.items.length}곳`, am.length > 0 && `오전 ${am.length}`, pm.length > 0 && `오후 ${pm.length}`, none.length > 0 && `시간 미정 ${none.length}`].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              <span className="font-mono text-[15px] font-semibold tabular-nums">{g.items.length}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-black/45 dark:text-white/45 transition-transform duration-base ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {isOpen && (
              <div className="px-3 pb-2 flex flex-col">
                {parts.map(part => (
                  <div key={part.label} className="flex flex-col">
                    <span className="flex items-center gap-2 h-6 px-1 mt-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">
                      {part.label} · {part.items.length}
                      <span className="flex-1 h-px bg-black/[0.07] dark:bg-white/[0.1]" aria-hidden />
                    </span>
                    {part.items.map(p => {
                      const clock = clockTime(p.time);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onDrill({ kind: 'place', item: p })}
                          title={p.place}
                          className={`w-full flex items-center gap-3 min-h-10 px-1 rounded-thumb text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] ${b.phase !== 'past' && p.at.past ? 'opacity-55' : ''}`}
                        >
                          <span className={`w-11 shrink-0 font-mono text-meta font-semibold tabular-nums ${b.next?.id === p.id ? 'text-red-600 dark:text-red-400' : 'text-black/55 dark:text-white/55'}`}>{clock.minutes >= 0 ? clock.hm : '—'}</span>
                          <span className="flex-1 min-w-0 truncate text-[14px] font-bold">{p.place}</span>
                          <ChevronRight className="w-4 h-4 shrink-0 text-black/35 dark:text-white/35" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
