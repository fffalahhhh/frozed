import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  serial,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['cashier', 'manager', 'admin']);

export const orderStatusEnum = pgEnum('order_status', ['open', 'billed', 'paid', 'voided']);

export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'upi', 'card', 'credit']);

export const orderTypeEnum = pgEnum('order_type', ['dine_in', 'take_away', 'order_online']);

export const inventoryAdjustmentTypeEnum = pgEnum('inventory_adjustment_type', [
  'restock',
  'manual_correction',
  'waste',
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // password is managed by Better-Auth (in its own tables)
  role: userRoleEnum('role').notNull().default('cashier'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Categories ──────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('🧃'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ─── Flavours ────────────────────────────────────────────────────────────────

export const flavours = pgTable('flavours', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  // self-reference: NULL = this IS a base flavour
  baseFlavourId: uuid('base_flavour_id'),
});

// ─── Menu Items ───────────────────────────────────────────────────────────────

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Menu Item Flavours (junction) ────────────────────────────────────────────

export const menuItemFlavours = pgTable('menu_item_flavours', {
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  flavourId: uuid('flavour_id')
    .notNull()
    .references(() => flavours.id),
  // upcharge for exotic flavours (0 for standard)
  extraCost: numeric('extra_cost', { precision: 10, scale: 2 }).notNull().default('0'),
});

// ─── Recipes (ingredient cost per menu item / flavour) ────────────────────────

export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  // NULL = applies to all flavours (common ingredient)
  flavourId: uuid('flavour_id').references(() => flavours.id),
  ingredientName: text('ingredient_name').notNull(),
  unit: text('unit').notNull(), // ml, g, pcs
  quantity: numeric('quantity', { precision: 14, scale: 6 }).notNull(),
  costPerUnit: numeric('cost_per_unit', { precision: 14, scale: 6 }).notNull(),
});

// ─── Making Costs (labour, packaging, etc.) ───────────────────────────────────

export const makingCosts = pgTable('making_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  label: text('label').notNull(), // "Labour", "Packaging", "Electricity"
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
});

// ─── Inventory Items ──────────────────────────────────────────────────────────

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  unit: text('unit').notNull(),
  currentStock: numeric('current_stock', { precision: 14, scale: 6 }).notNull().default('0'),
  reorderLevel: numeric('reorder_level', { precision: 14, scale: 6 }).notNull().default('0'),
  costPerUnit: numeric('cost_per_unit', { precision: 14, scale: 6 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Inventory Adjustments ────────────────────────────────────────────────────

export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryItemId: uuid('inventory_item_id')
    .notNull()
    .references(() => inventoryItems.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: inventoryAdjustmentTypeEnum('type').notNull(),
  quantityDelta: numeric('quantity_delta', { precision: 14, scale: 6 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: serial('order_number'), // auto-increments: 1, 2, 3...
  cashierId: uuid('cashier_id')
    .notNull()
    .references(() => users.id),
  tableRef: text('table_ref'), // "Table 3", "Takeaway", null
  orderType: orderTypeEnum('order_type').notNull().default('dine_in'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  status: orderStatusEnum('status').notNull().default('open'),
  paymentMethod: paymentMethodEnum('payment_method'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  paidAt: timestamp('paid_at'),
});

// ─── Order Items ──────────────────────────────────────────────────────────────

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  // Snapshots at time of order (so price/cost changes don't affect history)
  menuItemName: text('menu_item_name').notNull(),
  flavourId: uuid('flavour_id').references(() => flavours.id),
  flavourName: text('flavour_name'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  itemCost: numeric('item_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'), // "less sweet", "extra ice"
});

// ─── Bills ────────────────────────────────────────────────────────────────────

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .unique()
    .references(() => orders.id),
  billNumber: text('bill_number').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  printedAt: timestamp('printed_at'),
});

// ─── Shop Expenses ────────────────────────────────────────────────────────────

export const shopExpenses = pgTable('shop_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordedBy: uuid('recorded_by')
    .notNull()
    .references(() => users.id),
  category: text('category').notNull(), // "Rent", "Electricity", "Staff Salary", "Supplies"
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  expenseDate: date('expense_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  flavours: many(menuItemFlavours),
  recipes: many(recipes),
  makingCosts: many(makingCosts),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [recipes.menuItemId],
    references: [menuItems.id],
  }),
}));

export const menuItemFlavoursRelations = relations(menuItemFlavours, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemFlavours.menuItemId],
    references: [menuItems.id],
  }),
  flavour: one(flavours, {
    fields: [menuItemFlavours.flavourId],
    references: [flavours.id],
  }),
}));

export const flavoursRelations = relations(flavours, ({ one, many }) => ({
  baseFlavour: one(flavours, {
    fields: [flavours.baseFlavourId],
    references: [flavours.id],
    relationName: 'flavourVariants',
  }),
  variants: many(flavours, { relationName: 'flavourVariants' }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  cashier: one(users, { fields: [orders.cashierId], references: [users.id] }),
  items: many(orderItems),
  bill: one(bills, { fields: [orders.id], references: [bills.orderId] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  flavour: one(flavours, {
    fields: [orderItems.flavourId],
    references: [flavours.id],
  }),
}));

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryAdjustments.inventoryItemId],
    references: [inventoryItems.id],
  }),
  user: one(users, {
    fields: [inventoryAdjustments.userId],
    references: [users.id],
  }),
}));

export const shopExpensesRelations = relations(shopExpenses, ({ one }) => ({
  recordedByUser: one(users, {
    fields: [shopExpenses.recordedBy],
    references: [users.id],
  }),
}));

// ─── Pre-Orders (Draft / Pending Orders) ─────────────────────────────────────

export const preOrders = pgTable('pre_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  preOrderNumber: serial('pre_order_number'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  paymentMethod: text('payment_method').notNull().default('cash'),
  items: jsonb('items').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Analytics Security ───────────────────────────────────────────────────────

export const analyticsSecurity = pgTable('analytics_security', {
  key: text('key').primaryKey().default('analytics_password'),
  password: text('password').notNull().default('Frozed2026'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
