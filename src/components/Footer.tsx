import React from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = "mt-12" }: FooterProps) {
  return (
    <footer className={`border-t border-black/20 dark:border-white/20 p-6 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs uppercase tracking-widest text-black/50 dark:text-white/50 transition-colors duration-300 w-full gap-4 md:gap-0 ${className}`}>
      <div>© 2026 Tripgon log. All rights reserved. | v{import.meta.env.VITE_APP_VERSION || '0.3c'}</div>
      <div className="flex space-x-6">
        <span className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Instagram</span>
        <span className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Twitter</span>
        <span className="hover:text-black dark:hover:text-white cursor-pointer transition-colors">Contact</span>
      </div>
    </footer>
  );
}
