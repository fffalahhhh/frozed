import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useToastStore } from '../../store/toast';

const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(2)}`;

const UNITS = ['ml', 'g', 'pcs', 'kg', 'liters', 'packets'];

export default function InventoryScreen() {
  const queryClient = useQueryClient();
  const {
    data: stockItems,
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ml');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setUnit('ml');
    setCurrentStock('');
    setReorderLevel('');
    setCostPerUnit('');
  };

  const handleCreateInventoryItem = async () => {
    if (!name.trim()) {
      useToastStore.getState().showToast('Please enter item name', 'error');
      return;
    }
    if (!currentStock.trim() || isNaN(Number(currentStock))) {
      useToastStore.getState().showToast('Please enter a valid initial stock amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/inventory', {
        name: name.trim(),
        unit: unit.trim(),
        currentStock: Number(currentStock),
        reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
        costPerUnit: costPerUnit ? Number(costPerUnit) : 0,
      });

      await queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      refetch();
      resetForm();
      setModalVisible(false);
      useToastStore.getState().showToast('Inventory item added successfully!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to add inventory item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-3">
        <View>
          <Text className="text-text-primary font-sans-bold text-2xl">Inventory</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">
            Ingredient levels & stock alerts
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-row items-center bg-primary px-3 py-2 rounded-xl gap-1"
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading inventory...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {stockItems && stockItems.length > 0 ? (
            stockItems.map((item) => (
              <View
                key={item.id}
                className="bg-white rounded-3xl p-4 mb-3 border border-border/60 shadow-sm flex-row items-center justify-between"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-text-primary font-sans-bold text-base">{item.name}</Text>
                    {item.needsRestock && (
                      <View className="bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                        <Ionicons name="alert-circle" size={12} color="#F97316" />
                        <Text className="text-warning text-[10px] font-sans-semibold">
                          Low Stock
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-text-muted font-sans text-xs mt-1">
                    Cost: {fmt(item.costPerUnit)} / {item.unit} • Reorder at:{' '}
                    {parseFloat(item.reorderLevel)} {item.unit}
                  </Text>
                </View>

                <View className="items-end">
                  <Text
                    className="text-primary font-sans-bold text-lg"
                    style={{ color: '#1B4332' }}
                  >
                    {parseFloat(item.currentStock)}
                  </Text>
                  <Text className="text-text-muted font-sans text-xs">{item.unit}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={48} color="#8A8A8A" />
              <Text className="text-text-muted font-sans-medium text-sm mt-2">
                No inventory items found
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Inventory Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6 border-t border-border/40 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-4">
              <Text className="text-text-primary font-sans-bold text-xl">Add Inventory Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Item Name */}
              <View className="mb-4">
                <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                  Item Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Milk, Mango Pulp, Sugar"
                  placeholderTextColor="#8A8A8A"
                  className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
                />
              </View>

              {/* Unit Selection */}
              <View className="mb-4">
                <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                  Unit of Measure *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnit(u)}
                      className={`px-4 py-2 rounded-xl border mr-2 ${
                        unit === u ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                      style={
                        unit === u ? { backgroundColor: '#1B4332', borderColor: '#1B4332' } : {}
                      }
                    >
                      <Text
                        className={`font-sans-medium text-xs ${
                          unit === u ? 'text-white' : 'text-text-primary'
                        }`}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Initial Stock Amount */}
              <View className="mb-4">
                <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                  Initial / Current Stock ({unit}) *
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
                  Low Stock Reorder Alert Level ({unit})
                </Text>
                <TextInput
                  value={reorderLevel}
                  onChangeText={setReorderLevel}
                  keyboardType="numeric"
                  placeholder="e.g. 500"
                  placeholderTextColor="#8A8A8A"
                  className="border border-border/80 rounded-xl px-4 py-3 text-text-primary font-sans text-sm bg-surface"
                />
              </View>

              {/* Cost Per Unit */}
              <View className="mb-6">
                <Text className="text-text-primary font-sans-medium text-xs mb-1.5">
                  Cost Per {unit} (₹)
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
                onPress={handleCreateInventoryItem}
                disabled={isSubmitting}
                className="bg-primary py-3.5 rounded-2xl items-center mb-6"
                style={{ backgroundColor: '#1B4332' }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-sans-bold text-base">Save Inventory Item</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
