import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight, BedDouble, Bus, Car, CarTaxiFront, Copy, MapPin, Navigation, Plane, Plus, TrainFront, X,
} from 'lucide-react';
import type { FlightItem, Plan, StayItem, TimelineData, TimelineItem, TransitItem, Trip } from '../../types';
import { Sheet } from '../Sheet';
import { IconButton } from '../ui/IconButton';
import { useBackToClose } from '../../utils/overlayHistory';
import { notify } from '../../utils/feedback';
import { buildBoard, md, type BoardEntry } from './boardData';

// Journey board: a journey's flights, stays, transport and places on one screen, as long and
// short tiles. Made for the airport counter, the hotel desk and the station: the codes people
// ask for are large, a tap copies them, and a tile opens its full details.
// Colour follows spec 4.2: the head tile wears the journey tint (peach), flights are ink
// tickets, places are mist, and only the next stop is red. Kinds are told apart by icon and label.

type Detail =
  | { kind: 'flight'; item: FlightItem }
  | { kind: 'stay'; item: StayItem }
  | { kind: 'transit'; item: TransitItem }
  | { kind: 'place'; item: TimelineItem & { dayKey: string } };

const TAB = { flight: 'flights', stay: 'stays', transit: 'transit', place: 'timeline' } as const;

interface Props {
  trip: Trip | Plan;
  timelineData: TimelineData;
  flights: FlightItem[];
  stays: StayItem[];
  transits: TransitItem[];
  onClose: () => void;
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
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[13px] font-semibold tracking-[0.12em] tabular-nums transition-colors ${
        tone === 'ink' ? 'bg-white/12 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20' : 'bg-black/[0.06] hover:bg-black/[0.1] dark:bg-white/10 dark:hover:bg-white/15'
      }`}
    >
      {value}
      <Copy className="w-3 h-3 opacity-60" aria-hidden />
    </button>
  );
}

const tileBase = 'tgl-press relative rounded-card p-4 flex flex-col justify-between gap-3 text-left min-w-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600';
const kicker = 'font-mono text-micro font-bold uppercase tracking-[0.14em] opacity-70 flex items-center gap-1.5';

function Tile({ className = '', onOpen, label, children, past }: { className?: string; onOpen: () => void; label: string; children: React.ReactNode; past?: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`${tileBase} ${past ? 'opacity-55' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function when(at: BoardEntry, time?: string) {
  return [md(at.date), time].filter(Boolean).join(' ');
}

export function JourneyBoard({ trip, timelineData, flights, stays, transits, onClose, onOpenItem }: Props) {
  const b = useMemo(() => buildBoard(trip, timelineData, flights, stays, transits), [trip, timelineData, flights, stays, transits]);
  const [detail, setDetail] = useState<Detail | null>(null);
  useBackToClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !detail) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, onClose]);

  const place = (trip.locationStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const status =
    b.phase === 'live' ? `DAY ${b.day}/${b.totalDays}` :
    b.phase === 'upcoming' ? (b.daysLeft === 0 ? 'D-DAY' : b.daysLeft > 0 ? `D-${b.daysLeft}` : '계획') :
    '다녀옴';
  const [outbound, ...otherFlights] = b.flights;

  return createPortal(
    <div className="fixed inset-0 z-modal bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark overflow-y-auto overscroll-contain animate-in fade-in duration-200" role="dialog" aria-label={`${trip.title} 보드`}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        {/* Head: the journey in two tones, the close button on the right */}
        <header className="flex items-start justify-between gap-3 pb-4">
          <div className="min-w-0 flex flex-col gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">Board · {trip.date}</span>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.03em] leading-[1.05] break-keep">
              {trip.title}
              <br />
              <span className="text-black/35 dark:text-white/35 tabular-nums">{status}</span>
            </h1>
          </div>
          <IconButton icon={X} label="보드 닫기" onClick={onClose} />
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 [grid-auto-flow:dense] auto-rows-[minmax(7.5rem,auto)]">
          {/* Journey: where, when, how much is ready */}
          <Tile className="col-span-2 bg-peach text-peach-ink dark:bg-peach-dark dark:text-peach" label="여정 요약" onOpen={() => onOpenItem('summary', null)}>
            <span className={kicker}><MapPin className="w-3.5 h-3.5" aria-hidden />{b.start ? `${md(b.start)} – ${md(b.end)}` : trip.date}{b.nights > 0 && ` · ${b.nights}박`}</span>
            <span className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{place.slice(0, 3).join(' · ') || trip.title}</span>
            <span className="font-mono text-meta font-semibold tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
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
              <span className="text-[20px] font-extrabold tracking-tight leading-tight break-keep line-clamp-2">{b.next.place}</span>
              {b.next.memo && <span className="text-meta text-black/60 dark:text-white/60 line-clamp-1">{b.next.memo}</span>}
            </Tile>
          )}

          {/* Outbound flight: a wide ink ticket */}
          {outbound ? (
            <Tile className="col-span-2 bg-ink text-paper dark:bg-ink-dark dark:text-paper-dark" past={outbound.at.past} label={`항공권 ${outbound.fromCode} ${outbound.toCode}`} onOpen={() => setDetail({ kind: 'flight', item: outbound })}>
              <span className={kicker}><Plane className="w-3.5 h-3.5" aria-hidden />{outbound.title || '항공권'}{outbound.flightNo && ` · ${outbound.flightNo}`}</span>
              <span className="flex items-center gap-3 text-[34px] sm:text-[40px] font-extrabold tracking-[-0.02em] leading-none">
                <span>{outbound.fromCode || '—'}</span>
                <span className="flex-1 h-0 border-t-[1.5px] border-dashed border-current opacity-35" aria-hidden />
                <span>{outbound.toCode || '—'}</span>
              </span>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-meta font-semibold tabular-nums opacity-80">
                  {[md(outbound.at.date), outbound.fromTime && outbound.toTime ? `${outbound.fromTime} → ${outbound.toTime}` : outbound.fromTime, outbound.seat && `좌석 ${outbound.seat}`].filter(Boolean).join(' · ')}
                </span>
                <CodeChip value={outbound.pnr} what="예약번호" tone="ink" />
              </span>
            </Tile>
          ) : (
            <Tile className="bg-surface dark:bg-surface-dark" label="항공권 추가" onOpen={() => onOpenItem('flights', null)}>
              <span className={kicker}><Plane className="w-3.5 h-3.5" aria-hidden />항공권</span>
              <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-black/55 dark:text-white/55"><Plus className="w-4 h-4" aria-hidden />추가</span>
            </Tile>
          )}

          {/* Stays: tall tiles with the confirmation number */}
          {b.stays.map(s => (
            <Tile key={`s${s.id}`} className="row-span-2 bg-surface dark:bg-surface-dark" past={s.at.past} label={`숙소 ${s.title}`} onOpen={() => setDetail({ kind: 'stay', item: s })}>
              <span className={kicker}><BedDouble className="w-3.5 h-3.5" aria-hidden />숙소</span>
              <span className="flex flex-col gap-1 min-w-0">
                <span className="text-[17px] font-extrabold tracking-tight leading-snug break-keep line-clamp-3">{s.title}</span>
                <span className="font-mono text-meta text-black/60 dark:text-white/60 tabular-nums">{s.dateRange}</span>
                {s.address && <span className="text-meta text-black/55 dark:text-white/55 line-clamp-2 break-keep">{s.address}</span>}
              </span>
              <CodeChip value={s.confNo} what="확인번호" />
            </Tile>
          ))}
          {b.stays.length === 0 && (
            <Tile className="bg-surface dark:bg-surface-dark" label="숙소 추가" onOpen={() => onOpenItem('stays', null)}>
              <span className={kicker}><BedDouble className="w-3.5 h-3.5" aria-hidden />숙소</span>
              <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-black/55 dark:text-white/55"><Plus className="w-4 h-4" aria-hidden />추가</span>
            </Tile>
          )}

          {/* Places: count and the day in focus */}
          <Tile className="bg-mist text-mist-ink dark:bg-mist-dark dark:text-mist" label="여행지" onOpen={() => onOpenItem('timeline', null)}>
            <span className={kicker}><Navigation className="w-3.5 h-3.5" aria-hidden />여행지</span>
            <span className="text-[34px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">{b.places.length}</span>
            <span className="font-mono text-meta font-semibold">
              {b.focusDay.length ? `${b.phase === 'live' ? '오늘' : '첫날'} ${b.focusDay.length}곳` : '일정에서 보기'}
            </span>
          </Tile>

          {/* Transport: short tiles */}
          {b.transits.map(t => {
            const Icon = transitIcon(t);
            return (
              <Tile key={`t${t.id}`} className="bg-surface dark:bg-surface-dark" past={t.at.past} label={`교통 ${t.title}`} onOpen={() => setDetail({ kind: 'transit', item: t })}>
                <span className={kicker}><Icon className="w-3.5 h-3.5" aria-hidden />{t.ticketType || '교통'}</span>
                <span className="text-[16px] font-extrabold tracking-tight leading-snug break-keep line-clamp-2">{t.title || t.route}</span>
                <span className="font-mono text-meta text-black/60 dark:text-white/60 tabular-nums truncate">{when(t.at, t.time)}</span>
              </Tile>
            );
          })}

          {/* The other flights: short tickets */}
          {otherFlights.map(f => (
            <Tile key={`f${f.id}`} className="bg-ink text-paper dark:bg-ink-dark dark:text-paper-dark" past={f.at.past} label={`항공권 ${f.fromCode} ${f.toCode}`} onOpen={() => setDetail({ kind: 'flight', item: f })}>
              <span className={kicker}><Plane className="w-3.5 h-3.5" aria-hidden />{f.flightNo || '항공권'}</span>
              <span className="text-[22px] font-extrabold tracking-tight leading-none">{f.fromCode || '—'} → {f.toCode || '—'}</span>
              <span className="font-mono text-meta tabular-nums opacity-80 truncate">{when(f.at, f.fromTime)}</span>
            </Tile>
          ))}

          {/* The day's places, one line each */}
          {b.focusDay.length > 0 && (
            <div className="col-span-2 rounded-card bg-surface dark:bg-surface-dark p-2 flex flex-col">
              <span className="px-2 pt-2 pb-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">{b.phase === 'live' ? '오늘' : '첫날'} · {md(b.focusDay[0].at.date)}</span>
              {b.focusDay.slice(0, 6).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDetail({ kind: 'place', item: p })}
                  className={`flex items-center gap-3 min-h-[44px] px-2 rounded-thumb text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] ${p.at.past ? 'opacity-55' : ''}`}
                >
                  <span className={`w-12 shrink-0 font-mono text-meta font-semibold tabular-nums ${b.next?.id === p.id ? 'text-red-600 dark:text-red-400' : 'text-black/55 dark:text-white/55'}`}>{p.time ? p.time.replace(/\s?(AM|PM)$/i, '') : '—'}</span>
                  <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{p.place}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-black/40 dark:text-white/40" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && <BoardDetail detail={detail} onClose={() => setDetail(null)} onOpenItem={(tab, id) => { setDetail(null); onOpenItem(tab, id); }} />}
    </div>,
    document.body,
  );
}

