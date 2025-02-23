// hooks/useFoodLogs.ts
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {fetchFoodLogs, logFoodEntry} from '@/api/food';

export function useFoodLogs() {
  return useQuery({
    queryKey: ['foodLogs'],
    queryFn: fetchFoodLogs,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      foodId,
      quantity,
    }: {
      foodId: number;
      quantity: number;
    }) => logFoodEntry(foodId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['foodLogs']});
    },
  });
}
