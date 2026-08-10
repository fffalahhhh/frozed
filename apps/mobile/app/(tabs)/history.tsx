import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { fmt } from '../../components/common/constants';
import { useToastStore } from '../../store/toast';
import { OrderHistoryCard } from '../../components/history/OrderHistoryCard';

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'cash' | 'upi' | 'credit'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'CUSTOM'>('ALL');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeCalendarMonth, setActiveCalendarMonth] = useState<Date>(new Date());
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getDaysArrayForMonth = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNum: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, dateStr: `${year}-${monthStr}-${dayStr}` });
    }
    return days;
  };

  const {
    data: ordersList,
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ['orders-history'],
    queryFn: () => api.get('/orders'),
    staleTime: 1000 * 60,
  });

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      paymentFilter !== 'ALL' ||
      statusFilter !== 'ALL' ||
      dateFilter !== 'ALL' ||
      Boolean(selectedCustomDate)
    );
  }, [searchQuery, paymentFilter, statusFilter, dateFilter, selectedCustomDate]);

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}`, {
        status: 'paid',
      });
      useToastStore.getState().showToast('Order marked as Paid successfully!', 'success');
      refetch();
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to update order', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    if (!ordersList) return [];

    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

    return ordersList.filter((order) => {
      // 1. Payment filter
      if (paymentFilter !== 'ALL') {
        const pMethod = (order.paymentMethod || '').toLowerCase();
        if (pMethod !== paymentFilter) return false;
      }

      // 2. Status filter
      if (statusFilter === 'paid') {
        if ((order.status || '').toLowerCase() !== 'paid') return false;
      } else if (statusFilter === 'unpaid') {
        if ((order.status || '').toLowerCase() === 'paid') return false;
      }

      // 3. Date filter
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        if (dateFilter === 'TODAY') {
          if (orderDate < todayStart) return false;
        } else if (dateFilter === 'WEEK') {
          if (orderDate < weekAgoStart) return false;
        } else if (dateFilter === 'CUSTOM' && selectedCustomDate) {
          const orderDateStr = orderDate.toISOString().split('T')[0];
          if (orderDateStr !== selectedCustomDate) return false;
        }
      }

      // 4. Text search query (Customer name, phone, order #, payment, table, items, flavours)
      if (query) {
        const customerNameMatch = (order.customerName || '').toLowerCase().includes(query);
        const customerPhoneMatch = (order.customerPhone || '').toLowerCase().includes(query);
        const orderNumMatch = String(order.orderNumber || '')
          .toLowerCase()
          .includes(query);
        const paymentMatch = (order.paymentMethod || '').toLowerCase().includes(query);
        const tableMatch = (order.tableRef || '').toLowerCase().includes(query);

        const itemsMatch = Array.isArray(order.items)
          ? order.items.some(
              (item: any) =>
                (item.menuItemName || '').toLowerCase().includes(query) ||
                (item.flavourName || '').toLowerCase().includes(query),
            )
          : false;

        return (
          customerNameMatch ||
          customerPhoneMatch ||
          orderNumMatch ||
          paymentMatch ||
          tableMatch ||
          itemsMatch
        );
      }

      return true;
    });
  }, [ordersList, searchQuery, paymentFilter, statusFilter, dateFilter, selectedCustomDate]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);
  }, [filteredOrders]);

  const resetFilters = () => {
    setSearchQuery('');
    setPaymentFilter('ALL');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setSelectedCustomDate('');
  };

  const handlePickTodayDate = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedCustomDate(todayStr);
    setDateFilter('CUSTOM');
    setIsDatePickerVisible(false);
  };

  const handlePickYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedCustomDate(d.toISOString().split('T')[0]);
    setDateFilter('CUSTOM');
    setIsDatePickerVisible(false);
  };

  return (
    <View className="flex-1 bg-white pt-12 px-5">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-text-primary font-sans-bold text-2xl">Order History</Text>
          <Text className="text-text-muted font-sans text-xs mt-0.5">
            Filter cash, UPI, or credit orders & select dates
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={resetFilters}
              className="flex-row items-center gap-1 px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200"
            >
              <Ionicons name="close-circle" size={15} color="#E11D48" />
              <Text className="text-rose-700 font-sans-bold text-xs">Clear Filters</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => refetch()}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-border/40"
          >
            <Ionicons name="refresh" size={20} color="#1B4332" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View className="relative mb-3.5">
        <View className="flex-row items-center border border-border/80 rounded-2xl px-4 py-3 bg-surface">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by customer name, phone, flavour..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2.5 font-sans text-sm text-text-primary"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Spacious Filter Chips Bar */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row py-1"
          contentContainerStyle={{ paddingRight: 10 }}
        >
          {/* Payment Method Pills */}
          <TouchableOpacity
            onPress={() => setPaymentFilter('ALL')}
            className={`px-4 py-2.5 rounded-2xl border mr-2.5 ${
              paymentFilter === 'ALL'
                ? 'bg-[#1B4332] border-[#1B4332]'
                : 'bg-white border-border/80'
            }`}
          >
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: paymentFilter === 'ALL' ? '#FFFFFF' : '#374151' }}
            >
              All Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentFilter('cash')}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              paymentFilter === 'cash'
                ? 'bg-emerald-700 border-emerald-700'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <Ionicons
              name="cash-outline"
              size={15}
              color={paymentFilter === 'cash' ? '#FFF' : '#047857'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: paymentFilter === 'cash' ? '#FFFFFF' : '#047857' }}
            >
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentFilter('upi')}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              paymentFilter === 'upi'
                ? 'bg-indigo-700 border-indigo-700'
                : 'bg-indigo-50/70 border-indigo-200'
            }`}
          >
            <Ionicons
              name="qr-code-outline"
              size={15}
              color={paymentFilter === 'upi' ? '#FFF' : '#4338CA'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: paymentFilter === 'upi' ? '#FFFFFF' : '#4338CA' }}
            >
              UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentFilter('credit')}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              paymentFilter === 'credit'
                ? 'bg-amber-600 border-amber-600'
                : 'bg-amber-50/70 border-amber-300'
            }`}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={paymentFilter === 'credit' ? '#FFF' : '#B45309'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: paymentFilter === 'credit' ? '#FFFFFF' : '#B45309' }}
            >
              Credit
            </Text>
          </TouchableOpacity>

          {/* Separator Line */}
          <View className="h-6 w-[1px] bg-border/60 self-center mr-2.5 mx-1" />

          {/* Paid / Unpaid Status Pills */}
          <TouchableOpacity
            onPress={() => setStatusFilter(statusFilter === 'paid' ? 'ALL' : 'paid')}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              statusFilter === 'paid'
                ? 'bg-emerald-800 border-emerald-800'
                : 'bg-emerald-50/60 border-emerald-200'
            }`}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={15}
              color={statusFilter === 'paid' ? '#FFF' : '#047857'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: statusFilter === 'paid' ? '#FFFFFF' : '#047857' }}
            >
              Paid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatusFilter(statusFilter === 'unpaid' ? 'ALL' : 'unpaid')}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              statusFilter === 'unpaid'
                ? 'bg-amber-600 border-amber-600'
                : 'bg-amber-50/60 border-amber-300'
            }`}
          >
            <Ionicons
              name="alert-circle-outline"
              size={15}
              color={statusFilter === 'unpaid' ? '#FFF' : '#B45309'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: statusFilter === 'unpaid' ? '#FFFFFF' : '#B45309' }}
            >
              Unpaid
            </Text>
          </TouchableOpacity>

          {/* Separator Line */}
          <View className="h-6 w-[1px] bg-border/60 self-center mr-2.5 mx-1" />

          {/* Date Filter Pills */}
          <TouchableOpacity
            onPress={() => {
              setDateFilter(dateFilter === 'TODAY' ? 'ALL' : 'TODAY');
              setSelectedCustomDate('');
            }}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              dateFilter === 'TODAY'
                ? 'bg-[#1B4332] border-[#1B4332]'
                : 'bg-surface border-border/80'
            }`}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={dateFilter === 'TODAY' ? '#FFF' : '#374151'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: dateFilter === 'TODAY' ? '#FFFFFF' : '#374151' }}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setDateFilter(dateFilter === 'WEEK' ? 'ALL' : 'WEEK');
              setSelectedCustomDate('');
            }}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              dateFilter === 'WEEK'
                ? 'bg-[#1B4332] border-[#1B4332]'
                : 'bg-surface border-border/80'
            }`}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={dateFilter === 'WEEK' ? '#FFF' : '#374151'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: dateFilter === 'WEEK' ? '#FFFFFF' : '#374151' }}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsDatePickerVisible(true)}
            className={`px-4 py-2.5 rounded-2xl border flex-row items-center gap-1.5 mr-2.5 ${
              dateFilter === 'CUSTOM'
                ? 'bg-[#1B4332] border-[#1B4332]'
                : 'bg-surface border-border/80'
            }`}
          >
            <Ionicons
              name="calendar"
              size={14}
              color={dateFilter === 'CUSTOM' ? '#FFF' : '#1B4332'}
            />
            <Text
              className="font-sans-semibold text-xs"
              style={{ color: dateFilter === 'CUSTOM' ? '#FFFFFF' : '#1B4332' }}
            >
              {dateFilter === 'CUSTOM' && selectedCustomDate ? selectedCustomDate : 'Select Date'}
            </Text>
          </TouchableOpacity>

          {hasActiveFilters && (
            <>
              <View className="h-6 w-[1px] bg-border/60 self-center mr-2.5 mx-1" />
              <TouchableOpacity
                onPress={resetFilters}
                className="px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 flex-row items-center gap-1.5 mr-2.5"
              >
                <Ionicons name="trash-outline" size={14} color="#E11D48" />
                <Text className="text-rose-700 font-sans-bold text-xs">Clear All</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* Summary KPI Bar */}
      <View className="flex-row items-center justify-between bg-surface/90 border border-border/60 rounded-2xl px-4 py-2.5 mb-3.5">
        <Text className="text-text-muted font-sans-medium text-xs">
          Showing <Text className="text-text-primary font-sans-bold">{filteredOrders.length}</Text>{' '}
          order{filteredOrders.length !== 1 ? 's' : ''}
        </Text>

        <View className="flex-row items-center gap-1">
          <Text className="text-text-muted font-sans text-xs">Total Revenue:</Text>
          <Text className="text-primary font-sans-bold text-base" style={{ color: '#1B4332' }}>
            {fmt(totalFilteredRevenue)}
          </Text>
        </View>
      </View>

      {/* Main Order History List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1B4332" />
          <Text className="text-text-muted font-sans text-xs mt-2">Loading orders...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} onMarkAsPaid={handleMarkAsPaid} />
            ))
          ) : (
            <View className="items-center justify-center py-16 px-4">
              <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-3 border border-border/40">
                <Ionicons name="search-outline" size={32} color="#9CA3AF" />
              </View>
              <Text className="text-text-primary font-sans-bold text-base text-center">
                No matching orders found
              </Text>
              <Text className="text-text-muted font-sans text-xs text-center mt-1 mb-4">
                Try selecting a different date or payment method filter
              </Text>
              <TouchableOpacity
                onPress={resetFilters}
                className="px-4 py-2.5 bg-primary/10 rounded-xl border border-primary/20"
              >
                <Text
                  className="text-primary font-sans-semibold text-xs"
                  style={{ color: '#1B4332' }}
                >
                  Clear All Filters & Search
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Date Picker Modal with Interactive Calendar Grid */}
      <Modal visible={isDatePickerVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end sm:justify-center items-center p-0 sm:p-5">
          <View className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md border border-border/60">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="calendar" size={20} color="#1B4332" />
                <Text className="text-text-primary font-sans-bold text-lg">Select Date</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDatePickerVisible(false)} className="p-1">
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View className="flex-row items-center gap-2 mb-4">
              <TouchableOpacity
                onPress={handlePickTodayDate}
                className="flex-1 py-2.5 px-3 rounded-xl border border-primary/30 bg-primary/10 items-center"
              >
                <Text
                  className="text-primary font-sans-semibold text-xs"
                  style={{ color: '#1B4332' }}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickYesterdayDate}
                className="flex-1 py-2.5 px-3 rounded-xl border border-border/80 bg-surface items-center"
              >
                <Text className="text-text-primary font-sans-medium text-xs">Yesterday</Text>
              </TouchableOpacity>

              {selectedCustomDate ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCustomDate('');
                    setDateFilter('ALL');
                    setIsDatePickerVisible(false);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 items-center"
                >
                  <Text className="text-rose-700 font-sans-semibold text-xs">Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Calendar Month Header & Navigation */}
            <View className="flex-row items-center justify-between bg-surface/80 px-4 py-2.5 rounded-2xl border border-border/50 mb-3">
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(activeCalendarMonth);
                  d.setMonth(d.getMonth() - 1);
                  setActiveCalendarMonth(d);
                }}
                className="p-1.5 rounded-lg bg-white border border-border/60"
              >
                <Ionicons name="chevron-back" size={16} color="#1B4332" />
              </TouchableOpacity>

              <Text className="text-text-primary font-sans-bold text-sm">
                {activeCalendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const d = new Date(activeCalendarMonth);
                  d.setMonth(d.getMonth() + 1);
                  setActiveCalendarMonth(d);
                }}
                className="p-1.5 rounded-lg bg-white border border-border/60"
              >
                <Ionicons name="chevron-forward" size={16} color="#1B4332" />
              </TouchableOpacity>
            </View>

            {/* Day of Week Header */}
            <View className="flex-row items-center mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName, i) => (
                <View key={i} className="w-[14.28%] items-center py-1">
                  <Text className="text-text-muted font-sans-semibold text-[11px] uppercase">
                    {dayName}
                  </Text>
                </View>
              ))}
            </View>

            {/* Interactive Calendar Days Grid */}
            <View className="flex-row flex-wrap mb-4">
              {getDaysArrayForMonth(activeCalendarMonth).map((cell, idx) => {
                if (!cell.dayNum || !cell.dateStr) {
                  return <View key={idx} className="w-[14.28%] h-10" />;
                }

                const isSelected = selectedCustomDate === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <View key={idx} className="w-[14.28%] h-10 items-center justify-center p-0.5">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCustomDate(cell.dateStr!);
                        setDateFilter('CUSTOM');
                        setIsDatePickerVisible(false);
                      }}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isSelected
                          ? 'bg-[#1B4332]'
                          : isToday
                            ? 'bg-emerald-100 border border-emerald-400'
                            : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-xs font-sans-semibold ${
                          isSelected
                            ? 'text-white'
                            : isToday
                              ? 'text-emerald-900'
                              : 'text-text-primary'
                        }`}
                      >
                        {cell.dayNum}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Selected Date Summary & Confirm */}
            {selectedCustomDate ? (
              <View className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={18} color="#1B4332" />
                  <Text
                    className="text-primary font-sans-bold text-xs"
                    style={{ color: '#1B4332' }}
                  >
                    Selected: {selectedCustomDate}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsDatePickerVisible(false)}
                  className="px-3 py-1.5 bg-[#1B4332] rounded-xl"
                >
                  <Text className="text-white font-sans-bold text-xs">Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
