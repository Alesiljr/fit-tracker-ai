import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--border) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8d9ff',
          300: '#7ebfff',
          400: '#4aa3ff',
          500: '#2b8aff',
          600: '#1a6fd4',
          700: '#1457a8',
          800: '#0f3f7d',
          900: '#0a2952',
        },
        accent: {
          50: '#fff5f2',
          100: '#ffe8e0',
          200: '#ffc9b8',
          300: '#ffa68e',
          400: '#ff8566',
          500: '#ff6b45',
          600: '#e55530',
          700: '#bf4020',
        },
        mood: {
          1: '#94a3b8',
          2: '#a1a1aa',
          3: '#86efac',
          4: '#fbbf24',
          5: '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        chat: '1.5rem',
      },
      boxShadow: {
        chat: '0 2px 8px rgba(0,0,0,0.08)',
        fab: '0 4px 12px rgba(43,138,255,0.3)',
      },
      animation: {
        'bounce-once': 'bounce 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
