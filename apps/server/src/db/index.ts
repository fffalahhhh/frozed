import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import 'dotenv/config';

// Robust connection pool configured for Neon serverless PostgreSQL.
// - connectionTimeoutMillis: 20s allows Neon compute cold-starts to complete without timing out.
// - idleTimeoutMillis: 5s releases idle connections before Neon proxy drops them.
// - keepAlive: prevents TCP socket drops on idle connections.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 20_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] Pool error (auto-recovering):', err.message);
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
