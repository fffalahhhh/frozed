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
    <View className="bg-white rounded-2xl p-3 border border-border/60 shadow-sm gap-2">
      <View className="flex-row justify-between items-center pb-1.5 border-b border-border/30">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="wallet-outline" size={15} color="#1B4332" />
          <Text className="text-text-primary font-sans-medium text-xs">Gross Sales</Text>
        </View>
        <Text className="text-text-primary font-sans-bold text-xs">{fmt(totalRevenue)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-1.5 border-b border-border/30">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="cart-outline" size={15} color="#F97316" />
          <Text className="text-text-muted font-sans text-xs">COGS (Ingredients + Making)</Text>
        </View>
        <Text className="text-warning font-sans-semibold text-xs">− {fmt(totalCOGS)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-1.5 border-b border-border/30">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="pie-chart-outline" size={15} color="#1B4332" />
          <Text className="text-text-primary font-sans-medium text-xs">Gross Profit</Text>
        </View>
        <Text className="text-primary font-sans-bold text-xs">{fmt(grossProfit)}</Text>
      </View>

      <View className="flex-row justify-between items-center pb-1.5 border-b border-border/30">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={15} color="#DC2626" />
          <Text className="text-text-muted font-sans text-xs">Shop Expenses (Rent/Bills)</Text>
        </View>
        <Text className="text-danger font-sans-semibold text-xs">− {fmt(shopExpenses)}</Text>
      </View>

      <View className="flex-row justify-between items-center pt-0.5">
        <Text className="text-primary font-sans-bold text-sm">Net Profit</Text>
        <Text className="text-primary font-sans-bold text-base">{fmt(netProfit)}</Text>
      </View>
    </View>
  );
}
