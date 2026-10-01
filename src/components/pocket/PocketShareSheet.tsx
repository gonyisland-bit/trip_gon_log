import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { SpotPocketItem } from '../../types';
import { Sheet } from '../Sheet';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { useFriends } from '../friends/useFriends';
import { currentUid } from '../../utils/ownership';
import { friendLabel } from '../../utils/friends';

// Sharing one pocket spot: tap the friends who should see it. Each tap saves at once; friends
// see only the spots shared with them, read-only, and can keep a copy in their own pocket.

interface Props {
  spot: SpotPocketItem;
  onChange: (sharedWith: string[]) => Promise<void> | void;
  onClose: () => void;
}

export function PocketShareSheet({ spot, onChange, onClose }: Props) {
  const { friends, loaded } = useFriends(currentUid());
  const [shared, setShared] = useState<string[]>(spot.sharedWith || []);

  const toggle = (uid: string) => {
    const next = shared.includes(uid) ? shared.filter(u => u !== uid) : [...shared, uid];
    setShared(next);
    onChange(next);
  };

  return (
    <Sheet label={`${spot.title} 공유`} onClose={onClose} tone="paper" zIndex={100001} panelClassName="sm:max-w-md max-h-[80dvh]">
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-0.5 px-1">
          <h2 className="text-[20px] font-extrabold tracking-tight">이 장소 공유</h2>
          <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{spot.title}</span>
        </div>
        <section className="rounded-card bg-surface dark:bg-surface-dark p-2 flex flex-col">
          {!loaded ? (
            <span className="p-3 text-meta text-black/55 dark:text-white/55">친구 목록을 불러오는 중</span>
          ) : friends.length === 0 ? (
            <span className="p-3 text-meta text-black/55 dark:text-white/55 break-keep">아직 친구가 없습니다. 설정 → 나 → Friends에서 초대 링크나 코드로 친구를 맺어 주세요.</span>
          ) : friends.map(f => {
            const on = shared.includes(f.uid);
            return (
              <button
                key={f.uid}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(f.uid)}
                className="flex items-center gap-3 min-h-[52px] px-2 rounded-thumb text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
              >
                <UserProfileAvatar profile={f} size="md" fallbackName={f.name} />
                <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{friendLabel(f)}</span>
                <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition-colors ${on ? 'bg-ink text-surface dark:bg-ink-dark dark:text-paper-dark' : 'border border-black/20 dark:border-white/25 text-transparent'}`}>
                  <Check className="w-4 h-4" aria-hidden />
                </span>
              </button>
            );
          })}
        </section>
        <span className="px-1 text-meta text-black/55 dark:text-white/55 break-keep">고른 친구의 포켓 화면에 이 장소만 보입니다. 내 메모를 고치면 함께 바뀝니다.</span>
      </div>
    </Sheet>
  );
}
