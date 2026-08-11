import * as SQLite from 'expo-sqlite';
import type {
  Category,
  MenuItem,
  InventoryItem,
  Order,
  OrderItem,
  SyncMutation,
} from '@frozen-shake/shared';

const DB_NAME = 'frozed_local.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isDbInitialized = false;

export function getLocalDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  if (!isDbInitialized) {
    initLocalDbInternal(dbInstance);
    isDbInitialized = true;
  }
  return dbInstance;
}

export function initLocalDb(): void {
  getLocalDb();
}

function initLocalDbInternal(db: SQLite.SQLiteDatabase): void {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS local_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '🧃',
        sortOrder INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS local_menu_items (
        id TEXT PRIMARY KEY,
        categoryId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT,
        sellingPrice TEXT NOT NULL,
        isAvailable INTEGER NOT NULL DEFAULT 1,
        recipesJson TEXT,
        flavoursJson TEXT
      );

      CREATE TABLE IF NOT EXISTS local_inventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        unit TEXT NOT NULL,
        currentStock REAL NOT NULL DEFAULT 0,
        reorderLevel REAL NOT NULL DEFAULT 0,
        costPerUnit REAL NOT NULL DEFAULT 0,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT NOT NULL DEFAULT 'synced'
      );

      CREATE TABLE IF NOT EXISTS local_orders (
        id TEXT PRIMARY KEY,
        orderNumber INTEGER NOT NULL,
        cashierId TEXT,
        cashierName TEXT NOT NULL DEFAULT 'Cashier',
        tableRef TEXT,
        orderType TEXT NOT NULL DEFAULT 'dine_in',
        customerName TEXT,
        customerPhone TEXT,
        status TEXT NOT NULL DEFAULT 'billed',
        paymentMethod TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        discountAmount REAL NOT NULL DEFAULT 0,
        totalAmount REAL NOT NULL DEFAULT 0,
        notes TEXT,
        createdAt TEXT NOT NULL,
        paidAt TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'synced'
      );

      CREATE TABLE IF NOT EXISTS local_order_items (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        menuItemId TEXT NOT NULL,
        menuItemName TEXT NOT NULL,
        imageUrl TEXT,
        flavourId TEXT,
        flavourName TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unitPrice REAL NOT NULL DEFAULT 0,
        itemCost REAL NOT NULL DEFAULT 0,
        lineTotal REAL NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (orderId) REFERENCES local_orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        localId TEXT UNIQUE NOT NULL,
        operationType TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retryCount INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        lastAttemptAt TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_security (
        key TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    db.runSync(
      "INSERT OR IGNORE INTO analytics_security (key, password, updatedAt) VALUES ('analytics_password', 'Frozed2026', ?);",
      [new Date().toISOString()],
    );
  } catch (err) {
    console.error('[LOCAL DB] DDL Init Error:', err);
  }
}

// ─── Categories & Menu Queries ───────────────────────────────────────────────

export function saveMenuSnapshotToLocal(categories: Category[], items: MenuItem[]): void {
  const db = getLocalDb();

  db.withTransactionSync(() => {
    db.execSync('DELETE FROM local_categories;');
    db.execSync('DELETE FROM local_menu_items;');

    for (const cat of categories) {
      db.runSync(
        'INSERT OR REPLACE INTO local_categories (id, name, icon, sortOrder) VALUES (?, ?, ?, ?);',
        [cat.id, cat.name, cat.icon || '🧃', cat.sortOrder || 0],
      );
    }

    for (const item of items) {
      db.runSync(
        'INSERT OR REPLACE INTO local_menu_items (id, categoryId, name, description, imageUrl, sellingPrice, isAvailable, recipesJson, flavoursJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
          item.id,
          item.categoryId,
          item.name,
          item.description || null,
          item.imageUrl || null,
          String(item.sellingPrice),
          item.isAvailable ? 1 : 0,
          JSON.stringify((item as any).recipes || []),
          JSON.stringify((item as any).flavours || []),
        ],
      );
    }
  });
}

export function getLocalCategories(): Category[] {
  try {
    const db = getLocalDb();
    const rows = db.getAllSync<any>('SELECT * FROM local_categories ORDER BY sortOrder ASC;');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      sortOrder: r.sortOrder,
    }));
  } catch (err) {
    return [];
  }
}

export function getLocalMenuItems(): MenuItem[] {
  try {
    const db = getLocalDb();
    const rows = db.getAllSync<any>('SELECT * FROM local_menu_items;');
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      sellingPrice: r.sellingPrice,
      isAvailable: Boolean(r.isAvailable),
      recipes: r.recipesJson ? JSON.parse(r.recipesJson) : [],
      flavours: r.flavoursJson ? JSON.parse(r.flavoursJson) : [],
    }));
  } catch (err) {
    return [];
  }
}

