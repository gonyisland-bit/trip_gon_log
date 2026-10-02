import React, { useEffect, useState } from 'react';

/**
 * A photo that shows at once and sharpens when ready: `low` (a copy already on the device, such as a card's
 * 960px cover) is drawn immediately, and the full `src` is fetched and decoded off screen before it fades in
 * over it. Opening a journey no longer waits on a multi-megapixel decode. Fills its parent like the plain
 * <img> it replaces; pass the same `className` (absolute / object-cover etc.).
 */
export function ProgressiveImage({ low, src, alt = '', className = '' }: { low?: string; src: string; alt?: string; className?: string }) {
  const [ready, setReady] = useState(!low || low === src);

  useEffect(() => {
    if (!low || low === src) { setReady(true); return; }
    setReady(false);
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const done = () => { if (!cancelled) setReady(true); };
    // decode() resolves once the pixels are ready to paint, so the swap itself costs nothing on the main thread
    if (typeof img.decode === 'function') img.decode().then(done, done);
    else img.onload = done;
    return () => { cancelled = true; img.onload = null; };
  }, [low, src]);

  if (!low || low === src) {
    return <img src={src} alt={alt} decoding="async" className={className} />;
  }
  return (
    <>
      <img src={low} alt={alt} decoding="async" className={className} />
      {ready && <img src={src} alt="" aria-hidden decoding="async" className={`${className} tgl-fade-in`} />}
    </>
  );
}
