// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'cashier' | 'manager' | 'admin';

export type OrderStatus = 'open' | 'billed' | 'paid' | 'voided';

export type PaymentMethod = 'cash' | 'upi' | 'card';

export type OrderType = 'dine_in' | 'take_away' | 'order_online';

export type InventoryAdjustmentType = 'restock' | 'manual_correction' | 'waste';

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// ─── Menu ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface Flavour {
  id: string;
  name: string;
  baseFlavourId: string | null;
}

export interface RecipeItem {
  id?: string;
  ingredientName: string;
  unit: string;
  quantity: string | number;
  costPerUnit?: string | number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sellingPrice: string; // numeric as string for precision
  isAvailable: boolean;
  flavours?: MenuItemFlavour[];
  recipes?: RecipeItem[];
}

export interface MenuItemFlavour {
  flavourId: string;
  flavourName: string;
  extraCost: string;
}

export interface MenuWithCategories {
  category: Category;
  items: MenuItem[];
  needsRestock: boolean;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  imageUrl: string | null;
  flavourId: string | null;
  flavourName: string | null;
  quantity: number;
  unitPrice: string;
  itemCost: string;
  lineTotal: string;
  notes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  cashierId: string;
  cashierName: string;
  tableRef: string | null;
  orderType: OrderType;
  customerName: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  subtotal: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
}

// ─── Cart (local state) ───────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  imageUrl: string | null;
  flavourId: string | null;
  flavourName: string | null;
  quantity: number;
  unitPrice: number;
  notes: string | null;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  reorderLevel: string;
  costPerUnit: string;
  updatedAt: string;
}

export interface CreateInventoryItemPayload {
  name: string;
  unit: string;
  currentStock: string | number;
  reorderLevel?: string | number;
  costPerUnit?: string | number;
}

export interface MenuItemIngredientPayload {
  inventoryItemId: string;
  quantity: string | number;
}

export interface CreateMenuItemPayload {
  categoryId: string;
  name: string;
  description?: string | null;
  sellingPrice: string | number;
  ingredients?: MenuItemIngredientPayload[];
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface ShopExpense {
  id: string;
  recordedBy: string;
  category: string;
  amount: string;
  note: string | null;
  expenseDate: string;
  createdAt: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface SalesSummary {
  date: string;
  revenue: string;
  orderCount: number;
  grossProfit: string;
}

export interface TopItem {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  quantitySold: number;
  revenue: string;
}

export interface ProfitSummary {
  totalRevenue: string;
  totalCOGS: string;
  grossProfit: string;
  shopExpenses: string;
  netProfit: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  error: string;
  success: false;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface SyncOrderPayload {
  orders: Array<{
    localId: string;
    order: Omit<Order, 'id' | 'orderNumber' | 'cashierName'>;
    items: Array<Omit<OrderItem, 'id' | 'orderId'>>;
  }>;
}
