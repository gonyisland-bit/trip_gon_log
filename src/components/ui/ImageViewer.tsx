import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

// A picture at full size over everything: tap anywhere or press Escape to put it away. Escape is taken here first, so
// a sheet underneath does not close along with it.

export function ImageViewer({ src, alt = '', onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10010] bg-black/90 flex items-center justify-center p-3 sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="사진 크게 보기">
      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <IconButton icon={X} label="닫기" tone="glass" onClick={onClose} />
      </div>
      <img src={src} alt={alt} className="max-h-full max-w-full w-auto h-auto object-contain select-none rounded-thumb" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}
