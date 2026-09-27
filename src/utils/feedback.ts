// App-wide feedback: toasts (replacing window.alert) and confirm dialogs (replacing window.confirm).
// Both are event-based so they work from components, hooks and plain utilities alike;
// <FeedbackHost /> renders them.

export type NotifyTone = 'info' | 'success' | 'error';

export interface NotifyDetail {
  id: number;
  message: string;
  tone: NotifyTone;
}

export interface ConfirmDetail {
  id: number;
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export const NOTIFY_EVENT = 'tgl:notify';
export const CONFIRM_EVENT = 'tgl:confirm';

let seq = 0;

const ERROR_HINT = /실패|오류|에러|error|없습니다|불가|거절|필요합니다|필요해|올바르지|초과|권한|잘못|못했|없어|만료|유효하지/i;
const SUCCESS_HINT = /완료|성공|저장되|되었습니다|했습니다|보냈습니다|복원/;

function inferTone(message: string): NotifyTone {
  if (ERROR_HINT.test(message)) return 'error';
  if (SUCCESS_HINT.test(message)) return 'success';
  return 'info';
}

// Show a toast. Tone is inferred from the message when not given.
export function notify(message: unknown, tone?: NotifyTone): void {
  const text = typeof message === 'string' ? message : String(message ?? '');
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotifyDetail>(NOTIFY_EVENT, {
    detail: { id: ++seq, message: text, tone: tone ?? inferTone(text) },
  }));
}

// Ask for confirmation with the Swiss minimal ConfirmModal. Resolves true when confirmed.
export function confirmDialog(
  message: string,
  options: { title?: string; confirmLabel?: string; danger?: boolean } = {}
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const danger = options.danger ?? /삭제|초기화|로그아웃|거절|영구|정리/.test(message);
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent<ConfirmDetail>(CONFIRM_EVENT, {
      detail: { id: ++seq, message, title: options.title, confirmLabel: options.confirmLabel, danger, resolve },
    }));
  });
}
