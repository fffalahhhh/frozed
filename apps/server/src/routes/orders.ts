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
} from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const ordersRouter = new Hono();

// Helper: compute item cost from recipes + making costs
async function computeItemCost(
  menuItemId: string,
  flavourId: string | null
): Promise<number> {
  const recipeRows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.menuItemId, menuItemId));

  const relevant = recipeRows.filter(
    (r) => r.flavourId === null || r.flavourId === flavourId
  );
  const ingredientCost = relevant.reduce(
    (sum, r) => sum + parseFloat(r.quantity) * parseFloat(r.costPerUnit),
    0
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
  const { cashierId: reqCashierId, tableRef, orderType, customerName, items: cartItems, notes } =
    await c.req.json();

  // Resolve valid cashier ID
  let cashierId = reqCashierId;
  if (!cashierId || cashierId === '00000000-0000-0000-0000-000000000000') {
    const firstUser = await db.query.users.findFirst();
    cashierId = firstUser?.id;
  }

  if (!cashierId) {
    return c.json({ success: false, error: 'No user found for cashierId' }, 400);
  }

  let subtotal = 0;
  const processedItems: typeof orderItems.$inferInsert[] = [];

  for (const ci of cartItems) {
    const menuItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, ci.menuItemId),
    });
    if (!menuItem) continue;

    const unitPrice = parseFloat(menuItem.sellingPrice);
    const itemCost = await computeItemCost(ci.menuItemId, ci.flavourId ?? null);
    const lineTotal = unitPrice * ci.quantity;
    subtotal += lineTotal;

    processedItems.push({
      menuItemId: ci.menuItemId,
      menuItemName: menuItem.name,
      flavourId: ci.flavourId ?? null,
      flavourName: ci.flavourName ?? null,
      quantity: ci.quantity,
      unitPrice: unitPrice.toFixed(2),
      itemCost: itemCost.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      notes: ci.notes ?? null,
      orderId: '',
    });
  }

  const [order] = await db
    .insert(orders)
    .values({
      cashierId,
      tableRef: tableRef ?? null,
      orderType: orderType ?? 'dine_in',
      customerName: customerName ?? null,
      status: 'open',
      subtotal: subtotal.toFixed(2),
      discountAmount: '0',
      totalAmount: subtotal.toFixed(2),
      notes: notes ?? null,
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
  const [updated] = await db
    .update(orders)
    .set(body)
    .where(eq(orders.id, id))
    .returning();
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

  const [bill] = await db
    .insert(bills)
    .values({ orderId: id, billNumber })
    .returning();

  await db
    .update(orders)
    .set({ status: 'billed' })
    .where(eq(orders.id, id));

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
