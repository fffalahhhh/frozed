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
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../../store/toast';
import { UNITS } from '../../common/constants';

import { updateLocalInventoryStock, enqueueOutboxMutation } from '../../../lib/db';
import { syncEngine } from '../../../lib/syncEngine';

export interface EditInventoryModalProps {
  item: any | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInventoryModal({ item, visible, onClose, onSuccess }: EditInventoryModalProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ml');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name ?? '');
      setUnit(item.unit ?? 'ml');
      setCurrentStock(String(parseFloat(item.currentStock ?? '0')));
      setReorderLevel(String(parseFloat(item.reorderLevel ?? '0')));
      setCostPerUnit(String(parseFloat(item.costPerUnit ?? '0')));
    }
  }, [item]);

  const handleSave = async () => {
    if (!name.trim()) {
      useToastStore.getState().showToast('Item name is required', 'error');
      return;
    }
    if (!currentStock.trim() || isNaN(Number(currentStock))) {
      useToastStore.getState().showToast('Enter a valid stock amount', 'error');
      return;
    }

    const newStockNum = Number(currentStock);
    const oldStockNum = parseFloat(item?.currentStock ?? '0');
    const delta = newStockNum - oldStockNum;

    try {
      setIsSubmitting(true);

      if (item?.id) {
        updateLocalInventoryStock(item.id, delta);
        enqueueOutboxMutation(`adj_${item.id}_${Date.now()}`, 'ADJUST_STOCK', {
          inventoryItemId: item.id,
          type: 'manual_correction',
          quantityDelta: delta,
          note: `Manual stock adjustment to ${newStockNum}`,
        });
        syncEngine.triggerSync();
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

            {/* Current Stock */}
            <View className="mb-4">
              <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                Current Stock Level ({unit}) *
              </Text>
              <TextInput
                value={currentStock}
                onChangeText={setCurrentStock}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor="#8A8A8A"
                className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
              />
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
