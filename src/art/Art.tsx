import React from 'react';
import type { ArtId } from './catalog';

// A scene from the traveler sheet (public/art, traced from assets/art-sheet.webp). Two files, one
// per theme: lines turn light and the hair stays black in the dark, so it follows the app's own
// light / dark switch (the `dark` class) and not just the system setting.

export const artSrc = (id: ArtId, dark = false) => `/art/${dark ? 'dark/' : ''}${id}.svg`;

interface ArtProps {
  id: ArtId;
  /** Applied to both theme images: size it with `h-` or `w-` (the scene is square) */
  className?: string;
  /** Empty for decoration; a short description when the scene carries meaning */
  alt?: string;
  eager?: boolean;
}

export function Art({ id, className = '', alt = '', eager }: ArtProps) {
  const common = { loading: eager ? 'eager' : 'lazy', decoding: 'async', draggable: false } as const;
  return (
    <>
      <img src={artSrc(id)} alt={alt} {...common} className={`dark:hidden select-none ${className}`} />
      <img src={artSrc(id, true)} alt="" aria-hidden {...common} className={`hidden dark:block select-none ${className}`} />
    </>
  );
}
