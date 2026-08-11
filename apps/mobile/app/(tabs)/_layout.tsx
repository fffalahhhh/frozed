import { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { syncEngine } from '../../lib/syncEngine';

function CustomTabBarButton(props: BottomTabBarButtonProps) {
  const { children, onPress, onLongPress, style, accessibilityState, accessibilityLabel, testID } = props;
  const isSelected = accessibilityState?.selected;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    shimmerAnim.setValue(0);
    Animated.timing(shimmerAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.7, 0.7, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      android_ripple={{
        color: 'rgba(27, 67, 50, 0.15)',
        borderless: false,
      }}
      style={({ pressed }) => [style, styles.tabButton, pressed && styles.tabButtonPressed]}
    >
      {({ pressed }) => (
        <View style={styles.tabContainer}>
          {/* Animated Shimmer Sweep Highlight on Press */}
          {pressed && (
            <Animated.View
              style={[
                styles.shimmerLayer,
                {
                  opacity: shimmerOpacity,
                  transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Tab Content */}
          <View
            style={[styles.tabContent, pressed && styles.tabContentPressed]}
            pointerEvents="none"
          >
            {isSelected && <View style={styles.activeTopIndicator} />}
            {children}
          </View>

          {/* Vertical Separator Line between buttons */}
          <View style={styles.verticalSeparator} pointerEvents="none" />
        </View>
      )}
    </Pressable>
  );
}

export default function TabLayout() {
  useEffect(() => {
    syncEngine.init();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E8E2D9',
            height: Platform.OS === 'ios' ? 84 : 74,
            paddingBottom: Platform.OS === 'ios' ? 18 : 10,
            paddingTop: 4,
            paddingHorizontal: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 8,
          },
          tabBarItemStyle: {
            flex: 1,
            height: '100%',
            width: '100%',
            padding: 0,
            margin: 0,
          },
          tabBarActiveTintColor: '#1B4332',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: {
            fontFamily: 'Inter_600SemiBold',
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'fast-food' : 'fast-food-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'restaurant' : 'restaurant-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonPressed: {
    backgroundColor: 'rgba(27, 67, 50, 0.10)',
  },
  tabContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shimmerLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 2,
  },
  tabContentPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  activeTopIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#1B4332',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  verticalSeparator: {
    position: 'absolute',
    right: 0,
    top: '22%',
    bottom: '22%',
    width: 1,
    backgroundColor: '#E5E0D8',
  },
});
