import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import 'dotenv/config';

import { auth } from './auth/index.js';
import { yoga } from './graphql.js';

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

// ─── Free CDN Image Upload Endpoint ──────────────────────────────────────────
app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`CDN upload failed with status ${res.status}`);
    }

    const cdnUrl = (await res.text()).trim();
    return c.json({ success: true, url: cdnUrl });
  } catch (err: any) {
    console.error('[Upload API] Image upload failed:', err);
    return c.json({ success: false, error: err.message || 'Upload failed' }, 500);
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(`[Server Error] ${c.req.method} ${c.req.path}:`, err);

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
  console.error('[Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
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
