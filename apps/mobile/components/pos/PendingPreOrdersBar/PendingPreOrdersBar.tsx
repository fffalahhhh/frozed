import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { fmt } from '../../common/constants';
import { useToastStore } from '../../../store/toast';

export interface PendingPreOrdersBarProps {
  onProcessPreOrder: (preOrder: any) => void;
  visible?: boolean;
}

export function PendingPreOrdersBar({
  onProcessPreOrder,
  visible = true,
}: PendingPreOrdersBarProps) {
  const queryClient = useQueryClient();

  const { data: preOrdersList } = useQuery<any[]>({
    queryKey: ['pre-orders'],
    queryFn: () => api.get('/pre-orders'),
    refetchInterval: 4000,
  });

  const activePreOrders = Array.isArray(preOrdersList) ? preOrdersList : [];

  if (!visible || activePreOrders.length === 0) {
    return null;
  }

  const handleCancelPreOrder = async (id: string) => {
    try {
      await api.delete(`/pre-orders/${id}`);
      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
      useToastStore.getState().showToast('Pre-order cancelled', 'info');
    } catch (err: any) {
      useToastStore.getState().showToast('Failed to cancel pre-order', 'error');
    }
  };

  return (
    <View className="bg-white rounded-[28px] border border-[#E5E0D8] p-5 shadow-sm elevation-2 h-full min-h-[600px] w-60 justify-between z-30 mb-2">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pb-2.5 border-b border-[#E5E0D8]/60 mb-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full bg-amber-500" />
          <Text className="text-gray-900 font-sans-bold text-xs">
            Pre-Orders ({activePreOrders.length})
          </Text>
        </View>
        <Ionicons name="time-outline" size={14} color="#0D4830" />
      </View>

      {/* Vertical Scroll List of Pre-Orders */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {activePreOrders.map((ord: any) => {
          const itemsList = Array.isArray(ord.items) ? ord.items : [];
          const totalQty = itemsList.reduce((s: number, i: any) => s + (i.quantity || 1), 0);

          return (
            <View
              key={ord.id}
              className="bg-[#FAF8F5] border border-[#E5E0D8] rounded-[16px] p-2.5 mb-2 shadow-sm"
            >
              {/* Customer Header & Cancel Action */}
              <View className="flex-row items-start justify-between pb-1.5 border-b border-[#E5E0D8]/60 mb-1.5">
                <View className="flex-1 pr-1">
                  <Text className="text-gray-900 font-sans-bold text-[10px]" numberOfLines={1}>
                    {ord.customerName || 'Walk-in Pre-Order'}
                  </Text>
                  {ord.customerPhone ? (
                    <Text className="text-gray-500 font-sans text-[8.5px] mt-0.5">
                      {ord.customerPhone}
                    </Text>
                  ) : null}
                </View>

                {/* Cancel Trash Icon Button */}
                <Pressable
                  onPress={() => handleCancelPreOrder(ord.id)}
                  className="w-5 h-5 rounded-full bg-red-50 border border-red-200 items-center justify-center"
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={10} color="#EF4444" />
                </Pressable>
              </View>

              {/* Detailed Item List */}
              <View className="mb-1.5 gap-0.5">
                {itemsList.map((item: any, idx: number) => (
                  <View key={idx} className="flex-row items-center justify-between">
                    <Text
                      className="text-gray-700 font-sans-medium text-[9px] flex-1 pr-1"
                      numberOfLines={1}
                    >
                      • {item.quantity}x {item.menuItemName}
                    </Text>
                    {item.flavourName ? (
                      <Text className="text-gray-400 font-sans text-[8px]">
                        ({item.flavourName})
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>

              {/* Order Total & Process Button */}
              <View className="pt-1.5 border-t border-[#E5E0D8]/60 flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-400 font-sans text-[8px]">Total ({totalQty})</Text>
                  <Text className="text-[#0D4830] font-sans-bold text-[10.5px]">
                    {fmt(parseFloat(ord.totalAmount || 0))}
                  </Text>
                </View>

                {/* Process Order Action Button */}
                <Pressable
                  onPress={() => onProcessPreOrder(ord)}
                  className="bg-[#0D4830] rounded-full py-0.5 px-2 flex-row items-center justify-center gap-1 shadow-sm active:bg-[#083020]"
                >
                  <Ionicons name="arrow-forward" size={9} color="#FFFFFF" />
                  <Text className="text-white font-sans-bold text-[9.5px]">Process</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
