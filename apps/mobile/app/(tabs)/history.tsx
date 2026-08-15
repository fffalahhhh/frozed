import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apolloClient } from '../../lib/graphqlClient';
import { GET_ORDERS, PAY_ORDER, UPDATE_ORDER_STATUS } from '../../lib/queries';
import { fmt } from '../../components/common/constants';
import { useToastStore } from '../../store/toast';
import { OrderHistoryCard } from '../../components/history/OrderHistoryCard';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { parseDbDate, getLocalDateStr } from '../../lib/dateUtils';

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'cash' | 'upi' | 'credit'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'unpaid'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'CUSTOM'>('ALL');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const {
    data: ordersQueryResult,
    loading: isLoading,
    refetch,
  } = useQuery(GET_ORDERS, {
    fetchPolicy: 'cache-and-network',
  });

  const ordersList: any[] = ordersQueryResult?.orders || [];

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
      const existingOrder = ordersList?.find((o) => o.id === orderId);
      const existingPaymentMethod = existingOrder?.paymentMethod || 'cash';

      await apolloClient.mutate({
        mutation: PAY_ORDER,
        variables: {
          id: orderId,
          paymentMethod: existingPaymentMethod,
        },
        refetchQueries: [{ query: GET_ORDERS }],
      });

      useToastStore.getState().showToast('Order marked as Paid successfully!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to update order', 'error');
    }
  };

  const handleRevertPayment = async (orderId: string) => {
    try {
      await apolloClient.mutate({
        mutation: UPDATE_ORDER_STATUS,
        variables: {
          id: orderId,
          status: 'billed',
          paidAt: null,
        },
        refetchQueries: [{ query: GET_ORDERS }],
      });

      useToastStore.getState().showToast('Order payment status reverted!', 'success');
    } catch (err: any) {
      useToastStore.getState().showToast(err.message || 'Failed to revert order payment', 'error');
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
        const orderDate = parseDbDate(order.createdAt);
        if (orderDate) {
          if (dateFilter === 'TODAY') {
            if (orderDate < todayStart) return false;
          } else if (dateFilter === 'WEEK') {
            if (orderDate < weekAgoStart) return false;
          } else if (dateFilter === 'CUSTOM' && selectedCustomDate) {
            const orderDateStr = getLocalDateStr(orderDate);
            if (orderDateStr !== selectedCustomDate) return false;
          }
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
              <OrderHistoryCard
                key={order.id}
                order={order}
                onMarkAsPaid={handleMarkAsPaid}
                onRevertPayment={handleRevertPayment}
              />
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

      {/* Date Selection Modal */}
      <DatePickerModal
        visible={isDatePickerVisible}
        selectedDate={selectedCustomDate}
        onSelectDate={(dateStr) => {
          setSelectedCustomDate(dateStr);
          setDateFilter('CUSTOM');
        }}
        onClose={() => setIsDatePickerVisible(false)}
        onClear={() => {
          setSelectedCustomDate('');
          setDateFilter('ALL');
        }}
        title="Select Order History Date"
      />
    </View>
  );
}
