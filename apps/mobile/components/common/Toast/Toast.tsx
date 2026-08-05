import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../../../store/toast';

export function ToastBanner() {
  const { visible, message, type, hideToast } = useToastStore();
  const [renderedMessage, setRenderedMessage] = useState(message);
  const [renderedType, setRenderedType] = useState(type);

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRenderedMessage(message);
      setRenderedType(type);

      animValue.setValue(0);
      Animated.spring(animValue, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, message, type]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0], // Slide up entrance at bottom center, slide down exit
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const bgStyle =
    renderedType === 'error'
      ? 'bg-rose-900 border-rose-700'
      : renderedType === 'info'
        ? 'bg-slate-800 border-slate-700'
        : 'bg-[#0D4830] border-[#0D4830]';

  const iconName =
    renderedType === 'error'
      ? 'alert-circle'
      : renderedType === 'info'
        ? 'information-circle'
        : 'checkmark-circle';

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-10 left-0 right-0 items-center justify-center z-50 p-4"
    >
      <Animated.View
        style={{
          transform: [{ translateY }, { scale }],
          opacity,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 12,
        }}
        className={`flex-row items-center gap-3 px-5 py-3.5 rounded-2xl border ${bgStyle} max-w-[85%] self-center`}
      >
        <Ionicons name={iconName} size={22} color="#FFFFFF" />
        <Text className="text-white font-sans-semibold text-xs leading-4 flex-shrink">
          {renderedMessage}
        </Text>
        <TouchableOpacity onPress={hideToast} className="p-1 ml-1" hitSlop={8}>
          <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
