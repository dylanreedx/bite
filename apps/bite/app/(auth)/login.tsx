// app/(auth)/login.tsx
import {useState} from 'react';
import {Alert} from 'react-native';
import {
  View,
  Text,
  ThemedTextInput,
  Button,
  SafeAreaView,
} from '@/components/Themed';
import {useAuth} from '@/hooks/useAuth';
import {useRouter} from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {login} = useAuth();

  const handleLogin = () => {
    login.mutate(
      {email, password},
      {
        onSuccess: () => router.replace('/'),
        onError: () =>
          Alert.alert('Error', 'Login failed. Check your credentials.'),
      }
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          padding: 20,
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <View>
          <Text style={{fontSize: 18, marginBottom: 10}}>Login</Text>
          <View style={{gap: 10}}>
            <ThemedTextInput
              keyboardType='email-address'
              autoCapitalize='none'
              placeholder='Email'
              value={email}
              onChangeText={setEmail}
            />
            <ThemedTextInput
              keyboardType='default'
              placeholder='Password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={{gap: 10}}>
          <Button title='Login' onPress={handleLogin} />
          <Button
            variant='ghost'
            title='Sign Up'
            onPress={() => {
              // If using expo-router: navigate to /signup
              router.push('/signup');
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
