import type { Config } from 'tailwindcss';

/**
 * Paleta cinema-* — ver DESIGN.md y tokens en globals.css (:root)
 * Colores en hex para soportar modificadores de opacidad (/60, /40, etc.)
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#010810',
          surface: '#020B18',
          elevated: '#061428',
          border: '#0A1F38',
          accent: '#E50914',
          'accent-light': '#FF2D3B',
          'accent-glow': '#FF4D58',
          gold: '#F5C842',
          'gold-light': '#FFD966',
          violet: '#3B82F6',
          'violet-light': '#60A5FA',
          teal: '#22D3EE',
          'teal-light': '#67E8F9',
          orange: '#F97316',
          'orange-light': '#FB923C',
          muted: '#B8D4F0',
          silver: '#7EB3E8',
          ash: '#4A7AAB',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'out-expo': 'var(--ease-out-expo)',
        'in-out-expo': 'var(--ease-in-out-expo)',
        drawer: 'var(--ease-drawer)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'hero-zoom': 'heroZoom 20s ease-out forwards',
        'hero-zoom-in': 'heroZoomIn 8s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'pulse-accent': 'pulseAccent 2s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up-fade': 'slideUpFade 0.6s ease-out forwards',
        'slide-up-stagger': 'slideUpFade 0.5s ease-out forwards',
        'scale-in-glow': 'scaleInGlow 0.35s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heroZoom: {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        heroZoomIn: {
          '0%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229, 9, 20, 0.35)' },
          '50%': { boxShadow: '0 0 0 10px rgba(229, 9, 20, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleInGlow: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
