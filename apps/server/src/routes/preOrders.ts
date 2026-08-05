import { Hono } from 'hono';
import { db } from '../db/index.js';
import { preOrders } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const preOrdersRouter = new Hono();

// ─── GET /pre-orders — List all active pending pre-orders ─────────────────────
preOrdersRouter.get('/', async (c) => {
  try {
    const list = await db.query.preOrders.findMany({
      where: eq(preOrders.status, 'pending'),
      orderBy: [desc(preOrders.createdAt)],
    });
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── POST /pre-orders — Create a new pending pre-order ───────────────────────
preOrdersRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerName,
      customerPhone,
      paymentMethod,
      items,
      subtotal,
      totalAmount,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Pre-order items are required' }, 400);
    }

    const subtotalVal = parseFloat(String(subtotal || 0));
    const totalVal = parseFloat(String(totalAmount || subtotalVal));

    const [newPreOrder] = await db
      .insert(preOrders)
      .values({
        customerName: customerName ? String(customerName).trim() : null,
        customerPhone: customerPhone ? String(customerPhone).trim() : null,
        paymentMethod: paymentMethod || 'cash',
        items,
        subtotal: subtotalVal.toFixed(2),
        totalAmount: totalVal.toFixed(2),
        status: 'pending',
      })
      .returning();

    return c.json({ success: true, data: newPreOrder }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── DELETE /pre-orders/:id — Delete or process pre-order ────────────────────
preOrdersRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await db.delete(preOrders).where(eq(preOrders.id, id));
    return c.json({ success: true, message: 'Pre-order processed/removed' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
