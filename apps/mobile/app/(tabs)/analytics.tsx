import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

const fmt = (n: number | string) => `₹${parseFloat(String(n || 0)).toFixed(0)}`;

export default function AnalyticsScreen() {
  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
  } = useQuery<any>({
    queryKey: ['analytics-sales'],
    queryFn: () => api.get('/analytics/sales'),
  });

  const {
    data: profitData,
    isLoading: loadingProfit,
    refetch: refetchProfit,
  } = useQuery<any>({
    queryKey: ['analytics-profit'],
    queryFn: () => api.get('/analytics/profit'),
  });

  const isLoading = loadingSales || loadingProfit;

  const handleRefresh = () => {
    refetchSales();
    refetchProfit();
  };

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-border/40 mb-3">
        <View>
          <Text className="text-text-primary font-sans-bold text-2xl">Analytics</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">
            Sales, COGS & Net Profit breakdown
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border/40"
        >
          <Ionicons name="refresh" size={20} color="#1B4332" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Calculating analytics...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {/* Stat Cards Grid */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {/* Total Revenue */}
            <View className="flex-1 min-w-[145px] bg-primary/5 rounded-3xl p-4 border border-primary/20">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-text-muted font-sans-medium text-xs">Total Revenue</Text>
                <Ionicons name="cash-outline" size={20} color="#1B4332" />
              </View>
              <Text className="text-primary font-sans-bold text-2xl">
                {fmt(salesData?.totalRevenue)}
              </Text>
              <Text className="text-text-muted font-sans text-[11px] mt-1">
                {salesData?.orderCount || 0} Orders Paid
              </Text>
            </View>

            {/* Net Profit */}
            <View className="flex-1 min-w-[145px] bg-success-bg rounded-3xl p-4 border border-primary/30">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-primary font-sans-medium text-xs">Net Profit</Text>
                <Ionicons name="trending-up" size={20} color="#1B4332" />
              </View>
              <Text className="text-primary font-sans-bold text-2xl">
                {fmt(profitData?.netProfit)}
              </Text>
              <Text className="text-primary/70 font-sans text-[11px] mt-1">
                Gross Profit − Expenses
              </Text>
            </View>
          </View>

          {/* Breakdown Section */}
          <Text className="text-text-primary font-sans-bold text-base mb-3">
            Profit & Cost Math
          </Text>

          <View className="bg-white rounded-3xl p-4 border border-border/60 shadow-sm gap-3">
            <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
              <View className="flex-row items-center gap-2">
                <Ionicons name="wallet-outline" size={18} color="#1B4332" />
                <Text className="text-text-primary font-sans-semibold text-sm">Gross Sales</Text>
              </View>
              <Text className="text-text-primary font-sans-bold text-sm">
                {fmt(profitData?.totalRevenue)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
              <View className="flex-row items-center gap-2">
                <Ionicons name="cart-outline" size={18} color="#F97316" />
                <Text className="text-text-muted font-sans text-sm">
                  COGS (Ingredients + Making)
                </Text>
              </View>
              <Text className="text-warning font-sans-semibold text-sm">
                − {fmt(profitData?.totalCOGS)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
              <View className="flex-row items-center gap-2">
                <Ionicons name="pie-chart-outline" size={18} color="#1B4332" />
                <Text className="text-text-primary font-sans-semibold text-sm">Gross Profit</Text>
              </View>
              <Text className="text-primary font-sans-bold text-sm">
                {fmt(profitData?.grossProfit)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center pb-2.5 border-b border-border/30">
              <View className="flex-row items-center gap-2">
                <Ionicons name="business-outline" size={18} color="#DC2626" />
                <Text className="text-text-muted font-sans text-sm">
                  Shop Expenses (Rent/Bills)
                </Text>
              </View>
              <Text className="text-danger font-sans-semibold text-sm">
                − {fmt(profitData?.shopExpenses)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center pt-1">
              <Text className="text-primary font-sans-bold text-base">Net Profit</Text>
              <Text className="text-primary font-sans-bold text-xl">
                {fmt(profitData?.netProfit)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
