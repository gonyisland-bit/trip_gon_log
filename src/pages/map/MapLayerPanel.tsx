import React, { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../motion';
import { useBackToClose } from '../../utils/overlayHistory';
import { Home as HomeIcon, Layers, List, Plane, RotateCcw, Sun, Tag, X } from 'lucide-react';

// Map layers (v1.3 P5-6): one panel for what the map shows and what each mark
// means. A popover on desktop, a bottom sheet on phones. With day and night on,
// a slider previews the terminator and city lights up to 12 hours either way.

interface LayerToggle {
  key: string;
  label: string;
  on: boolean;
  onToggle: () => void;
  swatch: React.ReactNode;
}

interface MapLayerPanelProps {
  showVisitedPins: boolean; onToggleVisited: () => void;
  showWishlistPins: boolean; onToggleWishlist: () => void;
  showPinLabels: boolean; onToggleLabels: () => void;
  isPlaneAnimEnabled: boolean; onTogglePlane: () => void;
  isDayNightEnabled: boolean; onToggleDayNight: () => void;
  timeOffsetHours: number; onTimeOffsetChange: (h: number) => void;
  previewTimeLabel: string;
  onResetView: () => void;
  onOpenPlaces: () => void;
}

const PinSwatch = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 34" width="12" height="17" aria-hidden><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0Z" fill={color} /><circle cx="12" cy="11" r="4.5" fill="#fff" /></svg>
);

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative w-8 h-[18px] shrink-0 border transition-colors ${on ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-black/30 dark:border-white/30'}`}>
      <span className={`absolute top-[2px] w-3 h-3 transition-[left,background-color] duration-base ease-emphasized ${on ? 'left-[16px] bg-white dark:bg-black' : 'left-[2px] bg-black/40 dark:bg-white/40'}`} />
    </span>
  );
}

export function MapLayerPanel(p: MapLayerPanelProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close with the shared sheet exit (a slide down on phones, a short fall on desktop)
  const close = useCallback(() => {
    if (!open || closing) return;
    if (prefersReducedMotion()) { setOpen(false); return; }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 220);
  }, [open, closing]);
  useBackToClose(open, () => { setOpen(false); setClosing(false); });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open, close]);

  const layers: LayerToggle[] = [
    { key: 'visited', label: '다녀온 곳', on: p.showVisitedPins, onToggle: p.onToggleVisited, swatch: <PinSwatch color="#DC2626" /> },
    { key: 'wishlist', label: '가고 싶은 곳', on: p.showWishlistPins, onToggle: p.onToggleWishlist, swatch: <PinSwatch color="#D97706" /> },
    { key: 'labels', label: '이름표', on: p.showPinLabels, onToggle: p.onToggleLabels, swatch: <Tag className="w-3.5 h-3.5" /> },
    { key: 'plane', label: '비행 모션', on: p.isPlaneAnimEnabled, onToggle: p.onTogglePlane, swatch: <Plane className="w-3.5 h-3.5" /> },
    { key: 'daynight', label: '낮과 밤', on: p.isDayNightEnabled, onToggle: p.onToggleDayNight, swatch: <Sun className="w-3.5 h-3.5" /> },
  ];
  const activeCount = layers.filter(l => l.on).length;
  const offset = p.timeOffsetHours;

  return (
    <div ref={rootRef} className="relative shrink-0 self-start h-8 sm:h-9">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="지도 레이어"
        className={`tap-target h-8 sm:h-9 px-2.5 sm:px-3 flex items-center gap-1.5 border shadow-2xl backdrop-blur-md transition-colors cursor-pointer ${
          open ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-white/95 dark:bg-[#111111]/95 border-black/20 dark:border-white/20 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="font-mono text-micro font-bold tabular-nums">{activeCount}</span>
        {offset !== 0 && <span className="font-mono text-micro font-bold text-amber-500">{offset > 0 ? `+${offset}` : offset}h</span>}
      </button>

      {open && (
        <>
          {/* Phone: dim the map behind the sheet */}
          <div className={`sm:hidden fixed inset-0 z-[60] bg-black/30 ${closing ? 'tgl-sheet-backdrop-out' : 'tgl-sheet-backdrop-in'}`} onClick={close} />
          <div
            role="dialog"
            aria-label="지도 레이어"
            className={`${closing ? 'tgl-sheet-out' : 'tgl-sheet-in'} z-[61] max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-[#141414] text-black dark:text-white border-t sm:border border-black/20 dark:border-white/20 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] sm:shadow-2xl`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="sm:hidden w-10 h-1 bg-black/20 dark:bg-white/20 mx-auto mt-2" />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60">Layers</span>
              <button type="button" onClick={close} className="tap-target w-7 h-7 grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" aria-label="닫기">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <ul className="flex flex-col">
              {layers.map(l => (
                <li key={l.key}>
                  <button type="button" role="switch" aria-checked={l.on} onClick={l.onToggle} className="w-full flex items-center gap-3 px-4 h-11 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer">
                    <span className="w-5 grid place-items-center shrink-0 text-black/70 dark:text-white/70">{l.swatch}</span>
                    <span className={`flex-1 text-sm font-semibold ${l.on ? '' : 'text-black/55 dark:text-white/55'}`}>{l.label}</span>
                    <Switch on={l.on} />
                  </button>
                </li>
              ))}
            </ul>

            {p.isDayNightEnabled && (
              <div className="mx-4 mt-1 mb-3 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
                {/* What the day and night marks mean */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-black/65 dark:text-white/65">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-black" />태양 바로 아래</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 h-px bg-black dark:bg-white" />낮과 밤 경계</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_4px_2px_rgba(245,158,11,0.5)]" />도시 불빛</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-mono text-meta font-bold tabular-nums">
                    {p.previewTimeLabel} <span className="text-black/50 dark:text-white/50">KST</span>
                    {offset !== 0 && <span className="ml-1.5 text-amber-600 dark:text-amber-500">{offset > 0 ? `+${offset}` : offset}시간</span>}
                  </span>
                  {offset !== 0 && (
                    <button type="button" onClick={() => p.onTimeOffsetChange(0)} className="inline-flex items-center gap-1 font-mono text-micro font-bold uppercase tracking-widest hover:text-red-600 dark:hover:text-red-500 cursor-pointer">
                      <RotateCcw className="w-3 h-3" /> 지금
                    </button>
                  )}
                </div>
                <input
                  id="map-time-offset"
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={offset}
                  onChange={e => p.onTimeOffsetChange(Number(e.target.value))}
                  aria-label="낮과 밤 미리 보기 시각"
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between font-mono text-micro text-black/45 dark:text-white/45 tabular-nums"><span>-12h</span><span>지금</span><span>+12h</span></div>
              </div>
            )}

            <div className="grid grid-cols-2 border-t border-black/15 dark:border-white/15">
              <button type="button" onClick={() => { p.onResetView(); close(); }} className="h-11 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer">
                <HomeIcon className="w-3.5 h-3.5" /> 전체 보기
              </button>
              <button type="button" onClick={() => { p.onOpenPlaces(); close(); }} className="h-11 flex items-center justify-center gap-2 text-sm font-semibold border-l border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer">
                <List className="w-3.5 h-3.5" /> 장소 목록
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
