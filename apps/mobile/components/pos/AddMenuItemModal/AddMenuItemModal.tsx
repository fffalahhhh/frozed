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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { useToastStore } from '../../../store/toast';
import { COLORS, FONTS } from '../../common/constants';

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
  const { data: stockItems } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
  });

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
    setIngredients([...ingredients, { inventoryItemId: stockItems[0].id, quantity: '' }]);
  };

  const updateIngredient = (
    index: number,
    field: 'inventoryItemId' | 'quantity',
    value: string,
  ) => {
    const copy = [...ingredients];
    copy[index][field] = value;
    setIngredients(copy);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
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

    try {
      setIsSubmitting(true);
      const formattedIngredients = ingredients
        .filter((ing) => ing.inventoryItemId && ing.quantity && !isNaN(Number(ing.quantity)))
        .map((ing) => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: Number(ing.quantity),
        }));

      await api.post('/menu/items', {
        categoryId: selectedCategoryId,
        name: name.trim(),
        description: description.trim() || null,
        sellingPrice: Number(sellingPrice),
        ingredients: formattedIngredients,
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
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: COLORS.borderAlpha40,
              marginBottom: 16,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontFamily: FONTS.bold,
                fontSize: 18,
              }}
            >
              Add Menu Item
            </Text>
            <Pressable
              onPress={() => {
                onClose();
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Item Name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Item Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Mango Special Smoothie"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Category selection */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Category *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: 'row' }}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginRight: 8,
                      backgroundColor:
                        selectedCategoryId === cat.id ? COLORS.primary : COLORS.white,
                      borderColor: selectedCategoryId === cat.id ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.medium,
                        fontSize: 12,
                        color: selectedCategoryId === cat.id ? COLORS.white : COLORS.textPrimary,
                      }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Selling Price */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Selling Price (₹) *
              </Text>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="numeric"
                placeholder="e.g. 140"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.medium,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Made with fresh pulp & whole milk"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.borderAlpha60,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: COLORS.textPrimary,
                  fontFamily: FONTS.regular,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Inventory Ingredients Section */}
            <View
              style={{
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.borderAlpha60,
                borderRadius: 16,
                padding: 14,
                backgroundColor: COLORS.surfaceAlpha50,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={{
                      color: COLORS.textPrimary,
                      fontFamily: FONTS.bold,
                      fontSize: 14,
                    }}
                  >
                    Inventory Used & Recipe
                  </Text>
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontFamily: FONTS.regular,
                      fontSize: 11,
                    }}
                  >
                    Select inventory ingredients used per serving
                  </Text>
                </View>
                <Pressable
                  onPress={addIngredientRow}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.primaryAlpha10,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    gap: 4,
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.primary} />
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontFamily: FONTS.semiBold,
                      fontSize: 12,
                    }}
                  >
                    Add Ingredient
                  </Text>
                </Pressable>
              </View>

              {ingredients.length === 0 ? (
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontFamily: FONTS.regular,
                    fontSize: 12,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginVertical: 8,
                  }}
                >
                  No inventory ingredients added yet. Tap "+ Add Ingredient" above.
                </Text>
              ) : (
                ingredients.map((ing, idx) => {
                  const selectedStock = stockItems?.find((s) => s.id === ing.inventoryItemId);
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: COLORS.white,
                        borderWidth: 1,
                        borderColor: COLORS.borderAlpha60,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.textPrimary,
                            fontFamily: FONTS.semiBold,
                            fontSize: 12,
                          }}
                        >
                          Ingredient #{idx + 1}
                        </Text>
                        <Pressable onPress={() => removeIngredient(idx)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </Pressable>
                      </View>

                      {/* Select inventory item pill scroll */}
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontFamily: FONTS.regular,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Select Inventory Item:
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 10 }}
                      >
                        {stockItems?.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => updateIngredient(idx, 'inventoryItemId', s.id)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 10,
                              borderWidth: 1,
                              marginRight: 6,
                              backgroundColor:
                                ing.inventoryItemId === s.id ? COLORS.primary : COLORS.white,
                              borderColor:
                                ing.inventoryItemId === s.id ? COLORS.primary : COLORS.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: FONTS.medium,
                                color:
                                  ing.inventoryItemId === s.id ? COLORS.white : COLORS.textPrimary,
                              }}
                            >
                              {s.name} ({s.unit})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      {/* Amount used input */}
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontFamily: FONTS.regular,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        Amount Used ({selectedStock?.unit || 'unit'} per item):
                      </Text>
                      <TextInput
                        value={ing.quantity}
                        onChangeText={(val) => updateIngredient(idx, 'quantity', val)}
                        keyboardType="numeric"
                        placeholder={`e.g. 200 ${selectedStock?.unit || ''}`}
                        placeholderTextColor={COLORS.textMuted}
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.borderAlpha60,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                          color: COLORS.textPrimary,
                          backgroundColor: COLORS.white,
                        }}
                      />
                    </View>
                  );
                })
              )}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveMenuItem}
              disabled={isSubmitting}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={{
                    color: COLORS.white,
                    fontFamily: FONTS.bold,
                    fontSize: 15,
                  }}
                >
                  Save Menu Item
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
