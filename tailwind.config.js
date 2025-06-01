/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#6366F1',
          DEFAULT: '#4F46E5',
          dark: '#4338CA',
        },
        secondary: {
          light: '#14B8A6',
          DEFAULT: '#0D9488',
          dark: '#0F766E',
        },
        accent: {
          light: '#FBBF24',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        success: {
          DEFAULT: '#10B981',
        },
        warning: {
          DEFAULT: '#FBBF24',
        },
        error: {
          DEFAULT: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            a: {
              color: '#4F46E5',
              '&:hover': {
                color: '#4338CA',
              },
            },
            h1: {
              color: '#111827',
              fontWeight: '700',
            },
            h2: {
              color: '#1F2937',
              fontWeight: '700',
            },
            h3: {
              color: '#1F2937',
              fontWeight: '600',
            },
            h4: {
              color: '#1F2937',
              fontWeight: '600',
            },
          },
        },
      },
      spacing: {
        '18': '4.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    typography,
  ],
};