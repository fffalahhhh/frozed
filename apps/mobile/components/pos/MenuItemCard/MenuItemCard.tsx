import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from '@frozen-shake/shared';
import { fmt, getItemImageUrl, DEFAULT_DRINK_IMAGES } from '../../common/constants';
import type { StockInfo } from '../../../lib/stock';
import { useToastStore } from '../../../store/toast';

export interface MenuItemCardProps {
  item: MenuItem;
  stockInfo?: StockInfo;
  cartQuantity?: number;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, stockInfo, cartQuantity = 0, onAdd }: MenuItemCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(getItemImageUrl(item));

  const maxAvail = stockInfo?.maxAvailable ?? item.maxAvailable ?? 999;
  const remAvail = stockInfo?.remainingAvailable ?? Math.max(0, maxAvail - cartQuantity);

  const isOutOfStock = !item.isAvailable || maxAvail <= 0;
  const isLimitReached = remAvail <= 0 && !isOutOfStock;

  const handlePress = () => {
    if (isOutOfStock) {
      useToastStore.getState().showToast(`"${item.name}" is currently out of stock`, 'error');
      return;
    }
    if (isLimitReached) {
      useToastStore
        .getState()
        .showToast(
          `Stock limit reached! Only ${maxAvail} portion${maxAvail > 1 ? 's' : ''} available in inventory.`,
          'warning',
        );
      return;
    }
    onAdd(item);
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`bg-white rounded-[24px] p-3.5 m-1.5 flex-1 min-w-[140px] max-w-[210px] border justify-between shadow-sm elevation-1 ${
        isOutOfStock ? 'border-red-200 bg-gray-50' : 'border-[#E5DCD0]'
      }`}
      style={({ pressed }) => ({
        opacity: isOutOfStock ? 0.6 : pressed ? 0.88 : 1,
      })}
    >
      {/* Product Image & Stock Badge Overlay */}
      <View className="relative items-center justify-center h-28 my-1 bg-[#F4EDE4] rounded-2xl p-2 overflow-hidden">
        <Image
          source={{ uri: getItemImageUrl(item) || imgSrc }}
          className={`w-24 h-24 rounded-xl ${isOutOfStock ? 'opacity-40' : ''}`}
          resizeMode="cover"
          onError={() => {
            setImgSrc(DEFAULT_DRINK_IMAGES.default);
          }}
        />

        {/* Status Badge Overlays */}
        {isOutOfStock ? (
          <View className="absolute inset-0 bg-black/35 items-center justify-center p-1">
            <View className="bg-red-600 px-2 py-0.5 rounded-full border border-white/40 shadow-sm">
              <Text className="text-white text-[9.5px] font-sans-bold uppercase tracking-wider">
                Out of Stock
              </Text>
            </View>
          </View>
        ) : isLimitReached ? (
          <View className="absolute top-1.5 right-1.5 bg-amber-500 px-1.5 py-0.5 rounded-md">
            <Text className="text-white text-[9px] font-sans-bold">
              {cartQuantity}/{maxAvail} in cart
            </Text>
          </View>
        ) : maxAvail <= 20 ? (
          <View className="absolute top-1.5 right-1.5 bg-[#4A2810] px-1.5 py-0.5 rounded-md">
            <Text className="text-white text-[9px] font-sans-medium">{remAvail} left</Text>
          </View>
        ) : null}
      </View>

      {/* Item Info & Action Button */}
      <View className="flex-row items-end justify-between mt-2 pt-1">
        <View className="flex-1 pr-1">
          <Text
            className={`font-sans-bold text-sm leading-[18px] ${
              isOutOfStock ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-gray-500 font-sans-medium text-xs mt-0.5">
            {fmt(item.sellingPrice)}
          </Text>
        </View>

        {/* Plus Circle Button / Disabled Indicator */}
        <Pressable
          onPress={handlePress}
          className={`w-9 h-9 rounded-full items-center justify-center border ${
            isOutOfStock
              ? 'border-gray-300 bg-gray-100'
              : isLimitReached
                ? 'border-amber-400 bg-amber-50'
                : 'border-[#4A2810] bg-white'
          }`}
          style={({ pressed }) => ({
            backgroundColor: isOutOfStock
              ? '#F3F4F6'
              : isLimitReached
                ? '#FEF3C7'
                : pressed
                  ? '#4A2810'
                  : '#FFFFFF',
          })}
        >
          {({ pressed }) =>
            isOutOfStock ? (
              <Ionicons name="ban-outline" size={16} color="#9CA3AF" />
            ) : isLimitReached ? (
              <Ionicons name="lock-closed-outline" size={16} color="#D97706" />
            ) : (
              <Ionicons name="add" size={20} color={pressed ? '#FFFFFF' : '#4A2810'} />
            )
          }
        </Pressable>
      </View>
    </Pressable>
  );
}
