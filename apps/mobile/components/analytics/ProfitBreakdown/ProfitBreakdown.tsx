import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmt } from '../../common/constants';

export interface ProfitBreakdownProps {
  totalRevenue?: number | string;
  totalCOGS?: number | string;
  grossProfit?: number | string;
  shopExpenses?: number | string;
  netProfit?: number | string;
}

export function ProfitBreakdown({
  totalRevenue,
  totalCOGS,
  grossProfit,
  shopExpenses,
  netProfit,
}: ProfitBreakdownProps) {
  return (
    <View className="bg-white rounded-3xl p-4 border border-border/60 shadow-sm gap-3">
      <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2">
          <Ionicons name="wallet-outline" size={18} color="#1B4332" />
          <Text className="text-text-primary font-sans-semibold text-sm">Gross Sales</Text>
        </View>
        <Text className="text-text-primary font-sans-bold text-sm">{fmt(totalRevenue)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2">
          <Ionicons name="cart-outline" size={18} color="#F97316" />
          <Text className="text-text-muted font-sans text-sm">COGS (Ingredients + Making)</Text>
        </View>
        <Text className="text-warning font-sans-semibold text-sm">− {fmt(totalCOGS)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2">
          <Ionicons name="pie-chart-outline" size={18} color="#1B4332" />
          <Text className="text-text-primary font-sans-semibold text-sm">Gross Profit</Text>
        </View>
        <Text className="text-primary font-sans-bold text-sm">{fmt(grossProfit)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
        <View className="flex-row items-center gap-2">
          <Ionicons name="business-outline" size={18} color="#DC2626" />
          <Text className="text-text-muted font-sans text-sm">Shop Expenses (Rent/Bills)</Text>
        </View>
        <Text className="text-danger font-sans-semibold text-sm">− {fmt(shopExpenses)}</Text>
      </View>

      <View className="flex-row justify-between items-center pt-1">
        <Text className="text-primary font-sans-bold text-base">Net Profit</Text>
        <Text className="text-primary font-sans-bold text-xl">{fmt(netProfit)}</Text>
      </View>
    </View>
  );
}
