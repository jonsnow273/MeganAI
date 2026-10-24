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
        // Light blue gradient theme colors
        skytheme: {
          50: '#f8fbff',
          100: '#f0f7fe',
          150: '#e6f2fd',
          200: '#dbeafe',
          300: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        slate: {
          850: '#152033',
        },
        // Backwards compatibility mappings mapped to soft light theme
        dark: {
          bg: '#f4f8fe',
          surface: '#ffffff',
          border: '#e1effe',
          hover: '#edf5ff',
          text: '#0f172a',
          muted: '#64748b',
          subtle: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        'chat': '780px',
      },
      boxShadow: {
        'gemini': '0 8px 30px -4px rgba(12, 74, 110, 0.08), 0 4px 12px -2px rgba(12, 74, 110, 0.04)',
        'gemini-sm': '0 2px 8px -1px rgba(12, 74, 110, 0.06)',
      },
    },
  },
  plugins: [typography],
}
