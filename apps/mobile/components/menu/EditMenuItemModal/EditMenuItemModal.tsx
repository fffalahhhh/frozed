import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from '@frozen-shake/shared';
import { apolloClient } from '../../../lib/graphqlClient';
import { UPDATE_MENU_ITEM, GET_MENU, GET_INVENTORY_SIMPLE } from '../../../lib/queries';
import { useToastStore } from '../../../store/toast';
import { IngredientSection } from '../IngredientSection';

export interface EditMenuItemModalProps {
  item: (MenuItem & { categoryName: string }) | null;
  visible: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function EditMenuItemModal({
  item,
  visible,
  onClose,
  categories,
  onSuccess,
}: EditMenuItemModalProps) {
  const [name, setName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<
    Array<{ inventoryItemId: string; quantity: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stockData, refetch: refetchStock } = useQuery(GET_INVENTORY_SIMPLE, {
    fetchPolicy: 'cache-and-network',
  });

  const stockItems = stockData?.inventory || [];

  useEffect(() => {
    if (visible) {
      refetchStock();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !item || !stockItems) return;
    setName(item.name ?? '');
    setSelectedCategoryId(item.categoryId ?? '');
    setSellingPrice(item.sellingPrice ? String(item.sellingPrice) : '');
    setDescription(item.description ?? '');

    if (Array.isArray(item.recipes)) {
      const recs = item.recipes.map((r: any) => {
        const foundStock = stockItems.find(
          (s: any) => s.name?.toLowerCase().trim() === r.ingredientName?.toLowerCase().trim(),
        );
        return {
          inventoryItemId: foundStock?.id || '',
          quantity: String(r.quantity ?? ''),
        };
      });
      setIngredients(recs);
    } else {
      setIngredients([]);
    }
  }, [visible, item, stockItems]);

  const handleSave = async () => {
    if (!item?.id) return;
    if (!name.trim()) {
      useToastStore.getState().showToast('Enter item name', 'error');
      return;
    }
    if (!selectedCategoryId) {
      useToastStore.getState().showToast('Select a category', 'error');
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
        .map((ing) => ({ inventoryItemId: ing.inventoryItemId, quantity: String(ing.quantity) }));

      await apolloClient.mutate({
        mutation: UPDATE_MENU_ITEM,
        variables: {
          id: item.id,
          input: {
            categoryId: selectedCategoryId,
            name: name.trim(),
            description: description.trim() || null,
            sellingPrice: String(sellingPrice),
            ingredients: formattedIngredients,
          },
        },
        refetchQueries: [{ query: GET_MENU }],
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
              <Ionicons name="close" size={24} color="#1A120B" />
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
                        ? { backgroundColor: '#4A2810', borderColor: '#4A2810' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <Text
                      className="font-sans-medium text-xs"
                      style={{ color: selectedCategoryId === cat.id ? '#fff' : '#1A120B' }}
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
              style={{ backgroundColor: '#4A2810' }}
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
