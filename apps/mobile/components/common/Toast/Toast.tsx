import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../../store/toast';

export function ToastBanner() {
  const { visible, message, type, hideToast } = useToastStore();

  if (!visible || !message) return null;

  const bgStyle =
    type === 'error'
      ? 'bg-rose-900 border-rose-700'
      : type === 'info'
        ? 'bg-slate-800 border-slate-700'
        : 'bg-[#1B4332] border-[#2D6A4F]';

  const iconName =
    type === 'error' ? 'alert-circle' : type === 'info' ? 'information-circle' : 'checkmark-circle';

  return (
    <View className="absolute top-14 left-5 right-5 z-50">
      <View
        className={`flex-row items-center justify-between p-4 rounded-2xl border shadow-xl ${bgStyle}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <Ionicons name={iconName} size={22} color="#FFFFFF" />
          <Text className="text-white font-sans-medium text-xs leading-4 flex-1">{message}</Text>
        </View>
        <TouchableOpacity onPress={hideToast} className="p-1">
          <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
