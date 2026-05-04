import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { authStore } from './auth';
import { get } from 'svelte/store';
import { foodSyncService } from '$lib/services/foodSyncService';
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

	// Search functionality with improved relevance and caching
	let searchCache = new Map<string, FoodSearchResult[]>();
	let lastSearchTime = 0;

	async function searchFoods(query: string, limit: number = 20): Promise<void> {
		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			searchResults.set([]);
			searchQuery.set('');
			return;
		}

		// Check cache first
		const cacheKey = `${trimmedQuery.toLowerCase()}_${limit}`;
		if (searchCache.has(cacheKey)) {
			const cachedResults = searchCache.get(cacheKey)!;
			searchResults.set(cachedResults);
			searchQuery.set(trimmedQuery);
			return;
		}

		isSearching.set(true);
		searchError.set(null);
		searchQuery.set(trimmedQuery);

		const searchStartTime = Date.now();
		lastSearchTime = searchStartTime;

		try {
			const response = await fetch(
				`/api/foods/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`
			);

			// Check if this search is still relevant (user might have typed more)
			if (searchStartTime < lastSearchTime) {
				return; // Newer search has started, ignore this result
			}

			const data: SearchFoodsResponse = await response.json();

			if (data.success) {
				const results = data.foods || [];

				// Cache successful results
				searchCache.set(cacheKey, results);

				// Limit cache size to prevent memory issues
				if (searchCache.size > 50) {
					const firstKey = searchCache.keys().next().value;
					searchCache.delete(firstKey);
				}

				searchResults.set(results);
			} else {
				searchError.set(data.error || 'Search failed');
				searchResults.set([]);
			}
		} catch (error) {
			console.error('Search error:', error);

			// Only set error if this is still the current search
			if (searchStartTime >= lastSearchTime) {
				searchError.set('Network error occurred');
				searchResults.set([]);
			}
		} finally {
			// Only clear loading if this is still the current search
			if (searchStartTime >= lastSearchTime) {
				isSearching.set(false);
			}
		}
	}

	// Clear search results and cache
	function clearSearch(): void {
		searchResults.set([]);
		searchQuery.set('');
		searchError.set(null);
		isSearching.set(false);
	}

	// Clear search cache (useful for refreshing data)
	function clearSearchCache(): void {
		searchCache.clear();
	}

	// Get food details with caching and async sync
	async function getFoodDetails(
		foodId: number,
		priority: 'high' | 'medium' | 'low' = 'medium'
	): Promise<FoodDetails> {
		const cache = get(foodDetailsCache);

		// Return cached result if available
		if (cache.has(foodId)) {
			const cached = cache.get(foodId)!;

			// Check if cached data needs nutrition sync
			const needsSync = !cached.servings?.some(
				(serving) =>
					serving.calories > 0 || serving.protein > 0 || serving.carbohydrate > 0 || serving.fat > 0
			);

			if (needsSync) {
				// Queue for background sync but return cached data immediately
				foodSyncService
					.queueFoodSync(foodId, 'low')
					.catch((error) => console.warn('Background sync failed:', error));
			}

			return cached;
		}

		try {
			const response = await fetch(`/api/foods/${foodId}`);
			const data: GetFoodDetailsResponse = await response.json();

			if (data.success && data.food) {
				// Cache the result
				cache.set(foodId, data.food);
				foodDetailsCache.set(cache);

				// Check if nutrition data is missing and queue for sync
				const hasNutrition = data.food.servings?.some(
					(serving) =>
						serving.calories > 0 ||
						serving.protein > 0 ||
						serving.carbohydrate > 0 ||
						serving.fat > 0
				);

				if (!hasNutrition) {
					console.log(`Food ${foodId} missing nutrition data, queuing for sync`);
					// Queue for sync with the requested priority
					foodSyncService
						.queueFoodSync(foodId, priority)
						.catch((error) => console.warn('Failed to queue food for sync:', error));
				}

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
	async function loadRecentFoods(
		type: 'recent' | 'frequent' = 'recent',
		limit: number = 10
	): Promise<void> {
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
			const response = await fetch(`/api/foods/entries?date=${targetDate}`);
			const data: GetFoodLogResponse = await response.json();

			if (data.success) {
				todayLog.set(data.logs || []);
				todayTotals.set(
					data.dailyTotals || {
						calories: 0,
						protein: 0,
						carbohydrate: 0,
						fat: 0,
						fiber: 0,
						sugar: 0,
						sodium: 0
					}
				);
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

	// Update a food log entry
	async function updateLogEntry(
		entryId: number,
		servingId?: number,
		quantity?: number,
		meal?: string | null,
		date?: string
	): Promise<FoodLogEntry> {
		isLoggingFood.set(true);

		try {
			const requestBody: any = {
				id: entryId
			};

			if (servingId !== undefined) requestBody.servingId = servingId;
			if (quantity !== undefined) requestBody.quantity = quantity;
			if (meal !== undefined) requestBody.meal = meal || null;
			if (date !== undefined) requestBody.date = date;

			console.log('Updating food entry with request body:', JSON.stringify(requestBody, null, 2));

			const response = await fetch('/api/foods/entries', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const data: LogFoodResponse = await response.json();
			console.log('Food update response:', JSON.stringify(data, null, 2));

			if (data.success && data.logEntry) {
				// Update the entry in today's log
				const currentLog = get(todayLog);
				const updatedLog = currentLog.map((entry) =>
					entry.id === entryId ? data.logEntry : entry
				);
				todayLog.set(updatedLog);

				// Refresh totals by reloading the log
				loadTodayLog();

				return data.logEntry;
			} else {
				throw new Error(data.error || 'Failed to update food entry');
			}
		} catch (error) {
			console.error('Error updating food entry:', error);
			throw error;
		} finally {
			isLoggingFood.set(false);
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

			const response = await fetch('/api/foods/entries', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const data: LogFoodResponse = await response.json();
			console.log('Food logging response:', JSON.stringify(data, null, 2));

			if (data.success && data.logEntry) {
				// Check if the logged entry has missing nutrition data
				const hasNutrition =
					data.logEntry.nutrition.calories > 0 ||
					data.logEntry.nutrition.protein > 0 ||
					data.logEntry.nutrition.carbohydrate > 0 ||
					data.logEntry.nutrition.fat > 0;

				if (!hasNutrition) {
					console.log(
						`Logged food ${foodId} missing nutrition data, queuing for high-priority sync`
					);
					// Queue for immediate sync since user just logged this food
					foodSyncService
						.queueFoodSync(foodId, 'high')
						.catch((error) => console.warn('Failed to queue logged food for sync:', error));
				}

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
						carbohydrate:
							(currentTotals.carbohydrate || 0) + (data.logEntry.nutrition.carbohydrate || 0),
						fat: (currentTotals.fat || 0) + (data.logEntry.nutrition.fat || 0),
						fiber: (currentTotals.fiber || 0) + (data.logEntry.nutrition.fiber || 0),
						sugar: (currentTotals.sugar || 0) + (data.logEntry.nutrition.sugar || 0),
						sodium: (currentTotals.sodium || 0) + (data.logEntry.nutrition.sodium || 0)
					};
					todayTotals.set(newTotals);
				}

				// Refresh recent foods and today's log to include this new entry
				loadRecentFoods('recent');
				loadTodayLog();

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
			console.log(`Attempting to delete log entry with ID: ${logId}`);
			const response = await fetch(`/api/foods/entries?id=${logId}`, {
				method: 'DELETE'
			});

			console.log(`Delete response status: ${response.status} ${response.statusText}`);

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					`Delete request failed: ${response.status} ${response.statusText}`,
					errorText
				);
				return false;
			}

			const data: DeleteLogEntryResponse = await response.json();

			if (data.success) {
				// Remove from today's log
				const currentLog = get(todayLog);
				const entryToRemove = currentLog.find((entry) => entry.id === logId);

				if (entryToRemove) {
					const updatedLog = currentLog.filter((entry) => entry.id !== logId);
					todayLog.set(updatedLog);

					// Update totals
					const currentTotals = get(todayTotals);
					const newTotals: DailyTotals = {
						calories: Math.max(
							0,
							(currentTotals.calories || 0) - (entryToRemove.nutrition.calories || 0)
						),
						protein: Math.max(
							0,
							(currentTotals.protein || 0) - (entryToRemove.nutrition.protein || 0)
						),
						carbohydrate: Math.max(
							0,
							(currentTotals.carbohydrate || 0) - (entryToRemove.nutrition.carbohydrate || 0)
						),
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
			// Don't re-throw the error - return false instead
			return false;
		} finally {
			isDeletingLog.set(false);
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

	// Sync foods with missing nutrition data
	async function syncMissingNutrition(limit: number = 50): Promise<void> {
		try {
			const response = await fetch(`/api/foods/missing-nutrition?limit=${limit}&type=both`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.foodIds?.length > 0) {
					console.log(`Queuing ${data.foodIds.length} foods with missing nutrition for sync`);
					await foodSyncService.queueMultipleFoods(data.foodIds, 'medium');
				}
			}
		} catch (error) {
			console.error('Error syncing foods with missing nutrition:', error);
		}
	}

	// Get sync service status
	function getSyncStatus() {
		return foodSyncService.status;
	}

	// Queue specific food for sync
	async function queueFoodForSync(
		foodId: number,
		priority: 'high' | 'medium' | 'low' = 'medium'
	): Promise<boolean> {
		try {
			return await foodSyncService.queueFoodSync(foodId, priority);
		} catch (error) {
			console.error('Error queuing food for sync:', error);
			return false;
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
		searchCache.clear();
		// Clear sync queue on logout
		foodSyncService.clearQueue();
	}

	// Derived stores
	const hasSearchResults: Readable<boolean> = derived(
		searchResults,
		($results) => $results.length > 0
	);
	const hasTodayLog: Readable<boolean> = derived(todayLog, ($log) => $log.length > 0);

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
		clearSearchCache,
		getFoodDetails,
		loadRecentFoods,
		loadTodayLog,
		logFood,
		updateLogEntry,
		deleteLogEntry,
		setSelectedDate,
		initialize,
		clear,
		syncMissingNutrition,
		getSyncStatus,
		queueFoodForSync
	};
}

export const foodStore = createFoodStore();

// Auto-initialize when auth state changes
authStore.subscribe((authState) => {
	if (authState.user) {
		foodStore.initialize();
	} else {
		foodStore.clear();
	}
});
