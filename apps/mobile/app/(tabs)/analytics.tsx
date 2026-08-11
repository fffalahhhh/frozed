import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { fmt } from '../../components/common/constants';
import { StatCard } from '../../components/analytics/StatCard';
import { ProfitBreakdown } from '../../components/analytics/ProfitBreakdown';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import {
  getLocalOrders,
  getLocalMenuItems,
  getLocalInventory,
  getAnalyticsPasswordFromDb,
  clearAllLocalData,
} from '../../lib/db';
import { syncEngine } from '../../lib/syncEngine';
import { getLocalDateStr, getUtcRangeForLocalDate } from '../../lib/dateUtils';
import { calculateMenuItemCost } from '../../lib/stock';
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
  const queryClient = useQueryClient();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const targetPassword = useMemo(() => getAnalyticsPasswordFromDb(), []);

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('menu_items');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() => syncEngine.getStatus());

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

  useEffect(() => {
    return syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
  }, []);

  const dateRange = useMemo(
    () => getDateRange(dateFilter, selectedCustomDate),
    [dateFilter, selectedCustomDate],
  );

  const utcRange = useMemo(
    () => getUtcRangeForLocalDate(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  );

  // Server Analytics summary query (passing exact UTC range of the selected local dates)
  const queryPath = `/analytics/summary${
    utcRange.fromUtc || utcRange.toUtc
      ? `?from=${encodeURIComponent(utcRange.fromUtc)}&to=${encodeURIComponent(utcRange.toUtc)}`
      : ''
  }`;

  const {
    data: serverData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<any>({
    queryKey: ['analytics-summary', dateFilter, utcRange.fromUtc, utcRange.toUtc],
    queryFn: () => api.get(queryPath),
  });

  const isSyncingActive = isManualSyncing || isFetching || syncStatus.isSyncing;

  const handleReload = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await syncEngine.triggerSync({ forceSnapshot: true });
      await refetch();
    } catch (err) {
      console.error('[Analytics] Sync/Refetch error:', err);
    } finally {
      setIsManualSyncing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      handleReload();
    }, [handleReload]),
  );

  // Local SQLite offline fallback computation
  const localAnalyticsData = useMemo(() => {
    try {
      const { from, to } = dateRange;
      const rawOrders = getLocalOrders();
      const rawMenuItems = getLocalMenuItems();
      const rawInventory = getLocalInventory();

      const orders = Array.isArray(rawOrders) ? rawOrders : [];
      const menuItems = Array.isArray(rawMenuItems) ? rawMenuItems : [];
      const inventory = Array.isArray(rawInventory) ? rawInventory : [];

      const filteredOrders = orders.filter((o) => {
        if (!o) return false;
        if ((o.status || '').toLowerCase() !== 'paid') return false;
        if (!from || !to) return true;
        const dateStr = getLocalDateStr(o.createdAt);
        if (!dateStr) return true;
        return dateStr >= from && dateStr <= to;
      });

      let totalRevenue = 0;
      let totalCOGS = 0;

      const menuItemMap = new Map<
        string,
        {
          id: string;
          name: string;
          quantitySold: number;
          netSales: number;
          expenses: number;
          profit: number;
          marginPercent: number;
        }
      >();

      // Pre-populate menu items
      for (const m of menuItems) {
        if (!m || !m.id) continue;
        menuItemMap.set(m.id, {
          id: m.id,
          name: m.name || 'Unnamed Item',
          quantitySold: 0,
          netSales: 0,
          expenses: 0,
          profit: 0,
          marginPercent: 0,
        });
      }

      for (const o of filteredOrders) {
        totalRevenue += parseFloat(String(o.totalAmount || '0'));
        const items = Array.isArray(o.items) ? o.items : [];
        for (const item of items) {
          if (!item) continue;
          const id = item.menuItemId || item.menuItemName || 'unknown_item';
          const name = item.menuItemName || 'Unnamed Item';
          const qty = Number(item.quantity) || 1;
          const uPrice = parseFloat(String(item.unitPrice || '0'));
          const lTotal = item.lineTotal ? parseFloat(String(item.lineTotal)) : uPrice * qty;
          let iCost = parseFloat(String(item.itemCost || '0'));
          if (iCost <= 0) {
            const mItem = menuItems.find(
              (m) =>
                m &&
                (m.id === item.menuItemId ||
                  (m.name && m.name.toLowerCase() === (item.menuItemName || '').toLowerCase())),
            );
            if (mItem) {
              iCost = calculateMenuItemCost(mItem, inventory);
            }
          }
          const exp = iCost * qty;
          totalCOGS += exp;

          const existing = menuItemMap.get(id) || {
            id,
            name,
            quantitySold: 0,
            netSales: 0,
            expenses: 0,
            profit: 0,
            marginPercent: 0,
          };

          existing.quantitySold += qty;
          existing.netSales += lTotal;
          existing.expenses += exp;
          existing.profit = existing.netSales - existing.expenses;
          existing.marginPercent =
            existing.netSales > 0 ? (existing.profit / existing.netSales) * 100 : 0;
          menuItemMap.set(id, existing);
        }
      }

      const allMenuItemsList = Array.from(menuItemMap.values()).sort(
        (a, b) => (b.netSales || 0) - (a.netSales || 0),
      );

      // Group Inventory Expenses
      const inventoryMap = new Map<
        string,
        {
          id: string;
          name: string;
          unit: string;
          currentStock: number;
          costPerUnit: number;
          quantityUsed: number;
          totalExpenses: number;
        }
      >();

      for (const inv of inventory) {
        if (!inv || !inv.id) continue;
        const cPerUnit = parseFloat(String(inv.costPerUnit || '0'));
        inventoryMap.set(inv.id, {
          id: inv.id,
          name: inv.name || 'Unnamed Ingredient',
          unit: inv.unit || 'units',
          currentStock: parseFloat(String(inv.currentStock || '0')),
          costPerUnit: cPerUnit,
          quantityUsed: 0,
          totalExpenses: 0,
        });
      }

      for (const o of filteredOrders) {
        const items = Array.isArray(o.items) ? o.items : [];
        for (const item of items) {
          if (!item) continue;
          const itemMenuNameLower = (item.menuItemName || '').toLowerCase();
          const mItem = menuItems.find(
            (m) =>
              m &&
              (m.id === item.menuItemId || (m.name && m.name.toLowerCase() === itemMenuNameLower)),
          );
          if (mItem) {
            let recipesArr: any[] = [];
            if (Array.isArray(mItem.recipes)) {
              recipesArr = mItem.recipes;
            } else if (typeof mItem.recipes === 'string') {
              try {
                recipesArr = JSON.parse(mItem.recipes);
              } catch {
                recipesArr = [];
              }
            }

            const itemQty = Number(item.quantity) || 1;
            for (const rec of recipesArr) {
              if (!rec) continue;
              const reqQty = parseFloat(String(rec.quantity || '0'));
              if (reqQty > 0 && rec.ingredientName) {
                const ingNameLower = (rec.ingredientName || '').trim().toLowerCase();
                for (const invData of inventoryMap.values()) {
                  if ((invData.name || '').trim().toLowerCase() === ingNameLower) {
                    const qtyUsed = reqQty * itemQty;
                    invData.quantityUsed += qtyUsed;
                    invData.totalExpenses = invData.quantityUsed * invData.costPerUnit;
                  }
                }
              }
            }
          }
        }
      }

      const allInventoryList = Array.from(inventoryMap.values()).sort(
        (a, b) => (b.totalExpenses || 0) - (a.totalExpenses || 0),
      );

      const grossProfit = totalRevenue - totalCOGS;

      return {
        orderCount: filteredOrders.length,
        totalRevenue,
        totalCOGS,
        grossProfit,
        shopExpenses: 0,
        netProfit: grossProfit,
        allItems: allMenuItemsList,
        allInventory: allInventoryList,
      };
    } catch (err) {
      console.error('[Analytics] Local computation error:', err);
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
  }, [dateRange]);

  // Combine server & local fallback values
  const analyticsData = useMemo(() => {
    const base = localAnalyticsData || {
      orderCount: 0,
      totalRevenue: 0,
      totalCOGS: 0,
      grossProfit: 0,
      shopExpenses: 0,
      netProfit: 0,
      allItems: [],
      allInventory: [],
    };

    if (serverData && typeof serverData === 'object' && serverData.totalRevenue !== undefined) {
      const serverAllItems = Array.isArray(serverData.allItems) ? serverData.allItems : [];
      const mergedMenuItemsMap = new Map<string, any>();
      for (const localItem of base.allItems || []) {
        if (localItem && localItem.id) {
          mergedMenuItemsMap.set(localItem.id, localItem);
        }
      }
      for (const sItem of serverAllItems) {
        if (!sItem) continue;
        const itemId = sItem.menuItemId || sItem.id || 'item_' + Math.random();
        mergedMenuItemsMap.set(itemId, {
          id: itemId,
          name: sItem.name || 'Unnamed Item',
          quantitySold: Number(sItem.quantitySold || 0),
          netSales: parseFloat(String(sItem.netSales || sItem.revenue || '0')),
          expenses: parseFloat(String(sItem.expenses || '0')),
          profit: parseFloat(String(sItem.profit || '0')),
          marginPercent: parseFloat(String(sItem.marginPercent || '0')),
        });
      }

      return {
        orderCount: Number(serverData.orderCount || base.orderCount || 0),
        totalRevenue: parseFloat(String(serverData.totalRevenue || '0')),
        totalCOGS: parseFloat(String(serverData.totalCOGS || '0')),
        grossProfit: parseFloat(String(serverData.grossProfit || '0')),
        shopExpenses: parseFloat(String(serverData.shopExpenses || '0')),
        netProfit: parseFloat(String(serverData.netProfit || '0')),
        allItems: Array.from(mergedMenuItemsMap.values()).sort(
          (a, b) => (b?.netSales || 0) - (a?.netSales || 0),
        ),
        allInventory: base.allInventory || [],
      };
    }
    return base;
  }, [serverData, localAnalyticsData]);

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
