import { db } from './index.js';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function wipeAllDatabaseData() {
  console.log(
    '🧹 Wiping ABSOLUTELY EVERYTHING in database: menu items, categories, flavours, recipes, inventory, expenses, orders & resetting sequences to 1...',
  );

  try {
    // Truncate all data tables and restart auto-increment sequences
    await db.execute(sql`
      TRUNCATE 
        "order_items", 
        "orders", 
        "bills", 
        "shop_expenses", 
        "inventory_adjustments", 
        "pre_orders", 
        "recipes", 
        "making_costs", 
        "menu_item_flavours", 
        "menu_items", 
        "flavours", 
        "categories", 
        "inventory_items" 
      RESTART IDENTITY CASCADE;
    `);

    console.log('✅ ALL server database tables wiped to ZERO successfully!');
    console.log(
      '✅ Categories, Menu Items, Recipes, Inventory, Expenses, and Orders are completely empty.',
    );
    console.log('✅ Order sequences reset to 1! Next order index will start at order #1.');
  } catch (err) {
    console.error('Error wiping complete database:', err);
  } finally {
    process.exit(0);
  }
}

wipeAllDatabaseData();
