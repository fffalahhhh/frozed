export const formatIndianNumber = (num: number, decimals = 0): string => {
  if (isNaN(num)) return '0';
  const fixedStr = num.toFixed(decimals);
  const parts = fixedStr.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.slice(1);
  }

  let formattedInteger = integerPart;
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    formattedInteger = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const result = isNegative ? `-${formattedInteger}` : formattedInteger;
  return decimals > 0 && decimalPart !== undefined ? `${result}.${decimalPart}` : result;
};

export const fmt = (n?: number | string | null, decimals = 0) =>
  `₹${formatIndianNumber(parseFloat(String(n || 0)), decimals)}`;

export const COLORS = {
  primary: '#0D4830',
  primaryLight: '#1B5E43',
  primaryAlpha40: 'rgba(13, 72, 48, 0.4)',
  primaryAlpha20: 'rgba(13, 72, 48, 0.2)',
  primaryAlpha10: 'rgba(13, 72, 48, 0.1)',
  bgBeige: '#F4F1EA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E3DDD3',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  warning: '#F97316',
  warningBg: '#FFF3E0',
  danger: '#EF4444',
  success: '#0D4830',
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

export const DEFAULT_DRINK_IMAGES: Record<string, string> = {
  mango: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  chocolate: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&q=80',
  avocado: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',
  berry: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
  strawberry: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&q=80',
  coffee: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80',
  latte: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80',
  juice: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',
  smoothie: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',
};

export function getItemImageUrl(item?: { name?: string; imageUrl?: string | null }): string {
  if (item?.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0) {
    return item.imageUrl.trim();
  }
  const nameLower = item?.name?.toLowerCase() || '';
  for (const key of Object.keys(DEFAULT_DRINK_IMAGES)) {
    if (key !== 'default' && nameLower.includes(key)) {
      return DEFAULT_DRINK_IMAGES[key];
    }
  }
  return DEFAULT_DRINK_IMAGES.default;
}
