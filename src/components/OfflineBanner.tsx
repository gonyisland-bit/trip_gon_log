import React, { useEffect, useState } from 'react';
import { Art } from '../art/Art';

/**
 * Shown at the top while the device has no connection: the bear with its umbrella and one line saying that the app
 * carries on and catches up by itself. Gone the moment the connection returns.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div
      role="status"
      className="tgl-rise fixed left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-24px)] h-14 pl-2.5 pr-5 rounded-full bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark shadow-[0_10px_30px_rgba(0,0,0,0.22)] flex items-center gap-2.5 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
    >
      <Art id="offline" className="h-10 w-auto shrink-0" />
      <span className="min-w-0 flex flex-col leading-tight">
        <span className="text-[14px] font-extrabold tracking-tight">연결이 끊겼어요</span>
        <span className="text-meta opacity-70 truncate">다시 연결되면 자동으로 이어져요</span>
      </span>
    </div>
  );
}
