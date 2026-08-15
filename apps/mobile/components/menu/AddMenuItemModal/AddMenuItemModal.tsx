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
import { apolloClient } from '../../../lib/graphqlClient';
import { CREATE_MENU_ITEM, GET_MENU, GET_INVENTORY_SIMPLE } from '../../../lib/queries';
import { useToastStore } from '../../../store/toast';
import { IngredientSection } from '../IngredientSection';

export interface AddMenuItemModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function AddMenuItemModal({
  visible,
  onClose,
  categories,
  onSuccess,
}: AddMenuItemModalProps) {
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
        .map((ing) => ({ inventoryItemId: ing.inventoryItemId, quantity: String(ing.quantity) }));

      await apolloClient.mutate({
        mutation: CREATE_MENU_ITEM,
        variables: {
          input: {
            categoryId: selectedCategoryId,
            name: name.trim(),
            description: description.trim() || null,
            sellingPrice: String(sellingPrice),
            ingredients: formatted,
          },
        },
        refetchQueries: [{ query: GET_MENU }],
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
