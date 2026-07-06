import type { Config } from 'tailwindcss';

export const web: Config = {
  darkMode: 'class',
  content: [
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        dark: {
          100: '#1e293b',
          200: '#1a1d26',
          300: '#15181f',
          400: '#111318',
          500: '#0d0f12',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
