import React, { useRef } from 'react';

/**
 * While frozen, renders the element it had last, so React skips the whole subtree instead of rendering it again
 * for every change in the parent. Used for pages that sit under a full-screen drawer: they cannot be seen, and
 * re-rendering them is what made the first tap on a tab hitch.
 */
export function Freeze({ frozen, children }: { frozen: boolean; children: React.ReactNode }) {
  const last = useRef(children);
  if (!frozen) last.current = children;
  return <>{last.current}</>;
}
