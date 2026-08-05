import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { OrderHistoryCard } from '../../components/history/OrderHistoryCard';

export default function HistoryScreen() {
  const {
    data: ordersList,
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ['orders-history'],
    queryFn: () => api.get('/orders'),
  });

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Title Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-3">
        <View>
          <Text className="text-text-primary font-sans-bold text-2xl">Order History</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">Past orders and receipts</Text>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border/40"
        >
          <Ionicons name="refresh" size={20} color="#1B4332" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading orders...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {ordersList && ordersList.length > 0 ? (
            ordersList.map((order) => <OrderHistoryCard key={order.id} order={order} />)
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color="#8A8A8A" />
              <Text className="text-text-muted font-sans-medium text-sm mt-2">
                No orders recorded yet
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
