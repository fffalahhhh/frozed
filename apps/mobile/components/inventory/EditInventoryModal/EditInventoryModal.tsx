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
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../../store/toast';
import { UNITS } from '../../common/constants';

import { getLocalInventory, updateLocalInventoryStock } from '../../../lib/db';

export interface EditInventoryModalProps {
  item: any | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInventoryModal({ item, visible, onClose, onSuccess }: EditInventoryModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ml');
  const [addedStock, setAddedStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name ?? '');
      setUnit(item.unit ?? 'ml');
      setAddedStock('');
      setReorderLevel(String(parseFloat(item.reorderLevel ?? '0')));
      setCostPerUnit(String(parseFloat(item.costPerUnit ?? '0')));
    }
  }, [item]);

  const oldStockNum = parseFloat(item?.currentStock ?? '0');
  const addedStockNum = parseFloat(addedStock.trim() || '0');
  const delta = isNaN(addedStockNum) ? 0 : addedStockNum;
  const calculatedTotalStock = oldStockNum + delta;

  const handleSave = async () => {
    if (!name.trim()) {
      useToastStore.getState().showToast('Item name is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      if (item?.id) {
        if (delta !== 0) {
          // 1. Instant local SQLite update
          updateLocalInventoryStock(item.id, delta);

          // 2. Instant 0ms Optimistic UI cache mutation in React Query
          queryClient.setQueryData<any[]>(['inventory-stock'], (old) => {
            if (!old || !Array.isArray(old)) return getLocalInventory();
            const reorderNum = parseFloat(reorderLevel || '0');
            return old.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    name: name.trim(),
                    unit,
                    currentStock: String(calculatedTotalStock),
                    reorderLevel: String(reorderNum),
                    costPerUnit: String(parseFloat(costPerUnit || '0')),
                    needsRestock: calculatedTotalStock <= reorderNum,
                  }
                : i,
            );
          });
        }
      }

      useToastStore.getState().showToast(`"${name}" updated successfully`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to update item', 'error');
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
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-4">
            <View>
              <Text className="text-text-primary font-sans-bold text-xl">Edit Inventory Item</Text>
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
                placeholder="e.g. Alphonso Mango Pulp"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Unit */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Unit of Measure *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnit(u)}
                    className="px-4 py-2 rounded-xl border mr-2"
                    style={
                      unit === u
                        ? { backgroundColor: '#1B4332', borderColor: '#1B4332' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <Text
                      className="font-sans-medium text-xs"
                      style={{ color: unit === u ? '#fff' : '#1A1A1A' }}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Single Line Unhighlighted Stock Addition Row */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Stock Addition ({unit})
              </Text>
              <View className="flex-row items-center border border-border/80 rounded-xl px-3 py-2.5 bg-surface">
                {/* Previous Stock Readout */}
                <View className="flex-row items-baseline gap-1 pr-2.5">
                  <Text className="text-text-muted font-sans text-xs">Prev:</Text>
                  <Text className="text-text-primary font-sans-bold text-xs">{oldStockNum}</Text>
                </View>

                {/* Plus sign */}
                <Text className="text-text-muted font-sans-bold text-xs mx-2.5">+</Text>

                {/* Added Stock Input */}
                <TextInput
                  value={addedStock}
                  onChangeText={setAddedStock}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8A8A8A"
                  className="flex-1 text-text-primary font-sans-bold text-xs py-0"
                />

                {/* Equals sign & Live Total Readout */}
                <View className="flex-row items-baseline gap-1 pl-2.5 border-l border-border/40 ml-2">
                  <Text className="text-text-muted font-sans text-xs">=</Text>
                  <Text className="text-text-primary font-sans-bold text-xs">
                    {calculatedTotalStock} {unit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reorder Level */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Reorder Alert Level ({unit})
              </Text>
              <TextInput
                value={reorderLevel}
                onChangeText={setReorderLevel}
                keyboardType="numeric"
                placeholder="e.g. 1000"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Cost Per Unit */}
            <View className="mb-6">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Cost Per Unit (₹ per {unit})
              </Text>
              <TextInput
                value={costPerUnit}
                onChangeText={setCostPerUnit}
                keyboardType="numeric"
                placeholder="e.g. 0.15"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
            </View>

            {/* Submit Button */}
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
