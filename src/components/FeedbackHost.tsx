import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import {
  CONFIRM_EVENT, NOTIFY_EVENT, type ConfirmDetail, type NotifyDetail, type NotifyTone,
} from '../utils/feedback';

const TONE_LABEL: Record<NotifyTone, string> = { info: 'NOTICE', success: 'DONE', error: 'ERROR' };
const DISMISS_MS: Record<NotifyTone, number> = { info: 3600, success: 3200, error: 6500 };
const MAX_TOASTS = 4;

// Renders toasts from notify() and confirm dialogs from confirmDialog()
export function FeedbackHost() {
  const [toasts, setToasts] = useState<NotifyDetail[]>([]);
  const [confirms, setConfirms] = useState<ConfirmDetail[]>([]);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = timersRef.current;
    const dismiss = (id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
      const t = timers.get(id);
      if (t) { clearTimeout(t); timers.delete(id); }
    };
    const onNotify = (e: Event) => {
      const detail = (e as CustomEvent<NotifyDetail>).detail;
      if (!detail?.message) return;
      setToasts(prev => [...prev.filter(t => t.message !== detail.message), detail].slice(-MAX_TOASTS));
      timers.set(detail.id, setTimeout(() => dismiss(detail.id), DISMISS_MS[detail.tone]));
    };
    const onConfirm = (e: Event) => {
      const detail = (e as CustomEvent<ConfirmDetail>).detail;
      if (detail) setConfirms(prev => [...prev, detail]);
    };
    window.addEventListener(NOTIFY_EVENT, onNotify);
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(NOTIFY_EVENT, onNotify);
      window.removeEventListener(CONFIRM_EVENT, onConfirm);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const closeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  };

  const current = confirms[0];
  const settle = (ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setConfirms(prev => prev.slice(1));
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed z-[10000] left-1/2 -translate-x-1/2 bottom-[max(16px,env(safe-area-inset-bottom))] w-[calc(100vw-32px)] max-w-md flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          role="status"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : undefined}
              className="tgl-toast pointer-events-auto flex items-start gap-3 bg-white dark:bg-[#161616] text-black dark:text-white border border-black/20 dark:border-white/20 shadow-xl px-4 py-3"
            >
              <span className={`shrink-0 pt-[3px] text-micro font-mono font-bold uppercase tracking-wider ${t.tone === 'error' ? 'text-red-600 dark:text-red-500' : 'text-black/60 dark:text-white/60'}`}>
                {TONE_LABEL[t.tone]}
              </span>
              <p className="flex-1 text-sm leading-snug break-keep whitespace-pre-line">{t.message}</p>
              <button
                type="button"
                onClick={() => closeToast(t.id)}
                className="tap-target shrink-0 p-0.5 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white cursor-pointer"
                aria-label="알림 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={Boolean(current)}
        title={current?.title || (current?.danger ? 'CONFIRM DELETE' : 'CONFIRM')}
        message={current?.message}
        confirmLabel={current?.confirmLabel || '확인'}
        cancelLabel="취소"
        iconType={current?.danger ? 'alert' : 'info'}
        confirmVariant={current?.danger ? 'danger' : 'black'}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </>
  );
}
