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
    total,
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

  const sub = subtotal();
  const tot = total();

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
        subtotal: sub,
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

      // Trigger checkmark animation in place of toast
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
    <View className="bg-white rounded-[32px] flex-1 border-[1.5px] border-[#044E35] mb-20 p-4 shadow-md elevation-4 h-full min-h-full">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pb-3">
        <Pressable className="w-[38px] h-[38px] rounded-full bg-[#044E35] items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View className="items-center">
          <Text className="text-gray-900 font-sans-bold text-base">Purchase Receipt</Text>
          <Text className="text-gray-500 font-sans-semibold text-xs mt-0.5">#{receiptNumber}</Text>
        </View>

        <Pressable
          onPress={clearCart}
          className="w-[38px] h-[38px] rounded-full border-[1.5px] border-red-500 items-center justify-center bg-white"
        >
          <Ionicons name="trash" size={18} color="red" />
        </Pressable>
      </View>

      {/* Payment Method Selector Pills (Cash / Online / Credit) */}
      <View className="flex-row bg-white rounded-full border-[1.5px] border-[#044E35] p-0.5 mt-2">
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
                isSelected ? 'bg-[#044E35]' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Customer Inputs (Name & Phone) */}
      <View className="flex-row gap-2.5 mt-3.5">
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1 px-1">
            <Text className="text-gray-500 font-sans-medium text-[11px]">Customer name</Text>
            {paymentMethod === 'credit' && (
              <Text className="text-red-500 font-sans-bold text-[10px]">* Req</Text>
            )}
          </View>
          <View
            className={`border-[1.5px] rounded-full px-3.5 py-2 bg-white ${
              paymentMethod === 'credit' && !customerName ? 'border-red-500' : 'border-[#044E35]'
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
          <View className="flex-row items-center justify-between mb-1 px-1">
            <Text className="text-gray-500 font-sans-medium text-[11px]">Phone Number</Text>
            {paymentMethod === 'credit' && (
              <Text className="text-red-500 font-sans-bold text-[10px]">* Req</Text>
            )}
          </View>
          <View
            className={`border-[1.5px] rounded-full px-3.5 py-2 bg-white ${
              paymentMethod === 'credit' && !customerPhone ? 'border-red-500' : 'border-[#044E35]'
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

      {/* Order List Container */}
      <Text className="text-gray-500 font-sans-medium text-xs mt-3.5 mb-1.5">Order list</Text>

      <View className="flex-1 border-[1.5px] border-[#044E35] rounded-3xl px-3 py-2 bg-white">
        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-7">
            <View className="w-14 h-14 rounded-full bg-[#F7F7F2] items-center justify-center mb-2">
              <Ionicons name="cart-outline" size={28} color="#044E35" />
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

      {/* Payment Details */}
      <View className="mt-1">
        <View className="flex-row justify-between items-center py-1.5 px-1.5">
          <Text className="text-gray-900 font-sans-bold text-sm">Total</Text>
          <Text className="text-primary font-sans-bold text-base">{fmt(tot)}</Text>
        </View>
      </View>

      {/* Place Order Button */}
      <Pressable
        disabled={items.length === 0 || isSubmittingOrder || isSuccessOrder}
        onPress={handlePlaceOrder}
        className={`mt-2 rounded-full h-13 flex-row items-center justify-between shadow-md ${
          isSuccessOrder ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-primary shadow-primary/25'
        } ${items.length === 0 ? 'elevation-0 opacity-40' : 'elevation-4'}`}
        style={({ pressed }) => ({
          opacity: pressed || isSubmittingOrder ? 0.88 : 1,
        })}
      >
        {isSubmittingOrder ? (
          <View className="flex-1 items-center justify-center p-3 px-6">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : isSuccessOrder ? (
          <Animated.View
            className="flex-row items-center w-full justify-center gap-2 p-3 px-6 rounded-2xl bg-emerald-600"
            style={{
              opacity: opacityAnim,
            }}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text className="text-white font-sans-bold text-sm text-center">Order Placed!</Text>
          </Animated.View>
        ) : (
          <View
            className={`flex-row items-center w-full justify-center bg-primary p-3 px-6 rounded-2xl ${
              items.length === 0 ? 'opacity-80' : 'opacity-100'
            }`}
          >
            <Text className="text-white font-sans-bold text-xs text-center">Place Order</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
