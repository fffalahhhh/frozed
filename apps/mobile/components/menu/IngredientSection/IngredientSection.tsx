import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface IngredientSectionProps {
  ingredients: Array<{ inventoryItemId: string; quantity: string }>;
  setIngredients: (v: Array<{ inventoryItemId: string; quantity: string }>) => void;
  stockItems: any[] | undefined;
  refetchStock?: () => void;
}

export function IngredientSection({
  ingredients,
  setIngredients,
  stockItems,
  refetchStock,
}: IngredientSectionProps) {
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
          const otherIds = getSelectedOtherIds(idx);
          const availableOptions = stockItems?.filter((s) => !otherIds.has(s.id)) ?? [];

          const selectedStockNum = selected ? parseFloat(selected.currentStock || '0') : 0;
          const selectedReorderNum = selected ? parseFloat(selected.reorderLevel || '0') : 0;
          const selectedIsOutOfStock = selected ? selectedStockNum <= 0 : false;
          const selectedIsLowStock = selected
            ? !selectedIsOutOfStock && selectedStockNum <= selectedReorderNum
            : false;

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

              {isSelectedAndNotEditing ? (
                <View className="flex-row items-center justify-between mb-2.5 bg-surface/60 p-2 rounded-xl border border-border/40">
                  <View className="flex-row items-center gap-1.5 flex-wrap flex-1 pr-1">
                    <View
                      className="px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                      style={{ backgroundColor: selectedIsOutOfStock ? '#D97706' : '#1B4332' }}
                    >
                      <Ionicons
                        name={selectedIsOutOfStock ? 'warning' : 'checkmark-circle'}
                        size={14}
                        color="#FFFFFF"
                      />
                      <Text className="text-[11px] font-sans-semibold text-white">
                        {selected?.name || 'Ingredient'} ({selected?.unit || 'unit'})
                      </Text>
                    </View>

                    {selectedIsOutOfStock ? (
                      <View className="bg-amber-100 border border-amber-300 rounded-lg px-2 py-0.5 flex-row items-center gap-1">
                        <Ionicons name="warning" size={12} color="#D97706" />
                        <Text className="text-amber-800 text-[10px] font-sans-bold">
                          Out of Stock
                        </Text>
                      </View>
                    ) : selectedIsLowStock ? (
                      <View className="bg-orange-100 border border-orange-300 rounded-lg px-2 py-0.5 flex-row items-center gap-1">
                        <Ionicons name="alert-circle" size={12} color="#EA580C" />
                        <Text className="text-orange-800 text-[10px] font-sans-bold">
                          Low Stock
                        </Text>
                      </View>
                    ) : null}
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
                        if (!s) return null;
                        const isThisSelected = ing.inventoryItemId === s.id;
                        const stockNum = parseFloat(s.currentStock || '0');
                        const reorderNum = parseFloat(s.reorderLevel || '0');
                        const isOutOfStock = stockNum <= 0;
                        const isLowStock = !isOutOfStock && stockNum <= reorderNum;

                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => {
                              update(idx, 'inventoryItemId', s.id);
                              setEditingIdx(null);
                            }}
                            className={`px-3 py-1.5 rounded-xl border flex-row items-center gap-1 ${
                              isThisSelected
                                ? 'bg-[#1B4332] border-[#1B4332]'
                                : isOutOfStock
                                  ? 'bg-amber-50 border-amber-300'
                                  : isLowStock
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-[#F9FAFB] border-[#E5E7EB]'
                            }`}
                          >
                            {isThisSelected ? (
                              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                            ) : isOutOfStock ? (
                              <Ionicons name="warning" size={13} color="#D97706" />
                            ) : isLowStock ? (
                              <Ionicons name="alert-circle" size={13} color="#EA580C" />
                            ) : null}
                            <Text
                              className="text-[11px] font-sans-medium"
                              style={{
                                color: isThisSelected
                                  ? '#FFFFFF'
                                  : isOutOfStock
                                    ? '#B45309'
                                    : isLowStock
                                      ? '#C2410C'
                                      : '#1F2937',
                              }}
                            >
                              {s?.name || 'Ingredient'} ({s?.unit || 'unit'})
                              {isOutOfStock ? ' • Out of Stock' : isLowStock ? ' • Low Stock' : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

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
