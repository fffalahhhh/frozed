import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../../store/cart';
import { fmt, getItemImageUrl, DEFAULT_DRINK_IMAGES } from '../../common/constants';

export interface CartItemRowProps {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  onIncrease: () => void;
  onDecrease: () => void;
}

export function CartItemRow({ item, onIncrease, onDecrease }: CartItemRowProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    getItemImageUrl({ name: item.menuItemName, imageUrl: item.imageUrl }),
  );

  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-[#E5E0D8]/60">
      {/* Product Image */}
      <View className="w-14 h-14 rounded-2xl bg-[#F7F6F0] items-center justify-center border border-[#E5E0D8] overflow-hidden">
        <Image
          source={{ uri: imgSrc }}
          className="w-14 h-14"
          resizeMode="cover"
          onError={() => setImgSrc(DEFAULT_DRINK_IMAGES.default)}
        />
      </View>

      {/* Details */}
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text className="text-gray-900 font-sans-bold text-sm flex-1 pr-2" numberOfLines={1}>
            {item.menuItemName}
          </Text>
          <Text className="text-gray-900 font-sans-bold text-sm">
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        <Text className="text-gray-500 font-sans text-xs mt-0.5">
          {fmt(item.unitPrice)} x{item.quantity}
        </Text>

        <View className="flex-row items-center justify-between mt-1.5">
          {item.flavourName ? (
            <View className="flex-row items-center gap-1 bg-[#F4F1EA] px-2 py-0.5 rounded-md">
              <Ionicons name="document-text-outline" size={11} color="#6B7280" />
              <Text className="text-gray-600 font-sans-medium text-[10px]">
                {item.flavourName}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Stepper pill [ - 2 + ] */}
          <View className="flex-row items-center bg-[#F4F1EA] border border-[#E5E0D8] rounded-full px-2 py-0.5 gap-2">
            <Pressable
              onPress={onDecrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="remove" size={12} color="#111827" />
            </Pressable>
            <Text className="text-gray-900 font-sans-bold text-xs min-w-[12px] text-center">
              {item.quantity}
            </Text>
            <Pressable
              onPress={onIncrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="add" size={12} color="#111827" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
