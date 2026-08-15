import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { GET_ANALYTICS, GET_ANALYTICS_SECURITY } from '../../lib/queries';
import { fmt } from '../../components/common/constants';
import { StatCard } from '../../components/analytics/StatCard';
import { ProfitBreakdown } from '../../components/analytics/ProfitBreakdown';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { getLocalDateStr, getUtcRangeForLocalDate } from '../../lib/dateUtils';
import { useToastStore } from '../../store/toast';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'all' | 'custom';
type ViewTab = 'menu_items' | 'inventory_expenses';

const DATE_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'all', label: 'All Time' },
];

function getDateRange(filter: DateFilter, customDate?: string) {
  const now = new Date();
  if (filter === 'today') {
    const d = getLocalDateStr(now);
    return { from: d, to: d, label: 'Today' };
  }
  if (filter === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = getLocalDateStr(y);
    return { from: d, to: d, label: 'Yesterday' };
  }
  if (filter === 'this_week') {
    const w = new Date(now);
    w.setDate(w.getDate() - 6);
    return { from: getLocalDateStr(w), to: getLocalDateStr(now), label: 'This Week' };
  }
  if (filter === 'custom' && customDate) {
    return { from: customDate, to: customDate, label: customDate };
  }
  return { from: '', to: '', label: 'All Time' };
}

