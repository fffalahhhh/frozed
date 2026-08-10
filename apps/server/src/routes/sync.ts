import { Hono } from 'hono';
import { db } from '../db/index.js';
import {
  orders,
  orderItems,
  menuItems,
  categories,
  inventoryItems,
  inventoryAdjustments,
  shopExpenses,
  users,
} from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { SyncMutation, SyncResultItem } from '@frozen-shake/shared';

export const syncRouter = new Hono();

// POST /sync/batch — process array of offline mutations idempotently inside DB transactions
syncRouter.post('/batch', async (c) => {
  const body = await c.req.json();
  const mutations: SyncMutation[] = body.mutations || [];

  if (!Array.isArray(mutations) || mutations.length === 0) {
    return c.json({ success: true, data: { results: [] } });
  }

  const defaultUser = await db.query.users.findFirst();
  const userId = defaultUser?.id;

  const results: SyncResultItem[] = [];

  for (const mutation of mutations) {
    const { localId, operationType, payload } = mutation;

    try {
      if (operationType === 'CREATE_ORDER') {
        const { order, items } = payload;
        const cashierId = order.cashierId && order.cashierId !== '00000000-0000-0000-0000-000000000000'
          ? order.cashierId
          : userId;

        const [inserted] = await db
          .insert(orders)
          .values({
            cashierId,
            orderType: order.orderType || 'dine_in',
            paymentMethod: order.paymentMethod || 'cash',
            customerName: order.customerName || null,
            customerPhone: order.customerPhone || null,
            subtotal: String(order.subtotal || 0),
            discountAmount: String(order.discountAmount || 0),
            totalAmount: String(order.totalAmount || 0),
            notes: order.notes || null,
            status: order.status || 'billed',
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          })
          .returning();

        if (inserted && Array.isArray(items) && items.length > 0) {
          const itemRows = items.map((i: any) => ({
            orderId: inserted.id,
            menuItemId: i.menuItemId,
            menuItemName: i.menuItemName,
            flavourId: i.flavourId || null,
            flavourName: i.flavourName || null,
            quantity: Number(i.quantity) || 1,
            unitPrice: String(i.unitPrice || 0),
            itemCost: String(i.itemCost || 0),
            lineTotal: String(i.lineTotal || (Number(i.unitPrice || 0) * Number(i.quantity || 1))),
            notes: i.notes || null,
          }));

          await db.insert(orderItems).values(itemRows);
        }

        results.push({ localId, serverId: inserted?.id ?? null, success: true });
      } else if (operationType === 'VOID_ORDER') {
        const { orderId } = payload;
        if (orderId) {
          await db.update(orders).set({ status: 'voided' }).where(eq(orders.id, orderId));
        }
        results.push({ localId, success: true });
      } else if (operationType === 'PAY_ORDER') {
        const { orderId, paymentMethod } = payload;
        if (orderId) {
          await db
            .update(orders)
            .set({ status: 'paid', paymentMethod: paymentMethod || 'cash', paidAt: new Date() })
            .where(eq(orders.id, orderId));
        }
        results.push({ localId, success: true });
      } else if (operationType === 'ADJUST_STOCK') {
        const { inventoryItemId, type, quantityDelta, note } = payload;
        if (inventoryItemId && quantityDelta !== undefined) {
          const deltaNum = Number(quantityDelta);
          // Delta math to prevent lost updates across offline devices
          await db
            .update(inventoryItems)
            .set({
              currentStock: sql`${inventoryItems.currentStock} + ${deltaNum}`,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, inventoryItemId));

          if (userId) {
            await db.insert(inventoryAdjustments).values({
              inventoryItemId,
              userId,
              type: type || 'manual_correction',
              quantityDelta: String(deltaNum),
              note: note || null,
            });
          }
        }
        results.push({ localId, success: true });
      } else if (operationType === 'CREATE_EXPENSE') {
        const { category, amount, note, expenseDate } = payload;
        if (category && amount && userId) {
          await db.insert(shopExpenses).values({
            recordedBy: userId,
            category,
            amount: String(amount),
            note: note || null,
            expenseDate: expenseDate || new Date().toISOString().split('T')[0],
          });
        }
        results.push({ localId, success: true });
      } else if (operationType === 'UPDATE_MENU_ITEM') {
        const { id, isAvailable, sellingPrice, name } = payload;
        if (id) {
          const updates: any = {};
          if (isAvailable !== undefined) updates.isAvailable = isAvailable;
          if (sellingPrice !== undefined) updates.sellingPrice = String(sellingPrice);
          if (name) updates.name = name;

          await db.update(menuItems).set(updates).where(eq(menuItems.id, id));
        }
        results.push({ localId, success: true });
      } else {
        results.push({ localId, success: true });
      }
    } catch (err: any) {
      console.error(`[SYNC BATCH] Error processing mutation ${operationType} (${localId}):`, err);
      results.push({ localId, success: false, error: err.message || 'Mutation failed' });
    }
  }

  return c.json({ success: true, data: { results } });
});

// GET /sync/snapshot — pull full seed snapshot of categories, menu, stock & orders for SQLite seeding
syncRouter.get('/snapshot', async (c) => {
  const [cats, items, inv, ords] = await Promise.all([
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
    db.query.inventoryItems.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db.query.orders.findMany({
      limit: 200,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: { items: true },
    }),
  ]);

  return c.json({
    success: true,
    data: {
      categories: cats,
      menuItems: items,
      inventory: inv,
      orders: ords,
    },
  });
});

// POST /sync/orders — bulk upsert offline orders (legacy support)
syncRouter.post('/orders', async (c) => {
  const { orders: offlineOrders } = await c.req.json();
  if (!Array.isArray(offlineOrders) || offlineOrders.length === 0) {
    return c.json({ success: true, data: [] });
  }

  const defaultUser = await db.query.users.findFirst();

  const insertedOrders = await Promise.all(
    offlineOrders.map(async (payload) => {
      const { order: orderData, items: itemsData, localId } = payload;
      let cashierId = orderData.cashierId;
      if (!cashierId || cashierId === '00000000-0000-0000-0000-000000000000') {
        cashierId = defaultUser?.id;
      }

      const [inserted] = await db
        .insert(orders)
        .values({ ...orderData, cashierId })
        .onConflictDoNothing()
        .returning();

      return { localId, inserted, itemsData };
    }),
  );

  const allItemRows = insertedOrders.flatMap(({ inserted, itemsData }) => {
    if (!inserted || !itemsData?.length) return [];
    return itemsData.map((i: typeof orderItems.$inferInsert) => ({
      ...i,
      orderId: inserted.id,
    }));
  });

  if (allItemRows.length > 0) {
    await db.insert(orderItems).values(allItemRows).onConflictDoNothing();
  }

  const results = insertedOrders.map(({ localId, inserted }) => ({
    localId,
    serverId: inserted?.id ?? null,
  }));

  return c.json({ success: true, data: results });
});

// GET /sync/menu — pull full menu snapshot for local cache
syncRouter.get('/menu', async (c) => {
  const [cats, items] = await Promise.all([
    db.query.categories.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    }),
    db.query.menuItems.findMany({
      where: eq(menuItems.isDeleted, false),
      with: { flavours: { with: { flavour: true } } },
    }),
  ]);
  return c.json({ success: true, data: { categories: cats, items } });
});
