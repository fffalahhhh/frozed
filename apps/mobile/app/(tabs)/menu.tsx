import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient } from '../../lib/graphqlClient';
import { GET_MENU, TOGGLE_MENU_ITEM, DELETE_MENU_ITEM } from '../../lib/queries';
import type { MenuWithCategories, MenuItem } from '@frozen-shake/shared';
import { useToastStore } from '../../store/toast';
import { fmt } from '../../components/common/constants';
import { AddMenuItemModal } from '../../components/menu/AddMenuItemModal';
import { EditMenuItemModal } from '../../components/menu/EditMenuItemModal';

function MenuItemThumbnail({ item }: { item: MenuItem }) {
  const [imgErr, setImgErr] = useState(false);
  const uri = item.imageUrl?.trim();

  if (uri && !imgErr) {
    return (
      <View className="w-9 h-9 rounded-xl bg-surface border border-border/60 overflow-hidden items-center justify-center mr-2.5">
        <Image
          source={{ uri }}
          className="w-9 h-9"
          resizeMode="cover"
          onError={() => setImgErr(true)}
        />
      </View>
    );
  }

  return (
    <View className="w-9 h-9 rounded-xl bg-surface border border-border/80 items-center justify-center mr-2.5">
      <Ionicons name="image-outline" size={16} color="#8A8A8A" />
    </View>
  );
}

