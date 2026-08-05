import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import type { MenuWithCategories, MenuItem, RecipeItem } from '@frozen-shake/shared';
import { useToastStore } from '../../store/toast';
import { fmt } from '../../components/common/constants';
import { AddMenuItemModal } from '../../components/menu/AddMenuItemModal';
import { EditMenuItemModal } from '../../components/menu/EditMenuItemModal';

// ─── Main Menu Management Screen ──────────────────────────────────────────────
export default function MenuManagementScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<(MenuItem & { categoryName: string }) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: menuData,
    isLoading,
    refetch,
  } = useQuery<MenuWithCategories[]>({
    queryKey: ['menu'],
    queryFn: () => api.get('/menu'),
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const categoriesList = menuData?.map((m) => ({ id: m.category.id, name: m.category.name })) ?? [];

  const allItemsWithCategory = React.useMemo(() => {
    if (!menuData) return [];
    const items: Array<MenuItem & { categoryName: string }> = [];
    menuData.forEach((section) => {
      section.items.forEach((item) => {
        items.push({ ...item, categoryName: section.category.name });
      });
    });
    return items;
  }, [menuData]);

  const filteredItems = allItemsWithCategory.filter((item) => {
    const matchesCategory =
      activeCategoryFilter === 'ALL' || item.categoryId === activeCategoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await api.patch(`/menu/items/${item.id}/toggle`, {});
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
      refetch();
      useToastStore.getState().showToast(`Availability for "${item.name}" updated`, 'success');
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to toggle availability', 'error');
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    Alert.alert('Delete Menu Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(item.id);
            await api.delete(`/menu/items/${item.id}`);
            await queryClient.invalidateQueries({ queryKey: ['menu'] });
            refetch();
            useToastStore.getState().showToast(`"${item.name}" has been deleted.`, 'success');
          } catch (err: any) {
            useToastStore
              .getState()
              .showToast(err.message || 'Failed to delete menu item', 'error');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const invalidateAndRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['menu'] });
    refetch();
  };

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-3">
        <View>
          <Text className="text-text-primary font-sans-bold text-2xl">Menu Items</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">
            Manage items & ingredient recipes
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            className="flex-row items-center px-3.5 py-2 rounded-xl gap-1"
            style={{ backgroundColor: '#1B4332' }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text className="text-white font-sans-semibold text-xs">Add Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => refetch()}
            className="w-9 h-9 rounded-full bg-surface items-center justify-center border border-border/40"
          >
            <Ionicons name="refresh" size={18} color="#1B4332" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-surface border border-border/60 rounded-2xl px-4 py-2.5 mb-3 gap-2.5">
        <Ionicons name="search-outline" size={18} color="#8A8A8A" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search menu items..."
          placeholderTextColor="#8A8A8A"
          className="flex-1 text-text-primary font-sans text-xs p-0"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#8A8A8A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4 flex-row max-h-10"
      >
        <TouchableOpacity
          onPress={() => setActiveCategoryFilter('ALL')}
          className="px-4 py-2 rounded-xl border mr-2"
          style={
            activeCategoryFilter === 'ALL'
              ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
              : { borderColor: '#E5E7EB' }
          }
        >
          <Text
            className="font-sans-medium text-xs"
            style={{ color: activeCategoryFilter === 'ALL' ? '#fff' : '#1A1A1A' }}
          >
            All Categories
          </Text>
        </TouchableOpacity>

        {categoriesList.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setActiveCategoryFilter(cat.id)}
            className="px-4 py-2 rounded-xl border mr-2"
            style={
              activeCategoryFilter === cat.id
                ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
                : { borderColor: '#E5E7EB' }
            }
          >
            <Text
              className="font-sans-medium text-xs"
              style={{ color: activeCategoryFilter === cat.id ? '#fff' : '#1A1A1A' }}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading menu items...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <View
                key={item.id}
                className="bg-white rounded-3xl p-4 mb-3.5 border border-border/60 shadow-sm"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                {/* Header row */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-text-primary font-sans-bold text-base">
                        {item.name}
                      </Text>
                      <View className="bg-surface border border-border/60 rounded-full px-2.5 py-0.5">
                        <Text className="text-text-muted text-[10px] font-sans-medium">
                          {item.categoryName}
                        </Text>
                      </View>
                    </View>
                    {item.description ? (
                      <Text className="text-text-muted font-sans text-xs mt-1">
                        {item.description}
                      </Text>
                    ) : null}
                  </View>

                  <View className="items-end gap-1">
                    <Text className="font-sans-bold text-base" style={{ color: '#1B4332' }}>
                      {fmt(item.sellingPrice)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleToggleAvailability(item)}
                      className={`px-2 py-0.5 rounded-full border ${
                        item.isAvailable
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-rose-50 border-rose-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-sans-semibold ${
                          item.isAvailable ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Out of Stock'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ingredients section */}
                <View className="mt-2 pt-3 border-t border-border/40 bg-surface/40 rounded-2xl p-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="nutrition-outline" size={14} color="#1B4332" />
                      <Text className="text-text-primary font-sans-bold text-xs">
                        Ingredients Used:
                      </Text>
                    </View>
                    <Text className="text-text-muted font-sans text-[10px]">
                      {item.recipes && item.recipes.length > 0
                        ? `${item.recipes.length} ingredient${item.recipes.length > 1 ? 's' : ''}`
                        : 'None'}
                    </Text>
                  </View>

                  {item.recipes && item.recipes.length > 0 ? (
                    <View className="flex-row flex-wrap gap-1.5 mt-1">
                      {item.recipes.map((rec: RecipeItem, idx: number) => (
                        <View
                          key={idx}
                          className="bg-white border border-border/80 rounded-xl px-2.5 py-1.5 flex-row items-center gap-1"
                        >
                          <Text className="text-text-primary font-sans-semibold text-xs">
                            {rec.ingredientName}:
                          </Text>
                          <Text className="font-sans-bold text-xs" style={{ color: '#1B4332' }}>
                            {rec.quantity} {rec.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-text-muted font-sans italic text-[11px]">
                      No linked inventory ingredients.
                    </Text>
                  )}
                </View>

                {/* Action buttons */}
                <View className="flex-row items-center justify-end gap-2 mt-3 pt-2">
                  {/* Edit */}
                  <TouchableOpacity
                    onPress={() => setEditItem(item)}
                    className="flex-row items-center bg-surface border border-border/60 px-3 py-1.5 rounded-xl gap-1"
                  >
                    <Ionicons name="pencil-outline" size={14} color="#1B4332" />
                    <Text className="font-sans-semibold text-xs" style={{ color: '#1B4332' }}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item)}
                    disabled={deletingId === item.id}
                    className="flex-row items-center bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl gap-1"
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text className="text-rose-600 font-sans-semibold text-xs">Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="restaurant-outline" size={48} color="#8A8A8A" />
              <Text className="text-text-muted font-sans-medium text-sm mt-2">
                No menu items found
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Modal */}
      <AddMenuItemModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        categories={categoriesList}
        onSuccess={invalidateAndRefetch}
      />

      {/* Edit Modal */}
      <EditMenuItemModal
        item={editItem}
        visible={!!editItem}
        onClose={() => setEditItem(null)}
        categories={categoriesList}
        onSuccess={invalidateAndRefetch}
      />
    </View>
  );
}
