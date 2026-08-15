import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CartItem, OrderType, PaymentMethod } from '@frozen-shake/shared';
import { triggerPOSToast } from './POSToast';

export interface POSCartContextValue {
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  tableRef: string;
  discountAmount: number;

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

  subtotal: number;
  total: number;
  itemCount: number;
}

const POSCartContext = createContext<POSCartContextValue | null>(null);

export const POSCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [tableRef, setTableRef] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const addItem = useCallback((newItem: CartItem, maxAvailable?: number) => {
    setItems((prevItems) => {
      const existing = prevItems.find(
        (i) => i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId,
      );
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + newItem.quantity;

      if (maxAvailable !== undefined && maxAvailable !== null) {
        if (currentQty >= maxAvailable) {
          triggerPOSToast(`Stock limit reached! Max available: ${maxAvailable}`, 'warning');
          return prevItems;
        }
        if (targetQty > maxAvailable) {
          triggerPOSToast(
            `Stock limit reached! Only ${maxAvailable} available in inventory.`,
            'warning',
          );
          const allowed = maxAvailable - currentQty;
          if (allowed <= 0) return prevItems;
          newItem = { ...newItem, quantity: allowed };
        }
      }

      if (existing) {
        return prevItems.map((i) =>
          i.menuItemId === newItem.menuItemId && i.flavourId === newItem.flavourId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      } else {
        return [...prevItems, newItem];
      }
    });
  }, []);

  const removeItem = useCallback((menuItemId: string, flavourId: string | null) => {
    setItems((prevItems) =>
      prevItems.filter((i) => !(i.menuItemId === menuItemId && i.flavourId === flavourId)),
    );
  }, []);

  const updateQuantity = useCallback(
    (menuItemId: string, flavourId: string | null, qty: number, maxAvailable?: number) => {
      if (qty <= 0) {
        removeItem(menuItemId, flavourId);
        return;
      }
      if (maxAvailable !== undefined && maxAvailable !== null && qty > maxAvailable) {
        triggerPOSToast(
          `Stock limit reached! Only ${maxAvailable} available in inventory.`,
          'warning',
        );
        qty = maxAvailable;
      }
      setItems((prevItems) =>
        prevItems.map((i) =>
          i.menuItemId === menuItemId && i.flavourId === flavourId ? { ...i, quantity: qty } : i,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setTableRef('');
    setDiscountAmount(0);
    setOrderType('dine_in');
    setPaymentMethod('cash');
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }, [items]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      orderType,
      paymentMethod,
      customerName,
      customerPhone,
      tableRef,
      discountAmount,
      addItem,
      removeItem,
      updateQuantity,
      setOrderType,
      setPaymentMethod,
      setCustomerName,
      setCustomerPhone,
      setTableRef,
      setDiscount: setDiscountAmount,
      clearCart,
      subtotal,
      total,
      itemCount,
    }),
    [
      items,
      orderType,
      paymentMethod,
      customerName,
      customerPhone,
      tableRef,
      discountAmount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      total,
      itemCount,
    ],
  );

  return <POSCartContext.Provider value={value}>{children}</POSCartContext.Provider>;
};

export const usePOSCart = () => {
  const ctx = useContext(POSCartContext);
  if (!ctx) {
    throw new Error('usePOSCart must be used within a POSCartProvider');
  }
  return ctx;
};
