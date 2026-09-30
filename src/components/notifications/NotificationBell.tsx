import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Sheet, useSheetClose } from '../Sheet';
import { UserProfileAvatar } from '../UserProfileAvatar';
import {
  markRead, notificationText, pruneOld, subscribeNotifications, type AppNotification,
} from '../../utils/notifications';

// The header bell (v1.3.6 6-a): unread count, and a sheet with friends' news. Opening a
// notification goes to what it is about and marks it read.

interface Props {
  uid: string;
  onOpenJourney: (id: number) => void;
  onOpenPocket: () => void;
  onOpenFriends: () => void;
}

function timeAgo(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ms).toLocaleDateString('ko-KR');
}

export function NotificationBell({ uid, onOpenJourney, onOpenPocket, onOpenFriends }: Props) {
  const [list, setList] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeNotifications(setList), [uid]);

  const unread = list.filter(n => !n.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target relative w-9 h-9 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors inline-flex items-center justify-center shrink-0"
        title="알림"
        aria-label={unread ? `알림, 읽지 않은 알림 ${unread}개` : '알림'}
      >
        <Bell className="w-4 h-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold leading-4 text-center tabular-nums" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <Sheet label="알림" onClose={() => setOpen(false)} tone="paper" panelClassName="sm:max-w-md max-h-[86dvh]">
          <List list={list} onOpenJourney={onOpenJourney} onOpenPocket={onOpenPocket} onOpenFriends={onOpenFriends} />
        </Sheet>
      )}
    </>
  );
}

function List({ list, onOpenJourney, onOpenPocket, onOpenFriends }: Omit<Props, 'uid'> & { list: AppNotification[] }) {
  const close = useSheetClose();
  useEffect(() => { pruneOld(list).catch(() => {}); }, []);
  const unreadIds = list.filter(n => !n.read).map(n => n.id);

  const openOne = (n: AppNotification) => {
    if (!n.read) markRead([n.id]).catch(() => {});
    close();
    if ((n.kind === 'journey_shared' || n.kind === 'journey_edited') && n.tripId) onOpenJourney(n.tripId);
    else if (n.kind === 'pocket_shared') onOpenPocket();
    else onOpenFriends();
  };

  return (
    <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-[20px] font-extrabold tracking-tight">알림</h2>
        {unreadIds.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead(unreadIds).catch(() => {})}>
            <CheckCheck className="w-3.5 h-3.5" aria-hidden />모두 읽음
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="rounded-card bg-surface dark:bg-surface-dark p-6 flex flex-col items-center gap-2 text-center">
          <Bell className="w-6 h-6 text-black/40 dark:text-white/40" aria-hidden />
          <span className="text-meta text-black/55 dark:text-white/55 break-keep">친구가 여정을 공유하거나 함께 쓰는 여정을 고치면 여기에 알려 드립니다.</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map(n => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openOne(n)}
                className={`w-full flex items-start gap-3 text-left p-3 rounded-card transition-colors ${n.read ? 'bg-surface dark:bg-surface-dark' : 'bg-selected dark:bg-selected-dark'} hover:bg-black/[0.04] dark:hover:bg-white/[0.08]`}
              >
                <UserProfileAvatar profile={{ uid: n.from, profileType: n.profileType, profileIcon: n.profileIcon, profileImage: n.profileImage }} size="md" fallbackName={n.fromName} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className={`text-[14px] leading-snug break-keep ${n.read ? 'font-medium' : 'font-bold'}`}>{notificationText(n)}</span>
                  <span className="font-mono text-micro text-black/50 dark:text-white/50 tabular-nums">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-red-600 shrink-0" aria-label="읽지 않음" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
