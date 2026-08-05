export const fmt = (n?: number | string | null, decimals = 0) =>
  `₹${parseFloat(String(n || 0)).toFixed(decimals)}`;

export const COLORS = {
  primary: '#1B4332',
  primaryAlpha40: 'rgba(27, 67, 50, 0.4)',
  primaryAlpha20: 'rgba(27, 67, 50, 0.2)',
  primaryAlpha10: 'rgba(27, 67, 50, 0.1)',
  surface: '#FFFFFF',
  surfaceAlpha80: 'rgba(255, 255, 255, 0.8)',
  surfaceAlpha60: 'rgba(255, 255, 255, 0.6)',
  surfaceAlpha50: 'rgba(255, 255, 255, 0.5)',
  surfaceAlpha40: 'rgba(255, 255, 255, 0.4)',
  border: '#E8E2D9',
  borderAlpha60: 'rgba(232, 226, 217, 0.6)',
  borderAlpha50: 'rgba(232, 226, 217, 0.5)',
  borderAlpha40: 'rgba(232, 226, 217, 0.4)',
  textPrimary: '#1A1A1A',
  textMuted: '#8A8A8A',
  textMutedAlpha60: 'rgba(138, 138, 138, 0.6)',
  textLight: '#B0B0B0',
  warning: '#F97316',
  warningAlpha10: 'rgba(249, 115, 22, 0.1)',
  warningAlpha30: 'rgba(249, 115, 22, 0.3)',
  success: '#1B4332',
  successBg: '#E8F5EE',
  white: '#FFFFFF',
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const UNITS = ['ml', 'g', 'pcs', 'kg', 'liters', 'packets'];
