import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import type { MenuWithCategories, MenuItem, RecipeItem } from '@frozen-shake/shared';
import { useToastStore } from '../../store/toast';

const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(2)}`;

// ─── Shared: Ingredient Row Editor ───────────────────────────────────────────
function IngredientSection({
  ingredients,
  setIngredients,
  stockItems,
  refetchStock,
}: {
  ingredients: Array<{ inventoryItemId: string; quantity: string }>;
  setIngredients: (v: Array<{ inventoryItemId: string; quantity: string }>) => void;
  stockItems: any[] | undefined;
  refetchStock?: () => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const addRow = () => {
    if (refetchStock) refetchStock();
    if (!stockItems || stockItems.length === 0) {
      Alert.alert('No Inventory Items', 'Add inventory items first in the Inventory tab.');
      return;
    }

    const selectedOtherIds = new Set(ingredients.map((i) => i.inventoryItemId).filter(Boolean));
    const available = stockItems.filter((s) => !selectedOtherIds.has(s.id));

    if (available.length === 0) {
      Alert.alert(
        'All Items Added',
        'All available inventory items are already included in this recipe.',
      );
      return;
    }

    // Add new row with empty inventoryItemId (starts in adding/selecting state)
    const newIdx = ingredients.length;
    setIngredients([...ingredients, { inventoryItemId: '', quantity: '' }]);
    setEditingIdx(newIdx);
  };

  const update = (index: number, field: 'inventoryItemId' | 'quantity', value: string) => {
    const copy = [...ingredients];
    copy[index][field] = value;
    setIngredients(copy);
  };

  const remove = (index: number) => {
    if (editingIdx === index) setEditingIdx(null);
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // IDs selected in ALL other rows (excluding current row being rendered)
  const getSelectedOtherIds = (currentIdx: number) => {
    return new Set(
      ingredients
        .filter((_, i) => i !== currentIdx)
        .map((i) => i.inventoryItemId)
        .filter(Boolean),
    );
  };

  return (
    <View className="mb-5 border border-border/60 rounded-2xl p-3.5 bg-surface/50">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-text-primary font-sans-bold text-sm">Inventory & Recipe</Text>
          <Text className="text-text-muted font-sans text-[11px]">
            Ingredients consumed per item sold
          </Text>
        </View>
        <TouchableOpacity
          onPress={addRow}
          className="flex-row items-center bg-primary/10 px-2.5 py-1.5 rounded-lg gap-1"
        >
          <Ionicons name="add" size={16} color="#1B4332" />
          <Text className="text-primary font-sans-semibold text-xs" style={{ color: '#1B4332' }}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {ingredients.length === 0 ? (
        <Text className="text-text-muted font-sans italic text-xs text-center my-2">
          No ingredients added yet. Tap "+ Add" above.
        </Text>
      ) : (
        ingredients.map((ing, idx) => {
          const selected = stockItems?.find((s) => s.id === ing.inventoryItemId);
          const isSelectedAndNotEditing = Boolean(selected && editingIdx !== idx);

          // Get items available for THIS row (excluding those selected in OTHER rows)
          const otherIds = getSelectedOtherIds(idx);
          const availableOptions = stockItems?.filter((s) => !otherIds.has(s.id)) ?? [];

          return (
            <View key={idx} className="bg-white border border-border/60 rounded-xl p-3 mb-2.5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-primary font-sans-semibold text-xs">
                  Ingredient #{idx + 1}
                </Text>
                <TouchableOpacity onPress={() => remove(idx)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Selection Section */}
              {isSelectedAndNotEditing ? (
                /* Already selected state: NO label, just green badge */
                <View className="flex-row items-center justify-between mb-2.5 bg-surface/60 p-2 rounded-xl border border-border/40">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className="px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                      style={{ backgroundColor: '#1B4332' }}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text className="text-[11px] font-sans-semibold text-white">
                        {selected.name} ({selected.unit})
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (refetchStock) refetchStock();
                      setEditingIdx(idx);
                    }}
                    className="flex-row items-center px-2.5 py-1 rounded-lg bg-surface border border-border/60 gap-1"
                  >
                    <Ionicons name="pencil" size={12} color="#1B4332" />
                    <Text className="text-[10px] font-sans-medium" style={{ color: '#1B4332' }}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Adding/selecting state: SHOW label + options excluding items selected in other rows */
                <View className="mb-2.5">
                  <Text className="text-text-muted font-sans text-[11px] mb-1.5">
                    Select Ingredient Item:
                  </Text>
                  {availableOptions.length === 0 ? (
                    <Text className="text-text-muted font-sans italic text-[11px] my-1">
                      No more available inventory items.
                    </Text>
                  ) : (
                    <View className="flex-row flex-wrap gap-1.5">
                      {availableOptions.map((s) => {
                        const isThisSelected = ing.inventoryItemId === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => {
                              update(idx, 'inventoryItemId', s.id);
                              setEditingIdx(null);
                            }}
                            className="px-3 py-1.5 rounded-xl border flex-row items-center gap-1"
                            style={
                              isThisSelected
                                ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
                                : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }
                            }
                          >
                            {isThisSelected && (
                              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                            )}
                            <Text
                              className="text-[11px] font-sans-medium"
                              style={{ color: isThisSelected ? '#FFFFFF' : '#1F2937' }}
                            >
                              {s.name} ({s.unit})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Quantity Input */}
              <Text className="text-text-muted font-sans text-[11px] mb-1">
                Qty per item ({selected?.unit || 'unit'}):
              </Text>
              <TextInput
                value={ing.quantity}
                onChangeText={(val) => update(idx, 'quantity', val)}
                keyboardType="numeric"
                placeholder={`e.g. 200 ${selected?.unit || ''}`}
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-lg px-3 py-2 text-xs text-text-primary bg-white"
              />
            </View>
          );
        })
      )}
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

  const { data: stockItems, refetch: refetchStock } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
    staleTime: 0,
  });

  useEffect(() => {
    if (visible) {
      refetchStock();
    }
  }, [visible]);

  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]);

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setDescription('');
    setIngredients([]);
  };

  const handleSave = async () => {
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
      const formatted = ingredients
        .filter((ing) => ing.inventoryItemId && ing.quantity && !isNaN(Number(ing.quantity)))
        .map((ing) => ({ inventoryItemId: ing.inventoryItemId, quantity: Number(ing.quantity) }));

      await api.post('/menu/items', {
        categoryId: selectedCategoryId,
        name: name.trim(),
        description: description.trim() || null,
        sellingPrice: Number(sellingPrice),
        ingredients: formatted,
      });

      useToastStore.getState().showToast('Menu item created!', 'success');
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
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-4">
            <Text className="text-text-primary font-sans-bold text-xl">Add New Menu Item</Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Item Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Avocado Mango Fusion"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className="px-4 py-2.5 rounded-xl border mr-2"
                    style={
                      selectedCategoryId === cat.id
                        ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <Text
                      className="font-sans-medium text-xs"
                      style={{ color: selectedCategoryId === cat.id ? '#fff' : '#1A1A1A' }}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Selling Price (₹) *
              </Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                placeholder="e.g. 140"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Fresh cold-pressed fruit shake"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            <IngredientSection
              ingredients={ingredients}
              setIngredients={setIngredients}
              stockItems={stockItems}
              refetchStock={refetchStock}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              className="py-3.5 rounded-2xl items-center mb-6"
              style={{ backgroundColor: '#1B4332' }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-sans-bold text-sm">Save Menu Item</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Menu Item Modal ─────────────────────────────────────────────────────
function EditMenuItemModal({
  item,
  visible,
  onClose,
  categories,
  onSuccess,
}: {
  item: (MenuItem & { categoryName: string }) | null;
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

  const { data: stockItems, refetch: refetchStock } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
    staleTime: 0,
  });

  useEffect(() => {
    if (visible) {
      refetchStock();
    }
  }, [visible]);

  // Pre-fill form — wait for visible, item AND stockItems so we can match recipe rows
  useEffect(() => {
    if (!visible || !item || !stockItems) return;
    setName(item.name ?? '');
    setSelectedCategoryId(item.categoryId ?? '');
    setSellingPrice(String(parseFloat(String(item.sellingPrice ?? '0'))));
    setDescription(item.description ?? '');

    // Map existing recipes → editable rows by matching ingredientName → inventory item id
    const rows = (item.recipes ?? []).map((rec: RecipeItem) => {
      const matched = stockItems.find(
        (s) => s.name.trim().toLowerCase() === rec.ingredientName.trim().toLowerCase(),
      );
      return {
        inventoryItemId: matched?.id ?? '',
        quantity: String(parseFloat(rec.quantity as string)),
      };
    });
    setIngredients(rows);
  }, [visible, item, stockItems]);

  const handleSave = async () => {
    if (!item) return;
    if (!name.trim()) {
      useToastStore.getState().showToast('Item name is required', 'error');
      return;
    }
    if (!sellingPrice.trim() || isNaN(Number(sellingPrice))) {
      useToastStore.getState().showToast('Enter a valid selling price', 'error');
      return;
    }
    try {
      setIsSubmitting(true);

      const formattedIngredients = ingredients
        .filter((ing) => ing.inventoryItemId && ing.quantity && !isNaN(Number(ing.quantity)))
        .map((ing) => ({ inventoryItemId: ing.inventoryItemId, quantity: Number(ing.quantity) }));

      await api.patch(`/menu/items/${item.id}`, {
        categoryId: selectedCategoryId,
        name: name.trim(),
        description: description.trim() || null,
        sellingPrice: String(Number(sellingPrice)),
        ingredients: formattedIngredients,
      });

      useToastStore.getState().showToast(`"${name}" updated!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to update menu item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
          <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-4">
            <View>
              <Text className="text-text-primary font-sans-bold text-xl">Edit Menu Item</Text>
              <Text className="text-text-muted font-sans text-xs mt-0.5">{item?.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Item Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Avocado Mango Fusion"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className="px-4 py-2.5 rounded-xl border mr-2"
                    style={
                      selectedCategoryId === cat.id
                        ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <Text
                      className="font-sans-medium text-xs"
                      style={{ color: selectedCategoryId === cat.id ? '#fff' : '#1A1A1A' }}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selling Price */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Selling Price (₹) *
              </Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                placeholder="e.g. 140"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Fresh cold-pressed fruit shake"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Live editable ingredients */}
            <IngredientSection
              ingredients={ingredients}
              setIngredients={setIngredients}
              stockItems={stockItems}
              refetchStock={refetchStock}
            />

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              className="py-3.5 rounded-2xl items-center mb-6"
              style={{ backgroundColor: '#1B4332' }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-sans-bold text-sm">Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
