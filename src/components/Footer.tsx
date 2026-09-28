import React from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = "mt-12" }: FooterProps) {
  return (
    <footer className={`border-t border-black/20 dark:border-white/20 py-6 px-4 md:px-12 flex justify-center items-center text-meta md:text-xs uppercase tracking-widest text-black/60 dark:text-white/60 transition-colors duration-300 w-full ${className}`}>
      <div>© 2026 Tripgon log. All rights reserved. | v{import.meta.env.VITE_APP_VERSION}</div>
    </footer>
  );
}
