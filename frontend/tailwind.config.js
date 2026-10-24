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
        // Carbon Matte & Sunset Coral Theme
        carbon: {
          bg: '#09090b',
          sidebar: '#0d0d10',
          card: '#121216',
          surface: '#18181c',
          hover: '#222227',
          border: '#27272d',
          borderLight: '#35353c',
          text: '#f4f4f6',
          muted: '#a1a1aa',
          subtle: '#71717a',
        },
        coral: {
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Backwards-compatible mappings for dark
        dark: {
          bg: '#09090b',
          surface: '#121216',
          border: '#27272d',
          hover: '#1c1c22',
          text: '#f4f4f6',
          muted: '#a1a1aa',
          subtle: '#71717a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        'chat': '780px',
      },
      boxShadow: {
        'coral-glow': '0 0 25px -4px rgba(244, 63, 94, 0.25)',
        'coral-glow-sm': '0 0 15px -2px rgba(244, 63, 94, 0.20)',
        'carbon-card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [typography],
}
