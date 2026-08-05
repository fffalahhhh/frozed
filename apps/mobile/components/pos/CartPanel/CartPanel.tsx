import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { useCartStore } from '../../../store/cart';
import { useToastStore } from '../../../store/toast';
import { COLORS, FONTS, fmt } from '../../common/constants';
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

  const sub = subtotal();
  const tot = total();

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

      const orderNum = orderRes?.orderNumber ? `#${orderRes.orderNumber}` : '';
      useToastStore.getState().showToast(`Order ${orderNum} placed successfully!`, 'success');
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#044E35',
        marginBottom: 80,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
        height: '100%',
        minHeight: '100%',
      }}
    >
      {/* Header Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
        }}
      >
        <Pressable
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#044E35',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 16 }}>
            Purchase Receipt
          </Text>
          <Text
            style={{
              color: '#6B7280',
              fontFamily: FONTS.semiBold,
              fontSize: 13,
              marginTop: 1,
            }}
          >
            #{receiptNumber}
          </Text>
        </View>

        <Pressable
          onPress={clearCart}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            borderWidth: 1.5,
            borderColor: 'red',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="trash" size={18} color="red" />
        </Pressable>
      </View>

      {/* Payment Method Selector Pills (Cash / Online / Credit) */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          borderRadius: 9999,
          borderWidth: 1.5,
          borderColor: '#044E35',
          padding: 3,
          marginTop: 8,
        }}
      >
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
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSelected ? '#044E35' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: 12,
                  color: isSelected ? '#FFFFFF' : '#6B7280',
                }}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Customer Inputs (Name & Phone) */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                color: '#6B7280',
                fontFamily: FONTS.medium,
                fontSize: 11,
              }}
            >
              Customer name
            </Text>
            {paymentMethod === 'credit' && (
              <Text
                style={{
                  color: '#EF4444',
                  fontFamily: FONTS.bold,
                  fontSize: 10,
                }}
              >
                * Req
              </Text>
            )}
          </View>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: paymentMethod === 'credit' && !customerName ? '#EF4444' : '#044E35',
              borderRadius: 9999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: '#FFFFFF',
            }}
          >
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
              style={{
                color: '#111827',
                fontFamily: FONTS.bold,
                fontSize: 12,
                padding: 0,
              }}
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                color: '#6B7280',
                fontFamily: FONTS.medium,
                fontSize: 11,
              }}
            >
              Phone Number
            </Text>
            {paymentMethod === 'credit' && (
              <Text
                style={{
                  color: '#EF4444',
                  fontFamily: FONTS.bold,
                  fontSize: 10,
                }}
              >
                * Req
              </Text>
            )}
          </View>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: paymentMethod === 'credit' && !customerPhone ? '#EF4444' : '#044E35',
              borderRadius: 9999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: '#FFFFFF',
            }}
          >
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholder="Phone"
              placeholderTextColor="#9CA3AF"
              style={{
                color: '#111827',
                fontFamily: FONTS.bold,
                fontSize: 12,
                padding: 0,
              }}
            />
          </View>
        </View>
      </View>

      {/* Order List Container */}
      <Text
        style={{
          color: '#6B7280',
          fontFamily: FONTS.medium,
          fontSize: 12,
          marginTop: 14,
          marginBottom: 6,
        }}
      >
        Order list
      </Text>

      <View
        style={{
          flex: 1,
          borderWidth: 1.5,
          borderColor: '#044E35',
          borderRadius: 24,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: '#FFFFFF',
        }}
      >
        {items.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 30,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#F7F7F2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="cart-outline" size={28} color="#044E35" />
            </View>
            <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 14 }}>
              Your order list is empty
            </Text>
            <Text
              style={{
                color: '#6B7280',
                fontFamily: FONTS.regular,
                fontSize: 11,
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              Tap items from the menu to build an order
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
      <View>
        <View style={{ gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBlock: 6,
              paddingInline: 6,
            }}
          >
            <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 13 }}>Total</Text>
            <Text
              style={{
                color: COLORS.primary,
                fontFamily: FONTS.bold,
                fontSize: 15,
              }}
            >
              {fmt(tot)}
            </Text>
          </View>
        </View>
      </View>

      {/* Place Order Button */}
      <Pressable
        disabled={items.length === 0 || isSubmittingOrder}
        onPress={handlePlaceOrder}
        style={({ pressed }) => ({
          marginTop: 10,
          borderRadius: 9999,
          backgroundColor: COLORS.primary,
          paddingVertical: 5,
          paddingHorizontal: 6,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed || isSubmittingOrder ? 0.88 : 1,
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: items.length === 0 ? 0 : 4,
        })}
      >
        {isSubmittingOrder ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.white} />
          </View>
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              justifyContent: 'center',
              backgroundColor: COLORS.primary,
              opacity: items.length === 0 ? 0.8 : 1,
              padding: 8,
              paddingInline: 16,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontFamily: FONTS.bold,
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              Place Order
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
