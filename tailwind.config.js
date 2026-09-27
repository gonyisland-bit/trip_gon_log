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
    },
  },
  plugins: [],
}