// ─── Inventory Queries ───────────────────────────────────────────────────────

export function saveInventorySnapshotToLocal(items: InventoryItem[]): void {
  const db = getLocalDb();
  db.withTransactionSync(() => {
    if (!items || items.length === 0) {
      db.execSync('DELETE FROM local_inventory;');
      return;
    }
    db.execSync("DELETE FROM local_inventory WHERE syncStatus = 'synced';");
    for (const i of items) {
      const pendingRow = db.getFirstSync<{ id: string }>(
        "SELECT id FROM local_inventory WHERE id = ? AND syncStatus = 'pending';",
        [i.id],
      );
      if (pendingRow) {
        continue;
      }
      db.runSync(
        "INSERT OR REPLACE INTO local_inventory (id, name, unit, currentStock, reorderLevel, costPerUnit, updatedAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced');",
        [
          i.id,
          i.name,
          i.unit,
          parseFloat(i.currentStock || '0'),
          parseFloat(i.reorderLevel || '0'),
          parseFloat(i.costPerUnit || '0'),
          i.updatedAt || new Date().toISOString(),
        ],
      );
    }
  });
}

export function getLocalInventory(): (InventoryItem & { needsRestock?: boolean })[] {
  try {
    const db = getLocalDb();
    const rows = db.getAllSync<any>('SELECT * FROM local_inventory ORDER BY name ASC;');
    return rows.map((r) => {
      const stock = parseFloat(r.currentStock || 0);
      const reorder = parseFloat(r.reorderLevel || 0);
      return {
        id: r.id,
        name: r.name,
        unit: r.unit,
        currentStock: String(stock),
        reorderLevel: String(reorder),
        costPerUnit: String(r.costPerUnit),
        updatedAt: r.updatedAt,
        needsRestock: stock <= reorder,
      };
    });
  } catch (err) {
    return [];
  }
}

export function updateLocalInventoryStock(inventoryItemId: string, deltaQty: number): void {
  const db = getLocalDb();
  db.runSync(
    "UPDATE local_inventory SET currentStock = currentStock + ?, syncStatus = 'pending', updatedAt = ? WHERE id = ?;",
    [deltaQty, new Date().toISOString(), inventoryItemId],
  );
}

// ─── Orders Queries ──────────────────────────────────────────────────────────

export function getLocalNextOrderNumber(): number {
  try {
    const db = getLocalDb();
    const row = db.getFirstSync<{ maxNum: number | null }>(
      'SELECT MAX(orderNumber) as maxNum FROM local_orders;',
    );
    return (row?.maxNum || 0) + 1;
  } catch (err) {
    return 1;
  }
}

export function saveOrdersSnapshotToLocal(orders: Order[]): void {
  const db = getLocalDb();
  db.withTransactionSync(() => {
    if (!orders || orders.length === 0) {
      db.execSync('DELETE FROM local_order_items;');
      db.execSync('DELETE FROM local_orders;');
      return;
    }
    db.execSync(
      "DELETE FROM local_order_items WHERE orderId IN (SELECT id FROM local_orders WHERE syncStatus = 'synced');",
    );
    db.execSync("DELETE FROM local_orders WHERE syncStatus = 'synced';");

    for (const o of orders) {
      const pendingRow = db.getFirstSync<{ id: string }>(
        "SELECT id FROM local_orders WHERE id = ? AND syncStatus = 'pending';",
        [o.id],
      );

      if (pendingRow) {
        continue;
      }

      db.runSync(
        "INSERT OR REPLACE INTO local_orders (id, orderNumber, cashierId, cashierName, tableRef, orderType, customerName, customerPhone, status, paymentMethod, subtotal, discountAmount, totalAmount, notes, createdAt, paidAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced');",
        [
          o.id,
          Number(o.orderNumber) || 1,
          o.cashierId || null,
          o.cashierName || 'Cashier',
          o.tableRef || null,
          o.orderType || 'dine_in',
          o.customerName || null,
          o.customerPhone || null,
          o.status || 'billed',
          o.paymentMethod || 'cash',
          parseFloat(o.subtotal || '0'),
          parseFloat(o.discountAmount || '0'),
          parseFloat(o.totalAmount || '0'),
          o.notes || null,
          o.createdAt || new Date().toISOString(),
          o.paidAt || null,
        ],
      );

      if (Array.isArray(o.items)) {
        for (const item of o.items) {
          db.runSync(
            'INSERT OR REPLACE INTO local_order_items (id, orderId, menuItemId, menuItemName, imageUrl, flavourId, flavourName, quantity, unitPrice, itemCost, lineTotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [
              item.id || `item_${Math.random()}`,
              o.id,
              item.menuItemId,
              item.menuItemName,
              item.imageUrl || null,
              item.flavourId || null,
              item.flavourName || null,
              item.quantity || 1,
              parseFloat(item.unitPrice || '0'),
              parseFloat(item.itemCost || '0'),
              parseFloat(item.lineTotal || '0'),
              item.notes || null,
            ],
          );
        }
      }
    }
  });
}

