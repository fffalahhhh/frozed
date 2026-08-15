import { Stack } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { apolloClient, initApolloCachePersistence } from '../lib/graphqlClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import AnimatedSplashScreen from '../components/common/SplashScreen';
import { ToastBanner } from '../components/common/Toast';
import '../global.css';

ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initApolloCachePersistence();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      ExpoSplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={apolloClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <ToastBanner />
          {showSplash && <AnimatedSplashScreen onDone={() => setShowSplash(false)} />}
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
