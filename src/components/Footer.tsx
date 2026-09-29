import React from 'react';
import { openIntro, prefetchIntro } from '../intro/openIntro';

interface FooterProps {
  className?: string;
}

export function Footer({ className = "mt-12" }: FooterProps) {
  return (
    <footer className={`border-t border-black/20 dark:border-white/20 py-6 px-4 md:px-12 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-meta md:text-xs uppercase tracking-widest text-black/60 dark:text-white/60 transition-colors duration-300 w-full ${className}`}>
      <div>© 2026 Tripgon log. All rights reserved. | v{import.meta.env.VITE_APP_VERSION}</div>
      <button type="button" onClick={openIntro} onPointerEnter={prefetchIntro} onFocus={prefetchIntro} className="uppercase tracking-widest hover:text-red-600 dark:hover:text-red-400 underline-offset-4 hover:underline cursor-pointer">
        Intro
      </button>
    </footer>
  );
}
