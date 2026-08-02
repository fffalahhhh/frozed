import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically resolve host IP from Expo Metro server (e.g. 10.129.92.128)
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.manifest?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:3000`;
  }

  // Fallback for Android emulator / iOS simulator / standalone default
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();

// Fallback seed data if backend API is not running locally
const FALLBACK_MENU = [
  {
    category: { id: 'cat-1', name: 'Fruit Milkshakes', icon: '🧃', sortOrder: 1 },
    items: [
      {
        id: 'item-1',
        categoryId: 'cat-1',
        name: 'Signature Mango Shake',
        description: 'Rich thick mango shake topped with fruit chunks',
        sellingPrice: '120.00',
        imageUrl: null,
        isAvailable: true,
        flavours: [
          { flavourId: 'f-1', flavourName: 'Mango', extraCost: '0' },
          { flavourId: 'f-2', flavourName: 'Strawberry', extraCost: '0' },
          { flavourId: 'f-3', flavourName: 'Avocado', extraCost: '0' },
        ],
      },
      {
        id: 'item-2',
        categoryId: 'cat-1',
        name: 'Double Chocolate Shake',
        description: 'Creamy chocolate shake made with real cocoa',
        sellingPrice: '140.00',
        imageUrl: null,
        isAvailable: true,
        flavours: [
          { flavourId: 'f-4', flavourName: 'Chocolate', extraCost: '0' },
        ],
      },
    ],
    needsRestock: false,
  },
  {
    category: { id: 'cat-2', name: 'Fresh Juices', icon: '🥤', sortOrder: 2 },
    items: [
      {
        id: 'item-3',
        categoryId: 'cat-2',
        name: 'Fresh Avocado Juice',
        description: 'Pure cold-pressed fresh avocado',
        sellingPrice: '110.00',
        imageUrl: null,
        isAvailable: true,
        flavours: [
          { flavourId: 'f-3', flavourName: 'Avocado', extraCost: '0' },
        ],
      },
      {
        id: 'item-4',
        categoryId: 'cat-2',
        name: 'Cold Pressed Pineapple',
        description: 'Sweet fresh pineapple juice',
        sellingPrice: '100.00',
        imageUrl: null,
        isAvailable: true,
        flavours: [],
      },
    ],
    needsRestock: false,
  },
  {
    category: { id: 'cat-3', name: 'Special Smoothies', icon: '🥭', sortOrder: 3 },
    items: [
      {
        id: 'item-5',
        categoryId: 'cat-3',
        name: 'Berry Blast Smoothie',
        description: 'Mixed berry thick smoothie',
        sellingPrice: '150.00',
        imageUrl: null,
        isAvailable: true,
        flavours: [],
      },
    ],
    needsRestock: true,
  },
];

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? `Request failed: ${res.status}`);
    }
    return json.data as T;
  } catch (err) {
    console.warn(`API request failed for ${path}, using fallback data:`, err);
    if (path === '/menu') {
      return FALLBACK_MENU as unknown as T;
    }
    if (path === '/orders') {
      return [] as unknown as T;
    }
    if (path === '/inventory') {
      return [] as unknown as T;
    }
    if (path === '/analytics/sales') {
      return { totalRevenue: '0', orderCount: 0 } as unknown as T;
    }
    if (path === '/analytics/profit') {
      return { totalRevenue: '0', totalCOGS: '0', grossProfit: '0', shopExpenses: '0', netProfit: '0' } as unknown as T;
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
