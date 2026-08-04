import { Hono } from 'hono';
import { db } from '../db/index.js';
import { orders, orderItems, menuItems, categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const syncRouter = new Hono();

// POST /sync/orders — bulk upsert offline orders (batched, not serial)
syncRouter.post('/orders', async (c) => {
  const { orders: offlineOrders } = await c.req.json();
  if (!Array.isArray(offlineOrders) || offlineOrders.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const defaultUser = await db.query.users.findFirst();

  // Insert all orders in parallel, then batch-insert all their items
  const insertedOrders = await Promise.all(
    offlineOrders.map(async (payload) => {
      const { order: orderData, items: itemsData, localId } = payload;
      let cashierId = orderData.cashierId;
      if (!cashierId || cashierId === '00000000-0000-0000-0000-000000000000') {
        cashierId = defaultUser?.id;
      }

      const [inserted] = await db
        .insert(orders)
        .values({ ...orderData, cashierId })
        .onConflictDoNothing()
        .returning();

      return { localId, inserted, itemsData };
    }),
  );

  // Collect all order item rows and insert in one batch
  const allItemRows = insertedOrders.flatMap(({ inserted, itemsData }) => {
    if (!inserted || !itemsData?.length) return [];
    return itemsData.map((i: typeof orderItems.$inferInsert) => ({
      ...i,
      orderId: inserted.id,
    }));
  });

  if (allItemRows.length > 0) {
    await db.insert(orderItems).values(allItemRows).onConflictDoNothing();
  }

  const results = insertedOrders.map(({ localId, inserted }) => ({
    localId,
    serverId: inserted?.id ?? null,
  }));

  return c.json({ success: true, data: results });
});

// GET /sync/menu — pull full menu snapshot for local cache (categories + items in parallel)
syncRouter.get('/menu', async (c) => {
  const [cats, items] = await Promise.all([
    db.query.categories.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    }),
    db.query.menuItems.findMany({
      where: eq(menuItems.isDeleted, false),
      with: { flavours: { with: { flavour: true } } },
    }),
  ]);
  return c.json({ success: true, data: { categories: cats, items } });
});
