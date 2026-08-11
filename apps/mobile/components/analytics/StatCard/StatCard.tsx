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
      className={`flex-1 min-w-[140px] rounded-2xl p-3 border ${
        isSuccess ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-900/5 border-emerald-900/15'
      }`}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text
          className={`font-sans-medium text-[11px] ${
            isSuccess ? 'text-emerald-800' : 'text-text-muted'
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Ionicons name={iconName} size={16} color="#1B4332" />
      </View>
      <Text
        className="text-[#1B4332] font-sans-bold text-lg leading-6"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {fmt(value)}
      </Text>
      <Text
        className={`font-sans text-[10px] mt-0.5 ${
          isSuccess ? 'text-emerald-700/80' : 'text-text-muted'
        }`}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </View>
  );
}
