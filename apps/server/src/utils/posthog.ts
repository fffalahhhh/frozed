import { PostHog } from 'posthog-node';
import 'dotenv/config';

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

if (apiKey) {
  try {
    client = new PostHog(apiKey, {
      host,
      flushAt: 1, // Flush events immediately in server context for reliability
      flushInterval: 1000,
    });
    console.log(`[PostHog] Server client initialized with host ${host}`);
  } catch (err) {
    console.error('[PostHog] Failed to initialize PostHog server client:', err);
  }
} else {
  console.warn('[PostHog] POSTHOG_API_KEY not set. Backend error telemetry will run in mock mode.');
}

/**
 * Capture backend exceptions with rich context (route, user ID, request params, environment)
 */
export function captureBackendException(
  error: Error | unknown,
  context: {
    distinctId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    extra?: Record<string, any>;
  } = {},
) {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const distinctId = context.distinctId || 'server-system';

  console.error(
    `[PostHog Backend Error] ${context.method || ''} ${context.path || ''}:`,
    errObj.message,
  );

  if (client) {
    client.capture({
      distinctId,
      event: '$exception',
      properties: {
        $exception_type: errObj.name || 'Error',
        $exception_message: errObj.message,
        $exception_synthetic: false,
        $exception_stack_trace_raw: errObj.stack,
        path: context.path,
        method: context.method,
        status_code: context.statusCode ?? 500,
        environment: process.env.NODE_ENV || 'development',
        source: 'server',
        ...context.extra,
      },
    });
    // Immediately flush event queue to ensure delivery before response finishes
    client.flush().catch((e) => console.error('[PostHog Flush Error]:', e));
  }
}

/**
 * Gracefully flush and shutdown PostHog telemetry before server exits
 */
export async function shutdownPostHog(): Promise<void> {
  if (client) {
    console.log('[PostHog] Flushing and shutting down server client...');
    await client.shutdown();
  }
}

export const posthog = client;
