import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Plain dark greys — no accent colors
        dark: {
          bg: '#0d0d0d',
          surface: '#171717',
          border: '#2a2a2a',
          hover: '#202020',
          text: '#ececec',
          muted: '#8e8e8e',
          subtle: '#565656',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        'chat': '760px',
      },
    },
  },
  plugins: [typography],
}
