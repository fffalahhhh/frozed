import React, { useState, useRef, useEffect, useMemo } from 'react';
import { formatDateLocalized } from '../../../lib/dateUtils';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmt } from '../../common/constants';

export interface OrderHistoryCardProps {
  order: any;
  onMarkAsPaid?: (orderId: string) => void;
  onRevertPayment?: (orderId: string) => void;
}

export function OrderHistoryCard({ order, onMarkAsPaid, onRevertPayment }: OrderHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const getPaymentBadge = (method?: string) => {
    const m = (method || '').toLowerCase();
    if (m === 'credit') {
      return {
        label: 'Credit',
        icon: 'people-outline',
        bg: 'bg-amber-50 border-amber-300',
        text: 'text-amber-800',
        color: '#92400E',
      };
    }
    if (m === 'cash') {
      return {
        label: 'Cash',
        icon: 'cash-outline',
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        color: '#047857',
      };
    }
    if (m === 'upi') {
      return {
        label: 'UPI',
        icon: 'qr-code-outline',
        bg: 'bg-indigo-50 border-indigo-200',
        text: 'text-indigo-700',
        color: '#4338CA',
      };
    }
    if (m === 'card') {
      return {
        label: 'Card',
        icon: 'card-outline',
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-700',
        color: '#6B21A8',
      };
    }
    return {
      label: method || 'Cash',
      icon: 'wallet-outline',
      bg: 'bg-gray-100 border-gray-200',
      text: 'text-gray-700',
      color: '#374151',
    };
  };

  const payInfo = getPaymentBadge(order.paymentMethod);
  const items = Array.isArray(order.items) ? order.items : [];
  const isPaid = (order.status || '').toLowerCase() === 'paid';
  const isCreditOrder = (order.paymentMethod || '').toLowerCase() === 'credit';

  // 5-minute window check for reverting paid status (ONLY for Credit orders)
  const canRevert = useMemo(() => {
    if (!isPaid || !order.paidAt || !isCreditOrder) return false;
    const paidTime = new Date(order.paidAt).getTime();
    const diffMinutes = (now - paidTime) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes < 5;
  }, [isPaid, order.paidAt, isCreditOrder, now]);

  const formatDate = (dateStr: string) => {
    return formatDateLocalized(dateStr);
  };

  const handleMarkPaid = () => {
    if (!onMarkAsPaid) return;
    Alert.alert(
      'Confirm Payment',
      `Mark Order #${order.orderNumber} (${order.customerName ? order.customerName.trim() : 'Walk-in'}) as Paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Paid',
          style: 'default',
          onPress: async () => {
            try {
              if (isMounted.current) setIsUpdating(true);
              await onMarkAsPaid(order.id);
            } finally {
              if (isMounted.current) {
                setIsUpdating(false);
              }
            }
          },
        },
      ],
    );
  };

  const handleRevertPayment = () => {
    if (!onRevertPayment) return;
    Alert.alert(
      'Revert Payment',
      `Revert payment for Order #${order.orderNumber} back to Unpaid/Credit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isMounted.current) setIsUpdating(true);
              await onRevertPayment(order.id);
            } finally {
              if (isMounted.current) {
                setIsUpdating(false);
              }
            }
          },
        },
      ],
    );
  };

  return (
    <View
      className="bg-white rounded-2xl p-2.5 px-3 mb-2 border border-border/60 shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {/* Top Main Row: Subdued Date/Time • #OrderNumber • Customer | Badges + Amount */}
      <View className="flex-row items-center justify-between pb-1.5 border-b border-border/40">
        <View className="flex-row items-center flex-1 pr-2 flex-wrap">
          <Text className="text-text-muted font-sans text-[11px]">
            {formatDate(order.createdAt)}
          </Text>
          <Text className="text-text-muted font-sans text-[11px] mx-1">•</Text>
          <Text className="text-text-primary font-sans-bold text-xs">#{order.orderNumber}</Text>
          <Text className="text-text-muted font-sans text-[11px] mx-1">•</Text>
          <Text className="text-text-primary font-sans-medium text-xs" numberOfLines={1}>
            {order.customerName ? order.customerName.trim() : 'Walk-in'}
          </Text>
          {order.tableRef || order.orderType === 'takeaway' ? (
            <Text className="text-text-muted font-sans text-[11px] ml-1" numberOfLines={1}>
              ({order.tableRef || 'Takeaway'})
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1.5 ml-auto">
          {/* Payment Method Badge */}
          <View
            className={`px-2 py-0.5 rounded-lg border flex-row items-center gap-1 ${payInfo.bg}`}
          >
            <Ionicons name={payInfo.icon as any} size={10} color={payInfo.color} />
            <Text className={`text-[10px] font-sans-semibold ${payInfo.text}`}>
              {payInfo.label}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            className={`px-2 py-0.5 rounded-lg border ${
              isPaid ? 'bg-emerald-100/70 border-emerald-300' : 'bg-amber-100/70 border-amber-300'
            }`}
          >
            <Text
              className={`text-[10px] font-sans-bold uppercase ${
                isPaid ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {isPaid ? 'PAID' : 'CREDIT'}
            </Text>
          </View>

          {/* Mark Paid Action */}
          {!isPaid && onMarkAsPaid ? (
            <TouchableOpacity
              onPress={handleMarkPaid}
              disabled={isUpdating}
              className="px-2 py-0.5 rounded-lg bg-[#4A2810] active:opacity-80 flex-row items-center gap-1"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-sans-bold text-[10px]">Mark Paid</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Revert / Undo Payment Action (5 min window) */}
          {isPaid && canRevert && onRevertPayment ? (
            <TouchableOpacity
              onPress={handleRevertPayment}
              disabled={isUpdating}
              className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 active:opacity-80 flex-row items-center gap-1"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#92400E" />
              ) : (
                <>
                  <Ionicons name="arrow-undo-outline" size={11} color="#92400E" />
                  <Text className="text-amber-900 font-sans-bold text-[10px]">Undo</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Total Amount in same line */}
          <Text className="text-primary font-sans-bold text-sm ml-1" style={{ color: '#4A2810' }}>
            {fmt(order.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Row 2: Condensed Items Summary */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        className="pt-1.5"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className="text-text-primary font-sans-medium text-xs flex-1 pr-2 leading-4"
            numberOfLines={expanded ? undefined : 1}
          >
            {items
              .map(
                (i: any) =>
                  `${i.quantity}x ${i.menuItemName}${i.flavourName ? ` (${i.flavourName})` : ''}`,
              )
              .join(' • ')}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="#6B7280" />
        </View>

        {/* Expanded Item Breakdown */}
        {expanded && (
          <View className="gap-1.5 mt-1.5 bg-surface/60 p-2 rounded-xl border border-border/40">
            {items.map((i: any, idx: number) => (
              <View key={idx} className="flex-row items-center justify-between py-0.5">
                <View className="flex-1 pr-2 flex-row items-center gap-1 flex-wrap">
                  <Text className="text-text-primary font-sans-semibold text-xs">
                    {i.quantity}x {i.menuItemName}
                  </Text>
                  {i.flavourName ? (
                    <Text
                      className="text-primary text-[10px] font-sans-semibold"
                      style={{ color: '#4A2810' }}
                    >
                      ✨ {i.flavourName}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-text-primary font-sans-bold text-xs">
                  {fmt(i.lineTotal || parseFloat(i.unitPrice || '0') * i.quantity)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
