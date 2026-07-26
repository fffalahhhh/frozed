import { Hono } from 'hono';
import { db } from '../db/index.js';
import { orders, orderItems, shopExpenses, menuItems } from '../db/schema.js';
import { eq, gte, lte, and, sql, desc } from 'drizzle-orm';

export const analyticsRouter = new Hono();

function dateFilters(from?: string, to?: string) {
  const filters = [eq(orders.status, 'paid')];
  if (from) filters.push(gte(orders.createdAt, new Date(from)));
  if (to) filters.push(lte(orders.createdAt, new Date(to + 'T23:59:59')));
  return and(...filters);
}

// GET /analytics/sales?from=&to=
analyticsRouter.get('/sales', async (c) => {
  const { from, to } = c.req.query();

  const rows = await db
    .select({
      date: sql<string>`DATE(${orders.createdAt})`,
      revenue: sql<string>`SUM(${orders.totalAmount})`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(dateFilters(from, to))
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);

  return c.json({ success: true, data: rows });
});

// GET /analytics/top-items?from=&to=
analyticsRouter.get('/top-items', async (c) => {
  const { from, to } = c.req.query();

  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.menuItemName,
      quantitySold: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<string>`SUM(${orderItems.lineTotal})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(dateFilters(from, to))
    .groupBy(orderItems.menuItemId, orderItems.menuItemName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(10);

  return c.json({ success: true, data: rows });
});

// GET /analytics/profit?from=&to= — gross + net profit
analyticsRouter.get('/profit', async (c) => {
  const { from, to } = c.req.query();

  const [revenueRow] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      totalCOGS: sql<string>`COALESCE(SUM(${orderItems.itemCost} * ${orderItems.quantity}), 0)`,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(dateFilters(from, to));

  let expenseQuery = db
    .select({ total: sql<string>`COALESCE(SUM(${shopExpenses.amount}), 0)` })
    .from(shopExpenses)
    .$dynamic();
  if (from) expenseQuery = expenseQuery.where(gte(shopExpenses.expenseDate, from));
  if (to) expenseQuery = expenseQuery.where(lte(shopExpenses.expenseDate, to));
  const [expenseRow] = await expenseQuery;

  const totalRevenue = parseFloat(revenueRow?.totalRevenue ?? '0');
  const totalCOGS = parseFloat(revenueRow?.totalCOGS ?? '0');
  const shopExpTotal = parseFloat(expenseRow?.total ?? '0');
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - shopExpTotal;

  return c.json({
    success: true,
    data: {
      totalRevenue: totalRevenue.toFixed(2),
      totalCOGS: totalCOGS.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      shopExpenses: shopExpTotal.toFixed(2),
      netProfit: netProfit.toFixed(2),
    },
  });
});

// GET /analytics/expenses-breakdown?from=&to=
analyticsRouter.get('/expenses-breakdown', async (c) => {
  const { from, to } = c.req.query();

  let query = db
    .select({
      category: shopExpenses.category,
      total: sql<string>`SUM(${shopExpenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(shopExpenses)
    .$dynamic()
    .groupBy(shopExpenses.category)
    .orderBy(desc(sql`SUM(${shopExpenses.amount})`));

  if (from) query = query.where(gte(shopExpenses.expenseDate, from));
  if (to) query = query.where(lte(shopExpenses.expenseDate, to));

  const rows = await query;
  return c.json({ success: true, data: rows });
});

// GET /analytics/inventory-usage?from=&to=
analyticsRouter.get('/inventory-usage', async (c) => {
  const { from, to } = c.req.query();
  // Returns total orders sold per item as proxy for ingredient usage
  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.menuItemName,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(dateFilters(from, to))
    .groupBy(orderItems.menuItemId, orderItems.menuItemName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`));

  return c.json({ success: true, data: rows });
});
