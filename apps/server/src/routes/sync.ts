import { Hono } from 'hono';
import { db } from '../db/index.js';
import { orders, orderItems, menuItems, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const syncRouter = new Hono();

// POST /sync/orders — bulk upsert offline orders
syncRouter.post('/orders', async (c) => {
  const { orders: offlineOrders } = await c.req.json();
  const results = [];

  const defaultUser = await db.query.users.findFirst();

  for (const payload of offlineOrders) {
    const { order: orderData, items: itemsData } = payload;

    let cashierId = orderData.cashierId;
    if (!cashierId || cashierId === '00000000-0000-0000-0000-000000000000') {
      cashierId = defaultUser?.id;
    }

    // Insert order
    const [inserted] = await db
      .insert(orders)
      .values({
        ...orderData,
        cashierId,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted && itemsData?.length) {
      const withOrderId = itemsData.map((i: typeof orderItems.$inferInsert) => ({
        ...i,
        orderId: inserted.id,
      }));
      await db.insert(orderItems).values(withOrderId).onConflictDoNothing();
    }

    results.push({ localId: payload.localId, serverId: inserted?.id ?? null });
  }

  return c.json({ success: true, data: results });
});

// GET /sync/menu — pull full menu snapshot for local SQLite cache
syncRouter.get('/menu', async (c) => {
  const cats = await db.query.categories.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
  const items = await db.query.menuItems.findMany({
    where: eq(menuItems.isDeleted, false),
    with: { flavours: { with: { flavour: true } } },
  });
  return c.json({ success: true, data: { categories: cats, items } });
});
