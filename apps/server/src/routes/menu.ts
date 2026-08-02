import { Hono } from 'hono';
import { db } from '../db/index.js';
import { categories, menuItems, inventoryItems, recipes } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

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
      recipes: true,
    },
  });

  // Check restock alerts — items whose ingredients are below reorder level
  const stockItems = await db.select().from(inventoryItems);
  const needsRestockNames = new Set(
    stockItems
      .filter((s) => parseFloat(s.currentStock) <= parseFloat(s.reorderLevel))
      .map((s) => s.name.toLowerCase()),
  );

  const result = cats.map((cat) => {
    const catItems = items.filter((i) => i.categoryId === cat.id);
    const needsRestock = catItems.some((item) => needsRestockNames.has(item.name.toLowerCase()));
    return {
      category: cat,
      items: catItems.map((item) => ({
        ...item,
        flavours: item.flavours.map((mif) => ({
          flavourId: mif.flavourId,
          flavourName: mif.flavour.name,
          extraCost: mif.extraCost,
        })),
        recipes: item.recipes || [],
      })),
      needsRestock,
    };
  });

  return c.json({ success: true, data: result });
});

// POST /menu/categories — create category
menuRouter.post('/categories', async (c) => {
  const body = await c.req.json();
  const [cat] = await db.insert(categories).values(body).returning();
  return c.json({ success: true, data: cat }, 201);
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
  const { categoryId, name, description, sellingPrice, isAvailable, ingredients } = body;

  if (!categoryId || !name || sellingPrice === undefined || sellingPrice === null) {
    return c.json({ success: false, error: 'Category, name, and selling price are required' }, 400);
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      categoryId,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      sellingPrice: String(sellingPrice),
      isAvailable: isAvailable ?? true,
    })
    .returning();

  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const invIds = ingredients.map((ing: any) => ing.inventoryItemId).filter(Boolean);
    if (invIds.length > 0) {
      const inventoryList = await db
        .select()
        .from(inventoryItems)
        .where(inArray(inventoryItems.id, invIds));

      const invMap = new Map(inventoryList.map((inv) => [inv.id, inv]));

      for (const ing of ingredients) {
        const inv = invMap.get(ing.inventoryItemId);
        if (inv && ing.quantity) {
          await db.insert(recipes).values({
            menuItemId: item.id,
            ingredientName: inv.name,
            unit: inv.unit,
            quantity: String(ing.quantity),
            costPerUnit: String(inv.costPerUnit),
          });
        }
      }
    }
  }

  return c.json({ success: true, data: item }, 201);
});

// PUT /menu/items/:id — update
menuRouter.put('/items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [item] = await db.update(menuItems).set(body).where(eq(menuItems.id, id)).returning();
  return c.json({ success: true, data: item });
});

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH /menu/items/:id/toggle — toggle availability
menuRouter.patch('/items/:id/toggle', async (c) => {
  const id = c.req.param('id');
  if (!IS_UUID.test(id)) {
    return c.json({ success: true, data: { id, isAvailable: true } });
  }

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

// DELETE /menu/items/:id — delete menu item
menuRouter.delete('/items/:id', async (c) => {
  const id = c.req.param('id');
  if (!IS_UUID.test(id)) {
    return c.json({ success: true, data: { id } });
  }

  const [updated] = await db
    .update(menuItems)
    .set({ isDeleted: true })
    .where(eq(menuItems.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});
