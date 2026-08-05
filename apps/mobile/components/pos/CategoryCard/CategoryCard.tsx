import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../common/constants';

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
      style={({ pressed }) => [
        {
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginRight: 12,
          minWidth: 145,
          height: 96,
          justifyContent: 'space-between',
          borderWidth: 1,
          backgroundColor: isActive ? COLORS.primary : 'rgba(255, 255, 255, 0.9)',
          borderColor: isActive ? COLORS.primary : COLORS.borderAlpha60,
          opacity: pressed ? 0.85 : 1,
        },
        isActive
          ? {
              shadowColor: '#1B4332',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            },
      ]}
    >
      {/* Badge */}
      {needsRestock ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: COLORS.warningAlpha10,
            borderWidth: 1,
            borderColor: COLORS.warningAlpha30,
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
          <Text
            style={{
              color: COLORS.warning,
              fontSize: 10,
              fontFamily: FONTS.semiBold,
            }}
          >
            Re-stock
          </Text>
        </View>
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 9999,
            paddingHorizontal: 10,
            paddingVertical: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : COLORS.successBg,
            borderWidth: isActive ? 0 : 1,
            borderColor: COLORS.primaryAlpha10,
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={12}
            color={isActive ? COLORS.white : COLORS.primary}
          />
          <Text
            style={{
              fontSize: 10,
              fontFamily: FONTS.semiBold,
              color: isActive ? COLORS.white : COLORS.primary,
            }}
          >
            Available
          </Text>
        </View>
      )}

      {/* Title & Count */}
      <View>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: 16,
            lineHeight: 20,
            color: isActive ? COLORS.white : COLORS.textPrimary,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={{
            fontFamily: FONTS.regular,
            fontSize: 12,
            marginTop: 2,
            color: isActive ? 'rgba(255, 255, 255, 0.75)' : COLORS.textMuted,
          }}
        >
          {itemCount} Items
        </Text>
      </View>
    </Pressable>
  );
}
