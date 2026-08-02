import { db } from './index.js';
import {
  orderItems,
  bills,
  orders,
  recipes,
  makingCosts,
  menuItemFlavours,
  menuItems,
  categories,
  flavours,
  inventoryAdjustments,
  inventoryItems,
  shopExpenses,
  users,
} from './schema.js';
import 'dotenv/config';

async function clearDb() {
  console.log('🧹 Clearing all database tables...');

  try {
    await db.delete(orderItems);
    await db.delete(bills);
    await db.delete(orders);
    await db.delete(recipes);
    await db.delete(makingCosts);
    await db.delete(menuItemFlavours);
    await db.delete(menuItems);
    await db.delete(flavours);
    await db.delete(categories);
    await db.delete(inventoryAdjustments);
    await db.delete(inventoryItems);
    await db.delete(shopExpenses);
    await db.delete(users);

    console.log('✅ All database tables cleared successfully!');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    process.exit(0);
  }
}

clearDb();
