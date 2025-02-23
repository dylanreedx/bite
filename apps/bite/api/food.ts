import {url} from '@/utils/url';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getUserId() {
  return await AsyncStorage.getItem('userId');
}

export async function fetchFoodLogs() {
  const userId = await getUserId();
  if (!userId) throw new Error('No user ID found');

  const response = await fetch(`${url}/api/food/log?userId=${userId}`);
  console.log('response logs:', response);
  if (!response.ok) throw new Error('Failed to fetch food logs');
  return response.json();
}

export async function logFoodEntry(foodId: number, quantity: number) {
  const userId = await getUserId();
  if (!userId) throw new Error('No user ID found');

  const response = await fetch(`${url}/api/food/log`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId, foodId, quantity}),
  });

  if (!response.ok) throw new Error('Failed to log food');
  return response.json();
}
