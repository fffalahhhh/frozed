import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { fmt } from '../../components/common/constants';
import { StatCard } from '../../components/analytics/StatCard';
import { ProfitBreakdown } from '../../components/analytics/ProfitBreakdown';

export default function AnalyticsScreen() {
  // Single request — server runs all 4 queries in parallel and returns everything at once
  const {
    data,
    isLoading,
    refetch,
  } = useQuery<any>({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get('/analytics/summary'),
  });

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
          onPress={() => refetch()}
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
            <StatCard
              title="Total Revenue"
              value={data?.totalRevenue}
              subtitle={`${data?.orderCount || 0} Orders Paid`}
              iconName="cash-outline"
              variant="primary"
            />
            <StatCard
              title="Net Profit"
              value={data?.netProfit}
              subtitle="Gross Profit − Expenses"
              iconName="trending-up"
              variant="success"
            />
          </View>

          {/* Breakdown Section */}
          <Text className="text-text-primary font-sans-bold text-base mb-3">
            Profit & Cost Math
          </Text>

          <ProfitBreakdown
            totalRevenue={data?.totalRevenue}
            totalCOGS={data?.totalCOGS}
            grossProfit={data?.grossProfit}
            shopExpenses={data?.shopExpenses}
            netProfit={data?.netProfit}
          />

          {/* Top Selling Items */}
          {data?.topItems && data.topItems.length > 0 && (
            <View className="mt-4">
              <Text className="text-text-primary font-sans-bold text-base mb-3">
                Top Selling Items
              </Text>
              <View className="bg-white rounded-3xl p-4 border border-border/60 shadow-sm gap-2.5">
                {data.topItems.map((item: any, idx: number) => (
                  <View
                    key={item.menuItemId}
                    className="flex-row items-center justify-between py-1.5 border-b border-border/20 last:border-0"
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      <View
                        className="w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: idx === 0 ? '#1B4332' : '#F3F4F6' }}
                      >
                        <Text
                          className="font-sans-bold text-[10px]"
                          style={{ color: idx === 0 ? '#fff' : '#6B7280' }}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        className="text-text-primary font-sans-medium text-sm flex-1"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-sans-bold text-sm" style={{ color: '#1B4332' }}>
                        {fmt(item.revenue)}
                      </Text>
                      <Text className="text-text-muted font-sans text-[10px]">
                        {item.quantitySold} sold
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
