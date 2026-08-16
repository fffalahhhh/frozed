import { Pool } from 'pg';
import { db } from '../db/index.js';
import {
  categories,
  menuItems,
  inventoryItems,
  recipes,
  orders,
  orderItems,
  bills,
  inventoryAdjustments,
  shopExpenses,
  preOrders,
  users,
  analyticsSecurity,
  makingCosts,
  menuItemFlavours,
  flavours,
} from '../db/schema.js';
import { eq, and, desc, asc, sql, inArray, gte, lte, ilike, ne, or } from 'drizzle-orm';

function isValidUuid(val: any): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );
}

async function getOrCreateDefaultUser(reqCashierId?: string): Promise<string> {
  if (
    reqCashierId &&
    isValidUuid(reqCashierId) &&
    reqCashierId !== '00000000-0000-0000-0000-000000000000'
  ) {
    return reqCashierId;
  }
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    return existing[0].id;
  }
  const [newUser] = await db
    .insert(users)
    .values({
      name: 'Cashier',
      email: `cashier_${Date.now()}@frozenshake.com`,
      role: 'cashier',
    })
    .returning();
  return newUser.id;
}

// ─── Background jobs for Orders ───────────────────────────────────────────────

async function deductInventoryAsync(
  cartItems: { menuItemId: string; quantity: number }[],
  allRecipes: { menuItemId: string; ingredientName: string; quantity: string }[],
) {
  try {
    const qtyByItem = new Map<string, number>();
    for (const ci of cartItems) {
      qtyByItem.set(ci.menuItemId, (qtyByItem.get(ci.menuItemId) || 0) + ci.quantity);
    }

    const totalNeededByIngredient = new Map<string, number>();
    for (const r of allRecipes) {
      const itemQty = qtyByItem.get(r.menuItemId) ?? 0;
      if (itemQty > 0) {
        const totalQtyNeeded = parseFloat(r.quantity) * itemQty;
        const key = r.ingredientName.trim();
        totalNeededByIngredient.set(key, (totalNeededByIngredient.get(key) ?? 0) + totalQtyNeeded);
      }
    }

    const updates: Promise<unknown>[] = [];
    for (const [ingName, delta] of totalNeededByIngredient.entries()) {
      updates.push(
        db
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} - ${delta}`,
            updatedAt: new Date(),
          })
          .where(ilike(inventoryItems.name, ingName)),
      );
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.error('[GraphQL Resolvers] Background inventory deduction failed:', err);
  }
}

async function patchItemCostsAsync(
  orderId: string,
  cartItems: { menuItemId: string; flavourId?: string | null }[],
  allRecipes: {
    menuItemId: string;
    flavourId: string | null;
    quantity: string;
    costPerUnit: string;
  }[],
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
          .where(and(eq(orderItems.orderId, orderId), eq(orderItems.menuItemId, ci.menuItemId))),
      );
    }
    await Promise.all(patches);
  } catch (err) {
    console.error('[GraphQL Resolvers] Background cost patch failed:', err);
  }
}

function parseDateParam(dateStr?: string, isEnd = false): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr === 'null' || dateStr === 'undefined') return null;
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const timeStr = isEnd ? '23:59:59.999' : '00:00:00.000';
  const dt = new Date(`${dateStr}T${timeStr}`);
  return isNaN(dt.getTime()) ? null : dt;
}

function orderDateFilters(from?: string, to?: string) {
  const filters = [eq(orders.status, 'paid')];
  if (from && from.trim() && from !== 'null') {
    const fromDate = parseDateParam(from, false);
    if (fromDate) {
      filters.push(gte(orders.createdAt, fromDate));
    }
  }
  if (to && to.trim() && to !== 'null') {
    const toDate = parseDateParam(to, true);
    if (toDate) {
      filters.push(lte(orders.createdAt, toDate));
    }
  }
  return and(...filters);
}

function unpaidOrderDateFilters(from?: string, to?: string) {
  const filters = [ne(orders.status, 'paid'), ne(orders.status, 'voided')];
  if (from && from.trim() && from !== 'null') {
    const fromDate = parseDateParam(from, false);
    if (fromDate) {
      filters.push(gte(orders.createdAt, fromDate));
    }
  }
  if (to && to.trim() && to !== 'null') {
    const toDate = parseDateParam(to, true);
    if (toDate) {
      filters.push(lte(orders.createdAt, toDate));
    }
  }
  return and(...filters);
}

function expenseDateFilters(from?: string, to?: string) {
  const filters: ReturnType<typeof gte>[] = [];
  if (from && from.trim() && from !== 'null') {
    const fromDateStr = from.includes('T') ? from.split('T')[0] : from;
    filters.push(gte(shopExpenses.expenseDate, fromDateStr));
  }
  if (to && to.trim() && to !== 'null') {
    const toDateStr = to.includes('T') ? to.split('T')[0] : to;
    filters.push(lte(shopExpenses.expenseDate, toDateStr));
  }
  return filters.length ? and(...filters) : undefined;
}

async function ensureAnalyticsSecurityTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "analytics_security" (
        "key" TEXT PRIMARY KEY DEFAULT 'analytics_password',
        "password" TEXT NOT NULL DEFAULT 'Frozed2026',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('[DB] ensureAnalyticsSecurityTable warning:', err);
  }
}

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Resolvers ───────────────────────────────────────────────────────────────

export const resolvers = {
  Query: {
    menu: async () => {
      const [cats, items, stockItems, mifList, fls, recipeList] = await Promise.all([
        db.select().from(categories).orderBy(asc(categories.sortOrder)),
        db
          .select()
          .from(menuItems)
          .where(eq(menuItems.isDeleted, false))
          .orderBy(asc(menuItems.name)),
        db.select().from(inventoryItems),
        db.select().from(menuItemFlavours),
        db.select().from(flavours),
        db.select().from(recipes),
      ]);

      const flavourMap = new Map(fls.map((f) => [f.id, f.name]));
      const flavoursByMenuItem = new Map<
        string,
        Array<{ flavourId: string; flavourName: string; extraCost: string }>
      >();
      for (const mif of mifList) {
        if (!flavoursByMenuItem.has(mif.menuItemId)) flavoursByMenuItem.set(mif.menuItemId, []);
        flavoursByMenuItem.get(mif.menuItemId)!.push({
          flavourId: mif.flavourId,
          flavourName: flavourMap.get(mif.flavourId) || 'Flavour',
          extraCost: mif.extraCost,
        });
      }

      const recipesByMenuItem = new Map<string, typeof recipeList>();
      for (const r of recipeList) {
        if (!recipesByMenuItem.has(r.menuItemId)) recipesByMenuItem.set(r.menuItemId, []);
        recipesByMenuItem.get(r.menuItemId)!.push(r);
      }

      const stockMap = new Map(
        stockItems.map((s) => [s.name.toLowerCase().trim(), parseFloat(s.currentStock)]),
      );

      const needsRestockNames = new Set(
        stockItems
          .filter((s) => parseFloat(s.currentStock) <= parseFloat(s.reorderLevel))
          .map((s) => s.name.toLowerCase()),
      );

      return cats.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const needsRestock = catItems.some((item) =>
          needsRestockNames.has(item.name.toLowerCase()),
        );
        return {
          category: cat,
          items: catItems.map((item) => {
            const itemRecipes = recipesByMenuItem.get(item.id) || [];
            let maxAvailable = 999999;
            if (!item.isAvailable) {
              maxAvailable = 0;
            } else if (itemRecipes.length > 0) {
              for (const rec of itemRecipes) {
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
              maxAvailable = 999;
            }

            const effectiveAvailable = item.isAvailable && maxAvailable > 0;

            return {
              ...item,
              isAvailable: effectiveAvailable,
              maxAvailable,
              flavours: flavoursByMenuItem.get(item.id) || [],
              recipes: itemRecipes,
            };
          }),
          needsRestock,
        };
      });
    },

    menuItem: async (_: unknown, { id }: { id: string }) => {
      const [items, mifList, fls, recipeList] = await Promise.all([
        db
          .select()
          .from(menuItems)
          .where(and(eq(menuItems.id, id), eq(menuItems.isDeleted, false))),
        db.select().from(menuItemFlavours).where(eq(menuItemFlavours.menuItemId, id)),
        db.select().from(flavours),
        db.select().from(recipes).where(eq(recipes.menuItemId, id)),
      ]);
      const item = items[0];
      if (!item) return null;

      const flavourMap = new Map(fls.map((f) => [f.id, f.name]));
      const flavoursList = mifList.map((mif) => ({
        flavourId: mif.flavourId,
        flavourName: flavourMap.get(mif.flavourId) || 'Flavour',
        extraCost: mif.extraCost,
      }));

      return {
        ...item,
        flavours: flavoursList,
        recipes: recipeList || [],
      };
    },

    inventory: async () => {
      const items = await db.select().from(inventoryItems);
      return items.map((item) => ({
        ...item,
        needsRestock: parseFloat(item.currentStock) <= parseFloat(item.reorderLevel),
      }));
    },

    inventoryAdjustments: async () => {
      const [adjustments, items, userList] = await Promise.all([
        db
          .select()
          .from(inventoryAdjustments)
          .orderBy(desc(inventoryAdjustments.createdAt))
          .limit(100),
        db.select().from(inventoryItems),
        db.select().from(users),
      ]);
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const userMap = new Map(userList.map((u) => [u.id, u]));

      return adjustments.map((adj) => ({
        ...adj,
        item: itemMap.get(adj.inventoryItemId),
        user: userMap.get(adj.userId),
      }));
    },

    orders: async (
      _: unknown,
      {
        from,
        to,
        search,
        customerName,
        status,
        sortBy,
        page = 1,
        limit = 10,
      }: {
        from?: string;
        to?: string;
        search?: string;
        customerName?: string;
        status?: string;
        sortBy?: string;
        page?: number;
        limit?: number;
      },
    ) => {
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(Math.max(1, limit), 100);
      const offset = (pageNum - 1) * limitNum;

      const conditions: ReturnType<typeof gte>[] = [];

      if (from && from.trim() && from !== 'null') {
        const fromDate = parseDateParam(from, false);
        if (fromDate) conditions.push(gte(orders.createdAt, fromDate));
      }
      if (to && to.trim() && to !== 'null') {
        const toDate = parseDateParam(to, true);
        if (toDate) conditions.push(lte(orders.createdAt, toDate));
      }
      if (status && status !== 'all') {
        conditions.push(eq(orders.status, status as any));
      }
      if (customerName && customerName !== 'all') {
        conditions.push(eq(orders.customerName, customerName));
      }
      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        conditions.push(
          or(
            ilike(orders.orderNumber, term),
            ilike(orders.customerName, term),
            sql`EXISTS (
              SELECT 1 FROM ${orderItems}
              WHERE ${orderItems.orderId} = ${orders.id}
                AND LOWER(${orderItems.menuItemName}) LIKE ${term}
            )`,
          ) as any,
        );
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      // Order Clause
      let orderClause = desc(orders.createdAt);
      if (sortBy === 'time_asc') {
        orderClause = asc(orders.createdAt);
      } else if (sortBy === 'amount_desc') {
        orderClause = desc(orders.totalAmount);
      } else if (sortBy === 'amount_asc') {
        orderClause = asc(orders.totalAmount);
      } else if (sortBy === 'customer_asc') {
        orderClause = asc(orders.customerName);
      }

      const [countResult, list] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .where(whereClause),
        db
          .select()
          .from(orders)
          .where(whereClause)
          .orderBy(orderClause)
          .limit(limitNum)
          .offset(offset),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      const orderIds = list.map((o) => o.id);
      const userIds = [...new Set(list.map((o) => o.cashierId).filter(Boolean))];

      const [itemRows, userRows] = await Promise.all([
        orderIds.length > 0
          ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
          : [],
        userIds.length > 0 ? db.select().from(users).where(inArray(users.id, userIds)) : [],
      ]);

      const itemsByOrderId = new Map<string, any[]>();
      for (const item of itemRows) {
        if (!itemsByOrderId.has(item.orderId)) itemsByOrderId.set(item.orderId, []);
        itemsByOrderId.get(item.orderId)!.push(item);
      }

      const userMap = new Map(userRows.map((u) => [u.id, u]));

      const ordersWithItems = list.map((o) => ({
        ...o,
        items: itemsByOrderId.get(o.id) || [],
        cashierName: userMap.get(o.cashierId)?.name ?? 'Cashier',
      }));

      const totalPages = Math.ceil(totalCount / limitNum) || 1;

      return {
        orders: ordersWithItems,
        totalCount,
        page: pageNum,
        totalPages,
        hasMore: pageNum < totalPages,
      };
    },

    order: async (_: unknown, { id }: { id: string }) => {
      const [oRows] = await db.select().from(orders).where(eq(orders.id, id));
      if (!oRows) return null;

      const [itemRows, userRows] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, id)),
        oRows.cashierId ? db.select().from(users).where(eq(users.id, oRows.cashierId)) : [],
      ]);

      return {
        ...oRows,
        items: itemRows,
        cashierName: userRows[0]?.name ?? 'Cashier',
      };
    },

    preOrders: async () => {
      const list = await db
        .select()
        .from(preOrders)
        .where(eq(preOrders.status, 'pending'))
        .orderBy(desc(preOrders.createdAt));
      return list.map((po) => ({
        ...po,
        items: typeof po.items === 'string' ? po.items : JSON.stringify(po.items),
      }));
    },

    expenses: async (_: unknown, { from, to }: { from?: string; to?: string }) => {
      let query = db.select().from(shopExpenses).$dynamic();
      if (from) query = query.where(gte(shopExpenses.expenseDate, from));
      if (to) query = query.where(lte(shopExpenses.expenseDate, to));
      return await query.orderBy(shopExpenses.expenseDate);
    },

    analyticsSummary: async (_: unknown, { from, to }: { from?: string; to?: string }) => {
      const expFilter = expenseDateFilters(from, to);

      const [salesRows, topItemRows, allItemRows, revenueRows, cogsRows, expenseRows, unpaidRows] =
        await Promise.all([
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
              orderCount: sql<number>`COUNT(*)`,
            })
            .from(orders)
            .where(orderDateFilters(from, to)),

          db
            .select({
              totalCOGS: sql<string>`COALESCE(SUM(${orderItems.itemCost} * ${orderItems.quantity}), 0)`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(orderDateFilters(from, to)),

          db
            .select({ total: sql<string>`COALESCE(SUM(${shopExpenses.amount}), 0)` })
            .from(shopExpenses)
            .where(expFilter),

          db
            .select({
              unpaidAmount: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
            })
            .from(orders)
            .where(unpaidOrderDateFilters(from, to)),
        ]);

      const totalRevenue = parseFloat(revenueRows[0]?.totalRevenue ?? '0');
      const totalCOGS = parseFloat(cogsRows[0]?.totalCOGS ?? '0');
      const orderCount = Number(revenueRows[0]?.orderCount ?? 0);
      const shopExpTotal = parseFloat(expenseRows[0]?.total ?? '0');
      const unpaidTotal = parseFloat(unpaidRows[0]?.unpaidAmount ?? '0');

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

      return {
        sales: salesRows.map((r) => ({
          date: String(r.date),
          revenue: String(r.revenue || '0'),
          orderCount: Number(r.orderCount || 0),
        })),
        topItems: topItemRows.map((r) => ({
          menuItemId: r.menuItemId,
          name: r.name,
          quantitySold: Number(r.quantitySold || 0),
          revenue: String(r.revenue || '0'),
        })),
        allItems: formattedAllItems,
        orderCount: orderCount,
        totalRevenue: totalRevenue.toFixed(2),
        totalCOGS: totalCOGS.toFixed(2),
        grossProfit: (totalRevenue - totalCOGS).toFixed(2),
        shopExpenses: shopExpTotal.toFixed(2),
        netProfit: (totalRevenue - totalCOGS - shopExpTotal).toFixed(2),
        unpaidAmount: unpaidTotal.toFixed(2),
      };
    },

    analyticsSales: async (_: unknown, { from, to }: { from?: string; to?: string }) => {
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
      return rows.map((r) => ({
        date: String(r.date),
        revenue: String(r.revenue || '0'),
        orderCount: Number(r.orderCount || 0),
      }));
    },

    analyticsTopItems: async (_: unknown, { from, to }: { from?: string; to?: string }) => {
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
      return rows.map((r) => ({
        menuItemId: r.menuItemId,
        name: r.name,
        quantitySold: Number(r.quantitySold || 0),
        revenue: String(r.revenue || '0'),
      }));
    },

    analyticsProfit: async (_: unknown, { from, to }: { from?: string; to?: string }) => {
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

      return {
        totalRevenue: totalRevenue.toFixed(2),
        totalCOGS: totalCOGS.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        shopExpenses: shopExpTotal.toFixed(2),
        netProfit: netProfit.toFixed(2),
      };
    },

    analyticsExpensesBreakdown: async (
      _: unknown,
      { from, to }: { from?: string; to?: string },
    ) => {
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
      return rows.map((r) => ({
        category: r.category,
        total: String(r.total || '0'),
        count: Number(r.count || 0),
      }));
    },

    analyticsSecurityPassword: async () => {
      await ensureAnalyticsSecurityTable();
      const rows = await db.select().from(analyticsSecurity);
      if (rows.length > 0) return rows[0].password;
      await db.insert(analyticsSecurity).values({
        key: 'analytics_password',
        password: 'Frozed2026',
      });
      return 'Frozed2026';
    },

    databaseStats: async () => {
      const [
        [ordersRes],
        [orderItemsRes],
        [billsRes],
        [expensesRes],
        [preOrdersRes],
        [adjustmentsRes],
        [inventoryRes],
        [menuItemsRes],
        [categoriesRes],
        [recipesRes],
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(orders),
        db.select({ count: sql<number>`count(*)::int` }).from(orderItems),
        db.select({ count: sql<number>`count(*)::int` }).from(bills),
        db.select({ count: sql<number>`count(*)::int` }).from(shopExpenses),
        db.select({ count: sql<number>`count(*)::int` }).from(preOrders),
        db.select({ count: sql<number>`count(*)::int` }).from(inventoryAdjustments),
        db.select({ count: sql<number>`count(*)::int` }).from(inventoryItems),
        db.select({ count: sql<number>`count(*)::int` }).from(menuItems),
        db.select({ count: sql<number>`count(*)::int` }).from(categories),
        db.select({ count: sql<number>`count(*)::int` }).from(recipes),
      ]);

      return {
        ordersCount: ordersRes?.count ?? 0,
        orderItemsCount: orderItemsRes?.count ?? 0,
        billsCount: billsRes?.count ?? 0,
        expensesCount: expensesRes?.count ?? 0,
        preOrdersCount: preOrdersRes?.count ?? 0,
        inventoryAdjustmentsCount: adjustmentsRes?.count ?? 0,
        inventoryItemsCount: inventoryRes?.count ?? 0,
        menuItemsCount: menuItemsRes?.count ?? 0,
        categoriesCount: categoriesRes?.count ?? 0,
        recipesCount: recipesRes?.count ?? 0,
      };
    },
  },

  Mutation: {
    createCategory: async (
      _: unknown,
      { name, icon = '🧃', sortOrder = 0 }: { name: string; icon?: string; sortOrder?: number },
    ) => {
      const [cat] = await db.insert(categories).values({ name, icon, sortOrder }).returning();
      return cat;
    },

    createMenuItem: async (_: unknown, { input }: { input: any }) => {
      const { categoryId, name, description, imageUrl, sellingPrice, isAvailable, ingredients } =
        input;
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
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
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

      return {
        ...item,
        flavours: [],
        recipes: [],
      };
    },

    updateMenuItem: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const { isDeleted: _d, ingredients, ...safe } = input;

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

        return {
          ...item,
          flavours: [],
          recipes: [],
        };
      }

      const [item] = await db.update(menuItems).set(safe).where(eq(menuItems.id, id)).returning();
      return {
        ...item,
        flavours: [],
        recipes: [],
      };
    },

    toggleMenuItemAvailability: async (_: unknown, { id }: { id: string }) => {
      if (!IS_UUID.test(id)) {
        return { id, isAvailable: true, flavours: [], recipes: [] };
      }
      const [current] = await db.select().from(menuItems).where(eq(menuItems.id, id));
      if (!current) throw new Error('MenuItem not found');

      const [updated] = await db
        .update(menuItems)
        .set({ isAvailable: !current.isAvailable })
        .where(eq(menuItems.id, id))
        .returning();

      return {
        ...updated,
        flavours: [],
        recipes: [],
      };
    },

    deleteMenuItem: async (_: unknown, { id }: { id: string }) => {
      if (!IS_UUID.test(id)) return true;
      try {
        await db.update(menuItems).set({ isDeleted: true }).where(eq(menuItems.id, id));
        return true;
      } catch (err: any) {
        throw new Error(
          'This menu item cannot be deleted because it is referenced in sales history.',
        );
      }
    },

    createOrder: async (_: unknown, { input }: { input: any }) => {
      try {
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
        } = input;

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
          throw new Error('Cart items are required');
        }

        const validCartItems = cartItems.filter((ci: any) => isValidUuid(ci?.menuItemId));
        if (validCartItems.length === 0) {
          throw new Error('Valid menu item IDs are required for all cart items');
        }

        const menuItemIds = [...new Set(validCartItems.map((ci: any) => ci.menuItemId))];

        const cashierId = await getOrCreateDefaultUser(reqCashierId);
        const fetchedMenuItems =
          menuItemIds.length > 0
            ? await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds))
            : [];

        const menuItemMap = new Map(fetchedMenuItems.map((m) => [m.id, m]));

        let subtotal = 0;
        const processedItems: (typeof orderItems.$inferInsert)[] = [];

        for (const ci of validCartItems) {
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
            flavourId: isValidUuid(ci.flavourId) ? ci.flavourId : null,
            flavourName: ci.flavourName ?? null,
            quantity: ci.quantity,
            unitPrice: unitPrice.toFixed(2),
            itemCost: '0.00',
            lineTotal: lineTotal.toFixed(2),
            notes: ci.notes ?? null,
            orderId: '',
          });
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
            paymentMethod: (paymentMethod as any) ?? 'cash',
            subtotal: subtotal.toFixed(2),
            discountAmount: discountVal.toFixed(2),
            totalAmount: totalVal.toFixed(2),
            notes: notes ?? null,
            paidAt: paymentMethod && paymentMethod !== 'credit' ? new Date() : null,
          })
          .returning();

        const itemsWithOrderId = processedItems.map((i) => ({ ...i, orderId: order.id }));
        let insertedItems: any[] = [];
        if (itemsWithOrderId.length > 0) {
          insertedItems = await db.insert(orderItems).values(itemsWithOrderId).returning();
        }

        if (menuItemIds.length > 0) {
          const [allRecipes, allMakingCosts] = await Promise.all([
            db.select().from(recipes).where(inArray(recipes.menuItemId, menuItemIds)),
            db.select().from(makingCosts).where(inArray(makingCosts.menuItemId, menuItemIds)),
          ]);
          await deductInventoryAsync(validCartItems, allRecipes);
          patchItemCostsAsync(order.id, validCartItems, allRecipes, allMakingCosts);
        }

        return {
          ...order,
          items: insertedItems,
          cashierName: 'Cashier',
        };
      } catch (err: any) {
        console.error('[GraphQL Resolver] createOrder failed:', err);
        throw new Error(err?.message || 'Failed to create order');
      }
    },

    payOrder: async (_: unknown, { id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const [updated] = await db
        .update(orders)
        .set({ status: 'paid', paymentMethod: paymentMethod as any, paidAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

      return {
        ...updated,
        items: itemRows,
        cashierName: 'Cashier',
      };
    },

    updateOrderStatus: async (
      _: unknown,
      { id, status, paidAt }: { id: string; status: string; paidAt?: string },
    ) => {
      const updateData: Record<string, any> = { status };
      if (paidAt) {
        updateData.paidAt = new Date(paidAt);
      } else if (status === 'paid') {
        updateData.paidAt = new Date();
      } else if (status === 'billed' || status === 'open') {
        updateData.paidAt = null;
      }

      const [updated] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();
      const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

      return {
        ...updated,
        items: itemRows,
        cashierName: 'Cashier',
      };
    },

    createInventoryItem: async (_: unknown, { input }: { input: any }) => {
      const { name, unit, currentStock, reorderLevel, costPerUnit } = input;
      const [newItem] = await db
        .insert(inventoryItems)
        .values({
          name: String(name).trim(),
          unit: String(unit).trim(),
          currentStock: String(currentStock),
          reorderLevel: String(reorderLevel ?? '0'),
          costPerUnit: String(costPerUnit ?? '0'),
          updatedAt: new Date(),
        })
        .returning();
      return {
        ...newItem,
        needsRestock: parseFloat(newItem.currentStock) <= parseFloat(newItem.reorderLevel),
      };
    },

    updateInventoryItem: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const [updated] = await db
        .update(inventoryItems)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(inventoryItems.id, id))
        .returning();
      return {
        ...updated,
        needsRestock: parseFloat(updated.currentStock) <= parseFloat(updated.reorderLevel),
      };
    },

    deleteInventoryItem: async (_: unknown, { id }: { id: string }) => {
      try {
        await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
        return true;
      } catch (err: any) {
        throw new Error(
          'This inventory item cannot be deleted because it is referenced in menu item recipes or transaction history.',
        );
      }
    },

    adjustInventoryStock: async (_: unknown, { input }: { input: any }) => {
      const { inventoryItemId, userId: reqUserId, type, quantityDelta, note } = input;
      const userId = await getOrCreateDefaultUser(reqUserId);

      const [, [adjustment]] = await Promise.all([
        db
          .update(inventoryItems)
          .set({
            currentStock: sql`${inventoryItems.currentStock} + ${quantityDelta}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, inventoryItemId)),
        db
          .insert(inventoryAdjustments)
          .values({ inventoryItemId, userId, type, quantityDelta, note })
          .returning(),
      ]);

      return adjustment;
    },

    createExpense: async (_: unknown, { input }: { input: any }) => {
      const { recordedBy: reqRecordedBy, category, amount, note, expenseDate } = input;
      const recordedBy = await getOrCreateDefaultUser(reqRecordedBy);

      const [expense] = await db
        .insert(shopExpenses)
        .values({ recordedBy, category, amount, note, expenseDate })
        .returning();

      return expense;
    },

    updateExpense: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const [updated] = await db
        .update(shopExpenses)
        .set(input)
        .where(eq(shopExpenses.id, id))
        .returning();
      return updated;
    },

    deleteExpense: async (_: unknown, { id }: { id: string }) => {
      await db.delete(shopExpenses).where(eq(shopExpenses.id, id));
      return true;
    },

    createPreOrder: async (_: unknown, { input }: { input: any }) => {
      const { customerName, customerPhone, paymentMethod, items, subtotal, totalAmount } = input;

      const subtotalVal = parseFloat(String(subtotal || 0));
      const totalVal = parseFloat(String(totalAmount || subtotalVal));

      const [newPreOrder] = await db
        .insert(preOrders)
        .values({
          customerName: customerName ? String(customerName).trim() : null,
          customerPhone: customerPhone ? String(customerPhone).trim() : null,
          paymentMethod: paymentMethod || 'cash',
          items: typeof items === 'string' ? items : JSON.stringify(items),
          subtotal: subtotalVal.toFixed(2),
          totalAmount: totalVal.toFixed(2),
          status: 'pending',
        })
        .returning();

      return {
        ...newPreOrder,
        items:
          typeof newPreOrder.items === 'string'
            ? newPreOrder.items
            : JSON.stringify(newPreOrder.items),
      };
    },

    deletePreOrder: async (_: unknown, { id }: { id: string }) => {
      if (!id || id.startsWith('temp-')) return true;
      await db.delete(preOrders).where(eq(preOrders.id, id));
      return true;
    },

    updateAnalyticsPassword: async (_: unknown, { password }: { password: string }) => {
      await ensureAnalyticsSecurityTable();
      await db
        .insert(analyticsSecurity)
        .values({ key: 'analytics_password', password, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: analyticsSecurity.key,
          set: { password, updatedAt: new Date() },
        });

      return password;
    },

    // ─── Database Reset Operations ──────────────────────────────────────────────
    resetOrders: async () => {
      const [countRes] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
      await db.execute(sql`
        TRUNCATE TABLE "order_items", "bills", "orders" RESTART IDENTITY CASCADE;
      `);
      return {
        success: true,
        entity: 'Orders & Bills',
        message:
          'All customer orders, order items, and printed bills have been reset. Order numbering reset to #1.',
        deletedCount: countRes?.count ?? 0,
      };
    },

    resetExpenses: async () => {
      const [countRes] = await db.select({ count: sql<number>`count(*)::int` }).from(shopExpenses);
      await db.execute(sql`
        TRUNCATE TABLE "shop_expenses" RESTART IDENTITY CASCADE;
      `);
      return {
        success: true,
        entity: 'Shop Expenses',
        message: 'All recorded shop expenses have been cleared.',
        deletedCount: countRes?.count ?? 0,
      };
    },

    resetPreOrders: async () => {
      const [countRes] = await db.select({ count: sql<number>`count(*)::int` }).from(preOrders);
      await db.execute(sql`
        TRUNCATE TABLE "pre_orders" RESTART IDENTITY CASCADE;
      `);
      return {
        success: true,
        entity: 'Pre-Orders',
        message: 'All customer pre-orders and online cart drafts have been cleared.',
        deletedCount: countRes?.count ?? 0,
      };
    },

    resetInventoryAdjustments: async () => {
      const [countRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryAdjustments);
      await db.execute(sql`
        TRUNCATE TABLE "inventory_adjustments" RESTART IDENTITY CASCADE;
      `);
      return {
        success: true,
        entity: 'Inventory Adjustments',
        message: 'All inventory adjustment audit history logs have been cleared.',
        deletedCount: countRes?.count ?? 0,
      };
    },

    resetInventoryStockToDefault: async () => {
      const remoteUrl = process.env.REMOTE_DATABASE_URL || '';
      const remotePool = new Pool({
        connectionString: remoteUrl,
        ssl: { rejectUnauthorized: false },
      });

      try {
        const res = await remotePool.query('SELECT name, current_stock FROM inventory_items');
        for (const row of res.rows) {
          await db
            .update(inventoryItems)
            .set({ currentStock: row.current_stock, updatedAt: new Date() })
            .where(eq(inventoryItems.name, row.name));
        }
        return {
          success: true,
          entity: 'Inventory Stock Levels',
          message: 'All 24 ingredient stock quantities have been reset to baseline defaults.',
        };
      } catch (err: any) {
        throw new Error(`Inventory stock reset failed: ${err.message}`);
      } finally {
        await remotePool.end();
      }
    },

    resyncDatabaseFromRemote: async () => {
      const remoteUrl = process.env.REMOTE_DATABASE_URL || '';
      const localUrl =
        process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/frozed_local';

      const isRemoteLocal = remoteUrl.includes('localhost') || remoteUrl.includes('127.0.0.1');
      const isTargetLocal = localUrl.includes('localhost') || localUrl.includes('127.0.0.1');

      const remotePool = new Pool({
        connectionString: remoteUrl,
        ssl: isRemoteLocal ? false : { rejectUnauthorized: false },
      });
      const localPool = new Pool({
        connectionString: localUrl,
        ssl: isTargetLocal ? false : { rejectUnauthorized: false },
      });

      try {
        await localPool.query(`
          TRUNCATE TABLE 
            order_items, orders, bills, shop_expenses, 
            inventory_adjustments, pre_orders, recipes, 
            making_costs, menu_item_flavours, menu_items, 
            flavours, categories, inventory_items, users, analytics_security
          RESTART IDENTITY CASCADE;
        `);

        const copyTable = async (tableName: string, conflictConstraint?: string) => {
          const res = await remotePool.query(`SELECT * FROM ${tableName}`);
          const rows = res.rows;
          if (rows.length === 0) return 0;
          const columns = Object.keys(rows[0]);
          const colNames = columns.map((c) => `"${c}"`).join(', ');

          for (const row of rows) {
            const values = columns.map((c) => row[c]);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const query = `
              INSERT INTO "${tableName}" (${colNames}) 
              VALUES (${placeholders})
              ${conflictConstraint ? `ON CONFLICT ${conflictConstraint} DO NOTHING` : ''}
            `;
            await localPool.query(query, values);
          }
          return rows.length;
        };

        await copyTable('users', '("email")');
        await copyTable('categories', '("id")');
        await copyTable('flavours', '("id")');
        await copyTable('inventory_items', '("name")');
        await copyTable('menu_items', '("id")');
        await copyTable('menu_item_flavours');
        await copyTable('recipes', '("id")');
        await copyTable('making_costs', '("id")');
        await copyTable('analytics_security', '("key")');
        await copyTable('inventory_adjustments', '("id")');

        return {
          success: true,
          entity: 'Full Database Catalog & Inventory',
          message:
            'Successfully re-synced all categories, menu items, recipes, inventory items, and settings from remote. Test orders wiped.',
        };
      } catch (err: any) {
        throw new Error(`Re-sync failed: ${err.message}`);
      } finally {
        await remotePool.end();
        await localPool.end();
      }
    },

    wipeAllTransactionalData: async () => {
      const [ordersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
      const [expensesCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shopExpenses);
      const [preOrdersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(preOrders);

      await db.execute(sql`
        TRUNCATE TABLE 
          "order_items", "bills", "orders", 
          "shop_expenses", "pre_orders", "inventory_adjustments" 
        RESTART IDENTITY CASCADE;
      `);

      return {
        success: true,
        entity: 'All Transactional Data',
        message:
          'All orders, bills, customer pre-orders, shop expenses, and inventory adjustment history have been wiped clean. Order numbers reset to #1.',
        deletedCount:
          (ordersCount?.count ?? 0) + (expensesCount?.count ?? 0) + (preOrdersCount?.count ?? 0),
      };
    },
  },
};
