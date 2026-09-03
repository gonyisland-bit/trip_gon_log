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
      },
    },
  },
  plugins: [],
}
