import {useMutation} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loginUser, signupUser} from '@/api/auth';
import {useRouter} from 'expo-router';

export function useAuth() {
  const router = useRouter();

  return {
    login: useMutation({
      mutationFn: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        const data = await loginUser(email, password);
        await AsyncStorage.setItem('userId', data.userId);
        return data;
      },
    }),
    signup: useMutation({
      mutationFn: async ({
        email,
        password,
        name,
      }: {
        email: string;
        password: string;
        name?: string;
      }) => {
        const data = await signupUser(email, password, name);
        await AsyncStorage.setItem('userId', data.userId);
        return data;
      },
    }),
    logout: async () => {
      await AsyncStorage.removeItem('userId');
      router.replace('/login');
    },
    userId: async () => {
      return await AsyncStorage.getItem('userId');
    },
  };
}
