import { Hono } from 'hono';
import { db } from '../db/index.js';
import { inventoryItems, inventoryAdjustments } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const inventoryRouter = new Hono();

// GET /inventory — all items with restock alert flag
inventoryRouter.get('/', async (c) => {
  const items = await db.select().from(inventoryItems);
  const withAlert = items.map((item) => ({
    ...item,
    needsRestock:
      parseFloat(item.currentStock) <= parseFloat(item.reorderLevel),
  }));
  return c.json({ success: true, data: withAlert });
});

// PATCH /inventory/:id — edit stock level or cost
inventoryRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db
    .update(inventoryItems)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});

// POST /inventory/adjust — log an adjustment (restock / waste / correction)
inventoryRouter.post('/adjust', async (c) => {
  const { inventoryItemId, userId, type, quantityDelta, note } =
    await c.req.json();

  // Update stock quantity
  await db
    .update(inventoryItems)
    .set({
      currentStock: sql`${inventoryItems.currentStock} + ${quantityDelta}`,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, inventoryItemId));

  const [adjustment] = await db
    .insert(inventoryAdjustments)
    .values({ inventoryItemId, userId, type, quantityDelta, note })
    .returning();

  return c.json({ success: true, data: adjustment }, 201);
});

// GET /inventory/adjustments — audit log
inventoryRouter.get('/adjustments', async (c) => {
  const adjustments = await db.query.inventoryAdjustments.findMany({
    with: { item: true, user: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 100,
  });
  return c.json({ success: true, data: adjustments });
});
