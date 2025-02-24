// context/AuthContext.tsx
import React, {createContext, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// If you want a more secure store, use expo-secure-store

interface UserType {
  userId: string;
  hasFinishedOnboarding?: boolean;
  // any other user fields
}

interface AuthContextType {
  user: UserType | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if we have a stored user or token
    (async function restoreUser() {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          // In a real app, fetch user from server or decode a token
          setUser({userId: storedUserId, hasFinishedOnboarding: false});
        }
      } catch (err) {
        console.error('Error restoring user from AsyncStorage:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{user, loading, setUser, logout}}>
      {children}
    </AuthContext.Provider>
  );
}
