import React, { useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, StatusBar, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState } from 'expo-router';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
import { useToastStore } from '../../store/toast';
import type { MenuWithCategories, MenuItem } from '@frozen-shake/shared';
import { TopLogoHeader } from '../../components/common/TopLogoHeader';
import { CategoryCard } from '../../components/pos/CategoryCard';
import { MenuItemCard } from '../../components/pos/MenuItemCard';
import { CartPanel } from '../../components/pos/CartPanel';
import { AddMenuItemModal } from '../../components/pos/AddMenuItemModal';

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

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
      await refetchMenu();
      useToastStore.getState().showToast('Menu updated!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast('Failed to refresh menu', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const receiptNumber = String(Math.floor(Math.random() * 90000) + 10000);

  const MenuPanel = (
    <View className="flex-1 overflow-hidden">
      {/* Category Cards Horizontal Scroll Section */}
      <View className="pt-1 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pl-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className="bg-white/80 rounded-[20px] mr-2.5 min-w-[135px] h-[86px] border border-[#E5E0D8]"
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
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40 }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <MenuItemCard item={item} onAdd={handleAddItem} />}
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

      {/* Top Header: Logo left, Live Date & Time, Top-Right Refresh Button */}
      <TopLogoHeader onRefresh={handleManualRefresh} isRefreshing={isRefreshing} />

      {/* Main Content Area */}
      {isNavReady &&
        (isTablet ? (
          <View className="flex-1 flex-row p-4 gap-4">
            <View className="flex-[0.68]">{MenuPanel}</View>
            <View className="flex-[0.32]">
              <CartPanel receiptNumber={receiptNumber} />
            </View>
          </View>
        ) : (
          <View className="flex-1 mt-1 px-2">{MenuPanel}</View>
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
