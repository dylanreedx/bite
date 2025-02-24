// app/_layout.tsx
import React from 'react';
import {Stack} from 'expo-router';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import AuthProvider from '@/context/AuthContext';
import {AuthGate} from '@/components/AuthGate';

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name='(tabs)' options={{headerShown: false}} />
              <Stack.Screen name='(auth)' options={{headerShown: false}} />
              <Stack.Screen
                name='(onboarding)'
                options={{headerShown: false}}
              />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
