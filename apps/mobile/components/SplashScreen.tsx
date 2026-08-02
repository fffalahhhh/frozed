import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StatusBar, Easing } from 'react-native';

export default function SplashScreen({ onDone }: { onDone?: () => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -357,
          duration: 1150,
          easing: Easing.bezier(0.25, 1, 0.4, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.355,
          duration: 1150,
          easing: Easing.bezier(0.25, 1, 0.4, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(750),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onDone?.();
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [translateY, opacity, scale, onDone]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.Image
        source={require('../assets/logo.png')}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  logo: {
    width: 180,
    height: 180,
  },
});
