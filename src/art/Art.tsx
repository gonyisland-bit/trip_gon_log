import React from 'react';
import type { ArtId } from './catalog';

// A scene of the bear (public/art, built from assets/illust by scripts/art/build.py). The pictures are
// full colour and stand on a transparent ground, so one file serves the light and the dark theme.

export const artSrc = (id: ArtId) => `/art/${id}.webp`;

interface ArtProps {
  id: ArtId;
  /** Size it with `h-` or `w-`; scenes are portrait or square, so the other side follows */
  className?: string;
  /** Empty for decoration; a short description when the scene carries meaning */
  alt?: string;
  eager?: boolean;
}

export function Art({ id, className = '', alt = '', eager }: ArtProps) {
  return (
    <img
      src={artSrc(id)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}
