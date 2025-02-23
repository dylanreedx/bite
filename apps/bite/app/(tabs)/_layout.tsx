// app/(tabs)/_layout.tsx
// Layout for main tabs
import {Tabs} from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {Pressable} from 'react-native';

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
    <Tabs>
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
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
