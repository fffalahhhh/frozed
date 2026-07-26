import { Hono } from 'hono';
import { db } from '../db/index.js';
import {
  categories,
  menuItems,
  menuItemFlavours,
  flavours,
  inventoryItems,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const menuRouter = new Hono();

// GET /menu — full menu grouped by category with flavours
menuRouter.get('/', async (c) => {
  const cats = await db.query.categories.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  const items = await db.query.menuItems.findMany({
    where: eq(menuItems.isDeleted, false),
    with: {
      flavours: {
        with: { flavour: true },
      },
    },
  });

  // Check restock alerts — items whose ingredients are below reorder level
  const stockItems = await db.select().from(inventoryItems);
  const needsRestockNames = new Set(
    stockItems
      .filter((s) => parseFloat(s.currentStock) <= parseFloat(s.reorderLevel))
      .map((s) => s.name.toLowerCase())
  );

  const result = cats.map((cat) => {
    const catItems = items.filter((i) => i.categoryId === cat.id);
    const needsRestock = catItems.some((item) =>
      needsRestockNames.has(item.name.toLowerCase())
    );
    return {
      category: cat,
      items: catItems.map((item) => ({
        ...item,
        flavours: item.flavours.map((mif) => ({
          flavourId: mif.flavourId,
          flavourName: mif.flavour.name,
          extraCost: mif.extraCost,
        })),
      })),
      needsRestock,
    };
  });

  return c.json({ success: true, data: result });
});

// GET /menu/items/:id
menuRouter.get('/items/:id', async (c) => {
  const id = c.req.param('id');
  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, id), eq(menuItems.isDeleted, false)),
    with: {
      flavours: { with: { flavour: true } },
      recipes: true,
      makingCosts: true,
    },
  });
  if (!item) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: item });
});

// POST /menu/items — create
menuRouter.post('/items', async (c) => {
  const body = await c.req.json();
  const [item] = await db.insert(menuItems).values(body).returning();
  return c.json({ success: true, data: item }, 201);
});

// PUT /menu/items/:id — update
menuRouter.put('/items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [item] = await db
    .update(menuItems)
    .set(body)
    .where(eq(menuItems.id, id))
    .returning();
  return c.json({ success: true, data: item });
});

// PATCH /menu/items/:id/toggle — toggle availability
menuRouter.patch('/items/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const current = await db.query.menuItems.findFirst({
    where: eq(menuItems.id, id),
  });
  if (!current) return c.json({ success: false, error: 'Not found' }, 404);
  const [updated] = await db
    .update(menuItems)
    .set({ isAvailable: !current.isAvailable })
    .where(eq(menuItems.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});
