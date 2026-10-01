import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, ChevronDown, Loader2, UserMinus } from 'lucide-react';
import type { Trip } from '../../types';
import { Sheet, useSheetClose } from '../Sheet';
import { Segment } from '../ui/Segment';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { setJourneyPeople } from '../../utils/ownership';
import { friendLabel, friendPockets, removeFriend, saveFriendNote, type Friend, type PersonCard } from '../../utils/friends';
import { subscribePockets } from '../../utils/pocketStorage';
import type { SpotPocketItem } from '../../types';
import { confirmDialog, notify } from '../../utils/feedback';

// One friend's drawer (v1.3.6 5-d): which of my journeys they see or edit, which of my pocket
// spots they see, and what they share with me. Journeys are one line each with a role chip; the
// chip opens the three choices under its row, and only shared journeys show until "전체".

type Role = 'none' | 'view' | 'edit';
const ROLE_LABEL: Record<Role, string> = { none: '공유 안 함', view: '보기', edit: '함께 편집' };
const FIRST_ROWS = 6;

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
  const [mySpots, setMySpots] = useState<SpotPocketItem[]>([]);
  const [theirPockets, setTheirPockets] = useState<number | null>(null);
  const [scope, setScope] = useState<'shared' | 'all'>('shared');
  const [showAll, setShowAll] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);

  useEffect(() => subscribePockets(setMySpots), []);
  useEffect(() => { friendPockets(friend.uid).then(items => setTheirPockets(items ? items.length : null)); }, [friend.uid]);

  const mine = journeys.filter(j => j.ownerId === me.uid);
  const sharedSpots = mySpots.filter(s => s.sharedWith?.includes(friend.uid));
  const roleNow = (t: Trip) => pending[t.id] ?? roleOf(t, friend.uid);
  const sharedJourneys = mine.filter(t => roleNow(t) !== 'none');
  const listed = scope === 'shared' ? sharedJourneys : mine;
  const visible = showAll ? listed : listed.slice(0, FIRST_ROWS);
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

  const unfriend = async () => {
    const ok = await confirmDialog(`${friend.name}님과 친구를 끊을까요? 서로 공유한 여정과 포켓 장소도 더 이상 보이지 않습니다.`, { title: 'UNFRIEND', confirmLabel: '친구 끊기', danger: true });
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
        <div className="flex items-center justify-between gap-2">
          <span className={label}>My journeys</span>
          {mine.length > 0 && (
            <Segment<'shared' | 'all'>
              size="sm"
              ariaLabel="보여 줄 여정"
              value={scope}
              onChange={(v) => { setScope(v); setShowAll(false); setOpenRow(null); }}
              options={[
                { value: 'shared', label: `공유 중 ${sharedJourneys.length}` },
                { value: 'all', label: `전체 ${mine.length}` },
              ]}
            />
          )}
        </div>
        {mine.length === 0 ? (
          <span className={muted}>아직 만든 여정이 없습니다.</span>
        ) : listed.length === 0 ? (
          <span className={muted}>{friend.name}님과 공유 중인 여정이 없습니다. 전체에서 골라 공유할 수 있습니다.</span>
        ) : (
          <ul className="flex flex-col -mx-1">
            {visible.map(t => {
              const role = roleNow(t);
              const open = openRow === t.id;
              return (
                <li key={t.id} className="flex flex-col">
                  <div className="flex items-center gap-3 min-h-[52px] px-1">
                    {journeyThumb(t)}
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[14px] font-bold truncate">{t.title}</span>
                      <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{t.date}</span>
                    </span>
                    {busy === `trip-${t.id}` && <Loader2 className="w-4 h-4 animate-spin text-black/50 dark:text-white/50" aria-hidden />}
                    <button
                      type="button"
                      onClick={() => setOpenRow(open ? null : t.id)}
                      aria-expanded={open}
                      aria-label={`${t.title} 공유: ${ROLE_LABEL[role]}`}
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
                    <div className="px-1 pb-2">
                      <Segment<Role>
                        block
                        size="sm"
                        ariaLabel={`${t.title} 공유`}
                        value={role}
                        onChange={(r) => { setOpenRow(null); changeRole(t, r); }}
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
            })}
          </ul>
        )}
        {listed.length > FIRST_ROWS && (
          <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => setShowAll(v => !v)}>
            {showAll ? '접기' : `모두 보기 · ${listed.length - FIRST_ROWS}개 더`}
          </button>
        )}
      </section>

      <section className={card}>
        <span className={label}>My pocket</span>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-thumb bg-black/[0.05] dark:bg-white/10 grid place-items-center shrink-0"><Bookmark className="w-[18px] h-[18px]" aria-hidden /></span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[14px] font-bold">공유한 장소</span>
            <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">
              {sharedSpots.length ? sharedSpots.slice(0, 3).map(s => s.title).join(' · ') : '아직 없음'}
            </span>
          </span>
          <span className="font-mono text-meta font-bold tabular-nums shrink-0">{sharedSpots.length}곳</span>
        </div>
        <span className={muted}>포켓에서 장소를 열고 공유 버튼으로 {friend.name}님을 고르면 그 장소만 보입니다.</span>
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
