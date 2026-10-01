import React, { useState, useMemo, useEffect } from 'react';
import { Plane, BedDouble, ExternalLink, SlidersHorizontal, ArrowRight, X, Check } from 'lucide-react';
import {
  BookingSearchContext,
  extractCleanCityName,
  inferAirportCode,
  buildSkyscannerFlightUrl,
  buildNaverFlightUrl,
  buildGoogleFlightsUrl,
  buildAgodaUrl,
  buildBookingComUrl,
  buildAirbnbUrl,
  buildAgodaHotelUrl,
  buildBookingComHotelUrl,
  buildGoogleHotelUrl,
  bookingContextFromTrip
} from '../utils/bookingDeepLinks';
import { Sheet, useSheetClose } from './Sheet';
import { Segment } from './ui/Segment';
import { IconButton } from './ui/IconButton';
import type { PastStay } from '../utils/pastStays';

// Smart booking (v1.3.5): the journey's route, dates and party become search links on the booking
// sites. A sheet on phones, a dialog on desktop; flights and stays switch with one segment.

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  startDate?: string;
  endDate?: string;
  memberCount?: number;
  initialFromCode?: string;
  initialToCode?: string;
  /** Which list opens first (the tab it was opened from) */
  initialKind?: 'flight' | 'stay';
  /** Stays from earlier journeys at this place, offered for rebooking */
  pastStays?: PastStay[];
}

type Kind = 'flight' | 'stay';

function formatShortDate(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
  return d;
}

export function QuickBookingModal(props: QuickBookingModalProps) {
  // Mount the content only while open so its hooks always run in the same order
  if (!props.isOpen) return null;
  return (
    <Sheet onClose={props.onClose} label="스마트 부킹" zIndex={9999} panelClassName="sm:max-w-lg max-h-[92dvh]">
      <QuickBookingContent {...props} />
    </Sheet>
  );
}

const fieldCls = 'w-full h-10 px-3.5 rounded-full bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 text-sm font-bold outline-none focus:border-black/50 dark:focus:border-white/50 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/50 dark:text-white/50 px-1">{label}</span>
      {children}
    </label>
  );
}

