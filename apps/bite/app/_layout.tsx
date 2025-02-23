import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';

const queryClient = new QueryClient();

// 1) Moved our "check user" logic into a separate function:
async function checkUser() {
  const userId = await AsyncStorage.getItem('userId');
  if (!userId) return null;

  // Optionally verify user on server:
  // const res = await fetch(`YOUR_SERVER_URL/api/users/${userId}`);
  // if (!res.ok) return null;
  // return await res.json();

  // If skipping server check, just return an object:
  return {userId};
}

// 2) The top-level default export just sets up the provider
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerLayout />
    </QueryClientProvider>
  );
}

// 3) Put the actual logic (Splash + useQuery) in a child component
function InnerLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Make sure splash doesn't auto-hide
  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  // We can now safely call useQuery because the provider is above us
  const {data: user, isLoading} = useQuery({
    queryKey: ['currentUser'],
    queryFn: checkUser,
  });

  // Once the query finishes, hide the splash
  useEffect(() => {
    if (!isLoading) {
      setAppIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Show a loading screen if we haven’t finished
  if (!appIsReady || isLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  // If user is present, go to main tabs; else show auth flow
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
