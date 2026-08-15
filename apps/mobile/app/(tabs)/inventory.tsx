import React, { useState, useCallback } from 'react';
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
import { useQuery } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient } from '../../lib/graphqlClient';
import { GET_INVENTORY, CREATE_INVENTORY_ITEM, DELETE_INVENTORY_ITEM } from '../../lib/queries';
import { useToastStore } from '../../store/toast';
import { fmt, UNITS } from '../../components/common/constants';
import { EditInventoryModal } from '../../components/inventory/EditInventoryModal';

// ─── Main Inventory Screen ────────────────────────────────────────────────────
export default function InventoryScreen() {
  const {
    data: inventoryQueryResult,
    loading: isLoading,
    refetch,
  } = useQuery(GET_INVENTORY, {
    fetchPolicy: 'cache-and-network',
  });

  const stockItems = inventoryQueryResult?.inventory || [];

  // Automatically refetch inventory levels whenever the Inventory page is visited / focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Add modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ml');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      await apolloClient.mutate({
        mutation: CREATE_INVENTORY_ITEM,
        variables: {
          input: {
            name: name.trim(),
            unit: unit.trim(),
            currentStock: Number(currentStock),
            reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
            costPerUnit: costPerUnit ? Number(costPerUnit) : 0,
          },
        },
        refetchQueries: [{ query: GET_INVENTORY }],
      });

      refetch();
      resetForm();
      setAddModalVisible(false);
      useToastStore.getState().showToast('Inventory item added successfully!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to add inventory item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = (item: any) => {
    Alert.alert('Delete Inventory Item', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(item.id);
            await apolloClient.mutate({
              mutation: DELETE_INVENTORY_ITEM,
              variables: { id: item.id },
              refetchQueries: [{ query: GET_INVENTORY }],
            });
            refetch();
            useToastStore.getState().showToast(`"${item.name}" deleted`, 'success');
          } catch (err: any) {
            const warningMsg =
              err?.message || 'Cannot delete item because it is referenced in recipes or history.';
            useToastStore.getState().showToast(warningMsg, 'error');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
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
            onPress={() => setAddModalVisible(true)}
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
            stockItems.map((item: any) => (
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
                {/* Left Info: Name • Low Stock Badge • Meta Subtitle */}
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className="text-text-primary font-sans-bold text-xs" numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.needsRestock && (
                      <View className="bg-amber-100/70 border border-amber-300 rounded-lg px-2 py-0.5 flex-row items-center gap-1">
                        <Ionicons name="alert-circle" size={10} color="#D97706" />
                        <Text className="text-amber-800 text-[10px] font-sans-bold uppercase">
                          LOW STOCK
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center flex-wrap mt-0.5">
                    <Text className="text-text-muted font-sans text-[11px]">
                      Cost: {fmt(item.costPerUnit)} / {item.unit}
                    </Text>
                    <Text className="text-text-muted font-sans text-[11px] mx-1">•</Text>
                    <Text className="text-text-muted font-sans text-[11px]">
                      Reorder @ {parseFloat(item.reorderLevel)} {item.unit}
                    </Text>
                  </View>
                </View>

                {/* Right Actions: Stock Badge + Edit Button + Delete Button */}
                <View className="flex-row items-center gap-1.5 ml-auto">
                  {/* Current Stock Level Badge */}
                  <View
                    className={`px-2 py-0.5 rounded-lg border flex-row items-baseline gap-0.5 ${
                      item.needsRestock
                        ? 'bg-amber-100/70 border-amber-300'
                        : 'bg-emerald-100/70 border-emerald-300'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-sans-bold ${
                        item.needsRestock ? 'text-amber-800' : 'text-emerald-800'
                      }`}
                    >
                      {parseFloat(item.currentStock)}
                    </Text>
                    <Text
                      className={`text-[9px] font-sans-medium ${
                        item.needsRestock ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {item.unit}
                    </Text>
                  </View>

                  {/* Edit Action Button */}
                  <TouchableOpacity
                    onPress={() => setEditItem(item)}
                    className="px-2 py-0.5 rounded-lg bg-[#1B4332] active:opacity-80 flex-row items-center gap-1"
                  >
                    <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    <Text className="text-white font-sans-bold text-[10px]">Edit</Text>
                  </TouchableOpacity>

                  {/* Delete Action Button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item)}
                    disabled={deletingId === item.id}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 active:opacity-80 flex-row items-center gap-1"
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </>
                    )}
                  </TouchableOpacity>
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
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6 border-t border-border/40 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-4">
              <Text className="text-text-primary font-sans-bold text-xl">Add Inventory Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
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

      {/* Edit Modal */}
      <EditInventoryModal
        item={editItem}
        visible={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={() => {
          refetch();
        }}
      />
    </View>
  );
}
