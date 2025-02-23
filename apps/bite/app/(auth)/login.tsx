import {useState} from 'react';
import {View, Text, TextInput, Button, Alert} from 'react-native';
import {useAuth} from '@/hooks/useAuth';
import {useRouter} from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {login} = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    login.mutate(
      {email, password},
      {
        onSuccess: () => {
          router.replace('/');
        },
        onError: () => {
          Alert.alert('Error', 'Login failed. Check your credentials.');
        },
      }
    );
  };

  return (
    <View style={{padding: 20}}>
      <Text style={{fontSize: 18, marginBottom: 10}}>Login</Text>
      <TextInput
        placeholder='Email'
        value={email}
        onChangeText={setEmail}
        style={{borderBottomWidth: 1, marginBottom: 20}}
      />
      <TextInput
        placeholder='Password'
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{borderBottomWidth: 1, marginBottom: 20}}
      />
      <Button title='Login' onPress={handleLogin} />
      <Button title='Sign Up' onPress={() => router.push('/signup')} />
    </View>
  );
}
