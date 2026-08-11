import { Hono } from 'hono';
import { db } from '../db/index.js';
import { orders, orderItems, shopExpenses } from '../db/schema.js';
import { eq, gte, lte, and, sql, desc } from 'drizzle-orm';

export const analyticsRouter = new Hono();

function orderDateFilters(from?: string, to?: string) {
  const filters = [eq(orders.status, 'paid')];
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      filters.push(gte(orders.createdAt, fromDate));
    }
  }
  if (to) {
    const toDate = to.includes('T') ? new Date(to) : new Date(to + 'T23:59:59.999Z');
    if (!isNaN(toDate.getTime())) {
      filters.push(lte(orders.createdAt, toDate));
    }
  }
  return and(...filters);
}

function expenseDateFilters(from?: string, to?: string) {
  const filters: ReturnType<typeof gte>[] = [];
  if (from) filters.push(gte(shopExpenses.expenseDate, from));
  if (to) filters.push(lte(shopExpenses.expenseDate, to));
  return filters.length ? and(...filters) : undefined;
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
    .where(orderDateFilters(from, to))
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
    .where(orderDateFilters(from, to))
    .groupBy(orderItems.menuItemId, orderItems.menuItemName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(10);

  return c.json({ success: true, data: rows });
});

// GET /analytics/profit?from=&to= — gross + net profit (both queries run in parallel)
analyticsRouter.get('/profit', async (c) => {
  const { from, to } = c.req.query();

  const expFilter = expenseDateFilters(from, to);

  const [revenueRows, expenseRows] = await Promise.all([
    db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        totalCOGS: sql<string>`COALESCE(SUM(${orderItems.itemCost} * ${orderItems.quantity}), 0)`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(orderDateFilters(from, to)),
    db
      .select({ total: sql<string>`COALESCE(SUM(${shopExpenses.amount}), 0)` })
      .from(shopExpenses)
      .where(expFilter),
  ]);

  const totalRevenue = parseFloat(revenueRows[0]?.totalRevenue ?? '0');
  const totalCOGS = parseFloat(revenueRows[0]?.totalCOGS ?? '0');
  const shopExpTotal = parseFloat(expenseRows[0]?.total ?? '0');
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
  const expFilter = expenseDateFilters(from, to);

  const rows = await db
    .select({
      category: shopExpenses.category,
      total: sql<string>`SUM(${shopExpenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(shopExpenses)
    .where(expFilter)
    .groupBy(shopExpenses.category)
    .orderBy(desc(sql`SUM(${shopExpenses.amount})`));

  return c.json({ success: true, data: rows });
});

// GET /analytics/inventory-usage?from=&to=
analyticsRouter.get('/inventory-usage', async (c) => {
  const { from, to } = c.req.query();

  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.menuItemName,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(orderDateFilters(from, to))
    .groupBy(orderItems.menuItemId, orderItems.menuItemName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`));

  return c.json({ success: true, data: rows });
});

// GET /analytics/summary?from=&to= — all key metrics in ONE request
analyticsRouter.get('/summary', async (c) => {
  const { from, to } = c.req.query();
  const expFilter = expenseDateFilters(from, to);

  const [salesRows, topItemRows, allItemRows, profitRows, expenseRows] = await Promise.all([
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`SUM(${orders.totalAmount})`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(orderDateFilters(from, to))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),

    db
      .select({
        menuItemId: orderItems.menuItemId,
        name: orderItems.menuItemName,
        quantitySold: sql<number>`SUM(${orderItems.quantity})`,
        revenue: sql<string>`SUM(${orderItems.lineTotal})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(orderDateFilters(from, to))
      .groupBy(orderItems.menuItemId, orderItems.menuItemName)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10),

    db
      .select({
        menuItemId: orderItems.menuItemId,
        name: orderItems.menuItemName,
        quantitySold: sql<number>`SUM(${orderItems.quantity})`,
        netSales: sql<string>`SUM(${orderItems.lineTotal})`,
        expenses: sql<string>`SUM(${orderItems.itemCost} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(orderDateFilters(from, to))
      .groupBy(orderItems.menuItemId, orderItems.menuItemName)
      .orderBy(desc(sql`SUM(${orderItems.lineTotal})`)),

    db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        totalCOGS: sql<string>`COALESCE(SUM(${orderItems.itemCost} * ${orderItems.quantity}), 0)`,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(orderDateFilters(from, to)),

    db
      .select({ total: sql<string>`COALESCE(SUM(${shopExpenses.amount}), 0)` })
      .from(shopExpenses)
      .where(expFilter),
  ]);

  const totalRevenue = parseFloat(profitRows[0]?.totalRevenue ?? '0');
  const totalCOGS = parseFloat(profitRows[0]?.totalCOGS ?? '0');
  const shopExpTotal = parseFloat(expenseRows[0]?.total ?? '0');

  const formattedAllItems = allItemRows.map((item) => {
    const sales = parseFloat(item.netSales || '0');
    const exp = parseFloat(item.expenses || '0');
    const profit = sales - exp;
    const marginPercent = sales > 0 ? (profit / sales) * 100 : 0;
    return {
      menuItemId: item.menuItemId,
      name: item.name,
      quantitySold: Number(item.quantitySold || 0),
      netSales: sales,
      expenses: exp,
      profit: profit,
      marginPercent: parseFloat(marginPercent.toFixed(1)),
    };
  });

  return c.json({
    success: true,
    data: {
      sales: salesRows,
      topItems: topItemRows,
      allItems: formattedAllItems,
      orderCount: profitRows[0]?.orderCount ?? 0,
      totalRevenue: totalRevenue.toFixed(2),
      totalCOGS: totalCOGS.toFixed(2),
      grossProfit: (totalRevenue - totalCOGS).toFixed(2),
      shopExpenses: shopExpTotal.toFixed(2),
      netProfit: (totalRevenue - totalCOGS - shopExpTotal).toFixed(2),
    },
  });
});
