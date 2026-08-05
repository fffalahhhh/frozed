import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../../store/cart';
import { fmt, getItemImageUrl, DEFAULT_DRINK_IMAGES } from '../../common/constants';

export interface CartItemRowProps {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  onIncrease: () => void;
  onDecrease: () => void;
  onQuantityChange?: (qty: number) => void;
}

export function CartItemRow({ item, onIncrease, onDecrease, onQuantityChange }: CartItemRowProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    getItemImageUrl({ name: item.menuItemName, imageUrl: item.imageUrl }),
  );
  const [qtyText, setQtyText] = useState<string>(String(item.quantity));

  useEffect(() => {
    setQtyText(String(item.quantity));
  }, [item.quantity]);

  const handleManualChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setQtyText(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onQuantityChange?.(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(qtyText, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setQtyText(String(item.quantity));
      onQuantityChange?.(1);
    }
  };

  return (
    <View className="flex-row items-center gap-2.5 py-2 border-b border-[#E5E0D8]/60">
      {/* Product Thumbnail (Compact 44x44) */}
      <View className="w-11 h-11 rounded-xl bg-[#F7F6F0] items-center justify-center border border-[#E5E0D8] overflow-hidden">
        <Image
          source={{ uri: imgSrc }}
          className="w-11 h-11"
          resizeMode="cover"
          onError={() => setImgSrc(DEFAULT_DRINK_IMAGES.default)}
        />
      </View>

      {/* Item Name & Price (Just below Name) */}
      <View className="flex-1 pr-1 justify-center">
        <Text className="text-gray-900 font-sans-bold text-xs" numberOfLines={1}>
          {item.menuItemName}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text className="text-[#0D4830] font-sans-bold text-xs">
            {fmt(item.unitPrice * item.quantity)}
          </Text>
          {item.flavourName ? (
            <View className="bg-[#F4F1EA] px-1.5 py-0.2 rounded">
              <Text className="text-gray-600 font-sans-medium text-[9px]" numberOfLines={1}>
                {item.flavourName}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right Side: Quantity Stepper Selector */}
      <View className="flex-row items-center bg-[#F4F1EA] border border-[#E5E0D8] rounded-full px-2 py-0.5 gap-1">
        <Pressable
          onPress={onDecrease}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="remove" size={13} color="#111827" />
        </Pressable>

        {/* Editable Manual Quantity Input */}
        <TextInput
          value={qtyText}
          onChangeText={handleManualChange}
          onBlur={handleBlur}
          keyboardType="number-pad"
          className="text-gray-900 font-sans-bold text-xs min-w-[36px] px-1 py-0 text-center"
          selectTextOnFocus
        />

        <Pressable
          onPress={onIncrease}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="add" size={13} color="#111827" />
        </Pressable>
      </View>
    </View>
  );
}
