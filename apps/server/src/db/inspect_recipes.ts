import { db } from './index.js';
import { recipes } from './schema.js';

async function run() {
  const allRecipes = await db.select().from(recipes);
  console.log('Current Database Recipes:');
  console.log(JSON.stringify(allRecipes, null, 2));
  process.exit(0);
}

run();
