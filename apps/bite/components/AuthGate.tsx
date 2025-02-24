// components/AuthGate.tsx
import React, {useEffect} from 'react';
import {useRouter, useSegments} from 'expo-router';
import {useAuthContext} from '../context/AuthContext';
import {View, ActivityIndicator} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export function AuthGate({children}: {children: React.ReactNode}) {
  const segments = useSegments();
  const router = useRouter();
  const {user, loading} = useAuthContext();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
      if (!user && segments[0] !== '(auth)') {
        router.replace('/(auth)/login');
      }
      //   } else if (
      //     user &&
      //     !user.hasFinishedOnboarding &&
      //     segments[0] !== '(onboarding)'
      //   ) {
      //     router.replace('/(onboarding)/step1');
      //   }
    }
  }, [loading, user, segments, router]);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return <>{children}</>;
}
