import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, Loader2, UserMinus } from 'lucide-react';
import type { Trip } from '../../types';
import { Sheet, useSheetClose } from '../Sheet';
import { Segment } from '../ui/Segment';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { setJourneyPeople } from '../../utils/ownership';
import { friendLabel, friendPockets, removeFriend, saveFriendNote, setPocketShared, subscribePocketSharing, type Friend, type PersonCard } from '../../utils/friends';
import { confirmDialog, notify } from '../../utils/feedback';

// One friend's drawer (v1.3.6 5-d): which of my journeys they see or edit, whether they see my
// pockets, and what they share with me.

type Role = 'none' | 'view' | 'edit';

interface Props {
  friend: Friend;
  me: PersonCard;
  journeys: Trip[];
  onClose: () => void;
  onOpenJourney: (id: number) => void;
  onOpenPocket: () => void;
}

export function FriendDrawer(props: Props) {
  return (
    <Sheet label={`${friendLabel(props.friend)}님`} onClose={props.onClose} tone="paper" zIndex={196} panelClassName="sm:max-w-md max-h-[88dvh]">
      <Body {...props} />
    </Sheet>
  );
}

const card = 'rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3';
const label = 'font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55';
const muted = 'text-meta text-black/55 dark:text-white/55 break-keep';

function roleOf(trip: Trip, uid: string): Role {
  return trip.editors?.includes(uid) ? 'edit' : trip.access?.includes(uid) ? 'view' : 'none';
}

