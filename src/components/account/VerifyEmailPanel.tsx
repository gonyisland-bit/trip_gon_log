import React, { useEffect, useState } from 'react';
import { Loader2, MailCheck, RotateCw } from 'lucide-react';
import { auth } from '../../firebase';
import { notify } from '../../utils/feedback';
import { completeVerification, friendlyMailError, resendWait, sendVerificationMail } from '../../utils/emailVerification';

// Waiting for the member to confirm their email (v1.3.6).
//  - card: right after sign-up, inside the account sheet
//  - bar: a thin line under the header while a signed-in member is still unverified

function useResendClock() {
  const [wait, setWait] = useState(resendWait);
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setInterval(() => setWait(resendWait()), 1000);
    return () => clearInterval(t);
  }, [wait]);
  return [wait, () => setWait(resendWait())] as const;
}

export function VerifyEmailPanel({ variant, email, profileStatus, onVerified, onLater }: {
  variant: 'card' | 'bar';
  email?: string;
  profileStatus?: string;
  onVerified?: () => void;
  onLater?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [wait, refreshWait] = useResendClock();
  const address = email || auth.currentUser?.email || '';

  const check = async () => {
    if (checking) return;
    setChecking(true);
    try {
      if (await completeVerification(profileStatus)) {
        notify('메일 인증이 끝났습니다. 이제 여정을 만들 수 있습니다.', 'success');
        onVerified?.();
      } else {
        notify('아직 인증되지 않았습니다. 메일의 인증 링크를 누른 뒤 다시 확인해 주세요.');
      }
    } catch {
      notify('인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    if (sending || wait > 0) return;
    setSending(true);
    try {
      await sendVerificationMail();
      notify(`${address}로 인증 메일을 다시 보냈습니다.`, 'success');
    } catch (err) {
      notify(friendlyMailError(err), 'error');
    } finally {
      setSending(false);
      refreshWait();
    }
  };

  const resendLabel = wait > 0 ? `다시 보내기 ${Math.ceil(wait / 1000)}초` : '다시 보내기';

  if (variant === 'bar') {
    return (
      <div role="status" className="w-full px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 shrink-0 text-black dark:text-white">
        <span className="inline-flex items-center gap-1.5 text-[13px]">
          <MailCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          메일 인증을 마치면 여정을 만들고 고칠 수 있습니다.
        </span>
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={check} disabled={checking} className="btn btn-primary btn-sm">
            {checking && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}인증 완료
          </button>
          <button type="button" onClick={resend} disabled={sending || wait > 0} className="btn btn-ghost btn-sm tabular-nums">
            {resendLabel}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <span className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
        <MailCheck className="w-7 h-7" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55">Verify email</span>
        <h3 className="text-xl font-extrabold tracking-tight">메일함을 확인해 주세요</h3>
        <p className="text-sm text-black/65 dark:text-white/65 leading-relaxed">
          <b className="text-black dark:text-white break-all">{address}</b>로 인증 링크를 보냈습니다.<br />
          링크를 누른 뒤 아래 <b className="text-black dark:text-white">인증 완료</b>를 눌러 주세요.
        </p>
        <p className="text-meta text-black/50 dark:text-white/50">메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
      </div>
      <div className="w-full flex flex-col gap-2">
        <button type="button" onClick={check} disabled={checking} className="btn btn-primary btn-lg w-full">
          {checking && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}인증 완료
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={resend} disabled={sending || wait > 0} className="btn btn-secondary flex-1 tabular-nums">
            <RotateCw className="w-3.5 h-3.5" aria-hidden />{resendLabel}
          </button>
          {onLater && (
            <button type="button" onClick={onLater} className="btn btn-ghost flex-1">나중에 하기</button>
          )}
        </div>
      </div>
    </div>
  );
}
