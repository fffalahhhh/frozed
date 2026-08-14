import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface TopLogoHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  pendingCount?: number;
  showPreOrders?: boolean;
  onTogglePreOrders?: () => void;
}

export function TopLogoHeader({
  onRefresh,
  isRefreshing,
  pendingCount = 0,
  showPreOrders = true,
  onTogglePreOrders,
}: TopLogoHeaderProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date e.g., "Thursday, 6 August"
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Format running time with seconds e.g., "10:14:22 AM"
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const isDisabled = pendingCount === 0;
  const isSelected = showPreOrders && pendingCount > 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="bg-[#F4F1EA] px-6 pt-3 pb-2">
      <View className="flex-row items-center justify-between">
        {/* Left side: Logo & Live Running Date/Time */}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-2">
            <Image
              source={require('../../../assets/logo.png')}
              className="w-10 h-10"
              resizeMode="contain"
            />
          </View>

          {/* Vertical Separator and Live Date/Time (Only shown on tablet devices) */}
          {isTablet && (
            <>
              <View className="w-[1px] h-6 bg-[#0D4830]/20 mx-1" />

              <Text className="text-[#0D4830] font-sans-semibold text-xs tracking-tight">
                {dateString} <Text className="text-[#0D4830]/60">•</Text>{' '}
                <Text className="font-sans-bold">{timeString}</Text>
              </Text>
            </>
          )}
        </View>

        {/* Right side: Pre-Orders Toggle Button & Refresh Button */}
        <View className="flex-row items-center gap-2">
          {onTogglePreOrders && (
            <Pressable
              disabled={isDisabled}
              onPress={onTogglePreOrders}
              className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 border shadow-sm elevation-1 ${
                isDisabled
                  ? 'bg-gray-100/70 border-gray-200 opacity-60'
                  : isSelected
                  ? 'bg-[#0D4830] border-[#0D4830]'
                  : 'bg-white border-[#E5E0D8]'
              }`}
              style={({ pressed }) => ({
                opacity: isDisabled ? 0.5 : pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name="time-outline"
                size={15}
                color={isDisabled ? '#9CA3AF' : isSelected ? '#FFFFFF' : '#0D4830'}
              />
              <Text
                className={`font-sans-semibold text-xs ${
                  isDisabled
                    ? 'text-gray-400'
                    : isSelected
                    ? 'text-white'
                    : 'text-[#0D4830]'
                }`}
              >
                Pre-Orders
              </Text>
              {pendingCount > 0 && (
                <View className="bg-amber-500 rounded-full px-1.5 py-0.2 ml-0.5">
                  <Text className="text-white font-sans-bold text-[10px]">{pendingCount}</Text>
                </View>
              )}
            </Pressable>
          )}

          {onRefresh && (
            <Pressable
              onPress={onRefresh}
              disabled={isRefreshing}
              className="flex-row items-center gap-1.5 bg-white border border-[#E5E0D8] rounded-full px-3.5 py-1.5 shadow-sm elevation-1"
              style={({ pressed }) => ({ opacity: pressed || isRefreshing ? 0.7 : 1 })}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#0D4830" />
              ) : (
                <Ionicons name="refresh-outline" size={15} color="#0D4830" />
              )}
              <Text className="text-[#0D4830] font-sans-semibold text-xs">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
