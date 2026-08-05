/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D4830',
          light: '#1B5E43',
          50: '#E8F5EE',
          100: '#C6E6D4',
          600: '#0D4830',
        },
        beige: {
          DEFAULT: '#F4F1EA',
          light: '#F8F6F0',
          dark: '#EAE5D9',
        },
        surface: '#FFFFFF',
        card: '#FFFFFF',
        border: '#E3DDD3',
        text: {
          primary: '#111827',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        success: {
          DEFAULT: '#0D4830',
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