function QuickBookingContent({
  destination,
  startDate = '',
  endDate = '',
  memberCount = 1,
  initialFromCode = 'ICN',
  initialToCode = '',
  initialKind = 'flight',
  pastStays = [],
}: QuickBookingModalProps) {
  const close = useSheetClose();

  // Editable search terms: the pure city name ("후쿠오카", not "JAPAN, 후쿠오카")
  const initialCleanCity = extractCleanCityName(destination) || 'Tokyo';
  const [dest, setDest] = useState<string>(initialCleanCity);
  const [originAirport, setOriginAirport] = useState<string>(initialFromCode || 'ICN');
  const [destAirport, setDestAirport] = useState<string>(initialToCode || inferAirportCode(initialCleanCity));

  useEffect(() => {
    if (destination) {
      const cleaned = extractCleanCityName(destination) || 'Tokyo';
      setDest(cleaned);
      if (!initialToCode) setDestAirport(inferAirportCode(cleaned));
    }
  }, [destination, initialToCode]);
  const [depDate, setDepDate] = useState<string>(() => startDate ? startDate.replace(/\./g, '-') : bookingContextFromTrip({}, null).departDate);
  const [retDate, setRetDate] = useState<string>(() => endDate ? endDate.replace(/\./g, '-') : bookingContextFromTrip({}, null).returnDate || '');
  const [adults, setAdults] = useState<number>(Math.max(1, memberCount));
  const [kind, setKind] = useState<Kind>(initialKind);
  const [editing, setEditing] = useState(false);
  // A hotel picked from the ones stayed at before: the search then asks for that hotel by name
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const picked = pastStays.find(p => p.key === pickedKey) || null;

  const searchCtx: BookingSearchContext = useMemo(() => ({
    destination: dest,
    originAirport,
    destinationAirport: destAirport,
    departDate: depDate,
    returnDate: retDate,
    adults,
  }), [dest, originAirport, destAirport, depDate, retDate, adults]);

  const providers = useMemo(() => kind === 'flight'
    ? [
        { name: '스카이스캐너', note: '전 세계 최저가 비교', url: buildSkyscannerFlightUrl(searchCtx) },
        { name: '네이버 항공권', note: '국내 카드사 할인', url: buildNaverFlightUrl(searchCtx) },
        { name: '구글 플라이트', note: '가격 변동 추이', url: buildGoogleFlightsUrl(searchCtx) },
      ]
    : picked
    ? [
        { name: '아고다', note: `${picked.title} · 이 여정 날짜로 검색`, url: buildAgodaHotelUrl(searchCtx, picked.title) },
        { name: '부킹닷컴', note: `${picked.title} · 이 여정 날짜로 검색`, url: buildBookingComHotelUrl(searchCtx, picked.title) },
        { name: '구글 호텔', note: `${picked.title} · 가격 비교`, url: buildGoogleHotelUrl(searchCtx, picked.title) },
      ]
    : [
        { name: '아고다', note: '호텔 · 리조트 특가', url: buildAgodaUrl(searchCtx) },
        { name: '부킹닷컴', note: '무료 취소 · 전 세계', url: buildBookingComUrl(searchCtx) },
        { name: '에어비앤비', note: '현지 숙소 · 독채', url: buildAirbnbUrl(searchCtx) },
      ], [kind, searchCtx, picked]);

  const dates = `${formatShortDate(depDate)}${retDate ? ` – ${formatShortDate(retDate)}` : ''}`;

  return (
    <div className="flex flex-col min-h-0 text-ink dark:text-ink-dark">
      {/* Head: the route in large type, dates and party below */}
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 shrink-0">
        <div className="min-w-0 flex flex-col gap-1.5">
          <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/50 dark:text-white/50">Smart booking</span>
          <h2 className="flex items-center gap-2 text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-none">
            <span>{originAirport || '---'}</span>
            <ArrowRight className="w-5 h-5 text-black/40 dark:text-white/40 shrink-0" aria-hidden />
            <span>{destAirport || '---'}</span>
          </h2>
          <span className="text-sm text-black/60 dark:text-white/60 truncate">
            {dest} · <span className="font-mono tabular-nums">{dates}</span> · 성인 {adults}명
          </span>
        </div>
        <IconButton icon={X} label="닫기" size="sm" onClick={close} />
      </div>

      <div className="flex flex-col gap-4 px-5 sm:px-6 pb-6 overflow-y-auto overscroll-contain">
        {/* Search terms: folded to the line above until asked for */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEditing(v => !v)}
            aria-expanded={editing}
            className="self-start btn btn-secondary btn-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
            조건 수정
          </button>
          {editing && (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 animate-in fade-in duration-200">
              <Field label="출발 공항">
                <input type="text" value={originAirport} onChange={(e) => setOriginAirport(e.target.value.toUpperCase())} className={`${fieldCls} font-mono uppercase`} placeholder="ICN" />
              </Field>
              <Field label="도착 공항">
                <input type="text" value={destAirport} onChange={(e) => setDestAirport(e.target.value.toUpperCase())} className={`${fieldCls} font-mono uppercase`} placeholder="TYO" />
              </Field>
              <Field label="숙소 도시">
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => { setDest(e.target.value); setDestAirport(inferAirportCode(e.target.value)); }}
                  className={fieldCls}
                  placeholder="Tokyo"
                />
              </Field>
              <Field label="성인">
                <input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))} className={`${fieldCls} font-mono`} />
              </Field>
              <Field label="가는 날 · 체크인">
                <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} className={`${fieldCls} font-mono min-w-0`} />
              </Field>
              <Field label="오는 날 · 체크아웃">
                <input type="date" value={retDate} onChange={(e) => setRetDate(e.target.value)} className={`${fieldCls} font-mono min-w-0`} />
              </Field>
            </div>
          )}
        </div>

        <Segment
          block
          ariaLabel="검색 종류"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'flight', label: '항공권', icon: Plane },
            { value: 'stay', label: '숙소', icon: BedDouble },
          ]}
        />

        {/* Hotels stayed at before at this place: pick one to search for it again */}
        {kind === 'stay' && pastStays.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/50 dark:text-white/50 px-1">다녀온 숙소</span>
            <ul className="flex flex-col gap-1.5 max-h-[216px] overflow-y-auto overscroll-contain">
              {pastStays.slice(0, 8).map(p => {
                const on = p.key === pickedKey;
                const last = p.visits[0];
                return (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => setPickedKey(on ? null : p.key)}
                      aria-pressed={on}
                      className={`w-full min-h-[56px] px-4 py-2.5 rounded-card flex items-center gap-3 text-left transition-colors ${on ? 'bg-surface dark:bg-surface-dark ring-2 ring-red-600' : 'bg-black/[0.035] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'}`}
                    >
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[15px] font-bold truncate">{p.title}</span>
                        <span className="text-meta text-black/55 dark:text-white/55 truncate">
                          {[last.month, last.nights ? `${last.nights}박` : '', p.visits.length > 1 ? `${p.visits.length}회 방문` : ''].filter(Boolean).join(' · ') || last.tripTitle}
                        </span>
                      </span>
                      {on && <span className="w-5 h-5 rounded-full bg-red-600 text-white grid place-items-center shrink-0"><Check className="w-3 h-3" aria-hidden /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Booking sites: real links, so no popup blocker gets in the way */}
        <ul className="flex flex-col gap-2">
          {providers.map(p => (
            <li key={p.name}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-card bg-black/[0.035] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-[15px] font-bold truncate">{p.name}</span>
                  <span className="text-meta text-black/55 dark:text-white/55 truncate">{p.note}</span>
                </span>
                <ExternalLink className="w-4 h-4 shrink-0 text-black/45 dark:text-white/45 group-hover:text-ink dark:group-hover:text-ink-dark transition-colors" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="text-meta text-black/45 dark:text-white/45 text-center">새 탭에서 검색 결과가 열립니다.</p>
      </div>
    </div>
  );
}