export default function AnalyticsScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const { data: secData } = useQuery(GET_ANALYTICS_SECURITY, {
    fetchPolicy: 'cache-and-network',
  });
  const targetPassword = secData?.analyticsSecurityPassword || 'Frozed2026';

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('menu_items');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleUnlock = () => {
    if (!enteredPassword) {
      setPasswordError('Please enter the password');
      return;
    }

    if (enteredPassword === targetPassword) {
      setIsUnlocked(true);
      setPasswordError('');
      useToastStore.getState().showToast('Analytics unlocked', 'success');
    } else {
      setPasswordError('Incorrect password. Access denied.');
      useToastStore.getState().showToast('Incorrect password', 'error');
    }
  };

  const dateRange = useMemo(
    () => getDateRange(dateFilter, selectedCustomDate),
    [dateFilter, selectedCustomDate],
  );

  const utcRange = useMemo(
    () => getUtcRangeForLocalDate(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  );

  const {
    data: analyticsResult,
    loading: isLoading,
    refetch,
  } = useQuery(GET_ANALYTICS, {
    variables: {
      from: utcRange.fromUtc || null,
      to: utcRange.toUtc || null,
    },
    fetchPolicy: 'cache-and-network',
  });

  const summary = analyticsResult?.analyticsSummary || null;
  const isSyncingActive = isManualSyncing || isLoading;

  const handleReload = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('[Analytics] Refetch error:', err);
    } finally {
      setIsManualSyncing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      handleReload();
    }, [handleReload]),
  );

  const analyticsData = useMemo(() => {
    if (!summary) {
      return {
        orderCount: 0,
        totalRevenue: 0,
        totalCOGS: 0,
        grossProfit: 0,
        shopExpenses: 0,
        netProfit: 0,
        allItems: [],
        allInventory: [],
      };
    }

    return {
      orderCount: Number(summary.orderCount || 0),
      totalRevenue: parseFloat(String(summary.totalRevenue || '0')),
      totalCOGS: parseFloat(String(summary.totalCOGS || '0')),
      grossProfit: parseFloat(String(summary.grossProfit || '0')),
      shopExpenses: parseFloat(String(summary.shopExpenses || '0')),
      netProfit: parseFloat(String(summary.netProfit || '0')),
      allItems: Array.isArray(summary.allItems) ? summary.allItems : [],
      allInventory: [],
    };
  }, [summary]);

  // Filtered menu items by search query
  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const items = Array.isArray(analyticsData?.allItems) ? analyticsData.allItems : [];
    if (!q) return items;
    return items.filter((i: any) => (i?.name || '').toLowerCase().includes(q));
  }, [analyticsData?.allItems, searchQuery]);

  // Filtered inventory items by search query
  const filteredInventoryItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const items = Array.isArray(analyticsData?.allInventory) ? analyticsData.allInventory : [];
    if (!q) return items;
    return items.filter((i: any) => (i?.name || '').toLowerCase().includes(q));
  }, [analyticsData?.allInventory, searchQuery]);

  if (!isUnlocked) {
    return (
      <View className="flex-1 bg-[#F9F8F6] pt-12 px-5 items-center justify-center">
        <View className="w-full max-w-sm bg-white rounded-3xl p-6 border border-border/80 shadow-md items-center">
          <View className="w-16 h-16 rounded-2xl bg-[#1B4332]/10 items-center justify-center mb-4 border border-[#1B4332]/20">
            <Ionicons name="lock-closed" size={30} color="#1B4332" />
          </View>

          <Text className="text-text-primary font-sans-bold text-xl text-center">
            Analytics Security Lock
          </Text>
          <Text className="text-text-muted font-sans text-xs text-center mt-1 mb-6 px-1">
            Enter the 10-character password to unlock sales, expenses, and profit reports.
          </Text>

          <View className="w-full mb-4">
            <View className="flex-row items-center justify-between mb-1.5 px-1">
              <Text className="text-text-primary font-sans-semibold text-xs">Password</Text>
              <Text className="text-text-muted font-sans-medium text-[11px]">
                {enteredPassword.length}/10
              </Text>
            </View>
            <View className="flex-row items-center bg-surface border border-border/80 rounded-2xl px-3 py-1.5">
              <Ionicons name="key-outline" size={18} color="#6B7280" />
              <TextInput
                value={enteredPassword}
                onChangeText={(txt) => {
                  setEnteredPassword(txt);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter 10-char password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                maxLength={10}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-sans text-sm text-text-primary px-2.5 py-1.5"
                onSubmitEditing={handleUnlock}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#6B7280"
                />
              </Pressable>
            </View>
            {passwordError ? (
              <Text className="text-rose-600 font-sans text-xs mt-1.5 px-1">{passwordError}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleUnlock}
            className="w-full py-3.5 bg-[#1B4332] rounded-2xl items-center justify-center shadow-sm"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
              <Text className="text-white font-sans-bold text-sm">Unlock Analytics</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-10 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-2 border-b border-border/40 mb-2.5">
        <View>
          <Text className="text-text-primary font-sans-bold text-xl">Analytics</Text>
          <Text className="text-text-muted font-sans text-[11px] mt-0.5">
            Sales, Expenses, Profits & Inventory Costs
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => {
              setIsUnlocked(false);
              setEnteredPassword('');
            }}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center border border-border/40"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="lock-closed-outline" size={15} color="#1B4332" />
          </Pressable>

          <Pressable
            onPress={handleReload}
            disabled={isSyncingActive}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center border border-border/40"
            style={({ pressed }) => ({ opacity: pressed || isSyncingActive ? 0.7 : 1 })}
          >
            {isSyncingActive ? (
              <ActivityIndicator size="small" color="#1B4332" />
            ) : (
              <Ionicons name="refresh" size={16} color="#1B4332" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Date Selector Pills */}
      <View className="flex-row items-center bg-[#F4F1EA] p-1 rounded-2xl mb-3 border border-border/40">
        {DATE_OPTIONS.map((opt) => {
          const isActive = dateFilter === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setDateFilter(opt.key)}
              className={`flex-1 py-2 rounded-full items-center justify-center ${
                isActive ? 'bg-[#0D4830]' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-sans-bold text-xs ${isActive ? 'text-white' : 'text-gray-600'}`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Custom Specific Date Selection Option */}
        <Pressable
          onPress={() => setIsDatePickerVisible(true)}
          className={`flex-1 py-2 px-1 rounded-full items-center justify-center flex-row gap-1 ${
            dateFilter === 'custom' ? 'bg-[#0D4830]' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={dateFilter === 'custom' ? '#FFFFFF' : '#4B5563'}
          />
          <Text
            className={`font-sans-bold text-xs ${
              dateFilter === 'custom' ? 'text-white' : 'text-gray-600'
            }`}
            numberOfLines={1}
          >
            {dateFilter === 'custom' && selectedCustomDate ? selectedCustomDate : 'Select Date'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-20" showsVerticalScrollIndicator={false}>
          {/* Summary Stat Cards Grid */}
          <View className="flex-row gap-2 mb-3">
            <StatCard
              title="Total Revenue"
              value={analyticsData?.totalRevenue || 0}
              subtitle={`${analyticsData?.orderCount || 0} Orders Paid`}
              iconName="cash-outline"
              variant="primary"
            />
            <StatCard
              title="Total Expenses"
              value={(analyticsData?.totalCOGS || 0) + (analyticsData?.shopExpenses || 0)}
              subtitle="COGS + Shop Bills"
              iconName="receipt-outline"
              variant="warning"
            />
            <StatCard
              title="Net Profit"
              value={analyticsData?.netProfit || 0}
              subtitle="Gross − Expenses"
              iconName="trending-up"
              variant="success"
            />
          </View>

          {/* Profit & Cost Math Breakdown */}
          <View className="mb-4">
            <Text className="text-text-primary font-sans-bold text-xs uppercase tracking-wider mb-2">
              Financial Summary
            </Text>
            <ProfitBreakdown
              totalRevenue={analyticsData?.totalRevenue || 0}
              totalCOGS={analyticsData?.totalCOGS || 0}
              grossProfit={analyticsData?.grossProfit || 0}
              shopExpenses={analyticsData?.shopExpenses || 0}
              netProfit={analyticsData?.netProfit || 0}
            />
          </View>

          {/* Section Selector Tabs */}
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-text-primary font-sans-bold text-xs uppercase tracking-wider">
              Detailed Breakdown
            </Text>

            {/* View Switcher: Menu Items vs Inventory Expenses */}
            <View className="flex-row bg-[#F4F1EA] p-0.5 rounded-xl border border-border/40">
              <Pressable
                onPress={() => setActiveTab('menu_items')}
                className={`px-3 py-1 rounded-lg flex-row items-center gap-1 ${
                  activeTab === 'menu_items' ? 'bg-[#1B4332]' : ''
                }`}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons
                  name="fast-food-outline"
                  size={12}
                  color={activeTab === 'menu_items' ? '#FFF' : '#4B5563'}
                />
                <Text
                  className={`text-[10.5px] font-sans-semibold ${
                    activeTab === 'menu_items' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Menu Items ({filteredMenuItems.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('inventory_expenses')}
                className={`px-3 py-1 rounded-lg flex-row items-center gap-1 ${
                  activeTab === 'inventory_expenses' ? 'bg-[#1B4332]' : ''
                }`}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Ionicons
                  name="cube-outline"
                  size={12}
                  color={activeTab === 'inventory_expenses' ? '#FFF' : '#4B5563'}
                />
                <Text
                  className={`text-[10.5px] font-sans-semibold ${
                    activeTab === 'inventory_expenses' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  Inventory ({filteredInventoryItems.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Search Box */}
          <View className="flex-row items-center bg-[#F9F8F5] border border-border/60 rounded-xl px-3 py-2 mb-3">
            <Ionicons name="search-outline" size={15} color="#6B7280" className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === 'menu_items'
                  ? 'Search menu items by name...'
                  : 'Search inventory ingredients...'
              }
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-xs text-text-primary font-sans py-0"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* TAB 1: ALL MENU ITEMS FINANCIAL BREAKDOWN */}
          {activeTab === 'menu_items' && (
            <View className="gap-2 mb-6">
              {filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item: any, idx: number) => {
                  const profitVal = Number(item?.profit || 0);
                  const isProfitPositive = profitVal >= 0;
                  const marginVal = Number(item?.marginPercent || 0);
                  return (
                    <View
                      key={item?.id || idx}
                      className="bg-white rounded-2xl p-3 border border-border/60 shadow-sm"
                    >
                      {/* Top Row: Rank & Name | Count & Profit Badge */}
                      <View className="flex-row items-center justify-between pb-2 border-b border-border/20 mb-2">
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <View
                            className="w-5 h-5 rounded-full items-center justify-center"
                            style={{ backgroundColor: idx === 0 ? '#1B4332' : '#F3F4F6' }}
                          >
                            <Text
                              className="font-sans-bold text-[9px]"
                              style={{ color: idx === 0 ? '#fff' : '#6B7280' }}
                            >
                              {idx + 1}
                            </Text>
                          </View>
                          <Text
                            className="text-text-primary font-sans-bold text-xs flex-1"
                            numberOfLines={1}
                          >
                            {item?.name || 'Unnamed Item'}
                          </Text>
                        </View>

                        {/* Sold Count Badge */}
                        <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <Text className="text-[#1B4332] font-sans-bold text-[10px]">
                            {item?.quantitySold || 0} sold
                          </Text>
                        </View>
                      </View>

                      {/* Financial Metrics Grid: Net Sales | Expenses | Profit | Margin */}
                      <View className="flex-row items-center justify-between bg-[#F9F8F5] p-2.5 rounded-xl">
                        <View className="items-start flex-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">Net Sales</Text>
                          <Text className="text-text-primary font-sans-bold text-xs">
                            {fmt(item?.netSales)}
                          </Text>
                        </View>

                        <View className="items-center flex-1 border-x border-border/40 px-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">Expenses</Text>
                          <Text className="text-amber-700 font-sans-semibold text-xs">
                            {fmt(item?.expenses)}
                          </Text>
                        </View>

                        <View className="items-end flex-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">Profit</Text>
                          <Text
                            className={`font-sans-bold text-xs ${
                              isProfitPositive ? 'text-[#1B4332]' : 'text-rose-600'
                            }`}
                          >
                            {fmt(item?.profit)}
                          </Text>
                        </View>
                      </View>

                      {/* Footer Badge: Margin Percentage */}
                      <View className="flex-row items-center justify-between mt-2 pt-1">
                        <Text className="text-text-muted font-sans text-[10px]">Profit Margin</Text>
                        <View
                          className={`px-2 py-0.2 rounded-md ${
                            marginVal >= 50
                              ? 'bg-emerald-100'
                              : marginVal > 0
                                ? 'bg-amber-100'
                                : 'bg-rose-100'
                          }`}
                        >
                          <Text
                            className={`text-[9.5px] font-sans-bold ${
                              marginVal >= 50
                                ? 'text-emerald-800'
                                : marginVal > 0
                                  ? 'text-amber-800'
                                  : 'text-rose-800'
                            }`}
                          >
                            {marginVal.toFixed(1)}% margin
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="bg-white rounded-2xl p-6 items-center justify-center border border-border/60">
                  <Ionicons name="alert-circle-outline" size={24} color="#9CA3AF" />
                  <Text className="text-text-muted font-sans text-xs mt-1">
                    No menu items found for {(dateRange?.label || '').toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: INVENTORY ITEM EXPENSES BREAKDOWN */}
          {activeTab === 'inventory_expenses' && (
            <View className="gap-2 mb-6">
              {filteredInventoryItems.length > 0 ? (
                filteredInventoryItems.map((item: any, idx: number) => {
                  const qtyUsed = Number(item?.quantityUsed || 0);
                  const currentStock = Number(item?.currentStock || 0);
                  return (
                    <View
                      key={item?.id || idx}
                      className="bg-white rounded-2xl p-3 border border-border/60 shadow-sm"
                    >
                      {/* Top Row: Ingredient Name + Unit Price */}
                      <View className="flex-row items-center justify-between pb-2 border-b border-border/20 mb-2">
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <Ionicons name="cube-outline" size={14} color="#1B4332" />
                          <Text
                            className="text-text-primary font-sans-bold text-xs flex-1"
                            numberOfLines={1}
                          >
                            {item?.name || 'Unnamed Ingredient'}
                          </Text>
                        </View>

                        <Text className="text-text-muted font-sans-medium text-[10px]">
                          Cost: {fmt(item?.costPerUnit)} / {item?.unit || 'unit'}
                        </Text>
                      </View>

                      {/* Financial Metrics Grid: Current Stock | Qty Used | Total Expense */}
                      <View className="flex-row items-center justify-between bg-[#F9F8F5] p-2.5 rounded-xl">
                        <View className="items-start flex-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">In Stock</Text>
                          <Text className="text-text-primary font-sans-bold text-xs">
                            {currentStock} {item?.unit || ''}
                          </Text>
                        </View>

                        <View className="items-center flex-1 border-x border-border/40 px-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">Qty Used</Text>
                          <Text className="text-[#1B4332] font-sans-bold text-xs">
                            {qtyUsed.toFixed(1)} {item?.unit || ''}
                          </Text>
                        </View>

                        <View className="items-end flex-1">
                          <Text className="text-text-muted font-sans text-[9.5px]">
                            Total Expense
                          </Text>
                          <Text className="text-amber-700 font-sans-bold text-xs">
                            {fmt(item?.totalExpenses)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="bg-white rounded-2xl p-6 items-center justify-center border border-border/60">
                  <Ionicons name="alert-circle-outline" size={24} color="#9CA3AF" />
                  <Text className="text-text-muted font-sans text-xs mt-1">
                    No inventory usage recorded for {(dateRange?.label || '').toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Date Selection Modal */}
      <DatePickerModal
        visible={isDatePickerVisible}
        selectedDate={selectedCustomDate}
        onSelectDate={(dateStr) => {
          setSelectedCustomDate(dateStr);
          setDateFilter('custom');
        }}
        onClose={() => setIsDatePickerVisible(false)}
        onClear={() => {
          setSelectedCustomDate('');
          setDateFilter('today');
        }}
        title="Select Analytics Date"
      />
    </View>
  );
}
