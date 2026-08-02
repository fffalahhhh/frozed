import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  useWindowDimensions,
  StatusBar,
  FlatList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState } from 'expo-router';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
import type { MenuWithCategories, MenuItem, OrderType } from '@frozen-shake/shared';

// ─── Format currency ─────────────────────────────────────────────────────────
const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(0)}`;

// ─── Color & Style Constants ──────────────────────────────────────────────────
const COLORS = {
  primary: '#1B4332',
  primaryAlpha40: 'rgba(27, 67, 50, 0.4)',
  primaryAlpha20: 'rgba(27, 67, 50, 0.2)',
  primaryAlpha10: 'rgba(27, 67, 50, 0.1)',
  surface: '#FFFFFF',
  surfaceAlpha80: 'rgba(255, 255, 255, 0.8)',
  surfaceAlpha60: 'rgba(255, 255, 255, 0.6)',
  surfaceAlpha50: 'rgba(255, 255, 255, 0.5)',
  surfaceAlpha40: 'rgba(255, 255, 255, 0.4)',
  border: '#E8E2D9',
  borderAlpha60: 'rgba(232, 226, 217, 0.6)',
  borderAlpha50: 'rgba(232, 226, 217, 0.5)',
  borderAlpha40: 'rgba(232, 226, 217, 0.4)',
  textPrimary: '#1A1A1A',
  textMuted: '#8A8A8A',
  textMutedAlpha60: 'rgba(138, 138, 138, 0.6)',
  textLight: '#B0B0B0',
  warning: '#F97316',
  warningAlpha10: 'rgba(249, 115, 22, 0.1)',
  warningAlpha30: 'rgba(249, 115, 22, 0.3)',
  success: '#1B4332',
  successBg: '#E8F5EE',
  white: '#FFFFFF',
};

const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// ─── Top Center Logo Header ──────────────────────────────────────────────────
function TopLogoHeader() {
  return (
    <SafeAreaView
      style={{
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderAlpha40,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
        }}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Category Pill Card ───────────────────────────────────────────────────────
function CategoryCard({
  name,
  itemCount,
  isActive,
  needsRestock,
  onPress,
}: {
  name: string;
  itemCount: number;
  isActive: boolean;
  needsRestock: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginRight: 12,
          minWidth: 145,
          height: 96,
          justifyContent: 'space-between',
          borderWidth: 1,
          backgroundColor: isActive ? COLORS.primary : 'rgba(255, 255, 255, 0.9)',
          borderColor: isActive ? COLORS.primary : COLORS.borderAlpha60,
          opacity: pressed ? 0.85 : 1,
        },
        isActive
          ? {
              shadowColor: '#1B4332',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            },
      ]}
    >
      {/* Badge */}
      {needsRestock ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: COLORS.warningAlpha10,
            borderWidth: 1,
            borderColor: COLORS.warningAlpha30,
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
          <Text
            style={{
              color: COLORS.warning,
              fontSize: 10,
              fontFamily: FONTS.semiBold,
            }}
          >
            Re-stock
          </Text>
        </View>
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : COLORS.successBg,
            borderWidth: isActive ? 0 : 1,
            borderColor: COLORS.primaryAlpha10,
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={12}
            color={isActive ? COLORS.white : COLORS.primary}
          />
          <Text
            style={{
              fontSize: 10,
              fontFamily: FONTS.semiBold,
              color: isActive ? COLORS.white : COLORS.primary,
            }}
          >
            Available
          </Text>
        </View>
      )}

      {/* Title & Count */}
      <View>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: 16,
            lineHeight: 20,
            color: isActive ? COLORS.white : COLORS.textPrimary,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={{
            fontFamily: FONTS.regular,
            fontSize: 12,
            marginTop: 2,
            color: isActive ? 'rgba(255, 255, 255, 0.75)' : COLORS.textMuted,
          }}
        >
          {itemCount} Items
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────
function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  return (
    <Pressable
      onPress={() => onAdd(item)}
      style={({ pressed }) => [
        {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 24,
          padding: 14,
          margin: 6,
          flex: 1,
          minWidth: 140,
          maxWidth: 185,
          borderWidth: 1,
          borderColor: COLORS.borderAlpha50,
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
        },
      ]}
    >
      {/* Item Image or Graphic */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: 96,
          marginBottom: 8,
          backgroundColor: COLORS.surfaceAlpha40,
          borderRadius: 16,
          padding: 8,
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="nutrition-outline" size={44} color={COLORS.primary} />
        )}
      </View>

      {/* Item Name & Price */}
      <View>
        <Text
          style={{
            color: COLORS.textPrimary,
            fontFamily: FONTS.bold,
            fontSize: 14,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontFamily: FONTS.bold,
              fontSize: 16,
            }}
          >
            {fmt(item.sellingPrice)}
          </Text>

          <Pressable
            onPress={() => onAdd(item)}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
              elevation: 4,
            })}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onIncrease,
  onDecrease,
}: {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
    >
      {/* Soft rounded image/icon container */}
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          backgroundColor: '#F7F7F2',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#EFEFE8',
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="cafe-outline" size={28} color="#044E35" />
        )}
      </View>

      {/* Item info */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              color: '#111827',
              fontFamily: FONTS.bold,
              fontSize: 14,
              flex: 1,
              paddingRight: 6,
            }}
            numberOfLines={1}
          >
            {item.menuItemName}
          </Text>
          <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 14 }}>
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        <Text
          style={{
            color: '#6B7280',
            fontFamily: FONTS.regular,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {fmt(item.unitPrice)} x {item.quantity}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          {item.flavourName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="document-text-outline" size={12} color="#6B7280" />
              <Text
                style={{
                  color: '#6B7280',
                  fontFamily: FONTS.medium,
                  fontSize: 11,
                }}
              >
                {item.flavourName}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Stepper pill [ - 2 + ] */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              borderRadius: 9999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              gap: 8,
            }}
          >
            <Pressable
              onPress={onDecrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="remove" size={14} color="#111827" />
            </Pressable>
            <Text
              style={{
                color: '#111827',
                fontFamily: FONTS.bold,
                fontSize: 12,
                minWidth: 14,
                textAlign: 'center',
              }}
            >
              {item.quantity}
            </Text>
            <Pressable
              onPress={onIncrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="add" size={14} color="#111827" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Right Panel: Cart ────────────────────────────────────────────────────────
function CartPanel({ receiptNumber }: { receiptNumber: string }) {
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

// ─── Add Menu Item Modal ──────────────────────────────────────────────────────
function AddMenuItemModal({
  visible,
  onClose,
  categories,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<
    Array<{ inventoryItemId: string; quantity: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query inventory stock items
  const { data: stockItems } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
  });

  React.useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]);

  const addIngredientRow = () => {
    if (!stockItems || stockItems.length === 0) {
      Alert.alert(
        'No Inventory Items',
        'Please add inventory items first in the Inventory tab before linking ingredients.',
      );
      return;
    }
    setIngredients([...ingredients, { inventoryItemId: stockItems[0].id, quantity: '' }]);
  };

  const updateIngredient = (
    index: number,
    field: 'inventoryItemId' | 'quantity',
    value: string,
  ) => {
    const copy = [...ingredients];
    copy[index][field] = value;
    setIngredients(copy);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setDescription('');
    setIngredients([]);
  };

  const handleSaveMenuItem = async () => {
    if (!name.trim()) {
      useToastStore.getState().showToast('Please enter a menu item name', 'error');
      return;
    }
    if (!selectedCategoryId) {
      useToastStore.getState().showToast('Please select a category', 'error');
      return;
    }
    if (!sellingPrice.trim() || isNaN(Number(sellingPrice))) {
      useToastStore.getState().showToast('Please enter a valid selling price', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const formattedIngredients = ingredients
        .filter((ing) => ing.inventoryItemId && ing.quantity && !isNaN(Number(ing.quantity)))
        .map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: Number(ing.quantity),
        }));

      await api.post('/menu/items', {
        categoryId: selectedCategoryId,
        name: name.trim(),
        description: description.trim() || null,
        sellingPrice: Number(sellingPrice),
        ingredients: formattedIngredients,
      });

      useToastStore.getState().showToast('Menu item created successfully!', 'success');
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to create menu item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: COLORS.borderAlpha40,
              marginBottom: 16,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontFamily: FONTS.bold,
                fontSize: 18,
              }}
            >
              Add Menu Item
            </Text>
            <Pressable
              onPress={() => {
                onClose();
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Item Name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Item Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Mango Special Smoothie"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Category selection */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Category *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: 'row' }}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginRight: 8,
                      backgroundColor:
                        selectedCategoryId === cat.id ? COLORS.primary : COLORS.white,
                      borderColor: selectedCategoryId === cat.id ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.medium,
                        fontSize: 12,
                        color: selectedCategoryId === cat.id ? COLORS.white : COLORS.textPrimary,
                      }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Selling Price */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Selling Price (₹) *
              </Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                placeholder="e.g. 140"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Made with fresh pulp & whole milk"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Inventory Ingredients Section */}
            <View
              style={{
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.borderAlpha60,
                borderRadius: 16,
                padding: 14,
                backgroundColor: COLORS.surfaceAlpha50,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      color: COLORS.textPrimary,
                      fontFamily: FONTS.bold,
                      fontSize: 14,
                    }}
                  >
                    Inventory Used & Recipe
                  </Text>
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontFamily: FONTS.regular,
                      fontSize: 11,
                    }}
                  >
                    Select inventory ingredients used per serving
                  </Text>
                </View>
                <Pressable
                  onPress={addIngredientRow}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.primaryAlpha10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    gap: 4,
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontFamily: FONTS.semiBold,
                      fontSize: 12,
                    }}
                  >
                    Add Ingredient
                  </Text>
                </Pressable>
              </View>

              {ingredients.length === 0 ? (
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: FONTS.regular,
                    fontSize: 12,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginVertical: 8,
                  }}
                >
                  No inventory ingredients added yet. Tap "+ Add Ingredient" above.
                </Text>
              ) : (
                ingredients.map((ing, idx) => {
                  const selectedStock = stockItems?.find((s) => s.id === ing.inventoryItemId);
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: COLORS.white,
                        borderWidth: 1,
                        borderColor: COLORS.borderAlpha60,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.textPrimary,
                            fontFamily: FONTS.semiBold,
                            fontSize: 12,
                          }}
                        >
                          Ingredient #{idx + 1}
                        </Text>
                        <Pressable onPress={() => removeIngredient(idx)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </Pressable>
                      </View>

                      {/* Select inventory item pill scroll */}
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontFamily: FONTS.regular,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Select Inventory Item:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 10 }}
                      >
                        {stockItems?.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => updateIngredient(idx, 'inventoryItemId', s.id)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 10,
                              borderWidth: 1,
                              marginRight: 6,
                              backgroundColor:
                                ing.inventoryItemId === s.id ? COLORS.primary : COLORS.white,
                              borderColor:
                                ing.inventoryItemId === s.id ? COLORS.primary : COLORS.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: FONTS.medium,
                                color:
                                  ing.inventoryItemId === s.id ? COLORS.white : COLORS.textPrimary,
                              }}
                            >
                              {s.name} ({s.unit})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      {/* Amount used input */}
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontFamily: FONTS.regular,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Amount Used ({selectedStock?.unit || 'unit'} per item):
                      </Text>
                      <TextInput
                        value={ing.quantity}
                        onChangeText={(val) => updateIngredient(idx, 'quantity', val)}
                        keyboardType="numeric"
                        placeholder={`e.g. 200 ${selectedStock?.unit || ''}`}
                        placeholderTextColor={COLORS.textMuted}
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.borderAlpha60,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                          color: COLORS.textPrimary,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    </View>
                  );
                })
              )}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveMenuItem}
              disabled={isSubmitting}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={{
                    color: COLORS.white,
                    fontFamily: FONTS.bold,
                    fontSize: 15,
                  }}
                >
                  Save Menu Item
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main FOH Screen ──────────────────────────────────────────────────────────
export default function FOHScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const queryClient = useQueryClient();

  // Wait for Expo Router's navigation container to be fully initialized
  const rootState = useRootNavigationState();
  const isNavReady = !!rootState?.key;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addMenuModalVisible, setAddMenuModalVisible] = useState(false);

  const {
    data: menuData,
    isLoading,
    refetch: refetchMenu,
  } = useQuery<MenuWithCategories[]>({
    queryKey: ['menu'],
    queryFn: () => api.get('/menu'),
    staleTime: 1000 * 60 * 5,
  });

  const categoriesList = menuData?.map((m) => ({ id: m.category.id, name: m.category.name })) ?? [];

  const addItem = useCartStore((s) => s.addItem);

  // Auto-select first category
  React.useEffect(() => {
    if (menuData && menuData.length > 0 && !activeCategoryId) {
      setActiveCategoryId(menuData[0].category.id);
    }
  }, [menuData]);

  const activeSection =
    menuData?.find((s: MenuWithCategories) => s.category.id === activeCategoryId) ?? menuData?.[0];

  const filteredItems = (activeSection?.items ?? []).filter((item: MenuItem) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleAddItem(item: MenuItem) {
    addItem({
      menuItemId: item.id,
      menuItemName: item.name,
      imageUrl: item.imageUrl,
      flavourId: null,
      flavourName: null,
      quantity: 1,
      unitPrice: parseFloat(item.sellingPrice),
      notes: null,
    });
  }

  const receiptNumber = String(Math.floor(Math.random() * 90000) + 10000);

  const MenuPanel = (
    <View style={{ flex: 1, paddingBottom: 96 }}>
      {/* Search Bar & Add Item Button */}
      {/* <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 16, gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderWidth: 1, borderColor: COLORS.borderAlpha60, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Ionicons name="search-outline" size={20} color="#8A8A8A" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search fruit shakes, juices..."
            placeholderTextColor="#8A8A8A"
            style={{ flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: 14, padding: 0 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#8A8A8A" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setAddMenuModalVisible(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.primary,
            borderRadius: 24,
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 6,
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#1B4332',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          })}
        >
          <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontFamily: FONTS.bold, fontSize: 13 }}>
            Add Item
          </Text>
        </Pressable>
      </View> */}

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingLeft: 16, marginBottom: 16 }}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {isLoading
          ? [1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 24,
                  marginRight: 12,
                  minWidth: 145,
                  height: 96,
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha40,
                }}
              />
            ))
          : menuData?.map((section: MenuWithCategories) => (
              <CategoryCard
                key={section.category.id}
                name={section.category.name}
                itemCount={section.items.length}
                isActive={activeCategoryId === section.category.id}
                needsRestock={section.needsRestock}
                onPress={() => setActiveCategoryId(section.category.id)}
              />
            ))}
      </ScrollView>

      {/* Menu Item Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        numColumns={isTablet ? 4 : 2}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 60 }}
        renderItem={({ item }) => <MenuItemCard item={item} onAdd={handleAddItem} />}
        ListEmptyComponent={
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 80,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.surfaceAlpha60,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="ice-cream-outline" size={40} color={COLORS.primary} />
            </View>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontFamily: FONTS.bold,
                fontSize: 16,
              }}
            >
              {isLoading ? 'Loading Menu...' : 'No Shakes Found'}
            </Text>
            <Text
              style={{
                color: COLORS.textMuted,
                fontFamily: FONTS.regular,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {isLoading ? 'Fetching delicious items...' : 'Try adjusting your search'}
            </Text>
          </View>
        }
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Logo placed at the top side */}
      <TopLogoHeader />

      {/* Block interactive content until navigation context is fully mounted */}
      {isNavReady &&
        (isTablet ? (
          <View style={{ flex: 1, flexDirection: 'row', padding: 16, gap: 16 }}>
            <View style={{ flex: 0.65 }}>{MenuPanel}</View>
            <View style={{ flex: 0.35 }}>
              <CartPanel receiptNumber={receiptNumber} />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>{MenuPanel}</View>
        ))}

      {/* Add Menu Item Modal */}
      <AddMenuItemModal
        visible={addMenuModalVisible}
        onClose={() => setAddMenuModalVisible(false)}
        categories={categoriesList}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['menu'] });
          refetchMenu();
        }}
      />
    </View>
  );
}
