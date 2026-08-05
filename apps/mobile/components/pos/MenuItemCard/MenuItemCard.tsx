import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from '@frozen-shake/shared';
import { fmt } from '../../common/constants';

export interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Pressable
      onPress={() => onAdd(item)}
      className="bg-white/95 rounded-3xl p-3.5 m-1.5 flex-1 min-w-[140px] max-w-[185px] border border-border/50 justify-between shadow-sm elevation-3"
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Item Image or Graphic */}
      <View className="items-center justify-center h-24 mb-2 bg-surface/40 rounded-2xl p-2">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-20 h-20"
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="nutrition-outline" size={44} color="#1B4332" />
        )}
      </View>

      {/* Item Name & Price */}
      <View>
        <Text className="text-text-primary font-sans-bold text-sm leading-[18px]" numberOfLines={2}>
          {item.name}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-primary font-sans-bold text-base">
            {fmt(item.sellingPrice)}
          </Text>

          <Pressable
            onPress={() => onAdd(item)}
            className="w-8 h-8 rounded-full bg-primary items-center justify-center shadow-md shadow-primary/40 elevation-4"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
