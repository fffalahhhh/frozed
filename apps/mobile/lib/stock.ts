import type { MenuItem, InventoryItem, CartItem } from '@frozen-shake/shared';

export interface StockInfo {
  isAvailable: boolean;
  maxAvailable: number;
  remainingAvailable: number;
  limitingIngredient?: string;
}

/**
 * Calculates stock availability and max portion limits for a menu item
 * based on current inventory stock and existing items in the active cart.
 */
export function getItemStockInfo(
  item: MenuItem,
  allItems: MenuItem[],
  inventoryItems: InventoryItem[],
  cartItems: CartItem[],
): StockInfo {
  // If item is manually marked as unavailable
  if (!item.isAvailable) {
    return {
      isAvailable: false,
      maxAvailable: 0,
      remainingAvailable: 0,
    };
  }

  const invStockMap = new Map<string, { stock: number; unit: string }>();
  if (Array.isArray(inventoryItems)) {
    for (const inv of inventoryItems) {
      if (inv && inv.name) {
        invStockMap.set(inv.name.toLowerCase().trim(), {
          stock: parseFloat(inv.currentStock || '0'),
          unit: inv.unit || '',
        });
      }
    }
  }

  // 1. Calculate overall maxAvailable based on initial inventory stock
  let maxAvailable = item.maxAvailable !== undefined ? item.maxAvailable : 999;
  let limitingIngredient: string | undefined;

  if (item.recipes && item.recipes.length > 0) {
    let minPortions = 999999;
    for (const rec of item.recipes) {
      const key = rec.ingredientName.toLowerCase().trim();
      const invData = invStockMap.get(key);
      const stock = invData ? invData.stock : 0;
      const reqQty = parseFloat(String(rec.quantity || 0));

      if (reqQty > 0) {
        const possible = Math.floor(stock / reqQty + 1e-9);
        if (possible < minPortions) {
          minPortions = possible;
          limitingIngredient = rec.ingredientName;
        }
      }
    }
    if (minPortions !== 999999) {
      maxAvailable = Math.min(maxAvailable, Math.max(0, minPortions));
    }
  }

  if (maxAvailable <= 0) {
    return {
      isAvailable: false,
      maxAvailable: 0,
      remainingAvailable: 0,
      limitingIngredient,
    };
  }

  // 2. Subtract stock consumed by items currently in the cart
  const itemMap = new Map<string, MenuItem>();
  if (Array.isArray(allItems)) {
    for (const m of allItems) {
      itemMap.set(m.id, m);
    }
  }

  const currentInvStockMap = new Map<string, number>();
  invStockMap.forEach((val, key) => {
    currentInvStockMap.set(key, val.stock);
  });

  if (Array.isArray(cartItems)) {
    for (const cartItem of cartItems) {
      const targetMenu = itemMap.get(cartItem.menuItemId);
      if (targetMenu && targetMenu.recipes && targetMenu.recipes.length > 0) {
        for (const rec of targetMenu.recipes) {
          const key = rec.ingredientName.toLowerCase().trim();
          const reqQty = parseFloat(String(rec.quantity || 0));
          const used = reqQty * cartItem.quantity;
          const current = currentInvStockMap.get(key) ?? 0;
          currentInvStockMap.set(key, Math.max(0, current - used));
        }
      }
    }
  }

  // Calculate remaining available portions for this specific item
  let remainingAvailable = maxAvailable;

  if (item.recipes && item.recipes.length > 0) {
    let minRem = 999999;
    for (const rec of item.recipes) {
      const key = rec.ingredientName.toLowerCase().trim();
      const stockRem = currentInvStockMap.get(key) ?? 0;
      const reqQty = parseFloat(String(rec.quantity || 0));
      if (reqQty > 0) {
        const possible = Math.floor(stockRem / reqQty + 1e-9);
        if (possible < minRem) {
          minRem = possible;
        }
      }
    }
    if (minRem !== 999999) {
      remainingAvailable = Math.max(0, minRem);
    }
  } else {
    // If no recipe ingredients, deduct cart quantity of this item
    const inCartQty = Array.isArray(cartItems)
      ? cartItems.filter((ci) => ci.menuItemId === item.id).reduce((s, ci) => s + ci.quantity, 0)
      : 0;
    remainingAvailable = Math.max(0, maxAvailable - inCartQty);
  }

  return {
    isAvailable: maxAvailable > 0,
    maxAvailable,
    remainingAvailable,
    limitingIngredient,
  };
}

/**
 * Calculates unit expense cost (COGS) for a menu item based on recipe ingredient quantities and unit costs.
 */
export function calculateMenuItemCost(menuItem: any, inventoryItems?: any[]): number {
  if (!menuItem) return 0;

  let recipesArr: any[] = [];
  if (Array.isArray(menuItem.recipes)) {
    recipesArr = menuItem.recipes;
  } else if (typeof menuItem.recipes === 'string') {
    try {
      recipesArr = JSON.parse(menuItem.recipes);
    } catch {
      recipesArr = [];
    }
  }

  if (!recipesArr || recipesArr.length === 0) return 0;

  let totalCost = 0;
  for (const rec of recipesArr) {
    if (!rec) continue;
    const reqQty = parseFloat(String(rec.quantity || '0'));
    let cPerUnit = parseFloat(String(rec.costPerUnit || '0'));

    // If costPerUnit is missing on recipe, look up by ingredientName in inventory
    if (cPerUnit <= 0 && rec.ingredientName && Array.isArray(inventoryItems)) {
      const ingNameLower = String(rec.ingredientName).trim().toLowerCase();
      const matchedInv = inventoryItems.find(
        (inv) => inv && (inv.name || '').trim().toLowerCase() === ingNameLower,
      );
      if (matchedInv) {
        cPerUnit = parseFloat(String(matchedInv.costPerUnit || '0'));
      }
    }

    if (reqQty > 0 && cPerUnit > 0) {
      totalCost += reqQty * cPerUnit;
    }
  }

  return totalCost;
}
