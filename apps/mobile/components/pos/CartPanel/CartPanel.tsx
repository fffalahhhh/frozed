import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { useCartStore } from '../../../store/cart';
import { useToastStore } from '../../../store/toast';
import { fmt } from '../../common/constants';
import { CartItemRow } from '../CartItemRow';

export interface CartPanelProps {
  receiptNumber?: string;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <Text className="text-gray-900 font-sans-medium text-xs">{text}</Text>;
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
    <Text className="text-gray-900 font-sans-medium text-xs">
      {parts.map((part, i) =>
        part.isMatch ? (
          <Text key={i} className="font-sans-bold text-[#0D4830] bg-[#0D4830]/15 rounded px-0.5">
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

export function CartPanel({ receiptNumber }: CartPanelProps) {
  const queryClient = useQueryClient();
  const {
    items,
    paymentMethod,
    customerName,
    customerPhone,
    subtotal,
    discountAmount,
    setPaymentMethod,
    setCustomerName,
    setCustomerPhone,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isSubmittingPreOrder, setIsSubmittingPreOrder] = useState(false);
  const [isSuccessOrder, setIsSuccessOrder] = useState(false);
  const [showNamePopover, setShowNamePopover] = useState(false);
  const [showPhonePopover, setShowPhonePopover] = useState(false);

  // Query previous orders to extract past customer history & true next order number
  const { data: previousOrders } = useQuery<any[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders'),
    staleTime: 1000 * 60 * 2,
  });

  // Calculate true next auto-incrementing order number from DB history
  const trueOrderNumber = useMemo(() => {
    if (!previousOrders || !Array.isArray(previousOrders) || previousOrders.length === 0) {
      return '1';
    }
    const maxNum = Math.max(...previousOrders.map((o) => Number(o.orderNumber) || 0), 0);
    return String(maxNum + 1);
  }, [previousOrders]);

  const activeOrderNum = receiptNumber || trueOrderNumber;

  // Extract unique past customers (Name & Phone pairs)
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

  // Filtered customer lists based on inputs
  const filteredByName = useMemo(() => {
    if (!customerName.trim()) return pastCustomers;
    const q = customerName.toLowerCase();
    return pastCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }, [pastCustomers, customerName]);

  const filteredByPhone = useMemo(() => {
    if (!customerPhone.trim()) return pastCustomers;
    const q = customerPhone.toLowerCase();
    return pastCustomers.filter(
      (c) => c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [pastCustomers, customerPhone]);

  // Animation values for success checkmark
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const tot = subtotal();

  useEffect(() => {
    if (isSuccessOrder) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSuccessOrder]);

  const handleSelectCustomer = (cust: { name: string; phone: string }) => {
    if (cust.name) setCustomerName(cust.name);
    if (cust.phone) setCustomerPhone(cust.phone);
    setShowNamePopover(false);
    setShowPhonePopover(false);
  };

  const handleSavePreOrder = async () => {
    if (items.length === 0) {
      useToastStore.getState().showToast('Cart is empty. Please add items first.', 'error');
      return;
    }

    try {
      setIsSubmittingPreOrder(true);
      await api.post('/pre-orders', {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || null,
        paymentMethod,
        subtotal: tot,
        totalAmount: tot,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          menuItemName: i.menuItemName,
          flavourId: i.flavourId,
          flavourName: i.flavourName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.unitPrice * i.quantity,
          notes: i.notes,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
      setIsSubmittingPreOrder(false);
      useToastStore.getState().showToast('Saved as Pre-Order!', 'success');
      clearCart();
    } catch (err: any) {
      setIsSubmittingPreOrder(false);
      useToastStore.getState().showToast(err.message || 'Failed to save pre-order', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      useToastStore
        .getState()
        .showToast('Cart is empty. Please add items to place an order.', 'error');
      return;
    }

    if (paymentMethod === 'credit') {
      if (!customerName.trim()) {
        useToastStore.getState().showToast('Customer Name is required for Credit orders.', 'error');
        return;
      }
      if (!customerPhone.trim()) {
        useToastStore
          .getState()
          .showToast('Customer Phone Number is required for Credit orders.', 'error');
        return;
      }
    }

    try {
      setIsSubmittingOrder(true);
      const orderRes = await api.post<any>('/orders', {
        orderType: 'dine_in',
        paymentMethod,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        subtotal: tot,
        discountAmount,
        totalAmount: tot,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          menuItemName: i.menuItemName,
          flavourId: i.flavourId,
          flavourName: i.flavourName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.unitPrice * i.quantity,
          notes: i.notes,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });

      setIsSubmittingOrder(false);
      setIsSuccessOrder(true);

      setTimeout(() => {
        setIsSuccessOrder(false);
        clearCart();
      }, 1800);
    } catch (err: any) {
      setIsSubmittingOrder(false);
      useToastStore.getState().showToast(err.message || 'Failed to place order', 'error');
    }
  };

  return (
    <View className="bg-white rounded-[32px] flex-1 border border-[#E5E0D8] p-5 shadow-sm elevation-2 h-full min-h-[600px] justify-between z-40 mb-2">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pb-3 border-b border-[#E5E0D8]/60">
        <Pressable className="w-10 h-10 rounded-full bg-[#0D4830] items-center justify-center">
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="items-center">
          <Text className="text-gray-900 font-sans-bold text-base">Order</Text>
          <Text className="text-gray-500 font-sans-semibold text-xs mt-0.5">#{activeOrderNum}</Text>
        </View>

        {/* Clear Cart Trash Icon Button */}
        <Pressable
          onPress={clearCart}
          className="w-10 h-10 rounded-full border border-red-200 bg-red-50 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>

      {/* Payment Type Selector Pills (Cash / Online / Credit) */}
      <View className="flex-row bg-[#F4F1EA] rounded-full p-1 mt-3 border border-[#E5E0D8]">
        {[
          { key: 'cash', label: 'Cash' },
          { key: 'upi', label: 'Online' },
          { key: 'credit', label: 'Credit' },
        ].map((mode) => {
          const isSelected = paymentMethod === mode.key;
          return (
            <Pressable
              key={mode.key}
              onPress={() => setPaymentMethod(mode.key as any)}
              className={`flex-1 py-2 rounded-full items-center justify-center ${
                isSelected ? 'bg-[#0D4830]' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Customer Name & Phone Number Inputs with Left-Positioned History Popovers */}
      <View className="flex-row gap-2.5 mt-3 z-50 relative">
        {/* Customer Name Field */}
        <View className="flex-1 relative z-50">
          <View className="flex-row items-center justify-between mb-1 pl-1 pr-1">
            <Text className="text-gray-600 font-sans-medium text-xs">Customer name</Text>
            {paymentMethod === 'credit' && (
              <Text className="text-red-500 font-sans-bold text-[10px]">* Req</Text>
            )}
          </View>
          <View
            className={`border rounded-full px-3.5 py-1.5 bg-white ${
              paymentMethod === 'credit' && !customerName ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <TextInput
              value={customerName}
              onChangeText={(text) => {
                setCustomerName(text);
                setShowNamePopover(true);
                setShowPhonePopover(false);
              }}
              onFocus={() => {
                setShowNamePopover(true);
                setShowPhonePopover(false);
              }}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 font-sans-bold text-xs p-0"
            />
          </View>

          {/* Left-Positioned Popover Dropdown for Customer Name */}
          {showNamePopover && filteredByName.length > 0 && (
            <View className="absolute top-0 right-full mr-2.5 z-50 w-56 bg-white border border-[#E5E0D8] rounded-2xl shadow-2xl elevation-10 p-1.5 max-h-52">
              <View className="flex-row items-center justify-between px-2 py-1 border-b border-gray-100 mb-1">
                <Text className="text-gray-400 font-sans-bold text-[10px] uppercase">
                  Previous Customers
                </Text>
                <Pressable onPress={() => setShowNamePopover(false)}>
                  <Ionicons name="close" size={14} color="#9CA3AF" />
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" className="max-h-40">
                {filteredByName.map((c, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSelectCustomer(c)}
                    className="py-2 px-2.5 rounded-xl border-b border-gray-50 active:bg-gray-100 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-1">
                      <HighlightMatch text={c.name || 'Unnamed Customer'} query={customerName} />
                      {c.phone ? (
                        <Text className="text-gray-400 font-sans text-[10px]">{c.phone}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={12} color="#0D4830" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Customer Phone Field with Left-Positioned Popover */}
        <View className="flex-1 relative z-50">
          <View className="flex-row items-center justify-between mb-1 pl-1 pr-1">
            <Text className="text-gray-600 font-sans-medium text-xs">Phone Number</Text>
            {paymentMethod === 'credit' && (
              <Text className="text-red-500 font-sans-bold text-[10px]">* Req</Text>
            )}
          </View>
          <View
            className={`border rounded-full px-3.5 py-1.5 bg-white ${
              paymentMethod === 'credit' && !customerPhone ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <TextInput
              value={customerPhone}
              onChangeText={(text) => {
                setCustomerPhone(text);
                setShowPhonePopover(true);
                setShowNamePopover(false);
              }}
              onFocus={() => {
                setShowPhonePopover(true);
                setShowNamePopover(false);
              }}
              keyboardType="phone-pad"
              placeholder="Phone"
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 font-sans-bold text-xs p-0"
            />
          </View>

          {/* Left-Positioned Popover Dropdown for Phone Field */}
          {showPhonePopover && filteredByPhone.length > 0 && (
            <View className="absolute top-0 right-full mr-2.5 z-50 w-56 bg-white border border-[#E5E0D8] rounded-2xl shadow-2xl elevation-10 p-1.5 max-h-52">
              <View className="flex-row items-center justify-between px-2 py-1 border-b border-gray-100 mb-1">
                <Text className="text-gray-400 font-sans-bold text-[10px] uppercase">
                  Previous Phones
                </Text>
                <Pressable onPress={() => setShowPhonePopover(false)}>
                  <Ionicons name="close" size={14} color="#9CA3AF" />
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" className="max-h-40">
                {filteredByPhone.map((c, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSelectCustomer(c)}
                    className="py-2 px-2.5 rounded-xl border-b border-gray-50 active:bg-gray-100 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-1">
                      <HighlightMatch text={c.phone || c.name} query={customerPhone} />
                      {c.name ? (
                        <Text className="text-gray-400 font-sans text-[10px]">{c.name}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={12} color="#0D4830" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Order List Header */}
      <Text className="text-gray-700 font-sans-medium text-xs mt-3 mb-1.5">Order list</Text>

      {/* Stable Height Order List Container */}
      <Pressable
        onPress={() => {
          setShowNamePopover(false);
          setShowPhonePopover(false);
        }}
        className="flex-1 border border-[#E5E0D8] rounded-[24px] px-3.5 py-2 bg-white overflow-hidden my-1 min-h-[180px]"
      >
        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-6">
            <View className="w-14 h-14 rounded-full bg-[#F4F1EA] items-center justify-center mb-2">
              <Ionicons name="cart-outline" size={28} color="#0D4830" />
            </View>
            <Text className="text-gray-900 font-sans-bold text-sm">Your order list is empty</Text>
            <Text className="text-gray-500 font-sans text-xs mt-0.5 text-center">
              Tap items from the menu to build an order
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <CartItemRow
                key={`${item.menuItemId}-${item.flavourId}`}
                item={item}
                onIncrease={() =>
                  updateQuantity(item.menuItemId, item.flavourId, item.quantity + 1)
                }
                onDecrease={() =>
                  updateQuantity(item.menuItemId, item.flavourId, Math.max(0, item.quantity - 1))
                }
                onQuantityChange={(newQty) =>
                  updateQuantity(item.menuItemId, item.flavourId, newQty)
                }
              />
            ))}
          </ScrollView>
        )}
      </Pressable>

      {/* Footer Section: Total, Save as Pre-Order, & Confirm Order Button */}
      <View>
        <View className="flex-row justify-between items-center py-1 mb-1.5">
          <Text className="text-gray-900 font-sans-bold text-base">Total</Text>
          <Text className="text-[#0D4830] font-sans-bold text-xl">{fmt(tot)}</Text>
        </View>

        {/* Save as Pre-Order Secondary Button */}
        <Pressable
          disabled={items.length === 0 || isSubmittingPreOrder || isSubmittingOrder}
          onPress={handleSavePreOrder}
          className="w-full py-2 mb-2 rounded-full border border-[#0D4830] bg-[#F4F1EA] items-center justify-center flex-row gap-1.5"
          style={({ pressed }) => ({ opacity: pressed || items.length === 0 ? 0.6 : 1 })}
        >
          {isSubmittingPreOrder ? (
            <ActivityIndicator color="#0D4830" size="small" />
          ) : (
            <>
              <Ionicons name="time-outline" size={15} color="#0D4830" />
              <Text className="text-[#0D4830] font-sans-bold text-xs">Save as Pre-Order</Text>
            </>
          )}
        </Pressable>

        {/* Place Order Button with Arrow Graphic & In-Button Checkmark */}
        <Pressable
          disabled={items.length === 0 || isSubmittingOrder || isSuccessOrder}
          onPress={handlePlaceOrder}
          className={`rounded-full h-14 flex-row items-center justify-between px-2 bg-[#0D4830] shadow-md shadow-[#0D4830]/30 ${
            items.length === 0 ? 'opacity-70 elevation-0' : 'elevation-4'
          }`}
          style={({ pressed }) => ({
            opacity: pressed || isSubmittingOrder ? 0.88 : 1,
          })}
        >
          {isSubmittingOrder ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : isSuccessOrder ? (
            <Animated.View
              className="flex-row items-center w-full justify-center gap-2"
              style={{
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text className="text-white font-sans-bold text-base text-center">
                Order Confirmed!
              </Text>
            </Animated.View>
          ) : (
            <View className="flex-row items-center justify-between w-full px-2">
              <View className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
              <Text className="text-white font-sans-bold text-base">Confirm Order {fmt(tot)}</Text>
              <View className="flex-row items-center opacity-60">
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="#FFFFFF"
                  style={{ marginLeft: -8 }}
                />
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
