import PostHog, { PostHogOptions } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export const posthogOptions: PostHogOptions = {
  host: POSTHOG_HOST,
  customStorage: AsyncStorage,
  enableSessionReplay: true,
  sessionReplayConfig: {
    captureLog: true,
    captureNetworkTelemetry: true,
  },
  flushAt: 1,
  disabled: !POSTHOG_API_KEY,
};

let posthogInstance: PostHog | null = null;

/**
 * Register active PostHog instance for non-React context access
 */
export function setPostHogInstance(instance: PostHog) {
  posthogInstance = instance;
}

/**
 * Helper to capture exceptions manually from anywhere in mobile codebase
 */
export function captureFrontendException(
  error: Error | unknown,
  context: {
    component?: string;
    action?: string;
    extra?: Record<string, any>;
  } = {},
) {
  const errObj = error instanceof Error ? error : new Error(String(error));
  console.error(`[PostHog Mobile Exception] [${context.component || 'App'}]:`, errObj);

  if (posthogInstance) {
    const props: Record<string, any> = {
      $exception_type: errObj.name || 'Error',
      $exception_message: errObj.message,
      $exception_stack_trace_raw: errObj.stack ?? '',
      source: 'mobile-frontend',
    };
    if (context.component) props.component = context.component;
    if (context.action) props.action = context.action;
    if (context.extra) {
      Object.assign(props, context.extra);
    }
    posthogInstance.capture('$exception', props);
  }
}