function Body({ friend, me, journeys, onOpenJourney, onOpenPocket }: Props) {
  const close = useSheetClose();
  const [busy, setBusy] = useState<string | null>(null);
  // Optimistic roles while a change is being saved (the journey snapshot follows)
  const [pending, setPending] = useState<Record<number, Role>>({});
  const [pocketOn, setPocketOn] = useState<boolean | null>(null);
  const [theirPockets, setTheirPockets] = useState<number | null>(null);

  useEffect(() => subscribePocketSharing(uids => setPocketOn(uids.includes(friend.uid))), [friend.uid]);
  useEffect(() => { friendPockets(friend.uid).then(items => setTheirPockets(items ? items.length : null)); }, [friend.uid]);

  const mine = journeys.filter(j => j.ownerId === me.uid);
  const theirs = journeys.filter(j => j.ownerId === friend.uid);

  const changeRole = async (trip: Trip, role: Role) => {
    const access = trip.access || [me.uid];
    const editors = trip.editors || [];
    const nextEditors = role === 'edit' ? [...editors.filter(u => u !== friend.uid), friend.uid] : editors.filter(u => u !== friend.uid);
    const nextAccess = role === 'none' ? access.filter(u => u !== friend.uid) : Array.from(new Set([...access, friend.uid]));
    setPending(p => ({ ...p, [trip.id]: role }));
    setBusy(`trip-${trip.id}`);
    try {
      await setJourneyPeople(trip.id, nextAccess, nextEditors, me);
    } catch (err) {
      console.warn('Share change failed:', err);
      notify('공유를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setPending(p => { const n = { ...p }; delete n[trip.id]; return n; });
      setBusy(null);
    }
  };

  const togglePocket = async (on: boolean) => {
    setBusy('pocket');
    setPocketOn(on);
    try {
      await setPocketShared(friend.uid, on);
      notify(on ? `${friend.name}님이 내 포켓을 볼 수 있습니다.` : `${friend.name}님에게 포켓을 보여주지 않습니다.`, 'success');
    } catch {
      setPocketOn(!on);
      notify('포켓 공유를 바꾸지 못했습니다.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const unfriend = async () => {
    const ok = await confirmDialog(`${friend.name}님과 친구를 끊을까요? 서로 공유한 여정과 포켓도 더 이상 보이지 않습니다.`, { title: 'UNFRIEND', confirmLabel: '친구 끊기', danger: true });
    if (!ok) return;
    setBusy('unfriend');
    try {
      await removeFriend(friend.uid);
      notify(`${friend.name}님과 친구를 끊었습니다.`, 'success');
      close();
    } catch (err) {
      console.warn('Unfriend failed:', err);
      notify('친구를 끊지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBusy(null);
    }
  };

  const journeyThumb = (t: Trip) => (
    <img src={cardCoverUrl(t)} alt="" className="w-11 h-11 rounded-thumb object-cover bg-black/5 dark:bg-white/10 shrink-0" />
  );

  return (
    <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex items-center gap-3 px-1">
        <UserProfileAvatar profile={friend} size="lg" fallbackName={friend.name} />
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[20px] font-extrabold tracking-tight truncate">{friendLabel(friend)}</span>
          {friend.alias && <span className="text-meta text-black/55 dark:text-white/55 truncate">{friend.name}</span>}
          {friend.since > 0 && (
            <span className="font-mono text-micro text-black/55 dark:text-white/55 tabular-nums">
              {new Date(friend.since).toLocaleDateString('ko-KR')}부터 친구
            </span>
          )}
        </span>
      </div>

      {/* What I call them and who they are to me: only on my friend list (v1.3.7) */}
      <FriendNote friend={friend} />

      <section className={card}>
        <div className="flex items-baseline justify-between">
          <span className={label}>My journeys</span>
          <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">
            {mine.filter(t => roleOf(t, friend.uid) !== 'none').length} / {mine.length}
          </span>
        </div>
        {mine.length === 0 ? (
          <span className={muted}>아직 만든 여정이 없습니다.</span>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map(t => (
              <li key={t.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {journeyThumb(t)}
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[14px] font-bold truncate">{t.title}</span>
                    <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{t.date}</span>
                  </span>
                  {busy === `trip-${t.id}` && <Loader2 className="w-4 h-4 animate-spin text-black/50 dark:text-white/50" aria-hidden />}
                </div>
                <Segment<Role>
                  block
                  size="sm"
                  ariaLabel={`${t.title} 공유`}
                  value={pending[t.id] ?? roleOf(t, friend.uid)}
                  onChange={(r) => changeRole(t, r)}
                  options={[
                    { value: 'none', label: '공유 안 함' },
                    { value: 'view', label: '보기' },
                    { value: 'edit', label: '함께 편집' },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <span className={label}>My pocket</span>
        <div className="flex items-center gap-3">
          <Bookmark className="w-[18px] h-[18px] shrink-0" aria-hidden />
          <span className="flex-1 min-w-0 text-[14px] font-bold">내 포켓 보여주기</span>
          {pocketOn !== null && (
            <Segment<'on' | 'off'>
              size="sm"
              ariaLabel="내 포켓 보여주기"
              value={pocketOn ? 'on' : 'off'}
              onChange={(v) => { if (busy !== 'pocket') togglePocket(v === 'on'); }}
              options={[{ value: 'off', label: '숨기기' }, { value: 'on', label: '보여주기' }]}
            />
          )}
        </div>
        <span className={muted}>켜면 {friend.name}님의 포켓 화면에 내 포켓이 보이고, 마음에 드는 장소를 담아 갈 수 있습니다. 보기만 할 수 있습니다.</span>
      </section>

      <section className={card}>
        <span className={label}>Shared with me</span>
        {theirs.length === 0 && theirPockets === null ? (
          <span className={muted}>{friend.name}님이 아직 공유한 것이 없습니다.</span>
        ) : (
          <ul className="flex flex-col gap-2">
            {theirs.map(t => (
              <li key={t.id}>
                <button type="button" onClick={() => { close(); onOpenJourney(t.id); }} className="w-full flex items-center gap-3 text-left rounded-thumb hover:bg-black/[0.03] dark:hover:bg-white/[0.05] -mx-1 px-1 py-0.5">
                  {journeyThumb(t)}
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[14px] font-bold truncate">{t.title}</span>
                    <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">
                      {t.date} · {t.editors?.includes(me.uid) ? '함께 편집' : '보기'}
                    </span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-black/50 dark:text-white/50" aria-hidden />
                </button>
              </li>
            ))}
            {theirPockets !== null && (
              <li>
                <button type="button" onClick={() => { close(); onOpenPocket(); }} className="w-full flex items-center gap-3 text-left rounded-thumb hover:bg-black/[0.03] dark:hover:bg-white/[0.05] -mx-1 px-1 py-0.5">
                  <span className="w-11 h-11 rounded-thumb bg-black/[0.05] dark:bg-white/10 grid place-items-center shrink-0"><Bookmark className="w-[18px] h-[18px]" aria-hidden /></span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[14px] font-bold truncate">{friend.name}님의 포켓</span>
                    <span className="font-mono text-micro text-black/50 dark:text-white/50 tabular-nums">{theirPockets}곳</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-black/50 dark:text-white/50" aria-hidden />
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      <button type="button" className="btn btn-outline-danger btn-sm self-start" onClick={unfriend} disabled={busy !== null}>
        {busy === 'unfriend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <UserMinus className="w-3.5 h-3.5" aria-hidden />}
        친구 끊기
      </button>
    </div>
  );
}

function FriendNote({ friend }: { friend: Friend }) {
  const [alias, setAlias] = useState(friend.alias || '');
  const [memo, setMemo] = useState(friend.memo || '');
  const save = (patch: { alias?: string; memo?: string }) => {
    saveFriendNote(friend.uid, patch).catch(() => notify('메모를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error'));
  };
  return (
    <section className={card}>
      <span className={label}>My note</span>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold">내가 부르는 이름</span>
        <input
          id={`friend-alias-${friend.uid}`}
          value={alias}
          maxLength={30}
          onChange={(e) => setAlias(e.target.value)}
          onBlur={() => { if (alias.trim() !== (friend.alias || '')) save({ alias }); }}
          placeholder={`${friend.name} (예: 대학 동기 지민)`}
          className="h-11 px-4 rounded-full border border-black/15 dark:border-white/15 bg-transparent text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold">메모</span>
        <textarea
          id={`friend-memo-${friend.uid}`}
          value={memo}
          maxLength={300}
          rows={3}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => { if (memo.trim() !== (friend.memo || '')) save({ memo }); }}
          placeholder="어떻게 아는 사이인지, 함께 가고 싶은 곳 같은 메모"
          className="px-4 py-3 rounded-card border border-black/15 dark:border-white/15 bg-transparent text-[14px] outline-none resize-none focus-visible:ring-2 focus-visible:ring-red-600"
        />
      </label>
      <span className={muted}>나만 볼 수 있습니다. 친구에게는 보이지 않아요.</span>
    </section>
  );
}
