import { db } from './index.js';
import { recipes } from './schema.js';
import { eq, sql } from 'drizzle-orm';

async function run() {
  console.log('Fixing rounded 0.042000 recipes to exact 0.041600 in PostgreSQL...');
  await db.update(recipes).set({ quantity: '0.041600' }).where(eq(recipes.quantity, '0.042000'));
  console.log('✅ Updated recipes in PostgreSQL!');

  const updated = await db.select().from(recipes);
  console.log('Updated Database Recipes:');
  console.log(JSON.stringify(updated, null, 2));
  process.exit(0);
}

run();
