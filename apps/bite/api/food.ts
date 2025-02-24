// /api/food.ts

import {url} from '@/utils/url';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getUserId() {
  return AsyncStorage.getItem('userId');
}

// NEW: fetch servings for a single food
export async function fetchFoodServings(foodId: number) {
  const response = await fetch(`${url}/api/food/servings/${foodId}`, {
    // If your server expects cookies or auth tokens, you might do:
    // credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch servings (status: ${response.status})`);
  }
  return response.json();
}

export async function logFoodEntry(
  foodId: number,
  quantity: number,
  servingId?: number
) {
  const response = await fetch(`${url}/api/food/log`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      foodId,
      servingId, // optional
      quantity,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to log food (status: ${response.status})`);
  }
  return response.json(); // e.g. { success: true }
}

// For retrieving today's logs
export async function fetchFoodLogs() {
  const userId = await getUserId();
  if (!userId) throw new Error('No user ID found');

  const response = await fetch(`${url}/api/food/log?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch food logs (status: ${response.status})`);
  }
  return response.json();
}

// Searching
export async function searchFoods(query: string) {
  if (!query) return [];
  const response = await fetch(
    `${url}/api/food/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) throw new Error('Failed to search foods');
  const data = await response.json();
  return data.foods ?? [];
}
