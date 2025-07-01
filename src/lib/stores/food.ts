import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { authStore } from './auth.ts';
import { get } from 'svelte/store';
import type {
	FoodSearchResult,
	FoodDetails,
	RecentFood,
	FoodLogEntry,
	DailyTotals,
	LogFoodRequest,
	SearchFoodsResponse,
	GetFoodDetailsResponse,
	GetRecentFoodsResponse,
	LogFoodResponse,
	GetFoodLogResponse,
	DeleteLogEntryResponse
} from '$lib/types/food.ts';

// Food search and management store
function createFoodStore() {
	// Core state
	const searchResults: Writable<FoodSearchResult[]> = writable([]);
	const searchQuery: Writable<string> = writable('');
	const isSearching: Writable<boolean> = writable(false);
	const searchError: Writable<string | null> = writable(null);

	// Recent and frequent foods
	const recentFoods: Writable<RecentFood[]> = writable([]);
	const frequentFoods: Writable<RecentFood[]> = writable([]);
	const isLoadingRecent: Writable<boolean> = writable(false);

	// Food details cache
	const foodDetailsCache: Writable<Map<number, FoodDetails>> = writable(new Map());

	// Today's food log
	const todayLog: Writable<FoodLogEntry[]> = writable([]);
	const todayTotals: Writable<DailyTotals> = writable({
		calories: 0,
		protein: 0,
		carbohydrate: 0,
		fat: 0,
		fiber: 0,
		sugar: 0,
		sodium: 0
	});
	const isLoadingLog: Writable<boolean> = writable(false);
	const logError: Writable<string | null> = writable(null);

	// Selected date for log viewing
	const selectedDate: Writable<string> = writable(new Date().toISOString().split('T')[0]);

	// Loading states
	const isLoggingFood: Writable<boolean> = writable(false);
	const isDeletingLog: Writable<boolean> = writable(false);

	// Search functionality
	async function searchFoods(query: string, limit: number = 20): Promise<void> {
		if (!query.trim()) {
			searchResults.set([]);
			return;
		}

		isSearching.set(true);
		searchError.set(null);
		searchQuery.set(query);

		try {
			const response = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
			const data: SearchFoodsResponse = await response.json();

			if (data.success) {
				searchResults.set(data.foods || []);
			} else {
				searchError.set(data.error || 'Search failed');
				searchResults.set([]);
			}
		} catch (error) {
			console.error('Search error:', error);
			searchError.set('Network error occurred');
			searchResults.set([]);
		} finally {
			isSearching.set(false);
		}
	}

	// Clear search results
	function clearSearch(): void {
		searchResults.set([]);
		searchQuery.set('');
		searchError.set(null);
	}

	// Get food details with caching
	async function getFoodDetails(foodId: number): Promise<FoodDetails> {
		const cache = get(foodDetailsCache);
		
		// Return cached result if available
		if (cache.has(foodId)) {
			return cache.get(foodId)!;
		}

		try {
			const response = await fetch(`/api/foods/${foodId}`);
			const data: GetFoodDetailsResponse = await response.json();

			if (data.success && data.food) {
				// Cache the result
				cache.set(foodId, data.food);
				foodDetailsCache.set(cache);
				return data.food;
			} else {
				throw new Error(data.error || 'Failed to get food details');
			}
		} catch (error) {
			console.error('Error getting food details:', error);
			throw error;
		}
	}

	// Load recent foods
	async function loadRecentFoods(type: 'recent' | 'frequent' = 'recent', limit: number = 10): Promise<void> {
		isLoadingRecent.set(true);

		try {
			const response = await fetch(`/api/foods/recent?type=${type}&limit=${limit}`);
			const data: GetRecentFoodsResponse = await response.json();

			if (data.success) {
				if (type === 'recent') {
					recentFoods.set(data.foods || []);
				} else {
					frequentFoods.set(data.foods || []);
				}
			} else {
				console.error('Failed to load recent foods:', data.error);
			}
		} catch (error) {
			console.error('Error loading recent foods:', error);
		} finally {
			isLoadingRecent.set(false);
		}
	}

	// Load today's food log
	async function loadTodayLog(date?: string): Promise<void> {
		const targetDate = date || get(selectedDate);
		isLoadingLog.set(true);
		logError.set(null);

		try {
			const response = await fetch(`/api/foods/log?date=${targetDate}`);
			const data: GetFoodLogResponse = await response.json();

			if (data.success) {
				todayLog.set(data.logs || []);
				todayTotals.set(data.dailyTotals || {
					calories: 0,
					protein: 0,
					carbohydrate: 0,
					fat: 0,
					fiber: 0,
					sugar: 0,
					sodium: 0
				});
			} else {
				logError.set(data.error || 'Failed to load food log');
			}
		} catch (error) {
			console.error('Error loading food log:', error);
			logError.set('Network error occurred');
		} finally {
			isLoadingLog.set(false);
		}
	}

	// Log a food entry
	async function logFood(
		foodId: number, 
		servingId: number, 
		quantity: number, 
		meal?: string | null, 
		date?: string
	): Promise<FoodLogEntry> {
		isLoggingFood.set(true);

		try {
			const requestBody: LogFoodRequest = {
				foodId,
				servingId,
				quantity,
				meal: meal || undefined,
				date: date || get(selectedDate)
			};

			console.log('Logging food with request body:', JSON.stringify(requestBody, null, 2));

			const response = await fetch('/api/foods/log', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const data: LogFoodResponse = await response.json();
			console.log('Food logging response:', JSON.stringify(data, null, 2));

			if (data.success && data.logEntry) {
				// Add to today's log if logging for today
				const logDate = date || get(selectedDate);
				const today = new Date().toISOString().split('T')[0];
				
				if (logDate === today) {
					const currentLog = get(todayLog);
					todayLog.set([data.logEntry, ...currentLog]);
					
					// Update totals
					const currentTotals = get(todayTotals);
					const newTotals: DailyTotals = {
						calories: (currentTotals.calories || 0) + (data.logEntry.nutrition.calories || 0),
						protein: (currentTotals.protein || 0) + (data.logEntry.nutrition.protein || 0),
						carbohydrate: (currentTotals.carbohydrate || 0) + (data.logEntry.nutrition.carbohydrate || 0),
						fat: (currentTotals.fat || 0) + (data.logEntry.nutrition.fat || 0),
						fiber: (currentTotals.fiber || 0) + (data.logEntry.nutrition.fiber || 0),
						sugar: (currentTotals.sugar || 0) + (data.logEntry.nutrition.sugar || 0),
						sodium: (currentTotals.sodium || 0) + (data.logEntry.nutrition.sodium || 0)
					};
					todayTotals.set(newTotals);
				}

				// Refresh recent foods to include this new entry
				loadRecentFoods('recent');

				return data.logEntry;
			} else {
				throw new Error(data.error || 'Failed to log food');
			}
		} catch (error) {
			console.error('Error logging food:', error);
			throw error;
		} finally {
			isLoggingFood.set(false);
		}
	}

	// Delete a food log entry
	async function deleteLogEntry(logId: number): Promise<boolean> {
		isDeletingLog.set(true);

		try {
			const response = await fetch(`/api/foods/log?id=${logId}`, {
				method: 'DELETE'
			});

			const data: DeleteLogEntryResponse = await response.json();

			if (data.success) {
				// Remove from today's log
				const currentLog = get(todayLog);
				const entryToRemove = currentLog.find(entry => entry.id === logId);
				
				if (entryToRemove) {
					const updatedLog = currentLog.filter(entry => entry.id !== logId);
					todayLog.set(updatedLog);

					// Update totals
					const currentTotals = get(todayTotals);
					const newTotals: DailyTotals = {
						calories: Math.max(0, (currentTotals.calories || 0) - (entryToRemove.nutrition.calories || 0)),
						protein: Math.max(0, (currentTotals.protein || 0) - (entryToRemove.nutrition.protein || 0)),
						carbohydrate: Math.max(0, (currentTotals.carbohydrate || 0) - (entryToRemove.nutrition.carbohydrate || 0)),
						fat: Math.max(0, (currentTotals.fat || 0) - (entryToRemove.nutrition.fat || 0)),
						fiber: Math.max(0, (currentTotals.fiber || 0) - (entryToRemove.nutrition.fiber || 0)),
						sugar: Math.max(0, (currentTotals.sugar || 0) - (entryToRemove.nutrition.sugar || 0)),
						sodium: Math.max(0, (currentTotals.sodium || 0) - (entryToRemove.nutrition.sodium || 0))
					};
					todayTotals.set(newTotals);
				}

				return true;
			} else {
				throw new Error(data.error || 'Failed to delete log entry');
			}
		} catch (error) {
			console.error('Error deleting log entry:', error);
			throw error;
		} finally {
			isDeletingLog.set(false);
		}
	}

	// Quick add functionality for frequent foods
	async function quickAddFood(food: RecentFood, quantity: number = 1): Promise<FoodLogEntry> {
		try {
			// If we have serving info, log directly
			if (food.servingId) {
				return await logFood(food.foodId, food.servingId, quantity, null);
			} else {
				// Get food details to find default serving
				const foodDetails = await getFoodDetails(food.foodId);
				const defaultServing = foodDetails.servings.find(s => s.isDefault === 1) || foodDetails.servings[0];
				
				if (defaultServing) {
					return await logFood(food.foodId, defaultServing.servingId, quantity, null);
				} else {
					throw new Error('No serving information available');
				}
			}
		} catch (error) {
			console.error('Error quick adding food:', error);
			throw error;
		}
	}

	// Set selected date and load log for that date
	function setSelectedDate(date: string): void {
		selectedDate.set(date);
		loadTodayLog(date);
	}

	// Initialize store when user is authenticated
	function initialize(): void {
		const authState = get(authStore);
		if (authState.user) {
			loadTodayLog();
			loadRecentFoods('recent');
		}
	}

	// Clear all data (for logout)
	function clear(): void {
		searchResults.set([]);
		searchQuery.set('');
		searchError.set(null);
		recentFoods.set([]);
		frequentFoods.set([]);
		todayLog.set([]);
		todayTotals.set({
			calories: 0,
			protein: 0,
			carbohydrate: 0,
			fat: 0,
			fiber: 0,
			sugar: 0,
			sodium: 0
		});
		foodDetailsCache.set(new Map());
		logError.set(null);
	}

	// Derived stores
	const hasSearchResults: Readable<boolean> = derived(searchResults, $results => $results.length > 0);
	const hasTodayLog: Readable<boolean> = derived(todayLog, $log => $log.length > 0);

	return {
		// Readable stores
		searchResults: { subscribe: searchResults.subscribe },
		searchQuery: { subscribe: searchQuery.subscribe },
		isSearching: { subscribe: isSearching.subscribe },
		searchError: { subscribe: searchError.subscribe },
		
		recentFoods: { subscribe: recentFoods.subscribe },
		frequentFoods: { subscribe: frequentFoods.subscribe },
		isLoadingRecent: { subscribe: isLoadingRecent.subscribe },
		
		todayLog: { subscribe: todayLog.subscribe },
		todayTotals: { subscribe: todayTotals.subscribe },
		isLoadingLog: { subscribe: isLoadingLog.subscribe },
		logError: { subscribe: logError.subscribe },
		
		selectedDate: { subscribe: selectedDate.subscribe },
		isLoggingFood: { subscribe: isLoggingFood.subscribe },
		isDeletingLog: { subscribe: isDeletingLog.subscribe },

		// Derived stores
		hasSearchResults,
		hasTodayLog,
		
		// Actions
		searchFoods,
		clearSearch,
		getFoodDetails,
		loadRecentFoods,
		loadTodayLog,
		logFood,
		deleteLogEntry,
		quickAddFood,
		setSelectedDate,
		initialize,
		clear
	};
}

export const foodStore = createFoodStore();

// Auto-initialize when auth state changes
authStore.subscribe(authState => {
	if (authState.user) {
		foodStore.initialize();
	} else {
		foodStore.clear();
	}
});