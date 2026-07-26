import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-4xl mb-3">📦</Text>
      <Text className="text-text-primary font-sans-bold text-lg">Inventory</Text>
      <Text className="text-text-muted font-sans text-sm mt-1">Coming soon</Text>
    </SafeAreaView>
  );
}
