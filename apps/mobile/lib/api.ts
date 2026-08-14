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

const TIMEOUT_MS = 20000; // 20s — generous for slow DB queries
const MAX_RETRIES = 2;

class ApiError extends Error {
  status?: number;
  isTimeout: boolean;
  isNetworkError: boolean;

  constructor(
    message: string,
    opts?: { status?: number; isTimeout?: boolean; isNetworkError?: boolean },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.isTimeout = opts?.isTimeout ?? false;
    this.isNetworkError = opts?.isNetworkError ?? false;
  }
}

async function requestOnce<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(
        !res.ok
          ? `Server error ${res.status}: ${text || res.statusText}`
          : `Invalid JSON response from ${path}`,
        { status: res.status },
      );
    }

    if (!res.ok || !json.success) {
      throw new ApiError(json?.error ?? `Request failed with status ${res.status}`, {
        status: res.status,
      });
    }
    return json.data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    // AbortError = our timeout fired
    if (err?.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${TIMEOUT_MS / 1000}s (${path})`, {
        isTimeout: true,
      });
    }

    // TypeError = no network / server not reachable
    if (err instanceof TypeError) {
      throw new ApiError(
        `Cannot reach server at ${BASE_URL}. Make sure the server is running and the IP is correct.`,
        { isNetworkError: true },
      );
    }

    // Re-throw ApiErrors (already typed) or unknown errors as-is
    throw err;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestOnce<T>(path, options);
    } catch (err: any) {
      lastErr = err;

      // Only retry on timeout or network errors, not on 4xx/5xx
      const shouldRetry = err?.isTimeout || err?.isNetworkError;
      if (!shouldRetry || attempt === MAX_RETRIES) break;

      // Exponential back-off: 1s, 2s
      await new Promise((r) => setTimeout(r, attempt * 1000));
      console.warn(`[API] Retrying ${path} (attempt ${attempt + 1}/${MAX_RETRIES})…`);
    }
  }

  const err = lastErr as ApiError;
  console.error(`[API] Failed ${path}:`, err.message);
  throw lastErr;
}

export { ApiError };

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
