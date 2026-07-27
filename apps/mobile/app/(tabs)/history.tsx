import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(0)}`;

export default function HistoryScreen() {
  const { data: ordersList, isLoading, refetch } = useQuery<any[]>({
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
            ordersList.map((order) => (
              <View
                key={order.id}
                className="bg-white rounded-3xl p-4 mb-3 border border-border/60 shadow-sm"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between pb-2 border-b border-border/30">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="receipt-outline" size={18} color="#1B4332" />
                    <Text className="text-text-primary font-sans-bold text-sm">
                      Order #{order.orderNumber}
                    </Text>
                  </View>
                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      order.status === 'paid' ? 'bg-success-bg' : 'bg-warning/10'
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-semibold uppercase ${
                        order.status === 'paid' ? 'text-primary' : 'text-warning'
                      }`}
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>

                <View className="py-2.5">
                  <Text className="text-text-muted font-sans text-xs">
                    {order.customerName ? `Customer: ${order.customerName}` : 'Walk-in'} • {order.tableRef || 'Takeaway'}
                  </Text>
                  <Text className="text-text-muted font-sans-medium text-xs mt-1">
                    Items: {order.items?.map((i: any) => `${i.quantity}x ${i.menuItemName}`).join(', ')}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-border/30">
                  <Text className="text-text-muted font-sans text-xs">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text className="text-primary font-sans-bold text-base">
                    {fmt(order.totalAmount)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color="#8A8A8A" />
              <Text className="text-text-muted font-sans-medium text-sm mt-2">No orders recorded yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
