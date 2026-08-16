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
import { apolloClient } from '../../../lib/graphqlClient';
import { UPDATE_INVENTORY_ITEM, ADJUST_STOCK, GET_INVENTORY } from '../../../lib/queries';
import { useToastStore } from '../../../store/toast';
import { UNITS } from '../../common/constants';

export interface EditInventoryModalProps {
  item: any | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditInventoryModal({ item, visible, onClose, onSuccess }: EditInventoryModalProps) {
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
          await apolloClient.mutate({
            mutation: ADJUST_STOCK,
            variables: {
              input: {
                inventoryItemId: item.id,
                type: 'manual_correction',
                quantityDelta: delta,
                note: `Stock edit of ${delta} ${unit}`,
              },
            },
          });
        }

        await apolloClient.mutate({
          mutation: UPDATE_INVENTORY_ITEM,
          variables: {
            id: item.id,
            input: {
              name: name.trim(),
              unit,
              reorderLevel: parseFloat(reorderLevel || '0'),
              costPerUnit: parseFloat(costPerUnit || '0'),
            },
          },
          refetchQueries: [{ query: GET_INVENTORY }],
        });
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: '#FFF',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DCD0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: '#4A2810' }}>
              Edit Inventory Item
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16, maxHeight: 400 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              Item Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                marginBottom: 12,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              Unit
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexDirection: 'row', marginBottom: 12 }}
            >
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => setUnit(u)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: unit === u ? '#4A2810' : '#F3F4F6',
                    marginRight: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: unit === u ? '#FFF' : '#374151',
                      fontFamily: 'Inter_600SemiBold',
                    }}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              Adjust Stock (+ / -) (Current: {oldStockNum} {unit})
            </Text>
            <TextInput
              value={addedStock}
              onChangeText={setAddedStock}
              keyboardType="numeric"
              placeholder="e.g. 50 or -10"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
              New Total Stock will be: {calculatedTotalStock} {unit}
            </Text>

            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              Reorder Alert Level
            </Text>
            <TextInput
              value={reorderLevel}
              onChangeText={setReorderLevel}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                marginBottom: 12,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_600SemiBold',
                color: '#374151',
                marginBottom: 4,
              }}
            >
              Cost Per Unit (₹)
            </Text>
            <TextInput
              value={costPerUnit}
              onChangeText={setCostPerUnit}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                marginBottom: 16,
              }}
            />
          </ScrollView>

          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#E5DCD0',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: '#F3F4F6',
              }}
            >
              <Text style={{ fontSize: 14, color: '#374151', fontFamily: 'Inter_600SemiBold' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: '#4A2810',
                opacity: isSubmitting ? 0.7 : 1,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {isSubmitting && (
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
              )}
              <Text style={{ fontSize: 14, color: '#FFF', fontFamily: 'Inter_600SemiBold' }}>
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
