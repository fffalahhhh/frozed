import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient } from '../../../lib/graphqlClient';
import { CREATE_MENU_ITEM, GET_MENU, GET_INVENTORY_SIMPLE } from '../../../lib/queries';
import { useToastStore } from '../../../store/toast';

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

  // Query inventory stock items
  const { data: stockData } = useQuery(GET_INVENTORY_SIMPLE, {
    fetchPolicy: 'cache-and-network',
  });

  const stockItems = stockData?.inventory || [];

  React.useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]);

  const addIngredientRow = () => {
    if (!stockItems || stockItems.length === 0) {
      Alert.alert(
        'No Inventory Items',
        'Please add inventory items first in the Inventory tab before linking ingredients.',
      );
      return;
    }
    setIngredients((prev) => [...prev, { inventoryItemId: stockItems[0].id, quantity: '1' }]);
  };

  const updateIngredientRow = (
    index: number,
    field: 'inventoryItemId' | 'quantity',
    val: string,
  ) => {
    setIngredients((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setSellingPrice('');
    setDescription('');
    setIngredients([]);
  };

  const handleSaveMenuItem = async () => {
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

    const formattedIngredients = ingredients
      .filter((ing) => ing.inventoryItemId && ing.quantity && !isNaN(Number(ing.quantity)))
      .map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: String(ing.quantity),
      }));

    try {
      setIsSubmitting(true);
      await apolloClient.mutate({
        mutation: CREATE_MENU_ITEM,
        variables: {
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
      useToastStore.getState().showToast('Menu item created successfully!', 'success');
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
          <View className="flex-row items-center justify-between border-b border-border/40 mb-4 pb-3">
            <Text className="text-text-primary font-sans-bold text-lg">Add Menu Item</Text>
            <Pressable
              onPress={() => {
                onClose();
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Item Name */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Item Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Mango Special Smoothie"
                placeholderTextColor="#8A8A8A"
                className="border border-border/60 rounded-xl px-4 py-3 text-text-primary font-sans text-sm"
              />
            </View>

            {/* Category selection */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2.5 rounded-xl border mr-2 ${
                      selectedCategoryId === cat.id
                        ? 'bg-primary border-primary'
                        : 'bg-white border-border'
                    }`}
                  >
                    <Text
                      className={`font-sans-medium text-xs ${
                        selectedCategoryId === cat.id ? 'text-white' : 'text-text-primary'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
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
                className="border border-border/60 rounded-xl px-4 py-3 text-text-primary font-sans text-sm"
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
                placeholder="e.g. Made with fresh pulp & whole milk"
                placeholderTextColor="#8A8A8A"
                className="border border-border/60 rounded-xl px-4 py-3 text-text-primary font-sans text-sm"
              />
            </View>

            {/* Inventory Ingredients Section */}
            <View className="mb-5 border border-border/60 rounded-2xl p-3.5 bg-surface/50">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-text-primary font-sans-bold text-sm">
                    Inventory Used & Recipe
                  </Text>
                  <Text className="text-text-muted font-sans text-[11px]">
                    Select inventory ingredients used per serving
                  </Text>
                </View>
                <Pressable
                  onPress={addIngredientRow}
                  className="flex-row items-center bg-primary/10 px-2.5 py-1.5 rounded-lg gap-1"
                >
                  <Ionicons name="add" size={16} color="#4A2810" />
                  <Text className="text-primary font-sans-semibold text-xs">Add Ingredient</Text>
                </Pressable>
              </View>

              {ingredients.length === 0 ? (
                <Text className="text-text-muted font-sans italic text-xs text-center my-2">
                  No inventory ingredients added yet. Tap "+ Add Ingredient" above.
                </Text>
              ) : (
                ingredients.map((ing, idx) => {
                  const selectedStock = stockItems?.find((s: any) => s.id === ing.inventoryItemId);
                  return (
                    <View
                      key={idx}
                      className="bg-white border border-border/60 rounded-xl p-3 mb-2.5"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-text-primary font-sans-semibold text-xs">
                          Ingredient #{idx + 1}
                        </Text>
                        <Pressable onPress={() => removeIngredientRow(idx)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </Pressable>
                      </View>

                      {/* Select inventory item pill scroll */}
                      <Text className="text-[#8A8A8A] font-sans text-[11px] mb-1">
                        Select Inventory Item:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-2.5"
                      >
                        {stockItems?.map((s: any) => (
                          <Pressable
                            key={s.id}
                            onPress={() => updateIngredientRow(idx, 'inventoryItemId', s.id)}
                            className={`px-3 py-1.5 rounded-lg border mr-1.5 ${
                              ing.inventoryItemId === s.id
                                ? 'bg-primary border-primary'
                                : 'bg-white border-border'
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-sans-medium ${
                                ing.inventoryItemId === s.id ? 'text-white' : 'text-text-primary'
                              }`}
                            >
                              {s.name} ({s.unit})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      {/* Amount used input */}
                      <Text className="text-[#8A8A8A] font-sans text-[11px] mb-1">
                        Amount Used ({selectedStock?.unit || 'unit'} per item):
                      </Text>
                      <TextInput
                        value={ing.quantity}
                        onChangeText={(val) => updateIngredientRow(idx, 'quantity', val)}
                        keyboardType="numeric"
                        placeholder={`e.g. 200 ${selectedStock?.unit || ''}`}
                        placeholderTextColor="#8A8A8A"
                        className="border border-border/60 rounded-lg px-3 py-2 text-xs text-text-primary bg-white"
                      />
                    </View>
                  );
                })
              )}
            </View>

            {/* Save Button */}
            <Pressable
              disabled={isSubmitting}
              onPress={handleSaveMenuItem}
              className="bg-primary rounded-2xl py-3.5 items-center mb-6"
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-sans-bold text-sm">Save Menu Item</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
