/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'Inter', '"Noto Sans KR"', 'sans-serif'],
        satoshi: ['Satoshi', '"Noto Sans KR"', 'sans-serif'],
        inter: ['Inter', '"Noto Sans KR"', 'sans-serif'],
        noto: ['"Noto Sans KR"', 'sans-serif'],
        serif: ['Satoshi', 'Inter', '"Noto Sans KR"', 'sans-serif'],
        mono: ['"SF Mono"', 'Consolas', '"Noto Sans KR"', 'monospace'],
      },
      // Legibility floor: nothing smaller than `micro`. Size only (line-height inherits, like the arbitrary sizes they replace)
      fontSize: {
        micro: '11px', // uppercase mono labels, badges, coordinates
        meta: '12px',  // dates, places, units, helper text
      },
      // Motion tokens (mirrored as CSS variables in index.css)
      transitionDuration: {
        fast: '120ms',  // hover, press, toggles
        base: '220ms',  // dropdowns, tabs, toasts
        emph: '420ms',  // modals, panels, view changes
        hero: '900ms',  // splash, map flights
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(.16, 1, .3, 1)',
        spring: 'var(--ease-spring)',
      },
    },
  },
  plugins: [],
}
