import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface CategoryCardProps {
  name: string;
  itemCount: number;
  isActive: boolean;
  needsRestock: boolean;
  onPress: () => void;
}

export function CategoryCard({ name, isActive, onPress }: CategoryCardProps) {
  const isAll = name.toLowerCase() === 'all';

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[18px] px-3.5 py-3 mr-2  justify-between border ${
        isActive
          ? 'bg-[#0D4830] border-[#0D4830] shadow-md shadow-[#0D4830]/25 elevation-3'
          : 'bg-white border-[#E5E0D8] shadow-sm elevation-1'
      }`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View className="">
        <Text
          className={`font-sans-bold text-xs leading-4 ${
            isActive ? 'text-white' : 'text-gray-900'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
    </Pressable>
  );
}
