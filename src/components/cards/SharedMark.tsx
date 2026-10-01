import React from 'react';
import type { Trip } from '../../types';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { currentUid } from '../../utils/ownership';

// "함께" on a journey a friend shared with me (v1.3.6 5-b): the owner's picture and a label.

export type SharedOwner = NonNullable<Trip['ownerCard']>;

/** The owner of a journey someone else shared with me, or null for my own journeys */
export function sharedOwner(trip: Pick<Trip, 'ownerId' | 'ownerCard'>): SharedOwner | null {
  const uid = currentUid();
  if (!uid || !trip.ownerId || trip.ownerId === uid) return null;
  return trip.ownerCard || { name: '친구' };
}

export function SharedMark({ owner, tone, compact }: { owner: SharedOwner; tone: 'photo' | 'row'; compact?: boolean }) {
  // On a photo corner only the picture shows, so it never meets the badges along the bottom
  if (compact) {
    return (
      <span className="grid place-items-center w-9 h-9 rounded-full bg-black/35" title={`${owner.name}님이 공유한 여정`} aria-label={`${owner.name}님이 공유한 여정`}>
        <UserProfileAvatar profile={owner} size="sm" fallbackName={owner.name} />
      </span>
    );
  }
  const cls = tone === 'photo'
    ? 'bg-black/35 text-white'
    : 'bg-black/[0.06] dark:bg-white/10 text-black/75 dark:text-white/80';
  return (
    <span className={`inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full font-mono text-micro font-bold tracking-wider leading-tight ${cls}`} title={`${owner.name}님이 공유한 여정`}>
      <UserProfileAvatar profile={owner} size="xs" fallbackName={owner.name} />
      <span>함께</span>
    </span>
  );
}
