import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  FlatList,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
import type { MenuWithCategories, MenuItem, OrderType } from '@frozen-shake/shared';

// ─── Format currency ─────────────────────────────────────────────────────────
const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(0)}`;

// ─── Top Center Logo Header ──────────────────────────────────────────────────
function TopLogoHeader() {
  return (
    <SafeAreaView className="bg-white border-b border-border/40">
      <View className="items-center justify-center py-2">
        <Image
          source={require('../../assets/logo.png')}
          className="w-16 h-16"
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
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-3xl px-4 py-3.5 mr-3 min-w-[145px] h-[96px] justify-between border ${
        isActive
          ? 'bg-primary border-primary shadow-lg shadow-primary/30'
          : 'bg-white/90 border-border/60 shadow-sm'
      }`}
      activeOpacity={0.85}
      style={
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
            }
      }
    >
      {/* Badge */}
      {needsRestock ? (
        <View className="self-start bg-warning/10 border border-warning/30 rounded-full px-2.5 py-0.5 flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={12} color="#F97316" />
          <Text className="text-warning text-[10px] font-sans-semibold">
            Re-stock
          </Text>
        </View>
      ) : (
        <View
          className={`self-start rounded-full px-2.5 py-0.5 flex-row items-center gap-1 ${
            isActive ? 'bg-white/20' : 'bg-success-bg border border-primary/10'
          }`}
        >
          <Ionicons
            name="checkmark-circle"
            size={12}
            color={isActive ? '#FFFFFF' : '#1B4332'}
          />
          <Text
            className={`text-[10px] font-sans-semibold ${
              isActive ? 'text-white' : 'text-primary'
            }`}
          >
            Available
          </Text>
        </View>
      )}

      {/* Title & Count */}
      <View>
        <Text
          className={`font-sans-bold text-base leading-tight ${
            isActive ? 'text-white' : 'text-text-primary'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className={`font-sans text-xs mt-0.5 ${
            isActive ? 'text-white/75' : 'text-text-muted'
          }`}
        >
          {itemCount} Items
        </Text>
      </View>
    </TouchableOpacity>
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
    <TouchableOpacity
      onPress={() => onAdd(item)}
      className="bg-white/95 rounded-3xl p-3.5 m-1.5 flex-1 min-w-[140px] max-w-[185px] border border-border/50 justify-between"
      activeOpacity={0.85}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Item Image or Graphic */}
      <View className="items-center justify-center h-24 mb-2 bg-surface/40 rounded-2xl p-2">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-20 h-20"
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="nutrition-outline" size={44} color="#1B4332" />
        )}
      </View>

      {/* Item Name & Price */}
      <View>
        <Text
          className="text-text-primary font-sans-bold text-sm leading-snug"
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-primary font-sans-bold text-base">
            {fmt(item.sellingPrice)}
          </Text>

          <TouchableOpacity
            onPress={() => onAdd(item)}
            className="w-8 h-8 rounded-full bg-primary items-center justify-center shadow-md shadow-primary/40"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
    <View className="flex-row bg-surface/80 rounded-2xl p-1 gap-1 border border-border/40">
      {ORDER_TYPES.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onChange(t.key)}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            value === t.key ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
          activeOpacity={0.8}
        >
          <Ionicons
            name={t.icon}
            size={15}
            color={value === t.key ? '#FFFFFF' : '#8A8A8A'}
          />
          <Text
            className={`font-sans-semibold text-xs ${
              value === t.key ? 'text-white' : 'text-text-muted'
            }`}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
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
    <View className="flex-row items-center gap-3 py-3 border-b border-border/40">
      <View className="w-12 h-12 rounded-2xl bg-surface/60 items-center justify-center border border-border/40">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-9 h-9"
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="cafe-outline" size={24} color="#1B4332" />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text className="text-text-primary font-sans-bold text-sm flex-1 pr-1" numberOfLines={1}>
            {item.menuItemName}
          </Text>
          <Text className="text-primary font-sans-bold text-sm">
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        {item.flavourName && (
          <Text className="text-text-muted font-sans text-xs mt-0.5">
            Flavor: {item.flavourName}
          </Text>
        )}

        <View className="flex-row items-center mt-2 gap-2.5">
          <TouchableOpacity onPress={onDecrease} activeOpacity={0.7}>
            <Ionicons name="remove-circle-outline" size={22} color="#8A8A8A" />
          </TouchableOpacity>
          <Text className="text-text-primary font-sans-bold text-sm min-w-[16px] text-center">
            {item.quantity}
          </Text>
          <TouchableOpacity onPress={onIncrease} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={22} color="#1B4332" />
          </TouchableOpacity>
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
      className="bg-white/95 rounded-3xl flex-1 border border-border/50 mb-20"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
      }}
    >
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Ionicons name="receipt-outline" size={18} color="#1B4332" />
          </View>
          <View>
            <Text className="text-text-primary font-sans-bold text-sm leading-tight">
              Order Receipt
            </Text>
            <Text className="text-text-muted font-sans text-xs">
              #{receiptNumber}
            </Text>
          </View>
        </View>
        <TouchableOpacity className="w-8 h-8 rounded-full bg-surface items-center justify-center">
          <Ionicons name="options-outline" size={16} color="#1B4332" />
        </TouchableOpacity>
      </View>

      <View className="px-5 flex-1 pt-3">
        <OrderTypeTabs value={orderType} onChange={setOrderType} />

        <View className="flex-row gap-3 mt-3">
          <View className="flex-1">
            <Text className="text-text-muted font-sans-medium text-[11px] uppercase tracking-wider mb-1">
              Customer
            </Text>
            <View className="flex-row items-center border border-border/60 rounded-2xl px-3 py-2 bg-surface/50 gap-2">
              <Ionicons name="person-outline" size={16} color="#8A8A8A" />
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Name"
                placeholderTextColor="#A0A0A0"
                className="flex-1 text-text-primary font-sans text-xs p-0"
              />
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-text-muted font-sans-medium text-[11px] uppercase tracking-wider mb-1">
              Table
            </Text>
            <TouchableOpacity className="flex-row items-center justify-between border border-border/60 rounded-2xl px-3 py-2 bg-surface/50">
              <Text className="text-text-primary font-sans text-xs" numberOfLines={1}>
                {tableRef || 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#8A8A8A" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-text-primary font-sans-bold text-sm mt-4 mb-1">
          Items ({items.length})
        </Text>

        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-10">
            <View className="w-16 h-16 rounded-full bg-surface/60 items-center justify-center mb-3">
              <Ionicons name="cart-outline" size={32} color="#8A8A8A" />
            </View>
            <Text className="text-text-muted font-sans-medium text-sm">
              Your order is empty
            </Text>
            <Text className="text-text-muted/60 font-sans text-xs mt-0.5 text-center">
              Select items from the menu to build an order
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

        <View className="border-t border-border/50 pt-3 mt-2">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-text-muted font-sans text-xs">Subtotal</Text>
            <Text className="text-text-primary font-sans-semibold text-xs">
              {fmt(sub)}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-text-muted font-sans text-xs">Discount</Text>
              <Text className="text-success font-sans-semibold text-xs">
                − {fmt(discountAmount)}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between pt-1 border-t border-dashed border-border/50 mt-1">
            <Text className="text-text-primary font-sans-bold text-sm">Total Payable</Text>
            <Text className="text-primary font-sans-bold text-base">
              {fmt(tot)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        disabled={items.length === 0}
        className={`mx-5 mb-5 mt-4 rounded-full flex-row items-center justify-between px-5 py-3.5 ${
          items.length === 0
            ? 'bg-primary/40'
            : 'bg-primary shadow-lg shadow-primary/30'
        }`}
        activeOpacity={0.85}
      >
        <Text className="text-white font-sans-bold text-base">
          Place Order
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-sans-bold text-base">
            {fmt(tot)}
          </Text>
          <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main FOH Screen ──────────────────────────────────────────────────────────
export default function FOHScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

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
  );

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
    <View className="flex-1 pb-24">
      {/* Search Bar */}
      <View className="flex-row items-center bg-white/90 border border-border/60 rounded-3xl px-4 py-3 mx-4 mt-3 mb-4 gap-2.5 shadow-sm">
        <Ionicons name="search-outline" size={20} color="#8A8A8A" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search fruit shakes, juices..."
          placeholderTextColor="#8A8A8A"
          className="flex-1 text-text-primary font-sans text-sm p-0"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#8A8A8A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {isLoading
          ? [1, 2, 3].map((i) => (
              <View
                key={i}
                className="bg-white/60 rounded-3xl mr-3 min-w-[145px] h-[96px] border border-border/40"
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
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-surface/60 items-center justify-center mb-3">
              <Ionicons name="ice-cream-outline" size={40} color="#1B4332" />
            </View>
            <Text className="text-text-primary font-sans-bold text-base">
              {isLoading ? 'Loading Menu...' : 'No Shakes Found'}
            </Text>
            <Text className="text-text-muted font-sans text-xs mt-1">
              {isLoading ? 'Fetching delicious items...' : 'Try adjusting your search'}
            </Text>
          </View>
        }
      />
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Logo placed at the top side */}
      <TopLogoHeader />

      {/* Main Content Layout */}
      {isTablet ? (
        <View className="flex-1 flex-row p-4 gap-4">
          <View style={{ flex: 0.65 }}>{MenuPanel}</View>
          <View style={{ flex: 0.35 }}>
            <CartPanel receiptNumber={receiptNumber} />
          </View>
        </View>
      ) : (
        <View className="flex-1">{MenuPanel}</View>
      )}
    </View>
  );
}
