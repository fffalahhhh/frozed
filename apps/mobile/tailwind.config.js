/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────
        primary: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
          50: '#E8F5EE',
          100: '#C6E6D4',
          200: '#8ECFAA',
          300: '#52B780',
          400: '#2D9A5F',
          500: '#1B7A48',
          600: '#1B4332',
        },
        // ── Surfaces ───────────────────────────
        surface: '#FFFFFF',
        card: '#FFFFFF',
        border: '#E8E2D9',
        // ── Text ───────────────────────────────
        text: {
          primary: '#1A1A1A',
          muted: '#8A8A8A',
          light: '#B0B0B0',
        },
        // ── Status ─────────────────────────────
        success: {
          DEFAULT: '#1B4332',
          bg: '#E8F5EE',
        },
        warning: {
          DEFAULT: '#F97316',
          bg: '#FFF3E0',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
