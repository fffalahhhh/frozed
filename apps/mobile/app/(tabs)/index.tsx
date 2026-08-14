import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  FlatList,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

import { getLocalCategories, getLocalMenuItems, getLocalInventory } from '../../lib/db';

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

  // Small screen cart drawer state & slide animation
  const [isCartOpen, setIsCartOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCartOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCartOpen, slideAnim, backdropAnim]);

  const handleCloseCart = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsCartOpen(false);
    });
  };

  const {
    data: menuData,
    isLoading,
    refetch: refetchMenu,
  } = useQuery<MenuWithCategories[]>({
    queryKey: ['menu'],
    queryFn: async () => {
      try {
        const remote = await api.get<MenuWithCategories[]>('/menu');
        return remote;
      } catch (e) {
        const cats = getLocalCategories();
        const items = getLocalMenuItems();
        return cats.map((c) => ({
          category: c,
          items: items.filter((i) => i.categoryId === c.id),
          needsRestock: false,
        }));
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Query inventory stock items for real-time menu availability calculation
  const { data: stockItems } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: async () => {
      try {
        return await api.get('/inventory');
      } catch (e) {
        return getLocalInventory();
      }
    },
    staleTime: 1000 * 30,
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

  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

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
    if (!preOrder) return;
    clearCart();
    setCustomerName(preOrder.customerName || '');
    setCustomerPhone(preOrder.customerPhone || '');
    setPaymentMethod((preOrder.paymentMethod as any) || 'cash');

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
      if (preOrder.id && !String(preOrder.id).startsWith('temp-')) {
        await api.delete(`/pre-orders/${preOrder.id}`);
      }
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
      <View className="pt-1 pb-2 flex-row items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1 pl-1"
          contentContainerStyle={{ paddingRight: 12 }}
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

        {/* Small Screen Cart Toggle Button */}
        {!isTablet && (
          <Pressable
            onPress={() => setIsCartOpen(true)}
            className="flex-row items-center gap-1.5 bg-[#0D4830] px-3.5 py-2.5 rounded-[18px] border border-[#0D4830] shadow-sm elevation-2 mr-1"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View className="relative">
              <Ionicons name="cart" size={18} color="#FFFFFF" />
              {totalCartItems > 0 && (
                <View className="absolute -top-2 -right-2.5 bg-amber-500 rounded-full px-1.5 py-0.2 border border-white">
                  <Text className="text-white font-sans-bold text-[9px]">
                    {totalCartItems > 99 ? '99+' : totalCartItems}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-white font-sans-bold text-xs">Cart</Text>
          </Pressable>
        )}
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

      {/* Mobile Cart Panel Drawer (Slide-in from Right Side) */}
      {!isTablet && isCartOpen && (
        <Modal
          transparent
          visible={isCartOpen}
          onRequestClose={handleCloseCart}
          animationType="none"
        >
          <View className="flex-1 flex-row justify-end">
            {/* Semi-transparent Backdrop */}
            <Animated.View
              style={{ opacity: backdropAnim }}
              className="absolute inset-0 bg-black/50"
            >
              <Pressable className="flex-1" onPress={handleCloseCart} />
            </Animated.View>

            {/* Slide-in Cart Drawer Panel from Right Side */}
            <Animated.View
              style={{
                transform: [{ translateX: slideAnim }],
                width: Math.min(width * 0.9, 400),
              }}
              className="h-full bg-[#F4F1EA] shadow-2xl z-50 p-2"
            >
              <SafeAreaView className="flex-1" edges={['top', 'bottom', 'right']}>
                <CartPanel onClose={handleCloseCart} />
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>
      )}

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
