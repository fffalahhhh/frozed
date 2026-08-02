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

  // Default IP fallback for Android emulator / iOS simulator / localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}

const BASE_URL = getBaseUrl();

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
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
      throw new Error(json.error ?? `Request failed with status ${res.status}`);
    }
    return json.data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`API request failed for ${path}:`, err);
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
