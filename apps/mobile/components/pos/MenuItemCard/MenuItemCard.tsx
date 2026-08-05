import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MenuItem } from '@frozen-shake/shared';
import { COLORS, FONTS, fmt } from '../../common/constants';

export interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Pressable
      onPress={() => onAdd(item)}
      style={({ pressed }) => [
        {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 24,
          padding: 14,
          margin: 6,
          flex: 1,
          minWidth: 140,
          maxWidth: 185,
          borderWidth: 1,
          borderColor: COLORS.borderAlpha50,
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
        },
      ]}
    >
      {/* Item Image or Graphic */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: 96,
          marginBottom: 8,
          backgroundColor: COLORS.surfaceAlpha40,
          borderRadius: 16,
          padding: 8,
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="nutrition-outline" size={44} color={COLORS.primary} />
        )}
      </View>

      {/* Item Name & Price */}
      <View>
        <Text
          style={{
            color: COLORS.textPrimary,
            fontFamily: FONTS.bold,
            fontSize: 14,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontFamily: FONTS.bold,
              fontSize: 16,
            }}
          >
            {fmt(item.sellingPrice)}
          </Text>

          <Pressable
            onPress={() => onAdd(item)}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 4,
              elevation: 4,
            })}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