export function saveLocalOrder(order: Order, syncStatus: 'pending' | 'synced' = 'pending'): void {
  const db = getLocalDb();

  db.withTransactionSync(() => {
    db.runSync(
      'INSERT OR REPLACE INTO local_orders (id, orderNumber, cashierId, cashierName, tableRef, orderType, customerName, customerPhone, status, paymentMethod, subtotal, discountAmount, totalAmount, notes, createdAt, paidAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        order.id,
        Number(order.orderNumber),
        order.cashierId || null,
        order.cashierName || 'Cashier',
        order.tableRef || null,
        order.orderType,
        order.customerName || null,
        order.customerPhone || null,
        order.status,
        order.paymentMethod || 'cash',
        parseFloat(order.subtotal || '0'),
        parseFloat(order.discountAmount || '0'),
        parseFloat(order.totalAmount || '0'),
        order.notes || null,
        order.createdAt || new Date().toISOString(),
        order.paidAt || null,
        syncStatus,
      ],
    );

    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        db.runSync(
          'INSERT OR REPLACE INTO local_order_items (id, orderId, menuItemId, menuItemName, imageUrl, flavourId, flavourName, quantity, unitPrice, itemCost, lineTotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            item.id || `item_${Math.random()}`,
            order.id,
            item.menuItemId,
            item.menuItemName,
            item.imageUrl || null,
            item.flavourId || null,
            item.flavourName || null,
            item.quantity || 1,
            parseFloat(item.unitPrice || '0'),
            parseFloat(item.itemCost || '0'),
            parseFloat(item.lineTotal || '0'),
            item.notes || null,
          ],
        );
      }

      // Automatically deduct recipe ingredients from local_inventory
      try {
        const allMenuItems = getLocalMenuItems();
        for (const item of order.items) {
          const menuItem = allMenuItems.find((m) => m.id === item.menuItemId);
          if (menuItem && Array.isArray(menuItem.recipes)) {
            const itemQty = Number(item.quantity) || 1;
            for (const rec of menuItem.recipes) {
              const reqQty = parseFloat(String(rec.quantity || '0'));
              if (reqQty > 0 && rec.ingredientName) {
                const totalDeduction = reqQty * itemQty;
                db.runSync(
                  `UPDATE local_inventory 
                   SET currentStock = MAX(0, currentStock - ?), 
                       syncStatus = 'pending', 
                       updatedAt = ? 
                   WHERE LOWER(TRIM(name)) = LOWER(TRIM(?));`,
                  [totalDeduction, new Date().toISOString(), rec.ingredientName],
                );
              }
            }
          }
        }
      } catch (ingErr) {
        console.warn('[DB] Failed local inventory stock deduction:', ingErr);
      }
    }
  });
}

export function getLocalOrders(): Order[] {
  try {
    const db = getLocalDb();
    const orderRows = db.getAllSync<any>('SELECT * FROM local_orders ORDER BY createdAt DESC;');
    const itemRows = db.getAllSync<any>('SELECT * FROM local_order_items;');

    const itemsByOrderMap = new Map<string, OrderItem[]>();
    for (const item of itemRows) {
      const list = itemsByOrderMap.get(item.orderId) || [];
      list.push({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        imageUrl: item.imageUrl,
        flavourId: item.flavourId,
        flavourName: item.flavourName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        itemCost: String(item.itemCost),
        lineTotal: String(item.lineTotal),
        notes: item.notes,
      });
      itemsByOrderMap.set(item.orderId, list);
    }

    return orderRows.map((r) => ({
      id: r.id,
      orderNumber: String(r.orderNumber),
      cashierId: r.cashierId || '',
      cashierName: r.cashierName || 'Cashier',
      tableRef: r.tableRef,
      orderType: r.orderType,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      status: r.status,
      paymentMethod: r.paymentMethod,
      subtotal: String(r.subtotal),
      discountAmount: String(r.discountAmount),
      totalAmount: String(r.totalAmount),
      notes: r.notes,
      items: itemsByOrderMap.get(r.id) || [],
      createdAt: r.createdAt,
      paidAt: r.paidAt,
    }));
  } catch (err) {
    return [];
  }
}