// ── Detail sheet: every field of one tile, with copy and map actions ──

function Row({ label, value, copyAs }: { label: string; value?: string | null; copyAs?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 min-h-[44px] border-b border-black/[0.06] dark:border-white/[0.08] last:border-0">
      <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/50 dark:text-white/50 shrink-0">{label}</span>
      {copyAs ? (
        <button type="button" onClick={() => copy(value, copyAs)} className="inline-flex items-center gap-1.5 min-w-0 font-mono text-[15px] font-semibold tracking-[0.08em] tabular-nums text-right hover:text-red-600 dark:hover:text-red-400">
          <span className="truncate">{value}</span><Copy className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden />
        </button>
      ) : (
        <span className="min-w-0 text-[14px] font-semibold text-right break-keep">{value}</span>
      )}
    </div>
  );
}

function mapsUrl(q: string | undefined, lat?: number, lng?: number) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

function BoardDetail({ detail, onClose, onOpenItem }: { detail: Detail; onClose: () => void; onOpenItem: (tab: string, id: number | null) => void }) {
  const { kind, item } = detail;
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
      <Row label="날짜" value={item.date} />
      <Row label="출발" value={[item.fromTime, item.fromTerminal && `터미널 ${item.fromTerminal}`].filter(Boolean).join(' · ')} />
      <Row label="도착" value={[item.toTime, item.toTerminal && `터미널 ${item.toTerminal}`].filter(Boolean).join(' · ')} />
      <Row label="경유" value={[item.layoverCode, item.layoverTime].filter(Boolean).join(' · ')} />
      <Row label="좌석" value={item.seat} />
    </>;
  } else if (kind === 'stay') {
    title = item.title;
    kickerText = item.status || '숙소';
    rows = <>
      <Row label="확인번호" value={item.confNo} copyAs="확인번호" />
      <Row label="기간" value={item.dateRange} />
      <Row label="주소" value={item.address} copyAs="주소" />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.address || item.title, item.lat, item.lng);
  } else if (kind === 'transit') {
    title = item.title || item.route;
    kickerText = item.ticketType || '교통';
    rows = <>
      <Row label="예약번호" value={item.bookingRef} copyAs="예약번호" />
      <Row label="구간" value={item.route} />
      <Row label="날짜" value={[item.date, item.time].filter(Boolean).join(' ')} />
      <Row label="좌석" value={item.seat} />
      <Row label="차량" value={[item.carModel, item.carNumber].filter(Boolean).join(' · ')} />
      <Row label="탑승" value={item.boardingPlace || item.departPlace} />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.boardingPlace || item.departPlace, item.boardingLat ?? item.departLat, item.boardingLng ?? item.departLng);
  } else {
    title = item.place;
    kickerText = [item.dayKey, item.time].filter(Boolean).join(' · ');
    rows = <>
      <Row label="주소" value={item.location} copyAs="주소" />
      <Row label="영업" value={item.hours} />
      <Row label="비용" value={item.cost && item.cost !== '-' ? item.cost : ''} />
      <Row label="메모" value={item.memo} />
    </>;
    map = mapsUrl(item.location || item.place, item.lat, item.lng);
  }

  return (
    <Sheet label={title} onClose={onClose} tone="paper" zIndex={10001} panelClassName="sm:max-w-md max-h-[86dvh]">
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-1 px-1">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55">{kickerText}</span>
          <h2 className="text-[22px] font-extrabold tracking-tight leading-tight break-keep">{title}</h2>
        </div>
        <section className="rounded-card bg-surface dark:bg-surface-dark px-4 py-1">{rows}</section>
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
