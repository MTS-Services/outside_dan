/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8ec',
          100: '#f9edcc',
          200: '#f2d98a',
          300: '#eac85e',
          400: '#E4C06A',
          500: '#D9AF47',
          600: '#C49B35',
          700: '#A67E25',
          800: '#875F18',
          900: '#6B4910',
        },
        italian: {
          red:   '#CD212A',
          'red-dark': '#b01c23',
          green: '#008C45',
          'green-dark': '#006e35',
          gold:  '#D9AF47',
        },
        ink: {
          900: '#050505',
          800: '#0f0f0f',
          700: '#1a1a1a',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(217,175,71,0.45)',
        'glow-red': '0 10px 40px -10px rgba(205,33,42,0.55)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.45s ease forwards',
      },
    },
  },
  plugins: [],
};
