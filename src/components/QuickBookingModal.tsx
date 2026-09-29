import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plane, Building, ExternalLink, Calendar, Users, 
  Sparkles 
} from 'lucide-react';
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
  bookingContextFromTrip
} from '../utils/bookingDeepLinks';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  startDate?: string;
  endDate?: string;
  memberCount?: number;
  initialFromCode?: string;
  initialToCode?: string;
}

function formatShortDate(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
  return d;
}

export function QuickBookingModal(props: QuickBookingModalProps) {
  // Mount the content only while open so its hooks always run in the same order
  if (!props.isOpen) return null;
  return <QuickBookingModalContent {...props} />;
}

function QuickBookingModalContent({
  onClose,
  destination,
  startDate = '',
  endDate = '',
  memberCount = 1,
  initialFromCode = 'ICN',
  initialToCode = '',
}: QuickBookingModalProps) {

  // Local editable state for quick fine-tuning (always extract pure city name e.g. "후쿠오카", excluding country prefixes like "JAPAN, ")
  const initialCleanCity = extractCleanCityName(destination) || 'Tokyo';
  const [dest, setDest] = useState<string>(initialCleanCity);
  const [originAirport, setOriginAirport] = useState<string>(initialFromCode || 'ICN');
  const [destAirport, setDestAirport] = useState<string>(
    initialToCode || inferAirportCode(initialCleanCity)
  );

  // Sync state if destination prop updates
  useEffect(() => {
    if (destination) {
      const cleaned = extractCleanCityName(destination) || 'Tokyo';
      setDest(cleaned);
      if (!initialToCode) {
        setDestAirport(inferAirportCode(cleaned));
      }
    }
  }, [destination, initialToCode]);
  const [depDate, setDepDate] = useState<string>(() => {
    if (startDate) return startDate.replace(/\./g, '-');
    return bookingContextFromTrip({}, null).departDate;
  });
  const [retDate, setRetDate] = useState<string>(() => {
    if (endDate) return endDate.replace(/\./g, '-');
    return bookingContextFromTrip({}, null).returnDate || '';
  });
  const [adults, setAdults] = useState<number>(Math.max(1, memberCount));

  const searchCtx: BookingSearchContext = useMemo(() => ({
    destination: dest,
    originAirport,
    destinationAirport: destAirport,
    departDate: depDate,
    returnDate: retDate,
    adults,
  }), [dest, originAirport, destAirport, depDate, retDate, adults]);

  const skyscannerUrl = useMemo(() => buildSkyscannerFlightUrl(searchCtx), [searchCtx]);
  const naverFlightUrl = useMemo(() => buildNaverFlightUrl(searchCtx), [searchCtx]);
  const googleFlightUrl = useMemo(() => buildGoogleFlightsUrl(searchCtx), [searchCtx]);

  const agodaUrl = useMemo(() => buildAgodaUrl(searchCtx), [searchCtx]);
  const bookingComUrl = useMemo(() => buildBookingComUrl(searchCtx), [searchCtx]);
  const airbnbUrl = useMemo(() => buildAirbnbUrl(searchCtx), [searchCtx]);

  const modalNode = (
    <div 
      className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-surface dark:bg-surface-dark rounded-card shadow-2xl flex flex-col overflow-hidden text-black dark:text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-mono text-xs md:text-sm font-bold tracking-widest uppercase">
              SMART BOOKING
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-target p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Preset Context Summary & Fast Adjusters */}
          <div className="p-3 sm:p-4 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-black/60 dark:text-white/60">
              <span className="flex items-center gap-1.5 font-bold text-black dark:text-white">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                자동 감지된 여정 파라미터
              </span>
              <span className="text-meta">수정 시 링크 즉시 반영</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Origin Airport */}
              <div>
                <label className="block text-meta font-mono text-black/60 dark:text-white/60 mb-1">
                  출발 공항
                </label>
                <input
                  type="text"
                  value={originAirport}
                  onChange={(e) => setOriginAirport(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 font-mono font-bold uppercase text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="ICN"
                />
              </div>

              {/* Destination Airport */}
              <div>
                <label className="block text-meta font-mono text-black/60 dark:text-white/60 mb-1">
                  도착 공항/도시
                </label>
                <input
                  type="text"
                  value={destAirport}
                  onChange={(e) => setDestAirport(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 font-mono font-bold uppercase text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="TYO"
                />
              </div>

              {/* Destination City Name */}
              <div>
                <label className="block text-meta font-mono text-black/60 dark:text-white/60 mb-1">
                  숙소 검색 도시
                </label>
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => {
                    setDest(e.target.value);
                    setDestAirport(inferAirportCode(e.target.value));
                  }}
                  className="w-full px-2.5 py-1.5 font-sans font-bold text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="Tokyo"
                />
              </div>

              {/* Adults */}
              <div>
                <label className="block text-meta font-mono text-black/60 dark:text-white/60 mb-1">
                  인원 (성인)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1.5 font-mono font-bold text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  />
                  <span className="text-[11px] font-mono text-black/60 dark:text-white/60">명</span>
                </div>
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5 text-xs w-full min-w-0">
              <div className="min-w-0">
                <label className="flex items-center gap-1 text-meta font-mono text-black/60 dark:text-white/60 mb-1 truncate">
                  <Calendar className="w-3 h-3 shrink-0" /> 가는 날 (체크인)
                </label>
                <input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                  className="w-full min-w-0 max-w-full px-2 sm:px-2.5 py-1.5 font-mono text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none box-border"
                />
              </div>
              <div className="min-w-0">
                <label className="flex items-center gap-1 text-meta font-mono text-black/60 dark:text-white/60 mb-1 truncate">
                  <Calendar className="w-3 h-3 shrink-0" /> 오는 날 (체크아웃)
                </label>
                <input
                  type="date"
                  value={retDate}
                  onChange={(e) => setRetDate(e.target.value)}
                  className="w-full min-w-0 max-w-full px-2 sm:px-2.5 py-1.5 font-mono text-xs bg-surface dark:bg-surface-dark border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none box-border"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Flight Booking Links (Native <a> for 100% Popup Block Bypass) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5 shrink-0">
                <Plane className="w-3.5 h-3.5 text-black dark:text-white" />
                <span className="sm:hidden">Flight 항공권</span>
                <span className="hidden sm:inline">Flight 항공권 실시간 비교</span>
              </span>
              <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate text-right">
                {originAirport} → {destAirport} • 성인 {adults}명
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <a
                href={skyscannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    스카이스캐너
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  전 세계 최저가 비교
                </span>
              </a>

              <a
                href={naverFlightUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    네이버 항공권
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  국내 카드사 할인
                </span>
              </a>

              <a
                href={googleFlightUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    구글 플라이트
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  가격 변동 트렌드
                </span>
              </a>
            </div>
          </div>

          {/* Section 2: Accommodation Booking Links (Native <a> for 100% Popup Block Bypass) */}
          <div className="space-y-2.5 pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5 shrink-0">
                <Building className="w-3.5 h-3.5 text-black dark:text-white" />
                <span className="sm:hidden">Hotel 숙소</span>
                <span className="hidden sm:inline">Hotel 숙소 실시간 예약</span>
              </span>
              <span className="text-meta font-mono text-black/60 dark:text-white/60 truncate text-right">
                <span className="sm:hidden">{dest} • {formatShortDate(depDate)}~{formatShortDate(retDate)}</span>
                <span className="hidden sm:inline">{dest} • {depDate} ~ {retDate}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <a
                href={agodaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                    아고다
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  호텔 & 리조트 특가
                </span>
              </a>

              <a
                href={bookingComUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    부킹닷컴
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  무료 취소 & 전세계
                </span>
              </a>

              <a
                href={airbnbUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 sm:p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer min-w-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                    에어비앤비
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                </div>
                <span className="text-micro sm:text-meta text-black/60 dark:text-white/60 line-clamp-1">
                  현지 감성 독채
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-center text-meta font-mono text-black/60 dark:text-white/60 shrink-0 truncate">
          각 버튼 클릭 시 새 탭에서 실시간 예약 검색이 열립니다.
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
