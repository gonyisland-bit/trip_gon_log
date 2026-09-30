import React, { useEffect, useState } from 'react';
import { Copy, Loader2, Share2, UserMinus, UserPlus } from 'lucide-react';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { IconButton } from '../ui/IconButton';
import { confirmDialog, notify } from '../../utils/feedback';
import {
  activeInvite, createInvite, inviteLink, normalizeCode, promptAcceptInvite, removeFriend,
  type Invite, type PersonCard,
} from '../../utils/friends';
import { useFriends } from './useFriends';

// Settings → Friends (v1.3.6 5-a): the friend list, an invite to hand out (link or 6-letter
// code) and a field to enter a code someone gave you. No search by email.

interface Props {
  me: PersonCard;
  canWrite: boolean;
  cardClass: string;
  labelClass: string;
}

function daysLeft(expiresAt: number): number {
  return Math.max(1, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function FriendsSection({ me, canWrite, cardClass, labelClass }: Props) {
  const { friends, loaded } = useFriends(me.uid);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [making, setMaking] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    activeInvite().then(setInvite).catch(() => {});
  }, [me.uid]);

  const makeInvite = async () => {
    setMaking(true);
    try {
      setInvite(await createInvite(me));
    } catch (err) {
      console.warn('Invite create failed:', err);
      notify('초대를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setMaking(false);
    }
  };

  const copyLink = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(inviteLink(invite.code));
      notify('초대 링크를 복사했습니다.', 'success');
    } catch {
      notify(`초대 코드: ${invite.code}`, 'info');
    }
  };

  const shareLink = async () => {
    if (!invite) return;
    try {
      await navigator.share({ title: 'Tripgon 친구 초대', text: `${me.name}님이 Tripgon 친구로 초대했습니다. 코드 ${invite.code}`, url: inviteLink(invite.code) });
    } catch { /* closed */ }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (c.length !== 6) { notify('6자리 코드를 입력해 주세요.', 'error'); return; }
    setJoining(true);
    if (await promptAcceptInvite(c, me)) setCode('');
    setJoining(false);
  };

  const unfriend = async (uid: string, name: string) => {
    const ok = await confirmDialog(`${name}님과 친구를 끊을까요? 서로 공유한 여정도 더 이상 보이지 않습니다.`, { title: 'UNFRIEND', confirmLabel: '친구 끊기', danger: true });
    if (!ok) return;
    setRemoving(uid);
    try {
      await removeFriend(uid);
      notify(`${name}님과 친구를 끊었습니다.`, 'success');
    } catch (err) {
      console.warn('Unfriend failed:', err);
      notify('친구를 끊지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setRemoving(null);
    }
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <section className={cardClass}>
      <div className="flex items-baseline justify-between">
        <span className={labelClass}>Friends</span>
        <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">{friends.length}</span>
      </div>

      {!loaded ? (
        <span className="text-meta text-black/55 dark:text-white/55">친구 목록을 불러오는 중</span>
      ) : friends.length === 0 ? (
        <span className="text-meta text-black/55 dark:text-white/55">아직 친구가 없습니다. 초대 링크나 코드로 친구를 맺어 보세요.</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {friends.map(f => (
            <li key={f.uid} className="flex items-center gap-3">
              <UserProfileAvatar profile={f} size="md" fallbackName={f.name} />
              <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{f.name}</span>
              <IconButton
                icon={removing === f.uid ? Loader2 : UserMinus}
                label={`${f.name}님과 친구 끊기`}
                size="sm"
                disabled={removing !== null}
                onClick={() => unfriend(f.uid, f.name)}
                className={removing === f.uid ? '[&>svg]:animate-spin' : ''}
              />
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[14px] font-bold">친구 초대</span>
          {invite ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[18px] font-bold tracking-[0.2em] tabular-nums px-1" aria-label={`초대 코드 ${invite.code}`}>{invite.code}</span>
              <span className="font-mono text-micro text-black/50 dark:text-white/50">{daysLeft(invite.expiresAt)}일 남음 · 한 번 사용</span>
              <span className="flex-1" />
              <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" aria-hidden />링크 복사
              </button>
              {canShare && (
                <IconButton icon={Share2} label="초대 보내기" size="sm" onClick={shareLink} />
              )}
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-sm self-start" onClick={makeInvite} disabled={making}>
              {making ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <UserPlus className="w-3.5 h-3.5" aria-hidden />}
              초대 만들기
            </button>
          )}

          <form onSubmit={join} className="flex items-center gap-2 pt-1">
            <input
              value={code}
              onChange={e => setCode(normalizeCode(e.target.value))}
              placeholder="받은 코드 6자리"
              aria-label="받은 초대 코드"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 h-10 px-4 rounded-full border border-black/10 dark:border-white/15 bg-transparent font-mono tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-sans text-[15px] focus:outline-none focus:border-ink dark:focus:border-ink-dark"
            />
            <button type="submit" className="btn btn-secondary" disabled={joining || code.length !== 6}>
              {joining && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}연결
            </button>
          </form>
        </div>
      )}
      {!canWrite && (
        <span className="text-meta text-black/55 dark:text-white/55">메일 인증을 마치면 친구를 초대할 수 있습니다.</span>
      )}
    </section>
  );
}
