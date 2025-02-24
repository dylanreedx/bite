// app/(tabs)/log-food/[foodId].tsx
import React, {useState, useMemo} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  useQuery,
  useMutation,
  useQueryClient, // <-- for invalidating queries
} from '@tanstack/react-query';
import {
  SafeAreaView,
  Text,
  ThemedTextInput,
  Button,
  useThemeColor,
} from '@/components/Themed';
import {View, Pressable, FlatList, StyleSheet} from 'react-native';

import {fetchFoodServings, logFoodEntry} from '@/api/food';

/**
 * Utility to parse the numeric portion of strings like "303 kcal" or "34.11 g"
 * Returns 0 if it can't parse.
 */
function parseNumberFromString(str: string) {
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  return parseFloat(match[0]) || 0;
}

export default function FoodDetailScreen() {
  const {foodId} = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient(); // for invalidating 'foodLogs'
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // State for quantity and selected serving
  const [quantity, setQuantity] = useState('1');
  const [selectedServingId, setSelectedServingId] = useState<number | null>(
    null
  );

  // Fetch all servings for this food
  // Suppose your server returns: { servings: [ ... ] }
  const {
    data: foodData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['foodServings', foodId],
    queryFn: () => fetchFoodServings(Number(foodId)),
    enabled: !!foodId,
  });

  // If the server returns an array instead of { servings: [] }, adjust accordingly
  // e.g. if "foodData" is actually the array, then you'd do: foodData?.find(...)
  // But from your snippet, it looks like: foodData.servings is the real array
  const selectedServing = useMemo(() => {
    return foodData?.servings?.find(
      (s: {serving_id: number}) => s.serving_id === selectedServingId
    );
  }, [foodData, selectedServingId]);

  const numericQuantity = Number(quantity) || 0;

  // Calculate macros * quantity
  const macros = useMemo(() => {
    if (!selectedServing) return null;

    const cals = parseNumberFromString(selectedServing.calories);
    const carbs = parseNumberFromString(selectedServing.carbohydrate);
    const fat = parseNumberFromString(selectedServing.fat);
    const protein = parseNumberFromString(selectedServing.protein);

    return {
      totalCals: cals * numericQuantity,
      totalCarbs: carbs * numericQuantity,
      totalFat: fat * numericQuantity,
      totalProtein: protein * numericQuantity,
      servingDescription: selectedServing.serving_description,
    };
  }, [selectedServing, numericQuantity]);

  // React Query mutation for logging
  // On success, we invalidate ['foodLogs'] so your home screen or wherever
  // fetchFoodLogs() is used gets updated automatically.
  const {mutate: logFood, status: loggingStatus} = useMutation({
    mutationFn: async () => {
      if (!foodId) throw new Error('No food ID!');
      if (!selectedServingId) throw new Error('No serving selected!');

      return logFoodEntry(Number(foodId), numericQuantity, selectedServingId);
    },
    onSuccess: () => {
      // Invalidate logs so the home screen refreshes
      queryClient.invalidateQueries({queryKey: ['foodLogs']});
      // Then go back or show success
      router.back();
    },
    onError: (err) => {
      console.error('Log food error:', err);
    },
  });

  function handleSelectServing(servingId: number) {
    setSelectedServingId(servingId);
  }

  function handleLogFood() {
    logFood();
  }

  return (
    <SafeAreaView style={{flex: 1, padding: 16}}>
      <Text style={{fontSize: 18, marginBottom: 10}}>Food Detail</Text>
      <Text>ID: {foodId}</Text>

      {/* Show macros for the chosen serving * quantity */}
      {macros && (
        <View style={styles.macrosContainer}>
          <Text style={styles.macrosTitle}>Selected Serving:</Text>
          <Text>• {macros.servingDescription}</Text>
          <Text style={{marginTop: 8, fontWeight: '600'}}>
            For quantity {quantity}:
          </Text>
          <Text>Calories: {macros.totalCals.toFixed(2)} kcal</Text>
          <Text>Carbs: {macros.totalCarbs.toFixed(2)} g</Text>
          <Text>Fat: {macros.totalFat.toFixed(2)} g</Text>
          <Text>Protein: {macros.totalProtein.toFixed(2)} g</Text>
        </View>
      )}

      {/* User picks quantity */}
      <View style={{marginTop: 20, marginBottom: 20}}>
        <Text>Quantity</Text>
        <ThemedTextInput
          keyboardType='numeric'
          value={quantity}
          onChangeText={setQuantity}
          style={{marginBottom: 10}}
        />
      </View>

      {isLoading && <Text>Loading servings...</Text>}
      {error && (
        <Text style={{color: 'red'}}>Error: {(error as Error)?.message}</Text>
      )}

      {/* Show list of servings. Tapping one sets selectedServingId */}
      {!isLoading && foodData?.servings?.length > 0 && (
        <FlatList
          data={foodData.servings}
          keyExtractor={(item) => item.serving_id.toString()}
          style={{marginBottom: 20}}
          renderItem={({item}) => {
            const isSelected = item.serving_id === selectedServingId;
            return (
              <Pressable
                onPress={() => handleSelectServing(item.serving_id)}
                style={({pressed}) => [
                  styles.servingRow,
                  {
                    borderColor: isSelected ? '#00bcd4' : borderColor,
                    backgroundColor: pressed ? '#ddd' : 'transparent',
                  },
                ]}
              >
                <Text style={{fontWeight: '600', color: textColor}}>
                  {item.serving_description}
                </Text>
                <Text style={{color: textColor}}>
                  {item.calories} | {item.carbohydrate} carbs | {item.protein}{' '}
                  prot
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {!isLoading && !foodData?.servings?.length && (
        <Text>No servings found.</Text>
      )}

      <Button
        title={loggingStatus === 'pending' ? 'Logging...' : 'Log Food'}
        onPress={handleLogFood}
        disabled={!selectedServingId || !quantity}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  servingRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  macrosContainer: {
    marginBottom: 20,
  },
  macrosTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
});