export function updateLocalOrderStatus(
  orderId: string,
  status: 'paid' | 'voided' | 'billed',
  paymentMethod?: string,
): void {
  const db = getLocalDb();
  if (status === 'paid') {
    db.runSync(
      "UPDATE local_orders SET status = 'paid', syncStatus = 'pending', paymentMethod = COALESCE(?, paymentMethod), paidAt = ? WHERE id = ?;",
      [paymentMethod || null, new Date().toISOString(), orderId],
    );
  } else if (status === 'billed') {
    db.runSync(
      "UPDATE local_orders SET status = 'billed', syncStatus = 'pending', paidAt = NULL WHERE id = ?;",
      [orderId],
    );
  } else if (status === 'voided') {
    db.runSync("UPDATE local_orders SET status = 'voided', syncStatus = 'pending' WHERE id = ?;", [
      orderId,
    ]);
  }
}

// ─── Sync Outbox Queue Queries ──────────────────────────────────────────────

export function enqueueOutboxMutation(localId: string, operationType: string, payload: any): void {
  const db = getLocalDb();
  db.runSync(
    "INSERT OR REPLACE INTO sync_outbox (localId, operationType, payloadJson, status, retryCount, createdAt) VALUES (?, ?, ?, 'pending', 0, ?);",
    [localId, operationType, JSON.stringify(payload), new Date().toISOString()],
  );
}

export function getPendingOutboxMutations(): SyncMutation[] {
  try {
    const db = getLocalDb();
    const rows = db.getAllSync<any>(
      "SELECT * FROM sync_outbox WHERE status = 'pending' ORDER BY id ASC LIMIT 50;",
    );

    return rows.map((r) => ({
      id: r.id,
      localId: r.localId,
      operationType: r.operationType,
      payload: JSON.parse(r.payloadJson),
      createdAt: r.createdAt,
    }));
  } catch (err) {
    return [];
  }
}

export function markOutboxMutationsSynced(localIds: string[]): void {
  if (localIds.length === 0) return;
  const db = getLocalDb();
  db.withTransactionSync(() => {
    for (const localId of localIds) {
      db.runSync('DELETE FROM sync_outbox WHERE localId = ?;', [localId]);
      db.runSync("UPDATE local_orders SET syncStatus = 'synced' WHERE id = ?;", [localId]);
    }
  });
}

export function markOutboxMutationFailed(localId: string): void {
  const db = getLocalDb();
  db.runSync(
    "UPDATE sync_outbox SET retryCount = retryCount + 1, status = CASE WHEN retryCount >= 5 THEN 'failed' ELSE 'pending' END, lastAttemptAt = ? WHERE localId = ?;",
    [new Date().toISOString(), localId],
  );
}

export function getPendingOutboxCount(): number {
  try {
    const db = getLocalDb();
    const row = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'pending';",
    );
    return row?.count || 0;
  } catch (err) {
    return 0;
  }
}

// ─── Sync Meta Queries ───────────────────────────────────────────────────────

export function setSyncMeta(key: string, value: string): void {
  try {
    const db = getLocalDb();
    db.runSync('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?);', [key, value]);
  } catch (err) {
    console.error('[LOCAL DB] setSyncMeta error:', err);
  }
}

export function getSyncMeta(key: string): string | null {
  try {
    const db = getLocalDb();
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?;', [
      key,
    ]);
    return row?.value || null;
  } catch (err) {
    return null;
  }
}

export const DEFAULT_ANALYTICS_PASSWORD = 'Frozed2026';

export function getAnalyticsPasswordFromDb(): string {
  try {
    const db = getLocalDb();
    const row = db.getFirstSync<{ password: string }>(
      "SELECT password FROM analytics_security WHERE key = 'analytics_password';",
    );
    if (row && row.password) {
      return row.password;
    }
    db.runSync(
      "INSERT OR REPLACE INTO analytics_security (key, password, updatedAt) VALUES ('analytics_password', 'Frozed2026', ?);",
      [new Date().toISOString()],
    );
    return DEFAULT_ANALYTICS_PASSWORD;
  } catch (err) {
    return DEFAULT_ANALYTICS_PASSWORD;
  }
}

export function setAnalyticsPasswordInDb(password: string): void {
  try {
    const db = getLocalDb();
    db.runSync(
      "INSERT OR REPLACE INTO analytics_security (key, password, updatedAt) VALUES ('analytics_password', ?, ?);",
      [password, new Date().toISOString()],
    );
  } catch (err) {
    console.error('[LOCAL DB] setAnalyticsPasswordInDb error:', err);
  }
}

export function clearAllLocalData(): void {
  try {
    const db = getLocalDb();
    db.withTransactionSync(() => {
      db.execSync('DELETE FROM local_categories;');
      db.execSync('DELETE FROM local_menu_items;');
      db.execSync('DELETE FROM local_inventory;');
      db.execSync('DELETE FROM local_orders;');
      db.execSync('DELETE FROM local_order_items;');
      db.execSync('DELETE FROM sync_outbox;');
    });
  } catch (err) {
    console.error('[LOCAL DB] clearAllLocalData error:', err);
  }
}
