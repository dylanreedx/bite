import {useState} from 'react';
import {View, Text, TextInput, Button, Alert} from 'react-native';
import {useAuth} from '@/hooks/useAuth';
import {useRouter} from 'expo-router';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {signup} = useAuth();
  const router = useRouter();

  const handleSignup = () => {
    console.log('signup', {email, password, name});
    signup.mutate(
      {email, password, name},
      {
        onSuccess: () => {
          router.replace('/');
        },
        onError: (err) => {
          console.log('err', err);
          Alert.alert('Error', 'Signup failed. Try again.');
        },
      }
    );
  };

  return (
    <View style={{padding: 20}}>
      <Text style={{fontSize: 18, marginBottom: 10}}>Sign Up</Text>
      <TextInput
        placeholder='Name'
        value={name}
        onChangeText={setName}
        style={{borderBottomWidth: 1, marginBottom: 20}}
      />
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
      <Button title='Sign Up' onPress={handleSignup} />
      <Button title='Go to Login' onPress={() => router.push('/login')} />
    </View>
  );
}
