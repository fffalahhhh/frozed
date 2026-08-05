import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from '@frozen-shake/shared';
import { fmt, getItemImageUrl, DEFAULT_DRINK_IMAGES } from '../../common/constants';

export interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(getItemImageUrl(item));

  return (
    <Pressable
      onPress={() => onAdd(item)}
      className="bg-white rounded-[24px] p-3.5 m-1.5 flex-1 min-w-[140px] max-w-[210px] border border-[#E5E0D8] justify-between shadow-sm elevation-1"
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
      })}
    >
      {/* Product Image */}
      <View className="items-center justify-center h-28 my-1 bg-[#F9F8F5] rounded-2xl p-2 overflow-hidden">
        <Image
          source={{ uri: getItemImageUrl(item) || imgSrc }}
          className="w-24 h-24 rounded-xl"
          resizeMode="cover"
          onError={(e) => {
            setImgSrc(DEFAULT_DRINK_IMAGES.default);
          }}
        />
      </View>

      {/* Item Info & Action Button */}
      <View className="flex-row items-end justify-between mt-2 pt-1">
        <View className="flex-1 pr-1">
          <Text className="text-gray-900 font-sans-bold text-sm leading-[18px]" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-gray-500 font-sans-medium text-xs mt-0.5">
            {fmt(item.sellingPrice)}
          </Text>
        </View>

        {/* Plus Circle Button */}
        <Pressable
          onPress={() => onAdd(item)}
          className="w-9 h-9 rounded-full border border-[#0D4830] items-center justify-center bg-white"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#0D4830' : '#FFFFFF',
          })}
        >
          {({ pressed }) => (
            <Ionicons name="add" size={20} color={pressed ? '#FFFFFF' : '#0D4830'} />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}
