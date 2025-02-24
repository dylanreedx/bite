// app/(tabs)/log-food/index.tsx

import React, {useState} from 'react';
import {useRouter} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {FlatList, ActivityIndicator, View, StyleSheet} from 'react-native';

// Example "Themed" components—adapt to your design system
import {SafeAreaView, Text, ThemedTextInput} from '@/components/Themed';

// Import your actual API calls
import {searchFoods, fetchFoodLogs} from '@/api/food';
import {useDebouncedValue} from '@/hooks/useDebouncedValue'; // your custom hook

export default function LogFoodScreen() {
  const router = useRouter();

  // This is the raw text user is typing
  const [query, setQuery] = useState('');

  // We'll wait until the user stops typing for ~300ms, then update this:
  const debouncedQuery = useDebouncedValue(query, 300);

  // This query automatically runs whenever `debouncedQuery` changes (and is non-empty)
  const {
    data: searchResults,
    isFetching: isSearching,
    error,
  } = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () => searchFoods(debouncedQuery),
    enabled: !!debouncedQuery, // only fetch if we have some text
  });

  // For "recently logged foods"
  const {
    data: loggedFoods,
    isLoading: logsLoading,
    error: logsError,
  } = useQuery({
    queryKey: ['foodLogs'],
    queryFn: fetchFoodLogs,
  });

  // Navigate to details on press
  function handleFoodPress(foodId: number) {
    router.push(`/log-food/${foodId}`);
  }

  // Render each food item in the search results
  function renderFoodItem({item}: {item: any}) {
    return (
      <Pressable
        onPress={() => handleFoodPress(item.food_id)}
        style={styles.foodItem}
      >
        <Text style={{fontWeight: '600'}}>{item.food_name}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search Foods</Text>

      <ThemedTextInput
        placeholder='Type a food name...'
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
      />

      {isSearching && (
        <View style={styles.center}>
          <ActivityIndicator size='large' />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>Error: {(error as Error).message}</Text>
      )}

      {/* If we have a debounced query and we're not currently searching, show results */}
      {!isSearching && debouncedQuery.length > 0 && (
        <>
          {searchResults && searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.food_id.toString()}
              renderItem={renderFoodItem}
              contentContainerStyle={{paddingVertical: 10}}
              style={{marginBottom: 16}}
            />
          ) : (
            // Means we had a debouncedQuery, we finished searching, but no data
            <Text style={styles.noResultsText}>
              No foods found for "{debouncedQuery}"
            </Text>
          )}
        </>
      )}

      {/* Recently Logged Foods Section */}
      <Text style={[styles.title, {marginTop: 20}]}>Recently Logged Foods</Text>
      {logsLoading && <Text>Loading logs...</Text>}
      {logsError && (
        <Text style={styles.errorText}>
          Error: {(logsError as Error).message}
        </Text>
      )}
      {!logsLoading && loggedFoods?.length === 0 && <Text>No logs yet.</Text>}
      {!logsLoading && loggedFoods?.length > 0 && (
        <FlatList
          data={loggedFoods}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({item}) => (
            <Text style={styles.loggedItem}>
              • {item.food_name} (x{item.quantity})
            </Text>
          )}
          style={{marginTop: 8}}
        />
      )}
    </SafeAreaView>
  );
}

import {Pressable} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '600',
  },
  searchInput: {
    marginBottom: 10,
  },
  foodItem: {
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 6,
  },
  errorText: {
    color: 'red',
    marginVertical: 6,
  },
  noResultsText: {
    marginVertical: 10,
    fontStyle: 'italic',
  },
  loggedItem: {
    marginBottom: 4,
  },
});
