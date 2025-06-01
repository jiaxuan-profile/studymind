/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#818CF8',
          DEFAULT: '#6366F1',
          dark: '#4F46E5',
        },
        secondary: {
          light: '#34D399',
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        accent: {
          light: '#FCD34D',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        success: {
          DEFAULT: '#059669',
        },
        warning: {
          DEFAULT: '#FBBF24',
        },
        error: {
          DEFAULT: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            a: {
              color: '#6366F1',
              '&:hover': {
                color: '#4F46E5',
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
            code: {
              color: '#E5E7EB', // Light text for dark background
              backgroundColor: '#1F2937', // Dark background
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: '#E5E7EB',
              padding: '0',
              borderRadius: '0',
            },
            pre: {
              backgroundColor: '#1F2937',
              color: '#E5E7EB',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #374151',
            }
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [
    typography,
  ],
};