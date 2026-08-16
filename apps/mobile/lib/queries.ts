import { gql } from '@apollo/client';

export const GET_MENU = gql`
  query GetMenu {
    menu {
      category {
        id
        name
        icon
        sortOrder
      }
      items {
        id
        categoryId
        name
        description
        imageUrl
        sellingPrice
        isAvailable
        maxAvailable
        flavours {
          flavourId
          flavourName
          extraCost
        }
        recipes {
          ingredientName
          unit
          quantity
          costPerUnit
        }
      }
      needsRestock
    }
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($name: String!, $icon: String, $sortOrder: Int) {
    createCategory(name: $name, icon: $icon, sortOrder: $sortOrder) {
      id
      name
      icon
      sortOrder
    }
  }
`;

export const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem($input: CreateMenuItemInput!) {
    createMenuItem(input: $input) {
      id
      categoryId
      name
      description
      sellingPrice
      isAvailable
    }
  }
`;

export const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem($id: ID!, $input: UpdateMenuItemInput!) {
    updateMenuItem(id: $id, input: $input) {
      id
      categoryId
      name
      description
      sellingPrice
      isAvailable
    }
  }
`;

export const TOGGLE_MENU_ITEM = gql`
  mutation ToggleMenuItem($id: ID!) {
    toggleMenuItemAvailability(id: $id) {
      id
      isAvailable
    }
  }
`;

export const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id)
  }
`;

export const GET_INVENTORY_SIMPLE = gql`
  query GetInventorySimple {
    inventory {
      id
      name
      unit
      currentStock
      costPerUnit
    }
  }
`;

export const GET_INVENTORY = gql`
  query GetInventory {
    inventory {
      id
      name
      unit
      currentStock
      reorderLevel
      costPerUnit
      updatedAt
      needsRestock
    }
    inventoryAdjustments {
      id
      inventoryItemId
      userId
      type
      quantityDelta
      note
      createdAt
      item {
        name
        unit
      }
    }
  }
`;

export const CREATE_INVENTORY_ITEM = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) {
      id
      name
      unit
      currentStock
      reorderLevel
      costPerUnit
      needsRestock
    }
  }
`;

export const UPDATE_INVENTORY_ITEM = gql`
  mutation UpdateInventoryItem($id: ID!, $input: UpdateInventoryItemInput!) {
    updateInventoryItem(id: $id, input: $input) {
      id
      name
      unit
      currentStock
      reorderLevel
      costPerUnit
      needsRestock
    }
  }
`;

export const DELETE_INVENTORY_ITEM = gql`
  mutation DeleteInventoryItem($id: ID!) {
    deleteInventoryItem(id: $id)
  }
`;

export const ADJUST_STOCK = gql`
  mutation AdjustStock($input: AdjustStockInput!) {
    adjustInventoryStock(input: $input) {
      id
      inventoryItemId
      type
      quantityDelta
      note
      createdAt
    }
  }
`;

export const GET_ORDERS = gql`
  query GetOrders($limit: Int) {
    orders(limit: $limit) {
      orders {
        id
        orderNumber
        cashierId
        cashierName
        tableRef
        orderType
        customerName
        customerPhone
        status
        paymentMethod
        subtotal
        discountAmount
        totalAmount
        notes
        createdAt
        paidAt
        items {
          id
          orderId
          menuItemId
          menuItemName
          flavourId
          flavourName
          quantity
          unitPrice
          itemCost
          lineTotal
          notes
        }
      }
      totalCount
      page
      totalPages
      hasMore
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      cashierName
      tableRef
      orderType
      customerName
      customerPhone
      status
      paymentMethod
      subtotal
      discountAmount
      totalAmount
      notes
      createdAt
      paidAt
      items {
        id
        orderId
        menuItemId
        menuItemName
        flavourId
        flavourName
        quantity
        unitPrice
        lineTotal
      }
    }
  }
`;

export const PAY_ORDER = gql`
  mutation PayOrder($id: ID!, $paymentMethod: String!) {
    payOrder(id: $id, paymentMethod: $paymentMethod) {
      id
      status
      paymentMethod
      paidAt
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!, $paidAt: String) {
    updateOrderStatus(id: $id, status: $status, paidAt: $paidAt) {
      id
      status
      paidAt
    }
  }
`;

export const GET_PRE_ORDERS = gql`
  query GetPreOrders {
    preOrders {
      id
      customerName
      customerPhone
      paymentMethod
      items
      subtotal
      totalAmount
      status
      createdAt
    }
  }
`;

export const CREATE_PRE_ORDER = gql`
  mutation CreatePreOrder($input: CreatePreOrderInput!) {
    createPreOrder(input: $input) {
      id
      customerName
      customerPhone
      paymentMethod
      items
      subtotal
      totalAmount
      status
      createdAt
    }
  }
`;

export const DELETE_PRE_ORDER = gql`
  mutation DeletePreOrder($id: ID!) {
    deletePreOrder(id: $id)
  }
`;

export const GET_ANALYTICS = gql`
  query GetAnalytics($from: String, $to: String) {
    analyticsSummary(from: $from, to: $to) {
      sales {
        date
        revenue
        orderCount
      }
      topItems {
        menuItemId
        name
        quantitySold
        revenue
      }
      allItems {
        menuItemId
        name
        quantitySold
        netSales
        expenses
        profit
        marginPercent
      }
      orderCount
      totalRevenue
      totalCOGS
      grossProfit
      shopExpenses
      netProfit
    }
    expenses(from: $from, to: $to) {
      id
      recordedBy
      category
      amount
      note
      expenseDate
      createdAt
    }
  }
`;

export const GET_ANALYTICS_SECURITY = gql`
  query GetAnalyticsSecurity {
    analyticsSecurityPassword
  }
`;

export const UPDATE_ANALYTICS_SECURITY = gql`
  mutation UpdateAnalyticsSecurity($password: String!) {
    updateAnalyticsPassword(password: $password)
  }
`;

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
      recordedBy
      category
      amount
      note
      expenseDate
      createdAt
    }
  }
`;

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: ID!, $input: UpdateExpenseInput!) {
    updateExpense(id: $id, input: $input) {
      id
      category
      amount
      note
      expenseDate
    }
  }
`;

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($id: ID!) {
    deleteExpense(id: $id)
  }
`;
