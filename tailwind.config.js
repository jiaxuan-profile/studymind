/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  
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
        gray: { 
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: { DEFAULT: '#059669' },
        warning: { DEFAULT: '#FBBF24' },
        error: { DEFAULT: '#EF4444' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.gray.700'), 
            a: {
              color: theme('colors.primary.DEFAULT'),
              '&:hover': {
                color: theme('colors.primary.dark'),
              },
              textDecoration: 'none', 
            },
            h1: { color: theme('colors.gray.900'), fontWeight: '700' },
            h2: { color: theme('colors.gray.800'), fontWeight: '700' }, 
            h3: { color: theme('colors.gray.800'), fontWeight: '600' },
            h4: { color: theme('colors.gray.800'), fontWeight: '600' },
            strong: { color: theme('colors.gray.900') },
            code: {
              color: theme('colors.primary.dark'), 
              backgroundColor: theme('colors.gray.100'),
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: '0.875em',
            },
            'code::before': { content: '""' }, 
            'code::after': { content: '""' },  
            pre: {
              backgroundColor: theme('colors.gray.100'), 
              color: theme('colors.gray.800'),  
              padding: theme('spacing.4'),   
              borderRadius: theme('borderRadius.md'),
              border: `1px solid ${theme('colors.gray.200')}`,
              overflowX: 'auto',
            },
            'pre code': { 
              backgroundColor: 'transparent',
              color: 'inherit',
              padding: '0',
              borderRadius: '0',
              fontWeight: 'normal',
              fontSize: 'inherit',
            },
            blockquote: {
              color: theme('colors.gray.600'),
              borderLeftColor: theme('colors.gray.300'),
            }
          },
        },
        invert: { 
          css: {
            color: theme('colors.gray.300'), 
            a: {
              color: theme('colors.primary.light'), 
              '&:hover': {
                color: theme('colors.primary.DEFAULT'),
              },
            },
            h1: { color: theme('colors.gray.100') },
            h2: { color: theme('colors.gray.200') },
            h3: { color: theme('colors.gray.200') },
            h4: { color: theme('colors.gray.200') },
            strong: { color: theme('colors.gray.100') },
            code: { 
              color: theme('colors.secondary.light'),
              backgroundColor: theme('colors.gray.700'), 
            },
            pre: { 
              backgroundColor: theme('colors.gray.800'), 
              color: theme('colors.gray.200'),     
              border: `1px solid ${theme('colors.gray.700')}`,
            },
            blockquote: {
              color: theme('colors.gray.400'),
              borderLeftColor: theme('colors.gray.600'),
            },
          },
        },
      }),
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