import React from 'react';
import { 
  Smile, SmilePlus, Laugh, Meh, Frown, Heart,
  Baby, Bird, Cat, Dog, Rabbit, Fish, User as DefaultUserIcon
} from 'lucide-react';
import { UserProfile } from '../types';

export interface PresetIconItem {
  id: string;
  label: string;
  category: 'face' | 'baby' | 'animal';
  icon: React.ComponentType<{ className?: string }>;
}

export const PROFILE_PRESET_ICONS: PresetIconItem[] = [
  // Faces
  { id: 'user', label: '기본 사람', category: 'face', icon: DefaultUserIcon },
  { id: 'smile', label: '미소', category: 'face', icon: Smile },
  { id: 'smile-plus', label: '행복', category: 'face', icon: SmilePlus },
  { id: 'laugh', label: '웃음', category: 'face', icon: Laugh },
  { id: 'meh', label: '무표정', category: 'face', icon: Meh },
  { id: 'frown', label: '아쉬움', category: 'face', icon: Frown },
  { id: 'heart', label: '하트', category: 'face', icon: Heart },
  // Baby
  { id: 'baby', label: '베이비', category: 'baby', icon: Baby },
  // Animals
  { id: 'bird', label: '새', category: 'animal', icon: Bird },
  { id: 'cat', label: '고양이', category: 'animal', icon: Cat },
  { id: 'dog', label: '강아지', category: 'animal', icon: Dog },
  { id: 'rabbit', label: '토끼', category: 'animal', icon: Rabbit },
  { id: 'fish', label: '물고기', category: 'animal', icon: Fish },
];

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-lg',
  '2xl': 'w-28 h-28 text-2xl',
};

const ICON_SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-10 h-10',
  '2xl': 'w-14 h-14',
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
  showBorder = true,
}: UserProfileAvatarProps) {
  const containerSize = SIZE_MAP[size] || SIZE_MAP.md;
  const iconSize = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;
  const borderClass = showBorder ? 'border border-black/15 dark:border-white/15' : '';

  // 1. Custom 1:1 Image
  if (profile?.profileType === 'image' && profile?.profileImage) {
    return (
      <div className={`relative overflow-hidden shrink-0 aspect-square rounded-none bg-black/5 dark:bg-white/5 ${containerSize} ${borderClass} ${className}`}>
        <img 
          src={profile.profileImage} 
          alt={profile.username || fallbackName || 'Profile'} 
          className="w-full h-full object-cover select-none"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 2. Preset Lucide Icon
  if (profile?.profileType === 'icon' && profile?.profileIcon) {
    const matched = PROFILE_PRESET_ICONS.find(i => i.id === profile.profileIcon);
    const IconComponent = matched ? matched.icon : Smile;
    return (
      <div className={`relative flex items-center justify-center shrink-0 aspect-square rounded-none bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white ${containerSize} ${borderClass} ${className}`}>
        <IconComponent className={`${iconSize} stroke-[2.2]`} />
      </div>
    );
  }

  // 3. Fallback Initial or Default User Icon
  const nameToUse = profile?.username || fallbackName || `${profile?.lastName || ''}${profile?.firstName || ''}`.trim();
  const initial = nameToUse ? nameToUse.charAt(0).toUpperCase() : '';

  if (initial) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 aspect-square rounded-none font-mono font-black uppercase bg-black text-white dark:bg-white dark:text-black ${containerSize} ${borderClass} ${className}`}>
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 aspect-square rounded-none bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 ${containerSize} ${borderClass} ${className}`}>
      <DefaultUserIcon className={`${iconSize} stroke-[2]`} />
    </div>
  );
}
