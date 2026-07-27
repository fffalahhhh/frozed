import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import 'dotenv/config';

import { auth } from './auth/index.js';
import { menuRouter } from './routes/menu.js';
import { ordersRouter } from './routes/orders.js';
import { inventoryRouter } from './routes/inventory.js';
import { expensesRouter } from './routes/expenses.js';
import { analyticsRouter } from './routes/analytics.js';
import { syncRouter } from './routes/sync.js';

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    credentials: true,
  })
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, app: 'Frozen Shake API' }));

// ─── Better-Auth handler ──────────────────────────────────────────────────────
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/menu', menuRouter);
app.route('/orders', ordersRouter);
app.route('/inventory', inventoryRouter);
app.route('/expenses', expensesRouter);
app.route('/analytics', analyticsRouter);
app.route('/sync', syncRouter);

// ─── Start server ─────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3000');
console.log(`🧃 Frozen Shake API running on http://0.0.0.0:${port}`);

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
