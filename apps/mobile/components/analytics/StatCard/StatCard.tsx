import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmt } from '../../common/constants';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, subtitle, iconName, variant = 'primary' }: StatCardProps) {
  const isSuccess = variant === 'success';
  const isWarning = variant === 'warning';
  const isDanger = variant === 'danger';

  let containerClass = 'bg-emerald-900/5 border-emerald-900/15';
  let titleClass = 'text-text-muted';
  let iconColor = '#1B4332';
  let valueClass = 'text-[#1B4332]';
  let subtitleClass = 'text-text-muted';

  if (isSuccess) {
    containerClass = 'bg-emerald-50/70 border-emerald-200';
    titleClass = 'text-emerald-800';
    iconColor = '#15803D';
    valueClass = 'text-emerald-900';
    subtitleClass = 'text-emerald-700/80';
  } else if (isWarning) {
    containerClass = 'bg-amber-50/80 border-amber-200';
    titleClass = 'text-amber-800';
    iconColor = '#D97706';
    valueClass = 'text-amber-900';
    subtitleClass = 'text-amber-700/80';
  } else if (isDanger) {
    containerClass = 'bg-rose-50/80 border-rose-200';
    titleClass = 'text-rose-800';
    iconColor = '#E11D48';
    valueClass = 'text-rose-900';
    subtitleClass = 'text-rose-700/80';
  }

  return (
    <View className={`flex-1 min-w-[100px] rounded-2xl p-3 border ${containerClass}`}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className={`font-sans-medium text-[11px] ${titleClass}`} numberOfLines={1}>
          {title}
        </Text>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>
      <Text
        className={`font-sans-bold text-lg leading-6 ${valueClass}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {fmt(value)}
      </Text>
      <Text className={`font-sans text-[10px] mt-0.5 ${subtitleClass}`} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
}
