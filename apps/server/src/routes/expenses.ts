import { Hono } from 'hono';
import { db } from '../db/index.js';
import { shopExpenses } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

export const expensesRouter = new Hono();

// GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
expensesRouter.get('/', async (c) => {
  const { from, to } = c.req.query();

  let query = db.select().from(shopExpenses).$dynamic();
  if (from) query = query.where(gte(shopExpenses.expenseDate, from));
  if (to) query = query.where(lte(shopExpenses.expenseDate, to));

  const expenses = await query.orderBy(shopExpenses.expenseDate);
  return c.json({ success: true, data: expenses });
});

// POST /expenses — log a new expense
expensesRouter.post('/', async (c) => {
  const { recordedBy, category, amount, note, expenseDate } =
    await c.req.json();
  const [expense] = await db
    .insert(shopExpenses)
    .values({ recordedBy, category, amount, note, expenseDate })
    .returning();
  return c.json({ success: true, data: expense }, 201);
});

// PATCH /expenses/:id — edit an expense
expensesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db
    .update(shopExpenses)
    .set(body)
    .where(eq(shopExpenses.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});

// DELETE /expenses/:id
expensesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(shopExpenses).where(eq(shopExpenses.id, id));
  return c.json({ success: true, data: { deleted: id } });
});
