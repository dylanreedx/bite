// app/(auth)/signup.tsx
import {useState} from 'react';
import {Alert} from 'react-native';
import {
  SafeAreaView,
  View,
  Text,
  ThemedTextInput,
  Button,
} from '@/components/Themed';
import {useAuth} from '@/hooks/useAuth';
import {useRouter} from 'expo-router';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {signup} = useAuth();
  const router = useRouter();

  const handleSignup = () => {
    signup.mutate(
      {name, email, password},
      {
        onSuccess: () => router.replace('/'),
        onError: () => Alert.alert('Error', 'Signup failed. Try again.'),
      }
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View
        style={{
          padding: 20,
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <View>
          <Text style={{fontSize: 18, marginBottom: 10}}>Sign Up</Text>
          <View style={{gap: 10}}>
            <ThemedTextInput
              placeholder='Name'
              value={name}
              onChangeText={setName}
            />
            <ThemedTextInput
              placeholder='Email'
              value={email}
              onChangeText={setEmail}
            />
            <ThemedTextInput
              placeholder='Password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={{gap: 10}}>
          <Button title='Sign Up' onPress={handleSignup} />
          <Button
            variant='ghost'
            title='Go to Login'
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
