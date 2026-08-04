import { Hono } from 'hono';
import { db } from '../db/index.js';
import {
  orders,
  orderItems,
  bills,
  recipes,
  makingCosts,
  menuItems,
  users,
  inventoryItems,
} from '../db/schema.js';
import { eq, desc, sql, ilike, inArray } from 'drizzle-orm';

export const ordersRouter = new Hono();

// ─── Background job: deduct inventory stock ───────────────────────────────────
// Runs after the response has been sent — never blocks the request.
async function deductInventoryAsync(
  cartItems: { menuItemId: string; quantity: number }[],
  allRecipes: { menuItemId: string; ingredientName: string; quantity: string }[],
) {
  try {
    const recipesByItem = new Map<string, typeof allRecipes>();
    for (const r of allRecipes) {
      if (!recipesByItem.has(r.menuItemId)) recipesByItem.set(r.menuItemId, []);
      recipesByItem.get(r.menuItemId)!.push(r);
    }

    const updates: Promise<unknown>[] = [];
    for (const ci of cartItems) {
      const recs = recipesByItem.get(ci.menuItemId) ?? [];
      for (const rec of recs) {
        const totalQtyNeeded = parseFloat(rec.quantity) * ci.quantity;
        updates.push(
          db
            .update(inventoryItems)
            .set({
              currentStock: sql`${inventoryItems.currentStock} - ${totalQtyNeeded}`,
              updatedAt: new Date(),
            })
            .where(ilike(inventoryItems.name, rec.ingredientName)),
        );
      }
    }
    await Promise.all(updates);
  } catch (err) {
    console.error('[orders] Background inventory deduction failed:', err);
  }
}

// ─── Background job: patch itemCost on order items ───────────────────────────
// Runs after the response has been sent — never blocks the request.
async function patchItemCostsAsync(
  orderId: string,
  cartItems: { menuItemId: string; flavourId?: string | null }[],
  allRecipes: { menuItemId: string; flavourId: string | null; quantity: string; costPerUnit: string }[],
  allMakingCosts: { menuItemId: string; amount: string }[],
) {
  try {
    const recipesByItem = new Map<string, typeof allRecipes>();
    for (const r of allRecipes) {
      if (!recipesByItem.has(r.menuItemId)) recipesByItem.set(r.menuItemId, []);
      recipesByItem.get(r.menuItemId)!.push(r);
    }

    const makingByItem = new Map<string, number>();
    for (const m of allMakingCosts) {
      makingByItem.set(m.menuItemId, (makingByItem.get(m.menuItemId) ?? 0) + parseFloat(m.amount));
    }

    const patches: Promise<unknown>[] = [];
    for (const ci of cartItems) {
      const relevant = (recipesByItem.get(ci.menuItemId) ?? []).filter(
        (r) => r.flavourId === null || r.flavourId === (ci.flavourId ?? null),
      );
      const ingredientCost = relevant.reduce(
        (sum, r) => sum + parseFloat(r.quantity) * parseFloat(r.costPerUnit),
        0,
      );
      const making = makingByItem.get(ci.menuItemId) ?? 0;
      const cost = (ingredientCost + making).toFixed(2);

      patches.push(
        db
          .update(orderItems)
          .set({ itemCost: cost })
          .where(eq(orderItems.orderId, orderId) && eq(orderItems.menuItemId, ci.menuItemId)),
      );
    }
    await Promise.all(patches);
  } catch (err) {
    console.error('[orders] Background cost patch failed:', err);
  }
}

// ─── GET /orders — list recent orders (paginated) ────────────────────────────
ordersRouter.get('/', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '100'), 500);
  const list = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit,
    with: { items: true, cashier: true, bill: true },
  });
  return c.json({ success: true, data: list });
});

