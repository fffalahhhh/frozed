import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Altering PostgreSQL table column types to numeric(14, 6)...');
  try {
    await db.execute(sql`ALTER TABLE "recipes" ALTER COLUMN "quantity" TYPE numeric(14, 6);`);
    await db.execute(sql`ALTER TABLE "recipes" ALTER COLUMN "cost_per_unit" TYPE numeric(14, 6);`);
    await db.execute(sql`ALTER TABLE "inventory_items" ALTER COLUMN "current_stock" TYPE numeric(14, 6);`);
    await db.execute(sql`ALTER TABLE "inventory_items" ALTER COLUMN "reorder_level" TYPE numeric(14, 6);`);
    await db.execute(sql`ALTER TABLE "inventory_items" ALTER COLUMN "cost_per_unit" TYPE numeric(14, 6);`);
    await db.execute(sql`ALTER TABLE "inventory_adjustments" ALTER COLUMN "quantity_delta" TYPE numeric(14, 6);`);
    console.log('✅ Successfully altered PostgreSQL columns to numeric(14, 6)!');
  } catch (err) {
    console.error('Error altering column scale:', err);
  }
  process.exit(0);
}

run();
