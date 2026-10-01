import React, { useEffect, useState } from 'react';
import { ChevronDown, Copy, Link2, Loader2, LogOut } from 'lucide-react';
import type { Trip } from '../../types';
import { Sheet, useSheetClose } from '../Sheet';
import { Segment } from '../ui/Segment';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { useFriends } from '../friends/useFriends';
import { currentUid, leaveJourney, setJourneyPeople, setLinkShare } from '../../utils/ownership';
import { confirmDialog, notify } from '../../utils/feedback';
import type { PersonCard } from '../../utils/friends';

// Sharing one journey (v1.3.6 5-b). The owner picks, per friend, nobody / view / edit together;
// the journey and all its items change at once. Link sharing sits below. Someone the journey
// was shared with sees whose it is and may take themselves off it.

export const OPEN_JOURNEY_SHARE = 'tgl:journey-share';
export function openJourneyShare(tripId: number) {
  window.dispatchEvent(new CustomEvent(OPEN_JOURNEY_SHARE, { detail: tripId }));
}

type Role = 'none' | 'view' | 'edit';
const ROLE_LABEL: Record<Role, string> = { none: '공유 안 함', view: '보기', edit: '함께 편집' };

interface Props {
  trip: Trip;
  me: PersonCard | null;
  onClose: () => void;
  /** Called after I took myself off the journey */
  onLeft: () => void;
}

export function ShareJourneySheet(props: Props) {
  return (
    <Sheet label={`${props.trip.title} 공유`} onClose={props.onClose} tone="paper" panelClassName="sm:max-w-md max-h-[86dvh]">
      <Body {...props} />
    </Sheet>
  );
}

const card = 'rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3';
const label = 'font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55';
const muted = 'text-meta text-black/55 dark:text-white/55 break-keep';

function shareUrl(trip: Trip) {
  return `${window.location.origin}?id=${trip.id}&share=true`;
}

