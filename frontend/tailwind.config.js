/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display font — Cormorant Garamond: elegant, editorial, luxury feel
        // Used for headings, the logo, and large text moments
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        // Body font — DM Sans: clean, readable, modern without being generic
        sans: ['DM Sans', 'sans-serif'],
        // Mono — for prices, codes
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Brand palette — warm dark base with amber/coral accents
        // Designed to feel like a candlelit evening, not a tech product
        ink: {
          50:  '#f7f5f2',
          100: '#ede9e3',
          200: '#d6cfc5',
          300: '#b8ad9e',
          400: '#948779',
          500: '#786d60',
          600: '#625a4f',
          700: '#514a41',
          800: '#453f38',
          900: '#3c3630',
          950: '#1e1b17',
        },
        amber: {
          400: '#f59e0b',
          500: '#d97706',
        },
        coral: {
          400: '#fb7c5a',
          500: '#f56040',
          600: '#e04020',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
