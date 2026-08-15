import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import 'dotenv/config';

import { auth } from './auth/index.js';
import { yoga } from './graphql.js';
import { captureBackendException, shutdownPostHog } from './utils/posthog.js';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    credentials: true,
  }),
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, app: 'Frozen Shake GraphQL API' }));

// ─── Test Error Tracking Route ────────────────────────────────────────────────
app.get('/api/test/error', (c) => {
  const testError = new Error('Test backend exception for PostHog telemetry verification');
  captureBackendException(testError, {
    path: c.req.path,
    method: c.req.method,
    statusCode: 500,
    extra: { testTriggered: true, timestamp: new Date().toISOString() },
  });
  throw testError;
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  captureBackendException(err, {
    path: c.req.path,
    method: c.req.method,
    statusCode: 500,
  });

  return c.json(
    {
      success: false,
      error: err.message || 'Server processing error',
    },
    500,
  );
});

// ─── Process Level Uncaught Error Handlers ────────────────────────────────────
process.on('uncaughtException', (err) => {
  captureBackendException(err, {
    extra: { type: 'uncaughtException' },
  });
});

process.on('unhandledRejection', (reason) => {
  captureBackendException(reason, {
    extra: { type: 'unhandledRejection' },
  });
});

// ─── Shutdown Signals ─────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  await shutdownPostHog();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdownPostHog();
  process.exit(0);
});

// ─── Better-Auth handler ──────────────────────────────────────────────────────
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// ─── GraphQL Endpoint ─────────────────────────────────────────────────────────
app.on(['GET', 'POST', 'OPTIONS'], '/graphql', (c) => yoga.fetch(c.req.raw));

// ─── Start server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3000');
console.log(`🧃 Frozen Shake API running on http://0.0.0.0:${port}`);
console.log(`🚀 GraphQL Endpoint ready at http://0.0.0.0:${port}/graphql`);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });


