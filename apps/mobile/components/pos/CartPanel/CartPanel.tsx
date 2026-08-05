import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { useCartStore } from '../../../store/cart';
import { useToastStore } from '../../../store/toast';
import { fmt } from '../../common/constants';
import { CartItemRow } from '../CartItemRow';

export interface CartPanelProps {
  receiptNumber: string;
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
  const [isSuccessOrder, setIsSuccessOrder] = useState(false);

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
    <View className="bg-white rounded-[32px] flex-1 border border-[#E5E0D8] p-5 shadow-sm elevation-2 h-full min-h-full justify-between">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pb-3 border-b border-[#E5E0D8]/60">
        <Pressable className="w-10 h-10 rounded-full bg-[#0D4830] items-center justify-center">
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="items-center">
          <Text className="text-gray-900 font-sans-bold text-base">Order</Text>
          <Text className="text-gray-500 font-sans-semibold text-xs mt-0.5">#{receiptNumber}</Text>
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

      {/* Customer Name & Phone Number Inputs */}
      <View className="flex-row gap-2.5 mt-3">
        <View className="flex-1">
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
              onChangeText={setCustomerName}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 font-sans-bold text-xs p-0"
            />
          </View>
        </View>

        <View className="flex-1">
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
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholder="Phone"
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 font-sans-bold text-xs p-0"
            />
          </View>
        </View>
      </View>

      {/* Order List Header */}
      <Text className="text-gray-700 font-sans-medium text-xs mt-3 mb-1.5">Order list</Text>

      {/* Full Height Order List Container */}
      <View className="flex-1 border border-[#E5E0D8] rounded-[24px] px-3.5 py-2 bg-white overflow-hidden my-1">
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
                  updateQuantity(item.menuItemId, item.flavourId, item.quantity - 1)
                }
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Footer Section: Total & Place Order Button */}
      <View className="">
        <View className="flex-row justify-between items-center py-1 mb-1">
          <Text className="text-gray-900 font-sans-bold text-base">Total</Text>
          <Text className="text-[#0D4830] font-sans-bold text-xl">{fmt(tot)}</Text>
        </View>

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
              <Text className="text-white font-sans-bold text-base text-center">Order Placed!</Text>
            </Animated.View>
          ) : (
            <View className="flex-row items-center justify-between w-full px-2">
              <View className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
              <Text className="text-white font-sans-bold text-base">Place Order {fmt(tot)}</Text>
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
