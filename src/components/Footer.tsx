import React from 'react';

interface FooterProps {
  className?: string;
}

// One line on every width; the intro opens from the menu, the command palette and the empty hero
export function Footer({ className = "mt-12" }: FooterProps) {
  return (
    <footer className={`border-t border-black/20 dark:border-white/20 py-6 px-4 md:px-12 flex justify-center items-center text-meta md:text-xs uppercase tracking-widest text-black/60 dark:text-white/60 transition-colors duration-300 w-full ${className}`}>
      <div className="whitespace-nowrap">© 2026 Tripgon log.<span className="hidden sm:inline"> All rights reserved.</span> · v{import.meta.env.VITE_APP_VERSION}</div>
    </footer>
  );
}
