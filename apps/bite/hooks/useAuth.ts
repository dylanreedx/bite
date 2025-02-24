import {useMutation, useQueryClient} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {loginUser, signupUser} from '@/api/auth';
import {useRouter} from 'expo-router';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: ['currentUser']});
        router.replace('/(tabs)');
      },
      onError: (error) => console.error('Login error:', error),
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
      onSuccess: () => {
        queryClient.invalidateQueries({queryKey: ['currentUser']});
        router.replace('/(tabs)');
      },
    }),

    logout: async () => {
      await AsyncStorage.removeItem('userId');
      await queryClient.clear();
      router.replace('/(auth)/login');
    },
  };
}
