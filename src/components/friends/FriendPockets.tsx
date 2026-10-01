import React, { useEffect, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import type { SpotPocketItem } from '../../types';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { Chip } from '../ui/Chip';
import { currentUid } from '../../utils/ownership';
import { getCardThumbUrl } from '../../utils/pocketStorage';
import { friendPockets, type Friend } from '../../utils/friends';
import { useFriends } from './useFriends';

// Friends' pockets on the pocket page (v1.3.6 5-d): the pockets of friends who show them to me,
// read-only, with a button to keep a spot in my own pocket.

interface Props {
  /** Titles already in my pocket, so a kept spot shows as kept */
  keptKeys: Set<string>;
  onKeep: (spot: SpotPocketItem, from: Friend) => Promise<void> | void;
}

export function spotKey(s: Pick<SpotPocketItem, 'title' | 'sourceUrl'>): string {
  return `${(s.title || '').trim().toLowerCase()}|${s.sourceUrl || ''}`;
}

export function FriendPockets({ keptKeys, onKeep }: Props) {
  const { friends, loaded } = useFriends(currentUid());
  const [shared, setShared] = useState<Array<{ friend: Friend; items: SpotPocketItem[] }>>([]);
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [keeping, setKeeping] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    Promise.all(friends.map(async f => ({ friend: f, items: await friendPockets(f.uid) })))
      .then(list => {
        if (!alive) return;
        const visible = list.filter((x): x is { friend: Friend; items: SpotPocketItem[] } => Array.isArray(x.items) && x.items.length > 0);
        setShared(visible);
        setOpenUid(prev => (prev && visible.some(v => v.friend.uid === prev) ? prev : null));
      });
    return () => { alive = false; };
  }, [loaded, friends.map(f => f.uid).join()]);

  if (!shared.length) return null;
  const open = shared.find(s => s.friend.uid === openUid);

  return (
    <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-4 border-b border-black/10 dark:border-white/10 flex flex-col gap-3" aria-label="친구 포켓">
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
        <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55 shrink-0">Friends</span>
        {shared.map(({ friend, items }) => (
          <Chip key={friend.uid} selected={openUid === friend.uid} onClick={() => setOpenUid(prev => (prev === friend.uid ? null : friend.uid))} count={items.length}>
            <UserProfileAvatar profile={friend} size="xs" fallbackName={friend.name} />
            {friend.name}님의 포켓
          </Chip>
        ))}
      </div>

      {open && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {open.items.map(spot => {
            const kept = keptKeys.has(spotKey(spot));
            const thumb = getCardThumbUrl(spot);
            return (
              <li key={spot.id} className="min-w-0 rounded-card overflow-hidden bg-surface dark:bg-surface-dark flex flex-col">
                <div className="aspect-[4/3] bg-black/[0.05] dark:bg-white/10">
                  {thumb && <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="p-2.5 flex flex-col gap-2 flex-1">
                  <span className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold leading-snug line-clamp-2 break-keep">{spot.title}</span>
                    {(spot.city || spot.country) && (
                      <span className="font-mono text-micro uppercase tracking-wider text-black/50 dark:text-white/50 truncate">{[spot.city, spot.country].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm mt-auto ${kept ? 'btn-ghost' : 'btn-secondary'}`}
                    disabled={kept || keeping !== null}
                    onClick={async () => {
                      setKeeping(spot.id);
                      try { await onKeep(spot, open.friend); } finally { setKeeping(null); }
                    }}
                  >
                    {keeping === spot.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : kept ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Plus className="w-3.5 h-3.5" aria-hidden />}
                    {kept ? '담음' : '내 포켓에 담기'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
