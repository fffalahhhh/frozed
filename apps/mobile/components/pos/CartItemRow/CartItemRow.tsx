import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../../store/cart';
import { FONTS, fmt } from '../../common/constants';

export interface CartItemRowProps {
  item: ReturnType<typeof useCartStore.getState>['items'][0];
  onIncrease: () => void;
  onDecrease: () => void;
}

export function CartItemRow({ item, onIncrease, onDecrease }: CartItemRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
    >
      {/* Soft rounded image/icon container */}
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          backgroundColor: '#F7F7F2',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#EFEFE8',
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="cafe-outline" size={28} color="#044E35" />
        )}
      </View>

      {/* Item info */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              color: '#111827',
              fontFamily: FONTS.bold,
              fontSize: 14,
              flex: 1,
              paddingRight: 6,
            }}
            numberOfLines={1}
          >
            {item.menuItemName}
          </Text>
          <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 14 }}>
            {fmt(item.unitPrice * item.quantity)}
          </Text>
        </View>

        <Text
          style={{
            color: '#6B7280',
            fontFamily: FONTS.regular,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {fmt(item.unitPrice)} x {item.quantity}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          {item.flavourName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="document-text-outline" size={12} color="#6B7280" />
              <Text
                style={{
                  color: '#6B7280',
                  fontFamily: FONTS.medium,
                  fontSize: 11,
                }}
              >
                {item.flavourName}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Stepper pill [ - 2 + ] */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              borderRadius: 9999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              gap: 8,
            }}
          >
            <Pressable
              onPress={onDecrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="remove" size={14} color="#111827" />
            </Pressable>
            <Text
              style={{
                color: '#111827',
                fontFamily: FONTS.bold,
                fontSize: 12,
                minWidth: 14,
                textAlign: 'center',
              }}
            >
              {item.quantity}
            </Text>
            <Pressable
              onPress={onIncrease}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="add" size={14} color="#111827" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