function Body({ trip, me, onLeft }: Props) {
  const close = useSheetClose();
  const uid = currentUid();
  const isOwner = !trip.ownerId || trip.ownerId === uid;
  const { friends, loaded } = useFriends(uid);
  const [access, setAccess] = useState<string[]>(trip.access || []);
  const [editors, setEditors] = useState<string[]>(trip.editors || []);
  const [linkOn, setLinkOn] = useState(Boolean(trip.publicShare));
  const [busy, setBusy] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  // Follow the saved journey when its snapshot arrives
  useEffect(() => { setAccess(trip.access || []); setEditors(trip.editors || []); }, [trip.access?.join(), trip.editors?.join()]);
  useEffect(() => { setLinkOn(Boolean(trip.publicShare)); }, [trip.publicShare]);

  const roleOf = (u: string): Role => editors.includes(u) ? 'edit' : access.includes(u) ? 'view' : 'none';

  const changeRole = async (u: string, name: string, role: Role) => {
    if (!me) return;
    const nextEditors = role === 'edit' ? [...editors.filter(x => x !== u), u] : editors.filter(x => x !== u);
    const nextAccess = role === 'none' ? access.filter(x => x !== u) : Array.from(new Set([...access, u]));
    const before = { access, editors };
    setAccess(nextAccess);
    setEditors(nextEditors);
    setBusy(u);
    try {
      await setJourneyPeople(trip.id, nextAccess, nextEditors, me);
      notify(role === 'none' ? `${name}님과 공유를 멈췄습니다.` : role === 'edit' ? `${name}님과 함께 편집합니다.` : `${name}님이 볼 수 있습니다.`, 'success');
    } catch (err) {
      console.warn('Share change failed:', err);
      setAccess(before.access);
      setEditors(before.editors);
      notify('공유를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const copyLink = () => {
    // Copy inside the click, then open the journey to the link
    navigator.clipboard.writeText(shareUrl(trip))
      .then(async () => {
        if (isOwner && trip.ownerId && !linkOn) {
          setBusy('link');
          await setLinkShare(trip.id, true);
          setLinkOn(true);
        }
        notify('공유 링크를 복사했습니다. 링크가 있는 사람은 이 여정을 볼 수 있습니다.', 'success');
      })
      .catch(() => notify('링크를 복사하지 못했습니다.', 'error'))
      .finally(() => setBusy(null));
  };

  const stopLink = async () => {
    setBusy('link');
    try {
      await setLinkShare(trip.id, false);
      setLinkOn(false);
      notify('링크 공유를 껐습니다. 이전에 보낸 링크로는 더 이상 열리지 않습니다.', 'success');
    } catch {
      notify('링크 공유를 끄지 못했습니다.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const leave = async () => {
    const ok = await confirmDialog(`'${trip.title}'을(를) 내 목록에서 뺄까요? 다시 보려면 주인이 공유해 줘야 합니다.`, { title: 'LEAVE', confirmLabel: '목록에서 빼기', danger: true });
    if (!ok) return;
    setBusy('leave');
    try {
      await leaveJourney(trip.id);
      notify('목록에서 뺐습니다.', 'success');
      close();
      onLeft();
    } catch (err) {
      console.warn('Leave failed:', err);
      notify('목록에서 빼지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBusy(null);
    }
  };

  // People who can see it but are not in my friends list (connected before friends existed)
  const others = access.filter(u => u !== uid && !friends.some(f => f.uid === u));

  const header = (
    <div className="flex flex-col gap-0.5 px-1">
      <h2 className="text-[20px] font-extrabold tracking-tight">공유</h2>
      <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{trip.title}</span>
    </div>
  );

  if (!isOwner) {
    const owner = friends.find(f => f.uid === trip.ownerId);
    const ownerName = owner?.name || trip.ownerCard?.name || '친구';
    const mine = uid && editors.includes(uid) ? '함께 편집' : '보기';
    return (
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
        {header}
        <section className={card}>
          <span className={label}>Shared with me</span>
          <div className="flex items-center gap-3">
            <UserProfileAvatar profile={owner || (trip.ownerCard as any) || null} size="md" fallbackName={ownerName} />
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-[14px] font-bold truncate">{ownerName}님의 여정</span>
              <span className="font-mono text-micro text-black/55 dark:text-white/55">{mine}</span>
            </span>
          </div>
          {linkOn && (
            <button type="button" className="btn btn-secondary btn-sm self-start" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5" aria-hidden />공유 링크 복사
            </button>
          )}
          <button type="button" className="btn btn-outline-danger btn-sm self-start" onClick={leave} disabled={busy !== null}>
            {busy === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <LogOut className="w-3.5 h-3.5" aria-hidden />}
            목록에서 빼기
          </button>
        </section>
      </div>
    );
  }

  // One line per person; the role chip opens the three choices under its row
  const personRow = (u: string, name: string, profile: any) => {
    const role = roleOf(u);
    const open = openRow === u;
    return (
      <li key={u} className="flex flex-col">
        <div className="flex items-center gap-3 min-h-[52px]">
          <UserProfileAvatar profile={profile} size="md" fallbackName={name} />
          <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{name}</span>
          {busy === u && <Loader2 className="w-4 h-4 animate-spin text-black/50 dark:text-white/50" aria-hidden />}
          <button
            type="button"
            onClick={() => setOpenRow(open ? null : u)}
            aria-expanded={open}
            aria-label={`${name}님 공유: ${ROLE_LABEL[role]}`}
            className={`h-8 pl-3 pr-2 rounded-full inline-flex items-center gap-1 text-meta font-bold shrink-0 transition-colors ${
              role === 'none'
                ? 'border border-black/15 dark:border-white/20 text-black/60 dark:text-white/60'
                : 'bg-lilac text-lilac-ink dark:bg-lilac-dark dark:text-lilac'
            }`}
          >
            {ROLE_LABEL[role]}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
        {open && (
          <div className="pb-2">
            <Segment<Role>
              block
              size="sm"
              ariaLabel={`${name}님 공유`}
              value={role}
              onChange={(r) => { setOpenRow(null); changeRole(u, name, r); }}
              options={[
                { value: 'none', label: ROLE_LABEL.none },
                { value: 'view', label: ROLE_LABEL.view },
                { value: 'edit', label: ROLE_LABEL.edit },
              ]}
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      {header}

      <section className={card}>
        <span className={label}>Friends</span>
        {!loaded ? (
          <span className={muted}>친구 목록을 불러오는 중</span>
        ) : friends.length === 0 && others.length === 0 ? (
          <span className={muted}>아직 친구가 없습니다. 설정 → Friends에서 초대 링크나 코드로 친구를 맺으면 여기서 공유할 수 있습니다.</span>
        ) : (
          <ul className="flex flex-col">
            {friends.map(f => personRow(f.uid, f.name, f))}
            {others.map(u => personRow(u, '친구 목록에 없는 회원', { uid: u }))}
          </ul>
        )}
        <span className={muted}>함께 편집하는 친구는 일정 · 사진 · 예약을 고칠 수 있고, 삭제와 공유 설정은 주인만 합니다.</span>
      </section>

      <section className={card}>
        <span className={label}>Link</span>
        <span className={muted}>{linkOn ? '링크가 있는 사람은 로그인 없이 이 여정을 볼 수 있습니다.' : '링크를 만들면 친구가 아닌 사람도 링크로 이 여정을 볼 수 있습니다.'}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink} disabled={busy === 'link'}>
            {busy === 'link' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Link2 className="w-3.5 h-3.5" aria-hidden />}
            {linkOn ? '링크 복사' : '링크 만들고 복사'}
          </button>
          {linkOn && trip.ownerId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={stopLink} disabled={busy === 'link'}>링크 끄기</button>
          )}
        </div>
      </section>
    </div>
  );
}
