import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmt } from '../../common/constants';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'success';
}

export function StatCard({ title, value, subtitle, iconName, variant = 'primary' }: StatCardProps) {
  const isSuccess = variant === 'success';

  return (
    <View
      className={`flex-1 min-w-[145px] rounded-3xl p-4 border ${
        isSuccess ? 'bg-success-bg border-primary/30' : 'bg-primary/5 border-primary/20'
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className={`font-sans-medium text-xs ${isSuccess ? 'text-primary' : 'text-text-muted'}`}
        >
          {title}
        </Text>
        <Ionicons name={iconName} size={20} color="#1B4332" />
      </View>
      <Text className="text-primary font-sans-bold text-2xl">{fmt(value)}</Text>
      <Text
        className={`font-sans text-[11px] mt-1 ${
          isSuccess ? 'text-primary/70' : 'text-text-muted'
        }`}
      >
        {subtitle}
      </Text>
    </View>
  );
}
