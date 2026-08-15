import { create } from 'zustand';
import type { CartItem, OrderType, PaymentMethod } from '@frozen-shake/shared';
import { useToastStore } from './toast';

interface CartState {
  // Cart items
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  tableRef: string;
  discountAmount: number;

  // Actions
  addItem: (item: CartItem, maxAvailable?: number) => void;
  removeItem: (menuItemId: string, flavourId: string | null) => void;
  updateQuantity: (
    menuItemId: string,
    flavourId: string | null,
    qty: number,
    maxAvailable?: number,
  ) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
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
  paymentMethod: 'cash',
  customerName: '',
  customerPhone: '',
  tableRef: '',
  discountAmount: 0,

  addItem: (newItem, maxAvailable) => {
    const existing = get().items.find(
      (i) => i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId,
    );
    const currentQty = existing ? existing.quantity : 0;
    const targetQty = currentQty + newItem.quantity;

    if (maxAvailable !== undefined && maxAvailable !== null) {
      if (currentQty >= maxAvailable) {
        useToastStore
          .getState()
          .showToast(`Stock limit reached! Max available: ${maxAvailable}`, 'warning');
        return;
      }
      if (targetQty > maxAvailable) {
        useToastStore
          .getState()
          .showToast(
            `Stock limit reached! Only ${maxAvailable} available in inventory.`,
            'warning',
          );
        const allowed = maxAvailable - currentQty;
        if (allowed <= 0) return;
        newItem = { ...newItem, quantity: allowed };
      }
    }

    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        ),
      }));
    } else {
      set((s) => ({ items: [...s.items, newItem] }));
    }
  },

  removeItem: (menuItemId, flavourId) => {
    set((s) => ({
      items: s.items.filter((i) => !(i.menuItemId === menuItemId && i.flavourId === flavourId)),
    }));
  },

  updateQuantity: (menuItemId, flavourId, qty, maxAvailable) => {
    if (qty <= 0) {
      get().removeItem(menuItemId, flavourId);
      return;
    }
    if (maxAvailable !== undefined && maxAvailable !== null && qty > maxAvailable) {
      useToastStore
        .getState()
        .showToast(`Stock limit reached! Only ${maxAvailable} available in inventory.`, 'warning');
      qty = maxAvailable;
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.menuItemId === menuItemId && i.flavourId === flavourId ? { ...i, quantity: qty } : i,
      ),
    }));
  },

  setOrderType: (type) => set({ orderType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setCustomerName: (name) => set({ customerName: name }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setTableRef: (ref) => set({ tableRef: ref }),
  setDiscount: (amount) => set({ discountAmount: amount }),

  clearCart: () =>
    set({
      items: [],
      customerName: '',
      customerPhone: '',
      tableRef: '',
      discountAmount: 0,
      orderType: 'dine_in',
      paymentMethod: 'cash',
    }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  total: () => get().subtotal() - get().discountAmount,

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
