/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A2810',
          light: '#5C3317',
          50: '#FAF7F2',
          100: '#F5ECE4',
          600: '#4A2810',
          hover: '#361908',
        },
        beige: {
          DEFAULT: '#F4EDE4',
          light: '#FAF7F2',
          dark: '#EBE2D5',
        },
        surface: '#FFFFFF',
        card: '#FFFFFF',
        border: '#E5DCD0',
        text: {
          primary: '#1A120B',
          secondary: '#4A3E36',
          muted: '#73675F',
          light: '#9E938B',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FEF3C7',
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
