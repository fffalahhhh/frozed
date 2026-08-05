import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmt } from '../../common/constants';

export interface OrderHistoryCardProps {
  order: any;
}

export function OrderHistoryCard({ order }: OrderHistoryCardProps) {
  return (
    <View
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
          {order.customerName ? `Customer: ${order.customerName}` : 'Walk-in'} •{' '}
          {order.tableRef || 'Takeaway'}
        </Text>
        <Text className="text-text-muted font-sans-medium text-xs mt-1">
          Items: {order.items?.map((i: any) => `${i.quantity}x ${i.menuItemName}`).join(', ')}
        </Text>
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-border/30">
        <Text className="text-text-muted font-sans text-xs">
          {new Date(order.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text className="text-primary font-sans-bold text-base">{fmt(order.totalAmount)}</Text>
      </View>
    </View>
  );
}
