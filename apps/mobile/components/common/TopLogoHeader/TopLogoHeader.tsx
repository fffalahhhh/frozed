import React from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';

export function TopLogoHeader() {
  return (
    <SafeAreaView
      style={{
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderAlpha40,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
        }}
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}
