// app/(tabs)/log-food/index.tsx

import React, {useState} from 'react';
import {useRouter} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {FlatList} from 'react-native';

// Example "Themed" components—adapt to your design system
import {SafeAreaView, Text, ThemedTextInput, Button} from '@/components/Themed';

import {searchFoods, fetchFoodLogs} from '@/api/food';

export default function LogFoodScreen() {
  const router = useRouter();

  // "query" is what's typed; "searchTerm" is the final input we search
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // We disable auto-fetch, so we can trigger it manually with refetch()
  const {
    data: searchResults,
    isFetching: isSearching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['foodSearch', searchTerm],
    queryFn: () => searchFoods(searchTerm),
    enabled: false,
  });

  console.log(searchResults);
  // Optional: recently logged foods
  const {data: loggedFoods, isLoading: logsLoading} = useQuery({
    queryKey: ['foodLogs'],
    queryFn: fetchFoodLogs,
  });

  const handleSearch = () => {
    // Move the typed text into "searchTerm"
    setSearchTerm(query);
    // Trigger the API call
    refetch();
  };

  // Render each food item in the search results
  const renderFoodItem = ({item}: {item: any}) => (
    <Button
      title={item.food_name}
      variant='outline'
      onPress={() => {
        // Navigate to detail screen with the item.id
        router.push(`/log-food/${item.food_id}`);
      }}
    />
  );

  console.log(loggedFoods);

  return (
    <SafeAreaView style={{flex: 1, padding: 16}}>
      <Text style={{fontSize: 18, marginBottom: 8}}>Search Foods</Text>

      <ThemedTextInput
        placeholder='Type a food name...'
        value={query}
        onChangeText={setQuery}
      />

      <Button
        title={isSearching ? 'Searching...' : 'Search'}
        onPress={handleSearch}
        disabled={!query.length}
      />

      {error && (
        <Text style={{color: 'red'}}>Error: {(error as Error)?.message}</Text>
      )}

      {/* Show search results */}
      <FlatList
        data={searchResults || []}
        keyExtractor={(item) => item.food_id.toString()}
        renderItem={renderFoodItem}
        ListEmptyComponent={
          !isSearching && searchTerm ? (
            <Text>No foods found for "{searchTerm}".</Text>
          ) : null
        }
        style={{marginTop: 20}}
      />

      <Text style={{fontSize: 18, marginTop: 30}}>Recently Logged Foods</Text>
      {logsLoading && <Text>Loading logs...</Text>}
      {loggedFoods && loggedFoods.length === 0 && <Text>No logs yet.</Text>}
      {loggedFoods && loggedFoods.length > 0 && (
        <FlatList
          data={loggedFoods}
          keyExtractor={(item) => item?.id.toString()}
          renderItem={({item}) => (
            <Text>
              {item.food_name} - {item.quantity}
            </Text>
          )}
          style={{marginTop: 10}}
        />
      )}
    </SafeAreaView>
  );
}
