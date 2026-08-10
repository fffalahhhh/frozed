import { Hono } from 'hono';
import { db } from '../db/index.js';
import { categories, menuItems, inventoryItems, recipes } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export const menuRouter = new Hono();

// GET /menu — full menu grouped by category with flavours
menuRouter.get('/', async (c) => {
  // Fetch categories, items, and inventory stock all in parallel
  const [cats, items, stockItems] = await Promise.all([
    db.query.categories.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    }),
    db.query.menuItems.findMany({
      where: eq(menuItems.isDeleted, false),
      with: {
        flavours: { with: { flavour: true } },
        recipes: true,
      },
    }),
    db.select().from(inventoryItems),
  ]);

  const stockMap = new Map(
    stockItems.map((s) => [s.name.toLowerCase().trim(), parseFloat(s.currentStock)]),
  );

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
      items: catItems.map((item) => {
        let maxAvailable = 999999;
        if (!item.isAvailable) {
          maxAvailable = 0;
        } else if (item.recipes && item.recipes.length > 0) {
          for (const rec of item.recipes) {
            const currentStock = stockMap.get(rec.ingredientName.toLowerCase().trim()) ?? 0;
            const reqQty = parseFloat(rec.quantity as any);
            if (reqQty > 0) {
              const possiblePortions = Math.floor(currentStock / reqQty + 1e-9);
              if (possiblePortions < maxAvailable) {
                maxAvailable = possiblePortions;
              }
            }
          }
        }
        if (maxAvailable === 999999) {
          maxAvailable = 999; // Default fallback if no specific recipe ingredients
        }

        const effectiveAvailable = item.isAvailable && maxAvailable > 0;

        return {
          ...item,
          isAvailable: effectiveAvailable,
          maxAvailable,
          flavours: item.flavours.map((mif) => ({
            flavourId: mif.flavourId,
            flavourName: mif.flavour.name,
            extraCost: mif.extraCost,
          })),
          recipes: item.recipes || [],
        };
      }),
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

  // Insert menu item and fetch inventory items for ingredients in parallel
  const invIds: string[] = Array.isArray(ingredients)
    ? ingredients.map((ing: any) => ing.inventoryItemId).filter(Boolean)
    : [];

  const [[item], inventoryList] = await Promise.all([
    db
      .insert(menuItems)
      .values({
        categoryId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        sellingPrice: String(sellingPrice),
        isAvailable: isAvailable ?? true,
      })
      .returning(),
    invIds.length > 0
      ? db.select().from(inventoryItems).where(inArray(inventoryItems.id, invIds))
      : Promise.resolve([]),
  ]);

  if (inventoryList.length > 0 && Array.isArray(ingredients) && ingredients.length > 0) {
    const invMap = new Map(inventoryList.map((inv) => [inv.id, inv]));
    const recipeRows = ingredients
      .filter((ing: any) => invMap.get(ing.inventoryItemId) && ing.quantity)
      .map((ing: any) => {
        const inv = invMap.get(ing.inventoryItemId)!;
        return {
          menuItemId: item.id,
          ingredientName: inv.name,
          unit: inv.unit,
          quantity: String(ing.quantity),
          costPerUnit: String(inv.costPerUnit),
        };
      });

    if (recipeRows.length > 0) {
      await db.insert(recipes).values(recipeRows);
    }
  }

  return c.json({ success: true, data: item }, 201);
});

// PUT /menu/items/:id — full update
menuRouter.put('/items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [item] = await db.update(menuItems).set(body).where(eq(menuItems.id, id)).returning();
  return c.json({ success: true, data: item });
});

// PATCH /menu/items/:id — partial update (name, price, description, category, ingredients)
menuRouter.patch('/items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { isAvailable: _a, isDeleted: _d, ingredients, ...safe } = body;

  // If ingredients provided: update item + delete old recipes in parallel, then re-insert
  if (Array.isArray(ingredients)) {
    const invIds = ingredients.map((ing: any) => ing.inventoryItemId).filter(Boolean);

    const [[item], , inventoryList] = await Promise.all([
      db.update(menuItems).set(safe).where(eq(menuItems.id, id)).returning(),
      db.delete(recipes).where(eq(recipes.menuItemId, id)),
      invIds.length > 0
        ? db.select().from(inventoryItems).where(inArray(inventoryItems.id, invIds))
        : Promise.resolve([]),
    ]);

    if (inventoryList.length > 0 && ingredients.length > 0) {
      const invMap = new Map(inventoryList.map((inv) => [inv.id, inv]));
      const rows = ingredients
        .filter((ing: any) => invMap.get(ing.inventoryItemId) && ing.quantity)
        .map((ing: any) => {
          const inv = invMap.get(ing.inventoryItemId)!;
          return {
            menuItemId: id,
            ingredientName: inv.name,
            unit: inv.unit,
            quantity: String(ing.quantity),
            costPerUnit: String(inv.costPerUnit),
          };
        });
      if (rows.length > 0) await db.insert(recipes).values(rows);
    }

    return c.json({ success: true, data: item });
  }

  // No ingredient changes — simple field update
  const [item] = await db.update(menuItems).set(safe).where(eq(menuItems.id, id)).returning();
  return c.json({ success: true, data: item });
});

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH /menu/items/:id/toggle — toggle availability
menuRouter.patch('/items/:id/toggle', async (c) => {
  const id = c.req.param('id');
  if (!IS_UUID.test(id)) {
    return c.json({ success: true, data: { id, isAvailable: true } });
  }

  const current = await db.query.menuItems.findFirst({ where: eq(menuItems.id, id) });
  if (!current) return c.json({ success: false, error: 'Not found' }, 404);

  const [updated] = await db
    .update(menuItems)
    .set({ isAvailable: !current.isAvailable })
    .where(eq(menuItems.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});

// DELETE /menu/items/:id — soft delete
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
