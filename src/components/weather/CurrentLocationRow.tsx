import React, { useState } from 'react';
import { Check, Loader2, LocateFixed } from 'lucide-react';
import type { CityWeatherConfig } from '../../types';
import { locateMe } from '../../utils/userPrefs';
import { notify } from '../../utils/feedback';

// "Current location" at the top of a weather location list. Asks for location only when tapped.
export function CurrentLocationRow({ selected, onLocated, className = '', trailing }: {
  selected: boolean;
  onLocated: (city: CityWeatherConfig) => void;
  className?: string;
  /** Right-hand slot (the place's weather) before the check */
  trailing?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (busy) return;
    setBusy(true);
    locateMe()
      .then(onLocated)
      .catch((err: GeolocationPositionError | Error) => {
        const denied = 'code' in err && err.code === 1;
        notify(denied ? '위치 권한이 꺼져 있어 현재 위치 날씨를 불러올 수 없습니다. 브라우저 설정에서 위치를 허용해 주세요.' : '현재 위치를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      })
      .finally(() => setBusy(false));
  };
  return (
    <button
      type="button"
      onClick={locate}
      className={`w-full px-3 py-2 min-h-10 text-left flex items-center justify-between transition-colors cursor-pointer text-sm ${
        selected ? 'bg-black/[0.05] dark:bg-white/10 font-bold text-black dark:text-white' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-black/80 dark:text-white/80'
      } ${className}`}
    >
      <span className="flex items-center gap-2">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
        현재 위치
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {trailing}
        <span className="w-3.5 h-3.5 inline-grid place-items-center">{selected && <Check className="w-3.5 h-3.5" />}</span>
      </span>
    </button>
  );
}
