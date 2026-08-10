import { Tabs } from 'expo-router';
import { Platform, Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

function CustomTabBarButton(props: BottomTabBarButtonProps) {
  const { children, onPress, onLongPress, style, accessibilityState, ref, ...rest } = props;
  const isSelected = accessibilityState?.selected;

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{
        color: 'rgba(27, 67, 50, 0.12)',
        borderless: false,
      }}
      style={({ pressed }) => [style, styles.tabButton, pressed && styles.tabButtonPressed]}
    >
      {({ pressed }) => (
        <View style={[styles.tabContent, pressed && styles.tabContentPressed]} pointerEvents="none">
          {isSelected && <View style={styles.activeTopIndicator} />}
          {children}
        </View>
      )}
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <CustomTabBarButton {...props} />,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E2D9',
          height: Platform.OS === 'ios' ? 74 : 64,
          paddingBottom: 0,
          paddingTop: 0,
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
            <Ionicons name={focused ? 'fast-food' : 'fast-food-outline'} size={22} color={color} />
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
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
  },
  tabContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  tabContentPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.75,
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
});
