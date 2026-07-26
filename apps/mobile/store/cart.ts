import { create } from 'zustand';
import type { CartItem, OrderType } from '@frozen-shake/shared';

interface CartState {
  // Cart items
  items: CartItem[];
  orderType: OrderType;
  customerName: string;
  tableRef: string;
  discountAmount: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string, flavourId: string | null) => void;
  updateQuantity: (menuItemId: string, flavourId: string | null, qty: number) => void;
  setOrderType: (type: OrderType) => void;
  setCustomerName: (name: string) => void;
  setTableRef: (ref: string) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;

  // Computed
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  customerName: '',
  tableRef: '',
  discountAmount: 0,

  addItem: (newItem) => {
    const existing = get().items.find(
      (i) =>
        i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId
    );
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        ),
      }));
    } else {
      set((s) => ({ items: [...s.items, newItem] }));
    }
  },

  removeItem: (menuItemId, flavourId) => {
    set((s) => ({
      items: s.items.filter(
        (i) => !(i.menuItemId === menuItemId && i.flavourId === flavourId)
      ),
    }));
  },

  updateQuantity: (menuItemId, flavourId, qty) => {
    if (qty <= 0) {
      get().removeItem(menuItemId, flavourId);
      return;
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.menuItemId === menuItemId && i.flavourId === flavourId
          ? { ...i, quantity: qty }
          : i
      ),
    }));
  },

  setOrderType: (type) => set({ orderType: type }),
  setCustomerName: (name) => set({ customerName: name }),
  setTableRef: (ref) => set({ tableRef: ref }),
  setDiscount: (amount) => set({ discountAmount: amount }),

  clearCart: () =>
    set({
      items: [],
      customerName: '',
      tableRef: '',
      discountAmount: 0,
      orderType: 'dine_in',
    }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  total: () => get().subtotal() - get().discountAmount,

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
