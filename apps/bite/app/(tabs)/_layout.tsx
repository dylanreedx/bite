// app/(tabs)/_layout.tsx
import {Tabs} from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {Pressable} from 'react-native';
import {useThemeColor} from '@/components/Themed';

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
  const backgroundColor = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'primary');

  return (
    <Tabs
      tabBar={({state, navigation}) => (
        <Pressable
          style={{
            flexDirection: 'row',
            backgroundColor: backgroundColor,
            paddingHorizontal: 10,
            paddingTop: 10,
            paddingBottom: 20,
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Example icon logic
            let iconName: string;
            if (route.name === 'index') iconName = 'home';
            else if (route.name === 'profile') iconName = 'user';
            else if (route.name === 'log-food') iconName = 'search';
            else iconName = 'list';

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                }}
              >
                <TabBarIcon
                  name={iconName}
                  color={isFocused ? primary : text}
                />
              </Pressable>
            );
          })}
        </Pressable>
      )}
    >
      <Tabs.Screen
        name='index'
        options={{
          headerShown: false,
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name='log-food'
        options={{
          headerShown: false,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          headerShown: false,
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
