import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient } from '../../../lib/graphqlClient';
import { GET_PRE_ORDERS, DELETE_PRE_ORDER } from '../../../lib/queries';
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: preOrdersQueryResult } = useQuery(GET_PRE_ORDERS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  });

  const activePreOrders = preOrdersQueryResult?.preOrders || [];

  if (!visible || activePreOrders.length === 0) {
    return null;
  }

  const handleCancelPreOrder = async (id: string) => {
    try {
      setCancellingId(id);
      if (id && !String(id).startsWith('temp-')) {
        await apolloClient.mutate({
          mutation: DELETE_PRE_ORDER,
          variables: { id },
          refetchQueries: [{ query: GET_PRE_ORDERS }],
        });
      }
      useToastStore.getState().showToast('Pre-order cancelled', 'info');
    } catch (err: any) {
      useToastStore.getState().showToast('Failed to cancel pre-order', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <View className="bg-white rounded-[28px] border border-[#E5DCD0] p-5 shadow-sm elevation-2 h-full min-h-[600px] w-60 justify-between z-30 mb-2">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pb-2.5 border-b border-[#E5DCD0]/60 mb-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full bg-amber-500" />
          <Text className="text-gray-900 font-sans-bold text-xs">
            Pre-Orders ({activePreOrders.length})
          </Text>
        </View>
        <Ionicons name="time-outline" size={14} color="#4A2810" />
      </View>

      {/* Vertical Scroll List of Pre-Orders */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {activePreOrders.map((ord: any) => {
          let itemsList: any[] = [];
          if (Array.isArray(ord.items)) {
            itemsList = ord.items;
          } else if (typeof ord.items === 'string') {
            try {
              itemsList = JSON.parse(ord.items);
            } catch {
              itemsList = [];
            }
          }
          const totalQty = itemsList.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          const isCancellingThis = cancellingId === ord.id;

          return (
            <View
              key={ord.id}
              className="bg-[#F4EDE4] border border-[#E5DCD0] rounded-[16px] p-2.5 mb-2 shadow-sm"
            >
              {/* Customer Header & Cancel Action */}
              <View className="flex-row items-start justify-between pb-1.5 border-b border-[#E5DCD0]/60 mb-1.5">
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
                  disabled={isCancellingThis}
                  onPress={() => handleCancelPreOrder(ord.id)}
                  className="w-5 h-5 rounded-full bg-red-50 border border-red-200 items-center justify-center"
                  hitSlop={6}
                >
                  {isCancellingThis ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={10} color="#EF4444" />
                  )}
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

              {/* Order Total Row */}
              <View className="pt-2 border-t border-[#E5DCD0]/60 flex-row items-center justify-between mb-2">
                <Text className="text-gray-500 font-sans text-xs">
                  Total ({totalQty} item{totalQty !== 1 ? 's' : ''})
                </Text>
                <Text className="text-[#4A2810] font-sans-bold text-sm">
                  {fmt(parseFloat(ord.totalAmount || 0))}
                </Text>
              </View>

              {/* Full Width Proceed Button */}
              <Pressable
                onPress={() => onProcessPreOrder({ ...ord, items: itemsList })}
                className="w-full bg-[#4A2810] rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-2 shadow-sm active:bg-[#361908]"
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <Text className="text-white font-sans-bold text-xs">Proceed to Order</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
