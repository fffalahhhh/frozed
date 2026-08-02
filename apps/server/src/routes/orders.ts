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
import { eq, desc, sql, ilike } from 'drizzle-orm';

export const ordersRouter = new Hono();

// Helper: compute item cost from recipes + making costs
async function computeItemCost(menuItemId: string, flavourId: string | null): Promise<number> {
  const recipeRows = await db.select().from(recipes).where(eq(recipes.menuItemId, menuItemId));

  const relevant = recipeRows.filter((r) => r.flavourId === null || r.flavourId === flavourId);
  const ingredientCost = relevant.reduce(
    (sum, r) => sum + parseFloat(r.quantity) * parseFloat(r.costPerUnit),
    0,
  );

  const makingRows = await db
    .select()
    .from(makingCosts)
    .where(eq(makingCosts.menuItemId, menuItemId));
  const making = makingRows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return ingredientCost + making;
}

// GET /orders — list all orders
ordersRouter.get('/', async (c) => {
  const list = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    with: { items: true, cashier: true, bill: true },
  });
  return c.json({ success: true, data: list });
});

// POST /orders — create new order
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

  // Resolve valid cashier ID or auto-create fallback cashier
  let cashierId = reqCashierId;
  if (!cashierId || cashierId === '00000000-0000-0000-0000-000000000000') {
    const firstUser = await db.query.users.findFirst();
    if (firstUser) {
      cashierId = firstUser.id;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({ name: 'Cashier', email: 'cashier@frozenshake.com', role: 'cashier' })
        .returning();
      cashierId = newUser.id;
    }
  }

  let subtotal = 0;
  const processedItems: (typeof orderItems.$inferInsert)[] = [];

  for (const ci of cartItems) {
    const menuItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, ci.menuItemId),
    });

    const itemName = menuItem ? menuItem.name : ci.menuItemName || 'Item';
    const unitPrice = menuItem
      ? parseFloat(menuItem.sellingPrice)
      : parseFloat(String(ci.unitPrice || 0));
    const itemCost = menuItem ? await computeItemCost(ci.menuItemId, ci.flavourId ?? null) : 0;
    const lineTotal = unitPrice * ci.quantity;
    subtotal += lineTotal;

    processedItems.push({
      menuItemId: ci.menuItemId,
      menuItemName: itemName,
      flavourId: ci.flavourId ?? null,
      flavourName: ci.flavourName ?? null,
      quantity: ci.quantity,
      unitPrice: unitPrice.toFixed(2),
      itemCost: itemCost.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      notes: ci.notes ?? null,
      orderId: '',
    });

    // Auto-deduct inventory ingredient stock if recipes exist
    if (menuItem) {
      const itemRecipes = await db
        .select()
        .from(recipes)
        .where(eq(recipes.menuItemId, menuItem.id));

      for (const rec of itemRecipes) {
        const totalQtyNeeded = parseFloat(rec.quantity) * ci.quantity;
        await db
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} - ${totalQtyNeeded}`,
            updatedAt: new Date(),
          })
          .where(ilike(inventoryItems.name, rec.ingredientName));
      }
    }
  }

  const discountVal = parseFloat(String(reqDiscount || 0));
  const totalVal = Math.max(0, subtotal - discountVal);
  const statusVal = paymentMethod === 'credit' ? 'open' : 'paid';

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

  const itemsWithOrderId = processedItems.map((i) => ({
    ...i,
    orderId: order.id,
  }));

  if (itemsWithOrderId.length > 0) {
    await db.insert(orderItems).values(itemsWithOrderId);
  }

  const full = await db.query.orders.findFirst({
    where: eq(orders.id, order.id),
    with: { items: true, cashier: true },
  });

  return c.json({ success: true, data: full }, 201);
});

// GET /orders/:id
ordersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true, cashier: true, bill: true },
  });
  if (!order) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: order });
});

// PATCH /orders/:id
ordersRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db.update(orders).set(body).where(eq(orders.id, id)).returning();
  return c.json({ success: true, data: updated });
});

// POST /orders/:id/bill
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

// POST /orders/:id/pay
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
