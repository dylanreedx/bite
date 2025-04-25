import {FoodServingResult} from '@suna/db/queries/food';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

// Type for food log entries
export type FoodLogEntry = {
  id: number;
  food_name: string;
  serving_description: string;
  quantity: number;
  calories: string;
  protein: string;
  carbohydrate: string;
  fat: string;
};

export function useServings(foodId: number | null) {
  return useQuery({
    queryKey: ['servings', foodId],
    queryFn: async () => {
      if (!foodId) return null;
      const res = await fetch(`/api/food/servings/${foodId}`);
      if (!res.ok) throw new Error('Failed to fetch servings');
      const data = await res.json();
      return data.servings as FoodServingResult[];
    },
    enabled: !!foodId, // Only fetch when we have a foodId
  });
}

// Hook to fetch today's food logs
export function useFoodLogs(userId: string) {
  return useQuery<FoodLogEntry[]>({
    queryKey: ['dailyLogs', userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/food/log?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error('Failed to fetch food logs');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });
}

// Hook to log food
export function useLogFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      foodId,
      servingId,
      quantity,
    }: {
      foodId: number;
      servingId: number;
      quantity: number;
    }) => {
      const res = await fetch('/api/food/log', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({foodId, servingId, quantity}),
      });

      if (!res.ok) throw new Error('Failed to log food');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['dailyLogs']});
    },
  });
}

// Hook to delete a food log
export function useDeleteFoodLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: number) => {
      console.log('logId', logId);
      const res = await fetch(`/api/food/log?id=${logId}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('Failed to delete food log');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['dailyLogs']});
    },
  });
}
