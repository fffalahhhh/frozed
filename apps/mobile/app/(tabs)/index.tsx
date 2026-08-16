import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState, useFocusEffect } from 'expo-router';
import { apolloClient } from '../../lib/graphqlClient';
import { GET_MENU, GET_PRE_ORDERS, DELETE_PRE_ORDER } from '../../lib/queries';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
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
    data: menuQueryResult,
    loading: isLoading,
    refetch: refetchMenu,
  } = useQuery(GET_MENU, {
    fetchPolicy: 'cache-and-network',
  });

  const menuData: MenuWithCategories[] = menuQueryResult?.menu || [];

  useFocusEffect(
    useCallback(() => {
      refetchMenu();
    }, [refetchMenu]),
  );

  const { data: preOrdersQueryResult } = useQuery(GET_PRE_ORDERS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  });

  const preOrdersData = preOrdersQueryResult?.preOrders || [];
  const pendingPreOrdersCount = Array.isArray(preOrdersData) ? preOrdersData.length : 0;

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

  const allItems: MenuItem[] = React.useMemo(() => {
    if (!menuData) return [];
    return menuData.flatMap((section) => section.items);
  }, [menuData]);

  const currentItems: MenuItem[] = React.useMemo(() => {
    if (!menuData) return [];
    if (activeCategoryId === 'ALL') return allItems;
    const activeSection = menuData.find((s) => s.category.id === activeCategoryId);
    return activeSection?.items ?? [];
  }, [menuData, activeCategoryId, allItems]);

  const handleAddItem = (item: MenuItem, maxAvailable: number) => {
    const cartQty = cartItems
      .filter((ci) => ci.menuItemId === item.id)
      .reduce((s, ci) => s + ci.quantity, 0);

    if (cartQty >= maxAvailable) {
      useToastStore
        .getState()
        .showToast(`Max stock portion limit reached for "${item.name}"`, 'error');
      return;
    }

    addItem({
      menuItemId: item.id,
      menuItemName: item.name,
      imageUrl: item.imageUrl,
      flavourId: item.flavours && item.flavours.length > 0 ? item.flavours[0].flavourId : null,
      flavourName: item.flavours && item.flavours.length > 0 ? item.flavours[0].flavourName : null,
      quantity: 1,
      unitPrice: parseFloat(item.sellingPrice),
      notes: null,
    });
  };

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetchMenu();
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

    let itemsList: any[] = [];
    if (Array.isArray(preOrder.items)) {
      itemsList = preOrder.items;
    } else if (typeof preOrder.items === 'string') {
      try {
        itemsList = JSON.parse(preOrder.items);
      } catch {
        itemsList = [];
      }
    }

    for (const item of itemsList) {
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

    useToastStore.getState().showToast('Pre-order loaded into Cart!', 'success');

    try {
      if (preOrder.id && !String(preOrder.id).startsWith('temp-')) {
        await apolloClient.mutate({
          mutation: DELETE_PRE_ORDER,
          variables: { id: preOrder.id },
          refetchQueries: [{ query: GET_PRE_ORDERS }],
        });
      }
    } catch (err: any) {
      console.warn('[Process PreOrder] Delete error:', err?.message);
    }
  }

  const MenuPanel = (
    <View className="flex-1 overflow-hidden">
      {/* Category Cards Horizontal Scroll Section */}
      <View className="mb-2 border-b border-[#E5DCD0] pb-3 pt-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <CategoryCard
            name="All"
            itemCount={allItems.length}
            isActive={activeCategoryId === 'ALL'}
            needsRestock={false}
            onPress={() => setActiveCategoryId('ALL')}
          />
          {categoriesList.map((cat) => (
            <CategoryCard
              key={cat.id}
              name={cat.name}
              itemCount={menuData.find((s) => s.category.id === cat.id)?.items.length ?? 0}
              isActive={activeCategoryId === cat.id}
              needsRestock={menuData.find((s) => s.category.id === cat.id)?.needsRestock ?? false}
              onPress={() => setActiveCategoryId(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Menu Item Grid */}
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
            const stockInfo = {
              isAvailable: item.isAvailable,
              maxAvailable: item.maxAvailable ?? 999,
              remainingAvailable: item.maxAvailable ?? 999,
            };
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
              <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-3 shadow-sm border border-[#E5DCD0]">
                <Ionicons name="ice-cream-outline" size={40} color="#4A2810" />
              </View>
              <Text className="text-gray-900 font-sans-bold text-base">
                {isLoading ? 'Loading Menu...' : 'No Items Found'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );

  if (!isNavReady) return null;

  return (
    <View className="flex-1 bg-[#FAF7F2]">
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <TopLogoHeader
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        pendingCount={pendingPreOrdersCount}
        showPreOrders={showPreOrders}
        onTogglePreOrders={() => setShowPreOrders((v) => !v)}
      />

      {/* Main Split Layout */}
      <View className="flex-1 flex-row px-4 pt-1 pb-3 gap-3">
        {/* Left/Middle Column: Menu & Optional Pre-Orders Bar */}
        <View className="flex-1 flex-row gap-3">
          {MenuPanel}

          {/* Collapsible Pre-Orders Drawer Panel */}
          {showPreOrders && pendingPreOrdersCount > 0 && (
            <PendingPreOrdersBar
              onProcessPreOrder={handleProcessPreOrder}
              visible={showPreOrders}
            />
          )}
        </View>

        {/* Right Column: Persistent Cart Panel on Tablet/Desktop */}
        {isTablet && (
          <View className="w-96 h-full">
            <CartPanel />
          </View>
        )}
      </View>

      {/* Mobile Floating Cart Bar Button */}
      {!isTablet && totalCartItems > 0 && (
        <View className="absolute bottom-5 left-4 right-4 z-40">
          <Pressable
            onPress={() => setIsCartOpen(true)}
            className="bg-[#4A2810] rounded-2xl p-4 flex-row items-center justify-between shadow-xl active:bg-[#361908]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Text className="text-white font-sans-bold text-sm">{totalCartItems}</Text>
              </View>
              <Text className="text-white font-sans-bold text-base">View Order Cart</Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      )}

      {/* Small Screen Slide-over Cart Drawer Modal */}
      {!isTablet && isCartOpen && (
        <Modal
          visible={isCartOpen}
          transparent
          animationType="none"
          onRequestClose={handleCloseCart}
        >
          <View className="flex-1 flex-row">
            <Animated.View style={{ opacity: backdropAnim }} className="flex-1 bg-black/50">
              <Pressable className="flex-1" onPress={handleCloseCart} />
            </Animated.View>

            <Animated.View
              style={{ transform: [{ translateX: slideAnim }] }}
              className="h-full bg-[#F4EDE4] shadow-2xl z-50 p-2"
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
          refetchMenu();
        }}
      />
    </View>
  );
}
