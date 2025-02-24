// app/(tabs)/log-food/_layout.tsx
import {useThemeColor} from '@/components/Themed';
import {Stack} from 'expo-router';
import React from 'react';

export default function LogFoodLayout() {
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: background,
        },
        headerTintColor: text,
        title: 'Log Food',
      }}
    >
      {/* The Stack automatically picks up index.tsx and [foodId].tsx */}
    </Stack>
  );
}
