export const typeDefs = /* GraphQL */ `
  type Category {
    id: ID!
    name: String!
    icon: String!
    sortOrder: Int!
  }

  type Flavour {
    flavourId: ID!
    flavourName: String!
    extraCost: String!
  }

  type RecipeItem {
    id: ID
    ingredientName: String!
    unit: String!
    quantity: String!
    costPerUnit: String
  }

  type MenuItem {
    id: ID!
    categoryId: ID!
    name: String!
    description: String
    imageUrl: String
    sellingPrice: String!
    isAvailable: Boolean!
    maxAvailable: Int
    flavours: [Flavour!]!
    recipes: [RecipeItem!]!
    createdAt: String
  }

  type MenuCategoryGroup {
    category: Category!
    items: [MenuItem!]!
    needsRestock: Boolean!
  }

  type InventoryItem {
    id: ID!
    name: String!
    unit: String!
    currentStock: String!
    reorderLevel: String!
    costPerUnit: String!
    updatedAt: String!
    needsRestock: Boolean
  }

  type InventoryAdjustment {
    id: ID!
    inventoryItemId: ID!
    userId: ID
    type: String!
    quantityDelta: Float!
    note: String
    createdAt: String
    item: InventoryItem
  }

  type OrderItem {
    id: ID!
    orderId: ID!
    menuItemId: ID!
    menuItemName: String!
    flavourId: ID
    flavourName: String
    quantity: Int!
    unitPrice: String!
    itemCost: String!
    lineTotal: String!
    notes: String
  }

  type Order {
    id: ID!
    orderNumber: String!
    cashierId: ID
    cashierName: String
    tableRef: String
    orderType: String!
    customerName: String
    customerPhone: String
    status: String!
    paymentMethod: String
    subtotal: String!
    discountAmount: String!
    totalAmount: String!
    notes: String
    items: [OrderItem!]!
    createdAt: String!
    paidAt: String
  }

  type PreOrder {
    id: ID!
    customerName: String
    customerPhone: String
    paymentMethod: String
    items: String!
    subtotal: String!
    totalAmount: String!
    status: String!
    createdAt: String
  }

  type Expense {
    id: ID!
    recordedBy: ID!
    category: String!
    amount: String!
    note: String
    expenseDate: String!
    createdAt: String
  }

  type SalesSummaryRow {
    date: String!
    revenue: String!
    orderCount: Int!
  }

  type TopItemRow {
    menuItemId: ID!
    name: String!
    quantitySold: Int!
    revenue: String!
  }

  type AllItemPerformanceRow {
    menuItemId: ID!
    name: String!
    quantitySold: Int!
    netSales: Float!
    expenses: Float!
    profit: Float!
    marginPercent: Float!
  }

  type AnalyticsSummary {
    sales: [SalesSummaryRow!]!
    topItems: [TopItemRow!]!
    allItems: [AllItemPerformanceRow!]!
    orderCount: Int!
    totalRevenue: String!
    totalCOGS: String!
    grossProfit: String!
    shopExpenses: String!
    netProfit: String!
    unpaidAmount: String!
  }

  type ExpenseBreakdownRow {
    category: String!
    total: String!
    count: Int!
  }

  type ProfitSummary {
    totalRevenue: String!
    totalCOGS: String!
    grossProfit: String!
    shopExpenses: String!
    netProfit: String!
  }

  input CartItemInput {
    menuItemId: ID!
    menuItemName: String
    flavourId: ID
    flavourName: String
    quantity: Int!
    unitPrice: Float
    notes: String
  }

  input CreateOrderInput {
    cashierId: ID
    tableRef: String
    orderType: String
    customerName: String
    customerPhone: String
    paymentMethod: String
    discountAmount: Float
    notes: String
    items: [CartItemInput!]!
  }

  input IngredientInput {
    inventoryItemId: ID!
    quantity: String!
  }

  input CreateMenuItemInput {
    categoryId: ID!
    name: String!
    description: String
    imageUrl: String
    sellingPrice: String!
    isAvailable: Boolean
    ingredients: [IngredientInput!]
  }

  input UpdateMenuItemInput {
    name: String
    categoryId: ID
    description: String
    imageUrl: String
    sellingPrice: String
    isAvailable: Boolean
    ingredients: [IngredientInput!]
  }

  input CreateInventoryItemInput {
    name: String!
    unit: String!
    currentStock: Float!
    reorderLevel: Float
    costPerUnit: Float
  }

  input UpdateInventoryItemInput {
    name: String
    unit: String
    currentStock: Float
    reorderLevel: Float
    costPerUnit: Float
  }

  input AdjustStockInput {
    inventoryItemId: ID!
    userId: ID
    type: String!
    quantityDelta: Float!
    note: String
  }

  input CreateExpenseInput {
    recordedBy: ID
    category: String!
    amount: String!
    note: String
    expenseDate: String!
  }

  input UpdateExpenseInput {
    category: String
    amount: String
    note: String
    expenseDate: String
  }

  input CreatePreOrderInput {
    customerName: String
    customerPhone: String
    paymentMethod: String
    items: String!
    subtotal: Float
    totalAmount: Float
  }

  type Query {
    menu: [MenuCategoryGroup!]!
    menuItem(id: ID!): MenuItem
    inventory: [InventoryItem!]!
    inventoryAdjustments: [InventoryAdjustment!]!
    orders(limit: Int): [Order!]!
    order(id: ID!): Order
    preOrders: [PreOrder!]!
    expenses(from: String, to: String): [Expense!]!
    analyticsSummary(from: String, to: String): AnalyticsSummary!
    analyticsSales(from: String, to: String): [SalesSummaryRow!]!
    analyticsTopItems(from: String, to: String): [TopItemRow!]!
    analyticsProfit(from: String, to: String): ProfitSummary!
    analyticsExpensesBreakdown(from: String, to: String): [ExpenseBreakdownRow!]!
    analyticsSecurityPassword: String!
  }

  type Mutation {
    createCategory(name: String!, icon: String, sortOrder: Int): Category!
    createMenuItem(input: CreateMenuItemInput!): MenuItem!
    updateMenuItem(id: ID!, input: UpdateMenuItemInput!): MenuItem!
    toggleMenuItemAvailability(id: ID!): MenuItem!
    deleteMenuItem(id: ID!): Boolean!
    createOrder(input: CreateOrderInput!): Order!
    payOrder(id: ID!, paymentMethod: String!): Order!
    updateOrderStatus(id: ID!, status: String!, paidAt: String): Order!
    createInventoryItem(input: CreateInventoryItemInput!): InventoryItem!
    updateInventoryItem(id: ID!, input: UpdateInventoryItemInput!): InventoryItem!
    deleteInventoryItem(id: ID!): Boolean!
    adjustInventoryStock(input: AdjustStockInput!): InventoryAdjustment!
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(id: ID!, input: UpdateExpenseInput!): Expense!
    deleteExpense(id: ID!): Boolean!
    createPreOrder(input: CreatePreOrderInput!): PreOrder!
    deletePreOrder(id: ID!): Boolean!
    updateAnalyticsPassword(password: String!): String!
  }
`;
