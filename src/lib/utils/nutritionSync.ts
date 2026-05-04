import { foodSyncService } from '$lib/services/foodSyncService';
import type { FoodSearchResult, FoodDetails } from '$lib/types/food';

// Utility functions for nutrition data syncing

/**
 * Check if a food search result needs nutrition syncing
 */
export function needsNutritionSync(food: FoodSearchResult): boolean {
	return (
		!food.calories ||
		food.calories === 0 ||
		(!food.protein && !food.carbohydrate && !food.fat)
	);
}

/**
 * Check if food details need nutrition syncing
 */
export function foodDetailsNeedSync(food: FoodDetails): boolean {
	if (!food.servings || food.servings.length === 0) {
		return true;
	}

	// Check if any serving has nutrition data
	const hasNutrition = food.servings.some(
		(serving) =>
			(serving.calories && serving.calories > 0) ||
			(serving.protein && serving.protein > 0) ||
			(serving.carbohydrate && serving.carbohydrate > 0) ||
			(serving.fat && serving.fat > 0)
	);

	return !hasNutrition;
}

/**
 * Queue a food for sync with appropriate priority based on context
 */
export async function queueFoodForSync(
	foodId: number,
	context: 'search' | 'logging' | 'viewing' | 'background' = 'background'
): Promise<boolean> {
	let priority: 'high' | 'medium' | 'low';

	switch (context) {
		case 'logging':
			priority = 'high'; // User is actively trying to log this food
			break;
		case 'viewing':
			priority = 'medium'; // User is looking at details
			break;
		case 'search':
			priority = 'low'; // Just appeared in search results
			break;
		case 'background':
		default:
			priority = 'low'; // Background sync
			break;
	}

	try {
		return await foodSyncService.queueFoodSync(foodId, priority);
	} catch (error) {
		console.error(`Failed to queue food ${foodId} for sync:`, error);
		return false;
	}
}

/**
 * Queue multiple foods for sync
 */
export async function queueMultipleFoodsForSync(
	foodIds: number[],
	context: 'search' | 'logging' | 'viewing' | 'background' = 'background'
): Promise<boolean[]> {
	const results = await Promise.allSettled(
		foodIds.map((foodId) => queueFoodForSync(foodId, context))
	);

	return results.map((result) => (result.status === 'fulfilled' ? result.value : false));
}

/**
 * Auto-sync foods from search results that need nutrition data
 */
export async function autoSyncSearchResults(foods: FoodSearchResult[]): Promise<void> {
	const foodsNeedingSync = foods
		.filter(needsNutritionSync)
		.map((food) => food.foodId)
		.slice(0, 10); // Limit to first 10 to avoid overwhelming the queue

	if (foodsNeedingSync.length > 0) {
		console.log(`Auto-queuing ${foodsNeedingSync.length} foods from search results for sync`);
		await queueMultipleFoodsForSync(foodsNeedingSync, 'search');
	}
}

/**
 * Get sync statistics
 */
export function getSyncStats() {
	return foodSyncService.getQueueStatus();
}

/**
 * Start bulk sync for foods with missing nutrition
 */
export async function startBulkNutritionSync(
	limit: number = 50,
	type: 'missing' | 'incomplete' | 'both' = 'both'
): Promise<{ success: boolean; foodIds?: number[]; error?: string }> {
	try {
		const response = await fetch(`/api/foods/missing-nutrition?limit=${limit}&type=${type}`);
		const data = await response.json();

		if (data.success && data.foodIds?.length > 0) {
			console.log(`Starting bulk sync for ${data.foodIds.length} foods`);
			await foodSyncService.queueMultipleFoods(data.foodIds, 'medium');
			return { success: true, foodIds: data.foodIds };
		} else {
			return { success: false, error: data.error || 'No foods found needing sync' };
		}
	} catch (error) {
		console.error('Error starting bulk nutrition sync:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Check if a specific food needs syncing by making a lightweight API call
 */
export async function checkFoodNeedsSync(foodId: number): Promise<boolean> {
	try {
		const response = await fetch(`/api/foods/${foodId}`, {
			headers: { 'Cache-Control': 'no-cache' }
		});

		if (response.ok) {
			const data = await response.json();
			if (data.success && data.food) {
				return foodDetailsNeedSync(data.food);
			}
		}
		return true; // Assume needs sync if we can't determine
	} catch (error) {
		console.error(`Error checking sync status for food ${foodId}:`, error);
		return true;
	}
}

/**
 * Smart sync: Only sync foods that actually need it
 */
export async function smartSyncFoods(foodIds: number[]): Promise<void> {
	const checksPromises = foodIds.map(async (foodId) => {
		const needsSync = await checkFoodNeedsSync(foodId);
		return needsSync ? foodId : null;
	});

	const results = await Promise.all(checksPromises);
	const foodsToSync = results.filter((foodId): foodId is number => foodId !== null);

	if (foodsToSync.length > 0) {
		console.log(`Smart sync: ${foodsToSync.length} of ${foodIds.length} foods need syncing`);
		await queueMultipleFoodsForSync(foodsToSync, 'background');
	} else {
		console.log('Smart sync: All foods already have nutrition data');
	}
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number | null): string {
	if (!ms) return '0s';

	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	} else {
		return `${seconds}s`;
	}
}

/**
 * Get user-friendly sync status message
 */
export function getSyncStatusMessage(status: ReturnType<typeof getSyncStats>): string {
	if (status.lastError) {
		return 'Sync error occurred';
	} else if (status.isActive) {
		if (status.currentFoodId) {
			return `Syncing food #${status.currentFoodId}`;
		}
		return 'Syncing nutrition data...';
	} else if (status.queueSize > 0) {
		return `${status.queueSize} foods queued for sync`;
	} else if (status.successCount > 0) {
		return `Successfully synced ${status.successCount} foods`;
	} else {
		return 'No sync activity';
	}
}

/**
 * Estimate sync progress percentage
 */
export function getSyncProgress(status: ReturnType<typeof getSyncStats>): number {
	const total = status.successCount + status.failureCount + status.queueSize;
	if (total === 0) return 0;

	const completed = status.successCount + status.failureCount;
	return Math.round((completed / total) * 100);
}

// Export common patterns
export const syncPatterns = {
	// Auto-sync when user views food details
	onFoodView: (foodId: number) => queueFoodForSync(foodId, 'viewing'),

	// High-priority sync when user logs food
	onFoodLog: (foodId: number) => queueFoodForSync(foodId, 'logging'),

	// Background sync for search results
	onSearchResults: (foods: FoodSearchResult[]) => autoSyncSearchResults(foods),

	// Bulk sync for missing nutrition
	bulkSync: (limit?: number) => startBulkNutritionSync(limit),

	// Smart sync (checks first)
	smartSync: (foodIds: number[]) => smartSyncFoods(foodIds)
};
