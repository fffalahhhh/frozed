import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

const fmt = (n: number | string) => `₹${parseFloat(String(n)).toFixed(2)}`;

export default function InventoryScreen() {
  const { data: stockItems, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory'),
  });

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-3">
        <View>
          <Text className="text-text-primary font-sans-bold text-2xl">Inventory</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">Ingredient levels & stock alerts</Text>
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
                        <Text className="text-warning text-[10px] font-sans-semibold">Low Stock</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-text-muted font-sans text-xs mt-1">
                    Cost: {fmt(item.costPerUnit)} / {item.unit} • Reorder at: {parseFloat(item.reorderLevel)} {item.unit}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-primary font-sans-bold text-lg">
                    {parseFloat(item.currentStock)}
                  </Text>
                  <Text className="text-text-muted font-sans text-xs">{item.unit}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center justify-center py-20">
              <Ionicons name="cube-outline" size={48} color="#8A8A8A" />
              <Text className="text-text-muted font-sans-medium text-sm mt-2">No inventory items found</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
