// app/(auth)/_layout.tsx
// Simple layout for auth flow
import {Stack} from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name='login' options={{headerShown: false}} />
      <Stack.Screen name='signup' options={{headerShown: false}} />
    </Stack>
  );
}
