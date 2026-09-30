import React from 'react';
import { UserProfile } from '../types';
import { FLAT_AVATARS, flatAvatarById, flatAvatarFor } from './profile/FlatAvatars';

// Profile picture: the person's own 1:1 image, a flat illustration they picked, or, when
// they have neither, a stable illustration chosen from their id or name (v1.3.6).

export interface PresetIconItem {
  id: string;
  label: string;
  category: 'face' | 'baby' | 'animal';
  icon: React.ComponentType<{ className?: string }>;
}

export const PROFILE_PRESET_ICONS: PresetIconItem[] = FLAT_AVATARS.map(a => ({
  id: a.id,
  label: a.label,
  category: a.category,
  icon: a.art,
}));

const SIZE_MAP = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

interface UserProfileAvatarProps {
  profile?: Partial<UserProfile> | null;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  fallbackName?: string;
  showBorder?: boolean;
}

export function UserProfileAvatar({
  profile,
  size = 'md',
  className = '',
  fallbackName = '',
  showBorder = false,
}: UserProfileAvatarProps) {
  const box = `relative shrink-0 aspect-square rounded-full overflow-hidden ${SIZE_MAP[size] || SIZE_MAP.md} ${
    showBorder ? 'ring-1 ring-black/10 dark:ring-white/15' : ''
  } ${className}`;

  if (profile?.profileType === 'image' && profile?.profileImage) {
    return (
      <div className={`${box} bg-black/5 dark:bg-white/5`}>
        <img
          src={profile.profileImage}
          alt={profile.username || fallbackName || 'Profile'}
          className="w-full h-full object-cover select-none"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  const picked = profile?.profileType === 'icon' ? flatAvatarById(profile.profileIcon) : undefined;
  const seed = profile?.uid || profile?.username || fallbackName || `${profile?.lastName || ''}${profile?.firstName || ''}` || 'guest';
  const Art = (picked ?? flatAvatarFor(seed)).art;
  return (
    <div className={box}>
      <Art className="w-full h-full block" />
    </div>
  );
}