// ─── POST /orders — create new order (fast path) ─────────────────────────────
ordersRouter.post('/', async (c) => {
  const {
    cashierId: reqCashierId,
    tableRef,
    orderType,
    customerName,
    customerPhone,
    paymentMethod,
    items: cartItems,
    discountAmount: reqDiscount,
    notes,
  } = await c.req.json();

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return c.json({ success: false, error: 'Cart items are required' }, 400);
  }

  // ── 1. Resolve cashier + fetch all menu items in parallel ─────────────────
  const menuItemIds = [...new Set(cartItems.map((ci: any) => ci.menuItemId))];

  const [cashierResult, fetchedMenuItems] = await Promise.all([
    // Cashier resolution
    (async () => {
      if (reqCashierId && reqCashierId !== '00000000-0000-0000-0000-000000000000') {
        return reqCashierId as string;
      }
      const firstUser = await db.query.users.findFirst();
      if (firstUser) return firstUser.id;
      const [newUser] = await db
        .insert(users)
        .values({ name: 'Cashier', email: 'cashier@frozenshake.com', role: 'cashier' })
        .returning();
      return newUser.id;
    })(),
    // Single batch fetch for all menu items
    db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds)),
  ]);

  const cashierId = cashierResult;
  const menuItemMap = new Map(fetchedMenuItems.map((m) => [m.id, m]));

  // ── 2. Build order items using only client-provided prices (zero DB calls) ─
  let subtotal = 0;
  const processedItems: (typeof orderItems.$inferInsert)[] = [];

  for (const ci of cartItems) {
    const menuItem = menuItemMap.get(ci.menuItemId);
    const itemName = menuItem ? menuItem.name : ci.menuItemName || 'Item';
    const unitPrice = menuItem
      ? parseFloat(menuItem.sellingPrice)
      : parseFloat(String(ci.unitPrice || 0));
    const lineTotal = unitPrice * ci.quantity;
    subtotal += lineTotal;

    processedItems.push({
      menuItemId: ci.menuItemId,
      menuItemName: itemName,
      flavourId: ci.flavourId ?? null,
      flavourName: ci.flavourName ?? null,
      quantity: ci.quantity,
      unitPrice: unitPrice.toFixed(2),
      itemCost: '0.00', // patched in background after response
      lineTotal: lineTotal.toFixed(2),
      notes: ci.notes ?? null,
      orderId: '',
    });
  }

  const discountVal = parseFloat(String(reqDiscount || 0));
  const totalVal = Math.max(0, subtotal - discountVal);
  const statusVal = paymentMethod === 'credit' ? 'open' : 'paid';

  // ── 3. Insert order + items in parallel ───────────────────────────────────
  const [order] = await db
    .insert(orders)
    .values({
      cashierId,
      tableRef: tableRef ?? null,
      orderType: orderType ?? 'dine_in',
      customerName: customerName ? String(customerName).trim() : null,
      customerPhone: customerPhone ? String(customerPhone).trim() : null,
      status: statusVal,
      paymentMethod: paymentMethod ?? 'cash',
      subtotal: subtotal.toFixed(2),
      discountAmount: discountVal.toFixed(2),
      totalAmount: totalVal.toFixed(2),
      notes: notes ?? null,
      paidAt: paymentMethod && paymentMethod !== 'credit' ? new Date() : null,
    })
    .returning();

  const itemsWithOrderId = processedItems.map((i) => ({ ...i, orderId: order.id }));
  if (itemsWithOrderId.length > 0) {
    await db.insert(orderItems).values(itemsWithOrderId);
  }

  // ── 4. Respond immediately — kick off background jobs without awaiting ────
  if (menuItemIds.length > 0) {
    // Fetch recipes + making costs in parallel for background jobs
    Promise.all([
      db.select().from(recipes).where(inArray(recipes.menuItemId, menuItemIds)),
      db.select().from(makingCosts).where(inArray(makingCosts.menuItemId, menuItemIds)),
    ]).then(([allRecipes, allMakingCosts]) => {
      deductInventoryAsync(cartItems, allRecipes);
      patchItemCostsAsync(order.id, cartItems, allRecipes, allMakingCosts);
    });
  }

  // Return the order directly — no extra SELECT round-trip
  return c.json(
    {
      success: true,
      data: {
        ...order,
        items: itemsWithOrderId,
      },
    },
    201,
  );
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
ordersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true, cashier: true, bill: true },
  });
  if (!order) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: order });
});

// ─── PATCH /orders/:id ────────────────────────────────────────────────────────
ordersRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db.update(orders).set(body).where(eq(orders.id, id)).returning();
  return c.json({ success: true, data: updated });
});

// ─── POST /orders/:id/bill ────────────────────────────────────────────────────
ordersRouter.post('/:id/bill', async (c) => {
  const id = c.req.param('id');
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });
  if (!order) return c.json({ success: false, error: 'Not found' }, 404);

  const billNumber = `BILL-${order.orderNumber.toString().padStart(5, '0')}`;

  const [bill] = await db.insert(bills).values({ orderId: id, billNumber }).returning();

  await db.update(orders).set({ status: 'billed' }).where(eq(orders.id, id));

  return c.json({ success: true, data: { bill, billNumber } });
});

// ─── POST /orders/:id/pay ─────────────────────────────────────────────────────
ordersRouter.post('/:id/pay', async (c) => {
  const id = c.req.param('id');
  const { paymentMethod } = await c.req.json();
  const [updated] = await db
    .update(orders)
    .set({ status: 'paid', paymentMethod, paidAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});
