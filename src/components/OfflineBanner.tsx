import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { artSrc } from '../art/Art';

/**
 * Shown at the top while the device has no connection: the bear with its umbrella and one line saying that the app
 * carries on and catches up by itself. Gone the moment the connection returns.
 *
 * The bear is an ordinary lazy image, which a device that is already offline cannot fetch (a broken-image icon).
 * So it is read while there is a connection and kept as a data URL; if that never happened, an icon stands in.
 */
let keptBear: string | null = null;
let keeping = false;

function keepBear(done: (url: string) => void) {
  if (keptBear) { done(keptBear); return; }
  if (keeping) return;
  keeping = true;
  fetch(artSrc('offline'))
    .then(r => (r.ok ? r.blob() : Promise.reject(new Error('offline art'))))
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }))
    .then(url => { keptBear = url; done(url); })
    .catch(() => { /* the icon stands in */ })
    .finally(() => { keeping = false; });
}

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const [bear, setBear] = useState<string | null>(keptBear);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  // Read the bear as soon as the app has a connection, so it is there when the connection is lost
  useEffect(() => {
    if (online) keepBear(setBear);
  }, [online]);
  if (online) return null;
  return (
    <div
      role="status"
      className="tgl-rise fixed left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-24px)] h-14 pl-2.5 pr-5 rounded-full bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark shadow-[0_10px_30px_rgba(0,0,0,0.22)] flex items-center gap-2.5 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
    >
      {bear && !broken ? (
        <img src={bear} alt="" draggable={false} onError={() => setBroken(true)} className="h-10 w-auto shrink-0 select-none object-contain" />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded-full bg-surface/15 dark:bg-paper-dark/15 grid place-items-center">
          <WifiOff className="w-5 h-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex flex-col leading-tight">
        <span className="text-[14px] font-extrabold tracking-tight">연결이 끊겼어요</span>
        <span className="text-meta opacity-70 truncate">다시 연결되면 자동으로 이어져요</span>
      </span>
    </div>
  );
}
