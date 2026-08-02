import { Hono } from 'hono';
import { db } from '../db/index.js';
import { inventoryItems, inventoryAdjustments, users } from '../db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';

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

// POST /inventory — create new inventory item
inventoryRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { name, unit, currentStock, reorderLevel, costPerUnit } = body;

  if (!name || !unit || currentStock === undefined || currentStock === null) {
    return c.json({ success: false, error: 'Name, unit, and current stock are required' }, 400);
  }

  const [newItem] = await db
    .insert(inventoryItems)
    .values({
      name: String(name).trim(),
      unit: String(unit).trim(),
      currentStock: String(currentStock),
      reorderLevel: String(reorderLevel ?? '0'),
      costPerUnit: String(costPerUnit ?? '0'),
      updatedAt: new Date(),
    })
    .returning();

  return c.json({ success: true, data: newItem }, 201);
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
  const { inventoryItemId, userId: reqUserId, type, quantityDelta, note } =
    await c.req.json();

  let userId = reqUserId;
  if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
    const firstUser = await db.query.users.findFirst();
    userId = firstUser?.id;
  }

  if (!userId) {
    return c.json({ success: false, error: 'No user found' }, 400);
  }

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
    orderBy: [desc(inventoryAdjustments.createdAt)],
    limit: 100,
  });
  return c.json({ success: true, data: adjustments });
});