export default function MenuManagementScreen() {
  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>(
    'ALL',
  );
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<(MenuItem & { categoryName: string }) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: menuQueryResult,
    loading: isLoading,
    refetch,
  } = useQuery(GET_MENU, {
    fetchPolicy: 'cache-and-network',
  });

  const menuData: MenuWithCategories[] = menuQueryResult?.menu || [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const categoriesList = React.useMemo(() => {
    if (menuData && menuData.length > 0) {
      return menuData.map((m) => ({ id: m.category.id, name: m.category.name }));
    }
    return [];
  }, [menuData]);

  const allItemsWithCategory = React.useMemo(() => {
    if (!menuData) return [];
    const items: Array<MenuItem & { categoryName: string }> = [];
    menuData.forEach((section) => {
      section.items.forEach((item) => {
        items.push({ ...item, categoryName: section.category.name });
      });
    });
    return items.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (tA !== tB && !isNaN(tA) && !isNaN(tB)) {
        return tB - tA;
      }
      return a.id.localeCompare(b.id);
    });
  }, [menuData]);

  const filteredItems = allItemsWithCategory.filter((item) => {
    const matchesCategory =
      activeCategoryFilter === 'ALL' || item.categoryId === activeCategoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());

    let matchesAvailability = true;
    if (availabilityFilter === 'AVAILABLE') {
      matchesAvailability = item.isAvailable;
    } else if (availabilityFilter === 'UNAVAILABLE') {
      matchesAvailability = !item.isAvailable;
    }

    return matchesCategory && matchesSearch && matchesAvailability;
  });

  const executeToggleAvailability = async (item: MenuItem) => {
    try {
      const nextAvailable = !item.isAvailable;
      await apolloClient.mutate({
        mutation: TOGGLE_MENU_ITEM,
        variables: { id: item.id },
        refetchQueries: [{ query: GET_MENU }],
      });

      useToastStore
        .getState()
        .showToast(
          `"${item.name}" marked as ${nextAvailable ? 'Available' : 'Unavailable'}`,
          'success',
        );
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to toggle availability', 'error');
    }
  };

  const handleToggleAvailability = (item: MenuItem) => {
    if (item.isAvailable) {
      Alert.alert(
        'Disable Menu Item',
        `Are you sure you want to mark "${item.name}" as unavailable?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => executeToggleAvailability(item),
          },
        ],
      );
    } else {
      executeToggleAvailability(item);
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
            await apolloClient.mutate({
              mutation: DELETE_MENU_ITEM,
              variables: { id: item.id },
              refetchQueries: [{ query: GET_MENU }],
            });
            refetch();
            useToastStore.getState().showToast(`"${item.name}" deleted`, 'success');
          } catch (err: any) {
            useToastStore.getState().showToast(err.message || 'Failed to delete item', 'error');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#FAF7F2] pt-12 px-5">
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
            style={{ backgroundColor: '#4A2810' }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text className="text-white font-sans-semibold text-xs">Add Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => refetch()}
            className="w-9 h-9 rounded-full bg-surface items-center justify-center border border-border/40"
          >
            <Ionicons name="refresh" size={18} color="#4A2810" />
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

      {/* Unified Horizontal Filter Pills Bar (Availability + Categories) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3.5 flex-row max-h-10"
      >
        {/* Availability Status Filters */}
        <TouchableOpacity
          onPress={() => setAvailabilityFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl border mr-1.5 flex-row items-center gap-1 ${
            availabilityFilter === 'ALL'
              ? 'bg-[#4A2810] border-[#4A2810]'
              : 'bg-surface border-border/60'
          }`}
        >
          <Text
            className={`font-sans-semibold text-xs ${
              availabilityFilter === 'ALL' ? 'text-white' : 'text-text-primary'
            }`}
          >
            All Status
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAvailabilityFilter('AVAILABLE')}
          className={`px-3 py-1.5 rounded-xl border mr-1.5 flex-row items-center gap-1 ${
            availabilityFilter === 'AVAILABLE'
              ? 'bg-emerald-700 border-emerald-700'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={13}
            color={availabilityFilter === 'AVAILABLE' ? '#FFF' : '#047857'}
          />
          <Text
            className={`font-sans-semibold text-xs ${
              availabilityFilter === 'AVAILABLE' ? 'text-white' : 'text-emerald-800'
            }`}
          >
            Available
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAvailabilityFilter('UNAVAILABLE')}
          className={`px-3 py-1.5 rounded-xl border mr-2 flex-row items-center gap-1 ${
            availabilityFilter === 'UNAVAILABLE'
              ? 'bg-rose-700 border-rose-700'
              : 'bg-rose-50/70 border-rose-200'
          }`}
        >
          <Ionicons
            name="close-circle-outline"
            size={13}
            color={availabilityFilter === 'UNAVAILABLE' ? '#FFF' : '#BE123C'}
          />
          <Text
            className={`font-sans-semibold text-xs ${
              availabilityFilter === 'UNAVAILABLE' ? 'text-white' : 'text-rose-800'
            }`}
          >
            Unavailable
          </Text>
        </TouchableOpacity>

        {/* Separator Divider */}
        <View className="w-[1px] h-5 bg-border/60 mx-1 self-center" />

        {/* Category Filters */}
        <TouchableOpacity
          onPress={() => setActiveCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl border mr-1.5 ml-1 flex-row items-center gap-1 ${
            activeCategoryFilter === 'ALL'
              ? 'bg-[#4A2810] border-[#4A2810]'
              : 'bg-surface border-border/60'
          }`}
        >
          <Text
            className={`font-sans-semibold text-xs ${
              activeCategoryFilter === 'ALL' ? 'text-white' : 'text-text-primary'
            }`}
          >
            All Categories
          </Text>
        </TouchableOpacity>

        {categoriesList.map((cat) => {
          const isActive = activeCategoryFilter === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl border mr-1.5 flex-row items-center gap-1 ${
                isActive ? 'bg-[#4A2810] border-[#4A2810]' : 'bg-surface border-border/60'
              }`}
            >
              <Text
                className={`font-sans-semibold text-xs ${
                  isActive ? 'text-white' : 'text-text-primary'
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4A2810" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading menu items...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const maxGlasses = item.maxAvailable ?? null;

              let stockStatus = {
                label: maxGlasses !== null ? `In Stock (${maxGlasses})` : 'In Stock',
                bg: 'bg-emerald-50 border-emerald-200',
                text: 'text-emerald-700',
              };

              if (!item.isAvailable || maxGlasses === 0) {
                stockStatus = {
                  label: 'Unavailable',
                  bg: 'bg-rose-50 border-rose-200',
                  text: 'text-rose-600',
                };
              }

              return (
                <View
                  key={item.id}
                  className="bg-white rounded-2xl p-2.5 px-3 mb-2 border border-border/60 shadow-sm flex-row items-center justify-between"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.02,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  {/* Left Side Thumbnail with Fallback Box */}
                  <MenuItemThumbnail item={item} />

                  {/* Middle Info: Name + Stock Availability Badge + Price • Glasses Left • Recipes */}
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-text-primary font-sans-bold text-xs" numberOfLines={1}>
                        {item.name}
                      </Text>

                      {/* Stock Availability Badge with Glass Count */}
                      <TouchableOpacity
                        onPress={() => handleToggleAvailability(item)}
                        className={`px-1.5 py-0.2 rounded-md border ${stockStatus.bg}`}
                      >
                        <Text className={`text-[9px] font-sans-bold uppercase ${stockStatus.text}`}>
                          {stockStatus.label}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center flex-wrap mt-0.5">
                      <Text className="text-[#4A2810] font-sans-bold text-[11px]">
                        {fmt(item.sellingPrice)}
                      </Text>
                      {maxGlasses !== null ? (
                        <>
                          <Text className="text-text-muted font-sans text-[11px] mx-1">•</Text>
                          <Text
                            className={`font-sans-semibold text-[10px] ${
                              maxGlasses === 0
                                ? 'text-rose-600'
                                : maxGlasses <= 5
                                  ? 'text-amber-800'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {maxGlasses} {maxGlasses === 1 ? 'glass' : 'glasses'} left
                          </Text>
                        </>
                      ) : null}
                      {item.recipes && item.recipes.length > 0 ? (
                        <>
                          <Text className="text-text-muted font-sans text-[11px] mx-1">•</Text>
                          <Text className="text-text-muted font-sans text-[10px]" numberOfLines={1}>
                            {item.recipes
                              .map((r: any) => `${r.ingredientName} (${r.quantity}${r.unit})`)
                              .join(', ')}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  {/* Right Actions: Toggle Availability, Edit & Delete Buttons */}
                  <View className="flex-row items-center gap-1.5 ml-auto">
                    {/* Toggle Availability Button */}
                    <TouchableOpacity
                      onPress={() => handleToggleAvailability(item)}
                      className={`px-2 py-0.5 rounded-lg border flex-row items-center gap-1 active:opacity-80 ${
                        item.isAvailable
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <Ionicons
                        name={item.isAvailable ? 'eye-off-outline' : 'eye-outline'}
                        size={10}
                        color={item.isAvailable ? '#D97706' : '#047857'}
                      />
                      <Text
                        className={`font-sans-bold text-[10px] ${
                          item.isAvailable ? 'text-amber-800' : 'text-emerald-800'
                        }`}
                      >
                        {item.isAvailable ? 'Disable' : 'Enable'}
                      </Text>
                    </TouchableOpacity>

                    {/* Edit */}
                    <TouchableOpacity
                      onPress={() => setEditItem(item)}
                      className="px-2 py-0.5 rounded-lg bg-[#4A2810] active:opacity-80 flex-row items-center gap-1"
                    >
                      <Ionicons name="pencil" size={10} color="#FFFFFF" />
                      <Text className="text-white font-sans-bold text-[10px]">Edit</Text>
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      disabled={deletingId === item.id}
                      className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 active:opacity-80 flex-row items-center gap-1"
                    >
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={10} color="#EF4444" />
                          <Text className="text-rose-600 font-sans-bold text-[10px]">Delete</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
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
        onSuccess={() => refetch()}
      />

      {/* Edit Modal */}
      <EditMenuItemModal
        item={editItem}
        visible={!!editItem}
        onClose={() => setEditItem(null)}
        categories={categoriesList}
        onSuccess={() => refetch()}
      />
    </View>
  );
}
