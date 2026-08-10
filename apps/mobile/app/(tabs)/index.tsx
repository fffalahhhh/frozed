import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions, StatusBar, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState } from 'expo-router';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
import { getItemStockInfo } from '../../lib/stock';
import type { MenuWithCategories, MenuItem } from '@frozen-shake/shared';
import { TopLogoHeader } from '../../components/common/TopLogoHeader';
import { CategoryCard } from '../../components/pos/CategoryCard';
import { MenuItemCard } from '../../components/pos/MenuItemCard';
import { CartPanel } from '../../components/pos/CartPanel';
import { AddMenuItemModal } from '../../components/pos/AddMenuItemModal';
import { PendingPreOrdersBar } from '../../components/pos/PendingPreOrdersBar/PendingPreOrdersBar';

// ─── Main POS Screen ──────────────────────────────────────────────────────────
export default function FOHScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const queryClient = useQueryClient();

  const rootState = useRootNavigationState();
  const isNavReady = !!rootState?.key;

  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [addMenuModalVisible, setAddMenuModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreOrders, setShowPreOrders] = useState(true);

  const {
    data: menuData,
    isLoading,
    refetch: refetchMenu,
  } = useQuery<MenuWithCategories[]>({
    queryKey: ['menu'],
    queryFn: () => api.get('/menu'),
    staleTime: 1000 * 60 * 5,
  });

  // Query inventory stock items for real-time menu availability calculation
  const { data: stockItems } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
    staleTime: 1000 * 5,
  });

  // Query pending pre-orders count for the top-right header toggle badge
  const { data: preOrdersData } = useQuery<any[]>({
    queryKey: ['pre-orders'],
    queryFn: () => api.get('/pre-orders'),
    staleTime: 1000 * 4,
  });

  const pendingPreOrdersCount = Array.isArray(preOrdersData) ? preOrdersData.length : 0;

  // Auto-open pre-orders drawer whenever a new pre-order is saved
  useEffect(() => {
    if (pendingPreOrdersCount > 0) {
      setShowPreOrders(true);
    }
  }, [pendingPreOrdersCount]);

  const categoriesList = menuData?.map((m) => ({ id: m.category.id, name: m.category.name })) ?? [];

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const setCustomerPhone = useCartStore((s) => s.setCustomerPhone);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);

  // Compute all menu items across all categories
  const allItems: MenuItem[] = React.useMemo(() => {
    if (!menuData) return [];
    return menuData.flatMap((section) => section.items);
  }, [menuData]);

  // Active items: if 'ALL', show all items; else filter by category
  const currentItems: MenuItem[] = React.useMemo(() => {
    if (!menuData) return [];
    if (activeCategoryId === 'ALL') return allItems;
    const activeSection = menuData.find((s) => s.category.id === activeCategoryId);
    return activeSection?.items ?? [];
  }, [menuData, activeCategoryId, allItems]);

  function handleAddItem(item: MenuItem, maxAvailable?: number) {
    addItem(
      {
        menuItemId: item.id,
        menuItemName: item.name,
        imageUrl: item.imageUrl,
        flavourId: null,
        flavourName: null,
        quantity: 1,
        unitPrice: parseFloat(item.sellingPrice),
        notes: null,
      },
      maxAvailable,
    );
  }

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['menu'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['pre-orders'] }),
      ]);
      useToastStore.getState().showToast('Menu updated!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast('Failed to refresh menu', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  async function handleProcessPreOrder(preOrder: any) {
    // Optimistic UI mutation: transfer items and remove card immediately in 0ms
    clearCart();
    if (preOrder.customerName) setCustomerName(preOrder.customerName);
    if (preOrder.customerPhone) setCustomerPhone(preOrder.customerPhone);
    if (preOrder.paymentMethod) setPaymentMethod(preOrder.paymentMethod);

    if (Array.isArray(preOrder.items)) {
      for (const item of preOrder.items) {
        addItem({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          imageUrl: item.imageUrl,
          flavourId: item.flavourId || null,
          flavourName: item.flavourName || null,
          quantity: item.quantity || 1,
          unitPrice: parseFloat(String(item.unitPrice || 0)),
          notes: item.notes || null,
        });
      }
    }

    const previousPreOrders = queryClient.getQueryData<any[]>(['pre-orders']);
    queryClient.setQueryData<any[]>(['pre-orders'], (old) =>
      Array.isArray(old) ? old.filter((i) => i.id !== preOrder.id) : [],
    );

    useToastStore.getState().showToast('Pre-order loaded into Cart!', 'success');

    // Silent background sync
    try {
      await api.delete(`/pre-orders/${preOrder.id}`);
      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
    } catch (err: any) {
      if (previousPreOrders) {
        queryClient.setQueryData(['pre-orders'], previousPreOrders);
      }
      useToastStore.getState().showToast('Failed to process pre-order', 'error');
    }
  }

  const MenuPanel = (
    <View className="flex-1 overflow-hidden">
      {/* Category Cards Horizontal Scroll Section */}
      <View className="pt-1 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pl-1"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className="bg-white/80 rounded-[18px] mr-2 min-w-[125px] h-[84px] border border-[#E5E0D8]"
              />
            ))
          ) : (
            <>
              {/* 'All' Category Option */}
              <CategoryCard
                key="ALL"
                name="All"
                itemCount={allItems.length}
                isActive={activeCategoryId === 'ALL'}
                needsRestock={false}
                onPress={() => setActiveCategoryId('ALL')}
              />

              {/* Individual Categories */}
              {menuData?.map((section: MenuWithCategories) => (
                <CategoryCard
                  key={section.category.id}
                  name={section.category.name}
                  itemCount={section.items.length}
                  isActive={activeCategoryId === section.category.id}
                  needsRestock={section.needsRestock}
                  onPress={() => setActiveCategoryId(section.category.id)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>

      {/* Menu Items Grid: Flex-bounded scroll area */}
      <View className="flex-1 mt-1">
        <FlatList
          key={isTablet ? 'grid-4' : 'grid-2'}
          data={currentItems}
          keyExtractor={(i) => i.id}
          numColumns={isTablet ? 4 : 2}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const stockInfo = getItemStockInfo(item, allItems, stockItems || [], cartItems);
            const cartQty = cartItems
              .filter((ci) => ci.menuItemId === item.id)
              .reduce((s, ci) => s + ci.quantity, 0);

            return (
              <MenuItemCard
                item={item}
                stockInfo={stockInfo}
                cartQuantity={cartQty}
                onAdd={() => handleAddItem(item, stockInfo.maxAvailable)}
              />
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 w-full">
              <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-3 shadow-sm border border-[#E5E0D8]">
                <Ionicons name="ice-cream-outline" size={40} color="#0D4830" />
              </View>
              <Text className="text-gray-900 font-sans-bold text-base">
                {isLoading ? 'Loading Menu...' : 'No Items Found'}
              </Text>
              <Text className="text-gray-500 font-sans text-xs mt-1">
                {isLoading ? 'Fetching delicious items...' : 'No items in this category'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F4F1EA]">
      <StatusBar barStyle="dark-content" backgroundColor="#F4F1EA" />

      {/* Top Header: Logo left, Live Date & Time, Top-Right Pre-Orders Toggle & Refresh Button */}
      <TopLogoHeader
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        pendingCount={pendingPreOrdersCount}
        showPreOrders={showPreOrders}
        onTogglePreOrders={() => setShowPreOrders((prev) => !prev)}
      />

      {/* Main Content Area */}
      {isNavReady &&
        (isTablet ? (
          <View className="flex-1 flex-row p-4 gap-4">
            <View className="flex-1">{MenuPanel}</View>

            {/* Vertical Pending Pre-Orders Panel attached to the LEFT side of Cart Panel */}
            {showPreOrders && pendingPreOrdersCount > 0 && (
              <PendingPreOrdersBar
                visible={showPreOrders}
                onProcessPreOrder={handleProcessPreOrder}
              />
            )}

            <View className="w-[30%]">
              <CartPanel />
            </View>
          </View>
        ) : (
          <View className="flex-1 mt-1 px-2">
            {MenuPanel}
            {showPreOrders && pendingPreOrdersCount > 0 && (
              <View className="mt-2">
                <PendingPreOrdersBar
                  visible={showPreOrders}
                  onProcessPreOrder={handleProcessPreOrder}
                />
              </View>
            )}
          </View>
        ))}

      {/* Add Menu Item Modal */}
      <AddMenuItemModal
        visible={addMenuModalVisible}
        onClose={() => setAddMenuModalVisible(false)}
        categories={categoriesList}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['menu'] });
        }}
      />
    </View>
  );
}
