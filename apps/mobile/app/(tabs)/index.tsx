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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState } from 'expo-router';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
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
    <SafeAreaView style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderAlpha40 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
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
        <View style={{ alignSelf: 'flex-start', backgroundColor: COLORS.warningAlpha10, borderWidth: 1, borderColor: COLORS.warningAlpha30, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
          <Text style={{ color: COLORS.warning, fontSize: 10, fontFamily: FONTS.semiBold }}>
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
function MenuItemCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
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
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 96, marginBottom: 8, backgroundColor: COLORS.surfaceAlpha40, borderRadius: 16, padding: 8 }}>
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
          style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16 }}>
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

// ─── Order Type Tabs ──────────────────────────────────────────────────────────
const ORDER_TYPES: { key: OrderType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dine_in', label: 'Dine In', icon: 'restaurant-outline' },
  { key: 'take_away', label: 'Take Away', icon: 'bag-handle-outline' },
  { key: 'order_online', label: 'Online', icon: 'globe-outline' },
];

function OrderTypeTabs({
  value,
  onChange,
}: {
  value: OrderType;
  onChange: (t: OrderType) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceAlpha80, borderRadius: 16, padding: 4, gap: 4, borderWidth: 1, borderColor: COLORS.borderAlpha40 }}>
      {ORDER_TYPES.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 8,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: value === t.key ? COLORS.primary : 'transparent',
            opacity: pressed ? 0.8 : 1,
            shadowColor: value === t.key ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: value === t.key ? 0.1 : 0,
            shadowRadius: 2,
            elevation: value === t.key ? 2 : 0,
          })}
        >
          <Ionicons
            name={t.icon}
            size={15}
            color={value === t.key ? COLORS.white : '#8A8A8A'}
          />
          <Text
            style={{
              fontFamily: FONTS.semiBold,
              fontSize: 12,
              color: value === t.key ? COLORS.white : COLORS.textMuted,
            }}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderAlpha40 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.surfaceAlpha60, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderAlpha40 }}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="cafe-outline" size={24} color={COLORS.primary} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14, flex: 1, paddingRight: 4 }} numberOfLines={1}>
            {item.menuItemName}
          </Text>
          <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 14 }}>
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        {item.flavourName && (
          <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 12, marginTop: 2 }}>
            Flavor: {item.flavourName}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
          <Pressable onPress={onDecrease} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="remove-circle-outline" size={22} color="#8A8A8A" />
          </Pressable>
          <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14, minWidth: 16, textAlign: 'center' }}>
            {item.quantity}
          </Text>
          <Pressable onPress={onIncrease} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="add-circle" size={22} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Right Panel: Cart ────────────────────────────────────────────────────────
function CartPanel({ receiptNumber }: { receiptNumber: string }) {
  const {
    items,
    orderType,
    customerName,
    tableRef,
    subtotal,
    total,
    discountAmount,
    setOrderType,
    setCustomerName,
    updateQuantity,
  } = useCartStore();

  const sub = subtotal();
  const tot = total();

  return (
    <View
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.borderAlpha50,
        marginBottom: 80,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderAlpha40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryAlpha10, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 }}>
              Order Receipt
            </Text>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 12 }}>
              #{receiptNumber}
            </Text>
          </View>
        </View>
        <Pressable style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="options-outline" size={16} color={COLORS.primary} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, flex: 1, paddingTop: 12 }}>
        <OrderTypeTabs value={orderType} onChange={setOrderType} />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Customer
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderAlpha60, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surfaceAlpha50, gap: 8 }}>
              <Ionicons name="person-outline" size={16} color="#8A8A8A" />
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Name"
                placeholderTextColor="#A0A0A0"
                style={{ flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: 12, padding: 0 }}
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              Table
            </Text>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.borderAlpha60, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surfaceAlpha50 }}>
              <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: 12 }} numberOfLines={1}>
                {tableRef || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#8A8A8A" />
            </Pressable>
          </View>
        </View>

        <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14, marginTop: 16, marginBottom: 4 }}>
          Items ({items.length})
        </Text>

        {items.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceAlpha60, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="cart-outline" size={32} color="#8A8A8A" />
            </View>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: 14 }}>
              Your order is empty
            </Text>
            <Text style={{ color: COLORS.textMutedAlpha60, fontFamily: FONTS.regular, fontSize: 12, marginTop: 2, textAlign: 'center' }}>
              Select items from the menu to build an order
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

        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.borderAlpha50, paddingTop: 12, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 12 }}>Subtotal</Text>
            <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.semiBold, fontSize: 12 }}>
              {fmt(sub)}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 12 }}>Discount</Text>
              <Text style={{ color: COLORS.success, fontFamily: FONTS.semiBold, fontSize: 12 }}>
                − {fmt(discountAmount)}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: COLORS.borderAlpha50, marginTop: 4 }}>
            <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 14 }}>Total Payable</Text>
            <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16 }}>
              {fmt(tot)}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        disabled={items.length === 0}
        style={({ pressed }) => ({
          marginHorizontal: 20,
          marginBottom: 20,
          marginTop: 16,
          borderRadius: 9999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: items.length === 0 ? "red" : "blue",
          opacity: pressed ? 0.85 : 1,
          shadowColor: items.length === 0 ? 'transparent' : COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: items.length === 0 ? 0 : 4,
          borderColor: COLORS.primary

        })}
      >
        <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16, textAlign: "center" }}>
          Place Order
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: COLORS.white, fontFamily: FONTS.bold, fontSize: 16 }}>
            {fmt(tot)}
          </Text>
          <Ionicons name="arrow-forward-circle" size={24} color={COLORS.white} />
        </View>
      </Pressable>
    </View>
  );
}

// ─── Main FOH Screen ──────────────────────────────────────────────────────────
export default function FOHScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Wait for Expo Router's navigation container to be fully initialized
  const rootState = useRootNavigationState();
  const isNavReady = !!rootState?.key;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: menuData, isLoading } = useQuery<MenuWithCategories[]>({
    queryKey: ['menu'],
    queryFn: () => api.get('/menu'),
    staleTime: 1000 * 60 * 5,
  });

  const addItem = useCartStore((s) => s.addItem);

  // Auto-select first category
  React.useEffect(() => {
    if (menuData && menuData.length > 0 && !activeCategoryId) {
      setActiveCategoryId(menuData[0].category.id);
    }
  }, [menuData]);

  const activeSection = menuData?.find(
    (s: MenuWithCategories) => s.category.id === activeCategoryId
  ) ?? menuData?.[0];

  const filteredItems = (activeSection?.items ?? []).filter((item: MenuItem) =>
    item.name.toLowerCase().includes(search.toLowerCase())
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
      {/* Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderWidth: 1, borderColor: COLORS.borderAlpha60, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
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
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 24, marginRight: 12, minWidth: 145, height: 96, borderWidth: 1, borderColor: COLORS.borderAlpha40 }}
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
        renderItem={({ item }) => (
          <MenuItemCard item={item} onAdd={handleAddItem} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceAlpha60, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="ice-cream-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.bold, fontSize: 16 }}>
              {isLoading ? 'Loading Menu...' : 'No Shakes Found'}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 12, marginTop: 4 }}>
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
      {isNavReady && (
        isTablet ? (
          <View style={{ flex: 1, flexDirection: 'row', padding: 16, gap: 16 }}>
            <View style={{ flex: 0.65 }}>{MenuPanel}</View>
            <View style={{ flex: 0.35 }}>
              <CartPanel receiptNumber={receiptNumber} />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>{MenuPanel}</View>
        )
      )}
    </View>
  );
}
