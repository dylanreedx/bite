// app/(tabs)/_layout.tsx
// Layout for main tabs
import {Tabs} from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

function TabBarIcon({name, color}: {name: string; color: string}) {
  return (
    <FontAwesome
      size={24}
      style={{marginBottom: -3}}
      name={name as any}
      color={color}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name='step1'
        options={{
          title: 'step1',
          tabBarIcon: ({color}) => <TabBarIcon name='home' color={color} />,
        }}
      />
      <Tabs.Screen
        name='two'
        options={{
          title: 'Another',
          tabBarIcon: ({color}) => <TabBarIcon name='list' color={color} />,
        }}
      />
    </Tabs>
  );
}
