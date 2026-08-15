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
      needsRestock
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
          id
          ingredientName
          unit
          quantity
          costPerUnit
        }
      }
    }
  }
`;

export const GET_MENU_ITEM = gql`
  query GetMenuItem($id: ID!) {
    menuItem(id: $id) {
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
        id
        ingredientName
        unit
        quantity
        costPerUnit
      }
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
      imageUrl
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
      imageUrl
      sellingPrice
      isAvailable
    }
  }
`;

export const TOGGLE_MENU_ITEM_AVAILABILITY = gql`
  mutation ToggleMenuItemAvailability($id: ID!) {
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

// ─── Analytics & Dashboard Queries ────────────────────────────────────────────

export const GET_ANALYTICS_SUMMARY = gql`
  query GetAnalyticsSummary($from: String, $to: String) {
    analyticsSummary(from: $from, to: $to) {
      orderCount
      totalRevenue
      totalCOGS
      grossProfit
      shopExpenses
      netProfit
      unpaidAmount
      topItems {
        menuItemId
        name
        quantitySold
        revenue
      }
      sales {
        date
        revenue
        orderCount
      }
    }
  }
`;

export const GET_RECENT_ORDERS = gql`
  query GetRecentOrders(
    $from: String
    $to: String
    $search: String
    $customerName: String
    $status: String
    $sortBy: String
    $page: Int
    $limit: Int
  ) {
    orders(
      from: $from
      to: $to
      search: $search
      customerName: $customerName
      status: $status
      sortBy: $sortBy
      page: $page
      limit: $limit
    ) {
      totalCount
      page
      totalPages
      hasMore
      orders {
        id
        orderNumber
        customerName
        customerPhone
        status
        paymentMethod
        subtotal
        totalAmount
        createdAt
        items {
          id
          menuItemName
          flavourName
          quantity
          unitPrice
          lineTotal
        }
      }
    }
  }
`;

export const GET_PERIOD_ORDERS = gql`
  query GetPeriodOrders($from: String, $to: String, $limit: Int) {
    orders(from: $from, to: $to, limit: $limit) {
      orders {
        id
        customerName
        items {
          menuItemName
          quantity
          unitPrice
          lineTotal
        }
      }
    }
  }
`;

// ─── Inventory Queries & Mutations ─────────────────────────────────────────────

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
      updatedAt
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
      updatedAt
      needsRestock
    }
  }
`;

export const DELETE_INVENTORY_ITEM = gql`
  mutation DeleteInventoryItem($id: ID!) {
    deleteInventoryItem(id: $id)
  }
`;

export const ADJUST_INVENTORY_STOCK = gql`
  mutation AdjustInventoryStock($input: AdjustStockInput!) {
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

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!, $paidAt: String) {
    updateOrderStatus(id: $id, status: $status, paidAt: $paidAt) {
      id
      status
      paidAt
    }
  }
`;
