/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Megan brand palette — deep violet/indigo/cyan
        megan: {
          50:  '#f0eeff',
          100: '#e1dcff',
          200: '#c4baff',
          300: '#a48dff',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
          950: '#1a0940',
        },
        // Cyan accent (CloudStudio-inspired shift)
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Surface system
        surface: {
          950: '#09090f',
          900: '#0f0f1a',
          800: '#16162a',
          700: '#1e1e35',
          600: '#26263f',
          500: '#30304d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-megan': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 40%, #0ea5e9 100%)',
        'gradient-megan-subtle': 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(14,165,233,0.1) 100%)',
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(139, 92, 246, 0.35)',
        'glow':     '0 0 24px rgba(139, 92, 246, 0.45)',
        'glow-lg':  '0 0 40px rgba(139, 92, 246, 0.5)',
        'glow-cyan': '0 0 20px rgba(14, 165, 233, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'gradient-shift': 'gradientShift 6s ease infinite',
        'glow-pulse':     'glowPulse 2s ease infinite',
        'record-pulse':   'recordPulse 1.2s ease infinite',
        'fade-slide-in':  'fadeSlideIn 0.25s ease forwards',
        'fade-in':        'fadeIn 0.2s ease forwards',
        'shimmer':        'shimmer 1.6s linear infinite',
        'typing-dot':     'typingDot 1.2s ease infinite',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':       { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':       { opacity: '0.8', transform: 'scale(1.08)' },
        },
        recordPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.6)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%':            { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
