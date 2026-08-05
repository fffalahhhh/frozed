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

export function CategoryCard({
  name,
  itemCount,
  isActive,
  needsRestock,
  onPress,
}: CategoryCardProps) {
  const isAll = name.toLowerCase() === 'all';

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[20px] px-3.5 py-2.5 mr-2.5 min-w-[135px] h-[86px] justify-between overflow-hidden relative border ${
        isActive
          ? 'bg-[#0D4830] border-[#0D4830] shadow-md shadow-[#0D4830]/25 elevation-3'
          : 'bg-white border-[#E5E0D8] shadow-sm elevation-1'
      }`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
      })}
    >
      {/* Decorative Background Graphic on Right Side */}
      <View
        className="absolute -right-3 -bottom-5 w-20 h-20 rounded-full opacity-10"
        style={{
          backgroundColor: isActive ? '#FFFFFF' : '#0D4830',
        }}
      />
      <View
        className="absolute right-1.5 bottom-0.5 opacity-20"
        pointerEvents="none"
      >
        <Ionicons
          name={
            isAll
              ? 'grid-outline'
              : name.toLowerCase().includes('shake') || name.toLowerCase().includes('smoothie')
              ? 'ice-cream-outline'
              : 'cafe-outline'
          }
          size={40}
          color={isActive ? '#FFFFFF' : '#0D4830'}
        />
      </View>

      {/* Top Status Pill */}
      {needsRestock ? (
        <View className="self-start bg-[#FF5A5A] rounded-full px-2 py-0.5 flex-row items-center gap-1">
          <Text className="text-white text-[9px] font-sans-medium">
            Re-stock
          </Text>
          <Ionicons name="information-circle-outline" size={10} color="#FFFFFF" />
        </View>
      ) : (
        <View
          className={`self-start rounded-full px-2.5 py-0.5 border ${
            isActive
              ? 'border-white/40 bg-white/10'
              : 'border-gray-300 bg-white'
          }`}
        >
          <Text
            className={`text-[9px] font-sans-medium ${
              isActive ? 'text-white' : 'text-gray-600'
            }`}
          >
            {isAll ? 'All Items' : 'Available'}
          </Text>
        </View>
      )}

      {/* Title & Item Count */}
      <View className="z-10">
        <Text
          className={`font-sans-bold text-sm leading-4 ${
            isActive ? 'text-white' : 'text-gray-900'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className={`font-sans text-[11px] mt-0.5 ${
            isActive ? 'text-white/80' : 'text-gray-400'
          }`}
        >
          {itemCount} items
        </Text>
      </View>
    </Pressable>
  );
}
