import React from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function TopLogoHeader() {
  return (
    <SafeAreaView className="bg-white border-b border-border/40">
      <View className="items-center justify-center py-2">
        <Image
          source={require('../../../assets/logo.png')}
          className="w-16 h-16"
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}
