/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#000000',
        muted: '#F3F4F6',
        accent: '#FDE047', // Yellow for AI highlights
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
      boxShadow: {
        'neo': '6px 6px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-active': '0px 0px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '4': '4px',
      },
      fontFamily: {
        sans: ['"Zen Maru Gothic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
