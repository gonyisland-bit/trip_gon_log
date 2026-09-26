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
  buildAirbnbUrl 
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

export function QuickBookingModal({
  isOpen,
  onClose,
  destination,
  startDate = '',
  endDate = '',
  memberCount = 1,
  initialFromCode = 'ICN',
  initialToCode = '',
}: QuickBookingModalProps) {
  if (!isOpen) return null;

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
    const today = new Date();
    today.setDate(today.getDate() + 14);
    return today.toISOString().split('T')[0];
  });
  const [retDate, setRetDate] = useState<string>(() => {
    if (endDate) return endDate.replace(/\./g, '-');
    const next = new Date();
    next.setDate(next.getDate() + 18);
    return next.toISOString().split('T')[0];
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#121212] border border-black/20 dark:border-white/20 rounded-xl shadow-2xl flex flex-col overflow-hidden text-black dark:text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-mono text-xs md:text-sm font-bold tracking-widest uppercase">
              ONE-CLICK BOOKING SHORTCUT
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
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
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                자동 감지된 여정 파라미터
              </span>
              <span className="text-[10px]">수정 시 링크 즉시 반영</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Origin Airport */}
              <div>
                <label className="block text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  출발 공항
                </label>
                <input
                  type="text"
                  value={originAirport}
                  onChange={(e) => setOriginAirport(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 font-mono font-bold uppercase text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="ICN"
                />
              </div>

              {/* Destination Airport */}
              <div>
                <label className="block text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  도착 공항/도시
                </label>
                <input
                  type="text"
                  value={destAirport}
                  onChange={(e) => setDestAirport(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 font-mono font-bold uppercase text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="TYO"
                />
              </div>

              {/* Destination City Name */}
              <div>
                <label className="block text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  숙소 검색 도시
                </label>
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => {
                    setDest(e.target.value);
                    setDestAirport(inferAirportCode(e.target.value));
                  }}
                  className="w-full px-2.5 py-1.5 font-sans font-bold text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  placeholder="Tokyo"
                />
              </div>

              {/* Adults */}
              <div>
                <label className="block text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  인원 (성인)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1.5 font-mono font-bold text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                  />
                  <span className="text-[11px] font-mono text-black/40 dark:text-white/40">명</span>
                </div>
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5 text-xs">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  <Calendar className="w-3 h-3" /> 가는 날 (체크인)
                </label>
                <input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-mono text-black/50 dark:text-white/50 mb-1">
                  <Calendar className="w-3 h-3" /> 오는 날 (체크아웃)
                </label>
                <input
                  type="date"
                  value={retDate}
                  onChange={(e) => setRetDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-[#1a1a1a] border border-black/15 dark:border-white/15 rounded focus:border-black dark:focus:border-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Flight Booking Links (Native <a> for 100% Popup Block Bypass) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-black dark:text-white" />
                항공권 실시간 비교 예약 (새 탭)
              </span>
              <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                {originAirport} ➔ {destAirport} • 성인 {adults}명
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={skyscannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    스카이스캐너
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  전 세계 최저가 항공권 비교
                </span>
              </a>

              <a
                href={naverFlightUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    네이버 항공권
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  국내 카드사 할인 혜택 비교
                </span>
              </a>

              <a
                href={googleFlightUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400">
                    구글 플라이트
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  실시간 가격 변동 트렌드
                </span>
              </a>
            </div>
          </div>

          {/* Section 2: Accommodation Booking Links (Native <a> for 100% Popup Block Bypass) */}
          <div className="space-y-2.5 pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-black dark:text-white" />
                숙소 실시간 검색 예약 (새 탭)
              </span>
              <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                {dest} • {depDate} ~ {retDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={agodaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    아고다 (Agoda)
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  아시아권 호텔 & 리조트 특가
                </span>
              </a>

              <a
                href={bookingComUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-400">
                    부킹닷컴
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  무료 취소 & 전 세계 숙소
                </span>
              </a>

              <a
                href={airbnbUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-3 border border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-lg bg-black/[0.01] hover:bg-black/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-bold font-mono tracking-tight group-hover:text-rose-500">
                    에어비앤비
                  </span>
                  <ExternalLink className="w-3 h-3 text-black/30 dark:text-white/30 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] text-black/50 dark:text-white/50">
                  현지 감성 독채 및 아파트
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] font-mono text-black/50 dark:text-white/50 shrink-0">
          <span>각 버튼을 누르면 새 탭에서 즉시 실시간 검색 결과가 열립니다.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded text-xs font-bold uppercase active:scale-[0.98] transition-transform cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
