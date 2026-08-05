import React, { useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, StatusBar, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRootNavigationState } from 'expo-router';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cart';
import type { MenuWithCategories, MenuItem } from '@frozen-shake/shared';
import { COLORS, FONTS } from '../../components/common/constants';
import { TopLogoHeader } from '../../components/common/TopLogoHeader';
import { CategoryCard } from '../../components/pos/CategoryCard';
import { MenuItemCard } from '../../components/pos/MenuItemCard';
import { CartPanel } from '../../components/pos/CartPanel';
import { AddMenuItemModal } from '../../components/pos/AddMenuItemModal';

// ─── Main FOH / POS Screen ──────────────────────────────────────────────────────────
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

      {/* Top Logo Header */}
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
