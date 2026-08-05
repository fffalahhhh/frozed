import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../../store/cart';
import { fmt } from '../../common/constants';

export interface CartItemRowProps {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  onIncrease: () => void;
  onDecrease: () => void;
}

export function CartItemRow({ item, onIncrease, onDecrease }: CartItemRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-2.5 border-b border-gray-100">
      {/* Soft rounded image/icon container */}
      <View className="w-15 h-15 rounded-2xl bg-[#F7F7F2] items-center justify-center border border-[#EFEFE8]">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-11 h-11"
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="cafe-outline" size={28} color="#044E35" />
        )}
      </View>

      {/* Item info */}
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text className="text-gray-900 font-sans-bold text-sm flex-1 pr-1.5" numberOfLines={1}>
            {item.menuItemName}
          </Text>
          <Text className="text-gray-900 font-sans-bold text-sm">
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        <Text className="text-gray-500 font-sans text-xs mt-0.5">
          {fmt(item.unitPrice)} x {item.quantity}
        </Text>

        <View className="flex-row items-center justify-between mt-1">
          {item.flavourName ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="document-text-outline" size={12} color="#6B7280" />
              <Text className="text-gray-500 font-sans-medium text-[11px]">
                {item.flavourName}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Stepper pill [ - 2 + ] */}
          <View className="flex-row items-center bg-gray-100 rounded-full px-2 py-0.5 gap-2">
            <Pressable
              onPress={onDecrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="remove" size={14} color="#111827" />
            </Pressable>
            <Text className="text-gray-900 font-sans-bold text-xs min-w-[14px] text-center">
              {item.quantity}
            </Text>
            <Pressable
              onPress={onIncrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="add" size={14} color="#111827" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
