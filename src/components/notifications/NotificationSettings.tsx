import React, { useEffect, useState } from 'react';
import { BellOff, BellRing, Loader2 } from 'lucide-react';
import { Chip } from '../ui/Chip';
import { notify } from '../../utils/feedback';
import type { NotificationKind } from '../../utils/notifications';
import { disablePush, enablePush, pushState, setMuted, subscribeMuted, type PushState } from '../../utils/push';

// Settings → Notifications (v1.3.6 6-b): push on this device, and which kinds of news to get.

const KINDS: { kind: NotificationKind; label: string }[] = [
  { kind: 'journey_shared', label: '여정 공유받음' },
  { kind: 'journey_edited', label: '함께 편집 여정 변경' },
  { kind: 'friend_joined', label: '친구 수락' },
  { kind: 'pocket_shared', label: '포켓 공개' },
];

const STATE_TEXT: Record<PushState, string> = {
  unsupported: '이 브라우저는 알림을 받을 수 없습니다. 앱 안 알림함에서 확인해 주세요.',
  unconfigured: '푸시 알림을 준비하고 있습니다. 앱 안 알림함에서 먼저 확인해 주세요.',
  'needs-install': 'iPhone · iPad는 Safari 공유 버튼 → 홈 화면에 추가로 앱을 설치한 뒤, 설치한 앱에서 알림을 켤 수 있습니다.',
  blocked: '브라우저 설정에서 이 사이트의 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용한 뒤 다시 켜 주세요.',
  off: '켜면 친구 소식을 이 기기로 바로 받습니다.',
  on: '이 기기로 친구 소식을 받고 있습니다.',
};

export function NotificationSettings({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMutedList] = useState<NotificationKind[]>([]);

  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);
  useEffect(() => subscribeMuted(setMutedList), []);

  const toggle = async () => {
    setBusy(true);
    try {
      const next = state === 'on' ? await disablePush() : await enablePush();
      setState(next);
      if (next === 'on') notify('이 기기에서 알림을 받습니다.', 'success');
      else if (next === 'blocked') notify(STATE_TEXT.blocked, 'error');
    } catch (err) {
      console.warn('Push toggle failed:', err);
      notify('알림 설정을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleKind = (kind: NotificationKind) => {
    const next = muted.includes(kind) ? muted.filter(k => k !== kind) : [...muted, kind];
    setMutedList(next);
    setMuted(next).catch(() => notify('저장하지 못했습니다.', 'error'));
  };

  const canToggle = state === 'on' || state === 'off';

  return (
    <section className={cardClass}>
      <span className={labelClass}>Notifications</span>
      <div className="flex items-center gap-3">
        {state === 'on' ? <BellRing className="w-[18px] h-[18px] shrink-0" aria-hidden /> : <BellOff className="w-[18px] h-[18px] shrink-0 text-black/50 dark:text-white/50" aria-hidden />}
        <span className="flex-1 min-w-0 text-[14px] font-bold">이 기기 푸시 알림</span>
        {canToggle && (
          <button type="button" className={`btn btn-sm ${state === 'on' ? 'btn-secondary' : 'btn-primary'}`} onClick={toggle} disabled={busy}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {state === 'on' ? '끄기' : '켜기'}
          </button>
        )}
      </div>
      {state && <span className="text-meta text-black/55 dark:text-white/55 break-keep">{STATE_TEXT[state]}</span>}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[14px] font-bold">받을 소식</span>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map(k => (
            <Chip key={k.kind} size="sm" selected={!muted.includes(k.kind)} onClick={() => toggleKind(k.kind)}>{k.label}</Chip>
          ))}
        </div>
        <span className="text-meta text-black/55 dark:text-white/55 break-keep">끈 소식은 푸시로 오지 않고 앱 안 알림함에만 남습니다.</span>
      </div>
    </section>
  );
}
