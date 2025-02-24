// app/_layout.tsx
import {Stack, useSegments, useRouter} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';

// Prevent auto-hide of splash screen until ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

async function checkUser() {
  const userId = await AsyncStorage.getItem('userId');
  return userId ? {userId} : null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <InnerLayout />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function InnerLayout() {
  const segments = useSegments();
  const router = useRouter();
  const {data: user, isLoading} = useQuery({
    queryKey: ['currentUser'],
    queryFn: checkUser,
    refetchOnMount: true,
  });
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Defer redirection until after mount.
  useEffect(() => {
    if (appIsReady && !isLoading && !user && segments[0] !== '(auth)') {
      router.replace('/(auth)/login');
    }
  }, [appIsReady, isLoading, user, segments, router]);

  if (!appIsReady || isLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return (
    <Stack>
      {user ? (
        <Stack.Screen name='(tabs)' options={{headerShown: false}} />
      ) : (
        <Stack.Screen name='(auth)' options={{headerShown: false}} />
      )}
    </Stack>
  );
}
