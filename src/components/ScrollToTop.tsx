import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 300px 이상 스크롤 시 버튼 표시
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="맨 위로 이동"
      title="TOP"
      className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border border-black/15 dark:border-white/15 shadow-xl transition-all duration-300 cursor-pointer select-none group ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-105 active:scale-95'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform duration-200" />
    </button>
  );
}
