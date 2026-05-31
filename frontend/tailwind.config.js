/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#002060',
          light: '#003399',
          dark: '#001845',
          accent: '#1E4FD9',
        },
        surface: '#F7F8FA',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
        neutral: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 32 96 / 0.06), 0 1px 2px -1px rgb(0 32 96 / 0.06)',
        elevated: '0 4px 6px -1px rgb(0 32 96 / 0.08), 0 2px 4px -2px rgb(0 32 96 / 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'scale-in': 'scaleIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
