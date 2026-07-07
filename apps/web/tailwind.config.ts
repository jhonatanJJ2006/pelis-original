import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        cinema: {
          bg: '#0a0a0f',
          surface: '#141418',
          elevated: '#1e1e26',
          border: '#2a2a35',
          accent: '#e50914',
          'accent-light': '#ff1a27',
          'accent-glow': '#ff3b4a',
          gold: '#f5c842',
          'gold-light': '#ffd966',
          violet: '#8b5cf6',
          'violet-light': '#a78bfa',
          teal: '#06b6d4',
          'teal-light': '#22d3ee',
          orange: '#f97316',
          'orange-light': '#fb923c',
        },
        dark: {
          100: '#1a1a24',
          200: '#141418',
          300: '#0f0f16',
          400: '#0a0a0f',
          500: '#050508',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.35s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        'hero-zoom': 'heroZoom 20s ease-out forwards',
        'hero-zoom-in': 'heroZoomIn 8s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'pulse-accent': 'pulseAccent 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up-fade': 'slideUpFade 0.7s ease-out forwards',
        'slide-up-stagger': 'slideUpFade 0.6s ease-out forwards',
        'scale-in-glow': 'scaleInGlow 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heroZoom: {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        heroZoomIn: {
          '0%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229, 9, 20, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(229, 9, 20, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleInGlow: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
