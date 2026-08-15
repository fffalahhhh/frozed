import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import type { MenuWithCategories } from '@frozen-shake/shared';
import { apolloClient } from '../../graphql/client';
import {
  CREATE_ORDER,
  CREATE_PRE_ORDER,
  GET_ORDERS,
  GET_MENU,
  GET_INVENTORY,
  GET_PRE_ORDERS,
} from '../../graphql/queries';
import { usePOSCart } from './POSCartContext';
import { fmt } from './posConstants';
import { triggerPOSToast } from './POSToast';

interface POSCartPanelProps {
  menuData: MenuWithCategories[];
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>;
  }
  const parts: { text: string; isMatch: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.trim().toLowerCase();
  let startIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery);

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push({ text: text.slice(startIndex, matchIndex), isMatch: false });
    }
    parts.push({
      text: text.slice(matchIndex, matchIndex + lowerQuery.length),
      isMatch: true,
    });
    startIndex = matchIndex + lowerQuery.length;
    matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push({ text: text.slice(startIndex), isMatch: false });
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.isMatch ? (
          <span key={i} className="pos-autocomplete-match">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export const POSCartPanel: React.FC<POSCartPanelProps> = ({ menuData }) => {
  const {
    items,
    paymentMethod,
    customerName,
    customerPhone,
    setPaymentMethod,
    setCustomerName,
    setCustomerPhone,
    updateQuantity,
    removeItem,
    clearCart,
    total,
  } = usePOSCart();

  const [isSavingPreOrder, setIsSavingPreOrder] = useState(false);
  const [isSuccessOrder, setIsSuccessOrder] = useState(false);
  const [showNamePopover, setShowNamePopover] = useState(false);
  const [showPhonePopover, setShowPhonePopover] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Query recent orders for past customer autocomplete and dynamic order number
  const { data: ordersQueryResult } = useQuery(GET_ORDERS, {
    variables: { limit: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const previousOrders = ordersQueryResult?.orders?.orders || [];

  // Calculate Next Order Number
  const trueOrderNumber = useMemo(() => {
    if (!previousOrders || !Array.isArray(previousOrders) || previousOrders.length === 0) {
      return '1';
    }
    const maxNum = Math.max(...previousOrders.map((o: any) => Number(o.orderNumber) || 0), 0);
    return String(maxNum + 1);
  }, [previousOrders]);

  // Flatten all menu items for inventory stock portions lookup
  const allMenuItems = useMemo(() => {
    return menuData ? menuData.flatMap((s) => s.items) : [];
  }, [menuData]);

  // Extract unique past customers (Name & Phone)
  const pastCustomers = useMemo(() => {
    if (!previousOrders || !Array.isArray(previousOrders)) return [];
    const map = new Map<string, { name: string; phone: string }>();
    for (const ord of previousOrders) {
      const name = (ord.customerName || '').trim();
      const phone = (ord.customerPhone || '').trim();
      if (name || phone) {
        const key = `${name.toLowerCase()}___${phone.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, { name, phone });
        }
      }
    }
    return Array.from(map.values());
  }, [previousOrders]);

  // Autocomplete Filtered Lists
  const filteredByName = useMemo(() => {
    if (!customerName.trim()) return pastCustomers.slice(0, 8);
    const q = customerName.toLowerCase();
    return pastCustomers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pastCustomers, customerName]);

  const filteredByPhone = useMemo(() => {
    if (!customerPhone.trim()) return pastCustomers.slice(0, 8);
    const q = customerPhone.toLowerCase();
    return pastCustomers
      .filter((c) => c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [pastCustomers, customerPhone]);

  // GraphQL Mutations
  const [createOrderMutation] = useMutation(CREATE_ORDER, {
    refetchQueries: [{ query: GET_ORDERS }, { query: GET_MENU }, { query: GET_INVENTORY }],
    awaitRefetchQueries: false,
  });

  const [createPreOrderMutation] = useMutation(CREATE_PRE_ORDER, {
    refetchQueries: [{ query: GET_PRE_ORDERS }],
    awaitRefetchQueries: false,
  });

  // Handle outside click for popovers
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowNamePopover(false);
      }
      if (phoneInputRef.current && !phoneInputRef.current.contains(e.target as Node)) {
        setShowPhonePopover(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleSelectCustomer = (cust: { name: string; phone: string }) => {
    if (cust.name) setCustomerName(cust.name);
    if (cust.phone) setCustomerPhone(cust.phone);
    setShowNamePopover(false);
    setShowPhonePopover(false);
  };

  // Save Pre-Order Action
  const handleSavePreOrder = async () => {
    if (items.length === 0) {
      triggerPOSToast('Cart is empty. Please add items first.', 'error');
      return;
    }

    try {
      setIsSavingPreOrder(true);
      await createPreOrderMutation({
        variables: {
          input: {
            customerName: customerName.trim() || 'Walk-in Customer',
            customerPhone: customerPhone.trim() || null,
            paymentMethod,
            subtotal: total,
            totalAmount: total,
            items: JSON.stringify(
              items.map((i) => ({
                menuItemId: i.menuItemId,
                menuItemName: i.menuItemName,
                flavourId: i.flavourId,
                flavourName: i.flavourName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                lineTotal: (i.unitPrice * i.quantity).toFixed(2),
                notes: i.notes,
              })),
            ),
          },
        },
      });

      triggerPOSToast('Saved as Pre-Order!', 'success');
      clearCart();
    } catch (err: any) {
      console.error('[POS] Save pre-order failed:', err);
      triggerPOSToast(err?.message || 'Failed to save pre-order', 'error');
    } finally {
      setIsSavingPreOrder(false);
    }
  };

  // Confirm / Place Order Action
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      triggerPOSToast('Cart is empty. Please add items to place an order.', 'error');
      return;
    }

    if (paymentMethod === 'credit') {
      if (!customerName.trim()) {
        triggerPOSToast('Customer Name is required for Credit orders.', 'error');
        return;
      }
      if (!customerPhone.trim()) {
        triggerPOSToast('Customer Phone Number is required for Credit orders.', 'error');
        return;
      }
    }

    const currentCartItems = [...items];
    const cName = customerName.trim();
    const cPhone = customerPhone.trim();
    const pMethod = paymentMethod;

    // 1. Optimistically deduct stock portions in Apollo Cache immediately
    const qtyMap = new Map<string, number>();
    for (const ci of currentCartItems) {
      qtyMap.set(ci.menuItemId, (qtyMap.get(ci.menuItemId) || 0) + ci.quantity);
    }

    try {
      const cached = apolloClient.readQuery<{ menu: MenuWithCategories[] }>({ query: GET_MENU });
      if (cached?.menu) {
        const updatedMenu = cached.menu.map((group) => ({
          ...group,
          items: group.items.map((it) => {
            const orderedQty = qtyMap.get(it.id);
            if (orderedQty !== undefined && it.maxAvailable !== undefined) {
              const newMax = Math.max(0, it.maxAvailable - orderedQty);
              return {
                ...it,
                maxAvailable: newMax,
                isAvailable: newMax > 0 && it.isAvailable,
              };
            }
            return it;
          }),
        }));
        apolloClient.writeQuery({ query: GET_MENU, data: { menu: updatedMenu } });
      }
    } catch {
      // Ignore cache read fallback
    }

    // 2. Instantly clear the cart and display success in 0ms!
    clearCart();
    setIsSuccessOrder(true);
    triggerPOSToast('Order Confirmed!', 'success');

    setTimeout(() => {
      setIsSuccessOrder(false);
    }, 1000);

    // 3. Dispatch order mutation in the background without blocking the UI
    try {
      await createOrderMutation({
        variables: {
          input: {
            customerName: cName || null,
            customerPhone: cPhone || null,
            paymentMethod: pMethod,
            orderType: 'dine_in',
            discountAmount: 0,
            notes: null,
            items: currentCartItems.map((i) => ({
              menuItemId: i.menuItemId,
              menuItemName: i.menuItemName,
              flavourId: i.flavourId,
              flavourName: i.flavourName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              notes: i.notes,
            })),
          },
        },
      });
    } catch (err: any) {
      console.error('[POS] Create order failed:', err);
      triggerPOSToast(err?.message || 'Failed to confirm order', 'error');
      // On failure, re-sync menu to restore actual server stock
      apolloClient.refetchQueries({ include: [GET_MENU] });
    }
  };

  return (
    <div className="pos-cart-panel">
      {/* 1. Header */}
      <div>
        <div className="pos-cart-header">
          <div className="pos-cart-order-num-large">#{trueOrderNumber}</div>

          <button
            onClick={clearCart}
            className="pos-icon-btn danger"
            title="Clear current cart"
            disabled={items.length === 0}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        {/* 2. Payment Method Selector */}
        <div className="pos-payment-toggle">
          {[
            { key: 'cash', label: '💵 Cash' },
            { key: 'upi', label: '📱 Online' },
            { key: 'credit', label: '📒 Credit' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setPaymentMethod(mode.key as any)}
              className={`pos-payment-pill ${paymentMethod === mode.key ? 'active' : ''}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* 3. Customer Inputs with Autocomplete Popover */}
        <div className="pos-customer-row">
          {/* Customer Name */}
          <div className="pos-input-group" ref={nameInputRef}>
            <div className="pos-input-label">
              <span>Customer Name</span>
              {paymentMethod === 'credit' && <span className="required">* Req</span>}
            </div>
            <input
              type="text"
              className={`pos-input-field ${
                paymentMethod === 'credit' && !customerName ? 'error' : ''
              }`}
              placeholder="Name..."
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setShowNamePopover(true);
                setShowPhonePopover(false);
              }}
              onFocus={() => {
                setShowNamePopover(true);
                setShowPhonePopover(false);
              }}
            />

            {showNamePopover && filteredByName.length > 0 && (
              <div className="pos-autocomplete-popover pos-scroll">
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--pos-text-muted)',
                    padding: '4px 8px',
                    borderBottom: '1px solid #F0ECE4',
                    marginBottom: '4px',
                  }}
                >
                  Past Customers
                </div>
                {filteredByName.map((c, idx) => (
                  <div
                    key={idx}
                    className="pos-autocomplete-item"
                    onClick={() => handleSelectCustomer(c)}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        <HighlightMatch text={c.name || 'Unnamed'} query={customerName} />
                      </div>
                      {c.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--pos-text-muted)' }}>
                          {c.phone}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--pos-primary)' }}>➔</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Phone */}
          <div className="pos-input-group" ref={phoneInputRef}>
            <div className="pos-input-label">
              <span>Phone</span>
              {paymentMethod === 'credit' && <span className="required">* Req</span>}
            </div>
            <input
              type="text"
              className={`pos-input-field ${
                paymentMethod === 'credit' && !customerPhone ? 'error' : ''
              }`}
              placeholder="Phone..."
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setShowPhonePopover(true);
                setShowNamePopover(false);
              }}
              onFocus={() => {
                setShowPhonePopover(true);
                setShowNamePopover(false);
              }}
            />

            {showPhonePopover && filteredByPhone.length > 0 && (
              <div className="pos-autocomplete-popover pos-scroll">
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--pos-text-muted)',
                    padding: '4px 8px',
                    borderBottom: '1px solid #F0ECE4',
                    marginBottom: '4px',
                  }}
                >
                  Past Phones
                </div>
                {filteredByPhone.map((c, idx) => (
                  <div
                    key={idx}
                    className="pos-autocomplete-item"
                    onClick={() => handleSelectCustomer(c)}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        <HighlightMatch text={c.phone || c.name} query={customerPhone} />
                      </div>
                      {c.name && (
                        <div style={{ fontSize: '11px', color: 'var(--pos-text-muted)' }}>
                          {c.name}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--pos-primary)' }}>➔</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Cart Items List */}
      <div className="pos-cart-list-container pos-scroll">
        {items.length === 0 ? (
          <div className="pos-cart-empty">
            <div className="pos-cart-empty-icon">🛒</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--pos-text-primary)' }}>
              Order is Empty
            </div>
            <div style={{ fontSize: '13px', color: 'var(--pos-text-muted)', marginTop: '4px' }}>
              Select items from menu to start order
            </div>
          </div>
        ) : (
          items.map((item) => {
            const targetMenu = allMenuItems.find((m) => m.id === item.menuItemId);
            const maxAvailable = targetMenu?.maxAvailable ?? 999;

            return (
              <div key={`${item.menuItemId}-${item.flavourId || 'none'}`} className="pos-cart-row">
                <div className="pos-cart-item-meta">
                  <div className="pos-cart-item-name">{item.menuItemName}</div>
                  {item.flavourName && (
                    <div className="pos-cart-item-flavour">{item.flavourName}</div>
                  )}
                  <div className="pos-cart-item-price">
                    {fmt(item.unitPrice)} × {item.quantity} = {fmt(item.unitPrice * item.quantity)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="pos-stepper">
                    <button
                      className="pos-stepper-btn"
                      onClick={() =>
                        updateQuantity(
                          item.menuItemId,
                          item.flavourId,
                          item.quantity - 1,
                          maxAvailable,
                        )
                      }
                      title="Decrease quantity"
                    >
                      –
                    </button>
                    <span className="pos-stepper-value">{item.quantity}</span>
                    <button
                      className="pos-stepper-btn"
                      onClick={() =>
                        updateQuantity(
                          item.menuItemId,
                          item.flavourId,
                          item.quantity + 1,
                          maxAvailable,
                        )
                      }
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.menuItemId, item.flavourId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--pos-text-muted)',
                      cursor: 'pointer',
                      fontSize: '15px',
                      padding: '4px',
                    }}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer: Total, Save Pre-order, Confirm Order */}
      <div className="pos-cart-footer">
        {/* Total Row */}
        <div className="pos-totals-row">
          <span className="pos-total-label">Total</span>
          <span className="pos-total-amount">{fmt(total)}</span>
        </div>

        {/* Save as Pre-Order Button */}
        <button
          className="pos-preorder-btn"
          onClick={handleSavePreOrder}
          disabled={items.length === 0 || isSavingPreOrder || isSuccessOrder}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{isSavingPreOrder ? 'Saving Pre-Order...' : 'Save as Pre-Order'}</span>
        </button>

        {/* Primary Action Button: Confirm Order */}
        <button
          className={`pos-confirm-order-btn ${isSuccessOrder ? 'success' : ''}`}
          onClick={handlePlaceOrder}
          disabled={items.length === 0 || isSavingPreOrder || isSuccessOrder}
        >
          {isSuccessOrder ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>Order Confirmed!</span>
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}
              >
                ➔
              </div>
              <span style={{ fontSize: '17px', fontWeight: 700 }}>Confirm Order {fmt(total)}</span>
              <span style={{ opacity: 0.6 }}>➔</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
