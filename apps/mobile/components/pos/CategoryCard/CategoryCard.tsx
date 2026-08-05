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
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-3xl px-4 py-3.5 mr-3 min-w-[145px] h-24 justify-between border ${
        isActive
          ? 'bg-primary border-primary shadow-lg shadow-primary/30 elevation-6'
          : 'bg-white/90 border-border/60 shadow-sm elevation-2'
      }`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Badge */}
      {needsRestock ? (
        <View className="self-start bg-warning/10 border border-warning/30 rounded-full px-2.5 py-0.5 flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={12} color="#F97316" />
          <Text className="text-warning text-[10px] font-sans-semibold">Re-stock</Text>
        </View>
      ) : (
        <View className={`self-start rounded-full flex-row items-center gap-1`}>
          <Ionicons name="checkmark-circle" size={12} color={isActive ? '#FFFFFF' : '#1B4332'} />
          <Text
            className={`text-[10px] font-sans-semibold ${isActive ? 'text-white' : 'text-primary'}`}
          >
            Available
          </Text>
        </View>
      )}

      {/* Title & Count */}
      <View>
        <Text
          className={`font-sans-bold text-base leading-5 ${
            isActive ? 'text-white' : 'text-text-primary'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className={`font-sans text-xs mt-0.5 ${isActive ? 'text-white/75' : 'text-text-muted'}`}
        >
          {itemCount} Items
        </Text>
      </View>
    </Pressable>
  );
}
